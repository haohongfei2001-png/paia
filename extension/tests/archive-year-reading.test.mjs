import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {archiveYearKey} from '../core/archive-year-index.js';
import {readArchiveYearPage,archiveReadingYear} from '../core/archive-query.js';
globalThis.IDBKeyRange=IDBKeyRange;
const factory=new IDBFactory();
function fixture(values){
 const inputs=values.map((stamp,i)=>({id:String(i),documentId:'d',conversationOrder:i,sourceSentAt:stamp})),rows=inputs.map(ix=>({key:archiveYearKey(ix),value:{inputId:ix.id}})).sort((a,b)=>factory.cmp(a.key,b.key));let reads=0;
 return {rows,get reads(){return reads;},t:{async get(_store,id){return inputs.find(x=>x.id===id);},async rangePage(_store,_index,range,cursor,limit,direction){reads++;let found=rows.filter(x=>range.includes(x.key)&&(!cursor||(direction==='prev'?factory.cmp(x.key,cursor)<0:factory.cmp(x.key,cursor)>0)));if(direction==='prev')found.reverse();return {rows:found.slice(0,limit),next:found.length>limit?found[limit-1].key:null};}}};
}
const read=(f,options={})=>readArchiveYearPage(f.t,{documentId:'d',generation:7,yearReading:{},...options});
test('qualified yearly traversal skips filtered-only years and preserves actual chronology and gaps',async()=>{
 const f=fixture(['2026-01-01T00:00:00Z','2026-06-01T00:00:00Z','2025-01-01T00:00:00Z','2023-01-01T00:00:00Z',null]);
 const eligible=async row=>row.id!=='2';
 const first=await read(f,{eligible});assert.deepEqual(first.rows.map(x=>x.value.id),['1','0']);assert.equal(first.yearReading.year,2026);assert.equal(first.yearReading.nextYear,2023);assert.equal(first.next,null);
 const old=await read(f,{eligible,yearReading:{year:2023,generation:7}});assert.deepEqual(old.rows.map(x=>x.value.id),['3']);assert.equal(old.yearReading.continuation.probe,true);
 const unknown=await read(f,{eligible,yearReading:old.yearReading.continuation});assert.equal(unknown.yearReading.nextYear,'undated');assert.deepEqual(unknown.rows,[],'boundary probe emits no next-year bodies');
 const shown=await read(f,{eligible,yearReading:{year:'undated',generation:7}});assert.deepEqual(shown.rows.map(x=>x.value.id),['4']);assert.equal(shown.yearReading.complete,true);
 const asc=await read(f,{sort:'asc',eligible});assert.deepEqual(asc.rows.map(x=>x.value.id),['3']);assert.equal(asc.yearReading.nextYear,2026);
});
test('bounded empty scans cannot claim completion or guess a year',async()=>{
 const f=fixture(Array.from({length:205},()=> '2026-01-01T00:00:00Z'));
 const eligible=async row=>row.id==='0';let page=await read(f,{eligible});assert.equal(page.rows.length,0);assert.equal(page.yearReading.complete,false);assert.equal(page.yearReading.nextYear,null);assert.equal(page.yearReading.scanned,100);assert.ok(page.next);
 page=await read(f,{eligible,cursor:page.next,yearReading:{year:page.yearReading.year,generation:7}});assert.equal(page.yearReading.complete,false);assert.equal(page.yearReading.scanned,100);
 page=await read(f,{eligible,cursor:page.next,yearReading:{year:page.yearReading.year,generation:7}});assert.deepEqual(page.rows.map(x=>x.value.id),['0']);assert.equal(page.yearReading.year,2026);
});
test('within-year pages remain bounded and stale generations or wrong-scope cursors are refused',async()=>{
 const f=fixture(Array.from({length:42},()=> '2026-01-01T00:00:00Z'));
 const page=await read(f);assert.equal(page.rows.length,40);assert.equal(page.yearReading.complete,false);
 const next=await read(f,{cursor:page.next,yearReading:{year:2026,generation:7}});assert.equal(next.rows.length,2);
 await assert.rejects(read(f,{yearReading:{generation:6}}),{code:'BACKUP_CHANGED'});
 await assert.rejects(read(f,{cursor:['another',0]}),{code:'INVALID_REQUEST'});
 for(const yearReading of [null,[],{year:-1},{year:2026,phase:'undated'},{probe:'yes'},{extra:1}])await assert.rejects(read(f,{yearReading}),{code:'INVALID_REQUEST'});
});
test('invalid and partial timestamps stay undated without capture-time substitution',async()=>{
 for(const value of [null,'bad','2026','2026-02-30','2026-02-30T00:00:00Z'])assert.equal(archiveReadingYear(value),null);
 assert.equal(archiveReadingYear('2026-01-01'),2026);
 const f=fixture(['bad',null,'2025-01-01T00:00:00Z']);const page=await read(f,{yearReading:{year:'undated'}});assert.deepEqual(page.rows.map(x=>x.value.id),['0','1']);
});

