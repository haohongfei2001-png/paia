import test from 'node:test';
import assert from 'node:assert/strict';
import {dormantSelectionWorker,deferred,tick} from './harness/dormant-selection-worker.mjs';

// These controls stage the missing OUTER premise in an isolated hashed graph.
// They exercise genuine private action/owner code, not production activation,
// historical/restorable coverage, browser/native acceptance or HELD reverse.
const releases=f=>f.hostMessages.filter(({message})=>message.type==='PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE');
const prepare=async f=>{if(f.manifest.stageOuterGate){const view=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(view.needsContextEnrollment,false,'actual original Context enrollment must settle');assert.equal(f.externalRequests(),0);}return f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);};
const activate=f=>f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));
const reached=async(entered,operation)=>Promise.race([entered,operation.then(value=>{throw new Error('SYNTHETIC action completed before expected original HOLD: '+JSON.stringify(value));},error=>{throw new Error('SYNTHETIC action refused before expected original HOLD: '+error?.code,{cause:error});})]);

test('unchanged outer gate denies all three global commands even with genuine configured originals and prepared cut',async t=>{
 const f=await dormantSelectionWorker(t);await f.addPage();await prepare(f);const before=f.storageState.sets.length;
 for(const type of ['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART'])await assert.rejects(f.bridge.selection.handle({type},f.sender),{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});
 assert.equal(f.storageState.sets.length,before);assert.equal(f.hostMessages.length,0);assert.equal(f.externalRequests(),0);assert.equal(f.manifest.stageOuterGate,false);
});

test('prototype replacement BEFORE FIRST transport composition never becomes an original receipt definition',async t=>{
 const f=await dormantSelectionWorker(t,{mutateReceiptBeforeFirstTransport:true});assert.ok(f.startupError);assert.equal(f.mutation.calls,0);assert.equal(f.hostMessages.length,0);assert.equal(f.externalRequests(),0);
 assert.equal(f.manifest.seams.filter(seam=>seam.path==='background/service-worker.js').length,1);assert.equal(f.manifest.stageOuterGate,false);
});

for(const invalidity of ['editor-close','receipt-dispose','receipt-topology'])test('original '+invalidity+' cannot RELEASE a document while accepted raw HOLD remains unresolved',async t=>{
 const f=await dormantSelectionWorker(t,{stageOuterGate:true}),page=await f.addPage();await prepare(f);const before=f.storageState.sets.length,entered=deferred(),gate=deferred();t.after(()=>gate.resolve());
 f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type==='PAIA_PROMPT_INSERTION_DOCUMENT_HOLD'){entered.resolve();await gate.promise;}return result;};
 const operation=activate(f);operation.catch(()=>{});try{await reached(entered.promise,operation);assert.equal(page.isFrozen(),true);
 if(invalidity==='editor-close')f.bridge.editors.close();
 if(invalidity==='receipt-dispose')f.bridge.receipts.dispose();
 if(invalidity==='receipt-topology')f.api.tabs.onUpdated.emit(7,{status:'loading'});
 let settled=false;operation.finally(()=>{settled=true;}).catch(()=>{});assert.equal(await f.bridge.transports.close(),false);await tick();await tick();
 assert.equal(settled,false,'public failure/cleanup does not settle the original raw native promise');assert.equal(releases(f).length,0);assert.equal(f.bridge.editors.blocksMutation(f.sender),true);await assert.rejects(f.bridge.transports.hold());
 gate.resolve();await assert.rejects(operation);await tick();assert.equal(releases(f).length,0,'late physical settlement does not authorize cleanup after invalidity');assert.equal(f.bridge.editors.blocksMutation(f.sender),true);assert.equal(f.storageState.sets.length,before);assert.equal(f.externalRequests(),0);
 }finally{gate.resolve();await operation.catch(()=>{});}
});

test('full unprojected editor and receipt metadata share the same two-MiB action meter',async t=>{
 const f=await dormantSelectionWorker(t,{stageOuterGate:true});await f.addPage();await prepare(f);const before=f.storageState.sets.length;
 // Each native result is individually below 2 MiB. No projected metadata or
 // per-owner fresh allowance may discard these actual accepted bytes.
 const padding='S'.repeat(720*1024);f.contexts[0].syntheticNativeMetadata=padding;let queries=0;
 f.hostState.query=tabs=>{queries++;return tabs.map(tab=>({...tab,syntheticNativeMetadata:padding}));};
 await assert.rejects(activate(f));assert.ok(queries>0,'the actual receipt inventory must participate');assert.equal(f.storageState.sets.length,before);assert.equal(f.bridge.editors.blocksMutation(f.sender),true);assert.equal(releases(f).length,0);assert.equal(f.externalRequests(),0);
});
