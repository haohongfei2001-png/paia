import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {createConfiguredMaintenanceSession} from '../../../extension/core/ai-usage/configured-maintenance-session.js';
import {createMaintenanceRunner} from '../../../extension/core/ai-usage/maintenance-runner.js';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';

test('original runtime opportunity reaches signed Qwen service, original Topic/Context CAS+ACK and separate result',async t=>{
 const f=await maintenanceServiceFixture(t),result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));
 assert.equal(f.physical(),1);assert.equal(result.financialAuthority,false);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'placements')).length,1);
 const context=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));assert.equal(context.items[0].body,'PRIVATE_CONTEXT_BODY 1');
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,2);
 const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.executionKind,'server-backed');assert.equal(usage.attemptCount,1);assert.equal(usage.financialSettlement.settledSpendMicros,120);assert.equal(usage.state,'COMMITTED');
 const [bill]=f.server.saved().rows;assert.equal(bill.settlement.outcome,'VALIDATED');assert.equal(bill.resultCommitted,true);assert.ok(bill.window.windowId.startsWith('free:UTC:'));
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,1);assert.equal(reports[0].data.result.outcome,'COMMITTED');assert.doesNotMatch(JSON.stringify(reports),/PRIVATE|body|payload/);
 assert.equal((await f.run()).state,'NO_DELTA');assert.equal(f.physical(),1);
});

test('default-null packaged session and runtime do zero network or body work',async t=>{
 const f=await maintenanceServiceFixture(t);const session=createConfiguredMaintenanceSession(f.s),runner=createMaintenanceRunner(f.s);assert.equal(session.available(),false);assert.equal((await session.opportunity()).state,'UNAVAILABLE');assert.equal((await runner.wake()).state,'UNAVAILABLE');assert.equal(f.calls.length,0);assert.equal(f.physical(),0);
});

test('two actual physical partitions keep one immutable cycle and original final Context ordering',async t=>{
 const f=await maintenanceServiceFixture(t,{inputs:21}),result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),2);
 const bills=f.server.saved().rows;assert.equal(bills.length,2);assert.equal(new Set(bills.map(r=>r.request.jobId)).size,1);assert.ok(bills.every(r=>r.request.childCount===2&&r.state==='SETTLED'));assert.equal(bills.filter(r=>r.resultCommitted).length,1);
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,1);assert.equal(reports[0].data.result.children.length,2);
});

test('mixed human Placement/Authored child is authorized and reserved only after genuine Topic CAS+ACK',async t=>{
 const f=await maintenanceServiceFixture(t,{mixed:true}),before=await f.s.topic(f.topic.id),human=await f.s.repository.transaction(false,t=>t.get('thoughts',f.human.id)),result=await f.run();
 assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),2);const bills=f.server.saved().rows;assert.equal(bills.length,2);assert.equal(new Set(bills.map(r=>r.request.jobId)).size,1);assert.ok(bills.every(r=>r.request.childCount===2&&r.state==='SETTLED'));
 const providers=f.calls.filter(c=>c.path==='/api/provider'),first=providers[0].data.payload,second=providers[1].data.payload;
 assert.ok(first.coverage.some(u=>u.facet==='topic'));assert.ok(second.coverage.every(u=>u.facet==='context'));assert.equal(first.material.authoredEntries,undefined);assert.equal(first.material.placements,undefined);
 assert.ok(f.events.indexOf('provider:true')<f.events.indexOf('grant:true:true'));const now=await f.s.topic(f.topic.id);assert.ok(now.organizationRevision>before.organizationRevision);for(const m of [...second.material.placements,...second.material.authoredEntries])assert.equal(m.topicOrganizationRevision,now.organizationRevision);
 assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('thoughts',f.human.id)),human);assert.equal(bills.filter(r=>r.resultCommitted).length,1);
});

