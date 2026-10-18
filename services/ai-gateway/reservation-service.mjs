import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {PostgresRequestAuthority} from './postgres-authority.mjs';
import {exactData,snapshotRequest} from './signed-identity.mjs';
import {BudgetWindowReservation} from '../../extension/core/ai-usage/budget-window-reservation.js';
import {equal} from '../../extension/core/ai-usage/contracts.js';

const services=new WeakSet();
export const isReservationService=value=>value!==null&&typeof value==='object'&&services.has(value);
const deny=reason=>({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const SAFE_CODES=new Set(['SERVICE_UNCONFIGURED','ALLOWANCE_UNSET','AUTHORITY_MISSING','AUTHORITY_EXPIRED','SERVICE_PROFILE_UNQUALIFIED','AUTHORITY_UNSAFE_ROLE_OR_SCHEMA','ROUTE_UNQUALIFIED','PROVIDER_EVIDENCE_UNQUALIFIED','BUDGET_OR_QUOTA','MAINTENANCE_CADENCE','REQUEST_BOUND','OPERATION_REBOUND','JOB_REBOUND','CHILD_ALREADY_RESERVED','OUTCOME_OR_ATTEMPT_PENDING','BUDGET_CAPACITY','BUDGET_SNAPSHOT_CAPACITY','CLOCK_ROLLBACK','POSTGRES_AUTHORITY_EXPIRED','SETTLEMENT_STATE','SETTLEMENT_CONFLICT','RECEIPT_REBOUND','UNQUALIFIED_SETTLEMENT']);
function bundleSnapshot(input){
 exactData(input,['request','principalToken','entitlementToken']);
 if(!['principalToken','entitlementToken'].every(key=>typeof input[key]==='string'&&input[key].length>0&&input[key].length<=8192))throw Error('invalid proof');
 return Object.freeze({request:snapshotRequest(input.request),principalToken:input.principalToken,entitlementToken:input.entitlementToken});
}
// Fixed server composition only. There is no per-request configuration, facts
// callback, client clock, tier, region, tariff or settlement payload parameter.
export function createPostgresReservationService({pool,identityConfig,profileId}={}){
 let storage,config;
 try{config=structuredClone(identityConfig);storage=new PostgresLedgerStorage({pool});}catch{/* Default closed; no ambient credentials or fake authority. */}
 const execute=async(action,input,eventId=null)=>{
  try{
   if(!storage||!config)return deny('SERVICE_UNCONFIGURED');
   const bundle=bundleSnapshot(input),guard=new PostgresRequestAuthority({identityConfig:config,profileId,bundle,action,eventId});
   const result=await storage.transact(async(transaction,authority)=>{
    const owner=new BudgetWindowReservation({service:{
     // One original owner transaction inside this one guarded PG transaction.
     // No nested connection, independent ledger, or public callback is exposed.
     transact:callback=>callback(transaction),clock:()=>authority.now,
     verifyRequest:request=>{if(!equal(request,bundle.request))throw Error('request changed');return structuredClone(authority.facts);},
     verifySettlement:(request,evidence)=>({verifiedSettlementFacts:action==='settle'&&equal(evidence,authority.event.evidence),request,evidence}),
    }});
    if(action==='reserve')return owner.reserve(bundle.request);
    if(action==='cancel')return owner.record(bundle.request,'CANCELLED_BEFORE_DISPATCH');
    if(action==='record')return owner.record(bundle.request,authority.event.event);
    return owner.settle(bundle.request,authority.event.evidence);
   },guard);
   return {decision:action==='reserve'?'reserved':action==='cancel'?'cancelled':'recorded',...result,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
  }catch(error){
   if(error?.code==='POSTGRES_COMMIT_OUTCOME_UNKNOWN')return {decision:'outcome_unknown',reason:'COMMIT_OUTCOME_UNKNOWN',financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
   const reason=SAFE_CODES.has(error?.code)?error.code:error?.code?.startsWith('IDENTITY_')||['AUTHORIZATION','ENTITLEMENT_INVALID','REQUEST_INVALID'].includes(error?.code)?'AUTHORIZATION':'SERVICE_UNAVAILABLE';
   return deny(reason);
  }
 };
 const service=Object.freeze({reserve:input=>execute('reserve',input),cancel:input=>execute('cancel',input),
  // Private service runner APIs. Not exported by the HTTP router. eventId is
  // only a lookup; it cannot assert dispatch, paid usage or successful commit.
  record:(input,eventId)=>execute('record',input,eventId),settle:(input,eventId)=>execute('settle',input,eventId)});
 services.add(service);return service;
}
