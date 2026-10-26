import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation,requireOriginalWorkingRetentionCore} from '../core/browser-native-sync/core.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication,qualifyOriginalWorkingRetentionApplication,readOriginalWorkingRetentionPreparation,releaseOriginalWorkingApplication,requireOriginalWorkingRetentionReceiver} from '../core/browser-native-sync/input-working-commit.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {JournalRestoreFence,requireOriginalJournalRestoreFence} from '../core/browser-native-sync/prompt-journal.js';
import {qualifyWorkingConflictGraph} from '../core/browser-native-sync/working-conflict-retention.js';
import {currentOriginalRecoveryWork} from '../core/idb-repository.js';
import {packOperations} from '../core/browser-native-sync/segments.js';

// Node proves pure structure and non-native refusal only. These fixtures never
// manufacture native scope/commit evidence or assert successful retention.
const DATASET='synthetic-working-conflict';
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
function bind(s,deviceId){const core=new BrowserNativeSyncCore(s.repository,{datasetId:DATASET,deviceId});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});return {core,owner:new InputWorkingCommitReceiver(s,core,{filterJournal:s.filterIntentJournal})};}
const operations=async core=>{const result=[];for await(const row of core.rows('revision'))if(!row.redacted)result.push(row.operation);return result;};
const group=(rows,id)=>{const d=rows.find(op=>op.type==='inputWorkingCommit'&&op.entityId===id);return [...d.value.members.map(ref=>rows.find(op=>op.revisionId===ref.revisionId)),d];};
const block=group=>group.find(op=>op.type==='inputWorkingMember'&&op.value.entityType==='input');
const descriptor=group=>group.find(op=>op.type==='inputWorkingCommit');
async function restoreFixture(s,raw){await s.repository.transaction(true,async t=>{for(const [name,rows]of Object.entries(raw)){await new Promise((resolve,reject)=>{const r=t.tx.objectStore(name).clear();r.onsuccess=resolve;r.onerror=()=>reject(r.error);});for(const row of rows)await t.put(name,row);}});}
async function scenario({sameText=false,separateHistory=false}={}){
 const f=await setup(LibraryDocumentsStore);await f.s.finishFoundation();let owner=bind(f.s,'synthetic-working-device-a');const id=(await f.s.snapshot()).library.blocks[0].id;
 await inputEdit(f.s,id,{note:'SYNTHETIC complete common Working edit'});const common=await operations(owner.core),base=await snapshot(f.s);
 if(separateHistory)f.s.clock=()=>new Date(Date.now()+3600000).toISOString();
 await inputEdit(f.s,id,{note:sameText?'SYNTHETIC same text, independent intent':'SYNTHETIC concurrent branch A'});const aRows=await operations(owner.core),a=group(aRows,block(aRows.filter(op=>!common.some(x=>x.revisionId===op.revisionId))).value.logicalCommitId);
 await restoreFixture(f.s,base);owner=bind(f.s,'synthetic-working-device-b');await inputEdit(f.s,id,{note:sameText?'SYNTHETIC same text, independent intent':'SYNTHETIC canonical incumbent B'});
 const bRows=await operations(owner.core),b=group(bRows,block(bRows.filter(op=>!common.some(x=>x.revisionId===op.revisionId))).value.logicalCommitId);
 return {...f,...owner,id,common,base,a,b,graph:[...common,...a,...b]};
}
async function reseal(group,change){const next=structuredClone(group),members=next.filter(op=>op.type==='inputWorkingMember');change(members,descriptor(next));const sealed=[];for(const op of members)sealed.push(await sealOperation(op));const d=descriptor(next);d.value.members=sealed.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId}));return [...sealed,await sealOperation(d)];}
const qualify=(f,ops=f.graph,a=block(f.b).revisionId,b=block(f.a).revisionId)=>qualifyWorkingConflictGraph(f.core,ops,a,b);

