import {readOriginalRecoveryStoreExecution} from './indexed-store.js';
import {measureSourceWorkingPhysicalTree} from './browser-native-sync/source-working-physical.js';
import {requireMaintenanceProcessingPurposeFinalFacts} from '../background/maintenance-processing-consent.js';
import {requireTopicProcessingFinalFacts} from './topic-processing.js';
import {sampleSectionPromotionRecoveryFinalFacts,requireSectionPromotionRecoveryFinalFacts} from './ai-usage/section-promotion-recovery-authority.js';
import {syncArchiveYearIndex,clearArchiveYearIndex} from './archive-year-index.js';
import {trackSemanticWrite,trackSemanticClear,flushSemanticWrites} from './ai-usage/delta.js';
import {trackNavigationWrite,flushNavigationWrites} from './archive-navigation-invalidation.js';
import {backupMetaAllowed} from './backup-format.js';
import {ArchiveError,STORAGE_KEY} from './constants.js';
import {ArchiveStore} from './store.js';
import {workspaceDocuments} from './workspace.js';
import {canonicalChat} from './validation.js';
import {hashText} from './dedupe.js';
import {LIBRARY_STORES,upgradeLibrarySchema} from './thought-schema.js';

export const DATABASE_NAME='paia-archive';
export const STORES=['meta','records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','tombstones','migrationBackup','sourceCounts','operationReceipts','importTasks','importBatches','importEvidence','importSources'];
export const FILTER_STORES=['filterInputs','filterIntents'];
export const IA_STORES=['inputStates','inputRemovals','thoughts','categories','dependencies','revisions','invalidations'];
const dbCategory=error=>({NotFoundError:'missing_store_or_index',TransactionInactiveError:'transaction_inactive',ConstraintError:'constraint',DataError:'invalid_key_or_index_value',DataCloneError:'uncloneable_value',QuotaExceededError:'quota',AbortError:'transaction_aborted'}[error?.name]||'database_error');
const fail=(error=null)=>Object.assign(new ArchiveError(error?.name==='QuotaExceededError'?'STORAGE_FULL':'STORAGE_FAILED'),{dbCategory:dbCategory(error)});
const req=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(fail(request.error));});
const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
export const sourceOf=r=>r.sourceKey||null;
export const chatOf=r=>`${r.platform}:${r.chatId||canonicalChat(r.chatUrl)?.id}`;
export const sortOf=r=>[r.sourceSentAt?0:1,r.sourceSentAt||'',r.conversationOrder??1000001,r.id];
export const tombstoneId=t=>typeof t==='string'?'snapshot:'+t:'source:'+t.sourceIdentityHash;
const stripDoc=d=>{const v=structuredClone(d);delete v.sourceRecordIds;return v;};

// Process-local one-shot observation of a real eligible delta in this exact
// transaction. No DTO field, durable row, provider grant or additional read.
const semanticWriteReceipts=new WeakMap();
export function consumeCommittedSemanticWrite(repository,result){
 const receipt=result&&typeof result==='object'?semanticWriteReceipts.get(result):null;
 if(!receipt||receipt.repository!==repository||receipt.used)return false;
 receipt.used=true;return true;
}
function bindSemanticWriteReceipt(repository,result){
 if(!result||typeof result!=='object')return;
 const receipt={repository,used:false};semanticWriteReceipts.set(result,receipt);
 // The original single-field owner returns its one batch item's exact object.
 // Share one token with that alias; never invoke getters or walk result bodies.
 try{const items=Object.getOwnPropertyDescriptor(result,'items')?.value;
  if(!Array.isArray(items)||Object.getOwnPropertyDescriptor(items,'length')?.value!==1)return;
  const item=Object.getOwnPropertyDescriptor(items,'0')?.value;
  if(item&&typeof item==='object')semanticWriteReceipts.set(item,receipt);
 }catch{/* An optional observation cannot change a committed operation result. */}
}

