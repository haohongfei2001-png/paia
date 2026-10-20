import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FakeChatGPT, eventually} from './harness/fake-chatgpt.mjs';
import {chooseConsumerGroup} from './harness/settings-consumer-presentation.mjs';

// Eight explicit native leaves: four scenarios for each actual source/release
// extension. This file never installs a processing/financial issuer or provider.
const root = fileURLToPath(new URL('..', import.meta.url));
const READ = 'PAIA_MAINTENANCE_PROCESSING_STATUS';
const WRITE = 'PAIA_MAINTENANCE_PROCESSING_CONFIGURE';
const CONSENT_KEY = 'aiu:maintenance-processing-consent:v1';
const INPUT = '#settings-maintenance-enabled';
const DIALOG = '#settings-maintenance-consent';
const scenarios = ['trusted-confirmation-and-peers', 'native-write-failure-and-lost-reply',
  'actual-worker-and-browser-reconstruction', 'compact-bilingual-keyboard'];
let evidenceRoot;

async function outputDirectory(variant, scenario) {
  if (!evidenceRoot) {
    const parent = process.env.PAIA_SETTINGS_MAINTENANCE_OUTPUT;
    if (parent) await mkdir(parent, {recursive:true});
    evidenceRoot = await mkdtemp(join(parent || tmpdir(), 'paia-maintenance-settings-evidence-'));
  }
  const directory = join(evidenceRoot, variant, scenario);
  await mkdir(directory, {recursive:true});
  return directory;
}

async function status(page) {
  const reply = await page.evaluate(type => chrome.runtime.sendMessage({type}), READ);
  assert.equal(reply.ok, true, JSON.stringify(reply));
  assert.deepEqual(Object.keys(reply.data).sort(),
    ['enabled', 'generation', 'phase', 'savedEnabled', 'serviceAvailable']);
  assert.equal(reply.data.serviceAvailable, false, 'the original production configuration stays null');
  return reply.data;
}

async function openSettings(page) {
  await page.setViewportSize({width:1440, height:900});
  await page.locator('.sidebar-bottom [data-view="settings"]').click();
  await chooseConsumerGroup(page, 'ai');
  await eventually(async () => await page.locator(INPUT).isEnabled()
    && await page.locator(INPUT).getAttribute('data-loaded') === 'true', 'real purpose status loaded');
}

async function installTransportObserver(page) {
  await page.evaluate(({READ, WRITE, INPUT}) => {
    const descriptor = Object.getOwnPropertyDescriptor(chrome.runtime, 'sendMessage');
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
      throw Error('Original Chrome sendMessage data descriptor required');
    }
    const native = descriptor.value;
    const probe = {writes:[], reads:[], events:[], unexpected:[], pending:0, dropNextSuccess:false, drops:0};
    const observe = event => {
      if (event.target.matches?.(INPUT) || event.target.id === 'settings-maintenance-confirm') {
        probe.events.push({type:event.type, trusted:event.isTrusted, id:event.target.id});
      }
    };
    document.addEventListener('change', observe, true);
    document.addEventListener('click', observe, true);
    const observed = function (message, ...args) {
      if (message?.type !== READ && message?.type !== WRITE) return native.call(this, message, ...args);
      const row = {type:message.type};
      if (message.type === WRITE) {
        Object.assign(row, {enabled:message.enabled, consentVersion:message.consentVersion,
          confirmed:message.confirmed, generation:message.expectedGeneration});
        probe.writes.push(row);
      } else probe.reads.push(row);
      probe.pending++;
      let result;
      try { result = native.call(this, message, ...args); }
      catch (error) { probe.pending--; throw error; }
      // The original method is invoked exactly once. Only a completed successful
      // configure reply can be dropped; no substitute owner result is produced.
      const completed = reply => {
        try {
          row.ok = reply?.ok === true;
          if (!row.ok && typeof reply?.error === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(reply.error)) row.error = reply.error;
          if (!reply || typeof reply.ok !== 'boolean') probe.unexpected.push('invalid-reply-envelope');
          if (row.ok) {
            const value = reply.data;
            if (!value || typeof value.enabled !== 'boolean' || typeof value.savedEnabled !== 'boolean'
              || typeof value.phase !== 'string' || typeof value.generation !== 'string') {
              probe.unexpected.push('invalid-purpose-result');
            } else row.result = {enabled:value.enabled, savedEnabled:value.savedEnabled,
              phase:value.phase, generation:value.generation};
          }
        } catch { probe.unexpected.push('observer-result-access-failed'); }
        finally { probe.pending--; }
        return reply;
      };
      const rejected = () => {
        row.transportRejected = true;
        probe.unexpected.push('original-native-send-rejected');
        probe.pending--;
      };
      if (message.type === WRITE && probe.dropNextSuccess) return Promise.resolve(result).then(reply => {
        completed(reply);
        if (row.ok) {
          probe.dropNextSuccess = false;
          probe.drops++;
          row.deliveryLost = true;
          throw Error('SYNTHETIC Maintenance configure reply lost after original owner completed');
        }
        return reply;
      }, error => { rejected(); throw error; });
      // Ordinary observation returns the exact native Promise, including its
      // rejection. The side observer consumes no owner result and never throws.
      Promise.resolve(result).then(completed, rejected);
      return result;
    };
    Object.defineProperty(chrome.runtime, 'sendMessage', {...descriptor, value:observed});
    probe.restore = () => {
      Object.defineProperty(chrome.runtime, 'sendMessage', descriptor);
      document.removeEventListener('change', observe, true);
      document.removeEventListener('click', observe, true);
    };
    globalThis.__maintenanceSettingsProbe = probe;
  }, {READ, WRITE, INPUT});
}

