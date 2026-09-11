import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {OriginalOrganizerRunner,claimOriginalWork,enqueueOriginalWork,planOriginalWork,originalBootstrapStatus,recoverOriginalWork,selfHealOriginalRuntime} from '../core/organizer/original.js';
import {leaseGuard} from '../core/organizer/commit.js';

class FixtureOriginalProvider {
 constructor({failure=null}={}){this.failure=failure;this.calls=[];}
 describe(){return {providerId:'synthetic-original',adapterVersion:'1',capabilityVersion:1,modelVersion:'deterministic-1',executionKind:'fixture',supportedTaskSchemas:['organize.v1'],credentialRequirement:'opaque'};}
 async execute(request){this.calls.push(structuredClone(request));if(this.failure)throw {code:this.failure};return request.inputs.map(input=>({topic:'Synthetic topic',section:'Chronology',type:'idea',relatedGroup:'nearby',spans:[{inputRef:input.ref,start:0,end:input.text.length}],uncertain:false}));}
}
const credentials={async acquire(){return {status:'ready',handle:'synthetic-only'};},revoke(){}};
async function fixture(options={}){const f=await setup(OrganizerStore),provider=new FixtureOriginalProvider(options),runner=new OriginalOrganizerRunner(f.s,{provider,credentials});return {...f,provider,runner,input:(await f.s.snapshot()).library.blocks[0]};}
async function seedBootstrapJob(s,owner){await s.foundationWrite(t=>t.put('meta',{id:'originalOrganizerBootstrap',state:'running',cursorSequence:-1,totalEligible:1,processed:0,updatedAt:null,lastError:null}));const queued=await enqueueOriginalWork(s),job=await claimOriginalWork(s,owner);assert.ok(queued.queued);assert.ok(job);return job;}
async function seedLegacyPreDispatch(f,{providerStatus='not_sent'}={}){const job=await seedBootstrapJob(f.s,'legacy-worker');await f.s.foundationWrite(async t=>{const old=await t.get('organizerJobs',job.id),work=await t.get('organizerWorkItems',job.id);old.state='legacy_claimed';old.stateKey=0;old.audit={inputCount:1};old.usageId='legacy-reservation';await t.put('organizerJobs',old);work.state='legacy_claimed';await t.put('organizerWorkItems',work);await t.put('meta',{id:'originalOrganizerRuntime',lastJobId:job.id,state:'paused',stage:'dispatch_gate',providerStatus,validatorResult:'not_started',commitResult:'not_started',lastErrorCode:'INVALID_JOB_STATE'});});return job;}

test('v072b materializes Original body locally from validated working-text spans and advances only its checkpoint',async()=>{
 const f=await fixture(),result=await f.runner.wake({manual:true}),entry=(await f.s.entryPage()).items[0];assert.equal(result.result.created.length,1);assert.equal(entry.body,'Synthetic explicit working input');assert.equal(entry.provenanceType,'input_original');assert.equal(f.provider.calls.length,1);const sent=JSON.stringify(f.provider.calls[0]);for(const forbidden of ['originalText','sourceRecordId','chatUrl','assistant'])assert.equal(sent.includes(forbidden),false);const doc=await f.s.topicDocumentPage({topicId:(await f.s.libraryIndexPage()).items[0].id,view:'original'});assert.equal(doc.items[0].entry.body,'Synthetic explicit working input');assert.equal(doc.items[0].entry.originalSource,false);const provenance=await f.s.repository.transaction(false,t=>t.all('provenance'));assert.deepEqual(provenance[0].span,{field:'body',start:0,end:'Synthetic explicit working input'.length});assert.equal((await f.s.dualViewStatus()).original.counts.addedInput,0);const organizerStatus=await f.s.originalOrganizerStatus();assert.equal(organizerStatus.lastApiProcessed,1);assert.equal(organizerStatus.state,'updated');
});

