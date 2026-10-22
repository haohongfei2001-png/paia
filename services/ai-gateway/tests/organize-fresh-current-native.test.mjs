import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,rpc,eventually} from './organize-native-fixture.mjs';
import {setAIView,openSavedAI} from '../../../extension/tests/harness/consumer-ai-browser.mjs';
for(const variant of ['source','release'])test('fresh Current '+variant+' native human field survives real UI incremental publication',{timeout:60000},async t=>{
 const f=await nativeFixture(t,{variant});assert.equal((await f.run()).currentPublished,true);await setAIView(f.p,true);await openSavedAI(f.p);
 const field=f.p.locator('[data-ai-field="currentView"]');await field.waitFor({state:'visible'});await field.click();await f.p.keyboard.press(process.platform==='darwin'?'Meta+a':'Control+a');await f.p.keyboard.insertText('SYNTHETIC human Current exact');
 await eventually(async()=>(await f.snapshot()).candidate.projection.currentView==='SYNTHETIC human Current exact','real AI editor persists protected field');const before=(await f.snapshot()).candidate;assert.equal(before.protections.currentView,true);
 await rpc(f.p,'CONTINUE_THINKING',{thought:{topicId:f.topic.id,body:'SYNTHETIC new unprotected evidence',operationId:crypto.randomUUID()}});
 const refresh=f.p.locator('[data-ai-organize-refresh]');await refresh.click();await eventually(async()=>(await f.snapshot()).candidate.revision===before.revision+1,'new exact Current committed');
 const after=await f.snapshot();assert.equal(after.candidate.candidate,undefined);assert.equal(after.candidate.projection.currentView,before.projection.currentView);assert.deepEqual(after.candidate.manifest.fields.currentView,before.manifest.fields.currentView);assert.deepEqual(after.candidate.manifest.blocks.filter(b=>b.field==='currentView'),before.manifest.blocks.filter(b=>b.field==='currentView'));
 await eventually(()=>field.textContent().then(x=>x==='SYNTHETIC human Current exact'),'human Current still visible');await eventually(()=>f.p.locator('[data-ai-field="blockSummary"]').textContent().then(x=>x==='SYNTHETIC new unprotected evidence'),'fresh lawful field read back');assert.equal(f.backend.physical(),2);assert.equal(after.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='ai').length,2);assert.equal(after.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='user').length,1);assert.ok(after.usage.every(r=>r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120));assert.equal(await f.p.locator('[data-candidate-decision]').count(),0);f.quiet();t.diagnostic(JSON.stringify({variant,native:true,currentRevision:after.candidate.revision,humanProtected:true,physical:2}));
});

for(const variant of ['source','release'])test('protected pending '+variant+' native Current keeps no-delta distinct and sends no model request',{timeout:60000},async t=>{
 const {AI_FIELDS,AI_LIST_FIELDS}=await import('../../../extension/core/organizer/ai-contract.js');
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');
 const paths=['core/organizer/ai-incremental-v2.js','core/organizer/ai-incremental-v3.js','core/organizer/local-organize-session.js','core/organizer/configured-organize-runner.js','ui/common.js','ui/topic-workspace.js'];
 const hashes=async base=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,base))).digest('hex')])));
 const root=new URL('../../../extension/',import.meta.url),beforeHashes=await hashes(root);
 const f=await nativeFixture(t,{variant,responseFields:AI_FIELDS}),staged=new URL('file://'+f.staged+'/'),stagedBefore=await hashes(staged);
 for(const path of paths.filter(p=>!p.endsWith('configured-organize-runner.js')))assert.equal(stagedBefore[path],beforeHashes[path],path+' staged production bytes');
 assert.equal((await f.run()).currentPublished,true);
 for(const field of AI_FIELDS){const before=(await f.snapshot()).candidate;await rpc(f.p,'EDIT_AI_PRESENTATION',{edit:{topicId:f.topic.id,expectedRevision:before.revision,field,value:AI_LIST_FIELDS.includes(field)?before.projection[field].map(x=>({...x,text:'SYNTHETIC human '+field})):'SYNTHETIC human '+field,operationId:crypto.randomUUID()}});}
 await setAIView(f.p,true);await openSavedAI(f.p);
 const refresh=f.p.locator('[data-ai-organize-refresh]'),notice=f.p.locator('#ai-topic-status');
 for(const pending of [false,true]){
  if(pending)await rpc(f.p,'CONTINUE_THINKING',{thought:{topicId:f.topic.id,body:'SYNTHETIC protected pending material',operationId:crypto.randomUUID()}});
  await f.worker.evaluate(()=>__organizeNative.store.finishFoundation());const before=await f.snapshot(),physical=f.backend.physical();
  await refresh.click();await eventually(()=>notice.textContent().then(text=>pending?text.includes('人工保护')&&text.includes('本次未更新'):text.includes('没有需要更新')),'truthful native completion');
  const after=await f.snapshot();for(const key of ['candidate','jobs','usage','work','revisions','receipts'])assert.deepEqual(after[key],before[key],key+' preserved');assert.equal(f.backend.physical(),physical);
  const result=await f.worker.evaluate(()=>__organizeNative.results.filter(r=>r.type==='UPDATE_AI_PRESENTATION').at(-1).result);assert.equal(result.noDelta,!pending);assert.equal(result.completed,!pending);assert.equal(result.requestCount,0);assert.equal(result.blockedReason,pending?'PROTECTED_FIELDS':undefined);
  assert.equal(await f.p.locator('[data-candidate-decision]').count(),0);assert.equal(await f.p.locator('[data-ai-field="currentView"]').textContent(),'SYNTHETIC human currentView');
 }
 assert.deepEqual(await hashes(root),beforeHashes);assert.deepEqual(await hashes(staged),stagedBefore);f.quiet();t.diagnostic(JSON.stringify({variant,native:true,pairedStates:['NO_DELTA','PROTECTED_FIELDS'],physical:f.backend.physical(),productionHashes:beforeHashes,stagedHashes:stagedBefore,unchangedAfter:true}));
});
