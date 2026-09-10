import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {conversation} from './fixtures/history-v090.mjs';
async function choose(h,buffer){
 await h.archive.locator('#history-file-consent').check();await h.archive.locator('#history-file').setInputFiles({name:'synthetic-recovery.json',mimeType:'application/json',buffer});await eventually(()=>h.archive.locator('#history-commit').isEnabled());
}
for(const mode of ['restart','cancel'])test('visible import '+mode+' after actual batch commit preserves exact resumable checkpoint',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:false});try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('#sync-history').click();
  const buffer=Buffer.from(JSON.stringify([conversation(1,100)]));await choose(h,buffer);
  // Hold only the page acknowledgment after the real background transaction.
  // This models a killed/closed client without a production fault-injection hook.
  await h.archive.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async function(request,...args){const result=await send(request,...args);if(request.type==='IMPORT_COMMIT'&&request.payload.sequence===0&&!window.importAckHeld){window.importAckHeld=true;await new Promise(resolve=>{window.releaseImportAck=resolve;});}return result;};});
  await h.archive.locator('#history-commit').click();await eventually(()=>h.archive.evaluate(()=>window.importAckHeld===true),'hold acknowledgment after commit');assert.equal((await h.state()).records.length,32);
  if(mode==='restart'){
   await h.restartWorker();await h.archive.close();h.archive=await h.context.newPage();h.archive.on('pageerror',e=>h.errors.push(e.message));await h.archive.goto('chrome-extension://'+h.extensionId+'/ui/archive.html');
   await h.archive.locator('#sync-history').click();await h.archive.locator('#history-tasks button').filter({hasText:'继续未完成'}).click();await choose(h,buffer);await h.archive.locator('#history-commit').click();await eventually(()=>h.archive.locator('#history-success').isVisible());
  }else{
   await h.archive.locator('#history-cancel').click();await eventually(async()=>(await h.archive.locator('#history-status').textContent()).includes('已取消'));await h.archive.evaluate(()=>window.releaseImportAck());
   await eventually(()=>h.archive.locator('#history-file-consent').isEnabled());const tasks=await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'IMPORT_TASKS'}));assert.equal(tasks.data.tasks[0].phase,'cancelled');assert.equal((await h.state()).records.length,32);
   await choose(h,buffer);await h.archive.locator('#history-commit').click();await eventually(()=>h.archive.locator('#history-success').isVisible());
  }
  const s=await h.state();assert.equal(s.records.length,100);assert.equal(s.library.blocks.length,100);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await mkdir('work/history-v090',{recursive:true});await h.archive.screenshot({path:'work/history-v090/'+mode+'-recovered.png'});await writeFile('work/history-v090/recovery-'+mode+'.json',JSON.stringify({syntheticOnly:true,visibleChrome:true,mode,committedBeforeInterruption:32,finalSources:100,noDuplicate:true,requests:0,externalRequests:0,errors:[]},null,2));
 }finally{await h.close();}
});
