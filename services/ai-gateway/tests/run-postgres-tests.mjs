import { spawnSync } from 'node:child_process';

import { disposablePostgresConfig } from './postgres-test-config.mjs';

// Deliberately no DATABASE_URL fallback and no skip/pass when unavailable.
let valid = false;
try {
  disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL, process.env.PAIA_LEDGER_TEST_DISPOSABLE);
  valid = true;
} catch { /* Configuration is rejected before spawning or connecting. */ }
if (!valid) {
  console.error('NOT_RUN: Supply a literal loopback postgres://postgres@127.0.0.1:PORT/paia_ledger_test_NAME URI without password/query/fragment and PAIA_LEDGER_TEST_DISPOSABLE=yes. Only an isolated disposable development database is allowed.');
  process.exitCode = 2;
} else {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1',
    new URL('./postgres-live.test.mjs', import.meta.url).pathname], { stdio: 'inherit', env: process.env });
  process.exitCode = result.status ?? 1;
}
