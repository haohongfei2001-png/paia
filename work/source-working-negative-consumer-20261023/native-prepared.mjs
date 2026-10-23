import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeName(factory,name){const names=factoryNames.get(factory);if(!names||typeof name!=='string')throw Error('native factory binding');if([...names.values()].includes(name))return name;if(!['SYNTHETIC-selected-checkpoint-registry','SYNTHETIC-negative-selection-A','SYNTHETIC-negative-selection-B','SYNTHETIC-working-negative-group'].includes(name))throw Error('native synthetic name');let physical=names.get(name);if(!physical){physical='paia-native-working-negative-group-'+(++sequence)+'-'+name;names.set(name,physical);ownedNames.add(physical);}return physical;}
function nativeFactory(){
 const factory={open(name,version){const physical=nativeName(factory,name);return version===undefined?indexedDB.open(physical):indexedDB.open(physical,version);},deleteDatabase(name){return indexedDB.deleteDatabase(nativeName(factory,name));},async databases(){const names=factoryNames.get(factory);return (await indexedDB.databases()).filter(row=>[...names.values()].includes(row.name));}};
 factoryNames.set(factory,new Map());return factory;
}
// Keep the same per-fixture factory identity for all original repositories and
// selector-created stores. Requests, DBs, transactions and inventories are native.
function nativeOptions(options){if(!factoryNames.has(options?.indexedDB))throw Error('native factory binding');return {...options,name:nativeName(options.indexedDB,options.name??'SYNTHETIC-working-negative-group')};}
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
async function fixture(t,count=2,label=''){
 const factory=nativeFactory(),storage=local(),registry=nativeRepository(local(),{indexedDB:factory,name:REGISTRY}),publication=new CanonicalGenerationPublication(registry),a=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-negative-selection-A'}),b=nativeStore(storage,{indexedDB:factory,name:'SYNTHETIC-negative-selection-B'});
 const repositories=[registry,a.repository,b.repository];t.after(()=>repositories.forEach(r=>r.db?.close()));
 await a.consent(true);await a.finishFoundation();const coreA=journals(a,'synthetic_A'+label);
 for(let n=0;n<count;n++){const q=capture((await a.status()).epoch,'synthetic-source-'+label+n,'SYNTHETIC original '+n);q.chat={id:'synthetic-negative-chat-'+label+n,url:'https://chatgpt.com/c/synthetic-negative-chat-'+label+n,title:'SYNTHETIC independent '+n};await a.capture(q);}
 const blocks=(await a.snapshot()).library.blocks;
 const handle=await publication.attach(b.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await b.consent(true);await b.finishFoundation();const coreB=journals(b,'synthetic_B'+label);
 const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_initial_restore'});await restore.stageCanonicalGeneration(proof);await restore.activate();await restore.prepareCanonicalGenerationPublication(proof);const seal=await publication.sealOriginalCheckpoint(handle,restore,proof);await publication.reserve(seal,'synthetic_local_publication');await publication.recover();
 while((await publication.retireCheckpointCopies(handle)).state!=='retired'){}
 await publication.bindOriginalActiveStore(handle,b);while(!(await restore.cleanup({limit:100})).complete){}
 async function cold(){const r=nativeRepository(local(),{indexedDB:factory,name:REGISTRY}),p=new CanonicalGenerationPublication(r);repositories.push(r);const store=await p.openOriginalActiveStore(storage);repositories.push(store.repository);return {store,publication:p,registry:r,core:journals(store,'synthetic_B'+label)};}
 return {factory,storage,registry,publication,a,b,coreA,coreB,transport,blocks,handle,cold};
}
async function groups(core){const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return operations.filter(op=>op.type==='sourceBootstrapCommit').map(commit=>[...commit.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),commit]);}
const outbox=async core=>{const rows=[];for await(const row of core.outbox())rows.push(row);return rows;};