test('v072b exact duplicate consolidates provenance without semantic merge and changed input makes a new local original entry',async()=>{
 const f=await fixture();await f.runner.wake({manual:true});await f.s.capture(capture((await f.s.status()).epoch,'same-original','Synthetic explicit working input'));await f.runner.wake({manual:true});assert.equal((await f.s.entryPage()).items.length,1);assert.equal((await f.s.libraryIndexPage()).items.length,1);assert.equal((await f.s.repository.transaction(false,t=>t.all('provenance'))).length,2);await inputEdit(f.s,f.input.id,{libraryText:'Changed local original input'});await f.runner.wake({manual:true});assert.equal(f.provider.calls.at(-1).topicCandidates[0].name,'Synthetic topic');const entries=(await f.s.entryPage()).items;assert.equal(entries.length,2);assert.ok(entries.some(x=>x.body==='Changed local original input'));assert.ok(entries.some(x=>x.body==='Synthetic explicit working input'));
});

test('v072b exact original remains one shared protected body across later Input revisions',async()=>{
 const f=await fixture();await f.runner.wake({manual:true});const first=(await f.s.entryPage()).items[0];await f.s.editEntry({id:first.id,expectedRevision:first.revision,operationId:crypto.randomUUID(),changes:{body:'User kept wording'}});assert.equal((await f.s.input(f.input.id)).libraryText,'User kept wording');await inputEdit(f.s,f.input.id,{libraryText:'Later source wording'});await f.runner.wake({manual:true});const entries=await f.s.entryPage();assert.equal(entries.items.filter(x=>x.id===first.id).length,1);assert.equal((await f.s.entry(first.id)).body,'Later source wording');const protectedEntry=await f.s.entry(first.id);assert.equal(protectedEntry.protections.body.locked,true);
});

test('v072b planner excludes Smart-filtered, removed and tombstoned Input from extraction targets',async()=>{
 const f=await fixture();await f.s.capture(capture((await f.s.status()).epoch,'filtered-original','继续'));await f.s.evaluateFilters();const filtered=(await f.s.snapshot()).library.blocks.find(b=>b.libraryText==='继续'),plan=await planOriginalWork(f.s);assert.equal(plan.selected.some(x=>x.id===filtered?.id),false);await inputEdit(f.s,f.input.id,{excluded:true});await f.runner.wake({manual:true});assert.equal(f.provider.calls.length,0);
});

test('v072b provider failure leaves Input Archive intact and Original delta pending',async()=>{
 const f=await fixture({failure:'UNAVAILABLE'}),before=await f.s.snapshot(),result=await f.runner.wake({manual:true}),after=await f.s.snapshot();assert.equal(result.error,'UNAVAILABLE');assert.equal(after.records.length,before.records.length);assert.equal((await f.s.entryPage()).items.length,0);const status=await f.s.originalOrganizerStatus();assert.equal(status.state,'failed');assert.equal(status.diagnostics.lastErrorCode,'UNAVAILABLE');assert.ok(status.pendingInput>0);
});

test('first Organizer credential and provider failures preserve the pending delta and checkpoint',async()=>{
 for(const code of ['INVALID_CREDENTIAL','RATE_LIMITED','PROVIDER_TIMEOUT']){const f=await fixture({failure:code}),before=await f.s.dualViewStatus(),result=await f.runner.wake({manual:true}),after=await f.s.dualViewStatus(),status=await f.s.originalOrganizerStatus();assert.equal(result.error,code);assert.equal(after.original.originalOrganizerCheckpoint,before.original.originalOrganizerCheckpoint);assert.equal((await f.s.entryPage()).items.length,0);assert.equal(status.lastError,code);assert.ok(status.pendingInput>0);}
 const f=await setup(OrganizerStore),provider=new FixtureOriginalProvider(),runner=new OriginalOrganizerRunner(f.s,{provider,credentials:{async acquire(){return {status:'missing',handle:null};},revoke(){}}}),result=await runner.wake({manual:true});assert.equal(result.error,'NO_CREDENTIAL');assert.equal(provider.calls.length,0);assert.equal((await f.s.originalOrganizerStatus()).diagnostics.lastErrorCode,'NO_CREDENTIAL');assert.ok((await f.s.originalOrganizerStatus()).pendingInput>0);
});

