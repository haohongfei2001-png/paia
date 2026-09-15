import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,meta,response} from './harness/original-complete.mjs';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AIPresentationRunner,aiPresentationStatus} from '../core/organizer/ai-presentation.js';
import {AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';
import {actionFailure} from '../ui/action-feedback.js';

const action=()=>({userActionId:crypto.randomUUID()});
async function fixture({defer=false}={}){const f=await completeFixture({texts:['R5 状态机：切换阅读视图本身不应调用 AI。']});await f.runner.wake(action());let calls=0,release;const gate=defer?new Promise(resolve=>{release=resolve;}):null;const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{calls++;if(gate)await gate;const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'R5 状态摘要',currentView:'R5 当前理解',...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});}});return {...f,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials}),calls:()=>calls,release};}

test('UX-R5 cached status reads and no-delta checks make zero additional provider requests',async()=>{const f=await fixture();assert.equal((await f.ai.wake(action())).completed,true);const before=f.calls();const first=await aiPresentationStatus(f.s),second=await aiPresentationStatus(f.s);assert.ok(first.topics[0].presentation);assert.ok(second.topics[0].presentation);assert.equal(f.calls(),before);const noDelta=await f.ai.wake(action());assert.equal(noDelta.noDelta,true);assert.equal(noDelta.requestCount,0);assert.equal(f.calls(),before);});

test('UX-R5 runner remains single-flight while one explicit paid request is in progress',async()=>{const f=await fixture({defer:true}),first=f.ai.wake(action());for(let i=0;i<50&&f.calls()===0;i++)await new Promise(resolve=>setTimeout(resolve,2));assert.equal(f.calls(),1);const second=await f.ai.wake(action());assert.equal(second.error,'REQUEST_ALREADY_IN_FLIGHT');assert.equal(f.calls(),1);f.release();assert.equal((await first).completed,true);assert.equal(f.calls(),1);});

test('UX-R5 interrupted sent request becomes outcome_unknown and never exposes automatic retry',async()=>{const f=await fixture(),requestId=crypto.randomUUID();await f.s.foundationWrite(async t=>{await t.put('meta',{id:'aiPresentationRequestCurrent',requestId});await t.put('meta',{id:'aiPresentationRequest:'+requestId,requestId,state:'sent',phase:'fetch_started',requestCount:1});});await f.ai.reconcileInterrupted();const row=await meta(f.s,'aiPresentationRequest:'+requestId);assert.equal(row.state,'outcome_unknown');assert.equal(row.errorCode,'OUTCOME_UNKNOWN');const before=f.calls();await aiPresentationStatus(f.s);await aiPresentationStatus(f.s);assert.equal(f.calls(),before);const feedback=actionFailure('OUTCOME_UNKNOWN',{});assert.equal(feedback.retry,false);assert.match(feedback.text,/不会自动重试/);});
