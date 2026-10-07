// Explicit native candidate only: synthetic bytes, no cloud/provider activation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {assertNetworkLedger,assertWorkerLifecycle} from './proof-oracles.mjs';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';

const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();
if(process.env.PAIA_TESTED_HEAD)assert.equal(head,process.env.PAIA_TESTED_HEAD);

for(const variant of ['source','release'])test('BNS publication native IndexedDB '+variant,{timeout:120000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'pipe'});
 const extension=await instrumentedExtension(variant==='source'?root:join(root,'work/current-release'));
 extension.hashes['core/browser-native-sync/publications.js']=createHash('sha256').update(await readFile(join(extension.path,'core/browser-native-sync/publications.js'))).digest('hex');
 let device;const evidence={schema:1,head,tree,variant,result:'IN_PROGRESS',productionHashes:extension.hashes,transport:'synthetic-in-memory',providerQualification:false,fullCanonicalRestore:false,restarts:[]};
 try{
  device=await startNative(extension.path);
  const name='publication_native',call=(command,args={})=>device.call('publication-'+command,{name,...args});
  assert.equal((await device.call('change',{name,text:'Synthetic durable publication 中文'})).ok,true);
  const prepared=await call('prepare');assert.equal(prepared.code,undefined);const publicationId=prepared.result.publicationId;
  let state=await call('state',{publicationId});const refs=state.row.objectRefs;assert.equal(state.row.state,'prepared');assert.equal(state.snapshot.outbox.length,1);
  assert.doesNotMatch(JSON.stringify(state.row),/Synthetic durable publication/);
  const cp=await call('checkpoint');assert.equal(cp.code,undefined);
  const restore={name,restoreId:'native_publication_restore',checkpointRef:cp.result,entries:cp.entries};
  await device.call('stage',restore);
  assert.equal((await device.call('activate',restore)).code,'BNS_RESTORE_PUBLICATION_PENDING');
  const unknown=await call('run',{publicationId,unknownUpload:true});assert.equal(unknown.code,'BNS_TRANSPORT_UNKNOWN');assert.equal(unknown.row.state,'unknown');assert.equal(unknown.snapshot.outbox.length,1);assert.equal(unknown.puts.length,1);
  evidence.restarts.push(await device.restart());
  state=await call('state',{publicationId});assert.equal(state.row.state,'unknown');assert.deepEqual(state.row.objectRefs,refs);assert.equal(state.pending.items.length,1);
  // Remote bytes outlive the worker solely in this Node fixture, not in its DB.
  const aborted=await call('run',{publicationId,entries:unknown.entries,abortAck:true});
  assert.equal(aborted.code,'BNS_TRANSPORT_UNKNOWN');assert.ok(aborted.gets.includes(unknown.puts[0]));assert.ok(!aborted.puts.includes(unknown.puts[0]),'unknown successful write must use readback, not reupload');
  assert.equal(aborted.snapshot.outbox.length,1);assert.equal(aborted.receipt,undefined);assert.equal(aborted.pending.items.length,1);
  evidence.restarts.push(await device.restart());
  state=await call('state',{publicationId});assert.equal(state.snapshot.outbox.length,1);assert.equal(state.receipt,undefined);
  const confirmed=await call('run',{publicationId,entries:aborted.entries});assert.equal(confirmed.code,undefined);assert.equal(confirmed.result.state,'confirmed');assert.deepEqual(confirmed.puts,[]);assert.deepEqual(confirmed.snapshot.outbox,[]);assert.deepEqual(confirmed.pending.items,[]);
  evidence.restarts.push(await device.restart());
  state=await call('state',{publicationId});assert.equal(state.row.state,'confirmed');assert.deepEqual(state.receipt,confirmed.receipt);assert.deepEqual(state.snapshot.outbox,[]);
  const retry=await call('run',{publicationId,entries:confirmed.entries});assert.equal(retry.code,undefined);assert.deepEqual(retry.puts,[]);assert.deepEqual(retry.gets,[]);
  const activated=await device.call('activate',restore);assert.equal(activated.ok,true);assert.equal(activated.snapshot.namespace,restore.restoreId);
  assert.equal((await call('prepare',{publicationId})).code,'BNS_BINDING_CHANGED');
  assert.equal((await call('run',{publicationId,entries:confirmed.entries})).code,'BNS_BINDING_CHANGED');
  evidence.isolation=await device.isolation();assert.equal(evidence.isolation.nativeFactory,true);assert.equal(evidence.isolation.networkAttempts,0);assert.equal(evidence.restarts.length,3);
  for(const event of evidence.restarts){assertWorkerLifecycle(event);assert.equal(event.phase.name,'restart-boundary');assert.equal(event.phase.hasNativeTransaction,false);}
  assertNetworkLedger(evidence.isolation.networkLedger,evidence.restarts);
  for(const event of evidence.restarts){const paused=evidence.isolation.networkLedger.observations.filter(value=>value.point==='paused-before-stop'&&value.lifetime===event.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(event.pausedNetwork,paused[0]);}
  assert.equal(evidence.isolation.httpRequests,0);evidence.result='PASS';
 }catch(error){evidence.result='FAIL';evidence.failure=error.message;throw error;}
 finally{await mkdir(join(root,'work/qa-bns-publication'),{recursive:true});await writeFile(join(root,'work/qa-bns-publication',variant+'.json'),JSON.stringify(evidence,null,2)+'\n');await device?.close();await extension.cleanup();}
});
