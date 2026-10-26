import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';

test('one changed-source unchanged original fixture records the first batched-currentness phase/resource refusal without SDK admission',async t=>{
 const fixtureStart=performance.now();
 const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();
 const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);
 const prepared=await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);const writesBefore=f.storageState.sets.length,actionStart=performance.now();let failure,result;
 try{result=await f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));}catch(error){failure=error;}
 const actionElapsedMs=performance.now()-actionStart,ledger=f.bridge.readActionLedger();
 const observation={label:'ONE changed-source unchanged-original-fixture trace after actual debit batching; not global/browser/native/SDK acceptance',productionSource:'b57927e91cedcca34f59735af183bc9f90c1228c',fixture:f.path,prepared,result:result??null,error:failure?.code??failure?.message??null,stack:failure?.stack??null,actionElapsedMs,fixtureElapsedBeforeCleanupMs:performance.now()-fixtureStart,ledger,writesBefore,writesAfter:f.storageState.sets.length,externalRequests:f.externalRequests(),limits:{references:4096,bytes:2*1024*1024,milliseconds:30000},innerEscrowRefusalRetained:true};
 await writeFile(join(f.path,'BATCHED-ROW-PHASE-TRACE.json'),JSON.stringify(observation,null,2)+'\n');
 assert.ok(failure,'inner SDK refusal remains');assert.equal(failure.code,'BNS_GROUP_RESOURCE_LIMIT');assert.equal(ledger.invalid,true);assert.equal(f.storageState.sets.length,writesBefore,'selection SDK must not dispatch');assert.equal(f.externalRequests(),0);
});