test('original native store combines year qualification with filter snapshots and direct older targets',async()=>{
 const {SmartFilterStore}=await import('../core/smart-filter-store.js');let data={};
 const store=new SmartFilterStore({async get(key){return {[key]:structuredClone(data[key])};},async set(value){Object.assign(data,structuredClone(value));}},{indexedDB:new IDBFactory()});
 try{
  await store.consent(true);
  await store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-year-chat',url:'https://chatgpt.com/c/synthetic-year-chat',title:'Synthetic years'},messages:Array.from({length:47},(_,i)=>({sourceMessageId:'synthetic-year-'+i,pageOrder:i+1,originalText:i===45?'继续':'SYNTHETIC authored condition '+i,presence:{version:1,attachment:'absent',reference:'absent',confidence:'verified'}}))});
  let snapshot=await store.snapshot();for(let i=0;i<snapshot.records.length;i++)await store.changeRecord(snapshot.records[i].id,row=>{row.sourceSentAt=i<44?'2026-01-01T00:00:00Z':i===44?'2023-01-01T00:00:00Z':i===45?'2024-01-01T00:00:00Z':null;});
  await store.evaluateFilters();snapshot=await store.snapshot();const documentId=snapshot.library.blocks[0].documentId,before=structuredClone(snapshot.records);
  const first=await store.page({documentId,yearReading:{},limit:40});assert.equal(first.readingSort,'desc');assert.equal(first.pageItemIds.length,40);assert.equal(first.yearReading.year,2026);
  await store.updateLibrary(first.pageItemIds[0],{libraryText:'SYNTHETIC current edited expression'});
  const tail=await store.page({documentId,sort:'desc',yearReading:{year:2026,generation:first.yearReading.generation},cursor:first.nextCursor,readingSnapshot:first.readingSnapshot});assert.equal(tail.pageItemIds.length,4);assert.equal(tail.yearReading.nextYear,2023,'filtered-only 2024 is not offered');
  const older=snapshot.library.blocks.find(x=>x.sourceRecordId===snapshot.records[44].id);
  const target=await store.page({documentId,contextInputId:older.id,yearReading:{},limit:40});assert.equal(target.yearReading.year,2023);assert.ok(target.pageItemIds.includes(older.id));
  const unknown=snapshot.library.blocks.find(x=>x.sourceRecordId===snapshot.records[46].id);
  const undated=await store.page({documentId,contextInputId:unknown.id,yearReading:{},limit:40});assert.equal(undated.yearReading.year,'undated');assert.ok(undated.pageItemIds.includes(unknown.id));
  assert.deepEqual((await store.snapshot()).records,before,'annual reads never rewrite source');
 }finally{await store.repository.close();}
});
test('UTC ordering preserves offset-crossed years and same-instant stable ties',async()=>{
 const f=fixture(['2026-01-01T00:30:00+02:00','2025-12-31T23:30:00-02:00','2025-06-01T00:00:00Z','2026-01-01T01:30:00Z']);
 const newest=await read(f);assert.equal(newest.yearReading.year,2026);assert.deepEqual(newest.rows.map(x=>x.value.id),['3','1']);assert.equal(newest.yearReading.nextYear,2025);
 const older=await read(f,{yearReading:{year:2025}});assert.deepEqual(older.rows.map(x=>x.value.id),['0','2']);
 const oldest=await read(f,{sort:'asc'});assert.deepEqual(oldest.rows.map(x=>x.value.id),['2','0']);assert.equal(oldest.yearReading.nextYear,2026);
});
test('existing native database rebuilds normalized metadata without source changes and maintains edits/deletes',async()=>{
 const {SmartFilterStore}=await import('../core/smart-filter-store.js');const {archiveYearPrefix,archiveYearMeta,archiveYearKey}=await import('../core/archive-year-index.js');let data={};const store=new SmartFilterStore({async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}},{indexedDB:new IDBFactory()});
 try{
  await store.consent(true);await store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'offset-year-chat',url:'https://chatgpt.com/c/offset-year-chat',title:'offset'},messages:[0,1,2].map(i=>({sourceMessageId:'offset-'+i,pageOrder:i+1,originalText:'SYNTHETIC complete original expression '+i,presence:{version:1,attachment:'absent',reference:'absent',confidence:'verified'}}))});
  let snapshot=await store.snapshot();const stamps=['2026-01-01T00:30:00+02:00','2025-12-31T23:30:00-02:00','2025-06-01T00:00:00Z'];for(let i=0;i<3;i++)await store.changeRecord(snapshot.records[i].id,row=>{row.sourceSentAt=stamps[i];});snapshot=await store.snapshot();const documentId=snapshot.library.blocks[0].documentId,before=structuredClone(snapshot.records);
  // Simulate a pre-feature database: original block/source indexes remain, no
  // derived metadata and no build receipt exist.
  await store.repository.transaction(true,async t=>{for(const b of snapshot.library.blocks){const ix=await t.get('blockIndex',b.id);await t.delete('meta',archiveYearKey(ix));}await t.delete('meta',archiveYearMeta(documentId));});
  const first=await store.page({documentId,yearReading:{}});assert.equal(first.yearReading.year,2026);assert.equal(first.pageItemIds.length,1);assert.equal(first.yearReading.nextYear,2025);
  assert.equal((await store.repository.transaction(false,t=>t.get('meta',archiveYearMeta(documentId)))).complete,true);assert.deepEqual((await store.snapshot()).records,before);
  const target=snapshot.library.blocks.find(b=>b.sourceRecordId===snapshot.records[1].id);await store.changeRecord(snapshot.records[1].id,row=>{row.sourceSentAt='2024-01-01T00:00:00Z';});await assert.rejects(store.page({documentId,yearReading:{year:2026,generation:first.yearReading.generation}}),{code:'BACKUP_CHANGED'});const after=await store.page({documentId,yearReading:{}});assert.equal(after.yearReading.year,2025);assert.equal(after.yearReading.nextYear,2024);assert.equal(after.pageItemIds.includes(target.id),false);
  await store.repository.transaction(true,t=>t.delete('meta',archiveYearMeta(documentId)));await assert.rejects(store.page({documentId,yearReading:{year:2025,generation:after.yearReading.generation}}),{code:'BACKUP_CHANGED'},'rebuilt index epoch rejects an old session even when revision restarts');
  await store.repository.transaction(true,t=>t.delete('blockIndex',target.id));assert.equal((await store.repository.transaction(false,t=>t.rangePage('meta',null,IDBKeyRange.bound(archiveYearPrefix(documentId),archiveYearPrefix(documentId)+'\uffff',false,true),null,100))).rows.length,2);
 }finally{await store.repository.close();}
});
test('existing-index rebuilding yields after four bounded batches instead of claiming complete',async()=>{
 const {SmartFilterStore}=await import('../core/smart-filter-store.js');const {advanceArchiveYearIndex,archiveYearMeta,archiveYearKey}=await import('../core/archive-year-index.js');let data={};const store=new SmartFilterStore({async get(k){return {[k]:data[k]};},async set(v){Object.assign(data,v);}},{indexedDB:new IDBFactory()});
 try{await store.consent(true);await store.repository.transaction(true,async t=>{await t.put('documents',{id:'bounded',value:{id:'bounded'}});for(let i=0;i<401;i++){const ix={id:'synthetic-'+String(i).padStart(4,'0'),documentId:'bounded',sourceSentAt:'2026-01-01T00:00:00Z',conversationOrder:i};await t.put('blockIndex',ix);await t.delete('meta',archiveYearKey(ix));}});
 assert.equal(await advanceArchiveYearIndex(store,'bounded'),false);const pending=await store.repository.transaction(false,t=>t.get('meta',archiveYearMeta('bounded')));assert.equal(pending.complete,false);assert.equal(pending.cursor,'synthetic-0399');assert.equal(await advanceArchiveYearIndex(store,'bounded'),true);
 }finally{await store.repository.close();}
});

