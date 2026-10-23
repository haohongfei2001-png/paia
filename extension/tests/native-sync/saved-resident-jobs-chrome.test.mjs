import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeSavedResidentJobsFixture} from './saved-resident-jobs-fixture.mjs';
const files=['core/browser-native-sync/saved-work-bootstrap.js','core/browser-native-sync/group-checkpoint.js','core/browser-native-sync/group-checkpoint-plan.js','core/browser-native-sync/group-checkpoint-scope.js','core/browser-native-sync/human-library-scope.js','core/browser-native-sync/human-library-group.js','core/browser-native-sync/human-library-plan.js','core/browser-native-sync/human-library-journal.js','core/browser-native-sync/saved-work-journal.js','core/browser-native-sync/saved-work-successor-codec.js','core/browser-native-sync/source-working-physical.js','core/idb-repository.js','core/indexed-store.js','core/library-documents-owner.js','core/organizer/store-owner.js','core/ai-usage/delta.js','core/ai-usage/semantic-invalidation.js','core/ai-usage/domain-result-receipt.js','core/ai-usage/foundation.js'];
const sourceVectors=new Map();
const packages=[{name:'saved-resident-jobs',file:'browser-native-sync-saved-resident-jobs.test.mjs',cases:18}];
for(const pkg of packages)for(const variant of ['source','release'])test('BNS mixed Saved resident jobs native '+pkg.name+' '+variant,{timeout:120000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-saved-resident-jobs-native-')),output=join(root,'work/qa-saved-resident-jobs-native/'+pkg.name);let extension,browser;
 const receipt={variant,scope:pkg.name,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),result:'IN_PROGRESS',fullSyncQualification:false,providerActivation:false};
 await mkdir(output,{recursive:true});
 try{
  const release=process.env.PAIA_NATIVE_RELEASE_PATH||join(directory,'release');
  if(variant==='release'){assert.equal(isAbsolute(release),true);if(!process.env.PAIA_NATIVE_RELEASE_PATH)execFileSync(process.env.PYTHON||'python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});}
  extension=await instrumentedExtension(variant==='source'?root:release);
  const owning=await readFile(join(root,'tests/'+pkg.file),'utf8');receipt.owningSha256=createHash('sha256').update(owning).digest('hex');
  await cp(join(root,'tests/native-sync/structural-correction-bridge.mjs'),join(extension.path,'background/generation-purge-assert.mjs'));
  await writeFile(join(extension.path,'background/saved-resident-jobs-fixture.mjs'),nativeSavedResidentJobsFixture(owning,await readFile(join(root,'tests/harness/thought-m1.mjs'),'utf8')));
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);await writeFile(worker,original.replace(marker,marker+"\nimport './saved-resident-jobs-fixture.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));
  if(variant==='source')sourceVectors.set(pkg.name,receipt.hashes);else assert.deepEqual(receipt.hashes,sourceVectors.get(pkg.name));
  browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;receipt.cases=await browser.call(pkg.name+'-matrix');assert.equal(receipt.cases.length,pkg.cases);assert.equal(new Set(receipt.cases).size,receipt.cases.length);
  receipt.hashesAfter=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));assert.deepEqual(receipt.hashesAfter,receipt.hashes);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
