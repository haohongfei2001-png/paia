import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeTopicFormationFixture,nativeTopicFormationSetup} from './topic-formation-fixture.mjs';
const files=['core/topic-formation.js','core/topic-formation-terminal.js','core/topic-formation-evidence.js','core/topic-formation-policy.js','core/topic-identity.js','core/topic-retrieval.js','core/browser-native-sync/topic-formation-codec.js','core/browser-native-sync/topic-formation-journal.js','core/browser-native-sync/human-library-allocation.js','core/backup-service.js','core/browser-native-sync/core.js','core/browser-native-sync/codecs.js','core/browser-native-sync/topic-activity-codec.js','core/browser-native-sync/topic-activity-journal.js','core/topic-lifecycle.js','core/topic-lifecycle-consumer.js','core/topic-lifecycle-activity.js','core/topic-lifecycle-entry-metadata.js','core/topic-lifecycle-policy.js','core/idb-repository.js','core/indexed-store.js','core/library-documents-owner.js','core/thought-store-owner.js','core/ia-store-owner.js','core/thought-journal.js','core/thought-read-index.js','core/topic-processing.js','core/topic-processing-authority.js'];
const sha=value=>createHash('sha256').update(value).digest('hex');
let sourceVector;
for(const variant of ['source','release'])test('original Topic Formation causal Sync native '+variant,{timeout:180000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-formation-native-')),output=join(root,'work/qa-topic-formation-native');let extension,browser;
 const receipt={variant,scope:'explicit-existing-Topic-Formation-and-causal-activity-local-only',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),result:'IN_PROGRESS',schedulerActivated:false,syncEnabled:false};await mkdir(output,{recursive:true});
 try{
  const release=process.env.PAIA_NATIVE_RELEASE_PATH||join(directory,'release');
  if(variant==='release'){assert.equal(isAbsolute(release),true);if(!process.env.PAIA_NATIVE_RELEASE_PATH)execFileSync(process.env.PYTHON||'python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});}
  extension=await instrumentedExtension(variant==='source'?root:release);
  const owning=await readFile(join(root,'tests/topic-formation-sync.test.mjs'),'utf8');receipt.owningSha256=sha(owning);
  await writeFile(join(extension.path,'background/topic-lifecycle-native.mjs'),nativeTopicFormationFixture(owning));
  await mkdir(join(extension.path,'background/harness'),{recursive:true});
  const setup=await readFile(join(root,'tests/harness/thought-m1.mjs'),'utf8');receipt.originalSetupSha256=sha(setup);
  await writeFile(join(extension.path,'background/harness/thought-m1.mjs'),nativeTopicFormationSetup(setup));
  for(const name of ['topic-02.mjs','topic-03.mjs','historical-backup.mjs'])await cp(join(root,'tests/harness',name),join(extension.path,'background/harness',name));
  await cp(join(root,'tests/native-sync/retention-assert.mjs'),join(extension.path,'background/lifecycle-native-assert.mjs'));
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);await writeFile(worker,original.replace(marker,marker+"\nimport './topic-lifecycle-native.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(join(extension.path,file)))])));
  receipt.originalHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(join(root,file)))])));assert.deepEqual(receipt.hashes,receipt.originalHashes);
  if(variant==='source')sourceVector=receipt.hashes;else assert.deepEqual(receipt.hashes,sourceVector);
  browser=await startNative(extension.path,{closeArchivePage:true});receipt.browserVersion=browser.browserVersion;receipt.cases=await browser.call('topic-lifecycle-native-matrix');
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
  assert.equal(receipt.cases.length,26);assert.equal(new Set(receipt.cases.map(item=>item.name)).size,26);assert.deepEqual(receipt.cases.filter(item=>item.state!=='PASS'),[]);
  receipt.afterHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(join(root,file)))])));assert.deepEqual(receipt.afterHashes,receipt.originalHashes);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
