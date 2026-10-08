import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fresh(device){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:device});return {s,core};}
async function all(core){const rows=[];for await(const op of core.outbox())rows.push(op);return rows;}

import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
async function producer(){const a=await fresh('checkpoint_producer');a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));return a;}
const cloud=()=>{const rows=new Map();return {async putImmutable(ref,bytes){rows.set(ref.id,bytes.slice());},async get(ref){return rows.get(ref.id)?.slice();}};};
const canonical=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].filter(name=>name!=='meta').map(async name=>[name,await t.all(name)]))));
test('AUDIT existing checkpoint fails closed for a real complete bootstrap, not a successful restore',async()=>{const a=await producer(),b=await fresh('checkpoint_receiver'),transport=cloud(),cp=await buildCheckpoint(a.core,transport),restore=new StagedSyncRestore(b.core),before=await canonical(b.s);await assert.rejects(restore.stageCheckpoint(cp.ref,ref=>transport.get(ref)),{code:'BNS_SOURCE_BOOTSTRAP_REQUIRED'});await assert.rejects(restore.activate(),{code:'BNS_RESTORE_NOT_READY'});assert.deepEqual(await canonical(b.s),before);assert.deepEqual(await b.core.state(),[]);assert.equal(await b.core.namespace(),'initial');});
test('AUDIT protocol-only committed staging receipts make the existing complete receive primitive duplicate',async()=>{const a=await producer(),b=await fresh('checkpoint_receiver'),stage=new BrowserNativeSyncCore(b.s.repository,{datasetId:a.core.datasetId,deviceId:'checkpoint_receiver',namespace:'synthetic_stage_namespace'}),ops=await all(a.core),prepared=await stage.prepareSourceBootstrapReceive(ops),before=await canonical(b.s);await stage.transaction(true,t=>stage.commitSourceBootstrapReceive(t,prepared,async()=>{}));let writes=0;const result=await stage.transaction(true,t=>stage.commitSourceBootstrapReceive(t,prepared,async()=>{writes++;}));assert.equal(result.state,'duplicate');assert.equal(writes,0);assert.deepEqual(await canonical(b.s),before);assert.equal(await b.core.namespace(),'initial');});
test('AUDIT protocol checkpoint is not an inventory of unjournaled canonical source',async()=>{const a=await fresh('checkpoint_producer');await a.s.capture(capture((await a.s.status()).epoch));const cp=await buildCheckpoint(a.core,cloud());assert.equal((await a.s.snapshot()).records.length,1);assert.deepEqual(cp.manifest.coverage,[]);assert.equal(cp.manifest.itemCount,0);});
