// All values are invented test data; this suite never opens a page or reads a profile.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUMMARY_FIELDS, ROW_FIELDS, MAX_ROWS, MAX_COUNT,
  emptyStructure, emptyRow, sanitizeStructure, sanitizeDiagnostics
} from '../core/diagnostics.js';
import { ADAPTER_VERSION } from '../core/constants.js';

const privateSentinel = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL';
function structure() {
  return {
    ...emptyStructure(), mainPresent: true, mainVisible: true,
    userRoleCount: 1, visibleUserRoleCount: 1,
    rows: [{ ...emptyRow(), turnFound: true, textMatches: 2 }]
  };
}
function unrelatedFields() {
  return {
    originalText: privateSentinel, url: privateSentinel, chatTitle: privateSentinel,
    messageId: privateSentinel, contentHash: privateSentinel,
    error: { message: privateSentinel }, nested: { originalText: privateSentinel }
  };
}

test('shared diagnostic schema projects only fixed fields and never retains extra strings or nested payloads', () => {
  const input = { ...structure(), ...unrelatedFields() };
  input.rows[0] = { ...input.rows[0], ...unrelatedFields() };
  const result = sanitizeStructure(input);
  assert.deepEqual(result, structure());
  assert.deepEqual(Object.keys(result).sort(), ['schemaVersion', ...Object.keys(SUMMARY_FIELDS), 'rows', 'rowsTruncated'].sort());
  assert.deepEqual(Object.keys(result.rows[0]).sort(), Object.keys(ROW_FIELDS).sort());
  assert.equal(JSON.stringify(result).includes(privateSentinel), false);
  assert.notEqual(result.rows, input.rows);
  assert.notEqual(result.rows[0], input.rows[0]);
});

test('all summary and candidate fields require exact primitive types and nonnegative safe integer counts', async t => {
  for (const [scope, fields] of [['summary', SUMMARY_FIELDS], ['row', ROW_FIELDS]]) {
    await t.test(scope, () => {
      for (const [key, type] of Object.entries(fields)) {
        const badValues = type === 'boolean'
          ? [0, 1, 'true', null, undefined, {}, []]
          : [-1, 0.5, '1', NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, true, null, undefined, {}, []];
        for (const bad of badValues) {
          const input = structure();
          (scope === 'summary' ? input : input.rows[0])[key] = bad;
          assert.equal(sanitizeStructure(input), null, `${scope}.${key} rejects ${typeof bad}`);
        }
        const input = structure();
        delete (scope === 'summary' ? input : input.rows[0])[key];
        assert.equal(sanitizeStructure(input), null, `${scope}.${key} is required`);
      }
    });
  }
});

test('counts have a one million ceiling and candidate diagnostics are bounded to twenty rows', () => {
  const input = structure();
  for (const [key, type] of Object.entries(SUMMARY_FIELDS)) if (type === 'number') input[key] = Number.MAX_SAFE_INTEGER;
  const row = emptyRow();
  for (const [key, type] of Object.entries(ROW_FIELDS)) if (type === 'number') row[key] = MAX_COUNT + 1;
  input.rows = Array.from({ length: MAX_ROWS + 5 }, () => ({ ...row }));
  const result = sanitizeStructure(input);
  assert.equal(MAX_COUNT, 1000000);
  assert.equal(MAX_ROWS, 20);
  for (const [key, type] of Object.entries(SUMMARY_FIELDS)) if (type === 'number') assert.equal(result[key], MAX_COUNT);
  for (const [key, type] of Object.entries(ROW_FIELDS)) if (type === 'number') assert.equal(result.rows[0][key], MAX_COUNT);
  assert.equal(result.rows.length, 20);
  assert.equal(result.rowsTruncated, true);
  assert.equal(sanitizeStructure({ ...structure(), rowsTruncated: true }).rowsTruncated, true);
  assert.equal(sanitizeStructure(structure()).rowsTruncated, false);
});

test('malformed structures, schema versions and row wrappers fail closed', () => {
  for (const input of [null, undefined, [], {}, 'unsafe',
    { ...structure(), schemaVersion: '1' }, { ...structure(), schemaVersion: 2 },
    { ...structure(), rows: {} }, { ...structure(), rows: [null] },
    { ...structure(), rows: [[]] }, { ...structure(), rowsTruncated: 'false' }
  ]) assert.equal(sanitizeStructure(input), null);
});

test('diagnostic snapshots normalize times and project old or malicious persisted values', () => {
  const input = {
    ...unrelatedFields(), status: privateSentinel, adapterVersion: privateSentinel,
    scanned: '2', added: Infinity, lastScanAt: privateSentinel,
    lastSuccessAt: '2026-01-01T08:00:00+08:00',
    lastError: { code: 'ADAPTER_MISMATCH', at: privateSentinel, ...unrelatedFields() },
    structure: { ...structure(), ...unrelatedFields() }, structureAt: '2026-01-01T00:00:00Z'
  };
  const result = sanitizeDiagnostics(input);
  assert.deepEqual(Object.keys(result).sort(), ['status', 'adapterVersion', 'lastScanAt', 'lastSuccessAt', 'lastError', 'scanned', 'added', 'structure', 'structureAt'].sort());
  assert.equal(result.status, 'CAPTURE_FAILED');
  assert.equal(result.adapterVersion, ADAPTER_VERSION);
  assert.equal(result.scanned, 0);
  assert.equal(result.added, 0);
  assert.equal(result.lastScanAt, null);
  assert.equal(result.lastSuccessAt, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(result.lastError, { code: 'ADAPTER_MISMATCH', at: null });
  assert.deepEqual(result.structure, structure());
  assert.equal(result.structureAt, '2026-01-01T00:00:00.000Z');
  assert.equal(JSON.stringify(result).includes(privateSentinel), false);
  const old = sanitizeDiagnostics({ status: 'PAUSED', adapterVersion: '0.1.0', lastError: { code: privateSentinel } });
  assert.equal(old.structure, null);
  assert.equal(old.structureAt, null);
  assert.equal(old.lastError, null);
  assert.equal(sanitizeDiagnostics({ structure: { ...structure(), userRoleCount: '2' }, structureAt: input.structureAt }).structureAt, null);
  assert.equal(sanitizeDiagnostics({ scanned: MAX_COUNT + 1, added: Number.MAX_SAFE_INTEGER }).scanned, MAX_COUNT);
});
