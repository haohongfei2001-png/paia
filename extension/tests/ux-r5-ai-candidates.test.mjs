import test from 'node:test';
import assert from 'node:assert/strict';
import {append,completeFixture,meta,rows,response} from './harness/original-complete.mjs';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AIPresentationRunner,aiPresentationStatus,editAIPresentation,aiPresentationRevisions} from '../core/organizer/ai-presentation.js';
import {AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';

const action=()=>({userActionId:crypto.randomUUID()});

async function fixture(){
 const f=await completeFixture({texts:['第一阶段：先保留原话，再做整理。']});
 await f.runner.wake(action());
 let calls=0;
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{
  calls++;
  const request=JSON.parse(JSON.parse(init.body).messages[1].content);
  return response({choices:[{message:{content:JSON.stringify({
   topicId:request.topicCandidates[0].id,
   blockSummary:'AI 摘要 '+calls,
   currentView:'AI 当前理解 '+calls,
   ...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),
   evidenceEntryIds:request.inputs.map(row=>row.ref)
  })}}]});
 }});
 return {...f,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials}),calls:()=>calls};
}

async function protectAndAddDelta(f){
 await f.ai.wake(action());
 let state=await aiPresentationStatus(f.s),presentation=state.topics[0].presentation;
 await editAIPresentation(f.s,{topicId:presentation.topicId,field:'currentView',value:'人工维护的当前理解',expectedRevision:presentation.revision,operationId:crypto.randomUUID()});
 await append(f.s,'第二阶段：新增一条明确材料。','ux-r5-added');
 await f.runner.wake(action());
 assert.equal((await f.ai.wake(action())).completed,true);
 state=await aiPresentationStatus(f.s);
 return state.topics[0];
}

test('UX-R5 protected update creates a candidate and never overwrites the current human draft',async()=>{
 const f=await fixture(),topic=await protectAndAddDelta(f);
 assert.equal(topic.presentation.currentView,'人工维护的当前理解');
 assert.equal(topic.presentation.blockSummary,'AI 摘要 1');
 assert.equal(topic.pending,false);
 assert.ok(topic.candidate);
 assert.equal(topic.candidate.stale,false);
 assert.deepEqual(new Set(topic.candidate.changedFields),new Set(['blockSummary','currentView']));
 assert.equal(topic.candidate.proposal.blockSummary,'AI 摘要 2');
 assert.equal(topic.candidate.proposal.currentView,'AI 当前理解 2');
 assert.equal(f.calls(),2);
 assert.deepEqual((await aiPresentationRevisions(f.s,{topicId:topic.topicId})).items.map(row=>row.actor),['ai','user']);
});

test('UX-R5 candidate decisions adopt only the selected section and keep the rest of the human draft',async()=>{
 const f=await fixture();let topic=await protectAndAddDelta(f),revision=topic.presentation.revision;
 let result=await editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:revision,candidateDecision:{field:'blockSummary',decision:'adopt'},operationId:crypto.randomUUID()});
 assert.equal(result.candidateComplete,false);revision=result.revision;
 result=await editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:revision,candidateDecision:{field:'currentView',decision:'keep'},operationId:crypto.randomUUID()});
 assert.equal(result.candidateComplete,true);
 topic=(await aiPresentationStatus(f.s)).topics[0];
 assert.equal(topic.candidate,null);
 assert.equal(topic.presentation.blockSummary,'AI 摘要 2');
 assert.equal(topic.presentation.currentView,'人工维护的当前理解');
 assert.equal(topic.presentation.protections.blockSummary,true);
 assert.equal(topic.presentation.protections.currentView,true);
 assert.equal(f.calls(),2);
});

test('UX-R5 candidate adoption is CAS guarded against a concurrent human edit',async()=>{
 const f=await fixture();let topic=await protectAndAddDelta(f),revision=topic.presentation.revision;
 await editAIPresentation(f.s,{topicId:topic.topicId,field:'blockSummary',value:'并发人工摘要',expectedRevision:revision,operationId:crypto.randomUUID()});
 await assert.rejects(()=>editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:revision+1,candidateDecision:{field:'currentView',decision:'adopt'},operationId:crypto.randomUUID()}),error=>error?.code==='STALE_BASE');
 topic=(await aiPresentationStatus(f.s)).topics[0];
 assert.equal(topic.presentation.blockSummary,'并发人工摘要');
 assert.equal(topic.presentation.currentView,'人工维护的当前理解');
 assert.equal(topic.candidate.stale,true);
});

test('UX-R5 purging candidate-only evidence removes the candidate without deleting the current presentation',async()=>{
 const f=await fixture(),topic=await protectAndAddDelta(f),candidateFence=(await rows(f.s,'libraryMigrationItems')).find(row=>row.ownerKind==='ai_presentation_candidate'&&row.ownerId===topic.topicId);
 assert.ok(candidateFence);
 const added=(await rows(f.s,'records')).find(row=>row.sourceMessageId==='ux-r5-added');assert.ok(added);
 await f.s.permanentDelete(added.id);await f.s.drainPurgeCleanup();
 const stored=await meta(f.s,'aiPresentation:'+topic.topicId);assert.ok(stored);assert.equal(stored.candidate,undefined);
 const after=(await aiPresentationStatus(f.s)).topics[0];assert.ok(after.presentation);assert.equal(after.presentation.currentView,'人工维护的当前理解');assert.equal(after.candidate,null);
});

test('UX-R5 cached status and no-delta update never spend another provider request',async()=>{
 const f=await fixture();assert.equal((await f.ai.wake(action())).completed,true);const before=f.calls(),topic=(await aiPresentationStatus(f.s)).topics[0];assert.ok(topic.presentation);assert.equal(topic.candidate,null);
 const result=await f.ai.wake(action());assert.equal(result.noDelta,true);assert.equal(result.requestCount,0);assert.equal(f.calls(),before);
});
