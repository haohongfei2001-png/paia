import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';

export async function confirmOrganizeScope(page){
 const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('[data-organize-scope]').waitFor();
 await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();
}
export async function adoptFirstCandidate(page){
 const panel=page.locator('[data-ai-candidate]');await panel.waitFor();
 assert.equal(await page.locator('#ai-reading-body [data-ai-field]').count(),0,'first candidate has no editable Current before adoption');
 const fields=await panel.locator('[data-ai-candidate-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.aiCandidateField));
 for(const field of fields)await panel.locator(`[data-ai-candidate-field="${field}"] input[data-candidate-decision="adopt"]`).check();
 await panel.getByRole('button',{name:'保存这些选择',exact:true}).click();await panel.waitFor({state:'detached'});
}

// Current D7 uses a visually clipped checkbox inside the visible label.
// Exercise the actual pointer target and wait for its real transition to settle.
export async function setAIView(page,checked){
 const toggle=page.locator('#ai-presentation-toggle');
 await eventually(()=>toggle.isEnabled(),'AI view switch is enabled');
 if(await toggle.isChecked()!==checked)await page.locator('.ai-toggle-label').filter({has:toggle}).click();
 await eventually(async()=>await toggle.isEnabled()&&await toggle.isChecked()===checked,'AI view switch reaches the requested settled state');
}
const workerRead=async(page,type,fields={})=>{
 const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(reply?.ok,true,JSON.stringify(reply));return reply.data;
};

// Independent current-route proof. Observing the exported owner follows the
// d5-thought-root harness pattern: delegate unchanged and restore immediately.
// This never removes onOrganizeScope, enables Start, or changes an event handler.
export async function assertHeldOrganizeScope(page,h,{topicId,trigger='first',leave=true}={}){
 assert.equal(page,h.archive,'synthetic browser fixture must use its own isolated archive');
 const before={provider:h.deepSeekRequests.length,network:h.extensionNetworkRequests,external:h.externalRequests};
 const saved=await workerRead(page,'GET_AI_PRESENTATION_STATUS',{options:{topicId}});
 await page.evaluate(async()=>{
  const {TopicController}=await import(chrome.runtime.getURL('ui/topic-workspace.js'));
  const preview=TopicController.prototype.previewAIUpdate,send=chrome.runtime.sendMessage.bind(chrome.runtime);
  globalThis.__syntheticAIObserved={types:[]};
  TopicController.prototype.previewAIUpdate=function(...args){globalThis.__syntheticAIWorkerOwner=this;return preview.apply(this,args);};
  chrome.runtime.sendMessage=(message,...args)=>{__syntheticAIObserved.types.push(message.type);return send(message,...args);};
  globalThis.__syntheticAIRestoreObservation=()=>{TopicController.prototype.previewAIUpdate=preview;chrome.runtime.sendMessage=send;};
 });
 try{
  if(trigger==='first')await page.getByRole('button',{name:'生成 AI整理',exact:true}).click();
  else await page.locator('#ai-library-update').click();
  const workspace=page.locator('#desktop-appearance-preview-workspace [data-organize-scope-workspace]');await workspace.waitFor();
  assert.equal(await workspace.evaluate(node=>!!node.closest('dialog,[role="dialog"],[aria-modal="true"]')),false,'ordinary Organize opens its main workspace');
  assert.equal(await workspace.getAttribute('data-preview-only'),'true');
  assert.equal(await workspace.locator('.organize-scope-start').isDisabled(),true,'ordinary Start remains held');
  assert.equal(await workspace.locator('.organize-scope-cancel').isDisabled(),true);
  assert.equal(await page.locator('.dvn-preview-back').isDisabled(),true);
  assert.equal(await page.locator('#library-dialog[open]').count(),0,'the retired modal is not the current route');
  assert.match(await workspace.textContent(),/不会发送材料|不会请求/);
  const types=await page.evaluate(()=>__syntheticAIObserved.types);
  assert.ok(types.includes('GET_AI_PRESENTATION_SCOPE'),'current entry reads its real scope');
  assert.equal(types.includes('UPDATE_AI_PRESENTATION'),false,'held Start grants no worker request');
  assert.deepEqual(await workerRead(page,'GET_AI_PRESENTATION_STATUS',{options:{topicId}}),saved,'held entry does not change saved AI or worker state');
  assert.deepEqual({provider:h.deepSeekRequests.length,network:h.extensionNetworkRequests,external:h.externalRequests},before,'held primary entry makes zero requests');
  const scope=await workerRead(page,'GET_AI_PRESENTATION_SCOPE',{options:{topicId}});
  assert.equal(scope.topicId,topicId);assert.match(scope.scopeBinding,/^[a-f0-9]{64}$/);
  if(leave){
   const nav=page.locator('.sidebar [data-view="thoughts"]');
   if(await nav.evaluate(node=>!!node.closest('#archive-compact-navigation:not([open])')))await page.locator('#archive-compact-nav-label').click();
   await nav.click();await page.locator('#desktop-appearance-preview-workspace').waitFor({state:'detached'});
   await page.locator('#topic-heading h1').waitFor();
   assert.equal(await page.evaluate(()=>__syntheticAIWorkerOwner.id),topicId,'real navigation restores the same Topic owner');
   await setAIView(page,true);
  }
  return scope;
 }finally{await page.evaluate(()=>{__syntheticAIRestoreObservation();delete globalThis.__syntheticAIRestoreObservation;});}
}

// SYNTHETIC retained-owner/real-worker setup, NOT an ordinary generation journey.
// FakeChatGPT intercepts the sole provider destination. The production public
// startAIUpdate method owns op(), UPDATE_AI_PRESENTATION, validation, polling,
// errors and receipts. No output, authorization token or handler is fabricated.
export async function startSyntheticAIWorkerFixture(page,h,options){
 await assertHeldOrganizeScope(page,h,options);
 const {topicId}=options,scope=await workerRead(page,'GET_AI_PRESENTATION_SCOPE',{options:{topicId}});
 assert.equal(scope.blockedReason,null,'synthetic fixture may start only an eligible real scope');
 assert.equal(scope.credentialReady,true);assert.match(scope.scopeBinding,/^[a-f0-9]{64}$/);
 const before=h.deepSeekRequests.length;
 await page.evaluate(({scope,topicId})=>{
  const owner=globalThis.__syntheticAIWorkerOwner;
  if(owner?.id!==topicId||typeof owner.startAIUpdate!=='function'||typeof owner.onOrganizeScope!=='function')throw Error('SYNTHETIC_AI_OWNER_SCOPE_MISMATCH');
  globalThis.__syntheticAIWorkerTask=owner.startAIUpdate(scope);
 },{scope,topicId});
 await eventually(()=>Promise.resolve(h.deepSeekRequests.length===before+1),'one intercepted synthetic worker request');
 assert.equal(h.externalRequests,0);
 return scope;
}
