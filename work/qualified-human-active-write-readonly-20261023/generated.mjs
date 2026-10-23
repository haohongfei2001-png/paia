import {assert} from './generation-purge-assert.mjs';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeFactory(){const cap=Object.freeze({});factoryNames.set(cap,new Map());return cap;}
function nativeOptions(options){const names=factoryNames.get(options?.indexedDB);if(!names||typeof options.name!=='string')throw Error('native factory binding');let name=names.get(options.name);if(!name){name='paia-native-qualified-human-retirement-matrix-'+(++sequence)+'-'+options.name;names.set(options.name,name);ownedNames.add(name);}return {...options,indexedDB,name};}
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

async function fixture(t,count=1,checkpoint,bodyBytes=0){assert.ok(bodyBytes===0||bodyBytes===64*1024);assert.ok(Number.isSafeInteger(count)&&count>=1&&count<=3,'dedicated safety fixture is capped at three groups');const factory=nativeFactory(),source=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-source'});await source.consent(true);await source.finishFoundation();const sc=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_phased',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sc);for(let i=0;i<count;i++)await source.createEntry({actor:'user',body:'SYNTHETIC original '+i+'x'.repeat(bodyBytes),type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cp=await buildCheckpoint(sc,transport,{grouped:{store:source}}),registry=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-phased-registry'}),publication=new CanonicalGenerationPublication(registry),store=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-target'}),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sc.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,checkpoint,protectRepository:true});await stage.begin(cp.ref,r=>transport.get(r));t.after(()=>[source.repository,registry,store.repository].forEach(r=>r.db?.close()));return {stage,publication,handle,store,core,cp,transport,registry,factory};}
const PREFIX='canonical-generation:checkpoint:',RETIRE='canonical-generation:copy-retirement:v1';
const copies=id=>id===PREFIX+'state:v1'||/^canonical-generation:checkpoint:(item|page):[0-9]{8}$/.test(id);
async function snapshot(f){return f.store.repository.transaction(false,async t=>{const out={};for(const table of f.store.repository.stores)out[table]=await t.all(table);return out;});}
const canonical=s=>({...s,meta:s.meta.filter(r=>!copies(r.id)&&r.id!==RETIRE)});
async function raw(f,fn){await new Promise((resolve,reject)=>{const tx=f.store.repository.db.transaction(['meta'],'readwrite');fn(tx.objectStore('meta'));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}
async function published(t,count=1,bodyBytes=0){const f=await fixture(t,count,undefined,bodyBytes);await f.stage.stageQualifiedHumanCheckpoint(r=>f.transport.get(r));const proof=await f.stage.validateQualifiedHumanCheckpoint(),restore=new CanonicalGenerationPhasedHumanRestore(f);for(let i=0;i<count;i++)await restore.step(proof);await restore.preparePublication(proof);const token=await f.publication.sealOriginalPhasedHumanCheckpoint(f.handle,restore,proof);await f.publication.reserve(token,'synthetic_v2_retirement');assert.equal((await f.publication.recover()).state,'committed');return f;}
async function reopen(t,f){await f.store.repository.close();await f.registry.close();const store=nativeStore(f.store.local,{indexedDB:f.factory,name:'SYNTHETIC-phased-target'}),registry=nativeRepository(local(),{indexedDB:f.factory,name:'SYNTHETIC-phased-registry'}),publication=new CanonicalGenerationPublication(registry),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});t.after(()=>[store.repository,registry].forEach(r=>r.db?.close()));return {...f,store,registry,publication,handle};}
for(const count of [1,3])test('qualified v2 '+count+' group cold retirement preserves canonical and audit rows and ordinary editing',async t=>{
 const original=await published(t,count),before=await snapshot(original),ledger=before.meta.find(r=>r.id===CANONICAL_PHASED_TASK);assert.equal(ledger.version,2);assert.equal(ledger.phase,'verified');assert.equal(ledger.pending,null);assert.equal(ledger.controlPending,null);
 const cold=await reopen(t,original),result=await cold.publication.retireCheckpointCopies(cold.handle);assert.equal(result.state,'retired');const after=await snapshot(cold);assert.equal(after.meta.filter(r=>copies(r.id)).length,0);assert.deepEqual(canonical(after),canonical(before));assert.deepEqual(after.meta.find(r=>r.id===CANONICAL_PHASED_TASK),ledger);
 const again=await reopen(t,cold);assert.equal((await again.publication.retireCheckpointCopies(again.handle)).state,'retired');assert.deepEqual(await snapshot(again),after);await again.publication.bindOriginalActiveStore(again.handle,again.store);const entry=after.thoughts[0];await again.store.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{note:'SYNTHETIC qualified cold retirement edit'},operationId:crypto.randomUUID()});assert.equal((await again.store.entry(entry.id)).note,'SYNTHETIC qualified cold retirement edit');assert.equal((await snapshot(again)).thoughts.length,count);
});
for(const defect of ['control-debt','foreign-task'])test('qualified cold retirement refuses '+defect+' before deleting any body copy',async t=>{
 const f=await published(t),cold=await reopen(t,f);await raw(cold,s=>{const request=s.get(CANONICAL_PHASED_TASK);request.onsuccess=()=>{const row=request.result;s.put(defect==='control-debt'?{...row,workBytes:row.workBytes+2*1024*1024,activeMs:row.activeMs+30000,controlSequence:row.controlSequence+1,controlPending:{sequence:row.controlSequence+1,bytes:2*1024*1024,ms:30000}}:{...row,taskId:'SYNTHETIC foreign task'});};});const before=await snapshot(cold);await assert.rejects(cold.publication.retireCheckpointCopies(cold.handle));assert.deepEqual(await snapshot(cold),before);
});
test('qualified cold retirement terminal fence rolls back deletions after late control ledger mutation',async t=>{
 const f=await reopen(t,await published(t)),before=await snapshot(f),task=before.meta.find(r=>r.id===CANONICAL_PHASED_TASK),probe=f.store.repository.db.transaction(['meta'],'readonly'),proto=Object.getPrototypeOf(probe.objectStore('meta')),put=proto.put;let injected=0;proto.put=function(row,...args){const request=put.call(this,row,...args);if(this.transaction.db.name===f.store.repository.name&&row?.id===RETIRE){injected++;put.call(this,{...task,controlBurned:task.controlBurned+1});}return request;};try{await assert.rejects(f.publication.retireCheckpointCopies(f.handle));}finally{proto.put=put;}assert.equal(injected,1);assert.deepEqual(await snapshot(f),before);
});

