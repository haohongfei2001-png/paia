import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {nativeInputWorkingFixture} from './input-working-fixture.mjs';
const files=['core/indexed-store.js','core/ia-store.js','core/smart-filter-store.js','core/browser-native-sync/input-working-journal.js','core/browser-native-sync/filter-intent-journal.js','core/browser-native-sync/codecs.js'];
let sourceProof;
for(const variant of ['source','release'])test('BNS publication-only Working atomic owner native '+variant,{timeout:240000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-working-native-')),receipt={variant,result:'IN_PROGRESS',productionActivation:false,remoteMaterializer:false,fullRecovery:false};let extension,browser;
 const output=join(root,'work/qa-bns-input-working');await mkdir(output,{recursive:true});
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',join(directory,'release')],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(variant==='source'?root:join(directory,'release'));
  const fixture=nativeInputWorkingFixture(await readFile(join(root,'tests/browser-native-sync-input-working.test.mjs'),'utf8'),await readFile(join(root,'tests/harness/thought-m1.mjs'),'utf8'));
  await writeFile(join(extension.path,'background/bns-input-working-fixture.mjs'),fixture);
  const worker=join(extension.path,'background/service-worker.js'),text=await readFile(worker,'utf8');assert.ok(text.includes("import './bns-native-storage-fixture.mjs';"));await writeFile(worker,text.replace("import './bns-native-storage-fixture.mjs';","import './bns-native-storage-fixture.mjs';\nimport './bns-input-working-fixture.mjs';"));
  receipt.hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(join(extension.path,file))).digest('hex')])));
  browser=await startNative(extension.path);receipt.cases=await browser.call('input-working-matrix');assert.equal(receipt.cases.length,12);assert.equal(new Set(receipt.cases).size,12);
  const before=await browser.call('working-durable-create');assert.equal(before.filterIntents.length,1);assert.ok(before.blocks.some(row=>row.value.note==='Synthetic durable Working note'));receipt.restart=await browser.restart();assert.deepEqual(await browser.call('working-durable-read'),before);
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);
  const proof={cases:receipt.cases,hashes:receipt.hashes};if(variant==='source')sourceProof=proof;else assert.deepEqual(proof,sourceProof);receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
