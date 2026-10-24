import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {createOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,tightenOriginalRecoveryWork,finishOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork} from '../core/idb-repository.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='SYNTHETIC_causal_tail';
async function device(t,id,old=null){
 const storage=old?.storage??local(),factory=old?.factory??new IDBFactory(),s=new LibraryFoundationStore(storage,{indexedDB:factory});
 if(!old)await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());
 const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:id});return {s,core,storage,factory,id};
}
async function cold(t,f){await f.s.repository.close();return device(t,f.id,f);}
const full=f=>f.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async table=>[table,await tx.all(table)]))));
const cutState=(f,id)=>new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:f.id,namespace:id}).read('restore');
const rows=async(core,kind)=>{const result=[];for await(const row of core.rows(kind))result.push(row);return result;};
const session=(f,transport,options={})=>new LocalSyncRecoverySession(f.core,{store:f.s,transport,...options});
async function fixture(t,{count=3,negative=false,bodyBytes=0}={}){
 assert.ok(bodyBytes===0||bodyBytes===64*1024,'single synthetic 64 KiB body is the only byte-boundary case');
 assert.ok(count>=1&&count<=3,'only one Source and at most two Working successors');
 const a=await device(t,'SYNTHETIC_tail_A'),b=await device(t,'SYNTHETIC_tail_B'),objects=new Map();
 const transport={async putImmutable(ref,raw){const old=objects.get(ref.id);if(old)assert.deepEqual(old,raw);objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
 a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch,'m1-synthetic-message-001','Synthetic explicit working input'+'x'.repeat(bodyBytes)));
 const cuts=[await buildCheckpoint(a.core,transport,{grouped:{store:a.s}})];
 if(negative){a.s.sourcePurgeJournal=new SourcePurgeJournal(a.core);await a.s.purge((await a.s.snapshot()).records[0].id,true);await a.s.drainPurgeCleanup();cuts.push(await buildCheckpoint(a.core,transport,{grouped:{store:a.s,sourcePurgeProjection:true},parents:[cuts[0].ref.id]}));}
 else{
  a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});
  for(let n=1;n<count;n++){await inputEdit(a.s,(await a.s.snapshot()).library.blocks[0].id,{note:'SYNTHETIC retained causal note '+n+' 中文'});cuts.push(await buildCheckpoint(a.core,transport,{grouped:{store:a.s},parents:[cuts.at(-1).ref.id]}));}
 }
 const expected=await a.s.snapshot(),revisions=await rows(a.core,'revision');await a.s.repository.close();
 transport.listCheckpoints=async()=>({items:cuts.map(c=>c.ref).reverse(),nextCursor:null});return {a,b,objects,transport,cuts,expected,revisions};
}
async function assertRestored(f,target){
 const actual=await target.s.snapshot();assert.deepEqual(actual.records,f.expected.records);assert.deepEqual(actual.library.blocks,f.expected.library.blocks);
 assert.deepEqual((await rows(target.core,'revision')).map(r=>r.operation).sort((a,b)=>a.revisionId.localeCompare(b.revisionId)),f.revisions.map(r=>r.operation).sort((a,b)=>a.revisionId.localeCompare(b.revisionId)));
 for(const {operation:op}of f.revisions)assert.equal((await target.core.read('receipt',op.operationId)).digest,op.revisionId);
 assert.deepEqual(await rows(target.core,'outbox'),[],'remote application emits no local echo');
}

