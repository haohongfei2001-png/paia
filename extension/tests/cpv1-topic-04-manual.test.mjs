import test from 'node:test';
import assert from 'node:assert/strict';
import {ManualSectionPromotionService} from '../core/topic-promotion-manual.js';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared as prepareBackup} from './harness/backup-v081.mjs';
import {local} from './harness/thought-m1.mjs';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {promotionFixture,promotionService,decide,request as aiRequest,rows,raw,op,topic,snapshot,inputEdit} from './harness/topic-04.mjs';

export async function manualFixture({count=2,mixed=false}={}){
 const f=await promotionFixture({count:mixed?1:0});
 for(let i=0;i<count;i++){const e=await f.s.createEntry({actor:'user',body:'Independent human body '+i,type:'idea',formation:'explicit',evidence:[],operationId:op()}),p=await f.s.topic(f.parent.id);await f.s.placeEntry({entryId:e.id,topicId:p.id,sectionId:f.section.sectionId,expectedEntryRevision:e.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.entryIds.push(e.id);}
 f.manual=new ManualSectionPromotionService(f.s);return f;
}
export const manualRequest=(f,extra={})=>({topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',name:'User selected independent object',operationId:op(),...extra});
export async function manualConfirmed(f,r=manualRequest(f)){const h=await f.manual.prepare(r),work=await f.manual.confirm(h,{confirmed:true});return {h,r,...work};}
export async function manualPromote(f,r=manualRequest(f)){const work=await manualConfirmed(f,r);while((await f.manual.stage(work.workId)).state!=='ready'){}return {...work,result:await f.manual.activate(work.workId)};}

for(const mixed of [false,true])test('TOPIC-04 explicit manual '+(mixed?'mixed':'all-authored')+' promotion remains available with AI processing off',async()=>{
 const f=await manualFixture({mixed}),before=await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(t=>rows(f.s,t))),entries=await rows(f.s,'thoughts');f.permission.allowed=false;await assert.rejects(f.service.prepare(aiRequest(f)));const {h,result}=await manualPromote(f);assert.equal(h.intentMode,'user_structural');assert.equal(h.semanticAssessment,false);assert.equal(result.intentMode,'user_structural');const created=await f.s.topic(result.id);assert.equal(created.createdBy,'user');assert.equal(created.identity.origin,'user');assert.equal(created.protections.name.locked,true);assert.deepEqual(created.sourceRecordIds,[]);assert.equal(result.entryIds.length,mixed?3:2);
 assert.deepEqual(await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(t=>rows(f.s,t))),before);for(const old of entries){const row=await raw(f.s,'thoughts',old.id);for(const key of ['thoughtText','origin','provenanceType','sourceRecordIds','inputRefs','bodyBinding'])assert.deepEqual(row[key],old[key]);}
 const undo=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()}),redo=await restoreSectionPromotion(f.s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal(redo.id,result.id);assert.equal((await f.s.topic(result.id)).identity.origin,'user');
});

test('TOPIC-04 manual names are exact protected human labels, including unusual and same-name identities',async()=>{
 for(const name of ['some ideas','  人工命名 / 任意 ★  ','Existing same name']){
  const f=await manualFixture();const other=await topic(f.s,name);const {result}=await manualPromote(f,manualRequest(f,{name}));assert.notEqual(result.id,other.id);assert.equal((await f.s.topic(result.id)).name,name);assert.equal((await f.s.topic(other.id)).name,name);assert.equal((await f.s.topic(result.id)).redirectTo,undefined);
 }
});

test('TOPIC-04 manual confirmation is opaque and cancellable; an assessor cannot impersonate the manual command',async()=>{
 const f=await manualFixture(),before=await snapshot(f.s),h=await f.manual.prepare(manualRequest(f));assert.deepEqual(await snapshot(f.s),before);await assert.rejects(f.manual.confirm({...h},{confirmed:true}));await assert.rejects(new ManualSectionPromotionService(f.s).confirm(h,{confirmed:true}));await assert.rejects(f.service.confirm(h,{confirmed:true}));f.manual.cancel(h);await assert.rejects(f.manual.confirm(h,{confirmed:true}));assert.deepEqual(await snapshot(f.s),before);
 const g=await promotionFixture();g.service=promotionService(g,view=>({...decide(view),manual:true,origin:'user'}));await assert.rejects(g.service.prepare(aiRequest(g)));assert.equal((await rows(g.s,'topics')).length,1);
 const work=await manualConfirmed(f);await f.manual.stage(work.workId);await assert.rejects(f.service.activate(work.workId));await f.manual.rollback(work.workId);assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
});

test('TOPIC-04 manual body CAS includes no note disclosure and preserves lawful later bodies through undo/redo',async()=>{
 const f=await manualFixture(),e=await f.s.entry(f.entryIds[0]);await f.s.editLibraryFields({id:e.id,expectedRevision:e.revision,expectedFieldRevisions:{note:e.fieldRevisions.note},changes:{note:'Private note must never appear in promotion material'},operationId:op()});const work=await manualConfirmed(f);assert.equal(JSON.stringify(work.h).includes('Private note'),false);assert.equal(JSON.stringify(await rows(f.s,'organizerWorkItems')).includes('Private note'),false);await f.manual.stage(work.workId);assert.equal(JSON.stringify(await rows(f.s,'organizerWorkItems')).includes('Independent human body'),false);
 const current=await f.s.entry(e.id);await f.s.editLibraryFields({id:e.id,expectedRevision:current.revision,expectedFieldRevisions:{body:current.fieldRevisions.body},changes:{body:'Later directly authored body'},operationId:op()});const before=await snapshot(f.s);await assert.rejects(f.manual.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);await f.manual.rollback(work.workId);
 const {result}=await manualPromote(f),next=await f.s.entry(e.id);await f.s.editLibraryFields({id:e.id,expectedRevision:next.revision,expectedFieldRevisions:{body:next.fieldRevisions.body},changes:{body:'Still newer human body'},operationId:op()});const undo=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()});await restoreSectionPromotion(f.s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal((await f.s.entry(e.id)).body,'Still newer human body');assert.equal((await f.s.entry(e.id)).note,'Private note must never appear in promotion material');
});

