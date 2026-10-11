import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {createLegacyTopic} from './harness/reading-closure.mjs';

const send=(page,type,data={})=>page.evaluate(async({type,data})=>{
 const result=await chrome.runtime.sendMessage({type,...data});
 if(!result.ok)throw Error(result.error);
 return result.data;
},{type,data});
const operationId=()=>crypto.randomUUID();

test('VS-04 Thought conflict compares both versions and saves only after explicit choice',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({headless:false});
 try{
  const page=h.archive;
  // Retain body-free native click/owner evidence if the original fixture fails.
  await page.addInitScript(()=>{
   const rows=[];window.conflictRouteTrace=rows;const record=value=>{rows.push({at:performance.now(),...value});if(rows.length>120)rows.shift();};
   document.addEventListener('click',event=>record({kind:'click',trusted:event.isTrusted,detail:event.detail,target:event.target?.tagName,id:event.target?.id,classes:typeof event.target?.className==='string'?event.target.className:'',selectionCollapsed:getSelection()?.isCollapsed}),true);
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=(message,...args)=>{const result=send(message,...args);if(result?.then)result.then(reply=>record({kind:'rpc',type:message?.type,ok:reply?.ok,error:reply?.error}),error=>record({kind:'rpc-error',type:message?.type,error:error?.name}));return result;};
  });
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  await page.locator('[data-view=thoughts]').click();
  const topic=await createLegacyTopic(page,'Synthetic VS-04 conflict');
  // Creation is fixture setup; the current writing workspace deliberately holds Save.
  // The conflict itself still uses the real editable Thought, worker and comparison controls.
  await send(page,'CONTINUE_THINKING',{thought:{operationId:operationId(),topicId:topic.id,body:'Synthetic baseline'}});
  await eventually(async()=>{
   const result=await send(page,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id}});
   return result.items.some(item=>item.entry?.body==='Synthetic baseline');
  });
  await page.reload();
  await page.locator('[data-view=thoughts]').click();
  const topicRow=page.locator(`.personal-topic-link[data-topic-id="${topic.id}"]`);
  const body=page.locator('[data-entry-field=body]').first();
  await eventually(async()=>await body.isVisible()||await topicRow.isVisible(),'Topic route or index is ready');
  if(!await body.isVisible())await topicRow.click();
  await body.waitFor();
  const id=await body.evaluate(el=>el.closest('[data-entry-id]').dataset.entryId);
  await body.fill('Synthetic baseline');
  await eventually(async()=>(await send(page,'GET_LIBRARY_ENTRY',{id})).body==='Synthetic baseline');
  const other=await h.context.newPage();
  await other.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);
  await body.fill('Synthetic current draft');
  const remote=await send(other,'GET_LIBRARY_ENTRY',{id});
  await send(other,'EDIT_LIBRARY_FIELDS',{edit:{id,expectedRevision:remote.revision,expectedFieldRevisions:remote.fieldRevisions,changes:{body:'Synthetic saved elsewhere',note:'Synthetic remote note'},operationId:operationId()}});
  await page.locator('#reload-document').waitFor({state:'visible'});
  assert.equal(await body.textContent(),'Synthetic current draft');
  assert.equal((await send(other,'GET_LIBRARY_ENTRY',{id})).body,'Synthetic saved elsewhere');
  await page.locator('#reload-document').click();
  const dialog=page.locator('dialog.reader-confirm');
  await dialog.waitFor({state:'visible'});
  const comparison=await dialog.innerText();
  assert.match(comparison,/Synthetic current draft/);
  assert.match(comparison,/Synthetic saved elsewhere/);
  await dialog.getByRole('button',{name:'取消'}).click();
  assert.equal(await body.textContent(),'Synthetic current draft');
  assert.equal((await send(other,'GET_LIBRARY_ENTRY',{id})).body,'Synthetic saved elsewhere');
  await page.locator('#reload-document').click();
  await dialog.getByRole('button',{name:'保存当前草稿'}).click();
  await eventually(async()=>{
   const saved=await send(other,'GET_LIBRARY_ENTRY',{id});
   return saved.body==='Synthetic current draft'&&saved.note==='Synthetic remote note';
  });
  assert.equal(await body.textContent(),'Synthetic current draft');
  assert.equal(h.extensionNetworkRequests,0);
  assert.deepEqual(h.errors,[]);
 }catch(error){
  const state=await h.archive.evaluate(()=>({url:location.href,ready:document.readyState,view:document.querySelector('[data-view].active')?.dataset.view,topicDocumentHidden:document.querySelector('#thought-document')?.hidden,metaNameCount:document.querySelectorAll('[data-meta-field=name]').length,entryCount:document.querySelectorAll('[data-entry-id]').length,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id},trace:window.conflictRouteTrace||[]})).catch(()=>null);
  try{await mkdir('work/cpv1-04-conflict',{recursive:true});await writeFile('work/cpv1-04-conflict/failure.json',JSON.stringify({state,pageErrors:h.errors,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests},null,2));console.log('CPV1_04_CONFLICT_FAILURE '+JSON.stringify(state));}catch(diagnosticError){console.log('CPV1_04_CONFLICT_DIAGNOSTIC_ERROR '+diagnosticError?.name);}throw error;
 }finally{await h.close();}
});
