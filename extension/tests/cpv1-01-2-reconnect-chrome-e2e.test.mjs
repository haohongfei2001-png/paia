import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeChatGPT, conversation, eventually } from './harness/fake-chatgpt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('CPV1-01.2: unpacked extension update marks the old tab stale with one refresh action', { timeout: 120000 }, async () => {
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-reconnect-'));
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  let h;
  try {
    h = await FakeChatGPT.start({ extensionPath: release, headless: true });
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);

    const oldTab = await h.open(conversation('cpv1-old-tab'));
    await h.ready(oldTab);
    await eventually(async () => (await h.state()).records.length === 3);

    const manifestPath = join(release, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.version = '0.12.1';
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    // A successful extension reload may tear down its initiating page before
    // Playwright receives the evaluate reply. The old ChatGPT tab below is the
    // independent outcome check; a closed browser context still fails there.
    try { await h.archive.evaluate(() => chrome.runtime.reload()); }
    catch (error) {
      if (!/Target page, context or browser has been closed|Execution context was destroyed/.test(String(error))) throw error;
    }

    await eventually(async () => oldTab.locator('#paia-reconnect-notice').isVisible(), 'old tab shows a visible refresh action', 20000);
    assert.match(await oldTab.locator('#paia-reconnect-notice').textContent(), /当前页面不会继续归档/);
    assert.equal(await oldTab.locator('#paia-reconnect-notice button').textContent(), '刷新此 ChatGPT 页面');
    assert.equal(await oldTab.locator('#paia-reconnect-notice').count(), 1);
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
  }
});

test('CPV1-01.2: a newly opened tab after a version update retains the same archive', { timeout: 120000 }, async () => {
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-updated-release-'));
  const profile = await mkdtemp(join(tmpdir(), 'paia-cpv1-update-profile-'));
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  let h;
  try {
    h = await FakeChatGPT.start({ extensionPath: release, headless: true, userDataDir: profile });
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);
    const first = await h.open(conversation('cpv1-before-update'));
    await h.ready(first);
    await eventually(async () => (await h.state()).records.length === 3);
    const extensionId = h.extensionId;
    await h.close(); h = undefined;

    const manifestPath = join(release, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.version = '0.12.1';
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    h = await FakeChatGPT.start({ extensionPath: release, headless: true, userDataDir: profile, onboarding: true });
    assert.equal(h.extensionId, extensionId, 'version update preserves extension identity');
    assert.equal((await h.state()).records.length, 3, 'the existing archive remains after update');
    const fresh = await h.open(conversation('cpv1-after-update'));
    await h.ready(fresh);
    await eventually(async () => (await h.state()).records.length === 6, 'new tab captures after update');
    assert.equal(await fresh.locator('#paia-reconnect-notice').count(), 0);
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
});

test('CPV1-01.2: a discarded and restored ChatGPT tab resumes capture without duplicate records', { timeout: 120000 }, async () => {
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-discard-'));
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  let h;
  try {
    // GitHub's browser shards already run under Xvfb. Chromium's headless
    // process exits on real tabs.discard in this journey, so exercise the same
    // browser API in an invisible headed display there. Local runs stay headless.
    h = await FakeChatGPT.start({ extensionPath: release, headless: process.env.CI !== '1' });
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);
    const restoredConversation = conversation('cpv1-discarded-tab');
    const tab = await h.open(restoredConversation);
    await h.ready(tab);
    await eventually(async () => (await h.state()).records.length === 3);

    // A normal non-extension tab must remain live while Chrome discards the
    // conversation. Headless Chrome can exit when its last web tab is discarded
    // even though an extension page is still open.
    const keepAlive = await h.context.newPage();
    await keepAlive.goto('about:blank');
    await tab.bringToFront();
    const conversationId = await h.archive.evaluate(async () =>
      (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id);
    assert.ok(conversationId, 'conversation has a browser tab ID');
    await h.archive.bringToFront();
    await eventually(async () => h.archive.evaluate(async (id) => !(await chrome.tabs.get(id)).active, conversationId), 'conversation tab is backgrounded before discard');
    const discarded = await h.archive.evaluate(async (id) => chrome.tabs.discard(id), conversationId);
    assert.equal(discarded?.discarded, true, 'the real conversation tab is discarded');
    await eventually(async () => h.archive.evaluate(async (id) => (await chrome.tabs.get(id)).discarded === true, conversationId), 'discard state is visible before restore');
    const restored = await h.archive.evaluate(async (id) => chrome.tabs.update(id, { active: true }), conversationId);
    assert.equal(restored?.active, true);
    await eventually(async () => h.archive.evaluate(async (id) => (await chrome.tabs.get(id)).status === 'complete', restored.id), 'discarded tab finishes loading');
    assert.equal((await h.state()).records.length, 3, 'discard does not change stored records');

    await eventually(async () => h.context.pages().some((page) => page.url().includes('/c/cpv1-discarded-tab')));
    const resumedTab = h.context.pages().find((page) => page.url().includes('/c/cpv1-discarded-tab'));
    await resumedTab.waitForLoadState('load');
    await h.ready(resumedTab);
    await eventually(async () => (await h.state()).records.length === 3);
    assert.equal(await resumedTab.locator('#paia-reconnect-notice').count(), 0);
    await eventually(async () => (await resumedTab.locator('#messages [data-message-id]').count()) === 3, 'restored conversation renders before new input');
    await h.send(resumedTab, { id: 'cpv1-discarded-message-004', text: '恢复后的新消息' });
    await eventually(async () => (await h.state()).records.length === 4, 'restored tab captures new content once');
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
  }
});
