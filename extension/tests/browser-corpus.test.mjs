import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {browserManifest,browserShard,validateBrowserManifest,historicalRouting} from '../scripts/browser-corpus.mjs';
import {verifyBrowserCoverage,verifyDiscoveredBrowserCoverage} from '../scripts/browser-coverage.mjs';
import {group,testShard} from '../scripts/test-groups.mjs';
const files=readdirSync(new URL('./',import.meta.url)).filter(name=>name.endsWith('.test.mjs'));
const copy=()=>JSON.parse(JSON.stringify(browserManifest));

test('live manifest equals independent disk discovery and preserves the frozen pre-optimization oracle',()=>{
 assert.equal(historicalRouting.base,'b8a09bbfd4b57447c71f8b18bb1e528c65e0668e');
 assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/browser-routing-pre-efficiency.json',import.meta.url))).digest('hex'),'bfd631f24997b43c520e63fb04bb4e4af0aad16bf0f20d7a197345347e3bcfbb');
 assert.deepEqual(verifyDiscoveredBrowserCoverage(),browserManifest.tests.map(row=>row.file));
 for(const row of historicalRouting.rows)for(const [i,width]of historicalRouting.widths.entries())
  for(const position of [-1,0,999999])for(const path of [row[0],'tests/'+row[0],'tests\\'+row[0]])
   assert.equal(testShard(path,position,width,'browser E2E'),row[i+1]);
});

test('adding tests before/between/after old names changes only manifest entries, never prior routes',()=>{
 const extra=['cpv1-00-efficiency-canary-chrome-e2e.test.mjs','cpv1-50-efficiency-canary-chrome-e2e.test.mjs','cpv1-99-efficiency-canary-chrome-e2e.test.mjs'];
 const manifest=copy();manifest.tests.push(...extra.map((file,i)=>({file,shard:i+1})));manifest.tests.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 const all=[...files,...extra];assert.deepEqual(verifyBrowserCoverage(all,manifest),manifest.tests.map(row=>row.file));
 for(const row of historicalRouting.rows)for(const [i,width]of historicalRouting.widths.entries())assert.equal(browserShard(row[0],width,manifest),row[i+1]);
 for(const name of extra){assert.equal(group(name),'browser E2E');for(const width of historicalRouting.widths)assert.ok(browserShard(name,width,manifest)>=1&&browserShard(name,width,manifest)<=width);}
});

test('missing disk file, missing admission, and simultaneous removal from both cannot pass',()=>{
 const name=browserManifest.tests[0].file,manifest=copy();manifest.tests=manifest.tests.filter(row=>row.file!==name);
 assert.throws(()=>verifyBrowserCoverage(files.filter(file=>file!==name)),/MISMATCH/);
 assert.throws(()=>verifyBrowserCoverage(files,manifest),/MISMATCH/);
 assert.throws(()=>verifyBrowserCoverage(files.filter(file=>file!==name),manifest),/BASELINE_MISSING/);
});

test('new current-pattern file cannot be silently omitted or assigned by directory position',()=>{
 const name='cpv1-99-unadmitted-chrome-e2e.test.mjs';
 assert.throws(()=>verifyBrowserCoverage([...files,name]),/MISMATCH/);
 assert.throws(()=>testShard(name,0,9,'browser E2E'),/UNADMITTED/);
 assert.throws(()=>testShard(name,999,4,'browser E2E'),/UNADMITTED/);
});

test('duplicate discovery, historical demotion and changed existing route fail independently',()=>{
 assert.throws(()=>verifyBrowserCoverage([...files,files[0]]),/DUPLICATE/);
 const name=browserManifest.tests[0].file;
 assert.throws(()=>verifyBrowserCoverage(files,browserManifest,file=>file===name?'historical browser E2E':group(file)),/MISMATCH/);
 const manifest=copy();manifest.tests[0].shard=manifest.tests[0].shard%manifest.shards+1;
 assert.throws(()=>verifyBrowserCoverage(files,manifest),/ROUTE_CHANGED/);
});

for(const [label,mutate]of [
 ['duplicate',m=>m.tests.push({...m.tests[0]})],
 ['out-of-range',m=>m.tests[0].shard=m.shards+1],
 ['fractional',m=>m.tests[0].shard=1.5],
 ['unsafe path',m=>m.tests[0].file='../escaped.test.mjs'],
 ['unknown field',m=>m.tests[0].skip=true],
 ['unsorted',m=>m.tests.reverse()],
 ['empty',m=>m.tests=[]],
 ['unknown version',m=>m.schemaVersion=2]
])test('manifest refuses '+label,()=>{const m=copy();mutate(m);assert.throws(()=>validateBrowserManifest(m),/BROWSER_MANIFEST/);});

