import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {refreshEntryIndex} from '../core/thought-model.js';
import {invalidateThoughtTopicIndex,THOUGHT_TOPIC_BUILD_BATCH} from '../core/thought-read-index.js';
import {importedTimeChanged} from '../core/import/library-integration.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';

const op=()=>crypto.randomUUID();
const pad=n=>String(n).padStart(4,'0');
const rank=n=>String(n*1024).padStart(12,'0');

async function largeTopicFixture(count=520,sectionCount=120){
 const f=await completeFixture({texts:[]}),topic=await f.s.createTopic({name:'ANS08 large topic',operationId:op()}),seed=await f.s.continueThinking({operationId:op(),body:'ANS08 entry 0000',topicId:topic.id});
 await f.s.foundationWrite(async t=>{
  const live=await t.get('topics',topic.id),template=await t.get('thoughts',seed.id),seedPlacement=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,seed.id])),defaultSection=await t.get('sections',JSON.stringify([topic.id,live.activeLayoutGeneration,live.defaultSectionId]));
  const sectionIds=[live.defaultSectionId];
  defaultSection.rank=rank(1);await t.put('sections',defaultSection);
  for(let i=1;i<sectionCount;i++){
   const sectionId='ans08-section-'+pad(i);sectionIds.push(sectionId);
   await t.put('sections',{...structuredClone(defaultSection),id:JSON.stringify([topic.id,live.activeLayoutGeneration,sectionId]),sectionId,isDefault:false,title:'ANS08 section '+pad(i),rank:rank(i+1),revision:0});
  }
  for(let i=0;i<count;i++){
   const id=i===0?seed.id:'ans08-entry-'+pad(i),sectionIndex=i%sectionCount,sectionId=sectionIds[sectionIndex],at=new Date(Date.UTC(2026,0,1)+i*1000).toISOString();
   const row=i===0?template:{...structuredClone(template),id};
   row.thoughtText='ANS08 entry '+pad(i);row.title='';row.createdAt=at;row.updatedAt=at;row.createdSequence=(template.createdSequence||1)+i;row.updatedSequence=(template.updatedSequence||1)+i;row.sourceRecordIds=[];row.provenanceType='user_created';refreshEntryIndex(row);await t.put('thoughts',row);
   const placement={...structuredClone(seedPlacement),id:JSON.stringify([topic.id,live.activeLayoutGeneration,id]),entryId:id,sectionId,sectionRank:rank(sectionIndex+1),rank:rank(Math.floor(i/sectionCount)+1),revision:0,lifecycle:'active',activeKey:0};
   await t.put('placements',placement);
  }
  live.organizationRevision++;live.countVersion=(live.countVersion||0)+1;await t.put('topics',live);
 });
 return {...f,topic:await f.s.topic(topic.id),seedId:seed.id};
}
async function collect(s,topicId,sort='asc'){
 let cursor=null,ids=[],maxBatch=0,buildRows=0,pages=0;
 do{
  const page=await s.topicDocumentPage({topicId,sort,cursor,limit:40});assert.equal(page.cursorInvalid,undefined);assert.equal(page.indexing,undefined);ids.push(...page.items.map(x=>x.entry.id));cursor=page.nextCursor;pages++;
  maxBatch=Math.max(maxBatch,page.operations?.maxBuildBatch||0);buildRows+=page.operations?.buildRowsScanned||0;
  assert.ok(page.items.length<=40);assert.ok(pages<100);
 }while(cursor);
 return {ids,pages,maxBatch,buildRows};
}