for(const change of ['owner','removed','source_excluded','key','restore_epoch','section','fixed'])test('TOPIC-04 manual confirmed selection refuses stale '+change,async()=>{
 const f=await manualFixture({mixed:true}),work=await manualConfirmed(f);await f.manual.stage(work.workId);
 if(change==='owner')await f.s.foundationWrite(async t=>{const e=await t.get('thoughts',f.entryIds.at(-1));e.origin='unknown';e.revision++;await t.put('thoughts',e);});
 else if(change==='removed'){const e=await f.s.entry(f.entryIds[0]);await f.s.removeEntry({id:e.id,expectedRevision:e.revision,operationId:op()});}
 else if(change==='source_excluded')await f.s.excludeLibrary(f.scope[0].inputId,true);
 else if(change==='section')await f.s.editSection({topicId:f.parent.id,sectionId:f.section.sectionId,expectedRevision:0,title:'Later title',operationId:op()});
 else if(change==='fixed'){const e=await f.s.entry(f.entryIds[0]);await f.s.fixMembershipSet({entryId:e.id,expectedRevision:e.revision,operationId:op()});}
 else await f.s.foundationWrite(t=>t.put('meta',{id:change==='key'?'thought-suppression-key':'recovery-restore-epoch',value:change==='key'?Array(32).fill(7):op()}));
 const before=await snapshot(f.s);await assert.rejects(f.manual.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);await f.manual.rollback(work.workId);
});

test('TOPIC-04 manual move keeps ambiguous retained authorship rather than relabeling it as a new independent Source',async()=>{
 const f=await manualFixture({count:1}),id=f.entryIds[0];await f.s.foundationWrite(async t=>{const row=await t.get('thoughts',id);row.origin='unknown';row.legacyHumanEvidence=true;await t.put('thoughts',row);});const before=await raw(f.s,'thoughts',id),{result}=await manualPromote(f),after=await raw(f.s,'thoughts',id);assert.equal(after.origin,before.origin);assert.equal(after.legacyHumanEvidence,true);assert.deepEqual(after.sourceRecordIds,[]);assert.equal(after.thoughtText,before.thoughtText);assert.equal(result.scope.length,0);
});

