import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('the real reporter preserves a failed assertion with a null-prototype cause and continues to the final failing summary',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'paia-reporter-failure-'));
 try{
  const reporter=new URL('../scripts/test-report.mjs',import.meta.url).href;
  const script=`import report from ${JSON.stringify(reporter)};const cause=Object.assign(Object.create(null),{actual:'synthetic actual',expected:'synthetic expected'});cause.cause=cause;const error=new Error('original synthetic assertion');error.cause=cause;async function* events(){yield{type:'test:fail',data:{file:'tests/synthetic-owner.test.mjs',name:'failed owner',details:{error}}};yield{type:'test:pass',data:{file:'tests/synthetic-owner.test.mjs',name:'later owner',nesting:0}};}for await(const line of report(events()))process.stdout.write(line);`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/FAIL synthetic-owner.test.mjs: failed owner/);assert.match(run.stdout,/original synthetic assertion/);assert.match(run.stdout,/synthetic actual/);assert.match(run.stdout,/synthetic expected/);assert.match(run.stdout,/PASS synthetic-owner.test.mjs: later owner/);
  const summary=JSON.parse(await readFile(join(cwd,'work/test-summary.json'),'utf8'));assert.equal(summary.total,2);assert.equal(summary.fail,1);assert.equal(summary.pass,1);assert.equal(summary.skipped,0);
 }finally{await rm(cwd,{recursive:true,force:true});}
});

for(const [label,body,expected] of [
 ['nonzero exit','process.exit(9);',{exitCode:9,signal:null,failureType:'testCodeFailure'}],
 ['terminated child',"process.kill(process.pid,'SIGTERM');",{exitCode:null,signal:'SIGTERM',failureType:'testCodeFailure'}]
])test('the real Node runner retains exact '+label+' metadata without converting failure to a pass',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'paia-reporter-process-'));
 try{
  await writeFile(join(cwd,'synthetic-process.test.mjs'),body);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const reporter=new URL('../scripts/test-report.mjs',import.meta.url).pathname,run=spawnSync(process.execPath,['--test','--test-reporter='+reporter,'synthetic-process.test.mjs'],{cwd,env,encoding:'utf8'});
  assert.equal(run.status,1);const line=run.stdout.split('\n').find(line=>line.startsWith('FAILURE_METADATA '));assert.ok(line,run.stdout);assert.deepEqual(JSON.parse(line.slice('FAILURE_METADATA '.length)),expected);
  const summary=JSON.parse(await readFile(join(cwd,'work/test-summary.json'),'utf8'));assert.equal(summary.total,1);assert.equal(summary.fail,1);assert.equal(summary.pass,0);assert.equal(summary.skipped,0);
 }finally{await rm(cwd,{recursive:true,force:true});}
});

test('process metadata excludes arbitrary fields, oversized values and accessors without evaluating them',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'paia-reporter-metadata-'));
 try{
  const reporter=new URL('../scripts/test-report.mjs',import.meta.url).href;
  const script=`import report from ${JSON.stringify(reporter)};let reads=0;const error=new Error('synthetic failure');error.exitCode=-1;error.failureType='SYNTHETIC_PRIVATE_METADATA_CANARY';error.stdout='SYNTHETIC_PRIVATE_BODY_CANARY';Object.defineProperty(error,'signal',{get(){reads++;throw Error('accessor evaluated');}});async function* events(){yield{type:'test:fail',data:{file:'synthetic.test.mjs',name:'synthetic case',details:{error}}};}for await(const line of report(events()))process.stdout.write(line);if(reads)process.exit(7);`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd,encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.doesNotMatch(run.stdout,/SYNTHETIC_PRIVATE_(BODY|METADATA)_CANARY|FAILURE_METADATA/);
  const invalid=script.replace("'SYNTHETIC_PRIVATE_METADATA_CANARY'","'private value with spaces'");const second=spawnSync(process.execPath,['--input-type=module','-e',invalid],{cwd,encoding:'utf8'});assert.equal(second.status,0,second.stderr);assert.doesNotMatch(second.stdout,/FAILURE_METADATA|private value with spaces/);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
