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

import {TopicController as ThoughtWorkspace} from '../ui/topic-workspace.js';
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

test('D2 expression Content never consumes a storage-failed eligible row as a complete empty answer',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC body read interruption',operationId:op()}),entry=await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC retained expression'});
 await s.topicDocumentPage({topicId:topic.id,chronology:'expression'});const read=s.readingEntry.bind(s);s.readingEntry=async()=>{throw Error('SYNTHETIC_STORAGE_INTERRUPTION');};
 await assert.rejects(()=>s.topicDocumentPage({topicId:topic.id,chronology:'expression'}),/SYNTHETIC_STORAGE_INTERRUPTION/);s.readingEntry=read;
 const page=await s.topicDocumentPage({topicId:topic.id,chronology:'expression'});assert.deepEqual(page.items.map(row=>row.entry.id),[entry.id]);assert.equal(page.complete,true);
});

import {RevisionSession} from '../ui/editor-primitives.js';
function recoveryEditor(){return Object.assign(Object.create(LibraryEntryEditor.prototype),{entries:new Map(),recoveries:new Map(),recoveryOps:new Map(),recoveryChecked:new Set(),root:{querySelectorAll:()=>[]},field:()=>null,paint:()=>{},collect:()=>{},surface:{composing:false},autosave:{cancel(){}},revisions:new RevisionSession(),journal:{undo:[],redo:[],clear(){this.undo=[];this.redo=[];}},onStatus:()=>{},onSaved:()=>{}});}
async function withRecoveryTransport(run){
 const old=globalThis.chrome,calls=[],row={id:'safe-owner',lifecycle:'active',body:'SYNTHETIC_SAFE_CURRENT',note:'',type:'idea',revision:3,fieldRevisions:{body:3,note:0,type:0},currentInputRevision:null,recoveryEpoch:{id:'synthetic-safe-epoch'},sourceRecordIds:[]};
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));if(message.type==='GET_LIBRARY_ENTRY')return {ok:true,data:structuredClone(row)};if(message.type==='PAIA_RECOVERY_DRAFT_SAVE')return {ok:true,data:{saved:true}};if(message.type==='EDIT_LIBRARY_BATCH')return {ok:false,error:'STORAGE_FAILED'};if(message.type==='THOUGHT_EDIT_HISTORY')return {ok:true,data:{items:[]}};throw Error('UNEXPECTED_'+message.type);}}};
 try{await run({calls,row});}finally{globalThis.chrome=old;}
}
test('D2 surviving purged owner gets a fresh recovery session before a new failed edit',async()=>withRecoveryTransport(async({calls,row})=>{
 const editor=recoveryEditor();editor.entries.set(row.id,{saved:{body:'SYNTHETIC_PURGED_CANARY',note:'',type:'idea'},local:{body:'SYNTHETIC_PURGED_CANARY',note:'',type:'idea'},revision:1,fieldRevisions:{body:1,note:0,type:0}});editor.recoveries.set(row.id,{persisted:{signature:'SYNTHETIC_PURGED_CANARY'}});
 await editor.checkTracked([{id:row.id,lifecycle:'active',purged:true}]);assert.equal(editor.recoveries.get(row.id).persisted,null);editor.entries.get(row.id).local.body='SYNTHETIC_NEW_DRAFT';assert.equal(await editor.flush(),false);
 const saved=calls.find(call=>call.type==='PAIA_RECOVERY_DRAFT_SAVE');assert.ok(saved);assert.deepEqual(saved.draft.epoch,row.recoveryEpoch);assert.deepEqual(saved.draft.sourceRecordIds,[]);assert.equal(saved.draft.operation.edit.entries[0].changes.body,'SYNTHETIC_NEW_DRAFT');assert.doesNotMatch(JSON.stringify(saved),/PURGED_CANARY/);assert.equal(editor.entries.get(row.id).local.body,'SYNTHETIC_NEW_DRAFT');
}));
test('D2 saved-history readback restores recovery ownership for an evicted entry',async()=>withRecoveryTransport(async({calls,row})=>{
 const editor=recoveryEditor(),patches=[{id:row.id,field:'body',before:'before',after:'after'}];patches.savedEdit=[{id:row.id,revisionId:'saved-revision'}];editor.journal.undo.push(patches);await editor.history();assert.ok(editor.entries.has(row.id));assert.ok(editor.recoveries.has(row.id));
 editor.entries.get(row.id).local.body='SYNTHETIC_AFTER_UNDO_DRAFT';assert.equal(await editor.flush(),false);const save=calls.find(call=>call.type==='PAIA_RECOVERY_DRAFT_SAVE');assert.ok(save);assert.equal(save.draft.operation.edit.entries[0].changes.body,'SYNTHETIC_AFTER_UNDO_DRAFT');assert.deepEqual(save.draft.epoch,row.recoveryEpoch);
}));

