import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {structureCases, sentUser} from './fixtures/structure-cases.mjs';

const require = createRequire(import.meta.url);
let playwright;
if (process.env.PLAYWRIGHT_MODULE) {
  playwright = require(process.env.PLAYWRIGHT_MODULE);
} else {
  try { playwright = require('playwright'); }
  catch { playwright = require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}
const {chromium} = playwright;
const adapterSource = await readFile(new URL('../adapter/chatgpt-adapter.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../core/diagnostics-schema.js', import.meta.url), 'utf8');
let browser;

// Synthetic HTML only. Playwright creates its own throwaway, unsigned-in profile.
before(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check']
  });
});
after(async () => { await browser?.close(); });

function user(id, text, extra = '') {
  return `<article data-testid="conversation-turn-${id}"><div data-message-author-role="user" data-message-id="${id}"><div class="whitespace-pre-wrap">${text}</div>${extra}</div></article>`;
}

test('DOM time contract: only canonical-owned sent metadata outside body becomes a candidate',async()=>{
 const machine='2021-01-01T00:00:00.000Z';
 const cases=[
  ['time',`<time data-time-kind="sent" datetime="${machine}"></time>`,true],
  ['data',`<span data-message-created-at="${machine}"></span>`,true],
  ['title',`<span title="Sent at ${machine}"></span>`,true],
  ['aria',`<span aria-label="发送于 ${machine}"></span>`,true],
  ['plain title',`<span title="${machine}"></span>`,false],
  ['no semantics',`<time datetime="${machine}"></time>`,false],
  ['updated',`<time data-time-kind="updated" datetime="${machine}"></time>`,false],
  ['assistant',`<div data-message-author-role="assistant"><time data-time-kind="sent" datetime="${machine}"></time></div>`,false],
  ['wrong identity',`<time data-message-id="fake-other-user" data-time-kind="sent" datetime="${machine}"></time>`,false],
  ['malformed',`<time data-time-kind="sent" datetime="yesterday"></time>`,false],
 ];
 for(const [label,extra,accept] of cases){
  const page=await fixture('<main>'+user('fake-dom-time-user','虚构正文',extra)+'</main>');
  try{const result=(await collect(page)).second;assert.equal(result.messages.length,1,label);assert.equal(Boolean(result.messages[0].domTime),accept,label);
   if(accept){assert.equal(result.messages[0].domTime.source,'chatgpt_dom');assert.equal(result.messages[0].domTime.timestamp,machine);assert.deepEqual(result.messages[0].domTime.identity,{chatId:'chat-fixture-001',sourceMessageId:'fake-dom-time-user'});}
  }finally{await page.close();}
 }
 const page=await fixture('<main>'+user('fake-dom-body-user',`正文内时间 <time data-time-kind="sent" datetime="${machine}">2021</time>` )+'</main>');
 try{assert.equal(((await collect(page)).second).messages[0].domTime,undefined);}finally{await page.close();}
});

test('DOM time contract: bounded descendants, unique ancestor and duplicate identity fail closed',async()=>{
 const stamp='2021-01-01T00:00:00.000Z', id='fake-dom-bound-user';
 const cases=[
  ['unique ancestor',`<main><section data-message-id="${id}" data-message-created-at="${stamp}">${user(id,'虚构')}</section></main>`,1,true],
  ['ambiguous ancestor',`<main><section data-message-id="${id}" data-message-created-at="${stamp}">${user(id,'虚构')}${user('fake-dom-other-user','另一个虚构')}</section></main>`,2,false],
  ['deep',`<main>${user(id,'虚构',`<div><div><div><time data-time-kind="sent" datetime="${stamp}"></time></div></div></div>`)}</main>`,1,false],
  ['node bound',`<main>${user(id,'虚构','<span></span>'.repeat(65)+`<time data-time-kind="sent" datetime="${stamp}"></time>`)}</main>`,1,false],
  ['duplicate ID',`<main>${user(id,'虚构',`<time data-time-kind="sent" datetime="${stamp}"></time>`)}${user(id,'虚构重复')}</main>`,0,false]
 ];
 for(const [label,html,count,accept] of cases){const page=await fixture(html);try{
  const result=(await collect(page)).second;assert.equal((result.messages||[]).length,count,label);
  if(count)assert.equal(Boolean(result.messages[0].domTime),accept,label);
 }finally{await page.close();}}
});

