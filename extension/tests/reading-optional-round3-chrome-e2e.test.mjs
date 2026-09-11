// Installed extension + real service worker/IndexedDB, synthetic fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {seedMemoryRPC} from './fixtures/memory-v0100.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(q=>chrome.runtime.sendMessage(q),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const failure of ['fail','hang'])test(`Round 3 installed extension: optional ${failure} leaves Home and original Topic readable`,{timeout:30000},async()=>{
 const h=await FakeChatGPT.start({headless:true}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();const f=await seedMemoryRPC((t,o)=>rpc(p,t,o));
  await p.evaluate(failure=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.round3Calls=[];
   const optional=new Set(['GET_AI_PRESENTATION_STATUS','GET_ORIGINAL_ORGANIZER_STATUS','GET_ORGANIZER_CONTROLS','GET_BOUNDED_ORGANIZER','GET_DEEPSEEK_STATUS','GET_LIBRARY_UNPLACED']);
   chrome.runtime.sendMessage=q=>{round3Calls.push(q.type);if(optional.has(q.type))return failure==='hang'?new Promise(()=>{}):Promise.resolve({ok:false,error:'STORAGE_FAILED'});return send(q);};
  },failure);
  await p.locator('[data-view=thoughts]').click();await eventually(async()=>await p.locator('[data-topic-id]').count()>0);
  await p.locator(`[data-topic-id="${f.paia.id}"]`).click();await p.locator('#original-reading-body [data-entry-field=body]').first().waitFor();
  await p.waitForTimeout(1800);
  assert.equal(await p.locator('#topic-body').evaluate(n=>n.inert),false);
  assert.ok((await p.locator('#original-reading-body').innerText()).length>0);
  assert.equal(await p.locator('#library-read-retry').isVisible(),false);
  assert.equal(await p.evaluate(()=>round3Calls.some(t=>['UPDATE_ORIGINAL_LIBRARY_VIEW','UPDATE_AI_PRESENTATION','START_BOUNDED_ORGANIZER'].includes(t))),false);
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
