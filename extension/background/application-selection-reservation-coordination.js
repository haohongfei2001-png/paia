import {readOriginalProductionStoreNativeBinding} from './application-store-selection.js';
import {hasOriginalProductionStartupBinding} from './application-startup-events.js';
import {readOriginalProductionContextNativeFacts} from './context-connections.js';
import {readOriginalProductionAssistNativeFacts} from './prompt-assist.js';
import {readOriginalProductionNextNativeFacts} from './prompt-next.js';
import {readOriginalProductionPromptNativeFacts} from './prompt-reuse-commands.js';
import {readOriginalProductionSurfaceNativeFacts} from './prompt-surface.js';
import {readOriginalPromptServiceNativeStore} from '../core/prompt-reuse-service.js';
import {isOriginalNativeArchiveRepository} from '../core/idb-repository.js';
import {readOriginalBootstrapInspectionFacts,readOriginalBootstrapLocalInspectionFacts,originalBootstrapInitialLocal,originalBootstrapInitialLocalGet,originalBootstrapInitialLocalSet,rejectOriginalBootstrapInspection,invalidateOriginalBootstrapInspection,originalBootstrapPrototype,originalBootstrapDescriptor,originalBootstrapHasOwn,originalBootstrapNames,originalBootstrapSymbols,originalBootstrapArrayIs,originalBootstrapFinite,originalBootstrapSafeInteger,originalBootstrapSameValue,originalBootstrapNumberString,originalBootstrapCharCode,originalBootstrapPlainPrototype,originalBootstrapArrayPrototype,originalBootstrapIteratorKey,originalBootstrapCompareDescriptor,originalBootstrapNow,originalBootstrapMap,originalBootstrapMapGet,originalBootstrapMapSet,originalBootstrapMapHas,originalBootstrapSet,originalBootstrapSetAdd,originalBootstrapSetDelete,originalBootstrapSetHas,originalBootstrapSetSize,originalBootstrapHostCarrier,originalBootstrapRuntimeCarrier,originalBootstrapLocalCarrier,originalBootstrapIndexedDBCarrier,originalBootstrapHostSupported} from './native-host-bootstrap.js';
import {originalBootstrapFreeze,originalBootstrapCreate} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost} from './native-host-bootstrap.js';
import {isProductionApplicationStore} from './application-store-selection.js';
import {isProductionApplicationEditorGuard,isOriginalApplicationEditorGuard,holdOriginalApplicationSelectionEditor,currentOriginalApplicationSelectionEditor,fenceOriginalApplicationSelectionEditor} from './application-editor-guard.js';
import {isProductionApplicationTransportCoordination,isOriginalApplicationTransportCoordination,readOriginalApplicationSelectionTransportMembers,holdOriginalApplicationSelectionTransport,currentOriginalApplicationSelectionTransport,fenceOriginalApplicationSelectionTransport} from './application-transport-coordination.js';
import {isProductionApplicationLocalToolsCoordination,isOriginalApplicationLocalToolsCoordination,readOriginalApplicationSelectionLocalToolMembers,holdOriginalApplicationSelectionLocalTools,currentOriginalApplicationSelectionLocalTools,fenceOriginalApplicationSelectionLocalTools} from './application-local-tools-coordination.js';
import {isProductionApplicationWorkerCoordination,isOriginalApplicationWorkerCoordination,readOriginalProductionWorkerNativeMembers,readOriginalApplicationSelectionSourceMembers} from './application-worker-coordination.js';
import {isOriginalCaptureRecovery} from './capture-recovery.js';
import {isOriginalPromptInsertionReceipts} from './prompt-insertion-receipts.js';
import {isProductionApplicationSelectionCommands,isOriginalApplicationSelectionCommands,isInjectedLocalApplicationSelectionCommands,requireOriginalApplicationSelectionInvocation,holdOriginalApplicationSelectionActivity,drainPinnedOriginalApplicationSelectionActivity,requirePinnedOriginalApplicationSelectionActivity} from './application-selection-commands.js';
import {isProductionConfiguredSyncLifecycle,isInjectedLocalSyncSelectionLifecycle,openOriginalSyncSelectionAction,readOriginalSyncSelectionActionSession} from './sync-local-lifecycle.js';
import {ArchiveError} from '../core/constants.js';
import {SyncError} from '../core/browser-native-sync/value.js';
import {measureSourceWorkingPhysicalTree} from '../core/browser-native-sync/source-working-physical.js';
import {buildOriginalApplicationSelectionTailPlan} from '../core/browser-native-sync/application-selection-tail-plan.js';
import {readOriginalApplicationSelectionAction,invalidateOriginalApplicationSelectionAction,readOriginalApplicationSelectionAuthority} from '../core/browser-native-sync/application-generation-selection.js';
import {readOriginalActiveSelectionRepositoryDependencies} from '../core/browser-native-sync/canonical-generation-publication.js';
import {requireRepositoryTransactionScope,readOriginalCommittedTransactionWork,registerRepositoryFinalReadFence,originalStagedApplicationSelectionTransaction,readOriginalApplicationSelectionPointGroup} from '../core/idb-repository.js';

