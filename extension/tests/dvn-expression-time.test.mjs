import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {expressionTime,expressionInstant} from '../core/organizer/expression-time.js';
import {exactExcerpt} from '../core/organizer/topic-excerpt.js';
import {topicRootCaption} from '../ui/topic-root.js';
import {ContinuousCollection} from '../ui/continuous-collection.js';
import {TopicController as ThoughtWorkspace} from '../ui/topic-workspace.js';

const op=()=>crypto.randomUUID();
const time=(s,id)=>s.repository.transaction(false,async t=>expressionTime(s,t,await t.get('thoughts',id)));
test('D2 expression dates require a valid calendar and explicit timezone',()=>{
 for(const value of ['2023-02-29T00:00:00Z','2024-02-30T00:00:00Z','2023-01-01T00:00:00','2023-13-01T00:00:00Z','2023-01-01T24:00:00Z'])assert.equal(expressionInstant(value),null,value);
 assert.equal(expressionInstant('2024-02-29T08:00:00+08:00'),'2024-02-29T00:00:00.000Z');
});
test('D2 committed independent expression time is receipt-bound, idempotent, and not inherited by excerpts',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC time',operationId:op()}),request={operationId:op(),body:'SYNTHETIC independent expression',topicId:topic.id};
 const first=await s.continueThinking(request),again=await s.continueThinking(request);
 assert.deepEqual(again,first);assert.equal(first.independentExpression.kind,'committed_human_expression');
 assert.equal((await time(s,first.id)).basis,'independent_creation');
 const original=await s.entry(first.id),copy=await s.addToTopics({operationId:op(),kind:'thought',id:first.id,expectedRevision:original.revision,span:{start:0,end:9},topicIds:[topic.id]});
 assert.equal((await s.entry(copy.id)).provenanceType,'user_created');assert.equal((await time(s,copy.id)).basis,'unknown');
 const entry=await s.entry(copy.id);await s.editLibraryFields({operationId:op(),id:copy.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{body:'SYNTHETIC changed excerpt'}});
 assert.equal((await time(s,copy.id)).basis,'unknown','editing a copy does not convert its capture/creation time into original expression time');
 await assert.rejects(()=>s.continueThinking({operationId:op(),body:'  '}));
 assert.equal((await rows(s,'thoughts')).length,2);
});
test('D2 capture time is never an expression year; exact source time is and missing evidence fails closed',async()=>{
 const {s}=await completeFixture({texts:['SYNTHETIC original dated text']}),topic=await s.createTopic({name:'SYNTHETIC source time',operationId:op()}),block=(await rows(s,'blocks'))[0].value;
 const added=await s.addToTopics({operationId:op(),kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id]});
 assert.equal((await time(s,added.id)).year,null);
 await s.foundationWrite(async t=>{for(const record of await t.all('records')){record.value.sourceSentAt='2023-04-05T12:00:00.000Z';await t.put('records',record);}});
 assert.deepEqual(await time(s,added.id),{at:'2023-04-05T12:00:00.000Z',year:2023,basis:'source'});
 await s.foundationWrite(async t=>{const row=await t.get('thoughts',added.id);row.provenanceType='input_derived';await t.put('thoughts',row);});
 assert.equal((await time(s,added.id)).year,null,'an AI-derived statement is not a dated original just because it references one');
});
test('D2 ambiguous legacy user-created rows and mismatched receipt dates remain unknown',async()=>{
 const {s}=await completeFixture({texts:[]}),added=await s.continueThinking({operationId:op(),body:'SYNTHETIC dated independent thought'});
 await s.foundationWrite(async t=>{const row=await t.get('thoughts',added.id);row.createdAt='2001-01-01T00:00:00.000Z';await t.put('thoughts',row);});
 assert.equal((await time(s,added.id)).year,null);
 await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===added.id)await t.delete('operationReceipts',receipt.id);});
 assert.equal((await time(s,added.id)).year,null);
});