test('Initial Build finds a pre-existing archive, processes at most twenty Inputs, and resumes from its persisted cursor',async()=>{
 const f=await fixture();
 const epoch=(await f.s.status()).epoch;
 await f.s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'bootstrap-chat',url:'https://chatgpt.com/c/bootstrap-chat',title:'Synthetic bootstrap'},messages:Array.from({length:99},(_,i)=>({sourceMessageId:'bootstrap-'+i,pageOrder:i+2,originalText:'Bootstrap synthetic input '+i}))});
 let status=await f.s.originalOrganizerStatus();assert.equal(status.bootstrap.state,'not_started');assert.equal(status.pendingInput,100);
 await f.runner.wake({manual:true});status=await f.s.originalOrganizerStatus();assert.equal(f.provider.calls[0].inputs.length,1);assert.equal(status.bootstrap.processed,1);assert.equal(status.bootstrap.state,'running');
 const resumed=new OriginalOrganizerRunner(f.s,{provider:f.provider,credentials});await resumed.wake({manual:true});assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,21);assert.equal(f.provider.calls[1].inputs.length,20);
 for(let i=0;i<5;i++)await resumed.wake({manual:true});status=await f.s.originalOrganizerStatus();assert.equal(status.bootstrap.state,'completed');assert.equal(status.bootstrap.processed,100);assert.ok(f.provider.calls.every(call=>call.inputs.length<=20));
 await f.s.capture(capture(epoch,'post-bootstrap','Only this new delta'));await resumed.wake();assert.equal(f.provider.calls.at(-1).inputs.length,1);assert.equal((await originalBootstrapStatus(f.s)).state,'completed');
});

test('Initial Build failure pauses without advancing its cursor or mutating prior Input data',async()=>{
 const f=await fixture({failure:'INVALID_CREDENTIAL'}),before=await f.s.snapshot();
 const result=await f.runner.wake({manual:true}),bootstrap=await f.s.originalOrganizerStatus(),after=await f.s.snapshot();
 assert.equal(result.error,'INVALID_CREDENTIAL');assert.equal(bootstrap.bootstrap.state,'paused');assert.equal(bootstrap.bootstrap.processed,0);assert.equal(bootstrap.pendingInput,1);assert.deepEqual(after.library.blocks,before.library.blocks);
});

test('Initial Build advances a ten-Input first batch and retries the same paused batch safely',async()=>{
 const f=await fixture();const epoch=(await f.s.status()).epoch;
 await f.s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:Array.from({length:9},(_,i)=>({sourceMessageId:'first-ten-'+i,pageOrder:i+2,originalText:'First batch synthetic '+i}))});
 await f.runner.wake({manual:true});let status=await f.s.originalOrganizerStatus();assert.equal(f.provider.calls[0].inputs.length,10);assert.equal(status.bootstrap.processed,10);
 const retry=await fixture({failure:'RATE_LIMITED'});await retry.runner.wake({manual:true});assert.equal((await retry.s.originalOrganizerStatus()).bootstrap.processed,0);retry.provider.failure=null;await retry.runner.wake({manual:true});status=await retry.s.originalOrganizerStatus();assert.equal(status.bootstrap.processed,1);assert.equal((await retry.s.entryPage()).items.length,1);
});

test('Initial Build reports safe validator and commit failures without advancing the batch',async()=>{
 const invalid=await fixture();invalid.provider.execute=async request=>request.inputs.map(input=>({topic:'Synthetic topic',section:'Chronology',type:'idea',relatedGroup:'nearby',spans:[{inputRef:input.ref,start:0,end:input.text.length+1}],uncertain:false}));
 const before=await invalid.s.dualViewStatus(),result=await invalid.runner.wake({manual:true}),status=await invalid.s.originalOrganizerStatus(),after=await invalid.s.dualViewStatus();assert.equal(result.error,'SPAN_VALIDATION_FAILED');assert.equal(status.diagnostics.validatorResult,'failed');assert.equal(status.bootstrap.processed,0);assert.deepEqual(after.original.originalOrganizerCheckpoint,before.original.originalOrganizerCheckpoint);
 const stale=await fixture();stale.s.libraryCommit.commit=async()=>{throw {code:'STALE_BASE'};};const staleResult=await stale.runner.wake({manual:true}),staleStatus=await stale.s.originalOrganizerStatus();assert.equal(staleResult.error,'BASE_CHANGED');assert.equal(staleStatus.diagnostics.commitResult,'failed');assert.equal(staleStatus.bootstrap.processed,0);
});

