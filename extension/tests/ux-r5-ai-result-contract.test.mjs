import test from 'node:test';
import assert from 'node:assert/strict';
import {append,completeFixture,meta,rows,response} from './harness/original-complete.mjs';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AIPresentationRunner,aiPresentationStatus,aiPresentationRevisions} from '../core/organizer/ai-presentation.js';
import {AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';

const action=()=>({userActionId:crypto.randomUUID()});
async function fixture(){
 const f=await completeFixture({texts:['合成恢复用例：原话与提交结果必须一致。']});await f.runner.wake(action());let calls=0;
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{
  calls++;const request=JSON.parse(JSON.parse(init.body).messages[1].content);
  return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'合成摘要 '+calls,currentView:'合成理解 '+calls,...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});
 }});
 return {...f,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials}),calls:()=>calls};
}
async function committedRequest(s){const pointer=await meta(s,'aiPresentationRequestCurrent');return meta(s,'aiPresentationRequest:'+pointer.requestId);}
async function receiptFor(s,request){return (await rows(s,'operationReceipts')).find(row=>row.id==='ai-presentation:'+request.requestId);}

test('UX-R5 first generation returns success only after the matching request and receipt commit',async()=>{
 const f=await fixture(),requestAction=action(),result=await f.ai.wake(requestAction),state=await aiPresentationStatus(f.s),topic=state.topics[0],request=await committedRequest(f.s),receipt=await receiptFor(f.s,request);
 assert.deepEqual(result,{completed:true,requestCount:1,topicId:topic.topicId,candidateCreated:false});
 assert.equal(request.state,'committed');assert.equal(request.phase,'completed');assert.equal(request.candidateCreated,false);assert.equal(request.errorCode,undefined);
 assert.deepEqual(receipt.result,{committed:1,candidateCreated:false,revision:topic.presentation.revision});assert.equal(topic.candidate,null);assert.equal(f.calls(),1);
 const repeated=await f.ai.wake(requestAction);assert.equal(repeated.completed,true);assert.equal(repeated.noDelta,true);assert.equal(repeated.requestCount,0);assert.equal(f.calls(),1,'a committed result must not cause another paid request');
});

test('UX-R5 candidate success agrees with durable outcome without silently advancing the current draft',async()=>{
 const f=await fixture();assert.equal((await f.ai.wake(action())).completed,true);const before=(await aiPresentationStatus(f.s)).topics[0];
 await append(f.s,'合成恢复用例：本次新增材料只准备候选。','recovery-result-delta');await f.runner.wake(action());
 const result=await f.ai.wake(action()),topic=(await aiPresentationStatus(f.s)).topics[0],request=await committedRequest(f.s),receipt=await receiptFor(f.s,request);
 assert.deepEqual(result,{completed:true,requestCount:1,topicId:topic.topicId,candidateCreated:true});assert.equal(request.state,'committed');assert.equal(request.candidateCreated,true);
 assert.deepEqual(receipt.result,{committed:1,candidateCreated:true,revision:before.presentation.revision});assert.equal(topic.presentation.revision,before.presentation.revision);assert.equal(topic.presentation.blockSummary,before.presentation.blockSummary);assert.equal(topic.presentation.currentView,before.presentation.currentView);assert.equal(topic.candidate.proposal.blockSummary,'合成摘要 2');assert.equal(topic.candidate.stale,false);
 assert.deepEqual((await aiPresentationRevisions(f.s,{topicId:topic.topicId})).items.map(row=>row.actor),['ai']);
 const noDelta=await f.ai.wake(action());assert.equal(noDelta.completed,true);assert.equal(noDelta.noDelta,true);assert.equal(noDelta.requestCount,0);assert.equal(f.calls(),2);
});

test('UX-R5 transaction abort never returns completed or leaves a successful receipt, revision or checkpoint',async()=>{
 const f=await fixture(),before=await rows(f.s,'records'),write=f.s.foundationWrite.bind(f.s);
 f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=(name,row)=>{if(name==='operationReceipts'&&row.namespace==='ai-presentation')throw Object.assign(new Error('synthetic transaction abort'),{code:'STORAGE_FAILED'});return put(name,row);};return fn(t);});
 const result=await f.ai.wake(action());assert.equal(result.error,'STORAGE_FAILED');assert.equal(Object.hasOwn(result,'completed'),false);assert.equal(result.requestCount,1);
 const request=await committedRequest(f.s);assert.equal(request.state,'failed');assert.equal(await receiptFor(f.s,request),undefined);assert.equal(await meta(f.s,'aiOrganizerCheckpoint'),undefined);assert.equal((await rows(f.s,'revisions')).filter(row=>row.kind==='ai_presentation').length,0);assert.deepEqual(await rows(f.s,'records'),before);
 assert.equal((await aiPresentationStatus(f.s)).topics[0].presentation,null);assert.equal(f.calls(),1,'status reads must not retry a failed provider operation');
});
