import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {routeComposer,isolated} from './harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),url='https://chatgpt.com/c/prompt-insertion-fixture';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const runtime of ['source','release'])test('CPV1-09 '+runtime+' native Chromium + synthetic ProseMirror integration',{timeout:180000},async t=>{
 const extensionPath=runtime==='source'?root:join(root,'work/current-release');
 if(runtime==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath,headless:true});let world;
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  await routeComposer(h.context,root);const chat=await h.context.newPage();await chat.goto(url);await chat.waitForFunction(()=>globalThis.fixture?.view);
  world=await isolated(chat,h.extensionId);
  const ui=await h.context.newPage();await ui.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
  const chosen='请保留全部细节 👩🏽‍💻\nEnglish line\n\n```js\n  const x = "汉字";\n```\n';
  const created=await rpc(ui,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:0,text:chosen}});
  await rpc(ui,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:created.revision,text:'UNSELECTED_PRIVATE_LIBRARY_CANARY'}});
  await rpc(ui,'PAIA_PROMPT_CHANGE',{change:{action:'pin',id:created.id,revision:created.revision+1}});
  const targets=await rpc(ui,'PAIA_PROMPT_TARGETS'),target=targets.find(x=>x.url===url);assert.ok(target);
  const request=()=>({id:created.id,text:chosen,tabId:target.id,url,operationId:crypto.randomUUID()});
  const insert=async fields=>rpc(ui,'PAIA_PROMPT_INSERT',fields||request());
  async function set(text,start=null,end=null){await chat.evaluate(args=>fixture.set(...args),[text,start,end]);await chat.waitForTimeout(60);}
  async function value(){return chat.evaluate(()=>fixture.text());}
  await t.test('empty exact Unicode/multiline/code, caret end, focus and actual framework state',async()=>{
   await set('');const r=await insert();assert.equal(r.status,'inserted',JSON.stringify(r));assert.equal(await value(),chosen);
   assert.equal(await chat.evaluate(()=>document.activeElement.id),'prompt-textarea');assert.equal(await chat.evaluate(()=>fixture.view.state.selection.empty),true);
   assert.equal(await chat.evaluate(()=>fixture.view.state.selection.$from.parentOffset),0,'trailing newline ends in empty paragraph');
   assert.ok(await chat.evaluate(()=>fixture.changes>0&&fixture.inputs>0));
  });
  await t.test('one actual click in trusted test entry inserts only selected text',async()=>{
   await set('');await ui.locator('#refresh').click();await ui.locator('#prompts button').first().click();await eventually(async()=>await ui.locator('#status').textContent()==='Inserted and verified. Not sent.');assert.equal(await value(),chosen);
  });
  await t.test('existing draft, current caret and reversed active selection preserve all original characters',async()=>{
   for(const [draft,a,b]of [['draft尾巴',5,5],['draft尾巴',1,5],['draft尾巴',5,1],['甲\n乙',0,0]]){
    await set(draft,a,b);const offset=Math.max(a,b),r=await insert();assert.equal(r.status,'inserted',JSON.stringify(r));assert.equal(await value(),draft.slice(0,offset)+chosen+draft.slice(offset));
   }
  });
  await t.test('blur retains last reliable caret; unavailable selection appends non-destructively',async()=>{
   await set('保留草稿',2);await chat.locator('#blur').click();await chat.evaluate(()=>getSelection().removeAllRanges());assert.equal((await insert()).status,'inserted');assert.equal(await value(),'保留'+chosen+'草稿');
   await set('可靠性变化',1);await chat.locator('#blur').click();await chat.evaluate(()=>{fixture.set('更新后的草稿');document.getElementById('blur').focus();getSelection().removeAllRanges();});
   await world.run('PAIAPromptReuseController.dispose();');
   // Reinstall production bridge to simulate a newly connected page without caret history.
   const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
   await worker.evaluate(async tabId=>chrome.scripting.executeScript({target:{tabId,frameIds:[0]},files:['content/prompt-reuse.js'],world:'ISOLATED'}),target.id);
   assert.equal((await insert()).status,'inserted');assert.equal(await value(),'更新后的草稿\n'+chosen);
  });
  await t.test('native CDP Chinese composition blocks insertion and remains usable after commit',async()=>{
   await set('');const cdp=await h.context.newCDPSession(chat);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});
   const before=await value(),r=await insert();assert.equal(r.status,'failed');assert.equal(r.reason,'composition_active');assert.equal(await value(),before);
   await chat.locator('#prompt-textarea').dispatchEvent('input',{inputType:'insertText',isComposing:false});assert.equal((await insert()).reason,'composition_active');assert.equal(await value(),before);
   await cdp.send('Input.insertText',{text:'汉'});await chat.waitForTimeout(70);const draft=await value();assert.equal((await insert()).status,'inserted');assert.equal(await value(),draft+chosen);await cdp.detach();
  });
  await t.test('uncertain acknowledgement preserves result with exactly one attempt and no retry',async()=>{
   await set('existing',8);await world.run("globalThis.__nativeInsert=document.execCommand.bind(document);document.execCommand=(...args)=>{__nativeInsert(...args);return false;}");
   const req=request(),r=await insert(req);assert.equal(r.status,'uncertain');const once=await value();assert.equal(once,'existing'+chosen);assert.equal((await insert(req)).status,'uncertain');assert.equal(await value(),once);
   await world.run('document.execCommand=__nativeInsert;');
  });
  await t.test('insertion rejected leaves draft byte-for-byte intact; explicit browser clipboard fallback',async()=>{
   await set('完整草稿 👨‍👩‍👧',3);await world.run('document.execCommand=()=>false;');assert.equal((await insert()).status,'failed');assert.equal(await value(),'完整草稿 👨‍👩‍👧');await world.run('document.execCommand=__nativeInsert;');
   await ui.bringToFront();await ui.locator('#refresh').click();await ui.locator('#prompts button').first().click();await eventually(async()=>!(await ui.locator('#prompts button').nth(1).isHidden()));
   await ui.bringToFront();await ui.locator('#prompts button').nth(1).click();await eventually(async()=>['Copied. Paste manually.','Copy failed. Prompt remains available.'].includes(await ui.locator('#status').textContent()));
   assert.equal(await ui.locator('#status').textContent(),'Copied. Paste manually.');
   await ui.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('synthetic denied');};});await ui.locator('#prompts button').nth(1).click();await eventually(async()=>await ui.locator('#status').textContent()==='Copy failed. Prompt remains available.');
  });
  await t.test('SPA mismatch and unsupported composer refuse without draft replacement',async()=>{
   await set('保留');await chat.evaluate(()=>history.pushState({},'', '/c/changed-fixture'));assert.equal((await insert()).status,'failed');assert.equal(await value(),'保留');await chat.evaluate(url=>history.replaceState({},'',url),url);
   await chat.evaluate(()=>document.getElementById('prompt-textarea').classList.remove('ProseMirror'));assert.equal((await insert()).status,'failed');assert.equal(await value(),'保留');
  });
  await t.test('zero send/Enter, zero Provider/network, no draft capture, no full-library host exposure',async()=>{
   assert.deepEqual(await chat.evaluate(()=>({send:fixture.send,enter:fixture.enter,adapter:typeof PAIAChatGPTComposerAdapter,storage:[localStorage.length,sessionStorage.length]})),{send:0,enter:0,adapter:'undefined',storage:[0,0]});
   assert.doesNotMatch(await chat.locator('body').textContent(),/UNSELECTED_PRIVATE_LIBRARY_CANARY/);
   assert.equal((await h.state()).records.length,0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.historyRequests,0);assert.deepEqual(h.errors,[]);
  });
 }finally{await world?.cdp.detach();await h.close();}
});
