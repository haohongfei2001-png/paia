import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {ArchiveError} from '../constants.js';
import {requireRepositoryTransactionScope,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {hashText} from '../dedupe.js';
import {canonical,equal} from './contracts.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {snapshot,freeze,exact,integer} from './qwen-request-data.js';
import {readSectionPromotionRecoveryLocator,assertSectionPromotionRecoveryLocatorFacts,assertSectionPromotionRecoveryLocatorSnapshot,registerSectionPromotionRecoveryLocatorFence,readSectionPromotionLocatorRetirementIntent,takeSectionPromotionRetirementOutcome} from './section-promotion-checkpoint.js';
import {identityCurrentnessHubOrigin,reserveHubIdentityObservation,releaseHubIdentityObservation,openHubIdentityObservation,readHubIdentityObservation,readHubIdentityObservationFacts} from './identity-currentness-hub.js';

// A current identity observation for ONE original paid, user-accepted locator.
// It grants no fields, confirmation, write, dispatch, or new financial operation.
const authorities=new WeakMap(),owners=new WeakMap(),scopeAuthorities=new WeakMap(),finalAuthorities=new WeakMap(),nativeNow=Date.now,monoNow=performance.now.bind(performance);
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const fail=()=>{throw new ArchiveError('UNAVAILABLE');};
const need=value=>{if(!value)fail();};
const own=(o,key)=>{const d=Object.getOwnPropertyDescriptor(o??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const text=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const off=signal=>signal!==null&&aborted.call(signal);
const optional=(o,key)=>{const d=Object.getOwnPropertyDescriptor(o??{},key);if(!d)return undefined;need(Object.hasOwn(d,'value'));return d.value;};
const projection=(o,keys)=>Object.fromEntries(keys.map(key=>[key,own(o,key)]));
const usageKeys=['kind','version','jobId','childId','executionKind','attemptCount','spendState','operationReceiptId','serviceOrigin'];
function localRows(migration,library,gate,restore){
 need(own(migration,'phase')==='active'&&text(own(migration,'databaseId'))&&own(library,'phase')==='active'&&own(library,'verified')===true&&own(library,'sealed')===0&&own(gate,'enabled')===true);
 const epoch=restore===undefined?null:own(restore,'value');need(epoch===null||text(epoch));
 return freeze({migration:projection(migration,['phase','databaseId']),library:projection(library,['phase','verified','sealed']),gate:freeze(snapshot(gate,{maxBytes:2048,maxKeys:16,maxDepth:2,maxString:200})),restoreEpoch:epoch});
}
function usageRow(raw,locator,origin){
 need(raw&&['RESPONSE_RECORDED','VALIDATED','COMMITTED','EXPIRED_UNCOMMITTED'].includes(own(raw,'state'))&&!optional(raw,'financialCancellation'));
 const v=projection(raw,usageKeys),binding=locator.paidBinding,authority=locator.sourceAuthority,financial=freeze(snapshot(own(raw,'financialSettlement'),{maxBytes:2048,maxKeys:16,maxDepth:2,maxString:200}));
 need(v.kind==='ai_usage_v1'&&v.version===1&&v.jobId===binding.logicalJobId&&v.childId===binding.childOperationId&&v.executionKind==='server-backed'&&v.attemptCount===1&&v.spendState==='SETTLED_SERVICE'&&v.operationReceiptId===binding.operationReceiptId&&v.serviceOrigin===origin);
 need(financial.state==='SETTLED'&&financial.outcome==='VALIDATED'&&financial.receiptId===binding.operationReceiptId&&financial.effectiveResults===0);
 const request=clientDeclarationRequestData(own(raw,'financialRequest'));
 need(request.jobId===binding.logicalJobId&&request.operationId===binding.childOperationId&&request.jobType==='AI_MAINTENANCE'&&request.principalId===authority.principalId&&request.libraryId===authority.libraryId);
 return freeze({...v,financialSettlement:financial,financialRequest:request});
}
function source(configuration,hub){
 try{if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;const value=projection(configuration,['origin','clock','readProofs','isCurrent']);
  if(value.origin!==identityCurrentnessHubOrigin(hub)||!['clock','readProofs','isCurrent'].every(k=>typeof value[k]==='function'))return null;
  const invalidate=Object.getOwnPropertyDescriptor(configuration,'onInvalidate');if(invalidate&&(!Object.hasOwn(invalidate,'value')||typeof invalidate.value!=='function'))return null;return Object.freeze({...value,onInvalidate:invalidate?.value??null});
 }catch{return null;}
}
function record(cap,store,locator){const r=authorities.get(cap);need(r&&r.store===store&&r.locator===locator);return r;}
function facts(r){
 const wall=nativeNow(),mono=monoNow(),sample=r.sample;
 need(r.active&&r.ownerCurrent()&&own(r.store,'repository')===r.repository&&own(r.repository,'db')===r.database&&!off(r.controller.signal)&&!off(r.requestSignal));
 assertSectionPromotionRecoveryLocatorFacts(r.locator,r.store);
 need(sample&&sample.active&&sample.serial===r.sampleSerial&&integer(wall)&&Number.isFinite(mono)&&wall>=r.startedWall&&mono>=r.startedMono&&wall<r.deadlineWall&&mono<r.deadlineMono);
 const elapsed=Math.max(0,wall-sample.wall,mono-sample.mono),at=sample.at+Math.ceil(elapsed);
 need(readHubIdentityObservationFacts(r.hub,r.connection,at)?.identity===r.identity);return true;
}
function sampleClock(r){
 // Ordinary currentness samples its own phase here. Repository also invokes
 // this fixed stage after all original issuer callbacks, then checks every
 // private authority again because a clock callback can invalidate another.
 const at=r.configuration.clock(),wall=nativeNow(),mono=monoNow();need(integer(at)&&at>=r.lastClock&&at>=r.identity.observedAt&&at<r.identity.verifiedUntil);
 r.lastClock=at;const sample={active:true,at,wall,mono,serial:++r.sampleSerial};r.sample=sample;queueMicrotask(()=>{sample.active=false;if(r.sample===sample)r.sample=null;});return facts(r);
}
function current(r){
 try{need(r.active&&r.ownerCurrent());assertSectionPromotionRecoveryLocatorFacts(r.locator,r.store);need(r.configuration.isCurrent()===true);
  const observed=readHubIdentityObservation(r.hub,r.connection);need(observed?.identity===r.identity&&equal(observed.request,r.request));
  return sampleClock(r);
 }catch{r.close();fail();}
}
function bindScope(r,scope,workBudget){
 requireRepositoryTransactionScope(r.repository,scope);need(own(r.repository,'db')===r.database);
 let held=scopeAuthorities.get(scope);
 if(held)need(held.r===r&&held.workBudget===workBudget);
 else{held={r,scope,workBudget,token:null};scopeAuthorities.set(scope,held);}
 return held;
}
function finalRecord(token,repository,scope){
 const held=finalAuthorities.get(token);need(held&&held.token===token&&held.scope===scope&&held.r.repository===repository&&scopeAuthorities.get(scope)===held);
 requireRepositoryTransactionScope(repository,scope);return held;
}
// Only the original source fence below creates this private final token. A
// copied token, raw identity cap, other transaction, or completed scope fails.
export function requireSectionPromotionRecoveryFinalFacts(token,repository,scope){
 const held=finalRecord(token,repository,scope);facts(held.r);
 if(held.workBudget)assertContextScopeWorkBudgetFacts(held.workBudget,{database:held.r.database});return true;
}
export function sampleSectionPromotionRecoveryFinalFacts(token,repository,scope){
 const held=finalRecord(token,repository,scope);
 try{requireSectionPromotionRecoveryFinalFacts(token,repository,scope);sampleClock(held.r);return requireSectionPromotionRecoveryFinalFacts(token,repository,scope);}catch{held.r.close();fail();}
}
export function readSectionPromotionRecoveryAuthority(cap,store,locator){const r=record(cap,store,locator);current(r);return r.view;}
// Repeated reads within the original current/facts synchronous phase are valid.
// No issuer/host/clock callback is invoked, and a stale sample never renews.
export function assertSectionPromotionRecoveryAuthorityFacts(cap,store,locator){return facts(record(cap,store,locator));}

async function rows(r,original,check,workBudget=null){
 requireRepositoryTransactionScope(r.repository,original);check();const t=workBudget?contextScopeTransactionReader(r.store,original,workBudget):original;
 const migration=await t.get('meta','migration');check();const library=await t.get('meta','thought-library');check();const gate=await t.get('meta','gate');check();const restore=await t.get('meta','recovery-restore-epoch');check();
 const local=localRows(migration,library,gate,restore);need(local.restoreEpoch===r.locatorData.sourceAuthority.restoreEpoch);
 const usage=usageRow(await t.get('organizerUsage','aiu:attempt:'+r.locatorData.paidBinding.childOperationId),r.locatorData,r.configuration.origin);check();return freeze({local,usage});
}
// Original consumers must call this in their original transaction before any
// protected result/working text. The captured baseline is never refreshed.
export async function assertSectionPromotionRecoveryAuthoritySnapshot(cap,store,locator,t,{workBudget=null}={}){const r=record(cap,store,locator),check=()=>current(r);bindScope(r,t,workBudget);check();await assertSectionPromotionRecoveryLocatorSnapshot(locator,store,t,{workBudget});check();need(equal(await rows(r,t,check,workBudget),r.baseline));check();return true;}
// Exact metadata finalizer, using only the original closed Repository protocol.
// Its private final token joins Repository's original all-issuer, fixed-sample,
// then all-private-facts boundary. No Topic field permission is manufactured.
export function registerSectionPromotionRecoveryAuthorityFence(cap,store,locator,t,{workBudget=null,locatorRetirementIntent=null}={}){
 const r=record(cap,store,locator),held=bindScope(r,t,workBudget);current(r);
 if(locatorRetirementIntent!==null)readSectionPromotionLocatorRetirementIntent(locatorRetirementIntent,store,t,locator,cap);
 const prior=r.fences.get(t);if(prior){need(prior.workBudget===workBudget&&prior.locatorRetirementIntent===locatorRetirementIntent);return true;}
 registerSectionPromotionRecoveryLocatorFence(locator,store,t,{workBudget,locatorRetirementIntent,recoveryAuthority:cap});
 const check=()=>{current(r);if(workBudget)assertContextScopeWorkBudgetFacts(workBudget,{database:r.database});return true;};
 const get=function*(table,key){if(workBudget){assertContextScopeWorkBudgetFacts(workBudget,{database:r.database});need(workBudget.reads<CONTEXT_TOPIC_SCOPE_LIMITS.reads);workBudget.reads++;}const row=yield {method:'get',table,key};if(workBudget){const ids=workBudget.seen.get(table)||new Set();ids.add(key);need(ids.size<=CONTEXT_TOPIC_SCOPE_LIMITS.refs);workBudget.seen.set(table,ids);assertContextScopeWorkBudgetFacts(workBudget,{database:r.database});}return row;};
 const finalToken=Object.freeze({});held.token=finalToken;finalAuthorities.set(finalToken,held);
 registerRepositoryFinalReadFence(r.repository,t,{isCurrent:check,promotionRecoveryAuthority:finalToken,plan:function*(){
  const migration=yield* get('meta','migration'),library=yield* get('meta','thought-library'),gate=yield* get('meta','gate'),restore=yield* get('meta','recovery-restore-epoch');
  need(equal(localRows(migration,library,gate,restore),r.baseline.local));const usage=yield* get('organizerUsage','aiu:attempt:'+r.locatorData.paidBinding.childOperationId);need(equal(usageRow(usage,r.locatorData,r.configuration.origin),r.baseline.usage));return true;
 }});r.fences.set(t,{workBudget,locatorRetirementIntent});return true;
}
// A settled no-work result is historical evidence only. The original writer
// proves its successful exact transaction and consumes the outcome once. This
// path never reopens a retired locator or supplies current content authority.
export function takeSectionPromotionRecoveryRetirementOutcome(cap,store,locator,outcome){
 const r=record(cap,store,locator);
 try{const value=takeSectionPromotionRetirementOutcome(outcome,store,locator,cap);if(value!==null)r.close();return value;}catch(error){r.close();throw error;}
}
export function createSectionPromotionRecoveryAuthority({store,configuration=null,hub=null}={}){
 const c=source(configuration,hub);if(!c)return null;let repository,database=null,bound=false;try{repository=own(store,'repository');need(repository&&typeof repository==='object');}catch{return null;}
 const bind=()=>{if(bound){need(own(repository,'db')===database);return;}const value=own(repository,'db');need(value);database=value;bound=true;};
 const pending=new Map(),active=new Map();let disposed=false,serial=0,lastClock=-1,removeInvalidate=null;
 const local=()=>!disposed&&own(store,'repository')===repository&&(!bound||own(repository,'db')===database);
 const invalidate=()=>{serial++;for(const r of [...active.values()])r.close();for(const p of pending.values())p.abort();};
 const configured=()=>{need(local()&&c.isCurrent()===true);need(local());return true;};
 const owner=Object.freeze({
  async open(locator,{signal=null}={}){
   let d;try{bind();configured();need(signal===null||signal instanceof AbortSignal);need(!off(signal));d=readSectionPromotionRecoveryLocator(locator,store);
    need(d.serviceOrigin===c.origin&&hash(d.paidRequestHash));
   }catch{return null;}
   if(pending.has(d.allocationId)){const p=pending.get(d.allocationId);return p.locator===locator&&p.signal===signal?p.result:null;}const prior=active.get(d.allocationId);if(prior){if(prior.locator!==locator||prior.requestSignal!==signal)return null;try{current(prior);return prior.cap;}catch{}}
   const ticket=reserveHubIdentityObservation(hub);if(!ticket)return null;const version=serial,controller=new AbortController();let connection=null,permit=true,accepted=true,resolveTimeout,cap=null;
   const abort=()=>{accepted=false;controller.abort();connection?.close();resolveTimeout?.(null);},timeout=new Promise(resolve=>{resolveTimeout=resolve;}),timer=setTimeout(abort,5000);timer.unref?.();if(signal)add.call(signal,'abort',abort,{once:true});
   const p={abort,result:null,locator,signal},check=()=>{need(accepted&&!off(controller.signal)&&!off(signal)&&version===serial);configured();assertSectionPromotionRecoveryLocatorFacts(locator,store);need(accepted&&version===serial);return true;};
   const work=Promise.resolve().then(async()=>{try{
    check();const r={store,repository,database,locator,locatorData:d,configuration:c};const capture=t=>assertSectionPromotionRecoveryLocatorSnapshot(locator,store,t).then(()=>{check();return rows(r,t,check);});const baseline=await store.run(()=>repository.transaction(false,capture,['meta','organizerUsage']));check();
    need(await hashText(canonical(baseline.usage.financialRequest))===d.paidRequestHash);check();
    const raw=await c.readProofs(structuredClone(baseline.usage.financialRequest));check();const proofs=freeze(snapshot(raw,{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));need(exact(proofs,['principalToken','entitlementToken'])&&Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192));
    connection=await openHubIdentityObservation(hub,ticket,{request:baseline.usage.financialRequest,...proofs});permit=false;check();const observed=readHubIdentityObservation(hub,connection);
    need(observed?.profile==='financial'&&observed.origin===c.origin&&equal(observed.request,baseline.usage.financialRequest)&&observed.identity.requestHash===d.paidRequestHash);
    need(equal(baseline,await store.run(()=>repository.transaction(false,capture,['meta','organizerUsage']))));check();
    const at=c.clock(),wall=nativeNow(),mono=monoNow();need(integer(at)&&at>=lastClock&&at>=observed.identity.observedAt&&at<observed.identity.verifiedUntil);lastClock=at;const remaining=observed.identity.verifiedUntil-at;need(remaining<=60000);
    cap=Object.freeze(Object.create(null));Object.assign(r,{cap,owner,hub,identity:observed.identity,request:observed.request,baseline,connection,controller,fences:new WeakMap(),requestSignal:signal,startedWall:wall,startedMono:mono,deadlineWall:wall+remaining,deadlineMono:mono+remaining,lastClock:at,sample:null,sampleSerial:0,active:true,ownerCurrent:()=>local()&&version===serial&&active.get(d.allocationId)===r,remove:null,timer:null,close:()=>{if(!r.active)return;r.active=false;r.sample=null;clearTimeout(r.timer);r.remove?.();connection.close();controller.abort();if(signal)remove.call(signal,'abort',abort);if(active.get(d.allocationId)===r)active.delete(d.allocationId);}});
    r.view=Object.freeze({version:1,purpose:'section-promotion-recovery',allocationId:d.allocationId,operationId:d.operationId,paidBinding:d.paidBinding,sourceAuthority:d.sourceAuthority,identity:r.identity,expiresAt:r.deadlineWall,revocationSignal:controller.signal});
    active.set(d.allocationId,r);authorities.set(cap,r);r.remove=connection.onInvalidate(r.close);r.timer=setTimeout(r.close,Math.max(1,remaining));r.timer.unref?.();current(r);return cap;
   }catch{if(cap)authorities.get(cap)?.close();else connection?.close();return null;}finally{clearTimeout(timer);if(permit)releaseHubIdentityObservation(hub,ticket);if(!cap&&signal)remove.call(signal,'abort',abort);if(pending.get(d.allocationId)===p)pending.delete(d.allocationId);}});
   p.result=Promise.race([work,timeout]);pending.set(d.allocationId,p);return p.result;
  },
  close(cap){const r=authorities.get(cap);if(r?.store===store&&r.configuration===c)r.close();},
  invalidate,dispose(){if(disposed)return;disposed=true;invalidate();removeInvalidate?.();},
  status:()=>Object.freeze({active:active.size,pending:pending.size,disposed})
 });
 owners.set(owner,Object.freeze({store,configuration:c,open:owner.open,close:owner.close,dispose:owner.dispose,status:owner.status}));
 try{if(c.onInvalidate){const remove=c.onInvalidate(invalidate);need(remove===undefined||remove===null||typeof remove==='function');removeInvalidate=remove??null;}return owner;}catch{owner.dispose();return null;}
}

// Fixed source-owned entry points; public DTOs or overridden methods cannot mint.
export function isSectionPromotionRecoveryAuthorityOwner(owner){return owners.has(owner);}
export function openSectionPromotionRecoveryAuthority(owner,store,locator,options={}){const r=owners.get(owner);return r?.store===store?r.open(locator,options):Promise.resolve(null);}
export function closeSectionPromotionRecoveryAuthority(owner,store,cap){const r=owners.get(owner),a=authorities.get(cap);if(!r||r.store!==store||a?.owner!==owner||a.store!==store)return false;r.close(cap);return true;}
export function disposeSectionPromotionRecoveryAuthority(owner){const r=owners.get(owner);if(!r)return false;r.dispose();return true;}
export function sectionPromotionRecoveryAuthorityDrained(owner){const r=owners.get(owner);if(!r)return false;const s=r.status();return s.active===0&&s.pending===0;}

export function sectionPromotionRecoveryAuthorityMatches(owner,configuration){try{const r=owners.get(owner);return !!r&&['origin','clock','readProofs','isCurrent','onInvalidate'].every(key=>own(configuration,key)===r.configuration[key]);}catch{return false;}}
