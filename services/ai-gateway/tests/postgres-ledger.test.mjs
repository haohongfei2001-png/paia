import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { Pool, Client } from 'pg';
import { PostgresLedgerStorage, LEDGER_KEY, encodeSnapshot, recoveryCapacityBytes, MAX_SNAPSHOT_BYTES } from '../postgres-ledger.mjs';
import { ledger, request, evidence, NOW } from './postgres-fixtures.mjs';

// Protocol/failure-injection tests ONLY. These mocks are NOT evidence for SQL,
// multi-connection locking, RLS or financial concurrency. Run test:postgres too.
function protocol({ failAt, commitApplied = false, rolePatch = {}, schemaVersion = 1, missing = false } = {}) {
  let saved = null, pending = null;
  const calls = [], released = [], client = new EventEmitter();
  client.query = async (sql, args) => {
    calls.push({ sql, args });
    if (failAt?.(sql)) {
      if (sql === 'COMMIT' && commitApplied) saved = structuredClone(pending);
      throw new Error('synthetic database failure, never expose its message');
    }
    if (sql.startsWith('BEGIN')) pending = structuredClone(saved);
    if (sql.includes('SELECT c.relrowsecurity')) return { rows: [{ relrowsecurity: true,
      relforcerowsecurity: true, rolsuper: false, rolbypassrls: false, is_owner: false, ...rolePatch }] };
    if (sql.includes('FOR UPDATE')) return { rows: missing ? [] : [{ schema_version: schemaVersion, snapshot: pending }] };
    if (sql.startsWith('UPDATE')) { pending = JSON.parse(args[0]); return { rowCount: 1 }; }
    if (sql === 'COMMIT') saved = structuredClone(pending);
    return { rows: [] };
  };
  client.release = destroy => released.push(destroy);
  const pool = new Pool();
  pool.connect = async () => client;
  pool.query = () => { throw Error('pool.query must never be used'); };
  const storage = new PostgresLedgerStorage({ pool });
  return { storage, pool, calls, released, saved: () => saved, corrupt: value => { saved = value; } };
}

test('constructor requires a pg Pool and finite bounded timeout configuration', () => {
  for (const pool of [null, {}, { connect() {}, query() {} }]) assert.throws(() => new PostgresLedgerStorage({ pool }), /POSTGRES_POOL_REQUIRED/);
  const pool = new Pool();
  for (const value of [0, -1, NaN, Infinity, 30001]) assert.throws(() => new PostgresLedgerStorage({ pool, lockTimeoutMs: value }), /POSTGRES_CONFIG_INVALID/);
});

test('same checked-out client does BEGIN, lock, update, COMMIT, release once', async () => {
  const f = protocol(); const result = await ledger(f.storage).reserve(request('one'));
  assert.equal(result.dispatchAllowed, false); assert.equal(result.financialAuthority, false);
  assert.equal(f.saved().rows.length, 1);
  assert.ok(f.calls[0].sql.startsWith('BEGIN ISOLATION LEVEL READ COMMITTED'));
  assert.match(f.calls[1].sql, /synchronous_commit/);
  assert.equal(f.calls.find(call => call.sql.includes('FOR UPDATE')).args[0], LEDGER_KEY);
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.deepEqual(f.released, [false]);
  assert.equal(Object.hasOwn(f.saved().rows[0].pricing, 'fx'), false);
});

test('callback failures roll back all writes and clock watermark without replay', async () => {
  const f = protocol(); let entered = 0;
  await assert.rejects(f.storage.transact(async t => { entered++;
    await t.put(LEDGER_KEY, { version: 1, lastNow: NOW, rows: [] }); throw Error('original-owner-denial');
  }), /original-owner-denial/);
  assert.equal(entered, 1); assert.equal(f.saved(), null); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.deepEqual(f.released, [false]);
});

test('write failure rolls back, rollback failure destroys client, no raw database error escapes', async () => {
  for (const rollbackFails of [false, true]) {
    const f = protocol({ failAt: sql => sql.startsWith('UPDATE') || rollbackFails && sql === 'ROLLBACK' });
    await assert.rejects(ledger(f.storage).reserve(request('one')), /^PostgresLedgerError: POSTGRES_TRANSACTION_FAILED$/);
    assert.equal(f.saved(), null); assert.deepEqual(f.released, [rollbackFails]);
  }
});

