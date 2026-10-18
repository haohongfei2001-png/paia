import {createHash} from 'node:crypto';
import {createSignedIdentityVerifier,exactData,requestBindingHash} from './signed-identity.mjs';
import {equal,canonical} from '../../extension/core/ai-usage/contracts.js';
import {quoteRequestBound} from '../../extension/core/ai-usage/ratebook.js';
import {budgetWindow} from '../../extension/core/ai-usage/budget-window-policy.js';

export class ServiceAuthorityError extends Error {constructor(code){super(code);this.code=code;this.name='ServiceAuthorityError';}}
const fail=code=>{throw new ServiceAuthorityError(code);};
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const millis=value=>{if(typeof value!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(value)||!integer(Number(value)))fail('AUTHORITY_INVALID');return Number(value);};
export const identityConfigHash=config=>createHash('sha256').update(canonical(config)).digest('hex');
const CLOCK_SQL="SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms";
const CONTROL_SQL='SELECT profile_id, identity_config_hash, generation, enabled, day_limit_micros::text, month_limit_micros::text, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const PRINCIPAL_SQL='SELECT security, time_zone FROM paia_ai_private.principal_authority WHERE principal_id = $1 AND library_id = $2 FOR SHARE';
const ROUTE_SQL='SELECT generation, facts, expires_at_ms::text FROM paia_ai_private.route_authority WHERE route_version = $1 FOR SHARE';
const REQUEST_SQL='SELECT request_hash, request, generation, authorized, issued_at_ms::text, expires_at_ms::text FROM paia_ai_private.request_authority WHERE operation_id = $1 FOR SHARE';
const CANCEL_EVENTS_SQL='SELECT event_id FROM paia_ai_private.operation_evidence WHERE operation_id = $1 LIMIT 1 FOR SHARE';
const EVENT_SQL='SELECT operation_id, request_hash, event, evidence, expires_at_ms::text FROM paia_ai_private.operation_evidence WHERE event_id = $1 FOR SHARE';
const ACCESS_SQL=`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
 r.rolsuper, r.rolbypassrls, c.relowner = r.oid AS is_owner,
 (has_schema_privilege(current_user, n.oid, 'CREATE')
  OR has_table_privilege(current_user, c.oid, 'INSERT,DELETE,TRUNCATE')
  OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.oid
   AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'lock_anchor'
   AND has_column_privilege(current_user, c.oid, a.attname, 'UPDATE'))) AS can_mutate
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 JOIN pg_catalog.pg_roles r ON r.rolname = current_user
 WHERE n.nspname = 'paia_ai_private' AND c.relname = ANY($1::text[]) AND c.relkind = 'r'`;
const one=async(client,sql,args=[])=>{const result=await client.query(sql,args);if(result.rows.length!==1)fail('AUTHORITY_MISSING');return structuredClone(result.rows[0]);};
const now=async client=>millis((await one(client,CLOCK_SQL)).now_ms);