async function fixture(html, url = 'https://chatgpt.com/c/chat-fixture-001') {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.abort());
  await page.setContent(`<!doctype html><html><head><title>虚构测试聊天 - ChatGPT</title><style>.whitespace-pre-wrap{white-space:pre-wrap}main{min-height:10px}</style></head><body>${html}</body></html>`);
  await page.addScriptTag({content: schemaSource});
  await page.addScriptTag({content: adapterSource});
  await page.evaluate((href) => {
    window.syntheticLocation = {href};
    window.adapter = new window.ChatGPTAdapter({location: window.syntheticLocation});
  }, url);
  return page;
}

async function collect(page) {
  return page.evaluate(() => {
    const first = window.adapter.collect({now: 1000});
    const second = window.adapter.collect({now: 2000});
    return {first, second};
  });
}

async function forbidContentReads(page) {
  await page.evaluate(() => {
    const fail = () => { throw new Error('forbidden synthetic content read'); };
    Object.defineProperty(Node.prototype, 'textContent', {get: fail});
    Object.defineProperty(HTMLElement.prototype, 'innerText', {get: fail});
    Object.defineProperty(Element.prototype, 'outerHTML', {get: fail});
    Object.defineProperty(Element.prototype, 'innerHTML', {get: fail});
    Object.defineProperty(HTMLInputElement.prototype, 'value', {get: fail});
    Object.defineProperty(HTMLTextAreaElement.prototype, 'value', {get: fail});
    Object.defineProperty(document, 'title', {get: fail});
  });
}

function assertFields(actual, expected) {
  for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, key);
}

test('role ID without a turn reaches stability and reads only its confirmed text leaf', async () => {
  const page = await fixture(`${sentUser({tag: null, id: 'message-outside-main'})}<main>${sentUser({tag: null})}<div data-message-author-role="assistant" data-message-id="assistant-synthetic-001"><div class="whitespace-pre-wrap">虚构 AI</div></div><textarea>虚构草稿</textarea></main>`);
  try {
    await page.evaluate(() => {
      const nodes = [document.body, document.querySelector('main'), ...document.querySelectorAll('[data-message-author-role], textarea')];
      for (const node of nodes) {
        for (const property of ['innerText', 'textContent', 'value']) {
          Object.defineProperty(node, property, {get() { throw new Error('forbidden whole-container read'); }});
        }
      }
      const assistantText = document.querySelector('[data-message-author-role="assistant"] .whitespace-pre-wrap');
      Object.defineProperty(assistantText, 'innerText', {get() { throw new Error('forbidden assistant read'); }});
    });
    const {first, second} = await collect(page);
    assert.equal(first.code, 'UNSTABLE_PAGE');
    assert.equal(first.structure.finalCandidateCount, 1);
    assert.equal(second.code, 'CAPTURING');
    assertFields(second.structure, {userRoleCount: 1, validTurnCount: 0, roleIdValidCount: 1, editorPassedCount: 1, busyPassedCount: 1, finalCandidateCount: 1});
    assert.equal(second.messages.length, 1);
    assert.equal(second.messages[0].originalText, '虚构已发送文字');
  } finally { await page.close(); }
});

test('v0.1.2 reports synthetic role-anchor and remaining fail-closed checks', async (t) => {
  for (const entry of structureCases) {
    await t.test(entry.name, async () => {
      const page = await fixture(`<main>${entry.body}</main>`);
      try {
        assert.equal(await page.evaluate(() => window.ChatGPTAdapter.version), '0.3.0');
        if (entry.code !== 'CAPTURING') await forbidContentReads(page);
        const {second} = await collect(page);
        assert.equal(second.code, entry.code);
        assertFields(second.structure, entry.summary || {});
        if (entry.row) assertFields(second.structure.rows[0], entry.row);
        if (entry.code !== 'CAPTURING') assert.equal(second.messages, undefined);
        const clean = await page.evaluate((value) => window.ArchiveDiagnostics.sanitizeStructure(value), second.structure);
        assert.deepEqual(clean, second.structure);
        const report = JSON.stringify(second.structure);
        for (const secret of ['message-synthetic', 'chat-fixture', 'https:', '虚构', 'data-message-id']) {
          assert.equal(report.includes(secret), false, secret);
        }
      } finally { await page.close(); }
    });
  }
});

