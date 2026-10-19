import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceRecoveryFixture,usageRows} from './maintenance-recovery-fixture.mjs';
import {ArchiveRepository} from '../../../extension/core/idb-repository.js';
import {IDBFactory} from '../../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';

async function cloneRepository(repository) {
 const snapshot = await repository.transaction(false, async tx => {
  const rows = {};
  for (const name of repository.stores) rows[name] = await tx.all(name);
  return rows;
 });
 const replacement = new ArchiveRepository(repository.local, {
  indexedDB: new IDBFactory(), name: 'independent-other-repository',
  ia: repository.ia, smartFilter: repository.smartFilter, thoughtLibrary: repository.thoughtLibrary
 });
 await replacement.open();
 await replacement.transaction(true, async tx => {
  for (const [name, rows] of Object.entries(snapshot)) {
   const store = tx.tx.objectStore(name);
   store.clear();
   for (const row of rows) store.put(structuredClone(row));
  }
 });
 return replacement;
}

for (const swap of ['repository', 'database']) for (const phase of ['query', 'cancel', 'reconcile']) test(`independent: captured Maintenance handle rejects a byte-identical different ${swap} before ${phase}`, async t => {
 const f = await maintenanceRecoveryFixture(t, {loss: phase === 'cancel' ? 'reservation' : 'provider'});
 const captured = phase === 'query' ? {handle: await f.foundation.maintenanceRecovery(f.configuration.origin)} : await f.capture();
 const original = f.s.repository, originalDb = original.db;
 const replacement = await cloneRepository(original);
 const before = await usageRows(f.s, f.original.jobId);
 const callCount = f.calls.length;
 if (swap === 'repository') f.s.repository = replacement;
 else original.db = replacement.db;
 let accepted = false;
 try {
  if (phase === 'query') {
   const proofs = await f.configuration.readProofs(captured.handle.requests[0]);
   await f.foundation.queryMaintenanceRecovery(captured.handle, 0, proofs, f.status, () => true);
  } else if (phase === 'cancel') {
   const proofs = await f.configuration.readProofs(captured.handle.requests[0]);
   await f.foundation.cancelMaintenanceRecovery(captured.handle, 0, proofs, captured.observations[0], f.status, f.reservations, () => true);
  } else {
   await captured.commit();
  }
  accepted = true;
 } catch (error) {
  console.log('correctly rejected', phase, error.code);
 }
 const after = await usageRows(f.s, f.original.jobId);
 console.log(JSON.stringify({swap, phase, accepted, additionalCalls: f.calls.length - callCount, changedReplacementRows: JSON.stringify(before) !== JSON.stringify(after), distinctRepository: original !== replacement, distinctDatabase: originalDb !== replacement.db}));
 f.s.repository = original;
 original.db = originalDb;
 assert.equal(accepted, false, `Original private handle must not survive repository substitution before ${phase}`);
 assert.equal(f.calls.length, callCount);
 assert.deepEqual(after, before);
});

for (const field of ['factory', 'name']) for (const phase of ['query', 'cancel', 'reconcile']) test(`captured Maintenance handle rejects changed original repository ${field} before ${phase}`, async t => {
 const f = await maintenanceRecoveryFixture(t, {loss: phase === 'cancel' ? 'reservation' : 'provider'});
 const captured = phase === 'query' ? {handle: await f.foundation.maintenanceRecovery(f.configuration.origin)} : await f.capture();
 const repository = f.s.repository, original = repository[field], before = await usageRows(f.s, f.original.jobId), calls = f.calls.length;
 repository[field] = field === 'factory' ? new IDBFactory() : 'SYNTHETIC-replacement-name';
 try {
  if (phase === 'reconcile') await assert.rejects(captured.commit(), {code: 'RESULT_CONFLICT'});
  else {
   const proofs = await f.configuration.readProofs(captured.handle.requests[0]);
   if (phase === 'query') await assert.rejects(f.foundation.queryMaintenanceRecovery(captured.handle, 0, proofs, f.status, () => true), {code: 'RESULT_CONFLICT'});
   else await assert.rejects(f.foundation.cancelMaintenanceRecovery(captured.handle, 0, proofs, captured.observations[0], f.status, f.reservations, () => true), {code: 'RESULT_CONFLICT'});
  }
 } finally {repository[field] = original;}
 assert.equal(f.calls.length, calls);
 assert.deepEqual(await usageRows(f.s, f.original.jobId), before);
 // Refusal does not consume the original capability or require a new job.
 const current = phase === 'query' ? await f.capture() : captured;
 assert.equal((await current.commit()).state, phase === 'cancel' ? 'CANCELLED_BEFORE_DISPATCH' : 'EXPIRED_UNCOMMITTED');
});

for (const field of ['db', 'factory', 'name']) test(`final original repository ${field} switch rolls back every recovery write`, async t => {
 const f = await maintenanceRecoveryFixture(t), captured = await f.capture(), repository = f.s.repository, original = repository[field], replacement = await cloneRepository(repository);
 const before = await usageRows(f.s, f.original.jobId), calls = f.calls.length, write = f.s.foundationWrite.bind(f.s);let injected = false;
 f.s.foundationWrite = fn => write(async tx => {
  const put = tx.put.bind(tx);
  tx.put = async (table, row) => {await put(table, row);if (!injected && table === 'organizerUsage') {injected = true;repository[field] = replacement[field];}};
  return fn(tx);
 });
 try {await assert.rejects(captured.commit(), {code: 'RESULT_CONFLICT'});}
 finally {repository[field] = original;f.s.foundationWrite = write;}
 assert.equal(injected, true);assert.equal(f.calls.length, calls);
 assert.deepEqual(await usageRows(f.s, f.original.jobId), before);
 assert.equal((await captured.commit()).state, 'EXPIRED_UNCOMMITTED');
});
