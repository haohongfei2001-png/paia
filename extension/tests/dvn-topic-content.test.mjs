import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {expressionCaption} from '../ui/topic-expression.js';
const op=()=>crypto.randomUUID();

test('D2 Content uses trusted global chronology across sections and preserves ambiguous legacy in unknown',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC chronological Content',operationId:op()}),ids=[];
 for(const at of ['2023-01-01T00:00:00.000Z','2021-01-01T00:00:00.000Z','2024-01-01T00:00:00.000Z']){s.clock=()=>at;ids.push((await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC exact '+at})).id);}
 const section=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC other section',operationId:op()}),entry=await s.entry(ids[1]);
 await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:section.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===ids[2]){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
 for(const sort of ['asc','desc']){
  const page=await s.topicDocumentPage({topicId:topic.id,sort,chronology:'expression'});
  assert.deepEqual(page.items.map(x=>x.entry.id),sort==='asc'?[ids[1],ids[0],ids[2]]:[ids[0],ids[1],ids[2]]);
  assert.equal(page.items.at(-1).entry.timeBasis,'unknown');assert.equal(page.items.at(-1).entry.effectiveTime,null);assert.equal(page.items.at(-1).entry.body,'SYNTHETIC exact 2024-01-01T00:00:00.000Z');
  assert.equal(page.overview.unknownCount,1);assert.equal(page.chronology,'expression');
  assert.equal(page.items.find(x=>x.entry.id===entry.id).placement.sectionId,section.sectionId);
 }
 assert.equal(expressionCaption({expressionTime:{at:null}},'en'),'Expression time unknown');
 assert.match(expressionCaption({expressionTime:{at:'2021-01-01T23:00:00Z'}},'en'),/2021.*UTC/);
});

test('D2 Content pages both ways, seeks exact references and fences old generations without body migration',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC paged Content',operationId:op()}),ids=[];
 for(let i=0;i<165;i++){s.clock=()=>new Date(Date.UTC(2021,0,1)+i*1000).toISOString();ids.push((await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC_BODY_'+i})).id);}
 const load=options=>s.topicDocumentPage({topicId:topic.id,sort:'asc',chronology:'expression',...options});
 const implicit=await s.topicDocumentPage({topicId:topic.id,chronology:'expression',limit:1});assert.equal(implicit.chronology,'expression');assert.equal(implicit.items[0].entry.id,ids[0]);
 const first=await load({}),seen=[...first.items.map(x=>x.entry.id)];let cursor=first.nextCursor;
 while(cursor){const page=await load({cursor});seen.push(...page.items.map(x=>x.entry.id));cursor=page.nextCursor;assert.ok(page.items.length<=40);}
 assert.deepEqual(seen,ids);
 const one=await load({anchorId:ids[120],limit:1});assert.equal(one.items.length,1);assert.ok(one.nextCursor,'an anchor-only page retains continuation');
 const earliest=await s.topicDocumentPage({topicId:topic.id,sort:'desc',chronology:'expression',timeEdge:'earliest'});assert.equal(earliest.items[0].entry.id,ids[0]);
 const latest=await load({timeEdge:'latest'});assert.equal(latest.items[0].entry.id,ids.at(-1));
 const seek=await load({anchorId:ids[120]});assert.equal(seek.items[0].entry.id,ids[120]);assert.ok(seek.previousCursor);
 const prior=await load({cursor:seek.previousCursor,direction:'prev'});assert.deepEqual(prior.items.map(x=>x.entry.id),ids.slice(80,120));
 const unknown=await load({timeEdge:'unknown'});assert.equal(unknown.timeEdgeUnavailable,true);
 const e=await s.entry(ids[100]);await s.editLibraryFields({operationId:op(),id:e.id,expectedRevision:e.revision,expectedFieldRevisions:e.fieldRevisions,changes:{note:'SYNTHETIC current note'}});
 assert.equal((await load({anchorId:ids[120],expectedReadGeneration:first.coverage.activeGeneration})).cursorInvalid,true);
 assert.equal((await load({cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await s.entry(ids[100])).body,'SYNTHETIC_BODY_100');assert.equal((await rows(s,'thoughts')).length,165);
});

function readerFixture(count=440){
 const source=Array.from({length:count},(_,i)=>({entry:{id:'entry-'+String(i).padStart(4,'0'),revision:1,body:'SYNTHETIC_BODY_CANARY_'+i},placement:{sectionId:'section'}})),calls=[],pins=new Set();let generation='g1';
 const load=async options=>{calls.push(structuredClone(options));if(options.expectedReadGeneration&&options.expectedReadGeneration!==generation)return {cursorInvalid:true,items:[]};const {cursor,direction,anchorId}=options;let from=anchorId?source.findIndex(x=>x.entry.id===anchorId):direction==='prev'?Math.max(0,(cursor?.at||0)-40):cursor?.at||0;const to=direction==='prev'&&!anchorId?cursor.at:Math.min(count,from+40);return {topic:{id:'topic'},chronology:'expression',coverage:{activeGeneration:generation},items:source.slice(from,to),nextCursor:to<count?{at:to}:null,previousCursor:from?{at:from}:null};};
 const reader=new ContinuousTopicReader({load,pins:()=>pins});reader.reset({topicId:'topic'});return {reader,load,calls,pins,source,changeGeneration:()=>generation='g2'};
}
test('D2 Content retains only120 clean bodies plus protected pins; evicted extent and snapshots are body-free',async()=>{
 const f=readerFixture(),{reader,pins}=f;await reader.initial();pins.add(f.source[5].entry.id);
 while(!reader.terminalNext){await reader.next();assert.ok(reader.state().retainedBodies<=121);assert.equal(reader.pageMeta.items,undefined);assert.equal(reader.pageMeta.tracked,undefined);}
 assert.equal(reader.items.length,440);assert.equal(reader.items[5].entry.body,'SYNTHETIC_BODY_CANARY_5');assert.equal(reader.items[0].entry.body,undefined);
 const saved=reader.snapshot({id:f.source[390].entry.id,top:140});assert.doesNotMatch(JSON.stringify(saved),/CANARY|body|note/);
 reader.moveWindowToStart();assert.equal(await reader.hydrateWindow(),true);assert.equal(reader.items[0].entry.body,'SYNTHETIC_BODY_CANARY_0');assert.ok(reader.state().retainedBodies<=120);assert.ok(f.calls.some(call=>call.anchorId===f.source[0].entry.id));assert.equal(reader.terminalNext,true,'refetch does not lose the actual end');
 const restored=new ContinuousTopicReader({load:f.load});restored.reset({topicId:'topic'});assert.equal(restored.restore(saved),true);await restored.initial();assert.equal(restored.items.length,440);assert.equal(restored.items[390].entry.body,'SYNTHETIC_BODY_CANARY_390');assert.ok(restored.state().retainedBodies<=120);assert.equal(restored.terminalNext,true);
 f.changeGeneration();reader.windowStart=200;assert.equal(await reader.hydrateWindow(),false);assert.equal(reader.stale,true);assert.equal(reader.state().retainedBodies,0);assert.equal(reader.pageMeta,null);
});
test('D2 Content stops new paging when protected work exceeds budget and does not discard any protected body',async()=>{
 const f=readerFixture();await f.reader.initial();await f.reader.next();await f.reader.next();for(const row of f.reader.items)f.pins.add(row.entry.id);await f.reader.next();f.pins.add(f.reader.items[120].entry.id);
 const calls=f.calls.length,protectedBodies=[...f.pins].map(id=>f.reader.items[f.reader.index.get(id)].entry.body);await f.reader.next();assert.equal(f.calls.length,calls);assert.equal(f.reader.protectionBlocked,true);assert.deepEqual([...f.pins].map(id=>f.reader.items[f.reader.index.get(id)].entry.body),protectedBodies);
});
test('D2 Content reset fences a held exact-ref hydration and refuses a changed revision',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();f.reader.moveWindowToStart();let finish;const original=f.reader.load;f.reader.load=()=>new Promise(resolve=>finish=resolve);const pending=f.reader.hydrateWindow();f.reader.reset({topicId:'other'});finish(await original({anchorId:f.source[0].entry.id}));assert.equal(await pending,false);assert.deepEqual(f.reader.items,[]);
 const g=readerFixture();await g.reader.initial();while(!g.reader.terminalNext)await g.reader.next();g.source[0].entry.revision=2;g.reader.moveWindowToStart();assert.equal(await g.reader.hydrateWindow(),false);assert.equal(g.reader.stale,true);assert.equal(g.reader.state().retainedBodies,0);
});


test('D2 Content explicit hydration retry clears only its failure and overlapping movement admits only the latest window',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();f.reader.moveWindowToStart();
 const load=f.reader.load;f.reader.load=async()=>{throw Error('SYNTHETIC_OFFLINE');};assert.equal(await f.reader.hydrateWindow(),false);assert.ok(f.reader.state().errorNext);
 f.reader.load=load;assert.equal(await f.reader.hydrateWindow(),true);assert.equal(f.reader.state().errorNext,null);
 f.reader.windowStart=320;await f.reader.hydrateWindow();f.reader.moveWindowToStart();let finish;f.reader.load=options=>new Promise(resolve=>finish=()=>load(options).then(resolve));
 const older=f.reader.hydrateWindow();f.reader.shiftWindow('next');const newer=f.reader.hydrateWindow();f.reader.load=load;await finish();assert.equal(await older,false);assert.equal(await newer,true);assert.equal(f.reader.windowStart,40);assert.equal(f.reader.items[40].entry.body,'SYNTHETIC_BODY_CANARY_40');
});

import {ThoughtWorkspace} from '../ui/thoughts-base.js';
test('D2 actual workspace refuses a held hydration after reader or render intent replacement',async()=>{
 for(const replacement of ['reader','intent']){
  let finish,painted=0,restored=0;const reader={windowRevision:0,hydrateWindow:()=>new Promise(resolve=>finish=resolve)},workspace=Object.assign(Object.create(ThoughtWorkspace.prototype),{topicReader:reader,serial:1,topicPageFromReader:()=>{painted++;return {topic:{}};},renderDocument:()=>painted++,updateTopicContinuous:()=>{},observeTopicWindowSpacers:()=>{}});
  const pending=workspace.renderTopicReader({id:'old',top:140});if(replacement==='reader')workspace.topicReader={measure:()=>{},restoreAnchor:()=>restored++};else workspace.serial++;
  finish(true);assert.equal(await pending,false);assert.equal(painted,0);assert.equal(restored,0);
 }
});


test('D2 Content completes a full window when byte bounds yield only one row per read',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();f.reader.moveWindowToStart();const load=f.reader.load;
 f.reader.load=async options=>{const page=await load(options);return {...page,items:page.items.slice(0,1)};};
 const before=f.calls.length;assert.equal(await f.reader.hydrateWindow(),true);assert.equal(f.calls.length-before,120);assert.equal(f.reader.state().retainedBodies,120);assert.equal(f.reader.state().errorNext,null);
});


test('D2 Content coalesced failure does not automatically retry; terminal frontier Retry hydrates the current window',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();f.reader.moveWindowToStart();let reject,requests=0;f.reader.load=()=>{requests++;return new Promise((_,fail)=>reject=fail);};
 const a=f.reader.hydrateWindow(),b=f.reader.hydrateWindow();reject(Error('SYNTHETIC_OFFLINE'));assert.equal(await a,false);assert.equal(await b,false);assert.equal(requests,1);
 let reads=0,advances=0;const reader={hydrationError:Error('SYNTHETIC_OFFLINE'),terminalNext:true,bodyRevision:1,next:async()=>advances++},workspace=Object.assign(Object.create(ThoughtWorkspace.prototype),{topicReader:reader,serial:1,topicContinuousVisible:()=>true,topicAnchor:()=>null,checkAllTracked:async()=>true,renderTopicReader:async()=>reads++,updateTopicContinuous:()=>{}});
 await workspace.loadTopicContinuous('next');assert.equal(reads,1);assert.equal(advances,0);
});

import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
test('D2 canonical removal clears editor recovery body caches and no longer pins a removed owner',async()=>{
 const id='removed-owner',editor=Object.assign(Object.create(LibraryEntryEditor.prototype),{entries:new Map([[id,{saved:{body:'SYNTHETIC_REMOVED_CANARY'},local:{body:'SYNTHETIC_REMOVED_CANARY'}}]]),recoveries:new Map([[id,{pending:true,persisted:{signature:'SYNTHETIC_REMOVED_CANARY'}}]]),recoveryOps:new Map([[id,{signature:'SYNTHETIC_REMOVED_CANARY'}]]),recoveryChecked:new Set([id]),field:()=>null,journal:{clear(){}},collect:()=>{},root:{querySelectorAll:()=>[]}});
 await editor.checkTracked([{id,lifecycle:'removed'}]);assert.equal(editor.entries.size,0);assert.equal(editor.recoveries.size,0);assert.equal(editor.recoveryOps.size,0);assert.equal(editor.recoveryChecked.size,0);assert.equal(editor.protectedIds().has(id),false);assert.doesNotMatch(JSON.stringify([...editor.recoveries]),/CANARY/);
});

test('D2 a frontier move invalidates an older in-flight hydration window',async()=>{
 const f=readerFixture();await f.reader.initial();for(let i=0;i<4;i++)await f.reader.next();f.reader.moveWindowToStart();const load=f.reader.load;let finish;
 f.reader.load=options=>options.anchorId?new Promise(resolve=>finish=()=>load(options).then(resolve)):load(options);
 const pending=f.reader.hydrateWindow(),revision=f.reader.windowRevision;await f.reader.next();assert.ok(f.reader.windowRevision>revision);await finish();assert.equal(await pending,false);assert.equal(f.reader.windowStart,120);
});
