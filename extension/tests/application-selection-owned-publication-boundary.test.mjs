import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {dormantSelectionWorker,deferred} from './harness/dormant-selection-worker.mjs';
const ROW='paia-sync-local-lifecycle:v1';
async function prepared(t){const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();let wire;f.storageState.set=(value,write)=>{if(Object.hasOwn(value,ROW))wire=value[ROW];return write();};const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);return {...f,wire};}
const activate=f=>f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));
function lastInitializerCoreCheck(effect){const original=Array.prototype.some;let calls=0,fired=false;
 Array.prototype.some=function(fn,...rest){if(!fired&&this.length===3&&this[0]?.repository&&this[0]?.stores&&new Error().stack.includes('Object.initialize')){calls++;if(calls===2){fired=true;effect();}}return Reflect.apply(original,this,[fn,...rest]);};
 return {restore:()=>{Array.prototype.some=original;},state:()=>({calls,fired})};
}
function holdNative(f){const original=IDBObjectStore.prototype.get,arrived=deferred(),release=deferred();let held=false;
 IDBObjectStore.prototype.get=function(key){const request=Reflect.apply(original,this,[key]);if(!held&&key==='context-connection-runtime:v1'&&f.bridge.readActionLedger()){held=true;let callback;Object.defineProperty(request,'onsuccess',{configurable:true,get(){return event=>{arrived.resolve();release.promise.then(()=>callback?.call(request,event));};},set(value){callback=value;}});}return request;};
 return {arrived:arrived.promise,release:()=>release.resolve(),restore:()=>{IDBObjectStore.prototype.get=original;release.resolve();}};
}
async function record(f,name,value){await writeFile(join(f.path,name+'.json'),JSON.stringify(value,null,2)+'\n');}

test('late core validator can mutate only separate SDK wire, never the owned publication or its child graph',async t=>{
 const f=await prepared(t),hold=holdNative(f);t.after(hold.restore);let traps=0;
 const hook=lastInitializerCoreCheck(()=>{f.wire.mode='disconnected';f.wire.enrollmentSettlement=new Proxy({phase:'pending'},{ownKeys(target){traps++;return Reflect.ownKeys(target);},get(target,key){traps++;return Reflect.get(target,key);},getOwnPropertyDescriptor(target,key){traps++;return Reflect.getOwnPropertyDescriptor(target,key);}});});
 let action;try{action=activate(f);action.catch(()=>{});await Promise.race([hold.arrived,action.then(()=>{throw Error('SYNTHETIC expected held original read');})]);hook.restore();assert.equal(hook.state().fired,true);assert.equal(traps,0,'private row traversal must never encounter the SDK-inserted Proxy');assert.equal((await f.bridge.sync.snapshot()).state,'active');assert.equal(f.bridge.readActionLedger().invalid,false);f.bridge.editors.close();hold.release();await assert.rejects(action);}
 finally{hook.restore();hold.restore();}
 const ledger=f.bridge.readActionLedger();assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(f.externalRequests(),0);await record(f,'OWNED-PUBLICATION-PROXY',{label:'synthetic late original core validator SDK-alias mutation; no authority seam',hook:hook.state(),traps,ledger,externalRequests:f.externalRequests()});
});

test('genuine reentrant PAUSE in the last executable core check blocks publication and still durably settles',async t=>{
 const f=await prepared(t),arrived=deferred(),release=deferred();let pause;
 f.storageState.set=async(value,write)=>{if(value[ROW]?.mode==='paused'){arrived.resolve();await release.promise;}return write();};
 const hook=lastInitializerCoreCheck(()=>{pause=f.bridge.sync.handle({type:'PAIA_SYNC_PAUSE'},f.sender);pause.catch(()=>{});});let failure;
 try{await assert.rejects(activate(f),error=>{failure=error;return true;});hook.restore();assert.equal(hook.state().fired,true);assert.ok(pause);await arrived.promise;assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_HOLD'),false);const ledger=f.bridge.readActionLedger();assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);release.resolve();await pause;assert.equal((await f.storage.get(ROW))[ROW].mode,'paused');assert.deepEqual(f.bridge.readActionLedger(),ledger,'independent accepted stop cannot debit the selection ticket');await record(f,'OWNED-PUBLICATION-REENTRANT-STOP',{label:'synthetic real stop accepted during last original core validator',hook:hook.state(),error:failure.code,ledger,durableMode:'paused'});}
 finally{hook.restore();release.resolve();}
 assert.equal(f.externalRequests(),0);
});

test('mutable SDK write copy cannot rewrite the owned intent used by original readback CAS',async t=>{
 const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();let changed=0;
 f.storageState.set=(value,write)=>{if(value[ROW]?.enrollmentSettlement?.phase==='pending'){changed++;value[ROW].mode='paused';}return write();};let failure;
 await assert.rejects(f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender),error=>{failure=error;return true;});assert.equal(changed,1);assert.equal(failure.code,'BNS_SYNC_STATE_CHANGED');const raw=(await f.storage.get(ROW))[ROW];assert.equal(raw.mode,'paused');assert.equal(raw.enrollmentSettlement.phase,'pending');assert.equal((await f.bridge.sync.snapshot()).needsContextEnrollment,true);assert.equal(f.bridge.readActionLedger(),null);assert.equal(f.externalRequests(),0);await record(f,'OWNED-PUBLICATION-WRITE-CAS',{label:'synthetic changed SDK wire; pending durable evidence retained, no retry',error:failure.code,changed,durableMode:raw.mode,durableSettlement:raw.enrollmentSettlement.phase});
});

test('ordinary schema-valid RESERVED array task survives original readback and stops without claiming completed recovery',async t=>{
 const f=await prepared(t),row=(await f.storage.get(ROW))[ROW];
 const ref=c=>({id:c.repeat(64),digest:c.repeat(64),kind:'checkpoint-manifest',codec:'identity',encodedBytes:1,decodedBytes:1});
 // This is a structural synthetic durable RESERVED receipt, not a validated
 // union proof, confirmed task, UNKNOWN clearing or successful restore.
 row.task={kind:'restore',id:'SYNTHETIC_reserved_array',phase:'reserved',reference:{version:1,kind:'source-bootstrap-union',datasetId:f.seed.coreA.datasetId,ancestorRef:ref('1'),headRefs:[ref('2'),ref('3')],selectionId:'4'.repeat(64)}};
 await f.storage.set({[ROW]:row});await f.bridge.sync.reconcile();assert.equal((await f.bridge.sync.snapshot()).task.phase,'reserved');await f.bridge.sync.handle({type:'PAIA_SYNC_PAUSE'},f.sender);const paused=(await f.storage.get(ROW))[ROW];assert.equal(paused.mode,'paused');assert.deepEqual(paused.task.reference,row.task.reference);assert.equal(paused.task.phase,'reserved');await assert.rejects(activate(f),error=>error.code==='BNS_SYNC_TASK_PENDING');assert.equal(f.bridge.readActionLedger(),null);assert.equal(f.externalRequests(),0);await record(f,'OWNED-PUBLICATION-ORDINARY-ARRAY',{label:'synthetic accepted schema only; RESERVED never promoted to confirmed',phase:paused.task.phase,heads:paused.task.reference.headRefs.length,durableMode:paused.mode,selectionRegistered:false});
});
