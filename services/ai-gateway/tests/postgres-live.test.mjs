import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { PostgresLedgerStorage, LEDGER_KEY, recoveryCapacityBytes } from '../postgres-ledger.mjs';
import { ledger, request, evidence, NOW } from './postgres-fixtures.mjs';

import { disposablePostgresConfig } from './postgres-test-config.mjs';

// Repeat the guard even when this file is invoked without its runner. Pass an
// explicit configuration object to pg, never the raw URI it can reinterpret.
const connection = disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,
  process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const suffix = `${process.pid}_${Date.now()}`;
const runtimeRole = `paia_ledger_test_runtime_${suffix}`;
const deniedRole = `paia_ledger_test_denied_${suffix}`;
const admin = new Pool({ ...connection, max: 2 });
const pools = [];
let createdSchema = false, createdRuntime = false, createdDenied = false;
const query = (sql, args) => admin.query(sql, args);
const makePool = (role = runtimeRole) => {
  const pool = new Pool({ ...connection, max: 2,
    onConnect: async client => { await client.query(`SET ROLE ${role}`); } });
  pool.on('error', () => {}); pools.push(pool); return pool;
};
const store = pool => new PostgresLedgerStorage({ pool });
const read = async () => (await query('SELECT snapshot FROM paia_ai_private.budget_snapshot WHERE ledger_key=$1', [LEDGER_KEY])).rows[0].snapshot;
const signal = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

