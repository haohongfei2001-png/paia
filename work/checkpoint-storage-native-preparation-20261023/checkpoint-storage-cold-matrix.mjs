import {assert} from './generation-purge-assert.mjs';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeFactory(){const cap=Object.freeze({});factoryNames.set(cap,new Map());return cap;}
function nativeOptions(options){const names=factoryNames.get(options?.indexedDB);if(!names||typeof options.name!=='string')throw Error('native factory binding');let name=names.get(options.name);if(!name){name='paia-native-checkpoint-storage-cold-matrix-'+(++sequence)+'-'+options.name;names.set(options.name,name);ownedNames.add(name);}return {...options,indexedDB,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}



import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationPhasedHumanRestore} from '../core/browser-native-sync/canonical-generation-phased-human.js';
import {CANONICAL_PHASED_TASK} from '../core/browser-native-sync/canonical-generation-task-ledger.js';

async function fixture(t,count=1,checkpoint){const factory=nativeFactory(),source=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-source'});await source.consent(true);await source.finishFoundation();const sc=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_phased',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sc);for(let i=0;i<count;i++)await source.createEntry({actor:'user',body:'SYNTHETIC original '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cp=await buildCheckpoint(sc,transport,{grouped:{store:source}}),registry=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-phased-registry'}),publication=new CanonicalGenerationPublication(registry),store=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-target'}),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sc.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,checkpoint,protectRepository:true});await stage.begin(cp.ref,r=>transport.get(r));t.after(()=>[source.repository,registry,store.repository].forEach(r=>r.db?.close()));return {stage,publication,handle,store,core,cp,transport,registry,factory};}
import {decodeCheckpointManifestStorage} from '../core/browser-native-sync/checkpoint-manifest-storage.js';
const STATE='canonical-generation:checkpoint:state:v1';
const state=f=>f.store.repository.transaction(false,t=>t.get('meta',STATE),['meta']);
async function alter(f,update){await new Promise((resolve,reject)=>{const tx=f.store.repository.db.transaction(['meta'],'readwrite'),s=tx.objectStore('meta'),q=s.get(STATE);q.onsuccess=()=>s.put(update(q.result));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}
async function legacy(f){await alter(f,row=>({...row,version:1,manifestEncoded:Array.from(decodeCheckpointManifestStorage(row.version,row.manifestEncoded,row.manifestRef.encodedBytes))}));}
for(const version of [1,2])test('private checkpoint storage v'+version+' survives real cold owner continuation and copy retirement',async t=>{const f=await fixture(t,2);if(version===1)await legacy(f);assert.equal((await state(f)).version,version);await f.stage.stagePhasedHumanCheckpoint(r=>f.transport.get(r));const oldProof=await f.stage.validatePhasedHumanCheckpoint(),oldRestore=new CanonicalGenerationPhasedHumanRestore(f);await oldRestore.step(oldProof);const before=await f.store.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']);f.store.repository.db.close();f.registry.db.close();const store=nativeStore(f.store.local,{indexedDB:f.factory,name:'SYNTHETIC-phased-target'}),registry=nativeRepository(local(),{indexedDB:f.factory,name:'SYNTHETIC-phased-registry'}),publication=new CanonicalGenerationPublication(registry),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'}),core=new BrowserNativeSyncCore(store.repository,{datasetId:f.core.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,protectRepository:true}),restore=new CanonicalGenerationPhasedHumanRestore({store,core});t.after(()=>[store.repository,registry].forEach(r=>r.db?.close()));await assert.rejects(stage.validatePhasedHumanCheckpoint());const proof=await stage.revalidatePhasedHumanCheckpoint();assert.equal((await restore.rehydrate(proof)).completed,1);assert.equal((await restore.step(proof)).completed,2);await restore.preparePublication(proof);const token=await publication.sealOriginalPhasedHumanCheckpoint(handle,restore,proof);await publication.reserve(token,'synthetic_cold_publication');assert.equal((await publication.recover()).state,'committed');const after=await store.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']);assert.equal(after.taskId,before.taskId);assert.deepEqual(after.identity,before.identity);assert.ok(after.workBytes>before.workBytes);assert.ok(after.tickets>before.tickets);assert.equal(await store.repository.transaction(false,t=>t.count('thoughts'),['thoughts']),2);assert.equal((await state({store})).version,version);for(let i=0;i<4;i++){const result=await publication.retireCheckpointCopies(handle);if(result.state==='retired')break;}assert.equal(await state({store}),undefined);await publication.bindOriginalActiveStore(handle,store);const entry=await store.repository.transaction(false,async t=>(await t.all('thoughts'))[0],['thoughts']);await store.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{note:'SYNTHETIC real edit after cold publish'},operationId:crypto.randomUUID()});assert.equal((await store.entry(entry.id)).note,'SYNTHETIC real edit after cold publish');});

for(const defect of ['version','base64','length','hash'])test('private checkpoint cold reader refuses '+defect+' drift without migration',async t=>{const f=await fixture(t);await f.stage.stagePhasedHumanCheckpoint(r=>f.transport.get(r));await alter(f,row=>{if(defect==='version')row.version=3;else if(defect==='base64')row.manifestEncoded='!'+row.manifestEncoded.slice(1);else if(defect==='length')row.manifestEncoded=row.manifestEncoded.slice(4);else row.manifestEncoded=(row.manifestEncoded[0]==='A'?'B':'A')+row.manifestEncoded.slice(1);return row;});const before=await state(f),stage=new CanonicalGenerationCheckpointStage(f.publication,f.handle,{store:f.store,core:f.core,protectRepository:true});await assert.rejects(stage.validatePhasedHumanCheckpoint());assert.deepEqual(await state(f),before);assert.deepEqual(await f.publication.active(),{state:'empty'});});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="checkpoint-storage-cold-matrix")return previous.run(command,...args);
 const passed=[];
 const selected=cases;if(selected.length!==6)throw Error('native selected count');
 if(new Set(selected.map(item=>item.name)).size!==selected.length||selected.some(item=>/(?:^|[^0-9])(?:65|129)(?:[^0-9]|$)/.test(item.name)))throw Error('NATIVE_FORBIDDEN_CASE');
 for(const item of selected){const after=[];let failure;
  try{await item.fn({after(fn){if(typeof fn!=='function')throw Error('native after');after.push(fn);}});passed.push(item.name);}
  catch(error){failure=Error(item.name+': '+error.stack);}
  finally{
   for(const fn of after.reverse())try{await fn();}catch(error){failure??=error;}
   for(const repository of repositories.splice(0))try{await repository.close();}catch(error){failure??=error;}
   for(const name of ownedNames){try{await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('native cleanup blocked'));});}catch(error){failure??=error;}}ownedNames.clear();
  }
  if(failure)throw failure;
 }
 return passed;
}};