test('TOPIC-04 manual staging survives restart, middle failure rolls back, and real restore invalidates prepared work',async()=>{
 const f=await manualFixture({count:3}),work=await manualConfirmed(f);await f.manual.stage(work.workId,{limit:1});const before=await snapshot(f.s);await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});f.manual=new ManualSectionPromotionService(f.s);await f.manual.stage(work.workId);const write=f.s.foundationWrite.bind(f.s);let moved=0;f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{if(name==='placements'&&row.topicId!==f.parent.id&&++moved===2)throw Error('synthetic manual activation failure');return put(name,row,...rest);};return fn(t);});await assert.rejects(f.manual.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);f.s.foundationWrite=write;const result=await f.manual.activate(work.workId);assert.equal(result.entryIds.length,3);assert.deepEqual(await f.manual.activate(work.workId),result);
 const g=await manualFixture(),items=await exported(new FixtureBackup(g.s,{appVersion:'0.12.1'})),prepared=await manualConfirmed(g),backup=new BackupService(g.s),stage=await prepareBackup(backup,items),p=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:p.integrity,targetGeneration:p.targetGeneration,confirmReplace:true});await assert.rejects(g.manual.activate(prepared.workId));assert.equal((await rows(g.s,'organizerWorkItems')).length,0);
});

test('TOPIC-04 completed all-manual promotion round-trips through strict restore and keeps protected history',async()=>{
 const f=await manualFixture(),{result}=await manualPromote(f),items=await exported(new FixtureBackup(f.s,{appVersion:'0.12.1'})),backup=new BackupService(f.s),stage=await prepareBackup(backup,items),p=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(p.canRestore,true);await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:p.integrity,targetGeneration:p.targetGeneration,confirmReplace:true});const undo=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()}),redo=await restoreSectionPromotion(f.s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal(redo.id,result.id);assert.equal((await f.s.topic(result.id)).identity.origin,'user');for(const id of f.entryIds){const e=await f.s.entry(id);assert.equal(e.origin,'user');assert.deepEqual(e.sourceRecordIds,[]);assert.ok(e.organizationIntents.excluded.includes(f.parent.id));}
});

test('TOPIC-04 249-of-251 manual selection in a zero-Source zero-Input library never consults AI evidence',async()=>{
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const parent=await topic(s,'Entirely manually authored parent'),f={s,parent,section:{sectionId:parent.sectionId},entryIds:[],manual:new ManualSectionPromotionService(s)};
 for(let i=0;i<251;i++){const e=await s.createEntry({actor:'user',body:'Source-free authored body '+i,type:'idea',formation:'explicit',evidence:[],operationId:op()}),p=await s.topic(parent.id);await s.placeEntry({entryId:e.id,topicId:p.id,expectedEntryRevision:e.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.entryIds.push(e.id);}
 assert.equal((await rows(s,'records')).length,0);assert.equal((await rows(s,'inputStates')).length,0);let evidenceCalls=0;s.evidenceFor=()=>{evidenceCalls++;throw Error('A manual structural command must not ask an AI evidence adapter');};const before=(await rows(s,'thoughts')).map(e=>[e.id,e.thoughtText,e.origin,e.provenanceType]),work=await manualConfirmed(f,manualRequest(f,{selection:'explicit_entries',entryIds:f.entryIds.slice(0,249),name:'some ideas'}));assert.equal((await f.manual.stage(work.workId)).staged,100);assert.equal((await f.manual.stage(work.workId)).staged,200);assert.equal((await f.manual.stage(work.workId)).state,'ready');const result=await f.manual.activate(work.workId);assert.equal(result.entryIds.length,249);assert.deepEqual(result.scope,[]);assert.equal((await rows(s,'placements')).filter(p=>p.topicId===parent.id&&p.lifecycle==='active').length,2);
 const undo=await restoreSectionPromotion(s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()});await restoreSectionPromotion(s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal(evidenceCalls,0);assert.deepEqual((await rows(s,'thoughts')).map(e=>[e.id,e.thoughtText,e.origin,e.provenanceType]),before);assert.equal((await rows(s,'records')).length,0);assert.equal((await rows(s,'inputStates')).length,0);assert.equal((await s.topic(result.id)).name,'some ideas');
});