before(async () => {
  // The URL guard is repeated against the actual connected database. Never
  // drop a pre-existing schema, role or snapshot to make the test pass.
  const identity = (await query('SELECT current_database() AS name, current_user AS owner')).rows[0];
  assert.match(identity.name, /^paia_ledger_test_[a-z0-9_]+$/);
  assert.equal(identity.name, connection.database);
  assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount, 0,
    'pre-existing private schema: use a NEW disposable database');
  await query(await readFile(new URL('../schema/001-budget-ledger.sql', import.meta.url), 'utf8'));
  createdSchema = true;
  await query(`CREATE ROLE ${runtimeRole} NOLOGIN NOSUPERUSER NOBYPASSRLS`); createdRuntime = true;
  await query(`CREATE ROLE ${deniedRole} NOLOGIN NOSUPERUSER NOBYPASSRLS`); createdDenied = true;
  // This setup is only for the ephemeral test DB. Production role approval and
  // credentials are external setup; the shipping migration grants nothing.
  await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${runtimeRole}`);
  await query(`GRANT SELECT ON paia_ai_private.budget_snapshot TO ${runtimeRole}`);
  await query(`GRANT UPDATE(snapshot, updated_at) ON paia_ai_private.budget_snapshot TO ${runtimeRole}`);
  await query(`CREATE POLICY test_runtime_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${runtimeRole} USING (ledger_key = 'aiu:budget-reservations:v1')`);
  await query(`CREATE POLICY test_runtime_write ON paia_ai_private.budget_snapshot FOR UPDATE TO ${runtimeRole} USING (ledger_key = 'aiu:budget-reservations:v1') WITH CHECK (ledger_key = 'aiu:budget-reservations:v1')`);
});
beforeEach(async () => { await query('UPDATE paia_ai_private.budget_snapshot SET schema_version=1, snapshot=NULL WHERE ledger_key=$1', [LEDGER_KEY]); });
after(async () => {
  await Promise.all(pools.map(pool => pool.end()));
  try {
    if (createdSchema) await query('DROP SCHEMA paia_ai_private CASCADE');
    if (createdRuntime) await query(`DROP ROLE ${runtimeRole}`);
    if (createdDenied) await query(`DROP ROLE ${deniedRole}`);
  } finally { await admin.end(); }
});

test('real independent PostgreSQL connections serialize the single global row', async () => {
  const firstPool = makePool(), secondPool = makePool();
  const a = await firstPool.connect(), b = await secondPool.connect();
  try { assert.notEqual((await a.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,
    (await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid); } finally { a.release(); b.release(); }
  const acquired = signal(), release = signal(); let secondEntered = false;
  const first = store(firstPool).transact(async t => { acquired.resolve(); await release.promise;
    await t.put(LEDGER_KEY, { version: 1, lastNow: 11, rows: [] }); });
  await acquired.promise;
  const second = store(secondPool).transact(async t => { secondEntered = true;
    assert.equal((await t.get(LEDGER_KEY)).lastNow, 11); });
  try {
    // Establish blocking in PostgreSQL itself, not only an arbitrary JS sleep.
    let blocked = false;
    for (let index = 0; index < 100; index++) {
      const rows = (await query("SELECT wait_event_type FROM pg_stat_activity WHERE datname=current_database() AND query LIKE '%budget_snapshot%FOR UPDATE%' AND pid <> pg_backend_pid() AND wait_event_type='Lock' ")).rows;
      if (rows.length) { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(blocked, true, 'second physical connection must wait for the row lock');
    assert.equal(secondEntered, false);
  } finally { release.resolve(); await Promise.all([first, second]); }
  assert.equal(secondEntered, true);
});

test('real multi-pool global reservations admit only two 7000-micro holds under 15000', async () => {
  const stores = [store(makePool()), store(makePool()), store(makePool())];
  await Promise.all(stores.map(storage => storage.checkReady()));
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, index) =>
    ledger(stores[index % stores.length]).reserve(request(`race-${index}`, { principalId: `principal-${index}` }))));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 2);
  for (const result of results.filter(result => result.status === 'rejected')) assert.match(result.reason.message, /BUDGET_OR_QUOTA/);
  const snapshot = await read(); assert.equal(snapshot.rows.length, 2);
  assert.equal(snapshot.rows.reduce((sum, row) => sum + row.reservationMicros, 0), 14000);
  assert.ok(results.filter(result => result.status === 'fulfilled').every(result =>
    result.value.dispatchAllowed === false && result.value.financialAuthority === false));
});

test('real concurrent duplicate/rebound identity and new pool restart preserve dispatched/unknown holds', async () => {
  const a = store(makePool()), b = store(makePool()), r = request('same', { childCount: 2 });
  const same = await Promise.all([ledger(a).reserve(r), ledger(b).reserve(r)]);
  assert.deepEqual(same[0], same[1]); assert.equal((await read()).rows.length, 1);
  await assert.rejects(ledger(b).reserve({ ...r, principalId: 'rebound' }), /OPERATION_REBOUND/);
  await ledger(a).record(r, 'DISPATCHED');
  const restarted = store(makePool()); assert.equal((await ledger(restarted).reserve(r)).state, 'DISPATCHED');
  await ledger(restarted).settle(r, evidence(r, 'UNKNOWN'));
  const later = ledger(store(makePool()), { now: NOW + 31 * 86400000,
    global: { dayLimitMicros: 8000, monthLimitMicros: 8000 } });
  assert.equal((await later.reserve(r)).state, 'OUTCOME_UNKNOWN');
  await assert.rejects(later.reserve(request('replacement')), /BUDGET_OR_QUOTA/);
  await assert.rejects(later.reserve({ ...r, operationId: 'sibling', childIndex: 1 }), /OUTCOME_OR_ATTEMPT_PENDING/);
  assert.equal((await read()).rows[0].reservationMicros, 7000);
});

test('real rollback restores state and clock; settled metadata remains after reconstruction', async () => {
  const storage = store(makePool()); const r = request('known', { scopeFingerprint: 'SYNTHETIC漢字🙂"\\' });
  await ledger(storage).reserve(r); const original = await read();
  await assert.rejects(storage.transact(async t => { const state = await t.get(LEDGER_KEY);
    state.lastNow += 1000; await t.put(LEDGER_KEY, state); throw Error('SYNTHETIC_ABORT'); }), /SYNTHETIC_ABORT/);
  assert.deepEqual(await read(), original);
  await ledger(storage).record(r, 'DISPATCHED'); await ledger(storage).settle(r, evidence(r, 'COMMITTED'));
  assert.equal((await ledger(store(makePool())).reserve(r)).state, 'SETTLED');
  assert.equal((await read()).rows[0].settlement.usdMicros, 2000);
  const snapshot = await read(); assert.equal(snapshot.rows[0].resultCommitted, true);
  const storedBytes = (await query('SELECT octet_length(snapshot::text) AS bytes FROM paia_ai_private.budget_snapshot')).rows[0].bytes;
  assert.equal(recoveryCapacityBytes(snapshot), storedBytes + String(Number.MAX_SAFE_INTEGER).length - String(snapshot.lastNow).length,
    'codec capacity matches real JSONB separator/Unicode/escaping bytes plus clock headroom');
});

test('real RLS and privileges deny clients, reject unsafe runtime, and prohibit row deletion/version changes', async () => {
  const denied = makePool(deniedRole);
  await assert.rejects(denied.query('SELECT * FROM paia_ai_private.budget_snapshot'), error => error.code === '42501');
  // Even accidental SELECT/UPDATE grants do not defeat default-deny RLS.
  await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${deniedRole}`);
  await query(`GRANT SELECT, UPDATE ON paia_ai_private.budget_snapshot TO ${deniedRole}`);
  assert.equal((await denied.query('SELECT * FROM paia_ai_private.budget_snapshot')).rowCount, 0);
  await assert.rejects(store(denied).checkReady(), /POSTGRES_LEDGER_MISSING/);
  await assert.rejects(store(admin).checkReady(), /POSTGRES_UNSAFE_ROLE_OR_SCHEMA/);
  const runtime = makePool();
  await assert.rejects(runtime.query('DELETE FROM paia_ai_private.budget_snapshot'), error => error.code === '42501');
  await assert.rejects(runtime.query('UPDATE paia_ai_private.budget_snapshot SET schema_version=2'), error => error.code === '42501');
  await assert.rejects(runtime.query('TRUNCATE paia_ai_private.budget_snapshot'), error => error.code === '42501');
});

test('real schema guard and bounded JSON constraints stop incompatible or oversized snapshots', async () => {
  const storage = store(makePool()); await storage.checkReady();
  await query('UPDATE paia_ai_private.budget_snapshot SET schema_version=2');
  let entered = false; await assert.rejects(storage.transact(() => { entered = true; }), /POSTGRES_SCHEMA_VERSION/);
  assert.equal(entered, false);
  await assert.rejects(query('UPDATE paia_ai_private.budget_snapshot SET snapshot=$1::jsonb', [JSON.stringify({ version: 1, rows: Array(10001).fill({}) })]), error => error.code === '23514');
  await assert.rejects(query('UPDATE paia_ai_private.budget_snapshot SET snapshot=$1::jsonb', ['{}']), error => error.code === '23514');
});
