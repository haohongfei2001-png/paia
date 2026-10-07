import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {TopicTimelineWindow,TopicTimelinePositions,timelineYears} from '../ui/topic-timeline-window.js';
import {expressionCaption} from '../ui/topic-timeline.js';
const op=()=>crypto.randomUUID();
async function fixture(count=100,{body=i=>'SYNTHETIC '+i,year=2021}={}){
 const f=await completeFixture({texts:[]}),topic=await f.s.createTopic({name:'SYNTHETIC D2 years',operationId:op()}),ids=[];
 for(let i=0;i<count;i++){f.s.clock=()=>new Date(Date.UTC(year,0,1)+i*1000).toISOString();ids.push((await f.s.continueThinking({operationId:op(),body:body(i),topicId:topic.id})).id);}
 return {...f,topic,ids};
}
test('D2 year query is complete beyond unmounted rows and cursor-bound to normalized query',async()=>{
 const f=await fixture(125,{body:i=>i%41===0?'SYNTHETIC MATCH '+i:'SYNTHETIC other '+i});
 const hits=[];let cursor=null;do{const p=await f.s.topicTimelinePage({topicId:f.topic.id,query:'match',cursor});hits.push(...p.items.map(x=>x.entry.id));cursor=p.nextCursor;}while(cursor);
 assert.deepEqual(hits,[0,41,82,123].map(i=>f.ids[i]));
 const first=await f.s.topicTimelinePage({topicId:f.topic.id,query:' ＭＡＴＣＨ '});
 assert.equal((await f.s.topicTimelinePage({topicId:f.topic.id,query:'other',cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await f.s.topicTimelinePage({topicId:f.topic.id,query:'match',cursor:first.nextCursor})).cursorInvalid,undefined);
 await assert.rejects(()=>f.s.topicTimelinePage({topicId:f.topic.id,query:'x'.repeat(501)}));
});
test('D2 reverse year pages and both directional byte boundaries retain every complete expression',async()=>{
 const f=await fixture(18,{body:i=>'SYNTHETIC '+String(i).padStart(2,'0')+' '+('界'.repeat(31000))});
 let cursor=null,last,seen=[];do{const page=await f.s.topicTimelinePage({topicId:f.topic.id,year:2021,cursor});assert.ok(page.items.length<=2);assert.ok(page.items.every(x=>x.entry.body.endsWith('界'.repeat(31000))));seen.push(...page.items.map(x=>x.entry.id));last=page;cursor=page.nextCursor;}while(cursor);
 assert.deepEqual(seen,f.ids);
 const reverse=[...last.items.map(x=>x.entry.id)].reverse();cursor=last.previousCursor;
 while(cursor){const p=await f.s.topicTimelinePage({topicId:f.topic.id,year:2021,cursor,direction:'prev'});assert.ok(p.items.length<=2);reverse.push(...[...p.items.map(x=>x.entry.id)].reverse());cursor=p.previousCursor;}
 assert.deepEqual(reverse,[...f.ids].reverse());
 assert.equal(new Set(reverse).size,18);
});
test('D2 sparse provider edge pages expose continuation, not a false empty year',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC source at end']}),block=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'SYNTHETIC sparse scope',operationId:op()});
 f.s.clock=()=> '2026-01-01T00:00:00.000Z';for(let i=0;i<85;i++)await f.s.continueThinking({operationId:op(),body:'SYNTHETIC off provider '+i,topicId:topic.id});
 await f.s.foundationWrite(async t=>{for(const record of await t.all('records')){record.value.sourceSentAt='2026-12-31T23:59:59.000Z';await t.put('records',record);}});
 const added=await f.s.addToTopics({operationId:op(),kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id]});
 const first=await f.s.topicTimelinePage({topicId:topic.id,year:2026,providerKey:'chatgpt'});assert.equal(first.overview.knownYearCounts[2026],1);assert.equal(first.items.length,0);assert.ok(first.nextCursor);
 let p=first;while(!p.items.length&&p.nextCursor)p=await f.s.topicTimelinePage({topicId:topic.id,year:2026,providerKey:'chatgpt',cursor:p.nextCursor});assert.equal(p.items[0].entry.id,added.id);
});
test('D2 a real pure-Source purge is excluded before lazy cleanup and invalidates old timeline cursors',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC purge before cleanup']});await f.runner.wake();
 const topic=(await rows(f.s,'topics'))[0],before=await f.s.topicTimelinePage({topicId:topic.id});assert.equal(before.overview.total,1);
 const id=before.items[0].entry.id,record=(await rows(f.s,'records'))[0];await f.s.purge(record.id,true);
 assert.equal((await f.s.entry(id)).lifecycle,'invalidated');
 const invalid=await f.s.topicTimelinePage({topicId:topic.id,expectedReadGeneration:before.overview.generation});assert.equal(invalid.cursorInvalid,true);
 const after=await f.s.topicTimelinePage({topicId:topic.id});assert.equal(after.overview.total,0);assert.deepEqual(after.items,[]);assert.equal(after.overview.unknownCount,0);
 assert.equal((await f.s.repository.transaction(false,t=>t.get('thoughts',id))).lifecycle,'active','test is before row cleanup');
});
test('D2 TimelineWindow keeps at most120 canonical DTOs and refetches prior windows without body snapshots',async()=>{
 const f=await fixture(165),window=new TopicTimelineWindow(o=>f.s.topicTimelinePage(o));window.reset({topicId:f.topic.id,year:2021});await window.initial();const seen=new Set(window.items.map(x=>x.entry.id));
 while(window.nextCursor){await window.next();for(const item of window.items)seen.add(item.entry.id);assert.ok(window.items.length<=120);assert.ok(window.pages.length<=3);}
 assert.equal(seen.size,165);assert.equal(window.items.some(x=>x.entry.id===f.ids[0]),false);
 while(window.previousCursor)await window.previous();assert.equal(window.items[0].entry.id,f.ids[0]);
 const snapshot=window.snapshot();assert.ok(!JSON.stringify(snapshot).includes('SYNTHETIC'));const restored=new TopicTimelineWindow(o=>f.s.topicTimelinePage(o));restored.reset({topicId:f.topic.id,year:2021},snapshot);await restored.initial();assert.equal(restored.items[0].entry.id,window.items[0].entry.id);
 window.clear();assert.deepEqual(window.items,[]);assert.equal(window.overview,null);
});
test('D2 held timeline results cannot resurrect bodies after reset, including same scope',async()=>{
 let resolve;const window=new TopicTimelineWindow(()=>new Promise(r=>resolve=r));window.reset({topicId:'one'});const pending=window.initial();window.reset({topicId:'one'});
 resolve({items:[{entry:{id:'old',body:'SYNTHETIC_STALE_CANARY'}}],overview:{generation:'old',coverage:'complete'},nextCursor:null});assert.equal(await pending,false);assert.deepEqual(window.items,[]);
});
test('D2 current partial/indexing and cursorInvalid never become empty complete year evidence',async()=>{
 for(const result of [{indexing:true,coverage:{complete:true}},{cursorInvalid:true,coverage:{complete:true}}]){const window=new TopicTimelineWindow(async()=>result);window.reset({topicId:'one'});await window.initial();assert.equal(window.overview,null);assert.deepEqual(window.items,[]);assert.ok(window.indexing||window.stale);}
 assert.deepEqual(timelineYears({coverage:'partial',knownYearCounts:{2021:100},unknownCount:1}),[]);
 const years=timelineYears({coverage:'complete',knownYearCounts:{2021:100,2023:59},unknownCount:1});assert.deepEqual(years.map(x=>x.year),[2023,2022,2021,'unknown']);assert.equal(years[1].empty,true);
 assert.deepEqual(timelineYears({coverage:'complete',knownYearCounts:{},unknownCount:2}),[{year:'unknown',count:2}]);
});
test('D2 year position cache is bounded metadata and UTC labels agree with year boundaries',()=>{
 const positions=new TopicTimelinePositions(2);for(let i=0;i<3;i++)positions.save('topic'+i,{mode:'years',year:2021,position:{cursor:{generation:'g'+i}},anchor:{id:'item'+i,top:140}});assert.equal(positions.get('topic0'),null);positions.invalidate();assert.equal(positions.get('topic2').position,null);
 const caption=expressionCaption({provenanceType:'input_original',expressionTime:{at:'2026-01-01T00:00:00.000Z',year:2026,basis:'source'}},true);assert.match(caption,/2026/);assert.match(caption,/UTC/);assert.doesNotMatch(caption,/[\u4e00-\u9fff]/);
});

