import {assertSectionPromotionPendingLocator,readSectionPromotionRecoveryLocator,assertSectionPromotionRecoveryLocatorFacts,assertSectionPromotionRecoveryLocatorSnapshot,registerSectionPromotionRecoveryLocatorFence} from './ai-usage/section-promotion-checkpoint.js';
import {readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,assertSectionPromotionRecoveryAuthoritySnapshot,registerSectionPromotionRecoveryAuthorityFence} from './ai-usage/section-promotion-recovery-authority.js';
import {requireRepositoryTransactionScope} from './idb-repository.js';
import {contextScopeTransactionReader} from './context-topic-scope.js';
import {idOK} from './thought-model.js';
import {fail} from './ai-usage/contracts.js';

// Independent identity processing, never inferred from field qualification,
// external Context access, capture consent or a provider DTO. The configured
// source issuer supplies the original exact receipt and synchronous revocation
// check. No default production issuer is installed by this module.
const authorities=new WeakMap(),uses=new WeakMap(),leaseFacts=new WeakMap(),monotonicNow=globalThis.performance?.now?.bind(globalThis.performance);
const nativeSignalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const signalAborted=signal=>signal!==null&&signal!==undefined&&nativeSignalAborted.call(signal);
const RECEIPT_FIELDS=['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'];
const need=(x,code='UNAVAILABLE')=>{if(!x)fail(code);};
function data(value,keys){
 need(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value)));
 const names=Reflect.ownKeys(value);need(names.length===keys.length&&names.every(k=>keys.includes(k)));
 const out={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);need(d&&Object.hasOwn(d,'value'));out[key]=d.value;}return out;
}
function ids(value,max){
 need(Array.isArray(value));const length=Object.getOwnPropertyDescriptor(value,'length')?.value;need(Number.isSafeInteger(length)&&length<=max,'BUDGET_EXCEEDED');
 need(Reflect.ownKeys(value).length===length+1);const out=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));need(d&&Object.hasOwn(d,'value')&&idOK(d.value));out.push(d.value);}need(new Set(out).size===out.length);return Object.freeze(out);
}
function requestData(request){const r=data(request,['purpose','inputIds','topicIds']);need(r.purpose==='personal-topic-identity');return Object.freeze({purpose:r.purpose,inputIds:ids(r.inputIds,20),topicIds:ids(r.topicIds,8)});}
function bindingData(binding){
 need(binding&&typeof binding==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(binding)));
 const names=Reflect.ownKeys(binding);need(names.length>0&&names.length<=5&&names.every(k=>['jobId','childId','operationId','proposalOperationId','mode'].includes(k)));
 const out={};for(const key of names){const d=Object.getOwnPropertyDescriptor(binding,key);need(d&&Object.hasOwn(d,'value')&&idOK(d.value));out[key]=d.value;}return Object.freeze(out);
}
const sameRequest=(a,b)=>a.purpose===b.purpose&&a.inputIds.length===b.inputIds.length&&a.topicIds.length===b.topicIds.length&&a.inputIds.every((v,i)=>v===b.inputIds[i])&&a.topicIds.every((v,i)=>v===b.topicIds[i]);
const sameBinding=(a,b)=>{const x=bindingData(a),names=Object.keys(b);return Object.keys(x).length===names.length&&names.every(k=>x[k]===b[k]);};
function scopeData(value,expected){const r=data(value,['version','purpose','binding','restoreEpoch','inputIds','topicIds']);need(r.version===1&&r.restoreEpoch===expected.restoreEpoch&&sameBinding(r.binding,expected.binding)&&sameRequest(requestData({purpose:r.purpose,inputIds:r.inputIds,topicIds:r.topicIds}),expected));return expected;}
function originalScope(store,t){
 let scope=t;for(let depth=0;scope&&depth<16;depth++,scope=Object.getPrototypeOf(scope)){
  try{const identity=requireRepositoryTransactionScope(store.repository,scope);need(identity.database===store.repository.db,'STALE_BASE');return {scope,identity};}catch(error){
   // A qualification facade inherits the original transaction. It cannot
   // substitute its own native transaction property while borrowing that brand.
   if(Object.hasOwn(scope,'tx'))throw error;
  }
 }
 fail('UNAVAILABLE');
}
function current(owner){
 need(!owner.released&&owner.store.repository.db===owner.database&&!signalAborted(owner.signal),'STALE_BASE');
 const wall=Date.now(),mono=monotonicNow?.();
 if(owner.clockInvalid||!Number.isSafeInteger(wall)||!Number.isFinite(mono)||wall<owner.lastWall||mono<owner.lastMono){owner.clockInvalid=true;fail('STALE_BASE');}
 owner.lastWall=wall;owner.lastMono=mono;return {wall,mono};
}
// Facts-only validation is also used as the final all-use sweep after every
// issuer callback has finished. It must never invoke an issuer again.
function recoveryCurrent(owner){if(owner.confirmationLocator!==null){assertSectionPromotionPendingLocator(owner.confirmationLocator,owner.store);const held=readSectionPromotionRecoveryLocator(owner.confirmationLocator,owner.store);need(held.operationId===owner.binding.operationId&&owner.binding.mode==='section_promotion_confirmation','STALE_BASE');}if(owner.recoveryAuthority!==null){assertSectionPromotionPendingLocator(owner.locator,owner.store);const view=readSectionPromotionRecoveryAuthority(owner.recoveryAuthority,owner.store,owner.locator);need(view.operationId===owner.binding.operationId&&['section_promotion_recovery','section_promotion_result'].includes(owner.binding.mode),'STALE_BASE');}return true;}
function receiptFacts(owner,grant){
 try{
  need(!grant.invalid,'STALE_BASE');const {receipt,lease,raw}=grant,now=current(owner);
  if(lease.invalid||now.wall>=receipt.expiresAt||now.wall>=lease.deadline||now.mono>=lease.deadlineMono){lease.invalid=true;fail('STALE_BASE');}
  need(!signalAborted(receipt.revocationSignal),'STALE_BASE');
  const value=data(raw,RECEIPT_FIELDS);for(const key of RECEIPT_FIELDS)if(key!=='scope')need(value[key]===receipt[key],'STALE_BASE');scopeData(value.scope,receipt.scope);if(owner.confirmationLocator!==null)assertSectionPromotionRecoveryLocatorFacts(owner.confirmationLocator,owner.store);if(owner.recoveryAuthority!==null)assertSectionPromotionRecoveryAuthorityFacts(owner.recoveryAuthority,owner.store,owner.locator);
 }catch(error){grant.invalid=true;throw error;}
}
function receiptCurrent(owner,grant){
 try{
  recoveryCurrent(owner);receiptFacts(owner,grant);let result;try{result=owner.isCurrent(grant.raw,owner.store);}catch{fail('STALE_BASE');}
  if(result!==true){if(result instanceof Promise)result.catch(()=>{});fail('STALE_BASE');}recoveryCurrent(owner);receiptFacts(owner,grant);
 }catch(error){grant.invalid=true;throw error;}
}

