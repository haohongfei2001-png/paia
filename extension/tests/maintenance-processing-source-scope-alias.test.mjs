import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const repository=fileURLToPath(new URL('../../',import.meta.url)),root=join(repository,'extension');
const qualification='extension/core/ai-usage/maintenance-qualification.js',source='extension/core/ai-usage/maintenance-source-processing.js',sourceTest='services/ai-gateway/tests/maintenance-source-processing.test.mjs';
for(const mode of ['native alias','reader alias','reader copy','qualification permit alias','Session permit alias','associated consent alias'])test('real private source permit refuses '+mode+' before selected body reads and paid dispatch',{timeout:30000},async()=>{
 const copy=await mkdtemp(join(tmpdir(),'paia-source-original-permit-alias-'));
 try{
  await cp(root,join(copy,'extension'),{recursive:true});await cp(join(repository,'services'),join(copy,'services'),{recursive:true});
  const inside=mode.endsWith('permit alias')||mode==='associated consent alias',target=inside?source:qualification;
  const before=await readFile(join(copy,target),'utf8');let needle,injected;
  if(inside){
   const cases={
    'qualification permit alias':['readMaintenanceQualificationRequestPermit(permit,r.store,transaction,r.processing)','readMaintenanceQualificationRequestPermit(permit,r.store,ALIAS,r.processing)','transaction'],
    'Session permit alias':['readMaintenanceProcessingRequestPermit(qualified?.selectorPermit??permit,r.store,transaction,r.processing)','readMaintenanceProcessingRequestPermit(qualified?.selectorPermit??permit,r.store,ALIAS,r.processing)','transaction'],
    'associated consent alias':['assertMaintenanceProcessingConsentReceiptSnapshot(raw,store,original,f.selection.budget)','assertMaintenanceProcessingConsentReceiptSnapshot(raw,store,ALIAS,f.selection.budget)','original']
   };
   const [find,replacement,tx]=cases[mode];needle=find;assert.equal(before.split(needle).length,2);
   const alias=`(()=>{requireRepositoryTransactionScope(r.store.repository,${tx});globalThis.__paiaSourceAliasCalls++;return Object.create(${tx});})()`;
   const invoke=replacement.replace('ALIAS',alias);
   injected=before.replace(needle,mode==='qualification permit alias'?`(()=>{try{const result=${invoke};if(result===null)globalThis.__paiaSourceNullProbes++;else globalThis.__paiaSourcePermitReturned++;return result;}catch(error){globalThis.__paiaSourcePermitRejected++;throw error;}})()`:invoke);
  }else{needle=':processing.resolve(t,scope,permit));acquisition?.check();';assert.equal(before.split(needle).length,2);
  const value=mode==='native alias'?'Object.create(transaction)':mode==='reader alias'?'Object.create(t)':'{...t}';
  injected=before.replace(needle,`:processing.resolve((()=>{if(!permit)throw Error('original private permit missing');${mode==='native alias'?'requireRepositoryTransactionScope(store.repository,transaction);':''}globalThis.__paiaSourceAliasCalls++;return ${value};})(),scope,permit));acquisition?.check();`);
  }
  await writeFile(join(copy,target),injected);
  const originalTest=await readFile(join(copy,sourceTest),'utf8'),child=originalTest+`
test('actual source permit alias fixture',async t=>{
 globalThis.__paiaSourceAliasCalls=0;globalThis.__paiaSourceNullProbes=0;globalThis.__paiaSourcePermitRejected=0;globalThis.__paiaSourcePermitReturned=0;t.after(()=>{for(const key of ['__paiaSourceAliasCalls','__paiaSourceNullProbes','__paiaSourcePermitRejected','__paiaSourcePermitReturned'])delete globalThis[key];});
 const f=await sourceFixture(t),reads=semanticObserver(t),result=await runOriginal(t,f),observed={calls:globalThis.__paiaSourceAliasCalls,nullProbes:globalThis.__paiaSourceNullProbes,permitRejected:globalThis.__paiaSourcePermitRejected,permitReturned:globalThis.__paiaSourcePermitReturned,physical:f.physical(),semanticReads:reads(),state:result.state};
 t.diagnostic(JSON.stringify(observed));assert.equal(observed.calls,${mode==='qualification permit alias'?2:1},JSON.stringify(observed));assert.equal(observed.nullProbes,${mode==='qualification permit alias'?1:0},JSON.stringify(observed));assert.equal(observed.permitRejected,${mode==='qualification permit alias'?1:0},JSON.stringify(observed));assert.equal(observed.permitReturned,0,JSON.stringify(observed));assert.equal(observed.physical,0,JSON.stringify(observed));assert.equal(observed.semanticReads,0,JSON.stringify(observed));assert.notEqual(result.state,'COMMITTED');
});
`;
  await writeFile(join(copy,sourceTest),child);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1','--test-name-pattern=actual source permit alias fixture',sourceTest],{cwd:copy,encoding:'utf8',timeout:20000,env});
  if(process.env.PAIA_SELECTOR_ALIAS_EVIDENCE){const out=process.env.PAIA_SELECTOR_ALIAS_EVIDENCE;await mkdir(out,{recursive:true});const key=mode.replaceAll(' ','-');await writeFile(join(out,key+'.tap'),result.stdout+result.stderr);await writeFile(join(out,key+'.runtime.js'),injected);await writeFile(join(out,key+'.source-test.mjs'),child);await writeFile(join(out,key+'.json'),JSON.stringify({mode,command:[process.execPath,'--test','--test-reporter=tap','--test-concurrency=1','--test-name-pattern=actual source permit alias fixture',sourceTest],removedRunnerContext:true,status:result.status,error:result.error?.code??null,originalRuntimeSha256:createHash('sha256').update(before).digest('hex'),injectedRuntimeSha256:createHash('sha256').update(injected).digest('hex'),originalTestSha256:createHash('sha256').update(originalTest).digest('hex'),target,changedPaths:[target,sourceTest]},null,2)+'\n');}
  assert.equal(result.status,0,result.stdout+result.stderr);assert.equal(result.error,undefined);
  assert.match(result.stdout,/# tests 1\r?\n/);assert.match(result.stdout,/# pass 1\r?\n/);assert.match(result.stdout,/# fail 0\r?\n/);assert.match(result.stdout,/# skipped 0\r?\n/);assert.doesNotMatch(result.stderr,/recursively|skipping running files/);
  const observedLine=result.stdout.split('\n').find(line=>line.startsWith('# {"calls":'));assert.ok(observedLine,result.stdout);const observed=JSON.parse(observedLine.slice(2));assert.equal(observed.calls,mode==='qualification permit alias'?2:1);assert.equal(observed.nullProbes,mode==='qualification permit alias'?1:0);assert.equal(observed.permitRejected,mode==='qualification permit alias'?1:0);assert.equal(observed.permitReturned,0);assert.equal(observed.physical,0);assert.equal(observed.semanticReads,0);
 }finally{await rm(copy,{recursive:true,force:true});}
});
