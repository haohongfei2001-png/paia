import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {refreshEntryIndex} from '../core/thought-model.js';
import {invalidateThoughtTopicIndex,THOUGHT_TOPIC_BUILD_BATCH} from '../core/thought-read-index.js';
import {importedTimeChanged} from '../core/import/library-integration.js';

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
