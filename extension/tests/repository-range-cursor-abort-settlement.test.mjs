import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange,IDBObjectStore,IDBIndex} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
const source=process.env.PAIA_CURSOR_GRAPH?pathToFileURL(join(process.env.PAIA_CURSOR_GRAPH,'extension/core/idb-repository.js')):new URL('../core/idb-repository.js',import.meta.url);
const {ArchiveRepository,awaitRepositoryTransactionSettled,requireRepositoryTransactionSucceeded}=await import(source);
for(const method of ['rangePage','indexPrimaryPage','page'])test(`original ${method} abort rejects its own asynchronous continuation and actually settles`,async t=>{
 const repository=new ArchiveRepository({get:async()=>({}),set:async()=>{}},{indexedDB:new IDBFactory(),name:'SYNTHETIC-'+method+'-abort'});t.after(()=>repository.db?.close());const table=method==='indexPrimaryPage'?'recordIndex':'meta';
 await repository.transaction(true,async tx=>{for(const id of ['SYNTHETIC_A','SYNTHETIC_B'])await tx.put(table,{id,sourceKey:'SYNTHETIC_source'});},[table,'meta']);
 const prototype=method==='indexPrimaryPage'?IDBIndex.prototype:IDBObjectStore.prototype,original=prototype.openCursor,events=[];let scope,injected=false,actualAbort=0,callbackReturned=false;
 prototype.openCursor=function(...args){const request=Reflect.apply(original,this,args),tx=method==='indexPrimaryPage'?this.objectStore.transaction:this.transaction;if(tx.db===repository.db&&tx.mode==='readonly'&&!injected){injected=true;tx.addEventListener('abort',()=>{actualAbort++;events.push('native-abort');});request.addEventListener('success',()=>{events.push('request-success');tx.abort();events.push('abort-issued');},{once:true});}return request;};t.after(()=>{prototype.openCursor=original;});
 let failure;const actual=repository.transaction(false,async tx=>{scope=tx;try{
  if(method==='rangePage')return await tx.rangePage(table,null,IDBKeyRange.bound('SYNTHETIC_','SYNTHETIC_\uffff'),null,2);
  if(method==='indexPrimaryPage')return await tx.indexPrimaryPage(table,'bySource','SYNTHETIC_source',{after:'SYNTHETIC_B',limit:2});
  return await tx.page(table,{after:'SYNTHETIC_',limit:2});
 }finally{callbackReturned=true;events.push('original-callback-unwind');}},[table]);
 try{await assert.rejects(actual,error=>{failure=error;return true;});events.push('original-transaction-rejection');await awaitRepositoryTransactionSettled(repository,scope);events.push('original-settled-wait');}finally{prototype.openCursor=original;}
 assert.equal(injected,true);assert.equal(actualAbort,1);assert.equal(callbackReturned,true);assert.ok(events.indexOf('native-abort')<events.indexOf('original-transaction-rejection'));assert.throws(()=>requireRepositoryTransactionSucceeded(repository,scope),error=>error.code==='STALE_BASE');
 const evidence={label:'NEW direct original repository synthetic actual abort; no selection/host authority and no native-browser claim',source:String(source),method,continuation:method==='indexPrimaryPage'?'continuePrimaryKey':'continue',error:failure?.code,events,actualAbort,callbackReturned,settled:true,commitReceiptRefused:true};if(process.env.PAIA_CURSOR_EVIDENCE){await mkdir(process.env.PAIA_CURSOR_EVIDENCE,{recursive:true});await writeFile(join(process.env.PAIA_CURSOR_EVIDENCE,method+'-abort.json'),JSON.stringify(evidence,null,2)+'\n');}
});
