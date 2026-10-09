import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {RETENTION_SPECS,NATIVE_OWNER_EXTRA,retentionNativeFixture} from './retention-native-fixture.mjs';
import {assertRetentionNativeReceipt} from './retention-native-receipt.mjs';
const paths=['core/idb-repository.js','core/browser-native-sync/core.js','core/browser-native-sync/human-library-plan.js','core/browser-native-sync/human-library-journal.js'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),hashes=async(base,files)=>Object.fromEntries(await Promise.all(files.map(async path=>[path,sha(await readFile(join(base,path)))])));
let sourceProof;
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
for(const variant of ['source','release'])test('private Human retention complete real native '+variant,{timeout:180000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-retention-native-')),out=join(root,'work','qa-retention-native');await mkdir(out,{recursive:true});
 const receipt={schema:1,scope:'private-human-retention-native',head,variant,result:'IN_PROGRESS',cases:[],runtimeHashes:null,originalFixtures:RETENTION_SPECS,provider:false,productionRegistration:false};let extension,browser;
 try{
  const runtime=variant==='source'?root:join(directory,'release');if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',runtime],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(runtime);
  await writeFile(join(extension.path,'background/bns-retention-assert.mjs'),await readFile(new URL('./retention-assert.mjs',import.meta.url)));
  for(const [kind,spec]of Object.entries(RETENTION_SPECS))await writeFile(join(extension.path,'background/bns-retention-'+kind+'.mjs'),retentionNativeFixture(await readFile(join(root,'tests',spec.file),'utf8'),kind));
  const worker=join(extension.path,'background/service-worker.js'),source=await readFile(worker,'utf8'),anchor="import './bns-native-storage-fixture.mjs';";assert.equal(source.split(anchor).length,2);await writeFile(worker,source.replace(anchor,anchor+"\nimport './bns-retention-retention.mjs';\nimport './bns-retention-owner.mjs';"));
  receipt.runtimeHashes=await hashes(extension.path,paths);assert.deepEqual(receipt.runtimeHashes,await hashes(root,paths));
  receipt.fixtureHashes=await hashes(extension.path,['background/bns-retention-assert.mjs','background/bns-retention-retention.mjs','background/bns-retention-owner.mjs']);
  browser=await startNative(extension.path,{closeArchivePage:true});receipt.browserVersion=browser.browserVersion;
  for(const [suite,spec]of Object.entries(RETENTION_SPECS)){
   const names=[...spec.names,...(suite==='owner'?[NATIVE_OWNER_EXTRA]:[])];
   for(let index=0;index<names.length;index++){
    const value=await browser.call('human-retention-case',{suite,index});assert.equal(value.name,names[index]);assert.equal(value.result,'PASS');assert.equal(value.nativeFactory,true);assert.ok(value.assertions>0);receipt.cases.push(value);
   }
  }
  assert.equal(receipt.cases.length,28);assert.equal(new Set(receipt.cases.map(value=>value.suite+':'+value.index)).size,28);receipt.isolation=await browser.isolation();receipt.result='PASS';
  const currentHashes=await hashes(root,paths);assertRetentionNativeReceipt(receipt,{head,variant,runtimeHashes:currentHashes,fixtureHashes:receipt.fixtureHashes});
  const proof={runtimeHashes:receipt.runtimeHashes,fixtureHashes:receipt.fixtureHashes,names:receipt.cases.map(row=>row.suite+':'+row.name)};if(variant==='source')sourceProof=proof;else assert.deepEqual(proof,sourceProof);
 }catch(error){receipt.result='FAIL';receipt.error={name:error.name,message:error.message};throw error;}
 finally{await writeFile(join(out,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
