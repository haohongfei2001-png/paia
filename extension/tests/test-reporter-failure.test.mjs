import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
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
