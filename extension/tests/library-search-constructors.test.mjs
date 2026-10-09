import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup,local,derived} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {STORAGE_KEY} from '../core/constants.js';
import * as current from '../core/library-search.js';
import * as before from './fixtures/library-search-constructors-before/core/library-search.js';

const fixture=new URL('./fixtures/library-search-constructors-before/',import.meta.url);
const clone=x=>structuredClone(x),bytes=x=>JSON.stringify(x);
const op=()=>crypto.randomUUID();
const clock=()=> '2026-10-09T00:00:00.000Z';
async function snapshot(s){return s.run(()=>s.repository.transaction(false,async t=>{
 const out={};for(const name of t.tx.objectStoreNames)out[name]=await t.all(name);return out;
}));}
// Test-only physical fork of a real typed-owner synthetic state. No domain rows
// are invented/reduced here; production transactions execute both implementations.
async function fork(s,state=null){
 state??=await snapshot(s);
 const storage=local();await storage.set(await s.local.get(STORAGE_KEY));
 const twin=new LibraryDocumentsStore(storage,{indexedDB:new IDBFactory(),clock});
 await twin.repository.open();
 await new Promise((resolve,reject)=>{
  const tx=twin.repository.db.transaction(Object.keys(state),'readwrite');
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
  for(const [name,rows]of Object.entries(state)){
   const st=tx.objectStore(name);st.clear();for(const row of rows)st.put(clone(row));
  }
 });
 await twin.finishFoundation();
 twin.clock=()=>{throw Error('search constructor/writer must not request a clock');};
 twin.uuid=()=>{throw Error('search constructor/writer must not allocate an identity');};
 assert.equal(bytes(await snapshot(twin)),bytes(state),'physical fork preserves all stores exactly');
 return twin;
}
// Observe actual writes, forwarding every call to the original transaction.
async function observe(s,fn){
 const log=[],original=s.repository.transaction;
 s.repository.transaction=function(write,body,...rest){return original.call(this,write,t=>body(new Proxy(t,{
  get(target,key){const value=Reflect.get(target,key);if(typeof value!=='function')return value;
   return (...args)=>{if(['put','putDerivedSearchRow','delete'].includes(key))log.push([key,...clone(args)]);return value.apply(target,args);};}
 })),...rest);};
 try{return {result:await fn(),log};}finally{s.repository.transaction=original;}
}
async function pair(s,fn){
 const state=await snapshot(s),old=await fork(s,state),next=await fork(s,state);
 const a=await observe(old,()=>fn(before,old)),b=await observe(next,()=>fn(current,next));
 assert.equal(bytes(b),bytes(a),'return values and ordered original writes match byte-for-byte');
 assert.equal(bytes(await snapshot(next)),bytes(await snapshot(old)),'every persisted store matches byte-for-byte');
 return {old,next,log:b.log,result:b.result};
}
async function batches(s,{atLeast=1}={}){
 let count=0,last;
 for(;count<30;count++){
  last=await pair(s,(module,store)=>module.searchBatch(store));
  const mutations=last.log.filter(([method,name])=>['put','delete'].includes(method)&&name==='librarySearchTerms');
  assert.ok(mutations.length<=200,'original posting mutation budget remains 200');
  await current.searchBatch(s);
  if(!last.result.pending&&count+1>=atLeast)return {count:count+1,last};
 }
 assert.fail('bounded original maintenance did not finish');
}
async function manual(s,body='Synthetic needle',title='Ｎeedle'){
 return s.createEntry({actor:'user',operationId:op(),title,body,type:'idea',formation:'explicit',evidence:[]});
}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('oracle is the exact frozen original module and complete four-file static dependency graph',async()=>{
 const manifest=JSON.parse(await readFile(new URL('manifest.json',fixture),'utf8'));
 assert.equal(manifest.sourceCommit,'1d8ebba5d99a4512db1625ecd3099cd665db68ab');
 assert.deepEqual(manifest.files.map(x=>x.path),['core/library-search.js','core/search-service.js','core/thought-model.js','core/constants.js']);
 for(const row of manifest.files){
  const data=await readFile(new URL(row.path,fixture));assert.equal(data.length,row.bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);
  assert.equal(createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'),row.gitBlob);
  if(row.path!=='core/library-search.js')assert.deepEqual(await readFile(new URL('../'+row.path,import.meta.url)),data,'live dependency is unchanged');
  const imports=[...data.toString().matchAll(/\bimport\s[^;]*?from\s*['"]([^'"]+)['"]/g)].map(x=>x[1]);
  assert.deepEqual(imports,row.path==='core/library-search.js'?['./search-service.js','./thought-model.js']:row.path==='core/thought-model.js'?['./constants.js']:[]);
 }
});

test('pure constructors retain exact original field order, Unicode tokens, IDs and source references',async()=>{
 const {s}=await setup(LibraryDocumentsStore,{clock});const entry=await manual(s,'汉字 ＡＢＣ abc A_B 123 café café','Ｔitle 标题');
 const state=await snapshot(s),row=freeze(clone(state.thoughts.find(x=>x.id===entry.id)));
 const locator=current.planSearchQueueLocator('entry',row),postings=current.planSearchPostings('entry',row);
 assert.deepEqual(Object.keys(locator),['id','entityKind','statusKey','ownerKind','ownerId','version','phase','offset','sourceRecordIds']);
 assert.equal(locator.id,JSON.stringify(['search','entry',entry.id]));
 assert.equal(locator.version,before.ownerVersion('entry',row));
 assert.deepEqual([...new Set(postings.map(x=>x.field))],['title','body','type']);
 const {log}=await pair(s,(module,store)=>store.libraryMaintenanceWrite(t=>module.queueSearch(t,'entry',{...clone(row),searchVersion:undefined})));
 assert.equal(bytes(log.find(([,name,r])=>name==='libraryMigrationItems'&&r.entityKind==='search')[2]),bytes(locator));
 const {log:written}=await pair(s,(module,store)=>module.searchBatch(store));
 const rows=written.filter(([,name])=>name==='librarySearchTerms').map(x=>x[2]);
 assert.equal(bytes(rows),bytes(postings.map(p=>current.planSearchPostingRow(freeze(locator),freeze(p),row))));
 assert.deepEqual(current.planSearchPostings('entry',freeze({...clone(row),lifecycle:'removed'})),[]);
 assert.deepEqual(current.planSearchPostings('entry',undefined),[]);
 assert.equal(bytes(row),bytes(state.thoughts.find(x=>x.id===entry.id)),'deep-frozen inputs are not mutated');
});

test('actual queue no-delta, derived-only and generated label cleanup retain ordered original writes',async()=>{
 const {s}=await setup(LibraryDocumentsStore,{clock});await manual(s);
 const topic=await s.createTopic({name:'Synthetic 汉字',operationId:op()});
 await s.createSection({topicId:topic.id,expectedTopicRevision:0,title:'Synthetic section',operationId:op()});
 for(const [kind,name]of [['entry','thoughts'],['topic','topics'],['section','sections']]){
  const row=(await snapshot(s))[name][0];
  const noDelta=await pair(s,(module,store)=>store.libraryMaintenanceWrite(t=>module.queueSearch(t,kind,clone(row))));
  assert.equal(noDelta.log.length,0);
  const forced=await pair(s,(module,store)=>store.libraryMaintenanceWrite(t=>module.queueSearch(t,kind,{...clone(row),searchVersion:undefined},{derivedOnly:true})));
  assert.equal(forced.log[0][0],'putDerivedSearchRow');
  // Source-derived labels use the existing cleanup locator; synthetic assignment
  // here tests the queue constructor boundary, not a new supported Human DTO.
  if(kind!=='entry'){
   const generated=await pair(s,(module,store)=>store.libraryMaintenanceWrite(t=>module.queueSearch(t,kind,{...clone(row),sourceRecordIds:['synthetic-source-a'],searchVersion:undefined})));
   assert.equal(generated.log[0][2].entityKind,'organizer_metadata');
   assert.deepEqual(generated.log[0][2].sourceRecordIds,['synthetic-source-a']);
   assert.deepEqual(generated.log.at(-1)[2].sourceRecordIds,['synthetic-source-a']);
  }
 }
});

test('actual long Entry partial/current/old-version/edit/remove/restore states match original byte oracle',async()=>{
 const {s}=await setup(LibraryDocumentsStore,{clock});
 const entry=await manual(s,Array.from({length:450},(_,i)=>'synthetic_word_'+i).join(' '));
 const initial=await pair(s,(module,store)=>module.searchBatch(store));
 assert.equal(initial.log.filter(([,name])=>name==='librarySearchTerms').length,200);
 const partial=await snapshot(initial.next),task=partial.libraryMigrationItems.find(x=>x.ownerId===entry.id);
 assert.equal(task.phase,'write');assert.equal(task.offset,200);assert.equal(Object.hasOwn(partial.thoughts.find(x=>x.id===entry.id),'indexedSearchVersion'),false);
 await batches(s);
 let row=(await snapshot(s)).thoughts.find(x=>x.id===entry.id);
 assert.equal(row.indexedSearchVersion,row.searchVersion);const completed=row.searchVersion;
 await s.editEntry({id:entry.id,operationId:op(),expectedRevision:row.revision,changes:{body:'changed evidence '+Array.from({length:430},(_,i)=>'edited_word_'+i).join(' ')}});
 row=(await snapshot(s)).thoughts.find(x=>x.id===entry.id);assert.equal(row.indexedSearchVersion,completed);assert.notEqual(row.searchVersion,completed);
 const deleting=await pair(s,(module,store)=>module.searchBatch(store));
 const deletion=deleting.log.filter(([method,name])=>method==='delete'&&name==='librarySearchTerms');assert.equal(deletion.length,200);
 const remaining=await snapshot(deleting.next);assert.ok(remaining.librarySearchTerms.every(x=>x.version===completed));
 assert.equal(remaining.libraryMigrationItems.find(x=>x.ownerId===entry.id).phase,'delete');
 await batches(s);
 row=(await snapshot(s)).thoughts.find(x=>x.id===entry.id);await s.removeEntry({id:entry.id,operationId:op(),expectedRevision:row.revision});
 await batches(s);let removed=await snapshot(s);assert.equal(removed.librarySearchTerms.filter(x=>x.ownerId===entry.id).length,0);
 row=removed.thoughts.find(x=>x.id===entry.id);assert.equal(row.lifecycle,'removed');
 await s.restoreEntry({id:entry.id,operationId:op(),expectedRevision:row.revision});await batches(s);
 row=(await snapshot(s)).thoughts.find(x=>x.id===entry.id);assert.equal(row.lifecycle,'active');assert.equal(row.indexedSearchVersion,row.searchVersion);
 assert.equal((await snapshot(s)).librarySearchTerms.filter(x=>x.ownerId===entry.id).length,current.planSearchPostings('entry',row).length);
});

test('actual Source-derived Entry, Topic/default/named Section and 20-owner batching preserve source eligibility and rows',async()=>{
 const {s}=await setup(LibraryDocumentsStore,{clock});
 const data=await snapshot(s),input=data.blocks[0].value;
 const entry=await derived(s,[input.id]);
 assert.ok((await snapshot(s)).thoughts.find(x=>x.id===entry.id).sourceRecordIds.length);
 const topic=await s.createTopic({name:'Source-free 汉字 Topic',operationId:op()});
 await s.createSection({topicId:topic.id,expectedTopicRevision:0,title:'Named café chapter',operationId:op()});
 for(let i=0;i<24;i++)await manual(s,'batch owner '+i,'Batch '+i);
 const first=await pair(s,(module,store)=>module.searchBatch(store));
 assert.ok((await snapshot(first.next)).libraryMigrationItems.some(x=>x.entityKind==='search'),'20-owner work page leaves additional owners');
 await batches(s);
 const ready=await snapshot(s);
 for(const [kind,name]of [['entry','thoughts'],['topic','topics'],['section','sections']])for(const row of ready[name]){
  const postings=ready.librarySearchTerms.filter(x=>x.ownerKind===kind&&x.ownerId===row.id);
  assert.equal(bytes(postings.slice().sort((a,b)=>a.id.localeCompare(b.id))),bytes(current.planSearchPostings(kind,row).map(p=>current.planSearchPostingRow(current.planSearchQueueLocator(kind,row),p,row)).sort((a,b)=>a.id.localeCompare(b.id))));
 }
 // Test-only absence fault in a fork of an actual Source-backed Entry. It proves
 // original sourcePresent rejection; it does not claim a typed purge journey.
 const absent=await fork(s);absent.clock=clock;
 await absent.libraryMaintenanceWrite(async t=>{const row=await t.get('thoughts',entry.id);await t.delete('records',row.sourceRecordIds[0]);delete row.searchVersion;await current.queueSearch(t,'entry',row,{derivedOnly:true});});
 await batches(absent);
 const denied=await snapshot(absent);assert.equal(denied.librarySearchTerms.filter(x=>x.ownerId===entry.id).length,0);
 assert.equal(denied.thoughts.find(x=>x.id===entry.id).indexedSearchVersion,denied.thoughts.find(x=>x.id===entry.id).searchVersion);
});

test('actual rebuild and missing-owner/stale-task cleanup remain unchanged',async()=>{
 const {s}=await setup(LibraryDocumentsStore,{clock});const entry=await manual(s);
 await s.createTopic({name:'Rebuild synthetic',operationId:op()});await s.ensureLibrarySearch();
 for(let i=0;i<3;i++){await pair(s,(module,store)=>module.rebuildBatch(store));await current.rebuildBatch(s);}
 assert.equal((await snapshot(s)).meta.find(x=>x.id==='library-search-rebuild').complete,true);
 for(const mode of ['missing','stale']){
  const fault=await fork(s);fault.clock=clock;
  await fault.libraryMaintenanceWrite(async t=>{if(mode==='missing')await t.delete('thoughts',entry.id);else{const row=await t.get('thoughts',entry.id);row.searchVersion='synthetic-stale-version';await t.putDerivedSearchRow('thoughts',row);}});
  const outcome=await pair(fault,(module,store)=>module.searchBatch(store));
  assert.equal((await snapshot(outcome.next)).libraryMigrationItems.some(x=>x.ownerId===entry.id&&x.entityKind==='search'),false);
 }
});
