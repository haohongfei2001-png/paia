import {originalPhasedHumanReadWork,settleOriginalPhasedHumanReadWork} from './browser-native-sync/canonical-generation-phased-human.js';
import {prepareOriginalActiveRepositoryWrite,releaseOriginalActiveRepositoryWrite} from './browser-native-sync/canonical-generation-publication.js';
import {CANONICAL_REPOSITORY_PROTECTION,CANONICAL_REPOSITORY_GATE,readOriginalGenerationRepositoryAuthority,originalGenerationRepositoryAdmission,originalGenerationRepositoryMutation,originalGenerationRepositorySettlement} from './browser-native-sync/canonical-generation-repository-gate.js';
import {measureSourceWorkingPhysicalTree} from './browser-native-sync/source-working-physical.js';
import {sampleOriginalOrganizeMaterialFinalFacts,requireOriginalOrganizeMaterialFinalFacts} from '../background/organize-processing-policy.js';
import {sampleOriginalOrganizeSelectionFinalFacts,requireOriginalOrganizeSelectionFinalFacts,readOriginalOrganizeSelectionAbortSignal} from './organizer/organize-processing-scope.js';
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
const nativeAbortSignalAborted=Object.getOwnPropertyDescriptor(globalThis.AbortSignal.prototype,'aborted').get;
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
const repositoryScopes=new WeakMap();
const repositoryNativeScopes=new WeakMap();
// Optional finite work envelope belongs to the original scope, never mutable
// diagnostics. It meters request references and physical payload operands/results,
// including repeated reads and finalizer work; not browser heap or disk bytes.
const workClock=globalThis.performance.now.bind(globalThis.performance);
function workAbort(record){if(record.workLimit)record.workLimit.failed=true;record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}}
function workRefuse(record){workAbort(record);throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
function workCheck(record){const b=record?.workLimit;if(b&&(workClock()-b.started>=b.ms||b.refs>b.references||b.bytes>b.byteLimit))workRefuse(record);}
function workCharge(scope,refs=0,value,hasValue=false){
 const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx),b=record?.workLimit;if(!b)return;if(record.scope!==scope||!sameScope(record))workRefuse(record);
 workCheck(record);b.refs+=refs;workCheck(record);
 if(hasValue){try{b.bytes+=measureSourceWorkingPhysicalTree(value,b.byteLimit).B;}catch{workRefuse(record);}workCheck(record);}
}
function workResult(scope,value){workCharge(scope,0,value,true);return value;}
function workRow(scope,value){workCharge(scope,1,value,true);return value;}
function finiteWorkQuery(scope,limit){if(repositoryScopes.get(scope)?.workLimit&&(!Number.isSafeInteger(limit)||limit<1||limit>100))workRefuse(repositoryScopes.get(scope));}
export function registerRepositoryWorkLimit(repository,scope,limits){return registerOriginalWorkLimit(repository,scope,limits,false);}
function registerOriginalWorkLimit(repository,scope,{references=4096,bytes=2*1024*1024,ms=30000}={},readonly=false){
 const record=scopeRecord(repository,scope);requireRepositoryTransactionDataMethods(repository,scope);
 if(record.phase!=='callback'||record.identity.mode!==(readonly?'readonly':'readwrite')||record.terminalFailed||!Number.isSafeInteger(references)||references<1||references>4096||!Number.isSafeInteger(bytes)||bytes<1||bytes>2*1024*1024||!Number.isFinite(ms)||ms<=0||ms>30000)workRefuse(record);
 // Re-registration may tighten limits but never reset consumption or the clock.
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
function requireShadowMutation(scope,table,key,method){
 const r=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx);if(!r)return;
 if(r.shadow){const current=readOriginalGenerationRepositoryAuthority(r.shadow.token,r.repository,scope);if(current!==r.shadow.authority)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');if(!(current.kind==='active-library'&&r.activeGateFinalizer===true&&table==='meta'&&key===CANONICAL_REPOSITORY_GATE&&method==='put'))originalGenerationRepositoryMutation(current,table,key,method);}
 else if(table==='meta'&&key===CANONICAL_REPOSITORY_PROTECTION)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
}
async function beginShadowWrite(repository,scope,record,token){
 const authority=readOriginalGenerationRepositoryAuthority(token,repository,scope);let marker,timer;try{marker=await Promise.race([scope.get('meta',CANONICAL_REPOSITORY_PROTECTION),new Promise((_,reject)=>{timer=setTimeout(()=>{record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},30000);})]);}finally{clearTimeout(timer);}
 if(marker==null&&authority?.kind!=='checkpoint-install')return;
 registerRepositoryWorkLimit(repository,scope);record.workLimit.started=record.started;workCharge(scope,1,CANONICAL_REPOSITORY_PROTECTION,true);workResult(scope,marker);workCheck(record);registerRepositoryWorkLimit(repository,scope);
 const gate=await scope.get('meta',CANONICAL_REPOSITORY_GATE);originalGenerationRepositoryAdmission(authority,marker,gate,record.identity.database.name);
 record.shadow={token,authority,marker:marker??null,gate};
 if(authority.kind==='active-library'){
  if(JSON.stringify(await scope.get('meta','canonical-generation:qualified-graph:v1'))!==JSON.stringify(authority.qualification))throw new ArchiveError('GENERATION_CHANGED');
  const range=IDBKeyRange.bound('canonical-generation:','canonical-generation:\uffff',false,true),keys=await scope.keys('meta',null,range,4097);if(keys.length>4096)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
  record.activeGenerationRows=[];for(const key of keys)record.activeGenerationRows.push({key,row:await scope.get('meta',key)});
  registerRepositoryFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if((yield {method:'count',table:'meta',key:range})!==keys.length)throw new ArchiveError('GENERATION_CHANGED');for(const {key,row}of record.activeGenerationRows){const expected=key===CANONICAL_REPOSITORY_GATE?{...row,writeRevision:row.writeRevision+1}:row;if(JSON.stringify(yield {method:'get',table:'meta',key})!==JSON.stringify(expected))throw new ArchiveError('GENERATION_CHANGED');}return true;}});
 }
}
async function finishShadowWrite(repository,scope,record){
 const marker=await scope.get('meta',CANONICAL_REPOSITORY_PROTECTION),s=record.shadow;
 if(!s){if(marker!=null)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');registerRepositoryFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if((yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_PROTECTION})!=null)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');return true;}});return;}
 if(readOriginalGenerationRepositoryAuthority(s.token,repository,scope)!==s.authority||s.marker&&JSON.stringify(marker)!==JSON.stringify(s.marker))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
 let gate=await scope.get('meta',CANONICAL_REPOSITORY_GATE);
 if(s.authority.kind==='active-library'){if(JSON.stringify(gate)!==JSON.stringify(s.gate)||gate.writeRevision>=Number.MAX_SAFE_INTEGER)throw new ArchiveError('GENERATION_CHANGED');gate={...gate,writeRevision:gate.writeRevision+1};record.activeGateFinalizer=true;try{await scope.put('meta',gate);}finally{record.activeGateFinalizer=false;}registerRepositoryFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if(JSON.stringify(yield {method:'get',table:'meta',key:'canonical-generation:qualified-graph:v1'})!==JSON.stringify(s.authority.qualification))throw new ArchiveError('GENERATION_CHANGED');return true;}});}
 originalGenerationRepositorySettlement(s.authority,marker,s.gate,gate,record.identity.database.name);
 registerRepositoryFinalReadFence(repository,scope,{isCurrent:()=>readOriginalGenerationRepositoryAuthority(s.token,repository,scope)===s.authority,plan:function*(){if(JSON.stringify(yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_PROTECTION})!==JSON.stringify(marker)||JSON.stringify(yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_GATE})!==JSON.stringify(gate))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');return true;}});
}
function requireReadableScope(scope){const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx);workCheck(record);if(record&&(record.terminalFailed||record.finalReadFences.length&&!sameScope(record)||record.phase==='terminal'&&!record.driverReading))refuseTerminal(record);}
function synchronousTrue(record,check){
 let value;try{value=check();}catch{refuseTerminal(record);}
 if(value!==true){try{if(value instanceof Promise)value.catch(()=>{});}catch{}refuseTerminal(record);}
 if(record.terminalFailed||record.nativeSettled||!sameScope(record))refuseTerminal(record);
}
// Original Organize withdrawal remains able to abort the same in-flight write
// after the final synchronous facts sweep, until the original transaction has
// actually settled. No microtask drain, keepalive, new read or new grant.
function bindOriginalOrganizeSelectionAbort(record,authority){
 const signal=readOriginalOrganizeSelectionAbortSignal(authority,record.repository,record.scope);
 try{if(nativeAbortSignalAborted.call(signal))refuseTerminal(record);}catch{refuseTerminal(record);}
 const bindings=record.organizeAbortBindings??=new Map();if(bindings.has(signal))return;
 const abort=()=>{if(record.nativeSettled)return;try{record.transactionAbort.call(record.transaction);record.terminalFailed=true;}catch{}};
 try{
  if(typeof record.transactionAbort!=='function')refuseTerminal(record);
  nativeAddEventListener.call(signal,'abort',abort,{once:true});bindings.set(signal,abort);
  if(nativeAbortSignalAborted.call(signal)){abort();refuseTerminal(record);}
 }catch(error){try{nativeRemoveEventListener.call(signal,'abort',abort);}catch{}bindings.delete(signal);refuseTerminal(record);}
}
function clearOriginalOrganizeSelectionAborts(record){
 for(const [signal,abort]of record.organizeAbortBindings??[])nativeRemoveEventListener.call(signal,'abort',abort);
 record.organizeAbortBindings?.clear();record.organizeAbortBindings=null;
}
// Original-owner terminal read plans, bound to this exact live write scope.
// The plan is a synchronous generator: only Repository performs the yielded
// IDB reads. Async generators/checkers and arbitrary awaited work cannot enter
// the strict final segment. A second registration never replaces prior facts.
export function registerRepositoryFinalReadFence(repository,scope,{plan,isCurrent,compatibilityRecheck=null,authority=null,promotionRecoveryAuthority=null,maintenanceProcessingPurpose=null,organizeSelectionAuthority=null,organizeMaterialAuthority=null}={}){
 const record=scopeRecord(repository,scope);requireRepositoryTransactionScope(repository,scope);
 if(record.identity.mode!=='readwrite'||record.phase!=='callback'||record.terminalFailed)refuseTerminal(record);
 if(typeof plan!=='function'||typeof isCurrent!=='function'||compatibilityRecheck!==null&&typeof compatibilityRecheck!=='function')refuseTerminal(record);
 synchronousTrue(record,isCurrent);if(authority!==null)synchronousTrue(record,()=>requireTopicProcessingFinalFacts(authority,repository,scope));if(promotionRecoveryAuthority!==null)synchronousTrue(record,()=>requireSectionPromotionRecoveryFinalFacts(promotionRecoveryAuthority,repository,scope));if(maintenanceProcessingPurpose!==null)synchronousTrue(record,()=>requireMaintenanceProcessingPurposeFinalFacts(maintenanceProcessingPurpose,repository,scope));if(organizeSelectionAuthority!==null)synchronousTrue(record,()=>requireOriginalOrganizeSelectionFinalFacts(organizeSelectionAuthority,repository,scope));if(organizeMaterialAuthority!==null)synchronousTrue(record,()=>requireOriginalOrganizeMaterialFinalFacts(organizeMaterialAuthority,repository,scope));if(organizeSelectionAuthority!==null)bindOriginalOrganizeSelectionAbort(record,organizeSelectionAuthority);record.finalReadFences.push(Object.freeze({plan,isCurrent,compatibilityRecheck,authority,promotionRecoveryAuthority,maintenanceProcessingPurpose,organizeSelectionAuthority,organizeMaterialAuthority}));
}
function sampleFinalAuthorities(record,fences){for(const fence of fences)if(fence.promotionRecoveryAuthority!==null)synchronousTrue(record,()=>sampleSectionPromotionRecoveryFinalFacts(fence.promotionRecoveryAuthority,record.repository,record.scope));}
function finalAuthorityFacts(record,fences){
 for(const fence of fences){if(fence.authority!==null)synchronousTrue(record,()=>requireTopicProcessingFinalFacts(fence.authority,record.repository,record.scope));if(fence.promotionRecoveryAuthority!==null)synchronousTrue(record,()=>requireSectionPromotionRecoveryFinalFacts(fence.promotionRecoveryAuthority,record.repository,record.scope));}
 // Existing Topic receipt facts still sample their original Date contract.
 // A later such sample can retire an earlier purpose: sweep every fixed
 // purpose token only after the entire original collection has finished.
 for(const fence of fences)if(fence.maintenanceProcessingPurpose!==null)synchronousTrue(record,()=>requireMaintenanceProcessingPurposeFinalFacts(fence.maintenanceProcessingPurpose,record.repository,record.scope));
}
function currentFinalAuthorities(record,fences){
 for(const fence of fences)synchronousTrue(record,fence.isCurrent);
 sampleFinalAuthorities(record,fences);
 for(const fence of fences)if(fence.organizeMaterialAuthority!==null)synchronousTrue(record,()=>sampleOriginalOrganizeMaterialFinalFacts(fence.organizeMaterialAuthority,record.repository,record.scope));
 for(const fence of fences)if(fence.organizeSelectionAuthority!==null)synchronousTrue(record,()=>sampleOriginalOrganizeSelectionFinalFacts(fence.organizeSelectionAuthority,record.repository,record.scope));
 // Preserve all existing Topic/recovery/Maintenance checks and their ordering.
 // Topic retains its original Date contract; no Organize issuer is sampled
 // after it. The added tail reads only fixed private original-owner facts.
 finalAuthorityFacts(record,fences);
 for(const fence of fences)if(fence.organizeMaterialAuthority!==null)synchronousTrue(record,()=>requireOriginalOrganizeMaterialFinalFacts(fence.organizeMaterialAuthority,record.repository,record.scope));
 for(const fence of fences)if(fence.organizeSelectionAuthority!==null)synchronousTrue(record,()=>requireOriginalOrganizeSelectionFinalFacts(fence.organizeSelectionAuthority,record.repository,record.scope));
}
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
   else{if(index!==undefined&&typeof index!=='string')refuseTerminal(record);workCharge(scope,1);scope.metrics.reads++;const target=record.transaction.objectStore(table);value=workResult(scope,await req(index?target.index(index).count(key):target.count(key)));}
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
// Read-only accounting after the original callback, all finalizers, terminal
// fences and native completion have succeeded. A receipt lends no transaction
// authority and cannot restart or relax the original private work limit.
export function readOriginalCommittedTransactionWork(repository,scope){
 requireRepositoryTransactionSucceeded(repository,scope);
 const r=scopeRecord(repository,scope);
 if(!r.committedWork)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 return r.committedWork;
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
 async has(store,key){requireReadableScope(this);workCharge(this,1,key,true);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).getKey(key)))!==undefined;}
 async get(store,key){requireReadableScope(this);workCharge(this,1,key,true);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).get(key)));}
 async put(store,value,key){requireWritableScope(this);requireShadowMutation(this,store,key===undefined?value?.id:key,'put');if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key===undefined?value?.id:key),value);await trackSemanticWrite(this,store,key===undefined?value?.id:key,value);await trackNavigationWrite(this,store,key===undefined?value?.id:key,value);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(value.id))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,value,true);this.metrics.writes++;return req(key===undefined?this.tx.objectStore(store).put(value):this.tx.objectStore(store).put(value,key));}
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
 async delete(store,key){requireWritableScope(this);requireShadowMutation(this,store,key,'delete');if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key),null);await trackSemanticWrite(this,store,key,null);await trackNavigationWrite(this,store,key,null);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(key))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,key,true);this.metrics.writes++;return req(this.tx.objectStore(store).delete(key));}
 async clear(store){requireWritableScope(this);requireShadowMutation(this,store,null,'clear');if(repositoryScopes.get(this)?.workLimit)workRefuse(repositoryScopes.get(this));if(store==='blockIndex')await clearArchiveYearIndex(this);await trackSemanticClear(this,store);if(store==='documents')await this.delete('meta','ans:index-state:v1:catalog');if(backupDataStores.has(store))this.backupChanged=true;requireWritableScope(this);return req(this.tx.objectStore(store).clear());}
 async count(store,index,key){requireReadableScope(this);workCharge(this,1);return workResult(this,await req(index?this.tx.objectStore(store).index(index).count(key):this.tx.objectStore(store).count()));}
 async all(store,index,key,limit){
  requireReadableScope(this);const record=repositoryScopes.get(this),stream=!!record?.workLimit&&limit===undefined;
  if(!stream)finiteWorkQuery(this,limit);workCharge(this,1);this.metrics.scans++;const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  if(stream)return new Promise((resolve,reject)=>{
   // Existing complete-owner reads retain their complete-set semantics. Under
   // the private envelope, acquire and charge each physical row before retaining
   // it; never fetch an unbounded getAll result or silently truncate the set.
   const rows=[],request=target.openCursor(key);request.onerror=()=>reject(fail(request.error));
   request.onsuccess=()=>{try{workCheck(record);const cursor=request.result;if(!cursor){resolve(rows);return;}const row=cursor.value;workRow(this,row);this.metrics.reads++;rows.push(row);cursor.continue();}catch(error){reject(error);}};
  });
  const rows=await req(target.getAll(key,limit));this.metrics.reads+=rows.length;for(const row of rows)workRow(this,row);return rows;
 }
 async keys(store,index,key,limit){requireReadableScope(this);if(limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1||limit>10000))throw new ArchiveError('INVALID_REQUEST');const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);if(!repositoryScopes.get(this)?.workLimit&&limit===undefined)return req(target.getAllKeys(key));workCharge(this,1);return new Promise((resolve,reject)=>{const keys=[],request=target.openKeyCursor(key);request.onerror=()=>reject(fail(request.error));request.onsuccess=()=>{try{const cursor=request.result;workCheck(repositoryScopes.get(this));if(!cursor){resolve(keys);return;}if(limit!==undefined&&keys.length===limit)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');workRow(this,cursor.primaryKey);keys.push(cursor.primaryKey);cursor.continue();}catch(error){reject(error);}};});}
 async edge(store,index,key,direction='next'){requireReadableScope(this);workCharge(this,1);return new Promise((resolve,reject)=>{const r=this.tx.objectStore(store).index(index).openCursor(key,direction);r.onsuccess=()=>{try{resolve(workResult(this,r.result?.value));}catch(e){reject(e);}};r.onerror=()=>reject(fail());});}
 async rangePage(store,index,range,after,limit,direction='next'){requireReadableScope(this);finiteWorkQuery(this,limit);workCharge(this,1);return new Promise((resolve,reject)=>{const reverse=direction==='prev',rows=[],effective=after?(reverse?(range?.lower!==undefined?IDBKeyRange.bound(range.lower,after,range.lowerOpen,true):IDBKeyRange.upperBound(after,true)):(range?.upper!==undefined?IDBKeyRange.bound(after,range.upper,true,range.upperOpen):IDBKeyRange.lowerBound(after,true))):range,target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store),r=target.openCursor(effective,direction);r.onerror=()=>reject(fail());r.onsuccess=()=>{const c=r.result;if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}if(after&&(reverse?indexedKeyCompare(c.key,after)>=0:indexedKeyCompare(c.key,after)<=0)){c.continue();return;}try{workRow(this,c.value);}catch(e){reject(e);return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();};});}
 async indexPrimaryPage(store,index,key,{after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);workCharge(this,1);
  if(!Number.isInteger(limit)||limit<1||limit>100||after!==null&&typeof after!=='string')throw new ArchiveError('INVALID_REQUEST');
  return new Promise((resolve,reject)=>{const rows=[],r=this.tx.objectStore(store).index(index).openCursor(IDBKeyRange.only(key));r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{
   const c=r.result;if(!c){resolve({rows,next:null});return;}
   if(after!==null&&c.primaryKey<after){c.continuePrimaryKey(key,after);return;}
   if(after!==null&&c.primaryKey===after){c.continue();return;}
   try{workRow(this,c.value);}catch(e){reject(e);return;}this.metrics.reads++;rows.push({key:c.primaryKey,value:c.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length===limit){resolve({rows,next:c.primaryKey});return;}c.continue();
  };});
 }
 async primaryRangePage(store,{prefix='',after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);workCharge(this,1);
  if(typeof prefix!=='string'||!Number.isInteger(limit)||limit<1||limit>100||after!==null&&(typeof after!=='string'||!after.startsWith(prefix)||after>=prefix+'\uffff'))throw new ArchiveError('INVALID_REQUEST');
  const upper=prefix+'\uffff',range=IDBKeyRange.bound(after===null?prefix:after,upper,after!==null,true),target=this.tx.objectStore(store);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{
   const c=r.result;if(!c){resolve({rows,next:null});return;}
   try{workRow(this,c.value);}catch(e){reject(e);return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length<limit){c.continue();return;}
   // Peek only the next key: never materialize object limit+1.
   try{workCharge(this,1);}catch(e){reject(e);return;}const probe=target.openKeyCursor(IDBKeyRange.bound(c.key,upper,true,true));
   probe.onerror=()=>reject(fail(probe.error));probe.onsuccess=()=>{try{workResult(this,probe.result?.key);}catch(e){reject(e);return;}this.metrics.primaryKeyProbes=(this.metrics.primaryKeyProbes||0)+1;resolve({rows,next:probe.result?c.key:null});};
  };});
 }
 async page(store,{index,after,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);workCharge(this,1);
  const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  const range=after===undefined?undefined:IDBKeyRange.lowerBound(after,true);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail());r.onsuccess=()=>{const c=r.result;if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}try{workRow(this,c.value);}catch(e){reject(e);return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();};});
 }
}

