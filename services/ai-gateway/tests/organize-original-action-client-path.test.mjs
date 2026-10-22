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
for(const count of [1,40])test(`source-owned explicit Organize ${count} entries reaches original signed paid child and atomic candidate`,{timeout:30000},async t=>{
 const f=await fixture(t,{count}),result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.candidateCreated,true);
 assert.equal(f.physical(),Math.ceil(count/20));const jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');
 assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].coverage.length,count);assert.deepEqual(new Set(jobs[0].coverage.map(u=>u.key)),new Set(f.entries.map(e=>JSON.stringify(['library_entry',e.id]))));const childUnits=jobs[0].childCoverage.flat();assert.equal(childUnits.length,count);assert.equal(new Set(childUnits.map(u=>JSON.stringify(u))).size,count);assert.deepEqual(new Set(childUnits.map(u=>JSON.stringify(u))),new Set(jobs[0].coverage.map(u=>JSON.stringify(u))));assert.equal(usage.length,f.physical());assert.ok(usage.every(r=>r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120));
 assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate!==null,true);
});
test('metadata selection alone and a foreign Archive document never start an original job',{timeout:10000},async t=>{
 const f=await fixture(t),scope=await f.select();assert.equal(scope.eligibleCount,1);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal((await rows(f.s,'organizerJobs')).length,0);
 const result=await f.runner.handle(f.request(scope),{...f.sender,documentId:'different-document'});assert.ok(result.error);assert.equal(f.calls.length,0);assert.equal((await rows(f.s,'organizerJobs')).length,0);
});
test('a released original action cannot retry its remote stage through the same public request',{timeout:30000},async t=>{
 const f=await fixture(t),request=f.request(await f.select());assert.equal((await f.rpc(request)).completed,true);const counts={physical:f.physical(),calls:f.calls.length,jobs:(await rows(f.s,'organizerJobs')).length};
 await assert.rejects(f.rpc(request));assert.deepEqual({physical:f.physical(),calls:f.calls.length,jobs:(await rows(f.s,'organizerJobs')).length},counts);
});
test('original source invalidation while a paid provider is held retains UNKNOWN and refuses its late candidate',{timeout:30000},async t=>{
 let enter,release,finish;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r),finished=new Promise(r=>finish=r);
 const f=await fixture(t,{holdProvider:async()=>{enter();await held;},afterResponse:()=>finish()}),task=f.run();task.catch(()=>{});
 try{await Promise.race([entered,task.then(result=>{throw Error('operation ended before original provider: '+JSON.stringify(result));})]);f.source.invalidate();release();await finished;const result=await task;assert.ok(result.error);assert.equal(f.physical(),1);
  assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);const usage=await rows(f.s,'organizerUsage');assert.equal(usage.length,1);assert.equal(usage[0].attemptCount,1);
 }finally{release();await task.catch(()=>{});}
});

