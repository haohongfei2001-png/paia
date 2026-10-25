import test from 'node:test';
import assert from 'node:assert/strict';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {OriginalApplicationGenerationSelection,openOriginalSelectedExistingApplication} from '../core/browser-native-sync/application-generation-selection.js';
import {STORAGE_KEY} from '../core/constants.js';
async function selected(t){const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());await owner.prepare();assert.equal((await owner.activate()).state,'selected');return {...f,owner};}
test('same live selected owner durably returns the exact unchanged cut and cold opens original A',async t=>{
 const f=await selected(t),before=structuredClone((await f.a.local.get(STORAGE_KEY))[STORAGE_KEY]);
 assert.equal((await f.owner.activateReverse()).state,'returned');
 const after=(await f.a.local.get(STORAGE_KEY))[STORAGE_KEY];assert.equal(after.databaseId,f.a.databaseId);
 for(const key of ['settings','preferences','diagnostics','memoryAccessPolicy','classificationRules','filterRules'])assert.deepEqual(after[key],before[key]);
 const cold=await openOriginalSelectedExistingApplication(f.a.local,f.factory);assert.equal(cold.repository.name,f.a.repository.name);cold.repository.db.close();
 await assert.rejects(f.owner.rollback(),{code:'GENERATION_REVERSE_INHERITANCE_REQUIRED'});
});

test('known remaining CAS budget refuses before reverse SDK and cold inspection cannot replenish write work',async t=>{
 const data={};let sets=0;const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){sets++;Object.assign(data,structuredClone(value));}};
 const f=await existingSelectionFixture(t,{sourceLocal:local}),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,local);t.after(()=>owner.close());await owner.prepare();await owner.activate();
 const a=await f.snapshot(f.a),b=await f.snapshot(f.b),control=structuredClone(data[STORAGE_KEY]),count=sets;
 await assert.rejects(owner.activateReverse(),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.equal(sets,count);assert.deepEqual(data[STORAGE_KEY],control);
 const failedA=await f.snapshot(f.a),failedB=await f.snapshot(f.b);
 for(const table of f.a.repository.stores)if(table!=='meta'){assert.deepEqual(failedA[table],a[table]);assert.deepEqual(failedB[table],b[table]);}
 assert.equal(failedA.meta.find(r=>r.id==='application-generation-selection:v1').phase,'intent');assert.equal(failedB.meta.find(r=>r.id==='application-generation-selection:v1').phase,'intent');assert.ok(failedA.meta.find(r=>r.id==='local-control-publication:reservation'));
 const {continueOriginalApplicationGenerationSelection,cancelOriginalApplicationGenerationSelection}=await import('../core/browser-native-sync/application-generation-selection.js');
 const result=await continueOriginalApplicationGenerationSelection(local,f.factory);assert.equal(result.state,'outcome-unknown');assert.equal(result.readback,'before-observed');assert.equal(result.completionRequired,'original-live-work');
 await assert.rejects(cancelOriginalApplicationGenerationSelection(local,f.factory),{code:'GENERATION_REVERSE_CONTINUATION_REQUIRED'});
 assert.equal(sets,count);assert.deepEqual(await f.snapshot(f.a),failedA);assert.deepEqual(await f.snapshot(f.b),failedB);assert.deepEqual(data[STORAGE_KEY],control);
});

for(const action of ['put','delete','clear'])test('terminal return metadata cannot be removed by ordinary '+action,async t=>{
 const f=await existingSelectionFixture(t);const key='application-generation-return:v1',row={id:key,version:999,SYNTHETIC:'protected key test only, not a valid receipt'};await f.raw(f.a.repository,store=>store.put(row));
 await assert.rejects(f.a.repository.transaction(true,tx=>action==='put'?tx.put('meta',{...row,SYNTHETIC:'changed'}):action==='delete'?tx.delete('meta',key):tx.clear('meta'),['meta']));
 assert.deepEqual(await f.a.repository.transaction(false,tx=>tx.get('meta',key),['meta']),row);
});
