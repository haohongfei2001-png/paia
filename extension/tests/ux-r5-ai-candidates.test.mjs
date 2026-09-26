import test from 'node:test';
import assert from 'node:assert/strict';
import {append,completeFixture,meta,rows,response} from './harness/original-complete.mjs';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AIPresentationRunner,aiPresentationStatus,editAIPresentation,aiPresentationRevisions} from '../core/organizer/ai-presentation.js';
import {aiCandidateKey} from '../core/organizer/ai-candidate.js';
import {AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';
import {BackupService} from '../core/backup-service.js';

const action=()=>({userActionId:crypto.randomUUID()});
async function fixture(){
 const f=await completeFixture({texts:['第一阶段：先保留原话，再做整理。']});await f.runner.wake(action());let calls=0;
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{calls++;const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'AI 摘要 '+calls,currentView:'AI 当前理解 '+calls,...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});}});
 return {...f,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials}),calls:()=>calls};
}
async function addDelta(f,text='第二阶段：新增一条明确材料。',id='ux-r5-added'){await append(f.s,text,id);await f.runner.wake(action());}
async function candidateAfterUpdate(f,{protect=false}={}){
 assert.equal((await f.ai.wake(action())).completed,true);let topic=(await aiPresentationStatus(f.s)).topics[0];
 if(protect){await editAIPresentation(f.s,{topicId:topic.topicId,field:'currentView',value:'人工维护的当前理解',expectedRevision:topic.presentation.revision,operationId:crypto.randomUUID()});}
 await addDelta(f);assert.equal((await f.ai.wake(action())).completed,true);return (await aiPresentationStatus(f.s)).topics[0];
}
async function exportBackup(store){const service=new BackupService(store,{appVersion:'0.12.0'}),{sessionId,header}=await service.beginExport(),items=[header];let sequence=0;for(;;){const page=await service.exportPage({sessionId,sequence:sequence++});items.push(...page.items);if(page.done)break;}return items;}
async function restoreBackup(store,items){const service=new BackupService(store,{appVersion:'0.12.0'}),{sessionId}=await service.beginRestore();for(let i=0;i<items.length;i+=30)await service.stageRestore({sessionId,items:items.slice(i,i+30)});const preview=await service.previewRestore({sessionId});assert.equal(preview.canRestore,true,JSON.stringify(preview));return service.restore({sessionId,confirmation:preview.integrity});}
const decisions=(candidate,overrides={})=>Object.fromEntries(candidate.changedFields.map(field=>[field,overrides[field]||'keep']));

test('UX-R5 update always prepares a candidate and never replaces the currently readable presentation',async()=>{
 const f=await fixture(),topic=await candidateAfterUpdate(f);assert.equal(topic.presentation.blockSummary,'AI 摘要 1');assert.equal(topic.presentation.currentView,'AI 当前理解 1');assert.ok(topic.candidate);assert.equal(topic.candidate.stale,false);assert.equal(topic.candidate.proposal.blockSummary,'AI 摘要 2');assert.equal(topic.candidate.proposal.currentView,'AI 当前理解 2');assert.equal(topic.pending,false);assert.equal(f.calls(),2);
});

test('UX-R5 candidate choices are staged and one atomic save adopts selected sections while protecting kept sections',async()=>{
 const f=await fixture();let topic=await candidateAfterUpdate(f,{protect:true}),revision=topic.presentation.revision,candidate=topic.candidate;assert.ok(candidate);
 const partial={blockSummary:'adopt'};await assert.rejects(()=>editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:revision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:partial,operationId:crypto.randomUUID()}),error=>error?.code==='INVALID_OUTPUT');
 topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.presentation.revision,revision);assert.ok(topic.candidate);assert.equal(topic.presentation.blockSummary,'AI 摘要 1');assert.equal(topic.presentation.currentView,'人工维护的当前理解');
 const full=decisions(candidate,{blockSummary:'adopt',currentView:'keep'}),saved=await editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:revision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:full,operationId:crypto.randomUUID()});assert.equal(saved.revision,revision+1);
 topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.candidate,null);assert.equal(topic.presentation.blockSummary,'AI 摘要 2');assert.equal(topic.presentation.currentView,'人工维护的当前理解');assert.equal(topic.presentation.protections.blockSummary,true);assert.equal(topic.presentation.protections.currentView,true);assert.equal(f.calls(),2);assert.deepEqual((await aiPresentationRevisions(f.s,{topicId:topic.topicId})).items.map(row=>row.actor),['ai','user','user']);
});

test('UX-R5 candidate save fails closed when the current draft or Topic material changes during comparison',async()=>{
 const f=await fixture();let topic=await candidateAfterUpdate(f,{protect:true}),candidate=topic.candidate,revision=topic.presentation.revision,full=decisions(candidate,{blockSummary:'adopt',currentView:'keep'});
 await editAIPresentation(f.s,{topicId:topic.topicId,field:'blockSummary',value:'比较期间人工修改',expectedRevision:revision,operationId:crypto.randomUUID()});topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.candidate.stale,true);await assert.rejects(()=>editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:topic.presentation.revision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:full,operationId:crypto.randomUUID()}),error=>error?.code==='STALE_BASE');
 assert.equal(topic.presentation.blockSummary,'比较期间人工修改');await addDelta(f,'第三阶段：比较期间材料又变化。','ux-r5-third');topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.candidate.stale,true);assert.equal(f.calls(),2);
});

