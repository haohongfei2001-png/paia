import {createHash} from 'node:crypto';
import {PostgresLedgerStorage,LEDGER_KEY} from './postgres-ledger.mjs';
import {identityConfigHash} from './postgres-authority.mjs';
import {snapshotRequest,requestBindingHash,exactData} from './signed-identity.mjs';
import {BudgetWindowReservation} from '../../extension/core/ai-usage/budget-window-reservation.js';
import {budgetWindow} from '../../extension/core/ai-usage/budget-window-policy.js';
import {canonical,equal} from '../../extension/core/ai-usage/contracts.js';
import {normalizeUsage} from '../../extension/core/ai-usage/usage-normalization.js';
import {quoteUsage} from '../../extension/core/ai-usage/ratebook.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const deny=reason=>({decision:'deny',reason,...flags});
export const providerDispatchId=request=>'provider-dispatch:'+hash(request.operationId);
export const providerSettlementId=request=>'provider-settlement:'+hash(request.operationId);
const CLOCK="SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms";
const CONTROL='SELECT profile_id, identity_config_hash, generation, enabled, day_limit_micros::text, month_limit_micros::text, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const EVENT='SELECT operation_id, request_hash, event, evidence, expires_at_ms::text FROM paia_ai_private.operation_evidence WHERE event_id = $1 FOR SHARE';
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
const one=async(client,sql,args=[])=>{const {rows}=await client.query(sql,args);if(rows.length!==1)fail('PROVIDER_ACCOUNTING_BINDING');return structuredClone(rows[0]);};
const clock=async client=>{const value=(await one(client,CLOCK)).now_ms;if(typeof value!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(value)||!Number.isSafeInteger(Number(value)))fail('PROVIDER_ACCOUNTING_CLOCK');return Number(value);};
export function reservedProviderRow(row){
 const reserved=structuredClone(row);reserved.state='RESERVED';
 for(const key of ['dispatchedAt','dispatchedDayId','dispatchedTimeZone','settlement','unknownReceipt','settledAt','resultCommitted','resultCommittedAt','resultDayId','resultTimeZone'])delete reserved[key];
 return reserved;
}
export function bindProviderAccountingRow(state,request){
 const row=state?.rows.find(value=>value.request.operationId===request.operationId);
 if(!row||!equal(row.request,request)||!['DISPATCHED','OUTCOME_UNKNOWN','SETTLED'].includes(row.state)||!Number.isSafeInteger(row.dispatchedAt))fail('PROVIDER_ACCOUNTING_BINDING');
 return row;
}
// Only the append-only provider publisher calls this with privately captured EOF
// evidence and its own consumed ticket. Neither HTTP nor client DTOs reach it.
export function providerSettlementEvidence(row,material,observed){
 if(!observed||observed.identityDigest!==material.identityDigest||!equal(observed.usageBinding,material.usageBinding)||
  !equal(row.request,material.identity.reservation.request)||hash(canonical(reservedProviderRow(row)))!==material.identity.reservation.reservationDigest||
  !equal(row.pricing.route,material.identity.reservation.route)||!['VALIDATED','FAILED'].includes(observed.outcome))fail('PROVIDER_USAGE_UNQUALIFIED');
 const usage=structuredClone(observed.usage),normalized=normalizeUsage(usage);
 if(normalized.state!=='known'||usage.inputTokens>row.request.inputTokens||usage.completionTokens>row.request.outputCap)fail('PROVIDER_USAGE_OVER_CAP');
 // Conservative CNY reservation FX is NOT actual billed USD conversion evidence.
 // Until that independently trusted reconciliation exists, retain the full hold.
 if(row.quote.nativeCurrency!=='USD')fail('PROVIDER_BILLING_CURRENCY_UNQUALIFIED');
 const quote=quoteUsage({...row.pricing,usage:normalized.billable});
 if(quote.nativeMicros>row.quote.nativeMicros||quote.usdReservationMicros>row.reservationMicros)fail('PROVIDER_USAGE_OVER_CAP');
 return {receiptId:providerSettlementId(row.request),operationId:row.request.operationId,outcome:observed.outcome,usage,
  pricingVersion:quote.pricingVersion,fxVersion:quote.fxVersion,nativeCurrency:quote.nativeCurrency,
  nativeMicros:quote.nativeMicros,usdMicros:quote.usdReservationMicros,committedChildren:[]};
}