test('pure original graph preserves both incomparable complete branches and coalesced history variants',async()=>{
 const f=await scenario(),before=await snapshot(f.s),g=await qualify(f),reverse=await qualify(f,[...f.graph].reverse(),block(f.a).revisionId,block(f.b).revisionId);
 assert.equal(g.kind,'PURE_WORKING_CONFLICT_GRAPH_ONLY');assert.equal(g.groups.length,3);assert.deepEqual(g.heads.find(h=>h.entityId==='input:'+f.id).revisions,[block(f.a).revisionId,block(f.b).revisionId].sort());
 assert.deepEqual(reverse.heads.find(h=>h.entityId==='input:'+f.id).revisions,g.heads.find(h=>h.entityId==='input:'+f.id).revisions);
 const historyA=f.a.filter(op=>op.value?.entityType==='revision'),historyB=f.b.filter(op=>op.value?.entityType==='revision');assert.ok(historyA.some(a=>historyB.some(b=>a.entityId===b.entityId&&a.value.entity.after.note!==b.value.entity.after.note)));
 assert.deepEqual(await snapshot(f.s),before);assert.equal(Object.isFrozen(g),true);
 await assert.rejects(f.core.retainWorkingConflict(g),{code:'BNS_WORKING_RETENTION_REQUIRED'});
});
test('each missing companion, descriptor or full common ancestor fails pure closure',async()=>{
 const f=await scenario();for(let i=0;i<f.a.length;i++)await assert.rejects(qualify(f,f.graph.filter(op=>op!==f.a[i])));
 await assert.rejects(qualify(f,[...f.a,...f.b]));
});
test('equal text is not a winner and independent new history rows retain legitimate single heads',async()=>{
 const same=await scenario({sameText:true}),g=await qualify(same);assert.equal(g.local.block.value.note,g.remote.block.value.note);assert.equal(g.heads.find(h=>h.entityId==='input:'+same.id).revisions.length,2);
 const fresh=await scenario({separateHistory:true}),h=await qualify(fresh);assert.ok(h.heads.some(row=>row.entityId.startsWith('revision:')&&row.revisions.length===1));assert.equal(h.heads.find(row=>row.entityId==='input:'+fresh.id).revisions.length,2);
});
test('retention shape qualification never leaks the mutable private application record',async()=>{
 const f=await scenario(),cap=await prepareWorkingApplication(f.owner,f.a),prepared=readOriginalWorkingRetentionPreparation(f.owner,cap),before=await f.core.transaction(false,t=>f.owner.journal.snapshot(t,f.id,descriptor(f.a).value.documentId,f.s.clock())),sources=await f.owner.filter.qualify(descriptor(f.a).value.sourceRefs.map(ref=>ref.sourceKey));
 assert.equal(qualifyOriginalWorkingRetentionApplication(f.owner,cap,before,sources),true);assert.equal(Object.isFrozen(prepared),true);assert.equal(Object.isFrozen(prepared.members[0].value.entity),true);assert.equal(releaseOriginalWorkingApplication(f.s,f.core,cap),true);assert.throws(()=>readOriginalWorkingRetentionPreparation(f.owner,cap),{code:'BNS_PREPARATION_REQUIRED'});
});
test('validly resealed mixed-parent group splice fails exact branch-wide vector',async()=>{
 const f=await scenario(),a=await reseal(f.a,members=>{const state=members.find(op=>op.value.entityType==='inputState');state.parents=[f.b.find(op=>op.entityId===state.entityId).revisionId];});
 await assert.rejects(qualify(f,[...f.common,...a,...f.b],block(f.b).revisionId,block(a).revisionId),{code:'BNS_WORKING_CONFLICT_VECTOR'});
});
test('pure closure rejects operation identity collision, missing history and causal rather than concurrent heads',async()=>{
 const f=await scenario(),a=await reseal(f.a,m=>{m[0].operationId=f.common[0].operationId;});await assert.rejects(qualify(f,[...f.common,...a,...f.b],block(f.b).revisionId,block(a).revisionId));
 const omitted=await reseal(f.a,m=>{m.splice(m.findIndex(op=>op.value.entityType==='revision'&&op.value.entity.reason==='baseline'),1);});await assert.rejects(qualify(f,[...f.common,...omitted,...f.b],block(f.b).revisionId,block(omitted).revisionId));
 await assert.rejects(qualify(f,f.graph,block(f.common).revisionId,block(f.a).revisionId),{code:'BNS_WORKING_CONFLICT_NOT_CONCURRENT'});
});
test('third real branch is not silently dropped from the qualified graph',async()=>{
 const f=await scenario();await restoreFixture(f.s,f.base);const c=bind(f.s,'synthetic-working-device-c');await inputEdit(f.s,f.id,{note:'SYNTHETIC third branch'});const extra=(await operations(c.core)).filter(op=>!f.common.some(x=>x.revisionId===op.revisionId));await assert.rejects(qualifyWorkingConflictGraph(c.core,[...f.graph,...extra],block(f.b).revisionId,block(f.a).revisionId),{code:'BNS_WORKING_CONFLICT_HEADS'});
});
test('original receiver refuses non-native retention/read and drains its ordinary ticket without writes',async()=>{
 const f=await scenario(),before=await snapshot(f.s);
 await assert.rejects(f.owner.retainConflict(f.a),{code:'BNS_WORKING_RETENTION_REQUIRED'});assert.equal(currentOriginalRecoveryWork(f.s.repository),null);assert.deepEqual(await snapshot(f.s),before);
 await assert.rejects(f.owner.readConflict(f.id),{code:'BNS_WORKING_RETENTION_REQUIRED'});assert.equal(currentOriginalRecoveryWork(f.s.repository),null);assert.deepEqual(await snapshot(f.s),before);
 await assert.rejects(f.core.retainWorkingConflict(Object.freeze({})),{code:'BNS_WORKING_RETENTION_REQUIRED'});assert.deepEqual(await snapshot(f.s),before);
});
test('same-device intake and cancelled/expanded work requests refuse without native writes',async()=>{
 const f=await scenario(),before=await snapshot(f.s);await assert.rejects(f.owner.retainConflict(f.b),{code:'BNS_WORKING_CONFLICT_DEVICE'});
 await assert.rejects(f.owner.retainConflict(f.a,{isCurrent:()=>false}),{code:'BNS_GROUP_RESOURCE_LIMIT'});await assert.rejects(f.owner.retainConflict(f.a,{ms:30001}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(currentOriginalRecoveryWork(f.s.repository),null);assert.deepEqual(await snapshot(f.s),before);
});
test('receiver aliases, replaced journal/fence and mutable bound namespace maps cannot qualify',async()=>{
 const f=await scenario(),before=await snapshot(f.s);
 const binding=requireOriginalWorkingRetentionReceiver(f.owner);assert.equal(Object.isFrozen(binding),true);assert.throws(()=>{binding.core={};},TypeError);
 for(const forged of [Object.create(f.owner),new Proxy(f.owner,{})])await assert.rejects(InputWorkingCommitReceiver.prototype.retainConflict.call(forged,f.a));
 f.owner.journal.snapshot=async()=>({});await assert.rejects(f.owner.retainConflict(f.a));delete f.owner.journal.snapshot;
 f.owner.journal.fence.snapshot=async()=>({});await assert.rejects(f.owner.retainConflict(f.a),{code:'BNS_RESTORE_FENCE_REQUIRED'});delete f.owner.journal.fence.snapshot;
 const original=f.core.boundTransactions;f.core.boundTransactions={has:()=>true,get:()=> 'forged_namespace'};assert.throws(()=>requireOriginalWorkingRetentionCore(f.core),{code:'BNS_WORKING_RETENTION_REQUIRED'});f.core.boundTransactions=original;
 original.has=()=>true;assert.throws(()=>requireOriginalWorkingRetentionCore(f.core),{code:'BNS_WORKING_RETENTION_REQUIRED'});delete original.has;
 const method=Object.getOwnPropertyDescriptor(JournalRestoreFence.prototype,'snapshot');try{Object.defineProperty(JournalRestoreFence.prototype,'snapshot',{...method,value:async()=>({})});assert.throws(()=>requireOriginalJournalRestoreFence(f.owner.journal.fence,f.core),{code:'BNS_RESTORE_FENCE_REQUIRED'});}finally{Object.defineProperty(JournalRestoreFence.prototype,'snapshot',method);}
 assert.deepEqual(await snapshot(f.s),before);
});

// Deliberately seed an UNQUALIFIED protocol cut solely to challenge receipt
// classification. This is not a successful retained-conflict fixture/proof.
async function seedUnqualifiedReceipts(f){const graph=await qualify(f);await f.core.transaction(true,async t=>{for(const op of f.a){await f.core.put(t,'revision',[op.revisionId],{operation:op,redacted:false});await f.core.put(t,'entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});await f.core.recordReceipt(t,op);}for(const h of graph.heads)await f.core.put(t,'head',[h.type,h.entityId],h);});}
test('unqualified sibling receipts never become applied duplicates while genuine incumbent and ancestor ACKs survive',async()=>{
 const f=await scenario();await seedUnqualifiedReceipts(f);const before=await snapshot(f.s);
 await assert.rejects(f.owner.receive(f.a),{code:'BNS_WORKING_CONFLICT_REQUIRED'});const prepared=await f.core.prepareWorkingReceive(f.a);let called=false;await assert.rejects(f.core.transaction(true,t=>f.core.commitWorkingReceive(t,prepared,()=>{called=true;})),{code:'BNS_WORKING_CONFLICT_REQUIRED'});assert.equal(called,false);
 assert.equal((await f.owner.receive(f.b)).state,'duplicate');assert.equal((await f.owner.receive(f.common)).state,'duplicate');assert.deepEqual(await snapshot(f.s),before);
});
test('unqualified retained receipt leaves actual resume inbox references intact',async()=>{
 const f=await scenario();await seedUnqualifiedReceipts(f);const objects=new Map(),refs=[];for await(const object of packOperations(f.a,{datasetId:DATASET,producer:'synthetic-working-intake'})){objects.set(object.ref.id,object.bytes);if(object.ref.kind==='descriptor')refs.push(object.ref);}const get=ref=>objects.get(ref.id);
 for(const ref of refs)await f.owner.receiveSegment(ref,get);const before=await snapshot(f.s);assert.ok(before.meta.some(row=>row.id.startsWith(f.core.prefix+'workingInbox:')));
 await assert.rejects(f.owner.resume({get}),{code:'BNS_WORKING_CONFLICT_REQUIRED'});assert.deepEqual(await snapshot(f.s),before);
});