const writes = page => page.evaluate(() => __maintenanceSettingsProbe.writes);
const focusId = page => page.evaluate(() => document.activeElement?.id);
async function trustedActivation(page, id, type) {
  const last = await page.evaluate(({id, type}) => __maintenanceSettingsProbe.events
    .filter(event => event.id === id && event.type === type).at(-1), {id, type});
  assert.deepEqual(last, {type, trusted:true, id}, 'the asserted purpose action was a real browser event');
}

async function settled(page, enabled, phase = enabled ? 'on' : 'off') {
  await eventually(async () => await page.locator(INPUT).isEnabled()
    && await page.locator(INPUT).getAttribute('aria-busy') === 'false'
    && await page.locator(INPUT).isChecked() === enabled,
  'original UI configure/reread completed');
  const current = await status(page);
  assert.equal(current.enabled, enabled);
  assert.equal(current.phase, phase);
  if (phase === 'on' || phase === 'off') assert.equal(current.savedEnabled, enabled);
  await eventually(() => page.evaluate(() => __maintenanceSettingsProbe.pending === 0),
    'all original observed replies completed');
  assert.deepEqual(await page.evaluate(() => __maintenanceSettingsProbe.unexpected), [],
    'the observer cannot conceal a malformed result or an unexpected native rejection');
  return current;
}

async function enable(page) {
  const before = (await writes(page)).length;
  assert.equal(await page.locator(INPUT).isChecked(), false);
  await page.locator(INPUT).click();
  await page.locator(DIALOG).waitFor({state:'visible'});
  assert.equal(await focusId(page), 'settings-maintenance-cancel');
  assert.equal((await status(page)).enabled, false, 'opening a modal grants nothing');
  await page.locator('#settings-maintenance-confirm').click();
  await trustedActivation(page, 'settings-maintenance-confirm', 'click');
  await page.locator(DIALOG).waitFor({state:'hidden'});
  const current = await settled(page, true);
  const calls = (await writes(page)).slice(before);
  assert.equal(calls.length, 1, 'one trusted confirmation sends exactly one configure');
  assert.deepEqual([calls[0].enabled, calls[0].consentVersion, calls[0].confirmed, calls[0].ok],
    [true, 1, true, true]);
  return current;
}

