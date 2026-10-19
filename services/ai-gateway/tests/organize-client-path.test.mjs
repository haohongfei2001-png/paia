import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const usageRows=async s=>(await rows(s,'organizerUsage')).sort((a,b)=>a.sequence-b.sequence);
import {aiCandidateKey} from '../../../extension/core/organizer/ai-candidate.js';
for(const count of [1,40])test(`original Organize RPC ${count} entries -> signed handlers -> original atomic candidate and result receipt`,async t=>{
 const f=await organizeServiceFixture(t,{count}),result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));
 assert.equal(f.physical(),Math.ceil(count/20));const jobs=await rows(f.s,'organizerJobs'),usage=await usageRows(f.s);
 assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].routeVersion,f.configuration.routeVersion);assert.match(jobs[0].organizeRequestKey,/^[a-f0-9]{64}$/);assert.equal(usage.length,f.physical());
 assert.ok(usage.every(r=>r.executionKind==='server-backed'&&r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120));
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,1);assert.equal(reports[0].data.result.outcome,'COMMITTED');assert.equal(reports[0].data.result.children.length,usage.length);
 assert.equal(f.server.saved().rows.filter(r=>r.resultCommitted===true).length,1);assert.doesNotMatch(JSON.stringify({jobs,usage}),/SYNTHETIC organize evidence|principalToken|entitlementToken/);assert.doesNotMatch(JSON.stringify(reports),/SYNTHETIC organize evidence/);
 const status=await f.runner.status({topicId:f.topic.id}),candidate=status.topics[0].candidate;assert.ok(candidate);assert.equal(status.topics[0].presentation,null);
 await f.s.editAIPresentation({topicId:f.topic.id,expectedRevision:candidate.expectedRevision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:Object.fromEntries(candidate.changedFields.map(k=>[k,'adopt'])),operationId:crypto.randomUUID()});
 assert.ok((await f.runner.status({topicId:f.topic.id})).topics[0].presentation.currentView.includes('SYNTHETIC organize evidence'));
});

for(const count of [1,40])test(`invalid domain response (${count} entries) keeps spend, releases unsent siblings and has no partial candidate`,async t=>{
 const f=await organizeServiceFixture(t,{count,badIds:true}),result=await f.run();assert.ok(result.error);assert.equal(f.physical(),1);
 assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
 const usage=await usageRows(f.s);assert.equal(usage[0].financialSettlement.settledSpendMicros,120);if(count>20){assert.equal(usage[1].attemptCount,0);assert.equal(usage[1].financialCancellation,true);}
 assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');
 await f.run();assert.equal(f.physical(),1);
});

test('human edit after service response retains spend but cannot create candidate or acknowledge coverage',async t=>{
 let f;f=await organizeServiceFixture(t,{afterResponse:async()=>{const e=await f.s.entry(f.entries[0].id);await f.s.editEntry({id:e.id,expectedRevision:e.revision,changes:{body:'SYNTHETIC human replacement'},operationId:crypto.randomUUID()});}});
 const result=await f.run();assert.ok(result.error);assert.equal((await f.s.entry(f.entries[0].id)).body,'SYNTHETIC human replacement');assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);assert.equal((await usageRows(f.s))[0].financialSettlement.settledSpendMicros,120);assert.equal(f.physical(),1);
});

test('STOP while actual provider is held returns UNKNOWN, preserves original attempts and never adopts late body',async t=>{
 let enter,release,returned;const entered=new Promise(r=>enter=r),hold=new Promise(r=>release=r),finished=new Promise(r=>returned=r);
 const f=await organizeServiceFixture(t,{count:40,holdProvider:async()=>{enter();await hold;},afterResponse:()=>returned()});const task=f.run();
 try{await entered;const stopped=await f.runner.stop({topicId:f.topic.id});assert.equal(stopped.stopped,true);assert.equal((await task).error,'OUTCOME_UNKNOWN');const usage=await usageRows(f.s);assert.equal(usage[0].state,'OUTCOME_UNKNOWN');assert.equal(usage[0].attemptCount,1);assert.equal(usage[1].financialCancellation,true);
 release();await finished;await new Promise(r=>setImmediate(r));assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal(f.physical(),1);assert.equal((await f.run()).error,'OUTCOME_UNKNOWN');assert.equal(f.physical(),1);
 }finally{release();await task;}
});

test('last original write fence refuses changed Entry before provider fetch',async t=>{
 const f=await organizeServiceFixture(t),write=f.s.foundationWrite.bind(f.s);let changed=false;
 f.s.foundationWrite=async fn=>{let dispatch=false;const result=await write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(table==='organizerJobs'&&row.state==='DISPATCHED')dispatch=true;return put(table,row);};return fn(tx);});if(dispatch&&!changed){changed=true;const e=await f.s.entry(f.entries[0].id);await f.s.editEntry({id:e.id,expectedRevision:e.revision,changes:{body:'SYNTHETIC final human edit'},operationId:crypto.randomUUID()});}return result;};
 assert.ok((await f.run()).error);assert.equal(changed,true);assert.equal(f.physical(),0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
});

