// Real source mutation, offline and confined to disposable temporary copies.
// A killed mutant must let its specifically invalid input through, making the
// same baseline rejection test fail with "Missing expected rejection".
// Syntax, import, fixture, timeout and unrelated failures never count as kills.
import assert from 'node:assert/strict';
import {readFile, readdir, mkdir, writeFile, rm, mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const testFile = join(directory, 'validator.test.mjs');
const bytesDigest = value => createHash('sha256').update(value).digest('hex');
const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mutations = [
  ['STRICT_JSON', 'trusted.mjs', 'mutation guard: strict JSON duplicate keys'],
  ['NUMBER_FORMAT', 'trusted.mjs', 'mutation guard: numeric lexemes cannot lose precision before integer and digest checks'],
  ['SCHEMA_CONST', 'schema.mjs', 'mutation guard: AI authorship cannot become human authorship'],
  ['CLOSED_SCHEMA', 'schema.mjs', 'mutation guard: closed schema rejects nested model ratings'],
  ['COVERAGE', 'validator.mjs', 'mutation guard: exact coverage cannot hide missing review or source counts'],
  ['ENTRY_COVERAGE', 'validator.mjs', 'mutation guard: an omitted Entry is not a smaller successful denominator'],
  ['REF_REVISION', 'validator.mjs', 'mutation guard: ref revision'],
  ['REF_BODY_DIGEST', 'validator.mjs', 'mutation guard: ref body digest'],
  ['REF_GRAPHEME', 'validator.mjs', 'mutation guard: ref grapheme'],
  ['REF_LITERAL', 'validator.mjs', 'mutation guard: ref literal'],
  ['REF_SPAN_DIGEST', 'validator.mjs', 'mutation guard: ref span digest'],
  ['RULE_STATUS', 'validator.mjs', 'mutation guard: unresolved rules cannot be silently changed to completed draft decisions'],
  ['DOCUMENT_DIGEST', 'validator.mjs', 'mutation guard: document digest'],
];

function runTest(moduleDirectory = null, name = null) {
  const args = ['--test', '--test-reporter=tap'];
  if (name) args.push('--test-name-pattern=^' + escapePattern(name) + '$');
  args.push(testFile);
  const env = {...process.env};
  delete env.PAIA_SEMANTIC_TEST_MODULE_DIR;
  if (moduleDirectory) env.PAIA_SEMANTIC_TEST_MODULE_DIR = moduleDirectory;
  const result = spawnSync(process.execPath, args, {
    cwd: directory, env, encoding: 'utf8', timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, 'test process must execute without an operating-system error');
  assert.equal(result.signal, null, 'test process must finish before timeout');
  return result;
}

function alteredSource(source, marker) {
  const lines = source.split('\n');
  const matches = lines.map((line, index) => line.endsWith('// MUTATION:' + marker) ? index : -1).filter(index => index >= 0);
  assert.equal(matches.length, 1, 'exactly one actual guard marker: ' + marker);
  const index = matches[0];
  const original = lines[index];
  if (marker === 'STRICT_JSON') {
    assert.match(original, /return parseStrict\(bytes\)/);
    lines[index] = "    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); // controlled mutation: duplicate key guard removed";
  } else {
    assert.ok(/requireThat\(|same\(|sameIds\(/.test(original), 'mutated line must contain an executable guard');
    lines[index] = '  // controlled mutation: original guard removed (' + marker + ')';
  }
  return lines.join('\n');
}

function testCounts(output) {
  const counts = {};
  for (const label of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const found = output.match(new RegExp('^# ' + label + ' ([0-9]+)\\r?$', 'm'));
    assert.ok(found, 'actual Node test summary must contain ' + label);
    counts[label] = Number(found[1]);
  }
  return counts;
}

async function main() {
  assert.equal(process.argv.length, 2, 'mutation runner accepts no options and writes no durable result');
  const names = (await readdir(directory)).filter(name => name.endsWith('.mjs')).sort();
  const sources = new Map(await Promise.all(names.map(async name => [name, await readFile(join(directory, name), 'utf8')])));
  const before = Object.fromEntries([...sources].map(([name, content]) => [name, bytesDigest(content)]));
  const baseline = runTest();
  assert.equal(baseline.status, 0, 'unmodified complete baseline must pass before any mutation:\n' + baseline.stdout + baseline.stderr);
  const baselineCounts = testCounts(baseline.stdout);
  const registeredTests = (sources.get('validator.test.mjs').match(/^test\(/gm) || []).length;
  assert.deepEqual(baselineCounts, {tests: registeredTests, pass: registeredTests, fail: 0, cancelled: 0, skipped: 0, todo: 0});
  const sandbox = await mkdtemp(join(tmpdir(), 'paia-semantic-mutation-owned-'));
  const records = [];
  try {
    for (const [marker, file, testName] of mutations) {
      const target = join(sandbox, marker.toLowerCase());
      // The disposable copy rewrites only its fixed module root and the reused
      // parser import path. The real corpus, existing tools and shared worktree
      // remain read-only throughout mutation execution.
      await mkdir(target, {mode: 0o700});
      for (const [name, content] of sources) {
        let text = name === file ? alteredSource(content, marker) : content;
        if (name === 'trusted.mjs') {
          const parserUrl = new URL('../ai-qwen-offline/artifacts.mjs', import.meta.url).href;
          const extensionRoot = new URL('../../../', import.meta.url).href;
          text = text.replace("from '../ai-qwen-offline/artifacts.mjs'", "from '" + parserUrl + "'");
          text = text.replace("new URL('../../../', import.meta.url)", "new URL('" + extensionRoot + "')");
        }
        await writeFile(join(target, name), text, {flag: 'wx', mode: 0o600});
      }
      const actual = await readFile(join(target, file), 'utf8');
      const result = runTest(target, testName);
      const output = result.stdout + result.stderr;
      assert.equal(result.status, 1, marker + ' must be killed by the existing rejection test:\n' + output);
      assert.ok(output.includes(testName), marker + ' must execute its named test');
      assert.match(output, /Missing expected rejection/, marker + ' kill must be invalid input accepted, not an import or syntax error');
      assert.doesNotMatch(output, /SyntaxError|ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION|TRUSTED_SOURCE_UNAVAILABLE|TRUSTED_SOURCE_DIGEST/);
      const counts = testCounts(result.stdout);
      assert.deepEqual(counts, {tests: 1, pass: 0, fail: 1, cancelled: 0, skipped: 0, todo: 0}, marker + ' must fail exactly its one executed rejection test');
      records.push({
        marker, file, testName, outcome: 'KILLED',
        baselineSourceDigest: before[file], mutatedSourceDigest: bytesDigest(actual),
        testCounts: counts,
        evidence: 'Same rejection assertion fails: Missing expected rejection',
      });
    }
  } finally {
    await rm(sandbox, {recursive: true});
  }
  const after = Object.fromEntries(await Promise.all(names.map(async name => [name, bytesDigest(await readFile(join(directory, name)))])));
  assert.deepEqual(after, before, 'mutation runner never edits original experiment or frozen files');
  const report = {
    version: 1, kind: 'PAIA_SEMANTIC_VALIDATOR_MUTATION_REPORT',
    baseline: 'PASS', baselineCounts, mutations: records.length,
    killed: records.filter(record => record.outcome === 'KILLED').length,
    survived: 0, invalidMutations: 0, records,
    validationScope: 'DETERMINISTIC_VALIDATOR_CHECK_SENSITIVITY_ONLY',
    semanticCorrectness: 'NOT_VERIFIED',
    independentHumanReview: 'NOT_RUN', authorAcceptance: 'NOT_RUN', modelQualityQualification: 'NOT_RUN',
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write((error.stack || String(error)) + '\n');
  process.exitCode = 1;
});
