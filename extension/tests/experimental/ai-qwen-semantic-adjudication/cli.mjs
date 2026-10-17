import {open, lstat, realpath, mkdir, writeFile, readFile} from 'node:fs/promises';
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
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
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
  try {
    const root = await realpath(repositoryRoot);
    const target = resolve(path);
    const parent = await realpath(dirname(target));
    const physicalTarget = resolve(parent, basename(target));
    requireThat(!within(root, physicalTarget), 'OUTPUT_INSIDE_REPOSITORY');
    // mkdir is the atomic existence check: no recursive creation, delete,
    // force, timestamp suffix, or reuse of any existing file/directory/link.
    await mkdir(physicalTarget, {mode: 0o700});
    return physicalTarget;
  } catch (error) {
    if (error instanceof AdjudicationError) throw error;
    throw new AdjudicationError(error.code === 'EEXIST' ? 'OUTPUT_EXISTS' : 'OUTPUT_UNAVAILABLE');
  }
}

async function implementationDigests() {
  const files = [
    'cli.mjs', 'schema.mjs', 'trusted.mjs', 'validator.mjs', 'build-draft.mjs',
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
    for (const [name, body] of Object.entries(files)) {
      await writeFile(resolve(directory, name), body, {flag: 'wx', mode: 0o600});
    }
    // Completion receipt is deliberately last. A partially written directory
    // remains an explicit failed attempt, never a new successful empty result.
    await writeFile(resolve(directory, 'receipt.json'), json(receipt), {flag: 'wx', mode: 0o600});
  } catch {
    throw new AdjudicationError('OUTPUT_INCOMPLETE');
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
