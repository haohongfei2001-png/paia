import test from 'node:test';import assert from 'node:assert/strict';import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
test('Pending view save survives passive refresh; failure restores old mode and unlocks without Provider',{timeout:45000},async()=>{
 const h=await FakeChatGPT.start({headless:true}),p=h.archive;
 try{await p.locator('#consent-check').check();await p.locator('#enable-consent').click();const result=await p.evaluate(async()=>{
  const {ThoughtWorkspace}=await import('../ui/thoughts.js'),actual=chrome.runtime.sendMessage.bind(chrome.runtime),toggle=document.getElementById('ai-presentation-toggle');
  // Model the initialized Round 3+ workspace counters, not undefined++ (NaN).
  const w=Object.assign(Object.create(ThoughtWorkspace.prototype),{id:null,view:'original',readingSort:'asc',statusEpoch:0,statusReadSerial:0,aiTopics:new Map(),leave:async()=>true,refresh:async()=>{},renderBounded:()=>{}});
  let release,entered,fail=false;let waiting=new Promise(r=>entered=r);
  chrome.runtime.sendMessage=async m=>{if(m.type==='SET_ORGANIZER_CONTROLS'){entered();await new Promise(r=>release=r);if(fail)return {ok:false,error:'STORAGE_WRITE_FAILED'};}return actual(m);};
  try{const change=w.switchView('ai');await waiting;await w.updateViewStatus();const pending={checked:toggle.checked,disabled:toggle.disabled};release();await change;const saved={checked:toggle.checked,disabled:toggle.disabled,view:w.view};
   fail=true;waiting=new Promise(r=>entered=r);const failure=w.switchView('original');await waiting;await w.updateViewStatus();const pendingFailure={checked:toggle.checked,disabled:toggle.disabled};release();await failure;
   return {pending,saved,pendingFailure,failed:{checked:toggle.checked,disabled:toggle.disabled,view:w.view},controls:(await actual({type:'GET_ORGANIZER_CONTROLS'})).data};
  }finally{chrome.runtime.sendMessage=actual;}
 });assert.deepEqual(result.pending,{checked:true,disabled:true});assert.deepEqual(result.saved,{checked:true,disabled:false,view:'ai'});assert.deepEqual(result.pendingFailure,{checked:false,disabled:true});assert.deepEqual(result.failed,{checked:true,disabled:false,view:'ai'});assert.equal(result.controls.libraryView,'ai');assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