test('stage/recover consumes a direct authenticated successor through the original tail owner and activates once',async t=>{
 const f=await fixture(t,{count:2});let activations=0;const s=session(f.b,f.transport,{checkpoint:async phase=>{if(phase==='after-activation')activations++;}});
 await s.stage(f.cuts[0].ref);const staged=await full(f.b);await s.stage(f.cuts[1].ref);assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.cuts[1].ref.id);assert.deepEqual((await full(f.b)).records,staged.records);assert.equal(activations,0);
 await s.recover(f.cuts[1].ref);assert.equal(activations,1);await assertRestored(f,f.b);const settled=await full(f.b);await s.continueStored();assert.deepEqual(await full(f.b),settled);assert.equal(activations,1);assert.equal(f.a.s.repository.db,null);
});
test('fresh store and session reopen the original validated cut before consuming its successor',async t=>{
 const f=await fixture(t,{count:2}),first=session(f.b,f.transport);await first.stage(f.cuts[0].ref);const b=await cold(t,f.b),s=session(b,f.transport,{restoreId:first.restoreId});
 await s.recover(f.cuts[1].ref);await assertRestored(f,b);assert.equal((await cutState(b,s.restoreId)).manifestId,f.cuts[1].ref.id);
});
for(const mode of ['recoverDiscovered','discover then recover'])test(mode+' follows the complete listed parent chain with one final activation',async t=>{
 const f=await fixture(t);let tails=0,activations=0;const s=session(f.b,f.transport,{checkpoint:async phase=>{if(phase==='reconciled-tail')tails++;if(phase==='after-activation')activations++;}});await s.stage(f.cuts[0].ref);
 if(mode==='recoverDiscovered')await s.recoverDiscovered();else await s.recover(await s.discover());
 assert.equal(tails,2);assert.equal(activations,1);await assertRestored(f,f.b);
});
test('a skipped or unavailable checkpoint parent is not invented from revision inclusion',async t=>{
 const f=await fixture(t),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[2].ref),{code:'BNS_GROUP_TAIL_INVALID'});assert.deepEqual(await full(f.b),before);
 f.transport.listCheckpoints=async()=>({items:[f.cuts[0].ref,f.cuts[2].ref],nextCursor:null});await assert.rejects(s.recoverDiscovered(),{code:'BNS_RECOVERY_MULTIPLE_CHECKPOINTS'});assert.deepEqual(await full(f.b),before);
});
test('a claimed successor which drops retained revisions preserves every prior stage and canonical row',async t=>{
 const f=await fixture(t),s=session(f.b,f.transport);await s.stage(f.cuts[1].ref);const forged=await protocolObject('checkpoint-manifest',bytes({...f.cuts[0].manifest,parents:[f.cuts[1].ref.id]}));await f.transport.putImmutable(forged.ref,forged.bytes);const before=await full(f.b);
 await assert.rejects(s.recover(forged.ref),{code:'BNS_GROUP_TAIL_INVALID'});assert.deepEqual(await full(f.b),before);
});
test('genuine incomparable checkpoint heads remain rejected even when one cut contains more revisions',async t=>{
 const f=await fixture(t,{count:2}),fork=await protocolObject('checkpoint-manifest',bytes({...f.cuts[1].manifest,parents:[]}));await f.transport.putImmutable(fork.ref,fork.bytes);f.transport.listCheckpoints=async()=>({items:[fork.ref,f.cuts[0].ref],nextCursor:null});const s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b);
 await assert.rejects(s.recoverDiscovered(),{code:'BNS_RECOVERY_MULTIPLE_CHECKPOINTS'});assert.deepEqual(await full(f.b),before);
});
for(const reverse of [false,true])test('positive/negative owner transition remains refused without dropping its original stage '+reverse,async t=>{
 const f=await fixture(t,{negative:true}),s=session(f.b,f.transport),old=f.cuts[reverse?1:0],next=f.cuts[reverse?0:1];await s.stage(old.ref);const before=await full(f.b);
 await assert.rejects(s.recover(next.ref),{code:'BNS_RESTORE_ID_COLLISION'});assert.deepEqual(await full(f.b),before);
});
test('lost original tail commit acknowledgement is recovered from the durable new manifest after a cold reopen',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b),repository=f.b.s.repository,original=repository.transaction,restoreKey=(await cutState(f.b,s.restoreId)).id;let lost=0;
 repository.transaction=async function(write,fn,stores){const result=await original.call(this,write,fn,stores);if(write&&!lost){const state=await original.call(this,false,tx=>tx.get('meta',restoreKey),['meta']);if(state?.manifestId===f.cuts[1].ref.id){lost++;throw Error('SYNTHETIC lost committed tail acknowledgement');}}return result;};
 try{await assert.rejects(s.recover(f.cuts[1].ref),/lost committed tail acknowledgement/);}finally{repository.transaction=original;}
 assert.equal(lost,1);assert.equal((await cutState(f.b,s.restoreId)).phase,'validated');assert.deepEqual((await full(f.b)).records,before.records);
 const b=await cold(t,f.b),resumed=session(b,f.transport,{restoreId:s.restoreId});await resumed.continueStored();await assertRestored(f,b);
});
test('native tail transaction failure rolls back staged items and receipt state, then the same task retries',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b),repository=f.b.s.repository,original=repository.transaction,restoreKey=(await cutState(f.b,s.restoreId)).id;let aborted=0;
 repository.transaction=function(write,fn,stores){return original.call(this,write,async tx=>{const result=await fn(tx);if(write&&!aborted){const row=await tx.get('meta',restoreKey);if(row?.manifestId===f.cuts[1].ref.id){aborted++;throw Error('SYNTHETIC tail transaction abort');}}return result;},stores);};
 try{await assert.rejects(s.stage(f.cuts[1].ref),{code:'STORAGE_FAILED'});}finally{repository.transaction=original;}
 assert.equal(aborted,1);assert.deepEqual(await full(f.b),before);await s.recover(f.cuts[1].ref);await assertRestored(f,f.b);
});
for(const change of ['local-edit','restore-epoch'])test('original tail authority fence rejects '+change+' after full preflight without erasing it',async t=>{
 const f=await fixture(t,{count:2});let changed,once=false;const s=session(f.b,f.transport,{checkpoint:async phase=>{if(phase!=='validated-tail'||once)return;once=true;if(change==='local-edit')await f.b.s.capture(capture((await f.b.s.status()).epoch,'SYNTHETIC_new_local','SYNTHETIC retained local body'));else await f.b.core.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}));changed=await full(f.b);}});await s.stage(f.cuts[0].ref);
 await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_RESTORE_LOCAL_CHANGED'});assert.equal(once,true);assert.deepEqual(await full(f.b),changed);assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.cuts[0].ref.id);
});
for(const action of ['pause','close'])test(action+' during original-owner tail reread settles early and fences late transport bytes',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b),get=f.transport.get;let entered,release,reads=0;const arrived=new Promise(r=>entered=r),held=new Promise(r=>release=r);
 f.transport.get=async ref=>{if(ref.id===f.cuts[1].ref.id&&++reads===2){entered();await held;}return get(ref);};const pending=s.recover(f.cuts[1].ref);await arrived;s[action]();await assert.rejects(pending,{code:'BNS_RECOVERY_INTERRUPTED'});assert.equal(s.snapshot().busy,false);release();await new Promise(r=>setImmediate(r));assert.deepEqual(await full(f.b),before);f.transport.get=get;
 const b=await cold(t,f.b),resumed=session(b,f.transport,{restoreId:s.restoreId});await resumed.recover(f.cuts[1].ref);await assertRestored(f,b);
});
test('pause after a durable tail commit preserves the advanced validated cut without early canonical activation',async t=>{
 const f=await fixture(t,{count:2});let s;s=session(f.b,f.transport,{checkpoint:async phase=>{if(phase==='reconciled-tail')s.pause();}});await s.stage(f.cuts[0].ref);const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_RECOVERY_INTERRUPTED'});assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.cuts[1].ref.id);assert.deepEqual((await full(f.b)).records,before.records);
 const b=await cold(t,f.b);await session(b,f.transport,{restoreId:s.restoreId}).continueStored();await assertRestored(f,b);
});
test('discovered recovery does not reset the 4096-reference work ticket before staging',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b);let total=0;
 f.transport.listCheckpoints=async()=>{const count=Math.min(100,4094-total);total+=count;return {items:Array.from({length:count},()=>f.cuts[1].ref),nextCursor:total===4094?null:'SYNTHETIC_page_'+total};};
 await assert.rejects(s.recoverDiscovered(),{code:'BNS_RECOVERY_DISCOVERY_LIMIT'});assert.equal(total,4094);assert.deepEqual(await full(f.b),before);
});
test('already activated task cannot silently retarget its durable manifest',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.recover(f.cuts[0].ref);const before=await full(f.b);await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_RESTORE_ID_COLLISION'});assert.deepEqual(await full(f.b),before);
});