test('D2 expression response rejects an admitted Source purge after sanitizer before wrapper readback',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC_RESPONSE_PURGE_CANARY']}),{s}=f;await f.runner.wake();const topic=(await s.libraryIndexPage({mode:'stable'})).items[0],record=(await rows(s,'records'))[0];
 const initial=await s.topicDocumentPage({topicId:topic.id,chronology:'expression'});assert.match(JSON.stringify(initial),/SYNTHETIC_RESPONSE_PURGE_CANARY/);
 const transaction=s.repository.transaction.bind(s.repository);let triggered=false,purge=null,finished=false;
 s.repository.transaction=async(...args)=>{const result=await transaction(...args);if(!triggered&&result?.chronology==='expression'&&Array.isArray(result.items)){triggered=true;purge=s.purge(record.id,true).then(()=>{finished=true;});}return result;};
 try{const response=await s.topicDocumentPage({topicId:topic.id,chronology:'expression'});assert.equal(triggered,true);assert.equal(finished,true);assert.equal(response.cursorInvalid,true);assert.doesNotMatch(JSON.stringify(response),/SYNTHETIC_RESPONSE_PURGE_CANARY/);await purge;}finally{s.repository.transaction=transaction;}
});

test('D2 exact expression anchors remain directly addressable beyond the old10000-row seek prefix',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC deep exact-ref',operationId:op()}),first=await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC deep seed'}),count=10005;
 await s.foundationWrite(async t=>{const live=await t.get('topics',topic.id),template=await t.get('thoughts',first.id),placement=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,first.id]));for(let i=1;i<count;i++){const id='d2-deep-'+String(i).padStart(6,'0');await t.put('thoughts',{...template,id,thoughtText:'SYNTHETIC_DEEP_'+i});await t.put('placements',{...placement,id:JSON.stringify([topic.id,live.activeLayoutGeneration,id]),entryId:id,rank:String(i).padStart(12,'0')});}live.organizationRevision++;live.countVersion++;await t.put('topics',live);});
 let page;for(let build=0;build<4;build++){page=await s.topicDocumentPage({topicId:topic.id,chronology:'expression',limit:1});if(!page.indexing)break;}assert.equal(page.indexing,undefined);assert.equal(page.overview.total,count);
 const last='d2-deep-010004',seek=await s.topicDocumentPage({topicId:topic.id,chronology:'expression',anchorId:last,limit:1});assert.equal(seek.items[0].entry.id,last);assert.equal(seek.items[0].entry.body,'SYNTHETIC_DEEP_10004');assert.equal(seek.operations.seekRowsScanned,1);assert.equal(seek.nextCursor,null);assert.ok(seek.previousCursor);
 const missing=await s.topicDocumentPage({topicId:topic.id,chronology:'expression',anchorId:'d2-deep-missing',limit:1});assert.equal(missing.cursorInvalid,true);assert.equal(missing.anchorUnavailable,true);assert.deepEqual(missing.items,[]);
});

