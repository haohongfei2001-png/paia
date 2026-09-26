import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {refreshEntryIndex} from '../core/thought-model.js';
import {invalidateThoughtTopicIndex,THOUGHT_TOPIC_BUILD_BATCH} from '../core/thought-read-index.js';
import {importedTimeChanged} from '../core/import/library-integration.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator} from '../core/import/coordinator.js';
import {getOfficialExportAdapter} from '../core/import/registry.js';
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
 const enriched=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',timeEdge:'unknown'});
 assert.equal(enriched.coverage.unknownTimeCount,2);
 assert.equal(enriched.items.some(item=>item.entry.id===unknownIds[1]),false,'real time enrichment returns the entry to its dated section without content edits');
 for(const options of [{timeEdge:'unknown',query:'entry'},{timeEdge:'unknown',anchorId:f.seedId},{timeEdge:'unknown',direction:'prev'}])await assert.rejects(()=>f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',...options}));
});

test('VS-05 unknown-group request remains honest when every record is dated',async()=>{
 const f=await largeTopicFixture(8,2),page=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',timeEdge:'unknown'});
 assert.equal(page.timeEdgeUnavailable,true);assert.equal(page.coverage.unknownTimeCount,0);
 assert.ok(page.items.every(item=>item.entry.timeBasis==='created'));
});

test('VS-05 on-demand provenance distinguishes direct sources from context and fences purged links',async()=>{
 const f=await completeFixture({texts:['VS05 primary expression','VS05 supporting expression','VS05 contextual expression']});
 const blocks=(await rows(f.s,'blocks')).map(x=>x.value);
 const byText=await f.s.run(()=>f.s.repository.transaction(false,async t=>{
  const out={};for(const block of blocks){const record=await t.get('records',block.originalTextReference);out[record.value.originalText]=block.id;}return out;
 }));
 const specs=[['VS05 primary expression','primary'],['VS05 supporting expression','supporting'],['VS05 contextual expression','context_only']].map(([text,role])=>({inputId:byText[text],role,selectedFields:['body']}));
 const evidence=await f.s.evidenceFor(specs),entry=await f.s.createEntry({operationId:op(),actor:'user',body:'VS05 independent synthesis',type:'idea',formation:'synthesized',evidence});
 const before=await f.s.entry(entry.id),provenance=await f.s.libraryProvenance(entry.id);
 assert.equal(provenance.count,3);assert.equal(provenance.primary,1);assert.equal(provenance.supporting,1);assert.equal(provenance.contextOnly,1);
 assert.deepEqual(new Set(provenance.items.map(x=>x.role)),new Set(['primary','supporting','context_only']));
 assert.ok(provenance.items.every(x=>x.availability==='resolvable'&&x.inputId));
 assert.equal((await f.s.entry(entry.id)).body,before.body);assert.equal((await f.s.entry(entry.id)).revision,before.revision);
 await f.s.foundationWrite(async t=>{const state=await t.get('inputStates',byText['VS05 contextual expression']);state.sourcePurged=true;await t.put('inputStates',state);});
 const after=await f.s.libraryProvenance(entry.id),context=after.items.find(x=>x.role==='context_only');
 assert.equal(after.contextOnly,1,'historical role remains distinct from current availability');
 assert.equal(context.availability,'unavailable');assert.equal(context.inputId,null,'a purged context can never offer a source-opening action');
 assert.ok(after.items.filter(x=>x.role!=='context_only').every(x=>x.inputId&&x.availability==='resolvable'));
 const standalone=await f.s.continueThinking({operationId:op(),body:'VS05 independent new expression'});
 const own=await f.s.libraryProvenance(standalone.id);assert.equal(own.userCreated,true);assert.equal(own.count,0);assert.equal(own.contextOnly,0);
});