// This is the fixed original driver, not an extensible readiness registry.
// No caller can register action/member/phase identities. The only minting path
// is the original command invocation, original lifecycle and fixed holders.
const actions=originalBootstrapWeakMap(),coordinators=originalBootstrapWeakMap(),validationFrames=originalBootstrapWeakMap(),bindingBatches=originalBootstrapWeakMap(),pointGroups=originalBootstrapWeakMap(),phaseFinalFences=originalBootstrapWeakMap(),phases=new WeakMap(),productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
const now=originalBootstrapHostSupported()?originalBootstrapNow:performance.now.bind(performance),apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then;
const fail=(code='GENERATION_SELECTION_CAPABILITY')=>{throw new ArchiveError(code);};
const observe=(promise,yes,no)=>apply(then,promise,[yes,no]);
function original(action){const r=originalBootstrapWeakGet(actions,action);if(!r)fail();return r;}
function poison(r){if(!r.invalid){r.invalid=true;if(r.action!==null)invalidateOriginalApplicationSelectionAction(r.action);}return false;}
function budget(r){if((r.nativeClock?originalBootstrapNow():now())>=r.deadline||r.references>4096||r.bytes>2*1024*1024||r.budgetFailed||r.tail&&(r.references-r.tail.startReferences>r.tail.references||r.bytes-r.tail.startBytes>r.tail.bytes)){r.budgetFailed=true;poison(r);fail('BNS_GROUP_RESOURCE_LIMIT');}}
function checkedPrice(r,kind,start){const price=r.tail?.checks[kind];if(price&&(r.references-start.references>price.references||r.bytes-start.bytes>price.bytes)){r.budgetFailed=true;poison(r);fail('BNS_GROUP_RESOURCE_LIMIT');}}
function current(r,factsOnly=false,bindingBatch=null){
 const start={references:r.references,bytes:r.bytes};
 // Facts-only is explicit original callsite bookkeeping, never ambient access
 // inherited by a reentrant business operation during a holder validation.
 try{budget(r);if(r.invalid||r.settled)fail();(factsOnly?r.session.facts:r.session.check)(bindingBatch);r.session.portal.current(r.action);if(!r.identities())fail();checkedPrice(r,'current',start);return true;}catch(error){poison(r);throw error;}
}
function debit(r,value,references=0,hasValue=true,origin='driver'){
 if(!Number.isSafeInteger(references)||references<0){r.budgetFailed=true;poison(r);fail('BNS_GROUP_RESOURCE_LIMIT');}
 const beforeReferences=r.references,beforeBytes=r.bytes;
 r.references+=references+1;
 r.bytes+=measureSourceWorkingPhysicalTree({references,hasValue,origin},2*1024*1024).B;
 // Even a late result is accounted to its original action, not forgotten or
 // lent a fresh budget. This can fail but must not hide actual settlement.
 try{if(hasValue)r.bytes+=measureSourceWorkingPhysicalTree(value,2*1024*1024).B;}catch(error){r.accountingUnconfirmed=true;r.budgetFailed=true;poison(r);throw error;}finally{const charged=r.costAttribution.get(origin)??{references:0,bytes:0};charged.references+=r.references-beforeReferences;charged.bytes+=r.bytes-beforeBytes;r.costAttribution.set(origin,charged);}
 budget(r);return true;
}
// The native inspection path meters only adapter-created own-data views.
// Initial intrinsics prevent measurement/attribution from calling mutable
// prototype hooks between a paid original observation and its comparison.
function nativeBudget(r){
 const time=r.nativeClock?originalBootstrapNow():now();
 if(time>=r.deadline||r.references>4096||r.bytes>2*1024*1024||r.budgetFailed||r.tail&&(r.references-r.tail.startReferences>r.tail.references||r.bytes-r.tail.startBytes>r.tail.bytes)){r.budgetFailed=true;poison(r);fail('BNS_GROUP_RESOURCE_LIMIT');}
}
function nativeMeasure(r,value,complete=null){
 let visits=0;
 const bad=(code='BNS_SOURCE_WORKING_PHYSICAL_INVALID')=>{r.accountingUnconfirmed=true;r.budgetFailed=true;poison(r);if(complete!==null)throw new SyncError(code);fail('BNS_GROUP_RESOURCE_LIMIT');};
 // The optional private output preserves generic physical-meter semantics:
 // only a COMPLETE tree is later added to the existing action. It is not a
 // second action/budget, and the original native path still charges partials.
 const add=n=>{if(complete!==null){complete.bytes+=n;if(complete.bytes>2*1024*1024)bad('BNS_HUMAN_GRAPH_LIMIT');}else{r.bytes+=n;if(r.bytes>2*1024*1024)bad();}};
 const text=s=>{add(2);for(let i=0;i<s.length;i++){const c=originalBootstrapCharCode(s,i);if(c===34||c===92||c===8||c===9||c===10||c===12||c===13)add(2);else if(c<32)add(6);else if(c<128)add(1);else if(c<2048)add(2);else if(c>=0xd800&&c<=0xdbff){const next=originalBootstrapCharCode(s,++i);if(!(next>=0xdc00&&next<=0xdfff))bad('BNS_TEXT_ENCODING');add(4);}else if(c>=0xdc00&&c<=0xdfff)bad('BNS_TEXT_ENCODING');else add(3);}};
 const field=(v,k)=>{const d=originalBootstrapDescriptor(v,k);if(!d||!originalBootstrapHasOwn(d,'value')||!d.enumerable)bad();return d.value;};
 const visit=(v,depth)=>{
  if(++visits>200000||depth>32)bad('BNS_HUMAN_GRAPH_LIMIT');if(v===undefined){add(32);return;}if(v===null){add(4);return;}
  if(typeof v==='string'){text(v);return;}if(typeof v==='boolean'){add(v?4:5);return;}
  if(typeof v==='number'){if(!originalBootstrapFinite(v))bad();if(originalBootstrapSameValue(v,-0))add(32);else add(originalBootstrapNumberString(v).length);return;}
  if(!v||typeof v!=='object')bad();const array=originalBootstrapArrayIs(v),parent=originalBootstrapPrototype(v);
  if(array?!originalBootstrapArrayPrototype(parent):!originalBootstrapPlainPrototype(parent))bad();if(originalBootstrapSymbols(v).length)bad();const keys=originalBootstrapNames(v);add(2);
  if(array){const d=originalBootstrapDescriptor(v,'length');if(!d||!originalBootstrapHasOwn(d,'value')||!originalBootstrapSafeInteger(d.value)||d.value<0||d.value>4096||keys.length!==d.value+1)bad();for(let i=0;i<d.value;i++){if(i)add(1);visit(field(v,originalBootstrapNumberString(i)),depth+1);}return;}
  if(keys.length>128)bad('BNS_HUMAN_GRAPH_LIMIT');for(let i=0;i<keys.length;i++){if(i)add(1);const key=keys[i];text(key);add(1);visit(field(v,key),depth+1);}
 };
 visit(value,0);
}
function nativeDebit(r,value,references=0){
 const beforeReferences=r.references,beforeBytes=r.bytes;
 if(!originalBootstrapSafeInteger(references)||references<0){r.budgetFailed=true;poison(r);fail('BNS_GROUP_RESOURCE_LIMIT');}
 r.references+=references+1;
 try{nativeMeasure(r,{references,hasValue:true,origin:'native-profile'});nativeMeasure(r,value);}catch(error){r.budgetFailed=true;poison(r);throw error;}
 finally{const cost=originalBootstrapMapGet(r.costAttribution,'native-profile')??{references:0,bytes:0};cost.references+=r.references-beforeReferences;cost.bytes+=r.bytes-beforeBytes;originalBootstrapMapSet(r.costAttribution,'native-profile',cost);}
 nativeBudget(r);
}
function nativeOpportunity(context){
 const action=originalBootstrapWeakGet(actions,context),c=originalBootstrapWeakGet(coordinators,context),r=action??c?.active;
 if(!r||r.invalid||r.settled||r.coordinator!==context&&r.action!==context||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r)fail('GENERATION_SELECTION_CAPABILITY');nativeBudget(r);return r;
}
function nativeSlot(value){const kind=typeof value;return value!==null&&(kind==='object'||kind==='function'||kind==='symbol')?{view:{kind,opaque:true},references:1}:{view:{kind,value},references:0};}
function nativeDescriptorView(d){
 if(d===undefined)return {view:{present:false},references:0};const data=originalBootstrapHasOwn(d,'value');
 if(data){const slot=nativeSlot(d.value);return {view:{present:true,enumerable:d.enumerable,configurable:d.configurable,data:true,writable:d.writable,value:slot.view},references:slot.references};}
 const get=nativeSlot(d.get),set=nativeSlot(d.set);return {view:{present:true,enumerable:d.enumerable,configurable:d.configurable,data:false,get:get.view,set:set.view},references:get.references+set.references};
}
function nativeKey(key){if(typeof key==='string')return {kind:'string',value:key};if(originalBootstrapIteratorKey(key))return {kind:'well-known-symbol',value:'iterator'};fail('GENERATION_NATIVE_HOST_REQUIRED');}
function nativeProfile(context){return nativeInspection(context,false);}
function nativeInspection(context,localUse){
 const r=nativeOpportunity(context);if(r.nativeChecking)fail('GENERATION_SELECTION_BUSY');r.nativeChecking=true;let observedPending=false;
 try{
  const facts=localUse?readOriginalBootstrapLocalInspectionFacts():readOriginalBootstrapInspectionFacts();nativeDebit(r,{operation:localUse?'native-local-use-begin':'native-profile-begin',facts:facts.length},0);let previousNode=null,parent=null;
  for(let i=0;i<facts.length;i++){
   const f=facts[i],fresh=f.node!==previousNode;
   if(fresh){nativeDebit(r,{operation:'getPrototypeOf',index:i},1);observedPending=true;try{parent=originalBootstrapPrototype(f.node);}catch(error){nativeDebit(r,{operation:'getPrototypeOf-result',index:i,threw:true},0);poison(r);rejectOriginalBootstrapInspection();}previousNode=f.node;}
   const expectedParent=nativeSlot(f.parent),observedParent=nativeSlot(parent);
   nativeDebit(r,{operation:fresh?'getPrototypeOf-result':'same-node-parent-comparison',index:i,expected:expectedParent.view,observed:observedParent.view},expectedParent.references+observedParent.references);
   if(parent!==f.parent){poison(r);rejectOriginalBootstrapInspection();}observedPending=false;
   nativeDebit(r,{operation:'getOwnPropertyDescriptor',index:i,key:nativeKey(f.key)},1);let observed;
   observedPending=true;try{observed=originalBootstrapDescriptor(f.node,f.key);}catch(error){nativeDebit(r,{operation:'getOwnPropertyDescriptor-result',index:i,threw:true},0);poison(r);rejectOriginalBootstrapInspection();}
   const expected=nativeDescriptorView(f.descriptor),actual=nativeDescriptorView(observed);
   nativeDebit(r,{operation:'getOwnPropertyDescriptor-result',index:i,expected:expected.view,observed:actual.view},expected.references+actual.references);
   // Complete actual opaque/scalar operands were paid BEFORE comparison. The
   // result cannot be supplied by a caller or inferred from count/kind metadata.
   if(!originalBootstrapCompareDescriptor(observed,f.descriptor)){poison(r);rejectOriginalBootstrapInspection();}observedPending=false;
  }
  nativeBudget(r);return r;
 }catch(error){poison(r);if(observedPending)invalidateOriginalBootstrapInspection();throw error;}finally{r.nativeChecking=false;}
}
// Only adapter-created expected views enter this private freeze. Opaque INITIAL
// carriers are represented by slots, never recursively frozen or copied.
function freezeNativeLocalExpected(value){
 if(value===null||typeof value!=='object')return value;
 const keys=originalBootstrapNames(value);
 for(let i=0;i<keys.length;i++){const d=originalBootstrapDescriptor(value,keys[i]);if(!d||!originalBootstrapHasOwn(d,'value'))fail('GENERATION_NATIVE_HOST_REQUIRED');freezeNativeLocalExpected(d.value);}
 return originalBootstrapFreeze(value);
}
function compileNativeLocalFrame(r,facts){
 const bindings=[[originalBootstrapInitialLocal,'local-use-receiver'],[originalBootstrapInitialLocalGet,'local-use-get'],[originalBootstrapInitialLocalSet,'local-use-set']];
 const expected={operation:'native-local-frame-expected',bindings:[],parents:[],descriptors:[],consistency:[]};let references=0,requests=0,previous=null,previousParent=null;
 for(let i=0;i<bindings.length;i++){const b=bindings[i],slot=nativeSlot(b[0]);expected.bindings[i]={kind:b[1],expected:slot.view};references+=slot.references;}
 for(let i=0;i<facts.length;i++){
  const f=facts[i],parent=nativeSlot(f.parent),descriptor=nativeDescriptorView(f.descriptor);
  if(f.node!==previous){expected.parents[expected.parents.length]={index:i,expected:parent.view};references+=parent.references;requests++;}
  else{
   const prior=nativeSlot(previousParent);expected.consistency[expected.consistency.length]={index:i,expected:prior.view,observed:parent.view};references+=prior.references+parent.references;
  }
  expected.descriptors[i]={index:i,key:nativeKey(f.key),expected:descriptor.view};references+=descriptor.references;requests++;previous=f.node;previousParent=f.parent;
 }
 // Bootstrap froze this original array, each fact and each descriptor before
 // exposing them. Only their fixed expected construction/consistency is shared.
 // Pay the complete compiler input AND its owned immutable output on this r.
 nativeDebit(r,expected,references);
 for(let i=1;i<facts.length;i++)if(facts[i].node===facts[i-1].node&&facts[i].parent!==facts[i-1].parent){poison(r);rejectOriginalBootstrapInspection();}
 freezeNativeLocalExpected(expected);nativeDebit(r,expected,0);
 const frame=originalBootstrapFreeze({facts,expected,requests});r.nativeLocalFrame=frame;return frame;
}
function nativeLocalFrame(r){
 // This original validity check still runs EVERY boundary. A compiled frame
 // never suppresses bootstrap invalidation or adopts a replacement fact list.
 const facts=readOriginalBootstrapLocalInspectionFacts(),frame=r.nativeLocalFrame;
 if(frame){if(frame.facts!==facts)fail('GENERATION_NATIVE_HOST_REQUIRED');return frame;}
 if(r.tail)fail('GENERATION_SELECTION_CAPABILITY');return compileNativeLocalFrame(r,facts);
}
function nativeLocalPlan(frame,local,get,set){
 const actual=[local,get,set],pre={operation:'native-local-frame-admission',bindings:[],parentRequests:frame.expected.parents.length,descriptorRequests:frame.facts.length};let references=frame.requests;
 for(let i=0;i<actual.length;i++){const slot=nativeSlot(actual[i]);pre.bindings[i]={kind:frame.expected.bindings[i].kind,actual:slot.view};references+=slot.references;}
 return {frame,pre,references};
}
function nativeLocalResult(){return {value:{operation:'native-local-frame-result',parents:[],descriptors:[],completed:false},references:0};}
function nativeLocalParentResult(result,index,value){const slot=nativeSlot(value);result.value.parents[result.value.parents.length]={index,observed:slot.view};result.references+=slot.references;}
function nativeLocalDescriptorResult(result,index,value){const descriptor=nativeDescriptorView(value);result.value.descriptors[result.value.descriptors.length]={index,observed:descriptor.view};result.references+=descriptor.references;}
function nativeLocalInspection(r,local,get,set){
 if(r.nativeChecking||r.validationFrame)fail('GENERATION_SELECTION_BUSY');r.nativeChecking=true;let observedPending=false,resultDebitAttempted=false,nativeReadThrew=false;const result=nativeLocalResult();
 try{
  const frame=nativeLocalFrame(r),plan=nativeLocalPlan(frame,local,get,set),parents=[],descriptors=[];
  // This fixed prepayment admits just these original synchronous reads. It
  // never reports that the later observations already occurred.
  nativeDebit(r,plan.pre,plan.references);
  if(local!==originalBootstrapInitialLocal||get!==originalBootstrapInitialLocalGet||set!==originalBootstrapInitialLocalSet){poison(r);rejectOriginalBootstrapInspection();}
  let parentIndex=0;
  for(let i=0;i<frame.facts.length;i++){
   const f=frame.facts[i];
   if(parentIndex<frame.expected.parents.length&&frame.expected.parents[parentIndex].index===i){
    nativeBudget(r);observedPending=true;let parent;try{parent=originalBootstrapPrototype(f.node);}catch(error){nativeReadThrew=true;result.value.failure={operation:'getPrototypeOf',index:i,threw:true};throw error;}
    parents[parentIndex]=parent;nativeLocalParentResult(result,i,parent);parentIndex++;
   }
   nativeBudget(r);observedPending=true;let descriptor;try{descriptor=originalBootstrapDescriptor(f.node,f.key);}catch(error){nativeReadThrew=true;result.value.failure={operation:'getOwnPropertyDescriptor',index:i,threw:true};throw error;}
   descriptors[i]=descriptor;nativeLocalDescriptorResult(result,i,descriptor);
  }
  result.value.completed=true;resultDebitAttempted=true;nativeDebit(r,result.value,result.references);
  // Every ACTUAL result is paid before acceptance. Only original intrinsics
  // and private arrays run until the final original local-use fence.
  for(let i=0;i<frame.expected.parents.length;i++)if(parents[i]!==frame.facts[frame.expected.parents[i].index].parent){poison(r);rejectOriginalBootstrapInspection();}
  for(let i=0;i<frame.facts.length;i++)if(!originalBootstrapCompareDescriptor(descriptors[i],frame.facts[i].descriptor)){poison(r);rejectOriginalBootstrapInspection();}
  observedPending=false;nativeBudget(r);
 }catch(error){
  // A thrown read cannot erase preceding accepted observations. Never debit
  // the same partial result twice if its original metering already refused.
  if(observedPending&&!resultDebitAttempted){resultDebitAttempted=true;try{nativeDebit(r,result.value,result.references);}catch(accountingError){poison(r);invalidateOriginalBootstrapInspection();throw accountingError;}}
  poison(r);if(observedPending)invalidateOriginalBootstrapInspection();if(nativeReadThrew)rejectOriginalBootstrapInspection();throw error;
 }finally{r.nativeChecking=false;}
}
// These checks are consumed immediately by the ORIGINAL two core SDK sites.
// They return no capability/ready record and never invoke a supplied callback.
function nativeLocalBoundary(action,local,get,set,dispatch){
 const r=nativeOpportunity(action);if(r.action!==action||r.session===null||!r.pinned||dispatch&&(!r.dispatching||r.phase!=='dispatch-ready'))fail('GENERATION_SELECTION_CAPABILITY');
 const start={references:r.references,bytes:r.bytes};
 // Compare opaque retained operands BEFORE any descent. Even an injected
 // staged action must use this initial local; this cannot promote its origin.
 nativeLocalInspection(r,local,get,set);
 // The typed paid sweep and clock are callback-free under the initial-host
 // premise. Only private same-record facts follow it, never c.identities.
 if(r.invalid||r.settled||!r.pinned||r.action!==action||originalBootstrapWeakGet(actions,action)!==r||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r||dispatch&&(!r.dispatching||r.phase!=='dispatch-ready'))fail('GENERATION_SELECTION_CAPABILITY');
 checkedPrice(r,'local',start);
}
export function requireOriginalApplicationSelectionDriverLocal(action,local,get,set){if(arguments.length!==4)fail();nativeLocalBoundary(action,local,get,set,false);}
export function requireOriginalApplicationSelectionDriverLocalDispatch(action,local,get,set){if(arguments.length!==4)fail();nativeLocalBoundary(action,local,get,set,true);}
// Fixed original worker-source consumer. No caller can supply a fact view,
// arbitrary inspected node/field, callback, or a previous validation receipt.
function nativePrivateRequest(r,kind){nativeDebit(r,{operation:'worker-private-read',kind},0);}
function nativePrivateResult(r,kind,record,keys){
 const fields=originalBootstrapCreate(null);let references=0;if(record!==null)for(let i=0;i<keys.length;i++){const key=keys[i],slot=nativeSlot(record[key]);fields[key]=slot.view;references+=slot.references;}
 nativeDebit(r,{operation:'worker-private-result',kind,present:record!==null,fields},references);if(record===null)fail('GENERATION_NATIVE_HOST_REQUIRED');return record;
}
function nativeOwnData(r,node,key,expected){
 nativeDebit(r,{operation:'worker-own-data-request',key},1);let d;
 try{d=originalBootstrapDescriptor(node,key);}catch(error){nativeDebit(r,{operation:'worker-own-data-result',key,threw:true},0);throw error;}
 const present=d!==undefined,data=present&&originalBootstrapHasOwn(d,'value'),actual=nativeSlot(data?d.value:undefined),wanted=nativeSlot(expected);
 nativeDebit(r,{operation:'worker-own-data-result',key,present,data,actual:actual.view,expected:wanted.view},actual.references+wanted.references);
 if(!data||d.value!==expected)fail('GENERATION_NATIVE_HOST_REQUIRED');
}
function nativePrivatePair(r,kind,actual,expected){const a=nativeSlot(actual),b=nativeSlot(expected);nativeDebit(r,{operation:'worker-private-binding',kind,actual:a.view,expected:b.view},a.references+b.references);if(actual!==expected)fail('GENERATION_NATIVE_HOST_REQUIRED');}
function nativeService(r,service,store,kind){
 nativePrivateRequest(r,kind);const binding=nativePrivateResult(r,kind,readOriginalPromptServiceNativeStore(service),['store']);nativePrivatePair(r,kind+'-store',binding.store,store);
 // The original private class brand was proved BEFORE reflecting service.
 nativeOwnData(r,service,'s',store);
}
export function requireOriginalApplicationSelectionWorkerNativePrefix(context,worker,store){
 const r=nativeOpportunity(context),c=originalBootstrapWeakGet(coordinators,r.coordinator);
 if(!c||c.sources!==worker||c.store!==store||r.nativeWorkerChecking)fail('GENERATION_SELECTION_CAPABILITY');r.nativeWorkerChecking=true;
 try{
  nativeProfile(context);const api=originalBootstrapHostCarrier(),local=originalBootstrapLocalCarrier(),factory=originalBootstrapIndexedDBCarrier();
  nativePrivateRequest(r,'worker');const members=nativePrivateResult(r,'worker',readOriginalProductionWorkerNativeMembers(worker,store),['store','context','assist','next','prompt','surface']);
  nativePrivatePair(r,'worker-store',members.store,store);
  nativePrivateRequest(r,'store');const binding=nativePrivateResult(r,'store',readOriginalProductionStoreNativeBinding(store),['local','factory','repository']);
  nativePrivatePair(r,'store-local',binding.local,local);nativePrivatePair(r,'store-factory',binding.factory,factory);
  nativePrivateRequest(r,'repository-brand');const repositoryOriginal=isOriginalNativeArchiveRepository(binding.repository);nativeDebit(r,{operation:'worker-private-result',kind:'repository-brand',original:repositoryOriginal},0);if(!repositoryOriginal)fail('GENERATION_NATIVE_HOST_REQUIRED');
  // Only genuine constructor-owned nodes are reflection receivers. A public
  // replacement is compared as an opaque value and is NEVER traversed.
  nativeOwnData(r,store,'local',binding.local);nativeOwnData(r,store,'repository',binding.repository);nativeOwnData(r,binding.repository,'factory',binding.factory);
  nativePrivateRequest(r,'context');const contextFacts=nativePrivateResult(r,'context',readOriginalProductionContextNativeFacts(members.context,store),['disposed','store','host']);
  nativePrivateRequest(r,'context-startup');const contextHost=hasOriginalProductionStartupBinding(contextFacts.host,api);nativeDebit(r,{operation:'worker-private-result',kind:'context-startup',original:contextHost},0);if(contextFacts.disposed||!contextHost)fail('GENERATION_NATIVE_HOST_REQUIRED');
  nativePrivateRequest(r,'assist');const assist=nativePrivateResult(r,'assist',readOriginalProductionAssistNativeFacts(members.assist,store),['disposed','store','host','surface','session']);
  nativePrivateRequest(r,'assist-startup');const assistHost=hasOriginalProductionStartupBinding(assist.host,api);nativeDebit(r,{operation:'worker-private-result',kind:'assist-startup',original:assistHost},0);if(assist.disposed||!assistHost)fail('GENERATION_NATIVE_HOST_REQUIRED');
  nativeOwnData(r,members.assist,'store',store);nativeOwnData(r,members.assist,'api',assist.host);nativeOwnData(r,members.assist,'surface',assist.surface);nativeOwnData(r,members.assist,'session',assist.session);
  nativePrivateRequest(r,'next');const next=nativePrivateResult(r,'next',readOriginalProductionNextNativeFacts(members.next,store),['disposed','store','host','service','surface']);if(next.disposed)fail('GENERATION_NATIVE_HOST_REQUIRED');nativePrivatePair(r,'next-host',next.host,api);
  nativeOwnData(r,members.next,'api',api);nativeOwnData(r,members.next,'service',next.service);nativeOwnData(r,members.next,'surface',next.surface);nativeService(r,next.service,store,'next-service');
  nativePrivateRequest(r,'prompt');const prompt=nativePrivateResult(r,'prompt',readOriginalProductionPromptNativeFacts(members.prompt,store),['disposed','store','host','service']);if(prompt.disposed)fail('GENERATION_NATIVE_HOST_REQUIRED');nativePrivatePair(r,'prompt-host',prompt.host,api);
  nativeOwnData(r,members.prompt,'api',api);nativeOwnData(r,members.prompt,'service',prompt.service);nativeService(r,prompt.service,store,'prompt-service');
  nativePrivateRequest(r,'surface');const surface=nativePrivateResult(r,'surface',readOriginalProductionSurfaceNativeFacts(members.surface,store),['disposed','store','host','commands','service']);if(surface.disposed)fail('GENERATION_NATIVE_HOST_REQUIRED');nativePrivatePair(r,'surface-host',surface.host,api);nativePrivatePair(r,'surface-command',surface.commands,members.prompt);
  nativeOwnData(r,members.surface,'api',api);nativeOwnData(r,members.surface,'commands',surface.commands);nativeOwnData(r,surface.commands,'service',surface.service);nativeService(r,surface.service,store,'surface-service');
  nativeBudget(r);if(r.invalid||r.settled||c.active!==r)fail();return true;
 }catch(error){poison(r);throw error;}finally{r.nativeWorkerChecking=false;}
}
export function readOriginalSelectionNativeHost(context){nativeProfile(context);return originalBootstrapHostCarrier();}
export function readOriginalSelectionNativeRuntime(context){nativeProfile(context);return originalBootstrapRuntimeCarrier();}
export function readOriginalSelectionNativeLocal(context){nativeProfile(context);return originalBootstrapLocalCarrier();}
export function readOriginalSelectionNativeIndexedDB(context){nativeProfile(context);return originalBootstrapIndexedDBCarrier();}
// Same private record while original core action has not yet been attached.
export function readOriginalSelectionAdmissionDeadline(coordinator,lifecycle,owner){const c=originalBootstrapWeakGet(coordinators,coordinator),r=c?.active;if(!r||c.lifecycle!==lifecycle||c.starting!==owner||r.owner!==owner||r.action!==null||r.phase!=='admission'||r.invalid)fail();budget(r);return r.deadline;}
export function chargeOriginalSelectionAdmissionWork(coordinator,lifecycle,owner,value,references=0){readOriginalSelectionAdmissionDeadline(coordinator,lifecycle,owner);return debit(originalBootstrapWeakGet(coordinators,coordinator).active,value,references);}
// Actual accepted copy result: record it on the same original ledger BEFORE
// deadline/invalidity refusal. This never admits a new request or a caller flag.
export function chargeOriginalSelectionAdmissionResult(coordinator,lifecycle,owner,value){const c=originalBootstrapWeakGet(coordinators,coordinator),r=c?.active;if(!r||c.lifecycle!==lifecycle||c.starting!==owner||r.owner!==owner||r.action!==null||r.phase!=='admission'||!r.lifecycleStarted||!r.holdAccepted||r.settled)fail();debit(r,value,0);if(r.invalid)fail();return true;}