async function disable(page) {
  const before = (await writes(page)).length;
  assert.equal(await page.locator(INPUT).isChecked(), true);
  await page.locator(INPUT).click();
  await trustedActivation(page, 'settings-maintenance-enabled', 'change');
  const current = await settled(page, false);
  const calls = (await writes(page)).slice(before);
  assert.equal(calls.length, 1, 'one trusted OFF action sends exactly one configure');
  assert.deepEqual([calls[0].enabled, calls[0].ok], [false, true]);
  return current;
}

function offline(h) {
  assert.equal(h.extensionNetworkRequests, 0);
  assert.equal(h.externalRequests, 0);
  assert.equal(h.deepSeekRequests.length, 0);
  assert.deepEqual(h.errors, []);
}

async function failNextConsentPut(h) {
  const worker = h.context.serviceWorkers().find(w =>
    w.url() === `chrome-extension://${h.extensionId}/background/service-worker.js`);
  assert.ok(worker, 'the real extension worker owns the native IDB operation');
  await worker.evaluate(key => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'put');
    const native = descriptor.value;
    const fault = {calls:0, id:null, table:null};
    fault.restore = () => { Object.defineProperty(IDBObjectStore.prototype, 'put', descriptor); };
    const faulted = function (value, ...args) {
      if (this.name === 'meta' && value?.id === key) {
        fault.calls++;
        fault.id = key;
        fault.table = this.name;
        fault.restore();
        throw new DOMException('Synthetic exact Maintenance consent put failure', 'UnknownError');
      }
      return native.call(this, value, ...args);
    };
    Object.defineProperty(IDBObjectStore.prototype, 'put', {...descriptor, value:faulted});
    globalThis.__maintenanceConsentPutFault = fault;
  }, CONSENT_KEY);
  return {
    async verify() {
      assert.deepEqual(await worker.evaluate(() => {
        const f = __maintenanceConsentPutFault;
        return {calls:f.calls, id:f.id, table:f.table};
      }), {calls:1, id:CONSENT_KEY, table:'meta'});
    },
    async restore() { await worker.evaluate(() => __maintenanceConsentPutFault.restore()); },
  };
}

async function failedOff(h, page) {
  const before = (await writes(page)).length;
  const fault = await failNextConsentPut(h);
  try {
    await page.locator(INPUT).click();
    await trustedActivation(page, 'settings-maintenance-enabled', 'change');
    await eventually(async () => await page.locator('#settings-maintenance-retry').isVisible()
      && await page.locator(INPUT).getAttribute('aria-busy') === 'false',
    'real worker write failed and original UI recovery read settled');
    await fault.verify();
    const current = await settled(page, false, 'off_unconfirmed');
    assert.equal(current.savedEnabled, true, 'failed native OFF did not erase the last durable ON');
    const calls = (await writes(page)).slice(before);
    assert.equal(calls.length, 1, 'the failed OFF is not automatically retried');
    assert.deepEqual([calls[0].enabled, calls[0].ok], [false, false]);
    assert.match(await page.locator('#settings-maintenance-status').innerText(), /关闭尚未确认|Turning off is unconfirmed/);
    return current;
  } finally { await fault.restore(); }
}

async function preparePage(h, {fresh = false} = {}) {
  const page = h.archive;
  if (fresh) {
    await page.locator('#enable-consent').waitFor({state:'visible'});
    await page.locator('#enable-consent').click();
  }
  await installTransportObserver(page);
  await openSettings(page);
  return page;
}