test('ANS-08 topic descriptor projection traverses 520 entries and 120 sections without warm full rescans',async()=>{
 const f=await largeTopicFixture();
 const first=await collect(f.s,f.topic.id,'asc');
 assert.equal(first.ids.length,520);assert.equal(new Set(first.ids).size,520);assert.ok(first.pages>=13);assert.ok(first.maxBatch<=THOUGHT_TOPIC_BUILD_BATCH);assert.ok(first.buildRows>=520);
 const warm1=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',limit:40}),warm2=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor:warm1.nextCursor,limit:40});
 assert.equal(warm1.operations.buildRowsScanned,0);assert.equal(warm2.operations.buildRowsScanned,0);assert.ok(warm1.operations.descriptorRowsRead<=40);assert.ok(warm2.operations.descriptorRowsRead<=40);
 let sectionCursor=null,sections=[];do{const p=await f.s.topicSectionsPage({topicId:f.topic.id,cursor:sectionCursor,limit:100});sections.push(...p.items);sectionCursor=p.nextCursor;}while(sectionCursor);
 assert.equal(sections.length,120);assert.equal(new Set(sections.map(x=>x.sectionId)).size,120);
 const middle=first.ids[260],anchor=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',anchorId:middle,limit:40});assert.equal(anchor.items[0].entry.id,middle);assert.ok(anchor.previousCursor);
 const before=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor:anchor.previousCursor,limit:40,direction:'prev'});assert.ok(before.items.length);assert.equal(before.items.at(-1).entry.id,first.ids[259]);
});

test('ANS-08 mutation and source-time invalidation fence old cursors without changing body truth',async()=>{
 const f=await largeTopicFixture(90,8),page=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',limit:40}),oldCursor=page.nextCursor,target=page.items[5].entry;
 await f.s.editLibraryFields({id:target.id,operationId:op(),expectedRevision:target.revision,expectedFieldRevisions:target.fieldRevisions,changes:{note:'ANS08 edited note'}});
 const stale=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor:oldCursor,limit:40});assert.equal(stale.cursorInvalid,true);assert.equal((await f.s.entry(target.id)).note,'ANS08 edited note');
 const rebuilt=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',anchorId:target.id,limit:40});assert.equal(rebuilt.items[0].entry.id,target.id);const cursor=rebuilt.nextCursor;
 await f.s.foundationWrite(t=>invalidateThoughtTopicIndex(f.s,t,f.topic.id,{sourceTime:true}));
 const timeStale=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor,limit:40});assert.equal(timeStale.cursorInvalid,true);
});

test('ANS-08 sourceSentAt remains distinct from capture fallback and late enrichment invalidates the projection',async()=>{
 const f=await completeFixture({texts:['ANS08 source-time input']}),block=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'ANS08 time topic',operationId:op()}),added=await f.s.addToTopics({id:block.id,kind:'input',expectedRevision:block.revision,operationId:op(),topicIds:[topic.id]});
 let page=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',limit:40}),entry=page.items.find(x=>x.entry.id===added.id)?.entry;
 assert.equal(entry.sourceSentAt,null);assert.equal(entry.timeBasis,'capture');assert.ok(entry.capturedAt);
 const cursor=page.nextCursor;
 await f.s.foundationWrite(async t=>{const provenance=(await t.all('provenance','byOwner',IDBKeyRange.bound(['entry',added.id],['entry',added.id,[]],false,true)))[0],recordId=provenance.sourceRecordIds[0],record=await t.get('records',recordId);record.value.sourceSentAt='2025-12-24T10:00:00.000Z';await t.put('records',record);await importedTimeChanged(f.s,t,recordId);});
 if(cursor){const stale=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',cursor,limit:40});assert.equal(stale.cursorInvalid,true);}
 page=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',anchorId:added.id,limit:40});entry=page.items[0].entry;
 assert.equal(entry.sourceSentAt,'2025-12-24T10:00:00.000Z');assert.equal(entry.timeBasis,'source');assert.notEqual(entry.sourceSentAt,entry.capturedAt);
});


