// Pure Core lifecycle proof only: synthetic no-op restore owner, no production
// Prompt purge/restore qualification and no cloud/provider activation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();
if(process.env.PAIA_TESTED_HEAD)assert.equal(head,process.env.PAIA_TESTED_HEAD);
for(const variant of ['source','release'])test('BNS obsolete retirement pure Core native '+variant,{timeout:120000},async()=>{
 const releaseOutput=await mkdtemp(join(tmpdir(),'paia-bns-retirement-release-'));let extension,device;
 const receipt={schema:1,head,tree,variant,result:'IN_PROGRESS',productionHashes:{},scope:'pure-Core-synthetic-restore-owner',productionPromptPurgeRestore:false,providerQualification:false,performedDeletion:false,restarts:[]};
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',join(releaseOutput,'release')],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(variant==='source'?root:join(releaseOutput,'release'));
  extension.hashes['core/browser-native-sync/publications.js']=createHash('sha256').update(await readFile(join(extension.path,'core/browser-native-sync/publications.js'))).digest('hex');
  receipt.productionHashes=extension.hashes;
  device=await startNative(extension.path);const name='retirement_native',call=(command,args={})=>device.call('retirement-'+command,{name,...args});
  const setup=await call('setup');assert.equal(setup.code,undefined);const publicationId=setup.result.publicationId;
  const before=await call('state');assert.equal(before.pending.items[0].state,'obsolete');assert.deepEqual(before.retained.items,[]);assert.equal(before.outbox.length,1);assert.equal(before.outbox[0].kind,'purge');
  const cp=await call('checkpoint');assert.equal(cp.code,undefined);const restore={checkpointRef:cp.result,entries:cp.entries,restoreId:'native_retirement_restore'};
  assert.equal((await call('activate',restore)).code,'BNS_RESTORE_PUBLICATION_PENDING');
  const abort=await call('retire',{publicationId,abort:true});assert.ok(abort.code);assert.deepEqual(abort.pending,before.pending);assert.deepEqual(abort.retained,before.retained);assert.deepEqual(abort.outbox,before.outbox);
  receipt.restarts.push(await device.restart());const afterAbort=await call('state');assert.deepEqual(afterAbort.pending,before.pending);assert.deepEqual(afterAbort.retained,before.retained);
  const retired=await call('retire',{publicationId});assert.equal(retired.code,undefined);assert.equal(retired.result.state,'retained_unproven');assert.equal(retired.result.performedDeletion,false);assert.deepEqual(retired.pending.items,[]);assert.deepEqual(retired.outbox,before.outbox);assert.ok(retired.result.objectRefs.length);assert.doesNotMatch(JSON.stringify(retired.retained),/Synthetic pure Core obsolete body/);
  receipt.restarts.push(await device.restart());assert.deepEqual((await call('state')).retained,retired.retained);
  const activated=await call('activate',restore);assert.equal(activated.code,undefined);assert.equal(activated.namespace,restore.restoreId);assert.equal(activated.state[0].purged,true);
  receipt.restarts.push(await device.restart());const restored=await call('state');assert.equal(restored.namespace,restore.restoreId);assert.deepEqual(restored.retained,retired.retained);assert.equal(restored.state[0].purged,true);
  assert.equal((await call('old-id',{publicationId})).code,'BNS_BINDING_CHANGED');
  receipt.isolation=await device.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.httpRequests,0);assert.equal(receipt.isolation.networkAttempts,0);
  assert.equal(receipt.restarts.length,3);for(const event of receipt.restarts)assertWorkerLifecycle(event);assertNetworkLedger(receipt.isolation.networkLedger,receipt.restarts);
  receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.failure=error.message;throw error;}
 finally{try{await mkdir(join(root,'work/qa-bns-retirement'),{recursive:true});await writeFile(join(root,'work/qa-bns-retirement',variant+'.json'),JSON.stringify(receipt,null,2)+'\n');}finally{try{await device?.close();}finally{try{await extension?.cleanup();}finally{await rm(releaseOutput,{recursive:true,force:true});}}}}
});
