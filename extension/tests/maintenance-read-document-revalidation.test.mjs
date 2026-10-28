import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory, IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {MaintenanceProcessingCommands} from '../background/maintenance-processing-commands.js';
import {MaintenanceProcessingConsent, readMaintenanceProcessingConsent, assertMaintenanceProcessingConsentFacts} from '../background/maintenance-processing-consent.js';

globalThis.IDBKeyRange = IDBKeyRange;
const READ = 'PAIA_MAINTENANCE_PROCESSING_STATUS', WRITE = 'PAIA_MAINTENANCE_PROCESSING_CONFIGURE';
const KEY = 'aiu:maintenance-processing-consent:v1';
const forbidden = error => error.code === 'FORBIDDEN';
async function fixture(t) {
  const local = {}, storage = {async get(key) { return {[key]:structuredClone(local[key])}; }, async set(value) { Object.assign(local, structuredClone(value)); }};
  const store = new IndexedArchiveStore(storage, {indexedDB:new IDBFactory()});
  await store.consent(true); t.after(() => store.repository.close());
  const url = 'chrome-extension://synthetic/ui/archive.html';
  const sender = {id:'synthetic', frameId:0, documentId:'current-document', documentLifecycle:'active', url, tab:{id:4, windowId:2, incognito:false}};
  const f = {store, sender, listeners:{}, calls:[], hooks:{}, counts:{tab:0, context:0},
    tab:{id:4, windowId:2, incognito:false, url, status:'complete'},
    context:{contextType:'TAB', tabId:4, windowId:2, frameId:0, documentId:sender.documentId, documentUrl:url, incognito:false}};
  const api = {runtime:{id:'synthetic', getURL:path => 'chrome-extension://synthetic/' + path,
    async getContexts() { const count = ++f.counts.context; f.calls.push('context:' + count); await f.hooks.context?.(count); return f.context === null ? [] : [{...f.context}]; }},
    tabs:{async get() { const count = ++f.counts.tab; f.calls.push('tab:' + count); await f.hooks.tab?.(count); return {...f.tab}; },
      onRemoved:{addListener(fn) { f.listeners.removed = fn; }}, onUpdated:{addListener(fn) { f.listeners.updated = fn; }}}};
  const status = store.status.bind(store);
  store.status = async () => { f.calls.push('permission'); await f.hooks.permission?.(); return status(); };
  f.commands = new MaintenanceProcessingCommands(store, api);
  f.send = (type = READ, fields = {}, source = sender) => f.commands.handle({type, ...fields}, source);
  f.persisted = () => store.run(() => store.repository.transaction(false, tx => tx.get('meta', KEY), ['meta']));
  f.reset = () => { f.calls.length = 0; f.counts.tab = f.counts.context = 0; f.hooks = {}; };
  return f;
}
function loading(f) { f.tab.status = 'loading'; f.listeners.updated(4, {status:'loading'}); }
function complete(f) { f.tab.status = 'complete'; f.listeners.updated(4, {status:'complete'}); }
function pulse(f) { loading(f); complete(f); }
const configure = (f, enabled, generation) => f.send(WRITE, {enabled, expectedGeneration:generation, consentVersion:1, confirmed:true});

for (const phase of ['tab', 'context']) test('early same-document loading during initial ' + phase + ' check revalidates inside original three-check budget', async t => {
  const f = await fixture(t);
  f.hooks[phase] = count => { if (count === 1) pulse(f); };
  const result = await f.send();
  assert.deepEqual([result.enabled, result.savedEnabled, result.phase, result.serviceAvailable], [false, false, 'off', false]);
  assert.deepEqual(f.calls, ['tab:1','context:1','tab:2','context:2','permission','tab:3','context:3']);
  assert.deepEqual(f.counts, {tab:3, context:3});
  assert.equal(await f.persisted(), undefined, 'a status read never creates purpose consent');
});

test('ordinary status keeps original call order and has no added authentication work', async t => {
  const f = await fixture(t); await f.send();
  assert.deepEqual(f.calls, ['tab:1','context:1','permission','tab:2','context:2','tab:3','context:3']);
});

for (const state of ['loading', undefined]) test('revalidation requires an actual complete tab, not merely same URL: ' + state, async t => {
  const f = await fixture(t); f.hooks.tab = count => { if (count === 1) loading(f); if (count === 2) f.tab.status = state; };
  await assert.rejects(f.send(), forbidden); assert.equal(f.calls.includes('permission'), false);
  assert.deepEqual(f.counts, {tab:2, context:1});
});

test('revalidation rejects replaced document even when URL and last complete are identical', async t => {
  const f = await fixture(t); f.hooks.tab = count => { if (count === 1) pulse(f); if (count === 2) f.context.documentId = 'replacement-document'; };
  await assert.rejects(f.send(), forbidden); assert.equal(f.calls.includes('permission'), false);
  f.reset(); await assert.rejects(f.send(), forbidden); assert.equal(f.counts.tab, 1, 'old-document replay does not acquire a revalidation path');
});

