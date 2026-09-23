import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const execFileAsync = promisify(execFile);

test('CPV1-01.3 package preflight rejects changed identity, schema, permissions and nonincreasing version', async () => {
  const result = await execFileAsync('python3', ['-m', 'unittest', 'discover', '-s', 'tests',
    '-p', 'test_cpv1_01_3_update_preflight.py'], {cwd:fileURLToPath(new URL('../', import.meta.url))});
  assert.match(result.stderr, /Ran 4 tests/);
  assert.match(result.stderr, /OK/);
});
