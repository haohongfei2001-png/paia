import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Pool} from 'pg';
import {PostgresLedgerStorage,LEDGER_KEY,SCHEMA_VERSION,encodeSnapshot} from './postgres-ledger.mjs';
import {PostgresRequestAuthority} from './postgres-authority.mjs';
import {snapshotBundle} from './request-entry.mjs';
import {snapshotClientDeclaration,clientDeclarationHash} from './client-declaration.mjs';
import {requestBindingHash,requireSynchronous} from './signed-identity.mjs';
import {observedProviderUsage} from './provider-response.mjs';
import {ProviderAccountingGuard,providerSettlementEvidence,reservedProviderRow} from './provider-settlement.mjs';
import {equal,canonical} from '../../extension/core/ai-usage/contracts.js';

const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const deny=reason=>({decision:'deny',reason,...flags});
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const hash=value=>createHash('sha256').update(value).digest('hex');
const TABLES=['budget_snapshot','service_control','principal_authority','route_authority','request_authority','operation_evidence'];
const SETTINGS=`SELECT set_config('search_path','pg_catalog',true),set_config('lock_timeout','5000ms',true),
 set_config('statement_timeout','15000ms',true),set_config('idle_in_transaction_session_timeout','15000ms',true),set_config('synchronous_commit','on',true)`;
const LOCK="SELECT schema_version, snapshot FROM paia_ai_private.budget_snapshot WHERE ledger_key = $1 FOR UPDATE";
const GRANT='SELECT request_hash, request, generation, authorized, issued_at_ms::text, expires_at_ms::text FROM paia_ai_private.request_authority WHERE operation_id = $1 FOR SHARE';
const OCCUPATIONS="SELECT operation_id FROM paia_ai_private.operation_evidence WHERE event = 'DISPATCHED' AND operation_id = ANY($1::text[]) FOR SHARE";
const EVENTS='SELECT event_id FROM paia_ai_private.operation_evidence WHERE operation_id = $1 FOR SHARE';
// The dedicated publisher cannot mutate the financial snapshot, requests,
// identity, route, control, or prior evidence. Effective inherited rights count.
// No role/grant/policy is installed by this source.
const ACCESS=`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
 r.rolsuper,r.rolbypassrls,c.relowner=r.oid AS is_owner,
 (has_schema_privilege(current_user,n.oid,'CREATE')
 OR has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER,REFERENCES')
 OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND (
 (has_column_privilege(current_user,c.oid,a.attname,'INSERT') AND NOT
 (c.relname='operation_evidence' AND a.attname=ANY(ARRAY['event_id','operation_id','request_hash','event','evidence','expires_at_ms','lock_anchor'])))
 OR (has_column_privilege(current_user,c.oid,a.attname,'UPDATE') AND NOT
 (c.relname='budget_snapshot' AND a.attname='updated_at' OR c.relname<>'budget_snapshot' AND a.attname='lock_anchor'))
 OR has_column_privilege(current_user,c.oid,a.attname,'REFERENCES')))) AS unsafe_privileges
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_roles r ON r.rolname=current_user
 WHERE n.nspname='paia_ai_private' AND c.relname=ANY($1::text[]) AND c.relkind='r'`;
const INSERT=`WITH publication AS MATERIALIZED (
 SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS millis
) INSERT INTO paia_ai_private.operation_evidence(event_id,operation_id,request_hash,event,evidence,expires_at_ms)
 SELECT $1,$2,$3,$4,NULL,$5::bigint FROM publication
 WHERE publication.millis >= $6::bigint AND publication.millis < $7::bigint
 ON CONFLICT(event_id) DO NOTHING RETURNING event_id`;
const INSERT_USAGE=`WITH publication AS MATERIALIZED (
 SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS millis
) INSERT INTO paia_ai_private.operation_evidence(event_id,operation_id,request_hash,event,evidence,expires_at_ms)
 SELECT $1,$2,$3,$4,$8::jsonb,$5::bigint FROM publication
 WHERE publication.millis >= $6::bigint AND publication.millis < $7::bigint
 ON CONFLICT(event_id) DO NOTHING RETURNING event_id`;