export class TopicProcessingAuthority {
 constructor(store,{processing=null,caller=null,binding=null,workBudget=null,signal=null,recoveryAuthority=null,locator=null,confirmationLocator=null}={}){
  need(store?.repository?.db&&caller&&typeof caller==='object'&&Object.isFrozen(caller));need(signal===null||signal instanceof AbortSignal);
  const config=processing===null?null:data(processing,['resolve','isCurrent']);need(config===null||typeof config.resolve==='function'&&typeof config.isCurrent==='function');
  need(workBudget&&workBudget.database===store.repository.db);need((recoveryAuthority===null)===(locator===null)&&!(recoveryAuthority!==null&&confirmationLocator!==null));
  authorities.set(this,{store,database:store.repository.db,caller,binding:bindingData(binding),workBudget,signal,recoveryAuthority,locator,confirmationLocator,resolve:config?.resolve.bind(processing),isCurrent:config?.isCurrent.bind(processing),leases:new Map(),released:false,lastWall:Date.now(),lastMono:monotonicNow?.(),clockInvalid:false});recoveryCurrent(authorities.get(this));
 }
 async authorize(t,request){
  const owner=authorities.get(this);need(owner);const started=current(owner);recoveryCurrent(owner);need(typeof owner.resolve==='function'&&typeof owner.isCurrent==='function');
  const selected=requestData(request),original=originalScope(owner.store,t),reader=contextScopeTransactionReader(owner.store,original.scope,owner.workBudget);
  if(owner.confirmationLocator!==null){await assertSectionPromotionRecoveryLocatorSnapshot(owner.confirmationLocator,owner.store,original.scope,{workBudget:owner.workBudget});recoveryCurrent(owner);}
  if(owner.recoveryAuthority!==null){await assertSectionPromotionRecoveryAuthoritySnapshot(owner.recoveryAuthority,owner.store,owner.locator,original.scope,{workBudget:owner.workBudget});recoveryCurrent(owner);}
  const restore=(await reader.get('meta','recovery-restore-epoch'))?.value??null;need(restore===null||typeof restore==='string'&&restore.length<=500);current(owner);
  const scope=Object.freeze({version:1,...selected,binding:owner.binding,restoreEpoch:restore});
  const raw=await owner.resolve(reader,scope);current(owner);need(requireRepositoryTransactionScope(owner.store.repository,original.scope)===original.identity,'STALE_BASE');
  const r=data(raw,RECEIPT_FIELDS);
  need(r.version===1&&r.store===owner.store&&r.caller===owner.caller&&r.processing===true&&idOK(r.epoch)&&Number.isSafeInteger(r.expiresAt)&&r.expiresAt>Date.now()&&r.revocationSignal instanceof AbortSignal&&!signalAborted(r.revocationSignal));scopeData(r.scope,scope);
  // Account elapsed time from before the first awaited read/issuer call. A
  // stalled wall clock during resolve must not restart a preissued deadline.
  const clock=current(owner),deadlineMono=Math.min(started.mono+r.expiresAt-started.wall,clock.mono+r.expiresAt-clock.wall);let lease=owner.leases.get(r.epoch);if(lease){need(!lease.invalid&&lease.signal===r.revocationSignal&&r.expiresAt<=lease.deadline,'STALE_BASE');lease.deadline=r.expiresAt;lease.deadlineMono=Math.min(lease.deadlineMono,deadlineMono);}else{lease={signal:r.revocationSignal,deadline:r.expiresAt,deadlineMono,invalid:false};owner.leases.set(r.epoch,lease);}
  const receipt=Object.freeze({...r,scope}),grant={raw,receipt,lease,invalid:false};receiptCurrent(owner,grant);
  need(((await reader.get('meta','recovery-restore-epoch'))?.value??null)===restore,'STALE_BASE');receiptCurrent(owner,grant);
  need(requireRepositoryTransactionScope(owner.store.repository,original.scope)===original.identity,'STALE_BASE');
  if(owner.confirmationLocator!==null&&original.identity.mode==='readwrite')registerSectionPromotionRecoveryLocatorFence(owner.confirmationLocator,owner.store,original.scope,{workBudget:owner.workBudget});
  if(owner.recoveryAuthority!==null&&original.identity.mode==='readwrite')registerSectionPromotionRecoveryAuthorityFence(owner.recoveryAuthority,owner.store,owner.locator,original.scope,{workBudget:owner.workBudget});
  const authority=Object.freeze({});uses.set(authority,{owner,original,selected,scope,grant,released:false});
  return Object.freeze({allowed:true,epoch:receipt.epoch,inputIds:selected.inputIds,topicIds:selected.topicIds,authority});
 }
 release(){const owner=authorities.get(this);if(owner){owner.released=true;owner.leases.clear();}}
}
export function readTopicProcessingAuthority(cap,store,t,request){
 const held=uses.get(cap);need(held&&!held.released&&held.owner.store===store);receiptCurrent(held.owner,held.grant);
 const original=originalScope(store,t);need(original.scope===held.original.scope&&original.identity===held.original.identity&&sameRequest(requestData(request),held.selected),'STALE_BASE');
 // This synchronous check cannot read a new restore row. Its exact restore
 // value is carried in scope for the original owner's closed IDB final plan.
 return Object.freeze({epoch:held.grant.receipt.epoch,scope:held.scope});
}
// Source-only post-callback sweep. Callers must first run the real issuer
// checks for the whole set, then call this for every original use with no more
// issuer callbacks in between. This does not replace original authorization.
export function readTopicProcessingAuthorityFacts(cap,store,t,request){
 const held=uses.get(cap);need(held&&!held.released&&held.owner.store===store);receiptFacts(held.owner,held.grant);
 const original=originalScope(store,t);need(original.scope===held.original.scope&&original.identity===held.original.identity&&sameRequest(requestData(request),held.selected),'STALE_BASE');
 return Object.freeze({epoch:held.grant.receipt.epoch,scope:held.scope});
}
export function releaseTopicProcessingAuthority(cap){const held=uses.get(cap);if(held){held.released=true;uses.delete(cap);}}

// Source-only ledger identity for the original guard's closed control-row read.
// Reading it revalidates the genuine same-transaction use; it grants no field.
export function topicProcessingAuthorityWorkBudget(cap,store,t,request){
 readTopicProcessingAuthority(cap,store,t,request);return uses.get(cap).owner.workBudget;
}

// A completed original read may carry its already-checked lease facts to the
// immediate source send boundary. This cap grants no IDB read or new use.
export function captureTopicProcessingLeaseFacts(cap,store,t,request){
 readTopicProcessingAuthorityFacts(cap,store,t,request);const held=uses.get(cap),token=Object.freeze(Object.create(null));leaseFacts.set(token,{cap,held,store,repository:store.repository,database:store.repository.db});return token;
}
export function assertTopicProcessingLeaseFacts(token,store){
 const r=leaseFacts.get(token);need(r&&r.store===store&&r.repository===store.repository&&r.database===store.repository.db&&uses.get(r.cap)===r.held&&!r.held.released&&r.held.owner.store===store,'STALE_BASE');receiptFacts(r.held.owner,r.held.grant);return true;
}
