import {readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,assertSectionPromotionRecoveryAuthoritySnapshot,registerSectionPromotionRecoveryAuthorityFence} from './section-promotion-recovery-authority.js';
import {PROMOTION_WORK_PREFIX} from '../topic-promotion.js';
import {ArchiveError} from '../constants.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {topicIdentityBase} from '../topic-identity.js';
import {keyedHash} from '../thought-model.js';
import {registerRepositoryFinalReadFence,requireRepositoryTransactionScope,requireRepositoryTransactionSucceeded} from '../idb-repository.js';
import {retireMaintenanceSectionPromotionHistoryOffer,readMaintenanceSectionPromotionOffer,assertMaintenanceSectionPromotionOfferFacts} from './maintenance-section-promotion-session.js';

// Local, nonportable recovery locators. They never grant a field read, an
// identity use, a confirmation or a successful-result receipt.
const KEY='section-promotion-recovery-locators:v1',SESSION='section-promotion-recovery-context:v1',MAX=8,BYTES=8192;
const caps=new WeakMap(),allocations=new WeakMap(),sessionWrites=new WeakMap(),retirementIntents=new WeakMap(),retirementOutcomes=new WeakMap();
const need=(v,code='STALE_BASE')=>{if(!v)throw new ArchiveError(code);};
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);need(d&&Object.hasOwn(d,'value'));return d.value;};
const closed=(v,keys)=>{need(v&&[Object.prototype,null].includes(Object.getPrototypeOf(v)));const names=Reflect.ownKeys(v);need(names.length===keys.length&&names.every(k=>keys.includes(k)));return Object.fromEntries(keys.map(k=>[k,own(v,k)]));};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
function array(value,max){need(Array.isArray(value));const length=own(value,'length');need(Number.isSafeInteger(length)&&length>=0&&length<=max&&Reflect.ownKeys(value).length===length+1);return Array.from({length},(_,i)=>own(value,String(i)));}
const operation=v=>id(v)&&v.length>=8&&!v.includes(':');
const origin=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&url.origin===value&&url.username===''&&url.password==='';}catch{return false;}};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
const rowKeys=['version','allocationId','operationId','sourceTopicId','sourceSectionId','principalId','libraryId','restoreEpoch','logicalJobId','childOperationId','operationReceiptId','paidRequestHash','serviceOrigin','tabId','windowId','createdAt','signature'];
function row(raw){
 const r=closed(raw,Object.hasOwn(raw??{},'unwritten')?[...rowKeys,'unwritten']:rowKeys);if(Object.hasOwn(r,'unwritten')){const u=closed(r.unwritten,['version','at','signature']);need(u.version===1&&Number.isSafeInteger(u.at)&&u.at>=r.createdAt&&typeof u.signature==='string'&&/^[a-f0-9]{64}$/.test(u.signature));r.unwritten=Object.freeze(u);}need(r.version===1&&[r.allocationId,r.sourceTopicId,r.sourceSectionId,r.principalId,r.libraryId,r.logicalJobId,r.childOperationId,r.operationReceiptId].every(id)&&/^[a-f0-9]{64}$/.test(r.paidRequestHash)&&typeof r.serviceOrigin==='string'&&r.serviceOrigin.length<=500&&origin(r.serviceOrigin)&&operation(r.operationId)&&(r.restoreEpoch===null||id(r.restoreEpoch))&&[r.tabId,r.windowId,r.createdAt].every(v=>Number.isSafeInteger(v)&&v>=0)&&typeof r.signature==='string'&&/^[a-f0-9]{64}$/.test(r.signature));return Object.freeze(r);
}
function registry(raw){
 if(raw===undefined||raw===null)return Object.freeze({id:KEY,version:1,revision:0,rows:Object.freeze([])});
 const r=closed(raw,['id','version','revision','rows']);need(r.id===KEY&&r.version===1&&Number.isSafeInteger(r.revision)&&r.revision>=0&&Array.isArray(r.rows));const out={...r,rows:array(r.rows,MAX).map(row)};need(bytes(out)<=BYTES&&new Set(out.rows.map(r=>r.operationId)).size===out.rows.length&&new Set(out.rows.map(r=>r.allocationId)).size===out.rows.length);return Object.freeze({...out,rows:Object.freeze(out.rows)});
}
// Each new pending allocation reserves its bounded historical envelope inside
// the same 8 KiB limit. Existing obligations are never evicted to make room.
function capacityBytes(value){return bytes({...value,rows:value.rows.map(r=>r.unwritten?r:{...r,unwritten:{version:1,at:Number.MAX_SAFE_INTEGER,signature:'0'.repeat(64)}})});}
function signatureData(r){return ['section-promotion-recovery-locator-v1',Object.fromEntries(rowKeys.filter(k=>k!=='signature').map(k=>[k,r[k]]))];}
function unwrittenSignatureData(r,at){return ['section-promotion-unwritten-v1',Object.fromEntries(rowKeys.map(k=>[k,r[k]])),at];}
function authority(raw){const r=closed(raw,['principalId','libraryId','restoreEpoch']);need(id(r.principalId)&&id(r.libraryId)&&(r.restoreEpoch===null||id(r.restoreEpoch)));return Object.freeze(r);}
function sessionAPI(value){if(value===null)return null;need(value&&typeof value.get==='function'&&typeof value.set==='function','UNAVAILABLE');return Object.freeze({source:value,get:value.get.bind(value),set:value.set.bind(value)});}

