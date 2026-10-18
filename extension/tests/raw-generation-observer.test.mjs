import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {installRawGenerationObservation} from './harness/raw-generation-observer.mjs';
function fixture(){
 const sentinel={},failure=Error('original failure');class Store {constructor(name,tx){this.name=name;this.transaction=tx;}put(value){if(value?.fail)throw failure;return sentinel;}add(value){return this.put(value);}delete(){return sentinel;}clear(){return sentinel;}}
 const prior=Store.prototype.put,context=vm.createContext({IDBObjectStore:Store,structuredClone,Date});vm.runInContext(`(${installRawGenerationObservation.toString()})()`,context);
 const tx=()=>({mode:'readwrite',listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},finish(name='complete'){for(const f of this.listeners[name]||[])f();}});
 return {Store,context,prior,sentinel,failure,tx,read:()=>context.__paiaRawGenerationObservation.read()};
}
test('generation observation preserves native result and retains only bounded transaction metadata',()=>{
 const f=fixture(),tx=f.tx();assert.equal(new f.Store('blocks',tx).put({id:'PRIVATE_ID',value:{revision:7,libraryText:'PRIVATE_BODY',note:'PRIVATE_NOTE'}}),f.sentinel);
 new f.Store('meta',tx).put({id:'backup-data-generation',value:18});tx.finish();const result=f.read();assert.equal(result.transactions.length,1);assert.equal(result.transactions[0].generation,18);assert.deepEqual(Array.from(result.transactions[0].revisions,x=>({...x})),[{store:'blocks',revision:7}]);assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
 f.context.__paiaRawGenerationObservation.restore();assert.equal(f.Store.prototype.put,f.prior);
});
test('failed writes still throw the original error and aborted generations remain explicitly aborted',()=>{
 const f=fixture(),tx=f.tx(),store=new f.Store('meta',tx);assert.throws(()=>store.put({fail:true}),error=>error===f.failure);assert.equal(f.read().transactions.length,0);store.put({id:'backup-data-generation',value:19});tx.finish('abort');assert.equal(f.read().transactions[0].result,'abort');
});
test('observer never emits body-free unrelated writes and caps retained completed transactions',()=>{
 const f=fixture(),other=f.tx();new f.Store('filterInputs',other).put({value:'PRIVATE'});other.finish();assert.equal(f.read().transactions.length,0);
 for(let n=0;n<140;n++){const tx=f.tx();new f.Store('meta',tx).put({id:'backup-data-generation',value:n});tx.finish();}assert.equal(f.read().transactions.length,128);assert.equal(f.read().transactions[0].generation,12);
});
