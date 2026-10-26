import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {IDBObjectStore as FDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';

test('mutable array prototype Proxy revocation during original operand prepayment cannot reach the next native request',async t=>{
 const fixtureStarted=performance.now(),f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);
 const map=Array.prototype.map,cursor=FDBObjectStore.prototype.openCursor;let injected=null,traps=0,requests=0,ledgerAtTrap=null;
 Array.prototype.map=function(callback,...args){const value=Reflect.apply(map,this,[callback,...args]);if(!injected&&callback?.name==='queryOperand'&&this[0]==='importTasks'&&f.bridge.readActionLedger()){injected=new Proxy(value,{getOwnPropertyDescriptor(target,key){if(!traps++){f.bridge.editors.close();ledgerAtTrap=f.bridge.readActionLedger();}return Reflect.getOwnPropertyDescriptor(target,key);}});return injected;}return value;};
 FDBObjectStore.prototype.openCursor=function(...args){if(traps&&this.name==='importTasks')requests++;return Reflect.apply(cursor,this,args);};
 const before=f.storageState.sets.length,started=performance.now();let failure;
 try{await assert.rejects(f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control)),error=>{failure=error;return true;});}
 finally{Array.prototype.map=map;FDBObjectStore.prototype.openCursor=cursor;}
 const ledger=f.bridge.readActionLedger();await writeFile(join(f.path,'METER-BOUNDARY-PROXY.json'),JSON.stringify({label:'synthetic original action operand Proxy refusal; no native/browser claim',traps,requests,ledgerAtTrap,ledger,actionElapsedMs:performance.now()-started,fixtureElapsedMs:performance.now()-fixtureStarted,error:failure?.code,setsBefore:before,setsAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
 assert.ok(injected);assert.ok(traps>0);assert.equal(ledgerAtTrap.invalid,true);assert.equal(requests,0);assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(f.storageState.sets.length,before);assert.equal(f.externalRequests(),0);assert.equal(f.bridge.editors.blocksMutation(f.sender),true);
 const costs=Object.values(ledger.costs);assert.equal(costs.reduce((n,c)=>n+c.references,0),ledger.references);assert.equal(costs.reduce((n,c)=>n+c.bytes,0),ledger.bytes);
});
