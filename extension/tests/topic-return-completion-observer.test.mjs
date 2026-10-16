import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TopicController} from '../ui/topic-workspace.js';
const browser=await readFile(new URL('./topic-section-return-position-chrome-e2e.test.mjs',import.meta.url),'utf8');
const observer=Function('return ('+browser.slice(browser.indexOf('function observeTopicCompletion('),browser.indexOf('\nasync function fixture()')).trim()+')')();
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(const withAnchor of [true,false])test('native completion observer rejects early route readiness with '+(withAnchor?'qualified Section anchor instead of an old global view anchor':'detached durable position restore'),{timeout:3000},async()=>{
 const globals=Object.fromEntries(['document','chrome','window','scrollY','scrollTo','__topicCompletion'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),originalOpen=TopicController.prototype.open,originalRestore=TopicController.prototype.restorePosition,observed=Object.fromEntries(['topicAnchor','rememberView','readRefresh','createTopicReader'].map(k=>[k,TopicController.prototype[k]]));
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',replaceChildren(){},classList:{toggle(){}}});return nodes.get(id);};
 const refresh=deferred(),read=deferred(),restore=deferred(),events=[];let ready=false;
 const anchor={id:'entry',top:-46,text:{revision:2,offset:160,top:140}};
 const owner={id:null,view:'original',readingSort:'asc',homePositions:new Map([['topic',{sort:'asc'}]]),timelinePositions:new Map(),lastSections:new Map([['topic','selected-section']]),aiTopics:new Map(),aiViewSession:{view:()=> 'original',position:()=>({scroll:0,anchor:withAnchor?anchor:null})},rememberView(){},saveHomePosition(){},leave:async()=>true,clearActionFeedback(){},onOpen(){ready=true;},restoreContent(){},refresh:async function(){await refresh.promise;this.originalPane={};this.topicReader={scopeSectionId:'selected-section',positionRestored:withAnchor,restoreAnchor(){throw Error('a completed scoped restore must not replay a stale global view anchor');}};if(withAnchor)events.push('section-anchor');},topicAnchorEntry:()=>({revision:2,saved:{body:'synthetic'}}),schedulePosition(){}};
 globalThis.document={getElementById:get};globalThis.scrollY=0;globalThis.scrollTo=()=>events.push('scroll');globalThis.window={scrollTo,scrollBy(){}};globalThis.chrome={runtime:{sendMessage:()=>read.promise}};
 // The detached restore body is controlled; production open and its actual request stay intact.
 TopicController.prototype.restorePosition=async function(){events.push('restore-start');await restore.promise;events.push('restore-end');};owner.restorePosition=function(...args){return TopicController.prototype.restorePosition.apply(this,args);};
 try{observer(TopicController);const pending=TopicController.prototype.open.call(owner,'topic',{sectionId:'selected-section'});await Promise.resolve();
  assert.equal(owner.activeSectionId,'selected-section','the observer preserves exact explicit Section options');
  assert.equal(ready,true,'the old route/workspace signal is already ready');
  const complete=()=>__topicCompletion.current.completed&&__topicCompletion.current.pending===0&&!__topicCompletion.current.failed;
  assert.equal(complete(),false,'early ready cannot satisfy restoration completion');
  let settled=false;pending.then(()=>{settled=true;});refresh.resolve();await new Promise(r=>setImmediate(r));assert.equal(settled,false,'open owns its actual position read');assert.equal(complete(),false,'the actual position read is still pending');
  read.resolve({ok:true,data:{entryId:'entry',offset:160}});await new Promise(r=>setImmediate(r));
  if(withAnchor){await pending;assert.equal(settled,true);assert.deepEqual(events,['section-anchor']);assert.equal(complete(),true);}
  else{assert.deepEqual(events,['scroll','restore-start']);assert.equal(complete(),false,'read completion cannot outrun asynchronous restoration');assert.equal(settled,false,'open owns asynchronous restoration');restore.resolve();await pending;assert.equal(settled,true);assert.equal(complete(),true);assert.deepEqual(events,['scroll','restore-start','restore-end']);}
 }finally{refresh.resolve();read.resolve({ok:true,data:null});restore.resolve();await new Promise(r=>setImmediate(r));TopicController.prototype.open=originalOpen;TopicController.prototype.restorePosition=originalRestore;Object.assign(TopicController.prototype,observed);for(const [k,d]of Object.entries(globals))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}
});