test('revalidation retains complete context identity and rejects absent or foreign context', async t => {
  for (const alter of [f => { f.context = null; }, f => { f.context.frameId = 1; }, f => { f.context.windowId++; }, f => { f.context.incognito = true; }, f => { f.context.documentUrl += '#foreign'; }]) {
    const f = await fixture(t); f.hooks.tab = count => { if (count === 1) pulse(f); if (count === 2) alter(f); };
    await assert.rejects(f.send(), forbidden); assert.equal(f.calls.includes('permission'), false);
  }
});

test('pending navigation remains forbidden during revalidation', async t => {
  const f = await fixture(t); f.hooks.tab = count => { if (count === 1) pulse(f); if (count === 2) f.tab.pendingUrl = f.sender.url; };
  await assert.rejects(f.send(), forbidden); assert.equal(f.calls.includes('permission'), false);
});

for (const event of ['url', 'remove']) test('early ' + event + ' remains a hard cancellation even with later matching facts', async t => {
  const f = await fixture(t); f.hooks.tab = count => { if (count !== 1) return; pulse(f); if (event === 'url') f.listeners.updated(4, {url:f.sender.url}); else f.listeners.removed(4); };
  await assert.rejects(f.send(), forbidden); assert.equal(f.counts.tab, 1);
});

for (const phase of ['second-tab', 'second-context', 'permission', 'final-tab', 'final-context']) test('a new loading after initial authentication stays invalid: ' + phase, async t => {
  const f = await fixture(t);
  f.hooks.tab = count => { if (count === 1 || phase === 'second-tab' && count === 2 || phase === 'final-tab' && count === 3) pulse(f); };
  f.hooks.context = count => { if (phase === 'second-context' && count === 2 || phase === 'final-context' && count === 3) pulse(f); };
  f.hooks.permission = () => { if (phase === 'permission') pulse(f); };
  await assert.rejects(f.send(), forbidden); assert.ok(f.counts.tab <= 3); assert.equal(await f.persisted(), undefined);
});

test('permission is read afresh after complete revalidation and revocation remains denied', async t => {
  const f = await fixture(t); f.hooks.tab = async count => {
    if (count === 1) pulse(f);
    if (count === 2) await f.store.write(async tx => {
      // Synthetic revocation in the real local control row; consent(false) is
      // intentionally not a production API and must not stand in for this fact.
      const control = await f.store.control(tx);
      control.settings.consentVersion = 0;
      control.settings.epoch++;
      await f.store.saveControl(tx, control);
    });
  };
  await assert.rejects(f.send(), error => error.code === 'CONSENT_REQUIRED');
  assert.deepEqual(f.calls, ['tab:1','context:1','tab:2','context:2','permission']);
});

test('final document replacement rejects a completed purpose read before returning it', async t => {
  const f = await fixture(t); f.hooks.tab = count => { if (count === 1) pulse(f); if (count === 3) f.context.documentId = 'replacement-document'; };
  await assert.rejects(f.send(), forbidden); assert.equal(f.counts.tab, 3);
});

test('revalidation native failure is preserved without another authentication attempt', async t => {
  const f = await fixture(t), failure = Error('synthetic native read failure');
  f.hooks.tab = count => { if (count === 1) pulse(f); if (count === 2) throw failure; };
  await assert.rejects(f.send(), error => error === failure); assert.equal(f.counts.tab, 2);
});

test('ON write remains cancelled by early loading and persists no consent', async t => {
  const f = await fixture(t), before = await f.send(); f.reset(); f.hooks.tab = count => { if (count === 1) pulse(f); };
  await assert.rejects(configure(f, true, before.generation), forbidden); assert.equal(await f.persisted(), undefined); assert.equal(f.counts.tab, 1);
});

test('known-document OFF retains immediate revocation and sticky denial after cancelled authentication', async t => {
  const f = await fixture(t), before = await f.send(), on = await configure(f, true, before.generation);
  const owner = new MaintenanceProcessingConsent(f.store); t.after(() => owner.dispose());
  const cap = await f.store.run(() => f.store.repository.transaction(false, tx => readMaintenanceProcessingConsent(owner, f.store, tx), ['meta']));
  assert.equal(assertMaintenanceProcessingConsentFacts(cap, owner, f.store), true);
  f.reset(); f.hooks.tab = count => { if (count === 1) { assert.throws(() => assertMaintenanceProcessingConsentFacts(cap, owner, f.store)); pulse(f); } };
  await assert.rejects(configure(f, false, on.generation), forbidden);
  assert.equal((await f.persisted()).enabled, true, 'cancelled OFF does not falsely report a saved change');
  assert.throws(() => assertMaintenanceProcessingConsentFacts(cap, owner, f.store));
  f.reset(); const state = await f.send(); assert.deepEqual([state.savedEnabled, state.enabled, state.phase], [true, false, 'off_unconfirmed']);
});