// Only this owner can mint scope identity. Public wrapper promises and tx-like
// objects are not evidence of either native identity or transaction settlement.
// Capture original platform accessors once. Calling them requires native IDB
// internal slots; public factory fields, names and tags cannot establish them.
const NativeIDBTransaction=globalThis.IDBTransaction;
const nativeTransactionAbort=NativeIDBTransaction?.prototype.abort;
const nativeTransactionDb=NativeIDBTransaction&&Object.getOwnPropertyDescriptor(NativeIDBTransaction.prototype,'db')?.get;
const nativeTransactionMode=NativeIDBTransaction&&Object.getOwnPropertyDescriptor(NativeIDBTransaction.prototype,'mode')?.get;
const nativeTransactionError=NativeIDBTransaction&&Object.getOwnPropertyDescriptor(NativeIDBTransaction.prototype,'error')?.get;
const nativeAddEventListener=globalThis.EventTarget?.prototype.addEventListener;
const nativeRemoveEventListener=globalThis.EventTarget?.prototype.removeEventListener;
const nativeEventTarget=globalThis.Event&&Object.getOwnPropertyDescriptor(globalThis.Event.prototype,'target')?.get;
const nativeEventCurrentTarget=globalThis.Event&&Object.getOwnPropertyDescriptor(globalThis.Event.prototype,'currentTarget')?.get;
const NativeMessageChannel=globalThis.MessageChannel;
const nativePortStart=globalThis.MessagePort?.prototype.start;
const nativePortPost=globalThis.MessagePort?.prototype.postMessage;
const nativePortClose=globalThis.MessagePort?.prototype.close;
const nativeTransactionEvidence=transaction=>{
 try{if(!NativeIDBTransaction||!nativeTransactionDb||!nativeTransactionMode||!nativeAddEventListener||!nativeRemoveEventListener||!nativeEventTarget||!nativeEventCurrentTarget||!(transaction instanceof NativeIDBTransaction))return null;
  return {database:nativeTransactionDb.call(transaction),mode:nativeTransactionMode.call(transaction)};
 }catch{return null;}
};
// Process-local refusal fence only. No row cache, durable generation, native
// proof or financial authority. Any original write admission invalidates prior
// observations, even if it later aborts; pending writers cannot be observed as
// quiescent. Readonly Source probes do not invalidate this owner.
const repositoryWrites=new WeakMap(),repositoryWriteObservations=new WeakMap();
export function observeRepositoryWriteFence(repository){
 const state=repositoryWrites.get(repository);if(!state||state.active!==0||!repository.db)throw new ArchiveError('STALE_BASE');
 const token=Object.freeze({});repositoryWriteObservations.set(token,{repository,state,generation:state.generation,db:repository.db,factory:repository.factory,name:repository.name});return token;
}
export function requireRepositoryWriteFence(repository,token){
 const observed=repositoryWriteObservations.get(token),state=repositoryWrites.get(repository);
 if(!observed||observed.repository!==repository||observed.state!==state||state.active!==0||observed.generation!==state.generation||observed.db!==repository.db||observed.factory!==repository.factory||observed.name!==repository.name)throw new ArchiveError('STALE_BASE');
 return true;
}
// Restriction-only ordinary recovery work. The opaque ticket is bound to one
// repository and one invocation; it lends no transaction or generation authority.
const ordinaryRecoveryWork=new WeakMap(),ordinaryRecoveryWindows=new WeakMap();
function recoveryWork(ticket,repository){
 const p=ordinaryRecoveryWork.get(ticket);
 if(!p||p.repository!==repository||p.closed||p.failed)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 try{
  if(p.name!==repository.name||p.factory!==repository.factory||p.database!==null&&p.database!==repository.db||p.isCurrent()===false)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
  if(p.database===null&&repository.db!=null)p.database=repository.db;
  if(workClock()>=p.deadline||p.refs>4096||p.bytes>2*1024*1024)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 }catch(e){p.failed=true;throw e;}return p;
}
export function createOriginalRecoveryWork(repository,{ms=30000,isCurrent=()=>true}={}){
 if(!repositoryWrites.has(repository)||!Number.isFinite(ms)||ms<=0||ms>30000||typeof isCurrent!=='function')throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 const ticket=Object.freeze({});ordinaryRecoveryWork.set(ticket,{repository,name:repository.name,factory:repository.factory,database:repository.db??null,deadline:workClock()+ms,isCurrent,refs:0,bytes:0,failed:false,closed:false,window:false,scope:null,pending:null});return ticket;
}
export function chargeOriginalRecoveryWork(repository,ticket,length,references=1){
 const p=recoveryWork(ticket,repository);
 if(!Number.isSafeInteger(length)||length<0||!Number.isSafeInteger(references)||references<0){p.failed=true;throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
 p.refs+=references;p.bytes+=length;recoveryWork(ticket,repository);
}
export function checkOriginalRecoveryWork(repository,ticket){recoveryWork(ticket,repository);}
// An explicit original task may only join the already-open same-ticket window.
// This is a restriction, never a way to opt out of the physical ledger.
export function requireOriginalRecoveryWorkWindow(repository,ticket){const p=recoveryWork(ticket,repository);if(!p.window||ordinaryRecoveryWindows.get(repository)!==ticket)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');return true;}
export function readOriginalRecoveryTransactionWork(repository,scope){requireRepositoryTransactionScope(repository,scope);return repositoryScopes.get(scope).recoveryWork??null;}
// Read-only time remaining on this exact original invocation; never a new clock.
export function remainingOriginalRecoveryWork(repository,ticket){return Math.max(0,recoveryWork(ticket,repository).deadline-workClock());}
export function tightenOriginalRecoveryWork(repository,ticket,ms){const p=recoveryWork(ticket,repository);if(!Number.isFinite(ms)||ms<=0||ms>30000){p.failed=true;throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}p.deadline=Math.min(p.deadline,workClock()+ms);}
export function currentOriginalRecoveryWork(repository){return ordinaryRecoveryWindows.get(repository)??null;}
export function finishOriginalRecoveryWork(repository,ticket){const p=ordinaryRecoveryWork.get(ticket);if(!p||p.repository!==repository||p.window||p.scope||p.pending)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');p.closed=true;}
export async function withOriginalRecoveryWork(repository,ticket,action){
 const p=recoveryWork(ticket,repository),active=ordinaryRecoveryWindows.get(repository);
 if(p.window||active||typeof action!=='function'){p.failed=true;if(active)ordinaryRecoveryWork.get(active).failed=true;throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
 p.window=true;ordinaryRecoveryWindows.set(repository,ticket);
 // A successful original commit remains successful if cancellation arrives
 // after native settlement. Every native operation and terminal fence already
 // checked the ticket; do not reinterpret that confirmed receipt afterwards.
 try{const value=await action();if(p.failed||p.closed||p.pending)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');return value;}
 catch(e){p.failed=true;throw e;}
 finally{
  // Do not remove the window while an already-started original transaction is
  // opening, executing or settling. A failed late scope can never fall back to
  // an unmetered default transaction after Promise.race settles a caller.
  if(p.pending){p.failed=true;if(p.scope)workAbort(p.scope);await p.pending.settled;}
  ordinaryRecoveryWindows.delete(repository);p.window=false;
 }
}
const repositoryScopes=new WeakMap();
const repositoryNativeScopes=new WeakMap();
// Optional finite envelope on the original scope. No new transaction, source
// authority or mutable exported meter; all requests and terminal work debit it.
const workClock=globalThis.performance.now.bind(globalThis.performance);
function workAbort(record){if(record.recoveryWork)ordinaryRecoveryWork.get(record.recoveryWork).failed=true;if(record.workLimit)record.workLimit.failed=true;record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}}
function workRefuse(record){workAbort(record);throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
function workCheck(record){
 if(record?.recoveryWork)try{recoveryWork(record.recoveryWork,record.repository);}catch{workRefuse(record);}
 const b=record?.workLimit;if(b&&(workClock()-b.started>=b.ms||b.refs>b.references||b.bytes>b.byteLimit))workRefuse(record);
}
function workCharge(scope,refs=0,value,hasValue=false,acceptedResult=false){
 const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx),b=record?.workLimit;if(!b)return;
 if(record.scope!==scope)workRefuse(record);
 // NEW requests must be current before acquisition. An already accepted IDB
 // result debits its original ledger before any expiry/identity refusal, even
 // when cancellation arrived while the physical request was pending.
 if(!acceptedResult){if(!sameScope(record))workRefuse(record);workCheck(record);}
 let failed=false,length=0;b.refs+=refs;
 if(hasValue)try{length=measureSourceWorkingPhysicalTree(value,Math.min(2*1024*1024,b.byteLimit)).B;b.bytes+=length;}catch{failed=true;}
 const recovery=ordinaryRecoveryWork.get(record.recoveryWork);
 if(!recovery||recovery.repository!==record.repository)failed=true;else{recovery.refs+=refs;recovery.bytes+=length;}
 if(failed||!sameScope(record))workRefuse(record);workCheck(record);
}
function workResult(scope,value){workCharge(scope,0,value,true,true);return value;}
function workRow(scope,value){workCharge(scope,1,value,true,true);return value;}
function workCursor(scope,cursor){if(!repositoryScopes.get(scope)?.workLimit)return;workCharge(scope,cursor?1:0,cursor?{key:cursor.key,primaryKey:cursor.primaryKey,value:cursor.value}:null,true,true);}
// Native key ranges are operand values, not capabilities. Capture browser
// accessors at definition time. Synthetic IDB ranges have four own data slots;
// no unknown prototype getter is invoked to project a request operand.
const originalRangePrototype=globalThis.IDBKeyRange?.prototype;
const originalRangeGetters=originalRangePrototype&&Object.freeze(Object.fromEntries(['lower','upper','lowerOpen','upperOpen'].map(k=>[k,Object.getOwnPropertyDescriptor(originalRangePrototype,k)?.get])));
function queryOperand(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||[Object.prototype,null].includes(Object.getPrototypeOf(value)))return value;
 if(originalRangeGetters&&Object.values(originalRangeGetters).every(fn=>typeof fn==='function'))try{return Object.fromEntries(Object.entries(originalRangeGetters).map(([key,get])=>[key,Reflect.apply(get,value,[])]));}catch{}
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=['lower','upper','lowerOpen','upperOpen'];
 if(Reflect.ownKeys(descriptors).length===4&&keys.every(k=>Object.hasOwn(descriptors[k]??{},'value')))return Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
 return value; // The original physical meter refuses unsupported shapes.
}
function workQuery(scope,refs,operands){if(repositoryScopes.get(scope)?.workLimit)workCharge(scope,refs,operands.map(queryOperand),true);}
function finiteWorkQuery(scope,limit){if(repositoryScopes.get(scope)?.workLimit&&(!Number.isSafeInteger(limit)||limit<1||limit>100))workRefuse(repositoryScopes.get(scope));}
function registerOriginalWorkLimit(repository,scope,{references=4096,bytes=2*1024*1024,ms=30000}={},readonly=false){
 const record=scopeRecord(repository,scope);requireRepositoryTransactionDataMethods(repository,scope);
 if(record.phase!=='callback'||record.identity.mode!==(readonly?'readonly':'readwrite')||record.terminalFailed||!Number.isSafeInteger(references)||references<1||references>4096||!Number.isSafeInteger(bytes)||bytes<1||bytes>2*1024*1024||!Number.isFinite(ms)||ms<=0||ms>30000)workRefuse(record);
 // Tightening never renews the original preparation clock or consumed work.
 if(record.workLimit){const b=record.workLimit;b.references=Math.min(b.references,references);b.byteLimit=Math.min(b.byteLimit,bytes);b.ms=Math.min(b.ms,ms);}
 else record.workLimit={started:workClock(),references,byteLimit:bytes,ms,refs:0,bytes:0};workCheck(record);
 clearTimeout(record.workLimit.timer);record.workLimit.timer=setTimeout(()=>{if(!record.nativeSettled)workAbort(record);},Math.max(1,record.workLimit.ms-(workClock()-record.workLimit.started)));
}

function refuseTerminal(record){
 record.terminalFailed=true;try{record.transaction.abort();}catch{}
 throw new ArchiveError('STALE_BASE');
}
const sameScope=record=>Object.getOwnPropertyDescriptor(record.scope,'tx')?.value===record.transaction&&record.repository.db===record.identity.database;
function requireWritableScope(scope){
 const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx);
 workCheck(record);if(record?.finalReadFences.length&&!sameScope(record))refuseTerminal(record);
 if(record&&(record.phase==='terminal'||record.phase==='terminal-compatibility'||record.terminalFailed))refuseTerminal(record);
}
function requireReadableScope(scope){const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx);workCheck(record);if(record&&(record.terminalFailed||record.finalReadFences.length&&!sameScope(record)||record.phase==='terminal'&&!record.driverReading))refuseTerminal(record);}
function synchronousTrue(record,check){
 let value;try{value=check();}catch{refuseTerminal(record);}
 if(value!==true){try{if(value instanceof Promise)value.catch(()=>{});}catch{}refuseTerminal(record);}
 if(record.terminalFailed||record.nativeSettled||!sameScope(record))refuseTerminal(record);
}
// Original-owner terminal read plans, bound to this exact live write scope.
// The plan is a synchronous generator: only Repository performs the yielded
// IDB reads. Async generators/checkers and arbitrary awaited work cannot enter
// the strict final segment. A second registration never replaces prior facts.
export function registerRepositoryFinalReadFence(repository,scope,{plan,isCurrent,compatibilityRecheck=null,authority=null,promotionRecoveryAuthority=null,maintenanceProcessingPurpose=null}={}){
 const record=scopeRecord(repository,scope);requireRepositoryTransactionScope(repository,scope);
 if(record.identity.mode!=='readwrite'||record.phase!=='callback'||record.terminalFailed)refuseTerminal(record);
 if(typeof plan!=='function'||typeof isCurrent!=='function'||compatibilityRecheck!==null&&typeof compatibilityRecheck!=='function')refuseTerminal(record);
 synchronousTrue(record,isCurrent);if(authority!==null)synchronousTrue(record,()=>requireTopicProcessingFinalFacts(authority,repository,scope));if(promotionRecoveryAuthority!==null)synchronousTrue(record,()=>requireSectionPromotionRecoveryFinalFacts(promotionRecoveryAuthority,repository,scope));if(maintenanceProcessingPurpose!==null)synchronousTrue(record,()=>requireMaintenanceProcessingPurposeFinalFacts(maintenanceProcessingPurpose,repository,scope));record.finalReadFences.push(Object.freeze({plan,isCurrent,compatibilityRecheck,authority,promotionRecoveryAuthority,maintenanceProcessingPurpose}));
}
function sampleFinalAuthorities(record,fences){for(const fence of fences)if(fence.promotionRecoveryAuthority!==null)synchronousTrue(record,()=>sampleSectionPromotionRecoveryFinalFacts(fence.promotionRecoveryAuthority,record.repository,record.scope));}
function finalAuthorityFacts(record,fences){
 for(const fence of fences){if(fence.authority!==null)synchronousTrue(record,()=>requireTopicProcessingFinalFacts(fence.authority,record.repository,record.scope));if(fence.promotionRecoveryAuthority!==null)synchronousTrue(record,()=>requireSectionPromotionRecoveryFinalFacts(fence.promotionRecoveryAuthority,record.repository,record.scope));}
 // Existing Topic receipt facts still sample their original Date contract.
 // A later such sample can retire an earlier purpose: sweep every fixed
 // purpose token only after the entire original collection has finished.
 for(const fence of fences)if(fence.maintenanceProcessingPurpose!==null)synchronousTrue(record,()=>requireMaintenanceProcessingPurposeFinalFacts(fence.maintenanceProcessingPurpose,record.repository,record.scope));
}
function currentFinalAuthorities(record,fences){for(const fence of fences)synchronousTrue(record,fence.isCurrent);sampleFinalAuthorities(record,fences);finalAuthorityFacts(record,fences);}
async function runFinalReadFences(scope,record){
 if(!record.finalReadFences.length)return;
 record.phase='terminal-compatibility';const fences=Object.freeze([...record.finalReadFences]);
 // Every original issuer runs before the fixed recovery owner's clock sample.
 // Sampling can itself revoke another owner, so the final sweep remains entirely
 // private facts for all registered groups. No public facts callback is accepted.
 const current=()=>currentFinalAuthorities(record,fences);
 // Legacy processing resolvers predate synchronous opaque qualification. This
 // compatibility recheck is deliberately OUTSIDE the closed read-plan segment;
 // delayed non-IDB legacy resolvers have no native atomic-revocation guarantee.
 // Strict production owners must omit it and use their original private cap.
 for(const f of fences)if(f.compatibilityRecheck){current();await f.compatibilityRecheck();current();}
 record.phase='terminal';
 for(const f of fences){
  current();const iterator=f.plan();
  if(!iterator||typeof iterator.next!=='function'||typeof iterator.then==='function')refuseTerminal(record);
  let value;
  for(;;){
   current();const step=iterator.next(value);current();
   if(!step||typeof step!=='object'||typeof step.then==='function')refuseTerminal(record);
   if(step.done){if(step.value!==true)refuseTerminal(record);break;}
   const spec=step.value,descriptors=spec&&Object.getOwnPropertyDescriptors(spec);
   if(!descriptors||![Object.prototype,null].includes(Object.getPrototypeOf(spec))||Object.values(descriptors).some(d=>!Object.hasOwn(d,'value'))||!Object.hasOwn(descriptors,'method')||!Object.hasOwn(descriptors,'table'))refuseTerminal(record);
   const method=descriptors.method.value,table=descriptors.table.value,key=descriptors.key?.value,index=descriptors.index?.value;
   if(typeof table!=='string'||!record.transaction.objectStoreNames.contains(table)||!['get','count'].includes(method)||Reflect.ownKeys(spec).some(k=>!['method','table','key','index'].includes(k)))refuseTerminal(record);
   current();
   if(method==='get'){if(index!==undefined||key===undefined)refuseTerminal(record);let reading;record.driverReading=true;try{reading=originalDataMethods.find(([name])=>name==='get')[1].value.call(scope,table,key);}finally{record.driverReading=false;}value=await reading;}
   else{if(index!==undefined&&typeof index!=='string')refuseTerminal(record);workQuery(scope,1,[table,index,key]);scope.metrics.reads++;const target=record.transaction.objectStore(table);value=workResult(scope,await req(index?target.index(index).count(key):target.count(key)));}
   current();
  }
 }
 // No application storage read/write or non-IDB await follows this check.
 current();
}

const originalOwnDescriptor=Object.getOwnPropertyDescriptor;
const originalPrototypeOf=Object.getPrototypeOf;
const scopeRecord=(repository,scope)=>{const r=repositoryScopes.get(scope);if(!r||r.repository!==repository)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');return r;};
export function requireRepositoryTransactionScope(repository,scope){
 const r=scopeRecord(repository,scope),property=Object.getOwnPropertyDescriptor(scope,'tx');
 if(r.nativeSettled||r.unwound||!property||property.value!==r.transaction)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
 return r.identity;
}
export function requireRepositoryTransactionDataMethods(repository,scope){
 const r=scopeRecord(repository,scope);requireRepositoryTransactionScope(repository,scope);
 if(originalPrototypeOf(scope)!==r.dataPrototype||r.dataPrototype!==originalDataPrototype||originalPrototypeOf(originalDataPrototype)!==originalDataPrototypeParent)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
 for(const [name,expected]of originalDataMethods){
  const descriptor=originalOwnDescriptor(originalDataPrototype,name);
  if(originalOwnDescriptor(scope,name)||!descriptor||descriptor.value!==expected.value||descriptor.get!==expected.get||descriptor.set!==expected.set||descriptor.writable!==expected.writable||descriptor.enumerable!==expected.enumerable||descriptor.configurable!==expected.configurable)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
 }
}
// Internal domain-owner settlement evidence, without claiming native BNS
// retention qualification for non-native mechanism fixtures. The original
// repository callback, finalizers and success path must all have unwound.
export function requireRepositoryTransactionSucceeded(repository,scope){
 const r=scopeRecord(repository,scope);
 if(r.nativeOutcome!=='completed'||!r.originalSuccess||!r.unwound||r.identity.nativeTransaction&&r.trustedNativeOutcome!=='completed')throw new ArchiveError('STALE_BASE');
 return true;
}
export function requireRepositoryTransactionCommitted(repository,scope){
 const r=scopeRecord(repository,scope);
 // Settlement also includes abort. Only the original successful transaction
 // path, after every finalizer and actual native completion, proves commit.
 if(r.trustedNativeOutcome!=='completed'||r.nativeOutcome!=='completed'||!r.originalSuccess||!r.unwound)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
}
function waitNativeDispatchEnd(){
 return new Promise((resolve,reject)=>{
  let channel,finished=false;
  const finish=error=>{
   if(finished)return;finished=true;
   try{if(channel)nativeRemoveEventListener.call(channel.port1,'message',received);}catch{error=true;}
   for(const port of channel?[channel.port1,channel.port2]:[])try{nativePortClose.call(port);}catch{error=true;}
   if(error)reject(new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED'));else resolve();
  };
  const received=event=>{try{if(event.isTrusted!==true||nativeEventTarget.call(event)!==channel.port1||nativeEventCurrentTarget.call(event)!==channel.port1)return;finish();}catch{finish(true);}};
  try{
   if(!NativeMessageChannel||!nativePortStart||!nativePortPost||!nativePortClose)throw Error('Native task unavailable');
   channel=new NativeMessageChannel();nativeAddEventListener.call(channel.port1,'message',received);nativePortStart.call(channel.port1);nativePortPost.call(channel.port2,0);
  }catch{finish(true);}
 });
}
export async function awaitRepositoryTransactionSettled(repository,scope){
 // Wait first: scheduling before native terminal + callback unwind could run
 // too early. All real waiters share one lazy dispatch-end task per record.
 const r=scopeRecord(repository,scope);await r.settled;
 if(r.identity.nativeTransaction){if(!r.dispatchEnd)r.dispatchEnd=waitNativeDispatchEnd();await r.dispatchEnd;}
}

// The closing reader is owned by the same original scope record, once only.
// It observes lifecycle only: no rows, callback authority or reader escapes.
const humanRetentionReaders=new WeakMap();
export function requireRepositoryCommittedIdentity(repository,scope){
 requireRepositoryTransactionCommitted(repository,scope);const r=scopeRecord(repository,scope),property=originalOwnDescriptor(scope,'tx');
 if(!r.identity.nativeTransaction||!property||!('value'in property)||property.value!==r.transaction)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
 return r.identity;
}
export function beginRepositoryHumanRetentionRead(repository,scope,transaction){
 const identity=requireRepositoryCommittedIdentity(repository,scope),owner=scopeRecord(repository,scope),native=nativeTransactionEvidence(transaction);
 if(owner.humanRetentionReaderUsed||!native||native.database!==identity.database||native.mode!=='readonly'||transaction===owner.transaction||!nativeTransactionError)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
 owner.humanRetentionReaderUsed=true;
 const token=Object.freeze({});let resolve,reject;const r={repository,scope,owner,transaction,token,outcome:null,awaiting:false,listenersCleared:false,dispatchEnded:false,done:new Promise((a,b)=>{resolve=a;reject=b;})};
 r.done.catch(()=>{});humanRetentionReaders.set(token,r);
 const cleanup=()=>{const errors=[];for(const [type,listener]of [['complete',complete],['abort',abort]])try{nativeRemoveEventListener.call(transaction,type,listener);}catch(error){errors.push(error);}r.listenersCleared=errors.length===0;return errors;};
 const terminal=(event,outcome)=>{
  try{if(event.isTrusted!==true||nativeEventTarget.call(event)!==transaction||nativeEventCurrentTarget.call(event)!==transaction)return;}catch{return;}
  if(r.outcome!==null)return;r.outcome=outcome;let primary,failed=false;
  if(outcome!=='completed'){try{nativeTransactionError.call(transaction);primary=new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');}catch(error){primary=error;}failed=true;}
  const errors=cleanup();if(failed)reject(retentionReadFailure(primary,errors));else if(errors.length)reject(retentionReadFailure(errors[0],errors.slice(1)));else resolve();
 };
 const complete=event=>terminal(event,'completed'),abort=event=>terminal(event,'aborted');
 try{nativeAddEventListener.call(transaction,'complete',complete);nativeAddEventListener.call(transaction,'abort',abort);}
 catch(error){r.outcome='failed';const primary=retentionReadFailure(error,cleanup());reject(primary);humanRetentionReaders.delete(token);throw primary;}
 return token;
}
function retentionReadFailure(primary,secondary){
 if(!secondary.length)return primary;
 if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))try{Object.defineProperty(primary,'retentionCleanupErrors',{value:Object.freeze([...secondary]),configurable:true});return primary;}catch(error){secondary.push(error);}
 return new AggregateError([primary,...secondary],'Retention reader primary and cleanup failures',{cause:primary});
}
export async function awaitRepositoryHumanRetentionRead(repository,scope,transaction,observer){
 const r=humanRetentionReaders.get(observer);
 if(!r||r.repository!==repository||r.scope!==scope||r.transaction!==transaction||r.awaiting)throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');r.awaiting=true;
 let primary,failed=false;const cleanup=[];
 try{
  try{await r.done;}catch(error){primary=error;failed=true;}
  try{await waitNativeDispatchEnd();r.dispatchEnded=true;}catch(error){if(failed)cleanup.push(error);else{primary=error;failed=true;}}
  if(!failed){try{if(r.outcome!=='completed')throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');requireRepositoryCommittedIdentity(repository,scope);}catch(error){primary=error;failed=true;}}
  if(failed)throw retentionReadFailure(primary,cleanup);
 }finally{r.awaitFinished=true;}
}
export function requireRepositoryHumanRetentionReadDrained(repository,scope,transaction,observer){
 const r=humanRetentionReaders.get(observer),owner=scopeRecord(repository,scope);
 if(!r||r.owner!==owner||r.repository!==repository||r.scope!==scope||r.transaction!==transaction||r.token!==observer||!r.awaitFinished||!r.listenersCleared||!r.dispatchEnded||!['completed','aborted'].includes(r.outcome))throw new ArchiveError('BNS_HUMAN_RETENTION_REQUIRED');
}

const backupDataStores=new Set(['importSources','records','blocks','documents','libraryDocuments','inputStates','inputRemovals','thoughts','topics','sections','placements','provenance','dependencies','revisions','thoughtSuppressions','entryRelations','filterInputs','filterIntents','times','tombstones','operationReceipts']);
class Transaction {
 constructor(tx,metrics,semanticEnabled=false){this.tx=tx;this.metrics=metrics;this.semanticEnabled=semanticEnabled;}
 async has(store,key){requireReadableScope(this);workCharge(this,1,[store,key],true);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).getKey(key)))!==undefined;}
 async get(store,key){requireReadableScope(this);workCharge(this,1,[store,key],true);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).get(key)));}
 async put(store,value,key){requireWritableScope(this);if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key===undefined?value?.id:key),value);await trackSemanticWrite(this,store,key===undefined?value?.id:key,value);await trackNavigationWrite(this,store,key===undefined?value?.id:key,value);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(value.id))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,key===undefined?[store,value]:[store,value,key],true);this.metrics.writes++;const result=await req(key===undefined?this.tx.objectStore(store).put(value):this.tx.objectStore(store).put(value,key));return workResult(this,result);}
 async putDerivedSearchRow(store,value){
  if(!['thoughts','topics','sections'].includes(store)||!value?.id)throw fail();
  const previous=await this.get(store,value.id);
  if(!previous)throw fail();
  const portable=row=>{const copy=structuredClone(row);delete copy.searchVersion;delete copy.indexedSearchVersion;return copy;};
  // Search rebuilds may update only derived version tags. Any domain change
  // must still advance the backup generation and invalidate an active export.
  if(!same(portable(previous),portable(value)))throw fail();
  const changed=this.backupChanged;
  const result=await this.put(store,value);
  this.backupChanged=changed;
  return result;
 }
 async putDerivedTopicCount(value){
  if(!value?.id||!value.countCache)throw fail();const count=value.countCache;
  if(Object.keys(count).sort().join(',')!=='complete,count,key,meaningfulContentAt'||typeof count.key!=='string'||count.key.length>500||!Number.isSafeInteger(count.count)||count.count<0||!Number.isFinite(count.meaningfulContentAt)||count.meaningfulContentAt<0||typeof count.complete!=='boolean')throw fail();
  const previous=await this.get('topics',value.id);if(!previous)throw fail();
  const withoutCount=row=>{const copy=structuredClone(row);delete copy.countCache;return copy;};
  // countCache is excluded from BACKUP_FIELDS.topics. This exemption can only
  // replace that rebuildable cache, never mask a name/body/ownership mutation.
  if(!same(withoutCount(previous),withoutCount(value)))throw fail();
  const changed=this.backupChanged,result=await this.put('topics',value);this.backupChanged=changed;return result;
 }
 async putDerivedTopicRead(value){
  if(!value?.id||!value.readingActivity)throw fail();const read=value.readingActivity;
  if(Object.keys(read).sort().join(',')!=='at,weight'||!Number.isFinite(read.at)||!Number.isFinite(read.weight)||read.weight<0||read.weight>8)throw fail();
  const previous=await this.get('topics',value.id);if(!previous)throw fail();
  const withoutRead=row=>{const copy=structuredClone(row);delete copy.readingActivity;return copy;};
  // Reading activity is also excluded from the portable Topic contract. Keep
  // it as derived metadata without changing any canonical field or authority.
  if(!same(withoutRead(previous),withoutRead(value)))throw fail();
  const changed=this.backupChanged,result=await this.put('topics',value);this.backupChanged=changed;return result;
 }
 async delete(store,key){requireWritableScope(this);if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key),null);await trackSemanticWrite(this,store,key,null);await trackNavigationWrite(this,store,key,null);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(key))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,[store,key],true);this.metrics.writes++;const result=await req(this.tx.objectStore(store).delete(key));return workResult(this,result);}
 async clear(store){requireWritableScope(this);if(repositoryScopes.get(this)?.workLimit)workRefuse(repositoryScopes.get(this));if(store==='blockIndex')await clearArchiveYearIndex(this);await trackSemanticClear(this,store);if(store==='documents')await this.delete('meta','ans:index-state:v1:catalog');if(backupDataStores.has(store))this.backupChanged=true;requireWritableScope(this);return req(this.tx.objectStore(store).clear());}
 async count(store,index,key){requireReadableScope(this);workQuery(this,1,[store,index,key]);return workResult(this,await req(index?this.tx.objectStore(store).index(index).count(key):this.tx.objectStore(store).count(key)));}
 async all(store,index,key,limit){
  requireReadableScope(this);const record=repositoryScopes.get(this),stream=!!record?.workLimit&&limit===undefined;
  if(!stream)finiteWorkQuery(this,limit);workQuery(this,1,[store,index,key,limit]);this.metrics.scans++;const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  if(stream)return new Promise((resolve,reject)=>{
   // Existing complete-owner reads retain their complete-set semantics. Under
   // the private envelope, acquire and charge each physical row before retaining
   // it; never fetch an unbounded getAll result or silently truncate the set.
   const rows=[],request=target.openCursor(key);request.onerror=()=>reject(fail(request.error));
   request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){workResult(this,null);resolve(rows);return;}const row=cursor.value;workRow(this,row);this.metrics.reads++;rows.push(row);cursor.continue();}catch(error){reject(error);}};
  });
  const rows=await req(target.getAll(key,limit));workCharge(this,rows.length,rows,true,true);this.metrics.reads+=rows.length;return rows;
 }
 async keys(store,index,key){requireReadableScope(this);const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);if(!repositoryScopes.get(this)?.workLimit)return req(target.getAllKeys(key));workQuery(this,1,[store,index,key]);return new Promise((resolve,reject)=>{const keys=[],request=target.openKeyCursor(key);request.onerror=()=>reject(fail(request.error));request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){workResult(this,null);resolve(keys);return;}workRow(this,cursor.primaryKey);keys.push(cursor.primaryKey);cursor.continue();}catch(error){reject(error);}};});}
 async edge(store,index,key,direction='next'){requireReadableScope(this);workQuery(this,1,[store,index,key,direction]);return new Promise((resolve,reject)=>{const r=this.tx.objectStore(store).index(index).openCursor(key,direction);r.onsuccess=()=>{try{resolve(workResult(this,r.result?.value));}catch(error){reject(error);}};r.onerror=()=>reject(fail());});}
 async rangePage(store,index,range,after,limit,direction='next'){requireReadableScope(this);finiteWorkQuery(this,limit);const reverse=direction==='prev',effective=after?(reverse?(range?.lower!==undefined?IDBKeyRange.bound(range.lower,after,range.lowerOpen,true):IDBKeyRange.upperBound(after,true)):(range?.upper!==undefined?IDBKeyRange.bound(after,range.upper,true,range.upperOpen):IDBKeyRange.lowerBound(after,true))):range;workQuery(this,1,[store,index,range,after,limit,direction,effective]);return new Promise((resolve,reject)=>{const rows=[],target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store),r=target.openCursor(effective,direction);r.onerror=()=>reject(fail());r.onsuccess=()=>{try{const c=r.result;workCursor(this,c);if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}if(after&&(reverse?indexedKeyCompare(c.key,after)>=0:indexedKeyCompare(c.key,after)<=0)){c.continue();return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();}catch(error){reject(error);}};});}
 async indexPrimaryPage(store,index,key,{after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  if(!Number.isInteger(limit)||limit<1||limit>100||after!==null&&typeof after!=='string')throw new ArchiveError('INVALID_REQUEST');
  const range=IDBKeyRange.only(key);workQuery(this,1,[store,index,key,after,limit,range]);return new Promise((resolve,reject)=>{const rows=[],r=this.tx.objectStore(store).index(index).openCursor(range);r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{try{
   const c=r.result;workCursor(this,c);if(!c){resolve({rows,next:null});return;}
   if(after!==null&&c.primaryKey<after){c.continuePrimaryKey(key,after);return;}
   if(after!==null&&c.primaryKey===after){c.continue();return;}
   this.metrics.reads++;rows.push({key:c.primaryKey,value:c.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length===limit){resolve({rows,next:c.primaryKey});return;}c.continue();
  }catch(error){reject(error);}};});
 }
 async primaryRangePage(store,{prefix='',after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  if(typeof prefix!=='string'||!Number.isInteger(limit)||limit<1||limit>100||after!==null&&(typeof after!=='string'||!after.startsWith(prefix)||after>=prefix+'\uffff'))throw new ArchiveError('INVALID_REQUEST');
  const upper=prefix+'\uffff',range=IDBKeyRange.bound(after===null?prefix:after,upper,after!==null,true);workQuery(this,1,[store,prefix,after,limit,range]);const target=this.tx.objectStore(store);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{try{
   const c=r.result;workCursor(this,c);if(!c){resolve({rows,next:null});return;}
   this.metrics.reads++;rows.push({key:c.key,value:c.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length<limit){c.continue();return;}
   // Peek only the next key: never materialize object limit+1. A real abort
   // can make continuation/probe creation throw inside this async callback;
   // reject its original promise so the owning transaction can actually unwind.
   const probeRange=IDBKeyRange.bound(c.key,upper,true,true);workQuery(this,1,[store,c.key,upper,true,true,probeRange]);const probe=target.openKeyCursor(probeRange);
   probe.onerror=()=>reject(fail(probe.error));probe.onsuccess=()=>{try{workResult(this,probe.result?.key);this.metrics.primaryKeyProbes=(this.metrics.primaryKeyProbes||0)+1;resolve({rows,next:probe.result?c.key:null});}catch(error){reject(error);}};
  }catch(error){reject(error);}};});
 }
 async page(store,{index,after,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  const range=after===undefined?undefined:IDBKeyRange.lowerBound(after,true);workQuery(this,1,[store,index,after,limit,range]);const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail());r.onsuccess=()=>{try{const c=r.result;workCursor(this,c);if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();}catch(error){reject(error);}};});
 }
}

