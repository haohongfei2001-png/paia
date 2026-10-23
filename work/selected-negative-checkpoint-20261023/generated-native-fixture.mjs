import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeName(factory,name){const names=factoryNames.get(factory);if(!names||typeof name!=='string')throw Error('native factory binding');if([...names.values()].includes(name))return name;if(!['SYNTHETIC-selected-checkpoint-registry','SYNTHETIC-negative-selection-A','SYNTHETIC-negative-selection-B','SYNTHETIC-selected-purge-group'].includes(name))throw Error('native synthetic name');let physical=names.get(name);if(!physical){physical='paia-native-selected-purge-group-'+(++sequence)+'-'+name;names.set(name,physical);ownedNames.add(physical);}return physical;}
function nativeFactory(){
 const factory={open(name,version){const physical=nativeName(factory,name);return version===undefined?indexedDB.open(physical):indexedDB.open(physical,version);},deleteDatabase(name){return indexedDB.deleteDatabase(nativeName(factory,name));},async databases(){const names=factoryNames.get(factory);return (await indexedDB.databases()).filter(row=>[...names.values()].includes(row.name));}};
 factoryNames.set(factory,new Map());return factory;
}
// Keep the same per-fixture factory identity for all original repositories and
// selector-created stores. Requests, DBs, transactions and inventories are native.
function nativeOptions(options){if(!factoryNames.has(options?.indexedDB))throw Error('native factory binding');return {...options,name:nativeName(options.indexedDB,options.name??'SYNTHETIC-selected-purge-group')};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}




import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_REGISTRY as ROOT} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';