async function purged(t,ordinal=null){const f=await fixture(t),cold=await f.cold(),rows=await snapshot(cold.store),selected=ordinal===null?(await cold.store.snapshot()).records[0]:rows.records.find(r=>r.id===rows.recordIndex.find(r=>r.sequence===ordinal).id).value,old=await groups(f.coreA);await cold.store.purge(selected.id,true);await cold.store.drainPurgeCleanup();return {...f,reopen:f.cold,cold,selected,old};}
async function checkpoint(store,core){const objects=new Map(),transport={putImmutable:async(ref,raw)=>objects.set(ref.id,raw.slice()),get:async ref=>objects.get(ref.id)?.slice()},cp=await buildGroupedCheckpoint(core,transport,{store,sourcePurgeProjection:true});return {cp,transport};}
async function blank(t,device){const storage=local(),factory=nativeFactory(),store=nativeStore(storage,{indexedDB:factory});t.after(()=>store.repository.db?.close());await store.consent(true);await store.finishFoundation();return {store,core:journals(store,device),storage,factory,device};}
function recovery(f,id='synthetic_selected_negative_restore'){return new GroupedCheckpointRestore(f.core,{store:f.store,restoreId:id,sourcePurgeProjection:true});}
async function add(f,n){const q=capture((await f.store.status()).epoch,'synthetic-selected-checkpoint-'+n,'SYNTHETIC independent '+n);q.chat={id:'synthetic-selected-checkpoint-chat-'+n,url:'https://chatgpt.com/c/synthetic-selected-checkpoint-chat-'+n,title:'SYNTHETIC next'};await f.store.capture(q);}
const localControls=rows=>rows.meta.filter(row=>row.id.startsWith('canonical-generation:')||row.id.endsWith(':restore:')||row.id.endsWith(':active'));
function working(f){f.store.filterIntentJournal=new FilterIntentSyncJournal(f.core);f.store.inputWorkingJournal=new InputWorkingSyncJournal(f.core,{filterJournal:f.store.filterIntentJournal,logicalCommits:true});return f;}
async function cold(t,f){f.store.repository.db.close();const store=nativeStore(f.storage,{indexedDB:f.factory});await store.finishFoundation();t.after(()=>store.repository.db?.close());return working({...f,store,core:journals(store,f.device)});}
async function edited(t){const f=await purged(t);working(f.cold);const block=(await f.cold.store.snapshot()).library.blocks[0];await inputEdit(f.cold.store,block.id,{note:'SYNTHETIC protected surviving edit'});return {...f,block,exported:await checkpoint(f.cold.store,f.cold.core)};}
test('selected Source Working plus independent permanent denial exports, closes, restores, cold edits and re-exports',async t=>{
 const f=await edited(t);f.cold.store.repository.db.close();const c=await blank(t,'synthetic_working_negative_C'),r=recovery(c);await r.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);await r.activate();assert.equal((await c.store.input(f.block.id)).note,'SYNTHETIC protected surviving edit');assert.equal((await snapshot(c.store)).tombstones.length,1);
 const reopened=await cold(t,c);await inputEdit(reopened.store,f.block.id,{note:'SYNTHETIC second genuine edit'});const exported=await checkpoint(reopened.store,reopened.core);reopened.store.repository.db.close();const d=await blank(t,'synthetic_working_negative_D'),rr=recovery(d);await rr.stageCheckpoint(exported.cp.ref,exported.transport.get);await rr.activate();assert.equal((await d.store.input(f.block.id)).note,'SYNTHETIC second genuine edit');assert.equal((await snapshot(d.store)).tombstones.length,1);const before=await snapshot(d.store),old=f.old.find(g=>g.at(-1).value.sourceId===f.selected.id);await assert.rejects(new SourceBootstrapReceiver(d.store,d.core).receive(old));assert.deepEqual(await snapshot(d.store),before);
});

