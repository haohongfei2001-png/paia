import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {rootReadAuthority} from '../core/organizer/root-read.js';
import * as scope from '../core/context-topic-scope.js';
const op=()=>crypto.randomUUID();
async function fixture(count=2){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');
 if(count>1){const r=capture((await f.s.status()).epoch);r.messages=Array.from({length:count-1},(_,i)=>({sourceMessageId:'metadata-'+i,pageOrder:i+2,originalText:'SYNTHETIC metadata Input '+i}));await f.s.capture(r);}
 const inputs=(await f.s.snapshot()).library.blocks,topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC metadata Topic'});
 for(const input of inputs){const row=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:row.revision,topicIds:[topic.id]});}
 const abort=new AbortController(),budget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:abort.signal}),authority=await f.s.repository.transaction(false,rootReadAuthority),options={topicId:topic.id,inputIds:[inputs[0].id],expectedAuthority:authority};
 const result=await scope.readContextProcessingPreflight(f.s,options,budget);assert.equal(result.available,true,result.reason);
 return {...f,inputs,topic,budget,abort,authority,options,result,read:()=>scope.readContextProcessingMetadata(result,f.s,budget)};
}
test('successful original preflight exposes its complete frozen body-free metadata without any additional read or hash',async()=>{
 const f=await fixture(),before={reads:f.budget.reads,hashFields:f.budget.hashFields,hashBytes:f.budget.hashBytes},transaction=f.s.repository.transaction;
 f.s.repository.transaction=()=>{throw Error('metadata reader must not scan or acquire fields');};let value;try{value=f.read();}finally{f.s.repository.transaction=transaction;}
 assert.deepEqual(value,{inputIds:f.inputs.map(x=>x.id).sort(),binding:f.result.binding,authority:f.authority});assert.deepEqual(Object.keys(value).sort(),['authority','binding','inputIds']);assert.ok(Object.isFrozen(value)&&Object.isFrozen(value.inputIds)&&Object.isFrozen(value.binding));assert.deepEqual({reads:f.budget.reads,hashFields:f.budget.hashFields,hashBytes:f.budget.hashBytes},before);assert.doesNotMatch(JSON.stringify(value),/SYNTHETIC metadata Input/);
});
for(const kind of ['copy','foreign store','foreign repository','foreign database','foreign ledger','missing ledger'])test('preflight metadata refuses '+kind,async()=>{
 const f=await fixture(1);let result=f.result,store=f.s,budget=f.budget,restore=()=>{};
 if(kind==='copy')result=structuredClone(result);
 if(kind==='foreign store')store={...f.s};
 if(kind==='foreign repository'){const old=f.s.repository;f.s.repository={...old};restore=()=>{f.s.repository=old;};}
 if(kind==='foreign database'){const old=f.s.repository.db;f.s.repository.db={};restore=()=>{f.s.repository.db=old;};}
 if(kind==='foreign ledger')budget=scope.createContextScopeWorkBudget({database:f.s.repository.db});
 if(kind==='missing ledger')budget=null;
 try{assert.equal(scope.readContextProcessingMetadata(result,store,budget),null);}finally{restore();}
});
for(const field of ['available','binding','nested binding'])test('changed '+field+' refuses without executing an accessor and cannot revive after observation',async()=>{
 const f=await fixture(1),row=field==='nested binding'?f.result.binding:f.result,key=field==='nested binding'?'topicId':field,old=Object.getOwnPropertyDescriptor(row,key);let touches=0;
 Object.defineProperty(row,key,{configurable:true,enumerable:true,get(){touches++;return old.value;}});assert.equal(f.read(),null);assert.equal(touches,0);Object.defineProperty(row,key,old);assert.equal(f.read(),null);
});
test('the original work signal revokes metadata even when a shadowed aborted getter says false',async()=>{
 const f=await fixture(1);let touches=0;Object.defineProperty(f.abort.signal,'aborted',{get(){touches++;return false;}});f.abort.abort();assert.equal(f.read(),null);assert.equal(touches,0);
});
test('failed original admission cannot provide metadata even with a copied successful binding',async()=>{
 const f=await fixture(1),denied=await scope.readContextProcessingPreflight(f.s,{...f.options,expectedAuthority:'not-the-original-authority'},f.budget);assert.equal(denied.available,false);assert.equal(scope.readContextProcessingMetadata(denied,f.s,f.budget),null);
});
test('complete 200-Input metadata is preserved and a 201-Input closure gives no truncated preparation hint',async()=>{
 const f=await fixture(200);assert.equal(f.read().inputIds.length,200);
 const r=capture((await f.s.status()).epoch);r.messages=[{sourceMessageId:'metadata-overflow',pageOrder:999,originalText:'SYNTHETIC final Input beyond metadata preparation bound'}];await f.s.capture(r);
 const input=(await f.s.snapshot()).library.blocks.find(x=>!f.inputs.some(old=>old.id===x.id));assert.ok(input);
 const row=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:row.revision,topicIds:[f.topic.id]});
 const authority=await f.s.repository.transaction(false,rootReadAuthority),result=await scope.readContextProcessingPreflight(f.s,{...f.options,expectedAuthority:authority},f.budget);assert.equal(result.available,true,result.reason);assert.equal(scope.readContextProcessingMetadata(result,f.s,f.budget),null,'a bounded hint cannot silently omit the last Input');
});

test('legacy ledger signal rebinding preserves original admission but cannot mint the new exact metadata hint',async()=>{
 const f=await fixture(1),legacy=scope.createContextScopeWorkBudget({database:f.s.repository.db});legacy.signal=f.abort.signal;
 const result=await scope.readContextProcessingPreflight(f.s,f.options,legacy);assert.equal(result.available,true,result.reason);assert.equal(scope.readContextProcessingMetadata(result,f.s,legacy),null);
});