test('D2 cold-indexing metadata is fenced after an admitted purge without inventing a complete generation',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC_INDEXING_SOURCE']}),{s}=f;await f.runner.wake();const topic=(await s.libraryIndexPage({mode:'stable'})).items[0],record=(await rows(s,'records'))[0],sourceEntry=(await rows(s,'thoughts')).find(row=>row.sourceRecordIds?.includes(record.id)),independent=await s.continueThinking({operationId:op(),body:'SYNTHETIC_INDEPENDENT_FILLER'});
 assert.ok(sourceEntry);
 await s.foundationWrite(async t=>{const live=await t.get('topics',topic.id),template=await t.get('thoughts',independent.id),placement=await t.get('placements',JSON.stringify([live.id,live.activeLayoutGeneration,sourceEntry.id]));live.name='SYNTHETIC_INDEXING_METADATA_CANARY';live.nameKey=live.name;live.summary='SYNTHETIC_INDEXING_SUMMARY_CANARY';live.organizationRevision++;live.countVersion++;for(let i=0;i<10000;i++){const id='indexing-probe-'+String(i).padStart(5,'0');await t.put('thoughts',{...template,id,thoughtText:'SYNTHETIC_FILLER',topics:[live.id]});await t.put('placements',{...placement,id:JSON.stringify([live.id,live.activeLayoutGeneration,id]),entryId:id,rank:String(i).padStart(12,'0')});}await t.put('topics',live);});
 const transaction=s.repository.transaction.bind(s.repository);let triggered=false,finished=false,purge=null,scanned=null;
 s.repository.transaction=async(...args)=>{const result=await transaction(...args);if(!triggered&&result?.indexing===true&&result.topic&&Array.isArray(result.items)){triggered=true;scanned=result.coverage?.scanned;purge=s.purge(record.id,true).then(()=>{finished=true;});}return result;};
 try{const response=await s.topicDocumentPage({topicId:topic.id,chronology:'expression'});assert.equal(triggered,true);assert.equal(scanned,10000,'real bounded index build, not a fabricated indexing DTO');assert.equal(finished,true);assert.equal(response.cursorInvalid,true);assert.equal(response.complete,false);assert.deepEqual(response.items,[]);assert.doesNotMatch(JSON.stringify(response),/SYNTHETIC_INDEXING_(METADATA|SUMMARY)_CANARY/);await purge;}finally{s.repository.transaction=transaction;}
});

