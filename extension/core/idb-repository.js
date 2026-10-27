import {readOriginalRecoveryStoreExecution,readOriginalLocalToolsSelectionExecution} from './indexed-store.js';
import {originalBootstrapHostSupported,originalBootstrapNow,originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapDescriptor,originalBootstrapHasOwn,originalBootstrapPrototype,originalBootstrapPlainPrototype,originalBootstrapSafeInteger,originalBootstrapFinite,originalBootstrapCreate,originalBootstrapFreeze,originalBootstrapApply,originalBootstrapArrayIs,originalBootstrapNames,originalBootstrapSymbols} from '../background/native-host-bootstrap.js';
import {chargeOriginalApplicationSelectionRepositoryStringPair} from '../background/application-selection-reservation-coordination.js';
import {beginOriginalApplicationSelectionPointGroup,chargeOriginalApplicationSelectionPointGroupQuery,chargeOriginalApplicationSelectionPointGroupResult,finishOriginalApplicationSelectionPointGroup} from '../background/application-selection-reservation-coordination.js';
import {readOriginalApplicationSelectionPhaseFinalFence} from '../background/application-selection-reservation-coordination.js';
import {readOriginalApplicationSelectionPhase,bindOriginalApplicationSelectionPhaseScope,requireOriginalApplicationSelectionPhaseScope,requireOriginalApplicationSelectionRepositoryPhaseWork,requireOriginalApplicationSelectionRepositoryWork,chargeOriginalApplicationSelectionRepositoryWork,trackOriginalApplicationSelectionRepositoryWork,requireOriginalApplicationSelectionMember,requireOriginalApplicationSelectionDriverDispatch,requireOriginalApplicationSelectionDriverLocal,requireOriginalApplicationSelectionDriverLocalDispatch,chargeOriginalApplicationSelectionDriverWork,trackOriginalApplicationSelectionDriverWork} from '../background/application-selection-reservation-coordination.js';
import {APPLICATION_SELECTION_MARKER,readOriginalApplicationSelectionAuthority,requireOriginalApplicationSelectionMutation} from './browser-native-sync/application-generation-selection.js';
import {readOriginalCheckpointCompileWork,settleOriginalCheckpointCompileWork} from './browser-native-sync/canonical-generation-checkpoint-stage.js';
import {originalPhasedHumanReadWork,settleOriginalPhasedHumanReadWork,readOriginalPhasedHumanClosureWork} from './browser-native-sync/canonical-generation-phased-human.js';
import {prepareOriginalActiveRepositoryWrite,releaseOriginalActiveRepositoryWrite,readOriginalPublicationClosureWork} from './browser-native-sync/canonical-generation-publication.js';
import {CANONICAL_REPOSITORY_PROTECTION,CANONICAL_REPOSITORY_GATE,readOriginalGenerationRepositoryAuthority,originalGenerationRepositoryAdmission,originalGenerationRepositoryMutation,originalGenerationRepositorySettlement} from './browser-native-sync/canonical-generation-repository-gate.js';
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
export function bindOriginalRecoveryWorkApplicationSelection(repository,ticket,action,owner,kind){const p=recoveryWork(ticket,repository);requireOriginalApplicationSelectionMember(action,owner,kind);requireOriginalApplicationSelectionRepositoryWork(action,repository);if(p.scope||p.pending||p.applicationSelectionAction&&p.applicationSelectionAction!==action)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');p.applicationSelectionAction=action;p.applicationSelectionMember=owner;p.applicationSelectionKind=kind;}
export function checkOriginalRecoveryWork(repository,ticket){recoveryWork(ticket,repository);}
// Read-only local test diagnostics; no currentness admission and no authority.
// Failed/settled work remains observable without changing its original ledger.
export function readOriginalRecoveryWorkSelectionAccounting(repository,ticket){
 const p=originalBootstrapWeakGet(ordinaryRecoveryWork,ticket);
 if(!p||p.repository!==repository||!p.applicationSelectionAction||p.applicationSelectionKind!=='local-import'&&p.applicationSelectionKind!=='local-backup'&&p.applicationSelectionKind!=='local-integrity')throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 return originalBootstrapFreeze({references:p.refs,bytes:p.bytes,deadline:p.deadline,failed:p.failed,closed:p.closed,pending:!!p.pending,scope:!!p.scope,window:!!p.window});
}
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
// Fixed three-original-holder read, not a general multi-ticket admission. The
// execution is minted only by IndexedStore's original local-tools queue; all
// three existing restrictions keep their own first budget and pending lifetime.
const localToolsExecutions=originalBootstrapWeakMap(),localToolsScopes=originalBootstrapWeakMap();
function localToolsCurrent(g,workChecking=false){
 if(g.closed||g.facts.current()!==true)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 for(const p of g.participants){const r=recoveryWork(p.ticket,g.repository);if(r.applicationSelectionAction!==g.action||r.applicationSelectionMember!==p.owner||r.applicationSelectionKind!==p.kind)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');}
 // The caller's ordinary workCheck supplies the same fresh full repository
 // predicate after these callback-capable original identity/current checks.
 if(!workChecking)requireOriginalApplicationSelectionRepositoryWork(g.action,g.repository);
}
export async function runOriginalLocalToolsSelectionRead(execution){
 const facts=readOriginalLocalToolsSelectionExecution(execution);if(!facts||originalBootstrapWeakGet(localToolsExecutions,execution))throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 const {repository,action,participants}=facts;if(participants.length!==3||participants[0].kind!=='local-import'||participants[1].kind!=='local-backup'||participants[2].kind!=='local-integrity')throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 const restrictions=participants.map(p=>{requireOriginalApplicationSelectionRecoveryWork(repository,p.ticket,action,p.owner,p.kind);return recoveryWork(p.ticket,repository);});
 if(new Set(restrictions).size!==3||restrictions.some(p=>p.pending||p.scope||p.window))throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
 let release;const pending={settled:new Promise(resolve=>{release=resolve;})},g={facts,repository,action,participants,restrictions,pending,closed:false,next:0,reading:false};
 originalBootstrapWeakSet(localToolsExecutions,execution,g);for(const p of restrictions)p.pending=pending;
 try{localToolsCurrent(g);const value=await facts.run();localToolsCurrent(g);return value;}
 catch(error){for(const p of restrictions)p.failed=true;throw error;}
 finally{g.closed=true;for(const p of restrictions){if(p.pending===pending)p.pending=null;}release();}
}
export function originalLocalToolsSelectionRepositoryRead(execution,phase){
 const g=originalBootstrapWeakGet(localToolsExecutions,execution);if(!g||g.closed||g.reading||phase!==(g.next===0?'before':g.next===1?'after':null))throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 localToolsCurrent(g);for(const p of g.restrictions)if(p.refs>=4096||p.bytes>=2*1024*1024)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');g.reading=true;g.next++;
 const task=promptTransactionMethod.value.call(g.repository,false,phase==='before'?g.facts.before:g.facts.after,phase==='before'?['meta']:['meta','importTasks'],undefined,null,g.participants[0].ticket,null,null,null,execution);
 return (async()=>{try{return await task;}finally{g.reading=false;}})();
}
export function readOriginalLocalToolsSelectionMetaRows(execution,scope){
 const g=originalBootstrapWeakGet(localToolsExecutions,execution),joined=originalBootstrapWeakGet(localToolsScopes,repositoryScopes.get(scope));
 if(!g||g.closed||joined?.group!==g||g.next!==2)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 localToolsCurrent(g);requireReadableScope(scope);
 return ['gate','recovery-restore-epoch','backup-data-generation','backup-recovery-settings','local-control-publication:reservation','local-control-publication:revision'].map(key=>{if(!originalBootstrapHasOwn(joined.rows,key))throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');return joined.rows[key];});
}

const originalMetaGroupWork=originalBootstrapWeakMap(),originalMetaGroupSettlements=originalBootstrapWeakMap(),originalMetaGroupThen=Promise.prototype.then;
// Describes only a synchronous accounting call from the original native driver.
// The opaque group never leaves this module except to its fixed meter owner;
// late result charging must NOT depend on currentness, expiry or abort status.
export function readOriginalApplicationSelectionPointGroup(group,action,repository,scope){
 const g=originalBootstrapWeakGet(originalMetaGroupWork,group);
 return g&&!g.closed&&g.meterActive&&g.action===action&&g.repository===repository&&g.scope===scope?g.count:null;
}
function metaGroupMeter(g,method,args){g.meterActive=true;try{return originalBootstrapApply(method,undefined,args);}finally{g.meterActive=false;}}
function metaGroupCurrent(g){
 const r=g.record;
 if(r.scope!==g.scope||r.repository!==g.repository||r.applicationSelectionAction!==g.action||r.workLimit!==g.budget||r.recoveryWork!==g.ticket||!sameScope(r))workRefuse(r);
 requireReadableScope(g.scope);
}
function metaGroupBill(g,index,value,result=false){
 const r=g.record,b=g.budget,refs=result?0:1;if(!result){metaGroupCurrent(g);b.refs++;}
 let failed=false,length=0;
 try{metaGroupMeter(g,result?chargeOriginalApplicationSelectionPointGroupResult:chargeOriginalApplicationSelectionPointGroupQuery,[g.group,index,value]);}
 catch{failed=true;}
 // Preserve the independent scope/recovery roots and tighter ceilings. A
 // failed action debit never erases a completed original scope measurement;
 // mutable raw results cannot reuse the action meter's earlier byte count.
 const operand=result?value:['meta',value];
 try{length=measureSourceWorkingPhysicalTree(operand,Math.min(2*1024*1024,b.byteLimit)).B;b.bytes+=length;}catch{failed=true;}
 if(g.recovery){g.recovery.refs+=refs;g.recovery.bytes+=length;}
 // Only the common META native roots belong to the other two restrictions.
 // Their independent original per-root ceilings and late charges are retained;
 // importTasks is read solely under the original import ticket below.
 if(g.localTools)for(const p of g.localTools.extra){let bytes=0;try{bytes=measureSourceWorkingPhysicalTree(operand,p.rootLimit).B;}catch{failed=true;}p.work.refs+=refs;p.work.bytes+=bytes;}
 if(failed)workRefuse(r);metaGroupCurrent(g);
}
export async function readOriginalApplicationSelectionMetaGroup(scope,keys){
 const size=keys&&originalBootstrapDescriptor(keys,'length'),count=size&&originalBootstrapHasOwn(size,'value')?size.value:0;
 if(!originalBootstrapArrayIs(keys)||!originalBootstrapSafeInteger(count)||count<1||count>6||originalBootstrapNames(keys).length!==count+1||originalBootstrapSymbols(keys).length)throw new ArchiveError('INVALID_REQUEST');
 const owned=originalBootstrapCreate(null),values=[undefined,undefined,undefined,undefined,undefined,undefined];values.length=count;
 for(let i=0;i<count;i++){const d=originalBootstrapDescriptor(keys,''+i);if(!d||!originalBootstrapHasOwn(d,'value')||typeof d.value!=='string')throw new ArchiveError('INVALID_REQUEST');owned[i]=d.value;}
 const record=originalBootstrapWeakGet(repositoryScopes,scope);
 if(!record?.applicationSelectionAction){for(let i=0;i<count;i++)values[i]=await scope.get('meta',owned[i]);return values;}
 requireRepositoryTransactionDataMethods(record.repository,scope);requireReadableScope(scope);
 if(!record.workLimit)workRefuse(record);
 const ticket=record.recoveryWork,recovery=ticket?originalBootstrapWeakGet(ordinaryRecoveryWork,ticket):null;
 if(ticket&&(!recovery||recovery.repository!==record.repository))workRefuse(record);
 const group=originalBootstrapFreeze(originalBootstrapCreate(null)),g={group,scope,record,repository:record.repository,action:record.applicationSelectionAction,budget:record.workLimit,ticket,recovery,count,localTools:originalBootstrapWeakGet(localToolsScopes,record),meterActive:false,closed:false};
 originalBootstrapWeakSet(originalMetaGroupWork,group,g);
 return new Promise((resolve,reject)=>{
  let accepting=true,pending=0,failed=false,failure,finished=false;
  const refuse=error=>{if(!failed){failed=true;failure=error;}record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}};
  const finish=()=>{
   if(accepting||pending||finished)return;finished=true;
   try{metaGroupMeter(g,finishOriginalApplicationSelectionPointGroup,[group]);}catch(error){refuse(error);}finally{g.closed=true;}
   if(!failed)try{metaGroupCurrent(g);}catch(error){refuse(error);}
   if(failed)reject(failure);else{if(g.localTools)for(let i=0;i<count;i++)g.localTools.rows[owned[i]]=values[i];resolve(values);}
  };
  const observe=(request,index)=>{
   pending++;let settled=false;
   try{
    request.onerror=()=>{if(settled)return;settled=true;try{refuse(fail(request.error));}catch(error){refuse(error);}finally{pending--;finish();}};
    request.onsuccess=()=>{if(settled)return;settled=true;try{
     const raw=request.result;metaGroupBill(g,index,raw,true);values[index]=raw;
    }catch(error){refuse(error);}finally{pending--;finish();}};
   }catch(error){
    refuse(error);
    // If handler installation itself failed after native acceptance, wait on
    // the ORIGINAL transaction outcome, not a caller completion promise. A
    // completed successful request still has its actual raw result charged.
    const drained=()=>{if(settled)return;settled=true;try{if(request.readyState==='done'&&!request.error)metaGroupBill(g,index,request.result,true);}catch(error){refuse(error);}finally{pending--;finish();}};
    try{originalBootstrapApply(originalMetaGroupThen,originalBootstrapWeakGet(originalMetaGroupSettlements,record),[drained,drained]);}
    catch(error){refuse(error);if(!settled){settled=true;pending--;finish();}}
   }
  };
  try{
   // Capture ONE real object-store receiver/method, but do not treat lookup or
   // a prior request's return/handler assignments as a fresh authority check.
   const target=record.transaction.objectStore('meta'),get=target.get;
   metaGroupMeter(g,beginOriginalApplicationSelectionPointGroup,[g.action,g.repository,scope,group]);
   for(let i=0;i<count;i++){
    if(failed)break;const key=owned[i];metaGroupBill(g,i,key);
    const request=originalBootstrapApply(get,target,[key]);observe(request,i);scope.metrics.reads++;
   }
  }catch(error){refuse(error);}finally{accepting=false;finish();}
 });
}
const fixedFinalProducers=originalBootstrapWeakMap();
const canonicalPrefix='canonical-generation:',canonicalUpper=canonicalPrefix+'\uffff',canonicalQualification='canonical-generation:qualified-graph:v1';
// Original-driver provenance only, never an exported readiness receipt. Neither
// mutable WeakMap methods nor a caller's tx-like object can install this record.
const originalPointReadScopes=originalBootstrapWeakMap(),pointUnsupported={};
const pointData=(value,key)=>{const d=originalBootstrapDescriptor(value,key);return d&&originalBootstrapHasOwn(d,'value')?d.value:pointUnsupported;};
function pointAbsent(value,key){
 if(originalBootstrapDescriptor(value,key))return false;
 const parent=originalBootstrapPrototype(value);
 return parent===null||originalBootstrapPlainPrototype(parent)&&!originalBootstrapDescriptor(parent,key)&&originalBootstrapPrototype(parent)===null;
}
function pointReadFacts(point,scope){
 const r=point.record,b=point.budget;
 if(!b||!nativeRepositoryBrand(point.repository)||pointData(scope,'tx')!==point.transaction||pointData(point.repository,'db')!==point.database||
  pointData(r,'scope')!==scope||pointData(r,'repository')!==point.repository||pointData(r,'transaction')!==point.transaction||pointData(r,'identity')!==point.identity||
  pointData(r,'applicationSelectionAction')!==point.action||pointData(r,'selectionPhase')!==point.phase||pointData(r,'workLimit')!==b||!pointAbsent(r,'recoveryWork')||
  pointData(r,'terminalFailed')!==false||pointData(r,'nativeSettled')!==false||pointData(r,'unwound')!==false)return false;
 const phase=pointData(r,'phase');if(phase!=='callback'&&(phase!=='terminal'||pointData(r,'driverReading')!==true))return false;
 const started=pointData(b,'started'),ms=pointData(b,'ms'),refs=pointData(b,'refs'),bytes=pointData(b,'bytes'),references=pointData(b,'references'),byteLimit=pointData(b,'byteLimit');
 return originalBootstrapFinite(started)&&originalBootstrapFinite(ms)&&ms>0&&ms<=30000&&originalBootstrapSafeInteger(refs)&&refs>=0&&originalBootstrapSafeInteger(bytes)&&bytes>=0&&
  originalBootstrapSafeInteger(references)&&references>0&&references<=4096&&originalBootstrapSafeInteger(byteLimit)&&byteLimit>0&&byteLimit<=2*1024*1024&&
  (pointAbsent(b,'failed')||pointData(b,'failed')===false);
}
function pointReadBudget(point,scope){
 if(!pointReadFacts(point,scope))workRefuse(point.record);
 const b=point.budget;if(originalBootstrapNow()-b.started>=b.ms||b.refs>b.references||b.bytes>b.byteLimit)workRefuse(point.record);
}
function workGet(scope,table,key){
 const point=originalBootstrapHostSupported()&&typeof table==='string'&&typeof key==='string'?originalBootstrapWeakGet(originalPointReadScopes,scope):null;
 if(!point||!pointReadFacts(point,scope)){requireReadableScope(scope);workCharge(scope,1,[table,key],true,false,true);return;}
 // The SAME original staged entry A precedes new work. Only captured native
 // scalar bookkeeping follows it through the former post-meter-A position.
 requireReadableScope(scope,point);const b=point.budget;b.refs++;
 let length;try{length=chargeOriginalApplicationSelectionRepositoryStringPair(point.action,point.repository,table,key);}
 catch{
  // The old dual ledger still measures its scope operand after an action-debit
  // failure. This failure-only fallback can call mutable code, but ALWAYS
  // aborts: it can never admit a request or omit a needed continuation guard.
  try{b.bytes+=measureSourceWorkingPhysicalTree([table,key],Math.min(2*1024*1024,b.byteLimit)).B;}catch{}
  workRefuse(point.record);
 }
 // A completed operand larger than this scope's tighter ceiling was not added
 // by its old bounded meter. Preserve that independent failure accounting.
 if(length>b.byteLimit)workRefuse(point.record);b.bytes+=length;pointReadBudget(point,scope);
}
// Optional finite work envelope belongs to the original scope, never mutable
// diagnostics. It meters request references and physical payload operands/results,
// including repeated reads and finalizer work; not browser heap or disk bytes.
const workClock=globalThis.performance.now.bind(globalThis.performance);
function workAbort(record){const joined=originalBootstrapWeakGet(localToolsScopes,record);if(joined)for(const p of joined.group.restrictions)p.failed=true;if(record.recoveryWork)ordinaryRecoveryWork.get(record.recoveryWork).failed=true;if(record.workLimit)record.workLimit.failed=true;record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}}
function workRefuse(record){workAbort(record);throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
function workCheck(record){const joined=record&&originalBootstrapWeakGet(localToolsScopes,record);if(joined)try{localToolsCurrent(joined.group,true);}catch{workRefuse(record);}if(record?.applicationSelectionAction)try{if(record.selectionPhase)requireOriginalApplicationSelectionRepositoryPhaseWork(record.applicationSelectionAction,record.repository,record.selectionPhase,record.scope);else requireOriginalApplicationSelectionRepositoryWork(record.applicationSelectionAction,record.repository);}catch{workRefuse(record);}if(record?.recoveryWork)try{recoveryWork(record.recoveryWork,record.repository);}catch{workRefuse(record);}const b=record?.workLimit;if(b&&(workClock()-b.started>=b.ms||b.refs>b.references||b.bytes>b.byteLimit))workRefuse(record);}
export function chargeOriginalApplicationSelectionScopeOperands(scope,value,references=0){
 const record=repositoryScopes.get(scope);if(!record||record.scope!==scope)return false;
 if(record.applicationSelectionAction)chargeOriginalApplicationSelectionRepositoryWork(record.applicationSelectionAction,record.repository,value,references,true);return true;
}
// A physical-read choice from the original private prepared snapshot, never
// authority or readiness. Keep only table membership on this exact live scope;
// no row is copied, traversed again, truncated or trusted by its expected count.
export function selectOriginalApplicationSelectionPrimaryPage(scope,action,table,expectedCount){
 const record=repositoryScopes.get(scope);
 if(!record||record.scope!==scope||!action||record.applicationSelectionAction!==action||record.phase!=='callback'||record.terminalFailed||record.nativeSettled||record.unwound||!sameScope(record)||typeof table!=='string'||!record.transaction.objectStoreNames.contains(table)||!Number.isSafeInteger(expectedCount)||expectedCount<0)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 requireRepositoryTransactionScope(record.repository,scope);
 if(expectedCount<=3)(record.primaryCursorTables??=new Set()).add(table);else record.primaryCursorTables?.delete(table);
}
function workCharge(scope,refs=0,value,hasValue=false,acceptedResult=false,prechecked=false){
 const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx),b=record?.workLimit;if(!b)return;
 if(record.scope!==scope)workRefuse(record);
 // Admission checks precede NEW work. A result of an already accepted request
 // first debits its immutable original record, for ordinary recovery as well
 // as selection, even after expiry/revocation or physical identity loss.
 // A qualified shadow/action-only scope need not own an ordinary ticket.
 // `prechecked` is private callsite bookkeeping, not cached readiness: only
 // enumerated SAME synchronous-chain sites pass it after a full entry/result
 // guard. Metering can run Proxy traps, so the full post-meter workCheck below
 // is unconditional and always precedes the actual native request/continuation.
 if(!acceptedResult){if(!sameScope(record))workRefuse(record);if(record.applicationSelectionAction&&prechecked){if(record.terminalFailed||b.failed||workClock()-b.started>=b.ms||b.refs>b.references||b.bytes>b.byteLimit)workRefuse(record);}else workCheck(record);}
 let failed=false;b.refs+=refs;
 if(record.applicationSelectionAction)try{chargeOriginalApplicationSelectionRepositoryWork(record.applicationSelectionAction,record.repository,hasValue?value:undefined,refs,hasValue);}catch{failed=true;}
 let length=0;if(hasValue)try{length=measureSourceWorkingPhysicalTree(value,Math.min(2*1024*1024,b.byteLimit)).B;b.bytes+=length;}catch{failed=true;}
 if(record.recoveryWork){const recovery=ordinaryRecoveryWork.get(record.recoveryWork);if(!recovery||recovery.repository!==record.repository)failed=true;else{recovery.refs+=refs;recovery.bytes+=length;}}
 if(failed||!sameScope(record))workRefuse(record);workCheck(record);
}
function workResult(scope,value){workCharge(scope,0,value,true,true);return value;}
function workRow(scope,value){workCharge(scope,1,value,true,true);return value;}
function workCursor(scope,cursor){
 // An unmetered driver keeps its original lazy field reads (notably the
 // limit+1 and skipped-row branches, which need not materialize a value).
 if(!repositoryScopes.get(scope)?.workLimit)return cursor;
 // Snapshot once: the exact tuple debited here is the tuple consumed by the
 // original cursor driver. Continuation never re-reads its payload getters.
 const row=cursor?{key:cursor.key,primaryKey:cursor.primaryKey,value:cursor.value}:null;
 workCharge(scope,cursor?1:0,row,true,true);
 return row;
}
function workSame(scope,a,b){chargeOriginalApplicationSelectionScopeOperands(scope,[a,b],0);return JSON.stringify(a)===JSON.stringify(b);}
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
function workQuery(scope,refs,operands,prechecked=false){if(repositoryScopes.get(scope)?.workLimit)workCharge(scope,refs,operands.map(queryOperand),true,false,prechecked);}
function finiteWorkQuery(scope,limit){if(repositoryScopes.get(scope)?.workLimit&&(!Number.isSafeInteger(limit)||limit<1||limit>100))workRefuse(repositoryScopes.get(scope));}
export function registerRepositoryWorkLimit(repository,scope,limits){return registerOriginalWorkLimit(repository,scope,limits,false);}
function registerOriginalWorkLimit(repository,scope,{references=4096,bytes,ms=30000}={},readonly=false){
 const record=scopeRecord(repository,scope);requireRepositoryTransactionDataMethods(repository,scope);
 // Only admission from the fixed original owner can install this private ceiling.
 // Omitted internal limits preserve that ceiling; explicit limits only tighten.
 if(bytes===undefined)bytes=record.qualifiedRecoveryWork?.bytes??2*1024*1024;
 if(record.phase!=='callback'||record.identity.mode!==(readonly?'readonly':'readwrite')||record.terminalFailed||!Number.isSafeInteger(references)||references<1||references>4096||!Number.isSafeInteger(bytes)||bytes<1||bytes>(record.qualifiedRecoveryWork?.bytes??2*1024*1024)||!Number.isFinite(ms)||ms<=0||ms>30000)workRefuse(record);
 // Re-registration may tighten limits but never reset consumption or the clock.
 if(record.workLimit){const b=record.workLimit;b.references=Math.min(b.references,references);b.byteLimit=Math.min(b.byteLimit,bytes);b.ms=Math.min(b.ms,ms);}
 else{const budget={started:workClock(),references,byteLimit:bytes,ms,refs:0,bytes:0};record.workLimit=budget;const point=originalBootstrapWeakGet(originalPointReadScopes,scope);if(point?.record===record)point.budget=budget;}workCheck(record);
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
 if(r.selection?.authority?.action){if(!r.selectionPhase)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');requireOriginalApplicationSelectionPhaseScope(r.selectionPhase,r.repository,scope);}
 if(r.selection?.authority&&!(r.activeGateFinalizer===true&&table==='meta'&&key===CANONICAL_REPOSITORY_GATE&&method==='put'))requireOriginalApplicationSelectionMutation(r.selection.authority,table,key,method);
 else if(table==='meta'&&key===APPLICATION_SELECTION_MARKER)throw new ArchiveError('GENERATION_SELECTION_WRITE_DENIED');
 if(r.shadow){const current=readOriginalGenerationRepositoryAuthority(r.shadow.token,r.repository,scope);if(current!==r.shadow.authority)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');if(!(current.kind==='active-library'&&r.activeGateFinalizer===true&&table==='meta'&&key===CANONICAL_REPOSITORY_GATE&&method==='put'))originalGenerationRepositoryMutation(current,table,key,method);}
 else if(table==='meta'&&key===CANONICAL_REPOSITORY_PROTECTION)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
}
async function beginSelectionWrite(repository,scope,record,token){
 const authority=readOriginalApplicationSelectionAuthority(token,repository,scope);if(authority?.action){if(!record.selectionPhase)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');requireOriginalApplicationSelectionPhaseScope(record.selectionPhase,repository,scope);}const marker=await scope.get('meta',APPLICATION_SELECTION_MARKER);
 if(marker!=null&&!authority)throw new ArchiveError('GENERATION_SELECTION_PENDING');
 record.selection={token,authority,marker};
}
async function finishSelectionWrite(repository,scope,record){
 const s=record.selection,marker=await scope.get('meta',APPLICATION_SELECTION_MARKER);
 if(s.authority&&readOriginalApplicationSelectionAuthority(s.token,repository,scope)!==s.authority||!s.authority&&marker!=null)throw new ArchiveError('GENERATION_SELECTION_WRITE_DENIED');
 registerFixedFinalReadFence(repository,scope,{isCurrent:()=>!s.authority||readOriginalApplicationSelectionAuthority(s.token,repository,scope)===s.authority,plan:function*(){if(!workSame(scope,yield {method:'get',table:'meta',key:APPLICATION_SELECTION_MARKER},marker))throw new ArchiveError('GENERATION_SELECTION_CHANGED');return true;}},'selection',marker);
}
async function beginShadowWrite(repository,scope,record,token){
 const authority=readOriginalGenerationRepositoryAuthority(token,repository,scope);let marker,timer;try{marker=await Promise.race([scope.get('meta',CANONICAL_REPOSITORY_PROTECTION),new Promise((_,reject)=>{timer=setTimeout(()=>{record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},30000);})]);}finally{clearTimeout(timer);}
 if(marker==null&&authority?.kind!=='checkpoint-install')return;
 record.qualifiedRecoveryWork=readOriginalPhasedHumanClosureWork(token,repository,scope)??readOriginalPublicationClosureWork(token,repository,scope);
 registerRepositoryWorkLimit(repository,scope,record.qualifiedRecoveryWork??undefined);record.workLimit.started=record.started;workCharge(scope,1,CANONICAL_REPOSITORY_PROTECTION,true,false,true);workResult(scope,marker);workCheck(record);registerRepositoryWorkLimit(repository,scope,record.qualifiedRecoveryWork??undefined);
 const gate=await scope.get('meta',CANONICAL_REPOSITORY_GATE);chargeOriginalApplicationSelectionScopeOperands(scope,[marker,gate,authority],0);originalGenerationRepositoryAdmission(authority,marker,gate,record.identity.database.name);
 record.shadow={token,authority,marker:marker??null,gate};
 if(authority.kind==='active-library'){
  if(!workSame(scope,await scope.get('meta','canonical-generation:qualified-graph:v1'),authority.qualification))throw new ArchiveError('GENERATION_CHANGED');
  const range=IDBKeyRange.bound(canonicalPrefix,canonicalUpper,false,true);let rows;
  if(record.applicationSelectionAction&&record.selectionPhase)rows=await readOriginalCanonicalInventory(scope,record,()=>requireReadableScope(scope));
  else{const keys=await scope.keys('meta',null,range,4097);if(keys.length>4096)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');rows=[];for(const key of keys)rows.push({key,row:await scope.get('meta',key)});}
  record.activeGenerationRows=rows;
  registerFixedFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if((yield {method:'count',table:'meta',key:range})!==rows.length)throw new ArchiveError('GENERATION_CHANGED');for(const {key,row}of rows){const expected=key===CANONICAL_REPOSITORY_GATE?{...row,writeRevision:row.writeRevision+1}:row;if(!workSame(scope,yield {method:'get',table:'meta',key},expected))throw new ArchiveError('GENERATION_CHANGED');}return true;}},'canonical',{range,rows});
 }
}
async function finishShadowWrite(repository,scope,record){
 const marker=await scope.get('meta',CANONICAL_REPOSITORY_PROTECTION),s=record.shadow;
 if(!s){if(marker!=null)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');registerFixedFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if((yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_PROTECTION})!=null)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');return true;}},'unprotected',null);return;}
 if(readOriginalGenerationRepositoryAuthority(s.token,repository,scope)!==s.authority||s.marker&&!workSame(scope,marker,s.marker))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
 let gate=await scope.get('meta',CANONICAL_REPOSITORY_GATE);
 if(s.authority.kind==='active-library'){if(!workSame(scope,gate,s.gate)||gate.writeRevision>=Number.MAX_SAFE_INTEGER)throw new ArchiveError('GENERATION_CHANGED');gate={...gate,writeRevision:gate.writeRevision+1};record.activeGateFinalizer=true;try{await scope.put('meta',gate);}finally{record.activeGateFinalizer=false;}registerFixedFinalReadFence(repository,scope,{isCurrent:()=>true,plan:function*(){if(!workSame(scope,yield {method:'get',table:'meta',key:'canonical-generation:qualified-graph:v1'},s.authority.qualification))throw new ArchiveError('GENERATION_CHANGED');return true;}},'qualification',s.authority.qualification);}
 chargeOriginalApplicationSelectionScopeOperands(scope,[s.authority,marker,s.gate,gate],0);originalGenerationRepositorySettlement(s.authority,marker,s.gate,gate,record.identity.database.name);
 registerFixedFinalReadFence(repository,scope,{isCurrent:()=>readOriginalGenerationRepositoryAuthority(s.token,repository,scope)===s.authority,plan:function*(){if(!workSame(scope,yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_PROTECTION},marker)||!workSame(scope,yield {method:'get',table:'meta',key:CANONICAL_REPOSITORY_GATE},gate))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');return true;}},'shadow',{marker,gate});
}
function requireReadableScope(scope,point=null){
 if(point){
  try{requireOriginalApplicationSelectionRepositoryPhaseWork(point.action,point.repository,point.phase,scope);}catch{workRefuse(point.record);}
  pointReadBudget(point,scope);return;
 }
 const record=repositoryScopes.get(scope)||repositoryNativeScopes.get(scope.tx);workCheck(record);if(record&&(record.terminalFailed||record.finalReadFences.length&&!sameScope(record)||record.phase==='terminal'&&!record.driverReading))refuseTerminal(record);
}
function synchronousTrue(record,check){
 let value;try{value=check();}catch{refuseTerminal(record);}
 if(value!==true){try{if(value instanceof Promise)value.catch(()=>{});}catch{}refuseTerminal(record);}
 if(record.terminalFailed||record.nativeSettled||!sameScope(record))refuseTerminal(record);
}
// Original-owner terminal read plans, bound to this exact live write scope.
// The plan is a synchronous generator: only Repository performs the yielded
// IDB reads. Async generators/checkers and arbitrary awaited work cannot enter
// the strict final segment. A second registration never replaces prior facts.
export function registerRepositoryFinalReadFence(repository,scope,options={}){registerFixedFinalReadFence(repository,scope,options);}
function registerFixedFinalReadFence(repository,scope,options,role=null,expected){
 const {plan,isCurrent,compatibilityRecheck=null,authority=null,promotionRecoveryAuthority=null,maintenanceProcessingPurpose=null}=options;
 const record=scopeRecord(repository,scope);requireRepositoryTransactionScope(repository,scope);
 if(record.identity.mode!=='readwrite'||record.phase!=='callback'||record.terminalFailed)refuseTerminal(record);
 if(typeof plan!=='function'||typeof isCurrent!=='function'||compatibilityRecheck!==null&&typeof compatibilityRecheck!=='function')refuseTerminal(record);
 synchronousTrue(record,isCurrent);if(authority!==null)synchronousTrue(record,()=>requireTopicProcessingFinalFacts(authority,repository,scope));if(promotionRecoveryAuthority!==null)synchronousTrue(record,()=>requireSectionPromotionRecoveryFinalFacts(promotionRecoveryAuthority,repository,scope));if(maintenanceProcessingPurpose!==null)synchronousTrue(record,()=>requireMaintenanceProcessingPurposeFinalFacts(maintenanceProcessingPurpose,repository,scope));
 const staged=record.applicationSelectionAction&&record.selectionPhase;
 if(staged&&role===null&&readOriginalApplicationSelectionPhaseFinalFence(options,repository,scope))role='phase';
 const description={plan,isCurrent,compatibilityRecheck,authority,promotionRecoveryAuthority,maintenanceProcessingPurpose},fence=staged&&role!==null?originalBootstrapFreeze(description):Object.freeze(description);record.finalReadFences.push(fence);
 if(staged){
  let producers=originalBootstrapWeakGet(fixedFinalProducers,record);if(!producers){producers={count:0,unknown:false,roles:originalBootstrapCreate(null)};originalBootstrapWeakSet(fixedFinalProducers,record,producers);}producers.count++;
  if(role===null||originalBootstrapHasOwn(producers.roles,role))producers.unknown=true;else producers.roles[role]={fence,expected};
 }
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
 if(record.selectionPhase)synchronousTrue(record,()=>requireOriginalApplicationSelectionPhaseScope(record.selectionPhase,record.repository,record.scope));
 for(const fence of fences)synchronousTrue(record,fence.isCurrent);sampleFinalAuthorities(record,fences);finalAuthorityFacts(record,fences);
}
function fixedFinalProfile(record,fences){
 if(!record.applicationSelectionAction||!record.selectionPhase)return null;
 const producers=originalBootstrapWeakGet(fixedFinalProducers,record);if(!producers||producers.unknown||producers.count!==fences.length)return null;
 const roles=producers.roles,target=producers.count===5&&roles.phase&&roles.canonical&&roles.selection&&roles.qualification&&roles.shadow;
 const source=producers.count===3&&roles.phase&&roles.selection&&roles.unprotected;if(!target&&!source)return null;
 const names=target?['phase','canonical','selection','qualification','shadow']:['phase','selection','unprotected'];
 for(const name of names){let found=0;for(const fence of fences)if(fence===roles[name].fence)found++;if(found!==1)return null;}
 for(const fence of fences)if(fence.compatibilityRecheck!==null||fence.authority!==null||fence.promotionRecoveryAuthority!==null||fence.maintenanceProcessingPurpose!==null)return null;
 return {producers,count:producers.count,roles,target:!!target};
}
function originalFixedRead(scope,record,method,args){
 // Only this synchronous original call owns driverReading. It never stays
 // enabled while a request is pending or lends an async reader window.
 record.driverReading=true;try{return originalBootstrapApply(method,scope,args);}finally{record.driverReading=false;}
}
async function runFixedFinalReads(scope,record,fences,profile){
 const current=()=>{
  if(profile.producers.unknown||profile.producers.count!==profile.count)refuseTerminal(record);
  currentFinalAuthorities(record,fences);
  if(profile.producers.unknown||profile.producers.count!==profile.count)refuseTerminal(record);
 };
 const readable=()=>{record.driverReading=true;try{requireReadableScope(scope);}finally{record.driverReading=false;}};
 const roles=profile.roles;current();
 if(profile.target){
  const expected=roles.canonical.expected;
  const count=await originalFixedRead(scope,record,originalFixedCount,['meta',undefined,expected.range]);current();
  if(count!==expected.rows.length)throw new ArchiveError('GENERATION_CHANGED');
  const rows=await readOriginalCanonicalInventory(scope,record,current,readable);
  if(rows.length!==expected.rows.length)throw new ArchiveError('GENERATION_CHANGED');
  let qualification,protection,gate;
  for(let i=0;i<rows.length;i++){
   const actual=rows[i],before=expected.rows[i];if(actual.key!==before.key)throw new ArchiveError('GENERATION_CHANGED');
   const wanted=before.key===CANONICAL_REPOSITORY_GATE?{...before.row,writeRevision:before.row.writeRevision+1}:before.row;
   if(!workSame(scope,actual.row,wanted))throw new ArchiveError('GENERATION_CHANGED');
   if(actual.key===canonicalQualification)qualification=actual.row;else if(actual.key===CANONICAL_REPOSITORY_PROTECTION)protection=actual.row;else if(actual.key===CANONICAL_REPOSITORY_GATE)gate=actual.row;
  }
  // Preserve the canonical-before-selection consumer order. Comparisons may
  // call mutable metering/equality code, so no later request borrows their A.
  current();const marker=await originalFixedRead(scope,record,originalFixedGet,['meta',APPLICATION_SELECTION_MARKER]);current();
  if(!workSame(scope,marker,roles.selection.expected))throw new ArchiveError('GENERATION_SELECTION_CHANGED');
  if(!workSame(scope,qualification,roles.qualification.expected))throw new ArchiveError('GENERATION_CHANGED');
  if(!workSame(scope,protection,roles.shadow.expected.marker)||!workSame(scope,gate,roles.shadow.expected.gate))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
 }else{
  const marker=await originalFixedRead(scope,record,originalFixedGet,['meta',APPLICATION_SELECTION_MARKER]);current();
  if(!workSame(scope,marker,roles.selection.expected))throw new ArchiveError('GENERATION_SELECTION_CHANGED');
  current();const protection=await originalFixedRead(scope,record,originalFixedGet,['meta',CANONICAL_REPOSITORY_PROTECTION]);current();
  if(protection!=null)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
 }
 // All full-row comparisons can meter/reflect. Recheck every original purpose
 // and producer predicate afterwards; the transaction's outer check also stays.
 current();
}
async function runFinalReadFences(scope,record){
 if(!record.finalReadFences.length){if(record.applicationSelectionAction&&record.selectionPhase)refuseTerminal(record);return;}
 record.phase='terminal-compatibility';const fences=Object.freeze([...record.finalReadFences]);
 const fixed=fixedFinalProfile(record,fences);
 // The staged selection quote admits only its closed original producer set.
 // Reject unknown work BEFORE any compatibility callback; other owners retain
 // their original generic plan path and cannot borrow this selection profile.
 if(record.applicationSelectionAction&&record.selectionPhase&&!fixed)refuseTerminal(record);
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
 if(fixed){await runFixedFinalReads(scope,record,fences,fixed);return;}
 for(const f of fences){
  current();const iterator=f.plan();
  if(!iterator||typeof iterator.next!=='function'||typeof iterator.then==='function')refuseTerminal(record);
  // In the original action, plan creation/iterator inspection is observed
  // before the first next. Later iterations consume the adjacent post-result
  // observation below. Ordinary final-fence call ordering remains unchanged.
  let value;if(record.applicationSelectionAction)current();
  for(;;){
   if(!record.applicationSelectionAction)current();const step=iterator.next(value);current();
   if(!step||typeof step!=='object'||typeof step.then==='function')refuseTerminal(record);
   if(step.done){if(step.value!==true)refuseTerminal(record);break;}
   const spec=step.value,descriptors=spec&&Object.getOwnPropertyDescriptors(spec);
   if(!descriptors||![Object.prototype,null].includes(Object.getPrototypeOf(spec))||Object.values(descriptors).some(d=>!Object.hasOwn(d,'value'))||!Object.hasOwn(descriptors,'method')||!Object.hasOwn(descriptors,'table'))refuseTerminal(record);
   const method=descriptors.method.value,table=descriptors.table.value,key=descriptors.key?.value,index=descriptors.index?.value;
   if(typeof table!=='string'||!record.transaction.objectStoreNames.contains(table)||!['get','count'].includes(method)||Reflect.ownKeys(spec).some(k=>!['method','table','key','index'].includes(k)))refuseTerminal(record);
   current();
   if(method==='get'){if(index!==undefined||key===undefined)refuseTerminal(record);let reading;record.driverReading=true;try{reading=originalDataMethods.find(([name])=>name==='get')[1].value.call(scope,table,key);}finally{record.driverReading=false;}value=await reading;}
   else{if(index!==undefined&&typeof index!=='string')refuseTerminal(record);workQuery(scope,1,[table,index,key],true);scope.metrics.reads++;const target=record.transaction.objectStore(table);value=workResult(scope,await req(index?target.index(index).count(key):target.count(key)));}
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
// Restriction-only check for the fixed phased task ledger. A caller cannot
// manufacture the private staging/owner/publication token by copying a DTO.
export function registerOriginalRepositoryReadWorkLimit(repository,scope,limits){registerOriginalWorkLimit(repository,scope,limits,true);}
export function requireOriginalTaskControlFailure(repository,scope){const r=scopeRecord(repository,scope);if(!r.unwound||r.originalSuccess||!r.shadow)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');return true;}
export function requireOriginalTaskControlScope(repository,scope,terminal=false){
 const r=scopeRecord(repository,scope);requireRepositoryTransactionDataMethods(repository,scope);
 const kind=r.shadow?.authority?.kind;
 if(r.phase!=='callback'||r.identity.mode!=='readwrite'||!r.shadow||!(terminal?kind==='publication-phased-human-seal':['checkpoint','human-phased'].includes(kind))||readOriginalGenerationRepositoryAuthority(r.shadow.token,repository,scope)!==r.shadow.authority)throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
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
// Only an original action may replace its primary-object-store cursor page.
// Bounded reads remain in the existing scope (including a prepared RW scope).
// An actual id-keyed store needs only its full values; all other key paths keep
// the original pair. This is not writer admission or reusable readiness.
function readOriginalActionPrimaryPage(scope,record,store,prefix,after,limit,range,upper,readable=()=>requireReadableScope(scope)){
 return new Promise((resolve,reject)=>{
  let accepting=true,pending=0,failed=false,failure,keys,values,target,idKeyed=false;
  const refuse=error=>{if(!failed){failed=true;failure=error;}record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}};
  const finish=()=>{
   if(accepting||pending)return;
   if(failed){reject(failure);return;}
   try{
    // Every actual complete raw result has already paid, including empty or
    // oversized arrays. Only an observed id-keyPath can derive primary keys.
    if(idKeyed){if(!Array.isArray(values)||values.length>limit)workRefuse(record);}
    else if(!Array.isArray(keys)||!Array.isArray(values)||keys.length!==values.length||keys.length>limit)workRefuse(record);
    const rows=[];let previous=after;
    for(let i=0;i<(idKeyed?values.length:keys.length);i++){
     const originalKey=idKeyed?undefined:keys[i],value=values[i],id=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'id'):null,key=idKeyed?id?.value:originalKey;
     if(typeof key!=='string'||!key.startsWith(prefix)||key>=upper||previous!==null&&key<=previous||!id||!Object.hasOwn(id,'value')||id.value!==key)workRefuse(record);
     rows.push({key,value});previous=key;
    }
    // Validation/reflection can be reentrant. Do not reuse either raw-result
    // observation to authorize the probe or return a page after that boundary.
    if(!sameScope(record))workRefuse(record);readable();
    scope.metrics.reads+=rows.length;scope.metrics.primaryMaxBatch=Math.max(scope.metrics.primaryMaxBatch||0,rows.length);
    if(rows.length<limit){resolve({rows,next:null});return;}
    const end=previous,probeRange=IDBKeyRange.bound(end,upper,true,true);
    workQuery(scope,1,[store,end,upper,true,true,probeRange],true);
    const probe=target.openKeyCursor(probeRange);
    probe.onerror=()=>{try{reject(fail(probe.error));}catch(error){reject(error);}};
    probe.onsuccess=()=>{try{const cursor=probe.result;workResult(scope,cursor?.key);scope.metrics.primaryKeyProbes=(scope.metrics.primaryKeyProbes||0)+1;resolve({rows,next:cursor?end:null});}catch(error){reject(error);}};
   }catch(error){reject(error);}
  };
  const observe=(request,slot)=>{
   pending++;let settled=false;
   request.onerror=()=>{if(settled)return;settled=true;try{refuse(fail(request.error));}catch(error){refuse(error);}finally{pending--;finish();}};
   request.onsuccess=()=>{
    if(settled)return;settled=true;
    try{
     const raw=request.result;if(slot==='keys')keys=raw;else values=raw;
     // A prior failure never skips a later accepted result's complete debit.
     // workCharge performs accepted-result charging BEFORE its currentness test.
     workCharge(scope,Array.isArray(raw)?raw.length:0,raw,true,true);
    }catch(error){refuse(error);}finally{pending--;finish();}
   };
  };
  try{
   target=scope.tx.objectStore(store);idKeyed=target.keyPath==='id';
   const getKeys=idKeyed?null:target.getAllKeys,getValues=target.getAll;
   // Observe the actual keyPath/methods BEFORE the full post-meter guard.
   // No keys request/result is charged or performed when values contain the
   // original primary id. The fallback still prepays both accepted-plan refs.
   workQuery(scope,idKeyed?1:2,[store,prefix,after,limit,range,idKeyed?['getAll']:['getAllKeys','getAll']],true);
   if(!idKeyed){
    observe(Reflect.apply(getKeys,target,[range,limit]),'keys');
    // A fresh full guard separates the two actual request acquisitions.
    if(!sameScope(record))workRefuse(record);readable();
   }
   observe(Reflect.apply(getValues,target,[range,limit]),'values');
  }catch(error){refuse(error);}
  finally{accepting=false;finish();}
 });
}
async function readOriginalCanonicalInventory(scope,record,afterPage,readable=()=>requireReadableScope(scope)){
 const rows=[];let after=null;
 do{
  readable();const range=IDBKeyRange.bound(after===null?canonicalPrefix:after,canonicalUpper,after!==null,true);
  // This fixed private reader uses the actual schema-selected bounded path,
  // never the unrelated density hint. Every raw result and full-page probe pays.
  const page=await readOriginalActionPrimaryPage(scope,record,'meta',canonicalPrefix,after,64,range,canonicalUpper,readable);
  if(rows.length+page.rows.length>4096)workRefuse(record);
  for(const entry of page.rows)rows.push({key:entry.key,row:entry.value});
  after=page.next;afterPage();
 }while(after!==null);
 return rows;
}
class Transaction {
 constructor(tx,metrics,semanticEnabled=false){this.tx=tx;this.metrics=metrics;this.semanticEnabled=semanticEnabled;}
 async has(store,key){requireReadableScope(this);workCharge(this,1,[store,key],true,false,true);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).getKey(key)))!==undefined;}
 async get(store,key){workGet(this,store,key);this.metrics.reads++;return workResult(this,await req(this.tx.objectStore(store).get(key)));}
 async put(store,value,key){requireWritableScope(this);requireShadowMutation(this,store,key===undefined?value?.id:key,'put');if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key===undefined?value?.id:key),value);await trackSemanticWrite(this,store,key===undefined?value?.id:key,value);await trackNavigationWrite(this,store,key===undefined?value?.id:key,value);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(value.id))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,key===undefined?[store,value]:[store,value,key],true,false,true);this.metrics.writes++;const result=await req(key===undefined?this.tx.objectStore(store).put(value):this.tx.objectStore(store).put(value,key));return workResult(this,result);}
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
 async delete(store,key){requireWritableScope(this);requireShadowMutation(this,store,key,'delete');if(store==='blockIndex')await syncArchiveYearIndex(this,await this.get(store,key),null);await trackSemanticWrite(this,store,key,null);await trackNavigationWrite(this,store,key,null);if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(key))this.backupChanged=true;requireWritableScope(this);workCharge(this,1,[store,key],true,false,true);this.metrics.writes++;const result=await req(this.tx.objectStore(store).delete(key));return workResult(this,result);}
 async clear(store){requireWritableScope(this);requireShadowMutation(this,store,null,'clear');if(repositoryScopes.get(this)?.workLimit)workRefuse(repositoryScopes.get(this));if(store==='blockIndex')await clearArchiveYearIndex(this);await trackSemanticClear(this,store);if(store==='documents')await this.delete('meta','ans:index-state:v1:catalog');if(backupDataStores.has(store))this.backupChanged=true;requireWritableScope(this);return req(this.tx.objectStore(store).clear());}
 async count(store,index,key){requireReadableScope(this);workQuery(this,1,[store,index,key],true);return workResult(this,await req(index?this.tx.objectStore(store).index(index).count(key):this.tx.objectStore(store).count(key)));}
 async all(store,index,key,limit){
  requireReadableScope(this);const record=repositoryScopes.get(this),stream=!!record?.workLimit&&limit===undefined;
  if(!stream)finiteWorkQuery(this,limit);workQuery(this,1,[store,index,key,limit],true);this.metrics.scans++;const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  if(stream)return new Promise((resolve,reject)=>{
   // Existing complete-owner reads retain their complete-set semantics. Under
   // the private envelope, acquire and charge each physical row before retaining
   // it; never fetch an unbounded getAll result or silently truncate the set.
   const rows=[],request=target.openCursor(key);request.onerror=()=>reject(fail(request.error));
   request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){workResult(this,null);resolve(rows);return;}const row=cursor.value;workRow(this,row);this.metrics.reads++;rows.push(row);cursor.continue();}catch(error){reject(error);}};
  });
  const rows=await req(target.getAll(key,limit));workCharge(this,rows.length,rows,true,true);this.metrics.reads+=rows.length;return rows;
 }
 async keys(store,index,key,limit){requireReadableScope(this);if(limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1||limit>10000))throw new ArchiveError('INVALID_REQUEST');const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);if(!repositoryScopes.get(this)?.workLimit&&limit===undefined)return req(target.getAllKeys(key));workQuery(this,1,[store,index,key,limit],true);return new Promise((resolve,reject)=>{const keys=[],request=target.openKeyCursor(key);request.onerror=()=>reject(fail(request.error));request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){workResult(this,null);resolve(keys);return;}const primaryKey=cursor.primaryKey;workRow(this,primaryKey);if(limit!==undefined&&keys.length===limit)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');keys.push(primaryKey);cursor.continue();}catch(error){reject(error);}};});}
 async edge(store,index,key,direction='next'){requireReadableScope(this);workQuery(this,1,[store,index,key,direction],true);return new Promise((resolve,reject)=>{const r=this.tx.objectStore(store).index(index).openCursor(key,direction);r.onsuccess=()=>{try{resolve(workResult(this,r.result?.value));}catch(e){reject(e);}};r.onerror=()=>reject(fail());});}
 async rangePage(store,index,range,after,limit,direction='next'){requireReadableScope(this);finiteWorkQuery(this,limit);const reverse=direction==='prev',effective=after?(reverse?(range?.lower!==undefined?IDBKeyRange.bound(range.lower,after,range.lowerOpen,true):IDBKeyRange.upperBound(after,true)):(range?.upper!==undefined?IDBKeyRange.bound(after,range.upper,true,range.upperOpen):IDBKeyRange.lowerBound(after,true))):range;workQuery(this,1,[store,index,range,after,limit,direction,effective],true);return new Promise((resolve,reject)=>{const rows=[],target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store),r=target.openCursor(effective,direction);r.onerror=()=>reject(fail());r.onsuccess=()=>{try{const c=r.result,row=workCursor(this,c);if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}if(after&&(reverse?indexedKeyCompare(row.key,after)>=0:indexedKeyCompare(row.key,after)<=0)){c.continue();return;}this.metrics.reads++;rows.push({key:row.key,value:row.value});c.continue();}catch(e){reject(e);}};});}
 async indexPrimaryPage(store,index,key,{after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  if(!Number.isInteger(limit)||limit<1||limit>100||after!==null&&typeof after!=='string')throw new ArchiveError('INVALID_REQUEST');
  const range=IDBKeyRange.only(key);workQuery(this,1,[store,index,key,after,limit,range],true);return new Promise((resolve,reject)=>{const rows=[],r=this.tx.objectStore(store).index(index).openCursor(range);r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{try{
   const c=r.result,row=workCursor(this,c);if(!c){resolve({rows,next:null});return;}
   if(after!==null&&row.primaryKey<after){c.continuePrimaryKey(key,after);return;}
   if(after!==null&&row.primaryKey===after){c.continue();return;}
   this.metrics.reads++;rows.push({key:row.primaryKey,value:row.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length===limit){resolve({rows,next:row.primaryKey});return;}c.continue();
  }catch(e){reject(e);}};});
 }
 async primaryRangePage(store,{prefix='',after=null,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  if(typeof prefix!=='string'||!Number.isInteger(limit)||limit<1||limit>100||after!==null&&(typeof after!=='string'||!after.startsWith(prefix)||after>=prefix+'\uffff'))throw new ArchiveError('INVALID_REQUEST');
  const upper=prefix+'\uffff',range=IDBKeyRange.bound(after===null?prefix:after,upper,after!==null,true),record=repositoryScopes.get(this);
  if(record?.applicationSelectionAction&&!record.primaryCursorTables?.has(store))return readOriginalActionPrimaryPage(this,record,store,prefix,after,limit,range,upper);
  workQuery(this,1,[store,prefix,after,limit,range],true);const target=this.tx.objectStore(store);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail(r.error));r.onsuccess=()=>{try{
   const c=r.result,row=workCursor(this,c);if(!c){resolve({rows,next:null});return;}
   this.metrics.reads++;rows.push({key:row.key,value:row.value});this.metrics.primaryMaxBatch=Math.max(this.metrics.primaryMaxBatch||0,rows.length);
   if(rows.length<limit){c.continue();return;}
   // Peek only the next key: never materialize object limit+1. A real abort
   // can make continuation/probe creation throw inside this async callback;
   // reject its original promise so the owning transaction can actually unwind.
   const probeRange=IDBKeyRange.bound(row.key,upper,true,true);workQuery(this,1,[store,row.key,upper,true,true,probeRange],true);const probe=target.openKeyCursor(probeRange);
   probe.onerror=()=>reject(fail(probe.error));probe.onsuccess=()=>{try{const cursor=probe.result;workResult(this,cursor?.key);this.metrics.primaryKeyProbes=(this.metrics.primaryKeyProbes||0)+1;resolve({rows,next:cursor?row.key:null});}catch(e){reject(e);}};
  }catch(e){reject(e);}};});
 }
 async page(store,{index,after,limit=100}={}){requireReadableScope(this);finiteWorkQuery(this,limit);
  const range=after===undefined?undefined:IDBKeyRange.lowerBound(after,true);workQuery(this,1,[store,index,after,limit,range],true);const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail());r.onsuccess=()=>{try{const c=r.result,row=workCursor(this,c);if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}this.metrics.reads++;rows.push({key:row.key,value:row.value});c.continue();}catch(e){reject(e);}};});
 }
}

