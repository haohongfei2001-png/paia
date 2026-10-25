import {equalSourceWorkingPhysicalTree as equal} from './source-working-physical.js';
import {ArchiveError,STORAGE_KEY} from '../constants.js';
import {ArchiveRepository,DATABASE_NAME,openOriginalExistingRepository,originalGenerationRepositoryRead,originalApplicationSelectionTransaction,registerRepositoryWorkLimit,registerOriginalRepositoryReadWorkLimit} from '../idb-repository.js';
import {originalOrganizerConstructor} from '../organizer/store-owner.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {BrowserNativeSyncCore,requireOriginalGenerationCoreMethods} from './core.js';
import {CanonicalGenerationPublication,openOriginalPublishedOrganizerForSelection,CANONICAL_GENERATION_GATE,CANONICAL_GENERATION_REGISTRY} from './canonical-generation-publication.js';
import {prepareOriginalApplicationInheritanceCut,requireOriginalApplicationInheritanceCut,readOriginalApplicationInheritanceCut} from './group-checkpoint.js';
import {readGroupRows} from './group-page-reader.js';
import {controlPublicationDigest as digest,controlPublicationRow,readControlPublicationFence,reserveControlPublication,requireControlPublicationOwner,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';

export const APPLICATION_SELECTION_MARKER='application-generation-selection:v1';
export const APPLICATION_SELECTION_REGISTRY='paia-canonical-generation-registry-v1';
const originalSelectionApply=Reflect.apply,selectionReviews=new WeakMap(),selectionRestrictions=new WeakMap(),restrictionTokens=new WeakMap();
const authorities=new WeakMap(),cuts=new WeakMap(),copy=value=>structuredClone(value);
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
 #source;#core;#local;#localGet;#localSet;#factory;#authority;#prepared=null;#busy=false;#lifetime=0;#restriction=null;
 constructor(store,core,local,aiFilterAuthority=null){requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);if(store.repository!==core.repository||store.repository.name!==DATABASE_NAME||store.local!==local)fail('GENERATION_SELECTION_CAPABILITY');this.#source=store;this.#core=core;this.#local=local;this.#factory=store.repository.factory;this.#authority=aiFilterAuthority;this.#localGet=local.get;this.#localSet=local.set;
  selectionReviews.set(this,(s,c,l)=>{const p=cuts.get(this.#prepared);if(s!==this.#source||c!==this.#core||l!==this.#local||!p||p.owner!==this||this.#source.repository!==p.sourceRepository||this.#source.repository.db!==p.sourceDatabase||this.#core.repository!==p.sourceRepository||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('GENERATION_SELECTION_NOT_PREPARED');return Object.freeze({operationId:p.record.operationId});});
  selectionRestrictions.set(this,{hold:()=>{
   if(this.#busy||this.#restriction)fail('GENERATION_SELECTION_BUSY');
   const prepared=this.#prepared,p=cuts.get(prepared),lifetime=this.#lifetime;
   if(!p||p.owner!==this||p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');
   const token=Object.freeze(Object.create(null));let released=false;
   const current=()=>{if(released||this.#restriction!==token||this.#busy||this.#prepared!==prepared||this.#lifetime!==lifetime||cuts.get(prepared)!==p||p.attempted)fail('GENERATION_SELECTION_NOT_PREPARED');selectionReviews.get(this)(this.#source,this.#core,this.#local);return true;};
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
 #discardPrepared(prepared){const p=cuts.get(prepared);p?.candidate.repository.db?.close();p?.registry.db?.close();cuts.delete(prepared);if(this.#prepared===prepared)this.#prepared=null;}
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
 async status(){if(this.#restriction)fail('GENERATION_SELECTION_BUSY');return inspectOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}
 async continue(){if(this.#restriction)fail('GENERATION_SELECTION_BUSY');return continueOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}
 async cancel(){if(this.#restriction)fail('GENERATION_SELECTION_BUSY');return cancelOriginalApplicationGenerationSelection(this.#local,this.#factory,this.#authority);}
 async rollback(){fail('GENERATION_REVERSE_INHERITANCE_REQUIRED');}
 close(){this.#lifetime++;this.#discardPrepared(this.#prepared);}
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
 try{await openOriginalExistingRepository(source.repository);const s=await point(source.repository,APPLICATION_SELECTION_MARKER);if(!s)return {source,record:null,close:()=>source.repository.db?.close()};marker(s);if(s.role!=='source'||(await point(source.repository,'migration'))?.databaseId!==s.sourceDatabaseId)fail();
  registry=new ArchiveRepository(local,{indexedDB:factory,name:APPLICATION_SELECTION_REGISTRY});const p=new CanonicalGenerationPublication(registry);target=await openOriginalPublishedOrganizerForSelection(p,local,authority);if(target.repository.name!==s.targetName||(await point(target.repository,'migration'))?.databaseId!==s.targetDatabaseId)fail();await sameRegistry(registry,s);
  return {source,target,registry,record:s,close:()=>{source.repository.db?.close();target.repository.db?.close();registry.db?.close();}};
 }catch(error){source.repository.db?.close();target?.repository.db?.close();registry?.db?.close();throw error;}
}
export async function inspectOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record)return {state:'not-prepared'};if(o.record.phase==='selected'){if(await point(o.target.repository,APPLICATION_SELECTION_MARKER))return {state:'finishing',operationId:o.record.operationId};return await settleSelection(o.source.repository,o.target.repository,o.registry,local,o.record);}return {state:o.record.phase==='dispatched'?'outcome-unknown':'prepared',operationId:o.record.operationId,retryAllowed:false};}finally{o.close();}}
export async function continueOriginalApplicationGenerationSelection(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record)return {state:'not-prepared'};return await finishSelection(o.source.repository,o.target.repository,o.registry,local,o.record,true);}finally{o.close();}}
export async function cancelOriginalApplicationGenerationSelection(local,factory,authority=null){
 const o=await openSelection(local,factory,authority);try{const s=o.record;if(!s)return {state:'not-prepared'};if(s.phase!=='prepared')fail('GENERATION_SELECTION_OUTCOME_UNKNOWN');if(await digest(await localRow(local))!==s.beforeDigest)fail();await sameRegistry(o.registry,s);
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
export async function openOriginalSelectedExistingApplication(local,factory,authority=null){const o=await openSelection(local,factory,authority);try{if(!o.record){o.close();return null;}if(o.record.phase!=='selected'||await point(o.target.repository,APPLICATION_SELECTION_MARKER))fail('GENERATION_SELECTION_PENDING');await settleSelection(o.source.repository,o.target.repository,o.registry,local,o.record);const selected=o.target;o.source.repository.db?.close();return selected;}catch(error){o.close();throw error;}}
