import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import {
  mkdtemp, mkdir, writeFile, readFile, readdir, stat, lstat, symlink, rm,
} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDraft} from './build-draft.mjs';

// These subprocess tests use only the committed synthetic draft and disposable
// directories. No model, network request, private input, or provider is used.
const cliPath = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const moduleDirectory = fileURLToPath(new URL('./', import.meta.url));
const maximumInputBytes = 1024 * 1024;
const canary = 'SYNTHETIC_PRIVATE_BODY_SEED_PATH_CANARY_DO_NOT_ECHO';
const expectedDraftFiles = ['adjudication.json', 'receipt.json', 'report.json', 'schema.json'];
let testRoot;
let validInputPath;
let validBytes;
let validDraft;

before(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'paia-semantic-cli-test-'));
  validDraft = await buildDraft();
  validBytes = Buffer.from(JSON.stringify(validDraft, null, 2) + '\n');
  assert.ok(validBytes.byteLength < maximumInputBytes);
  validInputPath = join(testRoot, 'synthetic-adjudication.json');
  await writeFile(validInputPath, validBytes, {flag: 'wx', mode: 0o600});
});

after(async () => {
  if (testRoot) await rm(testRoot, {recursive: true, force: true});
});

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const freshCase = () => mkdtemp(join(testRoot, 'case-'));
const run = (args, options = {}) => spawnSync(process.execPath, [
  ...(options.preload ? ['--import', options.preload] : []), cliPath, ...args,
], {
  cwd: options.cwd ?? testRoot, encoding: 'utf8', timeout: 15000,
  maxBuffer: 2 * maximumInputBytes,
});

function successful(result) {
  assert.equal(result.error, undefined, 'CLI subprocess must terminate normally');
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.structure, 'VALID');
  assert.equal(report.validationScope, 'STRUCTURE_AND_EVIDENCE_BINDINGS_ONLY');
  assert.equal(report.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(report.authorship, 'AI_AUTHORED_DRAFT');
  assert.equal(report.dataBoundary, 'PUBLIC_SYNTHETIC_NOT_BLIND');
  assert.equal(report.counts.topics, 12);
  assert.equal(report.counts.entries, 36);
  assert.equal(report.counts.humanJudgments, 0);
  assert.equal(report.counts.missingHumanEntryReviews, 36);
  for (const key of ['independentHumanReview', 'authorAcceptance', 'modelQualityQualification', 'modelExecution']) {
    assert.equal(report.statuses[key], 'NOT_RUN');
  }
  assert.equal(report.statuses.populationClaim, 'NO_POPULATION_CLAIM');
  assert.equal(result.stdout.includes(validDraft.adversarialCases[0].outputText), false);
  return report;
}

function rejected(result, expectedCode = null) {
  assert.equal(result.error, undefined, 'Invalid input must fail without a timeout');
  assert.equal(result.signal, null);
  assert.equal(result.status, 1, result.stdout);
  assert.equal(result.stdout, '', 'Failure cannot emit a success report');
  const diagnostic = JSON.parse(result.stderr);
  assert.deepEqual(Object.keys(diagnostic), ['error']);
  assert.match(diagnostic.error, /^[A-Z][A-Z0-9_]*$/);
  if (expectedCode) assert.equal(diagnostic.error, expectedCode);
  assert.equal(result.stderr.includes(canary), false);
  assert.equal(result.stderr.includes(testRoot), false);
  assert.equal(result.stderr.includes(cliPath), false);
  return diagnostic;
}

async function absent(path) {
  await assert.rejects(lstat(path), {code: 'ENOENT'});
}

async function snapshot(directory) {
  const files = (await readdir(directory)).sort();
  return Object.fromEntries(await Promise.all(files.map(async name => [name, await readFile(join(directory, name))])));
}

test('help is available without creating files or executing a draft', async () => {
  const beforeFiles = await readdir(testRoot);
  const result = run(['--help']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /draft --out=/);
  assert.match(result.stdout, /validate --input=/);
  assert.match(result.stdout, /AI_AUTHORED_DRAFT/);
  assert.match(result.stdout, /NOT_RUN/);
  assert.deepEqual(await readdir(testRoot), beforeFiles);
});

test('validate reports bindings only, writes nothing by default, and repeats byte-for-byte', async () => {
  const beforeFiles = await readdir(testRoot);
  const first = run(['validate', '--input=' + validInputPath]);
  const second = run(['validate', '--input=' + validInputPath]);
  successful(first);
  successful(second);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(await readdir(testRoot), beforeFiles);
  assert.deepEqual(await readFile(validInputPath), validBytes);
});

