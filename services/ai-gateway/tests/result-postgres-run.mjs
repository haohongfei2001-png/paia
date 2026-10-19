import {spawnSync} from 'node:child_process';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
let valid=false;
try{disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);valid=true;}catch{}
if(!valid){console.error('NOT_RUN: A NEW disposable loopback paia_ledger_test_* database and explicit PAIA_LEDGER_TEST_DISPOSABLE=yes are required. No provider or production/ambient target fallback.');process.exitCode=2;}
else{const result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',new URL('./result-postgres-live.test.mjs',import.meta.url).pathname],{stdio:'inherit',env:process.env});process.exitCode=result.status??1;}
