import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {prepareCurrentSourceWorkingGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertSourceWorkingCanonicalAndProtocolRows as qualify} from '../core/browser-native-sync/source-working-canonical.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(separate=false){
 let time=Date.parse('2026-10-10T00:00:00Z');const clock=()=>new Date(time+=separate?70000:1).toISOString();
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_source_canonical_dataset',deviceId:'synthetic_source_canonical_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
 await store.capture(capture((await store.status()).epoch));const input=(await store.snapshot()).library.blocks[0].id;await inputEdit(store,input,{libraryText:'SYNTHETIC Working canonical body',note:'SYNTHETIC first note'});await inputEdit(store,input,{note:'SYNTHETIC second note'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan),rows=await store.repository.transaction(false,async t=>{const result={};for(const name of store.repository.stores)result[name]=await t.all(name);return result;});return {store,core,scope,plan,rows};
}
for(const separate of [false,true])test(`original Source/Working canonical and protocol rows with ${separate?'separated':'coalesced'} real history`,async()=>{
 const x=await producer(separate);try{qualify(x.core,x.scope,x.plan,x.rows);assert.equal(x.rows.revisions.length,separate?3:2);assert.equal(x.store.humanLibraryJournal,null);assert.equal(x.rows.records[0].value.originalText,'Synthetic explicit working input');assert.equal(x.rows.blocks[0].value.libraryText,'SYNTHETIC Working canonical body');}finally{await x.store.repository.close();}
});
test('missing original protocol receipt and altered full owner/history/namespace refuse',async()=>{
 const x=await producer();try{for(const change of [r=>r.meta.splice(r.meta.findIndex(v=>v.id.includes(':receipt:')),1),r=>r.meta.find(v=>v.id.includes(':workingOwner:')).deltaSequence++,r=>r.meta.find(v=>v.id.includes(':workingHistory:')).revisionId='f'.repeat(64),r=>r.meta.push({id:'bns:v1:synthetic_foreign:generation:initial:extra:',value:1}),r=>r.meta.push({id:x.core.prefix+'generation:initial:unknown:',value:1}),r=>r.revisions[0].sequence++,r=>r.inputStates[0].deltaSequence++]){const rows=structuredClone(x.rows);change(rows);assert.throws(()=>qualify(x.core,x.scope,x.plan,rows));}}finally{await x.store.repository.close();}
});
test('complete Source and Working body/provenance plus local retry and pending derivative inventory refuse unrepresented values',async()=>{
 const x=await producer();try{for(const change of [r=>r.records[0].value.originalText='SYNTHETIC altered Source',r=>r.blocks[0].value.note='SYNTHETIC altered Working',r=>r.libraryDocuments[0].value.userTitle='SYNTHETIC unjournaled title',r=>r.operationReceipts[0].ownerId='SYNTHETIC wrong owner',r=>r.operationReceipts[0].operationSequence=1,r=>r.invalidations[0].organizerAck=true,r=>r.invalidations[0].contentRevision++,r=>r.filterInputs[0].evaluationRevision++,r=>r.topics.push({id:'SYNTHETIC unrepresented Human'}),r=>r.extra=[]]){const rows=structuredClone(x.rows);change(rows);assert.throws(()=>qualify(x.core,x.scope,x.plan,rows));}}finally{await x.store.repository.close();}
});
