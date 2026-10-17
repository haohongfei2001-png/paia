import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run} from './cli.mjs';
import {sha256} from './trusted.mjs';

test('delivered draft, schema, report and receipt are byte-identical to a fresh offline build', async t => {
  const parent = await mkdtemp(join(tmpdir(), 'paia-semantic-delivery-test-'));
  t.after(() => rm(parent, {recursive: true}));
  const output = join(parent, 'new-output');
  const report = await run(['draft', '--out=' + output]);
  assert.equal(report.semanticCorrectness, 'NOT_VERIFIED');
  for (const name of ['adjudication.json', 'schema.json', 'report.json', 'receipt.json']) {
    const actual = await readFile(join(output, name));
    const delivered = await readFile(new URL(name, import.meta.url));
    assert.deepEqual(actual, delivered, name + ' must not drift from its actual source modules');
  }
});

test('delivered actual mutation record binds the current guarded source bytes', async () => {
  const report = JSON.parse(await readFile(new URL('mutation-report.json', import.meta.url), 'utf8'));
  assert.equal(report.kind, 'PAIA_SEMANTIC_VALIDATOR_MUTATION_REPORT');
  assert.deepEqual(report.baselineCounts, {tests: 45, pass: 45, fail: 0, cancelled: 0, skipped: 0, todo: 0});
  assert.equal(report.mutations, 13);
  assert.equal(report.killed, 13);
  assert.equal(report.survived, 0);
  assert.equal(report.invalidMutations, 0);
  assert.equal(report.records.length, 13);
  assert.equal(new Set(report.records.map(record => record.marker)).size, 13);
  for (const record of report.records) {
    assert.ok(['trusted.mjs', 'schema.mjs', 'validator.mjs'].includes(record.file));
    assert.equal(record.baselineSourceDigest, sha256(await readFile(new URL(record.file, import.meta.url))));
    assert.notEqual(record.baselineSourceDigest, record.mutatedSourceDigest);
    assert.equal(record.outcome, 'KILLED');
    assert.deepEqual(record.testCounts, {tests: 1, pass: 0, fail: 1, cancelled: 0, skipped: 0, todo: 0});
  }
  assert.equal(report.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(report.independentHumanReview, 'NOT_RUN');
  assert.equal(report.authorAcceptance, 'NOT_RUN');
  assert.equal(report.modelQualityQualification, 'NOT_RUN');
});
