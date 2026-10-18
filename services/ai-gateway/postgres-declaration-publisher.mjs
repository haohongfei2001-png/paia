import {Pool} from 'pg';
import {createSignedIdentityVerifier,exactData,snapshotRequest,requestBindingHash} from './signed-identity.mjs';
import {snapshotClientDeclaration,clientDeclarationHash} from './client-declaration.mjs';
import {identityConfigHash} from './postgres-authority.mjs';
import {LEDGER_KEY,SCHEMA_VERSION} from './postgres-ledger.mjs';
import {equal} from '../../extension/core/ai-usage/contracts.js';

// This publisher authenticates a CLIENT-OWNER declaration. Signatures prove the
// principal/entitlement and original request, NOT server knowledge of content or
// consent. Original local domain owners must create/revalidate the declaration.
// It cannot reserve money, dispatch, settle, release holds or renew old requests.
const publishers=new WeakSet();
export const isDeclarationPublisher=value=>value!==null&&typeof value==='object'&&publishers.has(value);
class DeclarationPublicationError extends Error {constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new DeclarationPublicationError(code);};
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
const millis=value=>{if(typeof value!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(value)||!integer(Number(value)))fail('AUTHORITY_INVALID');return Number(value);};
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const deny=reason=>({decision:'deny',reason,...flags});
const SAFE_CODES=new Set(['SERVICE_UNCONFIGURED','AUTHORITY_MISSING','AUTHORITY_INVALID','AUTHORITY_EXPIRED','SERVICE_PROFILE_UNQUALIFIED','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','OPERATION_REBOUND','DECLARATION_REVOKED','CLOCK_ROLLBACK','POSTGRES_SCHEMA_VERSION','POSTGRES_LEDGER_MISSING']);
const TABLES=Object.freeze(['budget_snapshot','service_control','principal_authority','route_authority','request_authority','operation_evidence']);
const SETTINGS_SQL=`SELECT set_config('search_path', 'pg_catalog', true),
 set_config('lock_timeout', '5000ms', true), set_config('statement_timeout', '15000ms', true),
 set_config('idle_in_transaction_session_timeout', '15000ms', true), set_config('synchronous_commit', 'on', true)`;
const LEDGER_SQL="SELECT schema_version, snapshot ->> 'lastNow' AS last_now_ms FROM paia_ai_private.budget_snapshot WHERE ledger_key = $1 FOR UPDATE";
const CONTROL_SQL='SELECT profile_id, identity_config_hash, generation, enabled, day_limit_micros::text, month_limit_micros::text, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const PRINCIPAL_SQL='SELECT security, time_zone FROM paia_ai_private.principal_authority WHERE principal_id = $1 AND library_id = $2 FOR SHARE';
const REQUEST_SQL='SELECT request_hash, request, generation, authorized, issued_at_ms::text, expires_at_ms::text FROM paia_ai_private.request_authority WHERE operation_id = $1 FOR UPDATE';
const CLOCK_SQL='SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms';
// Dedicated least-privilege publisher pool. Effective inherited privileges count.
// The reservation role, which can UPDATE(snapshot), deliberately fails this test.
// budget_snapshot has no inert lock_anchor: UPDATE(updated_at) is the sole
// harmless column privilege allowed there to satisfy PostgreSQL's FOR UPDATE.
// This source does not create roles, RLS policies, credentials or grants.
const ACCESS_SQL=`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
 r.rolsuper, r.rolbypassrls, c.relowner = r.oid AS is_owner,
 (has_schema_privilege(current_user, n.oid, 'CREATE')
  OR has_table_privilege(current_user, c.oid, 'DELETE,TRUNCATE,TRIGGER,REFERENCES')
  OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = c.oid
   AND a.attnum > 0 AND NOT a.attisdropped AND (
    (has_column_privilege(current_user, c.oid, a.attname, 'INSERT') AND
     NOT (c.relname = 'request_authority' AND a.attname = ANY(ARRAY['operation_id','request_hash','request','generation','authorized','issued_at_ms','expires_at_ms','lock_anchor'])))
    OR (has_column_privilege(current_user, c.oid, a.attname, 'UPDATE') AND NOT (
      c.relname = 'budget_snapshot' AND a.attname = 'updated_at'
      OR c.relname = 'request_authority' AND a.attname = ANY(ARRAY['authorized','lock_anchor'])
      OR c.relname <> 'budget_snapshot' AND a.attname = 'lock_anchor'))
    OR has_column_privilege(current_user, c.oid, a.attname, 'REFERENCES')))) AS unsafe_privileges
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 JOIN pg_catalog.pg_roles r ON r.rolname = current_user
 WHERE n.nspname = 'paia_ai_private' AND c.relname = ANY($1::text[]) AND c.relkind = 'r'`;
