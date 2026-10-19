import {reviewAndAdoptFirstAI} from './harness/ai-reviewed.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,meta,response} from './harness/original-complete.mjs';
import {DeepSeekOrganizerProvider} from './harness/historical-provider.mjs';
import {AIPresentationRunner,aiPresentationStatus} from '../core/organizer/ai-presentation.js';
import {AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';
import {request,statusLabel} from '../ui/common.js';
import {createConfiguredOrganizeRunner} from '../core/organizer/configured-organize-runner.js';
import {safeErrorCode} from '../core/constants.js';

const action=()=>({userActionId:crypto.randomUUID()});
async function fixture({defer=false}={}){const f=await completeFixture({texts:['R5 状态机：切换阅读视图本身不应调用 AI。']});await f.runner.wake(action());let calls=0,release;const gate=defer?new Promise(resolve=>{release=resolve;}):null;const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{calls++;if(gate)await gate;const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'R5 状态摘要',currentView:'R5 当前理解',...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});}});return {...f,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials}),calls:()=>calls,release};}

test('Historical AI state compatibility: cached status reads and no-delta checks make zero additional provider requests',async()=>{const f=await fixture();assert.equal((await reviewAndAdoptFirstAI(f.ai,action())).completed,true);const before=f.calls();const first=await aiPresentationStatus(f.s),second=await aiPresentationStatus(f.s);assert.ok(first.topics[0].presentation);assert.ok(second.topics[0].presentation);assert.equal(f.calls(),before);const noDelta=await reviewAndAdoptFirstAI(f.ai,action());assert.equal(noDelta.noDelta,true);assert.equal(noDelta.requestCount,0);assert.equal(f.calls(),before);});

test('Historical AI state compatibility: runner remains single-flight while one explicit paid request is in progress',async()=>{const f=await fixture({defer:true}),first=reviewAndAdoptFirstAI(f.ai,action());for(let i=0;i<50&&f.calls()===0;i++)await new Promise(resolve=>setTimeout(resolve,2));assert.equal(f.calls(),1);const second=await reviewAndAdoptFirstAI(f.ai,action());assert.equal(second.error,'REQUEST_ALREADY_IN_FLIGHT');assert.equal(f.calls(),1);f.release();assert.equal((await first).completed,true);assert.equal(f.calls(),1);});

test('Historical AI state compatibility: interrupted sent request becomes outcome_unknown and never exposes automatic retry',async()=>{
 const f=await fixture(),requestId=crypto.randomUUID();
 await f.s.foundationWrite(async t=>{await t.put('meta',{id:'aiPresentationRequestCurrent',requestId});await t.put('meta',{id:'aiPresentationRequest:'+requestId,requestId,state:'sent',phase:'fetch_started',requestCount:1});});
 await f.ai.reconcileInterrupted();
 const row=await meta(f.s,'aiPresentationRequest:'+requestId);
 assert.equal(row.state,'outcome_unknown');assert.equal(row.errorCode,'OUTCOME_UNKNOWN');
 const before=f.calls();await aiPresentationStatus(f.s);await aiPresentationStatus(f.s);assert.equal(f.calls(),before);
 // The current UI command now reaches the original worker-owned configured
 // runner. Only Chrome's message envelope is synthetic; the default-deny
 // service error must come from that production owner, not a canned response.
 const current=createConfiguredOrganizeRunner(f.s),messages=[],previous=new Map(['chrome','fetch'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));let network=0;
 assert.equal(current.available(),false,'the packaged service configuration remains unavailable');
 Object.defineProperty(globalThis,'chrome',{configurable:true,writable:true,value:{runtime:{sendMessage:async message=>{
  messages.push(structuredClone(message));assert.deepEqual(message,{type:'UPDATE_AI_PRESENTATION'});
  try{return {ok:true,data:await current.handle(message)};}
  catch(error){return {ok:false,error:safeErrorCode(error),phase:'message_handler'};}
 }}}});
 Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async()=>{network++;throw Error('unexpected network');}});
 try{
  await assert.rejects(request('UPDATE_AI_PRESENTATION'),{code:'AI_SERVICE_UNAVAILABLE'});
  assert.match(statusLabel('AI_SERVICE_UNAVAILABLE'),/尚未上线/);
  assert.equal(f.calls(),before,'a current UI launch cannot retry the historical request');
  assert.deepEqual(messages,[{type:'UPDATE_AI_PRESENTATION'}],'exactly one UI message reaches the current owner');
  assert.equal(network,0,'the unavailable current owner cannot dispatch a replacement');
  assert.deepEqual(await meta(f.s,'aiPresentationRequest:'+requestId),row,'the original unknown attempt remains intact');
  assert.deepEqual(await meta(f.s,'aiPresentationRequestCurrent'),{id:'aiPresentationRequestCurrent',requestId},'the original historical request identity is retained');
 }finally{for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
});
