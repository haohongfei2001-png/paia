import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rpc,savedRow,editSaved,refusedAI,setAIView,noApproval,quiet,screenshotMatrix} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';
test('UX-R5 saved AI keeps responsive reading, IME, local edits and stale CAS without approval or hidden requests',{timeout:240000},async()=>{
 const f=await fixture('source',{candidate:true});try{await setAIView(f.p,true);const field=f.p.locator('[data-ai-field="blockSummary"]').first();await field.waitFor();const before=await savedRow(f.p,f.topic.id);await field.dispatchEvent('compositionstart');await field.evaluate(node=>{node.textContent='SYNTHETIC 输入法尚未完成';node.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});await refusedAI(f.p,f.topic.id);assert.deepEqual(await savedRow(f.p,f.topic.id),before,'IME is never saved early');await field.dispatchEvent('compositionend');await field.press('Tab');await eventually(async()=>(await savedRow(f.p,f.topic.id)).blockSummary==='SYNTHETIC 输入法尚未完成');await editSaved(f);await screenshotMatrix(f.p,'ai-ime', 'source');await noApproval(f.p);await quiet(f.h);}finally{await f.h.close();}
});
test('UX-R5 retired Provider failure paths leave Original readable and repeated status reads never retry',{timeout:90000},async()=>{
 const f=await fixture('source',{saved:false});try{await setAIView(f.p,true);await refusedAI(f.p,f.topic.id);for(let i=0;i<3;i++)await rpc(f.p,'GET_AI_PRESENTATION_STATUS');await setAIView(f.p,false);await f.p.locator('#original-reading-body [data-entry-field="body"]').first().waitFor();await quiet(f.h);}finally{await f.h.close();}
});
test('UX-R5 worker restart preserves saved AI and refuses every stale generation command without paid retry',{timeout:120000},async()=>{
 const f=await fixture('source',{candidate:true});try{const before=await savedRow(f.p,f.topic.id);await f.h.restartWorker();await refusedAI(f.p,f.topic.id);assert.deepEqual(await savedRow(f.p,f.topic.id),before);await setAIView(f.p,true);await f.p.locator('[data-ai-field="currentView"]').waitFor();await quiet(f.h);}finally{await f.h.close();}
});
