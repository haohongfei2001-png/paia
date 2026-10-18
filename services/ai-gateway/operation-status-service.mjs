import {PostgresLedgerStorage,LEDGER_KEY} from './postgres-ledger.mjs';
import {identityConfigHash} from './postgres-authority.mjs';
import {createSignedIdentityVerifier,exactData,requestBindingHash} from './signed-identity.mjs';
import {snapshotResultBundle} from './result-declaration.mjs';
import {ProviderAccountingGuard,providerSettlementId} from './provider-settlement.mjs';
import {BudgetWindowReservation} from '../../extension/core/ai-usage/budget-window-reservation.js';
import {validateWindowHistory} from '../../extension/core/ai-usage/budget-window-policy.js';
import {validateResultHistory} from '../../extension/core/ai-usage/result-finalization.js';
import {equal} from '../../extension/core/ai-usage/contracts.js';

const services=new WeakSet();
export const isOperationStatusService=value=>value!==null&&typeof value==='object'&&services.has(value);
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const deny=reason=>({decision:'deny',reason,...flags});
const fail=code=>{throw Object.assign(Error(code),{code});};
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
const CLOCK="SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms";
const CONTROL='SELECT profile_id, identity_config_hash, generation, enabled, day_limit_micros::text, month_limit_micros::text, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const PRINCIPAL='SELECT security, time_zone FROM paia_ai_private.principal_authority WHERE principal_id = $1 AND library_id = $2 FOR SHARE';
const EVENT='SELECT operation_id, request_hash, event, evidence, expires_at_ms::text FROM paia_ai_private.operation_evidence WHERE event_id = $1 FOR SHARE';
const ANY_EVENT='SELECT event_id FROM paia_ai_private.operation_evidence WHERE operation_id = $1 LIMIT 1 FOR SHARE';
const TABLES=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
const ACCESS=`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
 r.rolsuper,r.rolbypassrls,c.relowner=r.oid AS is_owner,
 (has_schema_privilege(current_user,n.oid,'CREATE')
 OR has_table_privilege(current_user,c.oid,'INSERT,DELETE,TRUNCATE,TRIGGER,REFERENCES')
 OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND (
 has_column_privilege(current_user,c.oid,a.attname,'INSERT,REFERENCES')
 OR a.attname<>'lock_anchor' AND has_column_privilege(current_user,c.oid,a.attname,'UPDATE')))) AS can_mutate
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_roles r ON r.rolname=current_user
 WHERE n.nspname='paia_ai_private' AND c.relname=ANY($1::text[]) AND c.relkind='r'`;
const one=async(client,sql,args=[])=>{const {rows}=await client.query(sql,args);if(rows.length!==1)fail('OPERATION_STATUS_AUTHORITY');return structuredClone(rows[0]);};
const clock=async client=>{const value=(await one(client,CLOCK)).now_ms;if(typeof value!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(value)||!Number.isSafeInteger(Number(value)))fail('OPERATION_STATUS_CLOCK');return Number(value);};

