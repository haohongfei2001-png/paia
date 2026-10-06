import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {routeComposer,isolated} from './harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),url='https://chatgpt.com/c/prompt-insertion-fixture';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const runtime of ['source','release'])test('bounded current composer compatibility '+runtime,{timeout:180000},async t=>{
 const extensionPath=runtime==='source'?root:join(root,'work/current-release');if(runtime==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath,headless:true,launchThroughPort:true});let world;
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await rpc(h.archive,'SET_ENABLED',{enabled:false});
  const ui=await h.context.newPage();await ui.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');const text='Compatibility synthetic';await rpc(ui,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:0,text}});
  await routeComposer(h.context,root,{signature:'current'});const page=await h.context.newPage();await page.goto(url);await page.waitForFunction(()=>globalThis.fixture?.view);await page.addStyleTag({content:'form{position:fixed;bottom:20px;left:20px;right:20px;padding:12px}'});
  world=await isolated(page,h.extensionId);const orb=page.locator('[data-paia-prompt-surface]');const status=()=>world.run('(()=>{const a=new PAIAChatGPTComposerAdapter();try{return a.discover().status;}finally{a.dispose();}})()');
  await t.test('id-less current form displays orb and inserts with capture paused',async()=>{
   assert.equal(await page.locator('#prompt-textarea').count(),0);await orb.waitFor({state:'visible'});assert.equal(await status(),'visible');await page.evaluate(()=>{fixture.view.dom.removeAttribute('data-composer-markdown');fixture.view.dom.removeAttribute('role');});assert.equal(await status(),'visible');await page.evaluate(()=>fixture.set('AB',1));await page.waitForTimeout(60);await orb.click();await eventually(()=>page.frames().some(f=>f.url().includes('/ui/prompt-surface.html#')));const card=page.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));await card.getByRole('button',{name:text,exact:true}).click();await eventually(()=>card.locator('#status').textContent().then(x=>x==='已插入，未发送。'));assert.equal(await page.evaluate(()=>fixture.text()),'A'+text+'B');await card.locator('#close').click();
  });
  await t.test('unrelated and message-body editors excluded; ambiguous trusted candidates fail closed',async()=>{
   await page.evaluate(()=>{const d=document.createElement('div');d.id='decoys';d.innerHTML='<div contenteditable="true">unrelated</div><article><form data-chatgpt-composer><div class="ProseMirror" contenteditable="true">message</div></form></article><div data-message-author-role="assistant"><div id="prompt-textarea" class="ProseMirror" contenteditable="true">message</div></div>';document.body.append(d);});assert.equal(await status(),'visible');
   await page.evaluate(()=>{const form=document.createElement('form');form.id='duplicate';form.setAttribute('data-chatgpt-composer','');form.innerHTML='<div class="ProseMirror" contenteditable="true">second</div>';document.body.append(form);});assert.equal(await status(),'composer_ambiguous');await orb.waitFor({state:'hidden'});
   await page.evaluate(()=>document.getElementById('duplicate').hidden=true);assert.equal(await status(),'visible');await orb.waitFor({state:'visible'});await page.evaluate(()=>{document.getElementById('duplicate').remove();document.getElementById('decoys').remove();});
  });
  await t.test('disabled, inert, hidden and noneditable ancestors suppress discovery and recover dynamically',async()=>{
   for(const [name,value]of [['hidden',''],['inert',''],['aria-disabled','true'],['aria-hidden','true'],['aria-readonly','true'],['disabled',''],['style','opacity:0'],['style','visibility:hidden'],['style','display:none']]){
    await page.evaluate(([k,v])=>document.getElementById('form').setAttribute(k,v),[name,value]);assert.equal(await status(),'composer_unrecognized',name+value);await orb.waitFor({state:'hidden'});await page.evaluate(k=>document.getElementById('form').removeAttribute(k),name);await orb.waitFor({state:'visible'});
   }
  });
  await t.test('independent markdown textbox without ProseMirror class shares the same finder and exact insertion',async()=>{
   await page.evaluate(()=>{const old=fixture.view.dom;const node=document.createElement('div');node.id='native-fixture';node.setAttribute('contenteditable','true');node.setAttribute('data-composer-markdown','');node.setAttribute('role','textbox');node.style.cssText='min-height:44px;white-space:pre-wrap';node.textContent='XY';old.replaceWith(node);node.focus();const range=document.createRange();range.setStart(node.firstChild,1);range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);});
   assert.equal(await status(),'visible');await orb.waitFor({state:'visible'});await page.waitForTimeout(60);await orb.click();await eventually(()=>page.frames().some(f=>f.url().includes('/ui/prompt-surface.html#')));const card=page.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));await card.getByRole('button',{name:text,exact:true}).click();await eventually(()=>card.locator('#status').textContent().then(x=>x==='已插入，未发送。'));assert.equal(await page.locator('#native-fixture').textContent(),'X'+text+'Y');await card.locator('#close').click();
   await page.evaluate(()=>document.getElementById('native-fixture').removeAttribute('data-composer-markdown'));assert.equal(await status(),'composer_unrecognized');await orb.waitFor({state:'hidden'});
  });
  await t.test('popup has no permanent diagnostic surface or background diagnostic request',async()=>{
   const popup=await h.context.newPage();await popup.goto('chrome-extension://'+h.extensionId+'/ui/popup.html');await popup.locator('#enabled-state').filter({hasText:'收录已暂停'}).waitFor();
   const before=await h.state();await popup.evaluate(()=>{const original=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.diagnosticRequests=0;chrome.runtime.sendMessage=message=>{if(message.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC')diagnosticRequests++;return original(message);};});
   assert.equal(await popup.locator('#prompt-reuse-diagnostics,#diagnostic-prompt-reuse,#popup-internal-tools').count(),0,'retired ordinary diagnostics have no DOM owner');await popup.locator('#update-details summary').click();await popup.locator('#update-details summary').click();assert.equal(await popup.evaluate(()=>diagnosticRequests),0);assert.deepEqual(await h.state(),before,'normal popup help cannot collect or mutate content');await popup.close();
  });
  await t.test('zero send, Provider requests, draft capture or extension network',async()=>{assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);assert.equal((await h.state()).records.length,0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);});
 }finally{await world?.cdp.detach();await h.close();}
});
