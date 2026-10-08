import test from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {fixture,rpc,savedRow,refusedAI,setAIView,openTopic,noApproval,quiet} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';
import {admitPreGatePurgeBrowserFixture} from './harness/pre-gate-purge-browser-fixture.mjs';
import {seedSavedAI} from './harness/consumer-ai-browser.mjs';
test('UX-R5 ON-01 Original and saved AI remain readable; switching never generates',{timeout:150000},async()=>{
 const f=await fixture();try{await setAIView(f.p,true);await f.p.locator('[data-ai-field="currentView"]').waitFor();const before=await savedRow(f.p,f.topic.id);await refusedAI(f.p,f.topic.id);await setAIView(f.p,false);await f.p.locator('#original-reading-body [data-entry-field="body"]').first().waitFor();await openTopic(f.p,f.topic);await setAIView(f.p,true);assert.deepEqual(await savedRow(f.p,f.topic.id),before);await quiet(f.h);}finally{await f.h.close();}
});
test('UX-R5 ON-01 unavailable first generation cannot start or reopen a Topic after leaving',{timeout:90000},async()=>{
 const f=await fixture('source',{saved:false});try{await setAIView(f.p,true);await eventually(()=>f.p.locator('#ai-reading-body').textContent().then(x=>x.includes('尚未上线')));await noApproval(f.p);await refusedAI(f.p,f.topic.id);await f.p.locator('#back').click();await f.h.restartWorker();await f.p.locator('#thought-list').waitFor();assert.equal(await savedRow(f.p,f.topic.id),undefined);await quiet(f.h);}finally{await f.h.close();}
});
test('UX-R5 ON-01 Local-only and external-access refusal cannot authorize a Provider',{timeout:90000},async()=>{
 const f=await fixture('source',{saved:false});try{await rpc(f.p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:false,localOnly:true}});await setAIView(f.p,true);await refusedAI(f.p,f.topic.id);const denied=await f.p.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_MEMORY_SETTINGS',options:{externalAccess:true}}));assert.equal(denied.error,'FEATURE_UNAVAILABLE');assert.equal((await rpc(f.p,'PAIA_MEMORY_STATUS')).config.localOnly,true);await quiet(f.h);}finally{await f.h.close();}
});
test('UX-R5 ON-01 historical Source purge invalidates saved source-bound AI without regeneration',{timeout:90000},async()=>{
 const f=await fixture('source',{saved:false});try{
  const {h,p}=f;await h.open({id:'consumer-ai-source',title:'SYNTHETIC AI source',base:1609459200,messages:[{id:'consumer-ai-source-msg',text:'SYNTHETIC 删除来源必须使派生AI失效'}]});
  await eventually(async()=>(await h.state()).records.length===1);const state=await h.state(),input=state.library.blocks[0];
  const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC Source-bound AI',operationId:crypto.randomUUID()}});
  await rpc(p,'ADD_TO_TOPICS',{selection:{kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id],operationId:crypto.randomUUID()}});
  const items=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,limit:40}}),saved=await seedSavedAI(p,topic.id,items.items.map(x=>x.entry));
  await openTopic(p,topic);await setAIView(p,true);await p.locator('[data-ai-field="blockSummary"]').waitFor();
  await admitPreGatePurgeBrowserFixture(p,state.records[0].id);
  await eventually(async()=>!(await rpc(p,'GET_AI_PRESENTATION_STATUS')).topics.find(x=>x.topicId===topic.id)?.presentation);
  // Read-time masking precedes durable safety maintenance. Establish the
  // exact permitted invalidation before measuring refused-command effects.
  const invalidated={...saved,revision:saved.revision+1,recoveryPurgeRevision:saved.revision+1,
   evidenceEntryIds:[],needsUpdate:true,detachedUserFields:true,currentView:'',keyInformation:[],
   preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[]};
  assert.equal(saved.protections.blockSummary,true);
  await eventually(async()=>isDeepStrictEqual(await savedRow(p,topic.id),invalidated),'purge preserves protected summary and settles the exact source-bound invalidation');
  assert.deepEqual(await savedRow(p,topic.id),invalidated,'only unprotected source-bound fields are cleared before refusal baseline');
  await refusedAI(p,topic.id);await quiet(h);
 }finally{await f.h.close();}
});