// A real saved reader plus the actual workspace methods. Only page transport,
// DOM painting and the animation-frame clock are synthetic; no paging method is
// replaced. This reproduces the native delayed top-scroll after a saved return.
async function withTopicRestoreFixture(run,{hold=true,failRead=false,partial=false}={}){
 const names=['document','scrollY','scrollBy','requestAnimationFrame','chrome'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),frames=[],reads=[],paints=[],scrolls=[];
 const source=Array.from({length:partial?245:165},(_,i)=>({entry:{id:'restore-'+i,revision:1,body:'SYNTHETIC_RESTORE_'+i}})),saved={topicId:'restore-topic',sort:'asc',query:'',extent:(partial?source.slice(40,205):source).map(item=>({entry:{id:item.entry.id,revision:1},unloaded:true})),windowStart:45,nextCursor:partial?{at:205}:null,previousCursor:partial?{at:40}:null,terminalNext:!partial,terminalPrevious:!partial,generation:'restore-generation',anchor:{id:partial?'restore-85':'restore-45',top:8441}};
 let release,first=true,nodes=[];const gate=new Promise(resolve=>release=resolve),elements=new Map();
 globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{id,hidden:false,value:'',inert:false,replaceChildren(){},classList:{toggle(){}}});return elements.get(id);}};globalThis.scrollY=0;globalThis.scrollBy=(_x,delta)=>{scrolls.push(delta);globalThis.scrollY+=delta;};globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
 const owner=Object.assign(Object.create(ThoughtWorkspace.prototype),{id:'restore-topic',view:'original',originalMode:'content',serial:11,openIntent:3,readRetry:{},originalPane:{dataset:{},querySelectorAll:()=>nodes},onStatus(){},observeTopicWindowSpacers(){},updateTopicContinuous(){},loadRemainingTopicSections(){},checkAllTracked:async()=>true,topicPageFromReader(){return {topic:{id:this.id}};},renderDocument(){paints.push(this.topicReader.windowStart);nodes=this.topicReader.layout().filter(row=>row.kind==='item').map(row=>({dataset:{entryId:row.item.entry.id},getBoundingClientRect:()=>({top:341+row.index*180-scrollY,bottom:521+row.index*180-scrollY,height:180})}));},createTopicReader(){const reader=new ContinuousTopicReader({load:async options=>{reads.push(structuredClone(options));if(first){first=false;if(hold)await gate;}if(failRead)throw Error('SYNTHETIC_RESTORE_READ_FAILED');const start=options.anchorId?Number(options.anchorId.split('-').at(-1)):options.direction==='prev'?Math.max(0,options.cursor.at-40):options.cursor?.at||0,end=options.direction==='prev'&&!options.anchorId?options.cursor.at:Math.min(source.length,start+40);return {topic:{id:this.id},items:source.slice(start,end),previousCursor:start?{at:start}:null,nextCursor:end<source.length?{at:end}:null,coverage:{activeGeneration:'restore-generation'}};}});reader.reset({topicId:this.id});return reader;}});
 try{await run({owner,saved,release,frames,reads,paints,scrolls,frame:()=>frames.shift()?.()});}finally{for(const [key,descriptor]of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}

test('D2 saved return ignores delayed automatic window shifts through both layout frames, then allows normal paging',()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});assert.equal(f.owner.topicRestoring(),true);assert.equal(f.owner.topicReader.windowStart,45);
 await f.owner.shiftTopicWindow('previous');assert.equal(f.owner.topicReader.windowStart,45,'held hydration cannot be displaced by a top-scroll callback');f.release();await pending;
 assert.deepEqual(f.reads.map(row=>row.anchorId),['restore-45','restore-85','restore-125']);assert.equal(f.owner.topicReader.state().retainedBodies,120);
 await f.owner.shiftTopicWindow('previous');assert.equal(f.owner.topicReader.windowStart,45,'ready state still owns its queued layout scroll');f.frame();await f.owner.shiftTopicWindow('previous');assert.equal(f.owner.topicReader.windowStart,45);
 f.frame();assert.equal(f.owner.topicRestoring(),false);await f.owner.shiftTopicWindow('previous');assert.equal(f.owner.topicReader.windowStart,0);assert.equal(f.owner.topicReader.items.length,165);assert.equal(f.owner.topicReader.state().retainedBodies,120);assert.equal(f.owner.topicReader.items[0].entry.body,'SYNTHETIC_RESTORE_0');assert.equal(f.owner.topicReader.stale,false);
}));

for(const input of [{type:'wheel'},{type:'touchstart'},{type:'keydown',key:'PageDown'},{type:'keydown',key:'Home'}])test(`D2 trusted ${input.type}/${input.key||'pointer'} interrupts only the pending saved restoration`,()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});f.owner.topicRestoreInput({...input,isTrusted:true});globalThis.scrollY=250;assert.equal(f.owner.topicRestoring(),false);assert.equal(f.owner.topicRestoreInputEpoch,1);f.release();await pending;
 assert.equal(scrollY,250,'late paint does not restore over explicit reading input');assert.deepEqual(f.scrolls,[]);assert.equal(f.frames.length,0);assert.equal(f.owner.topicReader.items.length,165);
}));

