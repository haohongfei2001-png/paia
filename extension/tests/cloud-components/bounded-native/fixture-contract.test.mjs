// Static checks only. The browser-native fixture is read as text, never imported.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {sha256} from './artifacts.mjs';
import {FIXTURE_SHA256, TEST_IDS} from './policy.mjs';

const fixture = await readFile(new URL('./recovery-saved-fixture.mjs', import.meta.url), 'utf8');
const provenance = JSON.parse(await readFile(new URL('./fixture-provenance.json', import.meta.url), 'utf8'));

test('exact four original case bodies retain hashes and fixed order', () => {
  const cases = [...fixture.matchAll(/  if\(testId==='([^']+)'\)await run\(testId,'([^']+)',async\(\)=>\{\n([\s\S]*?)\n  \}\);/g)];
  assert.deepEqual(cases.map(match => match[1]), TEST_IDS);
  assert.deepEqual(cases.map(match => ({id: match[1], name: match[2], sha256: sha256(match[3])})), provenance.caseBodies);
  assert.equal(sha256(fixture), FIXTURE_SHA256);
  assert.match(fixture, /testId!==fixedIds\[cases.length\]/);
  assert.match(fixture, /if\(entered\|\|failed\|\|/);
});
test('fixture still uses original native owners and explicit near-limit control, not fake IndexedDB', () => {
  assert.doesNotMatch(fixture, /fake-indexeddb|FakeChatGPT|new IDBFactory/);
  assert.match(fixture, /globalThis.indexedDB instanceof IDBFactory/);
  assert.match(fixture, /IDBTransaction.prototype.abort.call\(tx.tx\)/);
  assert.match(fixture, /chargeOriginalRecoveryWork\(repository,ticket,0,4095\)/);
  assert.match(fixture, /exact\(error.code,'BNS_SAVED_WORK_CHANGED'/);
  assert.match(fixture, /new StagedSyncRestore/);
  assert.match(fixture, /new LocalSyncRecoverySession/);
  const imports = [...fixture.matchAll(/^import .* from '([^']+)';$/gm)];
  assert.equal(imports.length, 10);
  assert.ok(imports.every(match => match[1].startsWith('../../../core/')));
});
test('extracted wrapper preserves body failure across cleanup errors without executing a component body', async () => {
  // Execute only the actual sequencing/cleanup wrapper. All case callbacks are
  // captured but NEVER invoked. Fake preflight values carry no native evidence.
  const wrapper = fixture.slice(fixture.indexOf('export async function runRecoverySavedCase')).replace('export ', '');
  for (const bodyFails of [true, false]) {
    const closed = [], devices = [], cases = [];
    function IDBFactory() {}
    IDBFactory.prototype.open = function () {};
    const scope = {
      fixedIds: TEST_IDS, entered: false, failed: false, devices, cases, IDBFactory, ok() {},
      async run(id, name, callback) {
        assert.equal(typeof callback, 'function');
        for (let index = 0; index < 3; index++) devices.push({name: 'SYNTHETIC_' + index, s: {repository: {async close() { closed.push(index); if (index < 2) throw Error('SYNTHETIC_CLEANUP_' + index); }}}});
        cases.push({id, name, result: bodyFails ? 'FAIL' : 'PASS', assertions: 1, details: 'SYNTHETIC_CALLBACK_NOT_RUN'});
        if (bodyFails) throw Error('SYNTHETIC_ORIGINAL_BODY_FAILURE');
      },
    };
    runInNewContext(wrapper, scope);
    const result = await scope.runRecoverySavedCase(TEST_IDS[0]);
    assert.equal(result.result, 'FAIL');
    assert.equal(result.details, 'SYNTHETIC_CALLBACK_NOT_RUN');
    assert.equal(result.error?.message, bodyFails ? 'SYNTHETIC_ORIGINAL_BODY_FAILURE' : undefined);
    assert.deepEqual(Array.from(result.cleanupErrors, error => error.message), ['SYNTHETIC_CLEANUP_0', 'SYNTHETIC_CLEANUP_1']);
    assert.deepEqual(closed, [0, 1, 2]);
    await assert.rejects(scope.runRecoverySavedCase(TEST_IDS[1]), /FIXED_CASE_ORDER_REQUIRED/);
  }
});
