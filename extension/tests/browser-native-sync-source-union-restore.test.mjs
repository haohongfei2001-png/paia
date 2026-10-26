import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore,requireActivatedSourceBootstrapUnion} from '../core/browser-native-sync/group-checkpoint.js';
import {prepareSourceBootstrapUnion,readSourceBootstrapUnionProof} from '../core/browser-native-sync/source-bootstrap-union.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {FilterRunner} from '../core/filter-runner.js';
import {assertCompletedGroupedRestoreControl} from '../core/browser-native-sync/completed-group-restore-control.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='synthetic_union_restore';
const cloud=()=>{const rows=new Map();return {rows,async putImmutable(ref,body){rows.set(ref.id,body.slice());},async get(ref){return rows.get(ref.id)?.slice();}};};
async function fresh(device,storage=local(),indexedDB=new IDBFactory()){
 const store=new LibraryFoundationStore(storage,{indexedDB});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId,deviceId:device});return {store,core,storage,indexedDB};
}
async function addSource(target,label,text='Synthetic '+label){target.store.sourceBootstrapJournal=new SourceBootstrapJournal(target.core);const request=capture((await target.store.status()).epoch,'union_message_'+label,text);request.chat={id:'union_chat_'+label,url:'https://chatgpt.com/c/union_chat_'+label,title:'Synthetic '+label};await target.store.capture(request);}
async function fixture(text){
 const transport=cloud(),ancestor=await fresh('union_ancestor');await addSource(ancestor,'ancestor',text);const base=await buildGroupedCheckpoint(ancestor.core,transport,{store:ancestor.store}),heads=[];
 for(const label of ['left','right']){const branch=await fresh('union_branch_'+label),restore=new GroupedCheckpointRestore(branch.core,{store:branch.store,restoreId:'union_branch_restore_'+label});await restore.stageCheckpoint(base.ref,r=>transport.get(r));await restore.activate();await addSource(branch,label,text);heads.push(await buildGroupedCheckpoint(branch.core,transport,{store:branch.store,parents:[base.ref.id]}));}
 return {transport,base,heads};
}
async function window(target,action,options){const ticket=createOriginalRecoveryWork(target.core.repository,options);try{return await withOriginalRecoveryWork(target.core.repository,ticket,()=>action(ticket));}finally{finishOriginalRecoveryWork(target.core.repository,ticket);}}
async function proofFor(target,f){return prepareSourceBootstrapUnion(target.core,{store:target.store,ancestorRef:f.base.ref,headRefs:f.heads.map(x=>x.ref),get:r=>f.transport.get(r)});}
const state=target=>target.store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
async function staged(f=undefined,checkpoint){f??=await fixture();const target=await fresh('union_receiver'),restoreId='union_restore_target',restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId,...(checkpoint?{checkpoint}:{})});await window(target,async()=>restore.stageSourceBootstrapUnion(await proofFor(target,f)));return {...f,target,restoreId,restore};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('LOCAL union stages and atomically activates complete retained Source groups on one original ticket',async()=>{
 const f=await fixture(),target=await fresh('union_receiver'),restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_restore_target'});let initial;
 const result=await window(target,async()=>{const proof=await proofFor(target,f),packet=readSourceBootstrapUnionProof(proof,{core:target.core,store:target.store});assert.equal('plan'in packet,false);assert.equal('canonical'in packet,false);initial=await restore.stageSourceBootstrapUnion(proof);assert.equal((await target.store.snapshot()).records.length,0);return restore.activate();});
 assert.equal(result.state,'activated');assert.equal((await target.store.snapshot()).records.length,3);const saved=await restore.stage.read('restore'),active=await target.store.repository.transaction(false,t=>t.get('meta',target.core.prefix+'active'));
 assert.equal(saved.kind,'source-bootstrap-union-restore');assert.equal(saved.replayId,initial.replayId);assert.equal(saved.selection.selectionId,initial.selection.selectionId);assert.equal('manifestId'in saved,false);assert.equal('manifestId'in active,false);assert.equal(active.restoreId,restore.restoreId);assert.equal(active.namespace,saved.replayId);assert.equal(saved.receipt.cuts.length,3);
 const before=await state(target);await window(target,()=>new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:restore.restoreId}).activate());assert.deepEqual(await state(target),before);
});

