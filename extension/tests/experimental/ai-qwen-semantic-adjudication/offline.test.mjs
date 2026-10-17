import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('build and complete validation succeed with network entry points disabled', () => {
  const buildUrl = new URL('build-draft.mjs', import.meta.url).href;
  const validatorUrl = new URL('validator.mjs', import.meta.url).href;
  const script = [
    "import http from 'node:http';",
    "import https from 'node:https';",
    "import net from 'node:net';",
    "import dns from 'node:dns';",
    "import tls from 'node:tls';",
    "import dgram from 'node:dgram';",
    "import {syncBuiltinESMExports} from 'node:module';",
    'let attempts = 0;',
    "const deny = () => { attempts++; throw Error('NETWORK_FORBIDDEN'); };",
    'globalThis.fetch = deny;',
    'globalThis.WebSocket = class { constructor() { deny(); } };',
    'http.request = http.get = https.request = https.get = deny;',
    'net.connect = net.createConnection = net.Socket.prototype.connect = deny;',
    'tls.connect = dgram.createSocket = deny;',
    'dns.lookup = dns.resolve = deny;',
    'dns.promises.lookup = dns.promises.resolve = deny;',
    'syncBuiltinESMExports();',
    'const {buildDraft} = await import(' + JSON.stringify(buildUrl) + ');',
    'const {validateAdjudication} = await import(' + JSON.stringify(validatorUrl) + ');',
    'const first = await buildDraft();',
    'const second = await buildDraft();',
    'const report = await validateAdjudication(Buffer.from(JSON.stringify(first)));',
    'process.stdout.write(JSON.stringify({attempts, same: JSON.stringify(first) === JSON.stringify(second), report}));',
  ].join('\n');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
    env: {PATH: process.env.PATH, LANG: 'C.UTF-8'},
  });
  assert.equal(result.error, undefined, 'offline subprocess must actually execute');
  assert.equal(result.signal, null, 'offline subprocess must finish before timeout');
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.attempts, 0);
  assert.equal(output.same, true);
  assert.equal(output.report.structure, 'VALID');
  assert.equal(output.report.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(output.report.statuses.modelExecution, 'NOT_RUN');
  assert.equal(output.report.counts.missingHumanEntryReviews, 36);
});
