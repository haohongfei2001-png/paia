import test from 'node:test';import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
for(const mode of ['refresh','status-poll'])test('reading '+mode+' handles worker channel loss, keeps content and reconnects without Provider',{timeout:45000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await p.evaluate(()=>chrome.runtime.sendMessage({type:'CREATE_LIBRARY_TOPIC',topic:{name:'Synthetic channel recovery topic',operationId:crypto.randomUUID()}}));
  await p.locator('[data-view=thoughts]').click();await p.locator('.topic-index-row').waitFor();await pause(300);
  const before=await p.locator('.topic-index-row strong').first().textContent();
  await p.evaluate(mode=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.restoreReadingChannel=()=>{chrome.runtime.sendMessage=send;};window.readingFaultActive=mode==='refresh';window.readingFaults=0;
   chrome.runtime.sendMessage=q=>{
    if(q.type==='GET_AI_PRESENTATION_STATUS'&&window.readingFaultActive){window.readingFaults++;return Promise.reject(new Error('The message port closed before a response was received.'));}
    if(mode==='status-poll'&&q.type==='GET_BOUNDED_ORGANIZER')return Promise.resolve({ok:true,data:{kind:'original',state:'running',maxRequests:3,maxInputs:50,requestsReserved:0,completedInputs:0}});
    return send(q);
   };
  },mode);
  await p.locator('#thought-search').fill('Synthetic');
  if(mode==='status-poll'){await p.waitForTimeout(400);assert.equal(await p.locator('#bounded-progress').isVisible(),false);await p.evaluate(()=>{window.readingFaultActive=true;});}
  await eventually(()=>p.evaluate(()=>window.readingFaults>0),'controlled read channel failure');await pause(200);
  assert.deepEqual(h.errors,[]);assert.ok((await p.locator('#thought-list').textContent()).includes('Synthetic channel recovery topic'));
  await eventually(async()=>(await p.locator('#save-status').textContent()).includes('当前内容保留'),'safe read recovery feedback');
  const stopped=await p.evaluate(()=>window.readingFaults);await pause(1300);assert.equal(await p.evaluate(()=>window.readingFaults),stopped,'failed read polling stops');
  await p.evaluate(()=>window.restoreReadingChannel());await p.locator('#thought-search').fill('');await eventually(async()=>(await p.locator('.topic-index-row strong').first().textContent())===before,'saved topic remains readable after reconnect');
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  await mkdir('work/history-v090',{recursive:true});await writeFile('work/history-v090/reading-recovery-'+mode+'.json',JSON.stringify({syntheticOnly:true,mode,channelFailureHandled:true,contentPreserved:true,pollingStopped:true,reconnected:true,requests:0,errors:h.errors},null,2));
 }finally{await h.close();}
});
test('Original preflight channel failure releases the UI gate without dispatching a Provider',{timeout:30000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await p.locator('[data-view=thoughts]').click();await p.locator('[data-view=settings]').click();await p.locator('#start-thought-library').waitFor();
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.restoreReadingChannel=()=>{chrome.runtime.sendMessage=send;};window.readingFaults=0;chrome.runtime.sendMessage=q=>{if(q.type==='GET_AI_PRESENTATION_STATUS'){window.readingFaults++;return Promise.reject(new Error('The message port closed before a response was received.'));}return send(q);};});
  await p.locator('[data-view=settings]').click();await p.locator('#start-thought-library').click();await eventually(()=>p.evaluate(()=>window.readingFaults>0));await pause(200);assert.deepEqual(h.errors,[]);
  await p.evaluate(()=>window.restoreReadingChannel());await p.locator('[data-view=settings]').click();await p.locator('#start-thought-library').click();await eventually(async()=>(await p.locator('#ai-update-feedback').textContent()).includes('先在 ChatGPT'),'preflight gate released for next explicit action');assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