const safe=new Set(['PROVIDER_ACCOUNTING_BINDING','PROVIDER_ACCOUNTING_CLOCK','PROVIDER_USAGE_UNQUALIFIED','PROVIDER_USAGE_OVER_CAP','PROVIDER_BILLING_CURRENCY_UNQUALIFIED','AUTHORITY_MISSING','AUTHORITY_EXPIRED','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','AUTHORIZATION','OPERATION_REBOUND','OUTCOME_OR_ATTEMPT_PENDING','PROVIDER_CAPACITY','PROVIDER_EVIDENCE_CONFLICT','PROVIDER_BINDING_EXPIRED','PROVIDER_STOPPED','SERVICE_UNCONFIGURED']);
const failure=error=>error?.code==='POSTGRES_COMMIT_OUTCOME_UNKNOWN'?{decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',...flags}:deny(safe.has(error?.code)?error.code:'SERVICE_UNAVAILABLE');

async function publisherRole(client){
 // Pin unread relations too before inspecting their RLS and privileges.
 await client.query('LOCK TABLE paia_ai_private.budget_snapshot,paia_ai_private.service_control,paia_ai_private.principal_authority,paia_ai_private.route_authority,paia_ai_private.request_authority,paia_ai_private.operation_evidence IN ACCESS SHARE MODE');
 const {rows}=await client.query(ACCESS,[TABLES]);
 if(rows.length!==TABLES.length||new Set(rows.map(r=>r.relname)).size!==TABLES.length||rows.some(r=>!TABLES.includes(r.relname)||r.relrowsecurity!==true||r.relforcerowsecurity!==true||r.rolsuper!==false||r.rolbypassrls!==false||r.is_owner!==false||r.unsafe_privileges!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
}
class DeclarationGuard {
 constructor(options,declaration){this.original=new PostgresRequestAuthority({...options,action:'reserve'});this.declaration=declaration;this.generation=clientDeclarationHash(declaration);this.request=options.bundle.request;}
 async lock(client){
  this.client=client;const authority=await this.original.lock(client);
  const {rows}=await client.query(GRANT,[this.request.operationId]);
  if(rows.length!==1||rows[0].generation!==this.generation||rows[0].request_hash!==this.declaration.requestHash||!equal(rows[0].request,this.request))fail('OPERATION_REBOUND');
  await publisherRole(client);return authority;
 }
 async beforePublish(client){
  const bound=await this.original.beforePublish(client);
  bound.expiresAt=Math.min(bound.expiresAt,this.declaration.expiresAt,this.material?.expiresAt??Number.MAX_SAFE_INTEGER);
  if(bound.expiresAt<=bound.notBefore)fail('PROVIDER_BINDING_EXPIRED');return bound;
 }
}
function currentMaterial(row,material,facts){
 if(!equal(material.identity.reservation.route,facts.route))fail('OPERATION_REBOUND');
 const reserved=reservedProviderRow(row);
 if(hash(canonical(reserved))!==material.identity.reservation.reservationDigest)fail('OPERATION_REBOUND');
}
function rowFrom(state,request,allowed){
 const row=state?.rows.find(value=>value.request.operationId===request.operationId);
 if(!row||!equal(row.request,request))fail('OPERATION_REBOUND');
 if(!allowed.includes(row.state))fail('OUTCOME_OR_ATTEMPT_PENDING');return row;
}

// Internal source composition only. No HTTP route accepts event data, prepare,
// send, ticket, role, clock or caller-selected DB. The original ledger/service
// remains the sole financial writer. A claim is NOT a dispatch acknowledgement.
export function createPostgresProviderEvidencePublisher({pool,identityConfig,profileId,maxConcurrent}={}){
 let storage,config;
 try{if(!(pool instanceof Pool)||typeof profileId!=='string'||!profileId.length||!Number.isSafeInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>16)fail('SERVICE_UNCONFIGURED');config=structuredClone(identityConfig);storage=new PostgresLedgerStorage({pool});}catch{/* Closed without explicit inputs. */}
 const tickets=new WeakMap();
 const inputs=(input,value)=>{const bundle=snapshotBundle(input);return {bundle,declaration:snapshotClientDeclaration(bundle.request,value)};};
 return Object.freeze({
  async claim(input,value,prepare){
   try{
    if(!storage||typeof prepare!=='function')return deny('SERVICE_UNCONFIGURED');
    const {bundle,declaration}=inputs(input,value),request=bundle.request;
    const eventId='provider-dispatch:'+hash(request.operationId),guard=new DeclarationGuard({identityConfig:config,profileId,bundle},declaration);
    let material;
    await storage.transact(async(transaction,authority)=>{
     const state=await transaction.get(LEDGER_KEY),row=rowFrom(state,request,['RESERVED']);
     // No new paid request on a route whose actual conversion cannot settle.
     if(row.quote.nativeCurrency!=='USD')fail('PROVIDER_BILLING_CURRENCY_UNQUALIFIED');
     // Finite concurrency uses the ORIGINAL durable occupations, not another
     // resettable process/account counter. Unknown attempts continue to occupy.
     const occupied=new Set(state.rows.filter(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state)).map(r=>r.request.operationId));
     const pending=await guard.client.query(OCCUPATIONS,[state.rows.filter(r=>r.state==='RESERVED').map(r=>r.request.operationId)]);
     for(const event of pending.rows)occupied.add(event.operation_id);
     if(occupied.size>=maxConcurrent)fail('PROVIDER_CAPACITY');
     if((await guard.client.query(EVENTS,[request.operationId])).rows.length)fail('OUTCOME_OR_ATTEMPT_PENDING');
     material=await prepare({row:structuredClone(row),facts:structuredClone(authority.facts),now:authority.now});
     if(!material||!Number.isSafeInteger(material.expiresAt))fail('PROVIDER_BINDING_EXPIRED');guard.material=material;
     const bound=await guard.beforePublish(guard.client);
     const result=await guard.client.query(INSERT,[eventId,request.operationId,requestBindingHash(request),'DISPATCHED',Math.min(declaration.expiresAt,material.expiresAt),bound.notBefore,bound.expiresAt]);
     if(result.rows?.length!==1||result.rows[0].event_id!==eventId)fail('PROVIDER_EVIDENCE_CONFLICT');
     // No financial put or nontransactional side effect in this callback.
    },guard);
    const ticket=Object.freeze({eventId});
    tickets.set(ticket,{bundle,declaration,material,consumed:false,unknown:false});
    return {decision:'claimed',ticket,material,...flags};
   }catch(error){return failure(error);}
  },
  async sendOnce(ticket,{isCurrent,start}={}){
   const owned=tickets.get(ticket);
   // Consume before any await. A refusal, crash or unknown commit cannot make
   // this same claim eligible for a later physical attempt.
   if(!owned||owned.consumed||typeof isCurrent!=='function'||typeof start!=='function')return deny('OUTCOME_OR_ATTEMPT_PENDING');
   owned.consumed=true;
   let client,began=false,commitStarted=false,started=false,discard=false,pending;
   const onError=()=>{discard=true;};
   try{
    client=await pool.connect();client.on('error',onError);
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');began=true;await client.query(SETTINGS);
    const locked=await client.query(LOCK,[LEDGER_KEY]);
    if(locked.rows.length!==1||locked.rows[0].schema_version!==SCHEMA_VERSION)fail('AUTHORITY_MISSING');
    const state=JSON.parse(encodeSnapshot(locked.rows[0].snapshot));
    const row=rowFrom(state,owned.bundle.request,['DISPATCHED']);
    const guard=new DeclarationGuard({identityConfig:config,profileId,bundle:owned.bundle},owned.declaration);guard.material=owned.material;
    const authority=await guard.lock(client);
    currentMaterial(row,owned.material,authority.facts);
    if(authority.now<state.lastNow)fail('AUTHORITY_EXPIRED');
    const events=await client.query(EVENTS,[owned.bundle.request.operationId]);
    if(events.rows.length!==1||events.rows[0].event_id!==ticket.eventId)fail('PROVIDER_EVIDENCE_CONFLICT');
    // This separate read-only send fence follows ACKNOWLEDGED DISPATCHED commit.
    // Hold actual revocation locks through initiation, but never call a provider
    // inside PostgresLedgerStorage's financial transaction callback.
    const monotonic=performance.now(),bound=await guard.beforePublish(client);
    if(discard||requireSynchronous(isCurrent())!==true||performance.now()-monotonic>=bound.expiresAt-bound.notBefore)fail('PROVIDER_STOPPED');
    started=true;pending=start(owned.material);
    // Promise is boxed: never await provider response while holding ledger locks.
    // Attach a rejection handler immediately, including if fence close fails.
    pending=Promise.resolve(pending);pending.catch(()=>{});
    commitStarted=true;await client.query('COMMIT');began=false;
    if(discard)fail('PROVIDER_STOPPED');
    owned.sendAcknowledged=true;return {decision:'started',pending,...flags};
   }catch(error){
    if(commitStarted)discard=true;else if(began)try{await client.query('ROLLBACK');}catch{discard=true;}
    return started?{decision:'outcome_unknown',reason:'SEND_OUTCOME_UNKNOWN',...flags}:failure(error);
   }finally{if(client){client.removeListener('error',onError);client.release(discard);}}
  },
  async revalidate(ticket,isCurrent){
   const owned=tickets.get(ticket);
   if(!owned||!owned.consumed||typeof isCurrent!=='function')return deny('OUTCOME_OR_ATTEMPT_PENDING');
   try{
    const guard=new DeclarationGuard({identityConfig:config,profileId,bundle:owned.bundle},owned.declaration);guard.material=owned.material;
    const checked=await storage.transact(async(transaction,authority)=>{
     const state=await transaction.get(LEDGER_KEY),row=rowFrom(state,owned.bundle.request,['DISPATCHED','SETTLED']);
     if(authority.now<state.lastNow)fail('AUTHORITY_EXPIRED');
     currentMaterial(row,owned.material,authority.facts);
     const monotonic=performance.now(),bound=await guard.beforePublish(guard.client);
     if(requireSynchronous(isCurrent())!==true)fail('PROVIDER_STOPPED');return {monotonic,...bound};
    },guard);
    if(requireSynchronous(isCurrent())!==true||performance.now()-checked.monotonic>=checked.expiresAt-checked.notBefore)fail('PROVIDER_STOPPED');
    return {decision:'current',checkedAt:checked.notBefore,...flags};
   }catch(error){return failure(error);}
  },
  async publishUsage(ticket,response){
   const owned=tickets.get(ticket);
   if(!owned||!owned.sendAcknowledged||owned.usageAttempted)return deny('OUTCOME_OR_ATTEMPT_PENDING');
   const observed=observedProviderUsage(response,owned.material);
   if(!observed)return deny('PROVIDER_USAGE_UNQUALIFIED');
   // A failed/unknown acknowledgement never permits a second physical request
   // or a new publication with different usage. Durable evidence can be read by
   // the separate settlement-only service without replaying this ticket.
   owned.usageAttempted=true;
   try{
    const request=owned.bundle.request,guard=new ProviderAccountingGuard({identityConfig:config,profileId,request,publishing:true});
    let evidence;
    await storage.transact(async transaction=>{
     const state=await transaction.get(LEDGER_KEY),row=guard.bind(state);
     await publisherRole(guard.client);
     evidence=providerSettlementEvidence(row,owned.material,observed);
     const bound=await guard.beforePublish(guard.client);
     const result=await guard.client.query(INSERT_USAGE,[evidence.receiptId,request.operationId,requestBindingHash(request),'SETTLEMENT',Number.MAX_SAFE_INTEGER,bound.notBefore,bound.expiresAt,JSON.stringify(evidence)]);
     if(result.rows?.length!==1||result.rows[0].event_id!==evidence.receiptId)fail('PROVIDER_EVIDENCE_CONFLICT');
    },guard);
    return {decision:'published',eventId:evidence.receiptId,outcome:evidence.outcome,...flags};
   }catch(error){return failure(error);}
  },
  async unknown(ticket){
   const owned=tickets.get(ticket);
   if(!owned||!owned.consumed||owned.unknown||owned.usageAttempted)return deny('OUTCOME_OR_ATTEMPT_PENDING');
   owned.unknown=true;
   try{
    const {bundle,declaration}=owned,eventId='provider-unknown:'+hash(bundle.request.operationId);
    const guard=new DeclarationGuard({identityConfig:config,profileId,bundle},declaration);
    await storage.transact(async transaction=>{
     rowFrom(await transaction.get(LEDGER_KEY),bundle.request,['DISPATCHED','OUTCOME_UNKNOWN']);
     const bound=await guard.beforePublish(guard.client);
     const result=await guard.client.query(INSERT,[eventId,bundle.request.operationId,requestBindingHash(bundle.request),'OUTCOME_UNKNOWN',declaration.expiresAt,bound.notBefore,bound.expiresAt]);
     if(result.rows?.length!==1||result.rows[0].event_id!==eventId)fail('PROVIDER_EVIDENCE_CONFLICT');
    },guard);
    return {decision:'published',eventId,...flags};
   }catch(error){return failure(error);}
  },
 });
}
