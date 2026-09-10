// Real MV3 runtime, but only locally fulfilled fictitious HTML in a fresh profile.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {STORAGE_KEY} from '../core/constants.js';
const require = createRequire(import.meta.url);
let playwright;
if (process.env.PLAYWRIGHT_MODULE) playwright = require(process.env.PLAYWRIGHT_MODULE);
else {
  try { playwright = require('playwright'); }
  catch { playwright = require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const SENTINEL = 'SYNTHETIC_PRIVATE_SENTINEL';
const role = `<div data-message-author-role="user" data-message-id="message-${SENTINEL}"><div class="whitespace-pre-wrap">${SENTINEL}</div></div>`;

test('role-anchor capture and content-free diagnostics reach the real archive', {timeout: 45000}, async t => {
  const context = await playwright.chromium.launchPersistentContext('', {
    headless: true,
    executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging', '--disable-background-networking', '--disable-component-update', '--disable-sync']
  });
  try {
    let syntheticBody = `<section data-testid="conversation-turn-0">${role.replace('class="whitespace-pre-wrap"', 'class="unknown-text"')}</section>`;
    await context.route(/^https?:\/\//, route => {
      if (new URL(route.request().url()).origin !== 'https://chatgpt.com') return route.abort();
      return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body:
        `<!doctype html><title>${SENTINEL}</title><header></header><main>${syntheticBody}</main>`});
    });
    const cdp = await context.browser().newBrowserCDPSession();
    const {id} = await cdp.send('Extensions.loadUnpacked', {path: fileURLToPath(new URL('..', import.meta.url))});
    const archive = await context.newPage();
    const errors = [];
    archive.on('pageerror', () => errors.push(true));
    await archive.goto(`chrome-extension://${id}/ui/archive.html`);
    const chat = await context.newPage();
    await chat.goto(`https://chatgpt.com/c/chat-${SENTINEL}`);
    const pageCDP = await context.newCDPSession(chat);
    const worlds = [];
    pageCDP.on('Runtime.executionContextCreated', ({context: world}) => worlds.push(world));
    await pageCDP.send('Runtime.enable');
    const world = worlds.find(entry => entry.name === id || entry.origin === `chrome-extension://${id}`);
    assert.ok(world, 'isolated content world is available');
    // Traps are in the extension's isolated JS world, not just the page world.
    await pageCDP.send('Runtime.evaluate', {contextId: world.id, expression: `(() => {
      const fail = () => { throw new Error('forbidden synthetic content read'); };
      Object.defineProperty(Node.prototype, 'textContent', {get: fail});
      Object.defineProperty(HTMLElement.prototype, 'innerText', {get: fail});
      Object.defineProperty(Element.prototype, 'outerHTML', {get: fail});
      Object.defineProperty(Element.prototype, 'innerHTML', {get: fail});
      Object.defineProperty(document, 'title', {get: fail});
      Object.defineProperty(HTMLInputElement.prototype, 'value', {get: fail});
      Object.defineProperty(HTMLTextAreaElement.prototype, 'value', {get: fail});
    })()`});
    const snapshot = async () => {
      const result = await archive.evaluate(() => chrome.runtime.sendMessage({type: 'GET_STATE'}));
      assert.equal(result.ok, true);
      return result.data;
    };
    const untilState = async predicate => {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const state = await snapshot();
        if (predicate(state)) return state;
        await pause(100);
      }
      assert.fail('Expected synthetic structural counts did not arrive');
    };
    const untilStructure = predicate => untilState(state => state.diagnostics.structure && predicate(state.diagnostics.structure));
    await t.test('no structure is collected before actual consent', async () => {
      await pause(2100);
      const state = await snapshot();
      assert.equal(state.records.length, 0);
      assert.equal(state.diagnostics.structure, null);
      await archive.locator('#onboarding-start').click();
      await archive.locator('#consent-check').check();
      await archive.locator('#enable-consent').click();await archive.locator('[data-view="settings"]').click();
    });
    await t.test('non-article turn proceeds through editor checks but unknown body still fails without any text reads', async () => {
      const state = await untilStructure(s => s.visibleUserRoleCount === 1 && s.turnMarkerCount === 1);
      assert.equal(state.diagnostics.status, 'ADAPTER_MISMATCH');
      assert.equal(state.diagnostics.structure.validTurnCount, 0);
      assert.equal(state.diagnostics.structure.roleIdValidCount, 1);
      assert.equal(state.diagnostics.structure.finalCandidateCount, 0);
      assert.equal(state.diagnostics.structure.editorPassedCount, 1);
      assert.equal(state.diagnostics.structure.rows[0].editorCheckAvailable, true);
      assert.equal(state.diagnostics.structure.rows[0].safeTextMatches, 0);
      assert.equal(state.records.length, 0);
      assert.equal(JSON.stringify(state.diagnostics).includes(SENTINEL), false);
      await archive.locator('#diagnostics > summary').click();
      await archive.locator('#structure-summary').waitFor({state: 'visible'});
      assert.equal((await archive.locator('#structure-summary').textContent()).includes(SENTINEL), false);
    });
    await t.test('same error/count refreshes when the missing ID moves to an ancestor', async () => {
      await chat.evaluate(marker => {
        document.querySelector('main').innerHTML = `<article data-testid="conversation-turn-0" data-message-id="message-${marker}"><div data-message-author-role="user"><div class="whitespace-pre-wrap">${marker}</div></div></article>`;
      }, SENTINEL);
      const state = await untilStructure(s => s.validTurnCount === 1 && s.roleIdValidCount === 0 && s.ancestorIdCount === 1);
      assert.equal(state.diagnostics.status, 'ADAPTER_MISMATCH');
      assert.equal(state.diagnostics.scanned, 1);
      assert.equal(state.diagnostics.structure.finalCandidateCount, 0);
      assert.equal(state.records.length, 0);
    });
    await t.test('two safe text containers remain rejected and diagnostics stay content-free', async () => {
      await chat.evaluate(marker => {
        document.querySelector('main').innerHTML = `<article data-testid="conversation-turn-0"><div data-message-author-role="user" data-message-id="message-${marker}"><div class="whitespace-pre-wrap">${marker}</div><div class="whitespace-pre-wrap">${marker}</div></div></article>`;
      }, SENTINEL);
      const state = await untilStructure(s => s.roleIdValidCount === 1 && s.rows[0].safeTextMatches === 2);
      assert.equal(state.diagnostics.status, 'ADAPTER_MISMATCH');
      assert.equal(state.diagnostics.structure.editorPassedCount, 1);
      assert.equal(state.diagnostics.structure.finalCandidateCount, 0);
      assert.equal(state.records.length, 0);
      assert.equal(JSON.stringify(state.diagnostics).includes(SENTINEL), false);
      const persisted = await archive.evaluate(async key => {const {LibraryFoundationStore:IndexedArchiveStore}=await import('../core/thought-store.js');return new IndexedArchiveStore(chrome.storage.local).snapshot();}, STORAGE_KEY);
      assert.deepEqual(persisted.diagnostics.structure, state.diagnostics.structure);
      assert.equal(persisted.records.length, 0);
      assert.equal(JSON.stringify(persisted).includes(SENTINEL), false);
      // Check actual durable storage above, then render it through a freshly loaded UI.
      await archive.reload();await archive.locator('[data-view="settings"]').click();
      await archive.locator('#diagnostics > summary').click();
      await archive.locator('#structure-summary').waitFor({state: 'visible'});
      const display = await archive.locator('#structure-summary').textContent();
      assert.equal(display.includes(SENTINEL), false);
      assert.match(display, /user role 节点：总数=1；可见=1/);
      assert.match(display, /合法 article turn=1/);
      assert.match(display, /role 格式合法=1/);
      assert.match(display, /选择器匹配=2；归属本 role=2；可见=2/);
      assert.match(display, /安全容器=2/);
      assert.match(display, /最终候选数量：0/);
      const popup = await context.newPage();
      try {
        await popup.goto(`chrome-extension://${id}/ui/popup.html`);
        await popup.locator('details > summary').click();
        const brief = await popup.locator('#diagnostic-structure').textContent();
        assert.match(brief, /user role 1，可见 1，合法 turn 1/);
        assert.match(brief, /最终候选 0/);
        assert.equal(brief.includes(SENTINEL), false);
      } finally { await popup.close(); }
      assert.equal(errors.length, 0);
    });
    await t.test('role-only messages persist once across scans, refresh and tabs while distinct IDs remain separate', async () => {
      // A fresh document removes the read traps used for rejected structures above.
      syntheticBody = role;
      await chat.reload();
      const saved = await untilState(state => state.records.length === 1);
      assert.equal(saved.records[0].originalText, SENTINEL);
      assert.equal(saved.diagnostics.structure.validTurnCount, 0);
      assert.equal(saved.diagnostics.structure.editorPassedCount, 1);
      assert.equal(saved.diagnostics.structure.finalCandidateCount, 1);
      const id = saved.records[0].id;
      await untilState(state => state.diagnostics.lastSuccessAt > saved.diagnostics.lastSuccessAt);
      assert.equal((await snapshot()).records.length, 1, 'a later completed scan deduplicates');
      await chat.reload();
      const duplicate = await context.newPage();
      try {
        await duplicate.goto(`https://chatgpt.com/c/chat-${SENTINEL}`);
        await pause(4300);
        const repeated = await snapshot();
        assert.equal(repeated.records.length, 1);
        assert.equal(repeated.records[0].id, id);
        assert.equal(repeated.records[0].contentHash, saved.records[0].contentHash);
      } finally { await duplicate.close(); }
      await chat.evaluate(html => document.querySelector('main').insertAdjacentHTML('beforeend', html), role.replace(`message-${SENTINEL}`, 'message-synthetic-second'));
      const distinct = await untilState(state => state.records.length === 2);
      assert.equal(distinct.records[0].originalText, distinct.records[1].originalText);
      assert.notEqual(distinct.records[0].sourceMessageId, distinct.records[1].sourceMessageId);
      assert.equal(JSON.stringify(distinct.diagnostics).includes(SENTINEL), false);
      const durable = await archive.evaluate(async key => {const {LibraryFoundationStore:IndexedArchiveStore}=await import('../core/thought-store.js');return new IndexedArchiveStore(chrome.storage.local).snapshot();}, STORAGE_KEY);
      assert.equal(durable.records.length, 2);
    });
    await t.test('pause clears the displayed structural report and preserves existing records', async () => {
      await archive.locator('#toggle-capture').click();
      const state = await snapshot();
      assert.equal(state.settings.enabled, false);
      assert.equal(state.diagnostics.structure, null);
      assert.equal(state.diagnostics.structureAt, null);
      assert.equal(state.records.length, 2);
    });
  } finally { await context.close(); }
});
