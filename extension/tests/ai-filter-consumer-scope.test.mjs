import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {rootReadAuthority} from '../core/organizer/root-read.js';
import {createContextScopeWorkBudget,readContextProcessingPreflight,CONTEXT_TOPIC_SCOPE_LIMITS} from '../core/context-topic-scope.js';
import {createContextFilterVisibilityScope,takeFilterVisibilityConsumerOperations} from '../core/ai-usage/filter-visibility-consumer-scope.js';
const read=(s,fn)=>s.repository.transaction(false,fn),op=()=>crypto.randomUUID();
// Protocol-only preparation spy. It cannot mint a Filter grant or decision.
// The positive admission itself comes from the real original Context owner.
async function fixture(count=1){
 const calls=[],released=[],state={prepare:null};let inTransaction=0;
 const authority={canPrepareVisibility:()=>true,async prepareVisibility(ids){assert.equal(inTransaction,0);calls.push([...ids]);if(state.prepare)return state.prepare(ids);return {release(){released.push([...ids]);}};}};
 const f=await setup(OrganizerStore,{aiFilterAuthority:authority});await f.s.finishFoundation();await f.s.setFilterMode('off');
 if(count>1){const request=capture((await f.s.status()).epoch);request.messages=Array.from({length:count-1},(_,i)=>({sourceMessageId:'scope-'+i,pageOrder:i+2,originalText:'SYNTHETIC bounded scope Input '+i}));await f.s.capture(request);}
 const inputs=(await f.s.snapshot()).library.blocks,topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC consumer scope'});
 for(const input of inputs){const row=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:row.revision,topicIds:[topic.id]});}
 await f.s.setFilterMode('light');const operationId=op();
 await f.s.repository.transaction(true,async t=>{for(const input of inputs){const row=await t.get('filterInputs',input.id);await t.put('filterInputs',{...row,aiOperationId:operationId,aiDecision:{version:1}});}});
 const budget=createContextScopeWorkBudget({database:f.s.repository.db}),root=await read(f.s,rootReadAuthority),result=await readContextProcessingPreflight(f.s,{topicId:topic.id,inputIds:[inputs[0].id],expectedAuthority:root},budget);
 assert.equal(result.available,true,result.reason);
 const transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{inTransaction++;try{return await fn(t);}finally{inTransaction--; }},stores);
 return {...f,calls,released,state,budget,result,root,inputs,topic,operationId,token:()=>createContextFilterVisibilityScope(f.s,[result],budget)};
}
test('real admitted Context closure creates a single-use metadata-only scope; preparation runs outside transactions',async()=>{
 const f=await fixture(2),token=f.token();assert.ok(token);assert.deepEqual(Object.keys(token),[]);assert.equal(Object.isFrozen(token),true);const before=f.budget.reads;
 const transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const get=t.get.bind(t);t.get=async(name,key)=>{if(['blocks','records','thoughts'].includes(name))throw Error('preparation must not acquire text');return get(name,key);};return fn(t);},stores);
 assert.equal(await f.s.withAIFilterVisibilityScope(token,()=>42),42);assert.deepEqual(f.calls,[[f.operationId]]);assert.deepEqual(f.released,f.calls);assert.ok(f.budget.reads>before,'same original ledger includes metadata discovery');
 assert.equal(await f.s.withAIFilterVisibilityScope(token,()=>43),43);assert.equal(f.calls.length,1,'consumed scope cannot prepare twice');
});
for(const kind of ['Input DTO','copied admission','foreign ledger','foreign store'])test(kind+' cannot create a consumer preparation scope',async()=>{
 const f=await fixture();let token;
 if(kind==='Input DTO')token=createContextFilterVisibilityScope(f.s,[{available:true,inputIds:f.inputs.map(x=>x.id),authority:f.root,binding:f.result.binding}],f.budget);
 if(kind==='copied admission')token=createContextFilterVisibilityScope(f.s,[structuredClone(f.result)],f.budget);
 if(kind==='foreign ledger')token=createContextFilterVisibilityScope(f.s,[f.result],createContextScopeWorkBudget({database:f.s.repository.db}));
 if(kind==='foreign store')token=createContextFilterVisibilityScope({...f.s},[f.result],f.budget);
 assert.equal(token,null);assert.equal(await f.s.withAIFilterVisibilityScope(token,()=>true),true);assert.deepEqual(f.calls,[]);
});
for(const change of ['root generation','restore','filter mode'])test('old admitted token refuses '+change+' before any history preparation',async()=>{
 const f=await fixture(),token=f.token();assert.ok(token);
 await f.s.repository.transaction(true,async t=>{if(change==='filter mode'){const row=await t.get('meta','smart-filter');await t.put('meta',{...row,mode:'off'});}else{const id=change==='restore'?'recovery-restore-epoch':'backup-data-generation',row=await t.get('meta',id);await t.put('meta',{id,value:change==='restore'?op():(row?.value||0)+1});}});
 await f.s.withAIFilterVisibilityScope(token,()=>true);assert.deepEqual(f.calls,[]);
});
test('exhausted original Context work budget is not replaced by a fresh preparation allowance',async()=>{
 const f=await fixture(),token=f.token();assert.ok(token);f.budget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads;
 await f.s.withAIFilterVisibilityScope(token,()=>true);assert.deepEqual(f.calls,[]);assert.ok(f.budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads);
});
test('original read error survives and releases the prepared page exactly once',async()=>{
 const f=await fixture(),error=Object.assign(new Error('original cursor invalid'),{code:'CONTEXT_INVALIDATED'});
 await assert.rejects(f.s.withAIFilterVisibilityScope(f.token(),()=>{throw error;}),e=>e===error);assert.equal(f.calls.length,1);assert.equal(f.released.length,1);
});
test('preparation failure falls back to original read without an invented hidden result',async()=>{
 const f=await fixture();f.state.prepare=async()=>{throw Error('synthetic unavailable');};const result={original:true};assert.equal(await f.s.withAIFilterVisibilityScope(f.token(),()=>result),result);assert.equal(f.calls.length,1);assert.deepEqual(f.released,[]);
});
test('a foreign or reused scope cannot make metadata transaction inspect a supplied Input ID',async()=>{
 const f=await fixture();let gets=0;const tx={get(){gets++;throw Error('must not read');}};assert.equal(await takeFilterVisibilityConsumerOperations(f.s,Object.freeze({inputIds:[f.inputs[0].id]}),tx),null);assert.equal(gets,0);
});
test('an admitted original result cannot mint a second token or evaluate an array accessor',async()=>{
 const f=await fixture(),token=f.token();assert.ok(token);assert.equal(f.token(),null);let gets=0;const supplied=[];Object.defineProperty(supplied,'0',{enumerable:true,get(){gets++;return f.result;}});assert.equal(createContextFilterVisibilityScope(f.s,supplied,f.budget),null);assert.equal(gets,0);assert.deepEqual(f.calls,[]);
});
