import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
const rpc=async(page,type,fields={})=>{const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(reply?.ok,true,JSON.stringify(reply));return reply.data;};
async function fixture(){
 const h=await FakeChatGPT.start(),page=h.archive;
 await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'D1 receipt consent');
 await h.open({id:'dvn-save-outcome',title:'SYNTHETIC D1 outcome',base:1609459200,messages:[{id:'dvn-save-message',text:'SYNTHETIC original Source'}]});
 await eventually(async()=>(await h.state()).records.length===1,'D1 synthetic Source captured');
 await openArchiveWindow(page,{text:'SYNTHETIC D1 outcome',label:'D1 receipt Reader opens'});
 const field=page.locator('.library-prose').first();await field.waitFor();
 const inputId=await field.getAttribute('data-edit-id'),before=await rpc(page,'GET_INPUT',{id:inputId});
 return {h,page,field,inputId,before};
}

test('D1 durable acknowledgement loss reads actual worker receipt, preserves concurrent typing, and writes each revision once',{timeout:90000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  const sources=(await h.state()).records;
  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__dvnWrites=0;globalThis.__dvnReads=0;
   chrome.runtime.sendMessage=async message=>{
    if(message?.type==='EDIT_DOCUMENT'){globalThis.__dvnWrites++;const response=await send(message);if(globalThis.__dvnWrites===1)throw Error('Synthetic message channel closed after commit');return response;}
    if(message?.type==='PAIA_ARCHIVE_OPERATION_OUTCOME'){globalThis.__dvnReads++;const response=await send(message);if(globalThis.__dvnReads===1)await new Promise(resolve=>globalThis.__releaseOutcome=resolve);return response;}
    return send(message);
   };
  });
  await field.fill('SYNTHETIC first durable body');
  await eventually(()=>page.evaluate(()=>globalThis.__dvnReads===1),'lost response starts trusted outcome read');
  await field.fill('SYNTHETIC typing while acknowledgement is pending');
  await page.evaluate(()=>globalThis.__releaseOutcome());
  await eventually(async()=>(await rpc(page,'GET_INPUT',{id:inputId})).libraryText==='SYNTHETIC typing while acknowledgement is pending','newer typing saves with reconciled revision');
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).revision,before.revision+2);
  assert.equal(await page.evaluate(()=>globalThis.__dvnWrites),2);
  assert.equal(await field.textContent(),'SYNTHETIC typing while acknowledgement is pending');
  assert.equal(await page.locator('#retry').isVisible(),false);
  assert.deepEqual((await h.state()).records,sources);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('D1 unknown outcome is visible, keeps the full draft, blocks new writes and survives worker/page restart recovery',{timeout:90000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__dvnSend=send;globalThis.__dvnWrites=0;
   chrome.runtime.sendMessage=message=>{if(message?.type==='EDIT_DOCUMENT'){globalThis.__dvnWrites++;return Promise.reject(Error('Synthetic message channel closed before worker received request'));}return send(message);};
  });
  await field.fill('SYNTHETIC uncertain draft');
  await eventually(()=>page.locator('#retry').isVisible(),'unknown outcome offers recheck');
  assert.match(await page.locator('#save-status').textContent(),/保存结果暂时无法确认/);
  assert.match(await page.locator('#retry').textContent(),/核对保存结果|Check save result/);
  await field.fill('SYNTHETIC complete newer draft while outcome unknown');
  await page.locator('#retry').click();
  await eventually(()=>page.locator('#retry').isVisible(),'unknown recheck leaves draft protected');
  assert.equal(await page.evaluate(()=>globalThis.__dvnWrites),1);
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).revision,before.revision);
  assert.equal(await field.textContent(),'SYNTHETIC complete newer draft while outcome unknown');
  const epoch=(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).recoveryEpoch;
  await eventually(async()=>(await rpc(page,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId,epoch}}))?.operation.edit.blocks[0].libraryText==='SYNTHETIC complete newer draft while outcome unknown','latest recovery draft is durable');
  await page.evaluate(()=>{chrome.runtime.sendMessage=globalThis.__dvnSend;});
  await h.restartWorker();await page.close({runBeforeUnload:false});
  const reopened=await h.context.newPage();reopened.on('pageerror',error=>h.errors.push(error.message));await reopened.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);h.archive=reopened;
  await reopened.locator('#collection-panel').waitFor();await openArchiveWindow(reopened,{text:'SYNTHETIC D1 outcome',label:'uncertain draft recovery Reader opens'});
  await eventually(async()=>(await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText==='SYNTHETIC complete newer draft while outcome unknown','existing idempotent recovery resumes after restart');
  assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).revision,before.revision+1);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('D1 undo during unknown acknowledgement protects the full undo draft instead of reviving the earlier typed text',{timeout:90000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__dvnWrites=0;
   chrome.runtime.sendMessage=message=>{if(message?.type==='EDIT_DOCUMENT'){globalThis.__dvnWrites++;return Promise.reject(Error('Synthetic message channel closed before worker received request'));}return send(message);};
  });
  await field.fill('SYNTHETIC text later undone');
  await eventually(()=>page.locator('#retry').isVisible(),'unknown acknowledgement before undo');
  await field.press(process.platform==='darwin'?'Meta+z':'Control+z');
  await eventually(async()=>await field.textContent()==='SYNTHETIC original Source','undo restores the original expression visibly');
  const epoch=(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).recoveryEpoch;
  await eventually(async()=>{
   const draft=await rpc(page,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId,epoch}});
   return draft?.operation.edit.blocks.some(b=>b.id===inputId&&b.libraryText===before.libraryText);
  },'the latest undo is protected even though it matches the pre-save baseline');
  await page.locator('#retry').click();
  assert.equal(await page.evaluate(()=>globalThis.__dvnWrites),1,'unknown recheck cannot restart the earlier save');
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).revision,before.revision);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