test('ANS-08 ContinuousTopicReader keeps opposite cursors, windows 3x40 rows and preserves pins',async()=>{
 const source=Array.from({length:200},(_,i)=>({entry:{id:'reader-'+pad(i)},placement:{sectionId:'s'}}));
 const index=id=>source.findIndex(x=>x.entry.id===id);
 const load=async({cursor,direction,anchorId})=>{
  if(anchorId){const start=index(anchorId),end=Math.min(source.length,start+40);return {items:source.slice(start,end),previousCursor:start?{at:start}:null,nextCursor:end<source.length?{at:end}:null,topic:{id:'topic'},sections:[]};}
  if(direction==='prev'){const end=cursor?.at??0,start=Math.max(0,end-40);return {items:source.slice(start,end),previousCursor:start?{at:start}:null,nextCursor:end<source.length?{at:end}:null,topic:{id:'topic'},sections:[]};}
  const start=cursor?.at??0,end=Math.min(source.length,start+40);return {items:source.slice(start,end),previousCursor:start?{at:start}:null,nextCursor:end<source.length?{at:end}:null,topic:{id:'topic'},sections:[]};
 };
 const reader=new ContinuousTopicReader({load});reader.reset({topicId:'topic',sort:'asc',anchorId:'reader-0080'});
 await reader.initial();assert.deepEqual(reader.previousCursor,{at:80});assert.deepEqual(reader.nextCursor,{at:120});
 await reader.next();assert.deepEqual(reader.previousCursor,{at:80},'loading next must not lose earliest previous cursor');assert.deepEqual(reader.nextCursor,{at:160});
 await reader.previous();assert.deepEqual(reader.previousCursor,{at:40});assert.deepEqual(reader.nextCursor,{at:160},'loading previous must not lose furthest next cursor');
 await reader.next();assert.deepEqual(reader.nextCursor,null);assert.equal(new Set(reader.items.map(x=>x.entry.id)).size,160);
 const pin=new Set(['reader-0045']),layout=reader.layout(pin),visible=layout.filter(x=>x.kind==='item').map(x=>x.item.entry.id);
 assert.ok(visible.length<=121);assert.ok(visible.includes('reader-0045'));assert.ok(layout.some(x=>x.kind==='spacer'));
 const beforeStart=reader.windowStart;assert.equal(reader.shiftWindow('previous'),true);assert.equal(reader.windowStart,Math.max(0,beforeStart-40));assert.equal(reader.shiftWindow('next'),true);assert.equal(reader.windowStart,beforeStart);
});

test('ANS-08 TopicAIViewSession keeps original and AI anchors independent',()=>{
 const session=new TopicAIViewSession(),topic='topic-session';
 session.remember(topic,'original',{scroll:900,query:'原话',anchor:{id:'entry-120',top:152}});
 session.remember(topic,'ai',{scroll:240,query:'整理'});
 session.setView(topic,'ai');
 assert.deepEqual(session.position(topic,'original').anchor,{id:'entry-120',top:152});
 assert.equal(session.position(topic,'ai').anchor,null);
 const copy=session.position(topic,'original');copy.anchor.top=999;assert.equal(session.position(topic,'original').anchor.top,152);
});

test('ANS-08 reverse payload chunks stay contiguous with large canonical entries',async()=>{
 const f=await largeTopicFixture(8,1);
 await f.s.foundationWrite(async t=>{for(const row of await t.all('thoughts')){row.thoughtText='L'.repeat(80*1024)+' '+row.id;await t.put('thoughts',row);}});
 const ordered=(await collect(f.s,f.topic.id,'asc')).ids,anchorId=ordered[6],anchor=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',anchorId,limit:40});
 assert.equal(anchor.items[0].entry.id,anchorId);assert.ok(anchor.previousCursor);
 const seen=[];let cursor=anchor.previousCursor,guard=0;
 while(cursor){const page=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor,limit:40,direction:'prev'});seen.unshift(...page.items.map(x=>x.entry.id));cursor=page.previousCursor;assert.ok(++guard<10);}
 assert.deepEqual(seen,ordered.slice(0,6));assert.equal(new Set(seen).size,6);
});


