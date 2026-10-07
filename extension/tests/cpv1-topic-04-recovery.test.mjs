import test from 'node:test';
import assert from 'node:assert/strict';
import {OrganizerStore} from '../core/organizer/store.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared as prepareBackup} from './harness/backup-v081.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import {policy,key} from '../core/memory/model.js';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {promotionFixture,promotionService,decide,request,confirmed,promote,rows,raw,op,topic,snapshot,inputEdit} from './harness/topic-04.mjs';

test('TOPIC-04 bounded metadata staging survives restart and activates once after the complete selection',async()=>{
 const f=await promotionFixture({count:31}),before=await snapshot(f.s),work=await confirmed(f),stage=await f.service.stage(work.workId,{limit:25});assert.equal(stage.staged,25);assert.equal(stage.total,31);assert.equal(stage.state,'staging');assert.deepEqual(await snapshot(f.s),before);await assert.rejects(f.service.activate(work.workId));assert.equal((await rows(f.s,'topics')).length,1);
 const stored=JSON.stringify(await rows(f.s,'organizerWorkItems'));assert.equal(stored.includes('Independent synthetic conclusion'),false);assert.equal(stored.includes('Synthetic explicit working input'),false);assert.equal(stored.includes('"secret"'),false);assert.equal((await rows(f.s,'organizerWorkItems')).some(row=>row.jobId),false);
 assert.equal((await f.s.libraryIndexPage()).items.length,1);await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});f.service=promotionService(f,null,{decision:null});assert.equal((await f.service.stage(work.workId)).state,'ready');const result=await f.service.activate(work.workId);assert.equal(result.entryIds.length,31);assert.deepEqual(await f.service.activate(work.workId),result);assert.equal((await rows(f.s,'topics')).length,2);assert.equal((await rows(f.s,'thoughts')).length,31);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
});

for(const change of ['permission','target_permission','source','input_edit','section','name','layout','constraint','key','restore_epoch'])test('TOPIC-04 stale confirmed work fails closed after '+change,async()=>{
 const f=await promotionFixture({count:2}),work=await confirmed(f);await f.service.stage(work.workId);const p=await f.s.topic(f.parent.id);
 if(change==='permission')f.permission.allowed=false;
 else if(change==='target_permission')f.service=promotionService(f,decide,{resolveProcessing:async(_t,r)=>({allowed:!r.topicIds.includes(p.id),epoch:f.permission.epoch,inputIds:[...r.inputIds],topicIds:[...r.topicIds]})});
 else if(change==='source')await f.s.excludeLibrary(f.scope[0].inputId,true);
 else if(change==='input_edit')await inputEdit(f.s,f.scope[0].inputId,{libraryText:'New current Input body'});
 else if(change==='section')await f.s.editSection({topicId:p.id,sectionId:f.section.sectionId,expectedRevision:0,title:'Later manual section label',operationId:op()});
 else if(change==='name')await f.s.editTopic({id:p.id,expectedRevision:p.revision,changes:{name:'Later parent name'},operationId:op()});
 else if(change==='layout')await f.s.createSection({topicId:p.id,expectedTopicRevision:p.organizationRevision,title:'Another section',operationId:op()});
 else if(change==='constraint'){const other=await topic(f.s,'Another identity');await f.s.keepTopicsSeparate({sourceId:p.id,targetId:other.id});}
 else await f.s.foundationWrite(t=>t.put('meta',{id:change==='key'?'thought-suppression-key':'recovery-restore-epoch',value:change==='key'?Array(32).fill(1):op()}));
 const before=await snapshot(f.s);await assert.rejects(f.service.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);await f.service.rollback(work.workId);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
});

test('TOPIC-04 stale proposal and concurrent promotions cannot allocate duplicate identities',async()=>{
 const f=await promotionFixture(),a=await f.service.prepare(request(f)),other=promotionService(f),b=await other.prepare(request(f)),wa=await f.service.confirm(a,{confirmed:true}),wb=await other.confirm(b,{confirmed:true});await f.service.stage(wa.workId);await other.stage(wb.workId);await f.service.activate(wa.workId);const before=await snapshot(f.s);await assert.rejects(other.activate(wb.workId));await assert.rejects(other.confirm(b,{confirmed:true}));assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'topics')).length,2);
});

test('TOPIC-04 failed staging and activation roll back; the same durable confirmed work retries safely',async()=>{
 for(const phase of ['staging','activation']){
  const f=await promotionFixture({count:3}),work=await confirmed(f);if(phase==='activation')await f.service.stage(work.workId);const before=await snapshot(f.s),staged=await rows(f.s,'organizerWorkItems'),write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(phase==='staging'&&name==='organizerWorkItems'&&row.index===1||phase==='activation'&&name==='operationReceipts')throw Error('synthetic quota failure');return put(name,row,...args);};return fn(t);});
  await assert.rejects(phase==='staging'?f.service.stage(work.workId):f.service.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await rows(f.s,'organizerWorkItems'),staged);f.s.foundationWrite=write;if(phase==='staging')await f.service.stage(work.workId);const result=await f.service.activate(work.workId);assert.equal(result.entryIds.length,3);assert.equal((await rows(f.s,'topics')).length,2);
 }
});

