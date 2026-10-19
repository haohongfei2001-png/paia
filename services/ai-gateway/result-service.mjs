import {PostgresLedgerStorage,LEDGER_KEY} from './postgres-ledger.mjs';
import {identityConfigHash} from './postgres-authority.mjs';
import {createSignedIdentityVerifier,exactData,requestBindingHash} from './signed-identity.mjs';
import {snapshotResultBundle,snapshotResultDeclaration} from './result-declaration.mjs';
import {BudgetWindowReservation} from '../../extension/core/ai-usage/budget-window-reservation.js';
import {budgetWindow} from '../../extension/core/ai-usage/budget-window-policy.js';
import {equal} from '../../extension/core/ai-usage/contracts.js';

const services=new WeakSet();
export const isResultService=value=>value!==null&&typeof value==='object'&&services.has(value);
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const deny=reason=>({decision:'deny',reason,...flags});
const fail=code=>{throw Object.assign(Error(code),{code});};
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
const millis=value=>{if(typeof value!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(value)||!Number.isSafeInteger(Number(value)))fail('RESULT_CLOCK_INVALID');return Number(value);};
const CLOCK="SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms";
const CONTROL='SELECT profile_id, identity_config_hash, generation, enabled, day_limit_micros::text, month_limit_micros::text, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const PRINCIPAL='SELECT security, time_zone FROM paia_ai_private.principal_authority WHERE principal_id = $1 AND library_id = $2 FOR SHARE';
const EVENT='SELECT operation_id, request_hash, event, evidence, expires_at_ms::text FROM paia_ai_private.operation_evidence WHERE event_id = $1 FOR SHARE';
const CANCEL_EVENTS='SELECT event_id FROM paia_ai_private.operation_evidence WHERE operation_id = $1 LIMIT 1 FOR SHARE';
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
const one=async(client,sql,args=[])=>{const {rows}=await client.query(sql,args);if(rows.length!==1)fail('RESULT_AUTHORITY_MISSING');return structuredClone(rows[0]);};
const clock=async client=>millis((await one(client,CLOCK)).now_ms);

