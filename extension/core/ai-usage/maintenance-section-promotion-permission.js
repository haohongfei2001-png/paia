import {fail,equal} from './contracts.js';
import {snapshot,freeze} from './qwen-request-data.js';
import {captureMaintenanceProcessingReceipt,assertMaintenanceProcessingReceipts,assertMaintenanceProcessingReceiptFacts} from './maintenance-processing-receipt.js';
import * as plans from './maintenance-section-promotion.js';

const permissions=new WeakMap(),need=value=>{if(!value)fail('UNAVAILABLE');};
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
function facts(record){
 need(!record.released&&record.store.repository===record.repository&&record.repository.db===record.database&&(record.signal===null||!aborted.call(record.signal)));
 assertMaintenanceProcessingReceiptFacts(record.parent,record.store);if(record.receipt)assertMaintenanceProcessingReceiptFacts(record.receipt,record.store);
}
function current(record){
 try{
  facts(record);const receipts=record.receipt?[record.parent,record.receipt]:[record.parent];assertMaintenanceProcessingReceipts(receipts,record.processing,record.store);
  const accepted=record.isCurrent();if(accepted!==true){Promise.resolve(accepted).catch(()=>{});fail('UNAVAILABLE');}
  facts(record);need(equal(plans.maintenanceSectionPromotionPayloadScope(record.plan,record.store,record.binding),record.planScope));facts(record);return true;
 }catch(error){record.released=true;throw error;}
}
async function resolveGrant(record,t){
 const signals=[...new Set([record.signal,record.parent.revocationSignal].filter(Boolean))];let timer,rejectStop;
 const stopped=new Promise((_,reject)=>{rejectStop=()=>reject(Object.assign(Error('PROMOTION_PERMISSION_CANCELLED'),{code:'UNAVAILABLE'}));});stopped.catch(()=>{});
 for(const signal of signals){signal.addEventListener('abort',rejectStop,{once:true});if(aborted.call(signal))rejectStop();}
 timer=setTimeout(rejectStop,Math.max(0,record.parent.expiresAt-Date.now()));
 try{current(record);const raw=await Promise.race([Promise.resolve().then(()=>{current(record);return record.processing.resolve(t,record.scope);}),stopped]);current(record);return raw;}
 finally{clearTimeout(timer);for(const signal of signals)signal.removeEventListener('abort',rejectStop);}
}
// The original processing issuer grants these remote fields independently of
// the local integrity/history qualification. No text is acquired here.
export async function createMaintenanceSectionPromotionPermission(store,plan,{processing,caller,parent,binding,isCurrent,signal=null}={}){
 need(store?.repository?.db&&typeof processing?.resolve==='function'&&typeof processing?.isCurrent==='function'&&typeof isCurrent==='function'&&(!signal||signal instanceof AbortSignal)&&typeof plans.maintenanceSectionPromotionPayloadScope==='function');
 assertMaintenanceProcessingReceipts([parent],processing,store);
 need(parent.caller===caller&&parent.scope?.purpose==='ai-maintenance-payload'&&parent.scope.logicalJobId===binding?.logicalJobId&&parent.scope.childOperationId===binding?.childOperationId);
 const copied=freeze(snapshot(binding,{maxBytes:2048,maxKeys:8,maxDepth:2,maxString:200})),planScope=plans.maintenanceSectionPromotionPayloadScope(plan,store,copied);
 need(planScope?.purpose==='ai-maintenance-section-promotion-payload'&&equal(planScope.binding,copied)&&Array.isArray(planScope.inputs)&&planScope.inputs.every(input=>parent.scope.inputs.some(selected=>selected.inputId===input.inputId&&input.selectedFields.every(field=>selected.selectedFields.includes(field)))));
 const scope=freeze(snapshot({...planScope,principalId:parent.scope.principalId,libraryId:parent.scope.libraryId,consentEpoch:parent.scope.consentEpoch},{maxBytes:32768,maxKeys:4096,maxDepth:16,maxString:200}));
 const record={store,repository:store.repository,database:store.repository.db,plan,binding:copied,planScope,scope,processing,parent,caller,isCurrent,signal,receipt:null,released:false};current(record);
 try{
  const receipt=await store.run(()=>record.repository.transaction(false,async t=>{
   current(record);await plans.assertMaintenanceSectionPromotion(store,t,plan);current(record);
   const raw=await resolveGrant(record,t);current(record);
   const granted=captureMaintenanceProcessingReceipt(raw,{processing,store,caller,scope});
   record.receipt=granted;current(record);need(granted.epoch===parent.epoch&&granted.expiresAt<=parent.expiresAt);
   await plans.assertMaintenanceSectionPromotion(store,t,plan);current(record);return granted;
  }));
  need(receipt===record.receipt);current(record);const token=Object.freeze(Object.create(null));permissions.set(token,record);return token;
 }catch(error){record.released=true;throw error;}
}
// Returns the exact original raw receipt, never a reconstructed DTO authority.
// Source clients must additionally validate it against their own issuer.
export function readMaintenanceSectionPromotionPermission(token,store,plan,binding){
 const record=permissions.get(token);need(record&&record.store===store&&record.plan===plan&&equal(record.binding,snapshot(binding,{maxBytes:2048,maxKeys:8,maxDepth:2,maxString:200})));current(record);return Object.freeze({receipt:record.receipt,parent:record.parent,scope:record.scope});
}
// Callback-free terminal companion; it cannot establish issuer currentness.
export function assertMaintenanceSectionPromotionPermissionFacts(token,store,plan,binding){
 const record=permissions.get(token);need(record&&record.store===store&&record.plan===plan&&equal(record.binding,snapshot(binding,{maxBytes:2048,maxKeys:8,maxDepth:2,maxString:200})));facts(record);return true;
}
export function releaseMaintenanceSectionPromotionPermission(token){const record=permissions.get(token);if(record){record.released=true;permissions.delete(token);}}
