import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {packOperations,publishObjects,readSegmentDescriptor} from '../core/browser-native-sync/segments.js';
import {planCompaction} from '../core/browser-native-sync/compaction.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='SYNTHETIC_group_compaction';
async function device(t,id){const store=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db?.close());return {store,core:new BrowserNativeSyncCore(store.repository,{datasetId,deviceId:id})};}
function working(d){d.store.filterIntentJournal=new FilterIntentSyncJournal(d.core);d.store.inputWorkingJournal=new InputWorkingSyncJournal(d.core,{filterJournal:d.store.filterIntentJournal,logicalCommits:true});}
async function ops(core){const result=[];for await(const row of core.rows('revision'))result.push(row.operation);return result;}
async function fixture(t){
 const a=await device(t,'SYNTHETIC_sender'),objects=new Map(),transport={async putImmutable(ref,raw){const old=objects.get(ref.id);if(old)assert.deepEqual(old,raw);objects.set(ref.id,raw.slice());},async get(ref){const raw=objects.get(ref.id);if(!raw)throw Error('SYNTHETIC object absent');return raw.slice();}};
 a.store.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.store.capture(capture((await a.store.status()).epoch));const first=await buildCheckpoint(a.core,transport,{grouped:{store:a.store}});working(a);const input=(await a.store.snapshot()).library.blocks[0];await inputEdit(a.store,input.id,{note:'SYNTHETIC retained note 中文'});
 const second=await buildCheckpoint(a.core,transport,{grouped:{store:a.store},parents:[first.ref.id]}),coveredOps=await ops(a.core),covered=await publishObjects(packOperations(coveredOps,{datasetId,producer:a.core.deviceId}),transport),expected=await a.store.snapshot();
 await inputEdit(a.store,input.id,{note:'SYNTHETIC uncovered later note'});const tailOps=(await ops(a.core)).filter(op=>!coveredOps.some(old=>old.revisionId===op.revisionId)),tail=await publishObjects(packOperations(tailOps,{datasetId,producer:a.core.deviceId}),transport),third=await buildCheckpoint(a.core,transport,{grouped:{store:a.store},parents:[second.ref.id]}),latest=await a.store.snapshot();
 a.store.repository.db.close();a.store.repository.db=null;
 const stage=async(cp,id)=>{const d=await device(t,id),restore=new StagedSyncRestore(d.core,{grouped:{store:d.store}});await restore.stageCheckpoint(cp.ref,ref=>transport.get(ref));return {...d,restore};};
 const old=await stage(first,'SYNTHETIC_older'),next=await stage(second,'SYNTHETIC_newer');return {a,objects,transport,first,second,third,coveredOps,covered,tailOps,tail,expected,latest,stage,old,next,options:{older:old.restore,newer:next.restore,descriptors:[...covered,...tail],get:ref=>transport.get(ref)}};
}
// Actual deletion exists only in this in-memory test cloud. No production
// transport deletion API or cloud execution is introduced by this test.
function collect(objects,plan,{stopAfter=Infinity}={}){const deleted=[];for(const ref of plan.eligible){if(deleted.length===stopAfter)return {state:'interrupted',deleted,remaining:plan.eligible.slice(deleted.length)};if(objects.delete(ref.id))deleted.push(ref.id);}return {state:'complete',deleted,remaining:[]};}
test('grouped compaction consumes actual original-owner graphs, closes A, collects covered objects and restores B',async t=>{
 const f=await fixture(t),plan=await planCompaction(f.options);assert.equal(plan.performedDeletion,false);assert.ok(plan.eligible.some(ref=>ref.id===f.covered[0].id));assert.ok(plan.retained.some(row=>row.descriptor===f.tail[0].id&&row.reason==='uncovered_tail'));
 const receipt=collect(f.objects,plan);assert.equal(receipt.state,'complete');assert.ok(receipt.deleted.length);assert.equal(f.a.store.repository.db,null);assert.ok(f.objects.has(f.first.ref.id));assert.ok(f.objects.has(f.second.ref.id));assert.deepEqual(await readSegmentDescriptor(f.tail[0],ref=>f.transport.get(ref),{datasetId}),f.tailOps);
 const b=await f.stage(f.second,'SYNTHETIC_recovered');await b.restore.activate();assert.deepEqual((await b.store.snapshot()).records,f.expected.records);assert.deepEqual((await b.store.snapshot()).library.blocks,f.expected.library.blocks);
 // A returning stale checkpoint may not overwrite an already populated device.
 const stale=new StagedSyncRestore(b.core,{grouped:{store:b.store}});await stale.stageCheckpoint(f.first.ref,ref=>f.transport.get(ref));await assert.rejects(stale.activate());assert.deepEqual((await b.store.snapshot()).library.blocks,f.expected.library.blocks);
 working(b);const input=(await b.store.snapshot()).library.blocks[0];await inputEdit(b.store,input.id,{note:'SYNTHETIC B edit after collection'});const successor=await buildCheckpoint(b.core,f.transport,{grouped:{store:b.store},parents:[f.second.ref.id]}),c=await f.stage(successor,'SYNTHETIC_successor');await c.restore.activate();assert.deepEqual((await c.store.snapshot()).library.blocks,(await b.store.snapshot()).library.blocks);
});
test('active restore pin protects its complete covered object closure',async t=>{const f=await fixture(t),plan=await planCompaction({...f.options,pinned:[f.covered[0].id]});assert.deepEqual(plan.eligible,[]);assert.ok(plan.retained.some(row=>row.reason==='active_restore_pin'));assert.equal(collect(f.objects,plan).deleted.length,0);assert.deepEqual(await readSegmentDescriptor(f.covered[0],ref=>f.transport.get(ref),{datasetId}),f.coveredOps);});
test('partial fake collection leaves both complete generations and unpublished tail usable after restart',async t=>{const f=await fixture(t),plan=await planCompaction(f.options);assert.ok(plan.eligible.length>1);const partial=collect(f.objects,plan,{stopAfter:1});assert.equal(partial.state,'interrupted');assert.equal(partial.deleted.length,1);assert.ok(partial.remaining.length);for(const [cp,expected,id]of [[f.first,null,'SYNTHETIC_restart_old'],[f.second,f.expected,'SYNTHETIC_restart_new']]){const b=await f.stage(cp,id);await b.restore.activate();if(expected)assert.deepEqual((await b.store.snapshot()).library.blocks,expected.library.blocks);else assert.equal((await b.store.snapshot()).records.length,1);}assert.deepEqual(await readSegmentDescriptor(f.tail[0],ref=>f.transport.get(ref),{datasetId}),f.tailOps);});
test('grouped tail reconciliation during planning invalidates the previous retention proof',async t=>{const f=await fixture(t);let changed=false;const before=new Set(f.objects.keys());await assert.rejects(planCompaction({...f.options,get:async ref=>{if(!changed){changed=true;await f.next.restore.reconcileTail(f.tailOps,{ref:f.third.ref,get:r=>f.transport.get(r)});}return f.transport.get(ref);}}),{code:'BNS_COMPACTION_UNVERIFIED'});assert.deepEqual(new Set(f.objects.keys()),before);assert.equal((await f.next.restore.stage.read('restore')).manifestId,f.third.ref.id);});
test('grouped compaction refuses missing staged items rather than treating empty receipts as covered',async t=>{const f=await fixture(t),stage=f.next.restore.stage,row=(await stage.rows('groupItem').next()).value;await stage.transaction(true,t=>t.delete('meta',row.id),['meta']);const before=new Set(f.objects.keys());await assert.rejects(planCompaction(f.options),{code:'BNS_COMPACTION_UNVERIFIED'});assert.deepEqual(new Set(f.objects.keys()),before);});

test('change during the last remote manifest verification is caught before returning a collection plan',async t=>{
 const f=await fixture(t);let currentReads=0,changed=false;const before=new Set(f.objects.keys());
 await assert.rejects(planCompaction({...f.options,get:async ref=>{if(ref.id===f.second.ref.id&&++currentReads===2){changed=true;await f.next.restore.reconcileTail(f.tailOps,{ref:f.third.ref,get:r=>f.transport.get(r)});}return f.transport.get(ref);}}),{code:'BNS_COMPACTION_UNVERIFIED'});
 assert.equal(changed,true);assert.deepEqual(new Set(f.objects.keys()),before);
});
