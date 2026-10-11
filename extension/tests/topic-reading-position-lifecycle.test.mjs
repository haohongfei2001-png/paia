import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {completeFixture,rows} from './harness/original-complete.mjs';

const allRows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function fixture({hold=false}={}){
 const f=await completeFixture(),topic=await f.s.createTopic({name:'SYNTHETIC old reading owner',operationId:crypto.randomUUID()}),other=await f.s.createTopic({name:'SYNTHETIC next reading owner',operationId:crypto.randomUUID()}),entry=await f.s.continueThinking({operationId:crypto.randomUUID(),body:'SYNTHETIC unchanged expression',topicId:topic.id}),row=await f.s.entry(entry.id);
 const savedGlobals=Object.fromEntries(['document','chrome','innerHeight'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),calls=[];let release,committed;
 const gate=new Promise(resolve=>release=resolve),positionCommitted=new Promise(resolve=>committed=resolve);
 const element={getBoundingClientRect:()=>({top:150,bottom:200,left:10}),closest:()=>({dataset:{entryId:entry.id}})},owner={id:topic.id,serial:17,openIntent:23,view:'original',readingSort:'asc',editor:{dirty:()=>false,saving:false,entry:{entries:new Map([[entry.id,{revision:row.revision}]])}}};
 globalThis.document={hidden:false,documentElement:{lang:'zh-CN'},querySelector:()=>null,getElementById:id=>id==='topic-body'?{querySelectorAll:()=>[element]}:null};globalThis.innerHeight=900;
 globalThis.chrome={runtime:{async sendMessage(message){calls.push(structuredClone(message));try{if(message.type==='THOUGHT_POSITION'){const data=await f.s.topicPosition(message.position);committed();if(hold)await gate;return {ok:true,data};}if(message.type==='RECORD_TOPIC_READ')return {ok:true,data:await f.s.recordTopicRead(message.id)};throw Error('Unexpected request');}catch(error){return {ok:false,error:error.code||'UNAVAILABLE'};}}}};
 return {...f,owner,topic,other,calls,positionCommitted,release,run:()=>TopicController.prototype.rememberPosition.call(owner),async close(){for(const [key,descriptor]of Object.entries(savedGlobals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];await f.s.repository.close();}};
}
for(const change of ['leave','other-topic','same-topic-serial','same-topic-open-intent'])test('original reading-position completion does not record a later route: '+change,async()=>{
 const f=await fixture({hold:true});try{const oldTopics=await rows(f.s,'topics'),pending=f.run();await f.positionCommitted;const afterPosition=await allRows(f.s);assert.equal((await f.s.topicPosition({topicId:f.topic.id})).entryId,f.calls[0].position.entryId,'the old position was genuinely committed');
  if(change==='leave')f.owner.id=null;else if(change==='other-topic')f.owner.id=f.other.id;else if(change==='same-topic-serial')f.owner.serial++;else f.owner.openIntent++;
  f.release();await pending;assert.deepEqual(f.calls.map(c=>c.type),['THOUGHT_POSITION']);assert.deepEqual(await allRows(f.s),afterPosition,'stale completion performs no second write in any original store');assert.deepEqual(await rows(f.s,'topics'),oldTopics,'neither old nor new Topic gains a fabricated read');assert.equal(f.requests.length,0);
 }finally{f.release();await f.close();}
});
test('the original active reading route records its exact position and Topic once',async()=>{
 const f=await fixture();try{const source=await rows(f.s,'records');await f.run();assert.deepEqual(f.calls.map(c=>c.type),['THOUGHT_POSITION','RECORD_TOPIC_READ']);assert.equal(f.calls[0].position.topicId,f.topic.id);assert.equal(f.calls[1].id,f.topic.id);assert.equal((await f.s.topicPosition({topicId:f.topic.id})).entryId,f.calls[0].position.entryId);const current=await f.s.topic(f.topic.id),other=await f.s.topic(f.other.id);assert.equal(current.readingActivity.weight,1);assert.equal(other.readingActivity,undefined);assert.deepEqual(await rows(f.s,'records'),source);assert.equal(f.requests.length,0);
 }finally{await f.close();}
});
test('an actual invalid current-route position remains observable and is never retried or recorded',async()=>{
 const f=await fixture();try{f.owner.readingSort='invalid';const before=await allRows(f.s);await assert.rejects(f.run(),error=>error.code==='INVALID_REQUEST');assert.deepEqual(f.calls.map(c=>c.type),['THOUGHT_POSITION']);assert.deepEqual(await allRows(f.s),before);assert.equal(f.requests.length,0);
 }finally{await f.close();}
});