async function mixedProviderTopic(){
 const f=await completeFixture({texts:['VS05 scope shared ChatGPT']});
 const ledger=new ImportLedger(f.s),coordinator=new ImportCoordinator({transport:(method,query)=>ledger[method](query,'vs05-topic-scope'),resolveAdapter:getOfficialExportAdapter});
 const data=[{uuid:'vs05-scope-claude',name:'VS05 scope shared Claude',current_leaf_message_uuid:'vs05-scope-answer',chat_messages:[
  {uuid:'vs05-scope-human',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'VS05 scope shared Claude'}]},
  {uuid:'vs05-scope-answer',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'vs05-scope-human',content:[{type:'text',text:'Synthetic assistant excluded'}]}
 ]}];
 await coordinator.select(new Blob([JSON.stringify(data)]),{consent:true});await coordinator.preflight();await coordinator.commit();await f.s.finishFoundation();
 const inputIds=await f.s.run(()=>f.s.repository.transaction(false,async t=>{
  const ids={};for(const row of await t.all('blocks')){const r=await t.get('records',row.value.originalTextReference);if(r)ids[r.value.platform]=row.value.id;}return ids;
 }));
 const topic=await f.s.createTopic({name:'VS05 mixed provider topic',operationId:op()}),entries={};
 async function add(name,specs,hooks={}){
  const evidence=await f.s.evidenceFor(specs,hooks),entry=await f.s.createEntry({operationId:op(),actor:'user',body:'VS05 scope shared '+name,type:'idea',formation:specs.length>1?'synthesized':'explicit',evidence},hooks),live=await f.s.topic(topic.id);
  const placed=await f.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:live.organizationRevision,operationId:op()});assert.equal(placed.conflict,undefined);entries[name]=entry.id;
 }
 const spec=(provider,role='primary')=>({inputId:inputIds[provider],role,selectedFields:['body']});
 await add('chatgpt',[spec('chatgpt')]);await add('claude',[spec('claude')]);await add('mixed',[spec('chatgpt'),spec('claude','supporting')]);
 await add('context',[spec('chatgpt','context_only')],{independentContext:true});
 for(let i=0;i<90;i++){const entry=await f.s.continueThinking({operationId:op(),topicId:topic.id,body:'VS05 scope shared independent '+i});entries['independent'+i]=entry.id;}
 return {...f,topic,entries,inputIds};
}
async function scopedTopicIds(f,providerKey,query='',sort='asc'){
 let cursor=null,ids=[],pages=0;
 do{
  const page=await f.s.topicDocumentPage({topicId:f.topic.id,sort,providerKey,query,cursor,limit:40});
  assert.equal(page.cursorInvalid,undefined);assert.ok(page.operations.descriptorRowsRead<=40);
  if(providerKey!==null)assert.equal(page.matchCount,null,'global Topic count is never presented as a selected-source count');
  ids.push(...page.items.map(x=>x.entry.id));cursor=page.nextCursor;assert.ok(++pages<30);
 }while(cursor);
 assert.equal(new Set(ids).size,ids.length);return ids;
}
test('VS-05 source-filtered Topic keeps mixed identity, independent originals and bounded empty-page continuation',async()=>{
 const f=await mixedProviderTopic(),before=new Map();
 for(const id of Object.values(f.entries))before.set(id,await f.s.entry(id));
 const chatgpt=new Set([f.entries.chatgpt,f.entries.mixed]),claude=new Set([f.entries.claude,f.entries.mixed]);
 for(const sort of ['asc','desc']){
  assert.deepEqual(new Set(await scopedTopicIds(f,'chatgpt','',sort)),chatgpt);
  assert.deepEqual(new Set(await scopedTopicIds(f,'claude','scope shared',sort)),claude);
 }
 assert.equal((await scopedTopicIds(f,null)).length,94);
 const first=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',providerKey:'chatgpt',limit:40});
 assert.ok(first.nextCursor);assert.equal(first.nextCursor.providerKey,'chatgpt');
 assert.equal((await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',providerKey:'claude',cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',cursor:first.nextCursor})).cursorInvalid,true);
 const warm=await f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',providerKey:'chatgpt',cursor:first.nextCursor});
 assert.equal(warm.operations.buildRowsScanned,0);assert.ok(warm.operations.descriptorRowsRead<=40);
 assert.deepEqual(await scopedTopicIds(f,'unavailable.provider'),[]);
 await assert.rejects(()=>f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',providerKey:'../../other'}),{code:'INVALID_REQUEST'});
 await assert.rejects(()=>f.s.topicDocumentPage({topicId:f.topic.id,sort:'asc',providerKey:'chatgpt',timeEdge:'latest'}));
 for(const [id,entry]of before){const after=await f.s.entry(id);assert.equal(after.body,entry.body);assert.equal(after.revision,entry.revision);}
});
test('VS-05 current source scope rejects removed epochs and purged Input states without resurrecting evidence',async()=>{
 const f=await mixedProviderTopic();
 await scopedTopicIds(f,'claude');
 await f.s.foundationWrite(async t=>{const input=await t.get('inputStates',f.inputIds.claude);input.sourcePurged=true;await t.put('inputStates',input);});
 assert.deepEqual(await scopedTopicIds(f,'claude'),[]);
 assert.deepEqual(new Set(await scopedTopicIds(f,'chatgpt')),new Set([f.entries.chatgpt,f.entries.mixed]));
 await f.s.foundationWrite(async t=>{const input=await t.get('inputStates',f.inputIds.chatgpt);input.lastRemovalSequence=(input.lastRemovalSequence||0)+100000;await t.put('inputStates',input);});
 assert.deepEqual(await scopedTopicIds(f,'chatgpt'),[]);
 assert.equal((await f.s.entry(f.entries.mixed)).body,'VS05 scope shared mixed','source filtering does not rewrite the protected human synthesis');
});

