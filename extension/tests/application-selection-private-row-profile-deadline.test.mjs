import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';
const ROW='paia-sync-local-lifecycle:v1';
async function prepare(t){const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();let retained;f.storageState.set=(value,write)=>{if(Object.hasOwn(value,ROW))retained=value[ROW];return write();};const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);return {...f,retained};}
const activate=f=>f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));

// Historical SDK-alias ROW_PROFILE injection retired after owned publication:
// its exact source/log are preserved in work/dormant-selection-owned-publication-20261025/historical-contract.
// Current contract controls: application-selection-owned-publication-boundary.test.mjs
// (late retained-alias Proxy isolation and original RESERVED-array compatibility).
test('time spent in the original reserve copy consumes the same already-started hold deadline',async t=>{
 const performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'),clone=globalThis.structuredClone;let clock=1000,armed=false,advances=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});globalThis.structuredClone=value=>{const copy=clone(value);if(armed&&value?.bindingId&&value?.mode){clock+=30001;advances++;}return copy;};
 try{const f=await prepare(t),before=f.storageState.sets.length;armed=true;let failure;await assert.rejects(activate(f),error=>{failure=error;return true;});armed=false;
  assert.equal(advances,1);assert.equal(failure.code,'BNS_SYNC_SELECTION_EXPIRED');assert.equal(f.bridge.readActionLedger(),null,'expiry cannot mint a fresh registered action after copying');assert.equal(f.storageState.sets.length,before);assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_HOLD'),false);assert.equal(f.externalRequests(),0);
  await writeFile(join(f.path,'PRIVATE-ROW-COPY-DEADLINE.json'),JSON.stringify({label:'clock-controlled synthetic reserve-copy deadline refusal; no real latency claim',advances,clock,error:failure.code,registeredLedger:f.bridge.readActionLedger(),setsBefore:before,setsAfter:f.storageState.sets.length},null,2)+'\n');
 }finally{armed=false;globalThis.structuredClone=clone;Object.defineProperty(globalThis,'performance',performanceDescriptor);}
});
