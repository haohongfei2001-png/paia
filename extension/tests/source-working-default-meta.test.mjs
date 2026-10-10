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
import {assertSourceWorkingDefaultMeta as qualify} from '../core/browser-native-sync/source-working-default-meta.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(){
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_source_default_dataset',deviceId:'synthetic_source_default_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
 await store.capture(capture((await store.status()).epoch));const input=(await store.snapshot()).library.blocks[0].id;await inputEdit(store,input,{libraryText:'SYNTHETIC default Working body',note:'SYNTHETIC one'});await inputEdit(store,input,{note:'SYNTHETIC two'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan),rows=await store.repository.transaction(false,async t=>{const result={};for(const name of store.repository.stores)result[name]=await t.all(name);return result;});return {store,core,scope,plan,rows,control:structuredClone(store.controlCache),databaseId:store.databaseId};
}
test('original complete initial Source/Working default inventory and original semantic delta builder qualify without external authority',async()=>{
 const x=await producer();try{qualify(x.core,x.scope,x.plan,x.rows,x.control,x.databaseId);assert.equal(x.store.humanLibraryJournal,null);assert.equal(x.control.preferences.aiEnabled,false);}finally{await x.store.repository.close();}
});
test('full local meta inventory refuses missing migration/secret/delta proof, unsupported pending state and unknown local keys',async()=>{
 const x=await producer();try{for(const change of [r=>r.meta.splice(r.meta.findIndex(v=>v.id==='migration'),1),r=>r.meta.find(v=>v.id==='migration').recordCount=1,r=>r.meta.find(v=>v.id==='sequence').blocks++,r=>r.meta.find(v=>v.id==='thought-suppression-key').value.pop(),r=>r.meta.find(v=>v.id==='thought-library').sealed=1,r=>r.meta.find(v=>v.id==='smart-filter').taskState='running',r=>r.meta.find(v=>v.id.startsWith('aiu:delta:pending:')).pendingFacets=[],r=>r.meta.find(v=>v.id.startsWith('aiu:delta:known:')).sequence++,r=>r.meta.push({id:'SYNTHETIC unknown local key',value:true}),r=>r.meta.push({id:'memory:input:SYNTHETIC',value:true}),r=>r.meta.push({id:'bns:v1:SYNTHETIC_unknown_namespace:generation:initial:extra:',value:true})]){const rows=structuredClone(x.rows);change(rows);assert.throws(()=>qualify(x.core,x.scope,x.plan,rows,x.control,x.databaseId));}}finally{await x.store.repository.close();}
});
test('original consent/control/database binding is required and consumer settings are not silently made portable',async()=>{
 const x=await producer();try{for(const change of [c=>c.settings.enabled=false,c=>c.settings.epoch++,c=>c.preferences.appearance='dark',c=>c.memoryAccessPolicy.enabled=true,c=>c.classificationRules.push({id:'SYNTHETIC'}),c=>c.settings.extra='SYNTHETIC']){const control=structuredClone(x.control);change(control);assert.throws(()=>qualify(x.core,x.scope,x.plan,x.rows,control,x.databaseId));}assert.throws(()=>qualify(x.core,x.scope,x.plan,x.rows,x.control,'SYNTHETIC_wrong_database'));}finally{await x.store.repository.close();}
});
test('complete control meter rejects a supplied getter before reading consent or preferences',async()=>{
 const x=await producer();try{let reads=0;const control={...x.control};Object.defineProperty(control,'preferences',{enumerable:true,get(){reads++;return x.control.preferences;}});assert.throws(()=>qualify(x.core,x.scope,x.plan,x.rows,control,x.databaseId),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(reads,0);}finally{await x.store.repository.close();}
});