test('existing selected edited Source receives complete Working and denial while preserving its local edit and controls',async t=>{
 const f=await edited(t),target=await fixture(t,1,'independent-'),b=working(await target.cold()),localBlock=(await b.store.snapshot()).library.blocks[0];await inputEdit(b.store,localBlock.id,{note:'SYNTHETIC original local protected edit'});const before=await snapshot(b.store),r=recovery(b);f.cold.store.repository.db.close();await r.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);assert.deepEqual(await snapshot(b.store),before);await r.activate();const after=await snapshot(b.store);assert.equal(after.records.length,2);assert.equal(after.tombstones.length,1);assert.equal((await b.store.input(f.block.id)).note,'SYNTHETIC protected surviving edit');for(const row of before.records)assert.deepEqual(after.records.find(r=>r.id===row.id),row);for(const row of localControls(before))assert.deepEqual(after.meta.find(r=>r.id===row.id),row.id==='canonical-generation:gate:v1'?{...row,writeRevision:row.writeRevision+1}:row);
 b.store.repository.db.close();const reopened=working(await target.cold());await inputEdit(reopened.store,f.block.id,{note:'SYNTHETIC selected destination edit'});const cp=await checkpoint(reopened.store,reopened.core),c=await blank(t,'synthetic_existing_reexport_C'),rr=recovery(c);await rr.stageCheckpoint(cp.cp.ref,cp.transport.get);await rr.activate();assert.equal((await c.store.input(f.block.id)).note,'SYNTHETIC selected destination edit');assert.equal((await c.store.input(localBlock.id)).note,'SYNTHETIC original local protected edit');assert.equal((await snapshot(c.store)).records.length,2);
});

for(const mode of ['owner-extra-row','owner-throws','working-map','invalid-event','lost-denial','semantic-terminal'])test('Working negative atomic consumer rolls back every table on '+mode,async t=>{
 const f=await edited(t),b=await blank(t,'synthetic_working_failure_'+mode),r=recovery(b);await r.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);const before=await snapshot(b.store),owner=b.store.applyRemoteWorking,transaction=b.store.repository.transaction;let injected=false;
 if(mode==='semantic-terminal')b.store.repository.transaction=function(write,fn,stores){return transaction.call(this,write,async tx=>{const result=await fn(tx);if(write){injected=true;const row=await tx.get('meta','aiu:delta:sequence');await tx.put('meta',{...row,value:row.value+1});}return result;},stores);};
 else b.store.applyRemoteWorking=async function(tx,args){const result=await owner.call(this,tx,args);injected=true;if(mode==='owner-throws')throw Error('SYNTHETIC owner throw');if(mode==='owner-extra-row')await tx.put('meta',{id:'SYNTHETIC unexpected owned row',value:1});if(mode==='working-map')result.deltaSequence++;if(mode==='invalid-event'){const row=(await tx.all('invalidations'))[0];await tx.put('invalidations',{...row,organizerAck:true});}if(mode==='lost-denial')await tx.delete('meta',b.core.prefix+'sourcePurgeDeny:'+f.selected.sourceKey);return result;};
 try{await assert.rejects(r.activate());}finally{b.store.applyRemoteWorking=owner;b.store.repository.transaction=transaction;}assert.equal(injected,true);assert.deepEqual(await snapshot(b.store),before);
});
for(const mode of ['body','history','working-map','filter','receipt','extra-owner'])test('Working export rejects unrepresented '+mode+' before transport publication',async t=>{
 const f=await edited(t);await f.cold.store.repository.transaction(true,async tx=>{if(mode==='body'){const r=await tx.get('blocks',f.block.id);r.value.note='SYNTHETIC unauthenticated replacement';await tx.put('blocks',r);}else if(mode==='history'){const r=(await tx.all('revisions')).find(r=>r.reason!=='baseline');await tx.put('revisions',{...r,important:!r.important});}else if(mode==='working-map'){const rows=await tx.all('meta'),r=rows.find(r=>r.id.includes(':workingOwner:'));await tx.put('meta',{...r,deltaSequence:r.deltaSequence+1});}else if(mode==='filter'){const r=await tx.get('filterInputs',f.block.id);await tx.put('filterInputs',{...r,userEdited:false});}else if(mode==='receipt'){const r=(await tx.all('operationReceipts'))[0];await tx.put('operationReceipts',{...r,namespace:'SYNTHETIC wrong owner'});}else await tx.put('thoughts',{id:'SYNTHETIC unrepresented Human'});});const before=await snapshot(f.cold.store);let writes=0;await assert.rejects(buildGroupedCheckpoint(f.cold.core,{putImmutable:async()=>{writes++;},get:async()=>null},{store:f.cold.store,sourcePurgeProjection:true}));assert.equal(writes,0);assert.deepEqual(await snapshot(f.cold.store),before);
});
test('local human Working divergence cannot be overwritten by a foreign sibling checkpoint',async t=>{const f=await edited(t),b=await blank(t,'synthetic_working_sibling'),r=recovery(b);await r.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);await r.activate();working(b);await inputEdit(b.store,f.block.id,{note:'SYNTHETIC local protected branch'});await inputEdit(f.cold.store,f.block.id,{note:'SYNTHETIC remote sibling'});const cp=await checkpoint(f.cold.store,f.cold.core),before=await snapshot(b.store);await assert.rejects(recovery(b,'synthetic_sibling_reject').stageCheckpoint(cp.cp.ref,cp.transport.get));assert.deepEqual(await snapshot(b.store),before);});

