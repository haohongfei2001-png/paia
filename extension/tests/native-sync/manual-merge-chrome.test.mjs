import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeManualMergeFixture} from './manual-merge-fixture.mjs';
const files=['core/idb-repository.js','core/browser-native-sync/core.js','core/browser-native-sync/group-checkpoint.js','core/browser-native-sync/group-checkpoint-plan.js','core/browser-native-sync/group-checkpoint-scope.js','core/browser-native-sync/manual-merge-terminal.js','core/browser-native-sync/recovery-session.js','core/browser-native-sync/manual-owners.js','core/browser-native-sync/prompt-journal.js','core/browser-native-sync/context-journal.js'];
let sourceVector;
for(const variant of ['source','release'])test('BNS nonempty finite manual recovery native '+variant,{timeout:120000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-manual-merge-native-')),output=join(root,'work/qa-bns-manual-merge-native');let extension,browser;
 const receipt={variant,scope:'finite-manual-Context-Prompt-only-nonempty-merge',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),result:'IN_PROGRESS',fullSyncQualification:false,providerActivation:false};
 await mkdir(output,{recursive:true});
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',join(directory,'release')],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(variant==='source'?root:join(directory,'release'));
  const owning=await readFile(join(root,'tests/browser-native-sync-nonempty-manual-recovery.test.mjs'),'utf8');receipt.owningSha256=createHash('sha256').update(owning).digest('hex');
  await writeFile(join(extension.path,'background/bns-manual-merge-fixture.mjs'),nativeManualMergeFixture(owning));
  const worker=join(extension.path,'background/service-worker.js'),original=await readFile(worker,'utf8'),marker="import './bns-native-storage-fixture.mjs';";assert.equal(original.split(marker).length,2);await writeFile(worker,original.replace(marker,marker+"\nimport './bns-manual-merge-fixture.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));
  if(variant==='source')sourceVector=receipt.hashes;else assert.deepEqual(receipt.hashes,sourceVector);
  browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;receipt.cases=await browser.call('manual-merge-matrix');assert.equal(receipt.cases.length,22);assert.equal(new Set(receipt.cases).size,22);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
