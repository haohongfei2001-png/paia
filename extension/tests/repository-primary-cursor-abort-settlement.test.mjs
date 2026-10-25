import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
const source=process.env.PAIA_CURSOR_GRAPH?pathToFileURL(join(process.env.PAIA_CURSOR_GRAPH,'extension/core/idb-repository.js')):new URL('../core/idb-repository.js',import.meta.url);
const {ArchiveRepository,awaitRepositoryTransactionSettled,requireRepositoryTransactionSucceeded}=await import(source);
for(const limit of [2,1])test(`original primaryRangePage abort before ${limit===2?'continuation':'key-probe creation'} rejects and actually unwinds`,async t=>{
 const factory=new IDBFactory(),local={get:async()=>({}),set:async()=>{}},repository=new ArchiveRepository(local,{indexedDB:factory,name:'SYNTHETIC-primary-abort-'+limit});t.after(()=>repository.db?.close());
 await repository.transaction(true,async tx=>{await tx.put('meta',{id:'SYNTHETIC_A',value:1});await tx.put('meta',{id:'SYNTHETIC_B',value:2});},['meta']);
 const original=IDBObjectStore.prototype.openCursor,events=[];let scope,actualAbort=0,callbackReturned=false,injected=false,settled=false;
 IDBObjectStore.prototype.openCursor=function(...args){const request=Reflect.apply(original,this,args);if(this.transaction.db===repository.db&&this.transaction.mode==='readonly'&&!injected){injected=true;const tx=this.transaction;tx.addEventListener('abort',()=>{actualAbort++;events.push('native-abort');});request.addEventListener('success',()=>{events.push('request-success');tx.abort();events.push('abort-issued');},{once:true});}return request;};
 t.after(()=>{IDBObjectStore.prototype.openCursor=original;});
 let failure;const actual=repository.transaction(false,async tx=>{scope=tx;try{return await tx.primaryRangePage('meta',{prefix:'SYNTHETIC_',limit});}finally{callbackReturned=true;events.push('original-callback-unwind');}},['meta']);
 try{await assert.rejects(actual,error=>{failure=error;return true;});events.push('original-transaction-rejection');await awaitRepositoryTransactionSettled(repository,scope);settled=true;events.push('original-settled-wait');}finally{IDBObjectStore.prototype.openCursor=original;}
 assert.equal(injected,true);assert.equal(actualAbort,1);assert.equal(callbackReturned,true);assert.equal(settled,true);assert.ok(events.indexOf('native-abort')<events.indexOf('original-transaction-rejection'));assert.throws(()=>requireRepositoryTransactionSucceeded(repository,scope),error=>error.code==='STALE_BASE');
 const evidence={label:'NEW direct original repository synthetic abort/settlement control; no selection/config/outer-gate seam and no native browser claim',source:String(source),limit,error:failure?.code,events,actualAbort,callbackReturned,settled,commitReceiptRefused:true};
 if(process.env.PAIA_CURSOR_EVIDENCE){await mkdir(process.env.PAIA_CURSOR_EVIDENCE,{recursive:true});await writeFile(join(process.env.PAIA_CURSOR_EVIDENCE,'primary-abort-'+limit+'.json'),JSON.stringify(evidence,null,2)+'\n');}
});
