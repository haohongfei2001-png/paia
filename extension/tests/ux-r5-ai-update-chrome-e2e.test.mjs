import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,savedRow,editSaved,refusedAI,setAIView,noApproval,quiet} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';
test('UX-R5 ON-02 candidate approvals are unavailable while Current edits and stale-version protection remain',{timeout:150000},async()=>{
 const f=await fixture('source',{candidate:true});try{
  const {p,topic}=f;await setAIView(p,true);const before=await savedRow(p,topic.id);
  assert.equal(await p.locator('#ai-reading-body [data-ai-candidate]').count(),0,'a full-Topic candidate is not presented as the selected Section');
  const review=async()=>{await p.locator('[data-topic-candidate-review]').click();const panel=p.locator('#library-dialog[open] [data-ai-candidate]');await panel.waitFor();assert.equal(await p.locator('#library-dialog-title').textContent(),'主题级已保存候选');await noApproval(p);return panel;};
  let panel=await review();assert.match(await panel.textContent(),/候选仅供阅读/);assert.equal(await panel.locator('[data-ai-candidate-field="blockSummary"] [data-candidate-version="proposal"] .entry-prose').textContent(),before.candidate.proposal.blockSummary);assert.deepEqual(await savedRow(p,topic.id),before,'opening the original review dialog never adopts or edits a candidate');await p.locator('#library-dialog-close').click();
  const after=await editSaved(f);assert.deepEqual(after.candidate,before.candidate);assert.notEqual(after.blockSummary,before.candidate.proposal.blockSummary);
  panel=await review();await eventually(()=>panel.getAttribute('data-candidate-state').then(state=>state==='stale'),'the original qualified review marks the old candidate stale after a human Current edit');assert.equal(await panel.locator('[data-ai-candidate-field="blockSummary"] [data-candidate-version="current"] .entry-prose').textContent(),after.blockSummary);assert.equal(await panel.locator('[data-ai-candidate-field="blockSummary"] [data-candidate-version="proposal"] .entry-prose').textContent(),before.candidate.proposal.blockSummary);await p.locator('#library-dialog-close').click();
  await refusedAI(p,topic.id);await quiet(f.h);
 }finally{await f.h.close();}
});
