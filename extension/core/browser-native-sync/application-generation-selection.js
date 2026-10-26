import {originalBootstrapHostSupported,originalBootstrapNow,originalBootstrapFinite,originalBootstrapApply,originalBootstrapInitialLocal,originalBootstrapInitialLocalGet,originalBootstrapInitialLocalSet,originalBootstrapWeakGet} from '../../background/native-host-bootstrap.js';
import {equalSourceWorkingPhysicalTree as equal,measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {ArchiveError,STORAGE_KEY} from '../constants.js';
import {ArchiveRepository,DATABASE_NAME,openOriginalExistingRepository,originalGenerationRepositoryRead,originalApplicationSelectionTransaction,registerRepositoryWorkLimit,registerOriginalRepositoryReadWorkLimit,observeRepositoryWriteFence,requireRepositoryWriteFence,createOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork,remainingOriginalRecoveryWork,requireRepositoryTransactionSucceeded,chargeOriginalApplicationSelectionActionWork,trackOriginalApplicationSelectionActionWork,requireOriginalApplicationSelectionDispatch,requireOriginalApplicationSelectionLocal,requireOriginalApplicationSelectionLocalDispatch,originalApplicationSelectionRead,requireRepositoryTransactionScope} from '../idb-repository.js';
import {originalOrganizerConstructor} from '../organizer/store-owner.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {BrowserNativeSyncCore,requireOriginalGenerationCoreMethods} from './core.js';
import {CanonicalGenerationPublication,openOriginalPublishedOrganizerForSelection,CANONICAL_GENERATION_GATE,CANONICAL_GENERATION_REGISTRY} from './canonical-generation-publication.js';
import {prepareOriginalApplicationInheritanceCut,requireOriginalApplicationInheritanceCut,requireOriginalApplicationInheritanceCutCurrent,requireOriginalApplicationInheritanceSelectionTail,renewOriginalApplicationInheritanceSelectionTail,readOriginalApplicationInheritanceCut} from './group-checkpoint.js';
import {readGroupRows} from './group-page-reader.js';
import {controlPublicationDigest as digest,controlPublicationRow,readControlPublicationFence,reserveControlPublication,requireControlPublicationOwner,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';

export const APPLICATION_SELECTION_MARKER='application-generation-selection:v1';
export const APPLICATION_SELECTION_REGISTRY='paia-canonical-generation-registry-v1';
const originalSelectionApply=Reflect.apply,selectionReviews=new WeakMap(),selectionRestrictions=new WeakMap(),restrictionTokens=new WeakMap(),lifecyclePortals=new WeakMap(),heldActions=new WeakMap();
const selectionClock=originalBootstrapHostSupported()?originalBootstrapNow:performance.now.bind(performance);
const SelectionAbortController=globalThis.AbortController,selectionAbort=SelectionAbortController.prototype.abort,selectionAbortSignal=Object.getOwnPropertyDescriptor(SelectionAbortController.prototype,'signal').get;
const ReversePromise=Promise,reverseThen=Promise.prototype.then,reverseSetTimeout=setTimeout,reverseClearTimeout=clearTimeout;
const authorities=new WeakMap(),cuts=new WeakMap(),reverseReviews=new WeakMap(),copy=value=>structuredClone(value);
const fail=(code='GENERATION_SELECTION_CHANGED')=>{throw new ArchiveError(code);};
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptors(v)[k]??{},'value'));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const tokenId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(v);
function marker(value){
 if(!exact(value,['id','version','operationId','role','phase','sourceDatabaseId','targetDatabaseId','targetName','datasetId','graphDigest','canonicalDigest','registryRoot','targetGate','beforeDigest','afterDigest','reservation','fences'])||value.id!==APPLICATION_SELECTION_MARKER||value.version!==1||!tokenId(value.operationId)||!['source','target'].includes(value.role)||!['prepared','dispatched','selected'].includes(value.phase)||!tokenId(value.sourceDatabaseId)||!tokenId(value.targetDatabaseId)||!tokenId(value.datasetId)||typeof value.targetName!=='string'||value.targetName===DATABASE_NAME||value.targetName===APPLICATION_SELECTION_REGISTRY||!hash(value.graphDigest)||!hash(value.canonicalDigest)||!hash(value.beforeDigest)||value.afterDigest!==null&&!hash(value.afterDigest)||!value.registryRoot?.active||!value.targetGate)fail();
 if(value.phase!=='prepared'&&(!hash(value.afterDigest)||!value.reservation||!value.fences))fail();return value;
}
// A private original-owner writer token, not a caller boolean or marker DTO.
export function readOriginalApplicationSelectionAuthority(token,repository,scope){const r=authorities.get(token);if(!r)return null;if(r.repository!==repository||r.name!==repository.name||r.factory!==repository.factory||scope&&scope.tx.db!==repository.db||scope&&r.scope&&r.scope!==scope)fail('GENERATION_SELECTION_CAPABILITY');if(scope)r.scope=scope;return r;}
export function requireOriginalApplicationSelectionMutation(authority,table,key,method){if(!authority||table!=='meta'||!authority.keys.includes(key)||!['put','delete'].includes(method))fail('GENERATION_SELECTION_WRITE_DENIED');}
async function write(repository,fn,keys=[APPLICATION_SELECTION_MARKER],stores=['meta']){
 const token=Object.freeze(Object.create(null));authorities.set(token,{repository,name:repository.name,factory:repository.factory,scope:null,keys:Object.freeze([...keys])});
 try{return await originalApplicationSelectionTransaction(repository,token,async t=>{registerRepositoryWorkLimit(repository,t);return fn(t);},stores);}finally{authorities.delete(token);}
}
async function rows(repository,action=null){const read=action?(repository,fn,stores)=>originalApplicationSelectionRead(repository,action,fn,stores):originalGenerationRepositoryRead;return read(repository,async t=>{registerOriginalRepositoryReadWorkLimit(repository,t);const value={};for(const table of repository.stores)value[table]=await readGroupRows(t,table);return value;},repository.stores);}
async function requireRows(repository,t,expected,action=null){for(const table of repository.stores){const actual=await readGroupRows(t,table);if(action)chargeOriginalApplicationSelectionActionWork(action,[actual,expected[table]],0);if(!equal(actual,expected[table]))fail();}}

const control=value=>Object.fromEntries(['settings','preferences','diagnostics','memoryAccessPolicy','classificationRules','filterRules'].map(k=>[k,copy(value[k])]));
async function localRow(local,get=local.get){const value=(await originalSelectionApply(get,local,[STORAGE_KEY]))[STORAGE_KEY];if(!value||value.schemaVersion!==6||!tokenId(value.databaseId))fail();return value;}
async function registryRoot(repository,action=null){return action?originalApplicationSelectionRead(repository,action,t=>t.get('meta',CANONICAL_GENERATION_REGISTRY),['meta']):originalGenerationRepositoryRead(repository,t=>t.get('meta',CANONICAL_GENERATION_REGISTRY),['meta']);}
async function point(repository,key,action=null){return action?originalApplicationSelectionRead(repository,action,t=>t.get('meta',key),['meta']):originalGenerationRepositoryRead(repository,t=>t.get('meta',key),['meta']);}
function actionEqual(action,a,b){if(action)chargeOriginalApplicationSelectionActionWork(action,[a,b],0);return equal(a,b);}
async function sameRegistry(registry,row,action=null){if(!actionEqual(action,await registryRoot(registry,action),row.registryRoot))fail();}
function checkGate(actual,row,increment=0,action=null){if(!actionEqual(action,actual,{...row.targetGate,writeRevision:row.targetGate.writeRevision+increment}))fail();}

// Read-only identity query; only the original constructor registers a closure.
// Returning a review ID is not a reservation, a global permit or a writer token.
export function readOriginalApplicationSelectionReview(owner,store,core,local){
 const read=selectionReviews.get(owner);if(!read)fail('GENERATION_SELECTION_CAPABILITY');return read(store,core,local);
}

