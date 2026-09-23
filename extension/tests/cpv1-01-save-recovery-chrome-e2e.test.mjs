import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{
 const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(reply?.ok,true,JSON.stringify(reply));
 return reply.data;
};
const op=()=>crypto.randomUUID();

async function fixture(){
 const h=await FakeChatGPT.start(),page=h.archive;
 await page.locator('#consent-check').check();
 await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consumer recovery consent');
 await h.open({id:'cpv1-save-recovery',title:'CPV1 save recovery',base:1609459200,messages:[{id:'cpv1-save-message',text:'CPV1 original source text'}]});
 await eventually(async()=>(await h.state()).records.length===1,'consumer recovery source captured',30000);
 await page.bringToFront();
 await openArchiveWindow(page,{text:'CPV1 save recovery',label:'CPV1 recovery document opens'});
 const field=page.locator('.library-prose').first();
 await field.waitFor();
 const inputId=await field.getAttribute('data-edit-id');
 const before=await rpc(page,'GET_INPUT',{id:inputId});
 return {h,page,field,inputId,before};
}

async function reopenArchive(h){
 const page=await h.context.newPage();
 page.on('pageerror',error=>h.errors.push(error.message));
 await page.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);
 h.archive=page;
 await page.locator('#collection-panel').waitFor();
 await openArchiveWindow(page,{text:'CPV1 save recovery',label:'CPV1 recovery document reopens'});
 return page;
}

test('CPV1-01.1 interrupted Input save survives page close and worker restart, then replays exactly once',{timeout:90000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   globalThis.__cpv1Send=send;globalThis.__cpv1EditCalls=0;
   chrome.runtime.sendMessage=message=>{
    if(message?.type==='EDIT_DOCUMENT'){
     globalThis.__cpv1EditCalls++;
     return Promise.resolve({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});
    }
    return send(message);
   };
  });
  await field.fill('CPV1 protected interrupted edit');
  await page.locator('#document-title').click();
  await eventually(()=>page.locator('#retry').isVisible(),'failed save is visible');
  assert.equal(await page.evaluate(()=>globalThis.__cpv1EditCalls),1);

  const draft=await rpc(page,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId}});
  assert.equal(draft.operation.edit.blocks[0].libraryText,'CPV1 protected interrupted edit');
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).libraryText,before.libraryText);

  await page.evaluate(()=>{chrome.runtime.sendMessage=globalThis.__cpv1Send;});
  await h.restartWorker();
  await page.close({runBeforeUnload:false});

  const reopened=await reopenArchive(h);
  await eventually(async()=>(await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText==='CPV1 protected interrupted edit','recovery draft commits after reopen',15000);
  const after=await rpc(reopened,'GET_INPUT',{id:inputId});
  assert.equal(after.revision,before.revision+1,'recovery uses the original idempotent edit exactly once');
  assert.equal(await rpc(reopened,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId}}),null);
  await reopened.getByText('已恢复上次未完成的修改。',{exact:true}).waitFor({timeout:5000});
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-01.1 stale recovery draft restores visibly but never overwrites a newer committed Input',{timeout:60000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  const draftEdit={operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:'CPV1 stale local recovery',note:before.note,excluded:before.excluded}]};
  await rpc(page,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{kind:'document',ownerId:before.documentId,token:draftEdit.operationId,operation:{type:'EDIT_DOCUMENT',edit:draftEdit},sourceRecordIds:before.sourceRecordId?[before.sourceRecordId]:[]}});
  await rpc(page,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:'CPV1 newer committed text',note:before.note,excluded:before.excluded}]}});
  await page.close({runBeforeUnload:false});

  const reopened=await reopenArchive(h);
  await eventually(async()=>await reopened.locator('.library-prose').first().textContent()==='CPV1 stale local recovery','stale recovery is shown instead of silently lost');
  assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText,'CPV1 newer committed text','newer canonical text is never overwritten');
  assert.equal(await reopened.locator('#reload-document').isVisible(),true,'conflict recovery action is visible');
  assert.match(await reopened.locator('#save-status').textContent(),/草稿已恢复到页面|尚未保存/);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
