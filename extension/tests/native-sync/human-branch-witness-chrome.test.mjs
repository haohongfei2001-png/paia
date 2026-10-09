import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';import {nativeHumanBranchWitnessFixture} from './human-branch-witness-fixture.mjs';
import {HUMAN_WITNESS_CASES,HUMAN_WITNESS_PATHS,HUMAN_WITNESS_PROOF_PATHS,assertHumanBranchWitnessReceipt} from './human-branch-witness-receipt.mjs';
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();let sourceProof;
const hashes=async(base,paths)=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(join(base,p))).digest('hex')])));
for(const variant of ['source','release'])test('private readonly Human branch witness actual native '+variant,{timeout:180000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-human-witness-')),output=join(root,'work/qa-bns-human-branch-witness'),receipt={schema:1,head,tree,variant,scope:'private-readonly-human-branch-semantic-witness',result:'IN_PROGRESS',productionActivation:false,retentionImplemented:null,writeCapability:false,fullRecovery:false,providerActivation:false,cases:[]};let extension,browser;await mkdir(output,{recursive:true});
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',join(directory,'release')],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(variant==='source'?root:join(directory,'release'));
  await writeFile(join(extension.path,'background/bns-human-witness-fixture.mjs'),nativeHumanBranchWitnessFixture(await readFile(join(root,'tests/human-branch-semantic-witness.test.mjs'),'utf8')));
  const worker=join(extension.path,'background/service-worker.js'),text=await readFile(worker,'utf8');assert.equal(text.split("import './bns-native-storage-fixture.mjs';").length,2);await writeFile(worker,text.replace("import './bns-native-storage-fixture.mjs';","import './bns-native-storage-fixture.mjs';\nimport './bns-human-witness-fixture.mjs';"));
  receipt.hashes=await hashes(extension.path,HUMAN_WITNESS_PATHS);receipt.proofHashes=await hashes(root,HUMAN_WITNESS_PROOF_PATHS);
  browser=await startNative(extension.path,{closeArchivePage:true});receipt.browserVersion=browser.browserVersion;
  const profile=await browser.call('human-branch-witness-runtime-profile');assert.deepEqual(Object.keys(profile),['retentionImplemented']);assert.equal(profile.retentionImplemented,true);receipt.retentionImplemented=profile.retentionImplemented;
  for(let index=0;index<HUMAN_WITNESS_CASES.length;index++){const result=await browser.call('human-branch-witness-case',{index});assert.equal(result.name,HUMAN_WITNESS_CASES[index]);receipt.cases.push(result);}
  receipt.isolation=await browser.isolation();receipt.result='PASS';const expectedHashes=await hashes(root,HUMAN_WITNESS_PATHS),expectedProofHashes=await hashes(root,HUMAN_WITNESS_PROOF_PATHS);assertHumanBranchWitnessReceipt(receipt,{head,tree,variant,expectedHashes,expectedProofHashes});
  const proof={names:receipt.cases.map(c=>c.name),hashes:receipt.hashes,proofHashes:receipt.proofHashes};if(variant==='source')sourceProof=proof;else assert.deepEqual(proof,sourceProof);
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();await rm(directory,{recursive:true,force:true});}
});
