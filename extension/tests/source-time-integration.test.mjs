import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {historicalFixture, chat as chatID, ids} from './fixtures/source-time.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const visible = ids.slice(0, 3);
const markup = list => list.map(id => `<div data-message-author-role="user" data-message-id="${id}"><div class="whitespace-pre-wrap">虚构时间语义样本</div></div>`).join('');
const html = `<!doctype html><title>合成时间验证</title><main>${markup(visible)}</main>`;
const pause = ms => new Promise(r => setTimeout(r, ms));
const assertOriginals = (actual, before) => {
  const originalFields = records => records.map(({sourceSentAt, timeSource, timeConfidence, timeCandidates, ...record}) => record);
  assert.deepEqual(originalFields(actual), originalFields(before));
};
async function until(fn, predicate) {
  let last;
  for (let i=0;i<80;i++) { last=await fn();if(predicate(last))return last;await pause(150); }
  assert.fail('synthetic semantic state did not settle: '+JSON.stringify(last));
}
test('temporary offline Chrome: source semantics, age UI, conflicts, lifecycle, privacy and unchanged archive', {timeout: 90000}, async () => {
  const context = await chromium.launchPersistentContext('', {headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ignoreDefaultArgs:['--disable-extensions'], args:['--enable-unsafe-extension-debugging','--disable-background-networking','--disable-component-update','--disable-sync']});
  let data=historicalFixture(Math.floor(Date.now()/1000)-40*86400);
  let requests=0;let expectedRequests=0;const errors=[];
  try {
    await context.route(/^https?:\/\//, route => {
      const url=new URL(route.request().url());
      if(url.origin!=='https://chatgpt.com')return route.abort();
      if(url.pathname==='/backend-api/synthetic-semantic-history') {requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}
      return route.fulfill({contentType:'text/html',body:html});
    });
    const cdp=await context.browser().newBrowserCDPSession();
    const {id:extension}=await cdp.send('Extensions.loadUnpacked',{path:root});
    const archive=await context.newPage();await archive.goto(`chrome-extension://${extension}/ui/archive.html`);
    const send=payload=>archive.evaluate(p=>chrome.runtime.sendMessage(p),payload);
    await send({type:'CONSENT',accepted:true});
    const chat=await context.newPage();chat.on('pageerror',e=>errors.push(e.message));await chat.goto(`https://chatgpt.com/c/${chatID}`);
    const state=()=>send({type:'GET_STATE'}).then(r=>r.data);
    const before=(await until(state,s=>s.records.length===3)).records;
    const diagnostic=await context.newPage();diagnostic.on('pageerror',e=>errors.push(e.message));
    await diagnostic.goto(`chrome-extension://${extension}/ui/response-time.html`);
    const view=()=>diagnostic.evaluate(()=>chrome.runtime.sendMessage({type:'RESPONSE_VIEW'})).then(r=>r.data);
    const semanticText=()=>diagnostic.locator('#semantic-summary').textContent();
    const ready=()=>until(view,v=>v.summary?.semantics?.allowed && v.summary.semantics.canonical===3);
    const request=async()=>{expectedRequests++;await chat.evaluate(()=>window.fetch('/backend-api/synthetic-semantic-history?fixture=only').then(()=>undefined));};
    await ready();assert.equal(requests,0);
    await request();
    const first=await until(view,v=>v.summary?.semantics?.matched===3);
    assert.equal(first.summary.metadata,0);assert.equal(first.summary.acceptedResponses,0);
    assert.equal(first.summary.semantics.orderPairs,2);assert.equal(first.summary.semantics.beforeCapture,3);
    assert.equal(first.summary.fingerprints.groups[0].detail.messageCount,55);
    await until(semanticText,t=>t.includes('exact match rate = 100%'));
    assert.match(await semanticText(),/timeConfidenceCandidate = unknown/);
    await diagnostic.locator('#period').selectOption('today');assert.match(await semanticText(),/ageBucket = fail/);
    await diagnostic.locator('#period').selectOption('older');assert.match(await semanticText(),/timeConfidenceCandidate = high/);
    assert.equal(await diagnostic.locator('#period option').count(),5);
    const safe=JSON.stringify(await view())+await semanticText();
    for(const secret of [chatID,...ids,'SYNTHETIC_USER_RESPONSE_SECRET','SYNTHETIC_ASSISTANT_SECRET',String(data.mapping[ids[0]].message.create_time),'https://'])assert.equal(safe.includes(secret),false);
    await mkdir(new URL('../work/',import.meta.url),{recursive:true});
    await diagnostic.setViewportSize({width:1100,height:1100});
    await diagnostic.screenshot({path:fileURLToPath(new URL('../work/source-time-synthetic-wide.png',import.meta.url)),fullPage:true});
    await diagnostic.setViewportSize({width:720,height:1000});
    assert.equal(await diagnostic.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    await diagnostic.screenshot({path:fileURLToPath(new URL('../work/source-time-synthetic-narrow.png',import.meta.url)),fullPage:true});
    await request();await until(view,v=>v.summary?.semantics?.observations===2);
    assert.match(await semanticText(),/timeConfidenceCandidate = high/);
    data.mapping[ids[1]].message.create_time+=0.25;
    await request();await until(view,v=>v.summary?.semantics?.conflicts===1);
    await until(semanticText,t=>t.includes('noConflict = fail'));
    assert.match(await semanticText(),/timeConfidenceCandidate = unknown/);
    data.mapping[ids[1]].message.create_time-=0.25;
    await request();await until(view,v=>v.summary?.semantics?.observations===4);
    assert.equal((await view()).summary.semantics.conflicts,1);
    assertOriginals((await state()).records,before);
    const stored=await archive.evaluate(()=>chrome.storage.local.get(null));
    for(const secret of ['semantics','SYNTHETIC_USER_RESPONSE_SECRET','SYNTHETIC_ASSISTANT_SECRET'])assert.equal(JSON.stringify(stored).includes(secret),false);
    assert.equal((await diagnostic.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATE'}))).ok,false);
    // Full document reload discards mappings, sticky evidence and manual selection.
    await chat.reload();await until(view,v=>v.summary?.semantics?.allowed && v.summary.semantics.conflicts===0 && v.summary.semantics.matched===0);
    await until(()=>diagnostic.locator('#period').inputValue(),v=>v==='unknown');await ready();await request();
    await until(view,v=>v.summary?.semantics?.matched===3);
    await until(semanticText,t=>t.includes('exact match rate = 100%'));
    await diagnostic.locator('#period').selectOption('older');assert.match(await semanticText(),/timeConfidenceCandidate = high/);
    // Canonical range changes also revoke the manual period without rewriting records.
    await chat.evaluate(()=>document.querySelector('main').lastElementChild.remove());
    await until(view,v=>v.summary?.semantics?.canonical===2);
    await until(()=>diagnostic.locator('#period').inputValue(),v=>v==='unknown');
    await chat.reload();await ready();await request();await until(view,v=>v.summary?.semantics?.matched===3);
    await until(semanticText,t=>t.includes('exact match rate = 100%'));
    await diagnostic.locator('#period').selectOption('older');
    // A second known ordinary document clears the lease and cached data.
    const second=await context.newPage();await second.goto(`https://chatgpt.com/c/${chatID}`);
    await until(view,v=>v.pages===2);await until(()=>diagnostic.locator('#period').inputValue(),v=>v==='unknown');
    await pause(800);await second.close();
    await until(view,v=>v.pages===1 && v.summary?.semantics?.allowed && v.summary.semantics.matched===0);
    // Pause clears diagnostics, while page fetch still happens exactly once and stays unobserved.
    await send({type:'SET_ENABLED',enabled:false});await until(view,v=>v.pages===0);
    await until(()=>diagnostic.locator('#period').isDisabled(),v=>v);
    await pause(700);await request();
    await send({type:'SET_ENABLED',enabled:true});await ready();
    assert.equal((await view()).summary.semantics.matched,0);
    assertOriginals((await state()).records,before);
    await request();await until(view,v=>v.summary?.semantics?.matched===3);
    await until(semanticText,t=>t.includes('exact match rate = 100%'));
    await diagnostic.locator('#period').selectOption('older');
    // A hung runtime request must expire a previously high UI result locally.
    await diagnostic.evaluate(()=>{chrome.runtime.sendMessage=()=>new Promise(()=>{});});
    await until(()=>diagnostic.locator('#period').isDisabled(),v=>v);
    assert.doesNotMatch(await semanticText(),/timeConfidenceCandidate = high/);
    await diagnostic.reload();await until(()=>diagnostic.locator('#period').inputValue(),v=>v==='unknown');
    assert.doesNotMatch(await semanticText(),/timeConfidenceCandidate = high/);
    // Same-count route navigation has a different safe generation, no old candidate inheritance.
    await chat.goto('https://chatgpt.com/c/synthetic-semantic-other');
    await until(view,v=>v.summary?.semantics?.allowed && v.summary.semantics.canonical===3 && v.summary.semantics.matched===0);
    assert.equal(await diagnostic.locator('#period').inputValue(),'unknown');
    await pause(600);assert.equal(requests,expectedRequests);assert.deepEqual(errors,[]);
  } finally {await context.close();}
});