test('unit and historical non-current routing retain their existing whole-file behavior',()=>{
 for(const category of ['unit','adapter contract','privacy/security','historical browser E2E'])
  for(let index=0;index<40;index++)assert.equal(testShard('independent.test.mjs',index,4,category),index%4+1);
 for(const width of [0,-1,1.5,17])assert.throws(()=>browserShard(browserManifest.tests[0].file,width),/WIDTH_INVALID/);
});

test('existing verification-depth job requires preflight before expensive certification can start',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const mode=workflow.split('  mode:')[1].split('  unit:')[0];
 assert.match(mode,/node scripts\/check-ui-refresh-ci\.mjs/);assert.ok(mode.indexOf('check-ui-refresh-ci.mjs')<mode.indexOf('- id: depth'));
 assert.doesNotMatch(mode,/continue-on-error/);
 for(const name of ['unit','contracts','current_browser','macos_secure_store','macos_discard_lifecycle','sync_native_storage','release']){
  const entry=workflow.split('  '+name+':')[1];assert.ok(entry,'required existing job '+name);
  assert.match(entry.split('    steps:')[0],/needs: mode/);
 }
 const runner=readFileSync(new URL('../scripts/test.mjs',import.meta.url),'utf8');
 assert.ok(runner.indexOf('verifyDiscoveredBrowserCoverage();')<runner.indexOf('const startingDigest='));
});

test('PR263 pending-history keeps every original optional/current placement and required admission',()=>{
 const name='uir-04-pending-history-chrome-e2e.test.mjs';
 assert.ok(verifyDiscoveredBrowserCoverage().includes(name));
 for(const width of [4,5,6,7,9])for(const position of [-1,0,9999])
  assert.equal(testShard(name,position,width,'browser E2E'),width===9?7:3);
 const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('tests/'+name),'both relocated source/release scenarios remain selected upstream');
 const checker=readFileSync(new URL('../scripts/check-ui-refresh-ci.mjs',import.meta.url),'utf8');
 assert.ok(checker.includes('PENDING_HISTORY_CURRENT_NATIVE_NOT_ADMITTED'));
 for(const legacy of [[3],[0,3,3,3,7],[3,3,3,3,10],[3,3,3,3,1.5]]){
  const m=copy();m.tests.find(row=>row.file===name).legacy=legacy;
  assert.throws(()=>validateBrowserManifest(m),/LEGACY_INVALID/);
 }
});

test('UIR-02 separate lifetimes cannot reset the original combined timeout',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const code=readFileSync(new URL('./uir-02-archive-search-reader-chrome-e2e.test.mjs',import.meta.url),'utf8');
 const at=code.indexOf('const sourceAndReleaseDeadline=');
 assert.ok(at>=0,'shared monotonic deadline must exist');
 const launcher=code.slice(at);
 assert.match(launcher,/sourceAndReleaseDeadline=performance\.now\(\)\+300000;/);
 assert.equal((launcher.match(/await test\(/g)||[]).length,2,'case completion precedes calculating the next timeout');
 assert.equal((launcher.match(/timeout:remainingJourneyBudget\(\)/g)||[]).length,2);
 // Execute the actual two registration/callback bodies under node:test. Only
 // their browser/IO collaborators and the 300s wall-clock scale are substituted;
 // no product behavior or native browser acceptance is claimed by this unit test.
 const dir=mkdtempSync(join(tmpdir(),'paia-uir02-budget-'));
 try{
  for(const [label,delayMs,expectedExit]of [['within',5,0],['over',650,1]]){
   const file=join(dir,label+'.test.mjs');
   writeFileSync(file,`import test from 'node:test';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
const FakeChatGPT={async start(){return {async close(){}}}};
const prepare=async()=>({});
const sourceJourney=async()=>delay(${delayMs});
const releaseJourney=async()=>delay(${delayMs});
const mkdtemp=async()=>'/synthetic-isolated-release';
const rm=async()=>{},execFileAsync=async()=>{};
const tmpdir=()=>'/synthetic',join=(...parts)=>parts.join('/');
`+launcher.replace('performance.now()+300000;','performance.now()+1000;'));
   const env={...process.env};delete env.NODE_TEST_CONTEXT;
   const result=spawnSync(process.execPath,['--test',file],{encoding:'utf8',timeout:8000,env});
   assert.ifError(result.error);
   assert.equal(result.status,expectedExit,label+' '+result.stdout+' '+result.stderr);
   assert.match(result.stdout,/# tests 2/);
   assert.match(result.stdout,/ok 1 - UIR-02 .*\(source\)/);
   if(label==='over'){
    assert.match(result.stdout,/not ok 2 - UIR-02 .*\(release\)/);
    assert.match(result.stdout,/testTimeoutFailure/);
   }else assert.match(result.stdout,/# pass 2/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
