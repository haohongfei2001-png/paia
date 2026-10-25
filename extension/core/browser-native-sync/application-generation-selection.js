import {equalSourceWorkingPhysicalTree as equal,measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {hashText} from '../dedupe.js';
import {ArchiveError,STORAGE_KEY} from '../constants.js';
import {ArchiveRepository,DATABASE_NAME,openOriginalExistingRepository,originalGenerationRepositoryRead,originalApplicationSelectionTransaction,originalApplicationSelectionRead,registerRepositoryWorkLimit,registerOriginalRepositoryReadWorkLimit,observeRepositoryWriteFence,requireRepositoryWriteFence,createOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork,remainingOriginalRecoveryWork,requireOriginalRecoveryWorkCapacity} from '../idb-repository.js';
import {originalOrganizerConstructor} from '../organizer/store-owner.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {BrowserNativeSyncCore,requireOriginalGenerationCoreMethods} from './core.js';
import {CanonicalGenerationPublication,openOriginalPublishedOrganizerForSelection,CANONICAL_GENERATION_GATE,CANONICAL_GENERATION_REGISTRY} from './canonical-generation-publication.js';
import {prepareOriginalApplicationInheritanceCut,requireOriginalApplicationInheritanceCut,readOriginalApplicationInheritanceCut} from './group-checkpoint.js';
import {readGroupRows} from './group-page-reader.js';
import {controlPublicationEncoding,controlPublicationDigest as digest,controlPublicationRow,readControlPublicationFence,reserveControlPublication,requireControlPublicationOwner,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';

export const APPLICATION_SELECTION_MARKER='application-generation-selection:v1';
export const APPLICATION_RETURN_RECEIPT='application-generation-return:v1';
export const APPLICATION_SELECTION_REGISTRY='paia-canonical-generation-registry-v1';
const originalSelectionApply=Reflect.apply,selectionReviews=new WeakMap(),selectionRestrictions=new WeakMap(),restrictionTokens=new WeakMap();
const ReversePromise=Promise,reverseResolve=Promise.resolve,reverseThen=Promise.prototype.then,reverseSetTimeout=setTimeout,reverseClearTimeout=clearTimeout;
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
export function readOriginalApplicationSelectionAuthority(token,repository,scope){const r=authorities.get(token);if(!r)return null;if(r.repository!==repository||r.name!==repository.name||r.factory!==repository.factory||r.database!==repository.db||scope&&scope.tx.db!==repository.db||scope&&r.scope&&r.scope!==scope)fail('GENERATION_SELECTION_CAPABILITY');if(scope)r.scope=scope;return r;}
export function requireOriginalApplicationSelectionMutation(authority,table,key,method){if(!authority||table!=='meta'||!authority.keys.includes(key)||!['put','delete'].includes(method))fail('GENERATION_SELECTION_WRITE_DENIED');}
async function write(repository,fn,keys=[APPLICATION_SELECTION_MARKER],stores=['meta']){
 const token=Object.freeze(Object.create(null));authorities.set(token,{repository,name:repository.name,factory:repository.factory,database:repository.db,scope:null,keys:Object.freeze([...keys])});
 try{return await originalApplicationSelectionTransaction(repository,token,async t=>{registerRepositoryWorkLimit(repository,t);return fn(t);},stores);}finally{authorities.delete(token);}
}
async function rows(repository){return originalGenerationRepositoryRead(repository,async t=>{registerOriginalRepositoryReadWorkLimit(repository,t);const value={};for(const table of repository.stores)value[table]=await readGroupRows(t,table);return value;},repository.stores);}
async function requireRows(repository,t,expected){for(const table of repository.stores)if(!equal(await readGroupRows(t,table),expected[table]))fail();}

const control=value=>Object.fromEntries(['settings','preferences','diagnostics','memoryAccessPolicy','classificationRules','filterRules'].map(k=>[k,copy(value[k])]));
async function localRow(local,get=local.get){const value=(await originalSelectionApply(get,local,[STORAGE_KEY]))[STORAGE_KEY];if(!value||value.schemaVersion!==6||!tokenId(value.databaseId))fail();return value;}
async function registryRoot(repository){return originalGenerationRepositoryRead(repository,t=>t.get('meta',CANONICAL_GENERATION_REGISTRY),['meta']);}
async function point(repository,key){return originalGenerationRepositoryRead(repository,t=>t.get('meta',key),['meta']);}
async function sameRegistry(registry,row){if(!equal(await registryRoot(registry),row.registryRoot))fail();}
function checkGate(actual,row,increment=0){if(!equal(actual,{...row.targetGate,writeRevision:row.targetGate.writeRevision+increment}))fail();}

// Read-only identity query; only the original constructor registers a closure.
// Returning a review ID is not a reservation, a global permit or a writer token.
export function readOriginalApplicationSelectionReview(owner,store,core,local){
 const read=selectionReviews.get(owner);if(!read)fail('GENERATION_SELECTION_CAPABILITY');return read(store,core,local);
}

// Restriction only: this original owner cannot activate, continue, inspect a
// settling receipt or cancel while held. No callback can provide readiness.
export function holdOriginalApplicationSelectionReview(owner,store,core,local){
 readOriginalApplicationSelectionReview(owner,store,core,local);const r=selectionRestrictions.get(owner);if(!r)fail('GENERATION_SELECTION_CAPABILITY');return r.hold();
}
export function requireOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.current();
}
export function releaseOriginalApplicationSelectionReviewHold(token,owner){
 const r=restrictionTokens.get(token);if(!r||r.owner!==owner)fail('GENERATION_SELECTION_CAPABILITY');return r.release();
}

// Explicit existing-library selection. It only selects an already published,
// retired-copy candidate proven to contain the exact complete current cut.
// It never creates a candidate, imports an unknown family or deletes a library.
export class OriginalApplicationGenerationSelection{
 #source;#core;#local;#localGet;#localSet;#factory;#authority;#prepared=null;#busy=false;#lifetime=0;#restriction=null;#reverse=null;
 constructor(store,core,local,aiFilterAuthority=null){requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);if(store.repository!==core.repository||store.repository.name!==DATABASE_NAME||store.local!==local)fail('GENERATION_SELECTION_CAPABILITY');this.#source=store;this.#core=core;this.#local=local;this.#factory=store.repository.factory;this.#authority=aiFilterAuthority;this.#localGet=local.get;this.#localSet=local.set;
  selectionReviews.set(this,(s,c,l)=>{const p=cuts.get(this.#prepared);if(s!==this.#source||c!==this.#core||l!==this.#local||!p||p.owner!==this||this.#source.repository!==p.sourceRepository||this.#source.repository.db!==p.sourceDatabase||this.#core.repository!==p.sourceRepository||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_SELECTION_NOT_PREPARED');return Object.freeze({operationId:p.record.operationId});});
  selectionRestrictions.set(this,{hold:()=>{
   if(this.#busy||this.#restriction)fail('GENERATION_SELECTION_BUSY');
   const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
   if(!p||p.owner!==this||p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');
   const token=Object.freeze(Object.create(null));let released=false,invalid=false;
   const current=()=>{try{if(invalid||released||this.#restriction!==token||this.#busy||this.#prepared!==prepared||this.#lifetime!==lifetime||cuts.get(prepared)!==p||p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');selectionReviews.get(this)(this.#source,this.#core,this.#local);return true;}catch(error){invalid=true;throw error;}};
   this.#restriction=token;restrictionTokens.set(token,{owner:this,current,release:()=>{current();released=true;this.#restriction=null;return true;}});return token;
  }});
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
  const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
  if(this.#busy||!p||p.owner!==this)fail('GENERATION_SELECTION_NOT_PREPARED');this.#busy=true;
  const current=()=>{
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
   const next=Object.freeze(Object.create(null));cuts.set(next,{...p,sourceProof,targetProof,sourceRows,targetRows});cuts.delete(prepared);this.#prepared=next;
   return {state:'prepared',scope:'exact-existing-cut',operationId:p.record.operationId,wholeArchiveComplete:false};
  }catch(error){this.#discardPrepared(prepared);throw error;}finally{this.#busy=false;}
 }
 #discardPrepared(prepared){this.#discardReverse();const p=cuts.get(prepared);p?.candidate.repository.db?.close();p?.registry.db?.close();cuts.delete(prepared);if(this.#prepared===prepared)this.#prepared=null;}
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
 // Actual low-level protocol on this same selected owner. This is not a
 // production global-hold consumer, and accepts no caller review/ready token.
 async activateReverse(){
  if(arguments.length)fail('GENERATION_SELECTION_CAPABILITY');
  if(this.#busy||this.#restriction)fail('GENERATION_SELECTION_BUSY');
  const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
  if(!p||p.owner!==this||!p.attempted)fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
  this.#discardReverse();this.#busy=true;
  const registryIdentity=[p.registry.db,p.registry.name,p.registry.factory],tails=[this.#source.tail,p.candidate.tail];
  const current=()=>{if(this.#prepared!==prepared||cuts.get(prepared)!==p||this.#lifetime!==lifetime||this.#restriction||this.#source.repository!==p.sourceRepository||this.#core.repository!==p.sourceRepository||p.sourceRepository.db!==p.sourceDatabase||p.sourceRepository.name!==p.sourceName||p.sourceRepository.factory!==p.sourceFactory||this.#source.databaseId!==p.sourceReview.databaseId||this.#core.deviceId!==p.coreDeviceId||p.candidate.repository!==p.targetRepository||p.targetCore.repository!==p.targetRepository||p.targetRepository.db!==p.targetDatabase||p.targetRepository.name!==p.record.targetName||p.targetRepository.factory!==p.targetFactory||p.candidate.databaseId!==p.targetReview.databaseId||p.targetCore.deviceId!==p.targetDeviceId||p.registry.db!==registryIdentity[0]||p.registry.name!==registryIdentity[1]||p.registry.factory!==registryIdentity[2]||p.registry.name!==APPLICATION_SELECTION_REGISTRY||this.#source.tail!==tails[0]||p.candidate.tail!==tails[1]||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_REVERSE_REVIEW_CHANGED');requireOriginalLibraryDocumentsGenerationMethods(this.#source);requireOriginalLibraryDocumentsGenerationMethods(p.candidate);requireOriginalGenerationCoreMethods(this.#core);requireOriginalGenerationCoreMethods(p.targetCore);};
  let work;try{current();work=returnWork(p.sourceRepository,current,[p.sourceRepository,p.targetRepository,p.registry]);return await runReturn(work,async()=>{
   const r={p,ticket:work.ticket,current:work.check};
   const expected=await originalReverseExpected(p,r);work.check();
   const source=expected.source,target=expected.target;
   // Their first original full transaction compares every row before writing;
   // a separate pre-read of these same retained operands supplies no authority.
   returnEqual(work,await returnRoot(work,p.registry),p.record.registryRoot);
   const before=await returnLocal(work,this.#local,this.#localGet);returnEqual(work,before,expected.after);
   const prior=await returnRead(work,p.sourceRepository,readControlPublicationFence,['meta']);
   if(prior.reservation||prior.migration?.databaseId!==p.record.sourceDatabaseId||prior.gate?.epoch!==before.settings.epoch||prior.gate?.enabled!==before.settings.enabled)fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');
   const operationId=crypto.randomUUID(),beforeDigest=await returnDigest(work,before),fences={migration:prior.migration,gate:prior.gate,epoch:prior.epoch};
   const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:prior.revision+1,nonce:operationId,databaseId:p.record.sourceDatabaseId,beforeDigest,afterDigest:null,fenceDigest:null};
   const after=controlPublicationRow(control(before),p.record.sourceDatabaseId,reservation),afterDigest=await returnDigest(work,after),fenceDigest=await returnDigest(work,fences);
   const record=reverseMarker({id:APPLICATION_SELECTION_MARKER,version:2,direction:'return',operationId,role:'source',phase:'prepared',forward:source.meta.find(row=>row.id===APPLICATION_SELECTION_MARKER),beforeDigest,afterDigest,reservation:{...reservation,afterDigest,fenceDigest},fences,sourceRevision:prior.revision,sourceHashes:await returnHashes(work,source),targetHashes:await returnHashes(work,target)});
   await returnWrite(work,p.sourceRepository,async tx=>{await returnRequireRows(work,p.sourceRepository,tx,source);await tx.put('meta',record);},[APPLICATION_SELECTION_MARKER],p.sourceRepository.stores);
   replaceReturnRow(source.meta,record);
   await returnWrite(work,p.targetRepository,async tx=>{await returnRequireRows(work,p.targetRepository,tx,target);await tx.put('meta',{...record,role:'target'});},[APPLICATION_SELECTION_MARKER],p.targetRepository.stores);
   replaceReturnRow(target.meta,{...record,role:'target'});advanceReturnGate(target,1);
   const intent={...record,phase:'intent'};
   await returnWrite(work,p.sourceRepository,async tx=>{await returnRequireRows(work,p.sourceRepository,tx,source);const actual=await reserveControlPublication(tx,prior,{nonce:operationId,databaseId:p.record.sourceDatabaseId,beforeDigest});returnEqual(work,actual,reservation);await tx.put('meta',intent.reservation);await tx.put('meta',intent);},[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION],p.sourceRepository.stores);
   replaceReturnRow(source.meta,intent);replaceReturnRow(source.meta,intent.reservation);replaceReturnRow(source.meta,{id:CONTROL_PUBLICATION_REVISION,version:1,revision:reservation.revision});
   await returnWrite(work,p.targetRepository,async tx=>{await returnRequireRows(work,p.targetRepository,tx,target);await tx.put('meta',{...intent,role:'target'});},[APPLICATION_SELECTION_MARKER],p.targetRepository.stores);
   replaceReturnRow(target.meta,{...intent,role:'target'});advanceReturnGate(target,1);
   returnEqual(work,await returnRoot(work,p.registry),intent.forward.registryRoot);
   returnEqual(work,await returnRows(work,p.sourceRepository),source);returnEqual(work,await returnRows(work,p.targetRepository),target);
   returnEqual(work,await returnLocal(work,this.#local,this.#localGet),before);
   // No await between final original identity check and the one SDK dispatch.
   requireReturnMinimumCompletionCapacity(work,source,target);work.check();try{await originalSelectionApply(this.#localSet,this.#local,[{[STORAGE_KEY]:after}]);}catch{}
   work.check();if(!equal(await returnLocal(work,this.#local,this.#localGet),after))return returnUnknown(intent);
   return await settleReturn(work,p.sourceRepository,p.targetRepository,p.registry,this.#local,this.#localGet,intent,{a:source,b:target});
  },()=>{this.#busy=false;});}catch(error){if(!work)this.#busy=false;throw error;}
 }
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
 try{await openOriginalExistingRepository(source.repository);const s=await point(source.repository,APPLICATION_SELECTION_MARKER),receipt=await point(source.repository,APPLICATION_RETURN_RECEIPT);if(!s&&!receipt)return {source,record:null,close:()=>source.repository.db?.close()};if(receipt){if(s)fail();requireOriginalApplicationReturnReceipt(receipt,(await point(source.repository,'migration'))?.databaseId);}const record=s??receipt.record,reverse=record.version===2;reverse?reverseMarker(record):marker(record);const f=reverse?record.forward:record;if(record.role!=='source'||(await point(source.repository,'migration'))?.databaseId!==f.sourceDatabaseId)fail();
  registry=new ArchiveRepository(local,{indexedDB:factory,name:APPLICATION_SELECTION_REGISTRY});const p=new CanonicalGenerationPublication(registry);target=await openOriginalPublishedOrganizerForSelection(p,local,authority);if(target.repository.name!==f.targetName||(await point(target.repository,'migration'))?.databaseId!==f.targetDatabaseId)fail();await sameRegistry(registry,f);
  return {source,target,registry,record,receipt,reverse,close:()=>{source.repository.db?.close();target.repository.db?.close();registry.db?.close();}};
 }catch(error){source.repository.db?.close();target?.repository.db?.close();registry?.db?.close();throw error;}
}
export async function inspectOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record)return {state:'not-prepared'};if(o.reverse)return await inspectReturn(o,local);if(o.record.phase==='selected'){if(await point(o.target.repository,APPLICATION_SELECTION_MARKER))return {state:'finishing',operationId:o.record.operationId};return await settleSelection(o.source.repository,o.target.repository,o.registry,local,o.record);}return {state:o.record.phase==='dispatched'?'outcome-unknown':'prepared',operationId:o.record.operationId,retryAllowed:false};}finally{o.close();}}
export async function continueOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record)return {state:'not-prepared'};if(o.reverse)return await continueReturn(o,local);return await finishSelection(o.source.repository,o.target.repository,o.registry,local,o.record,true);}finally{o.close();}}
export async function cancelOriginalApplicationGenerationSelection(local,factory,authority=null){
 const o=await openSelection(local,factory,authority);try{const s=o.record;if(!s)return {state:'not-prepared'};if(o.reverse)return await cancelReturn(o,local);if(s.phase!=='prepared')fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');if(await digest(await localRow(local))!==s.beforeDigest)fail();await sameRegistry(o.registry,s);
  const pending=await point(o.target.repository,APPLICATION_SELECTION_MARKER);if(pending){
   const reserved=pending.phase==='dispatched'&&equal({...pending,role:'source',phase:'prepared',afterDigest:null,reservation:null,fences:null},s);
   if(!reserved&&!equal(pending,{...s,role:'target'}))fail();
   await write(o.target.repository,async t=>{if(!equal(await t.get('meta',APPLICATION_SELECTION_MARKER),pending))fail();checkGate(await t.get('meta',CANONICAL_GENERATION_GATE),s,reserved?2:1);if(reserved){await requireControlPublicationOwner(t,pending.reservation,pending.fences);await t.delete('meta',CONTROL_PUBLICATION_RESERVATION);}await t.delete('meta',APPLICATION_SELECTION_MARKER);},reserved?[APPLICATION_SELECTION_MARKER,CONTROL_PUBLICATION_RESERVATION]:undefined);
  }
  await write(o.source.repository,async t=>{if(!equal(await t.get('meta',APPLICATION_SELECTION_MARKER),s))fail();await t.delete('meta',APPLICATION_SELECTION_MARKER);});return {state:'cancelled',priorLibraryRetained:true};
 }finally{o.close();}
}
// Cold application startup consumes only the durable original selected receipt;
// it does not prepare, dispatch, cancel, repair or choose a caller database.
export async function openOriginalSelectedExistingApplication(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record){o.close();return null;}if(o.reverse){if(!o.receipt)fail('GENERATION_SELECTION_PENDING');await inspectReturn(o,local);o.target.repository.db?.close();o.registry.db?.close();return o.source;}if(o.record.phase!=='selected'||await point(o.target.repository,APPLICATION_SELECTION_MARKER))fail('GENERATION_SELECTION_PENDING');await settleSelection(o.source.repository,o.target.repository,o.registry,local,o.record);const selected=o.target;o.source.repository.db?.close();return selected;}catch(error){o.close();throw error;}}

// Additive original return protocol. These records are receipts/restrictions,
// never proof that other worker owners, host documents or connections are quiet.
const activeReturns=new WeakMap();
const reverseKeys=['id','version','direction','operationId','role','phase','forward','beforeDigest','afterDigest','reservation','fences','sourceRevision','sourceHashes','targetHashes'];
function reverseMarker(value){
 if(!exact(value,reverseKeys)||value.id!==APPLICATION_SELECTION_MARKER||value.version!==2||value.direction!=='return'||!tokenId(value.operationId)||!['source','target'].includes(value.role)||!['prepared','intent','returned'].includes(value.phase)||!hash(value.beforeDigest)||!hash(value.afterDigest)||!Number.isSafeInteger(value.sourceRevision)||value.sourceRevision<0)fail();
 const f=marker(value.forward);if(f.role!=='source'||f.phase!=='selected'||f.sourceDatabaseId===f.targetDatabaseId||value.operationId===f.operationId||!exact(value.fences,['migration','gate','epoch'])||value.fences.migration?.databaseId!==f.sourceDatabaseId||!exact(value.reservation,['id','version','revision','nonce','databaseId','beforeDigest','afterDigest','fenceDigest'])||value.reservation.id!==CONTROL_PUBLICATION_RESERVATION||value.reservation.version!==1||value.reservation.revision!==value.sourceRevision+1||value.reservation.nonce!==value.operationId||value.reservation.databaseId!==f.sourceDatabaseId||value.reservation.beforeDigest!==value.beforeDigest||value.reservation.afterDigest!==value.afterDigest||!hash(value.reservation.fenceDigest))fail();
 for(const hashes of [value.sourceHashes,value.targetHashes])if(!hashes||Object.getPrototypeOf(hashes)!==Object.prototype||!Object.keys(hashes).length||!Object.entries(hashes).every(([table,d])=>typeof table==='string'&&hash(d)))fail();
 return value;
}
export function requireOriginalApplicationReturnReceipt(row,databaseId){
 if(!exact(row,['id','version','databaseId','record'])||row.id!==APPLICATION_RETURN_RECEIPT||row.version!==1||row.databaseId!==databaseId)fail();
 const r=reverseMarker(row.record);if(r.role!=='source'||r.phase!=='returned'||r.forward.sourceDatabaseId!==databaseId)fail();return true;
}
function returnReceipt(record){return {id:APPLICATION_RETURN_RECEIPT,version:1,databaseId:record.forward.sourceDatabaseId,record:{...record,role:'source',phase:'returned'}};}
function returnUnknown(record){return {state:'outcome-unknown',operationId:record.operationId,retryAllowed:false};}
function returnView(record){return {state:'returned',operationId:record.operationId,priorLibraryRetained:true,reloadRequired:true,rollbackAllowed:false,wholeArchiveComplete:false};}
function returnWork(repository,current=()=>true,allowed=[repository]){
 let active=activeReturns.get(repository.factory);if(!active){active=new Map();activeReturns.set(repository.factory,active);}if(active.has(repository.name))fail('GENERATION_SELECTION_BUSY');
 const work={repository,allowed:Object.freeze([...allowed]),factory:repository.factory,name:repository.name,database:repository.db,invalid:false,ticket:null};
 work.check=()=>{if(work.invalid||repository.factory!==work.factory||repository.name!==work.name||repository.db!==work.database)fail('GENERATION_REVERSE_REVIEW_CHANGED');current();if(work.ticket)checkOriginalRecoveryWork(repository,work.ticket);return true;};
 // The ticket's identity check cannot recursively query itself.
 work.ticket=createOriginalRecoveryWork(repository,{isCurrent:()=>{if(work.invalid||repository.factory!==work.factory||repository.name!==work.name||repository.db!==work.database)return false;return current();}});
 active.set(repository.name,work);work.release=()=>{if(active.get(repository.name)===work)active.delete(repository.name);finishOriginalRecoveryWork(repository,work.ticket);};return work;
}
function runReturn(work,action,settled=()=>{}){
 const ms=remainingOriginalRecoveryWork(work.repository,work.ticket);
 return new ReversePromise((resolve,reject)=>{let ended=false,timer;
  const report=(error,value)=>{if(ended)return;ended=true;reverseClearTimeout(timer);if(error)reject(error);else resolve(value);};
  // Timeout rejects only the caller. Original raw SDK/native work remains in
  // this operation and keeps both busy and the cold helper exclusion alive.
  const operation=originalSelectionApply(reverseThen,originalSelectionApply(reverseResolve,ReversePromise,[]),[action]);
  originalSelectionApply(reverseThen,operation,[value=>{try{work.check();report(null,value);}catch(error){report(error);}finally{work.release();settled();}},error=>{try{report(error);}finally{work.release();settled();}}]);
  timer=reverseSetTimeout(()=>{work.invalid=true;report(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},ms);
 });
}
function returnCharge(work,value,refs=0){work.check();chargeOriginalRecoveryWork(work.repository,work.ticket,measureSourceWorkingPhysicalTree(value).B,refs);}
function returnEqual(work,actual,expected){returnCharge(work,expected);if(!equal(actual,expected))fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');}
async function returnDigest(work,value){returnCharge(work,value);const encoded=controlPublicationEncoding(value);chargeOriginalRecoveryWork(work.repository,work.ticket,new TextEncoder().encode(encoded).length,0);const result=await digest(value);work.check();return result;}
async function returnHashes(work,value){
 const result={};for(const [table,values]of Object.entries(value)){
  // Original physical equality is structural, including undefined and -0,
  // without treating repeated references as cycles. Never JSON-normalize it.
  returnCharge(work,values);
  const encode=v=>v===undefined?'["u"]':v===null?'["null"]':typeof v==='string'?'["s",'+JSON.stringify(v)+']':typeof v==='boolean'?'["b",'+v+']':typeof v==='number'?'["n",'+JSON.stringify(Object.is(v,-0)?'-0':String(v))+']':Array.isArray(v)?'["a",['+v.map(encode).join(',')+']]':'["o",['+Object.keys(v).sort().map(k=>'['+JSON.stringify(k)+','+encode(v[k])+']').join(',')+']]';
  const encoded=encode(values);chargeOriginalRecoveryWork(work.repository,work.ticket,new TextEncoder().encode(encoded).length,0);result[table]=await hashText(encoded);work.check();
 }return result;
}
async function returnScoped(work,repository,writeMode,fn,keys,stores,parent=null){
 work.check();const token=Object.freeze(Object.create(null));if(!work.allowed.includes(repository))fail('GENERATION_SELECTION_CAPABILITY');const budget=Object.freeze({repository:work.repository,ticket:work.ticket,parent,work});
 authorities.set(token,{repository,name:repository.name,factory:repository.factory,database:repository.db,scope:null,keys:Object.freeze(keys),budget});
 try{return await (writeMode?originalApplicationSelectionTransaction:originalApplicationSelectionRead)(repository,token,async tx=>{work.check();const result=await fn(tx);work.check();return result;},stores);}finally{authorities.delete(token);}
}
// Fixed original active-generation preparation only. It borrows restriction,
// never mutation authority; IDB also requires the exact live parent preparation.
export function originalApplicationSelectionRelatedRead(token,repository,fn,stores){
 const r=authorities.get(token);if(!r?.budget||r.budget.parent||r.scope||!r.budget.work.allowed.includes(repository))fail('GENERATION_SELECTION_CAPABILITY');
 readOriginalApplicationSelectionAuthority(token,r.repository,null);
 return returnScoped(r.budget.work,repository,false,fn,[],stores,token);
}
const returnRead=(work,repository,fn,stores)=>returnScoped(work,repository,false,fn,[],stores);
const returnWrite=(work,repository,fn,keys,stores=['meta'])=>returnScoped(work,repository,true,fn,keys,stores);
const returnRows=(work,repository)=>returnRead(work,repository,async tx=>{const rows={};for(const table of repository.stores)rows[table]=await readGroupRows(tx,table);return rows;},repository.stores);
const returnPoint=(work,repository,key)=>returnRead(work,repository,tx=>tx.get('meta',key),['meta']);
const returnRoot=(work,repository)=>returnPoint(work,repository,CANONICAL_GENERATION_REGISTRY);
async function returnRequireRows(work,repository,tx,expected){for(const table of repository.stores)returnEqual(work,await readGroupRows(tx,table),expected[table]);}
async function returnLocal(work,local,get){returnCharge(work,STORAGE_KEY,1);const row=await localRow(local,get);work.check();returnCharge(work,row);return row;}
function replaceReturnRow(list,row){const index=list.findIndex(value=>value.id===row.id);if(index<0)list.push(copy(row));else list[index]=copy(row);list.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}
function removeReturnRow(list,key){const index=list.findIndex(value=>value.id===key);if(index>=0)list.splice(index,1);}
function advanceReturnGate(raw,by){const row=raw.meta.find(row=>row.id===CANONICAL_GENERATION_GATE);if(!row||!Number.isSafeInteger(row.writeRevision+by))fail();replaceReturnRow(raw.meta,{...row,writeRevision:row.writeRevision+by});}
async function requireReturnRaw(work,repository,record){
 const raw=await returnRows(work,repository),normalized=copy(raw);returnCharge(work,normalized);
 const actual=raw.meta.find(row=>row.id===APPLICATION_SELECTION_MARKER);returnEqual(work,actual,record);
 if(record.role==='source'){
  replaceReturnRow(normalized.meta,record.forward);
  const reservation=raw.meta.find(row=>row.id===CONTROL_PUBLICATION_RESERVATION),revision=raw.meta.find(row=>row.id===CONTROL_PUBLICATION_REVISION);
  if(record.phase==='prepared'){if(reservation)fail();}
  else{ returnEqual(work,reservation,record.reservation);returnEqual(work,revision,{id:CONTROL_PUBLICATION_REVISION,version:1,revision:record.reservation.revision});removeReturnRow(normalized.meta,CONTROL_PUBLICATION_RESERVATION);if(record.sourceRevision)replaceReturnRow(normalized.meta,{id:CONTROL_PUBLICATION_REVISION,version:1,revision:record.sourceRevision});else removeReturnRow(normalized.meta,CONTROL_PUBLICATION_REVISION); }
 }else{
  removeReturnRow(normalized.meta,APPLICATION_SELECTION_MARKER);
  const writes={prepared:1,intent:2,returned:3}[record.phase];
  const expected={...record.forward.targetGate,writeRevision:record.forward.targetGate.writeRevision+3+writes};returnEqual(work,raw.meta.find(row=>row.id===CANONICAL_GENERATION_GATE),expected);advanceReturnGate(normalized,-writes);
 }
 returnEqual(work,await returnHashes(work,normalized),record.role==='source'?record.sourceHashes:record.targetHashes);return raw;
}
async function requireReturnPair(work,source,target,registry,record){
 returnEqual(work,await returnRoot(work,registry),record.forward.registryRoot);
 const a=await requireReturnRaw(work,source,{...record,role:'source'}),b=await requireReturnRaw(work,target,{...record,role:'target'});
 return {a,b};
}
async function settleReturn(work,source,target,registry,local,get,record,warm=null){
 reverseMarker(record);if(record.phase!=='intent')fail();
 returnEqual(work,await returnRoot(work,registry),record.forward.registryRoot);
 const observed=await returnLocal(work,local,get);if(await returnDigest(work,observed)!==record.afterDigest)return returnUnknown(record);
 const a=warm?.a??await requireReturnRaw(work,source,record),pending=await returnPoint(work,target,APPLICATION_SELECTION_MARKER);
 const terminal={...record,role:'target',phase:'returned'};
 if(equal(pending,{...record,role:'target'})){
  const b=warm?.b??await requireReturnRaw(work,target,pending);
  await returnWrite(work,target,async tx=>{await returnRequireRows(work,target,tx,b);await tx.put('meta',terminal);},[APPLICATION_SELECTION_MARKER],target.stores);
 }else returnEqual(work,pending,terminal);
 // This helper has no cold caller: unfinished cold observations cannot
 // replenish the original write allowance. Warm retains the exact full cut.
 if(!warm)await requireReturnRaw(work,target,terminal);
 const row=await returnLocal(work,local,get);if(await returnDigest(work,row)!==record.afterDigest)return returnUnknown(record);
 const receipt=returnReceipt(record);returnCharge(work,receipt);
 await returnWrite(work,source,async tx=>{await returnRequireRows(work,source,tx,a);await requireControlPublicationOwner(tx,record.reservation,record.fences);await tx.put('meta',receipt);await tx.delete('meta',CONTROL_PUBLICATION_RESERVATION);await tx.delete('meta',APPLICATION_SELECTION_MARKER);},[APPLICATION_SELECTION_MARKER,APPLICATION_RETURN_RECEIPT,CONTROL_PUBLICATION_RESERVATION],source.stores);
 return returnView(record);
}

function coldReturnWork(o,local){
 const get=local.get,set=local.set,source=o.source.repository,target=o.target.repository,registry=o.registry,identities=[source,target,registry].map(r=>[r,r.db,r.name,r.factory]);
 const check=()=>{if(local.get!==get||local.set!==set||identities.some(([r,db,name,factory])=>r.db!==db||r.name!==name||r.factory!==factory))fail('GENERATION_REVERSE_REVIEW_CHANGED');};
 const work=returnWork(source,check,[source,target,registry]);return {work,get};
}
async function inspectReturn(o,local){
 const {work,get}=coldReturnWork(o,local);return runReturn(work,async()=>{
  const s=o.record;returnEqual(work,await returnRoot(work,o.registry),s.forward.registryRoot);
  if(!o.receipt)return {state:s.phase==='prepared'?'prepared':'outcome-unknown',operationId:s.operationId,retryAllowed:false,cancelAvailable:false};
  requireOriginalApplicationReturnReceipt(o.receipt,s.forward.sourceDatabaseId);
  returnEqual(work,await returnPoint(work,o.source.repository,APPLICATION_RETURN_RECEIPT),o.receipt);
  if(await returnPoint(work,o.source.repository,APPLICATION_SELECTION_MARKER)||await returnPoint(work,o.source.repository,CONTROL_PUBLICATION_RESERVATION)||await returnPoint(work,o.target.repository,CONTROL_PUBLICATION_RESERVATION))fail('GENERATION_SELECTION_PENDING');
  const target={...s,role:'target',phase:'returned'};await requireReturnRaw(work,o.target.repository,target);
  const migration=await returnPoint(work,o.source.repository,'migration'),row=await returnLocal(work,local,get);
  if(migration?.phase!=='active'||migration.databaseId!==s.forward.sourceDatabaseId||row.databaseId!==s.forward.sourceDatabaseId)fail('GENERATION_SELECTION_PENDING');
  // A may have legitimate later edits/control. The immutable receipt records
  // the completed return, not an ongoing promise that the live library froze.
  const revision=await returnPoint(work,o.source.repository,CONTROL_PUBLICATION_REVISION);if(!revision||revision.version!==1||!Number.isSafeInteger(revision.revision)||revision.revision<s.reservation.revision)fail();
  return returnView(s);
 });
}
async function continueReturn(o,local){
 if(o.receipt)return inspectReturn(o,local);
 const {work,get}=coldReturnWork(o,local);return runReturn(work,async()=>{
  const record=o.record,row=await returnLocal(work,local,get),observed=await returnDigest(work,row);
  returnEqual(work,await returnRoot(work,o.registry),record.forward.registryRoot);
  // This fresh READ-ONLY inspection has no authority to replenish the failed
  // operation's cumulative write allowance. A durable continuation accounting
  // protocol is not implemented; do not silently finish with a new ticket.
  return {...returnUnknown(record),readback:observed===record.afterDigest?'after-observed':observed===record.beforeDigest?'before-observed':'changed',completionRequired:'original-live-work'};
 });
}
async function cancelReturn(){fail('GENERATION_REVERSE_CONTINUATION_REQUIRED');}
function requireReturnMinimumCompletionCapacity(work,source,target){
 let references=0,bytes=0;
 for(const raw of [source,target])for(const values of Object.values(raw)){
  // Each of the two final original full CAS transactions must read every
  // physical row and compare its complete expected table operand. This is a
  // mandatory lower bound, NOT a claim to bound all finalizers or late errors.
  references+=values.length+1+2*Math.floor(values.length/64);
  bytes+=measureSourceWorkingPhysicalTree(values).B;
  for(const row of values)bytes+=measureSourceWorkingPhysicalTree(row).B;
 }
 requireOriginalRecoveryWorkCapacity(work.repository,work.ticket,references,bytes);
}