async function installReloadAuthenticationObserver(h, page) {
  const tabId = await page.evaluate(async () => (await chrome.tabs.getCurrent()).id);
  const worker = h.context.serviceWorkers().find(w =>
    w.url() === `chrome-extension://${h.extensionId}/background/service-worker.js`);
  assert.ok(worker, 'the original worker owns the reload authentication observer');
  await worker.evaluate(async ({tabId, READ}) => {
    const rows = [], restorers = [];
    let order = 0;
    const pick = (value, keys) => ({present:keys.filter(key => value && Object.hasOwn(value,key)),
      values:Object.fromEntries(keys.filter(key => value && Object.hasOwn(value,key)).map(key => [key,value[key]]))});
    const tab = value => pick(value, ['id','windowId','url','pendingUrl','status','incognito']);
    const context = value => ({...pick(value, ['contextType','tabId','windowId','frameId','documentId','documentUrl','incognito']),
      plain:value!==null && typeof value==='object' && [Object.prototype,null].includes(Object.getPrototypeOf(value)),
      dataFields:['contextType','tabId','windowId','frameId','documentId','documentUrl','incognito'].filter(key => value && Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)||{},'value'))});
    const note = (kind, value) => { rows.push({order:++order,kind,...value}); if(rows.length>80)rows.shift(); };
    const errorCode = error => typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(error.code) ? error.code : null;
    const observe = (object, key, started, completed) => {
      const descriptor = Object.getOwnPropertyDescriptor(object,key);
      if(!descriptor || !Object.hasOwn(descriptor,'value') || typeof descriptor.value !== 'function') throw Error('Original worker data descriptor required: '+key);
      const native = descriptor.value;
      const observed = function (...args) {
        const originalArgs = args;
        let token = null;
        try { token = started(args); } catch { note('observer-failed',{method:key,stage:'start'}); }
        const complete = (value,error) => { try { completed(token,value,error); } catch { note('observer-failed',{method:key,stage:'complete'}); } };
        let result;
        try { result = native.apply(this,originalArgs); }
        catch(error) { if(token!==null)complete(null,error); throw error; }
        // Invoke exactly once and return the exact original Promise/result.
        // The side observer performs no native read, retry or result substitution.
        if(token!==null)Promise.resolve(result).then(value => complete(value,null), error => complete(null,error));
        return result;
      };
      Object.defineProperty(object,key,{...descriptor,value:observed});
      restorers.push(() => { if(Object.getOwnPropertyDescriptor(object,key)?.value === observed)Object.defineProperty(object,key,descriptor); });
    };
    // A passive native listener captures the actual sender without importing
    // modules into the MV3 worker, replying, or invoking the original handler.
    const received = (request,sender) => {
      if(request?.type === READ)note('message-received',{type:READ,
        sender:pick(sender,['id','url','origin','frameId','documentId','documentLifecycle']),tab:tab(sender?.tab)});
    };
    chrome.runtime.onMessage.addListener(received);
    restorers.push(() => chrome.runtime.onMessage.removeListener(received));
    observe(chrome.tabs,'get',args => {note('tabs-get-start',{tabId:args[0]});return args[0];},
      (id,value,error) => note('tabs-get-completed',{tabId:id,tab:tab(value),error:errorCode(error)}));
    observe(chrome.runtime,'getContexts',args => {const filter=pick(args[0],['contextTypes','tabIds','documentIds','documentUrls']);note('contexts-start',{filter});return filter;},
      (filter,value,error) => note('contexts-completed',{filter,array:Array.isArray(value),count:Array.isArray(value)?value.length:null,contexts:Array.isArray(value)?value.slice(0,8).map(context):null,error:errorCode(error)}));
    const updated = (id,change,value) => { if(id===tabId)note('tab-updated',{tabId:id,change:pick(change,['url','status']),tab:tab(value)}); };
    const removed = id => { if(id===tabId)note('tab-removed',{tabId:id}); };
    chrome.tabs.onUpdated.addListener(updated);chrome.tabs.onRemoved.addListener(removed);
    restorers.push(() => {chrome.tabs.onUpdated.removeListener(updated);chrome.tabs.onRemoved.removeListener(removed);});
    note('installed',{targetTabId:tabId,expectedRuntimeId:chrome.runtime.id,expectedBase:chrome.runtime.getURL('ui/archive.html')});
    globalThis.__maintenanceReloadAuthProbe={rows,restore(){for(const restore of restorers.reverse())restore();}};
  }, {tabId, READ});
}

