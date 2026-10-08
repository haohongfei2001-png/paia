import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rpc,savedRow,editSaved,refusedAI,setAIView,noApproval,quiet} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';
for(const variant of ['source','release'])test(`D7 retired adoption entry preserves saved Current/candidate and same-operation edit acknowledgement (${variant})`,{timeout:240000},async()=>{
 const f=await fixture(variant,{candidate:true});try{await setAIView(f.p,true);await f.p.locator('[data-ai-candidate]').waitFor();await noApproval(f.p);const before=await savedRow(f.p,f.topic.id),edit={topicId:f.topic.id,field:'currentView',value:'SYNTHETIC acknowledged edit',expectedRevision:before.revision,operationId:crypto.randomUUID()};const first=await rpc(f.p,'EDIT_AI_PRESENTATION',{edit}),again=await rpc(f.p,'EDIT_AI_PRESENTATION',{edit});assert.deepEqual(again,first);assert.equal((await savedRow(f.p,f.topic.id)).revision,before.revision+1);assert.deepEqual((await savedRow(f.p,f.topic.id)).candidate,before.candidate);await refusedAI(f.p,f.topic.id);await quiet(f.h);}finally{await f.h.close();}
});
for(const variant of ['source','release'])test(`D7 AI Topic entry honestly reports membership service unavailable and cannot prepare a batch (${variant})`,{timeout:240000},async()=>{
 const f=await fixture(variant,{saved:false});try{await setAIView(f.p,true);await eventually(()=>f.p.locator('#ai-reading-body').textContent().then(x=>x.includes('尚未上线')));await noApproval(f.p);assert.equal(await f.p.locator('[data-organize-scope-workspace]').count(),0);await refusedAI(f.p,f.topic.id);assert.equal(await savedRow(f.p,f.topic.id),undefined);await quiet(f.h);}finally{await f.h.close();}
});