test('qualified offset instants at accepted calendar edges remain ordered and reachable',async()=>{
 const f=fixture(['1000-01-01T00:30:00+02:00','9999-12-31T23:30:00-02:00','2026-01-01T00:00:00Z']);
 const latest=await read(f);assert.equal(latest.yearReading.year,10000);assert.deepEqual(latest.rows.map(x=>x.value.id),['1']);assert.equal(latest.yearReading.nextYear,2026);
 const earliest=await read(f,{sort:'asc'});assert.equal(earliest.yearReading.year,999);assert.deepEqual(earliest.rows.map(x=>x.value.id),['0']);
 assert.deepEqual((await read(f,{yearReading:{year:999}})).rows.map(x=>x.value.id),['0']);assert.deepEqual((await read(f,{yearReading:{year:10000}})).rows.map(x=>x.value.id),['1']);
});

test('annual fresh order honors a persisted explicit ascending choice',async()=>{
 const {queryPage}=await import('../core/archive-query.js');const {archiveYearMeta}=await import('../core/archive-year-index.js');const f=fixture(['2026-01-01T00:00:00Z','2020-01-01T00:00:00Z']);
 const t={...f.t,async get(store,id){if(store==='meta'&&id==='organizer-controls')return {inputReadingSort:'asc'};if(store==='meta'&&id===archiveYearMeta('d'))return {epoch:'synthetic',revision:0};if(store==='documents')return {chatKey:'synthetic',value:{id:'d'}};if(store==='libraryDocuments')return {value:{id:'d'}};if(store==='blocks')return {value:{id,documentId:'d',provenance:[]}};return f.t.get(store,id);}};
 const page=await queryPage(t,{}, {documentId:'d',yearReading:{}},{ready:true,eligible:async()=>true});assert.equal(page.readingSort,'asc');assert.equal(page.yearReading.year,2020);assert.deepEqual(page.pageItemIds,['1']);
});