test('tail preflight cannot replace a mutated durable revision inventory with caller-derived deltas',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const stage=new BrowserNativeSyncCore(f.b.s.repository,{datasetId,deviceId:f.b.id,namespace:s.restoreId}),item=(await rows(stage,'groupItem')).find(r=>r.item.kind==='revision');await stage.transaction(true,tx=>tx.delete('meta',item.id));const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_GROUP_TAIL_INVALID'});assert.deepEqual(await full(f.b),before);
});
test('tail reader deadline settles a held original-owner reread and preserves cold continuation',async t=>{
 const f=await fixture(t,{count:2}),first=session(f.b,f.transport);await first.stage(f.cuts[0].ref);const s=session(f.b,f.transport,{restoreId:first.restoreId,readTimeoutMs:300}),before=await full(f.b),get=f.transport.get;let entered,release,reads=0;const arrived=new Promise(r=>entered=r),held=new Promise(r=>release=r);
 f.transport.get=async ref=>{if(ref.id===f.cuts[1].ref.id&&++reads===2){entered();await held;}return get(ref);};const pending=s.recover(f.cuts[1].ref);pending.catch(()=>{});await Promise.race([arrived,pending.then(()=>assert.fail('unexpected completion'))]);
 try{await assert.rejects(pending,{code:'BNS_RECOVERY_READ_LIMIT'});assert.equal(s.snapshot().busy,false);}finally{release();f.transport.get=get;}
 await new Promise(r=>setImmediate(r));assert.deepEqual(await full(f.b),before);const b=await cold(t,f.b);await session(b,f.transport,{restoreId:s.restoreId}).recover(f.cuts[1].ref);await assertRestored(f,b);
});
test('a causal route does not reset its deadline after the first durable tail edge',async t=>{
 const f=await fixture(t),first=session(f.b,f.transport);await first.stage(f.cuts[0].ref);let tails=0;const s=session(f.b,f.transport,{restoreId:first.restoreId,readTimeoutMs:300,checkpoint:async phase=>{if(phase==='reconciled-tail'&&++tails===1)await new Promise(r=>setTimeout(r,350));}});await s.discover();const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[2].ref),{code:'BNS_RECOVERY_READ_LIMIT'});assert.equal(tails,1);assert.deepEqual((await full(f.b)).records,before.records);assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.cuts[1].ref.id);
 const b=await cold(t,f.b);await session(b,f.transport,{restoreId:s.restoreId}).recover(f.cuts[2].ref);await assertRestored(f,b);
});
test('one Source byte-boundary route retains all cuts and refuses its cumulative 2 MiB read budget',async t=>{
 const f=await fixture(t,{bodyBytes:64*1024}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const before=await full(f.b),objectIds=[...f.objects.keys()].sort(),get=f.transport.get;let fetched=0;f.transport.get=async ref=>{fetched+=ref.encodedBytes+ref.decodedBytes;return get(ref);};
 await assert.rejects(s.recoverDiscovered(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.ok(fetched>0&&fetched<2*1024*1024);assert.deepEqual(await full(f.b),before);assert.equal((await cutState(f.b,s.restoreId)).phase,'validated');
 assert.deepEqual([...f.objects.keys()].sort(),objectIds,'transport objects are never collected by recovery');
});

for(const action of ['pause','close'])test('confirmed tail activation remains restored when '+action+' arrives after original commit',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const repository=f.b.s.repository,original=repository.transaction;let committed=0;
 repository.transaction=async function(...args){const result=await original.apply(this,args);if(args[0]&&result?.state==='activated'){committed++;s[action]();}return result;};
 try{const result=await s.recover(f.cuts[1].ref);assert.equal(result.recoveryState,'restored');}finally{repository.transaction=original;}
 assert.equal(committed,1);await assertRestored(f,f.b);assert.equal((await cutState(f.b,s.restoreId)).phase,'activated');
});
test('final activation shares the tail ticket and an actual native reference overflow rolls it back',async t=>{
 const f=await fixture(t,{count:2}),repository=f.b.s.repository;let activationTicket=false,tails=0;const s=session(f.b,f.transport,{checkpoint:async (phase,tx)=>{if(phase==='reconciled-tail')tails++;if(phase==='before-activation'){activationTicket=!!currentOriginalRecoveryWork(repository);for(let i=0;i<4096;i++)await tx.get('meta','gate');}}});await s.stage(f.cuts[0].ref);const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(tails,1);assert.equal(activationTicket,true);assert.deepEqual((await full(f.b)).records,before.records);assert.deepEqual((await full(f.b)).blocks,before.blocks);assert.equal((await cutState(f.b,s.restoreId)).phase,'validated');assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.cuts[1].ref.id);
 const b=await cold(t,f.b);await session(b,f.transport,{restoreId:s.restoreId}).continueStored();await assertRestored(f,b);
});
test('ordinary recovery work brands repository and invocation without accepting copied tickets or raised caps',async t=>{
 const a=await device(t,'SYNTHETIC_meter_A'),b=await device(t,'SYNTHETIC_meter_B'),repository=a.s.repository,ticket=createOriginalRecoveryWork(repository);
 assert.throws(()=>createOriginalRecoveryWork(repository,{ms:30001}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.throws(()=>checkOriginalRecoveryWork(repository,{}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.throws(()=>checkOriginalRecoveryWork(b.s.repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 await withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(false,tx=>tx.get('meta','gate'),['meta']));finishOriginalRecoveryWork(repository,ticket);assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
});
test('original pre-callback control reads and failed native work consume the same ordinary ticket',async t=>{
 const a=await device(t,'SYNTHETIC_meter_controls'),repository=a.s.repository,ticket=createOriginalRecoveryWork(repository),before=await full(a);let callback=false;
 chargeOriginalRecoveryWork(repository,ticket,0,4095);
 await assert.rejects(withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(true,async tx=>{callback=true;await tx.put('meta',{id:'SYNTHETIC_never_written',value:1});},['meta'])),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.equal(callback,false,'selection and protection marker reads exhaust the actual remaining references before callback');assert.deepEqual(await full(a),before);assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
});
test('original native payload reads accumulate across work windows and failed balance never resets',async t=>{
 const a=await device(t,'SYNTHETIC_meter_bytes'),repository=a.s.repository;await repository.transaction(true,tx=>tx.put('meta',{id:'SYNTHETIC_meter_payload',value:'x'.repeat(64*1024)}),['meta']);const ticket=createOriginalRecoveryWork(repository);let reads=0;
 await assert.rejects((async()=>{for(let i=0;i<40;i++){await withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(false,tx=>tx.get('meta','SYNTHETIC_meter_payload'),['meta']));reads++;}})(),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.ok(reads>0&&reads<40);await assert.rejects(withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(false,tx=>tx.get('meta','gate'),['meta'])),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal((await repository.transaction(false,tx=>tx.get('meta','SYNTHETIC_meter_payload'),['meta'])).value.length,64*1024);
});
test('ordinary recovery windows reject reentry and concurrent double tickets',async t=>{
 const a=await device(t,'SYNTHETIC_meter_reentry'),repository=a.s.repository,first=createOriginalRecoveryWork(repository),second=createOriginalRecoveryWork(repository);
 await assert.rejects(withOriginalRecoveryWork(repository,first,()=>withOriginalRecoveryWork(repository,second,async()=>{})),{code:'BNS_GROUP_RESOURCE_LIMIT'});for(const ticket of [first,second])assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(currentOriginalRecoveryWork(repository),null);
});
test('closing a work window waits for an already-started late scope and never falls back to default work',async t=>{
 const a=await device(t,'SYNTHETIC_meter_late'),repository=a.s.repository,ticket=createOriginalRecoveryWork(repository),original=repository.open,before=await full(a);let release,entered,late,closed=false,callback=false;const gate=new Promise(r=>release=r),arrived=new Promise(r=>entered=r);
 repository.open=async function(){entered();await gate;return original.call(this);};
 const closing=withOriginalRecoveryWork(repository,ticket,async()=>{late=repository.transaction(true,async tx=>{callback=true;await tx.put('meta',{id:'SYNTHETIC_late_write',value:1});},['meta']);late.catch(()=>{});await arrived;}).finally(()=>closed=true);closing.catch(()=>{});await arrived;await new Promise(r=>setImmediate(r));assert.equal(closed,false);assert.equal(currentOriginalRecoveryWork(repository),ticket);release();
 try{await assert.rejects(closing,{code:'BNS_GROUP_RESOURCE_LIMIT'});await assert.rejects(late,{code:'BNS_GROUP_RESOURCE_LIMIT'});}finally{repository.open=original;}
 assert.equal(callback,false);assert.equal(currentOriginalRecoveryWork(repository),null);assert.deepEqual(await full(a),before);
});

for(const property of ['canonicalGeneration','unknownOwner'])test('foreign '+property+' stage is not admitted by the new ordinary tail',async t=>{
 const f=await fixture(t,{count:2}),s=session(f.b,f.transport);await s.stage(f.cuts[0].ref);const row=await cutState(f.b,s.restoreId);await f.b.core.transaction(true,tx=>tx.put('meta',{...row,[property]:{version:1}}),['meta']);const before=await full(f.b);
 await assert.rejects(s.recover(f.cuts[1].ref),{code:'BNS_RESTORE_ID_COLLISION'});assert.deepEqual(await full(f.b),before);
});

async function promptCuts(t){
 const a=await device(t,'SYNTHETIC_prompt_A'),b=await device(t,'SYNTHETIC_prompt_B'),objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},prompts=new PromptReuseService(a.s,{syncJournal:new PromptSyncJournal(a.core)});
 await prompts.change({action:'create',revision:0,text:'SYNTHETIC retained manual prompt'});const first=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}}),before=await a.core.transaction(false,readPromptPreferences);
 await prompts.change({action:'edit',id:before.overrides[0].id,revision:before.revision,text:'SYNTHETIC current manual prompt'});const last=await buildCheckpoint(a.core,transport,{grouped:{store:a.s},parents:[first.ref.id]}),expected=await a.core.transaction(false,readPromptPreferences);await a.s.repository.close();return {b,transport,first,last,expected};
}
for(const history of [false,true])test('unchanged non-Source staged head keeps original recovery profile with historical listing '+history,async t=>{
 const f=await promptCuts(t),s=session(f.b,f.transport);await s.stage(f.last.ref);f.transport.listCheckpoints=async()=>({items:history?[f.first.ref,f.last.ref]:[f.last.ref],nextCursor:null});
 const result=await s.recoverDiscovered();assert.equal(result.recoveryState,'restored');assert.deepEqual((await f.b.core.transaction(false,readPromptPreferences)).overrides,f.expected.overrides);assert.equal((await cutState(f.b,s.restoreId)).manifestId,f.last.ref.id);
});
test('new non-Source successor stays fail-closed without changing its original staged head',async t=>{
 const f=await promptCuts(t),s=session(f.b,f.transport);await s.stage(f.first.ref);f.transport.listCheckpoints=async()=>({items:[f.first.ref,f.last.ref],nextCursor:null});const before=await full(f.b);
 await assert.rejects(s.recoverDiscovered(),{code:'BNS_GROUP_OWNER_UNSUPPORTED'});assert.deepEqual(await full(f.b),before);
});
test('shortened read phase tightens the original private deadline rather than starting a new clock',async t=>{
 const a=await device(t,'SYNTHETIC_meter_deadline'),repository=a.s.repository,ticket=createOriginalRecoveryWork(repository);tightenOriginalRecoveryWork(repository,ticket,20);await new Promise(r=>setTimeout(r,30));let entered=false;
 await assert.rejects(withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(false,async tx=>{entered=true;return tx.get('meta','gate');},['meta'])),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(entered,false);assert.throws(()=>tightenOriginalRecoveryWork(repository,ticket,30000),{code:'BNS_GROUP_RESOURCE_LIMIT'});
});
