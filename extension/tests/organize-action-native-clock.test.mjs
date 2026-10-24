import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
import {readOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
const originalDate=Date,originalPerformance=performance;
function declared(object,key){for(let p=object;p;p=Object.getPrototypeOf(p))if(Object.hasOwn(p,key))return p;throw Error('Missing original declaration');}
const cases=[
 ['Date.now function',()=>[originalDate,'now'],(d,count)=>({...d,value:()=>{count();return 0;}})],
 ['Date.now accessor',()=>[originalDate,'now'],(d,count)=>({configurable:d.configurable,enumerable:d.enumerable,get(){count();return d.value;}})],
 ['Date.now flags',()=>[originalDate,'now'],d=>({...d,writable:!d.writable})],
 ['global Date accessor',()=>[globalThis,'Date'],(d,count)=>({configurable:true,enumerable:d.enumerable,get(){count();return originalDate;}})],
 ['performance own function',()=>[originalPerformance,'now'],(_d,count)=>({configurable:true,value:()=>{count();return 0;}})],
 ['performance own accessor',()=>[originalPerformance,'now'],(_d,count)=>({configurable:true,get(){count();return ()=>0;}})],
 ['performance declaration function',()=>[declared(originalPerformance,'now'),'now'],(d,count)=>({...d,value:()=>{count();return 0;}})],
 ['global performance accessor',()=>[globalThis,'performance'],(d,count)=>({configurable:true,enumerable:d.enumerable,get(){count();return originalPerformance;}})]
];
for(const [label,locate,replace]of cases)test('original action pure facts deny '+label+' without executing the replacement or abort listeners',async t=>{
 const f=await fixture(t);let signal;await f.read((_reader,grant,tx)=>{signal=readOrganizeProcessingGrant(grant,f.s,tx).signal;});let calls=0,aborts=0;signal.addEventListener('abort',()=>aborts++);const [object,key]=locate(),descriptor=Object.getOwnPropertyDescriptor(object,key);let rejected=false;
 Object.defineProperty(object,key,replace(descriptor,()=>calls++));
 try{try{assertOriginalOrganizeActionFacts(f.source,f.action,f.s);}catch{rejected=true;}}
 finally{if(descriptor)Object.defineProperty(object,key,descriptor);else delete object[key];}
 assert.equal(rejected,true);assert.equal(calls,0);assert.equal(aborts,0);assert.equal(signal.aborted,false);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));f.source.release(f.action);assert.equal(aborts,1);f.source.release(f.action);assert.equal(aborts,1);
});
test('original action sampled current refuses a replaced public clock before calling it',async t=>{
 const f=await fixture(t),now=originalDate.now;let calls=0,rejected=false;originalDate.now=()=>{calls++;return now();};
 try{try{assertOriginalOrganizeActionCurrent(f.source,f.action,f.s);}catch{rejected=true;}}finally{originalDate.now=now;}
 assert.equal(rejected,true);assert.equal(calls,0);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});
test('deadline pure facts do not dispatch a replaced Math.min callback',async t=>{
 const f=await fixture(t),min=Math.min;let calls=0,value,error;Math.min=()=>{calls++;throw Error('Untrusted math callback');};
 try{try{value=assertOriginalOrganizeActionFacts(f.source,f.action,f.s);}catch(e){error=e;}}finally{Math.min=min;}
 assert.equal(error,undefined);assert.equal(value,true);assert.equal(calls,0);
});
test('a hidden platform performance setter replacement is never consulted for native action time',async t=>{
 const f=await fixture(t),root=Object.getOwnPropertyDescriptor(globalThis,'performance');if(!root?.set)throw Error('This control requires the original Node global performance accessor');let calls=0,current,facts;
 globalThis.performance={now(){calls++;return 0;}};
 try{current=assertOriginalOrganizeActionCurrent(f.source,f.action,f.s);facts=assertOriginalOrganizeActionFacts(f.source,f.action,f.s);}finally{globalThis.performance=originalPerformance;}
 assert.equal(current,true);assert.equal(facts,true);assert.equal(calls,0);assert.equal(assertOriginalOrganizeActionCurrent(f.source,f.action,f.s),true);
});
