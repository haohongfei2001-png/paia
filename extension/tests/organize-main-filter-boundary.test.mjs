import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from '../../services/ai-gateway/tests/organize-client-fixture.mjs';
import {derived} from './harness/thought-m1.mjs';
import {rows} from './harness/original-complete.mjs';
import {createOrganizeActionSource} from '../background/organize-action-source.js';
import {createConfiguredOrganizeRunner} from '../core/organizer/configured-organize-runner.js';

const event=()=>({addListener(){},removeListener(){}});
async function sourceRunner(t,f){
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source});t.after(()=>source.dispose());
 return {runner,run:async()=>{const scope=await runner.handle({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}},sender);return runner.handle({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()},sender);}};
}
async function inputFixture(t){
 const f=await organizeServiceFixture(t,{count:0}),inputId=(await rows(f.s,'blocks'))[0].id,entry=await derived(f.s,[inputId]);
 await f.s.placeEntry({topicId:f.topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 return {...f,inputId,entry,...await sourceRunner(t,f)};
}
test('current-main deterministic Input-backed Entry follows the complete original signed action path',async t=>{
 const f=await inputFixture(t),result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.candidateCreated,true);assert.equal(f.physical(),1);
 assert.deepEqual(f.payload().inputs.map(x=>x.ref),[f.entry.id]);const jobs=await rows(f.s,'organizerJobs');assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.deepEqual(jobs[0].coverage,[{key:JSON.stringify(['input',f.inputId]),facet:'organize',scope:f.topic.id}]);
});
for(const mode of ['history','human-keep','history-after-keep'])test('current-main original Filter boundary preserves '+mode,async t=>{
 const f=await inputFixture(t);await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.inputId);await tx.put('filterInputs',{...row,aiDecision:{version:1},aiOperationId:'synthetic-unadopted-history'});});
 if(mode!=='history')await f.s.keepInput(f.inputId);
 if(mode==='history-after-keep')await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.inputId);await tx.put('filterInputs',{...row,aiDecision:{version:1},aiOperationId:'synthetic-unadopted-history'});});
 const before=(await rows(f.s,'filterInputs')).find(x=>x.id===f.inputId),result=await f.run();
 if(mode==='human-keep'){assert.equal(Object.hasOwn(before,'aiDecision'),false);assert.equal(before.filterOverride,'keep');assert.equal(result.completed,true,JSON.stringify(result));assert.equal(f.physical(),1);assert.deepEqual(f.payload().inputs.map(x=>x.ref),[f.entry.id]);assert.deepEqual((await rows(f.s,'filterInputs')).find(x=>x.id===f.inputId),before);return;}
 assert.equal(Object.hasOwn(before,'aiDecision'),true);assert.ok(result.error,JSON.stringify(result));assert.equal(f.physical(),0);assert.equal((await rows(f.s,'organizerJobs')).length,0);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
 assert.deepEqual((await rows(f.s,'filterInputs')).find(x=>x.id===f.inputId),before);
});
// The frozen current-main baseline's unchanged failure diagnostic is preserved
// in the isolated evidence. This successor verifies the repaired original path;
// the independent original 40-positive service assertion is never weakened.
test('current-main original 40-Entry source action commits exact coverage under unchanged guards',async t=>{
 const f=await organizeServiceFixture(t,{count:40}),r=await sourceRunner(t,f),result=await r.run(),jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage'),acks=(await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED');
 assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.candidateCreated,true);assert.equal(f.physical(),2);
 assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].childIds.length,2);
 const expected=new Set(f.entries.map(x=>JSON.stringify(['library_entry',x.id])));assert.equal(jobs[0].coverage.length,40);assert.deepEqual(new Set(jobs[0].coverage.map(x=>x.key)),expected);assert.equal(jobs[0].childCoverage.flat().length,40);assert.deepEqual(new Set(jobs[0].childCoverage.flat().map(x=>x.key)),expected);
 assert.equal(acks.length,40);assert.equal(usage.length,2);assert.ok(usage.every(x=>x.attemptCount===1&&x.financialSettlement.settledSpendMicros===120));assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);
 const candidate=(await r.runner.status({topicId:f.topic.id})).topics[0].candidate;assert.ok(candidate);assert.equal(candidate.stale,false);
});