import {ThoughtWorkspace} from '../ui/thoughts.js';
import {TopicTimeline} from '../ui/topic-timeline.js';
test('D2 actual view owner rejects retired years and IME; latest Original cancels a waiting AI transition',async()=>{
 let disposed=0,flushed=0;const prior=globalThis.document,toggle={checked:false,disabled:false};
 globalThis.document={getElementById:id=>{assert.equal(id,'ai-presentation-toggle');return toggle;},activeElement:null};
 const workspace=Object.assign(Object.create(ThoughtWorkspace.prototype),{id:'topic',view:'original',originalMode:'content',editor:{composing:true,dispose(){disposed++;}},rememberView(){},flushEditors:async()=>{flushed++;return true;}});
 try{
  // Years is no longer an admitted presentation. Keep the old refusal proof,
  // then exercise IME and latest-intent fences on the surviving real owner.
  await workspace.switchOriginalMode('years');assert.equal(workspace.originalMode,'content');assert.equal(disposed,0);assert.equal(flushed,0);
  await workspace.switchView('ai');assert.equal(workspace.view,'original');assert.equal(disposed,0);assert.equal(flushed,0);assert.equal(toggle.disabled,false);
  let finish;workspace.editor.composing=false;workspace.flushEditors=()=>{flushed++;return new Promise(resolve=>finish=resolve);};
  const older=workspace.switchView('ai');assert.equal(typeof finish,'function','actual AI transition waits on the editor');
  const latest=workspace.switchView('original');finish(true);await Promise.all([older,latest]);
  assert.equal(workspace.originalMode,'content');assert.equal(workspace.view,'original');assert.equal(disposed,0);assert.equal(flushed,1);assert.equal(toggle.checked,false);assert.equal(toggle.disabled,false);
 }finally{globalThis.document=prior;}
});

