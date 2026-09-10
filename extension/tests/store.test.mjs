import test from 'node:test';
import assert from 'node:assert/strict';
import { ArchiveStore, initialState } from '../core/store.js';
import { hashText } from '../core/dedupe.js';
import { STORAGE_KEY } from '../core/constants.js';
import { emptyStructure, emptyRow, sanitizeStructure } from '../core/diagnostics.js';

function fixture({ initial = {}, clock } = {}) {
  let saved = structuredClone(initial);
  let fail = false;
  let seq = 0;
  let writes = 0;
  const storage = {
    async get() { return structuredClone(saved); },
    async set(value) {
      if (fail) throw new Error('QUOTA_BYTES exceeded');
      saved = structuredClone({ ...saved, ...value });
      writes += 1;
    },
    async getBytesInUse() { return new TextEncoder().encode(JSON.stringify(saved)).length; }
  };
  const store = new ArchiveStore(storage, { uuid: () => `synthetic-id-${++seq}`, ...(clock ? { clock } : {}) });
  return { store, storage, saved: () => saved, writes: () => writes, fail: value => { fail = value; } };
}

function batch(epoch, messages = [{ sourceMessageId: 'synthetic-message-1', pageOrder: 1, originalText: '虚构测试文字\n第二行' }]) {
  return { epoch, adapterVersion: '0.3.0', chat: { id: 'synthetic-chat-1', url: 'https://chatgpt.com/c/synthetic-chat-1', title: '虚构测试聊天' }, messages };
}

async function enabled(f) {
  await f.store.consent(true);
  return (await f.store.status()).epoch;
}

test('privacy gate defaults closed, requires active consent and rejects paused/stale batches', async () => {
  const f = fixture();
  assert.deepEqual(await f.store.status(), { enabled: false, consented: false, epoch: 0, adapterVersion: '0.3.0' });
  await assert.rejects(f.store.capture(batch(0)), { code: 'CONSENT_REQUIRED' });
  await assert.rejects(f.store.setEnabled(true), { code: 'CONSENT_REQUIRED' });
  await assert.rejects(f.store.consent(false), { code: 'INVALID_REQUEST' });
  const epoch = await enabled(f);
  await f.store.setEnabled(false);
  await assert.rejects(f.store.capture(batch(epoch)), { code: 'PAUSED' });
  await f.store.setEnabled(true);
  await assert.rejects(f.store.capture(batch(epoch)), { code: 'STALE_CAPTURE' });
  assert.equal((await f.store.snapshot()).records.length, 0);
});

test('concurrent duplicate batches commit once; same text from two messages stays separate', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  const outcomes = await Promise.all(Array.from({ length: 8 }, () => f.store.capture(batch(epoch))));
  assert.equal(outcomes.reduce((sum, item) => sum + item.added, 0), 1);
  const repeated = batch(epoch).messages[0];
  await f.store.capture(batch(epoch, [{ ...repeated, sourceMessageId: 'synthetic-message-2', pageOrder: 2 }]));
  assert.equal((await f.store.snapshot()).records.length, 2);
  const restarted = new ArchiveStore(f.storage);
  assert.equal((await restarted.capture(batch(epoch))).added, 0);
  assert.equal((await restarted.snapshot()).records.length, 2);
});

