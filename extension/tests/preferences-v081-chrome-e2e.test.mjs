import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
test('late initial preference response cannot override explicit view or time-order actions',{timeout:45000},async()=>{
 const h=await FakeChatGPT.start({headless:false}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const result=await p.evaluate(async()=>{
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),actual=chrome.runtime.sendMessage.bind(chrome.runtime);let release,captured;const waiting=new Promise(resolve=>captured=resolve);
   chrome.runtime.sendMessage=async message=>{const result=await actual(message);if(message.type==='GET_ORGANIZER_CONTROLS'&&!release)return new Promise(resolve=>{release=()=>resolve(result);captured();});return result;};
   const workspace=Object.assign(Object.create(ThoughtWorkspace.prototype),{id:null,view:'original',readingSort:'asc',leave:async()=>true,refresh:async()=>{},renderBounded:()=>{}});
   try{const pending=workspace.updateViewStatus();await waiting;await workspace.switchView('ai');await workspace.changeReadingSort('desc');release();await pending;return {view:workspace.view,sort:workspace.readingSort,toggle:document.getElementById('ai-presentation-toggle').checked,controls:(await actual({type:'GET_ORGANIZER_CONTROLS'})).data};}finally{chrome.runtime.sendMessage=actual;}
  });
  assert.equal(result.view,'ai');assert.equal(result.sort,'desc');assert.equal(result.toggle,true);assert.equal(result.controls.libraryView,'ai');assert.equal(result.controls.readingSort,'desc');assert.equal(h.deepSeekRequests.length,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
