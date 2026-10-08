// Actual local multi-child owner tests. Synthetic providers and injected
// failures exercise production transactions without external model calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {LocalOrganizeSession} from '../core/organizer/local-organize-session.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
const authority=async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
async function fixture(n){const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic closure audit',operationId:crypto.randomUUID()}),keys=[];for(let i=0;i<n;i++){const e=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'e'+i,type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});keys.push(JSON.stringify(['library_entry',e.id]));}return {s,topic,keys};}
const rows=(s,table)=>s.run(()=>s.repository.transaction(false,t=>t.all(table)));
function request(f,items,size){const coverage=items.map(i=>({key:i.key,facet:'organize',scope:f.topic.id})),children=[];for(let i=0;i<coverage.length;i+=size)children.push(coverage.slice(i,i+size));return {type:'AI_ORGANIZE',intent:'explicit',items,coverage,children,contractVersion:'synthetic-audit',routeVersion:'synthetic-audit'};}
test('atomic three-child closure has one domain call and rolls all ACKs back on write failure',async()=>{
 const f=await fixture(60);let calls=0,abort=true;
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:authority,organizeClosure:async(t,r)=>{calls++;await t.put('meta',{id:'synthetic-domain',job:r.logicalJobId});return {committed:true,coverage:r.units,isCurrent:()=>true};}}),{items}=await ai.describe({keys:f.keys}),job=await ai.plan({...request(f,items,20),commitMode:'organize-atomic-v1'});
 await ai.reserve(job.id,{reservationId:'synthetic'});for(const id of job.childIds)await ai.dispatch(job.id,id,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:id})});
 const stored=await ai.read(t=>ai.job(t,job.id)),children=job.childIds.map((childId,i)=>({childId,units:stored.childCoverage[i]}));
 await assert.rejects(ai.commitFacet(job.id,job.childIds[0],{facet:'organize',units:children[0].units}),{code:'INVALID_REQUEST'});
 const original=ai.settleFacet.bind(ai);ai.settleFacet=async(...args)=>{const r=await original(...args);if(abort&&args[2]===1)throw Error('synthetic ACK abort');return r;};
 await assert.rejects(ai.commitOrganizeClosure(job.id,{children}));assert.equal((await ai.status(job.id)).committedCoverage.length,0);assert.equal(await ai.read(t=>t.get('meta','synthetic-domain')),undefined);
 abort=false;assert.equal((await ai.commitOrganizeClosure(job.id,{children})).state,'COMMITTED');assert.equal((await ai.status(job.id)).committedCoverage.length,60);assert.equal(calls,2);
 assert.equal((await ai.commitOrganizeClosure(job.id,{children})).state,'COMMITTED');assert.equal(calls,2);
});
import {aiCandidateKey} from '../core/organizer/ai-candidate.js';
const profile={contractVersion:'synthetic-v2',modelVersion:'synthetic',promptVersion:'synthetic'};
const provider=seen=>({describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async r=>{seen.push(r);return {version:2,blocks:r.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))};}});
for(const n of [60,80])test(`actual ${n} Entry LocalSession publishes one complete candidate, adopts and replays without dispatch`,async()=>{
 const f=await fixture(n),seen=[],session=new LocalOrganizeSession(f.s,{resolveAuthority:authority,profile,routeVersion:'synthetic',incrementalVersion:2}),h=await session.prepare({topicId:f.topic.id,children:n/20});
 assert.equal((await session.run(h,provider(seen))).state,'COMMITTED');assert.deepEqual(seen.map(x=>x.inputs.length),Array(n/20).fill(20));assert.equal(new Set(seen.flatMap(x=>x.inputs.map(i=>i.ref))).size,n);
 const st=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0],c=st.candidate;assert.ok(c);assert.equal(c.proposal.evidenceEntryIds.length,n);
 await f.s.editAIPresentation({topicId:f.topic.id,expectedRevision:c.expectedRevision,expectedCandidateKey:aiCandidateKey(c),candidateDecisions:Object.fromEntries(c.changedFields.map(k=>[k,'adopt'])),operationId:crypto.randomUUID()});
 assert.equal((await session.run(h,provider(seen))).state,'COMMITTED');assert.equal(seen.length,n/20);const after=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0];assert.equal(after.presentation.evidenceEntryIds.length,n);assert.notEqual(after.cacheQualification?.reusable,true);session.dispose();
});
test('dispose during final authority await rolls candidate and all closure ACKs back',async()=>{
 const f=await fixture(40);let session,armed=false,disposed=false;
 const resolver=async(t,r)=>{const a=await authority(t,r);if(armed&&(await t.get('meta','aiPresentation:'+f.topic.id))?.candidate){session.dispose();disposed=true;}return a;};
 session=new LocalOrganizeSession(f.s,{resolveAuthority:resolver,profile,routeVersion:'synthetic',incrementalVersion:2});const h=await session.prepare({topicId:f.topic.id,children:2});armed=true;
 await assert.rejects(session.run(h,provider([])),{code:'STALE_BASE'});assert.equal(disposed,true);assert.equal(await f.s.run(()=>f.s.repository.transaction(false,t=>t.get('meta','aiPresentation:'+f.topic.id))),undefined);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.deepEqual((await rows(f.s,'organizerUsage')).map(x=>x.state),['RESPONSE_RECORDED','RESPONSE_RECORDED']);
});
test('nine concurrent multi-child preparations never publish more than eight private handles',async()=>{
 const f=await fixture(21),ids=[f.topic.id];for(let i=1;i<9;i++){const t=await f.s.createTopic({name:'scope'+i,operationId:crypto.randomUUID()});ids.push(t.id);for(const key of f.keys){const e=await f.s.entry(JSON.parse(key)[1]);await f.s.placeEntry({topicId:t.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(t.id)).organizationRevision,operationId:crypto.randomUUID()});}}
 const session=new LocalOrganizeSession(f.s,{resolveAuthority:authority,profile,routeVersion:'synthetic',incrementalVersion:2}),result=await Promise.allSettled(ids.map(topicId=>session.prepare({topicId,children:2})));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,8);assert.equal(result.filter(r=>r.status==='rejected'&&r.reason.code==='UNAVAILABLE').length,1);session.dispose();
});
const sessionFor=(f,resolveAuthority=authority)=>new LocalOrganizeSession(f.s,{resolveAuthority,profile,routeVersion:'synthetic',incrementalVersion:2});
const presentation=f=>f.s.run(()=>f.s.repository.transaction(false,t=>t.get('meta','aiPresentation:'+f.topic.id)));
for(const failure of ['candidate','middle-ack','last-ack','last-receipt'])test(`actual LocalSession ${failure} transaction abort preserves private responses for exact no-dispatch retry`,async()=>{
 const f=await fixture(60),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:3}),seen=[];
 const transaction=f.s.repository.transaction.bind(f.s.repository);let armed=true,count=0;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(name,row)=>{if(armed){if(failure==='candidate'&&name==='meta'&&row.id==='aiPresentation:'+f.topic.id)throw Error('synthetic candidate abort');if(name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&++count===(failure==='middle-ack'?21:60)&&failure.includes('ack'))throw Error('synthetic ACK abort');if(failure==='last-receipt'&&name==='organizerUsage'&&row.state==='COMMITTED'&&row.sequence===2)throw Error('synthetic receipt abort');}return put(name,row);};return fn(t);},...rest);
 await assert.rejects(session.run(h,provider(seen)));assert.equal(seen.length,3);assert.equal(await presentation(f),undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.deepEqual((await rows(f.s,'organizerUsage')).map(x=>x.state),Array(3).fill('RESPONSE_RECORDED'));
 armed=false;assert.equal((await session.run(h,provider(seen))).state,'COMMITTED');assert.equal(seen.length,3);assert.ok((await presentation(f)).candidate);session.dispose();
});
test('unknown child outcome and disposed recorded responses never redispatch or publish a partial candidate',async()=>{
 for(const mode of ['unknown','dispose']){const f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),seen=[];const p=provider(seen),execute=p.execute;p.execute=async r=>{if(mode==='unknown'&&seen.length===1){seen.push(r);throw Error('synthetic unknown');}const out=await execute(r);if(mode==='dispose'&&seen.length===2)session.dispose();return out;};const first=await session.run(h,p);assert.equal(first.state,'OUTCOME_UNKNOWN');assert.equal(await presentation(f),undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);await assert.rejects(session.run(h,p));assert.equal(seen.length,2);const next=sessionFor(f),reopened=await next.prepare({topicId:f.topic.id,children:2});await assert.rejects(next.run(reopened,provider(seen)),{code:'OUTCOME_UNKNOWN'});assert.equal(seen.length,2);session.dispose();next.dispose();}
});
test('last-child actual style change prevents closure while preserving all recorded attempt identities',async()=>{
 const f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),seen=[],p=provider(seen),execute=p.execute;p.execute=async r=>{const out=await execute(r);if(seen.length===2){const pref=await f.s.aiStylePreference();await f.s.updatePreferences({aiOrganizeStyle:{version:1,value:pref.value==='original'?'concise':'original',expectedRevision:pref.revision,expectedEpoch:pref.epoch}});}return out;};await assert.rejects(session.run(h,p));assert.equal(await presentation(f),undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.equal((await rows(f.s,'organizerUsage')).reduce((n,r)=>n+r.attemptCount,0),2);session.dispose();
});
test('fifth physical child and a shared dependency component above twenty refuse before attempts',async()=>{
 const f=await fixture(81),session=sessionFor(f);await assert.rejects(session.prepare({topicId:f.topic.id,children:5}),{code:'INVALID_REQUEST'});await assert.rejects(session.prepare({topicId:f.topic.id,children:4}),{code:'BUDGET_EXCEEDED'});assert.equal((await rows(f.s,'organizerUsage')).length,0);session.dispose();
 const {derived}=await import('./harness/thought-m1.mjs'),g=await fixture(0),input=(await g.s.snapshot()).library.blocks[0];for(let i=0;i<21;i++){const e=await derived(g.s,[input.id],{body:'unique'+i});await g.s.placeEntry({topicId:g.topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await g.s.topic(g.topic.id)).organizationRevision,operationId:crypto.randomUUID()});}const next=sessionFor(g);await assert.rejects(next.prepare({topicId:g.topic.id,children:2}),{code:'BUDGET_EXCEEDED'});assert.equal((await rows(g.s,'organizerUsage')).length,0);next.dispose();
});
import {invalidateSemanticJobs} from '../core/ai-usage/semantic-invalidation.js';
for(const count of [100,101])test(`mixed legacy/atomic invalidation ${count} jobs shares one hundred-job budget`,async()=>{
 const f=await fixture(2),ai=new AIUsageFoundation(f.s,{resolveAuthority:authority,organizeClosure:async()=>{throw Error('not used');}}),{items}=await ai.describe({keys:f.keys}),j=await ai.plan({...request(f,items,1),commitMode:'organize-atomic-v1'}),original=await ai.read(t=>ai.job(t,j.id));
 await ai.write(async t=>{for(let i=1;i<count;i++){const job={...original,id:'synthetic-bound-'+i,dedupeKey:'synthetic-bound-'+i};if(i%2){job.kind='ai_usage_v1';delete job.commitMode;}await t.put('organizerJobs',job);}});
 const before=await rows(f.s,'organizerJobs');let result;await f.s.foundationWrite(async t=>{await t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-invalidated'});result=await invalidateSemanticJobs(t);});const after=await rows(f.s,'organizerJobs');
 if(count===101){assert.equal(result.reason,'SCAN_BOUND');assert.deepEqual(after,before);}else{assert.equal(result.checked,100);assert.equal(after.filter(x=>x.cancelEpoch===1&&x.state==='CANCELLED_BEFORE_DISPATCH').length,100);}
});
test('actual backup replace clears atomic transient job and old private session cannot dispatch',async()=>{
 const {BackupService}=await import('./harness/historical-backup.mjs'),{exported,prepared}=await import('./harness/backup-v081.mjs');const f=await fixture(40),service=new BackupService(f.s),copy=await exported(service),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),stage=await prepared(service,copy);
 const preview=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});assert.equal((await rows(f.s,'organizerJobs')).some(j=>j.id===h.jobId),false);assert.equal((await rows(f.s,'organizerUsage')).length,0);const seen=[];await assert.rejects(session.run(h,provider(seen)));assert.equal(seen.length,0);session.dispose();
});
test('actual Source purge removes the atomic job and refuses held closure without reissuing attempts',async()=>{
 const {derived}=await import('./harness/thought-m1.mjs'),{admitPreGatePurgeFixture}=await import('./harness/pre-gate-purge-fixture.mjs'),f=await fixture(20),input=(await f.s.snapshot()).library.blocks[0],e=await derived(f.s,[input.id]);await f.s.placeEntry({topicId:f.topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});const session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),seen=[],p=provider(seen),execute=p.execute;
 p.execute=async r=>{const out=await execute(r);if(seen.length===2){await admitPreGatePurgeFixture(f.s,input.sourceRecordId);await f.s.drainPurgeCleanup();}return out;};await assert.rejects(session.run(h,p));assert.equal((await rows(f.s,'organizerJobs')).some(j=>j.id===h.jobId),false);assert.equal(await presentation(f),undefined);await assert.rejects(session.run(h,p));assert.equal(seen.length,2);session.dispose();
});
test('dispose while an actual coverage put is in flight rolls the complete closure transaction back',async()=>{
 const f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),seen=[],transaction=f.s.repository.transaction.bind(f.s.repository);let intercepted=false,released=false,held;const arrived=new Promise(resolve=>held=resolve);
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(name,row)=>{const result=await put(name,row);if(!intercepted&&name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){intercepted=true;held();while(!released)await t.get('meta','gate');}return result;};return fn(t);},...rest);
 const running=session.run(h,provider(seen));try{await arrived;session.dispose();}finally{released=true;}await assert.rejects(running,{code:'STALE_BASE'});assert.equal(intercepted,true);assert.equal(await presentation(f),undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.deepEqual((await rows(f.s,'organizerUsage')).map(x=>x.state),['RESPONSE_RECORDED','RESPONSE_RECORDED']);
});
test('a real prior legacy ACK cannot be laundered into a partially validated atomic job',async()=>{
 const f=await fixture(2),ai=new AIUsageFoundation(f.s,{resolveAuthority:authority,organizeClosure:async()=>{throw Error('not used');},committers:{organize:async(_t,r)=>({committed:true,coverage:r.units})}}),{items}=await ai.describe({keys:f.keys}),old=await ai.plan(request(f,items.slice(0,1),1));await ai.resolveLocal(old.id,{facet:'organize',units:[{key:items[0].key,facet:'organize',scope:f.topic.id}]});const before=await rows(f.s,'organizerJobs');await assert.rejects(ai.plan({...request(f,items,1),commitMode:'organize-atomic-v1'}),{code:'STALE_BASE'});assert.deepEqual(await rows(f.s,'organizerJobs'),before);
});
test('incomplete or foreign child response never produces a candidate or coverage ACK',async()=>{
 for(const mode of ['missing','foreign']){const f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2}),seen=[],p=provider(seen),execute=p.execute;p.execute=async r=>{const out=await execute(r);if(seen.length===2){if(mode==='missing')out.blocks.pop();else out.blocks[0].evidenceEntryIds=[seen[0].inputs[0].ref];}return out;};assert.equal((await session.run(h,p)).state,'OUTCOME_UNKNOWN');assert.equal(await presentation(f),undefined);assert.equal((await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').length,0);await assert.rejects(session.run(h,p));assert.equal(seen.length,2);session.dispose();}
});
test('complete child payload budget is preflighted before all attempts including Foundation usage metadata',async()=>{
 const f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2});const first=await session.assemble(h,(await rows(f.s,'organizerJobs')).find(j=>j.id===h.jobId).childIds[0]);const original=f.s.organizerBudget.limits.maxRequestBytes;
 try{f.s.organizerBudget.limits.maxRequestBytes=new TextEncoder().encode(JSON.stringify(first)).length;const seen=[];await assert.rejects(session.run(h,provider(seen)),{code:'BUDGET_EXCEEDED'});assert.equal(seen.length,0);assert.equal((await rows(f.s,'organizerUsage')).length,0);}finally{f.s.organizerBudget.limits.maxRequestBytes=original;session.dispose();}
});
test('new logical closure does not silently activate the old financial evidence bridge',async()=>{
 const {readDomainCommitEvidence}=await import('../core/ai-usage/domain-commit-evidence.js'),f=await fixture(40),session=sessionFor(f),h=await session.prepare({topicId:f.topic.id,children:2});await session.run(h,provider([]));const before=await rows(f.s,'organizerUsage'),reader=new AIUsageFoundation(f.s,{resolveAuthority:authority});assert.deepEqual(await readDomainCommitEvidence(reader,h.jobId),{status:'UNSUPPORTED',dispatchAllowed:false,financialAuthority:false,evidence:null});assert.deepEqual(await rows(f.s,'organizerUsage'),before);session.dispose();
});
