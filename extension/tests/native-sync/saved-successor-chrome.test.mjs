import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeSavedSuccessorFixture} from './saved-successor-fixture.mjs';
const files=['core/idb-repository.js','core/browser-native-sync/core.js','core/browser-native-sync/group-checkpoint.js','core/browser-native-sync/group-checkpoint-plan.js','core/browser-native-sync/group-checkpoint-scope.js','core/browser-native-sync/saved-work-bootstrap.js','core/browser-native-sync/saved-work-payload.js','core/browser-native-sync/saved-work-receive.js','core/browser-native-sync/source-bootstrap-receive.js','core/library-documents-store.js','core/indexed-store.js','core/browser-native-sync/saved-work-journal.js','core/browser-native-sync/saved-work-successor-codec.js','core/browser-native-sync/human-library-plan.js','core/thought-store-owner.js','core/thought-journal.js'];
let sourceVector;
for(const variant of ['source','release'])test('BNS saved AI typed successor native '+variant,{timeout:120000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-saved-group-native-')),output=join(root,'work/qa-bns-saved-successor-native');let extension,browser;
 const receipt={variant,scope:'finite-Source-plus-saved-AI-typed-successor-cold-recovery',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),result:'IN_PROGRESS',fullSyncQualification:false,providerActivation:false};
 await mkdir(output,{recursive:true});
 try{
  const release=process.env.PAIA_NATIVE_RELEASE_PATH||join(directory,'release');
  if(variant==='release'){assert.equal(isAbsolute(release),true);if(!process.env.PAIA_NATIVE_RELEASE_PATH)execFileSync(process.env.PYTHON||'python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});}
  extension=await instrumentedExtension(variant==='source'?root:release);
  const owning=await readFile(join(root,'tests/browser-native-sync-saved-successor.test.mjs'),'utf8');receipt.owningSha256=createHash('sha256').update(owning).digest('hex');
  await cp(join(root,'tests/native-sync/structural-correction-bridge.mjs'),join(extension.path,'background/bns-saved-successor-assert.mjs'));
  await writeFile(join(extension.path,'background/bns-saved-successor-fixture.mjs'),nativeSavedSuccessorFixture(owning));
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);await writeFile(worker,original.replace(marker,marker+"\nimport './bns-saved-successor-fixture.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));
  if(variant==='source')sourceVector=receipt.hashes;else assert.deepEqual(receipt.hashes,sourceVector);
  browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;receipt.cases=await browser.call('saved-successor-matrix');assert.equal(receipt.cases.length,38);assert.equal(new Set(receipt.cases).size,receipt.cases.length);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
