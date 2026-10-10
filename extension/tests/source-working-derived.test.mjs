import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {prepareCurrentSourceWorkingGroupCheckpointPlan,prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope,requireOriginalCurrentSourceWorkingGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertSourceWorkingDerivedRows,assertSourceWorkingSpecialScalars} from '../core/browser-native-sync/source-working-derived.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(){
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();
 const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_source_derived_dataset',deviceId:'synthetic_source_derived_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
 await store.capture(capture((await store.status()).epoch));const id=(await store.snapshot()).library.blocks[0].id;await inputEdit(store,id,{libraryText:'SYNTHETIC modified Working body',note:'SYNTHETIC first note'});await inputEdit(store,id,{note:'SYNTHETIC second note'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);
 const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan),rows=await store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['recordIndex','blockIndex','sourceCounts','documents'].map(async n=>[n,await t.all(n)]))));return {store,core,plan,scope,rows,operations};
}
test('original Source and two real Working edits retain exact original derived rows, own undefined and signed zero',async()=>{
 const x=await producer();try{requireOriginalCurrentSourceWorkingGroupScope(x.core,x.scope,x.plan);assertSourceWorkingDerivedRows(x.core,x.scope,x.plan,x.rows);assert.ok(Object.hasOwn(x.rows.recordIndex[0],'legacyChat'));assert.equal(x.rows.recordIndex[0].legacyChat,undefined);assert.ok(Object.is(x.rows.documents[0].displayKey[0],-0));assert.equal(x.store.humanLibraryJournal,null);}finally{await x.store.repository.close();}
});
test('complete original index formation rejects missing own fields, altered provenance, stale views, sequence and signed-zero coercion',async()=>{
 const x=await producer();try{for(const change of [r=>delete r.recordIndex[0].legacyChat,r=>r.recordIndex[0].sequence++,r=>r.blockIndex[0].recordIds.push('SYNTHETIC extra'),r=>r.sourceCounts[0].views.reverse(),r=>r.documents[0].displayKey[0]=0,r=>r.documents[0].excludedDisplay=[-0,r.documents[0].id],r=>r.recordIndex.push(structuredClone(r.recordIndex[0])),r=>r.blockIndex[0].extra=undefined]){const rows=structuredClone(x.rows);change(rows);assert.throws(()=>assertSourceWorkingDerivedRows(x.core,x.scope,x.plan,rows));}}finally{await x.store.repository.close();}
});
test('special physical scalars are restricted to actual native derived paths and never execute getters',()=>{
 for(const [name,row] of [['records',{id:'SYNTHETIC',value:{extra:undefined}}],['recordIndex',{sourceKey:'SYNTHETIC',legacyChat:undefined,sequence:-0}],['documents',{displayKey:[-0,'SYNTHETIC'],value:{bad:-0}}],['sourceCounts',{views:[undefined]}]])assert.throws(()=>assertSourceWorkingSpecialScalars(name,row),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
 let reads=0;const row={sourceKey:'SYNTHETIC'};Object.defineProperty(row,'legacyChat',{enumerable:true,get(){reads++;return undefined;}});assert.throws(()=>assertSourceWorkingSpecialScalars('recordIndex',row),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(reads,0);
});
test('physical checker requires original ready Plan and Scope instead of an otherwise identical DTO',async()=>{
 const x=await producer();try{assert.throws(()=>assertSourceWorkingDerivedRows(x.core,structuredClone(x.scope),x.plan,x.rows),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.throws(()=>assertSourceWorkingDerivedRows(x.core,x.scope,structuredClone(x.plan),x.rows),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 const old=await prepareGroupCheckpointPlan(x.core,x.operations),oldScope=await prepareGroupScope(old);assert.throws(()=>assertSourceWorkingDerivedRows(x.core,oldScope,old,x.rows),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'},'public family-preparation path cannot acquire fixed current Source authority');
 }finally{await x.store.repository.close();}
});
test('selected Source profile rejects an async Core getter at Scope entry and rejects bootstrap-only without changing default compilation',async()=>{
 const x=await producer();try{
  const original=Object.getOwnPropertyDescriptor(x.core,'datasetId');let reads=0;Object.defineProperty(x.core,'datasetId',{configurable:true,get(){reads++;return original.value;}});
  try{assert.throws(()=>assertSourceWorkingDerivedRows(x.core,x.scope,x.plan,x.rows),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);}finally{Object.defineProperty(x.core,'datasetId',original);}
  const operations=x.plan.groups.find(group=>group.type==='sourceBootstrapCommit').operations,plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,operations),scope=await prepareGroupScope(plan);
  assert.throws(()=>requireOriginalCurrentSourceWorkingGroupScope(x.core,scope,plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  const old=await prepareGroupCheckpointPlan(x.core,operations);assert.equal(old.groups.length,1);assert.equal(old.groups[0].type,'sourceBootstrapCommit');
 }finally{await x.store.repository.close();}
});