export class SectionPromotionCheckpoints {
 #store;#repository;#database=null;#session;#intents=new WeakMap();
 constructor(store,{session=null}={}){this.#store=store;this.#repository=store.repository;this.#session=sessionAPI(session);}
 #current(){const repository=own(this.#store,'repository'),database=own(this.#repository,'db');need(repository===this.#repository&&database&&(!this.#database||database===this.#database));return true;}
 #check(fn){this.#current();const value=fn();if(value!==true){if(value instanceof Promise)value.catch(()=>{});need(false);}return this.#current();}
 async #read(t){const original=requireRepositoryTransactionScope(this.#repository,t);need(original.database===this.#repository.db);if(!this.#database)this.#database=original.database;this.#current();const identity=await topicIdentityBase(t),gate=await t.get('meta','gate'),library=await t.get('meta','thought-library');need(!library?.sealed,'CONSENT_REQUIRED');const value=registry(await t.get('meta',KEY));const known=allocations.get(this.#repository);if(known)for(const [key,state]of known)if(!value.rows.some(r=>r.allocationId===key&&eq(r,state.row))){state.retired=true;known.delete(key);}this.#current();return {identity,gate,library,value};}
 async #snapshot(current){return this.#store.run(()=>this.#repository.transaction(false,async t=>{this.#check(current);const value=await this.#read(t);this.#check(current);return value;},['meta']));}
 #fence(t,base,expected,current){const self=this;registerRepositoryFinalReadFence(this.#repository,t,{isCurrent:()=>self.#check(current),plan:function*(){need(eq((yield {method:'get',table:'meta',key:'thought-suppression-key'})?.value,base.identity.secret));need(((yield {method:'get',table:'meta',key:'recovery-restore-epoch'})?.value??null)===base.identity.restoreEpoch);need(eq((yield {method:'get',table:'meta',key:'gate'}),base.gate)&&eq((yield {method:'get',table:'meta',key:'thought-library'}),base.library));need(eq(registry(yield {method:'get',table:'meta',key:KEY}),expected));return true;}});}
 async #verify(r,base,current){this.#check(current);need(r.restoreEpoch===base.identity.restoreEpoch);const signed=await keyedHash(base.identity.secret,signatureData(r));this.#check(current);need(signed===r.signature);if(r.unwritten){const historical=await keyedHash(base.identity.secret,unwrittenSignatureData(r,r.unwritten.at));this.#check(current);need(historical===r.unwritten.signature);}}
 #cap(r,identity){let values=allocations.get(this.#repository);if(!values){values=new Map();allocations.set(this.#repository,values);}let state=values.get(r.allocationId);if(!state){state={row:r,retired:false};values.set(r.allocationId,state);}need(!state.retired&&eq(state.row,r));const token=Object.freeze({});caps.set(token,{owner:this,store:this.#store,row:r,state,identity:Object.freeze({secret:Object.freeze([...identity.secret]),restoreEpoch:identity.restoreEpoch}),fences:new WeakMap(),history:r=>{need(r.unwritten);return this.#cap(r,identity);},read:()=>this.#readCap(token)});if(r.unwritten)retireMaintenanceSectionPromotionHistoryOffer(this.#store,token);return token;}
 #readCap(token){const c=caps.get(token);need(c?.owner===this&&!c.state.retired);this.#current();return c.row;}
 read(token){return this.#readCap(token);}
 // Only a live original paid offer supplies operation/Section/account facts.
 // The command owner calls this after the user's original confirm was accepted.
 async accept(owner,offer,sender,current){
  const descriptor=readMaintenanceSectionPromotionOffer(owner,this.#store,offer),source=authority(descriptor.sourceAuthority),financial=closed(descriptor.financialBinding,['origin','requestHash']);need(Number.isSafeInteger(sender?.tab?.id)&&sender.tab.id>=0&&Number.isSafeInteger(sender.tab.windowId)&&sender.tab.windowId>=0);
  const originalCurrent=current;current=()=>{this.#check(originalCurrent);return assertMaintenanceSectionPromotionOfferFacts(owner,this.#store,offer);};
  const captured=await this.#snapshot(current);need(source.restoreEpoch===captured.identity.restoreEpoch);
  const priorIntent=this.#intents.get(offer),intent=priorIntent??{version:1,allocationId:crypto.randomUUID(),operationId:descriptor.operationId,sourceTopicId:descriptor.preview.sourceTopicId,sourceSectionId:descriptor.preview.sourceSectionId,...source,...closed(descriptor.paidBinding,['logicalJobId','childOperationId','operationReceiptId']),paidRequestHash:financial.requestHash,serviceOrigin:financial.origin,tabId:sender.tab.id,windowId:sender.tab.windowId,createdAt:Date.now()};if(!priorIntent)this.#intents.set(offer,Object.freeze(intent));
  const signature=await keyedHash(captured.identity.secret,signatureData({...intent,signature:''}));this.#check(current);const proposed=row({...intent,signature});
  const allocated=await this.#store.run(()=>this.#repository.transaction(true,async t=>{
   this.#check(current);const now=await this.#read(t);need(eq(now.identity,captured.identity)&&eq(now.gate,captured.gate)&&eq(now.library,captured.library));
   const old=now.value.rows.find(r=>r.operationId===proposed.operationId);
   if(old){need(old.allocationId===proposed.allocationId,'REQUEST_ALREADY_IN_FLIGHT');need(eq(Object.fromEntries(['operationId','sourceTopicId','sourceSectionId','principalId','libraryId','restoreEpoch','logicalJobId','childOperationId','operationReceiptId','paidRequestHash','serviceOrigin','tabId','windowId'].map(k=>[k,old[k]])),Object.fromEntries(['operationId','sourceTopicId','sourceSectionId','principalId','libraryId','restoreEpoch','logicalJobId','childOperationId','operationReceiptId','paidRequestHash','serviceOrigin','tabId','windowId'].map(k=>[k,proposed[k]]))));this.#fence(t,now,now.value,current);return old;}
   need(now.value.rows.length<MAX&&!now.value.rows.some(r=>r.sourceTopicId===proposed.sourceTopicId&&r.sourceSectionId===proposed.sourceSectionId),'REQUEST_ALREADY_IN_FLIGHT');
   need(now.value.revision<Number.MAX_SAFE_INTEGER);const next={id:KEY,version:1,revision:now.value.revision+1,rows:[...now.value.rows,proposed]};need(capacityBytes(next)<=BYTES,'BUDGET_EXCEEDED');await t.put('meta',next);this.#fence(t,now,next,current);return proposed;
  },['meta']));
  this.#check(current);const token=this.#cap(allocated,captured.identity);this.#mirror();this.#check(current);return token;
 }
 #mirror(){
  if(!this.#session||sessionWrites.has(this.#session.source))return;
  // This optional same-value marker is only a hint, never recovery authority. A hung
  // browser storage RPC retains one resource slot but never holds confirm or
  // enqueues more writes. Its absence proves nothing about browser lifetime.
  const source=this.#session.source,record={pending:true};sessionWrites.set(source,record);
  let result;try{result=this.#session.set({[SESSION]:{version:1}});}catch{sessionWrites.delete(source);return;}
  Promise.resolve(result).then(()=>{record.pending=false;},()=>{if(sessionWrites.get(source)===record)sessionWrites.delete(source);});
 }
 async lookup(request,sender,assertAuthority,current){
  need(id(request?.topicId)&&id(request?.sectionId)&&typeof assertAuthority==='function');const base=await this.#snapshot(current),found=base.value.rows.filter(r=>r.sourceTopicId===request.topicId&&r.sourceSectionId===request.sectionId);need(found.length<=1);if(!found.length)return null;const r=found[0];await this.#verify(r,base,current);
  await assertAuthority(authority(Object.fromEntries(['principalId','libraryId','restoreEpoch'].map(k=>[k,r[k]]))));this.#check(current);
  // Explicit same-Section recovery uses the authenticated original locator
  // and separately reacquires the original source/work permissions. Optional
  // browser markers neither select this branch nor hold it on a storage RPC.
  const final=await this.#snapshot(current);need(eq(final,base));return this.#cap(r,base.identity);
 }
 async operation(operationId,sender,assertAuthority,current){need(operation(operationId));const base=await this.#snapshot(current),r=base.value.rows.find(x=>x.operationId===operationId);need(r,'UNAVAILABLE');return this.lookup({topicId:r.sourceTopicId,sectionId:r.sourceSectionId},sender,assertAuthority,current);}
 async clear(token,current){
  const expected=this.#readCap(token),identity=caps.get(token).identity;await this.#store.run(()=>this.#repository.transaction(true,async t=>{this.#check(current);const base=await this.#read(t),r=base.value.rows.find(x=>x.operationId===expected.operationId);need(eq(base.identity,identity)&&r&&eq(r,expected));need(base.value.revision<Number.MAX_SAFE_INTEGER);const next={id:KEY,version:1,revision:base.value.revision+1,rows:base.value.rows.filter(x=>x!==r)};await t.put('meta',next);this.#fence(t,base,next,current);},['meta']));const held=caps.get(token);if(held){held.state.retired=true;allocations.get(this.#repository)?.delete(expected.allocationId);}caps.delete(token);return true;
 }
}

// Fixed source bridge: a copied locator DTO cannot become an authenticated
// original allocation capability. This reader still supplies no processing.
export function readSectionPromotionCheckpoint(token,store){const c=caps.get(token);need(c&&c.store===store);return c.read();}

export function readSectionPromotionRecoveryLocator(token,store){const row=readSectionPromotionCheckpoint(token,store);return Object.freeze({phase:row.unwritten?'unwritten':'pending',operationId:row.operationId,sourceTopicId:row.sourceTopicId,sourceSectionId:row.sourceSectionId,allocationId:row.allocationId,paidRequestHash:row.paidRequestHash,serviceOrigin:row.serviceOrigin,paidBinding:Object.freeze(Object.fromEntries(['logicalJobId','childOperationId','operationReceiptId'].map(k=>[k,row[k]]))),sourceAuthority:Object.freeze(Object.fromEntries(['principalId','libraryId','restoreEpoch'].map(k=>[k,row[k]])))});}
export function assertSectionPromotionPendingLocator(token,store){need(readSectionPromotionRecoveryLocator(token,store).phase==='pending');return true;}
export function assertSectionPromotionRecoveryLocatorFacts(token,store){readSectionPromotionCheckpoint(token,store);return true;}

// A private authenticated locator still needs its original exact metadata row
// at every protected transaction. No registry row supplies a body permission.
export async function assertSectionPromotionRecoveryLocatorSnapshot(token,store,t,{workBudget=null}={}){
 const held=caps.get(token);need(held&&held.store===store);held.read();requireRepositoryTransactionScope(store.repository,t);const reader=workBudget?contextScopeTransactionReader(store,t,workBudget):t;
 const value=registry(await reader.get('meta',KEY));held.read();need(value.rows.some(row=>eq(row,held.row)));
 need(eq((await reader.get('meta','thought-suppression-key'))?.value,held.identity.secret));held.read();need(((await reader.get('meta','recovery-restore-epoch'))?.value??null)===held.identity.restoreEpoch);held.read();return true;
}
export function registerSectionPromotionRecoveryLocatorFence(token,store,t,{workBudget=null,locatorRetirementIntent=null,recoveryAuthority=null}={}){
 const held=caps.get(token);need(held&&held.store===store);held.read();requireRepositoryTransactionScope(store.repository,t);const intent=locatorRetirementIntent===null?null:retirementRecord(locatorRetirementIntent,store,t,token,recoveryAuthority);if(intent)need(intent.workBudget===workBudget);const prior=held.fences.get(t);if(prior){need(prior.workBudget===workBudget&&prior.intent===intent);return true;}
 const charge=()=>{if(workBudget){assertContextScopeWorkBudgetFacts(workBudget,{database:store.repository.db});need(workBudget.reads<CONTEXT_TOPIC_SCOPE_LIMITS.reads,'BUDGET_EXCEEDED');workBudget.reads++;}};
 const seen=key=>{if(workBudget){const ids=workBudget.seen.get('meta')||new Set();ids.add(key);workBudget.seen.set('meta',ids);need(ids.size<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');}};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>{held.read();if(workBudget)assertContextScopeWorkBudgetFacts(workBudget,{database:store.repository.db});return true;},plan:function*(){
  charge();const value=registry(yield {method:'get',table:'meta',key:KEY});seen(KEY);if(intent)need(intent.phase==='applied'&&eq(value,intent.after));else need(value.rows.some(row=>eq(row,held.row)));if(intent||held.row.unwritten)for(const [table,key]of [['organizerWorkItems',PROMOTION_WORK_PREFIX+held.row.operationId],['operationReceipts',held.row.operationId]]){charge();need((yield {method:'count',table,key})===0);}
  charge();need(eq((yield {method:'get',table:'meta',key:'thought-suppression-key'})?.value,held.identity.secret));seen('thought-suppression-key');
  charge();need(((yield {method:'get',table:'meta',key:'recovery-restore-epoch'})?.value??null)===held.identity.restoreEpoch);seen('recovery-restore-epoch');return true;
 }});held.fences.set(t,{workBudget,intent});return true;
}


// The sole producer is the original no-work writer below, before its first put.
// This capability advances only its exact locator metadata intent in that same
// original transaction. It grants no content read and cannot revive a locator.
function retirementRecord(token,store,t,locator,recoveryAuthority){
 const r=retirementIntents.get(token);need(r&&r.store===store&&r.repository===store.repository&&r.database===store.repository.db&&r.scope===t&&r.locator===locator&&r.recoveryAuthority===recoveryAuthority&&['prepared','applied'].includes(r.phase));
 need(requireRepositoryTransactionScope(r.repository,t)===r.identity);assertSectionPromotionRecoveryLocatorFacts(locator,store);assertContextScopeWorkBudgetFacts(r.workBudget,{database:r.database});return r;
}
export function readSectionPromotionLocatorRetirementIntent(token,store,t,locator,recoveryAuthority){const r=retirementRecord(token,store,t,locator,recoveryAuthority);return Object.freeze({before:r.before,after:r.after});}
export async function retireSectionPromotionIfUnwritten(locator,store,{recoveryAuthority,workBudget,signal=null}={}){
 const held=caps.get(locator);need(held&&held.store===store&&recoveryAuthority&&workBudget&&(signal===null||signal instanceof AbortSignal));
 const repository=store.repository,database=repository.db,aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
 const current=()=>{need(store.repository===repository&&repository.db===database&&(!signal||!aborted.call(signal)));const view=readSectionPromotionRecoveryAuthority(recoveryAuthority,store,locator);need(view.operationId===held.row.operationId);assertContextScopeWorkBudgetFacts(workBudget,{database});assertSectionPromotionRecoveryAuthorityFacts(recoveryAuthority,store,locator);return true;};
 current();need(!held.row.unwritten);let intent=null;
 try{
  const at=Date.now();need(Number.isSafeInteger(at)&&at>=held.row.createdAt);const signed=unwrittenSignatureData(held.row,at),hashBytes=bytes(signed);need(workBudget.hashFields<CONTEXT_TOPIC_SCOPE_LIMITS.hashFields&&hashBytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes-workBudget.hashBytes,'BUDGET_EXCEEDED');workBudget.hashFields++;workBudget.hashBytes+=hashBytes;current();const signature=await keyedHash(held.identity.secret,signed);current();const historical=row({...held.row,unwritten:{version:1,at,signature}});
  const committed=await store.run(()=>repository.transaction(true,async t=>{
   current();await assertSectionPromotionRecoveryAuthoritySnapshot(recoveryAuthority,store,locator,t,{workBudget});current();const reader=contextScopeTransactionReader(store,t,workBudget),workId=PROMOTION_WORK_PREFIX+held.row.operationId;
   const work=await reader.has('organizerWorkItems',workId);current();const receipt=await reader.has('operationReceipts',held.row.operationId);current();if(work||receipt)return false;
   const before=registry(await reader.get('meta',KEY));current();need(before.rows.some(row=>eq(row,held.row))&&before.revision<Number.MAX_SAFE_INTEGER);
   const after=registry({id:KEY,version:1,revision:before.revision+1,rows:before.rows.map(row=>row.allocationId===held.row.allocationId?historical:row)}),token=Object.freeze({});
   intent={store,repository,database,scope:t,identity:requireRepositoryTransactionScope(repository,t),locator,recoveryAuthority,workBudget,before,after,phase:'prepared'};retirementIntents.set(token,intent);
   registerSectionPromotionRecoveryAuthorityFence(recoveryAuthority,store,locator,t,{workBudget,locatorRetirementIntent:token});current();
   await t.put('meta',after);intent.phase='applied';current();return true;
  },['meta','organizerUsage','organizerWorkItems','operationReceipts']));
  if(!committed)return null;
  // The result is historical settlement evidence, never a current authority.
  need(intent&&intent.phase==='applied');requireRepositoryTransactionSucceeded(repository,intent.scope);intent.phase='committed';held.state.retired=true;allocations.get(repository)?.delete(held.row.allocationId);
  const checkpoint=held.history(historical);return historicalOutcome(held,store,repository,database,intent.scope,locator,recoveryAuthority,checkpoint);
 }catch(error){if(intent&&intent.phase!=='committed')intent.phase='failed';throw error;}
}
function historicalOutcome(held,store,repository,database,scope,locator,recoveryAuthority,checkpoint){const outcome=Object.freeze({});retirementOutcomes.set(outcome,{store,repository,database,scope,locator,recoveryAuthority,used:false,value:Object.freeze({state:'unwritten',operationId:held.row.operationId,sourceTopicId:held.row.sourceTopicId,sourceSectionId:held.row.sourceSectionId,checkpoint})});return outcome;}
// Both HMACs were verified before the original historical locator was minted.
// This read takes the original exclusive transaction only to prove its fixed
// absence facts through the same closed terminal plan. It never reads work text.
export async function readSectionPromotionUnwrittenOutcome(locator,store,{recoveryAuthority,workBudget,signal=null}={}){
 const held=caps.get(locator);need(held&&held.store===store&&held.row.unwritten&&recoveryAuthority&&workBudget&&(signal===null||signal instanceof AbortSignal));
 const repository=store.repository,database=repository.db,aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
 const current=()=>{need(store.repository===repository&&repository.db===database&&(!signal||!aborted.call(signal)));const view=readSectionPromotionRecoveryAuthority(recoveryAuthority,store,locator);need(view.operationId===held.row.operationId);assertContextScopeWorkBudgetFacts(workBudget,{database});assertSectionPromotionRecoveryAuthorityFacts(recoveryAuthority,store,locator);return true;};let scope=null;
 current();await store.run(()=>repository.transaction(true,async t=>{scope=t;current();await assertSectionPromotionRecoveryAuthoritySnapshot(recoveryAuthority,store,locator,t,{workBudget});current();const reader=contextScopeTransactionReader(store,t,workBudget);need(!await reader.has('organizerWorkItems',PROMOTION_WORK_PREFIX+held.row.operationId));current();need(!await reader.has('operationReceipts',held.row.operationId));current();registerSectionPromotionRecoveryAuthorityFence(recoveryAuthority,store,locator,t,{workBudget});return true;},['meta','organizerUsage','organizerWorkItems','operationReceipts']));
 requireRepositoryTransactionSucceeded(repository,scope);return historicalOutcome(held,store,repository,database,scope,locator,recoveryAuthority,locator);
}
// Only the original source wrapper consumes this one-use historical outcome.
// No caller DTO can become a successful history transition, and no old pending cap is
// reactivated after the registry row has been retired.
export function takeSectionPromotionRetirementOutcome(outcome,store,locator,recoveryAuthority){
 const r=retirementOutcomes.get(outcome);if(!r)return null;need(!r.used&&r.store===store&&r.repository===store.repository&&r.database===store.repository.db&&r.locator===locator&&r.recoveryAuthority===recoveryAuthority);requireRepositoryTransactionSucceeded(r.repository,r.scope);r.used=true;return r.value;
}