// Capture the actual private class before any caller receives a scope. This
// bounded profile is a refusal check, not proof of native request/data effects.
const originalDataPrototype=Transaction.prototype;
const originalDataPrototypeParent=originalPrototypeOf(originalDataPrototype);
const originalDataMethods=Object.freeze(['get','has','put','count','rangePage','primaryRangePage','delete'].map(name=>Object.freeze([name,Object.freeze(originalOwnDescriptor(originalDataPrototype,name))])));

export class ArchiveRepository {
 constructor(local,{indexedDB=globalThis.indexedDB,name=DATABASE_NAME,checkpoint=async()=>{},ia=false,smartFilter=false,thoughtLibrary=false}={}){this.local=local;this.ia=ia;this.smartFilter=smartFilter;this.thoughtLibrary=thoughtLibrary;this.stores=[...STORES,...(ia?IA_STORES:[]),...(smartFilter?FILTER_STORES:[]),...(thoughtLibrary?LIBRARY_STORES:[])];this.factory=indexedDB;this.name=name;this.checkpoint=checkpoint;this.metrics={reads:0,writes:0,scans:0};repositoryWrites.set(this,{generation:Object.freeze({}),active:0});}
 async open(){
  if(this.db)return; if(!this.factory)throw fail();
  this.db=await new Promise((resolve,reject)=>{
   let blocked=false;const r=this.factory.open(this.name,this.thoughtLibrary?5:this.smartFilter?4:this.ia?3:2);
   r.onupgradeneeded=event=>{
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
 async transaction(write,fn,stores=this.stores,shadowAuthority=null){
  const writeState=repositoryWrites.get(this);if(!writeState)throw fail();let activeToken=null;
  if(write&&shadowAuthority===null){activeToken=await prepareOriginalActiveRepositoryWrite(this);if(activeToken)shadowAuthority=activeToken;}
  if(write){writeState.generation=Object.freeze({});writeState.active++;}
  try{
  await this.open();if(write&&!stores.includes('meta'))stores=[...stores,'meta'];let tx;try{tx=this.db.transaction(stores,write?'readwrite':'readonly',write?{durability:'strict'}:undefined);}catch(error){throw fail(error);}
  const scope=new Transaction(tx,this.metrics,this.thoughtLibrary);
  const native=nativeTransactionEvidence(tx);
  let release;const record={scope,started:workClock(),phase:'callback',terminalFailed:false,finalReadFences:[],organizeAbortBindings:null,repository:this,transaction:tx,transactionAbort:native?nativeTransactionAbort:tx.abort,dataPrototype:originalPrototypeOf(scope),nativeSettled:false,nativeOutcome:'pending',trustedNativeOutcome:null,originalSuccess:false,unwound:false,identity:Object.freeze({token:Object.freeze({}),database:native?.database||tx.db,mode:native?.mode||tx.mode,nativeTransaction:!!native}),settled:new Promise(resolve=>{release=resolve;})};
  repositoryScopes.set(scope,record);repositoryNativeScopes.set(tx,record);
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
  try{if(write)await beginShadowWrite(this,scope,record,shadowAuthority);else{const limits=originalPhasedHumanReadWork(this,scope);if(limits)registerOriginalWorkLimit(this,scope,limits,true);}const result=await fn(scope);if(write)await finishShadowWrite(this,scope,record);record.phase='finalizing';if(record.terminalFailed)refuseTerminal(record);if(write)await flushNavigationWrites(scope);const semanticWrite=write?await flushSemanticWrites(scope):false;if(write&&scope.backupChanged){const marker=await scope.get('meta','backup-data-generation');await scope.put('meta',{id:'backup-data-generation',value:(marker?.value||0)+1});}if(write){await runFinalReadFences(scope,record);currentFinalAuthorities(record,record.finalReadFences);}workCheck(record);await done;record.originalSuccess=true;if(semanticWrite)bindSemanticWriteReceipt(this,result);return result;}catch(e){try{tx.abort();}catch{}await done.catch(()=>{});if(record.workLimit?.failed)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');if(tx.error?.name==='QuotaExceededError')throw fail(tx.error);if(e instanceof ArchiveError||['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))throw e;throw fail(e?.name?e:tx.error);}finally{if(record.originalSuccess&&record.workLimit&&!record.workLimit.failed)record.committedWork=Object.freeze({references:record.workLimit.refs,bytes:record.workLimit.bytes,activeMs:Math.max(0,workClock()-record.workLimit.started)});clearTimeout(record.workLimit?.timer);clearOriginalOrganizeSelectionAborts(record);record.finalReadFences.length=0;record.unwound=true;maybeRelease();if(!write)settleOriginalPhasedHumanReadWork(this,scope);}
  }finally{if(activeToken)releaseOriginalActiveRepositoryWrite(activeToken);if(write)writeState.active--;}
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

// Fixed generation consumers bypass instance wrappers; the opaque authority is
// bound once to the original native scope and never returned to their callers.
export function originalGenerationRepositoryRead(repository,fn,stores){if(!repositoryWrites.has(repository))throw new ArchiveError('GENERATION_CAPABILITY');return promptTransactionMethod.value.call(repository,false,fn,stores);}
export async function originalGenerationRepositoryTransaction(repository,token,fn,stores){
 if(!repositoryWrites.has(repository))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
 const authority=readOriginalGenerationRepositoryAuthority(token,repository,null);
 if(authority?.kind!=='checkpoint-install'){
  const marker=await promptTransactionMethod.value.call(repository,false,t=>t.get('meta',CANONICAL_REPOSITORY_PROTECTION),['meta']);
  // No capability crosses an existing unmarked repository wrapper. A concurrent
  // installation is rechecked by the actual write admission and fails closed.
  if(marker==null)return repository.transaction(true,fn,stores);
 }
 return promptTransactionMethod.value.call(repository,true,fn,stores,token);
}