test('saved ascending order and implicit sort seek the same exact annual Input as the page owner',async()=>{
 const {SmartFilterStore}=await import('../core/smart-filter-store.js');let data={};
 const store=new SmartFilterStore({async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}},{indexedDB:new IDBFactory()});
 try{
  await store.consent(true);await store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'implicit-order-target',url:'https://chatgpt.com/c/implicit-order-target',title:'SYNTHETIC exact order'},messages:Array.from({length:135},(_,i)=>({sourceMessageId:'implicit-'+i,pageOrder:i+1,originalText:'SYNTHETIC complete original '+i,presence:{version:1,attachment:'absent',reference:'absent',confidence:'verified'}}))});
  let snapshot=await store.snapshot();for(let i=0;i<snapshot.records.length;i++)await store.changeRecord(snapshot.records[i].id,row=>{row.sourceSentAt=new Date(Date.UTC(2021,0,1,0,i)).toISOString();});snapshot=await store.snapshot();const original=snapshot.records.find(row=>row.sourceMessageId==='implicit-110'),target=snapshot.library.blocks.find(row=>row.sourceRecordId===original.id),before=structuredClone(snapshot.records);
  for(const sort of ['asc','desc']){
   await store.repository.transaction(true,t=>t.put('meta',{id:'organizer-controls',inputReadingSort:sort}));
   const options={documentId:target.documentId,contextInputId:target.id,sort:null,yearReading:{},qualifyContext:true,limit:40},actual=await store.page(options),explicit=await store.page({...options,sort});
   assert.equal(actual.readingSort,sort);assert.equal(actual.contextUnavailable,false);assert.ok(actual.pageItemIds.includes(target.id),'a qualified target must occur in its own implicit '+sort+' page');assert.deepEqual(actual.pageItemIds,explicit.pageItemIds,'seek and page traversal honor the same effective order');assert.equal(actual.contextInputRevision,0);
  }
  assert.deepEqual((await store.snapshot()).records,before);
 }finally{await store.repository.close();}
});
