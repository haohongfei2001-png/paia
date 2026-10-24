import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';
import {createOrganizeActionSource} from '../../../extension/background/organize-action-source.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const event=()=>({addListener(){},removeListener(){}});
async function large(t,boundedResponse,{bodyLengths=[11000,11000,11000],physical=2}={}){
 const payloads=[],f=await organizeServiceFixture(t,{count:bodyLengths.length,boundedResponse,holdProvider:payload=>payloads.push(structuredClone(payload))}),sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source});t.after(()=>source.dispose());
 const expected=[];for(const [index,entry]of f.entries.entries()){const current=await f.s.entry(entry.id),prefix=`SYNTHETIC LARGE ${index} `,body=prefix+'x'.repeat(bodyLengths[index]-prefix.length);expected.push(body);await f.s.editEntry({id:entry.id,expectedRevision:current.revision,changes:{body},operationId:crypto.randomUUID()});}
 const scope=await runner.handle({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}},sender),request={type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding},result=await runner.handle(request,sender);
 for(const [index,entry]of f.entries.entries())assert.equal((await f.s.entry(entry.id)).thoughtText,expected[index]);
 assert.equal(f.physical(),physical);assert.equal(payloads.length,physical);assert.ok(payloads.every(p=>p.style.value==='balanced'));assert.deepEqual(payloads.flatMap(p=>p.inputs).map(i=>i.text).sort(),[...expected].sort());assert.deepEqual(payloads.flatMap(p=>p.inputs).map(i=>i.text.length).sort((a,b)=>a-b),[...bodyLengths].sort((a,b)=>a-b));
 return {...f,runner,request,sender,result,expected,jobs:await rows(f.s,'organizerJobs'),usage:await rows(f.s,'organizerUsage')};
}
test('same three 11000-character selected inputs complete with a separate valid bounded synthetic response',{timeout:30000},async t=>{
 const f=await large(t,true);assert.equal(f.result.completed,true,JSON.stringify(f.result));assert.equal(f.result.currentPublished,true);assert.equal(f.jobs.length,1);assert.equal(f.jobs[0].state,'COMMITTED');assert.equal(f.jobs[0].childIds.length,2);assert.equal(f.jobs[0].coverage.length,3);assert.equal(f.usage.length,2);assert.ok(f.usage.every(r=>r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120&&r.financialSettlement.effectiveResults===0));assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].presentation.revision,1);
});
test('original echo of three large inputs remains correctly rejected by unchanged 4000-character currentView bound',{timeout:30000},async t=>{
 const f=await large(t,false);assert.equal(f.result.error,'INVALID_OUTPUT');assert.equal(f.result.requestCount,2);await assertRejectedOutcome(f,2);
 await assert.rejects(f.runner.handle(f.request,f.sender),{code:'UNAVAILABLE'});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.physical(),2);assert.equal((await rows(f.s,'organizerJobs')).length,1);assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);
});

