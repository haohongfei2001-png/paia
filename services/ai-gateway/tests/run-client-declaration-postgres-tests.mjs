import {spawnSync} from 'node:child_process';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
let valid=false;
try{disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);valid=true;}catch{}
if(!valid){
 console.error('NOT_RUN: An approved NEW disposable loopback paia_ledger_test_* database and PAIA_LEDGER_TEST_DISPOSABLE=yes are required. This suite creates ephemeral NOLOGIN test roles/policies, never credentials. No production, password or ambient URL fallback.');process.exitCode=2;
}else{
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',new URL('./client-declaration-postgres-live.test.mjs',import.meta.url).pathname],{stdio:'inherit',env:process.env});process.exitCode=result.status??1;
}