test('raw text is byte-preserved, SHA-256 is stable, edits are separate immutable snapshots', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  const raw = '  虚构\n\nemoji 🙂 <b>literal</b>\n';
  await f.store.capture(batch(epoch, [{ sourceMessageId: 'synthetic-message-1', pageOrder: 1, originalText: raw }]));
  const original = (await f.store.snapshot()).records[0];
  assert.equal(original.originalText, raw);
  assert.equal(original.contentHash, await hashText(raw));
  assert.equal(await hashText('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await f.store.update(original.id, { note: '虚构备注', editedText: '虚构整理版' });
  await assert.rejects(f.store.update(original.id, { originalText: 'forbidden' }), { code: 'INVALID_REQUEST' });
  await assert.rejects(f.store.update(original.id, { contentHash: 'forbidden' }), { code: 'INVALID_REQUEST' });
  await f.store.capture(batch(epoch, [{ sourceMessageId: 'synthetic-message-1', pageOrder: 1, originalText: '虚构重新发送版' }]));
  const records = (await f.store.snapshot()).records;
  assert.equal(records.length, 2);
  assert.equal(records[0].originalText, raw);
  assert.equal(records[0].contentHash, original.contentHash);
  assert.equal(records[0].note, '虚构备注');
  assert.equal(records[1].previousVersionId, original.id);
  assert.equal((await f.store.capture(batch(epoch))).added, 1);
});

test('hidden/trash remain deduplicated and purge retains only an irreversible hash tombstone', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  await f.store.capture(batch(epoch));
  const record = (await f.store.snapshot()).records[0];
  await f.store.update(record.id, { hidden: true });
  assert.equal((await f.store.capture(batch(epoch))).added, 0);
  assert.equal((await f.store.snapshot()).stats.hidden, 1);
  await f.store.trash(record.id);
  assert.equal((await f.store.snapshot()).stats.total, 0);
  await f.store.restore(record.id);
  assert.equal((await f.store.snapshot()).stats.total, 1);
  await assert.rejects(f.store.purge(record.id), { code: 'INVALID_REQUEST' });
  await f.store.trash(record.id);
  await f.store.purge(record.id);
  const durable = f.saved()[STORAGE_KEY];
  assert.equal(durable.records.length, 0);
  assert.deepEqual(durable.tombstones, [{sourceIdentityHash: record.sourceKey, deletedAt: durable.tombstones[0].deletedAt, status: 'permanently_ignored'}]);
  assert.ok(!JSON.stringify(durable).includes(record.originalText));
  assert.ok(!JSON.stringify(durable).includes(record.chatTitle));
  assert.ok(!JSON.stringify(durable).includes(record.chatId));
  const restarted = new ArchiveStore(f.storage);
  assert.equal((await restarted.capture(batch(epoch))).added, 0);
});

test('quota failure is explicit, preserves durable data, and can retry without false dedupe', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  const before = structuredClone(f.saved());
  f.fail(true);
  await assert.rejects(f.store.capture(batch(epoch)), { code: 'STORAGE_FULL' });
  assert.deepEqual(f.saved(), before);
  const state = await f.store.snapshot();
  assert.equal(state.records.length, 0);
  assert.equal(state.diagnostics.lastError.code, 'STORAGE_FULL');
  f.fail(false);
  assert.equal((await f.store.capture(batch(epoch))).added, 1);
});

test('a queued pause blocks later captures, while concurrent note and capture writes retain both', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  await f.store.capture(batch(epoch));
  const id = (await f.store.snapshot()).records[0].id;
  await Promise.all([
    f.store.update(id, { note: '虚构并发备注' }),
    f.store.capture(batch(epoch, [{ sourceMessageId: 'synthetic-message-2', pageOrder: 2, originalText: '虚构并发消息' }]))
  ]);
  let state = await f.store.snapshot();
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0].note, '虚构并发备注');
  const pause = f.store.setEnabled(false);
  const late = f.store.capture(batch(epoch));
  await pause;
  await assert.rejects(late, { code: 'PAUSED' });
  state = await f.store.snapshot();
  assert.equal(state.settings.enabled, false);
});

test('invalid capture payload cannot write draft-shaped data or mutate another record', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  for (const request of [
    { ...batch(epoch), chat: { ...batch(epoch).chat, url: 'https://example.invalid/c/synthetic-chat-1' } },
    { ...batch(epoch), chat: { ...batch(epoch).chat, url: 'https://chatgpt.com/c/synthetic-chat-1?temporary-chat=true' } },
    { ...batch(epoch), adapterVersion: 'unknown' },
    batch(epoch, [{ pageOrder: 1, originalText: '虚构无已发送身份' }]),
    batch(epoch, [{ sourceMessageId: 'synthetic-message-1', pageOrder: 0, originalText: '虚构' }])
  ]) await assert.rejects(f.store.capture(request), { code: 'INVALID_REQUEST' });
  assert.equal((await f.store.snapshot()).records.length, 0);
});