test('draft writes exactly four protected files with independently checkable receipts', async () => {
  const directory = join(await freshCase(), 'draft');
  const report = successful(run(['draft', '--out=' + directory]));
  assert.deepEqual((await readdir(directory)).sort(), expectedDraftFiles);
  assert.deepEqual([...report.outputFiles].sort(), expectedDraftFiles);
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  for (const name of expectedDraftFiles) assert.equal((await stat(join(directory, name))).mode & 0o777, 0o600);
  const receipt = JSON.parse(await readFile(join(directory, 'receipt.json'), 'utf8'));
  assert.equal(receipt.authorship, 'AI_AUTHORED_DRAFT');
  assert.equal(receipt.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(receipt.inputFileDigest, hash(await readFile(join(directory, 'adjudication.json'))));
  assert.equal(receipt.documentDigest, report.documentDigest);
  for (const name of ['adjudication.json', 'schema.json', 'report.json']) {
    const bytes = await readFile(join(directory, name));
    assert.deepEqual(receipt.files[name], {sha256: hash(bytes), bytes: bytes.byteLength});
  }
  const diskReport = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8'));
  const {outputFiles, ...withoutOutputFiles} = report;
  assert.deepEqual(diskReport, withoutOutputFiles);
  assert.equal(JSON.stringify(receipt).includes(directory), false);
  assert.equal(JSON.stringify(receipt).includes(validDraft.adversarialCases[0].outputText), false);
  successful(run(['validate', '--input=' + join(directory, 'adjudication.json')]));
});

test('draft contents are identical in two different new directories', async () => {
  const parent = await freshCase();
  const first = join(parent, 'first');
  const second = join(parent, 'second');
  const firstRun = run(['draft', '--out=' + first]);
  const secondRun = run(['draft', '--out=' + second]);
  successful(firstRun);
  successful(secondRun);
  assert.equal(firstRun.stdout, secondRun.stdout);
  assert.deepEqual(await snapshot(first), await snapshot(second));
});

test('validate with out saves only report and receipt, without copying the supplied body', async () => {
  const directory = join(await freshCase(), 'report-only');
  const report = successful(run(['validate', '--input=' + validInputPath, '--out=' + directory]));
  assert.deepEqual((await readdir(directory)).sort(), ['receipt.json', 'report.json']);
  assert.deepEqual([...report.outputFiles].sort(), ['receipt.json', 'report.json']);
  const receipt = JSON.parse(await readFile(join(directory, 'receipt.json'), 'utf8'));
  assert.deepEqual(Object.keys(receipt.files), ['report.json']);
  assert.equal(receipt.inputFileDigest, hash(validBytes));
  for (const name of ['receipt.json', 'report.json']) {
    assert.equal((await stat(join(directory, name))).mode & 0o777, 0o600);
    assert.equal((await readFile(join(directory, name), 'utf8')).includes(validDraft.adversarialCases[0].outputText), false);
  }
  assert.deepEqual(await readFile(validInputPath), validBytes);
});

test('draft refuses an already generated directory and preserves every previous byte', async () => {
  const directory = join(await freshCase(), 'existing-draft');
  successful(run(['draft', '--out=' + directory]));
  const previous = await snapshot(directory);
  rejected(run(['draft', '--out=' + directory]), 'OUTPUT_EXISTS');
  assert.deepEqual(await snapshot(directory), previous);
});

test('validate refuses an existing directory without modifying its contents or permissions', async () => {
  const directory = join(await freshCase(), 'already-there');
  await mkdir(directory, {mode: 0o755});
  await writeFile(join(directory, 'sentinel.txt'), canary, {flag: 'wx'});
  const previous = await snapshot(directory);
  const originalMode = (await stat(directory)).mode;
  rejected(run(['validate', '--input=' + validInputPath, '--out=' + directory]), 'OUTPUT_EXISTS');
  assert.deepEqual(await snapshot(directory), previous);
  assert.equal((await stat(directory)).mode, originalMode);
});

test('an existing output file cannot be replaced with a directory', async () => {
  const path = join(await freshCase(), 'existing-file');
  await writeFile(path, canary, {flag: 'wx'});
  rejected(run(['draft', '--out=' + path]), 'OUTPUT_EXISTS');
  assert.equal(await readFile(path, 'utf8'), canary);
});

test('an existing output symlink is refused without touching its target', async () => {
  const parent = await freshCase();
  const actual = join(parent, 'actual');
  await mkdir(actual);
  await writeFile(join(actual, 'sentinel.txt'), canary, {flag: 'wx'});
  const link = join(parent, 'existing-output-link');
  await symlink(actual, link, 'dir');
  rejected(run(['draft', '--out=' + link]), 'OUTPUT_EXISTS');
  assert.deepEqual(await readdir(actual), ['sentinel.txt']);
  assert.equal(await readFile(join(actual, 'sentinel.txt'), 'utf8'), canary);
});

test('nonexistent output parent is not created recursively', async () => {
  const missingParent = join(await freshCase(), 'missing-parent');
  rejected(run(['draft', '--out=' + join(missingParent, 'child')]), 'OUTPUT_UNAVAILABLE');
  await absent(missingParent);
});

test('output physically inside the repository is rejected before creation', async t => {
  const target = join(moduleDirectory, 'cli-rejected-output-' + basename(await freshCase()));
  t.after(() => rm(target, {recursive: true, force: true}));
  rejected(run(['draft', '--out=' + target]), 'OUTPUT_INSIDE_REPOSITORY');
  await absent(target);
});

test('an outside symlink parent cannot disguise an output inside the repository', async t => {
  const parent = await freshCase();
  const alias = join(parent, 'repo-alias');
  await symlink(moduleDirectory, alias, 'dir');
  const name = 'cli-rejected-link-output-' + basename(parent);
  const physicalTarget = join(moduleDirectory, name);
  t.after(() => rm(physicalTarget, {recursive: true, force: true}));
  rejected(run(['draft', '--out=' + join(alias, name)]), 'OUTPUT_INSIDE_REPOSITORY');
  await absent(physicalTarget);
});

test('output parent symlinks resolving to a safe outside directory are handled consistently', async () => {
  const parent = await freshCase();
  const actual = join(parent, 'actual-parent');
  await mkdir(actual);
  const alias = join(parent, 'safe-alias');
  await symlink(actual, alias, 'dir');
  successful(run(['validate', '--input=' + validInputPath, '--out=' + join(alias, 'new-output')]));
  assert.deepEqual((await readdir(join(actual, 'new-output'))).sort(), ['receipt.json', 'report.json']);
});

const invalidArguments = [
  ['missing command', () => []],
  ['unsupported command', () => ['score']],
  ['draft missing output', () => ['draft']],
  ['validate missing input', () => ['validate']],
  ['draft forbidden input', out => ['draft', '--input=' + validInputPath, '--out=' + out]],
  ['unknown flag', () => ['validate', '--input=' + validInputPath, '--network=true']],
  ['unknown sensitive flag', () => ['validate', '--input=' + validInputPath, '--private-seed=' + canary]],
  ['duplicate input', () => ['validate', '--input=' + validInputPath, '--input=' + validInputPath]],
  ['duplicate output', out => ['draft', '--out=' + out, '--out=' + out]],
  ['empty input', () => ['validate', '--input=']],
  ['empty output', () => ['draft', '--out=']],
  ['relative input', () => ['validate', '--input=relative.json']],
  ['relative draft output', () => ['draft', '--out=relative-output']],
  ['relative validation output', () => ['validate', '--input=' + validInputPath, '--out=relative-output']],
  ['unrecognised positional argument', () => ['validate', '--input=' + validInputPath, canary]],
  ['split flag syntax', () => ['validate', '--input', validInputPath]],
  ['help with extra argument', () => ['--help', canary]],
];
for (const [name, argumentsFor] of invalidArguments) {
  test('argument rejection: ' + name, async () => {
    const parent = await freshCase();
    const target = join(parent, 'must-not-exist');
    rejected(run(argumentsFor(target), {cwd: parent}));
    assert.deepEqual(await readdir(parent), []);
  });
}

test('missing input reports only a stable code, never the supplied private-looking path', async () => {
  rejected(run(['validate', '--input=' + join(await freshCase(), canary + '.json')]), 'INPUT_UNAVAILABLE');
});

test('an input directory is rejected before attempting to read it', async () => {
  rejected(run(['validate', '--input=' + await freshCase()]), 'INPUT_NOT_REGULAR_FILE');
});

test('a final input symlink is refused even when it points to a valid draft', async () => {
  const path = join(await freshCase(), 'input-symlink.json');
  await symlink(validInputPath, path, 'file');
  rejected(run(['validate', '--input=' + path]), 'INPUT_NOT_REGULAR_FILE');
  assert.deepEqual(await readFile(validInputPath), validBytes);
});

test('a FIFO input is rejected without waiting for another process', async () => {
  const path = join(await freshCase(), 'input-fifo');
  const created = spawnSync('mkfifo', [path], {encoding: 'utf8', timeout: 3000});
  assert.equal(created.error, undefined, 'POSIX mkfifo is required for this Linux fixture');
  assert.equal(created.status, 0, created.stderr);
  rejected(run(['validate', '--input=' + path]), 'INPUT_NOT_REGULAR_FILE');
});

test('a device input is rejected as nonregular', () => {
  rejected(run(['validate', '--input=/dev/null']), 'INPUT_NOT_REGULAR_FILE');
});

test('empty input fails explicitly', async () => {
  const path = join(await freshCase(), 'empty.json');
  await writeFile(path, '', {flag: 'wx'});
  rejected(run(['validate', '--input=' + path]), 'INPUT_SIZE');
});

test('the inclusive one-MiB boundary accepts valid JSON with harmless leading whitespace', async () => {
  const path = join(await freshCase(), 'exactly-one-mib.json');
  const padded = Buffer.concat([Buffer.alloc(maximumInputBytes - validBytes.length, 0x20), validBytes]);
  assert.equal(padded.byteLength, maximumInputBytes);
  await writeFile(path, padded, {flag: 'wx'});
  successful(run(['validate', '--input=' + path]));
});

test('one byte over one MiB is refused even though its JSON and evidence would otherwise be valid', async () => {
  const path = join(await freshCase(), 'over-one-mib.json');
  const padded = Buffer.concat([Buffer.alloc(maximumInputBytes + 1 - validBytes.length, 0x20), validBytes]);
  assert.equal(padded.byteLength, maximumInputBytes + 1);
  await writeFile(path, padded, {flag: 'wx'});
  rejected(run(['validate', '--input=' + path]), 'INPUT_SIZE');
});

test('malformed JSON cannot echo its body or a fake private seed', async () => {
  const path = join(await freshCase(), canary + '.json');
  await writeFile(path, '{"privateSeed":"' + canary + '","body":"' + canary, {flag: 'wx'});
  rejected(run(['validate', '--input=' + path]), 'INVALID_JSON');
});

test('duplicate JSON keys remain a deterministic CLI failure', async () => {
  const path = join(await freshCase(), 'duplicate-key.json');
  await writeFile(path, '{"version":1,"version":1,"seed":"' + canary + '"}', {flag: 'wx'});
  rejected(run(['validate', '--input=' + path]), 'JSON_DUPLICATE_KEY');
});

test('a private-assignment object is not a valid public draft and is not echoed', async () => {
  const parent = await freshCase();
  const path = join(parent, 'private-shaped-synthetic-object.json');
  await writeFile(path, JSON.stringify({kind: 'PRIVATE_BLIND_ASSIGNMENTS', seed: canary, body: canary}), {flag: 'wx'});
  rejected(run(['validate', '--input=' + path, '--out=' + join(parent, 'must-not-exist')]));
  await absent(join(parent, 'must-not-exist'));
});

test('mid-write filesystem failure preserves the partial output and emits no completion receipt', async () => {
  const parent = await freshCase();
  const preload = join(parent, 'fail-second-output-write.mjs');
  await writeFile(preload, [
    "import fs from 'node:fs/promises';",
    "import {syncBuiltinESMExports} from 'node:module';",
    'const original = fs.writeFile;',
    'let writes = 0;',
    'fs.writeFile = async (...args) => {',
    '  writes += 1;',
    '  if (writes === 2) throw new Error(' + JSON.stringify(canary) + ');',
    '  return original(...args);',
    '};',
    'syncBuiltinESMExports();',
    '',
  ].join('\n'), {flag: 'wx', mode: 0o600});
  const directory = join(parent, 'partial-draft');
  rejected(run(['draft', '--out=' + directory], {preload}), 'OUTPUT_INCOMPLETE');
  assert.deepEqual(await readdir(directory), ['adjudication.json']);
  const partial = await readFile(join(directory, 'adjudication.json'));
  assert.deepEqual(partial, validBytes);
  await absent(join(directory, 'receipt.json'));
  rejected(run(['draft', '--out=' + directory]), 'OUTPUT_EXISTS');
  assert.deepEqual(await readFile(join(directory, 'adjudication.json')), partial);
});