// Restrict-only acceptance notification: a subsequent failure must not forget
// the original core hold merely because the session has not returned yet.
export function noteOriginalSelectionAdmissionHold(coordinator,lifecycle,owner){const c=originalBootstrapWeakGet(coordinators,coordinator),r=c?.active;if(!r||c.lifecycle!==lifecycle||c.starting!==owner||r.owner!==owner||r.action!==null||r.phase!=='admission')fail();r.holdAccepted=true;}


function member(action,owner,kind){const r=original(action);if(r.members.get(owner)!==kind)fail();return r;}
function track(r,promise,memberWork=false){
 if(r.settled)fail();let settled=false;r.pending.add(promise);if(memberWork)r.memberPending.add(promise);
 const done=()=>{if(settled)return;settled=true;r.pending.delete(promise);r.memberPending.delete(promise);for(const wake of r.waiters)wake();};
 try{observe(promise,done,done);}catch(error){r.unobservable=true;poison(r);throw error;}
 // A validation frame cannot accept new business. Already accepted work is
 // nevertheless retained/observed before invalidation; never pretend it ended.
 if(r.validationFrame)poison(r);return promise;
}
export function requireOriginalApplicationSelectionMember(action,owner,kind){const r=member(action,owner,kind);current(r);return Object.freeze({deadline:r.deadline});}
// Validation-only original provenance. No other member/repository/native/phase
// entry consumes this frame, and no frame survives its synchronous holder call.
export function requireOriginalApplicationSelectionValidationMember(frame,action,owner,kind){
 const f=originalBootstrapWeakGet(validationFrames,frame),r=originalBootstrapWeakGet(actions,action);
 if(arguments.length!==4||!f||!f.active||f.r!==r||!r||f.action!==action||r.action!==action||r.validationFrame!==frame||!r.checkingFacts||f.phase!==r.phase||originalBootstrapMapGet(r.members,owner)!==kind)fail();
 budget(r);
 if(r.invalid||r.settled||!r.pinned||!r.held||originalBootstrapSetSize(r.memberPending)||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r)fail('GENERATION_WORKER_NOT_QUIET');
 return originalBootstrapFreeze({deadline:r.deadline});
}
export function chargeOriginalApplicationSelectionMember(action,owner,kind,value,references=0){return debit(member(action,owner,kind),value,references,true,'member:'+kind);}
export function trackOriginalApplicationSelectionMemberWork(action,owner,kind,promise){return track(member(action,owner,kind),promise,true);}
export function invalidateOriginalApplicationSelectionMember(action,owner,kind){return poison(member(action,owner,kind));}
export function originalApplicationSelectionMemberPinned(action,owner,kind){const r=member(action,owner,kind);return r.pinned;}
export function requireOriginalApplicationSelectionRepositoryWork(action,repository){const r=original(action);if(!r.repositories.has(repository))fail();current(r);if(r.validationFrame){poison(r);fail();}return Object.freeze({deadline:r.deadline});}
export function requireOriginalApplicationSelectionRepositoryPhaseWork(action,repository,phase,scope){
 const r=original(action);if(!r.repositories.has(repository))fail();requirePhaseFacts(phase,repository,scope,action);allHeld(r);requirePhaseFacts(phase,repository,scope,action);return true;
}
export function chargeOriginalApplicationSelectionRepositoryWork(action,repository,value,references=0,hasValue=true){const r=original(action);if(!r.repositories.has(repository))fail();return debit(r,value,references,hasValue,r.repositoryRoles.get(repository));}
// Fixed scalar bookkeeping only, not a native admission or writer token. The
// original IDB owner establishes its genuine staged scope and full phase guard
// BEFORE this closed segment. Unsupported/non-string requests keep that owner's
// generic path; no caller flag or scope hint can select this private action.
export function chargeOriginalApplicationSelectionRepositoryStringPair(action,repository,table,key){
 if(arguments.length!==4||typeof table!=='string'||typeof key!=='string')fail();
 const r=originalBootstrapWeakGet(actions,action);
 if(!r||r.action!==action||!r.nativeClock||r.invalid||r.settled||!r.pinned||!r.held||r.validationFrame||r.nativeChecking||!originalBootstrapSetHas(r.repositories,repository)||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r)fail();
 const origin=originalBootstrapMapGet(r.repositoryRoles,repository);
 if(origin!=='repository:source'&&origin!=='repository:target'&&origin!=='repository:registry')fail();
 // nativeClock was fixed at action birth from the INITIAL supported host.
 // Both checks use only the captured original monotonic clock. The complete
 // tuple and its original-origin wrapper retain q=1, hence two action refs.
 nativeBudget(r);r.nativeChecking=true;
 try{
  const beforeReferences=r.references,beforeBytes=r.bytes,header={bytes:0},operand={bytes:0},envelope={references:1,hasValue:true,origin};r.references+=2;
  try{
   // Preserve the original physical meter's Object.prototype.value refusal.
   // The intrinsic prototype comes from this actual own-created literal, not
   // a mutable global Object binding. No callback runs between the two trees.
   if(originalBootstrapDescriptor(originalBootstrapPrototype(envelope),'value')!==undefined)throw new SyncError('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
   nativeMeasure(r,envelope,header);r.bytes+=header.bytes;nativeMeasure(r,[table,key],operand);r.bytes+=operand.bytes;
  }
  catch(error){r.accountingUnconfirmed=true;r.budgetFailed=true;poison(r);throw error;}
  finally{const cost=originalBootstrapMapGet(r.costAttribution,origin)??{references:0,bytes:0};cost.references+=r.references-beforeReferences;cost.bytes+=r.bytes-beforeBytes;originalBootstrapMapSet(r.costAttribution,origin,cost);}
  nativeBudget(r);return operand.bytes;
 }finally{r.nativeChecking=false;}
}
export function trackOriginalApplicationSelectionRepositoryWork(action,repository,promise){const r=original(action);if(!r.repositories.has(repository))fail();return track(r,promise);}
export function trackOriginalApplicationSelectionDriverWork(action,promise){return track(original(action),promise);}
export function chargeOriginalApplicationSelectionDriverWork(action,value,references=0){const r=original(action);return debit(r,value,references);}
// An original repository group is an accounting handle only. Its IDB-private
// meter window proves the SAME scope/action and the bounded original key list;
// no caller can mint it, supply a cost, or use it to admit a native operation.
export function beginOriginalApplicationSelectionPointGroup(action,repository,scope,group){
 if(arguments.length!==4||originalBootstrapWeakHas(pointGroups,group))fail();
 const r=originalBootstrapWeakGet(actions,action),count=readOriginalApplicationSelectionPointGroup(group,action,repository,scope);
 if(!r||r.action!==action||r.invalid||r.settled||!originalBootstrapSetHas(r.repositories,repository)||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r||!originalBootstrapSafeInteger(count)||count<1||count>6)fail();
 const origin=originalBootstrapMapGet(r.repositoryRoles,repository);
 if(origin!=='repository:source'&&origin!=='repository:target'&&origin!=='repository:registry')fail();
 budget(r);originalBootstrapWeakSet(pointGroups,group,{r,repository,scope,count,origin,active:true,queries:0,results:0,references:0,bytes:0,resultHeader:false});
}
function originalPointGroup(group){
 const b=originalBootstrapWeakGet(pointGroups,group);
 if(!b||!b.active||originalBootstrapWeakGet(actions,b.r.action)!==b.r||readOriginalApplicationSelectionPointGroup(group,b.r.action,b.repository,b.scope)!==b.count)fail();
 return b;
}
function pointGroupPhysical(b,value){
 try{const bytes=measureSourceWorkingPhysicalTree(value,2*1024*1024).B;b.r.bytes+=bytes;b.bytes+=bytes;return bytes;}
 catch(error){b.r.accountingUnconfirmed=true;b.r.budgetFailed=true;poison(b.r);throw error;}
}
function pointGroupHeader(b,references){
 b.r.references+=references+1;b.references+=references+1;
 pointGroupPhysical(b,{references,hasValue:true,origin:b.origin});
}
export function chargeOriginalApplicationSelectionPointGroupQuery(group,index,key){
 if(arguments.length!==3||typeof key!=='string')fail();const b=originalPointGroup(group),r=b.r;
 if(!originalBootstrapSafeInteger(index)||index!==b.queries||index>=b.count||r.invalid||r.settled)fail();budget(r);b.queries++;
 // Pay this finite original query plan once, including requests that a later
 // refusal may prevent. Each tuple is still measured immediately BEFORE its
 // own actual native call, never flattened/nested into a different tree limit.
 if(index===0)pointGroupHeader(b,b.count);
 const bytes=pointGroupPhysical(b,['meta',key]);budget(r);return bytes;
}
export function chargeOriginalApplicationSelectionPointGroupResult(group,index,value){
 if(arguments.length!==3)fail();const b=originalPointGroup(group);
 if(!originalBootstrapSafeInteger(index)||index<0||index>=b.queries||b.results&(1<<index))fail();b.results|=1<<index;
 // No invalidity/deadline check can hide an ALREADY accepted raw result. Every
 // result keeps its original independent physical root, even after a sibling
 // failed; the original IDB driver still drains every accepted request.
 if(!b.resultHeader){b.resultHeader=true;pointGroupHeader(b,0);}
 const bytes=pointGroupPhysical(b,value);budget(b.r);return bytes;
}
export function finishOriginalApplicationSelectionPointGroup(group){
 if(arguments.length!==1)fail();const b=originalPointGroup(group);b.active=false;
 // Only this group's own two bookkeeping batches are attributed here. Other
 // same-action/reentrant work cannot be absorbed through a counter delta.
 if(b.references||b.bytes){const cost=originalBootstrapMapGet(b.r.costAttribution,b.origin)??{references:0,bytes:0};cost.references+=b.references;cost.bytes+=b.bytes;originalBootstrapMapSet(b.r.costAttribution,b.origin,cost);}
}
// Only the two ORIGINAL lifecycle binding observations in one synchronous
// allHeld call share this bookkeeping. Each complete payload remains a fresh,
// independently bounded physical root, paid BEFORE its original comparison.
// The opaque batch never reaches a host/member callback or an awaited task;
// ordinary/reentrant work still calls the ordinary debit, with its own wrapper.
export function chargeOriginalApplicationSelectionBindingBatch(action,batch,value){
 const b=originalBootstrapWeakGet(bindingBatches,batch),r=originalBootstrapWeakGet(actions,action);
 if(arguments.length!==3||!b||!b.active||b.r!==r||!r||r.bindingBatch!==batch||r.action!==action||b.phase!==r.phase||b.consumed!==b.expected||b.expected>1||r.invalid||r.settled||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r)fail();
 b.consumed++;
 const physical=operand=>{const bytes=measureSourceWorkingPhysicalTree(operand,2*1024*1024).B;r.bytes+=bytes;b.bytes+=bytes;};
 try{
  if(b.consumed===1){r.references++;b.references++;physical({references:0,hasValue:true,origin:'driver'});}
  physical(value);
 }catch(error){r.accountingUnconfirmed=true;r.budgetFailed=true;poison(r);throw error;}
 budget(r);return true;
}
export function requireOriginalApplicationSelectionDriverDispatch(action){const r=original(action);if(!r.tail||!r.dispatching||r.phase!=='dispatch-ready')fail();allHeld(r);return true;}
export function readOriginalApplicationSelectionPhase(ticket,repository,authority,stores){
 const p=phases.get(ticket);if(!p||p.repository!==repository||p.authority!==authority||p.scope||p.finished||stores.length!==p.stores.length||stores.some((value,i)=>value!==p.stores[i]))fail();
 const r=original(p.action);allHeld(r);const a=readOriginalApplicationSelectionAuthority(authority,repository,null);if(a?.action!==p.action||a.phase!==p.phase)fail();return Object.freeze({action:p.action,signal:readOriginalApplicationSelectionAction(p.action).signal});
}
export function bindOriginalApplicationSelectionPhaseScope(ticket,repository,scope){
 const p=phases.get(ticket);if(!p||p.repository!==repository||p.scope||p.finished)fail();requireRepositoryTransactionScope(repository,scope);p.scope=scope;requireOriginalApplicationSelectionPhaseScope(ticket,repository,scope);
 // In addition to the mandatory private idb phase facts, the CLOSED-over
 // original driver retains this same-scope final read fence. No caller fn.
 const fence=originalBootstrapFreeze({isCurrent:()=>{requirePhaseFacts(ticket,repository,scope);return true;},plan:function*(){return true;}});
 originalBootstrapWeakSet(phaseFinalFences,fence,{ticket,repository,scope});
 registerRepositoryFinalReadFence(repository,scope,fence);return true;
}
// Descriptive provenance of this ORIGINAL issuer only. Neither public fields,
// function names nor a caller's copied descriptor can identify the phase fence.
// The repository still runs its original isCurrent predicate; this query never
// substitutes for that predicate, a full phase guard or native completion.
export function readOriginalApplicationSelectionPhaseFinalFence(fence,repository,scope){
 if(arguments.length!==3)fail();const p=originalBootstrapWeakGet(phaseFinalFences,fence);if(!p)return false;
 if(p.repository!==repository||p.scope!==scope)fail();requirePhaseFacts(p.ticket,repository,scope);return true;
}
function requirePhaseFacts(ticket,repository,scope,action=null){
 const p=phases.get(ticket);if(!p||p.finished||p.repository!==repository||p.scope!==scope||action!==null&&p.action!==action)fail();const r=original(p.action);
 if(!r.repositories.has(repository)||r.invalid||r.settled||r.validationFrame||originalBootstrapWeakGet(coordinators,r.coordinator)?.active!==r)fail();budget(r);requireRepositoryTransactionScope(repository,scope);
 const a=readOriginalApplicationSelectionAuthority(p.authority,repository,scope);if(a?.action!==p.action||a.phase!==p.phase||a.scope!==scope||p.finished||r.invalid||r.settled)fail();return r;
}
export function requireOriginalApplicationSelectionPhaseScope(ticket,repository,scope){
 const r=requirePhaseFacts(ticket,repository,scope);allHeld(r);requirePhaseFacts(ticket,repository,scope);return true;
}
function allHeld(r){
 const start={references:r.references,bytes:r.bytes};if(r.checkingFacts||r.validationFrame||r.bindingBatch)fail('GENERATION_SELECTION_CAPABILITY');
 const batch=originalBootstrapFreeze(originalBootstrapCreate(null)),b={r,phase:r.phase,active:true,expected:0,consumed:0,references:0,bytes:0};originalBootstrapWeakSet(bindingBatches,batch,b);r.bindingBatch=batch;
 let frame=null,f=null;
 try{
  current(r,false,batch);if(b.consumed!==1)fail();if(!r.held||r.memberPending.size)fail('GENERATION_WORKER_NOT_QUIET');
  frame=originalBootstrapFreeze(originalBootstrapCreate(null));f={r,action:r.action,phase:r.phase,active:true};originalBootstrapWeakSet(validationFrames,frame,f);r.validationFrame=frame;r.checkingFacts=true;
  if(!r.holdersCurrent(frame))fail('GENERATION_WORKER_NOT_QUIET');
  // No callback during the outer final check can reuse an earlier holder's
  // frame. Default current still calls the host; only this original final
  // check uses facts, preserving the original one-host-callback A contract.
  f.active=false;r.validationFrame=null;b.expected=1;current(r,true,batch);if(b.consumed!==2)fail();if(r.memberPending.size)fail('GENERATION_WORKER_NOT_QUIET');checkedPrice(r,'held',start);return true;
 }catch(error){poison(r);throw error;}finally{
  b.active=false;if(r.bindingBatch===batch)r.bindingBatch=null;originalBootstrapWeakDelete(bindingBatches,batch);
  // Attribute only this batch's own charges, not a counter delta that could
  // accidentally absorb separately paid reentrant/member work.
  if(b.references||b.bytes){const cost=originalBootstrapMapGet(r.costAttribution,'driver')??{references:0,bytes:0};cost.references+=b.references;cost.bytes+=b.bytes;originalBootstrapMapSet(r.costAttribution,'driver',cost);}
  if(f)f.active=false;if(frame){if(r.validationFrame===frame)r.validationFrame=null;originalBootstrapWeakDelete(validationFrames,frame);}r.checkingFacts=false;
 }
}
async function runPhase(r){
 allHeld(r);const start={references:r.references,bytes:r.bytes},domain=r.session.portal.next(r.action),ticket=Object.freeze(Object.create(null));phases.set(ticket,{action:r.action,...domain,scope:null,finished:false});
 let scope;await originalStagedApplicationSelectionTransaction(domain.repository,domain.authority,ticket,async tx=>{scope=tx;allHeld(r);return r.session.portal.apply(r.action,domain.authority,tx);},domain.stores);
 const native=readOriginalCommittedTransactionWork(domain.repository,scope);r.session.portal.committed(r.action,domain.authority,scope);phases.get(ticket).finished=true;debit(r,{operation:'original-phase-settled',phase:domain.phase,native:{references:native.references,bytes:native.bytes}},1);r.costs.set(domain.phase,Object.freeze({references:r.references-start.references,bytes:r.bytes-start.bytes}));return true;
}

async function measuredPreparation(r,kind,operation){const before={references:r.references,bytes:r.bytes};const result=await operation();debit(r,{operation:'original-preparation-settled',kind},1);r.costs.set(kind,Object.freeze({references:r.references-before.references,bytes:r.bytes-before.bytes}));return result;}
const tailRetirementWork=Object.freeze({operation:'original-selection-retire',entry:true,review:true,repositoryCloses:2,consumeOnce:true});
function prepayOriginalSelectionRetirement(r){
 // Fixed restrict-only cleanup is funded before any original hold is accepted.
 // This is explicitly prepaid work, not a report that cleanup already ran.
 // No expiration can turn it into a new read/write or a release of owner pins.
 if(r.retirementPrepaid||r.holdAccepted||r.lifecycleStarted)fail();
 debit(r,tailRetirementWork,4,true,'retirement-prepaid');r.retirementPrepaid=true;
}
const tailReceiptWork=Object.freeze({operation:'original-tail-receipt',retired:true,consumptions:1});
function originalTailPrice(r){
 // One private planning batch, not two independent debit bookkeepings. Its
 // complete operand AND complete future wrapper are each physically visited
 // and paid on this action. No external value or price is cached across calls.
 // Measure each tree at its ORIGINAL root: nesting them in a pair would change
 // the depth/node limits. The batch has only one actual bookkeeping wrapper.
 const physical=value=>{try{const bytes=measureSourceWorkingPhysicalTree(value,2*1024*1024).B;r.bytes+=bytes;return bytes;}catch(error){r.accountingUnconfirmed=true;r.budgetFailed=true;poison(r);throw error;}};
 return (value,references=0,origin='driver')=>{
  if(!Number.isSafeInteger(references)||references<0)fail('BNS_GROUP_RESOURCE_LIMIT');
  const beforeReferences=r.references,beforeBytes=r.bytes;let bytes=0;r.references+=references+1;
  try{
   physical({references,hasValue:true,origin:'tail-plan'});
   bytes=physical(value);budget(r);
   bytes+=physical({references,hasValue:true,origin});budget(r);
  }finally{const charged=r.costAttribution.get('tail-plan')??{references:0,bytes:0};charged.references+=r.references-beforeReferences;charged.bytes+=r.bytes-beforeBytes;r.costAttribution.set('tail-plan',charged);}
  // The FUTURE debit still has its full original wrapper and original tariff.
  return Object.freeze({references:references+1,bytes});
 };
}
function originalLocalBoundaryPrice(r,price){
 const frame=r.nativeLocalFrame;
 // Only a frame already compiled and paid by this actual action's consumer
 // can supply the fixed request plan. Quoting never compiles one for free.
 if(!frame||frame.facts!==readOriginalBootstrapLocalInspectionFacts())fail('GENERATION_SELECTION_CAPABILITY');
 const plan=nativeLocalPlan(frame,originalBootstrapInitialLocal,originalBootstrapInitialLocalGet,originalBootstrapInitialLocalSet),result=nativeLocalResult();
 // Same dynamic operand/result builders as every actual sweep. Both complete
 // planning roots are paid here; the earlier compiler is not future work.
 const before=price(plan.pre,plan.references,'native-profile');
 for(let i=0;i<frame.expected.parents.length;i++){const index=frame.expected.parents[i].index;nativeLocalParentResult(result,index,frame.facts[index].parent);}
 for(let i=0;i<frame.facts.length;i++)nativeLocalDescriptorResult(result,i,frame.facts[i].descriptor);
 result.value.completed=true;const after=price(result.value,result.references,'native-profile');return Object.freeze({references:before.references+after.references,bytes:before.bytes+after.bytes});
}
function reserveOriginalTerminalTail(r){
 if(r.tail||r.phase!=='dispatch-ready'||r.pending.size||r.memberPending.size)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');
 const fixedCheck=check=>{const start={references:r.references,bytes:r.bytes};check(r);return Object.freeze({references:r.references-start.references,bytes:r.bytes-start.bytes});};
 // These are exact prices of the held complete-equality checks, NOT a sampled
 // earlier phase multiplier. Future successful checks must stay within them.
 const currentCost=fixedCheck(current),heldCost=fixedCheck(allHeld),price=originalTailPrice(r);
 const normalLocalBoundaryCost=originalLocalBoundaryPrice(r,price);
 const plan=buildOriginalApplicationSelectionTailPlan({...r.session.portal.tailInput(r.action),currentCost,heldCost,normalLocalBoundaryCost},price);
 if(!r.retirementPrepaid||r.retirementConsumed)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');
 const receipt=price(tailReceiptWork,2);
 const references=plan.references+receipt.references,bytes=plan.bytes+receipt.bytes;
 if(!Number.isSafeInteger(references)||references<1||!Number.isSafeInteger(bytes)||bytes<1)fail('BNS_GROUP_RESOURCE_LIMIT');
 debit(r,{operation:'original-tail-reserve',profile:plan.profile,references,bytes},1);
 if(r.references+references>4096||r.bytes+bytes>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 r.tail={references,bytes,startReferences:r.references,startBytes:r.bytes,checks:{current:currentCost,held:heldCost,local:normalLocalBoundaryCost},receipt:null,consumed:false};return true;
}
// Consume only the fixed same-action prepayment. In particular this does not
// call current/budget after expiry, grant new work, or unpin failed owners.
// The legacy export name is retained for the original lifecycle consumer.
export function chargeOriginalApplicationSelectionRetirement(action){const r=original(action);requireOriginalApplicationSelectionDriverSettlement(action);if(!r.retirementPrepaid||r.retirementConsumed)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');r.retirementConsumed=true;return true;}
function settleOriginalTerminalTail(r){
 if(!r.tail||r.tail.receipt||r.tail.consumed||r.invalid||r.accountingUnconfirmed||r.unobservable||!r.retired||!r.runDone||r.pending.size||r.memberPending.size||r.phase!=='terminal')fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');
 // Fixed self-cost includes creation, read and this one consume. No recursive
 // final-counter write, portable receipt, renewed ticket or cold authority.
 debit(r,tailReceiptWork,2);r.tail.receipt=originalBootstrapFreeze(originalBootstrapCreate(null));return r.tail.receipt;
}
function consumeOriginalTerminalTail(r,receipt){
 if(!r.tail||!receipt||r.tail.receipt!==receipt||r.tail.consumed||r.invalid||r.accountingUnconfirmed||r.unobservable||!r.retired||r.pending.size||r.memberPending.size)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');
 budget(r);r.tail.consumed=true;return true;
}
export function readOriginalApplicationSelectionCoordinator(coordinator){
 const c=originalBootstrapWeakGet(coordinators,coordinator);if(!c)fail();const r=c.lastOpportunity;
 // Read-only original accounting, never an action/phase/receipt capability.
 // It makes a failed concrete local composition diagnosable without rewriting
 // the module or inventing a success DTO in its test graph.
 const accounting=r?Object.freeze({phase:r.phase,references:r.references,bytes:r.bytes,started:r.started,deadline:r.deadline,invalid:r.invalid,budgetFailed:r.budgetFailed,accountingUnconfirmed:r.accountingUnconfirmed,unobservable:r.unobservable,pending:r.pending.size,memberPending:r.memberPending.size,runDone:r.runDone,settled:r.settled,retired:r.retired,retirementPrepaid:r.retirementPrepaid,retirementConsumed:r.retirementConsumed,cleanup:r.session?.retirementStatus()??null,receiptConsumed:r.tail?.consumed===true,costAttribution:Object.freeze(Object.fromEntries([...r.costAttribution].map(([name,value])=>[name,Object.freeze({...value})]))),tail:r.tail?Object.freeze({reservedReferences:r.tail.references,reservedBytes:r.tail.bytes,consumed:r.tail.consumed}):null}):null;
 return Object.freeze({selection:c.selection,store:c.store,api:c.api,lifecycle:c.lifecycle,localComposition:c.localComposition,accounting});
}
export function requireOriginalApplicationSelectionCoordinatorStart(coordinator,lifecycle,owner){const c=originalBootstrapWeakGet(coordinators,coordinator);if(!c||c.lifecycle!==lifecycle||c.starting!==owner||!c.active||c.active.owner!==owner||c.active.action!==null||c.active.phase!=='admission'||c.active.invalid)fail();return true;}
export function requireOriginalApplicationSelectionDriverSettlement(action){const r=original(action);if(!r.runDone||r.pending.size||r.unobservable)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');return true;}
function createReservationCoordination({store,api,lifecycle,editors,transports,localTools,activity,selection},origin){
 const localComposition=isInjectedLocalApplicationSelectionCommands(selection,api,activity);
 if(localComposition&&(origin!==injectedOrigin||!isInjectedLocalSyncSelectionLifecycle(lifecycle,store,api)))fail();
 const members=readOriginalApplicationSelectionTransportMembers(transports,store,api),sources=members.sourceCoordination,capture=members.captureRecovery,receipts=members.promptInsertionReceipts;
 const originals=[{owner:editors,kind:'editor'},{owner:transports,kind:'transport'},{owner:receipts,kind:'receipt'},{owner:sources,kind:'sources'},{owner:capture,kind:'capture'},{owner:localTools,kind:'local-tools'},...readOriginalApplicationSelectionSourceMembers(sources,store),...readOriginalApplicationSelectionLocalToolMembers(localTools,store,api.runtime)];
 const productionCurrent=()=>origin!==productionOrigin||(isProductionApplicationStore(store)&&isProductionConfiguredSyncLifecycle(lifecycle,store)&&isProductionApplicationSelectionCommands(selection,activity)&&isProductionApplicationEditorGuard(editors)&&isProductionApplicationTransportCoordination(transports,store)&&isProductionApplicationLocalToolsCoordination(localTools,store));
 const identities=()=>productionCurrent()&&(!localComposition||isInjectedLocalApplicationSelectionCommands(selection,api,activity)&&isInjectedLocalSyncSelectionLifecycle(lifecycle,store,api))&&isOriginalApplicationSelectionCommands(selection,api,activity)&&isOriginalApplicationEditorGuard(editors,api)&&isOriginalApplicationTransportCoordination(transports,store,api)&&isOriginalApplicationWorkerCoordination(sources,store)&&isOriginalCaptureRecovery(capture,api)&&isOriginalPromptInsertionReceipts(receipts,store,api)&&isOriginalApplicationLocalToolsCoordination(localTools,store,api.runtime);
 if(!identities())fail();const coordinator=originalBootstrapFreeze(originalBootstrapCreate(null));originalBootstrapWeakSet(coordinators,coordinator,{store,api,lifecycle,origin,localComposition,editors,transports,localTools,activity,selection,sources,originals,identities,starting:null,active:null,lastOpportunity:null,opportunities:originalBootstrapWeakMap(),controls:originalBootstrapWeakMap()});return coordinator;
}
function accepted(r,invoke){try{return track(r,invoke());}catch(error){const refused=new OriginalPromise((_,reject)=>reject(error));observe(refused,()=>{},()=>{});return refused;}}
function waitActual(r){return new OriginalPromise(resolve=>{const check=()=>{if(!r.pending.size){r.waiters.delete(check);resolve();}};r.waiters.add(check);check();});}
function settleOriginalApplicationSelectionTerminal(r,session,actual){
 return new OriginalPromise((resolve,reject)=>{
  const finish=(value,failed)=>{observe(waitActual(r),()=>{
   let failure=value,hasFailure=failed;
   try{if(!failed){allHeld(r);if(r.pending.size||r.memberPending.size||r.unobservable)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');}}catch(reason){poison(r);if(!hasFailure){failure=reason;hasFailure=true;}}
   // Cleanup is independent of the success receipt. Retain the original
   // failure even if its cleanup also refuses; an unknown raw promise still
   // retains all pins and never pretends to have settled.
   try{if(!r.unobservable){if(session&&session.retire()!==true)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');r.retired=true;}}catch(reason){poison(r);if(!hasFailure){failure=reason;hasFailure=true;}}
   observe(waitActual(r),()=>{
    try{
     if(!r.unobservable)r.settled=true;
     if(hasFailure){reject(failure);return;}
     // Only the original terminal Promise consumes the same-action receipt,
     // after retire AND any work it accepted have actually drained.
     const receipt=settleOriginalTerminalTail(r);consumeOriginalTerminalTail(r,receipt);resolve(value);
    }catch(reason){poison(r);reject(reason);}
   },reason=>{poison(r);reject(hasFailure?failure:reason);});
  },reject);};
  observe(actual,value=>finish(value,false),error=>finish(error,true));
 });
}
export function runOriginalApplicationSelectionAction(coordinator,selection,owner,control){
 const c=originalBootstrapWeakGet(coordinators,coordinator);
 if(!c||c.selection!==selection||c.active||c.starting)fail();
 let invocation;try{invocation=requireOriginalApplicationSelectionInvocation(selection,control,owner,coordinator);}catch(error){
  // Preserve the original direct-production refusal for a non-invocation.
  // No ledger or host work is born from an invalid tuple.
  if(c.origin===productionOrigin&&originalBootstrapDescriptor(error,'code')?.value==='GENERATION_SELECTION_CAPABILITY')fail('GENERATION_NATIVE_HOST_ACCOUNTING_UNAVAILABLE');throw error;
 }
 if(originalBootstrapWeakHas(c.opportunities,owner)||originalBootstrapWeakHas(c.controls,control))fail('GENERATION_SELECTION_OPPORTUNITY_SPENT');
 // Birth precedes every callback-capable identity/probe and lifecycle entry.
 // The accepted prepared owner AND control stay spent even if no core action
 // can be attached. A fresh dispatch is not a fresh prepared opportunity.
 const r={action:null,session:null,coordinator,owner,control,started:null,deadline:0,nativeClock:originalBootstrapHostSupported(),nativeLocalFrame:null,phase:'admission',members:originalBootstrapMap(),repositories:originalBootstrapSet(),repositoryRoles:originalBootstrapMap(),costAttribution:originalBootstrapMap(),references:0,bytes:0,budgetFailed:false,accountingUnconfirmed:false,tail:null,retired:false,retirementPrepaid:false,retirementConsumed:false,invalid:false,settled:false,pinned:true,unobservable:false,pending:originalBootstrapSet(),memberPending:originalBootstrapSet(),waiters:originalBootstrapSet(),costs:originalBootstrapMap(),runDone:false,checkingFacts:false,validationFrame:null,bindingBatch:null,held:false,holdAccepted:false,lifecycleStarted:false,dispatching:false,identities:null};
 c.starting=owner;c.active=r;c.lastOpportunity=r;originalBootstrapWeakSet(c.opportunities,owner,r);originalBootstrapWeakSet(c.controls,control,r);
 let session=null,action=null;
 const actual=(async()=>{
  try{
   r.started=r.nativeClock?originalBootstrapNow():now();if(!originalBootstrapFinite(r.started))fail('BNS_GROUP_RESOURCE_LIMIT');r.deadline=r.started+30000;
   if(c.origin===productionOrigin){
    // This fixed original inspection is paid by the SAME accepted opportunity.
    // Full owner-validation propagation is not yet qualified. Keep the
    // independent production/lifecycle refusal BEFORE any acquisition.
    requireOriginalApplicationSelectionWorkerNativePrefix(coordinator,c.sources,c.store);fail('GENERATION_NATIVE_HOST_ACCOUNTING_UNAVAILABLE');
   }
   debit(r,{operation:'selection-opportunity-birth',phase:r.phase},1);prepayOriginalSelectionRetirement(r);
   if(!c.identities())fail();budget(r);
   r.lifecycleStarted=true;session=openOriginalSyncSelectionAction(c.lifecycle,coordinator,owner);
   readOriginalSyncSelectionActionSession(session,coordinator);
   // Attach before any repository/dependency/owner enumeration can fail.
   r.session=session;action=session.action;r.action=action;originalBootstrapWeakSet(actions,action,r);
   const core=readOriginalApplicationSelectionAction(action);
   if(session.deadline!==r.deadline||core.deadline!==r.deadline)fail('GENERATION_SELECTION_CAPABILITY');
   r.phase='held-review';c.starting=null;budget(r);
   const repositories=r.repositories;repositories.add(core.source);repositories.add(core.target);repositories.add(core.registry);
   for(const repository of [...repositories])for(const dependency of readOriginalActiveSelectionRepositoryDependencies(repository))repositories.add(dependency);
   const repositoryFacts=[...repositories].map(repository=>({repository,name:repository.name,factory:repository.factory,db:repository.db}));
   for(const f of repositoryFacts)r.repositoryRoles.set(f.repository,'repository:'+(f.name===core.source.name?'source':f.name===core.target.name?'target':'registry'));
   r.identities=()=>c.identities()&&repositoryFacts.every(f=>f.repository.name===f.name&&f.repository.factory===f.factory&&f.repository.db===f.db);
   for(const {owner:memberOwner,kind}of c.originals){if(r.members.has(memberOwner)&&r.members.get(memberOwner)!==kind)fail();r.members.set(memberOwner,kind);}
   debit(r,{phase:r.phase,operationId:core.operationId,repositories:repositoryFacts.map(f=>f.name),members:c.originals.map(m=>m.kind)},1);
   session.initialize();
   const activityPin=holdOriginalApplicationSelectionActivity(selection,control,action);
   // Begin EVERY original holder acquisition synchronously before awaiting any.
   const editor=accepted(r,()=>holdOriginalApplicationSelectionEditor(action,c.editors,invocation.senderDocumentId)),transport=accepted(r,()=>holdOriginalApplicationSelectionTransport(action,c.transports)),tools=accepted(r,()=>holdOriginalApplicationSelectionLocalTools(action,c.localTools));
   const [editorToken,transportToken,toolToken]=await Promise.all([editor,transport,tools]);
   r.holdersCurrent=frame=>currentOriginalApplicationSelectionEditor(action,c.editors,editorToken,frame)===true&&currentOriginalApplicationSelectionTransport(action,c.transports,transportToken,frame)===true&&currentOriginalApplicationSelectionLocalTools(action,c.localTools,toolToken)===true&&requirePinnedOriginalApplicationSelectionActivity(selection,activityPin,action)===true;
   const drain=drainPinnedOriginalApplicationSelectionActivity(selection,activityPin,action);track(r,drain);await drain;r.held=true;allHeld(r);
   const fences=[accepted(r,()=>fenceOriginalApplicationSelectionEditor(action,c.editors,editorToken)),accepted(r,()=>fenceOriginalApplicationSelectionTransport(action,c.transports,transportToken)),accepted(r,()=>fenceOriginalApplicationSelectionLocalTools(action,c.localTools,toolToken))];await Promise.all(fences);allHeld(r);
   await session.read();await session.portal.renew(action);await session.read();allHeld(r);r.phase='staging';
   session.marker();await runPhase(r);await runPhase(r);await measuredPreparation(r,'control',()=>session.portal.prepareControl(action));await runPhase(r);await runPhase(r);
   await measuredPreparation(r,'dispatch',()=>session.portal.prepareDispatch(action));await session.read();r.phase='dispatch-ready';allHeld(r);if(r.pending.size)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');
   reserveOriginalTerminalTail(r);
   // Only the original injected command + lifecycle composition may exercise
   // this local consumer. Production/ordinary keep the independent refusal;
   // no RPC, rollout config, caller boolean or fabricated action opens it.
   if(!c.localComposition)fail('BNS_GROUP_RESOURCE_LIMIT');
   session.sdk();r.dispatching=true;let sdk;try{sdk=session.portal.dispatch(action);}finally{r.dispatching=false;}track(r,sdk);await sdk;
   r.phase='settling';if(await session.portal.observe(action)!==true)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');await runPhase(r);await runPhase(r);const result=await session.portal.finish(action);allHeld(r);if(r.pending.size)fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');r.phase='terminal';return result;
  }catch(error){poison(r);if(session)session.invalidate();throw error;}finally{r.runDone=true;if(c.starting===owner)c.starting=null;if(!r.lifecycleStarted&&!r.holdAccepted&&!session&&c.active===r){c.active=null;r.pinned=false;r.settled=true;}}
 })();
 const terminal=settleOriginalApplicationSelectionTerminal(r,session,actual);
 // A public deadline never settles accepted work or removes any original pin.
 let timer;const expired=new OriginalPromise((_,reject)=>{timer=setTimeout(()=>{poison(r);if(session)session.invalidate();reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},Math.max(0,r.deadline-(r.nativeClock?originalBootstrapNow():now())));});
 return new OriginalPromise((resolve,reject)=>{const finish=(fn,value)=>{clearTimeout(timer);fn(value);};observe(terminal,value=>finish(resolve,value),error=>finish(reject,error));observe(expired,reject,reject);});
}

export function createInjectedApplicationSelectionReservationCoordinationForTest(options){return createReservationCoordination(options,injectedOrigin);}
export function createApplicationSelectionReservationCoordination(options){if(isInjectedLocalApplicationSelectionCommands(options?.selection,options?.api,options?.activity))fail();return createInjectedApplicationSelectionReservationCoordinationForTest(options);}
export function createOrdinaryApplicationSelectionReservationCoordination(options){return createReservationCoordination(options,ordinaryOrigin);}
export function createProductionApplicationSelectionReservationCoordination(options){if(arguments.length!==1||Object.hasOwn(options,'api'))fail();const {store,lifecycle,editors,transports,localTools,activity,selection}=options;
 const api=readOriginalBootstrapHost();
 // Check original private producer origins before reading composite members.
 if(!isProductionApplicationStore(store)||!isProductionConfiguredSyncLifecycle(lifecycle,store)||!isProductionApplicationSelectionCommands(selection,activity)||!isProductionApplicationEditorGuard(editors)||!isProductionApplicationTransportCoordination(transports,store)||!isProductionApplicationLocalToolsCoordination(localTools,store))fail('GENERATION_NATIVE_HOST_REQUIRED');
 const owner=createReservationCoordination({store,api,lifecycle,editors,transports,localTools,activity,selection},productionOrigin);requireOriginalBootstrapHost(api);return owner;
}
export function isProductionApplicationSelectionReservationCoordination(owner){try{const r=originalBootstrapWeakGet(coordinators,owner);return !!r&&r.origin===productionOrigin&&r.api===readOriginalBootstrapHost()&&r.identities();}catch{return false;}}