const PUBLICATION_CTE=`WITH publication AS MATERIALIZED (
 SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS millis
)`;
const INSERT_SQL=`${PUBLICATION_CTE}
 INSERT INTO paia_ai_private.request_authority(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms)
 SELECT $1,$2,$3::jsonb,$4,$5::boolean,publication.millis,
 CASE WHEN $5::boolean THEN LEAST($6::bigint,publication.millis+60000) ELSE publication.millis END
 FROM publication WHERE publication.millis >= $7::bigint AND publication.millis < $8::bigint
 ON CONFLICT(operation_id) DO NOTHING
 RETURNING request_hash,generation,authorized,issued_at_ms::text,expires_at_ms::text`;
const REVOKE_SQL=`${PUBLICATION_CTE}
 UPDATE paia_ai_private.request_authority SET authorized = false FROM publication
 WHERE operation_id = $1 AND request_hash = $2 AND generation = $3
 AND publication.millis >= $4::bigint AND publication.millis < $5::bigint
 RETURNING request_hash,generation,authorized,issued_at_ms::text,expires_at_ms::text`;
const REPEAT_SQL=`${PUBLICATION_CTE}
 SELECT request_hash,generation,authorized,issued_at_ms::text,expires_at_ms::text
 FROM paia_ai_private.request_authority,publication
 WHERE operation_id = $1 AND request_hash = $2 AND generation = $3
 AND publication.millis >= $4::bigint AND publication.millis < $5::bigint`;
const one=async(client,sql,args=[])=>{const result=await client.query(sql,args);if(result.rows.length!==1)fail('AUTHORITY_MISSING');return structuredClone(result.rows[0]);};
const clock=async client=>millis((await one(client,CLOCK_SQL)).now_ms);
function snapshotBundle(input){
 exactData(input,['request','principalToken','entitlementToken']);
 if(!['principalToken','entitlementToken'].every(key=>typeof input[key]==='string'&&input[key].length>0&&input[key].length<=8192))fail('AUTHORIZATION');
 return Object.freeze({request:snapshotRequest(input.request),principalToken:input.principalToken,entitlementToken:input.entitlementToken});
}
function checkRow(row,request,hash,generation){
 exactData(row,['request_hash','request','generation','authorized','issued_at_ms','expires_at_ms']);
 if(typeof row.authorized!=='boolean'||millis(row.expires_at_ms)<millis(row.issued_at_ms)||millis(row.expires_at_ms)-millis(row.issued_at_ms)>60000)fail('AUTHORITY_INVALID');
 if(row.request_hash!==hash||!equal(row.request,request)||row.generation!==generation)fail('OPERATION_REBOUND');
}
function verifyAt({at,control,principal,config,configHash,profile,bundle}){
 exactData(control,['profile_id','identity_config_hash','generation','enabled','day_limit_micros','month_limit_micros','expires_at_ms']);
 exactData(principal,['security','time_zone']);
 if(control.profile_id!==profile||control.identity_config_hash!==configHash||!text(control.generation)||control.enabled!==true)fail('SERVICE_PROFILE_UNQUALIFIED');
 if(millis(control.expires_at_ms)<=at)fail('AUTHORITY_EXPIRED');
 return createSignedIdentityVerifier({config,clock:()=>at,readSecurityState:()=>principal.security}).verifyValidity(bundle);
}