test('ANS-08 ContinuousTopicReader crosses empty search chunks without repeating the first cursor',async()=>{
 const calls=[],rows=Array.from({length:120},(_,i)=>({entry:{id:'deep-'+pad(i)}}));
 const load=async({cursor})=>{const start=cursor?.at||0,end=Math.min(rows.length,start+40);calls.push(start);return {items:start<80?[]:rows.slice(start,end),nextCursor:end<rows.length?{at:end}:null,previousCursor:start?{at:start}:null,topic:{id:'deep-topic'},sections:[]};};
 const reader=new ContinuousTopicReader({load,maxEmptyLoads:5});reader.reset({topicId:'deep-topic',sort:'asc',query:'needle'});const state=await reader.initial();
 assert.deepEqual(calls,[0,40,80]);assert.equal(state.items.length,40);assert.equal(state.items[0].entry.id,'deep-0080');assert.equal(state.terminalNext,true);assert.equal(state.terminalPrevious,true);
});


test('VS-05 time edges seek globally across sections using warm body-free descriptors',async()=>{
 const f=await largeTopicFixture(520,120),first=await collect(f.s,f.topic.id,'asc');
 const latest=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'desc',timeEdge:'latest',limit:40});
 assert.equal(latest.items[0].entry.id,'ans08-entry-0519');
 assert.equal(latest.items[0].entry.createdAt,'2026-01-01T00:08:39.000Z');
 assert.equal(latest.items[0].entry.timeBasis,'created');
 assert.equal(latest.operations.buildRowsScanned,0);
 assert.equal(latest.operations.seekRowsScanned,0);
 assert.ok(latest.operations.descriptorRowsRead<=40);
 const earliest=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',timeEdge:'earliest',limit:40});
 assert.equal(earliest.items[0].entry.id,f.seedId);
 assert.equal(earliest.operations.buildRowsScanned,0);
 assert.equal(earliest.operations.seekRowsScanned,0);
 assert.ok(earliest.operations.descriptorRowsRead<=40);
 const later=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'desc',cursor:latest.previousCursor,direction:'prev',limit:40});
 assert.ok(later.items.length,'a global time jump preserves two-way section reading');
 assert.equal((await f.s.entry('ans08-entry-0519')).body,'ANS08 entry 0519');
 assert.equal(first.ids.length,520,'no chronological jump changes membership');
 for(const options of [
  {timeEdge:'belief'}, {timeEdge:'latest',query:'entry'},
  {timeEdge:'latest',anchorId:f.seedId},
  {timeEdge:'earliest',cursor:latest.previousCursor},
  {timeEdge:'latest',direction:'prev'}
 ])await assert.rejects(()=>f.s.topicDocumentPage({topicId:f.topic.id,sort:'desc',...options}));
});

test('VS-05 time edges rebuild on removal and exclude unknown timestamps',async()=>{
 const f=await largeTopicFixture(90,8);
 await f.s.topicDocumentPage({topicId:f.topic.id,sort:'desc',timeEdge:'latest'});
 await f.s.foundationWrite(async t=>{
  const latest=await t.get('thoughts','ans08-entry-0089');
  latest.lifecycle='removed';refreshEntryIndex(latest);await t.put('thoughts',latest);
  await invalidateThoughtTopicIndex(f.s,t,f.topic.id,{sourceTime:true});
 });
 const next=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'desc',timeEdge:'latest'});
 assert.equal(next.items[0].entry.id,'ans08-entry-0088','removed evidence is not a navigation target');
 const unknown=await largeTopicFixture(1,1);
 await unknown.s.foundationWrite(async t=>{
  const row=await t.get('thoughts',unknown.seedId);
  row.createdAt=null;await t.put('thoughts',row);
  await invalidateThoughtTopicIndex(unknown.s,t,unknown.topic.id,{sourceTime:true});
 });
 const page=await unknown.s.topicDocumentPage({topicId:unknown.topic.id,sort:'asc',timeEdge:'earliest'});
 assert.equal(page.timeEdgeUnavailable,true);
 assert.equal(page.items[0].entry.timeBasis,'unknown');
 assert.equal(page.items[0].entry.effectiveTime,null,'unknown time does not become a date or a belief claim');
});


