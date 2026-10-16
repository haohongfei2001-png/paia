import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {invalidateThoughtRootIndex,THOUGHT_ROOT_BUILD_BATCH,THOUGHT_ROOT_COLD_BATCHES} from '../core/thought-read-index.js';
import {ContinuousCollection} from '../ui/continuous-collection.js';
import {setup} from './harness/thought-m1.mjs';
const op=()=>crypto.randomUUID();

async function fixture(count){
 let tick=0;
 const f=await setup(LibraryDocumentsStore,{clock:()=>new Date(Date.UTC(2026,0,1,0,0,tick++)).toISOString()});
 for(let i=0;i<count;i++)await f.s.createTopic({name:'ANS07 topic '+String(i).padStart(3,'0'),operationId:op()});
 return f;
}
async function firstReady(store,limit=40){
 let page;
 for(let i=0;i<12;i++){page=await store.libraryIndexPage({mode:'stable',limit});if(page.coverage?.complete)return page;}
 throw new Error('root index did not complete');
}
async function allStable(store,limit=40){
 const out=[];let page=await firstReady(store,limit),cursor=null;
 for(;;){
  if(cursor)page=await store.libraryIndexPage({mode:'stable',limit,cursor});
  out.push(...page.items);
  cursor=page.nextCursor;if(!cursor)break;
 }
 return out;
}
test('ANS-07 root index covers 0/1/40/41/400 topics with stable createdAt/id order',async()=>{
 for(const count of [0,1,40,41,400]){
  const {s}=await fixture(count),items=await allStable(s);
  assert.equal(items.length,count,'count '+count);
  const sorted=[...items].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))||a.id.localeCompare(b.id));
  assert.deepEqual(items.map(x=>x.id),sorted.map(x=>x.id));
  assert.equal(new Set(items.map(x=>x.id)).size,count);
 }
});
test('ANS-07 root build is bounded, restartable and stable pages do not full-scan topics',async()=>{
 const {s,storage,indexedDB}=await fixture(250);
 const cold=await s.libraryIndexPage({mode:'stable',limit:40});
 assert.equal(cold.coverage.complete,true);
 assert.ok(cold.operations.maxBuildBatch<=THOUGHT_ROOT_BUILD_BATCH);
 assert.ok(cold.operations.buildBatches<=THOUGHT_ROOT_COLD_BATCHES);
 assert.ok(cold.operations.buildRowsScanned<=THOUGHT_ROOT_BUILD_BATCH*THOUGHT_ROOT_COLD_BATCHES);
 const restarted=new LibraryDocumentsStore(storage,{indexedDB});
 const page=await firstReady(restarted,40);
 assert.equal(page.items.length,40);
 const scans=restarted.repository.metrics.scans;
 const next=await restarted.libraryIndexPage({mode:'stable',limit:40,cursor:page.nextCursor});
 assert.equal(next.items.length,40);
 assert.equal(restarted.repository.metrics.scans,scans,'stable page must not call all(topics)');
 assert.ok(next.operations.indexRowsRead<=40);
 assert.ok(next.operations.topicRowsRead<=40);
});
test('ANS-07 root projection follows rename, lifecycle removal and merge redirect without changing stable key',async()=>{
 const {s}=await fixture(3);
 let rows=await allStable(s,1),ids=rows.map(x=>x.id);
 const middle=await s.topic(ids[1]);
 await s.editTopic({id:middle.id,expectedRevision:middle.revision,changes:{name:'ANS07 renamed'},operationId:op()});
 rows=await allStable(s,1);
 assert.deepEqual(rows.map(x=>x.id),ids);
 assert.equal(rows[1].name,'ANS07 renamed');
 await s.foundationWrite(async t=>{const row=await t.get('topics',ids[0]);row.lifecycle='removed';await s.touchTopic(t,row);});
 rows=await allStable(s,1);assert.deepEqual(rows.map(x=>x.id),ids.slice(1));
 await s.foundationWrite(async t=>{const row=await t.get('topics',ids[2]);row.redirectTo=ids[1];await s.touchTopic(t,row);});
 rows=await allStable(s,1);assert.deepEqual(rows.map(x=>x.id),[ids[1]]);
});
test('ANS-07 invalid root generation rebuild keeps old complete generation readable until atomic replacement',async()=>{
 const {s}=await fixture(220);
 const ready=await firstReady(s,40),old=ready.coverage.activeGeneration;
 await invalidateThoughtRootIndex(s);
 const during=await s.libraryIndexPage({mode:'stable',limit:40});
 assert.equal(during.items.length,40);
 assert.equal(during.coverage.activeGeneration,old);
 assert.equal(during.coverage.building,true);
 let page=during;
 for(let i=0;i<5&&page.coverage.building;i++)page=await s.libraryIndexPage({mode:'stable',limit:40});
 assert.equal(page.coverage.building,false);
 assert.notEqual(page.coverage.activeGeneration,old);
});
test('ANS-07 continuous collection crosses empty middle pages, dedupes and terminates only on terminal coverage',async()=>{
 const pages=new Map([
  ['start',{items:[{id:'a'}],nextCursor:'empty'}],
  ['empty',{items:[],nextCursor:'last'}],
  ['last',{items:[{id:'a'},{id:'b'}],nextCursor:null,complete:true}]
 ]);
 const c=new ContinuousCollection({scope:'root',load:({cursor})=>pages.get(cursor||'start')});
 await c.loadUntil({minItems:3});
 assert.deepEqual(c.items.map(x=>x.id),['a','b']);
 assert.equal(c.terminal,true);
 const building=new ContinuousCollection({scope:'root',load:async()=>({items:[],nextCursor:null,coverage:{complete:false},complete:false}),maxEmptyPages:3});
 await building.loadNext();
 assert.equal(building.terminal,false);
 assert.equal(building.items.length,0);
});
test('ANS-07 continuous collection rejects stale query responses and preserves visible rows on failure',async()=>{
 let releaseOld;const oldPromise=new Promise(resolve=>{releaseOld=resolve;});
 const c=new ContinuousCollection({scope:'search',query:'old',load:({query})=>query==='old'?oldPromise:Promise.resolve({items:[{id:'new'}],nextCursor:null,complete:true})});
 const pending=c.loadNext();c.reset({scope:'search',query:'new'});releaseOld({items:[{id:'old'}],nextCursor:null,complete:true});
 const stale=await pending;assert.equal(stale.stale,true);assert.deepEqual(c.items,[]);
 await c.loadNext();assert.deepEqual(c.items.map(x=>x.id),['new']);
 const keep=new ContinuousCollection({scope:'root',load:async()=>({items:[{id:'kept'}],nextCursor:'again'})});
 await keep.loadNext();keep.load=async()=>{throw Error('synthetic read failure');};await keep.loadNext();
 assert.deepEqual(keep.items.map(x=>x.id),['kept']);assert.ok(keep.error);
 const restored=new ContinuousCollection({scope:'root',load:async()=>({items:[],nextCursor:null,complete:true})});
 restored.restore(keep.snapshot(),{scope:'root',query:''});assert.deepEqual(restored.items.map(x=>x.id),['kept']);
});