test('diagnostics whitelist drops all body/title/url/error payload fields', async () => {
  const f = fixture();
  await enabled(f);
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 2, originalText: '虚构秘密', title: '虚构标题', url: 'https://example.invalid', error: '虚构异常正文' });
  const diagnostic = (await f.store.snapshot()).diagnostics;
  assert.equal(diagnostic.lastError.code, 'ADAPTER_MISMATCH');
  assert.ok(!JSON.stringify(diagnostic).includes('虚构'));
  await assert.rejects(f.store.diagnose({ code: '虚构任意错误正文' }), { code: 'INVALID_REQUEST' });
});

test('structural diagnostics persist only the safe projection and refresh immediately when counts change', async () => {
  const now = '2026-01-01T00:00:00.000Z';
  const f = fixture({ clock: () => now });
  const epoch = await enabled(f);
  await f.store.capture(batch(epoch));
  const records = structuredClone((await f.store.snapshot()).records);
  const privateSentinel = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL';
  const structure = {
    ...emptyStructure(), mainPresent: true, userRoleCount: 1,
    originalText: privateSentinel, url: privateSentinel, chatTitle: privateSentinel,
    messageId: privateSentinel, contentHash: privateSentinel,
    error: { message: privateSentinel }, nested: { text: privateSentinel },
    rows: [{ ...emptyRow(), textMatches: 0, originalText: privateSentinel, error: { message: privateSentinel } }]
  };
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure });
  const firstWrites = f.writes();
  const first = f.saved()[STORAGE_KEY].diagnostics;
  assert.deepEqual(first.structure, sanitizeStructure(structure));
  assert.equal(first.structureAt, now);
  assert.equal(JSON.stringify(first).includes(privateSentinel), false);

  // Identical status and scanned count, within the one-minute diagnostic throttle.
  const changed = structuredClone(structure);
  changed.rows[0].textMatches = 2;
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: changed });
  assert.equal(f.writes(), firstWrites + 1);
  assert.equal(f.saved()[STORAGE_KEY].diagnostics.structure.rows[0].textMatches, 2);
  assert.deepEqual((await f.store.snapshot()).diagnostics.structure, sanitizeStructure(changed));
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: changed });
  assert.equal(f.writes(), firstWrites + 1, 'unchanged structure remains throttled');

  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: { ...structure, userRoleCount: '1' } });
  assert.equal(f.saved()[STORAGE_KEY].diagnostics.structure, null);
  assert.equal(f.saved()[STORAGE_KEY].diagnostics.structureAt, null);
  assert.deepEqual((await f.store.snapshot()).records, records);
  for (const scanned of [-1, 1.5, '1', NaN, Infinity, Number.MAX_SAFE_INTEGER, 1000001]) {
    await assert.rejects(f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned, structure }), { code: 'INVALID_REQUEST' });
  }
});

test('consent, pause, resume and non-capture page statuses clear structural diagnostics', async () => {
  const f = fixture();
  const structure = { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] };
  const report = () => f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure });
  const assertClear = async () => {
    const diagnostics = (await f.store.snapshot()).diagnostics;
    assert.equal(diagnostics.structure, null);
    assert.equal(diagnostics.structureAt, null);
  };
  await report();
  await assertClear();
  await enabled(f);
  await report();
  assert.ok((await f.store.snapshot()).diagnostics.structure);
  await f.store.setEnabled(false);
  await assertClear();
  assert.equal(f.saved()[STORAGE_KEY].diagnostics.structure, null);
  await report();
  await assertClear();
  await f.store.setEnabled(true);
  await assertClear();
  await report();
  await f.store.consent(true);
  await assertClear();
  for (const code of ['TEMPORARY_CHAT', 'WAITING_CHAT', 'ADAPTER_VERSION_MISMATCH', 'CONTEXT_INVALIDATED', 'PAUSED', 'CONSENT_REQUIRED']) {
    await report();
    await f.store.diagnose({ code, scanned: 1, structure });
    await assertClear();
  }
});

