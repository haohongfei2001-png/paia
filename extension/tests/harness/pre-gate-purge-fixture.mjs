import assert from 'node:assert/strict';
import {formPreGatePurgeState} from '../fixtures/pre-b02-purge-state.mjs';

const dump=async store=>({db:await store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(store.repository.stores.map(async name=>[name,await t.all(name)])))),local:await store.local.get(null)});

// This helper is ONLY for explicitly named historical survivor/fence fixtures.
// It cannot make a current mixed purge pass: first prove trusted B-02 refusal
// and complete equality. The preserved baseline then forms a historical state;
// every old anti-resurrection/privacy/recovery assertion remains on NEW code.
export async function admitPreGatePurgeFixture(store,id,permanent=true){
 await store.snapshot();const before=await dump(store);
 assert.equal((await store.sourcePurgePreflight(id)).state,'owner_gate_required');
 assert.deepEqual(await dump(store),before,'current preflight never alters historical fixture facts');
 await assert.rejects(store.purge(id,permanent),{code:'SOURCE_PURGE_OWNER_GATE'});
 assert.deepEqual(await dump(store),before,'current mixed purge has zero persisted and recovery effects');
 const result=await formPreGatePurgeState.call(store,id,permanent);
 return store.repository.thoughtLibrary?{...result,libraryCleanup:'pending'}:result;
}