// A SETTLEMENT-ONLY historical accounting guard, not current content authority.
// Actual dispatch already acquired the original authority. Revoking content or
// allowing its short grant to expire cannot undo consumed provider expenditure.
// The original locked financial row + immutable dispatch and usage publisher
// evidence are mandatory; no reserve/cancel/send/COMMITTED capability exists.
export class ProviderAccountingGuard {
 constructor({identityConfig,profileId,request,eventId=null,publishing=false}){
  this.request=request;this.configHash=identityConfigHash(identityConfig);this.profileId=profileId;this.eventId=eventId;this.publishing=publishing;
 }
 async lock(client){
  this.client=client;
  await client.query('LOCK TABLE paia_ai_private.service_control,paia_ai_private.principal_authority,paia_ai_private.route_authority,paia_ai_private.request_authority,paia_ai_private.operation_evidence IN ACCESS SHARE MODE');
  const control=await one(client,CONTROL);
  if(control.profile_id!==this.profileId||control.identity_config_hash!==this.configHash)fail('PROVIDER_ACCOUNTING_BINDING');
  // Current enabled/consent/expiry/route are deliberately not a grant to spend
  // again and not a reason to discard a historical, immutable financial debt.
  const dispatch=await one(client,EVENT,[providerDispatchId(this.request)]);
  this.checkEvent(dispatch,'DISPATCHED');if(dispatch.evidence!==null)fail('PROVIDER_ACCOUNTING_BINDING');
  this.event=this.eventId?await one(client,EVENT,[this.eventId]):null;
  if(this.event){
   this.checkEvent(this.event,'SETTLEMENT');
   if(this.eventId!==providerSettlementId(this.request)||this.event.evidence?.receiptId!==this.eventId||this.event.evidence?.operationId!==this.request.operationId||
    !['VALIDATED','FAILED'].includes(this.event.evidence?.outcome)||this.event.evidence?.committedChildren?.length!==0||this.event.evidence?.nativeCurrency!=='USD')fail('PROVIDER_USAGE_UNQUALIFIED');
  }
  // The publisher has its stricter six-table role check in its own composition.
  // Financial reconciliation must be unable to write authority or usage facts.
  if(!this.publishing){
   const tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'],{rows}=await client.query(ACCESS,[tables]);
   if(rows.length!==tables.length||new Set(rows.map(r=>r.relname)).size!==tables.length||rows.some(r=>!tables.includes(r.relname)||r.relrowsecurity!==true||r.relforcerowsecurity!==true||r.rolsuper!==false||r.rolbypassrls!==false||r.is_owner!==false||r.can_mutate!==false))fail('AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
  }
  this.now=await clock(client);return {now:this.now,event:this.event};
 }
 checkEvent(event,type){
  exactData(event,['operation_id','request_hash','event','evidence','expires_at_ms']);
  if(event.operation_id!==this.request.operationId||event.request_hash!==requestBindingHash(this.request)||event.event!==type)fail('PROVIDER_ACCOUNTING_BINDING');
 }
 bind(state){
  const row=bindProviderAccountingRow(state,this.request);
  if(this.now<state.lastNow||this.now<row.dispatchedAt)fail('PROVIDER_ACCOUNTING_CLOCK');
  this.minNow=state.lastNow;
  this.facts={authorized:true,verifiedServiceFacts:true,request:this.request,tier:row.window?.windowId.split(':')[0],timeZone:row.window?.timeZone};
  this.window=budgetWindow(this.facts,this.now);return row;
 }
 async beforePublish(client){
  const at=await clock(client);
  if(!this.window||at<this.now||at<this.minNow)fail('PROVIDER_ACCOUNTING_CLOCK');
  const expiresAt=Math.min(at+1000,this.window.endsAt);if(expiresAt<=at)fail('PROVIDER_ACCOUNTING_CLOCK');
  return {notBefore:at,expiresAt};
 }
}
const safe=new Set(['PROVIDER_ACCOUNTING_BINDING','PROVIDER_ACCOUNTING_CLOCK','PROVIDER_USAGE_UNQUALIFIED','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','SETTLEMENT_CONFLICT','SETTLEMENT_OVER_BOUND','SETTLEMENT_PRICING','SETTLEMENT_COST_MISMATCH','USAGE_INVALID']);
// Same PostgresLedgerStorage and original BudgetWindowReservation.settle owner.
// This is a narrow service composition, not another ledger or monetary counter.
export function createPostgresProviderSettlementService({pool,identityConfig,profileId}={}){
 let storage,config;
 try{if(typeof profileId!=='string'||!profileId.length)throw Error();config=structuredClone(identityConfig);storage=new PostgresLedgerStorage({pool});}catch{}
 return Object.freeze({async settle(value,eventId){
  try{
   if(!storage||!config)return deny('SERVICE_UNCONFIGURED');
   const request=snapshotRequest(value);if(eventId!==providerSettlementId(request))return deny('PROVIDER_USAGE_UNQUALIFIED');
   const guard=new ProviderAccountingGuard({identityConfig:config,profileId,request,eventId});
   const result=await storage.transact(async(transaction,authority)=>{
    const state=await transaction.get(LEDGER_KEY);guard.bind(state);
    const owner=new BudgetWindowReservation({service:{transact:callback=>callback(transaction),clock:()=>authority.now,
     verifyRequest:r=>{if(!equal(r,request))fail('PROVIDER_ACCOUNTING_BINDING');return structuredClone(guard.facts);},
     verifySettlement:(r,e)=>({verifiedSettlementFacts:equal(r,request)&&equal(e,authority.event.evidence),request:r,evidence:e})}});
    return owner.settle(request,authority.event.evidence);
   },guard);
   return {decision:'recorded',...result,...flags};
  }catch(error){return error?.code==='POSTGRES_COMMIT_OUTCOME_UNKNOWN'?{decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',...flags}:deny(safe.has(error?.code)?error.code:'SERVICE_UNAVAILABLE');}
 }});
}
