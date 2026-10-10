import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore,requireOriginalSourceWorkingCore,prepareOriginalSourceWorkingReceive} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {prepareGroupCheckpointPlan,prepareCurrentSourceWorkingGroupCheckpointPlan,requireOriginalGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(){
 const store=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();
 const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_fixed_source_dataset',deviceId:'synthetic_fixed_source_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});await store.capture(capture((await store.status()).epoch));
 const input=(await store.snapshot()).library.blocks[0].id;await inputEdit(store,input,{note:'SYNTHETIC first genuine edit'});await inputEdit(store,input,{note:'SYNTHETIC second genuine edit'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return {store,core,operations};
}
test('fixed original compiler preserves genuine Source bootstrap and two Working groups and original Plan identity',async()=>{
 const x=await producer();try{const old=await prepareGroupCheckpointPlan(x.core,x.operations),fixed=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,x.operations);requireOriginalGroupCheckpointPlan(x.core,fixed);assert.deepEqual(fixed,old);assert.equal(fixed.groups.filter(g=>g.type==='sourceBootstrapCommit').length,1);assert.equal(fixed.groups.filter(g=>g.type==='inputWorkingCommit').length,2);}finally{await x.store.repository.close();}
});
test('fixed compiler never calls instance supplied family preparation while the original public path remains unchanged',async()=>{
 const x=await producer();let called=0;x.core.prepareSourceBootstrapReceive=()=>{called++;throw Error('SYNTHETIC supplied preparation');};x.core.prepareWorkingReceive=x.core.prepareSourceBootstrapReceive;
 try{const p=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,x.operations);requireOriginalGroupCheckpointPlan(x.core,p);assert.equal(called,0);await assert.rejects(prepareGroupCheckpointPlan(x.core,x.operations),/SYNTHETIC supplied preparation/);assert.equal(called,1);}finally{await x.store.repository.close();}
});
test('constructor-private Core binding rejects prototype clones, changed identity and accessor rebinding',()=>{
 const core=new BrowserNativeSyncCore({}, {datasetId:'synthetic_fixed_dataset',deviceId:'synthetic_fixed_device'});requireOriginalSourceWorkingCore(core);const fake=Object.assign(Object.create(BrowserNativeSyncCore.prototype),core);assert.throws(()=>requireOriginalSourceWorkingCore(fake),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});
 const original=Object.getOwnPropertyDescriptor(core,'datasetId');core.datasetId='synthetic_changed_dataset';assert.throws(()=>requireOriginalSourceWorkingCore(core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});Object.defineProperty(core,'datasetId',original);let reads=0;Object.defineProperty(core,'datasetId',{get(){reads++;return original.value;},configurable:true});try{assert.throws(()=>requireOriginalSourceWorkingCore(core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);}finally{Object.defineProperty(core,'datasetId',original);}
});
test('fixed compiler and both original family validators refuse async accessor replacement before any getter read',async()=>{
 const x=await producer();try{
  const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,x.operations);
  const calls=[()=>prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,x.operations),...['sourceBootstrapCommit','inputWorkingCommit'].map(type=>()=>prepareOriginalSourceWorkingReceive(x.core,type,plan.groups.find(group=>group.type===type).operations))];
  for(const prepare of calls){const original=Object.getOwnPropertyDescriptor(x.core,'datasetId');let reads=0;try{
   const pending=prepare();queueMicrotask(()=>Object.defineProperty(x.core,'datasetId',{configurable:true,get(){reads++;return original.value;}}));
   await assert.rejects(pending,{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);
  }finally{Object.defineProperty(x.core,'datasetId',original);}}
 }finally{await x.store.repository.close();}
});