test('D2 explicit keyboard frontier action releases the saved-window guard and still uses the existing reader owner',()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});const keyAction=f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicRestoring(),false);assert.equal(f.owner.topicRestoreInputEpoch,1);f.release();await Promise.all([pending,keyAction]);assert.equal(f.owner.topicReader.items.length,165);assert.equal(f.owner.topicReader.state().retainedBodies,120);assert.equal(f.owner.topicReader.stale,false);
}));

for(const input of [{type:'wheel',isTrusted:false},{type:'keydown',isTrusted:true,key:'ArrowDown',isComposing:true},{type:'keydown',isTrusted:true,key:'PageDown',defaultPrevented:true},{type:'keydown',isTrusted:true,key:'ArrowDown',target:{closest:()=>({})}}])test(`D2 unadmitted restore input preserves the guard: ${JSON.stringify(input)}`,()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved});f.owner.topicRestoreInput(input);assert.equal(f.owner.topicRestoring(),true);assert.equal(f.owner.topicRestoreInputEpoch,undefined);f.release();await pending;f.frame();f.frame();assert.equal(f.owner.topicRestoring(),false);
}));

for(const replacement of ['serial','openIntent','reader'])test(`D2 saved restoration expires on a newer ${replacement} while held`,()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});if(replacement==='reader')f.owner.topicReader=f.owner.createTopicReader();else f.owner[replacement]++;assert.equal(f.owner.topicRestoring(),false);f.release();await pending;assert.deepEqual(f.scrolls,[]);assert.equal(f.frames.length,0);
}));

test('D2 an obsolete restore frame cannot clear a newer reader restoration',()=>withTopicRestoreFixture(async f=>{
 f.release();await f.owner.resetTopicReader({saved:f.saved});const first=f.owner.topicRestore;await f.owner.resetTopicReader({saved:f.saved});const latest=f.owner.topicRestore;assert.notEqual(latest,first);f.frame();f.frame();f.frame();assert.equal(f.owner.topicRestore,latest);assert.equal(f.owner.topicRestoring(),true);f.frame();assert.equal(f.owner.topicRestoring(),false);
},{hold:false}));

test('D2 failed restore hydration releases immediately and keeps the error visible',()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved});f.release();await pending;assert.equal(f.owner.topicRestoring(),false);assert.equal(f.frames.length,0);assert.match(f.owner.topicReader.hydrationError.message,/SYNTHETIC_RESTORE_READ_FAILED/);
},{failRead:true}));

test('D2 an unexpected restore render error releases its guard and propagates the original error',()=>withTopicRestoreFixture(async f=>{
 const error=Error('SYNTHETIC_RENDER_FAILURE');f.owner.renderDocument=()=>{throw error;};const pending=f.owner.resetTopicReader({saved:f.saved});f.release();await assert.rejects(pending,actual=>actual===error);assert.equal(f.owner.topicRestoring(),false);assert.equal(f.frames.length,0);
}));

test('D2 accepted leave clears a held restore without painting or retaining a frame lock',()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});assert.equal(await f.owner.leaveEditors(),true);assert.equal(f.owner.topicRestoring(),false);f.release();await pending;assert.deepEqual(f.paints,[]);assert.deepEqual(f.scrolls,[]);assert.equal(f.frames.length,0);
}));

test('D2 the actual open completion does not repeat anchor restoration after trusted wheel during hydration',()=>withTopicRestoreFixture(async f=>{
 const pane=f.owner.originalPane;globalThis.chrome={runtime:{sendMessage:async()=>({ok:true,data:null})}};
 Object.assign(f.owner,{id:null,aiTopics:new Map(),homePositions:new Map([['restore-topic',{sort:'asc',anchor:f.saved.anchor}]]),timelinePositions:{get:()=>null},aiViewSession:{view:()=> 'original',position:()=>({anchor:f.saved.anchor})},rememberView(){},saveHomePosition(){},leave:async()=>true,clearActionFeedback(){},restoreContent(){},schedulePosition(){},onOpen(){},async refresh(){this.originalPane=pane;this.serial++;const pending=this.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor});this.topicRestoreInput({type:'wheel',isTrusted:true});globalThis.scrollY=250;f.release();await pending;}});
 assert.equal(await f.owner.open('restore-topic'),4);await Promise.resolve();assert.equal(scrollY,250);assert.deepEqual(f.scrolls,[]);assert.equal(f.owner.topicRestoreInputEpoch,1);
}));