test('cold validated resume retains restore/replay/base identity and confirms after cleanup without stage bodies',async()=>{
 const x=await staged(),before=await x.restore.stage.read('restore'),cold=new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId});await window(x.target,()=>cold.activate());
 let clean;do{clean=await window(x.target,()=>cold.cleanup({limit:11}));}while(!clean.complete);
 const row=await cold.stage.read('restore');for(const key of ['id','replayId','base','selection','receipt','received','graphDigest'])assert.deepEqual(row[key],before[key]);
 const snapshot=await state(x.target),verified=await window(x.target,()=>requireActivatedSourceBootstrapUnion(x.target.core,{store:x.target.store}));assert.deepEqual(verified.parents,x.heads.map(head=>head.ref.id).sort());assert.deepEqual(await state(x.target),snapshot);assert.equal((snapshot.meta.filter(r=>r.id.startsWith(cold.stage.prefix+'generation:'+x.restoreId+':'))).length,1);
});

test('original Source re-export works without synthetic manifest or native grant',async()=>{
 const x=await staged();await window(x.target,()=>x.restore.activate());while(!(await window(x.target,()=>x.restore.cleanup())).complete){}
 const cp=await buildGroupedCheckpoint(x.target.core,x.transport,{store:x.target.store,parents:x.heads.map(head=>head.ref.id)});assert.equal(cp.manifest.kind,'checkpoint-manifest');assert.equal(cp.manifest.ownerScope.version,1);assert.deepEqual(cp.manifest.parents,x.heads.map(head=>head.ref.id).sort());assert.equal(cp.manifest.coverage.some(row=>row.type.includes('Working')),false);
 const other=await fresh('union_export_receiver'),restore=new GroupedCheckpointRestore(other.core,{store:other.store,restoreId:'union_export_restore'});await restore.stageCheckpoint(cp.ref,r=>x.transport.get(r));await restore.activate();assert.deepEqual((await other.store.snapshot()).records,(await x.target.store.snapshot()).records);
 const completed=freeze(await x.restore.stage.read('restore')),active=freeze(await x.target.core.repository.transaction(false,t=>t.get('meta',x.target.core.prefix+'active')));await assert.rejects(assertCompletedGroupedRestoreControl(completed,{prefix:x.target.core.prefix,datasetId,active,namespace:active.namespace,epoch:null}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
});

for(const checkpointName of ['source-union-applied-group','before-activation','after-activation'])test('union '+checkpointName+' interruption rolls back all canonical owners and active receipt',async()=>{
 const x=await staged(undefined,async name=>{if(name===checkpointName)throw new Error('synthetic interruption');}),before=await state(x.target);await assert.rejects(window(x.target,()=>x.restore.activate()));assert.deepEqual(await state(x.target),before);assert.equal(await x.target.core.namespace(),'initial');await window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate());assert.equal((await x.target.store.snapshot()).records.length,3);
});

for(const mutation of ['stage','epoch','source','extra-protocol'])test('terminal seal rejects after-activation '+mutation+' tamper with whole rollback',async()=>{
 let x;const hook=async(name,t)=>{if(name!=='after-activation')return;if(mutation==='epoch')await t.put('meta',{id:'recovery-restore-epoch',value:'tampered_epoch'});else if(mutation==='stage'){const row=(await t.primaryRangePage('meta',{prefix:x.restore.stage.prefix+'generation:'+x.restoreId+':groupItem:',limit:1})).rows[0].value;await t.delete('meta',row.id);}else if(mutation==='source'){const row=(await t.all('records'))[0];row.value.originalText='tampered';await t.put('records',row);}else{const active=await t.get('meta',x.target.core.prefix+'active');await t.put('meta',{id:x.target.core.prefix+'generation:'+active.namespace+':extra:synthetic',value:true});}};
 x=await staged(undefined,hook);const before=await state(x.target);await assert.rejects(window(x.target,()=>x.restore.activate()),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await state(x.target),before);
});

for(const mutation of ['receipt','selection','replayId','base'])test('cold '+mutation+' tamper refuses without canonical activation',async()=>{
 const x=await staged();await x.restore.stage.transaction(true,async t=>{const row=await x.restore.stage.get(t,'restore');if(mutation==='receipt')row.receipt.cuts[0].manifestEncoded=row.receipt.cuts[0].manifestEncoded.slice(0,-4)+'AAAA';else if(mutation==='selection')row.selection.selectionId='a'.repeat(64);else if(mutation==='replayId')row.replayId='tampered_replay_namespace';else row.base.namespace='tampered_base_namespace';await t.put('meta',row);});
 const before=await state(x.target);
 await assert.rejects(window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate()));assert.equal((await x.target.store.snapshot()).records.length,0);assert.equal(await x.target.core.namespace(),'initial');
});

