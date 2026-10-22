import {IDBObjectStore} from '../../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {LocalOrganizeSession} from '../../../extension/core/organizer/local-organize-session.js';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';
import {createOrganizeActionSource} from '../../../extension/background/organize-action-source.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,options={}){
 const {beforeAuthority=null,...fixtureOptions}=options;const f=await organizeServiceFixture(t,fixtureOptions);if(beforeAuthority){const original=f.configuration.resolveAuthority;f.configuration.resolveAuthority=async(...args)=>{await beforeAuthority();return Reflect.apply(original,f.configuration,args);};}const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source}),rpc=request=>runner.handle(request,sender);
 const select=()=>rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 const request=scope=>({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding});
 const run=async()=>rpc(request(await select()));t.after(()=>source.dispose());return {...f,source,runner,rpc,select,request,run,sender,api};
}

for(const variant of [{name:'twenty-one-short-entries',count:21,bodyBytes:0},{name:'three-large-entries',count:3,bodyBytes:11000}])test(`original source bounded two-child ${variant.name}`,{timeout:30000},async t=>{
 // Capacity is an input/coverage claim, not permission for a 33000-character currentView.
 const payloads=[],f=await fixture(t,{count:variant.count,boundedResponse:variant.bodyBytes>0,holdProvider:payload=>payloads.push(structuredClone(payload))}),expectedBodies=[];
 if(variant.bodyBytes)for(const [index,entry]of f.entries.entries()){
  const current=await f.s.entry(entry.id),prefix=`SYNTHETIC LARGE ${index} `;
  const body=prefix+'x'.repeat(variant.bodyBytes-prefix.length);expectedBodies.push(body);
  await f.s.editEntry({id:entry.id,expectedRevision:current.revision,changes:{body},operationId:crypto.randomUUID()});
 }
 const result=await f.run(),jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');
 console.log(JSON.stringify({control:variant.name,entryCount:variant.count,bodyBytes:variant.bodyBytes,result,physical:f.physical(),jobCount:jobs.length,jobStates:jobs.map(j=>j.state),children:jobs.map(j=>j.childCoverage?.map(c=>c.length)),usageCount:usage.length}));
 if(variant.bodyBytes){assert.equal(payloads.length,2);assert.ok(payloads.every(p=>p.style.value==='balanced'));assert.deepEqual(payloads.flatMap(p=>p.inputs).map(i=>i.text).sort(),[...expectedBodies].sort());for(const [i,entry]of f.entries.entries())assert.equal((await f.s.entry(entry.id)).thoughtText,expectedBodies[i]);}
 assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.currentPublished,true);assert.equal(f.physical(),2);
 assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].childIds.length,2);assert.equal(jobs[0].coverage.length,variant.count);
 const expected=new Set(f.entries.map(e=>JSON.stringify(['library_entry',e.id]))),childUnits=jobs[0].childCoverage.flat();
 assert.deepEqual(new Set(jobs[0].coverage.map(u=>u.key)),expected);assert.equal(childUnits.length,variant.count);assert.equal(new Set(childUnits.map(u=>JSON.stringify(u))).size,variant.count);assert.deepEqual(new Set(childUnits.map(u=>JSON.stringify(u))),new Set(jobs[0].coverage.map(u=>JSON.stringify(u))));
 assert.equal(usage.length,2);assert.ok(usage.every(r=>r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120));assert.equal(new Set(usage.map(r=>r.childId)).size,2);assert.equal(new Set(usage.map(r=>r.operationReceiptId)).size,2);
 assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].presentation.revision,1);
});
