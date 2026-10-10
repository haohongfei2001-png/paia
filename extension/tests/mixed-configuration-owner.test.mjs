import {prepareInitialSourcePlan,initialSourcePlan,initialSourcePlanBorrows} from '../core/browser-native-sync/source-bootstrap-plan.js';
import {prepareSourceAppendPlan,sourceAppendPlan,sourceAppendPlanBorrows} from '../core/browser-native-sync/source-append-plan.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {TopicDesiredSyncJournal} from '../core/browser-native-sync/topic-desired-journal.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {prepareCurrentMixedGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {measureOriginalMixedScopeBorrowedOperations,prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {compareMixedConfiguration} from '../core/browser-native-sync/mixed-configuration.js';
import {protocolPhysicalId} from '../core/browser-native-sync/physical-key.js';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID();
async function fixture(t){
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC-mixed-configuration-'+op(),clock:()=> '2026-10-11T00:00:00.000Z'});t.after(()=>s.repository.db?.close());await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_configuration',deviceId:'SYNTHETIC_device_A'});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);s.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(core);await s.capture(capture((await s.status()).epoch));await inputEdit(s,(await s.snapshot()).library.blocks[0].id,{libraryText:'SYNTHETIC actual Working continuation'});
 const topic=await s.createTopic({name:'SYNTHETIC configuration Topic',operationId:op()}),entry=await s.createEntry({actor:'user',body:'SYNTHETIC original authored Human',type:'idea',formation:'explicit',evidence:[],operationId:op()});await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:op()});
 const access=new ContextTopicAccessService(s,{syncDesiredJournal:new TopicDesiredSyncJournal(core)});
 const initialPage=await access.page(),initialItem=initialPage.items.find(x=>x.topicId===topic.id);assert.equal((await access.change({topicId:topic.id,enabled:false,expectedRevision:initialItem.revision,expectedBinding:initialItem.binding,epoch:initialPage.epoch,operationId:op()})).ok,true);
 for(const enabled of [true,true,false]){const page=await access.page(),item=page.items.find(x=>x.topicId===topic.id);assert.equal((await access.change({topicId:topic.id,enabled,expectedRevision:item.revision,expectedBinding:enabled?item.expectedBinding:item.binding,epoch:page.epoch,operationId:op()})).ok,true);}
 await s.updatePreferences({appearance:'dark'});for(const mode of ['off','off','light','off'])await s.setFilterMode(mode);
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentMixedGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan,{store:s}),rows=await s.repository.transaction(false,async tx=>{const out={};for(const name of s.repository.stores)out[name]=await tx.all(name);return out;}),control=structuredClone(s.controlCache);
 return {s,core,plan,scope,raw:{rows,namespace:'initial'},control,topic};
}
const compare=(f,raw=f.raw,control=f.control)=>compareMixedConfiguration(f.core,f.scope,f.plan,raw,control,false);
test('Source private plans borrow only actual immutable children and keep mutable inputs and readouts detached',async t=>{
 const f=await fixture(t),group=f.plan.groups.find(g=>g.type==='sourceBootstrapCommit'),entities=Object.fromEntries(group.prepared.members.map(op=>[op.value.entityType,op.value.entity]));
 assert.equal(initialSourcePlanBorrows(group.capability,entities),true);const original=initialSourcePlan(group.capability);entities.source={};assert.deepEqual(initialSourcePlan(group.capability),original);
 const mutable=structuredClone(original),cap=await prepareInitialSourcePlan(mutable);assert.equal(initialSourcePlanBorrows(cap,mutable),false);mutable.source.originalText='SYNTHETIC changed after prepare';assert.deepEqual(initialSourcePlan(cap),original);
 const detached=initialSourcePlan(cap);detached.source.originalText='SYNTHETIC changed readout';assert.deepEqual(initialSourcePlan(cap),original);
 const forged=structuredClone(original);forged.source.originalText='SYNTHETIC wrong digest';const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}};freeze(forged);await assert.rejects(()=>prepareInitialSourcePlan(forged));
 const request=capture((await f.s.status()).epoch);request.messages[0]={...request.messages[0],sourceMessageId:'SYNTHETIC-private-append',pageOrder:2,originalText:'SYNTHETIC immutable appended Source'};await f.s.capture(request);const operations=[];for await(const row of f.core.rows('revision'))operations.push(row.operation);const appendedPlan=await prepareCurrentMixedGroupCheckpointPlan(f.core,operations);assert.equal(appendedPlan.groups.filter(g=>g.type==='sourceAppendCommit').length,1);
 const inherited=structuredClone(original),prototype=Object.create(Array.prototype);prototype.map=()=>{throw Error('SYNTHETIC inherited method must not be lent');};Object.setPrototypeOf(inherited.input.provenance,prototype);freeze(inherited);const inheritedCap=await prepareInitialSourcePlan(inherited);assert.equal(initialSourcePlanBorrows(inheritedCap,inherited),false);assert.deepEqual(initialSourcePlan(inheritedCap),original);
 const accessor=structuredClone(original);let text=original.source.originalText;Object.defineProperty(accessor.source,'originalText',{enumerable:true,configurable:true,get:()=>text});freeze(accessor);const pending=prepareInitialSourcePlan(accessor);text='SYNTHETIC changed getter during validation';const getterCap=await pending;assert.equal(initialSourcePlanBorrows(getterCap,accessor),false);assert.deepEqual(initialSourcePlan(getterCap),original);
 for(const other of appendedPlan.groups.filter(g=>g.type==='sourceAppendCommit')){const values=Object.fromEntries(other.prepared.members.map(op=>[op.value.entityType,op.value.entity]));assert.equal(sourceAppendPlanBorrows(other.capability,values),true);const copy=sourceAppendPlan(other.capability),mutableCap=await prepareSourceAppendPlan(copy,other.prepared.descriptor.value.documentId);assert.equal(sourceAppendPlanBorrows(mutableCap,copy),false);copy.source.originalText='SYNTHETIC changed append';assert.deepEqual(sourceAppendPlan(mutableCap),sourceAppendPlan(other.capability));}
});
test('Mixed Scope borrows only original immutable domain identities and clones allocator-normalized rows',async t=>{
 const f=await fixture(t),source=f.plan.groups.find(g=>g.type==='sourceBootstrapCommit').prepared.members.find(op=>op.value.entityType==='source').value.entity;
 assert.equal(f.scope.expected.records[0],source);assert.equal(Object.isFrozen(source),true);
 const state=f.plan.groups.filter(g=>g.type==='inputWorkingCommit').at(-1).prepared.members.find(op=>op.value.entityType==='inputState').value.entity;
 assert.notEqual(f.scope.expected.inputStates[0],state);assert.equal(f.scope.expected.inputStates[0].deltaSequence,0);assert.equal(state.deltaSequence>0,true);const baselineId=f.plan.groups.find(g=>g.type==='sourceBootstrapCommit').prepared.members.find(op=>op.value.entityType==='baselineRevision').value.entity.id,baseline=f.plan.groups.flatMap(g=>g.prepared?.members??[]).filter(op=>['baselineRevision','revision'].includes(op.value.entityType)&&op.value.entity.id===baselineId).sort((a,b)=>a.sequence-b.sequence).at(-1).value.entity,normalized=f.scope.expected.revisions.find(row=>row.id===baseline.id);assert.notEqual(normalized,baseline);assert.equal(normalized.before,baseline.before);assert.equal(normalized.after,baseline.after);assert.equal(normalized.sequence,0);assert.equal(baseline.sequence>0,true);
 const alias=measureOriginalMixedScopeBorrowedOperations(f.core,f.scope,f.plan);assert.equal(alias.V>0,true);assert.throws(()=>measureOriginalMixedScopeBorrowedOperations(f.core,structuredClone(f.scope),f.plan));assert.throws(()=>measureOriginalMixedScopeBorrowedOperations(f.core,f.scope,structuredClone(f.plan)));assert.equal(compare(f).mode,'off');
});
test('original mode chronology counts real changes only and original desired receipts match the original local choices',async t=>{
 const f=await fixture(t),before=structuredClone(f.raw),actual=compare(f);assert.equal(actual.mode,'off');assert.equal(actual.policyEpoch,3);assert.equal(f.raw.rows.meta.find(r=>r.id==='consumer-preference-owner:smartFilter').revision,4);assert.equal(actual.values.length,2);assert.deepEqual(actual.desired.map(x=>x.enabled),[false]);assert.equal(f.raw.rows.operationReceipts.filter(r=>r.namespace==='context-topic-access'&&r.result.noOp).length,1);assert.deepEqual(f.raw,before);
});
test('original mixed configuration refuses a coherently inflated physical/proof revision and mode counter with all source rows unchanged',async t=>{
 const f=await fixture(t),before=structuredClone(f.raw);assert.equal(compare(f).mode,'off');
 for(const change of [raw=>raw.rows.meta.find(r=>r.id==='smart-filter').policyEpoch++,raw=>{const row=raw.rows.meta.find(r=>r.id==='consumer-preference-owner:smartFilter');row.revision++;raw.rows.meta.find(r=>r.id===protocolPhysicalId(f.core.prefix,'initial','materializedOwner',['consumerPreference','smartFilter'])).ownerRevision++;}]){const raw=structuredClone(before);change(raw);const corrupt=structuredClone(raw);assert.throws(()=>compare(f,raw));assert.deepEqual(raw,corrupt);assert.deepEqual(f.raw,before);}
});
test('original mixed configuration refuses missing/stale owners and unknown additional portable owner keys',async t=>{
 const f=await fixture(t),before=structuredClone(f.raw);assert.equal(compare(f).mode,'off');
 for(const change of [raw=>raw.rows.meta.splice(raw.rows.meta.findIndex(r=>r.id==='consumer-preference-owner:appearance'),1),raw=>raw.rows.meta.find(r=>r.id==='consumer-preference-owner:appearance').intent.value='light',raw=>raw.rows.meta.push({id:'consumer-preference-owner:SYNTHETIC_extra',version:1,revision:1,intent:{id:'appearance',value:'dark',explicit:true}}),raw=>raw.rows.meta.find(r=>r.id.startsWith('context-topic-desired:')).value.enabled=true]){const raw=structuredClone(before);change(raw);const corrupt=structuredClone(raw);assert.throws(()=>compare(f,raw));assert.deepEqual(raw,corrupt);assert.deepEqual(f.raw,before);}
});
test('original nonportable Topic aggregate and receipts cannot hide changed desired bits or imported local grant echoes',async t=>{
 const f=await fixture(t),before=structuredClone(f.raw);assert.equal(compare(f).mode,'off');
 for(const change of [raw=>raw.rows.meta.find(r=>r.id==='context-topic-access:v1').choices[0].enabled=true,raw=>raw.rows.operationReceipts.find(r=>r.namespace==='context-topic-access'&&!r.result.noOp).result.externalAllowed=true,raw=>raw.rows.operationReceipts.splice(raw.rows.operationReceipts.findIndex(r=>r.namespace==='context-topic-access'&&!r.result.noOp),1),raw=>raw.rows.meta.find(r=>r.id==='context-topic-access:v1').revision++,raw=>{const rows=raw.rows.operationReceipts.filter(r=>r.namespace==='context-topic-access'&&!r.result.noOp).sort((a,b)=>a.result.revision-b.result.revision);[rows[0].result.revision,rows[1].result.revision]=[rows[1].result.revision,rows[0].result.revision];},raw=>raw.rows.operationReceipts.find(r=>r.namespace==='context-topic-access'&&!r.result.noOp).epoch=op()]){const raw=structuredClone(before);change(raw);const corrupt=structuredClone(raw);assert.throws(()=>compare(f,raw));assert.deepEqual(raw,corrupt);assert.deepEqual(f.raw,before);}
});