test('dispatch gates expose provider, credential, task, and budget reasons before fetch',async()=>{
 const missing=await setup(OrganizerStore),missingRunner=new OriginalOrganizerRunner(missing.s,{provider:null,credentials});await missingRunner.wake({manual:true});assert.equal((await missing.s.originalOrganizerStatus()).diagnostics.reasonCode,'provider_not_registered');
 const credentialMissing=await setup(OrganizerStore),credentialRunner=new OriginalOrganizerRunner(credentialMissing.s,{provider:new FixtureOriginalProvider(),credentials:{async status(){return {hasCredential:false,providerEnabled:false};},async acquire(){return {status:'missing'};},revoke(){}}});await credentialRunner.wake({manual:true});assert.equal((await credentialMissing.s.originalOrganizerStatus()).diagnostics.reasonCode,'credential_unavailable');
 const unsupported=await setup(OrganizerStore),unsupportedProvider=new FixtureOriginalProvider();unsupportedProvider.supportsTask=()=>false;const unsupportedRunner=new OriginalOrganizerRunner(unsupported.s,{provider:unsupportedProvider,credentials});await unsupportedRunner.wake({manual:true});assert.equal(unsupportedProvider.calls.length,0);assert.equal((await unsupported.s.originalOrganizerStatus()).diagnostics.reasonCode,'task_kind_not_supported');
 const budget=await fixture();budget.s.organizerBudget.limits.maxContentBytes=1;await budget.runner.wake({manual:true});assert.equal((await budget.s.originalOrganizerStatus()).diagnostics.reasonCode,'budget_blocked');
});

test('bootstrap recovery reclaims the same claimed batch after a worker restart and dispatches it once',async()=>{
 const f=await fixture(),job=await seedBootstrapJob(f.s,'old-worker'),before=await f.s.originalOrganizerStatus(),restarted=new OriginalOrganizerRunner(f.s,{provider:f.provider,credentials});restarted.owner='new-worker';
 assert.equal(before.bootstrap.processed,0);assert.deepEqual(job.checkpointInputIds,[(await f.s.snapshot()).library.blocks[0].id]);
 const result=await restarted.wake({manual:true}),after=await f.s.originalOrganizerStatus(),stored=await f.s.repository.transaction(false,t=>t.get('organizerJobs',job.id));
 assert.equal(result.recovery.code,'STALE_OWNER_RECLAIMABLE');assert.equal(f.provider.calls.length,1);assert.equal(after.bootstrap.processed,1);assert.equal(stored.state,'completed');assert.deepEqual(stored.checkpointInputIds,job.checkpointInputIds);
});

test('lease recovery reports active, expired, and retry waiting states without changing the selected batch or cursor early',async()=>{
 let now=Date.parse('2026-09-07T00:00:00.000Z');const f=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()}),provider=new FixtureOriginalProvider(),job=await seedBootstrapJob(f.s,'worker-a'),selected=[...job.checkpointInputIds];
 let result=await recoverOriginalWork(f.s,'worker-a');assert.equal(result.code,'ACTIVE_LEASE');assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,0);
 now+=f.s.organizerBudget.limits.timeoutMs+1001;result=await recoverOriginalWork(f.s,'worker-b');assert.equal(result.code,'LEASE_EXPIRED_RECLAIMABLE');let stored=await f.s.repository.transaction(false,t=>t.get('organizerJobs',job.id));assert.equal(stored.state,'queued');assert.deepEqual(stored.checkpointInputIds,selected);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,0);
 await f.s.foundationWrite(async t=>{const row=await t.get('organizerJobs',job.id);row.state='retry';row.stateKey=0;row.nextAttemptAt=now+5000;await t.put('organizerJobs',row);});
 result=await recoverOriginalWork(f.s,'worker-c');assert.equal(result.code,'RETRY_WAITING');assert.ok(result.remainingMs>0);result=await recoverOriginalWork(f.s,'worker-c',{manual:true});assert.equal(result.code,'QUEUED');stored=await f.s.repository.transaction(false,t=>t.get('organizerJobs',job.id));assert.equal(stored.state,'queued');assert.deepEqual(stored.checkpointInputIds,selected);
});