// A result-only historical binding guard. Current signed identity/security is
// mandatory. Expired/revoked content grants, routes and ratebooks are neither a
// new grant nor grounds to erase consumed finance or an actual historical result.
// The original singleton lock precedes control, principal and immutable events.
class ResultDeclarationAuthority {
 constructor({config,profileId,bundle,result}){this.config=config;this.profileId=profileId;this.bundle=bundle;this.result=result;}
 async lock(client){
  this.client=client;
  await client.query('LOCK TABLE paia_ai_private.service_control,paia_ai_private.principal_authority,paia_ai_private.route_authority,paia_ai_private.request_authority,paia_ai_private.operation_evidence IN ACCESS SHARE MODE');
  this.control=await one(client,CONTROL);
  this.principal=await one(client,PRINCIPAL,[this.bundle.request.principalId,this.bundle.request.libraryId]);
  const {rows}=await client.query(ACCESS,[TABLES]);
  if(rows.length!==TABLES.length||new Set(rows.map(r=>r.relname)).size!==TABLES.length||rows.some(r=>!TABLES.includes(r.relname)||r.relrowsecurity!==true||r.relforcerowsecurity!==true||r.rolsuper!==false||r.rolbypassrls!==false||r.is_owner!==false||r.can_mutate!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
  this.now=await clock(client);this.verify(this.now);return {now:this.now};
 }
 verify(at){
  exactData(this.control,['profile_id','identity_config_hash','generation','enabled','day_limit_micros','month_limit_micros','expires_at_ms']);
  exactData(this.principal,['security','time_zone']);
  if(this.control.profile_id!==this.profileId||this.control.identity_config_hash!==identityConfigHash(this.config)||!text(this.principal.time_zone))fail('RESULT_AUTHORITY_BINDING');
  const identity=createSignedIdentityVerifier({config:this.config,clock:()=>at,readSecurityState:()=>this.principal.security}).verifyValidity(this.bundle);
  this.facts={authorized:true,verifiedServiceFacts:true,request:this.bundle.request,tier:identity.tier,timeZone:this.principal.time_zone};return identity;
 }
 async bind(state){
  const r=this.bundle.request,anchor=state?.rows.find(row=>row.request.operationId===r.operationId);
  if(!anchor||!equal(anchor.request,r)||r.childIndex!==0)fail('OPERATION_REBOUND');
  if(this.now<state.lastNow)fail('CLOCK_ROLLBACK');
  const group=state.rows.filter(row=>row.request.jobId===r.jobId);
  // The original finalizeResult is the final child/group/terminal authority.
  // These checks bind every declared paid receipt to its independent immutable
  // server event too; clients never supply prices, usage, state or refund flags.
  if(group.length!==this.result.children.length)fail('RESULT_SCOPE_INCOMPLETE');
  for(const row of [...group].sort((a,b)=>a.request.childIndex-b.request.childIndex)){
   const child=this.result.children.find(child=>child.operationId===row.request.operationId);
   if(!child||row.request.principalId!==r.principalId||row.request.libraryId!==r.libraryId)fail('RESULT_SCOPE_INCOMPLETE');
   if(row.state==='CANCELLED_BEFORE_DISPATCH'){
    if(child.receiptId!==null||(await this.client.query(CANCEL_EVENTS,[row.request.operationId])).rows.length)fail('RESULT_FINANCIAL_BINDING');
   }else{
    if(row.state!=='SETTLED'||!['VALIDATED','FAILED'].includes(row.settlement?.outcome)||child.receiptId!==row.settlement.receiptId)fail('RESULT_SCOPE_INCOMPLETE');
    const event=await one(this.client,EVENT,[child.receiptId]);
    exactData(event,['operation_id','request_hash','event','evidence','expires_at_ms']);
    if(event.operation_id!==row.request.operationId||event.request_hash!==requestBindingHash(row.request)||event.event!=='SETTLEMENT'||!equal(event.evidence,row.settlement))fail('RESULT_FINANCIAL_BINDING');
   }
  }
  this.bound=true;this.window=budgetWindow(this.facts,this.now);
 }
 async beforePublish(client){
  if(!this.bound)fail('RESULT_AUTHORITY_BINDING');
  const at=await clock(client);if(at<this.now)fail('CLOCK_ROLLBACK');
  const identity=this.verify(at),expiresAt=Math.min(at+1000,identity.verifiedUntil,this.window.endsAt);
  if(expiresAt<=at)fail('RESULT_AUTHORITY_EXPIRED');
  this.verify(expiresAt-1);return {notBefore:at,expiresAt};
 }
}
const safe=new Set(['SERVICE_UNCONFIGURED','RESULT_AUTHORITY_MISSING','RESULT_AUTHORITY_BINDING','RESULT_AUTHORITY_EXPIRED','RESULT_CLOCK_INVALID','RESULT_FINANCIAL_BINDING','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','OPERATION_REBOUND','RESULT_SCOPE_INCOMPLETE','RESULT_CONFLICT','RESULT_HISTORY_INVALID','RECEIPT_REBOUND','CLOCK_ROLLBACK','POSTGRES_AUTHORITY_EXPIRED','BUDGET_SNAPSHOT_CAPACITY']);
// Fixed source composition; there is NO per-request verifier, trusted flag,
// pool, configuration, financial settlement or current-content callback.
export function createPostgresResultService({pool,identityConfig,profileId}={}){
 let storage,config;
 try{if(!text(profileId))throw Error();config=structuredClone(identityConfig);identityConfigHash(config);storage=new PostgresLedgerStorage({pool});}catch{}
 const service=Object.freeze({async finalize(input,value){
  try{
   if(!storage||!config)return deny('SERVICE_UNCONFIGURED');
   const bundle=snapshotResultBundle(input),result=snapshotResultDeclaration(bundle.request,value);
   const guard=new ResultDeclarationAuthority({config,profileId,bundle,result});
   const answer=await storage.transact(async(transaction,authority)=>{
    await guard.bind(await transaction.get(LEDGER_KEY));
    const owner=new BudgetWindowReservation({service:{transact:callback=>callback(transaction),clock:()=>authority.now,
     verifyRequest:request=>{if(!equal(request,bundle.request))fail('OPERATION_REBOUND');return structuredClone(guard.facts);},
     verifySettlement:()=>{fail('UNQUALIFIED_SETTLEMENT');},
     verifyResult:(request,evidence)=>({verifiedResultFacts:guard.bound===true&&equal(request,bundle.request)&&equal(evidence,result),request,evidence})}});
    return owner.finalizeResult(bundle.request,result);
   },guard);
   return {decision:'finalized',operationId:bundle.request.operationId,jobId:result.jobId,receiptId:result.receiptId,resultOutcome:answer.resultOutcome,effectiveResults:answer.effectiveResults,...flags};
  }catch(error){
   if(error?.code==='POSTGRES_COMMIT_OUTCOME_UNKNOWN')return {decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',...flags};
   return deny(safe.has(error?.code)?error.code:error?.code?.startsWith('IDENTITY_')||['AUTHORIZATION','ENTITLEMENT_INVALID','REQUEST_INVALID','RESULT_DECLARATION_INVALID'].includes(error?.code)?'AUTHORIZATION':'SERVICE_UNAVAILABLE');
  }
 }});services.add(service);return service;
}