// Restriction only: this original owner cannot activate, continue, inspect a
// settling receipt or cancel while held. No callback can provide readiness.
export function holdOriginalApplicationSelectionReview(owner,store,core,local,earlierDeadline=null){
 readOriginalApplicationSelectionReview(owner,store,core,local);const r=selectionRestrictions.get(owner);if(!r)fail('GENERATION_SELECTION_CAPABILITY');return r.hold(earlierDeadline);
}
export function requireOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.current();
}
export function releaseOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.release();
}
// Exact existing restriction only. Renewal is read-only, never readiness or a
// route to activation. Failure can only retire the held review, not release it.
export async function requalifyOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(arguments.length!==2||!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.requalify();
}
export function readOriginalApplicationSelectionReviewHoldDeadline(token,owner){
 const r=restrictionTokens.get(token);if(arguments.length!==2||!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');r.current();return r.deadline;
}
export function invalidateOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(arguments.length!==2||!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.invalidate();
}

// Only the original lifecycle keeps this portal; its public owner exposes no
// staged writer/SDK handle. Native admission additionally requires the fixed
// background driver's genuine action/phase/scope receipt, not portal secrecy.
export function createOriginalApplicationSelectionForLifecycle(store,core,local){
 const owner=new OriginalApplicationGenerationSelection(store,core,local);return Object.freeze({owner,portal:lifecyclePortals.get(owner)});
}
export function readOriginalApplicationSelectionAction(action){
 const r=heldActions.get(action);if(!r)fail('GENERATION_SELECTION_CAPABILITY');
 return Object.freeze({owner:r.owner,store:r.store,local:r.local,source:r.p.sourceRepository,target:r.p.targetRepository,registry:r.p.registry,deadline:r.deadline,operationId:r.p.record.operationId,phase:r.phase,attempted:r.p.attempted===true,sdkAttempted:r.sdkAttempted,signal:r.signal});
}
export function invalidateOriginalApplicationSelectionAction(action){const r=heldActions.get(action);if(!r)fail('GENERATION_SELECTION_CAPABILITY');r.invalidate();}

// Explicit existing-library selection. It only selects an already published,
// retired-copy candidate proven to contain the exact complete current cut.
// It never creates a candidate, imports an unknown family or deletes a library.
export class OriginalApplicationGenerationSelection{
 #source;#core;#local;#localGet;#localSet;#factory;#authority;#prepared=null;#busy=false;#lifetime=0;#restriction=null;#reverse=null;
 constructor(store,core,local,aiFilterAuthority=null){requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);if(store.repository!==core.repository||store.repository.name!==DATABASE_NAME||store.local!==local)fail('GENERATION_SELECTION_CAPABILITY');this.#source=store;this.#core=core;this.#local=local;this.#factory=store.repository.factory;this.#authority=aiFilterAuthority;this.#localGet=local.get;this.#localSet=local.set;
  selectionReviews.set(this,(s,c,l)=>{const p=cuts.get(this.#prepared);if(s!==this.#source||c!==this.#core||l!==this.#local||!p||p.owner!==this||this.#source.repository!==p.sourceRepository||this.#source.repository.db!==p.sourceDatabase||this.#core.repository!==p.sourceRepository||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_SELECTION_NOT_PREPARED');return Object.freeze({operationId:p.record.operationId});});
  selectionRestrictions.set(this,{hold:(earlierDeadline=null)=>{
   if(this.#busy||this.#restriction)fail('GENERATION_SELECTION_BUSY');
   const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
   if(!p||p.owner!==this||p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');
   const started=selectionClock();if(earlierDeadline!==null&&(!originalBootstrapFinite(earlierDeadline)||earlierDeadline<=started||earlierDeadline>started+30000))fail('GENERATION_SELECTION_CHANGED');
   // A fixed driver opportunity may only TIGHTEN the same monotonic deadline.
   // Nothing is rebased when the reservation or action later attaches.
   const token=Object.freeze(Object.create(null)),held={token,prepared,p,lifetime,deadline:earlierDeadline===null?started+30000:earlierDeadline,released:false,invalid:false,running:false};
   const current=()=>this.#requireHeldReview(held);
   this.#restriction=token;restrictionTokens.set(token,{owner:this,current,deadline:held.deadline,held,action:()=>held.action??null,
    requalify:()=>this.#requalify(held),
    invalidate:()=>{if(held.released||this.#restriction!==token)return false;held.invalid=true;if(held.action)held.action.invalidate();else this.#discardPrepared(held.prepared);return true;},
    release:()=>{current();held.released=true;this.#restriction=null;return true;}});return token;
  }});
  lifecyclePortals.set(this,Object.freeze({
   begin:token=>this.#beginHeldAction(token),
   renew:action=>this.#renewHeldAction(action),
   current:action=>this.#actionCurrent(action),
   next:action=>this.#actionNext(action),
   apply:(action,authority,scope)=>this.#actionApply(action,authority,scope),
   committed:(action,authority,scope)=>this.#actionCommitted(action,authority,scope),
   prepareControl:action=>this.#actionPrepareControl(action),
   prepareDispatch:action=>this.#actionPrepareDispatch(action),
   dispatch:action=>this.#actionDispatch(action),
   observe:action=>this.#actionObserve(action),
   finish:action=>this.#actionFinish(action),
   retire:action=>this.#retireHeldAction(action)
  }));
 }
 async prepare(){
  if(this.#restriction)fail('GENERATION_SELECTION_BUSY');
  if(this.#busy)fail('GENERATION_SELECTION_BUSY');this.#busy=true;const lifetime=++this.#lifetime;this.#discardPrepared(this.#prepared);
  try{
   if(await point(this.#source.repository,APPLICATION_SELECTION_MARKER))fail('GENERATION_SELECTION_PENDING');
   const sourceProof=await prepareOriginalApplicationInheritanceCut(this.#source,this.#core),source=readOriginalApplicationInheritanceCut(sourceProof),before=await localRow(this.#local);
   if(!equal(before,source.control))fail();
   const registry=new ArchiveRepository(this.#local,{indexedDB:this.#factory,name:APPLICATION_SELECTION_REGISTRY});let candidate;
   try{
    // The fixed candidate sees only the current device control with its original
    // physical database id. This read-only adapter cannot acknowledge or persist.
    let databaseId=null;
    const readOnlyLocal={get:async key=>{if(key!==STORAGE_KEY||databaseId===null)fail();const value=await localRow(this.#local);if(!equal(value,before))fail();return {[STORAGE_KEY]:{...copy(value),databaseId}};},set:async()=>fail('GENERATION_SELECTION_READ_ONLY')};
    const publication=new CanonicalGenerationPublication(registry);
    candidate=await openOriginalPublishedOrganizerForSelection(publication,readOnlyLocal,this.#authority);
    const migration=await point(candidate.repository,'migration');if(migration?.phase!=='active')fail();databaseId=migration.databaseId;
    await candidate.run(async()=>{});
    const targetCore=new BrowserNativeSyncCore(candidate.repository,{datasetId:this.#core.datasetId,deviceId:this.#core.deviceId});
    const targetProof=await prepareOriginalApplicationInheritanceCut(candidate,targetCore),target=readOriginalApplicationInheritanceCut(targetProof);
    if(source.datasetId!==target.datasetId||source.graphDigest!==target.graphDigest||source.canonicalDigest!==target.canonicalDigest)fail('GENERATION_INHERITANCE_REQUIRED');
    const root=await registryRoot(registry),gate=await point(candidate.repository,CANONICAL_GENERATION_GATE),qualification=await point(candidate.repository,'canonical-generation:qualified-graph:v1');
    if(root?.pending||qualification?.kind!=='original-group'||qualification.seal?.graphDigest!==source.graphDigest||root.active?.identity?.databaseName!==candidate.repository.name)fail('GENERATION_INHERITANCE_REQUIRED');
    const fences=await originalGenerationRepositoryRead(candidate.repository,readControlPublicationFence,['meta']);
    if(fences.reservation||fences.gate?.epoch!==before.settings.epoch||fences.gate?.enabled!==before.settings.enabled)fail('GENERATION_LOCAL_CONTROL_REQUIRED');
    const sourceRows=await rows(this.#source.repository),targetRows=await rows(candidate.repository);
    await requireOriginalApplicationInheritanceCut(sourceProof);await requireOriginalApplicationInheritanceCut(targetProof);
    const prepared=Object.freeze(Object.create(null)),record=marker({id:APPLICATION_SELECTION_MARKER,version:1,operationId:crypto.randomUUID(),role:'source',phase:'prepared',sourceDatabaseId:source.databaseId,targetDatabaseId:databaseId,targetName:candidate.repository.name,datasetId:source.datasetId,graphDigest:source.graphDigest,canonicalDigest:source.canonicalDigest,registryRoot:copy(root),targetGate:copy(gate),beforeDigest:await digest(before),afterDigest:null,reservation:null,fences:null});
    if(lifetime!==this.#lifetime)fail('GENERATION_SELECTION_NOT_PREPARED');
    cuts.set(prepared,{owner:this,sourceProof,targetProof,sourceRows,targetRows,registry,candidate,targetCore,before,record,fences,sourceReview:source,targetReview:target,sourceRepository:this.#source.repository,sourceDatabase:this.#source.repository.db,sourceName:this.#source.repository.name,sourceFactory:this.#source.repository.factory,targetRepository:candidate.repository,targetDatabase:candidate.repository.db,targetFactory:candidate.repository.factory,coreDeviceId:this.#core.deviceId,targetDeviceId:targetCore.deviceId});this.#prepared=prepared;
    return {state:'prepared',scope:'exact-existing-cut',operationId:record.operationId,wholeArchiveComplete:false};
   }catch(error){candidate?.repository.db?.close();registry.db?.close();throw error;}
  }finally{this.#busy=false;}
 }
 // Refresh only this original private review, never a caller-supplied target
 // or a new prepare. The first profile permits tail/observation renewal only:
 // even otherwise meaningful metadata writes require a fresh explicit review.
 async requalify(){
  if(this.#restriction)fail('GENERATION_SELECTION_BUSY');
  if(arguments.length)fail('GENERATION_SELECTION_CAPABILITY');
  return this.#requalify();
 }
 #requireHeldReview(held,running=false,action=null){
  try{
   if(held.action&&held.action!==action||held.invalid||held.released||selectionClock()>=held.deadline||this.#restriction!==held.token||this.#busy!==running||held.running!==running||this.#prepared!==held.prepared||this.#lifetime!==held.lifetime||cuts.get(held.prepared)!==held.p||held.p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');
   selectionReviews.get(this)(this.#source,this.#core,this.#local);return true;
  }catch(error){held.invalid=true;if(held.action)held.action.invalidate();throw error;}
 }
 async #requalify(held=null,action=null){
  if(held)this.#requireHeldReview(held,false,action);
  const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
  if(this.#busy||!p||p.owner!==this)fail('GENERATION_SELECTION_NOT_PREPARED');this.#busy=true;if(held)held.running=true;
  const current=()=>{
   if(held)this.#requireHeldReview(held,true,action);
   if(this.#prepared!==prepared||this.#lifetime!==lifetime||cuts.get(prepared)!==p)fail('GENERATION_SELECTION_NOT_PREPARED');
   requireOriginalLibraryDocumentsGenerationMethods(this.#source);requireOriginalLibraryDocumentsGenerationMethods(p.candidate);requireOriginalGenerationCoreMethods(this.#core);requireOriginalGenerationCoreMethods(p.targetCore);
   if(this.#source.repository!==p.sourceRepository||this.#core.repository!==p.sourceRepository||p.sourceRepository.db!==p.sourceDatabase||p.sourceRepository.name!==p.sourceName||p.sourceRepository.factory!==p.sourceFactory||this.#source.databaseId!==p.sourceReview.databaseId||this.#core.deviceId!==p.coreDeviceId||p.candidate.repository!==p.targetRepository||p.targetCore.repository!==p.targetRepository||p.targetRepository.db!==p.targetDatabase||p.targetRepository.name!==p.record.targetName||p.targetRepository.factory!==p.targetFactory||p.candidate.databaseId!==p.targetReview.databaseId||p.targetCore.deviceId!==p.targetDeviceId)fail('GENERATION_SELECTION_REVIEW_REQUIRED');
  };
  const reviewed=async()=>{
   current();if(await point(p.sourceRepository,APPLICATION_SELECTION_MARKER)||await point(p.targetRepository,APPLICATION_SELECTION_MARKER))fail('GENERATION_SELECTION_REVIEW_REQUIRED');
   if(!equal(await localRow(this.#local),p.before)||!equal(await registryRoot(p.registry),p.record.registryRoot)||!equal(await point(p.targetRepository,CANONICAL_GENERATION_GATE),p.record.targetGate)||!equal(await originalGenerationRepositoryRead(p.targetRepository,readControlPublicationFence,['meta']),p.fences))fail('GENERATION_SELECTION_REVIEW_REQUIRED');current();
  };
  try{
   await reviewed();
   const sourceProof=await prepareOriginalApplicationInheritanceCut(this.#source,this.#core),source=readOriginalApplicationInheritanceCut(sourceProof);current();
   const targetProof=await prepareOriginalApplicationInheritanceCut(p.candidate,p.targetCore),target=readOriginalApplicationInheritanceCut(targetProof);current();
   if(!equal(source,p.sourceReview)||!equal(target,p.targetReview))fail('GENERATION_SELECTION_REVIEW_REQUIRED');
   const sourceRows=await rows(p.sourceRepository),targetRows=await rows(p.targetRepository);
   // Do not strip, whitelist or normalize any row. Unknown physical changes
   // cannot become silently reviewed merely because graph digests stayed equal.
   if(!equal(sourceRows,p.sourceRows)||!equal(targetRows,p.targetRows))fail('GENERATION_SELECTION_REVIEW_REQUIRED');
   await requireOriginalApplicationInheritanceCut(sourceProof);await requireOriginalApplicationInheritanceCut(targetProof);await reviewed();
   // Final original proof checks retain their tail/control/owner requirements.
   await requireOriginalApplicationInheritanceCut(sourceProof);await requireOriginalApplicationInheritanceCut(targetProof);current();
   if(!equal(readOriginalApplicationInheritanceCut(sourceProof),source)||!equal(readOriginalApplicationInheritanceCut(targetProof),target))fail('GENERATION_SELECTION_REVIEW_REQUIRED');
   // No await or caller callback separates promotion from updating the exact
   // held handle. The restriction itself is never removed, even transiently.
   const next=Object.freeze(Object.create(null)),renewed={...p,sourceProof,targetProof,sourceRows,targetRows};cuts.set(next,renewed);cuts.delete(prepared);this.#prepared=next;
   if(held){held.prepared=next;held.p=renewed;if(action){action.prepared=next;action.p=renewed;}}
   return {state:'prepared',scope:'exact-existing-cut',operationId:p.record.operationId,wholeArchiveComplete:false};
  }catch(error){if(held)held.invalid=true;this.#discardPrepared(prepared);throw error;}finally{this.#busy=false;if(held)held.running=false;}
 }
 #discardPrepared(prepared){this.#discardReverse();const p=cuts.get(prepared),action=this.#restriction&&restrictionTokens.get(this.#restriction)?.action?.();if(p&&action?.p===p&&!action.retired)action.closePending=true;else{p?.candidate.repository.db?.close();p?.registry.db?.close();}cuts.delete(prepared);if(this.#prepared===prepared)this.#prepared=null;}
 #beginHeldAction(token){
  const original=restrictionTokens.get(token);if(original?.owner!==this)fail('GENERATION_SELECTION_CAPABILITY');original.current();const held=original.held;if(held.action)fail('GENERATION_SELECTION_BUSY');
  const action=Object.freeze(Object.create(null)),r={action,owner:this,store:this.#source,local:this.#local,get:this.#localGet,set:this.#localSet,held,p:held.p,prepared:held.prepared,lifetime:this.#lifetime,deadline:held.deadline,phase:'held-review',invalid:false,retired:false,closePending:false,authority:null,controller:new SelectionAbortController(),sdkAttempted:false,sdk:null,sdkSettled:false};
  r.signal=originalSelectionApply(selectionAbortSignal,r.controller,[]);
  r.repositoryFacts=[r.p.sourceRepository,r.p.targetRepository,r.p.registry].map(repository=>({repository,name:repository.name,factory:repository.factory,db:repository.db,stores:[...repository.stores]}));
  r.invalidate=()=>{if(r.invalid)return;r.invalid=true;held.invalid=true;originalSelectionApply(selectionAbort,r.controller,[]);this.#discardPrepared(held.prepared);};held.action=r;heldActions.set(action,r);return action;
 }
 #actionCurrent(action){
  const r=heldActions.get(action),p=r?.p;
  try{
   if(!r||r.owner!==this||r.invalid||r.retired||r.held.action!==r||r.held.invalid||this.#restriction!==r.held.token||this.#lifetime!==r.lifetime||this.#prepared!==r.prepared||cuts.get(r.prepared)!==p||selectionClock()>=r.deadline)fail('GENERATION_SELECTION_CHANGED');
   requireOriginalLibraryDocumentsGenerationMethods(this.#source);requireOriginalLibraryDocumentsGenerationMethods(p.candidate);requireOriginalGenerationCoreMethods(this.#core);requireOriginalGenerationCoreMethods(p.targetCore);
   if(r.repositoryFacts.some(f=>f.repository.name!==f.name||f.repository.factory!==f.factory||f.repository.db!==f.db||f.repository.stores.length!==f.stores.length||f.repository.stores.some((value,i)=>value!==f.stores[i]))||this.#source.repository!==p.sourceRepository||this.#source.repository.db!==p.sourceDatabase||this.#source.databaseId!==p.sourceReview.databaseId||this.#core.datasetId!==p.sourceReview.datasetId||p.targetCore.datasetId!==p.targetReview.datasetId||p.candidate.databaseId!==p.targetReview.databaseId||this.#core.repository!==p.sourceRepository||this.#core.deviceId!==p.coreDeviceId||p.targetRepository!==p.candidate.repository||p.targetRepository.db!==p.targetDatabase||p.targetCore.repository!==p.targetRepository||p.targetCore.deviceId!==p.targetDeviceId||p.registry.db!==r.registryDatabase&&r.registryDatabase!==undefined||this.#local.get!==r.get||this.#local.set!==r.set)fail('GENERATION_SELECTION_CHANGED');
   return true;
  }catch(error){if(r?.owner===this)r.invalidate();throw error;}
 }
 async #renewHeldAction(action){
  const r=heldActions.get(action);this.#actionCurrent(action);if(r.phase!=='held-review')fail();const p=r.p,prepared=r.prepared;
  const current=()=>{this.#actionCurrent(action);requireOriginalApplicationInheritanceSelectionTail(p.sourceProof,action);requireOriginalApplicationInheritanceSelectionTail(p.targetProof,action);};
  const reviewed=async()=>{current();if(await point(p.sourceRepository,APPLICATION_SELECTION_MARKER,action)||await point(p.targetRepository,APPLICATION_SELECTION_MARKER,action))fail();const before=await this.#actionLocal(r),root=await registryRoot(p.registry,action),gate=await point(p.targetRepository,CANONICAL_GENERATION_GATE,action),fences=await originalApplicationSelectionRead(p.targetRepository,action,readControlPublicationFence,['meta']);chargeOriginalApplicationSelectionActionWork(action,[before,p.before,root,p.record.registryRoot,gate,p.record.targetGate,fences,p.fences],0);if(!equal(before,p.before)||!equal(root,p.record.registryRoot)||!equal(gate,p.record.targetGate)||!equal(fences,p.fences))fail();current();};
  try{
   await reviewed();const sourceRows=await rows(p.sourceRepository,action),targetRows=await rows(p.targetRepository,action);chargeOriginalApplicationSelectionActionWork(action,[sourceRows,p.sourceRows,targetRows,p.targetRows],0);
   if(!equal(sourceRows,p.sourceRows)||!equal(targetRows,p.targetRows))fail();await reviewed();current();
   renewOriginalApplicationInheritanceSelectionTail(p.sourceProof,action);renewOriginalApplicationInheritanceSelectionTail(p.targetProof,action);
   if(!actionEqual(action,readOriginalApplicationInheritanceCut(p.sourceProof),p.sourceReview)||!actionEqual(action,readOriginalApplicationInheritanceCut(p.targetProof),p.targetReview))fail();
   // No reprepare, new compiler allowance, stripped metadata or observation
   // refresh. Only contiguous successful same-action original readonly queue
   // transitions may renew the original observation; all other movement refuses.
   const next=Object.freeze(Object.create(null)),renewed={...p,sourceRows,targetRows};cuts.set(next,renewed);cuts.delete(prepared);this.#prepared=next;r.prepared=next;r.p=renewed;r.held.prepared=next;r.held.p=renewed;r.phase='reviewed';return true;
  }catch(error){r.invalidate();throw error;}
 }
 #actionNext(action){
  this.#actionCurrent(action);const r=heldActions.get(action),p=r.p;if(r.authority)fail();
  const steps={reviewed:['source-prepared',p.sourceRepository,[APPLICATION_SELECTION_MARKER],p.sourceRepository.stores],'source-prepared':['target-prepared',p.targetRepository,[APPLICATION_SELECTION_MARKER],p.targetRepository.stores],'control-ready':['target-dispatched',p.targetRepository,[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION],['meta']],'target-dispatched':['source-dispatched',p.sourceRepository,[APPLICATION_SELECTION_MARKER],['meta']],settling:['source-selected',p.sourceRepository,[APPLICATION_SELECTION_MARKER],['meta']],'source-selected':['target-cleaned',p.targetRepository,[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_RESERVATION],['meta']]};
  const step=steps[r.phase];if(!step)fail();const [phase,repository,keys,stores]=step,token=Object.freeze(Object.create(null));
  const authority={repository,name:repository.name,factory:repository.factory,scope:null,keys:Object.freeze(keys),action,phase};authorities.set(token,authority);r.authority=token;return Object.freeze({authority:token,repository,stores:Object.freeze([...stores]),phase});
 }
 async #actionApply(action,token,t){
  this.#actionCurrent(action);const r=heldActions.get(action),a=authorities.get(token),p=r.p;if(r.authority!==token||a?.action!==action||readOriginalApplicationSelectionAuthority(token,a.repository,t)!==a)fail('GENERATION_SELECTION_CAPABILITY');
  requireRepositoryTransactionScope(a.repository,t);const check=()=>this.#actionCurrent(action),same=(a,b)=>{chargeOriginalApplicationSelectionActionWork(action,[a,b],0);return equal(a,b);},base=p.record;check();p.attempted=true;
  if(a.phase==='source-prepared'){await requireRows(p.sourceRepository,t,p.sourceRows,action);check();await t.put('meta',base);}
  else if(a.phase==='target-prepared'){await requireRows(p.targetRepository,t,p.targetRows,action);check();await t.put('meta',{...base,role:'target'});}
  else if(a.phase==='target-dispatched'){
   if(!same(await t.get('meta',APPLICATION_SELECTION_MARKER),{...base,role:'target'}))fail();checkGate(await t.get('meta',CANONICAL_GENERATION_GATE),base,1,action);
   const reservation=await reserveControlPublication(t,r.prior,{nonce:base.operationId,databaseId:base.targetDatabaseId,beforeDigest:base.beforeDigest});if(!same(reservation,r.unfilled))fail();check();await t.put('meta',r.next.reservation);await t.put('meta',{...r.next,role:'target'});
  }else if(a.phase==='source-dispatched'){if(!same(await t.get('meta',APPLICATION_SELECTION_MARKER),base))fail();check();await t.put('meta',r.next);}
  else if(a.phase==='source-selected'){if(!same(await t.get('meta',APPLICATION_SELECTION_MARKER),r.next))fail();check();await t.put('meta',{...r.next,phase:'selected'});}
  else if(a.phase==='target-cleaned'){
   if(!same(await t.get('meta',APPLICATION_SELECTION_MARKER),{...r.next,role:'target'}))fail();checkGate(await t.get('meta',CANONICAL_GENERATION_GATE),base,2,action);await requireControlPublicationOwner(t,r.next.reservation,r.next.fences);check();await t.delete('meta',CONTROL_PUBLICATION_RESERVATION);await t.delete('meta',APPLICATION_SELECTION_MARKER);
  }else fail();check();return true;
 }
 #actionCommitted(action,token,scope){
  this.#actionCurrent(action);const r=heldActions.get(action),a=authorities.get(token);if(r.authority!==token||a?.action!==action||a.scope!==scope)fail('GENERATION_SELECTION_CAPABILITY');requireRepositoryTransactionSucceeded(a.repository,scope);r.phase=a.phase;r.authority=null;authorities.delete(token);return true;
 }
 #actionLocalFinal(r,phase){
  // Only captured/private facts may follow the LAST paid local/clock slice.
  // Do not call #actionCurrent, a host predicate, meter or clock here.
  if(originalBootstrapWeakGet(heldActions,r.action)!==r||r.owner!==this||r.invalid||r.retired||r.held.action!==r||r.held.invalid||r.held.released||this.#restriction!==r.held.token||this.#lifetime!==r.lifetime||this.#prepared!==r.prepared||originalBootstrapWeakGet(cuts,r.prepared)!==r.p||r.phase!==phase)fail('GENERATION_SELECTION_CHANGED');
 }
 async #actionLocal(r){
  const phase=r.phase,args=[STORAGE_KEY];this.#actionCurrent(r.action);chargeOriginalApplicationSelectionActionWork(r.action,[STORAGE_KEY],1);
  requireOriginalApplicationSelectionLocal(r.action,r.local,r.get,r.set);this.#actionLocalFinal(r,phase);
  let pending;try{pending=originalBootstrapApply(originalBootstrapInitialLocalGet,originalBootstrapInitialLocal,args);}catch(error){chargeOriginalApplicationSelectionActionWork(r.action,{operation:'local-get-result',rejected:true,synchronous:true},0);throw error;}trackOriginalApplicationSelectionActionWork(r.action,pending);
  let raw;try{raw=await pending;}catch(error){chargeOriginalApplicationSelectionActionWork(r.action,{operation:'local-get-result',rejected:true},0);throw error;}
  // Actual returned bytes belong to this action even after expiration. All
  // callback-capable raw/schema/RegExp work precedes the fresh final slice.
  chargeOriginalApplicationSelectionActionWork(r.action,raw,0);this.#actionCurrent(r.action);const value=raw?.[STORAGE_KEY];if(!value||value.schemaVersion!==6||!tokenId(value.databaseId))fail();
  requireOriginalApplicationSelectionLocal(r.action,r.local,r.get,r.set);this.#actionLocalFinal(r,phase);return value;
 }
 async #actionDigest(r,value){chargeOriginalApplicationSelectionActionWork(r.action,value,0);const result=await digest(value);chargeOriginalApplicationSelectionActionWork(r.action,result,0);this.#actionCurrent(r.action);return result;}
 async #actionPrepareControl(action){
  this.#actionCurrent(action);const r=heldActions.get(action),p=r.p,s=p.record;if(r.phase!=='target-prepared')fail();
  await sameRegistry(p.registry,s,action);checkGate(await point(p.targetRepository,CANONICAL_GENERATION_GATE,action),s,1,action);const before=await this.#actionLocal(r);if(await this.#actionDigest(r,before)!==s.beforeDigest)fail();
  const prior=await originalApplicationSelectionRead(p.targetRepository,action,readControlPublicationFence,['meta']);this.#actionCurrent(action);if(prior.reservation||!actionEqual(action,prior,p.fences))fail();
  const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:prior.revision+1,nonce:s.operationId,databaseId:s.targetDatabaseId,beforeDigest:s.beforeDigest,afterDigest:null,fenceDigest:null},fences={migration:prior.migration,gate:prior.gate,epoch:prior.epoch},after=controlPublicationRow(control(before),s.targetDatabaseId,reservation);
  chargeOriginalApplicationSelectionActionWork(action,[before,reservation,fences,after],0);const afterDigest=await this.#actionDigest(r,after),fenceDigest=await this.#actionDigest(r,fences);this.#actionCurrent(action);r.prior=prior;r.unfilled=reservation;r.after=after;r.next={...s,phase:'dispatched',afterDigest,reservation:{...reservation,afterDigest,fenceDigest},fences};r.phase='control-ready';return true;
 }
 async #actionPrepareDispatch(action){
  this.#actionCurrent(action);const r=heldActions.get(action),p=r.p;if(r.phase!=='source-dispatched')fail();
  await sameRegistry(p.registry,r.next,action);if(!actionEqual(action,await point(p.sourceRepository,APPLICATION_SELECTION_MARKER,action),r.next)||!actionEqual(action,await point(p.targetRepository,APPLICATION_SELECTION_MARKER,action),{...r.next,role:'target'})||await this.#actionDigest(r,await this.#actionLocal(r))!==p.record.beforeDigest)fail();this.#actionCurrent(action);
  r.sourceFence=observeRepositoryWriteFence(p.sourceRepository);r.targetFence=observeRepositoryWriteFence(p.targetRepository);r.registryFence=observeRepositoryWriteFence(p.registry);r.phase='dispatch-ready';return true;
 }
 #actionDispatch(action){
  this.#actionCurrent(action);const r=heldActions.get(action),p=r.p,phase=r.phase,args=[{[STORAGE_KEY]:r.after}];if(phase!=='dispatch-ready'||r.sdkAttempted)fail();requireRepositoryWriteFence(p.sourceRepository,r.sourceFence);requireRepositoryWriteFence(p.targetRepository,r.targetFence);requireRepositoryWriteFence(p.registry,r.registryFence);
  chargeOriginalApplicationSelectionActionWork(action,args[0],1);requireOriginalApplicationSelectionDispatch(action);this.#actionCurrent(action);
  requireOriginalApplicationSelectionLocalDispatch(action,r.local,r.get,r.set);this.#actionLocalFinal(r,phase);if(r.sdkAttempted)fail();r.sdkAttempted=true;r.phase='SDK-attempted';
  let raw;try{raw=originalBootstrapApply(originalBootstrapInitialLocalSet,originalBootstrapInitialLocal,args);}catch(error){raw=new ReversePromise((_,reject)=>reject(error));}
  // The original SDK promise is observed, never a caller outcome/timeout DTO.
  // Post-set freshness uses the general local boundary: dispatching has ended
  // by async settlement and must NOT be required to remain true.
  const settled=(value,rejected,resolve,reject)=>{r.sdkSettled=true;try{chargeOriginalApplicationSelectionActionWork(action,rejected?{operation:'local-set-result',rejected:true}:value,0);this.#actionCurrent(action);requireOriginalApplicationSelectionLocal(action,r.local,r.get,r.set);this.#actionLocalFinal(r,'SDK-attempted');resolve(rejected?undefined:value);}catch(error){reject(error);}};
  trackOriginalApplicationSelectionActionWork(action,raw);r.sdk=new ReversePromise((resolve,reject)=>{try{originalSelectionApply(reverseThen,raw,[value=>settled(value,false,resolve,reject),()=>settled(undefined,true,resolve,reject)]);}catch(error){r.unobservable=true;reject(error);}});return r.sdk;
 }
 async #actionObserve(action){
  this.#actionCurrent(action);const r=heldActions.get(action);if(r.phase!=='SDK-attempted'||!r.sdkSettled||r.unobservable)fail();
  if(await this.#actionDigest(r,await this.#actionLocal(r))!==r.next.afterDigest){r.phase='outcome-unknown';return false;}this.#actionCurrent(action);r.phase='settling';return true;
 }
 async #actionFinish(action){
  this.#actionCurrent(action);const r=heldActions.get(action),p=r.p;if(r.phase!=='target-cleaned')fail();await sameRegistry(p.registry,r.next,action);const gate=await point(p.targetRepository,CANONICAL_GENERATION_GATE,action);checkGate(gate,p.record,3,action);if(await this.#actionDigest(r,await this.#actionLocal(r))!==r.next.afterDigest)fail();this.#actionCurrent(action);const result=Object.freeze({state:'selected',operationId:p.record.operationId,priorLibraryRetained:true,reloadRequired:true,rollbackAllowed:false,rollbackReason:'reverse-inheritance-required',wholeArchiveComplete:false,productionActivation:false});chargeOriginalApplicationSelectionActionWork(action,result,1);this.#actionCurrent(action);r.phase='terminal';return result;
 }
 #retireHeldAction(action){const r=heldActions.get(action);if(!r||r.owner!==this||r.retired)fail('GENERATION_SELECTION_CAPABILITY');r.retired=true;if(r.authority)authorities.delete(r.authority);if(r.closePending){r.p.candidate.repository.db?.close();r.p.registry.db?.close();}return true;}
 async activate(){
  if(this.#restriction)fail('GENERATION_SELECTION_BUSY');
  const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;if(this.#busy||!p||p.owner!==this)fail('GENERATION_SELECTION_NOT_PREPARED');
  const check=()=>{if(this.#prepared!==prepared||this.#lifetime!==lifetime||cuts.get(prepared)!==p)fail('GENERATION_SELECTION_NOT_PREPARED');if(this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_SELECTION_CAPABILITY');};
  check();this.#busy=true;
  const guarded={check,marker:()=>{check();p.attempted=true;},sdk:check,get:this.#localGet,set:this.#localSet};
  const attempt=async(repository,fn,stores)=>{check();guarded?.marker();return write(repository,async t=>{check();const value=await fn(t);check();return value;},undefined,stores);};
  try{
   await requireOriginalApplicationInheritanceCut(p.sourceProof);await requireOriginalApplicationInheritanceCut(p.targetProof);check();
   if(!equal(await localRow(this.#local,guarded?.get??this.#local.get),p.before))fail();await sameRegistry(p.registry,p.record);check();
   await attempt(this.#source.repository,async t=>{await requireRows(this.#source.repository,t,p.sourceRows);check();await t.put('meta',p.record);},this.#source.repository.stores);
   // A failure after this point retains the original source fence. Explicit
   // cancel can remove only an undispatched exact original pending operation.
   await attempt(p.candidate.repository,async t=>{await requireRows(p.candidate.repository,t,p.targetRows);check();await t.put('meta',{...p.record,role:'target'});},p.candidate.repository.stores);
   return await finishSelection(this.#source.repository,p.candidate.repository,p.registry,this.#local,p.record,false,guarded);
  }finally{this.#busy=false;}
 }
 async status(){if(this.#restriction||this.#busy)fail('GENERATION_SELECTION_BUSY');this.#busy=true;try{return await inspectOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}finally{this.#busy=false;}}
 async continue(){if(this.#restriction||this.#busy)fail('GENERATION_SELECTION_BUSY');this.#busy=true;try{return await continueOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}finally{this.#busy=false;}}
 async cancel(){if(this.#restriction||this.#busy)fail('GENERATION_SELECTION_BUSY');this.#busy=true;try{return await cancelOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}finally{this.#busy=false;}}
 // Same live forward owner only: this review issues no selection writer or
 // global hold. Every later revalidation consumes this exact cumulative ticket.
 async prepareReverse(){
  if(arguments.length)fail('GENERATION_SELECTION_CAPABILITY');
  if(this.#busy||this.#restriction)fail('GENERATION_SELECTION_BUSY');
  const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
  if(!p||p.owner!==this||!p.attempted)fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
  this.#discardReverse();this.#busy=true;
  const token=Object.freeze(Object.create(null)),r={owner:this,token,prepared,p,lifetime,invalid:false,ready:false,running:false,ticket:null,finished:false,expected:null,
   sourceTail:this.#source.tail,targetTail:p.candidate.tail,registryDatabase:p.registry.db,registryFactory:p.registry.factory,registryName:p.registry.name};
  this.#reverse=r;reverseReviews.set(token,r);
  try{
   // Observe before any awaited read; never replace a fence after a read.
   r.sourceFence=observeRepositoryWriteFence(p.sourceRepository);r.targetFence=observeRepositoryWriteFence(p.targetRepository);r.registryFence=observeRepositoryWriteFence(p.registry);
   r.current=()=>{
    if(r.invalid||this.#reverse!==r||this.#prepared!==prepared||cuts.get(prepared)!==p||this.#lifetime!==lifetime||this.#restriction)fail('GENERATION_REVERSE_REVIEW_CHANGED');
    requireOriginalLibraryDocumentsGenerationMethods(this.#source);requireOriginalLibraryDocumentsGenerationMethods(p.candidate);requireOriginalGenerationCoreMethods(this.#core);requireOriginalGenerationCoreMethods(p.targetCore);
    if(this.#source.repository!==p.sourceRepository||this.#core.repository!==p.sourceRepository||p.sourceRepository.db!==p.sourceDatabase||p.sourceRepository.name!==p.sourceName||p.sourceRepository.factory!==p.sourceFactory||this.#source.databaseId!==p.sourceReview.databaseId||this.#core.deviceId!==p.coreDeviceId||p.candidate.repository!==p.targetRepository||p.targetCore.repository!==p.targetRepository||p.targetRepository.db!==p.targetDatabase||p.targetRepository.name!==p.record.targetName||p.targetRepository.factory!==p.targetFactory||p.candidate.databaseId!==p.targetReview.databaseId||p.targetCore.deviceId!==p.targetDeviceId||p.registry.db!==r.registryDatabase||p.registry.factory!==r.registryFactory||p.registry.name!==r.registryName||this.#source.tail!==r.sourceTail||p.candidate.tail!==r.targetTail||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_REVERSE_REVIEW_CHANGED');
    requireRepositoryWriteFence(p.sourceRepository,r.sourceFence);requireRepositoryWriteFence(p.targetRepository,r.targetFence);requireRepositoryWriteFence(p.registry,r.registryFence);return true;
   };
   r.current();r.ticket=createOriginalRecoveryWork(p.sourceRepository,{isCurrent:r.current});
   return await this.#runReverse(r,async()=>{r.expected=await originalReverseExpected(p,r);r.current();await this.#verifyReverse(r);},()=>{r.ready=true;return token;});
  }catch(error){r.invalid=true;if(this.#reverse===r)this.#reverse=null;if(!r.running){this.#busy=false;this.#finishReverse(r);}throw error;}
 }

 // Only the captured repository instances are synchronously observed here.
 // Other connections may have written; consumers must perform full raw review
 // again, and this token is never rollback, writer or global-hold authority.
 reverseReviewCurrent(token){
  const r=reverseReviews.get(token);if(arguments.length!==1||!r||r.owner!==this||this.#reverse!==r||!r.ready||r.running||this.#busy)fail('GENERATION_REVERSE_REVIEW_CHANGED');
  try{r.current();checkOriginalRecoveryWork(r.p.sourceRepository,r.ticket);return true;}catch(error){r.invalid=true;this.#finishReverse(r);throw error;}
 }
 async requalifyReverse(token){
  if(arguments.length!==1)fail('GENERATION_SELECTION_CAPABILITY');this.reverseReviewCurrent(token);
  const r=reverseReviews.get(token);this.#busy=true;
  return this.#runReverse(r,()=>this.#verifyReverse(r),()=>true);
 }
 #runReverse(r,action,result){
  let ms;try{ms=remainingOriginalRecoveryWork(r.p.sourceRepository,r.ticket);}catch(error){r.invalid=true;this.#busy=false;this.#finishReverse(r);throw error;}
  r.running=true;
  return new ReversePromise((resolve,reject)=>{
   let timer,settled=false;
   const finish=(error,value)=>{
    if(settled)return;settled=true;reverseClearTimeout(timer);
    if(error){r.invalid=true;if(this.#reverse===r)this.#reverse=null;reject(error);}else resolve(value);
   };
   // The window and busy owner outlive a timeout until the ORIGINAL operation
   // really settles. A missing SDK observation never supplies another attempt.
   const operation=withOriginalRecoveryWork(r.p.sourceRepository,r.ticket,action);
   originalSelectionApply(reverseThen,operation,[()=>{
    try{r.current();checkOriginalRecoveryWork(r.p.sourceRepository,r.ticket);finish(null,result());}catch(error){finish(error);}
    finally{r.running=false;this.#busy=false;if(r.invalid)this.#finishReverse(r);}
   },error=>{try{finish(error);}finally{r.running=false;this.#busy=false;if(r.invalid)this.#finishReverse(r);}}]);
   timer=reverseSetTimeout(()=>finish(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT')),ms);
  });
 }
 async #verifyReverse(r){
  const {p,expected}=r,current=()=>{r.current();checkOriginalRecoveryWork(p.sourceRepository,r.ticket);};current();
  // Source reads are automatically attributed by the original work window.
  // Other fixed repositories charge every returned row into that SAME ticket.
  const source=await rows(p.sourceRepository);current();reverseCharge(r,expected.source,0);if(!equal(source,expected.source))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
  const target=await rows(p.targetRepository);current();for(const values of Object.values(target)){
   for(const row of values)reverseCharge(r,row,1);
   // Conservatively include every page request/probe and all potential probe
   // keys in the same ticket, beyond the actual returned row payloads.
   reverseCharge(r,values.map(row=>row.id),1+2*Math.floor(values.length/64));
  }reverseCharge(r,expected.target,0);if(!equal(target,expected.target))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
  reverseCharge(r,CANONICAL_GENERATION_REGISTRY,1);const root=await registryRoot(p.registry);current();reverseCharge(r,root,0);reverseCharge(r,p.record.registryRoot,0);if(!equal(root,p.record.registryRoot))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
  // This is the last awaited observation. Synchronous original fences below
  // cannot certify other live connections, host documents or global silence.
  reverseCharge(r,STORAGE_KEY,1);const local=await localRow(this.#local,this.#localGet);current();reverseCharge(r,local,0);reverseCharge(r,expected.after,0);if(!equal(local,expected.after))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');current();
 }
 #finishReverse(r){if(r.ticket&&!r.finished&&!r.running){finishOriginalRecoveryWork(r.p.sourceRepository,r.ticket);r.finished=true;}}
 #discardReverse(){const r=this.#reverse;if(!r)return;r.invalid=true;this.#reverse=null;this.#finishReverse(r);}
 async rollback(){fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');}
 close(){this.#lifetime++;this.#discardPrepared(this.#prepared);}
}

function reverseCharge(r,value,references=1){r.current();chargeOriginalRecoveryWork(r.p.sourceRepository,r.ticket,measureSourceWorkingPhysicalTree(value).B,references);}
async function originalReverseExpected(p,r){
 const base=p.record,prior=p.fences;
 if(base.phase!=='prepared'||base.role!=='source'||prior.reservation||!Number.isSafeInteger(prior.revision+1)||!Number.isSafeInteger(base.targetGate.writeRevision+3)||p.sourceRows.meta.some(row=>row.id===APPLICATION_SELECTION_MARKER)||p.targetRows.meta.some(row=>row.id===APPLICATION_SELECTION_MARKER||row.id===CONTROL_PUBLICATION_RESERVATION))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
 const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:prior.revision+1,nonce:base.operationId,databaseId:base.targetDatabaseId,beforeDigest:base.beforeDigest,afterDigest:null,fenceDigest:null},fences={migration:prior.migration,gate:prior.gate,epoch:prior.epoch};
 const after=controlPublicationRow(control(p.before),base.targetDatabaseId,reservation);reverseCharge(r,[p.before,reservation,fences,after],0);
 const afterDigest=await digest(after);r.current();checkOriginalRecoveryWork(p.sourceRepository,r.ticket);const fenceDigest=await digest(fences);r.current();checkOriginalRecoveryWork(p.sourceRepository,r.ticket);
 const selected=marker({...base,phase:'selected',afterDigest,reservation:{...reservation,afterDigest,fenceDigest},fences});
 const source=copy(p.sourceRows),target=copy(p.targetRows),replace=(rows,row)=>{const index=rows.findIndex(value=>value.id===row.id);if(index<0)rows.push(row);else rows[index]=row;rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);};
 replace(source.meta,selected);replace(target.meta,{id:CONTROL_PUBLICATION_REVISION,version:1,revision:reservation.revision});replace(target.meta,{...base.targetGate,writeRevision:base.targetGate.writeRevision+3});
 reverseCharge(r,[source,target],0);return {source,target,after};
}

async function finishSelection(source,target,registry,local,record,cold,guarded=null){
 const readLocal=()=>localRow(local,guarded?.get??local.get);
 const attempt=async(repository,fn,keys)=>{guarded?.marker();return write(repository,async tx=>{guarded?.check();const value=await fn(tx);guarded?.check();return value;},keys);};
 await sameRegistry(registry,record);let s=marker(await point(source,APPLICATION_SELECTION_MARKER)),t=await point(target,APPLICATION_SELECTION_MARKER);
 if(s.role!=='source'||t!==undefined&&!equal({...s,role:'target'},t)){
  // Final source receipt can precede target cleanup after a lost response.
  const preparedTransition=s.phase==='prepared'&&t?.role==='target'&&t.phase==='dispatched'&&equal({...t,role:'source',phase:'prepared',afterDigest:null,reservation:null,fences:null},s);
  if(!preparedTransition&&(s.phase!=='selected'||t&&!equal({...s,role:'target',phase:'dispatched'},t)))fail();
 }
 if(s.phase==='selected')return settleSelection(source,target,registry,local,s);
 if(s.phase==='dispatched'){
  if(await digest(await readLocal())!==s.afterDigest)return {state:'outcome-unknown',operationId:s.operationId,retryAllowed:false};
  await write(source,async tx=>{if(!equal(await tx.get('meta',APPLICATION_SELECTION_MARKER),s))fail();await tx.put('meta',{...s,phase:'selected'});});return settleSelection(source,target,registry,local,{...s,phase:'selected'});
 }
 if(cold&&t===undefined){await write(target,async tx=>{if(await tx.get('meta',APPLICATION_SELECTION_MARKER))fail();checkGate(await tx.get('meta',CANONICAL_GENERATION_GATE),s);await tx.put('meta',{...s,role:'target'});});}
 if(cold&&t?.phase==='dispatched'){return {state:'prepared',operationId:s.operationId,retryAllowed:false,cancelAvailable:true};}
 checkGate(await point(target,CANONICAL_GENERATION_GATE),s,1);
 const before=await readLocal();if(await digest(before)!==s.beforeDigest)fail();
 const prior=await originalGenerationRepositoryRead(target,readControlPublicationFence,['meta']);if(prior.reservation||prior.migration?.databaseId!==s.targetDatabaseId||prior.gate?.epoch!==before.settings.epoch||prior.gate?.enabled!==before.settings.enabled)fail();
 const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:prior.revision+1,nonce:s.operationId,databaseId:s.targetDatabaseId,beforeDigest:s.beforeDigest,afterDigest:null,fenceDigest:null},fences={migration:prior.migration,gate:prior.gate,epoch:prior.epoch};
 const after=controlPublicationRow(control(before),s.targetDatabaseId,reservation),afterDigest=await digest(after),fenceDigest=await digest(fences),reserved={...reservation,afterDigest,fenceDigest};
 const next={...s,phase:'dispatched',afterDigest,reservation:reserved,fences};
 await attempt(target,async tx=>{if(!equal(await tx.get('meta',APPLICATION_SELECTION_MARKER),{...s,role:'target'}))fail();checkGate(await tx.get('meta',CANONICAL_GENERATION_GATE),s,1);const actual=await reserveControlPublication(tx,prior,{nonce:s.operationId,databaseId:s.targetDatabaseId,beforeDigest:s.beforeDigest});if(!equal(actual,reservation))fail();await tx.put('meta',reserved);await tx.put('meta',{...next,role:'target'});},[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION]);
 await attempt(source,async tx=>{if(!equal(await tx.get('meta',APPLICATION_SELECTION_MARKER),s))fail();await tx.put('meta',next);});
 await sameRegistry(registry,next);if(await digest(await readLocal())!==s.beforeDigest)fail();
 // Exactly one original SDK dispatch. Failure is unresolved until the durable
 // exact after-row is observed; no repeat set and no timeout-based unlocking.
 // This original synchronous check is after every pre-dispatch await. It
 // checks only this original live owner and SDK identity; it is no host proof.
 guarded?.sdk();
 try{await originalSelectionApply(guarded?.set??local.set,local,[{[STORAGE_KEY]:after}]);}catch{}
 if(await digest(await readLocal())!==afterDigest)return {state:'outcome-unknown',operationId:s.operationId,retryAllowed:false};
 await write(source,async tx=>{if(!equal(await tx.get('meta',APPLICATION_SELECTION_MARKER),next))fail();await tx.put('meta',{...next,phase:'selected'});});
 return settleSelection(source,target,registry,local,{...next,phase:'selected'});
}
async function settleSelection(source,target,registry,local,s){
 await sameRegistry(registry,s);const pending=await point(target,APPLICATION_SELECTION_MARKER);
 if(pending){if(!equal(pending,{...s,role:'target',phase:'dispatched'})||await digest(await localRow(local))!==s.afterDigest)fail();await write(target,async tx=>{if(!equal(await tx.get('meta',APPLICATION_SELECTION_MARKER),pending))fail();checkGate(await tx.get('meta',CANONICAL_GENERATION_GATE),s,2);await requireControlPublicationOwner(tx,s.reservation,s.fences);await tx.delete('meta',CONTROL_PUBLICATION_RESERVATION);await tx.delete('meta',APPLICATION_SELECTION_MARKER);},[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_RESERVATION]);}
 const gate=await point(target,CANONICAL_GENERATION_GATE);if(!equal({...gate,writeRevision:s.targetGate.writeRevision},s.targetGate)||gate.writeRevision<s.targetGate.writeRevision+3||(await localRow(local)).databaseId!==s.targetDatabaseId)fail();
 return {state:'selected',operationId:s.operationId,priorLibraryRetained:true,reloadRequired:true,rollbackAllowed:false,rollbackReason:'reverse-inheritance-required',wholeArchiveComplete:false};
}
async function openSelection(local,factory,authority){
 const source=new (originalOrganizerConstructor())(local,{indexedDB:factory});let target,registry;
 try{await openOriginalExistingRepository(source.repository);const s=await point(source.repository,APPLICATION_SELECTION_MARKER);if(s===undefined)return {source,record:null,close:()=>source.repository.db?.close()};marker(s);if(s.role!=='source'||(await point(source.repository,'migration'))?.databaseId!==s.sourceDatabaseId)fail();
  registry=new ArchiveRepository(local,{indexedDB:factory,name:APPLICATION_SELECTION_REGISTRY});const p=new CanonicalGenerationPublication(registry);target=await openOriginalPublishedOrganizerForSelection(p,local,authority);if(target.repository.name!==s.targetName||(await point(target.repository,'migration'))?.databaseId!==s.targetDatabaseId)fail();await sameRegistry(registry,s);
  return {source,target,registry,record:s,close:()=>{source.repository.db?.close();target.repository.db?.close();registry.db?.close();}};
 }catch(error){source.repository.db?.close();target?.repository.db?.close();registry?.db?.close();throw error;}
}
// V1 receipts retain identity/phase, not the original nonrenewable accounting
// or deadline. A new process may OBSERVE them, never resume their writes, SDK
// dispatch or cancellation. Even a matching SDK after-row cannot finish UNKNOWN.
const coldIncomplete=(s,state)=>({state,operationId:s.operationId,retryAllowed:false,cancelAvailable:false,coldWriteAllowed:false,recoveryReason:'original-accounting-unavailable'});
async function observeColdSelection(o,local){
 const s=o.record;if(!s)return {state:'not-prepared'};
 if(s.phase!=='selected')return coldIncomplete(s,s.phase==='dispatched'?'outcome-unknown':'prepared');
 const r=s.reservation;
 if(!exact(r,['id','version','revision','nonce','databaseId','beforeDigest','afterDigest','fenceDigest'])||r.id!==CONTROL_PUBLICATION_RESERVATION||r.version!==1||!Number.isSafeInteger(r.revision)||r.revision<1||r.nonce!==s.operationId||r.databaseId!==s.targetDatabaseId||r.beforeDigest!==s.beforeDigest||r.afterDigest!==s.afterDigest||!hash(r.fenceDigest)||!exact(s.fences,['migration','gate','epoch'])||s.fences.migration?.phase!=='active'||s.fences.migration.databaseId!==s.targetDatabaseId||await digest(s.fences)!==r.fenceDigest)fail();
 const get=local.get,current=()=>{if(local.get!==get)fail('GENERATION_SELECTION_CAPABILITY');};
 const targetState=()=>originalGenerationRepositoryRead(o.target.repository,async t=>{
  registerOriginalRepositoryReadWorkLimit(o.target.repository,t);
  return {pending:await t.get('meta',APPLICATION_SELECTION_MARKER),gate:await t.get('meta',CANONICAL_GENERATION_GATE),control:await readControlPublicationFence(t)};
 },['meta']);
 const pending=value=>{
  if(value.pending!==undefined&&!equal(value.pending,{...s,role:'target',phase:'dispatched'}))fail();
  return value.pending!==undefined||value.control.reservation!==undefined;
 };
 current();await sameRegistry(o.registry,s);const first=await targetState();current();
 if(pending(first))return coldIncomplete(s,'finishing');
 const gate=first.gate,c=first.control;
 if(!Number.isSafeInteger(gate?.writeRevision)||!Number.isSafeInteger(s.targetGate.writeRevision+3)||!equal({...gate,writeRevision:s.targetGate.writeRevision},s.targetGate)||gate.writeRevision<s.targetGate.writeRevision+3)fail();
 const before=await localRow(local,get);current();
 if(before.databaseId!==s.targetDatabaseId||c.migration?.phase!=='active'||c.migration.databaseId!==s.targetDatabaseId||c.gate?.epoch!==before.settings?.epoch||c.gate?.enabled!==before.settings?.enabled||!exact(before.controlPublication,['version','revision','nonce'])||before.controlPublication.version!==1||!tokenId(before.controlPublication.nonce)||before.controlPublication.revision!==c.revision||c.revision<s.reservation.revision)fail();
 // At the original revision the exact original control receipt still applies.
 // Later legitimate original publications and target edits remain compatible;
 // they are current-state observations, never a reconstruction of the old cut.
 if(c.revision===s.reservation.revision&&(before.controlPublication.nonce!==s.reservation.nonce||await digest(before)!==s.afterDigest))fail();
 if(!equal(await point(o.source.repository,APPLICATION_SELECTION_MARKER),s))fail();
 await sameRegistry(o.registry,s);const last=await targetState();current();
 if(pending(last))return coldIncomplete(s,'finishing');
 if(!equal(first,last)||!equal(await localRow(local,get),before)||!equal(await point(o.source.repository,APPLICATION_SELECTION_MARKER),s))fail();current();
 return {state:'selected',operationId:s.operationId,priorLibraryRetained:true,reloadRequired:true,rollbackAllowed:false,rollbackReason:'reverse-inheritance-required',wholeArchiveComplete:false,retryAllowed:false,cancelAvailable:false,coldWriteAllowed:false};
}
export async function inspectOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{return await observeColdSelection(o,local);}finally{o.close();}}
export async function continueOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{return await observeColdSelection(o,local);}finally{o.close();}}
export async function cancelOriginalApplicationGenerationSelection(local,factory,authority=null){
 const o=await openSelection(local,factory,authority);try{if(!o.record)return {state:'not-prepared'};fail(o.record.phase==='prepared'?'GENERATION_SELECTION_COLD_ACCOUNT_REQUIRED':'GENERATION_SELECTION_OUTCOME_UNKNOWN');}finally{o.close();}
}
// Cold application startup consumes only the durable original selected receipt;
// it does not prepare, dispatch, cancel, repair or choose a caller database.
export async function openOriginalSelectedExistingApplication(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record){o.close();return null;}if((await observeColdSelection(o,local)).state!=='selected')fail('GENERATION_SELECTION_PENDING');const selected=o.target;o.source.repository.db?.close();return selected;}catch(error){o.close();throw error;}}
