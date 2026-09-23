import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeChatGPT, conversation, eventually } from './harness/fake-chatgpt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('CPV1-01.2: a discarded and restored ChatGPT tab resumes capture without duplicate records', { timeout: 120000 }, async () => {
  let stage = 'build release';
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-discard-'));
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  let h;
  try {
    stage = 'launch isolated browser';
    // CI runs under Xvfb. Keep the real discard/restore journey isolated from
    // other browser tests in the shard.
    h = await FakeChatGPT.start({ extensionPath: release, headless: process.env.CI !== '1', useBundledChromium: process.env.CI === '1' });
    stage = 'consent';
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);
    const restoredConversation = conversation('cpv1-discarded-tab');
    stage = 'open a background conversation';
    // Create both tabs through Chrome's own tab API. Playwright's
    // bringToFront() transitions on this discarded target crash Linux Chrome
    // under CI before the lifecycle assertion can finish.
    h.pages.set(restoredConversation.id, { c: restoredConversation, arrival: 'metadata-first' });
    const conversationTab = await h.archive.evaluate((url) => chrome.tabs.create({ url, active: true }),
      `https://chatgpt.com/c/${restoredConversation.id}`);
    const conversationId = conversationTab.id;
    assert.ok(conversationId, 'conversation has a browser tab ID');
    stage = 'capture initial conversation';
    await eventually(async () => (await h.state()).records.length === 3);
    const keepAlive = await h.archive.evaluate(() => chrome.tabs.create({ url: 'about:blank', active: true }));
    assert.ok(keepAlive.id, 'a normal browser tab stays active while the conversation is discarded');
    stage = 'background conversation';
    await eventually(async () => h.archive.evaluate(async (id) => !(await chrome.tabs.get(id)).active, conversationId), 'conversation tab is backgrounded before discard');
    const discarded = await h.archive.evaluate(async (id) => chrome.tabs.discard(id), conversationId);
    stage = 'confirm discard';
    assert.equal(discarded?.discarded, true, 'the real conversation tab is discarded');
    await eventually(async () => h.archive.evaluate(async (id) => (await chrome.tabs.get(id)).discarded === true, conversationId), 'discard state is visible before restore');
    const restored = await h.archive.evaluate(async (id) => chrome.tabs.update(id, { active: true }), conversationId);
    stage = 'confirm restored tab';
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
  } catch (error) {
    throw new Error(`Real Chrome discard/restore failed at ${stage}: ${String(error)}`, { cause: error });
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
  }
});
