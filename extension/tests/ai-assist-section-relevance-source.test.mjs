import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService, CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {AssistReplyLease} from '../background/assist-reply-lease.js';
import {LocalAssistSession} from '../core/ai-usage/local-assist-session.js';

const op = () => crypto.randomUUID();
const read = (store, fn) => store.repository.transaction(false, fn);
const raw = (store, name, id) => read(store, transaction => transaction.get(name, id));

async function fixture({card = 'info', section = 'Fitness; Sleep', discovery = true, processing = true} = {}) {
  const {s} = await setup(OrganizerStore);
  await s.finishFoundation();
  await s.setFilterMode('off');
  const cards = new ContextCardsService(s), itemId = op();
  await cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId, expectedRevision: 0, card, body: 'Synthetic relevant sleep fact', section});
  const sender = {id: 'synthetic-extension', tab: {id: 1}, frameId: 0, documentId: 'synthetic-document', documentLifecycle: 'active', url: 'https://chatgpt.com/c/m1-synthetic-chat'};
  const binding = {url: sender.url, conversation: '/c/m1-synthetic-chat', cycle: 1, replyId: 'synthetic-reply', revision: 1};
  const snapshot = {completed: true, text: 'What should I change about sleep?', blocks: 1, excluded: false};
  const lease = new AssistReplyLease({runtimeId: sender.id, tabs: {get: async () => ({url: sender.url, active: true, incognito: false})}, probe: async (_host, {snapshot: body}) => ({ready: true, binding: structuredClone(binding), ...(body ? {snapshot: structuredClone(snapshot)} : {})}), current: () => true});
  lease.configure({replyAccess: true, remoteProcessing: true, automatic: true});
  const cap = await lease.observe(sender), expiresAt = Date.now() + 600000;
  const discoveryAbort = new AbortController(), bodyAbort = new AbortController(), discoveryRequests = [], bodyRequests = [], sent = [];
  const contextDiscovery = {resolve: async (_t, scope) => {discoveryRequests.push(structuredClone(scope)); return {version: 1, store: s, scope, epoch: 'synthetic-label-grant', processing: true, expiresAt, revocationSignal: discoveryAbort.signal};}, isCurrent: () => !discoveryAbort.signal.aborted};
  const contextProcessing = {resolve: async (_t, scope) => {bodyRequests.push(structuredClone(scope)); return {version: 1, store: s, scope, epoch: 'synthetic-body-grant', processing: true, expiresAt, revocationSignal: bodyAbort.signal};}, isCurrent: () => !bodyAbort.signal.aborted};
  const session = new LocalAssistSession(s, {lease, intent: 'automatic_assist', contextDiscovery: discovery ? contextDiscovery : null, contextProcessing: processing ? contextProcessing : null,
    resolveAuthority: async (_t, request) => ({allowed: true, principalId: 'synthetic', libraryId: 'synthetic', consentEpoch: 'synthetic', jobTypes: ['AI_ASSIST'], scope: {evidenceKeys: request.evidenceKeys, coverage: request.coverage}}),
    provider: {describe: () => ({providerId: 'synthetic', version: '1', executionKind: 'fixture'}), execute: async payload => {sent.push(payload); return JSON.stringify({version: 1, kind: 'SUGGESTION', text: 'Explain the next step.', condition: ''});}}
  });
  return {s, cards, itemId, card, lease, cap, session, binding, snapshot, expiresAt, contextDiscovery, contextProcessing, discoveryAbort, bodyAbort, discoveryRequests, bodyRequests, sent};
}

for (const card of ['info', 'now']) test('original automatic source selects independently granted ' + card + ' explicit Section component', async () => {
  const f = await fixture({card}), handle = await f.session.prepare({lease: f.cap});
  assert.equal((await f.session.run(handle)).kind, 'SUGGESTION');
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].context.length, 1);
  assert.equal(JSON.parse(f.sent[0].context[0]).card, card);
  assert.deepEqual(f.discoveryRequests[0].contextItems, [{itemId: f.itemId, revision: 1, card, selectedFields: ['section']}]);
  assert.deepEqual(f.bodyRequests[0].contextItems[0].selectedFields, ['body', 'section']);
  assert.equal(f.bodyRequests[0].contextItems[0].itemId, f.itemId);
  assert.equal((await raw(f.s, 'meta', CONTEXT_CARDS_ROW)).access.global.enabled, false);
  assert.doesNotMatch(JSON.stringify(f.sent[0].context), /synthetic-label-grant|synthetic-body-grant|disposition|explicit-part|comparisonCeiling/);
});