test('a fresh explicit action after the original first window adopts the same retired-action result without another paid child',{timeout:60000},async t=>{
 const f=await fixture(t),put=IDBObjectStore.prototype.put;let failOnce=true;
 t.mock.method(IDBObjectStore.prototype,'put',function(row,...args){if(failOnce&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){failOnce=false;throw Error('SYNTHETIC original CAS failure');}return Reflect.apply(put,this,[row,...args]);});
 const scope=await f.select(),selectedAt=performance.now(),oldRequest=f.request(scope);
 assert.equal((await f.rpc(oldRequest)).error,'STORAGE_FAILED');assert.equal(f.physical(),1);
 const before=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');assert.equal(before.length,1);assert.equal(usage.length,1);assert.equal(usage[0].attemptCount,1);
 assert.equal(f.calls.filter(x=>x.path==='/api/results').length,0);
 // The failed runner already released its old action. Wait on the real native
 // clock beyond that first window; a replacement public clock is not authority.
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,30001-(performance.now()-selectedAt))));
 assert.ok(performance.now()-selectedAt>=30000);await assert.rejects(f.rpc(oldRequest));
 const assemble=LocalOrganizeSession.prototype.assemble;let assemblies=0;
 t.mock.method(LocalOrganizeSession.prototype,'assemble',function(...args){assemblies++;return Reflect.apply(assemble,this,args);});
 const result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));assert.equal(assemblies,0);assert.equal(f.physical(),1);
 const jobs=await rows(f.s,'organizerJobs'),after=await rows(f.s,'organizerUsage');assert.equal(jobs.length,1);assert.equal(jobs[0].id,before[0].id);assert.equal(jobs[0].state,'COMMITTED');assert.equal(after.length,1);
 for(const key of ['id','childId','operationReceiptId','attemptCount','financialSettlement'])assert.deepEqual(after[0][key],usage[0][key]);
 assert.equal(after[0].financialSettlement.settledSpendMicros,120);assert.equal(f.calls.filter(x=>x.path==='/api/results').length,1);
 console.log(JSON.stringify({control:'real-first-window-retained-adoption',elapsedMs:performance.now()-selectedAt,oldRunnerAction:'already released by original finally',physical:f.physical(),assemblies,sameJob:true,sameReceipt:true}));
});

test('a fresh source action with changed full proof cannot borrow the old validated result and creates a new original paid job',{timeout:30000},async t=>{
 const f=await fixture(t),put=IDBObjectStore.prototype.put;let failOnce=true;
 t.mock.method(IDBObjectStore.prototype,'put',function(row,...args){if(failOnce&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){failOnce=false;throw Error('SYNTHETIC original CAS failure');}return Reflect.apply(put,this,[row,...args]);});
 assert.equal((await f.run()).error,'STORAGE_FAILED');const old=(await rows(f.s,'organizerJobs'))[0],entry=await f.s.entry(f.entries[0].id);assert.equal(f.physical(),1);
 await f.s.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{body:'SYNTHETIC fresh source-authorized evidence'},operationId:crypto.randomUUID()});
 const result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));assert.equal(f.physical(),2);assert.equal(f.payload().inputs[0].text,'SYNTHETIC fresh source-authorized evidence');
 const jobs=await rows(f.s,'organizerJobs'),previous=jobs.find(x=>x.id===old.id);assert.equal(previous.domainResultReceipt.outcome,'FAILED');assert.equal(jobs.filter(x=>x.state==='COMMITTED').length,1);assert.notEqual(jobs.find(x=>x.state==='COMMITTED').id,old.id);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.jobId===old.id&&x.state==='ACKNOWLEDGED').length,0);
});

for(const stage of ['consume-document','plan-authority'])test(`STOP during original ${stage} await prevents a new plan after its late return`,{timeout:30000},async t=>{
 let enter,release,once=true;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r),hold=async()=>{if(once){once=false;enter();await gate;}};
 const f=await fixture(t,{beforeAuthority:stage==='plan-authority'?hold:null}),scope=await f.select();
 if(stage==='consume-document'){const original=f.api.runtime.getContexts;f.api.runtime.getContexts=async(...args)=>{await hold();return Reflect.apply(original,f.api.runtime,args);};}
 const task=f.rpc(f.request(scope));task.catch(()=>{});
 try{await Promise.race([entered,task.then(result=>{throw Error('operation ended before held stage: '+JSON.stringify(result));})]);const stopped=await f.runner.stop({topicId:f.topic.id});assert.equal(stopped.stopped,true);release();const result=await task;assert.ok(result.error);const jobs=await rows(f.s,'organizerJobs'),flights=(await rows(f.s,'meta')).filter(x=>x.id.startsWith('aiu:flight:'));
  console.log(JSON.stringify({control:'source-stop-'+stage,jobs:jobs.length,flights:flights.length,states:jobs.map(x=>x.state),provider:f.physical()}));assert.equal(jobs.length,0);assert.equal(flights.length,0);assert.equal(f.physical(),0);
 }finally{release();await task.catch(()=>{});}
});