test('D2 actual read-only dialog owner rejects an older open after a newer attempt',async()=>{
 const pending=[],notices=[];
 const timeline=Object.assign(Object.create(TopicTimeline.prototype),{freshEntry:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),onStatus:message=>notices.push(message)});
 const a=timeline.openExpression({id:'a'}),b=timeline.openExpression({id:'b'});
 // Latest failure is shown, while an older successful response must not open A.
 const prior=globalThis.document;globalThis.document={documentElement:{lang:'en'}};
 try{pending[1].reject(Error('unavailable'));await b;pending[0].resolve({body:'SYNTHETIC_OLD_DIALOG'});await a;assert.equal(timeline.dialog,undefined);assert.equal(notices.length,1);}finally{globalThis.document=prior;}
});

test('D2 actual UI owner stops forward autoload after explicit backward reading',async()=>{
 let backwards=0,forwards=0,renders=0;
 const timeline=Object.assign(Object.create(TopicTimeline.prototype),{epoch:1,autoForward:true,visible:()=>true,anchor:()=>null,restoreAnchor(){},host:{setAttribute(){}},renderWindow(){renders++;},window:{loading:false,stale:false,indexing:false,error:null,previous:async()=>{backwards++;return true;},next:async()=>{forwards++;return true;}}});
 await timeline.load('prev');assert.equal(timeline.autoForward,false);assert.equal(backwards,1);
 await timeline.load('next',{automatic:true});assert.equal(forwards,0);assert.equal(renders,1);
 await timeline.load('next');assert.equal(forwards,1);assert.equal(timeline.autoForward,true);
});

test('D2 actual UI owner never auto-retries a failed read, including a queued callback',async()=>{
 let reads=0;const timeline=Object.assign(Object.create(TopicTimeline.prototype),{epoch:1,autoForward:true,visible:()=>true,anchor:()=>null,restoreAnchor(){},host:{setAttribute(){}},renderWindow(){},window:{loading:false,stale:false,indexing:false,error:Error('SYNTHETIC_READ_FAILURE'),next:async()=>{reads++;return true;}}});
 await timeline.load('next',{automatic:true});assert.equal(reads,0);
 await timeline.load('next');assert.equal(reads,1);
});

test('D2 canonical Input exclusion excludes an invalidated expression before dependency cleanup',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC first excluded','SYNTHETIC surviving input']});await f.runner.wake();
 const topic=(await rows(f.s,'topics'))[0],before=await f.s.topicTimelinePage({topicId:topic.id});assert.equal(before.overview.total,2);
 const block=(await rows(f.s,'blocks')).find(row=>row.value.libraryText==='SYNTHETIC first excluded'||row.value.originalText==='SYNTHETIC first excluded')||(await rows(f.s,'blocks'))[0];
 await f.s.excludeLibrary(block.id,true);
 const raw=await rows(f.s,'thoughts'),invalid=[];for(const entry of raw)if((await f.s.entry(entry.id)).lifecycle==='invalidated')invalid.push(entry.id);
 assert.equal(invalid.length,1);assert.equal(raw.find(row=>row.id===invalid[0]).lifecycle,'active','before dependency cleanup');
 assert.equal((await f.s.topicTimelinePage({topicId:topic.id,expectedReadGeneration:before.overview.generation})).cursorInvalid,true);
 for(let i=0;i<2;i++){const page=await f.s.topicTimelinePage({topicId:topic.id});assert.equal(page.cursorInvalid,undefined);assert.equal(page.overview.total,1);assert.equal(page.items.length,1);assert.notEqual(page.items[0].entry.id,invalid[0]);}
});
test('D2 search snapshots retain only one bounded pre-search state and invalidate both generations',()=>{
 const timeline=Object.assign(Object.create(TopicTimeline.prototype),{state:{year:2021,query:'match'},preSearch:{year:2021,query:'',position:{requests:[{cursor:{generation:'prior'}}]},anchor:{id:'prior-entry',top:140}},window:{snapshot:()=>({requests:[{cursor:{generation:'search'}}]})},anchor:()=>({id:'match',top:150}),yearOffset:6,autoForward:true});
 const prior=globalThis.scrollY;globalThis.scrollY=99;try{const saved=timeline.snapshot();assert.equal(saved.preSearch.anchor.id,'prior-entry');assert.equal(saved.preSearch.preSearch,undefined);assert.ok(!JSON.stringify(saved).includes('body'));const positions=new TopicTimelinePositions();positions.save('topic',saved);positions.invalidate();const next=positions.get('topic');assert.equal(next.position,null);assert.equal(next.preSearch.position,null);assert.equal(next.preSearch.anchor,null);}finally{globalThis.scrollY=prior;}
});