for(const loss of ['loseReservation','loseProvider'])test('lost '+loss+' reconciles known finance without provider replay on a later opportunity',async t=>{
 const f=await maintenanceServiceFixture(t,{[loss]:true}),result=await f.run();assert.equal(result.state,'OUTCOME_UNKNOWN',JSON.stringify(result));const physical=f.physical();
 assert.equal(physical,loss==='loseProvider'?1:0);assert.ok(f.server.saved().rows.length===1);const cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');assert.equal(f.server.saved().rows[0].state,loss==='loseProvider'?'SETTLED':'CANCELLED_BEFORE_DISPATCH');if(loss==='loseProvider')assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);assert.equal(f.physical(),physical);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
});

test('paid schema-valid but domain-invalid Topic cannot create Context, ACK or effective result',async t=>{
 const f=await maintenanceServiceFixture(t,{malformed:true}),result=await f.run();assert.equal(result.state,'PARTIAL');assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
});

test('post-settlement processing withdrawal suppresses the derivative without refund or replay',async t=>{
 const f=await maintenanceServiceFixture(t,{afterResponse:({revoke})=>revoke()}),result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
 assert.equal((await rows(f.s,'organizerUsage'))[0].financialSettlement.settledSpendMicros,120);
});

test('actual Context rollback retains the paid response for local CAS retry only',async t=>{
 const f=await maintenanceServiceFixture(t),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...args)=>{const result=await put(n,row,...args);if(!aborted&&n==='meta'&&row.id===CONTEXT_CARDS_ROW&&row.items.length){aborted=true;throw Error('SYNTHETIC Context rollback');}return result;};}return fn(t);},stores);
 const first=await f.run();assert.equal(first.state,'PARTIAL',JSON.stringify(first));assert.equal(aborted,true);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
 const second=await f.run();assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);
});

test('same-window changed delta has genuine cadence denial, zero second bill and retained original history',async t=>{
 const f=await maintenanceServiceFixture(t);assert.equal((await f.run()).state,'COMMITTED');
 const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');const input=(await rows(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC changed new maintenance obligation'});
 const result=await f.run();assert.equal(result.state,'MAINTENANCE_CADENCE',JSON.stringify(result));assert.equal(result.observedAt,f.server.now);assert.equal(result.nextEligibilityAt,f.server.now+8*3600000);assert.equal(f.physical(),1);assert.equal(f.server.saved().rows.length,1);
 const jobs=await rows(f.s,'organizerJobs'),denied=jobs.find(j=>j.maintenanceCadenceDenial);assert.equal(denied.state,'CANCELLED_BEFORE_DISPATCH');assert.equal(denied.committedCoverage.length,0);assert.ok(jobs.some(j=>j.state==='COMMITTED'));assert.ok((await rows(f.s,'organizerUsage')).filter(r=>r.jobId===denied.id).every(r=>r.executionKind==='service-planned'&&r.attemptCount===0&&r.spendState==='NOT_RESERVED'));
 const next=await f.run();assert.equal(next.state,'MAINTENANCE_CADENCE');assert.notEqual(next.jobId,result.jobId);assert.equal(f.server.saved().rows.length,1);assert.equal(f.physical(),1);assert.equal((await rows(f.s,'organizerJobs')).find(j=>j.id===next.jobId).maintenanceRequestKey.startsWith('aiu:cadence:'),true);
});

test('runtime coalesces concurrent opportunities and obeys server-derived monotonic cooldown',async t=>{
 const f=await maintenanceServiceFixture(t),runner=f.runner(),one=runner.wake(),two=runner.wake();assert.equal(one,two);assert.equal((await one).state,'COMMITTED');const calls=f.calls.length;
 assert.equal((await runner.wake()).state,'MAINTENANCE_CADENCE');assert.equal(f.calls.length,calls);assert.equal(f.physical(),1);runner.dispose();
});

for(const missing of ['readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs','resolveAuthority','processing','service','isCurrent'])test('missing '+missing+' module stays fail closed',async t=>{
 const f=await maintenanceServiceFixture(t),config={...f.configuration};delete config[missing];const session=createConfiguredMaintenanceSession(f.s,config);assert.equal(session.available(),false);assert.equal((await session.opportunity()).state,'UNAVAILABLE');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
});

