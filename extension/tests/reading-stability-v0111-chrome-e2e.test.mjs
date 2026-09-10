import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {seedMemoryRPC} from './fixtures/memory-v0100.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(q=>chrome.runtime.sendMessage(q),{type,...fields});assert.equal(r.ok,true);return r.data;};
test('Reading snapshots retain Home and Topic nodes across passive state and idle refresh',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({headless:true}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const f=await seedMemoryRPC((t,o)=>rpc(p,t,o));await p.locator('[data-view=thoughts]').click();
  await eventually(async()=>await p.locator('[data-topic-id]').count()>0);
  await p.waitForTimeout(2000);
  const home=await p.evaluate(async()=>{
   const list=document.querySelector('#thought-list'),first=list.firstElementChild;let replacements=0,loads=0;
   const observer=new MutationObserver(ms=>{for(const m of ms){if(m.target===list&&m.type==='childList')replacements++;if(m.type==='attributes'&&m.attributeName==='data-state'&&m.target.dataset.state==='loading')loads++;}});
   observer.observe(document.querySelector('#thought-collection'),{subtree:true,childList:true,attributes:true});
   await chrome.storage.local.set({readingSyntheticStatus:{phase:'idle',pending:3}});
   await new Promise(r=>setTimeout(r,2500));observer.disconnect();return {same:first===list.firstElementChild,replacements,loads};
  });assert.deepEqual(home,{same:true,replacements:0,loads:0});
  await p.locator(`[data-topic-id="${f.paia.id}"]`).click();await eventually(async()=>await p.locator('[data-entry-field=body]').count()>0);
  assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