// No arbitrary reader/callback, URL, table or clock comes from a request. These
// actual DB rows ARE service authority, not a local cache claiming to be current.
// Their independently qualified publishers/bridge are required deployment inputs;
// the HTTP gateway neither creates these facts nor stores client assertions.
export class PostgresRequestAuthority {
 #config; #profile; #bundle; #action; #eventId; #locked; #hash;
 constructor({identityConfig,profileId,bundle,action,eventId=null}){
  if(!text(profileId)||!['reserve','cancel','record','settle'].includes(action)||
     (['record','settle'].includes(action)?!text(eventId):eventId!==null))fail('SERVICE_UNCONFIGURED');
  this.#config=identityConfig;this.#profile=profileId;this.#bundle=bundle;this.#action=action;this.#eventId=eventId;this.#hash=requestBindingHash(bundle.request);
 }
 async lock(client){
  if(this.#locked)fail('AUTHORITY_REUSED');
  const r=this.#bundle.request;
  // Fixed lock order: original global ledger (storage), control, principal,
  // route, request, optional event. Every publisher must respect this order if
  // it updates more than one owner. A row UPDATE/DELETE waits for these locks.
  const control=await one(client,CONTROL_SQL);
  const principal=await one(client,PRINCIPAL_SQL,[r.principalId,r.libraryId]);
  const route=await one(client,ROUTE_SQL,[r.routeVersion]);
  const grant=await one(client,REQUEST_SQL,[r.operationId]);
  const event=this.#eventId?await one(client,EVENT_SQL,[this.#eventId]):null;
  // An independently recorded provider fact is already reason to retain the
  // hold, even if original ledger reconciliation has not completed. INSERT's
  // mandatory trigger locks the same global ledger, so no phantom can race us.
  if(this.#action==='cancel'&&(await client.query(CANCEL_EVENTS_SQL,[r.operationId])).rows.length)fail('OUTCOME_OR_ATTEMPT_PENDING');
  const tables=['service_control','principal_authority','route_authority','request_authority',...((event||this.#action==='cancel')?['operation_evidence']:[])];
  const access=await client.query(ACCESS_SQL,[tables]);
  if(access.rows.length!==tables.length||new Set(access.rows.map(row=>row.relname)).size!==tables.length||access.rows.some(row=>!tables.includes(row.relname)||row.relrowsecurity!==true||row.relforcerowsecurity!==true||row.rolsuper!==false||row.rolbypassrls!==false||row.is_owner!==false||row.can_mutate!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
  this.#locked={control,principal,route,grant,event,now:await now(client)};
  const facts=this.#verify(this.#locked.now);
  this.#locked.window=budgetWindow(facts,this.#locked.now);
  return {facts,now:this.#locked.now,event:structuredClone(event)};
 }
 #verify(at){
  const {control,principal,route,grant,event}=this.#locked,r=this.#bundle.request;
  exactData(control,['profile_id','identity_config_hash','generation','enabled','day_limit_micros','month_limit_micros','expires_at_ms']);
  exactData(principal,['security','time_zone']);exactData(route,['generation','facts','expires_at_ms']);
  exactData(grant,['request_hash','request','generation','authorized','issued_at_ms','expires_at_ms']);
  if(control.profile_id!==this.#profile||control.identity_config_hash!==identityConfigHash(this.#config)||!text(control.generation)||control.enabled!==true)fail('SERVICE_PROFILE_UNQUALIFIED');
  if(![control,route,grant].every(row=>millis(row.expires_at_ms)>at)||!text(route.generation)||!text(grant.generation))fail('AUTHORITY_EXPIRED');
  if(millis(grant.issued_at_ms)>at||millis(grant.expires_at_ms)-millis(grant.issued_at_ms)>60000)fail('AUTHORITY_EXPIRED');
  if(grant.authorized!==true||grant.request_hash!==this.#hash||!equal(grant.request,r))fail('AUTHORIZATION');
  const identity=createSignedIdentityVerifier({config:this.#config,clock:()=>at,readSecurityState:()=>principal.security}).verify(this.#bundle);
  const f=route.facts;
  exactData(f,['routeQualified','thinkingBoundQualified','inputBoundQualified','route','book','fx']);
  if(f.routeQualified!==true||f.thinkingBoundQualified!==true||f.inputBoundQualified!==true||!text(principal.time_zone))fail('ROUTE_UNQUALIFIED');
  quoteRequestBound({book:f.book,route:f.route,fx:f.fx,now:at,inputTokens:r.inputTokens,billableOutputCap:r.outputCap});
  const global={dayLimitMicros:millis(control.day_limit_micros),monthLimitMicros:millis(control.month_limit_micros)};
  if(!global.dayLimitMicros||!global.monthLimitMicros)fail('ALLOWANCE_UNSET');
  if(event){
   exactData(event,['operation_id','request_hash','event','evidence','expires_at_ms']);
   if(event.operation_id!==r.operationId||event.request_hash!==this.#hash||millis(event.expires_at_ms)<=at)fail('PROVIDER_EVIDENCE_UNQUALIFIED');
   if(this.#action==='record'&&(!['DISPATCHED','OUTCOME_UNKNOWN'].includes(event.event)||event.evidence!==null)||
      this.#action==='settle'&&(event.event!=='SETTLEMENT'||event.evidence?.operationId!==r.operationId||event.evidence?.receiptId!==this.#eventId))fail('PROVIDER_EVIDENCE_UNQUALIFIED');
  }
  return {authorized:true,verifiedServiceFacts:true,request:r,tier:identity.tier,timeZone:principal.time_zone,global,...structuredClone(f)};
 }
 async beforePublish(client){
  if(!this.#locked)fail('AUTHORITY_MISSING');
  const at=await now(client);
  if(at<this.#locked.now)fail('CLOCK_ROLLBACK');
  this.#verify(at); // All actual authority rows remain SHARE locked until COMMIT.
  const expiresAt=Math.min(at+1000,this.#locked.window.endsAt);
  if(expiresAt<=at)fail('AUTHORITY_EXPIRED');
  // Prove the complete bundle remains valid throughout the SQL publication
  // interval, rather than parsing an unsigned token expiry as authorization.
  this.#verify(expiresAt-1);
  return {notBefore:at,expiresAt};
 }
}