async function withFixture(variant, scenario, run) {
  const directory = await outputDirectory(variant, scenario);
  const profile = await mkdtemp(join(tmpdir(), 'paia-maintenance-settings-profile-'));
  const release = variant === 'release' ? await mkdtemp(join(tmpdir(), 'paia-maintenance-settings-release-')) : null;
  const extensionPath = release || root;
  const trace = {variant, scenario, extensionPath, sourceRoot:root, node:process.version,
    requestedHead:process.env.PAIA_TESTED_HEAD || null, stages:[], scenarioCompleted:false};
  let h, failure, closeError;
  const note = (stage, values = {}) => trace.stages.push({stage, ...values});
  const start = async fresh => {
    h = await FakeChatGPT.start({extensionPath, headless:true, userDataDir:profile,
      launchThroughPort:true, onboarding:!fresh});
    trace.browser = h.context.browser().version();
    const page = await preparePage(h, {fresh});
    assert.deepEqual(await writes(page), [], 'startup and real reconstruction never toggle Maintenance purpose');
    return page;
  };
  const stop = async () => {
    if (!h) return;
    const old = h;
    let observationError;
    try { offline(old); } catch (error) { observationError = error; }
    for (const page of old.context.pages()) {
      if (page.isClosed() || !page.url().startsWith(`chrome-extension://${old.extensionId}/`)) continue;
      try { await page.evaluate(() => globalThis.__maintenanceSettingsProbe?.restore()); }
      catch (error) { observationError ||= error; }
    }
    const worker = old.context.serviceWorkers().find(w => w.url() === `chrome-extension://${old.extensionId}/background/service-worker.js`);
    if(worker)try { await worker.evaluate(() => globalThis.__maintenanceReloadAuthProbe?.restore()); }
    catch(error) { observationError ||= error; }
    await old.close();
    const child = old.externalChrome?.processHandle;
    if (child) assert.ok(child.exitCode !== null || child.signalCode !== null,
      'actual Chrome must exit before this test reopens/removes its profile');
    h = null;
    if (observationError) throw observationError;
  };
  try {
    if (release) execFileSync('python3', ['scripts/build_current_release.py', release], {cwd:root, stdio:'pipe'});
    const manifest = await readFile(join(extensionPath, 'manifest.json'));
    trace.manifestSha256 = createHash('sha256').update(manifest).digest('hex');
    trace.manifestVersion = JSON.parse(manifest).version;
    const page = await start(true);
    const first = await settled(page, false);
    assert.equal(first.serviceAvailable, false);
    assert.match(await page.locator('#settings-maintenance-status').innerText(), /尚未配置|not configured/);
    note('fresh-default-off', {state:first});
    await run({get h() { return h; }, page, directory, note,
      async restartBrowser() {
        await stop();
        await rm(join(profile, 'DevToolsActivePort'), {force:true});
        return start(false);
      }});
    offline(h);
    trace.scenarioCompleted = true;
  } catch (error) {
    failure = error;
    trace.failure = {name:error.name, message:error.message, stack:error.stack};
    if (h?.archive && !h.archive.isClosed()) {
      // Bounded synthetic identity/error metadata only, never archive bodies.
      try { console.log('MAINTENANCE_SETTINGS_FAILURE_PROBE', JSON.stringify(await h.archive.evaluate(async () => {
        const probe = globalThis.__maintenanceSettingsProbe;
        const tab = await chrome.tabs.getCurrent();
        const contexts = await chrome.runtime.getContexts({contextTypes:['TAB'], documentUrls:[location.href]});
        return {url:location.href, readyState:document.readyState,
          tab:tab ? Object.fromEntries(['id','windowId','url','pendingUrl','status','incognito'].filter(k => Object.hasOwn(tab,k)).map(k => [k,tab[k]])) : null,
          contexts:contexts.slice(0,8).map(c => Object.fromEntries(['contextType','tabId','windowId','frameId','documentId','documentUrl','incognito'].map(k => [k,c[k]]))),
          pending:probe?.pending ?? null, reads:probe?.reads.slice(-20) ?? [], writes:probe?.writes.slice(-10) ?? []};
      }))); } catch (probeError) { console.log('MAINTENANCE_SETTINGS_FAILURE_PROBE_UNAVAILABLE', String(probeError)); }
      try {
        const worker=h.context.serviceWorkers().find(w => w.url() === `chrome-extension://${h.extensionId}/background/service-worker.js`);
        if(worker)console.log('MAINTENANCE_SETTINGS_RELOAD_AUTH',JSON.stringify(await worker.evaluate(() => globalThis.__maintenanceReloadAuthProbe?.rows ?? [])));
      } catch(probeError) { console.log('MAINTENANCE_SETTINGS_RELOAD_AUTH_UNAVAILABLE',String(probeError)); }
      try { await h.archive.screenshot({path:join(directory, 'failure.png'), fullPage:true}); }
      catch (screenshotError) { trace.screenshotError = String(screenshotError); }
    }
  } finally {
    try { await stop(); } catch (error) { closeError = error; }
    if (closeError) trace.cleanupFailure = String(closeError);
    await writeFile(join(directory, 'evidence.json'), JSON.stringify(trace, null, 2) + '\n');
    console.log('MAINTENANCE_SETTINGS_NATIVE', JSON.stringify({...trace, evidenceDirectory:directory}));
    // A failed close never licenses deleting a still-live browser profile.
    if (!h) await rm(profile, {recursive:true, force:true, maxRetries:10, retryDelay:100});
    if (!h && release) await rm(release, {recursive:true, force:true});
  }
  if (failure) throw failure;
  if (closeError) throw closeError;
}

