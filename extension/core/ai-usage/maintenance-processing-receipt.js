import {assertMaintenanceProcessingRawDenialFacts} from './maintenance-processing-denial.js';
import {equal,fail,opaque} from './contracts.js';
const captures=new WeakMap(),keys=['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'];
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const need=value=>{if(!value)fail('UNAVAILABLE');};
const descriptor=(object,key)=>{const d=Object.getOwnPropertyDescriptor(object,key);need(d&&Object.hasOwn(d,'value'));return d;};
const flags=d=>[d.enumerable,d.configurable,d.writable];
const sameFlags=(a,b)=>a.every((value,index)=>value===b[index]);
// Only descriptor values are inspected. Neither initial capture nor a later
// comparison invokes a scope accessor or serializes caller-owned live data.
function captureScope(scope){
 const seen=new WeakSet(),nodes=[],encoder=new TextEncoder();let bytes=0,count=0;
 const charge=n=>{bytes+=n;need(bytes<=32768);};
 const walk=(value,depth)=>{
  need(depth<=16);
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){charge(24);return value;}
  if(typeof value==='string'){need(value.length<=32768);charge(encoder.encode(JSON.stringify(value)).length);return value;}
  need(value&&typeof value==='object'&&!seen.has(value));seen.add(value);
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value),names=Reflect.ownKeys(value);need(array||prototype===Object.prototype||prototype===null);need(names.every(k=>typeof k==='string')&&(count+=names.length)<=4096);if(array){const length=descriptor(value,'length').value;need(Number.isSafeInteger(length)&&length>=0&&length<=4096&&names.length===length+1&&names.every(k=>k==='length'||/^(0|[1-9][0-9]*)$/.test(k)&&Number(k)<length));}charge(2+names.length);
  const out=array?[]:Object.create(null),entries=[];nodes.push({value,prototype,names,entries,immutable:Object.isFrozen(value)});
  for(const key of names){const d=descriptor(value,key);entries.push({key,value:d.value,flags:flags(d)});if(array&&key==='length')continue;need(d.enumerable&&key.length<=32768);charge(encoder.encode(JSON.stringify(key)).length);out[key]=walk(d.value,depth+1);}
  if(array)need(out.length===descriptor(value,'length').value);return Object.freeze(out);
 };
 return {snapshot:walk(scope,0),nodes};
}
function capturedFacts(record){
 try{assertMaintenanceProcessingRawDenialFacts(record.raw,record.store);}catch{fail('UNAVAILABLE');}
 if(!record.immutable){need(Object.getPrototypeOf(record.raw)===record.prototype);const names=Reflect.ownKeys(record.raw);need(names.length===keys.length&&names.every(k=>keys.includes(k)));
 for(const expected of record.fields){const d=descriptor(record.raw,expected.key);need(Object.is(d.value,expected.value)&&sameFlags(flags(d),expected.flags));}}
 for(const node of record.nodes){if(node.immutable)continue;need(Object.getPrototypeOf(node.value)===node.prototype);const names=Reflect.ownKeys(node.value);need(names.length===node.names.length&&names.every((k,index)=>k===node.names[index]));for(const expected of node.entries){const d=descriptor(node.value,expected.key);need(Object.is(d.value,expected.value)&&sameFlags(flags(d),expected.flags));}}
 need(descriptor(record.store,'repository').value===record.repository&&descriptor(record.repository,'db').value===record.database&&!signalAborted.call(record.signal));
}
// Denial-only closing comparison for an already sampled original receipt.
// No issuer or public clock is sampled here. This never grants permission or
// replaces the original currentness/expiry checks performed before a tail sweep.
export function assertMaintenanceProcessingReceiptCapturedFacts(raw,store){const record=captures.get(raw);need(record&&record.store===store);capturedFacts(record);try{assertMaintenanceProcessingRawDenialFacts(record.raw,record.store);}catch{fail('UNAVAILABLE');}return true;}
function unchanged(record){capturedFacts(record);need(Date.now()<record.expiresAt);try{assertMaintenanceProcessingRawDenialFacts(record.raw,record.store);}catch{fail('UNAVAILABLE');}}
// Terminal comparison only. The original issuer check must already have run;
// this cannot grant permission or call an issuer while checking another cap.
export function assertMaintenanceProcessingReceiptFacts(raw,store){const record=captures.get(raw);need(record&&record.store===store);unchanged(record);return true;}
export function assertMaintenanceProcessingReceipts(receipts,processing,store){
 need(Array.isArray(receipts)&&receipts.length>0&&receipts.length<=2&&new Set(receipts).size===receipts.length);
 const records=receipts.map(raw=>{const record=captures.get(raw);need(record&&record.store===store&&record.resolve===processing?.resolve&&record.isCurrent===processing?.isCurrent);unchanged(record);return record;});
 for(const record of records){unchanged(record);const current=record.isCurrent.call(processing,record.raw,store);if(current!==true){Promise.resolve(current).catch(()=>{});fail('UNAVAILABLE');}unchanged(record);}
 // A later issuer callback may change an earlier receipt. Check all captured
 // facts once more without invoking any issuer or refreshing either baseline.
 for(const record of records)unchanged(record);return true;
}
export function assertMaintenanceProcessingReceipt(raw,processing,store){return assertMaintenanceProcessingReceipts([raw],processing,store);}
// The original source issuer remains the authority. This bookkeeping preserves
// its exact receipt identity and prevents mutable aliases from refreshing a
// previously checked scope; it does not mint processing permission.
export function captureMaintenanceProcessingReceipt(raw,{processing,store,caller,scope}){
 need(raw&&typeof raw==='object'&&!Array.isArray(raw)&&typeof processing?.resolve==='function'&&typeof processing?.isCurrent==='function');
 const prior=captures.get(raw);if(prior){assertMaintenanceProcessingReceipt(raw,processing,store);need(prior.caller===caller&&equal(prior.scope,scope));return raw;}
 const names=Reflect.ownKeys(raw);need(names.length===keys.length&&names.every(k=>keys.includes(k)));const fields=keys.map(key=>{const d=descriptor(raw,key);return {key,value:d.value,flags:flags(d)};}),values=Object.fromEntries(fields.map(x=>[x.key,x.value]));
 need(values.version===1&&values.store===store&&values.caller===caller&&Object.isFrozen(caller)&&opaque(values.epoch)&&values.processing===true&&Number.isSafeInteger(values.expiresAt)&&values.expiresAt>Date.now()&&values.revocationSignal instanceof AbortSignal&&!signalAborted.call(values.revocationSignal));
 const captured=captureScope(values.scope);need(equal(captured.snapshot,scope));const record={raw,immutable:Object.isFrozen(raw),prototype:Object.getPrototypeOf(raw),fields,nodes:captured.nodes,scope:captured.snapshot,store,caller,repository:descriptor(store,'repository').value,database:descriptor(descriptor(store,'repository').value,'db').value,signal:values.revocationSignal,expiresAt:values.expiresAt,resolve:processing.resolve,isCurrent:processing.isCurrent};captures.set(raw,record);
 try{assertMaintenanceProcessingReceipt(raw,processing,store);}catch(error){captures.delete(raw);throw error;}return raw;
}
