import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeQualifiedHumanRetirementFixture} from './qualified-human-retirement-fixture.mjs';
const files=['core/browser-native-sync/phased-human-reference-plan.js','core/browser-native-sync/checkpoint-manifest-storage.js','core/browser-native-sync/canonical-generation-copy-retirement.js','core/browser-native-sync/canonical-generation-phased-human.js','core/browser-native-sync/canonical-generation-task-ledger.js','core/thought-binding.js','core/browser-native-sync/canonical-generation-human-restore.js','core/browser-native-sync/human-library-group.js','core/browser-native-sync/human-library-plan.js','core/browser-native-sync/human-library-search-proof.js','core/ia-store-owner.js','core/library-documents-owner.js','core/browser-native-sync/saved-work-bootstrap.js','core/browser-native-sync/group-checkpoint-plan.js','core/browser-native-sync/group-checkpoint-scope.js','core/library-documents-store.js','core/idb-repository.js','core/indexed-store.js','core/thought-maintenance.js','core/source-purge-admission.js','core/browser-native-sync/core.js','core/browser-native-sync/group-checkpoint.js','core/browser-native-sync/canonical-generation-publication.js','core/browser-native-sync/canonical-generation-checkpoint-stage.js','core/browser-native-sync/source-purge-journal.js','core/browser-native-sync/source-purge-codec.js','core/browser-native-sync/source-purge-checkpoint.js'];
const sourceVectors=new Map();
const packages=[{name:"qualified-human-retirement",file:"qualified-human-cold-retirement.test.mjs",cases:5}];
for(const pkg of packages)for(const variant of ['source','release'])test('BNS generation/purge native '+pkg.name+' '+variant,{timeout:120000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-generation-purge-native-')),output=join(root,'work/qa-qualified-human-retirement-native/'+pkg.name);let extension,browser;
 const receipt={variant,scope:pkg.name,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),result:'IN_PROGRESS',fullSyncQualification:false,providerActivation:false};
 await mkdir(output,{recursive:true});
 try{
  const release=process.env.PAIA_NATIVE_RELEASE_PATH||join(directory,'release');
  if(variant==='release'){assert.equal(isAbsolute(release),true);if(!process.env.PAIA_NATIVE_RELEASE_PATH)execFileSync(process.env.PYTHON||'python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});}
  extension=await instrumentedExtension(variant==='source'?root:release);
  const owning=await readFile(join(root,'tests/'+pkg.file),'utf8');receipt.owningSha256=createHash('sha256').update(owning).digest('hex');
  await cp(join(root,'tests/native-sync/structural-correction-bridge.mjs'),join(extension.path,'background/generation-purge-assert.mjs'));
  await writeFile(join(extension.path,'background/generation-purge-fixture.mjs'),nativeQualifiedHumanRetirementFixture(owning,await readFile(join(root,'tests/harness/thought-m1.mjs'),'utf8'),pkg.name+'-matrix'));
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);await writeFile(worker,original.replace(marker,marker+"\nimport './generation-purge-fixture.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));
  if(variant==='source')sourceVectors.set(pkg.name,receipt.hashes);else assert.deepEqual(receipt.hashes,sourceVectors.get(pkg.name));
  browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;receipt.cases=await browser.call(pkg.name+'-matrix');assert.equal(receipt.cases.length,pkg.cases);assert.equal(new Set(receipt.cases).size,receipt.cases.length);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
