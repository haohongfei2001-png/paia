import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,response,rows} from './harness/original-complete.mjs';import {productReply} from './fixtures/product-history-v080.mjs';
import {AIPresentationRunner} from '../core/organizer/ai-presentation.js';import {IntegrityChecker} from '../core/integrity-checker.js';
const op=()=>crypto.randomUUID();
test('AI field save response loss retries one durable revision and does not touch Topic identity or invoke AI',async()=>{const f=await completeFixture({fetchImpl:async(_u,init)=>response(productReply(JSON.parse(init.body)))});await f.runner.wake({userActionId:op()});const ai=new AIPresentationRunner(f.s,{provider:f.provider,credentials:f.credentials});await ai.wake({userActionId:op()});const p=(await f.s.aiPresentationStatus()).topics[0].presentation,edit={topicId:p.topicId,field:'currentView',value:'合成人工维护的字段',expectedRevision:p.revision,operationId:op()},topics=await rows(f.s,'topics');const first=await f.s.editAIPresentation(edit),revisions=await rows(f.s,'revisions'),calls=f.requests.length;await f.s.repository.close();const reopened=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});assert.deepEqual(await reopened.editAIPresentation(edit),first);assert.deepEqual(await rows(reopened,'revisions'),revisions);assert.deepEqual(await rows(reopened,'topics'),topics);assert.equal(f.requests.length,calls);await assert.rejects(reopened.editAIPresentation({...edit,value:'different payload'}));const checker=new IntegrityChecker(reopened);let result=await checker.begin();while(result.state==='loading')result=await checker.page(result);assert.ok(Object.values(result.counts).every(x=>x===0),JSON.stringify(result));assert.equal((await reopened.aiPresentationStatus()).topics[0].presentation.currentView,edit.value);assert.doesNotMatch(JSON.stringify(await rows(reopened,'operationReceipts')),/合成人工维护的字段/);});
test('wholly empty or ungrounded AI response cannot erase a saved presentation',async()=>{const f=await completeFixture({fetchImpl:async(_u,init)=>response(productReply(JSON.parse(init.body)))});await f.runner.wake({userActionId:op()});const ai=new AIPresentationRunner(f.s,{provider:f.provider,credentials:f.credentials});await ai.wake({userActionId:op()});const p=(await f.s.aiPresentationStatus()).topics[0].presentation,entry=(await f.s.topicDocumentPage({topicId:p.topicId})).items[0].entry;await f.s.editLibraryFields({id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{note:'New synthetic evidence'},operationId:op()});f.provider.fetchImpl=async(_u,init)=>{const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,keyInformation:[{text:'unsupported',evidenceEntryIds:['outside']}],evidenceEntryIds:['outside']})}}]});};const result=await ai.wake({userActionId:op(),topicId:p.topicId});assert.equal(result.error,'INVALID_SCHEMA');assert.deepEqual((await f.s.aiPresentationStatus()).topics[0].presentation,{...p,stale:true});});

test('every grounded AI list field saves authored multiline text once, preserves evidence and replays after reopen',async()=>{
 const fields=['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'];
 const f=await completeFixture({fetchImpl:async(_u,init)=>{
  const reply=productReply(JSON.parse(init.body)),request=JSON.parse(JSON.parse(init.body).messages[1].content);
  if(request.taskProfile==='ai_synthesis'){
   const output=JSON.parse(reply.choices[0].message.content);
   for(const field of fields)output[field]=[{text:'合成 '+field+' 原稿',evidenceEntryIds:[...output.evidenceEntryIds]}];
   reply.choices[0].message.content=JSON.stringify(output);
  }
  return response(reply);
 }});
 await f.runner.wake({userActionId:op()});const ai=new AIPresentationRunner(f.s,{provider:f.provider,credentials:f.credentials});
 await ai.wake({userActionId:op()});
 const original=(await f.s.aiPresentationStatus()).topics.find(t=>t.presentation).presentation;
 const authority=await Promise.all(['topics','thoughts','records','inputStates','placements'].map(name=>rows(f.s,name)));
 const calls=f.requests.length,edits=[];let current=original;
 for(const field of fields){
  const before=structuredClone(current),value=before[field].map(item=>({...item,text:'人工 '+field+' 第一行\n第二行条件仍保留。',ignoredProviderMetadata:'must not persist'}));
  await assert.rejects(f.s.editAIPresentation({topicId:before.topicId,field,value:value.map(item=>({...item,evidenceEntryIds:['outside']})),expectedRevision:before.revision,operationId:op()}),error=>error.code==='INVALID_OUTPUT');
  assert.deepEqual((await f.s.aiPresentationStatus()).topics.find(t=>t.topicId===before.topicId).presentation,before,'invalid evidence changes no field or revision');
  const edit={topicId:before.topicId,field,value,expectedRevision:before.revision,operationId:op()},supplied=structuredClone(edit);
  const result=await f.s.editAIPresentation(edit);assert.equal(result.revision,before.revision+1);
  assert.deepEqual(edit,supplied,'normalization never mutates supplied edit');
  assert.deepEqual(await f.s.editAIPresentation(edit),result,'lost response replay returns the same durable revision');
  current=(await f.s.aiPresentationStatus()).topics.find(t=>t.topicId===before.topicId).presentation;
  assert.equal(current.revision,result.revision);assert.equal(current.protections[field],true);
  assert.deepEqual(current[field],value.map(item=>({text:item.text,evidenceEntryIds:item.evidenceEntryIds})));
  for(const other of fields.filter(name=>name!==field))assert.deepEqual(current[other],before[other]);
  await assert.rejects(f.s.editAIPresentation({...edit,operationId:op()}),error=>error.code==='STALE_BASE');
  edits.push({edit,result});
 }
 const revisions=await rows(f.s,'revisions');
 assert.deepEqual(await Promise.all(['topics','thoughts','records','inputStates','placements'].map(name=>rows(f.s,name))),authority);
 assert.equal(f.requests.length,calls,'manual list edits never dispatch provider');
 await f.s.repository.close();const reopened=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});
 for(const {edit,result}of edits)assert.deepEqual(await reopened.editAIPresentation(edit),result);
 assert.deepEqual(await rows(reopened,'revisions'),revisions);
 assert.deepEqual((await reopened.aiPresentationStatus()).topics.find(t=>t.topicId===original.topicId).presentation,current);
 assert.doesNotMatch(JSON.stringify(await rows(reopened,'operationReceipts')),/第二行条件仍保留|ignoredProviderMetadata/);
});