async function assertRejectedOutcome(f,children){
 assert.equal(f.result.completed,undefined);assert.equal(f.result.candidateCreated,undefined);assert.equal(f.jobs.length,1);const job=f.jobs[0];assert.equal(job.state,'EXPIRED_UNCOMMITTED');assert.deepEqual(job.committedCoverage,[]);assert.equal(job.domainResultReceipt.outcome,'FAILED');
 assert.equal(f.usage.length,children);assert.ok(f.usage.every(r=>r.state==='EXPIRED_UNCOMMITTED'&&r.executionKind==='server-backed'&&r.attemptCount===1&&r.financialSettlement.state==='SETTLED'&&r.financialSettlement.settledSpendMicros===120&&r.financialSettlement.effectiveResults===0));assert.equal(new Set(f.usage.map(r=>r.childId)).size,children);assert.equal(new Set(f.usage.map(r=>r.operationReceiptId)).size,children);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
 const reports=f.calls.filter(x=>x.path==='/api/results');assert.equal(reports.length,1);assert.equal(reports[0].data.result.outcome,'FAILED');assert.equal(reports[0].data.result.children.length,children);assert.equal(f.server.saved().rows.filter(r=>r.resultCommitted===true).length,0);assert.doesNotMatch(JSON.stringify({job,usage:f.usage}),/SYNTHETIC LARGE|principalToken|entitlementToken/);assert.doesNotMatch(JSON.stringify(reports),/SYNTHETIC LARGE/);assert.equal(job.resultReport.state,'ACKNOWLEDGED');assert.equal(job.resultReport.ack.effectiveResults,0);assert.equal(job.resultReport.ack.retryAllowed,false);
}
for(const length of [4000,4001])test(`original source balanced currentView exact ${length}-character boundary is ${length===4000?'accepted':'rejected without quota or coverage ACK'}`,{timeout:30000},async t=>{
 const f=await large(t,false,{bodyLengths:[length],physical:1});assert.equal(f.result.requestCount,1);
 if(length===4000){assert.equal(f.result.completed,true,JSON.stringify(f.result));assert.equal(f.jobs[0].state,'COMMITTED');const candidate=(await f.runner.status({topicId:f.topic.id})).topics[0].presentation;assert.ok(candidate);assert.equal(candidate.currentView,f.expected[0]);assert.equal(candidate.currentView.length,4000);assert.equal(f.calls.find(x=>x.path==='/api/results').data.result.outcome,'COMMITTED');assert.equal(f.server.saved().rows.filter(r=>r.resultCommitted===true).length,1);}
 else{assert.equal(f.result.error,'INVALID_OUTPUT');await assertRejectedOutcome(f,1);}
});

for(const {length,bodyLengths}of [{length:4000,bodyLengths:[1999,2000]},{length:4001,bodyLengths:[2000,2000]}])test(`original source balanced multi-block currentView aggregate ${length}-character boundary includes its separator`,{timeout:30000},async t=>{
 const f=await large(t,false,{bodyLengths,physical:1}),combined=f.expected.join('\n');assert.equal(f.result.requestCount,1);
 // Each echoed block is individually below the cap; only aggregation plus the newline reaches this boundary.
 assert.equal(f.expected.length,2);assert.equal(f.payload().inputs.length,2);assert.ok(f.expected.every(text=>text.length<4000));assert.equal(f.expected.reduce((sum,text)=>sum+text.length,0),length-1);assert.equal(combined.length,length);
 if(length===4000){
  assert.equal(f.result.completed,true,JSON.stringify(f.result));assert.equal(f.result.currentPublished,true);assert.equal(f.jobs.length,1);const job=f.jobs[0];assert.equal(job.state,'COMMITTED');assert.equal(job.childIds.length,1);assert.equal(job.coverage.length,2);assert.equal(job.committedCoverage.length,2);assert.deepEqual(new Set(job.committedCoverage),new Set(job.coverage.map(u=>JSON.stringify([u.key,u.facet,u.scope]))));
  const candidate=(await f.runner.status({topicId:f.topic.id})).topics[0].presentation;assert.ok(candidate);assert.equal(candidate.currentView,combined);assert.equal(candidate.currentView.length,4000);assert.deepEqual(new Set(candidate.evidenceEntryIds),new Set(f.entries.map(e=>e.id)));
  assert.equal(f.usage.length,1);assert.equal(f.usage[0].attemptCount,1);assert.equal(f.usage[0].financialSettlement.state,'SETTLED');assert.equal(f.usage[0].financialSettlement.settledSpendMicros,120);assert.equal(f.usage[0].financialSettlement.effectiveResults,0);assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);assert.equal(f.calls.find(x=>x.path==='/api/results').data.result.outcome,'COMMITTED');assert.equal(f.server.saved().rows.filter(r=>r.resultCommitted===true).length,1);
 }else{
  assert.equal(f.result.error,'INVALID_OUTPUT');await assertRejectedOutcome(f,1);await assert.rejects(f.runner.handle(f.request,f.sender),{code:'UNAVAILABLE'});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.physical(),1);assert.equal((await rows(f.s,'organizerJobs')).length,1);assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);
 }
});