test('independent processing denial precedes selected body hashing, declaration and financial work',async t=>{
 const f=await maintenanceServiceFixture(t,{configure:({local})=>{local.state.processing=false;}}),digest=crypto.subtle.digest.bind(crypto.subtle);let bodyHashes=0;
 t.mock.method(crypto.subtle,'digest',async(a,bytes)=>{if(new TextDecoder().decode(bytes).includes('Synthetic independent maintenance body'))bodyHashes++;return digest(a,bytes);});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(bodyHashes,0);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);
});

for(const token of ['principalToken','entitlementToken'])test('forged '+token+' causes zero reservation, provider and domain ACK',async t=>{
 const f=await maintenanceServiceFixture(t,{configure:({configuration})=>{const read=configuration.readProofs;configuration.readProofs=async request=>({...await read(request),[token]:'SYNTHETIC forged'});}}),result=await f.run();assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal(f.physical(),0);assert.equal(f.server.saved(),null);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
});

test('pending result ACK is retried as the exact body-free event without another provider or financial reserve',async t=>{
 let drop=true;const f=await maintenanceServiceFixture(t,{configure:({configuration})=>{const send=configuration.fetch;configuration.fetch=async request=>{const response=await send(request);if(new URL(request.url).pathname==='/api/results'&&drop)throw Error('SYNTHETIC result ACK loss');return response;};}});
 assert.equal((await f.run()).state,'COMMITTED');const first=(await rows(f.s,'organizerJobs'))[0];assert.equal(first.resultReport.state,'PENDING');const original=structuredClone(first.resultReport.evidence);
 await assert.rejects(f.run(),{code:'OUTCOME_UNKNOWN'});drop=false;assert.equal((await f.run()).state,'RECOVERED');assert.equal((await f.run()).state,'NO_DELTA');const after=(await rows(f.s,'organizerJobs'))[0];assert.equal(after.resultReport.state,'ACKNOWLEDGED');assert.deepEqual(after.resultReport.evidence,original);assert.equal(f.physical(),1);assert.equal(f.server.saved().rows.length,1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,3);
});

test('explicit owner disposal while Qwen is held aborts the original attempt without ACK or replay',async t=>{
 let release,entered;const held=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});const f=await maintenanceServiceFixture(t,{beforeSend:async()=>{entered();await held;}}),running=f.run();await started;f.revoke();const result=await running;release();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);for(let i=0;i<50&&f.server.saved().rows[0].state==='DISPATCHED';i++)await new Promise(r=>setTimeout(r,5));assert.equal(f.server.saved().rows[0].state,'OUTCOME_UNKNOWN');assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
 assert.equal((await f.run()).state,'UNAVAILABLE');assert.equal(f.physical(),1);
});

for(const mutation of ['authored-note','placement','input','source','topic'])test('mixed post-Topic '+mutation+' drift withholds child two and preserves child one',async t=>{
 let changed=false,mutationDone;const f=await maintenanceServiceFixture(t,{mixed:true,configure:({local})=>{const resolve=local.materialProcessing.resolve;local.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);if(scope.authoredEntries&&!changed){changed=true;const name=mutation==='authored-note'?'thoughts':mutation==='placement'?'placements':mutation==='input'?'blocks':mutation==='source'?'records':'topics',all=await t.all(name),row=mutation==='authored-note'?all.find(x=>x.id===local.human.id):mutation==='topic'?all.find(x=>x.id===local.topic.id):mutation==='placement'?all.find(x=>x.id===scope.placements[0].placementId):all[0];
  queueMicrotask(()=>{mutationDone=local.s.repository.transaction(true,async w=>{const current=await w.get(name,row.id??row.key);if(mutation==='authored-note')current.note='SYNTHETIC changed note';else if(mutation==='placement')current.orderProtection=false;else if(mutation==='input')current.value.libraryText='SYNTHETIC changed Input';else if(mutation==='source'){await w.delete(name,row.id??row.key);return;}else current.organizationRevision++;await w.put(name,current);});});}return receipt;};}});
 const result=await f.run();await mutationDone;assert.equal(changed,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.physical(),1);assert.equal(f.server.saved().rows.length,1);assert.equal(f.server.saved().rows[0].state,'SETTLED');assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
 const jobs=await rows(f.s,'organizerJobs'),job=jobs.find(j=>j.id===result.jobId),usage=(await rows(f.s,'organizerUsage')).filter(r=>r.jobId===job.id);assert.equal(job.childIds.length,2);assert.equal(usage.filter(r=>r.attemptCount===1).length,1);assert.equal(usage.filter(r=>r.executionKind==='service-planned'&&r.attemptCount===0).length,1);
 await f.run();assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
});