test('old v0.1.0 records load without structural fields and preserve original text without a storage rewrite', async () => {
  const original = fixture();
  const epoch = await enabled(original);
  await original.store.capture(batch(epoch));
  const oldState = structuredClone(original.saved()[STORAGE_KEY]);
  oldState.diagnostics.adapterVersion = '0.1.0';
  delete oldState.diagnostics.structure;
  delete oldState.diagnostics.structureAt;
  const recordsBefore = structuredClone(oldState.records);
  const f = fixture({ initial: { [STORAGE_KEY]: oldState } });
  const result = await f.store.snapshot();
  assert.deepEqual(result.records, recordsBefore);
  assert.equal(result.diagnostics.adapterVersion, '0.3.0');
  assert.equal(result.diagnostics.structure, null);
  assert.equal(result.diagnostics.structureAt, null);
  assert.equal(f.writes(), 0);
  assert.deepEqual(f.saved()[STORAGE_KEY].records, recordsBefore);
});

test('load and snapshot sanitize malicious old diagnostics and cannot surface raw strings from structure', async () => {
  const privateSentinel = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL';
  const state = initialState();
  state.settings = { consentVersion: 1, consentAt: null, enabled: true, epoch: 1 };
  state.diagnostics = {
    ...state.diagnostics, status: 'ADAPTER_MISMATCH',
    originalText: privateSentinel, adapterVersion: privateSentinel,
    structure: { ...emptyStructure(), userRoleCount: privateSentinel, rows: [emptyRow()] },
    structureAt: privateSentinel, lastError: { code: 'ADAPTER_MISMATCH', at: privateSentinel, message: privateSentinel }
  };
  const f = fixture({ initial: { [STORAGE_KEY]: state } });
  const loaded = (await f.store.snapshot()).diagnostics;
  assert.equal(loaded.structure, null);
  assert.equal(loaded.structureAt, null);
  assert.equal(JSON.stringify(loaded).includes(privateSentinel), false);
  assert.equal(f.writes(), 0);

  // Exercise the additional boundary at snapshot(), independently of load().
  f.store.state.diagnostics.structure = { ...emptyStructure(), originalText: privateSentinel, rows: [{ ...emptyRow(), messageId: privateSentinel }] };
  f.store.state.diagnostics.extraPayload = { originalText: privateSentinel };
  const projected = (await f.store.snapshot()).diagnostics;
  assert.deepEqual(projected.structure, { ...emptyStructure(), rows: [emptyRow()] });
  assert.equal(JSON.stringify(projected).includes(privateSentinel), false);
});

test('paused or unconsented persisted state never exposes earlier structural diagnostics on load', async () => {
  for (const settings of [
    { consentVersion: 0, consentAt: null, enabled: false, epoch: 0 },
    { consentVersion: 1, consentAt: null, enabled: false, epoch: 1 }
  ]) {
    const state = initialState();
    state.settings = settings;
    state.diagnostics.structure = { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] };
    state.diagnostics.structureAt = '2026-01-01T00:00:00.000Z';
    const f = fixture({ initial: { [STORAGE_KEY]: state } });
    const snapshot = await f.store.snapshot();
    assert.equal(snapshot.diagnostics.structure, null);
    assert.equal(snapshot.diagnostics.structureAt, null);
    assert.deepEqual(snapshot.records, []);
  }
});

test('structural diagnostic write failure preserves previous durable structure and original records, then retries', async () => {
  const f = fixture();
  const epoch = await enabled(f);
  await f.store.capture(batch(epoch));
  const first = { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] };
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: first });
  const before = structuredClone(f.saved());
  const second = { ...first, validTurnCount: 1 };
  f.fail(true);
  await assert.rejects(f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: second }), { code: 'STORAGE_FULL' });
  assert.deepEqual(f.saved(), before);
  const failed = await f.store.snapshot();
  assert.equal(failed.diagnostics.lastError.code, 'STORAGE_FULL');
  assert.deepEqual(failed.diagnostics.structure, first);
  assert.deepEqual(failed.records, before[STORAGE_KEY].records);
  f.fail(false);
  await f.store.diagnose({ code: 'ADAPTER_MISMATCH', scanned: 1, structure: second });
  assert.deepEqual(f.saved()[STORAGE_KEY].diagnostics.structure, second);
  assert.deepEqual((await f.store.snapshot()).records, before[STORAGE_KEY].records);
});