// Capture the actual private class before any caller receives a scope. This
// bounded profile is a refusal check, not proof of native request/data effects.
const originalDataPrototype=Transaction.prototype;
const originalDataPrototypeParent=originalPrototypeOf(originalDataPrototype);
const originalDataMethods=Object.freeze(['get','has','put','count','rangePage','primaryRangePage','delete'].map(name=>Object.freeze([name,Object.freeze(originalOwnDescriptor(originalDataPrototype,name))])));
const originalFixedGet=originalDataMethods[0][1].value,originalFixedCount=originalDataMethods[3][1].value;

let nativeRepositoryBrand;
export function isOriginalNativeArchiveRepository(repository){return !!nativeRepositoryBrand&&nativeRepositoryBrand(repository);}
export class ArchiveRepository {
 static {nativeRepositoryBrand=owner=>!!owner&&(typeof owner==='object'||typeof owner==='function')&&#existingOnly in owner;}
 #existingOnly=false;
 constructor(local,{indexedDB=globalThis.indexedDB,name=DATABASE_NAME,checkpoint=async()=>{},ia=false,smartFilter=false,thoughtLibrary=false}={}){this.local=local;this.ia=ia;this.smartFilter=smartFilter;this.thoughtLibrary=thoughtLibrary;this.stores=[...STORES,...(ia?IA_STORES:[]),...(smartFilter?FILTER_STORES:[]),...(thoughtLibrary?LIBRARY_STORES:[])];this.factory=indexedDB;this.name=name;this.checkpoint=checkpoint;this.metrics={reads:0,writes:0,scans:0};repositoryWrites.set(this,{generation:Object.freeze({}),active:0});}
 // Cold selection must never create a missing library or migrate an older schema.
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
 async transaction(write,fn,stores=this.stores,explicitRecoveryWork=undefined,selectionAuthority=null,restrictionTicket=null,selectionPhase=null,selectionReadAction=null,shadowAuthority=null,localToolsExecution=null){
  const writeState=repositoryWrites.get(this);if(!writeState)throw fail();
  const execution=readOriginalRecoveryStoreExecution(this),ambientTicket=ordinaryRecoveryWindows.get(this);
  if(execution?.interfered&&(explicitRecoveryWork!==undefined||restrictionTicket!==null||ambientTicket))throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');
  if(explicitRecoveryWork!==undefined)requireOriginalRecoveryWorkWindow(this,explicitRecoveryWork);
  if(restrictionTicket!==null&&(ambientTicket||explicitRecoveryWork!==undefined)){recoveryWork(restrictionTicket,this).failed=true;if(ambientTicket)recoveryWork(ambientTicket,this).failed=true;throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
  // A genuine Store execution owns its captured ticket, including an explicit
  // absence. It cannot borrow an unrelated window opened while it was waiting.
  const recoveryTicket=restrictionTicket!==null?restrictionTicket:explicitRecoveryWork!==undefined?explicitRecoveryWork:execution===null?ambientTicket:execution.recoveryWork;
  const recovery=recoveryTicket?recoveryWork(recoveryTicket,this):null,localTools=localToolsExecution===null?null:originalBootstrapWeakGet(localToolsExecutions,localToolsExecution);
  if(localToolsExecution!==null&&(!localTools||localTools.closed||!localTools.reading||localTools.repository!==this||write||selectionAuthority||selectionPhase||selectionReadAction||shadowAuthority||restrictionTicket!==localTools.participants[0].ticket||recovery?.pending!==localTools.pending))throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
  if(localTools)localToolsCurrent(localTools);
  if(recovery?.pending&&!localTools){recovery.failed=true;if(recovery.scope)workAbort(recovery.scope);throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');}
  const staged=selectionPhase?readOriginalApplicationSelectionPhase(selectionPhase,this,selectionAuthority,stores):null,applicationSelectionAction=staged?.action??selectionReadAction??recovery?.applicationSelectionAction??null;if(applicationSelectionAction)requireOriginalApplicationSelectionRepositoryWork(applicationSelectionAction,this);if(selectionReadAction&&write||staged&&!write||readOriginalApplicationSelectionAuthority(selectionAuthority,this,null)?.action&&!staged)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');let activeToken=null;let recoveryPending;if(recovery&&!localTools){let resolve;recoveryPending={settled:new Promise(r=>resolve=r),resolve:()=>resolve()};recovery.pending=recoveryPending;}try{
  if(recovery&&(shadowAuthority!==null||selectionAuthority!==null))throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');
  if(write&&shadowAuthority===null){activeToken=await prepareOriginalActiveRepositoryWrite(this,!!recovery,applicationSelectionAction);if(activeToken)shadowAuthority=activeToken;}
  if(write){writeState.generation=Object.freeze({});writeState.active++;}
  try{
  await this.open();if(localTools)localToolsCurrent(localTools);if(recovery)recoveryWork(recoveryTicket,this);if(write&&!stores.includes('meta'))stores=[...stores,'meta'];let tx;try{tx=this.db.transaction(stores,write?'readwrite':'readonly',write?{durability:'strict'}:undefined);}catch(error){throw fail(error);}
  const scope=new Transaction(tx,this.metrics,this.thoughtLibrary);
  const native=nativeTransactionEvidence(tx);
  let release;const record={scope,started:workClock(),phase:'callback',terminalFailed:false,finalReadFences:[],repository:this,transaction:tx,transactionAbort:native?nativeTransactionAbort:tx.abort,dataPrototype:originalPrototypeOf(scope),nativeSettled:false,nativeOutcome:'pending',trustedNativeOutcome:null,originalSuccess:false,unwound:false,identity:Object.freeze({token:Object.freeze({}),database:native?.database||tx.db,mode:native?.mode||tx.mode,nativeTransaction:!!native}),settled:new Promise(resolve=>{release=resolve;})};
  if(selectionPhase&&applicationSelectionAction&&!recovery)originalBootstrapWeakSet(originalPointReadScopes,scope,{record,repository:this,transaction:tx,identity:record.identity,database:record.identity.database,action:applicationSelectionAction,phase:selectionPhase,budget:null});
  repositoryScopes.set(scope,record);repositoryNativeScopes.set(tx,record);if(recovery){record.recoveryWork=recoveryTicket;recovery.scope=record;}if(applicationSelectionAction)record.applicationSelectionAction=applicationSelectionAction;if(selectionPhase)record.selectionPhase=selectionPhase;
  if(localTools){const extra=localTools.restrictions.slice(1).map(work=>({work,rootLimit:Math.min(2*1024*1024,2*1024*1024-work.bytes)}));originalBootstrapWeakSet(localToolsScopes,record,{group:localTools,extra,rows:originalBootstrapCreate(null)});for(const p of localTools.restrictions)p.scope=record;}
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
  if(applicationSelectionAction)originalBootstrapWeakSet(originalMetaGroupSettlements,record,done);
  // The rejection is observed immediately even when the operation also rejects.
  done.catch(()=>{});
  try{if(applicationSelectionAction){const limit=requireOriginalApplicationSelectionRepositoryWork(applicationSelectionAction,this);if(selectionPhase)bindOriginalApplicationSelectionPhaseScope(selectionPhase,this,scope);registerOriginalWorkLimit(this,scope,{references:4096,bytes:2*1024*1024,ms:limit.deadline-workClock()},!write);if(selectionPhase){const signal=staged.signal;const abort=()=>{record.terminalFailed=true;try{record.transactionAbort.call(record.transaction);}catch{}};nativeAddEventListener.call(signal,'abort',abort);record.selectionAbort={signal,abort};if(nativeAbortSignalAborted.call(signal))abort();}}if(recovery){recoveryWork(recoveryTicket,this);registerOriginalWorkLimit(this,scope,{references:4096-recovery.refs,bytes:2*1024*1024-recovery.bytes,ms:recovery.deadline-workClock()},!write);}if(write){await beginSelectionWrite(this,scope,record,selectionAuthority);await beginShadowWrite(this,scope,record,shadowAuthority);}else{const limits=originalPhasedHumanReadWork(this,scope)??readOriginalCheckpointCompileWork(this,scope);if(limits)registerOriginalWorkLimit(this,scope,limits,true);}const result=await fn(scope);if(write){await finishSelectionWrite(this,scope,record);await finishShadowWrite(this,scope,record);}record.phase='finalizing';if(record.terminalFailed)refuseTerminal(record);if(write)await flushNavigationWrites(scope);const semanticWrite=write?await flushSemanticWrites(scope):false;if(write&&scope.backupChanged){const marker=await scope.get('meta','backup-data-generation');await scope.put('meta',{id:'backup-data-generation',value:(marker?.value||0)+1});}if(write){await runFinalReadFences(scope,record);currentFinalAuthorities(record,record.finalReadFences);}workCheck(record);await done;record.originalSuccess=true;if(semanticWrite)bindSemanticWriteReceipt(this,result);return result;}catch(e){if(recovery)recovery.failed=true;try{record.transactionAbort.call(record.transaction);}catch{}await done.catch(()=>{});if(record.workLimit?.failed)throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');if(tx.error?.name==='QuotaExceededError')throw fail(tx.error);if(e instanceof ArchiveError||['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))throw e;throw fail(e?.name?e:tx.error);}finally{if(record.originalSuccess&&record.workLimit&&!record.workLimit.failed)record.committedWork=Object.freeze({references:record.workLimit.refs,bytes:record.workLimit.bytes,activeMs:Math.max(0,workClock()-record.workLimit.started)});clearTimeout(record.workLimit?.timer);if(record.selectionAbort)nativeRemoveEventListener.call(record.selectionAbort.signal,'abort',record.selectionAbort.abort);record.finalReadFences.length=0;record.unwound=true;if(recovery?.scope===record)recovery.scope=null;if(localTools)for(const p of localTools.restrictions)if(p.scope===record)p.scope=null;maybeRelease();if(!write){settleOriginalPhasedHumanReadWork(this,scope);settleOriginalCheckpointCompileWork(this,scope);}}
  }finally{if(activeToken)releaseOriginalActiveRepositoryWrite(activeToken);if(write)writeState.active--;}
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

// Existing-only original readonly entry. In particular, the public open method
// cannot initialize/reopen or substitute a connection while a consumer is waiting.
const existingReadOpenMethod=originalOwnDescriptor(promptTransactionPrototype,'open'),existingReadApply=Reflect.apply;
export function requireOriginalExistingRepositoryReadOwner(repository,database){
 if(!database||originalOwnDescriptor(repository,'db')?.value!==database||!originalRepositoryTransactionOwner(repository)||!promptTransactionDescriptor(originalOwnDescriptor(promptTransactionPrototype,'open'),existingReadOpenMethod))throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');
 let found=false;for(let owner=repository;owner;owner=originalPrototypeOf(owner)){const descriptor=originalOwnDescriptor(owner,'open');if(descriptor){found=promptTransactionDescriptor(descriptor,existingReadOpenMethod);break;}}
 if(!found)throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');return true;
}
export async function originalExistingRepositoryRead(repository,fn,stores=['meta']){
 const database=originalOwnDescriptor(repository,'db')?.value;
 const current=()=>{requireOriginalExistingRepositoryReadOwner(repository,database);if(typeof fn!=='function')throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');};
 current();let scope;const result=await existingReadApply(promptTransactionMethod.value,repository,[false,async t=>{scope=t;current();requireRepositoryTransactionDataMethods(repository,t);if(requireRepositoryTransactionScope(repository,t).database!==database)throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');const value=await fn(t);current();return value;},stores]);
 requireRepositoryTransactionSucceeded(repository,scope);current();return result;
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
 return promptTransactionMethod.value.call(repository,true,fn,stores,undefined,null,null,null,null,token);
}

const originalRepositoryOpen=ArchiveRepository.prototype.open;

const originalRepositoryOpenExisting=ArchiveRepository.prototype.openExisting;
export function openOriginalExistingRepository(repository){if(!repositoryWrites.has(repository))throw new ArchiveError('GENERATION_CAPABILITY');return originalRepositoryOpenExisting.call(repository);}

// Private existing-library selection writer layered over (not instead of) the
// original active-generation guard and original transaction/terminal driver.
export function originalApplicationSelectionTransaction(repository,token,fn,stores){
 if(!repositoryWrites.has(repository)||!readOriginalApplicationSelectionAuthority(token,repository,null))throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');
 return promptTransactionMethod.value.call(repository,true,fn,stores,undefined,token);
}

// Restriction-only explicit ordinary work attribution. It does not install an
// ambient window, lend generation/selection authority, or relax any limit.
export function originalRestrictedRepositoryTransaction(repository,ticket,write,fn,stores){
 recoveryWork(ticket,repository);
 return promptTransactionMethod.value.call(repository,write,fn,stores,undefined,null,ticket);
}

// Fixed staged selection path. A genuine core domain authority alone is NOT
// writer admission: the original driver's phase is bound to this actual scope.
export function originalStagedApplicationSelectionTransaction(repository,authority,phase,fn,stores){
 readOriginalApplicationSelectionPhase(phase,repository,authority,stores);
 const task=promptTransactionMethod.value.call(repository,true,fn,stores,undefined,authority,null,phase);
 return trackOriginalApplicationSelectionRepositoryWork(readOriginalApplicationSelectionAuthority(authority,repository,null).action,repository,task);
}
export function originalApplicationSelectionRead(repository,action,fn,stores){
 requireOriginalApplicationSelectionRepositoryWork(action,repository);
 return trackOriginalApplicationSelectionRepositoryWork(action,repository,promptTransactionMethod.value.call(repository,false,fn,stores,undefined,null,null,null,action));
}
export function chargeOriginalApplicationSelectionActionWork(action,value,references=0){return chargeOriginalApplicationSelectionDriverWork(action,value,references);}
export function requireOriginalApplicationSelectionDispatch(action){return requireOriginalApplicationSelectionDriverDispatch(action);}
export function requireOriginalApplicationSelectionLocal(action,local,get,set){requireOriginalApplicationSelectionDriverLocal(action,local,get,set);}
export function requireOriginalApplicationSelectionLocalDispatch(action,local,get,set){requireOriginalApplicationSelectionDriverLocalDispatch(action,local,get,set);}

export function trackOriginalApplicationSelectionActionWork(action,promise){return trackOriginalApplicationSelectionDriverWork(action,promise);}

export function requireOriginalApplicationSelectionRecoveryWork(repository,ticket,action,owner,kind){const p=recoveryWork(ticket,repository);if(p.applicationSelectionAction!==action||p.applicationSelectionMember!==owner||p.applicationSelectionKind!==kind)throw new ArchiveError('GENERATION_SELECTION_CAPABILITY');requireOriginalApplicationSelectionMember(action,owner,kind);return true;}
