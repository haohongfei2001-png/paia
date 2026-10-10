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
import {sourceWorkingScopeScratch,sourceWorkingComparisonScratch} from '../core/browser-native-sync/source-working-qualification-cost.js';
import {measureSourceWorkingPhysicalTree as measure} from '../core/browser-native-sync/source-working-physical.js';
import {requireSelectedCurrentSourceWorkingGroupPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(){
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_source_default_dataset',deviceId:'synthetic_source_default_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
 await store.capture(capture((await store.status()).epoch));const input=(await store.snapshot()).library.blocks[0].id;await inputEdit(store,input,{libraryText:'SYNTHETIC default Working body',note:'SYNTHETIC one'});await inputEdit(store,input,{note:'SYNTHETIC two'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan),rows=await store.repository.transaction(false,async t=>{const result={};for(const name of store.repository.stores)result[name]=await t.all(name);return result;});return {store,core,scope,plan,rows,control:structuredClone(store.controlCache),databaseId:store.databaseId};
}
const tree=m=>2*m.T+128*m.V+8*m.E+128,canonical=m=>tree(m)+16*m.E+2*m.B+128;
test('actual corrupt larger physical comparison and control have independent original two-side canonical prepayment',async()=>{
 const x=await producer();try{
  requireSelectedCurrentSourceWorkingGroupPlan(x.core,x.plan);
  const rows=structuredClone(x.rows);rows.blocks[0].value.note='x'.repeat(800000);
  const pair=canonical(measure(rows.blocks[0]))+canonical(measure({id:x.scope.expected.blocks[0].id,value:x.scope.expected.blocks[0]}));
  assert.ok(measure(rows).B<2*1024*1024,'physical raw cut remains within original selected meter');
  assert.ok(sourceWorkingComparisonScratch(rows,x.control,x.scope.expected)>=pair,'actual large row plus expected original operand prepaid');
  assert.throws(()=>qualify(x.core,x.scope,x.plan,rows,x.control,x.databaseId),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
  const control=structuredClone(x.control);control.preferences.synthetic='x'.repeat(800000);
  assert.ok(sourceWorkingComparisonScratch(x.rows,control,x.scope.expected)>=2*canonical(measure(control)),'control actual peak priced independently');
 }finally{await x.store.repository.close();}
});
test('complete original prepared entities and family arrays are priced before Scope digest rather than one operation',async()=>{
 const x=await producer();try{
  const scopeWork=sourceWorkingScopeScratch(x.plan);
  for(const family of Object.values(x.scope.expected))assert.ok(scopeWork>=canonical(measure(family))+2*tree(measure(family)),'complete family clone plus canonical slots paid');
  assert.ok(sourceWorkingComparisonScratch(x.rows,x.control,x.scope.expected)>0);
  assert.throws(()=>requireSelectedCurrentSourceWorkingGroupPlan(x.core,structuredClone(x.plan)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  const ops=x.plan.groups.find(g=>g.type==='sourceBootstrapCommit').operations;
  const sourceOnly=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,ops);
  assert.throws(()=>requireSelectedCurrentSourceWorkingGroupPlan(x.core,sourceOnly),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  const input=(await x.store.snapshot()).library.blocks[0].id;await inputEdit(x.store,input,{note:'SYNTHETIC third genuine edit'});
  const operations=[];for await(const row of x.core.rows('revision'))operations.push(row.operation);
  const third=await prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,operations);
  assert.equal(third.groups.filter(g=>g.type==='inputWorkingCommit').length,3);
  assert.throws(()=>requireSelectedCurrentSourceWorkingGroupPlan(x.core,third),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 }finally{await x.store.repository.close();}
});
test('cost meter refuses supplied physical or control getters before reading them',async()=>{
 const x=await producer();try{
  let reads=0;const rows={...x.rows};Object.defineProperty(rows,'blocks',{enumerable:true,get(){reads++;return x.rows.blocks;}});
  assert.throws(()=>sourceWorkingComparisonScratch(rows,x.control,x.scope.expected),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
  const control={...x.control};Object.defineProperty(control,'preferences',{enumerable:true,get(){reads++;return x.control.preferences;}});
  assert.throws(()=>sourceWorkingComparisonScratch(x.rows,control,x.scope.expected),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(reads,0);
 }finally{await x.store.repository.close();}
});
