import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';

const native=await readFile(new URL('./nib-v4-settings-entry-chrome-e2e.test.mjs',import.meta.url),'utf8');
const helper=native.slice(native.indexOf('async function readRetainedPrompt('),native.indexOf('\n// Install before'));
const readHelper=(eventually)=>vm.runInNewContext('('+helper.trim()+')',{assert,eventually});
const retained=async s=>s.repository.transaction(false,async t=>({records:await t.all('records'),inputs:await t.all('inputStates'),blocks:await t.all('blocks')}));
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const service=new PromptReuseService(s);
 let q=await service.query();await service.change({action:'create',revision:q.revision,text:'Synthetic manual expression one'});
 q=await service.query();await service.change({action:'create',revision:q.revision,text:'Synthetic manual expression two'});
 q=await service.query();await service.change({action:'pin',revision:q.revision,id:q.items[1].id});
 const facts=await retained(s);assert.ok(facts.records.length>0);assert.ok(facts.inputs.length>0);assert.ok(facts.blocks.length>0);
 return {s,service,before:await service.query({includeHidden:true}),facts};
}
function interruptSnapshot(f){
 const original=f.s.run;let injected=0;
 f.s.run=async function(...args){
  const value=await original.apply(this,args);
  if(!injected&&value?.prefs&&Array.isArray(value.items)&&Object.hasOwn(value,'current')){
   injected++;
   // Exact original FilterRunner drain metadata mutation; not a synthetic
   // generation overwrite and not any captured/manual body change.
   await f.s.setFilterTask('idle');
  }
  return value;
 };
 return {restore:()=>{f.s.run=original;},count:()=>injected};
}
test('original Prompt query rejects a real maintenance generation change, then preserves all manual work',async()=>{
 const f=await fixture(),hook=interruptSnapshot(f);
 try{
  await assert.rejects(f.service.query({includeHidden:true}),e=>e.code==='MEMORY_STALE');assert.equal(hook.count(),1);
  const current=await f.service.query({includeHidden:true});
  const {generation,...work}=current,{generation:old,...before}=f.before;
  assert.ok(generation>old);assert.deepEqual(work,before);assert.deepEqual(await retained(f.s),f.facts);
 }finally{hook.restore();await f.s.repository.close();}
});
test('native retained helper waits only for the refused read and returns the next complete original projection',async()=>{
 const f=await fixture(),hook=interruptSnapshot(f),messages=[];let attempts=0;
 const read=readHelper(async fn=>{for(let i=0;i<3;i++){attempts++;if(await fn())return;}assert.fail('original query did not settle');});
 try{
  const current=await read({evaluate:async(_fn,message)=>{messages.push(structuredClone(message));try{return {ok:true,data:await f.service.query(message)};}catch(e){return {ok:false,error:e.code};}}});
  assert.equal(attempts,2);assert.equal(hook.count(),1);assert.deepEqual(messages,[{type:'PAIA_PROMPT_QUERY',includeHidden:true},{type:'PAIA_PROMPT_QUERY',includeHidden:true}]);
  const {generation,...work}=current,{generation:old,...before}=f.before;assert.ok(generation>old);assert.deepEqual(work,before);assert.deepEqual(await retained(f.s),f.facts);
 }finally{hook.restore();await f.s.repository.close();}
});
for(const error of ['CONSENT_REQUIRED','STORAGE_FAILED','MEMORY_DENIED'])test('retained helper never retries '+error,async()=>{
 let calls=0;const read=readHelper(async fn=>{for(let i=0;i<3;i++)if(await fn())return;assert.fail('unsettled');});
 await assert.rejects(()=>read({evaluate:async()=>{calls++;return {ok:false,error};}}));assert.equal(calls,1);
});
test('permanent stale remains a failure at the existing polling boundary',async()=>{
 let calls=0;const read=readHelper(async fn=>{for(let i=0;i<3;i++)if(await fn())return;throw Error('original deadline');});
 await assert.rejects(()=>read({evaluate:async()=>{calls++;return {ok:false,error:'MEMORY_STALE'};}}),/original deadline/);assert.equal(calls,3);
});
