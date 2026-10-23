import {assert} from './generation-purge-assert.mjs';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name='paia-native-copy-retirement-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
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
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationHumanRestore,requireOriginalHumanGenerationActivation,CANONICAL_HUMAN_RESTORE_STATE as STATE} from '../core/browser-native-sync/canonical-generation-human-restore.js';
import {ArchiveError} from '../core/constants.js';

const op=()=>crypto.randomUUID();
async function snapshot(store){return store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));}
async function fixture(t,{checkpoint,protect=true,stageCheckpoint,deferStage=false,extraEntries=0}={}){
 const factory=indexedDB,source=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-source'});await source.consent(true);await source.finishFoundation();const sourceCore=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_human_generation',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sourceCore);
 const a=await source.createEntry({actor:'user',body:'SYNTHETIC original A',type:'idea',formation:'explicit',evidence:[],operationId:op()});await source.editEntry({id:a.id,expectedRevision:0,changes:{note:'SYNTHETIC note A'},operationId:op()});const b=await source.createEntry({actor:'user',body:'SYNTHETIC original B',type:'idea',formation:'explicit',evidence:[],operationId:op()});const extra=[];for(let n=0;n<extraEntries;n++)extra.push({...await source.createEntry({actor:'user',body:'SYNTHETIC extra '+n,type:'idea',formation:'explicit',evidence:[],operationId:op()}),body:'SYNTHETIC extra '+n});const rows=new Map(),transport={async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}},cp=await buildCheckpoint(sourceCore,transport,{grouped:{store:source}});
 const registry=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-registry'}),publication=new CanonicalGenerationPublication(registry),store=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-target'}),handle=await publication.attach(store.repository,{generationId:'synthetic_human_generation',databaseId:'synthetic_human_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sourceCore.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_fixed_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,protectRepository:protect,checkpoint:stageCheckpoint});t.after(()=>[source.repository,registry,store.repository].forEach(r=>r.db?.close()));if(!deferStage)await stage.stageCheckpoint(cp.ref,r=>transport.get(r));const proof=deferStage?null:await stage.validate(),restore=new CanonicalGenerationHumanRestore({store,core,checkpoint});return {source,sourceCore,store,core,registry,publication,stage,proof,restore,a,b,factory,handle,transport,cp,extra};
}


const PREFIX='canonical-generation:checkpoint:',RETIRE='canonical-generation:copy-retirement:v1';
async function published(t,options){const f=await fixture(t,options);while((await f.restore.step(f.proof)).state!=='complete'){}await f.restore.preparePublication(f.proof);const seal=await f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof);await f.publication.reserve(seal,'synthetic_retire_publication');await f.publication.recover();return f;}
const copies=f=>f.store.repository.transaction(false,t=>t.keys('meta',null,IDBKeyRange.bound(PREFIX,PREFIX+'\uffff',false,true),4097),['meta']);
async function finish(f){let result;for(let i=0;i<130;i++){result=await f.publication.retireCheckpointCopies(f.handle);if(result.state==='retired')return result;}throw Error('SYNTHETIC retirement did not finish');}
const canonical=s=>Object.fromEntries(Object.entries(s).map(([name,rows])=>[name,name==='meta'?rows.filter(row=>!row.id.startsWith(PREFIX)&&row.id!==RETIRE):rows]));
async function roundtrip(t,f,suffix){const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(f.core,transport,{grouped:{store:f.store}}),c=nativeStore(local(),{indexedDB:indexedDB,name:'SYNTHETIC-copy-cold-'+suffix});t.after(()=>c.repository.db?.close());await c.consent(true);await c.finishFoundation();const core=new BrowserNativeSyncCore(c.repository,{datasetId:f.core.datasetId,deviceId:'synthetic_cold_'+suffix}),restore=new StagedSyncRestore(core,{grouped:{store:c}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await restore.activate();assert.equal((await c.entry(f.a.id)).note,'SYNTHETIC note A');assert.equal((await c.entry(f.b.id)).body,'SYNTHETIC original B');for(const e of f.extra)assert.equal((await c.entry(e.id)).body,e.body);return cut;}
test('fixed copy retirement preserves original canonical export before and after and cold resumes',async t=>{const f=await published(t),before=await snapshot(f.store);assert.ok((await copies(f)).length>1);await roundtrip(t,f,'before');const first=await f.publication.retireCheckpointCopies(f.handle);assert.ok(['retiring','retired'].includes(first.state));const next=new CanonicalGenerationPublication(f.registry);f.handle=await next.attach(f.store.repository,{generationId:'synthetic_human_generation',databaseId:'synthetic_human_database'});f.publication=next;assert.equal((await finish(f)).state,'retired');assert.equal((await copies(f)).length,0);assert.deepEqual(canonical(await snapshot(f.store)),canonical(before));await roundtrip(t,f,'after');assert.equal((await f.publication.active()).state,'active');const settled=await snapshot(f.store);assert.equal((await finish(f)).state,'retired');assert.deepEqual(await snapshot(f.store),settled);const receipt=settled.meta.find(r=>r.id===RETIRE);assert.equal(JSON.stringify(receipt).includes('SYNTHETIC original'),false);});
test('copy retirement refuses staged and sealed-but-unpublished graphs without deleting copies',async t=>{const f=await fixture(t),before=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies(f.handle));assert.deepEqual(await snapshot(f.store),before);while((await f.restore.step(f.proof)).state!=='complete'){}await f.restore.preparePublication(f.proof);await f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof);const sealed=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies(f.handle));assert.deepEqual(await snapshot(f.store),sealed);});
test('copy retirement has no arbitrary public deletion or receipt authority',async t=>{const f=await published(t),before=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies({}));await assert.rejects(f.store.repository.transaction(true,t=>t.delete('meta',PREFIX+'state:v1')));assert.deepEqual(await snapshot(f.store),before);});
async function raw(f,fn){await new Promise((resolve,reject)=>{const tx=f.store.repository.db.transaction(['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};try{fn(tx.objectStore('meta'));}catch(error){tx.abort();reject(error);}});}
for(const field of ['kind','identity','seal','sourceBase'])test('copy retirement refuses changed fixed qualification '+field,async t=>{const f=await published(t);await raw(f,store=>{const q=store.get('canonical-generation:qualified-graph:v1');q.onsuccess=()=>store.put({...q.result,[field]:field==='kind'?'generic-metadata':{synthetic:'foreign'}});});const before=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies(f.handle));assert.deepEqual(await snapshot(f.store),before);});
for(const mode of ['unknown copy','missing copy','foreign marker','missing marker','forged progress'])test('copy retirement refuses '+mode+' without deleting remaining copies',async t=>{const f=await published(t);await raw(f,store=>{if(mode==='unknown copy')store.put({id:PREFIX+'unknown',body:'SYNTHETIC unknown body'});if(mode==='missing copy')store.delete(PREFIX+'item:00000000');if(mode==='foreign marker')store.put({id:'canonical-generation:repository-protection:v1',version:1,mode:'shadow-v1',identity:{databaseName:'SYNTHETIC wrong'},registryName:f.registry.name});if(mode==='missing marker')store.delete('canonical-generation:repository-protection:v1');if(mode==='forged progress')store.put({id:RETIRE,version:1,phase:'retired'});});const before=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies(f.handle));assert.deepEqual(await snapshot(f.store),before);});
test('copy retirement cannot use a generic metadata publication as graph qualification',async t=>{const f=await fixture(t,{protect:false,deferStage:true}),seal=await f.publication.seal(f.handle,{sealId:'synthetic_generic_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});await f.publication.reserve(seal,'synthetic_generic_publication');await f.publication.recover();const before=await snapshot(f.store);await assert.rejects(f.publication.retireCheckpointCopies(f.handle));assert.deepEqual(await snapshot(f.store),before);});

test('retirement cannot execute a caller callback or expand its fixed deletion scope',async t=>{const f=await published(t);let called=false;await f.publication.retireCheckpointCopies(f.handle,()=>{called=true;throw Error('SYNTHETIC callback');});assert.equal(called,false);assert.equal((await f.store.entry(f.a.id)).note,'SYNTHETIC note A');assert.equal((await f.store.entry(f.b.id)).body,'SYNTHETIC original B');});

test('copy retirement settles only a bounded page and resumes actual remaining copies on cold reopen',async t=>{const f=await published(t,{extraEntries:3}),before=await snapshot(f.store),total=await copies(f);assert.ok(total.length>33);await roundtrip(t,f,'paged-before');const first=await f.publication.retireCheckpointCopies(f.handle);assert.equal(first.state,'retiring');assert.equal(first.itemsRemoved,32);assert.ok((await copies(f)).length>0);const manager=new CanonicalGenerationPublication(f.registry);f.handle=await manager.attach(f.store.repository,{generationId:'synthetic_human_generation',databaseId:'synthetic_human_database'});f.publication=manager;const next=await finish(f);assert.equal(next.state,'retired');assert.deepEqual(canonical(await snapshot(f.store)),canonical(before));await roundtrip(t,f,'paged-after');});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="copy-retirement-matrix")return previous.run(command,...args);
 const passed=[];
 for(const item of cases){const after=[];let failure;
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