test('lost COMMIT acknowledgement is unknown even if storage committed; no rollback/replay', async () => {
  for (const commitApplied of [false, true]) {
    const f = protocol({ failAt: sql => sql === 'COMMIT', commitApplied }); let entered = 0;
    await assert.rejects(f.storage.transact(async t => { entered++;
      await t.put(LEDGER_KEY, { version: 1, lastNow: NOW, rows: [] });
    }), /POSTGRES_COMMIT_OUTCOME_UNKNOWN/);
    assert.equal(entered, 1); assert.equal(f.calls.filter(call => call.sql === 'ROLLBACK').length, 0);
    assert.deepEqual(f.released, [true]); assert.equal(f.saved() !== null, commitApplied);
  }
});

test('lost acknowledgement after durable DISPATCHED never authorizes a replacement', async () => {
  let loseCommit = false;
  const f = protocol({ failAt: sql => loseCommit && sql === 'COMMIT', commitApplied: true });
  const r = request('dispatched'); await ledger(f.storage).reserve(r); loseCommit = true;
  await assert.rejects(ledger(f.storage).record(r, 'DISPATCHED'), /POSTGRES_COMMIT_OUTCOME_UNKNOWN/);
  loseCommit = false;
  const reconstructed = ledger(new PostgresLedgerStorage({ pool: f.pool }));
  const observed = await reconstructed.reserve(r);
  assert.equal(observed.state, 'DISPATCHED'); assert.equal(observed.dispatchAllowed, false);
  await assert.rejects(reconstructed.record(r, 'CANCELLED_BEFORE_DISPATCH'), /OUTCOME_OR_ATTEMPT_PENDING/);
  assert.equal(f.saved().rows.length, 1); assert.equal(f.saved().rows[0].reservationMicros, 7000);
});

