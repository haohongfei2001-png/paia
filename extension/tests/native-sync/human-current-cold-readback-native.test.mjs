import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,realpath} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {join,posix} from 'node:path';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {currentHumanWorkerFixture} from './current-human-worker-fixture.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const proofPaths=['manifest.json','package.json','background/service-worker.js','scripts/build_current_release.py','scripts/build_daily_use.py','scripts/package_assets.py','tests/native-sync/current-human-worker-fixture.mjs','tests/native-sync/human-current-cold-readback-native.test.mjs','tests/native-sync/current-scope-checkpoint-native-fixture.mjs','tests/native-sync/current-human-cold-readback-native-fixture.mjs','tests/native-sync/storage-harness.mjs','tests/native-sync/storage-worker-fixture.mjs','tests/native-sync/immutable-objects.mjs','tests/native-sync/proof-oracles.mjs','tests/harness/fake-chatgpt.mjs'];
async function snapshot(){const seen=new Set(),queue=[...proofPaths];
 while(queue.length){const path=queue.pop();if(seen.has(path))continue;seen.add(path);const text=await readFile(join(root,path),'utf8');
  if(path.endsWith('.py')){for(const m of text.matchAll(/^(?:from\s+(\w+)\s+import|import\s+(\w+))/gm)){const next='scripts/'+(m[1]||m[2])+'.py';try{await readFile(join(root,next));queue.push(next);}catch(error){if(error.code!=='ENOENT')throw error;}}}
  else if(/\.m?js$/.test(path))for(const re of [/(?:^|;)\s*(?:import\s*(?:[^;]*?\bfrom\s*)?|export\s+[^;]*?\bfrom\s*)(['"])(\.[^'"]+)\1/gm,/\bawait\s+import\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g])for(const m of text.matchAll(re)){
   const worker=path==='tests/native-sync/storage-worker-fixture.mjs',next=worker&&m[2]==='./bns-native-immutable-objects.mjs'?'tests/native-sync/immutable-objects.mjs':posix.normalize(posix.join(worker?'background':posix.dirname(path),m[2]));
   if(path==='background/service-worker.js')continue; // Actual worker bytes are bound separately; all core files are bound below.
   if(next.startsWith('tests/')&&/\.m?js$/.test(next))queue.push(next);
  }
 }
 const paths=[...seen];async function walk(path){for(const entry of await readdir(join(root,path),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())await walk(child);else paths.push(child);}}await walk('core');await walk('background');const hashes={};for(const path of paths.sort())hashes[path]=hash(await readFile(join(root,path)));const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();return {head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:git('status','--porcelain','--untracked-files=no'),hashes};}
let sourceProof;
for(const variant of ['source','release'])test('actual isolated MV3 cold destination Root and Topic DTO readback '+variant,{timeout:180000},async()=>{
 const before=await snapshot();assert.equal(before.dirty,'','freeze source/proof before evidence');const receipt={schema:1,variant,...before,result:'IN_PROGRESS',scope:'SYNTHETIC_CURRENT_HUMAN_MV3_COLD_CONSUMER_READBACK_ONLY',providerActivated:false,productionActivation:false,lostDeviceQualified:false};let extension,browser;
 try{
  extension=await instrumentedExtension(variant==='source'?root:await realpath(join(root,'work/current-release')));
  receipt.runtimeHashes={};for(const [path,digest]of Object.entries(before.hashes))if(path.startsWith('core/')||path.startsWith('background/')&&path!=='background/service-worker.js'){const emitted=hash(await readFile(join(extension.path,path)));assert.equal(emitted,digest,'exact original runtime '+path);receipt.runtimeHashes[path]=emitted;}
  receipt.generatedHashes={};for(const [kind,file]of [['recovery','current-human-cold-readback-native-fixture.mjs']]){const generated=currentHumanWorkerFixture(await readFile(join(root,'tests/native-sync',file),'utf8'),kind),name='bns-current-human-'+kind+'.mjs';await writeFile(join(extension.path,'background',name),generated);receipt.generatedHashes[name]=hash(generated);}
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8');assert.ok(original.startsWith("import './bns-native-storage-fixture.mjs';\n"));
  const instrumented=original.replace("import './bns-native-storage-fixture.mjs';\n","import './bns-native-storage-fixture.mjs';\nimport './bns-current-human-recovery.mjs';\n");await writeFile(worker,instrumented);receipt.instrumentedWorkerSha256=hash(instrumented);receipt.originalWorkerSha256=extension.originalWorkerSha256;
  const sourceWorker=await readFile(join(root,'background/service-worker.js'),'utf8'),releaseOmission="    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n";
  assert.equal(sourceWorker.split(releaseOmission).length,2,'exact approved release-only diagnostics omission');
  const expectedWorker=variant==='source'?sourceWorker:sourceWorker.replace(releaseOmission,'');
  assert.equal(receipt.originalWorkerSha256,hash(expectedWorker),'exact source or approved emitted worker bytes');
  assert.equal(original,"import './bns-native-storage-fixture.mjs';\n"+expectedWorker,'only test harness prelude differs');
  assert.equal(instrumented,"import './bns-native-storage-fixture.mjs';\nimport './bns-current-human-recovery.mjs';\n"+expectedWorker,'exact test instrumentation');
  browser=await startNative(extension.path,{closeArchivePage:true});receipt.browserVersion=browser.browserVersion;receipt.archivePageClosed=true;
  receipt.recoveryCases=await browser.call('current-human-worker-recovery');assert.equal(receipt.recoveryCases.status,'SYNTHETIC_NATIVE_CURRENT_HUMAN_RECOVERY_PASS_NOT_COMPLETE_SYNC',JSON.stringify(receipt.recoveryCases));assert.equal(receipt.recoveryCases.cases.length,5);assert.equal(receipt.recoveryCases.cases.slice(0,4).reduce((n,row)=>n+row.assertions,0),176);assert.equal(receipt.recoveryCases.cases.every(row=>row.result==='PASS'&&row.assertions>0),true);assert.equal(receipt.recoveryCases.localNativeRecovery,true);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
  assert.deepEqual(await snapshot(),before,'source/proof/git unchanged');const common={sourceHashes:before.hashes,runtimeHashes:receipt.runtimeHashes,generatedHashes:receipt.generatedHashes,recoveryNames:receipt.recoveryCases.cases.map(row=>[row.name,row.assertions])};if(variant==='source')sourceProof=common;else assert.deepEqual(common,sourceProof,'exact complete source/release runtime and cases');receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
 finally{const output=join(root,'work/qa-current-human-cold-readback');await mkdir(output,{recursive:true});await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await extension?.cleanup();}
});