// Capture the actual private class before any caller receives a scope. This
// bounded profile is a refusal check, not proof of native request/data effects.
const originalDataPrototype=Transaction.prototype;
const originalDataPrototypeParent=originalPrototypeOf(originalDataPrototype);
const originalDataMethods=Object.freeze(['get','has','put','count','rangePage','primaryRangePage','delete'].map(name=>Object.freeze([name,Object.freeze(originalOwnDescriptor(originalDataPrototype,name))])));

export class ArchiveRepository {
 #existingOnly=false;
 constructor(local,{indexedDB=globalThis.indexedDB,name=DATABASE_NAME,checkpoint=async()=>{},ia=false,smartFilter=false,thoughtLibrary=false}={}){this.local=local;this.ia=ia;this.smartFilter=smartFilter;this.thoughtLibrary=thoughtLibrary;this.stores=[...STORES,...(ia?IA_STORES:[]),...(smartFilter?FILTER_STORES:[]),...(thoughtLibrary?LIBRARY_STORES:[])];this.factory=indexedDB;this.name=name;this.checkpoint=checkpoint;this.metrics={reads:0,writes:0,scans:0};repositoryWrites.set(this,{generation:Object.freeze({}),active:0});}
 // Cold source preparation may bind only an existing exact-schema library.
 async openExisting(){this.#existingOnly=true;return originalRepositoryOpen.call(this);}
 async open(){
  if(this.db)return; if(!this.factory)throw fail();
  if(this.#existingOnly){const version=this.thoughtLibrary?5:this.smartFilter?4:this.ia?3:2;if(typeof this.factory.databases!=='function'||!(await this.factory.databases()).some(row=>row.name===this.name&&row.version===version))throw fail();}
  this.db=await new Promise((resolve,reject)=>{
   let blocked=false;const r=this.factory.open(this.name,this.thoughtLibrary?5:this.smartFilter?4:this.ia?3:2);
   r.onupgradeneeded=event=>{
    if(this.#existingOnly){try{r.transaction.abort();}catch{}return;}
    const db=r.result;for(const name of this.stores)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
    for(const name of ['importEvidence','importSources']){const st=r.transaction.objectStore(name);if(!st.indexNames.contains('bySource'))st.createIndex('bySource','sourceKey');}
    if(this.ia){
     const indexes={inputStates:{byDocument:'documentId'},inputRemovals:{byBlock:'blockId'},thoughts:{byList:'listKey',bySourceRecord:['sourceRecordIds',{multiEntry:true}]},categories:{byDimension:'dimension'},dependencies:{byInput:'inputId',byInputList:'inputList',byThought:'thoughtId'},revisions:{byEntity:'entityKey',byDocument:'documentId',byDocumentList:'documentList',bySourceRecord:['sourceRecordIds',{multiEntry:true}],byList:'listKey'},invalidations:{byInput:'inputId'}};
     for(const [name,defs] of Object.entries(indexes)){const st=r.transaction.objectStore(name);for(const [key,def] of Object.entries(defs)){const [path,opts]=Array.isArray(def)?def:[def,{}];if(!st.indexNames.contains(key))st.createIndex(key,path,opts);}}
    }
    if(this.smartFilter){const st=r.transaction.objectStore('filterInputs');for(const [name,path] of Object.entries({byDocument:'documentId',byPending:'pendingKey',byFiltered:'filteredKey'}))if(!st.indexNames.contains(name))st.createIndex(name,path);}
    if(this.thoughtLibrary){upgradeLibrarySchema(r.transaction);r.transaction.objectStore('meta').put({id:'thought-ddl',fromVersion:event.oldVersion,toVersion:5});}
    if(event.oldVersion===0){
    const index=r.transaction.objectStore('recordIndex');
    index.createIndex('bySource','sourceKey');index.createIndex('byIdentity',['chatKey','sourceMessageId']);index.createIndex('byChat','chatKey');index.createIndex('byLegacyChat','legacyChat');index.createIndex('byDedupe','dedupeKey',{unique:true});index.createIndex('bySequence','sequence',{unique:true});index.createIndex('byList','listKey');index.createIndex('byTrash','trashKey');index.createIndex('byHidden','hiddenKey');index.createIndex('byKnown',['chatKey','visibleKey','known']);
    const blocks=r.transaction.objectStore('blockIndex');blocks.createIndex('byDocument','documentId');blocks.createIndex('byRecord','recordIds',{multiEntry:true});blocks.createIndex('bySequence','sequence',{unique:true});blocks.createIndex('byTime',['documentId','known','stamp','id']);blocks.createIndex('byExcluded',['documentId','excludedKey']);blocks.createIndex('byAttached','attachedDocument');blocks.createIndex('byList','listKey');
    blocks.createIndex('byKnown',['documentId','excludedKey','known']);
    const docs=r.transaction.objectStore('documents');docs.createIndex('byChat','chatKey');docs.createIndex('bySequence','sequence',{unique:true});docs.createIndex('byDisplay','displayKey');for(const view of ['library','archive','excluded'])docs.createIndex(view+'Display',view+'Display');
    const counts=r.transaction.objectStore('sourceCounts');counts.createIndex('byDocument','documentId');counts.createIndex('byView','views',{multiEntry:true});for(const view of ['library','archive','excluded'])for(const edge of ['First','Last'])counts.createIndex(view+edge,view+edge);
    }
   };
   r.onerror=()=>reject(fail());r.onblocked=()=>{blocked=true;reject(fail());};r.onsuccess=()=>{const db=r.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();this.db=null;};resolve(db);};
  });
 }
 async transaction(write,fn,stores=this.stores,explicitRecoveryWork=undefined){
  const writeState=repositoryWrites.get(this);if(!writeState)throw fail();
  const execution=readOriginalRecoveryStoreExecution(this);
  if(execution?.interfered&&(explicitRecoveryWork!==undefined||ordinaryRecoveryWindows.has(this)))throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
  if(explicitRecoveryWork!==undefined)requireOriginalRecoveryWorkWindow(this,explicitRecoveryWork);
  const recoveryTicket=explicitRecoveryWork!==undefined?explicitRecoveryWork:execution===null?ordinaryRecoveryWindows.get(this):execution.recoveryWork;
  const recovery=recoveryTicket?recoveryWork(recoveryTicket,this):null;
  if(recovery?.pending){recovery.failed=true;if(recovery.scope)workAbort(recovery.scope);throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
  let recoveryPending;if(recovery){let resolve;recoveryPending={settled:new Promise(r=>resolve=r),resolve:()=>resolve()};recovery.pending=recoveryPending;}
  try{
  if(write){writeState.generation=Object.freeze({});writeState.active++;}
  try{
  await this.open();if(recovery)recoveryWork(recoveryTicket,this);if(write&&!stores.includes('meta'))stores=[...stores,'meta'];let tx;try{tx=this.db.transaction(stores,write?'readwrite':'readonly',write?{durability:'strict'}:undefined);}catch(error){throw fail(error);}
  const scope=new Transaction(tx,this.metrics,this.thoughtLibrary);
  const native=nativeTransactionEvidence(tx);
  let release;const record={scope,phase:'callback',terminalFailed:false,finalReadFences:[],repository:this,transaction:tx,transactionAbort:native?nativeTransactionAbort:tx.abort,dataPrototype:originalPrototypeOf(scope),nativeSettled:false,nativeOutcome:'pending',trustedNativeOutcome:null,originalSuccess:false,unwound:false,identity:Object.freeze({token:Object.freeze({}),database:native?.database||tx.db,mode:native?.mode||tx.mode,nativeTransaction:!!native}),settled:new Promise(resolve=>{release=resolve;})};
  repositoryScopes.set(scope,record);repositoryNativeScopes.set(tx,record);if(recovery){record.recoveryWork=recoveryTicket;recovery.scope=record;}
  const maybeRelease=()=>{if(record.nativeSettled&&record.unwound)release();};
  const done=new Promise((resolve,reject)=>{
   // False native events do not consume either listener or settle any state.
   // Non-native test stores retain ordinary cleanup, never native authority.
   const terminal=(event,outcome)=>{
    if(native){try{if(event.isTrusted!==true||nativeEventTarget.call(event)!==tx||nativeEventCurrentTarget.call(event)!==tx)return;}catch{return;}}
    if(record.nativeSettled)return;
    if(native){nativeRemoveEventListener.call(tx,'complete',complete);nativeRemoveEventListener.call(tx,'abort',abort);}
    else{tx.removeEventListener('complete',complete);tx.removeEventListener('abort',abort);}
    record.nativeOutcome=outcome;record.nativeSettled=true;
    if(native)record.trustedNativeOutcome=outcome;
    maybeRelease();if(outcome==='completed')resolve();else reject(fail(tx.error));
   };
   const complete=event=>terminal(event,'completed'),abort=event=>terminal(event,'aborted');
   if(native){nativeAddEventListener.call(tx,'complete',complete);nativeAddEventListener.call(tx,'abort',abort);}
   else{tx.addEventListener('complete',complete);tx.addEventListener('abort',abort);}
   tx.onerror=()=>{};
  });
  // The rejection is observed immediately even when the operation also rejects.
  done.catch(()=>{});
  try{if(recovery){recoveryWork(recoveryTicket,this);registerOriginalWorkLimit(this,scope,{references:4096-recovery.refs,bytes:2*1024*1024-recovery.bytes,ms:recovery.deadline-workClock()},!write);}const result=await fn(scope);record.phase='finalizing';if(record.terminalFailed)refuseTerminal(record);if(write)await flushNavigationWrites(scope);const semanticWrite=write?await flushSemanticWrites(scope):false;if(write&&scope.backupChanged){const marker=await scope.get('meta','backup-data-generation');await scope.put('meta',{id:'backup-data-generation',value:(marker?.value||0)+1});}if(write){await runFinalReadFences(scope,record);currentFinalAuthorities(record,record.finalReadFences);}workCheck(record);await done;record.originalSuccess=true;if(semanticWrite)bindSemanticWriteReceipt(this,result);return result;}catch(e){if(recovery)recovery.failed=true;try{record.transactionAbort.call(record.transaction);}catch{}await done.catch(()=>{});if(record.workLimit?.failed)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');if(tx.error?.name==='QuotaExceededError')throw fail(tx.error);if(e instanceof ArchiveError||['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))throw e;throw fail(e?.name?e:tx.error);}finally{clearTimeout(record.workLimit?.timer);record.finalReadFences.length=0;record.unwound=true;if(recovery?.scope===record)recovery.scope=null;maybeRelease();}
  }finally{if(write)writeState.active--;}
  }catch(error){if(recovery)recovery.failed=true;throw error;}finally{if(recoveryPending){if(recovery.pending===recoveryPending)recovery.pending=null;recoveryPending.resolve();}}
 }
 async initialize(){
  await this.open();let m=await this.transaction(false,t=>t.get('meta','migration'));
  if(m?.phase==='active'){
   const local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
   if(local?.schemaVersion!==6||local.databaseId!==m.databaseId)throw fail();return;
  }
  let saved=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
  if(!m){
   if(saved?.schemaVersion===6)throw fail();
   // The frozen loader performs the old schema normalization exactly once.
   const memory={async get(){return {[STORAGE_KEY]:structuredClone(saved)};},async set(v){saved=structuredClone(v[STORAGE_KEY]);},async getBytesInUse(){return 0;}};
   const old=new ArchiveStore(memory);await old.load();const state=structuredClone(old.state);
   const digest=await hashText(JSON.stringify(state));
   m={id:'migration',phase:'copying',databaseId:crypto.randomUUID(),cursor:0,digest,verified:false,recoveryVerified:false};
   await this.transaction(true,async t=>{await t.put('migrationBackup',{id:'schema5',state});await t.put('meta',m);});await this.checkpoint('backup');
  }
  if(m.phase==='copying'){
   const backup=await this.transaction(false,t=>t.get('migrationBackup','schema5'));if(!backup||await hashText(JSON.stringify(backup.state))!==m.digest)throw fail();
   // Exercise restoration through the frozen loader; no local writes occur.
   let restored=structuredClone(backup.state);const recovery=new ArchiveStore({async get(){return {[STORAGE_KEY]:restored};},async set(v){restored=v[STORAGE_KEY];}});await recovery.load();
   if(!same(recovery.state,backup.state))throw fail();
   const s=backup.state,rows=[];
   s.records.forEach((r,i)=>{rows.push(['records',{id:r.id,value:r}]);rows.push(['recordIndex',recordIndex(r,i)]);});
   s.library.blocks.forEach((b,i)=>{rows.push(['blocks',{id:b.id,value:b}]);rows.push(['blockIndex',blockIndex(b,i,s.records)]);});
   s.conversations.forEach((d,i)=>rows.push(['documents',{id:d.id,sequence:i,chatKey:d.sourceConversationId?`${d.platform}:${d.sourceConversationId}`:undefined,displayKey:[-(Date.parse(d.lastSourceSentAt)||0),d.id],value:stripDoc(d)}]));
   for(const view of ['library','archive','excluded'])for(const d of workspaceDocuments(s,view)){const row=rows.find(([store,r])=>store==='documents'&&r.id===d.id)[1];row[view+'Display']=[-(Date.parse(d.lastSourceSentAt)||0),d.id];}
   s.library.documents.forEach(d=>rows.push(['libraryDocuments',{id:d.id,value:stripDoc(d)}]));
   Object.entries(s.sourceTimes).forEach(([id,value])=>rows.push(['times',{id,value}]));
   s.tombstones.forEach((value,sequence)=>rows.push(['tombstones',{id:tombstoneId(value),sequence,value}]));
   const byId=new Map(s.records.map(r=>[r.id,r]));
   for(const d of s.conversations){const groups=new Map();for(const b of s.library.blocks.filter(b=>b.documentId===d.id))for(const p of b.provenance){const r=byId.get(p.sourceRecordId);if(!r)continue;const key=r.sourceKey||'legacy:'+r.id;let g=groups.get(key);if(!g){g={records:new Map(),blocks:new Map()};groups.set(key,g);}g.records.set(r.id,r);g.blocks.set(b.id,b);}for(const [key,g]of groups)rows.push(['sourceCounts',sourceCount(d.id,key,[...g.records.values()],[...g.blocks.values()],d.sourceConversationId)]);}
   for(let offset=m.cursor;offset<rows.length;offset+=100){const end=Math.min(offset+100,rows.length);await this.transaction(true,async t=>{for(const [store,value]of rows.slice(offset,end))await t.put(store,value);m={...m,cursor:end};await t.put('meta',m);});await this.checkpoint('copy');}
   const control={settings:s.settings,preferences:s.preferences,diagnostics:s.diagnostics,memoryAccessPolicy:s.memoryAccessPolicy,classificationRules:s.library.classificationRules,filterRules:s.library.filterRules};
   await this.transaction(true,async t=>{await t.put('meta',{id:'control',value:control});await t.put('meta',{id:'sequence',records:s.records.length,blocks:s.library.blocks.length,documents:s.conversations.length});});
   const migrated=await this.materialize();
   // Compare the complete schema5 state, not just counts or selected fields.
   if(!same(migrated,s))throw fail();
   m={...m,phase:'verified',verified:true,recoveryVerified:true,recordCount:s.records.length,blockCount:s.library.blocks.length};
   await this.transaction(true,t=>t.put('meta',m));await this.checkpoint('verified');
  }
  if(m.phase==='verified'){
   const backup=await this.transaction(false,t=>t.get('migrationBackup','schema5'));if(!backup||!same(await this.materialize(),backup.state))throw fail();
   const control=await this.transaction(false,t=>t.get('meta','control'));
   // Old code is tested against this incompatible schema; downgrade is unsupported.
   await this.local.set({[STORAGE_KEY]:{schemaVersion:6,databaseId:m.databaseId,...control.value}});
   await this.checkpoint('sealed');
   await this.transaction(true,async t=>{await t.delete('migrationBackup','schema5');await t.put('meta',{id:'gate',epoch:control.value.settings.epoch,enabled:control.value.settings.enabled});await t.delete('meta','control');await t.put('meta',{...m,phase:'active'});});await this.checkpoint('active');
  }
 }
 async recoverMigration(){
  const {migration,backup}=await this.transaction(false,async t=>({migration:await t.get('meta','migration'),backup:await t.get('migrationBackup','schema5')}));
  if(!migration||migration.phase==='active')throw new ArchiveError('FORBIDDEN');
  if(!['copying','verified'].includes(migration.phase)||!backup||await hashText(JSON.stringify(backup.state))!==migration.digest)throw fail();
  await this.transaction(true,async t=>{
   const current=await t.get('meta','migration');if(current?.phase==='active'||current?.databaseId!==migration.databaseId)throw new ArchiveError('FORBIDDEN');
   for(const name of STORES)if(name!=='migrationBackup')await t.clear(name);
   await t.put('meta',{...migration,phase:'copying',cursor:0,verified:false,recoveryVerified:false});
  });
  await this.initialize();
 }
 async materialize(){const local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];return this.transaction(false,async t=>{
  const control=(await t.get('meta','control'))?.value||local;if(!control)throw fail();
  const indexes=await t.all('recordIndex','bySequence');const records=[];for(const r of indexes)records.push((await t.get('records',r.id)).value);
  const bs=await t.all('blockIndex','bySequence'),blocks=[];for(const b of bs)blocks.push((await t.get('blocks',b.id)).value);
  const ds=await t.all('documents','bySequence'),documents=[],libraryDocuments=[];
  for(const row of ds){const ids=new Set(blocks.filter(b=>b.documentId===row.id).flatMap(b=>b.provenance.map(p=>p.sourceRecordId)));const selected=records.filter(r=>ids.has(r.id));const sourceRecordIds=selected.map(r=>r.id);documents.push({...row.value,sourceRecordIds});libraryDocuments.push({...((await t.get('libraryDocuments',row.id)).value),sourceRecordIds});}
  const sourceTimes=Object.fromEntries((await t.all('times')).map(r=>[r.id,r.value]));const tombstones=(await t.all('tombstones')).sort((a,b)=>(a.sequence??0)-(b.sequence??0)).map(r=>r.value);
  return {schemaVersion:5,library:{documents:libraryDocuments,blocks,classificationRules:control.classificationRules,filterRules:control.filterRules},memoryAccessPolicy:control.memoryAccessPolicy,settings:control.settings,records,tombstones,sourceTimes,diagnostics:control.diagnostics,conversations:documents,preferences:control.preferences};
 });}
 async tombstones(){return this.transaction(false,async t=>(await t.all('tombstones')).map(r=>r.value));}
 async close(){const state=repositoryWrites.get(this);if(state)state.generation=Object.freeze({});this.db?.close();this.db=null;}
}
export function recordIndex(r,sequence){return {id:r.id,sequence,sourceKey:r.sourceKey,sourceMessageId:r.sourceMessageId,chatKey:chatOf(r),legacyChat:r.sourceKey?undefined:chatOf(r),dedupeKey:r.dedupeKey,contentHash:r.contentHash,listKey:[chatOf(r),r.hidden||r.deletedAt?1:0,...sortOf(r)],sort:sortOf(r),sourceSentAt:r.sourceSentAt,conversationOrder:r.conversationOrder,hidden:r.hidden,deletedAt:r.deletedAt,trashKey:r.deletedAt?1:0,hiddenKey:r.hidden&&!r.deletedAt?1:0,visibleKey:r.hidden||r.deletedAt?1:0,known:r.sourceSentAt?0:1};}
export function blockIndex(b,sequence,records){const r=records.find(r=>r.id===b.sourceRecordId);return {id:b.id,sequence,documentId:b.documentId,recordIds:b.provenance.map(p=>p.sourceRecordId),attachedDocument:b.provenance.length?b.documentId:undefined,sourceRecordId:b.sourceRecordId,excluded:b.excluded,excludedKey:b.excluded?1:0,known:r?.sourceSentAt?0:1,stamp:r?.sourceSentAt||'',listKey:[b.documentId,b.excluded?1:0,...sortOf({...r,id:b.id})],sort:sortOf({...r,id:b.id}),sourceSentAt:r?.sourceSentAt||null,conversationOrder:r?.conversationOrder??null};}
function indexedKeyCompare(a,b){for(let i=0;i<Math.min(a.length,b.length);i++){if(a[i]<b[i])return -1;if(a[i]>b[i])return 1;}return a.length-b.length;}
export function sourceCount(docId,key,records,blocks,chatId){
 const id=JSON.stringify([docId,key]),row={id,documentId:docId,views:[]};for(const view of ['archive','library','excluded']){
  const selected=view==='archive'?records.filter(r=>(r.chatId===chatId||r.chatKey==='chatgpt:'+chatId)&&!r.hidden&&!r.deletedAt):records.filter(r=>blocks.some(b=>(b.excluded===(view==='excluded'))&&(b.provenance?b.provenance.some(p=>p.sourceRecordId===r.id):b.recordIds.includes(r.id))));
  if(!selected.length)continue;row.views.push(JSON.stringify([docId,view]));const times=selected.map(r=>r.sourceSentAt).filter(Boolean).sort();row[view+'First']=[docId,times.length?0:1,times[0]||'',id];row[view+'Last']=[docId,times.length?0:1,times.at(-1)||'',id];
 }return row;
}

// Source identity only: no transaction, row read, write or permission grant.
const promptTransactionPrototype=ArchiveRepository.prototype,promptTransactionParent=originalPrototypeOf(promptTransactionPrototype),promptTransactionMethod=originalOwnDescriptor(promptTransactionPrototype,'transaction');
const promptTransactionDescriptor=(actual,expected)=>!!actual&&['value','get','set','writable','enumerable','configurable'].every(key=>actual[key]===expected[key]);
export function originalRepositoryTransactionOwner(repository){
 if(!repositoryWrites.has(repository)||originalPrototypeOf(promptTransactionPrototype)!==promptTransactionParent||!promptTransactionDescriptor(originalOwnDescriptor(promptTransactionPrototype,'transaction'),promptTransactionMethod))return false;
 for(let owner=repository;owner;owner=originalPrototypeOf(owner)){const descriptor=originalOwnDescriptor(owner,'transaction');if(descriptor)return promptTransactionDescriptor(descriptor,promptTransactionMethod);}
 return false;
}

// Fixed method for existing-only acquisition; instance wrappers cannot turn
// that request into initialization or migration. The private field brands it.
const originalRepositoryOpen=ArchiveRepository.prototype.open;