for (const [section, reply, expected] of [
  ['健康、睡眠', '怎样改善睡眠质量？', 1],
  ['Ｆｉｔｎｅｓｓ；Ｓｌｅｅｐ', 'Discuss SLEEP.', 1],
  ['Fitness and Sleep', 'Discuss sleep.', 0],
  ['War and Peace', 'Discuss peace.', 0],
  ['Java; Apple', 'Discuss Java and Apple.', 0],
  ['Health; Sleep', 'Discuss unhealthy oversleeping.', 0]
]) test('actual original discovery applies component precision ' + JSON.stringify([section, reply]), async () => {
  const f = await fixture({section}); f.snapshot.text = reply;
  const handle = await f.session.prepare({lease: f.cap}); await f.session.run(handle);
  assert.equal(f.sent[0].context.length, expected);
  assert.equal(f.bodyRequests.length > 0, expected > 0);
});

for (const missing of ['discovery', 'processing']) test('component relevance cannot replace missing independent ' + missing + ' authority', async () => {
  const f = await fixture({[missing]: false});
  let text = 0;
  const original = f.s.repository.transaction.bind(f.s.repository);
  f.s.repository.transaction = (write, fn, stores) => original(write, async t => {
    const get = t.get.bind(t);
    t.get = async (name, id) => {
      const row = await get(name, id);
      if (name === 'meta' && id === CONTEXT_CARDS_ROW) row.items = row.items.map(item => new Proxy(item, {getOwnPropertyDescriptor(target, key) {
        if (key === 'body' || missing === 'discovery' && key === 'section') {text++; throw Error('ungranted text');}
        return Reflect.getOwnPropertyDescriptor(target, key);
      }}));
      return row;
    };
    return fn(t);
  }, stores);
  try {
    await assert.rejects(f.session.prepare({lease: f.cap}));
    assert.equal(text, 0); assert.equal(f.sent.length, 0); assert.equal(f.bodyRequests.length, 0);
    assert.equal(await read(f.s, t => t.count('organizerJobs')), 0);
  } finally {f.s.repository.transaction = original;}
});

test('same-name manual Items receive distinct exact original grants rather than a name-based merge', async () => {
  const f = await fixture(), second = op();
  await f.cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId: second, expectedRevision: 0, card: 'now', body: 'Synthetic second relevant fact', section: 'Fitness; Sleep'});
  const handle = await f.session.prepare({lease: f.cap}); await f.session.run(handle);
  assert.equal(f.sent[0].context.length, 2);
  assert.deepEqual(new Set(f.bodyRequests[0].contextItems.map(item => item.itemId)), new Set([f.itemId, second]));
});

for (const boundary of ['expiry', 'revoke']) for (const phase of ['label', 'matching', 'before-body-grant']) test(boundary + ' at ' + phase + ' refuses before acquiring a new Item body grant', async t => {
  const f = await fixture(); let now = Date.now(), fired = false, bodyTouches = 0;
  t.mock.method(Date, 'now', () => now);
  const invalidate = () => {fired = true; if (boundary === 'expiry') now = f.expiresAt + 1; else f.discoveryAbort.abort();};
  const original = f.s.repository.transaction.bind(f.s.repository);
  f.s.repository.transaction = (write, fn, stores) => original(write, async transaction => {
    const get = transaction.get.bind(transaction);
    transaction.get = async (name, id) => {
      const row = await get(name, id);
      if (name === 'meta' && id === CONTEXT_CARDS_ROW) row.items = row.items.map(item => new Proxy(item, {getOwnPropertyDescriptor(target, key) {
        if (key === 'body') {bodyTouches++; throw Error('body acquired across stale label receipt');}
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (phase === 'label' && key === 'section' && f.discoveryRequests.length && !fired) invalidate();
        return descriptor;
      }}));
      return row;
    };
    return fn(transaction);
  }, stores);
  if (phase !== 'label') {
    const normalize = String.prototype.normalize;
    t.mock.method(String.prototype, 'normalize', function (...args) {
      const result = Reflect.apply(normalize, this, args);
      if (String(this) === 'Fitness; Sleep' && f.discoveryRequests.length && !fired) {
        if (phase === 'matching') invalidate();
        else queueMicrotask(invalidate);
      }
      return result;
    });
  }
  try {
    await assert.rejects(f.session.prepare({lease: f.cap}));
    assert.equal(fired, true); assert.equal(bodyTouches, 0); assert.equal(f.bodyRequests.length, 0); assert.equal(f.sent.length, 0);
    assert.equal(await read(f.s, transaction => transaction.count('organizerJobs')), 0);
  } finally {f.s.repository.transaction = original;}
});