test('structure counts all roles but limits detail to twenty numeric and boolean rows', async () => {
  const body = Array.from({length: 23}, (_, index) => sentUser({id: `message-synthetic-${index}`, body: '<p>虚构未知容器</p>'})).join('');
  const page = await fixture(`<main>${body}<div hidden>${sentUser()}</div></main>`);
  try {
    await forbidContentReads(page);
    const {second} = await collect(page);
    assert.equal(second.code, 'ADAPTER_MISMATCH');
    assertFields(second.structure, {
      userRoleCount: 24, visibleUserRoleCount: 23, validTurnCount: 23,
      roleIdPresentCount: 23, roleIdValidCount: 23, editorPassedCount: 23,
      finalCandidateCount: 0, rowsTruncated: true
    });
    assert.equal(second.structure.rows.length, 20);
    for (const row of second.structure.rows) {
      for (const value of Object.values(row)) assert.ok(typeof value === 'boolean' || Number.isSafeInteger(value));
    }
  } finally { await page.close(); }
});

test('non-ready routes do not scan role structures or produce a structure report', async () => {
  for (const url of ['https://chatgpt.com/?temporary-chat=true', 'https://chatgpt.com/', 'https://example.invalid/c/chat-fixture-001']) {
    const page = await fixture(`<main>${sentUser()}</main>`, url);
    try {
      await page.evaluate(() => {
        const original = Document.prototype.querySelector;
        Object.defineProperty(document, 'querySelector', {value(selector) {
          if (selector !== 'header') throw new Error('unexpected role structure scan');
          return original.call(this, selector);
        }});
        Object.defineProperty(Element.prototype, 'querySelectorAll', {value() { throw new Error('unexpected role structure scan'); }});
      });
      await forbidContentReads(page);
      const {second} = await collect(page);
      assert.equal(second.structure, undefined);
      assert.equal(second.messages, undefined);
    } finally { await page.close(); }
  }
});

test('main absence, invisibility, and busy state have distinct structural flags without reading content', async () => {
  for (const [html, expected] of [
    ['', {mainPresent: false, mainVisible: false, mainBusy: false}],
    [`<main hidden>${sentUser()}</main>`, {mainPresent: true, mainVisible: false, mainBusy: false}],
    [`<main aria-busy="true">${sentUser()}</main>`, {mainPresent: true, mainVisible: true, mainBusy: true}]
  ]) {
    const page = await fixture(html);
    try {
      await forbidContentReads(page);
      const {second} = await collect(page);
      assert.equal(second.code, 'UNSTABLE_PAGE');
      assertFields(second.structure, {...expected, userRoleCount: 0, finalCandidateCount: 0});
    } finally { await page.close(); }
  }
});

test('ancestor-ID probes stay inside main and stop at the nearest conversation marker', async () => {
  for (const html of [
    `<div data-message-id="outside-main-synthetic"><main>${sentUser({id: ''})}</main></div>`,
    `<main><div data-message-id="outside-turn-synthetic">${sentUser({id: ''})}</div></main>`,
    '<main><article data-testid="conversation-turn-0" data-message-id="outer-turn-synthetic"><div data-testid="conversation-turn-inner"><div data-message-author-role="user"><p>虚构</p></div></div></article></main>'
  ]) {
    const page = await fixture(html);
    try {
      await forbidContentReads(page);
      const {second} = await collect(page);
      assert.equal(second.code, 'ADAPTER_MISMATCH');
      assert.equal(second.structure.rows[0].idOnAncestor, false);
    } finally { await page.close(); }
  }
});

test('duplicate and stale identity rejection clear every final candidate flag', async () => {
  for (const tag of ['article', null]) {
    const duplicate = await fixture(`<main>${sentUser({tag})}${sentUser({tag})}</main>`);
    try {
      await forbidContentReads(duplicate);
      const {second} = await collect(duplicate);
      assert.equal(second.code, 'UNSTABLE_PAGE');
      assert.equal(second.structure.finalCandidateCount, 0);
      assert.equal(second.structure.rows.every((row) => row.duplicateIdentity && !row.candidateAccepted), true);
    } finally { await duplicate.close(); }
    const stale = await fixture(`<main>${sentUser({tag})}</main>`);
    try {
      assert.equal((await collect(stale)).second.code, 'CAPTURING');
      await stale.evaluate(() => { window.syntheticLocation.href = 'https://chatgpt.com/c/chat-fixture-002'; });
      await forbidContentReads(stale);
      const {second} = await collect(stale);
      assert.equal(second.code, 'UNSTABLE_PAGE');
      assert.equal(second.structure.finalCandidateCount, 0);
      assert.equal(second.structure.rows[0].staleIdentity, true);
      assert.equal(second.structure.rows[0].candidateAccepted, false);
    } finally { await stale.close(); }
  }
});

