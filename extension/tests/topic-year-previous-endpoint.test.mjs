import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {descriptorReader} from '../core/organizer/topic-reading.js';
import {thoughtTopicExpressionPage} from '../core/thought-read-index.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {completeFixture,rows} from './harness/original-complete.mjs';

const op=()=>crypto.randomUUID();
async function fixture(count=45){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'SYNTHETIC original reverse-year endpoints',operationId:op()}),ids=[];
 for(let n=0;n<count;n++){
  s.clock=()=>new Date(Date.UTC(2026,0,1)+n*1000).toISOString();
  ids.push((await s.continueThinking({topicId:topic.id,body:'SYNTHETIC independent year endpoint '+n,operationId:op()})).id);
 }
 s.clock=()=> '0000-01-01T12:00:00.000Z';
 const zero=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC genuine year zero',operationId:op()});
 s.clock=()=> '2024-01-01T12:00:00.000Z';
 const unknown=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC legacy undated endpoint',operationId:op()});
 await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===unknown.id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
 const read=options=>thoughtTopicExpressionPage(s,{topicId:topic.id,describe:descriptorReader(s),limit:40,...options});
 const service=new ThoughtSectionReading(new ThoughtLibraryReadModel(s));
 return {s,topic,ids,zero,unknown,read,service,close:()=>s.repository.close()};
}

for(const sort of ['asc','desc'])test('explicit '+sort+' year reverse endpoint traverses more than40 real descriptors without crossing a year',async()=>{
 const f=await fixture();try{
  const expected=sort==='asc'?f.ids:[...f.ids].reverse(),parts=[],cursors=new Set();let cursor=null,generation;
  do{
   const page=await f.read({sort,year:2026,direction:'prev',cursor,expectedReadGeneration:generation??null});
   assert.notEqual(page.cursorInvalid,true);assert.notEqual(page.indexing,true);
   generation??=page.coverage.activeGeneration;assert.equal(page.coverage.activeGeneration,generation);
   assert.ok(page.items.length<=40);assert.ok(page.operations.descriptorRowsRead<=40);
   assert.ok(page.items.every(row=>row.expressionTime.year===2026));
   parts.unshift(page.items.map(row=>row.entryId));cursor=page.previousCursor;
   if(cursor){const token=JSON.stringify(cursor);assert.equal(cursors.has(token),false);cursors.add(token);assert.equal(cursor.year,2026);assert.equal(cursor.sort,sort);}
  }while(cursor);
  assert.equal(parts.length,2);const ids=parts.flat();assert.deepEqual(ids,expected);assert.equal(new Set(ids).size,45);
  const global=await f.read({sort,year:null,direction:'prev'});
  assert.deepEqual(global.items,[],'whole-Topic previous without a cursor remains the original empty boundary');
  assert.equal(global.nextCursor,null);assert.equal(global.previousCursor,null);assert.equal(global.operations.descriptorRowsRead,0);
 }finally{await f.close();}
});

test('explicit zero stays an empty exact range while genuinely unqualified dates remain unknown',async()=>{
 const f=await fixture(1);try{
  // The original historical-time owner rejects years below1000. Do not
  // fabricate a qualified year0 merely because the endpoint accepts its range.
  const zero=await f.read({sort:'desc',year:0,direction:'prev'});
  assert.notEqual(zero.cursorInvalid,true);assert.deepEqual(zero.items,[]);assert.equal(zero.previousCursor,null);
  const forward=await f.read({sort:'desc',year:'unknown'}),reverse=await f.read({sort:'desc',year:'unknown',direction:'prev'});
  assert.notEqual(reverse.cursorInvalid,true);assert.deepEqual(reverse.items.map(row=>row.entryId),forward.items.map(row=>row.entryId));
  assert.deepEqual(new Set(reverse.items.map(row=>row.entryId)),new Set([f.zero.id,f.unknown.id]));
  assert.ok(reverse.items.every(row=>row.expressionTime.year===null));assert.equal(reverse.previousCursor,null);
 }finally{await f.close();}
});

test('reverse explicit-year endpoint refuses old generation and a cursor belonging to another year',async()=>{
 const f=await fixture();try{
  const first=await f.read({sort:'asc',year:2026,direction:'prev'});assert.ok(first.previousCursor);
  const wrongYear=await f.read({sort:'asc',year:0,direction:'prev',cursor:first.previousCursor});
  assert.equal(wrongYear.cursorInvalid,true);assert.deepEqual(wrongYear.items,[]);
  const entry=await f.s.entry(f.ids[0]);await f.s.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{body:'SYNTHETIC current human version'},operationId:op()});
  const stale=await f.read({sort:'asc',year:2026,direction:'prev',expectedReadGeneration:first.coverage.activeGeneration});
  assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[]);
  const staleCursor=await f.read({sort:'asc',year:2026,direction:'prev',cursor:first.previousCursor});
  assert.equal(staleCursor.cursorInvalid,true);assert.deepEqual(staleCursor.items,[]);
 }finally{await f.close();}
});

test('actual Source purge cannot be read through the newly reachable reverse-year endpoint',async()=>{
 const canary='SYNTHETIC original Source reverse endpoint canary',f=await completeFixture({texts:[canary]});try{
  const {s}=f,input=(await s.snapshot()).library.blocks[0];
  await s.foundationWrite(async t=>{for(const record of await t.all('records')){record.value.sourceSentAt='2026-12-01T00:00:00.000Z';await t.put('records',record);}});
  assert.equal((await f.runner.wake()).error,undefined);
  const source=(await rows(s,'thoughts')).find(row=>row.sourceRecordIds?.includes(input.sourceRecordId));assert.ok(source);
  const placement=(await rows(s,'placements')).find(row=>row.entryId===source.id);assert.ok(placement);
  s.clock=()=> '2026-01-01T00:00:00.000Z';const human=await s.continueThinking({topicId:placement.topicId,sectionId:placement.sectionId,body:'SYNTHETIC independent human retained',operationId:op()});
  const service=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),options={topicId:placement.topicId,scopeSectionId:placement.sectionId,chronology:'expression',sort:'asc',year:2026,direction:'prev',limit:40};
  const ready=async()=>{let page=await service.page(options);for(let n=0;page.indexing&&page.nextCursor&&n<20;n++)page=await service.page({...options,cursor:page.nextCursor});assert.notEqual(page.indexing,true);return page;};
  const before=await ready();assert.ok(before.items.some(row=>row.entry.id===source.id));assert.match(JSON.stringify(before),new RegExp(canary));
  const original=await s.entry(human.id),preflight=await s.sourcePurgePreflight(input.sourceRecordId);assert.equal(preflight.state,'unambiguous');
  await s.permanentDelete(input.sourceRecordId);
  const stale=await service.page({...options,expectedReadGeneration:before.coverage.activeGeneration});
  assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[],'purge cannot reuse the formerly qualified reverse page');
  const after=await ready();assert.notEqual(after.cursorInvalid,true);assert.equal(after.items.some(row=>row.entry.id===source.id),false);
  assert.doesNotMatch(JSON.stringify(after),new RegExp(canary),'purged original Source text cannot appear in the new response');
  assert.deepEqual(await s.entry(human.id),original,'unrelated independent human content remains unchanged');
 }finally{await f.s.repository.close();}
});
