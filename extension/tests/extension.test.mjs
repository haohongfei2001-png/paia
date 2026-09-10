import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
if (process.env.PLAYWRIGHT_MODULE) playwright = require(process.env.PLAYWRIGHT_MODULE);
else {
  try { playwright = require('playwright'); }
  catch { playwright = require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}
const extensionPath = fileURLToPath(new URL('..', import.meta.url));
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const message = (id, text) => `<article data-testid="conversation-turn-${id}"><div data-message-author-role="user" data-message-id="${id}"><div class="whitespace-pre-wrap">${text}</div></div></article>`;
const original = '仅供自动测试的虚构用户文字';
const initialHtml = `<!doctype html><html><head><title>虚构集成测试 - ChatGPT</title><style>.whitespace-pre-wrap{white-space:pre-wrap}main{min-height:20px}</style></head><body><header>虚构顶部</header><main>${message('message-fixture-001', original)}<article data-testid="conversation-turn-ai"><div data-message-author-role="assistant" data-message-id="assistant-fixture-001"><div class="whitespace-pre-wrap">虚构 AI 回复，不得保存</div></div></article><textarea>虚构未发送草稿，不得保存</textarea></main></body></html>`;

test('real MV3 extension integrates with synthetic ChatGPT pages in a temporary unsigned-in Chrome', {timeout: 60000}, async (t) => {
  // Empty user-data-dir makes Playwright create and clean up its own temporary profile.
  const context = await playwright.chromium.launchPersistentContext('', {
    headless: true,
    executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging', '--disable-background-networking', '--disable-component-update', '--disable-sync']
  });
  try {
    await context.route(/^https?:\/\//, (route) => {
      // The ChatGPT origin is fulfilled locally, never contacted.
      if (new URL(route.request().url()).origin === 'https://chatgpt.com') return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: initialHtml});
      return route.abort();
    });
    const cdp = await context.browser().newBrowserCDPSession();
    const version = await cdp.send('Browser.getVersion');
    t.diagnostic(`Synthetic browser: ${version.product}; no signed-in ChatGPT compatibility claim.`);
    const {id} = await cdp.send('Extensions.loadUnpacked', {path: extensionPath});
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await worker.evaluate(() => {
      globalThis.syntheticSenders = [];
      chrome.runtime.onMessage.addListener((request, sender) => {
        if (request.type === 'CAPTURE') globalThis.syntheticSenders.push({
          documentPath: new URL(sender.url).pathname,
          tabPath: sender.tab?.url ? new URL(sender.tab.url).pathname : null,
          origin: sender.origin,
          target: request.chat.id
        });
      });
    });
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/ui/popup.html`);
    const send = (request) => popup.evaluate((payload) => chrome.runtime.sendMessage(payload), request);
    const snapshot = async () => {
      const result = await send({type: 'GET_STATE'});
      assert.equal(result.ok, true);
      return result.data;
    };
    const waitForCount = async (count) => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const state = await snapshot();
        if (state.records.length === count) return state;
        await pause(150);
      }
      const state = await snapshot();
      assert.equal(state.records.length, count, `record count, diagnostic=${state.diagnostics.status}`);
      return state;
    };
    const chat = await context.newPage();
    await chat.goto('https://chatgpt.com/c/chat-fixture-001');

    await t.test('default consent gate rejects capture, with the real popup showing zero', async () => {
      await pause(2300);
      assert.equal((await snapshot()).records.length, 0);
      assert.equal((await send({type: 'GET_STATUS'})).data.consented, false);
      assert.equal(await popup.locator('#record-count').textContent(), '0');
    });

    await t.test('explicit UI-context consent permits only rendered sent user text', async () => {
      assert.equal((await send({type: 'CONSENT', accepted: true})).ok, true);
      const state = await waitForCount(1);
      assert.equal(state.records[0].originalText, original);
      assert.equal(state.records[0].chatId, 'chat-fixture-001');
      assert.match(state.records[0].contentHash, /^[a-f0-9]{64}$/);
    });

    await t.test('popup pause prevents capture; resume captures the now displayed message', async () => {
      await popup.locator('#toggle-capture').filter({hasText: '暂停捕获'}).click();
      assert.equal((await send({type: 'GET_STATUS'})).data.enabled, false);
      await chat.evaluate((html) => document.querySelector('main').insertAdjacentHTML('beforeend', html), message('message-fixture-002', '虚构暂停期间发送的文字'));
      await pause(2300);
      assert.equal((await snapshot()).records.length, 1);
      await popup.locator('#toggle-capture').filter({hasText: '恢复捕获'}).click();
      await waitForCount(2);
    });

    const duplicateTab = await context.newPage();
    await t.test('a second tab and refresh do not duplicate a captured source', async () => {
      await duplicateTab.goto('https://chatgpt.com/c/chat-fixture-001');
      await pause(4300);
      assert.equal((await snapshot()).records.length, 2);
      await duplicateTab.reload();
      await pause(2300);
      assert.equal((await snapshot()).records.length, 2);
    });

    await t.test('SPA old DOM is quarantined, then current sender.tab.url admits the new stable chat', async () => {
      await chat.evaluate(() => history.pushState({}, '', '/c/chat-fixture-002'));
      await pause(2300);
      assert.equal((await snapshot()).records.length, 2);
      await chat.evaluate((html) => { document.querySelector('main').innerHTML = html; document.title = '第二个虚构聊天 - ChatGPT'; }, message('message-fixture-003', '虚构 SPA 新聊天文字'));
      const state = await waitForCount(3);
      assert.equal(state.records.at(-1).chatId, 'chat-fixture-002');
      const senders = await worker.evaluate(() => globalThis.syntheticSenders);
      const changed = senders.find((sender) => sender.target === 'chat-fixture-002');
      assert.deepEqual(changed, {
        documentPath: '/c/chat-fixture-001', tabPath: '/c/chat-fixture-002',
        origin: 'https://chatgpt.com', target: 'chat-fixture-002'
      });
    });

    await t.test('temporary and unresolved new-chat routes add no records', async () => {
      const temporary = await context.newPage();
      const unresolved = await context.newPage();
      await temporary.goto('https://chatgpt.com/c/chat-fixture-temp?temporary-chat=true');
      await unresolved.goto('https://chatgpt.com/');
      await pause(4300);
      assert.equal((await snapshot()).records.length, 3);
      await temporary.close();
      await unresolved.close();
    });

    await t.test('a new chat becomes capturable only after its persistent URL and stable messages arrive', async () => {
      const newChat = await context.newPage();
      await newChat.goto('https://chatgpt.com/');
      await pause(2300);
      assert.equal((await snapshot()).records.length, 3);
      await newChat.evaluate((html) => {
        history.pushState({}, '', '/c/chat-fixture-004');
        document.querySelector('main').innerHTML = html;
      }, message('message-fixture-004', '虚构普通新聊天文字'));
      const state = await waitForCount(4);
      assert.equal(state.records.at(-1).chatId, 'chat-fixture-004');
      await newChat.close();
    });

    await t.test('the content-script isolated world cannot read the archive storage or GET_STATE', async () => {
      const pageCDP = await context.newCDPSession(chat);
      const worlds = [];
      pageCDP.on('Runtime.executionContextCreated', ({context: world}) => worlds.push(world));
      await pageCDP.send('Runtime.enable');
      const world = worlds.find((entry) => entry.name === id || entry.origin === `chrome-extension://${id}`);
      assert.ok(world, 'the extension isolated world exists');
      const response = await pageCDP.send('Runtime.evaluate', {
        contextId: world.id,
        expression: '(async () => { let denied = false; try { await chrome.storage.local.get("personalAIArchive"); } catch { denied = true; } const state = await chrome.runtime.sendMessage({type:"GET_STATE"}); return {denied, stateAllowed: state.ok}; })()',
        awaitPromise: true, returnByValue: true
      });
      assert.deepEqual(response.result.value, {denied: true, stateAllowed: false});
      await pageCDP.detach();
    });
  } finally { await context.close(); }
});
