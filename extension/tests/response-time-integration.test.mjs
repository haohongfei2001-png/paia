import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const chatID = 'synthetic-chat-013';
const ids = [1, 2, 3, 4].map(n => `synthetic-message-${n}`);
const userHTML = id => `<div data-message-author-role="user" data-message-id="${id}"><div class="whitespace-pre-wrap">虚构测试消息</div></div>`;
const html = `<!doctype html><title>合成 PoC</title><main>${ids.map(userHTML).join('')}</main>`;
const pause = ms => new Promise(r => setTimeout(r, ms));
const assertOriginals = (actual, before) => {
  const originalFields = records => records.map(({sourceSentAt, timeSource, timeConfidence, timeCandidates, ...record}) => record);
  assert.deepEqual(originalFields(actual), originalFields(before));
};
async function until(fn, predicate) {
  let last;
  for (let i = 0; i < 70; i++) { const result = await fn(); last = result; if (predicate(result)) return result; await pause(150); }
  assert.fail('synthetic response diagnostic did not reach expected state: ' + JSON.stringify(last));
}
test('real MV3 MAIN → isolated → memory relay → diagnostic UI; four synthetic records unchanged', {timeout: 45000}, async () => {
  const context = await chromium.launchPersistentContext('', {headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging', '--disable-background-networking', '--disable-component-update', '--disable-sync']});
  let times = ids.map((id, n) => ({id, author: {role: 'user'}, create_time: Math.floor(Date.now() / 1000) - 86400 * (40 - n), content: {parts: ['SYNTHETIC_RESPONSE_BODY']}}));
  let postValue = null; let postType = 'application/json'; let responseRequests = 0;
  try {
    await context.route(/^https?:\/\//, route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://chatgpt.com') return route.abort();
      if (url.pathname === `/backend-api/conversation/${chatID}`) {
        responseRequests++;
        return route.fulfill({contentType: 'application/json', body: JSON.stringify({conversation_id: chatID, mapping: Object.fromEntries(times.map((message, i) => [i, {message}]))})});
      }
      if (url.pathname === '/backend-api/synthetic-history-v2') {
        responseRequests++;
        return route.fulfill({contentType: 'application/json', body: JSON.stringify({conversation_id: chatID, mapping: Object.fromEntries(times.map((message, i) => [i, {message}]))})});
      }
      if (url.pathname === '/backend-api/conversation') { responseRequests++; return route.fulfill({contentType: postType, body: postType === 'application/json' ? JSON.stringify(postValue) : 'SYNTHETIC_RSC_SECRET'}); }
      return route.fulfill({contentType: 'text/html', body: html});
    });
    const cdp = await context.browser().newBrowserCDPSession();
    const {id: extension} = await cdp.send('Extensions.loadUnpacked', {path: root});
    const archive = await context.newPage(); await archive.goto(`chrome-extension://${extension}/ui/archive.html`);
    const send = payload => archive.evaluate(p => chrome.runtime.sendMessage(p), payload);
    await send({type: 'CONSENT', accepted: true});
    const chat = await context.newPage(); const errors=[]; chat.on('pageerror', e => errors.push(e.message)); await chat.goto(`https://chatgpt.com/c/${chatID}`);
    const state = () => send({type: 'GET_STATE'}).then(r => r.data);
    const before = (await until(state, s => s.records.length === 4)).records;
    const diagnostic = await context.newPage(); await diagnostic.goto(`chrome-extension://${extension}/ui/response-time.html`);
    const view = () => diagnostic.evaluate(() => chrome.runtime.sendMessage({type: 'RESPONSE_VIEW'})).then(r => r.data);
    await until(view, v => v.summary?.canonical === 4);
    assert.equal(responseRequests, 0, 'extension creates no requests');
    await chat.evaluate(path => window.fetch(path).then(r => r.json()), `/backend-api/conversation/${chatID}`);
    const matched = await until(view, v => v.summary?.matched === 4);
    assert.deepEqual(errors, []);
    assert.equal(matched.summary.parseable, 4); assert.equal(matched.summary.earliestAge, 'older');
    assertOriginals((await state()).records, before);
    await until(() => diagnostic.locator('#summary').textContent(), text => text.includes('匹配：4'));
    const safeText = await diagnostic.locator('body').textContent();
    for (const forbidden of [chatID, ...ids, 'SYNTHETIC_RESPONSE_BODY', String(times[0].create_time)]) assert.equal(safeText.includes(forbidden), false);
    const denied = await diagnostic.evaluate(() => chrome.runtime.sendMessage({type: 'GET_STATE'})); assert.equal(denied.ok, false);
    await diagnostic.locator('details > summary').click();
    await diagnostic.locator('#arm').click();
    await until(view, v => v.summary?.armed);
    const newID = 'synthetic-message-new';
    postValue = {conversation_id: chatID, message: {id: newID, author: {role: 'user'}, create_time: Date.now() / 1000, content: {parts: ['SYNTHETIC_RESPONSE_BODY']}}};
    await chat.evaluate(async ({markup}) => { await window.fetch('/backend-api/conversation', {method: 'POST'}); document.querySelector('main').insertAdjacentHTML('beforeend', markup); }, {markup: userHTML(newID)});
    const controlled = await until(view, v => v.summary?.deltas.length === 1);
    assert.ok(Math.abs(controlled.summary.deltas[0]) <= 5);
    assertOriginals((await state()).records.slice(0, 4), before);
    assert.equal(responseRequests, 2);
    // A rejected send response must not overwrite B's successful load trace.
    postType = 'text/x-component';
    await chat.evaluate(() => window.fetch('/backend-api/conversation', {method: 'POST'}));
    const reasons = await until(view, v => v.summary?.rejectionDiagnostics.byEndpoint.message_send_or_stream_candidate.last?.reason === 'CONTENT_TYPE_NOT_ALLOWED');
    assert.equal(reasons.summary.rejectionDiagnostics.byEndpoint.conversation_load_candidate.last.reason, 'ACCEPTED');
    assert.equal(reasons.summary.rejectionDiagnostics.observedFetchResponseCount, 3);
    assert.equal(reasons.summary.metadata, 5);
    await until(() => diagnostic.locator('#rejection-summary').textContent(), text => text.includes('CONTENT_TYPE_NOT_ALLOWED'));
    const reasonText = await diagnostic.locator('#rejection-summary').textContent();
    for (const secret of [chatID, ...ids, 'SYNTHETIC_RSC_SECRET', String(times[0].create_time)]) assert.equal(reasonText.includes(secret), false);
    assertOriginals((await state()).records.slice(0, 4), before);

    const stored = await archive.evaluate(() => chrome.storage.local.get(null));
    assert.equal(JSON.stringify(stored).includes('SYNTHETIC_RESPONSE_BODY'), false);
    assert.ok((await state()).records.every(r => Object.hasOwn(r, 'sourceSentAt')));
    await chat.reload();
    await until(view, v => v.summary?.canonical === 4 && v.summary.metadata === 0 && !v.summary.armed);
    await until(view, v => v.summary?.fingerprints?.allowed === true);
    await chat.evaluate(() => window.fetch('/backend-api/synthetic-history-v2?variant=synthetic'));
    const fp = await until(view, v => v.summary?.fingerprints?.groups.some(g => g.detail.candidate));
    assert.equal(fp.summary.metadata, 0, 'fingerprints do not enter accepted metadata');
    assert.equal(fp.summary.acceptedResponses, 0);
    assert.equal(fp.summary.fingerprints.groups[0].matched, 4);
    await until(() => diagnostic.locator('#fingerprint-summary').textContent(), text => text.includes('matches: 4'));
    const fingerprintText = await diagnostic.locator('#fingerprint-summary').textContent();
    for (const secret of [chatID, ...ids, String(times[0].create_time), 'SYNTHETIC_RESPONSE_BODY', 'synthetic-history-v2']) assert.equal(fingerprintText.includes(secret), false);
    assertOriginals((await state()).records.slice(0, 4), before);
    // A second live ordinary chat removes the fingerprint lease and clears its data.
    const second = await context.newPage(); await second.goto(`https://chatgpt.com/c/${chatID}`);
    await until(view, v => v.pages === 2);
    await pause(1000); await second.close();
    await until(view, v => v.pages === 1 && v.summary?.fingerprints?.allowed && v.summary.fingerprints.groups.length === 0);
    await chat.evaluate(path => window.fetch(path), `/backend-api/conversation/${chatID}`);
    await until(view, v => v.summary?.matched === 4);
    assertOriginals((await state()).records.slice(0, 4), before);
    await send({type: 'SET_ENABLED', enabled: false});
    await until(view, v => v.pages === 0);
    const beforeRequests = responseRequests; await pause(1000); assert.equal(responseRequests, beforeRequests);
  } finally { await context.close(); }
});