// Fixed composition. No request-selected pool, role, profile, clock or arbitrary
// authority callback. The caller must supply a separately qualified publisher
// pool; using this object cannot expand the original reservation runtime role.
export function createPostgresDeclarationPublisher({pool,identityConfig,profileId}={}){
 let config,configHash,ready=false;
 try{if(!(pool instanceof Pool)||!text(profileId))fail('SERVICE_UNCONFIGURED');config=structuredClone(identityConfig);configHash=identityConfigHash(config);ready=true;}catch{/* Default closed. */}
 const execute=async(action,input,value)=>{
  let client,began=false,commitStarted=false,discard=false;
  const onError=()=>{discard=true;};
  try{
   if(!ready)return deny('SERVICE_UNCONFIGURED');
   // Snapshot all caller-controlled data before the first asynchronous boundary.
   const bundle=snapshotBundle(input),request=bundle.request,declaration=snapshotClientDeclaration(request,value);
   const hash=requestBindingHash(request),generation=clientDeclarationHash(declaration);
   client=await pool.connect();client.on('error',onError);
   await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');began=true;
   await client.query(SETTINGS_SQL);
   // Same singleton as ALL reservations, then control, principal and exact
   // operation row. The singleton also serializes the absent-row INSERT case.
   const ledger=await one(client,LEDGER_SQL,[LEDGER_KEY]);
   if(ledger.schema_version!==SCHEMA_VERSION)fail('POSTGRES_SCHEMA_VERSION');
   const control=await one(client,CONTROL_SQL);
   const principal=await one(client,PRINCIPAL_SQL,[request.principalId,request.libraryId]);
   const found=await client.query(REQUEST_SQL,[request.operationId]);
   if(found.rows.length>1)fail('AUTHORITY_INVALID');
   const existing=found.rows.length?structuredClone(found.rows[0]):null;
   // Relation locks from these statements pin the inspected schemas through
   // COMMIT. Also lock the unread authority tables against conflicting DDL.
   await client.query('LOCK TABLE paia_ai_private.route_authority, paia_ai_private.operation_evidence IN ACCESS SHARE MODE');
   const access=await client.query(ACCESS_SQL,[TABLES]);
   if(access.rows.length!==TABLES.length||new Set(access.rows.map(row=>row.relname)).size!==TABLES.length||access.rows.some(row=>!TABLES.includes(row.relname)||row.relrowsecurity!==true||row.relforcerowsecurity!==true||row.rolsuper!==false||row.rolbypassrls!==false||row.is_owner!==false||row.unsafe_privileges!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
   const startedAt=await clock(client),context={control,principal,config,configHash,profile:profileId,bundle};
   if(ledger.last_now_ms!==null&&startedAt<millis(ledger.last_now_ms))fail('CLOCK_ROLLBACK');
   verifyAt({...context,at:startedAt});
   if(existing){
    checkRow(existing,request,hash,generation);
    if(millis(existing.issued_at_ms)>startedAt)fail('CLOCK_ROLLBACK');
    if(action==='publish'&&existing.authorized===false)fail('DECLARATION_REVOKED');
   }
   // Check time/proofs after all awaited work. Rows remain locked, and the SQL
   // publication also checks its own real DB clock against this verified span.
   const at=await clock(client);if(at<startedAt)fail('CLOCK_ROLLBACK');
   const identity=verifyAt({...context,at});
   let validUntil=Math.min(identity.verifiedUntil,millis(control.expires_at_ms));
   if(action==='publish')validUntil=Math.min(validUntil,declaration.expiresAt,existing?millis(existing.expires_at_ms):Number.MAX_SAFE_INTEGER);
   const publicationUntil=Math.min(at+1000,validUntil);
   if(publicationUntil<=at)fail('AUTHORITY_EXPIRED');
   verifyAt({...context,at:publicationUntil-1});
   let result;
   if(!existing)result=await client.query(INSERT_SQL,[request.operationId,hash,JSON.stringify(request),generation,action==='publish',Math.min(validUntil,declaration.expiresAt),at,publicationUntil]);
   else result=await client.query(action==='revoke'&&existing.authorized?REVOKE_SQL:REPEAT_SQL,[request.operationId,hash,generation,at,publicationUntil]);
   if(result.rows?.length!==1)fail('AUTHORITY_EXPIRED');
   const row=result.rows[0];
   exactData(row,['request_hash','generation','authorized','issued_at_ms','expires_at_ms']);
   const issuedAt=millis(row.issued_at_ms),expiresAt=millis(row.expires_at_ms);
   if(row.request_hash!==hash||row.generation!==generation||row.authorized!==(action==='publish')||expiresAt<issuedAt||expiresAt-issuedAt>60000)fail('AUTHORITY_INVALID');
   if(existing){
    if(issuedAt!==millis(existing.issued_at_ms)||expiresAt!==millis(existing.expires_at_ms))fail('AUTHORITY_INVALID');
   }else if(issuedAt<at||issuedAt>=publicationUntil||
    (action==='publish'?(expiresAt<=issuedAt||expiresAt>Math.min(validUntil,declaration.expiresAt)):expiresAt!==issuedAt))fail('AUTHORITY_INVALID');
   if(discard)fail('SERVICE_UNAVAILABLE');
   commitStarted=true;await client.query('COMMIT');began=false;
   if(discard)fail('SERVICE_UNAVAILABLE');
   return {decision:action==='publish'?'published':'revoked',requestHash:hash,generation,issuedAt,expiresAt,...flags};
  }catch(error){
   if(commitStarted){discard=true;return {decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',...flags};}
   if(client&&began){try{await client.query('ROLLBACK');}catch{discard=true;}}else if(client)discard=true;
   const reason=SAFE_CODES.has(error?.code)?error.code:error?.code?.startsWith('IDENTITY_')||['AUTHORIZATION','ENTITLEMENT_INVALID','REQUEST_INVALID','CLIENT_DECLARATION_INVALID','DECLARATION_INVALID'].includes(error?.code)?'AUTHORIZATION':'SERVICE_UNAVAILABLE';
   return deny(reason);
  }finally{if(client){client.removeListener('error',onError);client.release(discard);}}
 };
 const publisher=Object.freeze({publish:(bundle,declaration)=>execute('publish',bundle,declaration),revoke:(bundle,declaration)=>execute('revoke',bundle,declaration)});
 publishers.add(publisher);return publisher;
}
