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
    await h.archive.evaluate(() => chrome.runtime.reload());

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

