import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {group,testShard} from '../scripts/test-groups.mjs';

const root=new URL('../',import.meta.url);
const candidate=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
const certification=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
const unit=candidate.slice(candidate.indexOf('\n  unit:\n'),candidate.indexOf('\n  contracts:\n'));
const full=certification.slice(certification.indexOf('\n  unit:\n'),certification.indexOf('\n  contracts:\n'));
const shards=['1/4','2/4','3/4','4/4'];
const names=(await readdir(new URL('tests/',root))).filter(name=>name.endsWith('.test.mjs')).sort();

// Execute the actual production runner selection, not a second sharding rule.
// Child execution and unrelated audits are observed without starting any tests.
export async function originalUnitSelection({names:input=names,shard,status=0}={}){
 const source=await readFile(new URL('scripts/test.mjs',root),'utf8');
 const body=source.replace(/^import [^\n]+;\n/gm,'')
   .replaceAll('import.meta.url',JSON.stringify(new URL('scripts/test.mjs',root).href));
 const calls=[],fakeProcess={argv:['node','scripts/test.mjs','unit'],
  env:{PAIA_TEST_SHARD:shard,PAIA_TEST_CONCURRENCY:'1'},execPath:process.execPath,chdir(){},
  exit(code){throw Object.assign(Error('observed runner exit'),{runnerExit:code});}};
 const execute=Object.getPrototypeOf(async()=>{}).constructor('readdir','readFile','writeFile','spawnSync',
  'fileURLToPath','createRequire','inputDigest','goldenBundle','group','testShard','process','console',body);
 let exit;
 try{await execute(async()=>input,readFile,async()=>{throw Error('unit selection must not write a summary');},
  (command,args)=>{calls.push({command,args});return {status:calls.length===1?status:0};},
  fileURLToPath,()=>({resolve:()=> 'observed-playwright-module'}),async()=> 'unchanged-input',async()=>false,
  group,testShard,fakeProcess,{log(){}});
 }catch(error){if(!Object.hasOwn(error,'runnerExit'))throw error;exit=error.runnerExit;}
 return {calls,exit};
}

test('Candidate reuses all four original Full unit shards without widening the deadline or worker concurrency',()=>{
 assert.ok(unit.length>0&&full.length>0);
 for(const block of [unit,full]){
  assert.match(block,/strategy:\n      fail-fast: false\n      matrix:\n        shard: \['1\/4','2\/4','3\/4','4\/4'\]/);
  assert.match(block,/PAIA_TEST_SHARD: \$\{\{ matrix\.shard \}\}/);
  assert.match(block,/PAIA_TEST_CONCURRENCY: '1'/);
 }
 assert.match(unit,/timeout-minutes: 15\n/);
 assert.match(unit,/name: Candidate unit smoke \$\{\{ matrix\.shard \}\}/);
 assert.match(unit,/working-directory: services\/ai-gateway\n        run: npm ci --ignore-scripts --no-audit --no-fund --registry=https:\/\/registry\.npmjs\.org/);
 assert.match(unit,/if\(!eligible\)run\('npm',\['run','test:unit'\]\);/);
 assert.doesNotMatch(unit,/continue-on-error|test-name-pattern|test-skip-pattern/);
});

test('actual original runner gives the complete current unit corpus exactly one shard and retains both audits',async()=>{
 const expected=names.filter(name=>group(name)==='unit').map(name=>'tests/'+name),seen=[];
 for(const shard of shards){
  const result=await originalUnitSelection({shard});assert.equal(result.exit,0);assert.equal(result.calls.length,3);
  const [native,packaging,development]=result.calls;
  assert.deepEqual(native.args.slice(0,3),['--test','--test-concurrency=1','--test-reporter=./scripts/test-report.mjs']);
  assert.ok(native.args.length>3);seen.push(...native.args.slice(3));
  assert.deepEqual(packaging.args,['scripts/check_package.py']);
  assert.deepEqual(development.args,['scripts/check_development.mjs']);
 }
 assert.equal(new Set(seen).size,seen.length,'no duplicate whole-file routes');
 assert.deepEqual(seen.sort(),expected,'no omitted, foreign, browser or experimental unit roots');
});

test('actual original runner propagates child failure or uncertain exit before any audit can license success',async()=>{
 for(const status of [1,7,null]){
  const result=await originalUnitSelection({shard:'1/4',status});
  assert.equal(result.exit,status||1);assert.equal(result.calls.length,1);
 }
});

test('actual original runner rejects malformed and empty shards before any child execution',async()=>{
 for(const shard of ['0/4','5/4','1/0','1/17','1/4/4'])
  await assert.rejects(originalUnitSelection({shard}),/PAIA_TEST_SHARD must be/);
 await assert.rejects(originalUnitSelection({shard:'1/4',names:[]}),/selected no test files/);
});

test('unchanged actual Candidate aggregate requires successful units and refuses failure cancellation skip or missing result',()=>{
 const gate=candidate.slice(candidate.indexOf('\n  candidate:\n'));
 assert.match(gate,/needs: \[unit,/);assert.match(gate,/UNIT: \$\{\{ needs\.unit\.result \}\}/);
 const [envText,runText]=gate.split('        run: |\n');assert.ok(runText);
 const environment=Object.fromEntries([...envText.matchAll(/^          ([A-Z0-9_]+): /gm)].map(([,key])=>
  [key,key.endsWith('_SELECTED')?'false':['UNIT','CONTRACTS','RELEASE'].includes(key)?'success':'skipped']));
 const command=runText.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
 for(const unitResult of ['success','failure','cancelled','skipped','']){
  const result=spawnSync('bash',['-e','-c',command],{env:{...process.env,...environment,UNIT:unitResult},encoding:'utf8'});
  if(unitResult==='success')assert.equal(result.status,0,result.stderr);
  else assert.notEqual(result.status,0,'non-success aggregate cannot qualify: '+unitResult);
 }
});
