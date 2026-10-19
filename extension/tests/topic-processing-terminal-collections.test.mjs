import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,op,raw} from './harness/topic-02.mjs';
import {TopicProcessingGuard,requireTopicProcessingFinalFacts} from '../core/topic-processing.js';
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';
import {createMaintenanceQualification,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';
import {createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from '../core/context-topic-scope.js';

const marker='original-two-owner-terminal';
async function setup(){
 const f=await fixture(),workSignal=new AbortController(),budget=createContextScopeWorkBudget({database:f.s.repository.db,signal:workSignal.signal}),owners=[];
 const makeOwner=()=>{
  const caller=Object.freeze({id:op()}),signal=new AbortController(),rawReceipts=new WeakSet(),state={checks:0,onCurrent:null};
  const processing={resolve:async(_t,scope)=>{const receipt=Object.freeze({version:1,store:f.s,caller,scope,epoch:'independent-'+op(),processing:true,expiresAt:Date.now()+600000,revocationSignal:signal.signal});rawReceipts.add(receipt);return receipt;},isCurrent:receipt=>{state.checks++;state.onCurrent?.(receipt);return rawReceipts.has(receipt);}};
  const owner=new TopicProcessingAuthority(f.s,{caller,processing,binding:{operationId:op()},workBudget:budget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(t,request)=>owner.authorize(t,request)}),result={owner,guard,signal,state};owners.push(result);return result;
 };
 const first=makeOwner(),second=makeOwner();
 const close=async()=>{for(const {owner}of owners)owner.release();await f.s.repository.close();};
 return {...f,budget,workSignal,first,second,close};
}
async function fields(f){
 const caller=Object.freeze({id:op()}),signal=new AbortController(),rawReceipts=new WeakSet(),state={checks:0,onCurrent:null};
 const processing={resolve:async(_t,scope)=>{const receipt=Object.freeze({version:1,store:f.s,caller,scope,epoch:'independent-fields-'+op(),processing:true,expiresAt:Date.now()+600000,revocationSignal:signal.signal});rawReceipts.add(receipt);return receipt;},isCurrent:receipt=>{state.checks++;state.onCurrent?.(receipt);return rawReceipts.has(receipt);}};
 const token=await f.s.repository.transaction(false,t=>createMaintenanceQualification(f.s,t,{items:[],coverage:[]},{processing,caller,binding:{jobId:op(),childId:op()},isCurrent:()=>true,signal:signal.signal,workBudget:f.budget,selection:{inputIds:f.scope.map(x=>x.inputId)}}));
 return {token,signal,state};
}
async function twoOwners({at=Infinity,change='identity',withFields=false}={}){
 const f=await setup(),field=withFields?await fields(f):null;let revoked=0;
 try{
  const observed=change==='later-field-issuer'?field.state:f.second.state;
  observed.onCurrent=()=>{if(observed.checks!==at)return;revoked++;if(change==='fields')field.signal.abort();else if(change==='work-signal')f.workSignal.abort();else if(change==='work-limit')f.budget.hashBytes=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes+1;else f.first.signal.abort();};
  const accepted=await f.s.repository.transaction(true,async t=>{
   await f.first.guard.processing(t,f.scope);await f.second.guard.processing(t,f.scope);
   await t.put('operationReceipts',{id:marker});
   f.first.guard.registerProcessingFinalFence(t,{qualification:field?.token??null});
   f.second.guard.registerProcessingFinalFence(t,{qualification:change==='later-field-issuer'?field.token:null});
  }).then(()=>true,()=>false);
  return {accepted,persisted:!!await raw(f.s,'operationReceipts',marker),checks:observed.checks,revoked};
 }finally{if(field)releaseMaintenanceQualification(field.token);await f.close();}
}
for(const change of ['identity','fields','later-field-issuer','work-signal','work-limit'])test('all registered original collections retain the earlier '+change+' facts after the last independent issuer',async()=>{
 const withFields=['fields','later-field-issuer'].includes(change),positive=await twoOwners({change,withFields});
 assert.equal(positive.accepted,true);assert.equal(positive.persisted,true);assert.ok(positive.checks>1);
 const changed=await twoOwners({change,withFields,at:positive.checks});
 assert.deepEqual(changed,{accepted:false,persisted:false,checks:positive.checks,revoked:1});
});

for(const kind of ['copied-cap','plain-callback','foreign-repository','different-transaction','copied-scope','completed-scope'])test('closed collection capability rejects '+kind+' without calling a claimed facts callback',async()=>{
 const f=await setup(),other=kind==='foreign-repository'?await fixture():null;let cap,prior,touches=0;
 try{
  await f.s.repository.transaction(true,async t=>{prior=t;await f.first.guard.processing(t,f.scope);f.first.guard.registerProcessingFinalFence(t);cap=f.first.guard.finalFactsCapability(t);
   if(kind==='copied-cap')assert.throws(()=>requireTopicProcessingFinalFacts({...cap},f.s.repository,t));
   if(kind==='plain-callback')assert.throws(()=>requireTopicProcessingFinalFacts({facts:()=>{touches++;return true;}},f.s.repository,t));
   if(kind==='foreign-repository')assert.throws(()=>requireTopicProcessingFinalFacts(cap,other.s.repository,t));
   if(kind==='copied-scope')assert.throws(()=>requireTopicProcessingFinalFacts(cap,f.s.repository,{...t}));
  });
  if(kind==='completed-scope')assert.throws(()=>requireTopicProcessingFinalFacts(cap,f.s.repository,prior));
  if(kind==='different-transaction')await f.s.repository.transaction(true,t=>assert.throws(()=>requireTopicProcessingFinalFacts(cap,f.s.repository,t)));
  assert.equal(touches,0);
 }finally{await other?.s.repository.close();await f.close();}
});
test('Repository refuses a forged terminal authority even if registration failure is caught',async()=>{
 const f=await setup();let caught=false,touches=0;try{await assert.rejects(f.s.repository.transaction(true,async t=>{
  await t.put('operationReceipts',{id:marker});
  try{registerRepositoryFinalReadFence(f.s.repository,t,{authority:{facts:()=>{touches++;return true;}},isCurrent:()=>true,plan:function*(){return true;}});}catch{caught=true;}
 }));assert.equal(caught,true);assert.equal(touches,0);assert.equal(await raw(f.s,'operationReceipts',marker),undefined);}finally{await f.close();}
});
test('a source owner may attach the exact same closed collection to its second original read plan',async()=>{
 const f=await setup();try{await f.s.repository.transaction(true,async t=>{
  await f.first.guard.processing(t,f.scope);f.first.guard.registerProcessingFinalFence(t);
  registerRepositoryFinalReadFence(f.s.repository,t,{authority:f.first.guard.finalFactsCapability(t),isCurrent:()=>true,plan:function*(){const row=yield {method:'get',table:'meta',key:'recovery-restore-epoch'};assert.equal(row?.value??null,null);return true;}});
  await t.put('operationReceipts',{id:marker});
 });assert.equal((await raw(f.s,'operationReceipts',marker)).id,marker);}finally{await f.close();}
});
test('private terminal collection cannot be replaced by overriding public guard checking methods',async()=>{
 const f=await setup();let replacements=0;try{await assert.rejects(f.s.repository.transaction(true,async t=>{
  await f.first.guard.processing(t,f.scope);f.first.guard.registerProcessingFinalFence(t);
  f.first.guard.assertProcessingCurrent=()=>{replacements++;return true;};f.first.guard.assertProcessingFacts=()=>{replacements++;return true;};f.first.guard.finalFactsCapability=()=>({});
  await t.put('operationReceipts',{id:marker});f.first.signal.abort();
 }));assert.equal(replacements,0);assert.equal(await raw(f.s,'operationReceipts',marker),undefined);}finally{await f.close();}
});
test('registering a field capability from a different request ledger cannot reset terminal work',async()=>{
 const f=await setup(),field=await fields(f);try{
  const otherBudget=createContextScopeWorkBudget({database:f.s.repository.db}),caller=Object.freeze({id:op()}),signal=new AbortController(),receipts=new WeakSet();
  const owner=new TopicProcessingAuthority(f.s,{caller,processing:{resolve:async(_t,scope)=>{const receipt={version:1,store:f.s,caller,scope,epoch:'other-request',processing:true,expiresAt:Date.now()+600000,revocationSignal:signal.signal};receipts.add(receipt);return receipt;},isCurrent:r=>receipts.has(r)},binding:{operationId:op()},workBudget:otherBudget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(t,request)=>owner.authorize(t,request)});
  try{await assert.rejects(f.s.repository.transaction(true,async t=>{await guard.processing(t,f.scope);await t.put('operationReceipts',{id:marker});guard.registerProcessingFinalFence(t,{qualification:field.token});}));assert.equal(await raw(f.s,'operationReceipts',marker),undefined);}finally{owner.release();}
 }finally{releaseMaintenanceQualification(field.token);await f.close();}
});
