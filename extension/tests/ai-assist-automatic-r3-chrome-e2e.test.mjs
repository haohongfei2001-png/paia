import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {isolated} from './harness/prompt-composer.mjs';

// Actual unpacked source worker, content owners, private R3 frame and Chromium
// editing transaction. Synthetic offline HTML uses the supported contenteditable
// signature; this does not claim a hosted ChatGPT or ProseMirror integration.
const url='https://chatgpt.com/c/automatic-r3-fixture';
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:16px sans-serif}main{padding:20px}form{position:fixed;left:200px;right:100px;bottom:20px;padding:10px;border:1px solid #ccc;background:white}#prompt-textarea{min-height:48px;white-space:pre-wrap}article{margin:10px}</style>
<main><section id="history"><div data-message-author-role="user" data-message-id="user-history">Synthetic sent input</div><article><div data-message-author-role="assistant" data-message-id="reply-history"><div class="markdown"><p>Reply "historical".</p></div></div><button data-testid="copy-turn-action-button">Copy</button></article></section><div id="noise"></div></main>
<form data-chatgpt-composer><div id="prompt-textarea" class="ProseMirror" contenteditable="true" role="textbox"><p><br class="ProseMirror-trailingBreak"></p></div><button id="send" type="submit">Send</button></form>
<script>window.fixture={send:0,enter:0,inputs:0,round:0};const composer=document.getElementById('prompt-textarea');document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();fixture.send++});composer.addEventListener('keydown',e=>{if(e.key==='Enter')fixture.enter++});composer.addEventListener('input',e=>{if(e.isTrusted)fixture.inputs++});fixture.text=()=>composer.textContent;
fixture.start=()=>{fixture.round++;const user=document.createElement('div');user.dataset.messageAuthorRole='user';user.dataset.messageId='user-'+fixture.round;user.textContent='Synthetic new sent input';const article=document.createElement('article');article.innerHTML='<div data-message-author-role="assistant" data-message-id="reply-'+fixture.round+'"><div class="markdown"><p>Reply "continue".</p></div></div>';document.getElementById('history').append(user,article);fixture.latest=article;const stop=document.createElement('button');stop.dataset.testid='stop-button';stop.textContent='Stop';document.querySelector('form').append(stop);};fixture.finish=(text='Reply "continue".')=>{fixture.latest.querySelector('p').textContent=text;document.querySelector('[data-testid="stop-button"]').remove();const copy=document.createElement('button');copy.dataset.testid='copy-turn-action-button';copy.textContent='Copy';fixture.latest.append(copy);};</script>`;
async function fixture(t){
 const h=await FakeChatGPT.start();let world;t.after(async()=>{await world?.cdp.detach().catch(()=>{});await h.close();});
 await h.archive.locator('#enable-consent').click();
 const configured=await h.archive.evaluate(async()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true}));assert.equal(configured.ok,true);
 await h.context.route(url,route=>route.fulfill({contentType:'text/html',body:html}));
 const page=await h.context.newPage();await page.goto(url);await page.bringToFront();await page.waitForSelector('[data-paia-prompt-surface]');world=await isolated(page,h.extensionId);
 await eventually(()=>world.run(`chrome.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_STATUS'}).then(r=>r.ok&&r.data.enabled)`),'original local permission ready');
 const surface=()=>page.locator('[data-paia-prompt-surface]').getAttribute('data-surface-form');
 const frame=()=>page.frames().find(f=>f.url().startsWith('chrome-extension://'+h.extensionId+'/ui/prompt-surface.html#'));
 const saved=()=>h.archive.evaluate(()=>chrome.storage.local.get('promptSurfaceV1'));
 const start=async()=>{await page.evaluate(()=>fixture.start());await pause(100);};
 const finish=async(text)=>page.evaluate(text=>fixture.finish(text),text);
 return {h,page,world,surface,frame,saved,start,finish};
}
test('actual Free source automatically turns the original orb into one capsule and first click inserts without Send',async t=>{
 const f=await fixture(t);assert.equal(await f.surface(),'orb');assert.equal(f.frame(),undefined,'no board or hidden generation view has opened');await pause(800);assert.equal(await f.surface(),'orb','historical reply is never offered');
 const before=await f.saved();await f.start();await pause(900);assert.equal(await f.surface(),'orb','streaming does not offer');await f.finish();
 await eventually(async()=>await f.surface()==='capsule','new complete reply automatically opens original capsule');const card=f.frame();assert.ok(card);await eventually(async()=>await card.locator('#capsule-text').textContent()==='continue','qualified full suggestion text');
 assert.equal(f.page.frames().filter(x=>x.url().includes('/ui/prompt-surface.html#')).length,1);assert.equal(f.page.frames().some(x=>x.url().includes('#next-')),false);
 assert.equal((await f.saved()).promptSurfaceV1?.collapsedForm,before.promptSurfaceV1?.collapsedForm,'transient offer never changes persisted collapsed preference');
 await card.locator('#capsule-use').click();await eventually(async()=>await f.page.evaluate(()=>fixture.text())==='continue','first actual click inserts entire suggestion');
 assert.deepEqual(await f.page.evaluate(()=>({send:fixture.send,enter:fixture.enter,inputs:fixture.inputs})),{send:0,enter:0,inputs:1});assert.equal(f.h.externalRequests,0);assert.equal(f.h.extensionNetworkRequests,0);
});
test('original capsule preserves a real draft and never auto-inserts during unrelated DOM and viewport churn',async t=>{
 const f=await fixture(t);await f.start();await f.finish();await eventually(async()=>await f.surface()==='capsule','automatic local capsule');
 await f.page.evaluate(()=>{const noise=document.getElementById('noise');for(let i=0;i<100;i++){noise.textContent='unrelated '+i;window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('scroll'));}});await pause(850);assert.equal(await f.page.evaluate(()=>fixture.text()),'');assert.equal(await f.surface(),'capsule');
 await f.page.locator('#prompt-textarea').click();await f.page.keyboard.type('Existing draft.');await pause(1000);await eventually(async()=>await f.surface()==='capsule','idle offer resumes without generation');const card=f.frame();await eventually(async()=>await card.locator('#capsule-text').textContent()==='continue','same current suggestion resumes');await card.locator('#capsule-use').click();await eventually(async()=>await f.page.evaluate(()=>fixture.text())==='Existing draft.continue','exact draft is preserved at saved caret');assert.equal(await f.page.evaluate(()=>fixture.send),0);
});
test('a suggestion arriving while the original board is open waits for its close and preserves the saved orb preference',async t=>{
 const f=await fixture(t);const box=await f.page.locator('[data-paia-prompt-surface]').boundingBox();await f.page.mouse.click(box.x+24,box.y+24);await eventually(async()=>await f.surface()==='board','original board opens');await f.start();await f.finish();await pause(1800);assert.equal(await f.surface(),'board');
 const anchor=await f.page.locator('[data-paia-prompt-surface]').boundingBox();await f.page.mouse.click(anchor.x+24,anchor.y+24);await eventually(async()=>await f.surface()==='capsule','ready suggestion is shown after board close');assert.notEqual((await f.saved()).promptSurfaceV1?.collapsedForm,'capsule');assert.equal(await f.page.evaluate(()=>fixture.send),0);
});