// Current signed identity authorizes disclosure of exact historical metadata.
// Historical content/route expiry is not current identity revocation, a refund,
// permission to re-enter a provider, or proof that an attempt never entered.
class OperationStatusAuthority {
 constructor({config,profileId,bundle}){this.config=config;this.profileId=profileId;this.bundle=bundle;this.minNow=0;}
 async lock(client){
  this.client=client;
  // Storage already holds the original singleton FOR UPDATE. All publishers
  // use that same ledger lock before control/principal/immutable event rows.
  await client.query('LOCK TABLE paia_ai_private.service_control,paia_ai_private.principal_authority,paia_ai_private.route_authority,paia_ai_private.request_authority,paia_ai_private.operation_evidence IN ACCESS SHARE MODE');
  this.control=await one(client,CONTROL);
  this.principal=await one(client,PRINCIPAL,[this.bundle.request.principalId,this.bundle.request.libraryId]);
  const {rows}=await client.query(ACCESS,[TABLES]);
  if(rows.length!==TABLES.length||new Set(rows.map(row=>row.relname)).size!==TABLES.length||rows.some(row=>!TABLES.includes(row.relname)||row.relrowsecurity!==true||row.relforcerowsecurity!==true||row.rolsuper!==false||row.rolbypassrls!==false||row.is_owner!==false||row.can_mutate!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
  this.now=await clock(client);this.observedNow=this.now;this.verify(this.now);return {now:this.now};
 }
 verify(at){
  exactData(this.control,['profile_id','identity_config_hash','generation','enabled','day_limit_micros','month_limit_micros','expires_at_ms']);exactData(this.principal,['security','time_zone']);
  if(this.control.profile_id!==this.profileId||this.control.identity_config_hash!==identityConfigHash(this.config))fail('OPERATION_STATUS_AUTHORITY');
  return createSignedIdentityVerifier({config:this.config,clock:()=>at,readSecurityState:()=>this.principal.security}).verifyValidity(this.bundle);
 }
 observe(at){
  if(at<this.observedNow||at<this.minNow)fail('CLOCK_ROLLBACK');this.observedNow=at;return at;
 }
 async finishRead(){
  const at=this.observe(await clock(this.client));this.verify(at);return at;
 }
 async event(id){
  const {rows}=await this.client.query(EVENT,[id]);if(rows.length>1)fail('OPERATION_STATUS_BINDING');
  if(!rows.length)return null;const event=structuredClone(rows[0]);
  exactData(event,['operation_id','request_hash','event','evidence','expires_at_ms']);
  if(event.operation_id!==this.bundle.request.operationId||event.request_hash!==requestBindingHash(this.bundle.request)||event.event!=='SETTLEMENT'||event.evidence?.receiptId!==id)fail('OPERATION_STATUS_BINDING');
  return event;
 }
 async beforePublish(client){
  if(!this.accounting)fail('OPERATION_STATUS_BINDING');
  // Accounting has its own DB-clock and historical spend/window validation.
  // Bound its original publication interval by the CURRENT verified identity.
  const bound=await this.accounting.beforePublish(client);
  this.observe(bound.notBefore);
  const identity=this.verify(bound.notBefore),expiresAt=Math.min(bound.expiresAt,identity.verifiedUntil);
  if(expiresAt<=bound.notBefore)fail('OPERATION_STATUS_EXPIRED');this.verify(expiresAt-1);
  return {notBefore:bound.notBefore,expiresAt};
 }
}
const safe=new Set(['OPERATION_REBOUND','OPERATION_STATUS_AUTHORITY','OPERATION_STATUS_BINDING','OPERATION_STATUS_CLOCK','OPERATION_STATUS_EXPIRED','CLOCK_ROLLBACK','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','PROVIDER_ACCOUNTING_BINDING','PROVIDER_ACCOUNTING_CLOCK','PROVIDER_USAGE_UNQUALIFIED','SETTLEMENT_CONFLICT','SETTLEMENT_OVER_BOUND','SETTLEMENT_PRICING','SETTLEMENT_COST_MISMATCH','USAGE_INVALID','RESULT_HISTORY_INVALID','BUDGET_STATE_INVALID','WINDOW_HISTORY_UNQUALIFIED','POSTGRES_AUTHORITY_EXPIRED']);
function metadata(request,row,providerEvidenceRecorded,observedAt,authenticatedIdentity=null){
 // A missing row/event is NOT no-consumption evidence. No monetary zero, new
 // operation, refreshed window, provider ticket or replay capability is issued.
 if(!row)return {decision:'queried',operationId:request.operationId,jobId:request.jobId,state:'NOT_FOUND',financialOutcome:'UNKNOWN',providerEvidenceRecorded,observedAt,reservation:null,...flags};
 const settled=row.state==='SETTLED',cancelled=row.state==='CANCELLED_BEFORE_DISPATCH';
 return {decision:'queried',operationId:request.operationId,jobId:request.jobId,state:row.state,
  financialOutcome:settled?'KNOWN':cancelled?'CANCELLED_BEFORE_DISPATCH':'UNKNOWN',providerEvidenceRecorded,observedAt,
  // An exact historical row view for client request qualification only. Event
  // absence cannot prove no physical entry; the server claim remains mandatory.
  reservation:row.state==='RESERVED'&&providerEvidenceRecorded===false?structuredClone(Object.fromEntries(['request','state','reservedAt','window','reservationMicros','quote','pricing'].map(key=>[key,row[key]]))):null,
  reservedAt:row.reservedAt,reservationMicros:row.reservationMicros,window:structuredClone(row.window),
  heldSpendMicros:settled||cancelled?0:row.reservationMicros,settledSpendMicros:settled?row.settlement.usdMicros:null,
  financialSettlement:structuredClone(row.settlement??null),unknownReceipt:structuredClone(row.unknownReceipt??null),
  resultResolution:structuredClone(row.resultResolution??null),effectiveResults:row.resultCommitted===true?1:0,authenticatedIdentity,...flags};
}
// No current-content callback, caller-provided evidence, pool or verifier. One
// original ledger transaction may reconcile ONLY a preexisting immutable event
// through its original accounting owner. Read-only queries never put a snapshot.
export function createPostgresOperationStatusService({pool,identityConfig,profileId}={}){
 let storage,config;try{if(!text(profileId))throw Error();config=structuredClone(identityConfig);identityConfigHash(config);storage=new PostgresLedgerStorage({pool});}catch{}
 const service=Object.freeze({async query(input){
  try{
   if(!storage||!config)return deny('SERVICE_UNCONFIGURED');
   const bundle=snapshotResultBundle(input),request=bundle.request,guard=new OperationStatusAuthority({config,profileId,bundle});
   return await storage.transact(async transaction=>{
    let state=await transaction.get(LEDGER_KEY),row;
    if(state){
     guard.minNow=state.lastNow;if(guard.now<state.lastNow)fail('CLOCK_ROLLBACK');validateResultHistory(state,guard.now);validateWindowHistory(state,guard.now);
     const rows=state.rows.filter(value=>value.request.operationId===request.operationId);
     if(rows.length>1||rows.length===1&&!equal(rows[0].request,request))fail('OPERATION_REBOUND');row=rows[0];
    }
    const providerEvidenceRecorded=row?(await guard.client.query(ANY_EVENT,[request.operationId])).rows.length>0:null;
    if(row?.state==='CANCELLED_BEFORE_DISPATCH'&&providerEvidenceRecorded)fail('OPERATION_STATUS_BINDING');
    if(row?.state==='SETTLED'){
     const event=await guard.event(row.settlement.receiptId);if(!event||!equal(event.evidence,row.settlement))fail('OPERATION_STATUS_BINDING');
    }else if(row&&['DISPATCHED','OUTCOME_UNKNOWN'].includes(row.state)){
     const eventId=providerSettlementId(request),event=await guard.event(eventId);
     if(event){
      const accounting=new ProviderAccountingGuard({identityConfig:config,profileId,request,eventId});
      const authority=await accounting.lock(guard.client);guard.observe(authority.now);accounting.bind(state);guard.accounting=accounting;
      const owner=new BudgetWindowReservation({service:{transact:callback=>callback(transaction),clock:()=>authority.now,
       verifyRequest:r=>{if(!equal(r,request))fail('OPERATION_REBOUND');return structuredClone(accounting.facts);},
       verifySettlement:(r,e)=>({verifiedSettlementFacts:equal(r,request)&&equal(e,authority.event.evidence),request:r,evidence:e})}});
      await owner.settle(request,authority.event.evidence);
      state=await transaction.get(LEDGER_KEY);row=state.rows.find(value=>value.request.operationId===request.operationId);
     }
    }
    const observedAt=await guard.finishRead();let authenticatedIdentity=null;
    // The existing authenticated status query may carry a short, exact current
    // identity observation for local Filter qualification. This is never a
    // dispatch/financial lease and cannot revive a historical cancelled row.
    const c=guard.control,expiry=Number(c.expires_at_ms);
    if(row?.state==='RESERVED'&&providerEvidenceRecorded===false&&c.enabled===true&&text(c.generation)&&typeof c.expires_at_ms==='string'&&/^(?:0|[1-9][0-9]{0,15})$/.test(c.expires_at_ms)&&Number.isSafeInteger(expiry)&&expiry>observedAt){
     const identity=guard.verify(observedAt),verifiedUntil=Math.min(identity.verifiedUntil,expiry);
     if(verifiedUntil>observedAt)authenticatedIdentity={version:1,...identity,verifiedUntil,authorityGeneration:c.generation,observedAt,requestHash:requestBindingHash(request)};
    }
    return metadata(request,row,providerEvidenceRecorded,observedAt,authenticatedIdentity);
   },guard);
  }catch(error){
   if(error?.code==='POSTGRES_COMMIT_OUTCOME_UNKNOWN')return {decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',...flags};
   return deny(safe.has(error?.code)?error.code:error?.code?.startsWith('IDENTITY_')||['AUTHORIZATION','ENTITLEMENT_INVALID','REQUEST_INVALID','RESULT_DECLARATION_INVALID'].includes(error?.code)?'AUTHORIZATION':'SERVICE_UNAVAILABLE');
  }
 }});services.add(service);return service;
}