const DATASET='synthetic_selected_checkpoint',REGISTRY='SYNTHETIC-selected-checkpoint-registry';
function journals(store,deviceId){const core=new BrowserNativeSyncCore(store.repository,{datasetId:DATASET,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.sourcePurgeJournal=new SourcePurgeJournal(core);return core;}
async function raw(repository,fn){await repository.open();await new Promise((resolve,reject)=>{const tx=repository.db.transaction(['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);fn(tx.objectStore('meta'));});}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function fixture(t){
 const factory=nativeFactory(),storage=local(),registry=nativeRepository(local(),{indexedDB:factory,name:REGISTRY}),publication=new CanonicalGenerationPublication(registry),a=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-negative-selection-A'}),b=nativeStore(storage,{indexedDB:factory,name:'SYNTHETIC-negative-selection-B'});
 const repositories=[registry,a.repository,b.repository];t.after(()=>repositories.forEach(r=>r.db?.close()));
 await a.consent(true);await a.finishFoundation();const coreA=journals(a,'synthetic_A');
 for(let n=0;n<2;n++){const q=capture((await a.status()).epoch,'synthetic-source-'+n,'SYNTHETIC original '+n);q.chat={id:'synthetic-negative-chat-'+n,url:'https://chatgpt.com/c/synthetic-negative-chat-'+n,title:'SYNTHETIC independent '+n};await a.capture(q);}
 const blocks=(await a.snapshot()).library.blocks;
 const handle=await publication.attach(b.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await b.consent(true);await b.finishFoundation();const coreB=journals(b,'synthetic_B');
 const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_initial_restore'});await restore.stageCanonicalGeneration(proof);await restore.activate();await restore.prepareCanonicalGenerationPublication(proof);const seal=await publication.sealOriginalCheckpoint(handle,restore,proof);await publication.reserve(seal,'synthetic_local_publication');await publication.recover();
 while((await publication.retireCheckpointCopies(handle)).state!=='retired'){}
 await publication.bindOriginalActiveStore(handle,b);while(!(await restore.cleanup({limit:100})).complete){}
 async function cold(){const r=nativeRepository(local(),{indexedDB:factory,name:REGISTRY}),p=new CanonicalGenerationPublication(r);repositories.push(r);const store=await p.openOriginalActiveStore(storage);repositories.push(store.repository);return {store,publication:p,registry:r,core:journals(store,'synthetic_B')};}
 return {factory,storage,registry,publication,a,b,coreA,coreB,transport,blocks,handle,cold};
}
async function groups(core){const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return operations.filter(op=>op.type==='sourceBootstrapCommit').map(commit=>[...commit.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),commit]);}
const outbox=async core=>{const rows=[];for await(const row of core.outbox())rows.push(row);return rows;};

async function purged(t){const f=await fixture(t),cold=await f.cold(),selected=(await cold.store.snapshot()).records[0],old=await groups(f.coreA);await cold.store.purge(selected.id,true);await cold.store.drainPurgeCleanup();return {...f,reopen:f.cold,cold,selected,old};}
async function checkpoint(store,core){const objects=new Map(),transport={putImmutable:async(ref,raw)=>objects.set(ref.id,raw.slice()),get:async ref=>objects.get(ref.id)?.slice()},cp=await buildGroupedCheckpoint(core,transport,{store,sourcePurgeProjection:true});return {cp,transport};}
async function blank(t,device){const store=nativeStore(local(),{indexedDB:nativeFactory()});t.after(()=>store.repository.db?.close());await store.consent(true);await store.finishFoundation();return {store,core:journals(store,device)};}
function recovery(f,id='synthetic_selected_negative_restore'){return new GroupedCheckpointRestore(f.core,{store:f.store,restoreId:id,sourcePurgeProjection:true});}
async function add(f,n){const q=capture((await f.store.status()).epoch,'synthetic-selected-checkpoint-'+n,'SYNTHETIC independent '+n);q.chat={id:'synthetic-selected-checkpoint-chat-'+n,url:'https://chatgpt.com/c/synthetic-selected-checkpoint-chat-'+n,title:'SYNTHETIC next'};await f.store.capture(q);}
const localControls=rows=>rows.meta.filter(row=>row.id.startsWith('canonical-generation:')||row.id.endsWith(':restore:')||row.id.endsWith(':active'));
test('cold selected original-group exports permanent denial, merges a complete successor, edits and cold reopens',async t=>{
 const f=await purged(t),before=await snapshot(f.cold.store),exported=await checkpoint(f.cold.store,f.cold.core),c=await blank(t,'synthetic_selected_C'),rc=recovery(c);await rc.stageCheckpoint(exported.cp.ref,exported.transport.get);await rc.activate();assert.equal((await snapshot(c.store)).records.length,1);assert.equal((await snapshot(c.store)).tombstones.length,1);await add(c,3);const successor=await checkpoint(c.store,c.core),rb=recovery(f.cold);await rb.stageCheckpoint(successor.cp.ref,successor.transport.get);assert.deepEqual(await snapshot(f.cold.store),before);await rb.activate();const after=await snapshot(f.cold.store);assert.equal(after.records.length,2);assert.deepEqual(after.tombstones,before.tombstones);assert.deepEqual(after.meta.filter(row=>row.id.includes(':outbox:')),before.meta.filter(row=>row.id.includes(':outbox:')));for(const row of localControls(before)){const next=after.meta.find(x=>x.id===row.id);assert.deepEqual(next,row.id==='canonical-generation:gate:v1'?{...row,writeRevision:row.writeRevision+1}:row);}const cold=await f.reopen();assert.equal((await cold.store.snapshot()).records.length,2);const old=f.old.find(g=>g.at(-1).value.sourceId===f.selected.id),stable=await snapshot(cold.store);await assert.rejects(new SourceBootstrapReceiver(cold.store,cold.core).receive(old));assert.deepEqual(await snapshot(cold.store),stable);cold.store.filterIntentJournal=new FilterIntentSyncJournal(cold.core);cold.store.inputWorkingJournal=new InputWorkingSyncJournal(cold.core,{filterJournal:cold.store.filterIntentJournal,logicalCommits:true});const block=(await cold.store.snapshot()).library.blocks[0];await inputEdit(cold.store,block.id,{note:'SYNTHETIC selected retained human note'});const again=await f.reopen();assert.equal((await again.store.input(block.id)).note,'SYNTHETIC selected retained human note');assert.deepEqual((await snapshot(again.store)).tombstones,before.tombstones);await assert.rejects(checkpoint(again.store,again.core));
});


test('selected destination imports an independent cold negative while keeping original local cleanup and controls',async t=>{const f=await purged(t),d=await blank(t,'synthetic_selected_D');await add(d,20);await add(d,21);const victim=(await d.store.snapshot()).records[0];await d.store.purge(victim.id,true);await d.store.drainPurgeCleanup();const incoming=await checkpoint(d.store,d.core),before=await snapshot(f.cold.store),r=recovery(f.cold);await r.stageCheckpoint(incoming.cp.ref,incoming.transport.get);await r.activate();const after=await snapshot(f.cold.store);assert.equal(after.records.length,2);assert.equal(after.tombstones.length,2);assert.deepEqual(after.organizerJobs,before.organizerJobs);assert.deepEqual(after.invalidations,before.invalidations);assert.deepEqual(after.meta.filter(row=>row.id.includes(':outbox:')),before.meta.filter(row=>row.id.includes(':outbox:')));const exported=await checkpoint(f.cold.store,f.cold.core),c=await blank(t,'synthetic_selected_E'),rc=recovery(c);await rc.stageCheckpoint(exported.cp.ref,exported.transport.get);await rc.activate();assert.equal((await snapshot(c.store)).records.length,2);assert.equal((await snapshot(c.store)).tombstones.length,2);});

for(const mode of ['unbound','completed','gate','resident-copy','unknown-namespace'])test('selected checkpoint refuses '+mode+' without transport publication or local changes',async t=>{const f=await purged(t);let selected=f.cold;if(mode==='unbound'){const store=nativeStore(f.storage,{indexedDB:f.factory,name:f.b.repository.name});t.after(()=>store.repository.db?.close());selected={store,core:journals(store,'synthetic_B')};}else await raw(selected.store.repository,table=>{if(mode==='resident-copy')table.put({id:'canonical-generation:checkpoint:synthetic-extra',body:'SYNTHETIC residual copy'});else if(mode==='unknown-namespace')table.put({id:selected.core.prefix+'generation:synthetic_unknown:pending:1',value:1});else{const key=mode==='gate'?'canonical-generation:gate:v1':selected.core.prefix+'generation:synthetic_initial_restore:restore:',req=table.get(key);req.onsuccess=()=>table.put({...req.result,synthetic:true});}});const before=await snapshot(selected.store);let writes=0;await assert.rejects(buildGroupedCheckpoint(selected.core,{putImmutable:async()=>{writes++;},get:async()=>null},{store:selected.store,sourcePurgeProjection:true}));assert.equal(writes,0);assert.deepEqual(await snapshot(selected.store),before);});

test('registry selection changed after staging refuses activation with local data unchanged',async t=>{const f=await purged(t),incoming=await checkpoint(f.cold.store,f.cold.core),r=recovery(f.cold);await r.stageCheckpoint(incoming.cp.ref,incoming.transport.get);const before=await snapshot(f.cold.store);await raw(f.registry,table=>{const q=table.get(ROOT);q.onsuccess=()=>table.put({...q.result,active:null});});await assert.rejects(r.activate());assert.deepEqual(await snapshot(f.cold.store),before);});

for(const mode of ['gate','completed','deny','outbox'])test('late '+mode+' mutation rolls back selected positive-negative merge',async t=>{const f=await purged(t),d=await blank(t,'synthetic_selected_fault');await add(d,50);await add(d,51);const victim=(await d.store.snapshot()).records[0];await d.store.purge(victim.id,true);await d.store.drainPurgeCleanup();const incoming=await checkpoint(d.store,d.core),r=recovery(f.cold);await r.stageCheckpoint(incoming.cp.ref,incoming.transport.get);const before=await snapshot(f.cold.store),original=f.cold.store.applyInitialSource;let injected=false;f.cold.store.applyInitialSource=async function(tx,cap){await original.call(this,tx,cap);injected=true;if(mode==='deny')await tx.delete('meta',f.cold.core.prefix+'sourcePurgeDeny:'+f.selected.sourceKey);else if(mode==='outbox'){const row=before.meta.find(row=>row.id.includes(':outbox:'));assert.ok(row);await tx.delete('meta',row.id);}else{const id=mode==='gate'?'canonical-generation:gate:v1':f.cold.core.prefix+'generation:synthetic_initial_restore:restore:',row=await tx.get('meta',id);await tx.put('meta',{...row,synthetic:true});}};try{await assert.rejects(r.activate());}finally{f.cold.store.applyInitialSource=original;}assert.equal(injected,true);assert.deepEqual(await snapshot(f.cold.store),before);});


test('unsupported same-producer post-publication Source cannot be mistaken for the sealed original graph',async t=>{const f=await purged(t),old=await groups(f.coreA);await add({store:f.a},70);const next=(await groups(f.coreA)).find(g=>!old.some(o=>o.at(-1).revisionId===g.at(-1).revisionId));assert.ok(next);await new SourceBootstrapReceiver(f.cold.store,f.cold.core).receive(next);const before=await snapshot(f.cold.store);let writes=0;await assert.rejects(buildGroupedCheckpoint(f.cold.core,{putImmutable:async()=>{writes++;},get:async()=>null},{store:f.cold.store,sourcePurgeProjection:true}));assert.equal(writes,0);assert.deepEqual(await snapshot(f.cold.store),before);});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=='selected-purge-group-matrix')return previous.run(command,...args);
 const expectedNames=["cold selected original-group exports permanent denial, merges a complete successor, edits and cold reopens", "selected destination imports an independent cold negative while keeping original local cleanup and controls", "selected checkpoint refuses unbound without transport publication or local changes", "selected checkpoint refuses completed without transport publication or local changes", "selected checkpoint refuses gate without transport publication or local changes", "selected checkpoint refuses resident-copy without transport publication or local changes", "selected checkpoint refuses unknown-namespace without transport publication or local changes", "registry selection changed after staging refuses activation with local data unchanged", "late gate mutation rolls back selected positive-negative merge", "late completed mutation rolls back selected positive-negative merge", "late deny mutation rolls back selected positive-negative merge", "late outbox mutation rolls back selected positive-negative merge", "unsupported same-producer post-publication Source cannot be mistaken for the sealed original graph"];
 if(cases.length!==expectedNames.length||new Set(cases.map(item=>item.name)).size!==expectedNames.length||cases.some((item,i)=>item.name!==expectedNames[i]))throw Error('native case allowlist');const passed=[];
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