test('adapter captures only confirmed user text, preserving whitespace and literal markup', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '  虚构文字\n\n第二行 &lt;script&gt;🙂\n')}
    <article data-testid="conversation-turn-ai"><div data-message-author-role="assistant" data-message-id="assistant-fixture-001"><div class="whitespace-pre-wrap" id="ai">虚构 AI 回复</div></div></article>
    <textarea id="draft">虚构未发送草稿</textarea><div contenteditable="true" id="composer">虚构输入</div></main>`);
  await page.evaluate(() => {
    for (const id of ['ai', 'draft', 'composer']) {
      const node = document.getElementById(id);
      for (const property of ['innerText', 'textContent', 'value']) Object.defineProperty(node, property, {get() { throw new Error('forbidden read'); }});
    }
  });
  const result = await collect(page);
  assert.equal(result.first.code, 'UNSTABLE_PAGE');
  assert.equal(result.second.code, 'CAPTURING');
  assert.equal(result.second.messages.length, 1);
  assert.equal(result.second.messages[0].originalText, '  虚构文字\n\n第二行 <script>🙂\n');
  assert.equal(result.second.messages[0].pageOrder, 1);
  assert.equal(result.second.chat.title, '虚构测试聊天');
  await page.close();
});

test('adapter skips temporary URLs, explicit top-bar temporary state, and unsupported routes', async () => {
  for (const url of ['https://chatgpt.com/?temporary-chat=true', 'https://chatgpt.com/c/chat-fixture-001?temporary-chat=true', 'https://chatgpt.com/', 'https://example.invalid/c/chat-fixture-001']) {
    const page = await fixture(`<main>${user('message-fixture-001', '虚构')}</main>`, url);
    const {second} = await collect(page);
    assert.equal(second.code, url.includes('temporary-chat') ? 'TEMPORARY_CHAT' : 'WAITING_CHAT');
    assert.equal(second.messages, undefined);
    await page.close();
  }
  const page = await fixture(`<header><button data-testid="temporary-chat-button" aria-pressed="true">Temporary</button></header><main>${user('message-fixture-001', '虚构')}</main>`);
  assert.equal((await collect(page)).second.code, 'TEMPORARY_CHAT');
  await page.close();
});

test('temporary-chat wording inside a sent user message does not change chat classification', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', 'Temporary Chat 临时聊天 — 虚构正文')}</main>`);
  assert.equal((await collect(page)).second.code, 'CAPTURING');
  await page.close();
});

test('unsupported, hidden, duplicate-ID, attachment, and editing structures are excluded', async () => {
  const cases = [
    {body: '<article data-testid="conversation-turn-0"><div data-message-author-role="user"><div class="whitespace-pre-wrap">虚构</div></div></article>', code: 'ADAPTER_MISMATCH'},
    {body: '<article data-testid="conversation-turn-0"><div data-message-author-role="user" data-message-id="message-fixture-001"><p>未知容器</p></div></article>', code: 'ADAPTER_MISMATCH'},
    {body: user('message-fixture-001', '虚构', '<textarea>编辑中的虚构草稿</textarea>'), code: 'ADAPTER_MISMATCH'},
    {body: user('message-fixture-001', '<button>附件按钮</button>'), code: 'ADAPTER_MISMATCH'},
    {body: `<div hidden>${user('message-fixture-001', '隐藏内容')}</div>`, code: 'NO_MESSAGES'},
    {body: user('message-fixture-001', '虚构') + user('message-fixture-001', '虚构重复 DOM'), code: 'UNSTABLE_PAGE'},
    {body: user('message-fixture-001', '虚构', '<div class="whitespace-pre-wrap">第二个不确定文本容器</div>'), code: 'ADAPTER_MISMATCH'},
    {body: `<div contenteditable="true">${user('message-fixture-001', '伪装成消息的编辑草稿')}</div>`, code: 'ADAPTER_MISMATCH'}
  ];
  for (const entry of cases) {
    const page = await fixture(`<main>${entry.body}</main>`);
    assert.equal((await collect(page)).second.code, entry.code);
    await page.close();
  }
});

