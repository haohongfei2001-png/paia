import {readFile, lstat, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, sep} from 'node:path';
import {spawn} from 'node:child_process';
import {strict as assert} from 'node:assert';

// Fixed reviewed roots, never a discovery glob. This supplements the original
// Full gate; it neither changes its threshold nor claims production activation.
export function partitionSourceRoots(roots, count = 4) {
  assert.equal(count, 4);
  assert.ok(Array.isArray(roots));
  assert.equal(roots.length, 52);
  assert.equal(new Set(roots).size, 52);
  assert.deepEqual(roots, [...roots].sort());
  for (const path of roots) assert.match(path, /^services\/ai-gateway\/tests\/[a-z0-9-]+\.test\.mjs$/);
  const shards = Array.from({length: count}, (_, i) => roots.filter((_, n) => n % count === i));
  assert.deepEqual(shards.flat().sort(), roots);
  assert.equal(new Set(shards.flat()).size, roots.length);
  return shards;
}

export async function inspectSourceRoots(root, roots) {
  const shards = partitionSourceRoots(roots), resolvedRoot = await realpath(root), files = [];
  // Verify all four complete shards before running any one of them. Missing
  // or substituted files fail the job rather than silently shrinking coverage.
  for (const path of roots) {
    const absolute = resolve(resolvedRoot, path), metadata = await lstat(absolute);
    assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `not a regular source root: ${path}`);
    assert.ok((await realpath(absolute)).startsWith(resolvedRoot + sep), `outside repository: ${path}`);
    const bytes = await readFile(absolute);
    files.push({path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
  }
  return {root: resolvedRoot, shards, files};
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 1 && /^[1-4]$/.test(args[0]), 'one shard number 1..4 is required');
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const roots = JSON.parse(await readFile(new URL('./maintenance-source-roots.json', import.meta.url), 'utf8'));
  const inspected = await inspectSourceRoots(root, roots), shard = Number(args[0]);
  console.log(JSON.stringify({scope:'offline original source client regressions', shard, shardCount:4, fullCount:52, selected:inspected.shards[shard-1], files:inspected.files}));
  const child = spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...inspected.shards[shard-1]], {cwd:inspected.root, stdio:'inherit'});
  const code = await new Promise((resolve, reject) => {child.once('error', reject); child.once('exit', (code, signal) => signal ? reject(new Error(`test process terminated by ${signal}`)) : resolve(code));});
  if (code !== 0) process.exitCode = code || 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