async function sourceRootItems(f,providerKey,query=''){
 let cursor=null,items=[],pages=[],complete=false;
 for(let i=0;i<200&&!complete;i++){
  const page=await f.s.libraryIndexPage({mode:'stable',providerKey,query,cursor,limit:40});
  assert.equal(page.cursorInvalid,undefined);assert.ok(page.operations.placementRowsRead<=40);
  assert.ok(page.operations.entryRowsRead<=40);
  items.push(...page.items);pages.push(page);cursor=page.nextCursor;complete=page.complete;
  if(!cursor&&!complete)await f.s.processLibraryMaintenance();
 }
 assert.ok(complete,'source root reaches a real terminal page');
 const ids=items.map(x=>x.entryId||x.topicId||x.id);assert.equal(new Set(ids).size,ids.length);
 return {items,pages};
}
async function placeExisting(s,topicId,entryId){
 const entry=await s.entry(entryId),topic=await s.topic(topicId);
 const result=await s.placeEntry({topicId,entryId,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,operationId:op()});
 assert.equal(result.conflict,undefined);
}
test('VS-05 root source scope traverses distant placements, keeps one Topic identity and fences query/provider cursors',async()=>{
 const f=await mixedProviderTopic(),before=await f.s.entry(f.entries.mixed);
 const independent=await f.s.createTopic({name:'VS05 independent-only topic',operationId:op()});
 await placeExisting(f.s,independent.id,f.entries.independent0);
 const context=await f.s.createTopic({name:'VS05 context-only topic',operationId:op()});
 await placeExisting(f.s,context.id,f.entries.context);
 const far=await f.s.createTopic({name:'VS05 distant direct evidence',operationId:op()});
 for(let i=0;i<90;i++)await placeExisting(f.s,far.id,f.entries['independent'+i]);
 await placeExisting(f.s,far.id,f.entries.claude);
 // A misleading historical Topic source list is never sufficient membership.
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',context.id),source=await t.get('thoughts',f.entries.claude);row.sourceRecordIds=source.sourceRecordIds;await t.put('topics',row);});
 const result=await sourceRootItems(f,'claude');
 assert.deepEqual(new Set(result.items.map(x=>x.id)),new Set([f.topic.id,far.id]));
 assert.ok(result.pages.some(x=>!x.items.length&&x.nextCursor?.pending?.topicId===far.id),'large nonmatching prefix continues without reading all Thought bodies');
 for(const item of result.items){assert.equal(item.countComplete,false);assert.equal(item.visibleEntryCount,null);}
 const first=result.pages.find(x=>x.nextCursor);
 assert.equal((await f.s.libraryIndexPage({mode:'stable',providerKey:'chatgpt',cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await f.s.libraryIndexPage({mode:'stable',providerKey:'claude',query:'another',cursor:first.nextCursor})).cursorInvalid,true);
 assert.deepEqual((await sourceRootItems(f,'unavailable.provider')).items,[]);
 await assert.rejects(()=>f.s.libraryIndexPage({mode:'stable',providerKey:'../wrong'}),{code:'INVALID_REQUEST'});
 const pending=result.pages.find(x=>x.nextCursor?.pending?.topicId===far.id)?.nextCursor;assert.ok(pending);
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',far.id);row.organizationRevision++;await t.put('topics',row);});
 assert.equal((await f.s.libraryIndexPage({mode:'stable',providerKey:'claude',cursor:pending})).cursorInvalid,true);
 const after=await f.s.entry(f.entries.mixed);assert.equal(after.body,before.body);assert.equal(after.revision,before.revision);
});
test('VS-05 root lexical search and live source removal exclude independent/context-only content without a scope cache',async()=>{
 const f=await mixedProviderTopic();for(let i=0;i<1000;i++){const p=await f.s.processLibraryMaintenance();if(!p.pending)break;if(i===999)assert.fail('search maintenance failed to settle');}
 const result=await sourceRootItems(f,'claude','scope shared');
 assert.deepEqual(new Set(result.items.filter(x=>x.kind==='entry').map(x=>x.entryId)),new Set([f.entries.claude,f.entries.mixed]));
 const topicResult=await sourceRootItems(f,'claude','mixed provider');
 assert.deepEqual(topicResult.items.filter(x=>x.kind==='topic').map(x=>x.topicId),[f.topic.id]);
 await f.s.foundationWrite(async t=>{const input=await t.get('inputStates',f.inputIds.claude);input.sourcePurged=true;await t.put('inputStates',input);});
 assert.deepEqual((await sourceRootItems(f,'claude')).items,[]);
 assert.deepEqual((await sourceRootItems(f,'claude','scope shared')).items,[]);
 assert.deepEqual((await sourceRootItems(f,'chatgpt')).items.map(x=>x.id),[f.topic.id]);
 await f.s.foundationWrite(async t=>{const input=await t.get('inputStates',f.inputIds.chatgpt);input.lastRemovalSequence=(input.lastRemovalSequence||0)+100000;await t.put('inputStates',input);});
 assert.deepEqual((await sourceRootItems(f,'chatgpt')).items,[]);
 assert.equal((await f.s.entry(f.entries.mixed)).body,'VS05 scope shared mixed');
});