test('a due retry is reclaimed automatically and repeated recovery is idempotent before commit',async()=>{
 let now=Date.parse('2026-09-07T00:00:00.000Z');const f=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()}),provider=new FixtureOriginalProvider(),job=await seedBootstrapJob(f.s,'worker-a');
 await f.s.foundationWrite(async t=>{const row=await t.get('organizerJobs',job.id);row.state='retry';row.nextAttemptAt=now+1;delete row.owner;delete row.leaseUntil;await t.put('organizerJobs',row);});now+=1;
 const first=await recoverOriginalWork(f.s,'worker-b'),second=await recoverOriginalWork(f.s,'worker-b');assert.equal(first.code,'QUEUED');assert.equal(second.code,'QUEUED');const preCommit=await f.s.originalOrganizerStatus();assert.equal(preCommit.bootstrap.processed,0);
 const runner=new OriginalOrganizerRunner(f.s,{provider,credentials});runner.owner='worker-b';await runner.stepWithDiagnostics();const done=await f.s.originalOrganizerStatus();assert.equal(provider.calls.length,1);assert.equal(done.bootstrap.processed,1);
});

test('an invalid pre-dispatch bootstrap job self-heals, preserves user stores and checkpoint, and dispatches only its fresh replacement',async()=>{
 const f=await fixture(),before=await f.s.snapshot(),legacy=await seedLegacyPreDispatch(f),result=await f.runner.wake({manual:true}),after=await f.s.snapshot(),jobs=await f.s.repository.transaction(false,t=>t.all('organizerJobs')),oldWork=await f.s.repository.transaction(false,t=>t.get('organizerWorkItems',legacy.id));
 const old=jobs.find(job=>job.id===legacy.id),fresh=jobs.find(job=>job.id!==legacy.id&&job.kind==='original_organize'),repair=await f.s.repository.transaction(false,t=>t.get('meta','originalOrganizerRuntimeRepairVersion'));assert.equal(result.recovery.code,'INVALID_JOB_STATE');assert.equal(f.provider.calls.length,1);assert.equal(old.state,'abandoned');assert.equal(old.error,'PRE_DISPATCH_RUNTIME_REPAIRED');assert.equal(old.dedupeKey,'runtime-repaired:'+legacy.id);assert.equal(old.audit,undefined);assert.equal(old.usageId,undefined);assert.equal(oldWork,undefined);await assert.rejects(f.s.foundationWrite(t=>leaseGuard(f.s,t,legacy)),error=>error?.code==='CANCELLED');assert.equal(repair.version,1);assert.equal(repair.bootstrapCursor,-1);assert.equal(fresh.state,'completed');assert.deepEqual(fresh.checkpointInputIds,legacy.checkpointInputIds);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,1);assert.deepEqual(after.records,before.records);assert.deepEqual(after.library.blocks,before.library.blocks);
});

test('pre-dispatch self-heal is versioned and idempotent, and a later worker can claim its fresh replacement',async()=>{
 const f=await fixture(),legacy=await seedLegacyPreDispatch(f),beforeCheckpoint=(await f.s.dualViewStatus()).original.originalOrganizerCheckpoint,queued=await enqueueOriginalWork(f.s),first=await selfHealOriginalRuntime(f.s,queued),second=await selfHealOriginalRuntime(f.s,queued);assert.equal(first.repaired,true);assert.equal(second.repaired,false);assert.deepEqual((await f.s.dualViewStatus()).original.originalOrganizerCheckpoint,beforeCheckpoint);
 const replacement=await enqueueOriginalWork(f.s),restarted=new OriginalOrganizerRunner(f.s,{provider:f.provider,credentials});restarted.owner='restarted-worker';await restarted.wake({manual:true});const jobs=await f.s.repository.transaction(false,t=>t.all('organizerJobs')),old=jobs.find(job=>job.id===legacy.id),fresh=jobs.find(job=>job.id===replacement.id);assert.equal(old.state,'abandoned');assert.equal(fresh.state,'completed');assert.equal(f.provider.calls.length,1);
});

test('an API-received runtime refuses simple self-heal',async()=>{
 const f=await fixture(),legacy=await seedLegacyPreDispatch(f,{providerStatus:'received'}),result=await f.runner.wake({manual:true}),stored=await f.s.repository.transaction(false,t=>t.get('organizerJobs',legacy.id)),work=await f.s.repository.transaction(false,t=>t.get('organizerWorkItems',legacy.id));assert.equal(result.error,undefined);assert.equal(f.provider.calls.length,0);assert.equal(stored.state,'legacy_claimed');assert.equal(work.state,'legacy_claimed');assert.equal((await f.s.originalOrganizerStatus()).diagnostics.reasonCode,'MANUAL_RECOVERY_REQUIRED');
});
