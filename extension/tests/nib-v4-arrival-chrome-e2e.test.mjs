import {findInputPage} from '../ui/input-search.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually,conversation} from './harness/fake-chatgpt.mjs';
import {routeComposer} from './harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const variant of (process.env.NIB_ARRIVAL_VARIANTS||'source,release').split(','))test('NIB S1 actual Archive arrival '+variant,{timeout:180000},async t=>{
 const path=variant==='source'?root:await mkdtemp(join(tmpdir(),'paia-nib-arrival-release-'));if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',path],{cwd:root,stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:path,headless:true,launchThroughPort:true});
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await rpc(h.archive,'FILTER_MODE',{mode:'off'});
  const c=conversation('nib-arrival-synthetic');c.messages[0].text='NIB_ARRIVAL_QUERY exact synthetic input';const capture=await h.open(c);await eventually(async()=>(await h.state()).records.some(r=>r.originalText===c.messages[0].text),'original capture completed');await capture.close();
  await routeComposer(h.context,root);const host=await h.context.newPage();await host.goto('https://chatgpt.com/c/prompt-insertion-fixture');await host.waitForFunction(()=>!!globalThis.fixture?.view);await host.addStyleTag({content:'body{margin:0;min-height:100vh}form{position:fixed;left:16px;right:16px;bottom:16px;padding:12px}#blur{position:fixed;top:4px}'});
  const orb=host.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});await orb.click();let frame;await eventually(()=>{frame=host.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));return !!frame;});
  const call=command=>frame.evaluate(async command=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_RPC',nonce:location.hash.slice(1),command}),command);
  const query=await findInputPage({query:'NIB_ARRIVAL_QUERY',ranked:true,qualified:true,read:async({query,cursor,searchSnapshot})=>{const result=await call({type:'PAIA_PROMPT_HISTORY_QUERY',query,cursor,searchSnapshot});assert.equal(result.ok,true,JSON.stringify(result));return result.data;}});assert.equal(query.items.length,1);const hit=query.items[0];
  const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
  if(process.env.NIB_ARRIVAL_TRACE)await worker.evaluate(()=>{globalThis.__arrivalTrace=[];chrome.tabs.onUpdated.addListener((id,change)=>__arrivalTrace.push({event:'updated',id,change}));chrome.tabs.onRemoved.addListener(id=>__arrivalTrace.push({event:'removed',id}));chrome.runtime.onMessage.addListener((request,sender)=>{if(request.type.startsWith('PAIA_ARCHIVE_ARRIVAL'))__arrivalTrace.push({event:'message',request,tabId:sender.tab?.id});});});
  const command={type:'history_open_paia',query:'NIB_ARRIVAL_QUERY',searchSnapshot:query.searchSnapshot,ref:hit.ref};
  await t.test('existing app reuse, exact Input arrival and private query-free URL/history',async()=>{
   const before=h.context.pages().length;const result=await call(command);if(process.env.NIB_ARRIVAL_TRACE&&result.data?.status!=='opened')console.error('ARRIVAL_TRACE',JSON.stringify(await worker.evaluate(()=>__arrivalTrace)));assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(result.data,{status:'opened'});assert.equal(h.context.pages().length,before);
   assert.equal(h.archive.url(),'chrome-extension://'+h.extensionId+'/ui/archive.html');await h.archive.locator('[data-edit-id="'+hit.id+'"]').waitFor({state:'visible'});
   const persisted=await h.archive.evaluate(async()=>({history:JSON.stringify(history.state),local:JSON.stringify(await chrome.storage.local.get(null))}));assert.equal(persisted.history.includes(command.query),false);assert.equal(persisted.local.includes(command.query),false);
   await h.archive.locator('#back').click();await eventually(()=>h.archive.locator('#scope-search').inputValue().then(q=>q===command.query));
  });
  await t.test('original composition refusal retains exact editor node and body',async()=>{
   const opened=await call(command);assert.deepEqual(opened.data,{status:'opened'});const input=h.archive.locator('[data-edit-id="'+hit.id+'"]');await input.waitFor();
   await input.evaluate(n=>{globalThis.__arrivalComposing=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'synthetic'}));});const before=await input.textContent();
   const result=await call({...command,ref:null});assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(result.data,{status:'cancelled'});assert.equal(await input.textContent(),before);assert.equal(await input.evaluate(n=>n===globalThis.__arrivalComposing),true);await input.evaluate(n=>n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));
  });
  await t.test('failed current Archive read cannot borrow old successful search state for arrival',async()=>{
   const initial=await call({...command,ref:null});assert.equal(initial.ok,true,JSON.stringify(initial));assert.deepEqual(initial.data,{status:'opened'});
   await h.archive.evaluate(()=>{globalThis.__arrivalBaseSend=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=r=>r.type==='GET_PAGE'?Promise.resolve({ok:false,error:'STORAGE_FAILED'}):__arrivalBaseSend(r);});
   try{const failed=await call({...command,ref:null});assert.equal(failed.ok,true,JSON.stringify(failed));assert.deepEqual(failed.data,{status:'unavailable'});assert.match(await h.archive.locator('#error').textContent(),/无法读取/);}
   finally{await h.archive.evaluate(()=>{chrome.runtime.sendMessage=__arrivalBaseSend;delete globalThis.__arrivalBaseSend;});}
  });
  await t.test('explicit empty query opens neutral Archive without a history feed',async()=>{
   const result=await call({type:'history_open_paia',query:'',searchSnapshot:null,ref:null});assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(result.data,{status:'opened'});assert.equal(await h.archive.locator('#scope-search').inputValue(),'');assert.equal(await h.archive.locator('#document-list .search-input').count(),0);
  });
  await t.test('fresh app starts plain URL and claims only after original startup',async()=>{
   await h.archive.close();const resultPromise=call({...command,ref:null});let fresh;await eventually(()=>{fresh=h.context.pages().find(p=>p.url()==='chrome-extension://'+h.extensionId+'/ui/archive.html');return !!fresh;});h.archive=fresh;const result=await resultPromise;assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(result.data,{status:'opened'});assert.equal(await fresh.locator('#scope-search').inputValue(),command.query);
  });
  assert.equal(h.extensionNetworkRequests,0);assert.equal(await host.evaluate(()=>fixture.send),0);
 }finally{await h.close();}
});