// This <=3-group profile has one authentication page. It cannot model the
// 129-run accumulated body copies: the original stage must refuse it earlier.
test('qualified three group large body authentication refuses before publication at original budget',async t=>{
 const f=await fixture(t,3,undefined,64*1024),before=await snapshot(f);
 await assert.rejects(f.stage.stageQualifiedHumanCheckpoint(r=>f.transport.get(r)),e=>e.code==='BNS_GROUP_RESOURCE_LIMIT');
 const after=await snapshot(f),ledger=after.meta.find(r=>r.id===CANONICAL_PHASED_TASK);
 for(const table of f.store.repository.stores)if(table!=='meta')assert.deepEqual(after[table],before[table]);
 assert.equal(ledger.version,2);assert.equal(ledger.phase,'staging');assert.equal(ledger.pending.kind,'authenticate');assert.ok(ledger.workBytes<=64*1024*1024);
 assert.equal(after.meta.find(r=>r.id===PREFIX+'state:v1').received,0);
 assert.equal(after.meta.find(r=>r.id==='canonical-generation:gate:v1').phase,'staging');
 assert.equal(after.meta.some(r=>r.id===RETIRE||r.id==='canonical-generation:qualified-graph:v1'),false);
 assert.deepEqual(await f.publication.active(),{state:'empty'});
});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="qualified-human-retirement-matrix")return previous.run(command,...args);
 const passed=[];
 const selected=cases;if(selected.length!==6||new Set(selected.map(x=>x.name)).size!==6||JSON.stringify(selected.map(x=>x.name))!=="[\"qualified v2 1 group cold retirement preserves canonical and audit rows and ordinary editing\",\"qualified v2 3 group cold retirement preserves canonical and audit rows and ordinary editing\",\"qualified cold retirement refuses control-debt before deleting any body copy\",\"qualified cold retirement refuses foreign-task before deleting any body copy\",\"qualified cold retirement terminal fence rolls back deletions after late control ledger mutation\",\"qualified three group large body authentication refuses before publication at original budget\"]"||selected.some(x=>/(?:^|[^0-9])(?:65|129)(?:[^0-9]|$)/.test(x.name)))throw Error('native selected count or allowlist');
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