test('D2 one-generation timeline covers159 dated plus1unknown with true uneven years and complete year pages',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC159+1',operationId:op()}),ids=[];
 for(let i=0;i<160;i++){
  s.clock=()=>new Date(Date.UTC(i<100?2021:2023,0,1)+i*1000).toISOString();
  ids.push((await s.continueThinking({operationId:op(),body:'SYNTHETIC exact expression '+i+' 👩‍💻 é',topicId:topic.id})).id);
 }
 await s.foundationWrite(async t=>{const last=ids.at(-1);for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===last){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
 const first=await s.topicTimelinePage({topicId:topic.id});
 assert.deepEqual(first.overview.knownYearCounts,{'2021':100,'2023':59});assert.equal(first.overview.unknownCount,1);assert.equal(first.overview.total,160);
 assert.deepEqual(first.overview.observedInterval,{from:2021,to:2023});assert.equal(first.overview.coverage,'complete');
 const seen=[...first.items.map(x=>x.entry.id)];let cursor=first.nextCursor;
 while(cursor){const p=await s.topicTimelinePage({topicId:topic.id,cursor});assert.ok(p.items.length<=40);assert.equal(p.operations.buildRowsScanned,0);seen.push(...p.items.map(x=>x.entry.id));cursor=p.nextCursor;}
 assert.deepEqual(seen,ids);assert.equal(new Set(seen).size,160);
 const yearIds=[];cursor=null;do{const p=await s.topicTimelinePage({topicId:topic.id,year:2023,cursor});yearIds.push(...p.items.map(x=>x.entry.id));cursor=p.nextCursor;}while(cursor);
 assert.deepEqual(yearIds,ids.slice(100,159));
 const empty=await s.topicTimelinePage({topicId:topic.id,year:2022});assert.deepEqual(empty.items,[]);assert.equal(empty.complete,true);assert.equal(empty.overview.knownYearCounts[2022],undefined,'no fabricated empty-year record');
 const unknown=await s.topicTimelinePage({topicId:topic.id,year:'unknown'});assert.deepEqual(unknown.items.map(x=>x.entry.id),[ids.at(-1)]);
 const reversed=await s.topicTimelinePage({topicId:topic.id,sort:'desc',year:2021});assert.equal(reversed.items[0].entry.id,ids[99]);
 const entry=await s.entry(ids[0]);await s.editLibraryFields({operationId:op(),id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{note:'SYNTHETIC changed note'}});
 assert.equal((await s.topicTimelinePage({topicId:topic.id,cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await s.topicTimelinePage({topicId:topic.id,expectedReadGeneration:first.overview.generation})).cursorInvalid,true);
});
test('D2 pre-1970 expressions retain actual within-year ascending and descending order',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC historical order',operationId:op()}),dated=[];
 for(const at of ['1965-12-31T23:00:00.000Z','1965-01-01T01:00:00.000Z','1965-06-01T12:00:00.000Z']){s.clock=()=>at;dated.push({at,id:(await s.continueThinking({operationId:op(),body:'SYNTHETIC historical '+at,topicId:topic.id})).id});}
 const expected=[...dated].sort((a,b)=>a.at.localeCompare(b.at)).map(x=>x.id);
 assert.deepEqual((await s.topicTimelinePage({topicId:topic.id,year:1965})).items.map(x=>x.entry.id),expected);
 assert.deepEqual((await s.topicTimelinePage({topicId:topic.id,year:1965,sort:'desc'})).items.map(x=>x.entry.id),expected.reverse());
});
test('D2 root cue is an exact Unicode substring with attribution and no generated-summary fallback',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC root quote',operationId:op()}),body='  '+('原'.repeat(135))+'👩‍💻 é 不确定。';
 const added=await s.continueThinking({operationId:op(),body,topicId:topic.id});
 await s.foundationWrite(async t=>{const row=await t.get('topics',topic.id);row.summary='SYNTHETIC MACHINE SUMMARY MUST NOT BECOME ROOT QUOTE';await t.put('topics',row);});
 const root=await s.libraryIndexPage({mode:'stable'}),cue=root.items[0].rootCue;
 assert.equal(cue.entryId,added.id);assert.equal(cue.text,body.slice(cue.range.start,cue.range.end));assert.equal(cue.text,'  '+('原'.repeat(135)));assert.equal(cue.truncated,true);
 assert.equal(exactExcerpt('👩‍💻 é',6).text,'👩‍💻 ');
 assert.doesNotMatch(topicRootCaption(root.items[0],'en'),/[\u4e00-\u9fff]/);assert.match(topicRootCaption(root.items[0],'en'),/Thought excerpt/);
 await s.topicTimelinePage({topicId:topic.id});
 for(const row of await rows(s,'libraryMigrationItems')){assert.equal(row.thoughtText,undefined);assert.equal(row.body,undefined);assert.ok(!JSON.stringify(row).includes('不确定。'),'projection is metadata-only');}
 const current=await s.topic(topic.id);await s.editTopic({id:topic.id,operationId:op(),expectedRevision:current.revision,changes:{summary:'SYNTHETIC human cue'}});
 assert.equal((await s.libraryIndexPage({mode:'stable'})).items[0].rootCue.kind,'human_cue');
});
test('D2 provider-scoped year counts exclude independent/context-only material and removed source evidence',async()=>{
 const {s}=await completeFixture({texts:['SYNTHETIC source-scoped original']}),topic=await s.createTopic({name:'SYNTHETIC scoped years',operationId:op()}),block=(await rows(s,'blocks'))[0].value;
 const added=await s.addToTopics({operationId:op(),kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id]});
 await s.continueThinking({operationId:op(),body:'SYNTHETIC independent, source only background',inputId:block.id,topicId:topic.id});
 const scoped=await s.topicTimelinePage({topicId:topic.id,providerKey:'chatgpt'});
 assert.equal(scoped.overview.total,1);assert.deepEqual(scoped.items.map(x=>x.entry.id),[added.id]);
 await s.foundationWrite(async t=>{const input=await t.get('inputStates',block.id);input.removalState='removed';await t.put('inputStates',input);});
 assert.equal((await time(s,added.id)).basis,'unknown');
 const root=await s.libraryIndexPage({mode:'stable',providerKey:'chatgpt'});assert.equal(root.items.length,0);
});
test('D2 fresh root excerpt response contains no source canary after real admitted purge',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC_ROOT_PURGE_CANARY 原始表达']});await f.runner.wake();
 const before=await f.s.libraryIndexPage({mode:'stable'});assert.ok(JSON.stringify(before.items).includes('SYNTHETIC_ROOT_PURGE_CANARY'));
 const record=(await rows(f.s,'records'))[0];await f.s.purge(record.id,true);await f.s.drainPurgeCleanup();
 const after=await f.s.libraryIndexPage({mode:'stable'});assert.ok(!JSON.stringify(after).includes('SYNTHETIC_ROOT_PURGE_CANARY'));
});
test('D2 actual root invalidation clears visible and cached cues and rejects a held production collection result',async()=>{
 let finish;const collection=new ContinuousCollection({scope:'root',query:'',load:()=>new Promise(resolve=>{finish=resolve;})});
 const pending=collection.loadNext(),nodes=[{textContent:'SYNTHETIC_ROOT_STALE_CANARY'},{textContent:'old attribution'}],saved={collection:{items:[{rootCue:{text:'SYNTHETIC_ROOT_STALE_CANARY'}}]}};
 const sentinel={},unplaced={hidden:true,children:[{textContent:'SYNTHETIC_UNPLACED_STALE_CANARY'}],replaceChildren(...children){this.children=children;}};
 const elements={'thought-list':{children:[],querySelectorAll:()=>nodes},'library-unplaced-list':unplaced,'unplaced-continuous-sentinel':sentinel};
 const workspace=Object.assign(Object.create(ThoughtWorkspace.prototype),{homePositions:new Map([['home',saved]]),homeCollection:collection,homePage:{page:{items:[{rootCue:{text:'SYNTHETIC_ROOT_STALE_CANARY'}}]}},unplacedCollection:{items:[{body:'SYNTHETIC_UNPLACED_STALE_CANARY'}]},homeDesiredCount:40,thoughtRootVisible:()=>true,captureHomeAnchor:()=>({id:'topic',top:140})});
 const prior=globalThis.document;globalThis.document={getElementById:id=>{assert.ok(Object.hasOwn(elements,id),'expected root invalidation element '+id);return elements[id];}};
 try{
  workspace.invalidateHomeSnapshot();assert.equal(workspace.homeCollection,null);assert.equal(workspace.homePage,null);assert.equal(saved.collection,undefined);assert.equal(workspace.rootCueEpoch,1);assert.ok(nodes.every(node=>node.textContent===''));
  assert.equal(workspace.unplacedCollection,null);assert.deepEqual(unplaced.children,[sentinel],'hidden unplaced excerpts clear along with the visible root');
  finish({items:[{id:'old',rootCue:{text:'SYNTHETIC_ROOT_STALE_CANARY'}}],complete:true});assert.equal((await pending).stale,true);assert.deepEqual(collection.items,[]);
 }finally{globalThis.document=prior;}
});
