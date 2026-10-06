import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,savedRow,editSaved,refusedAI,setAIView,noApproval,quiet} from './harness/consumer-ai-browser.mjs';
test('UX-R5 ON-02 candidate approvals are unavailable while Current edits and stale-version protection remain',{timeout:150000},async()=>{
 const f=await fixture('source',{candidate:true});try{await setAIView(f.p,true);await f.p.locator('[data-ai-candidate]').waitFor();const before=await savedRow(f.p,f.topic.id);await noApproval(f.p);const after=await editSaved(f);assert.deepEqual(after.candidate,before.candidate);assert.notEqual(after.blockSummary,before.candidate.proposal.blockSummary);await refusedAI(f.p,f.topic.id);await quiet(f.h);}finally{await f.h.close();}
});
