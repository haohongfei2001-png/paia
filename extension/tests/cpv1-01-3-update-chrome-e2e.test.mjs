import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT, eventually} from './harness/fake-chatgpt.mjs';

const updateKey = 'paia-consumer-update:v1';

async function journey(extensionPath) {
  let h;
  try {
    h = await FakeChatGPT.start({extensionPath, headless:true});
    const page = await h.context.newPage();
    await page.setViewportSize({width:350,height:620});
    await page.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
    await page.locator('#update-message').waitFor();
    const version = await page.evaluate(() => chrome.runtime.getManifest().version);
    assert.match(await page.locator('#update-message').textContent(), new RegExp(version.replaceAll('.', '\\.')));
    assert.equal(await page.locator('#check-update').isVisible(),true);
    const originalId = await page.evaluate(() => chrome.runtime.id);
    const retainedKey = 'paia-test-update-preservation:v1';
    const retainedValue = {title:'合成保留资料',generation:1};
    await page.evaluate(async ([key,value]) => chrome.storage.local.set({[key]:value}),[retainedKey,retainedValue]);
    await page.evaluate(async ([key, current]) => chrome.storage.local.set({[key]:{
      state:'available',fromVersion:current,toVersion:'99.0.0',at:Date.now(),
    }}),[updateKey,version]);
    await eventually(async () => /先保存正在编辑的内容/.test(await page.locator('#update-message').textContent()));
    assert.equal(await page.evaluate(() => chrome.runtime.id),originalId,'checking update must preserve extension identity');
    assert.equal(await page.evaluate(() => chrome.runtime.getManifest().version),version,'update notice must not force reload');
    await page.evaluate(async ([key,current]) => chrome.storage.local.set({[key]:{
      state:'installed',fromVersion:'0.11.0',toVersion:current,at:Date.now(),
    }}),[updateKey,version]);
    await eventually(async () => /已安装/.test(await page.locator('#update-message').textContent()));
    await page.evaluate(async key => chrome.storage.local.remove(key),updateKey);
    assert.equal(await page.evaluate(() => chrome.runtime.id),originalId);
    assert.deepEqual(await page.evaluate(async key => (await chrome.storage.local.get(key))[key],retainedKey),
      retainedValue,'update status must leave existing local data unchanged');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=2,`popup has no horizontal overflow: ${overflow}`);
    assert.deepEqual(h.errors,[]);
  } finally {
    await h?.close();
  }
}

test('CPV1-01.3 update status is truthful, non-disruptive and preserves local identity/data in source Chrome',{timeout:180000},async()=>journey(undefined));