test('UX-R5 purging candidate-only evidence removes the candidate while preserving the current presentation',async()=>{
 const f=await fixture(),topic=await candidateAfterUpdate(f),fences=await rows(f.s,'libraryMigrationItems'),candidateFence=fences.find(row=>row.ownerKind==='ai_presentation_candidate'&&row.ownerId===topic.topicId),currentFence=fences.find(row=>row.ownerKind==='ai_presentation'&&row.ownerId===topic.topicId);assert.ok(candidateFence);assert.ok(currentFence);const currentSources=new Set(currentFence.sourceRecordIds||[]),candidateOnly=(candidateFence.sourceRecordIds||[]).find(id=>!currentSources.has(id));assert.ok(candidateOnly);await f.s.permanentDelete(candidateOnly);await f.s.drainPurgeCleanup();const stored=await meta(f.s,'aiPresentation:'+topic.topicId);assert.ok(stored);assert.equal(stored.candidate,undefined);const after=(await aiPresentationStatus(f.s)).topics[0];assert.ok(after.presentation);assert.equal(after.presentation.blockSummary,'AI 摘要 1');assert.equal(after.candidate,null);
});

test('UX-R5 Backup round-trip preserves a valid candidate without changing the current draft',async()=>{
 const f=await fixture(),before=await candidateAfterUpdate(f,{protect:true}),items=await exportBackup(f.s),target=await completeFixture({texts:[]});await restoreBackup(target.s,items);const after=(await aiPresentationStatus(target.s)).topics.find(row=>row.topicId===before.topicId);assert.ok(after?.presentation);assert.ok(after.candidate);assert.equal(after.presentation.currentView,'人工维护的当前理解');assert.equal(after.presentation.blockSummary,'AI 摘要 1');assert.equal(after.candidate.proposal.blockSummary,'AI 摘要 2');assert.equal(after.candidate.stale,false);assert.equal(target.requests.length,0);
});

test('UX-R5 no-delta update and status reads spend zero additional provider requests',async()=>{
 const f=await fixture();assert.equal((await f.ai.wake(action())).completed,true);const before=f.calls();await aiPresentationStatus(f.s);await aiPresentationStatus(f.s);const result=await f.ai.wake(action());assert.equal(result.noDelta,true);assert.equal(result.requestCount,0);assert.equal(f.calls(),before);
});

test('VS-05 saving choices fences the reviewed candidate even when current work revision is unchanged',async()=>{
 const f=await fixture(),before=await candidateAfterUpdate(f,{protect:true}),candidate=before.candidate,key=aiCandidateKey(candidate),full=decisions(candidate,{blockSummary:'adopt',currentView:'keep'}),operationId=crypto.randomUUID();
 const currentId='aiPresentation:'+before.topicId,stored=await meta(f.s,currentId);
 // Model another window finishing a new proposal after the first comparison.
 // Material and current-work revision remain identical: neither older fence detects it.
 const replacement=structuredClone(stored.candidate);replacement.proposal.blockSummary='另一窗口的未核对候选';
 await f.s.foundationWrite(t=>t.put('meta',{...stored,candidate:replacement}));
 const reviewed=(await aiPresentationStatus(f.s)).topics[0];assert.equal(reviewed.candidate.stale,false);assert.equal(reviewed.presentation.revision,before.presentation.revision);assert.notEqual(aiCandidateKey(reviewed.candidate),key);
 const revisions=await aiPresentationRevisions(f.s,{topicId:before.topicId}),receipts=await rows(f.s,'operationReceipts');
 for(const expectedCandidateKey of [undefined,'',key])await assert.rejects(()=>editAIPresentation(f.s,{topicId:before.topicId,expectedRevision:before.presentation.revision,expectedCandidateKey,candidateDecisions:full,operationId}),error=>error?.code==='STALE_BASE');
 assert.deepEqual(await meta(f.s,currentId),{...stored,candidate:replacement});assert.deepEqual(await aiPresentationRevisions(f.s,{topicId:before.topicId}),revisions);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);
 const request={topicId:before.topicId,expectedRevision:before.presentation.revision,expectedCandidateKey:aiCandidateKey(reviewed.candidate),candidateDecisions:full,operationId};
 const saved=await editAIPresentation(f.s,request);assert.equal(saved.revision,before.presentation.revision+1);assert.deepEqual(await editAIPresentation(f.s,request),saved);
 const after=(await aiPresentationStatus(f.s)).topics[0];assert.equal(after.presentation.blockSummary,'另一窗口的未核对候选');assert.equal(after.presentation.currentView,before.presentation.currentView);assert.equal(after.candidate,null);assert.equal(f.calls(),2);
});