test('attachment metadata is excluded while a separate known text leaf can be captured', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '仅虚构说明文字', '<div data-testid="attachment-card"><div class="whitespace-pre-wrap" id="attachment">虚构附件名</div></div>')}</main>`);
  await page.evaluate(() => Object.defineProperty(document.getElementById('attachment'), 'innerText', {get() { throw new Error('attachment read'); }}));
  assert.equal((await collect(page)).second.messages[0].originalText, '仅虚构说明文字');
  await page.close();
});

test('SPA route changes quarantine old DOM until distinct stable message nodes arrive', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '虚构旧聊天')}</main>`);
  assert.equal((await collect(page)).second.code, 'CAPTURING');
  await page.evaluate(() => { window.syntheticLocation.href = 'https://chatgpt.com/c/chat-fixture-002'; });
  assert.equal((await collect(page)).second.code, 'UNSTABLE_PAGE');
  await page.evaluate((html) => { document.querySelector('main').innerHTML = html; }, user('message-fixture-002', '虚构新聊天'));
  const result = await collect(page);
  assert.equal(result.first.code, 'UNSTABLE_PAGE');
  assert.equal(result.second.chat.id, 'chat-fixture-002');
  assert.equal(result.second.messages[0].originalText, '虚构新聊天');
  await page.close();
});

test('mutation tracking waits for sent-text stability and excludes the active edit form', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '虚构初稿')}</main>`);
  await page.evaluate(() => window.adapter.watch(() => {}));
  assert.equal((await collect(page)).second.messages[0].originalText, '虚构初稿');
  await page.evaluate(() => { document.querySelector('.whitespace-pre-wrap').textContent = '虚构重新发送版本'; });
  assert.equal((await collect(page)).first.code, 'UNSTABLE_PAGE');
  assert.equal((await collect(page)).second.messages[0].originalText, '虚构重新发送版本');
  await page.close();
});

test('user body getters are not read during the stability window, and a mutation restarts that window', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '虚构初稿')}</main>`);
  const results = await page.evaluate(async () => {
    const leaf = document.querySelector('.whitespace-pre-wrap');
    const getter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText').get;
    let reads = 0;
    Object.defineProperty(leaf, 'innerText', {get() { reads += 1; return getter.call(this); }});
    window.adapter.watch(() => {});
    window.adapter.collect({now: 1000});
    window.adapter.collect({now: 1500});
    const beforeStable = reads;
    leaf.textContent = '虚构中间渲染';
    await new Promise((resolve) => setTimeout(resolve, 0));
    const changed = window.adapter.collect({now: 2000});
    const stillWaiting = window.adapter.collect({now: 2500});
    const afterChange = reads;
    leaf.textContent = '虚构稳定已发送文字';
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.adapter.collect({now: 3000});
    const final = window.adapter.collect({now: 4000});
    return {beforeStable, changed: changed.code, stillWaiting: stillWaiting.code, afterChange, final, reads};
  });
  assert.equal(results.beforeStable, 0);
  assert.equal(results.afterChange, 0);
  assert.equal(results.changed, 'UNSTABLE_PAGE');
  assert.equal(results.stillWaiting, 'UNSTABLE_PAGE');
  assert.equal(results.reads, 1);
  assert.equal(results.final.messages[0].originalText, '虚构稳定已发送文字');
  await page.close();
});

test('same text from two distinct message identities remains two entries and GPT routes normalize', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '虚构重复文字')}${user('message-fixture-002', '虚构重复文字')}</main>`, 'https://chatgpt.com/g/g-fixture/c/chat-fixture-001?model=fixture#fragment');
  const {second} = await collect(page);
  assert.equal(second.messages.length, 2);
  assert.deepEqual(second.messages.map((message) => message.pageOrder), [1, 2]);
  assert.equal(second.chat.url, 'https://chatgpt.com/c/chat-fixture-001');
  await page.close();
});

test('oversized text is skipped with a fixed diagnostic and no content in the diagnostic', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', 'x'.repeat(200001))}</main>`);
  const {second} = await collect(page);
  assert.equal(second.code, 'MESSAGE_TOO_LARGE');
  assert.deepEqual(second.messages, []);
  await page.close();
});

test('chat titles conform to the backend 500-character bound', async () => {
  const page = await fixture(`<main>${user('message-fixture-001', '虚构文字')}</main>`);
  await page.evaluate(() => { document.title = '虚'.repeat(501); });
  assert.equal((await collect(page)).second.chat.title.length, 500);
  await page.close();
});