test('VS-05 unknown time stays a separate trailing reading group in both directions',async()=>{
 const f=await largeTopicFixture(520,120),unknownIds=[f.seedId,'ans08-entry-0017','ans08-entry-0481'],before=new Map();
 await f.s.foundationWrite(async t=>{
  for(let i=0;i<unknownIds.length;i++){
   const row=await t.get('thoughts',unknownIds[i]);before.set(row.id,{body:row.thoughtText,revision:row.revision});
   row.createdAt=i===1?'invalid legacy time':null;await t.put('thoughts',row);
  }
  await invalidateThoughtTopicIndex(f.s,t,f.topic.id,{sourceTime:true});
 });
 for(const sort of ['asc','desc']){
  const ordered=await collect(f.s,f.topic.id,sort);
  assert.equal(ordered.ids.length,520);assert.equal(new Set(ordered.ids).size,520);
  assert.deepEqual(new Set(ordered.ids.slice(-3)),new Set(unknownIds),'undated rows follow every dated section in either direction');
  const unknown=await f.s.topicDocumentPage({topicId:f.topic.id,sort,timeEdge:'unknown',limit:40});
  assert.equal(unknown.coverage.unknownTimeCount,3);
  assert.equal(unknown.operations.buildRowsScanned,0);assert.equal(unknown.operations.seekRowsScanned,0);assert.ok(unknown.operations.descriptorRowsRead<=40);
  assert.deepEqual(unknown.items.map(item=>item.entry.id),ordered.ids.slice(-3));
  assert.ok(unknown.items.every(item=>item.entry.timeBasis==='unknown'&&item.entry.effectiveTime===null));
  assert.ok(unknown.previousCursor,'undated group retains the opposite cursor into dated original records');
  const previous=await f.s.topicDocumentPage({topicId:f.topic.id,sort,cursor:unknown.previousCursor,direction:'prev',limit:40});
  assert.ok(previous.items.length);assert.ok(previous.items.every(item=>item.entry.timeBasis!=='unknown'));
  for(const item of unknown.items){
   assert.equal(item.placement.sectionId,item.entry.id===f.seedId?f.topic.defaultSectionId:'ans08-section-'+pad(Number(item.entry.id.slice(-4))%120));
   const actual=await f.s.entry(item.entry.id);assert.equal(actual.body,before.get(item.entry.id).body);assert.equal(actual.revision,before.get(item.entry.id).revision);
  }
 }
 await f.s.foundationWrite(async t=>{
  const row=await t.get('thoughts',unknownIds[1]);row.createdAt='2026-01-01T00:00:17.000Z';await t.put('thoughts',row);
  await invalidateThoughtTopicIndex(f.s,t,f.topic.id,{sourceTime:true});
 });
 const enriched=await f.s.topicDocumentPage({topicId:f.topic.id,timeEdge:'unknown'});
 assert.equal(enriched.coverage.unknownTimeCount,2);
 assert.equal(enriched.items.some(item=>item.entry.id===unknownIds[1]),false,'real time enrichment returns the entry to its dated section without content edits');
 for(const options of [{timeEdge:'unknown',query:'entry'},{timeEdge:'unknown',anchorId:f.seedId},{timeEdge:'unknown',direction:'prev'}])await assert.rejects(()=>f.s.topicDocumentPage({topicId:f.topic.id,...options}));
});

test('VS-05 unknown-group request remains honest when every record is dated',async()=>{
 const f=await largeTopicFixture(8,2),page=await f.s.topicDocumentPage({topicId:f.topic.id,timeEdge:'unknown'});
 assert.equal(page.timeEdgeUnavailable,true);assert.equal(page.coverage.unknownTimeCount,0);
 assert.ok(page.items.every(item=>item.entry.timeBasis==='created'));
});
