import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicFormationService} from '../core/topic-formation.js';
import {HiddenTopicCandidates} from '../core/topic-candidates.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared as prepareBackup} from './harness/backup-v081.mjs';
import {formationFixture,assessment,citation,parameters,request,runFormation,rows,raw,op,topic,addInput,snapshot,collect,derived,inputEdit} from './harness/topic-03.mjs';
const service=(f,decide,options={})=>new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-atomic-v1',assess:decide},...options});
const subject=key=>view=>{const value=assessment(view,{kind:'subject',boundaryKey:key});value.boundary.reason='sustained_subject';value.continuity.reason='recurring_subject';return value;};
async function enough(f){await addInput(f,{text:'Second independent synthetic source contribution.'});await addInput(f,{text:'Third independent synthetic source contribution.',chat:'third-synthetic-chat'});}

test('TOPIC-03 concurrent first-admission plans cannot create duplicate identities, including across service instances',async()=>{
 const f=await formationFixture(),a=await f.service.prepare(request(f)),other=service(f,assessment),b=await other.prepare(request(f));await f.service.commit(a);const before=await snapshot(f.s);await assert.rejects(other.commit(b));assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'topics')).length,1);
});
test('TOPIC-03 source changes and deletion during awaited assessment refuse before any organization write',async()=>{
 for(const change of ['edit','exclude','purge']){
  const f=await formationFixture();let enter,release;const entered=new Promise(r=>enter=r),hold=new Promise(r=>release=r),s=service(f,async view=>{enter();await hold;return assessment(view);}),pending=s.prepare(request(f));await entered;
  if(change==='edit')await inputEdit(f.s,f.scope[0].inputId,{libraryText:'A newly edited body invalidates the old decision.'});else if(change==='exclude')await f.s.excludeLibrary(f.scope[0].inputId,true);else{const [source]=await rows(f.s,'records');await f.s.permanentDelete(source.id);}
  const before=await snapshot(f.s);release();await assert.rejects(pending);assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'topics')).length,0);
 }
});
test('TOPIC-03 scope revocation, key/restore changes, rename, removal and changed layouts invalidate prepared commits',async()=>{
 for(const change of ['permission','target','key','restore','rename','remove','layout']){
  const f=await formationFixture(),a=await topic(f.s,'Existing object');let deny=false;const s=service(f,view=>{const value=assessment(view);value.relations[0].relation='same';return value;},{resolveProcessing:async(_t,r)=>({allowed:!deny&&f.permission.allowed,epoch:f.permission.epoch,inputIds:[...r.inputIds],topicIds:[...r.topicIds]})}),handle=await s.prepare(request(f));
  if(change==='permission')f.permission.epoch='changed-processing-epoch';else if(change==='target')deny=true;else if(change==='key'||change==='restore')await f.s.foundationWrite(t=>t.put('meta',{id:change==='key'?'thought-suppression-key':'recovery-restore-epoch',value:change==='key'?Array(32).fill(1):op()}));else if(change==='rename')await f.s.renameTopic({id:a.id,name:'Protected later name',expectedRevision:0,operationId:op()});else if(change==='remove')await f.s.removeTopic({id:a.id,expectedRevision:0,operationId:op()});else await f.s.createSection({topicId:a.id,title:'Later human organization',expectedTopicRevision:0,operationId:op()});
  const before=await snapshot(f.s);await assert.rejects(s.commit(handle));assert.deepEqual(await snapshot(f.s),before);
 }
});
test('TOPIC-03 real replace-restore invalidates prepared creation and preserves the restored Source/body',async()=>{
 const f=await formationFixture(),items=await exported(new FixtureBackup(f.s,{appVersion:'0.12.1'})),handle=await f.service.prepare(request(f)),backup=new BackupService(f.s),stage=await prepareBackup(backup,items);const preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});const before=await snapshot(f.s);await assert.rejects(f.service.commit(handle));assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'topics')).length,0);
});
test('TOPIC-03 cancelled or forged handles never write and cancellation inside a transaction rolls back',async()=>{
 const f=await formationFixture(),handle=await f.service.prepare(request(f)),other=service(f,assessment);await assert.rejects(other.commit(handle));await assert.rejects(f.service.commit({...handle}));f.service.cancel(handle);await assert.rejects(f.service.commit(handle));assert.equal((await rows(f.s,'topics')).length,0);
 const g=await formationFixture(),controller=new AbortController(),h=await g.service.prepare(request(g),{signal:controller.signal}),apply=g.s.libraryCommit.apply.bind(g.s.libraryCommit),before=await snapshot(g.s);g.s.libraryCommit.apply=async(...args)=>{const result=await apply(...args);controller.abort();return result;};await assert.rejects(g.service.commit(h));assert.deepEqual(await snapshot(g.s),before);
});
test('TOPIC-03 a failed final receipt rolls back Topic, Section, Placement and body, then retry is idempotent',async()=>{
 const f=await formationFixture(),r=request(f),h=await f.service.prepare(r),before=await snapshot(f.s),write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{if(name==='operationReceipts'&&row.id===r.operationId)throw Error('synthetic quota failure');return put(name,row,...rest);};return fn(t);});await assert.rejects(f.service.commit(h));assert.deepEqual(await snapshot(f.s),before);f.s.foundationWrite=write;const result=await f.service.commit(h);assert.equal(result.topicIds.length,1);assert.deepEqual(await f.service.commit(h),result);assert.equal((await rows(f.s,'topics')).length,1);
});
test('TOPIC-03 hidden candidate creation and unassigned Entry commit roll back together',async()=>{
 const f=await formationFixture({decide:subject('a'.repeat(64))}),h=await f.service.prepare(request(f)),before=await snapshot(f.s),apply=f.s.libraryCommit.apply.bind(f.s.libraryCommit);f.s.libraryCommit.apply=async()=>{throw Error('synthetic Entry failure after candidate write');};await assert.rejects(f.service.commit(h));assert.deepEqual(await snapshot(f.s),before);f.s.libraryCommit.apply=apply;const result=await f.service.commit(h);assert.equal(result.outcome,'candidate');assert.equal((await rows(f.s,'organizerWorkItems')).length,1);assert.deepEqual(await f.service.commit(h),result);
});
test('TOPIC-03 qualified candidate is consumed atomically and an unrelated boundary remains hidden',async()=>{
 const key='a'.repeat(64),f=await formationFixture({decide:subject(key)}),first=(await runFormation(f)).result,other=service(f,subject('b'.repeat(64))),unrelated=await other.commit(await other.prepare(request(f)));await enough(f);const r=request(f,{candidateId:first.candidateId,expectedCandidateRevision:first.candidateRevision}),h=await f.service.prepare(r),result=await f.service.commit(h);assert.equal(result.outcome,'create');assert.equal(result.consumedCandidateId,first.candidateId);assert.equal(await raw(f.s,'organizerWorkItems',first.candidateId),undefined);assert.ok(await raw(f.s,'organizerWorkItems',unrelated.candidateId));assert.deepEqual(await f.service.commit(h),result);assert.equal((await rows(f.s,'topics')).length,1);
});
test('TOPIC-03 partial evidence retains pending candidate; wrong boundary key cannot consume it',async()=>{
 const f=await formationFixture({decide:subject('a'.repeat(64))}),first=(await runFormation(f)).result;await enough(f);
 const partial=service(f,view=>{const value=subject('a'.repeat(64))(view);value.kind='object';value.boundary.reason='independent_object';value.continuity.reason='ongoing_work';value.evidence=[citation(view.inputs.find(x=>x.id===f.scope[0].inputId),'body',0,9)];return value;}),r=request(f,{candidateId:first.candidateId,expectedCandidateRevision:0});const result=await partial.commit(await partial.prepare(r));assert.equal(result.outcome,'create');assert.equal(result.consumedCandidateId,undefined);assert.ok(await raw(f.s,'organizerWorkItems',first.candidateId));
 const g=await formationFixture({decide:subject('a'.repeat(64))}),candidate=(await runFormation(g)).result;await enough(g);await assert.rejects(service(g,subject('b'.repeat(64))).prepare(request(g,{candidateId:candidate.candidateId,expectedCandidateRevision:0})));assert.ok(await raw(g.s,'organizerWorkItems',candidate.candidateId));
});
test('TOPIC-03 candidate consume is rolled back after deletion, and stale revisions or cancellation cannot consume',async()=>{
 const f=await formationFixture({decide:subject('c'.repeat(64))}),first=(await runFormation(f)).result;await enough(f);const r=request(f,{candidateId:first.candidateId,expectedCandidateRevision:0}),h=await f.service.prepare(r),before=await snapshot(f.s),write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{if(name==='operationReceipts'&&row.id===r.operationId)throw Error('synthetic receipt failure after consume');return put(name,row,...rest);};return fn(t);});await assert.rejects(f.service.commit(h));assert.deepEqual(await snapshot(f.s),before);f.s.foundationWrite=write;f.service.cancel(h);await assert.rejects(f.service.commit(h));assert.ok(await raw(f.s,'organizerWorkItems',first.candidateId));
 const stale=await f.service.prepare(request(f,{candidateId:first.candidateId,expectedCandidateRevision:0}));await f.s.foundationWrite(async t=>{const row=await t.get('organizerWorkItems',first.candidateId);row.revision++;await t.put('organizerWorkItems',row);});const current=await snapshot(f.s);await assert.rejects(f.service.commit(stale));assert.deepEqual(await snapshot(f.s),current);
});
test('TOPIC-03 candidate transaction handles are opaque and instance/store-bound',async()=>{
 const f=await formationFixture(),c=new HiddenTopicCandidates(f.s,f.serviceOptions),coverage=(await collect(f.retrieval,{scope:f.scope})).coverage,handle=await c.prepareRecord({scope:f.scope,coverage}),other=new HiddenTopicCandidates(f.s,f.serviceOptions),g=await formationFixture();
 await assert.rejects(f.s.foundationWrite(t=>c.recordPreparedInTransaction(t,{})));await assert.rejects(f.s.foundationWrite(t=>other.recordPreparedInTransaction(t,handle)));await assert.rejects(g.s.foundationWrite(t=>c.recordPreparedInTransaction(t,handle)));assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 const result=await f.s.foundationWrite(t=>c.recordPreparedInTransaction(t,handle)),consume=await c.prepareConsume({candidateId:result.candidateId,expectedRevision:0,scope:f.scope});await assert.rejects(f.s.foundationWrite(t=>other.consumePreparedInTransaction(t,consume)));await assert.rejects(g.s.foundationWrite(t=>c.consumePreparedInTransaction(t,consume)));assert.ok(await c.read(result.candidateId));
});
test('TOPIC-03 field-restricted Input scope never releases an Entry backed by an unselected body field',async()=>{
 const f=await formationFixture(),entry=await derived(f.s,[f.scope[0].inputId]);await assert.rejects(f.service.prepare(request(f,{entryIds:[entry.id],scope:f.scope.map(e=>({...e,selectedFields:['note']}))})));assert.equal((await rows(f.s,'topics')).length,0);
});