test('TOPIC-04 forged confirmed/staged work and expired confirmation cannot become authority',async()=>{
 for(const kind of ['confirmed','staged','expired']){
  let now=Date.parse('2026-10-07T00:00:00Z');const f=await promotionFixture({clock:()=>new Date(now).toISOString()}),work=await confirmed(f);await f.service.stage(work.workId);
  if(kind==='expired')now+=24*60*60*1000;else await f.s.repository.transaction(true,async t=>{const row=await t.get('organizerWorkItems',kind==='confirmed'?work.workId:work.workId+':000');if(kind==='confirmed')row.confirmed.plan.name='Forged proposal';else row.placement.rank='000000000001';await t.put('organizerWorkItems',row);});
  const before=await snapshot(f.s);await assert.rejects(f.service.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);
 }
});

test('TOPIC-04 actual replace restore discards staging and preserves completed mapping and restrictive history',async()=>{
 const f=await promotionFixture(),items=await exported(new FixtureBackup(f.s,{appVersion:'0.12.1'})),work=await confirmed(f);await f.service.stage(work.workId);const backup=new BackupService(f.s),stage=await prepareBackup(backup,items),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});assert.equal((await rows(f.s,'organizerWorkItems')).length,0);const before=await snapshot(f.s);await assert.rejects(f.service.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);
 const result=(await promote(f)).result,complete=await exported(new FixtureBackup(f.s,{appVersion:'0.12.1'})),restore=new BackupService(f.s),r=await prepareBackup(restore,complete),p=await restore.previewRestore({sessionId:r.sessionId,mode:'replace'});assert.equal(p.canRestore,true);await restore.restore({sessionId:r.sessionId,mode:'replace',confirmation:p.integrity,targetGeneration:p.targetGeneration,confirmReplace:true});const undone=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()});assert.equal(undone.state,'before');assert.ok((await f.s.entry(f.entryIds[0])).organizationIntents.excluded.includes(result.id));
});

test('TOPIC-04 current B-02 purge refusal remains intact; historical source erasure clears staging and prevents activation',async()=>{
 const f=await promotionFixture(),work=await confirmed(f);await f.service.stage(work.workId);const source=(await rows(f.s,'records'))[0],before=await snapshot(f.s);await assert.rejects(f.s.permanentDelete(source.id),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(f.s),before);await admitPreGatePurgeFixture(f.s,source.id);await f.s.drainPurgeCleanup();assert.equal((await rows(f.s,'organizerWorkItems')).length,0);await assert.rejects(f.service.activate(work.workId));assert.equal((await rows(f.s,'topics')).length,1);
});

test('TOPIC-04 new identity stays externally closed despite allowed parent and shared Entry',async()=>{
 const f=await promotionFixture();await f.s.foundationWrite(t=>t.put('meta',{id:key('topic','default',f.parent.id),kind:'topic',version:1,profileId:'default',topicId:f.parent.id,decision:'allowed',layoutGeneration:1}));const grants=(await rows(f.s,'meta')).filter(r=>r.id.startsWith('memory:'));const {result}=await promote(f);const current=(await rows(f.s,'meta')).filter(r=>r.id.startsWith('memory:')),topics=new Map((await rows(f.s,'topics')).map(t=>[t.id,t]));assert.deepEqual(current,grants);const access=policy(current,'default',{},topics);assert.equal(access.decision(f.parent.id),'allowed');assert.equal(access.decision(result.id),'default');
});

test('TOPIC-04 generated Section exclusion and source-erased Section are rejected before assessment',async()=>{
 for(const change of ['excluded','erased']){
  const f=await promotionFixture(),source=(await rows(f.s,'records'))[0];await f.s.foundationWrite(async t=>{const p=await t.get('topics',f.parent.id),section=await t.get('sections',JSON.stringify([p.id,p.activeLayoutGeneration,f.section.sectionId]));section.sourceRecordIds=[source.id];section.protections.title={locked:false};section.title='Generated Source-dependent heading';await t.put('sections',section);});
  if(change==='excluded')await f.s.excludeLibrary(f.scope[0].inputId,true);else{await admitPreGatePurgeFixture(f.s,source.id);await f.s.drainPurgeCleanup();}
  let calls=0;f.service=promotionService(f,view=>{calls++;return decide(view);});await assert.rejects(f.service.prepare(request(f)));assert.equal(calls,0);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 }
});

test('TOPIC-04 Source purge removes completed source-dependent history without restoring erased content through replay or undo',async()=>{
 const f=await promotionFixture(),{result,workId}=await promote(f),source=(await rows(f.s,'records'))[0],before=await snapshot(f.s);await assert.rejects(f.s.permanentDelete(source.id),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(f.s),before);await admitPreGatePurgeFixture(f.s,source.id);await f.s.drainPurgeCleanup();const purged=await snapshot(f.s);await assert.rejects(f.service.activate(workId));await assert.rejects(restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()}));assert.deepEqual(await snapshot(f.s),purged);assert.equal((await rows(f.s,'records')).length,0);assert.equal((await f.s.topic(result.id)).name,'Independent synthetic planning');
});
