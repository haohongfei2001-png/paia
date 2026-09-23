import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const op=()=>crypto.randomUUID();

async function ready(h){
 const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true,'consent ready');
 if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
 return p;
}
async function reopen(h){
 const page=await h.context.newPage();page.on('pageerror',e=>h.errors.push(e.message));h.archive=page;
 await page.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);
 return page;
}
async function stall(page,type){
 await page.evaluate(type=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__cpv1RestoreSend=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=message=>message?.type===type?new Promise(()=>{}):send(message);},type);
}

test('CPV1-01.1 interrupted Input edit survives page loss and service-worker restart, then clears only its committed recovery draft',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  let p=await ready(h);const chat=await h.open({id:'cpv1-recovery-input',title:'Recovery Input',base:1609459200,messages:[{id:'input-one',text:'原始输入'}]});
  await eventually(async()=>(await h.state()).records.length===1,'capture source');
  await p.bringToFront();await openArchiveWindow(p,{text:'Recovery Input',label:'recovery document opens'});
  const field=p.locator('.library-prose').first();await field.waitFor();const inputId=await field.getAttribute('data-edit-id'),before=await rpc(p,'GET_INPUT',{id:inputId}),documentId=before.documentId;
  await stall(p,'EDIT_DOCUMENT');await field.fill('页面突然关闭前的输入草稿');
  await eventually(async()=>{const d=await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:documentId}});return d?.operation?.edit?.blocks?.some(b=>b.id===inputId&&b.libraryText==='页面突然关闭前的输入草稿');},'Input recovery draft becomes durable');
  assert.notEqual((await rpc(p,'GET_INPUT',{id:inputId})).libraryText,'页面突然关闭前的输入草稿','canonical Input is not yet committed');
  await p.close({runBeforeUnload:false});p=await reopen(h);await h.restartWorker();
  await openArchiveWindow(p,{text:'Recovery Input',label:'reopen recovery document'});
  await eventually(async()=>(await rpc(p,'GET_INPUT',{id:inputId})).libraryText==='页面突然关闭前的输入草稿','draft replay commits through fresh worker');
  await eventually(async()=>!(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:documentId}})),'committed recovery draft clears');
  assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);await chat.close();
 }finally{await h.close();}
});

test('CPV1-01.1 interrupted Thought edit is recoverable without turning the draft into Source truth',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  let p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'恢复测试主题',operationId:op()}}),thought=await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:'已保存思想',topicId:topic.id}});
  await p.locator('[data-view="thoughts"]').first().click();await p.locator(`[data-topic-id="${topic.id}"]`).click();
  const body=p.locator(`[data-entry-id="${thought.id}"] [data-entry-field="body"]`);await body.waitFor();
  await stall(p,'EDIT_LIBRARY_BATCH');await body.fill('中断前尚未提交的思想文字');
  await eventually(async()=>{const d=await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'library_entry',ownerId:thought.id}});return d?.operation?.edit?.entries?.[0]?.changes?.body==='中断前尚未提交的思想文字';},'Thought recovery draft becomes durable');
  assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:thought.id})).body,'已保存思想');
  await p.close({runBeforeUnload:false});p=await reopen(h);await h.restartWorker();
  await p.locator('[data-view="thoughts"]').first().click();await p.locator(`[data-topic-id="${topic.id}"]`).click();
  await eventually(async()=>(await rpc(p,'GET_LIBRARY_ENTRY',{id:thought.id})).body==='中断前尚未提交的思想文字','Thought recovery replay commits');
  await eventually(async()=>!(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'library_entry',ownerId:thought.id}})),'Thought recovery draft clears after commit');
  assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);
 }finally{await h.close();}
});

test('CPV1-01.1 permanent Source purge removes its recovery copy before canonical deletion',{timeout:45000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  const p=await ready(h);await h.open({id:'cpv1-recovery-purge',title:'Recovery Purge',base:1609459200,messages:[{id:'purge-one',text:'即将永久删除的来源'}]});
  await eventually(async()=>(await h.state()).records.length===1,'purge source captured');
  const state=await h.state(),source=state.records[0],input=state.library.blocks[0];
  await rpc(p,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{kind:'document',ownerId:input.documentId,token:'purge-token-0001',sourceRecordIds:[source.id],operation:{type:'EDIT_DOCUMENT',edit:{operationId:'purge-operation-0001',documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'不应在永久删除后残留',note:input.note,excluded:input.excluded}]}}}});
  assert.ok(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:input.documentId}}));
  await rpc(p,'PURGE_SOURCE',{id:source.id,confirm:true});
  assert.equal(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:input.documentId}}),null);
  assert.equal((await h.state()).records.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