test('expiry during an awaited new body-grant resolution still acquires zero Item body and creates no job', async t => {
  const f = await fixture(); let now = Date.now(), bodyTouches = 0;
  t.mock.method(Date, 'now', () => now);
  const resolve = f.contextProcessing.resolve;
  f.contextProcessing.resolve = async (transaction, scope) => {const receipt = await resolve(transaction, scope); await transaction.get('meta', 'gate'); now = f.expiresAt + 1; return receipt;};
  const original = f.s.repository.transaction.bind(f.s.repository);
  f.s.repository.transaction = (write, fn, stores) => original(write, async transaction => {
    const get = transaction.get.bind(transaction);
    transaction.get = async (name, id) => {const row = await get(name, id); if (name === 'meta' && id === CONTEXT_CARDS_ROW) row.items = row.items.map(item => new Proxy(item, {getOwnPropertyDescriptor(target, key) {if (key === 'body') {bodyTouches++; throw Error('expired body grant');} return Reflect.getOwnPropertyDescriptor(target, key);}})); return row;};
    return fn(transaction);
  }, stores);
  try {
    await assert.rejects(f.session.prepare({lease: f.cap}));
    assert.equal(f.bodyRequests.length, 1); assert.equal(bodyTouches, 0); assert.equal(f.sent.length, 0);
    assert.equal(await read(f.s, transaction => transaction.count('organizerJobs')), 0);
  } finally {f.s.repository.transaction = original;}
});

test('an unrelated body edit preserves the same result while a new matching component invalidates it', async () => {
  const f = await fixture(), second = op();
  await f.cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId: second, expectedRevision: 0, card: 'info', body: 'Synthetic unrelated travel fact', section: 'Travel; Fitness'});
  const handle = await f.session.prepare({lease: f.cap}); await f.session.run(handle);
  await f.cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId: second, expectedRevision: 1, card: 'info', body: 'Synthetic edited unrelated travel fact', section: 'Travel; Fitness'});
  assert.equal((await f.session.result(handle)).kind, 'SUGGESTION'); assert.equal(f.sent.length, 1);
  await f.cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId: second, expectedRevision: 2, card: 'info', body: 'Synthetic newly relevant fact', section: 'Travel; Sleep'});
  await assert.rejects(f.session.result(handle)); assert.equal(f.sent.length, 1);
});

test('a matching component does not refresh the selected body baseline after a label ABA', async () => {
  const f = await fixture(), handle = await f.session.prepare({lease: f.cap}); await f.session.run(handle);
  for (const [revision, section] of [[1, 'Travel; Fitness'], [2, 'Fitness; Sleep']]) await f.cards.change({kind: 'put', operationId: op(), epoch: 'initial', itemId: f.itemId, expectedRevision: revision, card: 'info', body: 'Synthetic relevant sleep fact', section});
  await assert.rejects(f.session.result(handle)); assert.equal(f.sent.length, 1);
});

test('original joined result transaction rolls back a matching Item edit after its ACK write', async () => {
  const f = await fixture(), handle = await f.session.prepare({lease: f.cap}), before = await raw(f.s, 'meta', CONTEXT_CARDS_ROW);
  let injected = false;
  const original = f.s.foundationWrite.bind(f.s);
  f.s.foundationWrite = fn => original(async transaction => {
    const put = transaction.put.bind(transaction);
    transaction.put = async (name, row) => {
      const result = await put(name, row);
      if (!injected && name === 'organizerWorkItems' && String(row.id).startsWith('aiu:assist-result:')) {
        injected = true;
        const cards = await transaction.get('meta', CONTEXT_CARDS_ROW), item = cards.items.find(value => value.id === f.itemId);
        item.body = 'Synthetic changed after result ACK'; item.revision++;
        await put('meta', cards);
      }
      return result;
    };
    return fn(transaction);
  });
  await assert.rejects(f.session.run(handle));
  assert.equal(injected, true); assert.equal(f.sent.length, 1);
  assert.equal(await read(f.s, transaction => transaction.count('organizerWorkItems')), 0);
  assert.deepEqual(await raw(f.s, 'meta', CONTEXT_CARDS_ROW), before);
});
