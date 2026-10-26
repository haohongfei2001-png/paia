import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';
const ROW='paia-sync-local-lifecycle:v1';

test('original lifecycle readback distinguishes undefined absence from explicit corrupt null',async t=>{
 const f=await dormantSelectionWorker(t),absent=await f.storage.get(ROW);
 assert.equal(absent[ROW],undefined);
 assert.equal((await f.bridge.sync.reconcile()).state,'not-started');
 await f.storage.set({[ROW]:null});const writes=f.storageState.sets.length;let failure;
 await assert.rejects(f.bridge.sync.reconcile(),error=>{failure=error;return error.code==='BNS_SYNC_STATE_CORRUPT';});
 const retained=await f.storage.get(ROW);assert.equal(Object.hasOwn(retained,ROW),true);assert.equal(retained[ROW],null);assert.equal(f.storageState.sets.length,writes,'corrupt null must not trigger a replacement write');assert.equal(f.externalRequests(),0);
 await writeFile(join(f.path,'OWNED-NULL-READBACK.json'),JSON.stringify({label:'synthetic original readback; undefined alone denotes absence',undefinedState:'not-started',nullError:failure.code,nullRetained:Object.hasOwn(retained,ROW)&&retained[ROW]===null,writesBefore:writes,writesAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
});
