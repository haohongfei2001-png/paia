import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
import {rootReadAuthority,planRootReadAuthority} from '../core/organizer/root-read.js';
const ids=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation','smart-filter'];
test('native activity authority shares the exact ordinary metadata order and missing values',async()=>{
 for(const points of [{},Object.fromEntries(ids.map((id,i)=>[id,id==='smart-filter'?{mode:'default',phase:'ready',policyEpoch:4,decisionSequence:9,filterVersion:2,policyVersion:3,classifierVersion:1}:{value:i}]))]){
  const before=structuredClone(points),seen=[],t={async get(table,id){assert.equal(table,'meta');seen.push(id);return points[id];}};
  const ordinary=await rootReadAuthority(t),plan=planRootReadAuthority();let step=plan.next(),nativeSeen=[];
  while(!step.done){nativeSeen.push(step.value);step=plan.next(points[step.value]);}
  assert.deepEqual(seen,ids);assert.deepEqual(nativeSeen,ids);assert.equal(JSON.stringify(step.value),ordinary);assert.deepEqual(points,before);
 }
});
test('ordinary authority preserves optional search completeness and original read failure',async()=>{
 for(const pending of [0,1]){const t={async get(table,id){return id==='library-search-rebuild'?{complete:true}:null;},async count(table,index){assert.equal(table,'libraryMigrationItems');assert.equal(index,'byStatus');return pending;}};const value=JSON.parse(await rootReadAuthority(t,{search:true}));assert.equal(value.at(-1),pending===0);assert.equal(value.length,8);}
 const failure=new Error('synthetic read failure'),seen=[];await assert.rejects(rootReadAuthority({async get(table,id){seen.push(id);if(id==='input-delta-sequence')throw failure;return null;}}),error=>error===failure);assert.deepEqual(seen,ids.slice(0,3));
});
