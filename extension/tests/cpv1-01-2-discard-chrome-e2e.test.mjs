import { mkdtemp, rm } from 'node:fs/promises';
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
    // Keep this lifecycle regression on the last exact-main-certified harness
    // shape. A later test-only experiment switched this journey to a headed
    // Xvfb/native-tabs setup and caused Chromium itself to SIGSEGV at
    // chrome.tabs.discard(), including for a synthetic non-PAIA tab. That is
    // evidence-infrastructure behavior, not a product assertion failure.
    stage = 'launch isolated headless browser';
    h = await FakeChatGPT.start({ extensionPath: release, headless: true });
    stage = 'consent';
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);

    const restoredConversation = conversation('cpv1-discarded-tab');
    stage = 'open and capture initial conversation';
    const tab = await h.open(restoredConversation);
    await h.ready(tab);
    await eventually(async () => (await h.state()).records.length === 3);

    // Isolate the discard journey from unrelated pages while preserving the
    // same real chrome.tabs.discard -> restore path that passed the VS-01
    // exact-main certification.
    for (const other of h.context.pages()) {
      if (other !== h.archive && other !== tab) await other.close();
    }
    await h.archive.bringToFront();

    stage = 'discard conversation tab';
    const restored = await h.archive.evaluate(async () => {
      const current = await chrome.tabs.getCurrent();
      const tabs = await chrome.tabs.query({});
      const other = tabs.filter((item) => item.id !== current.id);
      if (other.length !== 1) throw new Error(`expected one other tab, got ${other.length}`);
      await chrome.tabs.update(current.id, { active: true });
      const discarded = await chrome.tabs.discard(other[0].id);
      if (!discarded?.discarded) throw new Error('target tab was not discarded');
      return chrome.tabs.update(discarded.id, { active: true });
    });

    stage = 'restore conversation tab';
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

    stage = 'capture once after restore';
    await h.send(resumedTab, { id: 'cpv1-discarded-message-004', text: '恢复后的新消息' });
    await eventually(async () => (await h.state()).records.length === 4, 'restored tab captures new content once');
  } catch (error) {
    throw new Error(`Real Chrome discard/restore failed at ${stage}: ${String(error)}`, { cause: error });
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
  }
});
