import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';

// Internal phase-chain only under the declared synthetic outer premise.
// The inner unreviewed terminal-escrow refusal stays intact and prevents SDK set.
test('genuine original all-holder unchanged-cut staging retains source and target dispatched markers before escrow refusal',async t=>{
 const f=await dormantSelectionWorker(t,{stageOuterGate:true});await f.addPage();const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);
 const before=f.storageState.sets.length;let failure;await assert.rejects(f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control)),error=>{failure=error;return true;});
 const key='application-generation-selection:v1',source=await f.bridge.store.repository.transaction(false,t=>t.get('meta',key),['meta']),target=await f.seed.b.repository.transaction(false,t=>t.get('meta',key),['meta']);
 await writeFile(join(f.path,'DORMANT-STAGING-OBSERVATION.json'),JSON.stringify({label:'synthetic internal chain only; outer premise staged; no SDK selection',error:failure?.code,stack:failure?.stack,source:source??null,target:target??null,setsBefore:before,setsAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
 assert.equal(f.storageState.sets.length,before);assert.equal(f.externalRequests(),0);assert.equal(source?.phase,'dispatched');assert.equal(target?.phase,'dispatched');assert.equal(source?.operationId,target?.operationId);assert.equal(failure.code,'BNS_GROUP_RESOURCE_LIMIT');
});