for (const variant of ['source', 'release']) {
  test(`Maintenance Settings native ${scenarios[0]} (${variant})`, {timeout:120000}, async () => {
    await withFixture(variant, scenarios[0], async ({h, page, note}) => {
      assert.equal(await page.locator(INPUT).count(), 1);
      assert.deepEqual(await page.locator(INPUT).evaluate(n => ({tag:n.tagName, type:n.type, role:n.getAttribute('role')})),
        {tag:'INPUT', type:'checkbox', role:'switch'});
      await page.evaluate(() => {
        const input = document.getElementById('settings-maintenance-enabled');
        input.checked = true;
        input.dispatchEvent(new Event('change', {bubbles:true}));
        document.getElementById('settings-maintenance-confirm').click();
      });
      assert.equal(await page.locator(DIALOG).isVisible(), false);
      await settled(page, false);
      assert.deepEqual(await writes(page), []);
      for (const cancel of ['button', 'escape']) {
        await page.locator(INPUT).click();
        await page.locator(DIALOG).waitFor({state:'visible'});
        assert.equal(await focusId(page), 'settings-maintenance-cancel');
        if (cancel === 'button') await page.locator('#settings-maintenance-cancel').click();
        else await page.keyboard.press('Escape');
        await page.locator(DIALOG).waitFor({state:'hidden'});
        assert.equal(await focusId(page), 'settings-maintenance-enabled');
        await settled(page, false);
      }
      assert.deepEqual(await writes(page), []);
      const on = await enable(page);
      note('one-trusted-on-ack', {state:on});
      const peer = await h.context.newPage();
      await peer.goto(page.url());
      await installTransportObserver(peer);
      await openSettings(peer);
      assert.equal((await settled(peer, true)).generation, on.generation);
      const off = await disable(peer);
      await settled(page, false);
      note('peer-off-ack', {state:off});

      await page.bringToFront();
      await page.locator(INPUT).click();
      await page.locator(DIALOG).waitFor({state:'visible'});
      const before = (await writes(page)).length;
      await peer.bringToFront();
      await enable(peer);
      const newerOff = await disable(peer);
      await eventually(() => page.evaluate(generation => __maintenanceSettingsProbe.reads.some(r =>
        r.ok && r.result.generation === generation), newerOff.generation),
      'original notification delivered the newer generation to the open dialog owner');
      await page.bringToFront();
      await page.locator('#settings-maintenance-confirm').click();
      await page.locator(DIALOG).waitFor({state:'hidden'});
      await settled(page, false);
      assert.equal((await writes(page)).length, before, 'a stale modal cannot mint a new-generation enable');
      note('stale-dialog-denied');
      await enable(page);
      await installReloadAuthenticationObserver(h, page);
      await page.reload();
      await installTransportObserver(page);
      await openSettings(page);
      await settled(page, true);
      note('actual-page-reload-retains-on');
      await disable(page);
      await peer.close();
      offline(h);
    });
  });

  test(`Maintenance Settings native ${scenarios[1]} (${variant})`, {timeout:120000}, async () => {
    await withFixture(variant, scenarios[1], async ({h, page, note}) => {
      await enable(page);
      const failed = await failedOff(h, page);
      note('exact-native-put-failed', {state:failed});
      const peer = await h.context.newPage();
      await peer.goto(page.url());
      await installTransportObserver(peer);
      await openSettings(peer);
      const peerState = await settled(peer, false, 'off_unconfirmed');
      assert.equal(peerState.savedEnabled, true, 'a fresh document cannot wash the same-worker deny state');
      await page.bringToFront();
      const count = (await writes(page)).length;
      await page.locator('#settings-maintenance-retry').click();
      await settled(page, false);
      const retry = (await writes(page)).slice(count);
      assert.equal(retry.length, 1);
      assert.deepEqual([retry[0].enabled, retry[0].ok], [false, true]);
      await settled(peer, false);
      note('one-explicit-off-retry-committed');
      await page.evaluate(() => { __maintenanceSettingsProbe.dropNextSuccess = true; });
      await enable(page);
      assert.equal(await page.evaluate(() => __maintenanceSettingsProbe.drops), 1);
      const last = (await writes(page)).at(-1);
      assert.equal(last.deliveryLost, true);
      assert.deepEqual([last.ok, last.result.enabled, last.result.savedEnabled], [true, true, true]);
      assert.match(await page.locator('#settings-maintenance-status').innerText(), /保存回复未确认|save reply was unconfirmed/);
      note('actual-success-before-delivery-loss', {state:await status(page)});
      await disable(page);
      await peer.close();
      offline(h);
    });
  });

  test(`Maintenance Settings native ${scenarios[2]} (${variant})`, {timeout:150000}, async () => {
    await withFixture(variant, scenarios[2], async fixture => {
      let page = fixture.page;
      const before = await enable(page);
      await fixture.h.restartWorker();
      await chooseConsumerGroup(page, 'reading');
      await chooseConsumerGroup(page, 'ai');
      const restarted = await settled(page, true);
      assert.notEqual(restarted.generation, before.generation);
      fixture.note('native-worker-stopped-and-fresh-heap-on', {state:restarted});
      page = await fixture.restartBrowser();
      const reopened = await settled(page, true);
      assert.notEqual(reopened.generation, restarted.generation);
      fixture.note('actual-browser-process-reopened-on', {state:reopened});
      await failedOff(fixture.h, page);
      fixture.note('off-failure-warning-before-worker-loss');
      await fixture.h.restartWorker();
      await chooseConsumerGroup(page, 'reading');
      await chooseConsumerGroup(page, 'ai');
      const oldDurableOn = await settled(page, true);
      assert.equal(oldDurableOn.savedEnabled, true,
        'an unpersisted OFF is not falsely promised to survive an actual fresh worker');
      fixture.note('unpersisted-off-boundary-observed', {state:oldDurableOn});
      await disable(page);
      page = await fixture.restartBrowser();
      fixture.note('actual-browser-process-reopened-off', {state:await settled(page, false)});
      offline(fixture.h);
    });
  });

  test(`Maintenance Settings native ${scenarios[3]} (${variant})`, {timeout:120000}, async () => {
    await withFixture(variant, scenarios[3], async ({h, page, directory, note}) => {
      for (const language of ['zh-CN', 'en']) {
        await chooseConsumerGroup(page, 'reading');
        await page.locator('#ux-language').selectOption(language);
        await eventually(() => page.locator('html').getAttribute('lang').then(x => x === language));
        await chooseConsumerGroup(page, 'ai');
        await settled(page, false);
        await page.setViewportSize({width:320, height:900});
        await page.evaluate(() => {
          const nodes = [...document.querySelectorAll('#settings-maintenance, #settings-maintenance *')];
          globalThis.__maintenanceTextScale = nodes.map(node => ({node,
            value:node.style.getPropertyValue('font-size'), priority:node.style.getPropertyPriority('font-size'),
            base:parseFloat(getComputedStyle(node).fontSize)}));
          for (const row of __maintenanceTextScale) row.node.style.setProperty('font-size', row.base * 2 + 'px', 'important');
        });
        try {
          assert.equal(await page.evaluate(() => __maintenanceTextScale.every(row =>
            Math.abs(parseFloat(getComputedStyle(row.node).fontSize) - row.base * 2) < .1)), true);
          const before = (await writes(page)).length;
          await page.locator(INPUT).focus();
          await page.keyboard.press('Space');
          await page.locator(DIALOG).waitFor({state:'visible'});
          assert.equal(await focusId(page), 'settings-maintenance-cancel');
          const geometry = await page.locator(DIALOG).evaluate(node => {
            const r = node.getBoundingClientRect();
            return {x:r.x, right:r.right, width:r.width,
              overflow:node.scrollWidth - node.clientWidth,
              pageOverflow:document.documentElement.scrollWidth - innerWidth};
          });
          assert.ok(geometry.x >= 0 && geometry.right <= 320 && geometry.overflow <= 2
            && geometry.pageOverflow <= 2, JSON.stringify(geometry));
          await page.screenshot({path:join(directory, language + '-dialog-320-text200.png')});
          await page.keyboard.press('Tab');
          assert.equal(await focusId(page), 'settings-maintenance-confirm');
          await page.keyboard.press('Tab');
          assert.equal(await focusId(page), 'settings-maintenance-cancel', 'forward native modal focus wraps inside');
          await page.keyboard.press('Shift+Tab');
          assert.equal(await focusId(page), 'settings-maintenance-confirm', 'backward native modal focus wraps inside');
          await page.keyboard.press('Shift+Tab');
          assert.equal(await focusId(page), 'settings-maintenance-cancel');
          await page.keyboard.press('Escape');
          await page.locator(DIALOG).waitFor({state:'hidden'});
          assert.equal(await focusId(page), 'settings-maintenance-enabled');
          await settled(page, false);
          assert.equal((await writes(page)).length, before);
          await page.keyboard.press('Space');
          await page.locator(DIALOG).waitFor({state:'visible'});
          await page.keyboard.press('Space');
          await page.locator(DIALOG).waitFor({state:'hidden'});
          assert.equal(await focusId(page), 'settings-maintenance-enabled');
          assert.equal((await writes(page)).length, before);
          await page.keyboard.press('Space');
          await page.locator(DIALOG).waitFor({state:'visible'});
          await page.keyboard.press('Tab');
          assert.equal(await focusId(page), 'settings-maintenance-confirm');
          const button = await page.locator('#settings-maintenance-confirm').boundingBox();
          assert.ok(button && button.x >= 0 && button.x + button.width <= 320
            && button.y >= 0 && button.y + button.height <= 900, 'keyboard confirmation is actually reachable');
          await page.keyboard.press('Enter');
          await trustedActivation(page, 'settings-maintenance-confirm', 'click');
          await settled(page, true);
          await page.locator(INPUT).focus();
          await page.keyboard.press('Space');
          await trustedActivation(page, 'settings-maintenance-enabled', 'change');
          await settled(page, false);
          const calls = (await writes(page)).slice(before);
          assert.deepEqual(calls.map(row => [row.enabled, row.ok]), [[true, true], [false, true]]);
          await page.screenshot({path:join(directory, language + '-settings-320-text200.png'), fullPage:true});
          note('native-compact-keyboard', {language, geometry, writes:calls.map(row => row.enabled)});
        } finally {
          await page.evaluate(() => {
            const dialog = document.getElementById('settings-maintenance-consent');
            if (dialog.open) dialog.close();
            for (const row of __maintenanceTextScale) {
              if (row.value) row.node.style.setProperty('font-size', row.value, row.priority);
              else row.node.style.removeProperty('font-size');
            }
            delete globalThis.__maintenanceTextScale;
          });
          await page.setViewportSize({width:1440, height:900});
        }
      }
      offline(h);
    });
  });
}