for(const direction of ['previous','next'])test(`D2 nonterminal restored extent defers automatic ${direction} but resumes its real reader after layout`,()=>withTopicRestoreFixture(async f=>{
 const observed=[];f.owner.topicContinuousObserver={unobserve:node=>observed.push(['unobserve',node.id]),observe:node=>observed.push(['observe',node.id])};
 const pending=f.owner.resetTopicReader({saved:f.saved});assert.equal(f.owner.topicReader.terminalPrevious,false);assert.equal(f.owner.topicReader.terminalNext,false);await f.owner.loadTopicContinuous(direction,{explicit:false});assert.equal(f.reads.length,1);assert.equal(f.owner.topicReader.windowStart,45);
 f.release();await pending;const count=f.reads.length;await f.owner.loadTopicContinuous(direction,{explicit:false});assert.equal(f.reads.length,count);assert.equal(f.owner.topicReader.items.length,165);f.frame();f.frame();
 assert.deepEqual(observed,[['unobserve','topic-continuous-before'],['observe','topic-continuous-before'],['unobserve','topic-continuous-after'],['observe','topic-continuous-after']]);
 await f.owner.loadTopicContinuous(direction,{explicit:false});assert.ok(f.reads.some(row=>row.direction===(direction==='previous'?'prev':'next')&&row.cursor?.at===(direction==='previous'?40:205)));assert.deepEqual(f.owner.topicReader.items.map(row=>row.entry.id),Array.from({length:205},(_,i)=>'restore-'+(i+(direction==='previous'?0:40))));assert.ok(f.owner.topicReader.state().retainedBodies<=120);assert.equal(f.owner.topicReader.stale,false);
},{partial:true}));

for(const direction of ['previous','next'])test(`D2 explicit ${direction} takes priority over a held partial-extent restoration`,()=>withTopicRestoreFixture(async f=>{
 const pending=f.owner.resetTopicReader({saved:f.saved,restoreAnchor:f.saved.anchor}),action=f.owner.loadTopicContinuous(direction);assert.equal(f.owner.topicRestoring(),false);assert.equal(f.owner.topicRestoreInputEpoch,1);f.release();await Promise.all([pending,action]);assert.equal(f.owner.topicReader.items.length,205);assert.ok(f.owner.topicReader.state().retainedBodies<=120);assert.equal(f.owner.topicReader.stale,false);
},{partial:true}));

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const route of ['thoughts','library','dialog'])test(`D2 existing Archive keyboard owner releases Topic restore only for admitted page reading keys: ${route}`,()=>withTopicRestoreFixture(async f=>{
 const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8'),start=source.indexOf("document.addEventListener('keydown',event=>{"),end=source.indexOf('\n});',start);assert.ok(start>=0&&end>start);let keyboard;
 vm.runInNewContext(source.slice(start,end+4),{document:{addEventListener(_type,handler){keyboard=handler;},querySelector:()=>route==='dialog'?{}:null},view:route==='library'?'library':'thoughts',thoughts:f.owner,editor:null,archiveNavigator:{handleKeydown:()=>false},archiveRootOverflow:{contains:()=>false}});
 const pending=f.owner.resetTopicReader({saved:f.saved});keyboard({type:'keydown',key:'PageDown',isTrusted:true});assert.equal(f.owner.topicRestoring(),route!=='thoughts');f.release();await pending;while(f.frames.length)f.frame();
}));
