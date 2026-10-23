import assert from 'node:assert/strict';
import {IDBObjectStore,IDBIndex} from '../vendor/fake-indexeddb/build/esm/index.js';
// Test-only observation of the original exact request/retention charge sites.
// This is the measured oracle already used by organize-paid-metadata-cost.
const scopeFile='/core/organizer/organize-processing-scope.js';
export function spentObserver(){
 const passes=[],saved=[];let pass=null;
 const replace=(object,key,wrap)=>{const d=Object.getOwnPropertyDescriptor(object,key);saved.push([object,key,d]);Object.defineProperty(object,key,{...d,value:wrap(d.value)});};
 for(const [owner,method]of [[IDBObjectStore.prototype,'get'],[IDBObjectStore.prototype,'count'],[IDBObjectStore.prototype,'openCursor'],[IDBIndex.prototype,'openCursor']])replace(owner,method,original=>function(...args){
  if((new Error().stack||'').includes(scopeFile+':')){if(method==='get'&&this.name==='meta'&&args[0]==='gate'){pass={requests:0,encodedBytes:0,receiptTuples:0,observations:0};passes.push(pass);}assert.ok(pass);pass.requests++;}return Reflect.apply(original,this,args);
 });
 replace(TextEncoder.prototype,'encode',original=>function(...args){
  const result=Reflect.apply(original,this,args),stack=new Error().stack||'';
  // Original snapshot's private string bound checks are not action-retention
  // debits. Observe only the existing outer retain and the new closed receipts.
  if(pass&&stack.includes(scopeFile+':')&&!stack.includes('/core/ai-usage/qwen-request-data.js:')){
   pass.encodedBytes+=result.length;const value=JSON.parse(args[0]);if(Array.isArray(value)&&value.length===5&&value.every(Number.isSafeInteger))pass.receiptTuples++;
   if(value&&value.version===1&&Number.isSafeInteger(value.retains)&&Number.isSafeInteger(value.keys)&&Number.isSafeInteger(value.bytes))pass.observations++;
  }
  return result;
 });
 return {passes,restore(){for(const [object,key,d]of saved.reverse())Object.defineProperty(object,key,d);}};
}
export function actualCost(pass){return {reads:pass.requests,bytes:pass.encodedBytes+(pass.receiptTuples?pass.receiptTuples+1:0)+2*pass.observations};}
