import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {boundedThoughtRead,assertThoughtReadTransactionOrigin,readThoughtFilterVisibilityMetadata} from '../core/thought-library-read-model.js';
import {createThoughtFilterVisibilityScope} from '../core/ai-usage/filter-visibility-consumer-scope.js';

test('original Thought read wrapper proves its same live Repository scope without exposing that scope',async()=>{
 const {s}=await setup(OrganizerStore);let held;
 await s.repository.transaction(false,async raw=>{const t=boundedThoughtRead(raw,undefined,s);held=t;assert.equal(assertThoughtReadTransactionOrigin(t,s.repository),true);assert.equal(await t.get('meta','nonexistent'),undefined);assert.equal(assertThoughtReadTransactionOrigin(t,s.repository),true);});
 assert.throws(()=>assertThoughtReadTransactionOrigin(held,s.repository));
});
for(const mutation of ['copy','inherit','foreign repository','wrapper method','raw method','raw getter','prototype'])test('Thought wrapper refuses '+mutation+' without dereferencing a substituted getter',async()=>{
 const {s}=await setup(OrganizerStore);let reads=0;
 await s.repository.transaction(false,raw=>{let t=boundedThoughtRead(raw,undefined,s),repository=s.repository;
  if(mutation==='copy')t={...t};if(mutation==='inherit')t=Object.create(t);if(mutation==='foreign repository')repository={...repository};
  if(mutation==='wrapper method')t.get=()=>null;if(mutation==='raw method')raw.get=()=>null;
  if(mutation==='raw getter')Object.defineProperty(raw,'get',{configurable:true,get(){reads++;return ()=>null;}});
  if(mutation==='prototype')Object.setPrototypeOf(t,{});
  assert.throws(()=>assertThoughtReadTransactionOrigin(t,repository));assert.equal(reads,0);
 });
});
test('a caller budget or copied metadata cannot manufacture a Thought preparation admission',async()=>{
 const {s}=await setup(OrganizerStore);
 await s.repository.transaction(false,raw=>assert.throws(()=>boundedThoughtRead(raw,{remaining:10000},s)));
 const dto={inputIds:['synthetic'],authority:'synthetic'};
 assert.equal(readThoughtFilterVisibilityMetadata(dto,s,{}),null);assert.equal(createThoughtFilterVisibilityScope(s,dto,{}),null);
});

import {capture} from './harness/thought-m1.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
// These rows exercise only the original metadata selector. The preparation spy
// cannot authorize hidden content or create a real Filter decision.
async function metadataFixture(count){
 const prepared=[],released=[];const authority={canPrepareVisibility:()=>true,async prepareVisibility(ids){prepared.push(ids);return {release(){released.push(ids);}};}};
 const {s}=await setup(OrganizerStore,{aiFilterAuthority:authority});await s.finishFoundation();await s.setFilterMode('off');
 for(let i=1;i<Math.ceil(count/19);i++)await s.capture(capture((await s.status()).epoch,'bounded-thought-source-'+i,'Synthetic source '+i));
 const topic=await s.createTopic({name:'Synthetic generated directory',operationId:crypto.randomUUID()}),operations=[];
 await s.repository.transaction(true,async t=>{
  const indexes=await t.all('recordIndex'),existing=await t.all('blockIndex');let left=count;
  for(const [i,index]of indexes.entries()){
   const template=existing.find(x=>x.recordIds.includes(index.id));
   // Match the original byRecord index schema using the existing indexed row.
   assert.ok(template);for(let j=0;j<Math.min(19,left);j++){
    const id=j===0?template.id:'synthetic-thought-input-'+i+'-'+j,operationId=crypto.randomUUID();operations.push(operationId);
    await t.put('blockIndex',{...template,id,recordIds:[index.id],sequence:j===0?template.sequence:existing.length+i*19+j,excluded:false});await t.put('filterInputs',{id,aiOperationId:operationId,aiDecision:{version:1}});
   }left-=Math.min(19,left);if(!left)break;
  }
  const row=await t.get('topics',topic.id);await t.put('topics',{...row,createdBy:'ai',sourceRecordIds:indexes.map(x=>x.id),protections:{...row.protections,title:{locked:false},name:{locked:false}}});
 });
 await s.setFilterMode('light');return {s,topic,operations,prepared,released};
}
for(const count of [200,201])test('Thought metadata union '+count+' is complete or entirely unprepared, never truncated',async()=>{
 const f=await metadataFixture(count),model=new ThoughtLibraryReadModel(f.s);await model.entryPage({topicId:f.topic.id,limit:1});
 if(count===200){assert.equal(f.prepared.length,1);assert.deepEqual(new Set(f.prepared[0]),new Set(f.operations));assert.equal(f.prepared[0].length,200);assert.deepEqual(f.released,f.prepared);}else assert.deepEqual(f.prepared,[]);
});

import {ThoughtSectionReading,readSectionFilterVisibilitySelection} from '../core/thought-section-reading.js';
import {thoughtSectionTransactionReader,prepareThoughtSectionVisibility} from '../core/thought-library-read-model.js';
test('a copied Section page or Input DTO cannot mint an active original selection',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const model=new ThoughtLibraryReadModel(s),result={topic:{id:crypto.randomUUID()},authority:'synthetic'},token={inputIds:[crypto.randomUUID()]};
 assert.equal(readSectionFilterVisibilitySelection(token,model,result),null);
 await assert.rejects(prepareThoughtSectionVisibility(model,result,token),{code:'UNAVAILABLE'});
 await s.repository.transaction(false,t=>assert.throws(()=>thoughtSectionTransactionReader(model,result,t),{code:'UNAVAILABLE'}));
});
for(const mode of ['original','query','expression'])for(const count of [200,201])test('actual Section '+mode+' selected metadata union '+count+' is complete or entirely unprepared',async()=>{
 const f=await metadataFixture(count),reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s));
 await reader.page({topicId:f.topic.id,limit:1,...mode==='query'?{query:'Synthetic'}:mode==='expression'?{chronology:'expression'}:{}});
 if(count===200){assert.equal(f.prepared.length,1);assert.deepEqual(new Set(f.prepared[0]),new Set(f.operations));assert.equal(f.prepared[0].length,200);assert.deepEqual(f.released,f.prepared);}else assert.deepEqual(f.prepared,[]);
});