// Warm counts retain the original task and cache without a durable writer lock.
test('ANS-07 warm pending and completed counts never open a write transaction',async()=>{
 const {s}=await fixture(1),topic=(await firstReady(s)).items[0],taskId=JSON.stringify(['count',topic.id]);
 const inspect=()=>s.repository.transaction(false,async t=>({topic:await t.get('topics',topic.id),task:await t.get('libraryMigrationItems',taskId)}));
 const before=await inspect(),transaction=s.repository.transaction.bind(s.repository);let writes=0;
 s.repository.transaction=(write,...args)=>{if(write)writes++;return transaction(write,...args);};
 assert.deepEqual(await s.topicCount(topic.id),{visibleEntryCount:0,countComplete:false});
 assert.deepEqual(await inspect(),before);assert.equal(writes,0);
 await s.drainLibraryMaintenance();writes=0;
 const completed=await inspect();assert.equal(completed.task,undefined);
 assert.deepEqual(await s.topicCount(topic.id),{visibleEntryCount:0,countComplete:true});
 assert.deepEqual(await inspect(),completed);assert.equal(writes,0);
});

test('ANS-07 count enqueue rechecks epoch and cache after the readonly miss',async()=>{
 const {s}=await fixture(1),topic=(await firstReady(s)).items[0],taskId=JSON.stringify(['count',topic.id]);
 await s.repository.transaction(true,t=>t.delete('libraryMigrationItems',taskId));
 const transaction=s.repository.transaction.bind(s.repository);let injected=false;
 s.repository.transaction=async(write,fn,stores)=>{
  if(write&&!injected){injected=true;await transaction(true,async t=>{
   const current=await t.get('topics',topic.id);await t.put('meta',{id:'thought-epoch',value:91});
   current.countCache={key:`reading1:${current.activeLayoutGeneration}:${current.countVersion||0}:91`,count:7,complete:true};await t.put('topics',current);
  });}
  return transaction(write,fn,stores);
 };
 assert.deepEqual(await s.topicCount(topic.id),{visibleEntryCount:7,countComplete:true});assert.equal(injected,true);
 assert.equal(await transaction(false,t=>t.get('libraryMigrationItems',taskId)),undefined,'no obsolete count job is queued');
});

test('ANS-07 changed count generation resets stale work but keeps same-generation partial progress',async()=>{
 const {s}=await fixture(1),topic=(await firstReady(s)).items[0],taskId=JSON.stringify(['count',topic.id]);
 await s.repository.transaction(true,async t=>{const job=await t.get('libraryMigrationItems',taskId);await t.put('libraryMigrationItems',{...job,cursor:'synthetic-progress',count:3});});
 const original=await s.repository.transaction(false,t=>t.get('libraryMigrationItems',taskId));
 await s.topicCount(topic.id);assert.deepEqual(await s.repository.transaction(false,t=>t.get('libraryMigrationItems',taskId)),original);
 await s.repository.transaction(true,t=>t.put('meta',{id:'thought-epoch',value:92}));
 assert.deepEqual(await s.topicCount(topic.id),{visibleEntryCount:0,countComplete:false});
 const changed=await s.repository.transaction(false,t=>t.get('libraryMigrationItems',taskId));
 assert.notEqual(changed.key,original.key);assert.ok(changed.key.endsWith(':92'));assert.equal(changed.cursor,null);assert.equal(changed.count,0);
});