test('missing ledger, schema mismatch, unprotected table and unsafe role stop before callback', async () => {
  for (const options of [{ missing: true }, { schemaVersion: 2 }, { rolePatch: { relrowsecurity: false } },
    { rolePatch: { relforcerowsecurity: false } }, { rolePatch: { rolsuper: true } },
    { rolePatch: { rolbypassrls: true } }, { rolePatch: { is_owner: true } }]) {
    const f = protocol(options); let entered = false;
    await assert.rejects(f.storage.transact(() => { entered = true; })); assert.equal(entered, false);
    assert.equal(f.calls.some(call => call.sql.startsWith('UPDATE')), false);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});

test('transaction key is fixed and captured transaction cannot write after callback returns', async () => {
  const f = protocol(); let captured;
  await assert.rejects(f.storage.transact(async t => { await t.get('per-principal-partition'); }), /POSTGRES_LEDGER_KEY/);
  await f.storage.transact(async t => { captured = t; assert.equal(await t.get(LEDGER_KEY), undefined);
    await t.put(LEDGER_KEY, { version: 1, lastNow: 0, rows: [] });
    const copy = await t.get(LEDGER_KEY); copy.lastNow = 99; assert.equal((await t.get(LEDGER_KEY)).lastNow, 0);
  });
  await assert.rejects(captured.put(LEDGER_KEY, { version: 1, lastNow: 2, rows: [] }), /POSTGRES_TRANSACTION_CLOSED/);
  assert.equal(f.saved().lastNow, 0);
});

test('original ledger replay, rebound and UNKNOWN state survive adapter reconstruction', async () => {
  const f = protocol(); const r = request('one'); await ledger(f.storage).reserve(r);
  await ledger(new PostgresLedgerStorage({ pool: f.pool })).record(r, 'DISPATCHED');
  await ledger(f.storage).settle(r, evidence(r, 'UNKNOWN'));
  assert.equal((await ledger(f.storage).reserve(r)).state, 'OUTCOME_UNKNOWN');
  assert.equal(f.saved().rows.length, 1);
  await assert.rejects(ledger(f.storage).reserve({ ...r, inputTokens: 2 }), /OPERATION_REBOUND/);
  await assert.rejects(ledger(f.storage, { now: NOW + 31 * 86400000,
    global: { dayLimitMicros: 8000, monthLimitMicros: 8000 } }).reserve(request('new')), /BUDGET_OR_QUOTA/);
  assert.equal(f.saved().rows[0].reservationMicros, 7000);
});

test('strict metadata schema rejects bodies, unsafe values, sparse arrays and extra fields before persistence', async () => {
  const f = protocol(); await ledger(f.storage).reserve(request('one')); const base = f.saved();
  for (const mutate of [s => s.prompt = 'body', s => s.rows[0].response = 'body',
    s => s.rows[0].request.prompt = 'body', s => s.rows[0].pricing.book.credential = 'secret',
    s => s.rows[0].quote.nativeMicros = NaN, s => s.rows[0].reservedAt = -1,
    s => s.rows[0].request.operationId = 'x'.repeat(201), s => s.rows = Array(1),
    s => s.rows[0].quote.toJSON = () => ({}), s => s.rows[0].pricing.book.source = 'x'.repeat(2049),
    s => s.rows[0].request.principalId = 'bad\nlabel', s => s.rows[0].request.principalId = '\ud800']) {
    const corrupted = structuredClone(base); mutate(corrupted);
    assert.throws(() => encodeSnapshot(corrupted), /BUDGET_SNAPSHOT_INVALID/);
  }
  const oversized = structuredClone(base); oversized.rows = Array.from({ length: 10001 }, () => base.rows[0]);
  assert.throws(() => encodeSnapshot(oversized), /BUDGET_SNAPSHOT_INVALID/);
  const byteLimited = structuredClone(base); const largeRow = structuredClone(base.rows[0]);
  largeRow.pricing.book.source = 'x'.repeat(2048);
  byteLimited.rows = Array.from({ length: 10000 }, () => largeRow);
  assert.throws(() => encodeSnapshot(byteLimited), /BUDGET_SNAPSHOT_CAPACITY/);
  f.corrupt({ ...base, rows: [{ ...base.rows[0], prompt: 'body' }] }); let entered = false;
  await assert.rejects(f.storage.transact(() => { entered = true; }), /BUDGET_SNAPSHOT_INVALID/); assert.equal(entered, false);
});

test('initial migration closes PUBLIC and Supabase client grants, forces RLS and never recreates lost data on startup', async () => {
  const sql = await readFile(new URL('../schema/001-budget-ledger.sql', import.meta.url), 'utf8');
  assert.match(sql, /FORCE ROW LEVEL SECURITY/); assert.match(sql, /REVOKE ALL ON SCHEMA paia_ai_private FROM PUBLIC/);
  assert.match(sql, /'anon', 'authenticated', 'service_role'/); assert.doesNotMatch(sql, /CREATE POLICY|CREATE ROLE|GRANT /);
  const f = protocol(); await f.storage.checkReady();
  assert.equal(f.calls.some(call => /INSERT|CREATE TABLE|ALTER TABLE/.test(call.sql)), false);
});

test('snapshot array getters, custom prototypes and serialization hooks cannot persist private bodies', async () => {
  const f = protocol(); await ledger(f.storage).reserve(request('array-safety')); const base = f.saved();
  for (const mode of ['getter', 'prototype', 'proxy']) {
    const state = structuredClone(base); let calls = 0;
    if (mode === 'getter') Object.defineProperty(state.rows, 0, { enumerable: true, configurable: true,
      get() { calls++; return calls === 1 ? base.rows[0] : { prompt: 'SYNTHETIC PRIVATE BODY' }; } });
    if (mode === 'prototype') Object.setPrototypeOf(state.rows, { toJSON() { calls++; return [{ prompt: 'SYNTHETIC PRIVATE BODY' }]; } });
    if (mode === 'proxy') state.rows = new Proxy(state.rows, { get(target, key) {
      if (key === 'toJSON') return () => [{ prompt: 'SYNTHETIC PRIVATE BODY' }]; return Reflect.get(target, key);
    } });
    assert.throws(() => encodeSnapshot(state), /BUDGET_SNAPSHOT_INVALID/);
    assert.equal(calls, 0, 'validation must never invoke array getters/hooks');
  }
  for (const prototype of [Array.prototype, Object.prototype]) {
    const hook = Object.getOwnPropertyDescriptor(prototype, 'toJSON'); let invoked = 0;
    try {
      Object.defineProperty(prototype, 'toJSON', { configurable: true, value() { invoked++; return [{ prompt: 'SYNTHETIC PRIVATE BODY' }]; } });
      const encoded = encodeSnapshot(base); assert.equal(invoked, 0); assert.doesNotMatch(encoded, /SYNTHETIC PRIVATE BODY/);
    } finally { if (hook) Object.defineProperty(prototype, 'toJSON', hook); else delete prototype.toJSON; }
  }
});

test('ignored rejected put poisons prior writes and aborts rather than committing success', async () => {
  const f = protocol(); let ignored;
  await assert.rejects(f.storage.transact(async t => {
    await t.put(LEDGER_KEY, { version: 1, lastNow: 1, rows: [] });
    t.put(LEDGER_KEY, { version: 1, lastNow: 2, rows: [], prompt: 'forbidden' }).catch(error => { ignored = error.code; });
    return 'success';
  }), /BUDGET_SNAPSHOT_INVALID/);
  assert.equal(ignored, 'BUDGET_SNAPSHOT_INVALID'); assert.equal(f.saved(), null);
  assert.equal(f.calls.some(call => call.sql === 'COMMIT'), false); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});

test('ignored invalid get poisons a transaction and cannot be followed by a valid write', async () => {
  const f = protocol();
  await assert.rejects(f.storage.transact(async t => {
    await t.put(LEDGER_KEY, { version: 1, lastNow: 1, rows: [] });
    t.get('wrong-ledger').catch(() => {});
    return 'success';
  }), /POSTGRES_LEDGER_KEY/);
  assert.equal(f.saved(), null); assert.equal(f.calls.some(call => call.sql === 'COMMIT'), false);
});

test('catalog role/RLS guard runs while the fixed relation lock is held', async () => {
  const f = protocol(); await f.storage.checkReady();
  assert.ok(f.calls.findIndex(call => call.sql.includes('SELECT c.relrowsecurity')) >
    f.calls.findIndex(call => call.sql.includes('FOR UPDATE')));
});

test('disposable DB guard rejects remote, URI overrides and ambient connection fallback', async () => {
  const { disposablePostgresConfig } = await import('./postgres-test-config.mjs');
  for (const value of [
    'postgres://postgres@remote.invalid:5432/paia_ledger_test_development',
    'postgres://postgres@127.0.0.1:5432/paia_ledger_test_development?host=remote.invalid',
    'postgres://postgres@127.0.0.1:5432/paia_ledger_test_development?sslrootcert=/private/file',
    'postgres://postgres@127.0.0.1:5432/paia_ledger_test_development#fragment',
    'postgres://postgres@localhost:5432/paia_ledger_test_development',
    'postgres://postgres@127.0.0.1/paia_ledger_test_development',
    'postgres://postgres:private@127.0.0.1:5432/paia_ledger_test_development',
    'postgres://postgres@127.0.0.1:0/paia_ledger_test_development',
  ]) assert.throws(() => disposablePostgresConfig(value, 'yes'), /NOT_RUN/);
  const config = disposablePostgresConfig('postgres://postgres@127.0.0.1:5432/paia_ledger_test_development', 'yes');
  assert.equal(config.host, '127.0.0.1'); assert.equal(config.port, 5432);
  assert.equal(Object.hasOwn(config, 'connectionString'), false);
  const previousHost = process.env.PGHOST, previousPort = process.env.PGPORT;
  try {
    process.env.PGHOST = 'remote.invalid'; process.env.PGPORT = '6543';
    const client = new Client(config); // Inspect pg's actual resolved config; do not connect.
    assert.equal(client.connectionParameters.host, '127.0.0.1');
    assert.equal(client.connectionParameters.port, 5432);
    assert.equal(client.connectionParameters.database, 'paia_ledger_test_development');
    assert.equal(client.connectionParameters.user, 'postgres');
    assert.equal(client.connectionParameters.ssl, false);
    assert.equal(typeof client.connectionParameters.password, 'function');
    assert.equal(client.connectionParameters.password(), '');
  } finally {
    if (previousHost === undefined) delete process.env.PGHOST; else process.env.PGHOST = previousHost;
    if (previousPort === undefined) delete process.env.PGPORT; else process.env.PGPORT = previousPort;
  }
});


test('new reservations reserve lifecycle headroom and canonical recovery consumes it near the byte cap', async () => {
  const seed = protocol(), seedRequest = request('settled-seed');
  await ledger(seed.storage).reserve(seedRequest); await ledger(seed.storage).record(seedRequest, 'DISPATCHED');
  await ledger(seed.storage).settle(seedRequest, evidence(seedRequest, 'FAILED'));
  // Historical rows are fully finalized; unresolved domain receipts now reserve
  // their own bounded future bytes even after financial settlement.
  const seedOwner = ledger(seed.storage);
  seedOwner.verifyResult = (request, evidence) => ({ verifiedResultFacts: true, request, evidence });
  await seedOwner.finalizeResult(seedRequest, { receiptId: 'result-settled-seed', jobId: seedRequest.jobId,
    outcome: 'FAILED', children: [{ operationId: seedRequest.operationId, receiptId: 'receipt-settled-seed' }] });
  const template = seed.saved().rows[0], now = NOW + 31 * 86400000;
  const history = { ...seed.saved(), lastNow: now, rows: Array.from({ length: 4000 }, (_, index) => ({
    ...structuredClone(template), request: request(`history-${index}`),
    settlement: { ...template.settlement, operationId: `history-${index}`, receiptId: `history-receipt-${index}` },
    resultResolution: { receiptId: `history-result-${index}`, jobId: `job-history-${index}`, outcome: 'FAILED',
      children: [{ operationId: `history-${index}`, receiptId: `history-receipt-${index}` }] },
  })) };
  // Same 4,000 historical jobs WITHOUT domain terminal metadata must still
  // reserve one future result receipt per child-zero job and refuse admission.
  const unresolved = structuredClone(history);
  for (const row of unresolved.rows) { delete row.resultResolution; delete row.resultResolvedAt; }
  assert.ok(recoveryCapacityBytes(unresolved) > MAX_SNAPSHOT_BYTES);
  const backlog = protocol(); backlog.corrupt(unresolved);
  await assert.rejects(ledger(backlog.storage, { now }).reserve(request('unresolved-backlog')), /BUDGET_SNAPSHOT_CAPACITY/);
  assert.equal(backlog.saved().rows.length, 4000);
  const active = protocol(), r = request('near-capacity');
  await ledger(active.storage, { now }).reserve(r);
  const candidate = { ...history, rows: [...history.rows, active.saved().rows[0]] };
  let padding = MAX_SNAPSHOT_BYTES - 32 - recoveryCapacityBytes(candidate);
  assert.ok(padding > 0);
  for (const row of history.rows) {
    const add = Math.min(padding, 2048 - row.pricing.book.source.length);
    row.pricing.book.source += 'x'.repeat(add); padding -= add; if (!padding) break;
  }
  assert.equal(padding, 0); assert.equal(recoveryCapacityBytes(candidate), MAX_SNAPSHOT_BYTES - 32);
  const denied = protocol(), tooFull = structuredClone(history);
  tooFull.rows.at(-1).pricing.book.source += 'x'.repeat(64);
  denied.corrupt(tooFull);
  await assert.rejects(ledger(denied.storage, { now }).reserve(r), /BUDGET_SNAPSHOT_CAPACITY/);
  assert.equal(denied.saved().rows.length, 4000);

  const admitted = protocol(); admitted.corrupt(history);
  const owner = ledger(admitted.storage, { now }); await owner.reserve(r);
  assert.equal(recoveryCapacityBytes(admitted.saved()), MAX_SNAPSHOT_BYTES - 32);
  await owner.record(r, 'DISPATCHED');
  const receiptId = '\uffff'.repeat(200);
  await owner.settle(r, { ...evidence(r, 'UNKNOWN'), receiptId });
  assert.equal(admitted.saved().rows.at(-1).state, 'OUTCOME_UNKNOWN');
  await owner.settle(r, { ...evidence(r, 'COMMITTED'), receiptId,
    committedChildren: [{ operationId: r.operationId, receiptId }] });
  const final = admitted.saved(); assert.equal(final.rows.at(-1).state, 'SETTLED');
  assert.equal(final.rows.at(-1).unknownReceipt.receiptId, receiptId);
  assert.equal(final.rows.at(-1).settlement.receiptId, receiptId);
  assert.equal(final.rows.at(-1).resultCommitted, true);
  assert.ok(recoveryCapacityBytes(final) < MAX_SNAPSHOT_BYTES);
  assert.equal(final.rows.length, 4001, 'all previous identities remain intact');
});