test('failed local candidate CAS retries the same retained result without another paid child',async t=>{
 const f=await organizeServiceFixture(t,{count:40}),scope=await f.rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}}),request={type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding},write=f.s.foundationWrite.bind(f.s);let once=true;
 f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(once&&table==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){once=false;throw Error('SYNTHETIC local CAS write failure');}return put(table,row);};return fn(tx);});
 assert.equal((await f.rpc(request)).error,'STORAGE_FAILED');assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
 assert.equal((await f.run()).completed,true);assert.equal(f.physical(),2);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);
});

for(const loss of ['loseReservation','loseProvider','loseResult'])test(`cold Organize ${loss} queries original siblings and never replays paid work`,async t=>{
 const {createConfiguredOrganizeRunner}=await import('../../../extension/core/organizer/configured-organize-runner.js'),f=await organizeServiceFixture(t,{count:40,[loss]:true});const first=await f.run();
 if(loss==='loseResult')assert.equal(first.completed,true);else assert.ok(first.error);
 const prior=(await rows(f.s,'organizerJobs'))[0],physical=f.physical(),before=f.calls.length;f.restoreAcks();const cold=createConfiguredOrganizeRunner(f.s,f.configuration);
 const response=await cold.handle({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:'a'.repeat(64)});assert.ok(response.error);assert.equal(f.physical(),physical);
 const calls=f.calls.slice(before);assert.equal(calls.filter(c=>c.path==='/api/provider').length,0);
 if(loss==='loseReservation')assert.ok(calls.some(c=>c.path==='/api/reservations'&&c.data.action==='cancel'));
 else assert.ok(calls.some(c=>c.path==='/api/results'));
 const job=(await rows(f.s,'organizerJobs')).find(j=>j.id===prior.id);assert.equal(job.state,loss==='loseResult'?'COMMITTED':'CANCELLED_BEFORE_DISPATCH'===job.state?job.state:'EXPIRED_UNCOMMITTED');
});

test('human changes after failed local CAS cannot borrow the retained result or strand known spend',async t=>{
 const f=await organizeServiceFixture(t),write=f.s.foundationWrite.bind(f.s);let once=true;
 f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(once&&table==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){once=false;throw Error('SYNTHETIC local CAS failure');}return put(table,row);};return fn(tx);});
 assert.equal((await f.run()).error,'STORAGE_FAILED');const old=(await rows(f.s,'organizerJobs'))[0],entry=await f.s.entry(f.entries[0].id);
 await f.s.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{body:'SYNTHETIC changed explicit Organize evidence'},operationId:crypto.randomUUID()});
 const next=await f.run();assert.equal(next.completed,true,JSON.stringify(next));assert.equal(f.physical(),2);assert.equal(f.payload().inputs[0].text,'SYNTHETIC changed explicit Organize evidence');
 const jobs=await rows(f.s,'organizerJobs');assert.equal(jobs.find(j=>j.id===old.id).domainResultReceipt.outcome,'FAILED');assert.equal(jobs.filter(j=>j.state==='COMMITTED').length,1);
});

for(const count of [1,40])for(const mutation of ['replace-key','remove-key','route','contract','scope'])for(const late of [false,true])test(`retained ${count}-entry CAS refuses ${mutation} ${late?'inside candidate transaction':'before retry'}`,async t=>{
 const f=await organizeServiceFixture(t,{count}),scope=await f.rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}}),request={type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding},write=f.s.foundationWrite.bind(f.s);let once=true;
 f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(once&&table==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){once=false;throw Error('SYNTHETIC local CAS failure');}return put(table,row);};return fn(tx);});
 assert.equal((await f.rpc(request)).error,'STORAGE_FAILED');const [job]=await rows(f.s,'organizerJobs'),changed={...job};
 if(mutation==='replace-key')changed.organizeRequestKey='f'.repeat(64);else if(mutation==='remove-key')delete changed.organizeRequestKey;else if(mutation==='route')changed.routeVersion='SYNTHETIC-changed-route';else if(mutation==='contract')changed.contractVersion='SYNTHETIC-changed-contract';else changed.scopeFingerprint='e'.repeat(64);
 if(late)f.s.foundationWrite=fn=>write(async tx=>{await tx.put('organizerJobs',changed);return fn(tx);});else await write(tx=>tx.put('organizerJobs',changed));
 const result=await f.rpc(request);assert.ok(result.error,JSON.stringify(result));assert.equal(f.physical(),Math.ceil(count/20));
 assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
 assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.ok((await usageRows(f.s)).every(r=>r.financialSettlement.settledSpendMicros===120));
});
