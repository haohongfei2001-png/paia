import test from 'node:test';
import assert from 'node:assert/strict';
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
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  await page.locator('[data-view=thoughts]').click();
  const topic=await createLegacyTopic(page,'Synthetic VS-04 conflict');
  await page.locator('#create-entry').click();
  await page.locator('textarea.thought-draft').fill('Synthetic baseline');
  await page.getByRole('button',{name:'保存想法',exact:true}).click();
  await eventually(async()=>{
   const result=await send(page,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id}});
   return result.items.some(item=>item.entry?.body==='Synthetic baseline');
  });
  await page.reload();
  await page.locator('[data-view=thoughts]').click();
  const topicRow=page.locator(`[data-topic-id="${topic.id}"]`);
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
 }finally{await h.close();}
});