test('missing work ticket and forged proof refuse before staging',async()=>{const x=await staged(),freshTarget=await fresh('union_forgery'),restore=new GroupedCheckpointRestore(freshTarget.core,{store:freshTarget.store,restoreId:'union_forgery_restore'});await assert.rejects(restore.stageSourceBootstrapUnion({}),{code:'BNS_SOURCE_UNION_WORK_REQUIRED'});await assert.rejects(window(freshTarget,()=>restore.stageSourceBootstrapUnion({})),{code:'BNS_SOURCE_UNION_PROOF_REQUIRED'});assert.equal(await restore.stage.read('restore'),undefined);});

test('nonempty canonical target refuses and preserves existing Source',async()=>{const f=await fixture(),target=await fresh('union_nonempty');await addSource(target,'local');const restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_nonempty_restore'}),before=await state(target);await assert.rejects(window(target,async()=>restore.stageSourceBootstrapUnion(await proofFor(target,f))),{code:'BNS_SOURCE_UNION_TARGET_NOT_EMPTY'});assert.deepEqual(await state(target),before);});

test('expired original ticket refuses before immutable reads and staging',async()=>{const f=await fixture(),target=await fresh('union_expired'),restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_expired_restore'});let reads=0;await assert.rejects(window(target,async()=>{await new Promise(resolve=>setTimeout(resolve,5));return restore.stageSourceBootstrapUnion(await prepareSourceBootstrapUnion(target.core,{store:target.store,ancestorRef:f.base.ref,headRefs:f.heads.map(x=>x.ref),get:r=>{reads++;return f.transport.get(r);}}));},{ms:1}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(reads,0);assert.equal(await restore.stage.read('restore'),undefined);});

test('lost activation acknowledgement confirms exact committed union cold without replaying owners',async()=>{
 const x=await staged(),original=x.target.core.transaction;let committed=false;
 x.target.core.transaction=async function(write,fn,stores){const result=await original.call(this,write,fn,stores);if(write&&result?.state==='activated'&&!committed){committed=true;throw new Error('synthetic lost activation acknowledgement');}return result;};
 await assert.rejects(window(x.target,()=>x.restore.activate()),/lost activation acknowledgement/);delete x.target.core.transaction;assert.equal(committed,true);
 const before=await state(x.target),result=await window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate());assert.equal(result.state,'activated');assert.deepEqual(await state(x.target),before);assert.equal((await x.target.store.snapshot()).records.length,3);
});

test('actual repeated original reads share the original 4096-reference ticket with compilation, stage and activation',async()=>{
 const f=await fixture(),target=await fresh('union_reference_limit'),restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_reference_restore'});let reads=0;
 await assert.rejects(window(target,async()=>{await restore.stageSourceBootstrapUnion(await proofFor(target,f));await target.core.transaction(false,async t=>{for(let index=0;index<3400;index++){await t.get('meta','gate');reads++;}},['meta']);return restore.activate();}),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.ok(reads>3000,'real owner reads, not synthetic prepayment, consumed the same original ledger');assert.equal((await target.store.snapshot()).records.length,0);assert.equal(await target.core.namespace(),'initial');assert.equal((await restore.stage.read('restore')).phase,'validated');
});

test('cleanup, re-export and follow-on local changes do not make native current admission or original selection acknowledgement broader',async()=>{
 const x=await staged();await window(x.target,()=>x.restore.activate());while(!(await window(x.target,()=>x.restore.cleanup())).complete){}await addSource(x.target,'after_union');
 const before=await state(x.target);await assert.rejects(window(x.target,()=>requireActivatedSourceBootstrapUnion(x.target.core,{store:x.target.store})));assert.deepEqual(await state(x.target),before);assert.equal((await x.target.store.snapshot()).records.length,4);
});

for(const mutation of ['stage','source','epoch'])test('stage terminal seal rejects '+mutation+' mutation and preserves empty destination',async()=>{
 const f=await fixture(),target=await fresh('union_stage_tamper'),restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_stage_tamper_restore',checkpoint:async(name,t)=>{if(name!=='source-union-staged')return;if(mutation==='stage'){const row=await restore.stage.get(t,'restore');row.base.ownerGeneration++;await t.put('meta',row);}else if(mutation==='source')await t.put('records',{id:'synthetic_extra_record',value:{id:'synthetic_extra_record',originalText:'tampered'}});else await t.put('meta',{id:'recovery-restore-epoch',value:'synthetic_tampered_epoch'});}}),before=await state(target);
 await assert.rejects(window(target,async()=>restore.stageSourceBootstrapUnion(await proofFor(target,f))),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await state(target),before);assert.equal(await restore.stage.read('restore'),undefined);
});

test('actual large Source bytes exceed the one original 2MiB ledger without canonical activation',async()=>{
 const f=await fixture('Synthetic '+'x'.repeat(12000)),target=await fresh('union_byte_limit'),restore=new GroupedCheckpointRestore(target.core,{store:target.store,restoreId:'union_byte_limit_restore'}),before=await state(target);
 await assert.rejects(window(target,async()=>{await restore.stageSourceBootstrapUnion(await proofFor(target,f));return restore.activate();}),{code:'BNS_GROUP_RESOURCE_LIMIT'});const after=await state(target);for(const name of Object.keys(before).filter(name=>name!=='meta'))assert.deepEqual(after[name],before[name]);assert.equal(await target.core.namespace(),'initial');assert.equal((await restore.stage.read('restore')).phase,'validated');
});

test('abandon cleanup validates replay identity and cannot erase an attacker-chosen namespace',async()=>{
 const x=await staged();await x.restore.stage.transaction(true,async t=>{const row=await x.restore.stage.get(t,'restore');row.replayId='synthetic_other_namespace';await t.put('meta',row);await t.put('meta',{id:x.target.core.prefix+'generation:synthetic_other_namespace:sentinel:',value:'retained'});});const before=await state(x.target);
 await assert.rejects(window(x.target,()=>x.restore.cleanup({abandon:true})),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await state(x.target),before);
});

test('abandoned local union retains provenance but cannot resume activation',async()=>{const x=await staged();while(!(await window(x.target,()=>x.restore.cleanup({abandon:true,limit:7}))).complete){}const row=await x.restore.stage.read('restore');assert.equal(row.phase,'abandoned');assert.equal(row.receipt.cuts.length,3);await assert.rejects(window(x.target,()=>x.restore.activate()),{code:'BNS_RESTORE_NOT_READY'});assert.equal((await x.target.store.snapshot()).records.length,0);});

for(const mutation of ['input-allocation','revision-allocation','sequence','revision-counter','input-counter','thought-counter','thought-epoch','suppression-key','filter-mode','filter-policy','filter-override','filter-user-edit','filter-ai','filter-unknown','filter-presence','filter-reason','filter-versions','preference','protected-source','source','receipt-cut'])test('cold activated physical Source receipt refuses '+mutation+' change without rewriting it',async()=>{
 const x=await staged();await window(x.target,()=>x.restore.activate());while(!(await window(x.target,()=>x.restore.cleanup())).complete){}
 if(mutation==='preference')await x.target.store.updatePreferences({language:'en'});
 else await x.target.core.transaction(true,async t=>{
  if(mutation==='input-allocation'){const row=(await t.all('inputStates'))[0];row.deltaSequence+=100;await t.put('inputStates',row);}
  else if(mutation==='revision-allocation'){const row=(await t.all('revisions'))[0];row.sequence+=100;row.listKey[1]=row.sequence;row.documentList[1]=row.sequence;await t.put('revisions',row);}
  else if(mutation==='source'){const row=(await t.all('records'))[0];row.value.originalText='Synthetic tampered source';await t.put('records',row);}
  else if(mutation==='protected-source'){const row=(await t.all('blocks'))[0];row.value.excluded=true;await t.put('blocks',row);}
  else if(mutation==='filter-mode'||mutation==='filter-policy'){const row=await t.get('meta','smart-filter');if(mutation==='filter-mode')row.mode='off';else row.policyEpoch++;await t.put('meta',row);}
  else if(mutation.startsWith('filter-')){const row=(await t.all('filterInputs'))[0];if(mutation==='filter-override')row.filterOverride='keep';else if(mutation==='filter-user-edit')row.userEdited=true;else if(mutation==='filter-ai')row.aiDecision={decision:'keep'};else if(mutation==='filter-unknown')row.unknownSemantic=true;else if(mutation==='filter-presence')row.presence={attachment:'present',reference:'unknown'};else if(mutation==='filter-reason')row.reasonCode='user_protected';else row.policyVersion++;await t.put('filterInputs',row);}
  else if(mutation==='receipt-cut'){const row=await x.restore.stage.get(t,'restore');row.sourceCut.inputStates[0].deltaSequence++;await t.put('meta',row);}
  else if(mutation==='suppression-key'){const row=await t.get('meta','thought-suppression-key');row.value[0]=(row.value[0]+1)%256;await t.put('meta',row);}
  else{const id={'sequence':'sequence','revision-counter':'revision-sequence','input-counter':'input-delta-sequence','thought-counter':'thought-sequence','thought-epoch':'thought-epoch'}[mutation],row=(await t.get('meta',id))??{id,value:0};if(mutation==='sequence')row.records++;else row.value=Number.isSafeInteger(row.value)?row.value+100:'SYNTHETIC_changed_epoch';await t.put('meta',row);}
 });
 const before=await state(x.target);await assert.rejects(window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate()));assert.deepEqual(await state(x.target),before);
});

test('actual original FilterRunner advances three broad generations while unchanged Source closure confirms cold',async()=>{const x=await staged();await window(x.target,()=>x.restore.activate());const before=await state(x.target),generation=before.meta.find(row=>row.id==='backup-data-generation').value;await new FilterRunner(x.target.store).wake();const after=await state(x.target);assert.equal(after.meta.find(row=>row.id==='backup-data-generation').value,generation+3);assert.deepEqual(after.records,before.records);assert.deepEqual(after.inputStates,before.inputStates);assert.deepEqual(after.revisions,before.revisions);await window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate());const row=await x.restore.stage.read('restore'),identity=row.sourceCut.metadata.find(row=>row.id==='thought-suppression-key');assert.equal(typeof identity.fingerprint,'string');assert.equal('row'in identity,false);});

for(const point of ['before-activation','after-activation'])test(point+' local allocation/identity mutation rolls back instead of becoming accepted receipt',async()=>{let x;const hook=async(name,t)=>{if(name!==point)return;if(point==='before-activation'){const row=(await t.all('inputStates'))[0];row.deltaSequence++;await t.put('inputStates',row);}else{const row=await t.get('meta','thought-suppression-key');row.value[0]=(row.value[0]+1)%256;await t.put('meta',row);}};x=await staged(undefined,hook);const before=await state(x.target);await assert.rejects(window(x.target,()=>x.restore.activate()));assert.deepEqual(await state(x.target),before);});

for(const point of ['before-activation','after-activation'])for(const mutation of ['organizer-controls','context-cards:v1','smart-filter','unrelated-meta','aiu:delta:unexpected','ans:index-state:v1:dirty:unexpected','deleted-meta'])test(point+' complete terminal inventory rejects '+mutation+' mutation with whole rollback',async()=>{
 let x;const hook=async(name,t)=>{if(name!==point)return;if(mutation==='smart-filter'){const row=await t.get('meta',mutation);row.mode='off';await t.put('meta',row);}else if(mutation==='deleted-meta')await t.delete('meta','migration');else await t.put('meta',{id:mutation,value:'SYNTHETIC unexpected canonical or derived state'});};x=await staged(undefined,hook);const before=await state(x.target);await assert.rejects(window(x.target,()=>x.restore.activate()));assert.deepEqual(await state(x.target),before);
});
for(const value of [-1,'999999',0])test('cold union rejects invalid or rolled-back backup generation '+JSON.stringify(value),async()=>{const x=await staged();await window(x.target,()=>x.restore.activate());await x.target.core.transaction(true,t=>t.put('meta',{id:'backup-data-generation',value}));const before=await state(x.target);await assert.rejects(window(x.target,()=>new GroupedCheckpointRestore(x.target.core,{store:x.target.store,restoreId:x.restoreId}).activate()));assert.deepEqual(await state(x.target),before);});