for(const ordinal of [0,1])test('original allocation order '+ordinal+' survives Working negative reverse qualification',async t=>{const f=await purged(t,ordinal);working(f.cold);const block=(await f.cold.store.snapshot()).library.blocks[0];await inputEdit(f.cold.store,block.id,{libraryText:'SYNTHETIC full working text',note:'SYNTHETIC allocation note'});const cp=await checkpoint(f.cold.store,f.cold.core),b=await blank(t,'synthetic_allocation_'+ordinal),r=recovery(b);await r.stageCheckpoint(cp.cp.ref,cp.transport.get);await r.activate();assert.equal((await b.store.input(block.id)).libraryText,'SYNTHETIC full working text');assert.equal((await snapshot(b.store)).tombstones.length,1);});
test('unmodified repeated Working negative checkpoint is idempotent after exact local owner binding',async t=>{const f=await edited(t),b=await blank(t,'synthetic_repeat_working'),r=recovery(b);await r.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);await r.activate();working(b);const before=await snapshot(b.store),again=recovery(b,'synthetic_duplicate_working');await again.stageCheckpoint(f.exported.cp.ref,f.exported.transport.get);await again.activate();assert.deepEqual(await snapshot(b.store),before);});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=='working-negative-group-matrix')return previous.run(command,...args);
 const expectedNames=["selected Source Working plus independent permanent denial exports, closes, restores, cold edits and re-exports", "existing selected edited Source receives complete Working and denial while preserving its local edit and controls", "Working negative atomic consumer rolls back every table on owner-extra-row", "Working negative atomic consumer rolls back every table on owner-throws", "Working negative atomic consumer rolls back every table on working-map", "Working negative atomic consumer rolls back every table on invalid-event", "Working negative atomic consumer rolls back every table on lost-denial", "Working negative atomic consumer rolls back every table on semantic-terminal", "Working export rejects unrepresented body before transport publication", "Working export rejects unrepresented history before transport publication", "Working export rejects unrepresented working-map before transport publication", "Working export rejects unrepresented filter before transport publication", "Working export rejects unrepresented receipt before transport publication", "Working export rejects unrepresented extra-owner before transport publication", "local human Working divergence cannot be overwritten by a foreign sibling checkpoint", "original allocation order 0 survives Working negative reverse qualification", "original allocation order 1 survives Working negative reverse qualification", "unmodified repeated Working negative checkpoint is idempotent after exact local owner binding"];
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