test('Source disappearance in the final post-await read fence prevents provider HTTP and preserves the unresolved hold',async t=>{
 const f=await maintenanceServiceFixture(t),tx=f.s.repository.transaction.bind(f.s.repository);let changed=false,pending;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(!write){const get=t.get.bind(t);t.get=async(name,id,...rest)=>{const row=await get(name,id,...rest);if(name==='records'&&row&&!changed&&(await t.all('organizerUsage')).some(r=>r.state==='DISPATCHED')){changed=true;queueMicrotask(()=>{pending=f.s.repository.transaction(true,w=>w.delete('records',id));});}return row;};}return fn(t);},stores);
 const result=await f.run();await pending;assert.equal(changed,true);assert.notEqual(result.state,'COMMITTED');assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'RESERVED');assert.equal((await rows(f.s,'organizerUsage'))[0].state,'OUTCOME_UNKNOWN');assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,0);
});

test('Foundation rejects invented cadence identity without an authentic original denial lineage',async t=>{
 const f=await maintenanceServiceFixture(t),{AIUsageFoundation}=await import('../../../extension/core/ai-usage/foundation.js'),{readMaintenanceBatch}=await import('../../../extension/core/ai-usage/maintenance-batch.js'),owner=new AIUsageFoundation(f.s,{resolveAuthority:f.configuration.resolveAuthority}),batch=await readMaintenanceBatch(owner,{scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'});
 await assert.rejects(owner.plan({...batch.request,maintenanceRequestKey:'aiu:cadence:'+'a'.repeat(64)}),{code:'RESULT_BINDING_MISMATCH'});assert.equal(f.calls.length,0);assert.deepEqual(await rows(f.s,'organizerJobs'),[]);
});

test('private Qwen cadence denial cannot be cloned, rebound or used to retire a previously billed job',async t=>{
 const {AIUsageFoundation}=await import('../../../extension/core/ai-usage/foundation.js'),original=AIUsageFoundation.prototype.recordMaintenanceCadenceDenial;let checked=false,previous;
 t.mock.method(AIUsageFoundation.prototype,'recordMaintenanceCadenceDenial',async function(id,denial){await assert.rejects(original.call(this,id,structuredClone(denial)),{code:'UNAVAILABLE'});await assert.rejects(original.call(this,previous,denial));checked=true;return original.call(this,id,denial);});
 const f=await maintenanceServiceFixture(t);previous=(await f.run()).jobId;const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');await inputEdit(f.s,(await rows(f.s,'inputStates'))[0].id,{libraryText:'SYNTHETIC denied delta'});assert.equal((await f.run()).state,'MAINTENANCE_CADENCE');assert.equal(checked,true);assert.equal((await rows(f.s,'organizerJobs')).find(j=>j.id===previous).state,'COMMITTED');assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);
});

test('actual signed Pro child commits original positive Filter with exact ACK and unchanged input/source',async t=>{
 const f=await maintenanceServiceFixture(t,{filter:true}),before=await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n))),result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].window.windowId.startsWith('pro:'),true);assert.equal(f.server.saved().rows[0].resultCommitted,true);
 const filter=(await rows(f.s,'organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED');assert.equal(filter.length,1);assert.equal(filter[0].outcome,'COMMITTED');assert.equal((await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id),false);assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n))),before);assert.doesNotMatch(JSON.stringify(f.calls.filter(c=>c.path==='/api/provider')),/PRIVATE_OUT_OF_SCOPE_USER_BODY/);
});

test('local Pro booleans cannot dispatch a Filter child against actual signed Free admission',async t=>{
 const f=await maintenanceServiceFixture(t,{filter:true,tier:'free'}),result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),0);assert.equal(f.server.saved().rows.length,1);assert.equal(f.server.saved().rows[0].window.windowId.startsWith('free:'),true);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED').length,0);assert.equal((await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id),true);
});