async function chunkFixture(count){
 const f=await completeFixture({texts:Array.from({length:count},(_,i)=>'同一主题的独立表达 '+i),batchLimit:20});
 // Original has its own bounded 20-input contract: finish every captured expression before AI synthesis.
 for(let i=0;i<Math.ceil(count/20);i++){const result=await f.runner.wake(action());assert.equal(result.error,undefined,JSON.stringify(result));}
 assert.equal((await rows(f.s,'thoughts')).length,count);const requests=[];
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{
  const request=JSON.parse(JSON.parse(init.body).messages[1].content);requests.push(request);
  const existing=JSON.parse(request.context.find(row=>row.ref==='existing-presentation')?.text||'null'),ids=[...new Set([...(existing?.evidenceEntryIds||[]),...request.inputs.map(row=>row.ref)])];
  return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'保留 '+ids.length+' 条独立表达',currentView:'当前综合涵盖 '+ids.length+' 条表达',...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:ids})}}]});
 }});
 await aiPresentationStatus(f.s);assert.equal(requests.length,0);
 return {...f,requestsAI:requests,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials})};
}

test('VS-05 three bounded AI chunks accumulate in the candidate without losing middle-batch evidence',async()=>{
 const f=await chunkFixture(24),original=await Promise.all(['thoughts','records','inputStates','topics','placements'].map(name=>rows(f.s,name)));
 for(let i=0;i<3;i++)assert.equal((await f.ai.wake(action())).completed,true);
 assert.deepEqual(f.requestsAI.map(request=>request.inputs.length),[8,8,8]);
 assert.deepEqual(f.requestsAI.map(request=>JSON.parse(request.context.find(row=>row.ref==='existing-presentation')?.text||'null')?.evidenceEntryIds.length||0),[0,8,16]);
 const topic=(await aiPresentationStatus(f.s)).topics[0],all=(await rows(f.s,'thoughts')).map(row=>row.id).sort();
 assert.equal(topic.pending,false);assert.equal(topic.candidate.stale,false);assert.equal(topic.presentation.evidenceEntryIds.length,8);assert.equal(topic.presentation.currentView,'当前综合涵盖 8 条表达');
 assert.deepEqual([...topic.candidate.proposal.evidenceEntryIds].sort(),all);
 assert.deepEqual(await Promise.all(['thoughts','records','inputStates','topics','placements'].map(name=>rows(f.s,name))),original);
 const choices=Object.fromEntries(topic.candidate.changedFields.map(field=>[field,'adopt']));
 await editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:topic.presentation.revision,expectedCandidateKey:aiCandidateKey(topic.candidate),candidateDecisions:choices,operationId:crypto.randomUUID()});
 const after=(await aiPresentationStatus(f.s)).topics[0];assert.deepEqual([...after.presentation.evidenceEntryIds].sort(),all);assert.equal(after.presentation.currentView,'当前综合涵盖 24 条表达');assert.equal(after.presentation.revision,topic.presentation.revision+1);
 assert.equal((await f.ai.wake(action())).noDelta,true);assert.equal(f.requestsAI.length,3);
});

test('VS-05 material changes recheck unaccepted candidate coverage rather than silently acknowledging it',async()=>{
 const f=await chunkFixture(16);await f.ai.wake(action());await f.ai.wake(action());let topic=(await aiPresentationStatus(f.s)).topics[0];
 assert.equal(topic.pending,false);assert.equal(topic.candidate.proposal.evidenceEntryIds.length,16);assert.equal(topic.presentation.evidenceEntryIds.length,8);
 await append(f.s,'同一主题的新表达：需要与已有未采用材料一起重新核对。','candidate-midstream-added');await f.runner.wake(action());
 topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.candidate.stale,true);assert.equal(topic.pendingEntryCount,9);
 assert.equal((await f.ai.wake(action())).completed,true);assert.equal((await f.ai.wake(action())).completed,true);
 topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.pending,false);assert.equal(topic.candidate.stale,false);
 const all=(await rows(f.s,'thoughts')).map(row=>row.id).sort();assert.equal(all.length,17);assert.deepEqual([...topic.candidate.proposal.evidenceEntryIds].sort(),all);assert.equal(topic.presentation.currentView,'当前综合涵盖 8 条表达');
 assert.deepEqual(f.requestsAI.map(request=>request.inputs.length),[8,8,8,1]);
 const choices=Object.fromEntries(topic.candidate.changedFields.map(field=>[field,'keep']));
 await editAIPresentation(f.s,{topicId:topic.topicId,expectedRevision:topic.presentation.revision,expectedCandidateKey:aiCandidateKey(topic.candidate),candidateDecisions:choices,operationId:crypto.randomUUID()});
 const stored=await meta(f.s,'aiPresentation:'+topic.topicId);assert.equal(Object.keys(stored.basedOnCheckpoint.entryVersions).length,17);assert.equal(stored.currentView,'当前综合涵盖 8 条表达');assert.equal(stored.candidate,undefined);
 assert.equal((await f.ai.wake(action())).noDelta,true);assert.equal(f.requestsAI.length,4);
});
