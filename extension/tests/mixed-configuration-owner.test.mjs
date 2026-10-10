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
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
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
