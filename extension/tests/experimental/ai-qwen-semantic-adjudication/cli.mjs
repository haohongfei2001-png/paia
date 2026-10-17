import {open, lstat, realpath, mkdir, readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {constants} from 'node:fs';
import {dirname, basename, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDraft} from './build-draft.mjs';
import {validateAdjudication} from './validator.mjs';
import {schema} from './schema.mjs';
import {AUTHORSHIP, sha256, AdjudicationError, requireThat} from './trusted.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const json = value => JSON.stringify(value, null, 2) + '\n';
const help = [
  'PAIA held-out semantic adjudication — strictly offline, AI_AUTHORED_DRAFT',
  'node cli.mjs draft --out=/absolute/new-directory-outside-repository',
  'node cli.mjs validate --input=/absolute/adjudication.json [--out=/absolute/new-directory-outside-repository]',
  'A successful validation proves file structure and frozen evidence bindings only.',
  'Human semantic review, author acceptance and model qualification remain NOT_RUN.',
].join('\n');

function argumentsFor(argv) {
  if (argv.length === 1 && argv[0] === '--help') return {command: 'help'};
  const [command, ...flags] = argv;
  requireThat(['draft', 'validate'].includes(command), 'CLI_COMMAND');
  const options = {command};
  for (const flag of flags) {
    const match = /^--(input|out)=(.+)$/.exec(flag);
    requireThat(Boolean(match), 'CLI_ARGUMENT');
    const [, key, value] = match;
    requireThat(!Object.hasOwn(options, key), 'CLI_DUPLICATE_ARGUMENT');
    requireThat(!value.includes('\0') && isAbsolute(value), 'CLI_ABSOLUTE_PATH_REQUIRED');
    options[key] = value;
  }
  requireThat(command === 'draft' ? options.out && !options.input : options.input, 'CLI_ARGUMENT');
  return options;
}

async function readInput(path) {
  // Bound before allocation, refuse final symlinks/devices/FIFOs, then verify
  // the actual opened file. An input cannot be treated as a corpus trust root.
  let handle;
  try {
    const info = await lstat(path);
    requireThat(info.isFile() && !info.isSymbolicLink(), 'INPUT_NOT_REGULAR_FILE');
    requireThat(info.size > 0 && info.size <= 1024 * 1024, 'INPUT_SIZE');
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat();
    requireThat(opened.isFile() && opened.dev === info.dev && opened.ino === info.ino, 'INPUT_CHANGED');
    requireThat(opened.size > 0 && opened.size <= 1024 * 1024, 'INPUT_SIZE');
    const buffer = Buffer.alloc(opened.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const {bytesRead} = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    requireThat(length === opened.size, 'INPUT_CHANGED');
    const after = await handle.stat();
    requireThat(after.size === opened.size && after.mtimeMs === opened.mtimeMs && after.ctimeMs === opened.ctimeMs, 'INPUT_CHANGED');
    return buffer.subarray(0, length);
  } catch (error) {
    if (error instanceof AdjudicationError) throw error;
    throw new AdjudicationError('INPUT_UNAVAILABLE');
  } finally {
    await handle?.close();
  }
}
const within = (root, path) => {
  const tail = relative(root, path);
  return tail === '' || (!tail.startsWith('..' + sep) && tail !== '..' && !isAbsolute(tail));
};

async function newOutputDirectory(path) {
  let handle;
  try {
    const root = await realpath(repositoryRoot);
    const target = resolve(path);
    const parent = await realpath(dirname(target));
    const physicalTarget = resolve(parent, basename(target));
    requireThat(!within(root, physicalTarget), 'OUTPUT_INSIDE_REPOSITORY');
    // mkdir is the atomic no-reuse check. Opening without following the leaf
    // pins an inode that the isolated writer must match to its own cwd.
    await mkdir(physicalTarget, {mode: 0o700});
    const info = await lstat(physicalTarget);
    requireThat(info.isDirectory() && !info.isSymbolicLink(), 'OUTPUT_CHANGED');
    handle = await open(physicalTarget, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat();
    requireThat(opened.isDirectory() && opened.dev === info.dev && opened.ino === info.ino && opened.uid === process.geteuid() && (opened.mode & 0o777) === 0o700, 'OUTPUT_CHANGED');
    return {root, path: physicalTarget, handle};
  } catch (error) {
    await handle?.close();
    if (error instanceof AdjudicationError) throw error;
    throw new AdjudicationError(error.code === 'EEXIST' ? 'OUTPUT_EXISTS' : 'OUTPUT_UNAVAILABLE');
  }
}

async function writeOutput(directory, files, receipt) {
  const writer = fileURLToPath(new URL('output-writer.mjs', import.meta.url));
  const payload = JSON.stringify({
    files: Object.entries(files).map(([name, bytes]) => ({name, body: bytes.toString('base64')})),
    receipt: Buffer.from(json(receipt)).toString('base64'),
  });
  return new Promise((accept, reject) => {
    // The child inherits the pinned directory fd. Its cwd is a kernel inode
    // anchor: relative exclusive writes cannot follow a replacement symlink.
    // Parent cwd and NODE_OPTIONS/environment are never inherited or changed.
    const child = spawn(process.execPath, [writer, directory.root, directory.path], {
      cwd: directory.path, env: {}, stdio: ['pipe', 'pipe', 'pipe', directory.handle.fd],
    });
    let stdout = '', stderr = '', failure = null, inputFailed = false;
    const fail = code => { failure ??= code; child.kill('SIGKILL'); };
    const timer = setTimeout(() => fail('OUTPUT_WORKER_TIMEOUT'), 30000);
    child.once('error', () => { failure ??= 'OUTPUT_WORKER_FAILED'; });
    child.stdin.on('error', () => { inputFailed = true; });
    for (const [stream, append] of [[child.stdout, text => { stdout += text; }], [child.stderr, text => { stderr += text; }]]) {
      stream.setEncoding('utf8');
      stream.on('data', text => {
        append(text);
        if (stdout.length + stderr.length > 4096) fail('OUTPUT_WORKER_FAILED');
      });
    }
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (!failure && !inputFailed && code === 0 && !signal && stdout === '{"ok":true}\n' && stderr === '') return accept();
      const allowed = new Set(['OUTPUT_CHANGED', 'OUTPUT_INCOMPLETE', 'OUTPUT_WORKER_TIMEOUT']);
      if (!failure) {
        try { const diagnostic = JSON.parse(stderr); if (allowed.has(diagnostic.error)) failure = diagnostic.error; } catch {}
      }
      reject(new AdjudicationError(failure ?? 'OUTPUT_WORKER_FAILED'));
    });
    child.stdin.end(payload);
  });
}

async function implementationDigests() {
  const files = [
    'cli.mjs', 'output-writer.mjs', 'schema.mjs', 'trusted.mjs', 'validator.mjs', 'build-draft.mjs',
    'draft-content.mjs', 'adversarial-content.mjs',
  ];
  return Object.fromEntries(await Promise.all(files.map(async name =>
    [name, sha256(await readFile(new URL(name, import.meta.url)))])));
}

export async function run(argv) {
  const options = argumentsFor(argv);
  if (options.command === 'help') return {help};
  const bytes = options.command === 'draft'
    ? Buffer.from(json(await buildDraft()), 'utf8')
    : await readInput(options.input);
  const report = await validateAdjudication(bytes);
  if (!options.out) return report;
  const files = {
    ...(options.command === 'draft' ? {'adjudication.json': bytes, 'schema.json': Buffer.from(json(schema))} : {}),
    'report.json': Buffer.from(json(report)),
  };
  const receipt = {
    version: 1, kind: 'PAIA_OFFLINE_DRAFT_FILE_RECEIPT', authorship: AUTHORSHIP,
    inputFileDigest: sha256(bytes), documentDigest: report.documentDigest,
    validationScope: report.validationScope, semanticCorrectness: report.semanticCorrectness,
    statuses: report.statuses,
    implementationDigests: await implementationDigests(),
    files: Object.fromEntries(Object.entries(files).map(([name, body]) => [name, {sha256: sha256(body), bytes: body.byteLength}])),
  };
  const directory = await newOutputDirectory(options.out);
  try {
    await writeOutput(directory, files, receipt);
  } finally {
    await directory.handle.close();
  }

  return {...report, outputFiles: [...Object.keys(files), 'receipt.json']};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await run(process.argv.slice(2));
    process.stdout.write(result.help ? result.help + '\n' : json(result));
  } catch (error) {
    // Never echo untrusted bodies, arbitrary exception messages, seeds or maps.
    process.stderr.write(JSON.stringify({error: error instanceof AdjudicationError ? error.code : 'OFFLINE_VALIDATION_FAILED'}) + '\n');
    process.exitCode = 1;
  }
}
