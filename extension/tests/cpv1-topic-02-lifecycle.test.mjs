import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,op,rows,raw,topic} from './harness/topic-02.mjs';
import {TopicLifecycleService} from '../core/topic-lifecycle.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {key,policy,profileDefault,validateMemoryRow} from '../core/memory/model.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';

test('TOPIC-02 dormancy and reactivation keep the exact ID, body, layout, human fields and grants across restart',async()=>{
 const f=await fixture(),a=await topic(f.s,'Human name'),entry=await f.s.createEntry({actor:'user',body:'One independently authored body',type:'idea',formation:'explicit',evidence:[],operationId:op()});await f.s.placeEntry({entryId:entry.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:(await f.s.topic(a.id)).organizationRevision,operationId:op()});const row=await raw(f.s,'topics',a.id),before=await Promise.all(['thoughts','placements','sections'].map(name=>rows(f.s,name))),auth=(await rows(f.s,'meta')).filter(r=>/context|memory|passport/i.test(r.id));
 const service=new TopicLifecycleService(f.s,f.serviceOptions),request={id:a.id,to:'dormant',expectedRevision:row.revision,operationId:op(),scope:f.scope},dormant=await service.change(request);assert.equal(dormant.id,a.id);assert.equal(dormant.lifecycle,'dormant');assert.equal((await f.s.libraryIndexPage()).items.length,0);
 await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),restart=new TopicLifecycleService(s,f.serviceOptions);assert.deepEqual(await restart.change(request),dormant);const active=await restart.change({id:a.id,to:'active',expectedRevision:dormant.revision,operationId:op(),scope:f.scope});assert.equal(active.id,a.id);assert.equal((await s.topic(a.id)).name,row.name);assert.deepEqual((await s.topic(a.id)).protections,row.protections);assert.equal((await s.topic(a.id)).activeLayoutGeneration,row.activeLayoutGeneration);assert.deepEqual(await Promise.all(['thoughts','placements','sections'].map(name=>rows(s,name))),before);assert.deepEqual((await rows(s,'meta')).filter(r=>/context|memory|passport/i.test(r.id)),auth);assert.equal((await rows(s,'topics')).length,1);
});
test('TOPIC-02 pin, keep, restored lifecycle, removed and redirected identities reject automatic transitions',async()=>{
 for(const protection of ['pin','keep','lifecycle','removed','redirect']){
  const f=await fixture(),a=await topic(f.s),b=await topic(f.s,'Destination');
  if(protection==='removed')await f.s.removeTopic({id:a.id,expectedRevision:0,operationId:op()});else await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);if(protection==='pin')row.pinKey=0;else if(protection==='redirect'){row.redirectTo=b.id;row.lifecycle='merged';}else row.protections[protection]={locked:true,reason:'user_edit'};await t.put('topics',row);});
  const before=await rows(f.s,'topics');await assert.rejects(new TopicLifecycleService(f.s,f.serviceOptions).change({id:a.id,to:'dormant',expectedRevision:(await raw(f.s,'topics',a.id)).revision,operationId:op(),scope:f.scope}));assert.deepEqual(await rows(f.s,'topics'),before);
 }
});
test('TOPIC-02 lifecycle stale CAS, preflight authority race and failed journal leave old usable state',async()=>{
 const f=await fixture(),a=await topic(f.s),service=new TopicLifecycleService(f.s,f.serviceOptions),request={id:a.id,to:'dormant',expectedRevision:1,operationId:op(),scope:f.scope};assert.deepEqual(await service.change(request),{conflict:true});
 const original=f.s.operation.bind(f.s);f.s.operation=async(...args)=>{await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));return original(...args);};await assert.rejects(service.change({...request,expectedRevision:0,operationId:op()}));assert.equal((await f.s.topic(a.id)).lifecycle,'active');f.s.operation=original;
 const write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{if(name==='revisions'&&row.reason==='activity')throw Error('synthetic journal failure');return put(name,row,...rest);};return fn(t);});await assert.rejects(service.change({...request,expectedRevision:0,operationId:op()}));f.s.foundationWrite=write;assert.equal((await f.s.topic(a.id)).lifecycle,'active');assert.equal((await f.s.topic(a.id)).revision,0);
});
test('TOPIC-02 allowed Inputs cannot authorize a denied Topic lifecycle mutation',async()=>{
 const f=await fixture(),a=await topic(f.s),before=await rows(f.s,'topics'),service=new TopicLifecycleService(f.s,{resolveProcessing:async(_t,r)=>({allowed:!r.topicIds.includes(a.id),epoch:'unchanged-fixture-epoch',inputIds:[...r.inputIds],topicIds:[...r.topicIds]})});await assert.rejects(service.change({id:a.id,to:'dormant',expectedRevision:0,operationId:op(),scope:f.scope}));assert.deepEqual(await rows(f.s,'topics'),before);
});

async function restrictedActivity(){
 const f=await fixture(),a=await topic(f.s,'Synthetic restricted activity'),b=await topic(f.s,'Synthetic allowed activity');
 let entry=await f.s.createEntry({actor:'user',body:'One synthetic shared body',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 for(const owner of [a,b]){await f.s.placeEntry({entryId:entry.id,topicId:owner.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(owner.id)).organizationRevision,operationId:op()});entry=await f.s.entry(entry.id);}
 const memory=new MemoryService(f.s);await memory.ready();
 const allowed={id:key('topic','default',b.id),kind:'topic',version:1,profileId:'default',topicId:b.id,decision:'allowed',layoutGeneration:1};assert.equal(validateMemoryRow(allowed),true);await f.s.foundationWrite(t=>t.put('meta',allowed));
 return {...f,a,b,entry,memory,service:new TopicLifecycleService(f.s,f.serviceOptions)};
}
const activitySnapshot=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['topics','thoughts','sections','placements','revisions','operationReceipts','meta'].map(async name=>[name,await t.all(name)]))));
const activityRequest=async f=>({id:f.a.id,to:'dormant',expectedRevision:(await f.s.topic(f.a.id)).revision,operationId:op(),scope:f.scope});
const activityAccess=f=>f.s.repository.transaction(false,async t=>{const topics=new Map((await t.all('topics')).map(row=>[row.id,row])),state=await f.memory.state(t);return {paths:(await f.memory.permittedPaths(t,f.entry.id,topics,policy(state.rows,'default',{},topics))).map(path=>path.topic.id),rules:state.rows};});
for(const restriction of ['denied','never','section','other_profile_never'])test('TOPIC-02 dormancy preserves effective access under '+restriction,async()=>{
 const f=await restrictedActivity();
 if(restriction==='section')await f.memory.exclude({topicId:f.a.id,sectionId:f.a.sectionId,excluded:true});
 else{const profileId=restriction==='other_profile_never'?'retained':'default';if(profileId!=='default')await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'Synthetic retained profile'}));await f.memory.authorize({topicIds:[f.a.id],profileId,decision:restriction==='other_profile_never'?'never':restriction});}
 const before=await activitySnapshot(f),access=await activityAccess(f);assert.equal(access.paths.length,0);
 await assert.rejects(f.service.change(await activityRequest(f)),{code:'MEMORY_DENIED'});
 assert.deepEqual(await activitySnapshot(f),before);assert.deepEqual(await activityAccess(f),access);
});
test('TOPIC-02 default-off activity remains valid and only the permission owner can clear a veto',async()=>{
 const f=await restrictedActivity();await f.memory.authorize({topicIds:[f.a.id],decision:'denied'});const request=await activityRequest(f);
 await assert.rejects(f.service.change(request),{code:'MEMORY_DENIED'});await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const before=await activityAccess(f);
 const result=await f.service.change(request);assert.equal(result.lifecycle,'dormant');assert.deepEqual((await activityAccess(f)).paths,[f.b.id]);assert.deepEqual((await activityAccess(f)).rules,before.rules);
 const active=await f.service.change({...request,to:'active',expectedRevision:result.revision,operationId:op()});assert.equal(active.id,f.a.id);assert.deepEqual((await activityAccess(f)).rules,before.rules);
});
test('TOPIC-02 actual replace restore restores the current restriction before an unchanged lifecycle request',async()=>{
 const f=await restrictedActivity();await f.memory.authorize({topicIds:[f.a.id],decision:'denied'});const items=await exported(new FixtureBackup(f.s,{appVersion:'0.16.0'}));
 await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const request=await activityRequest(f),backup=new BackupService(f.s),staged=await prepared(backup,items),preview=await backup.previewRestore({sessionId:staged.sessionId,mode:'replace'});
 await backup.restore({sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});const before=await activitySnapshot(f),access=await activityAccess(f);assert.equal(access.paths.length,0);
 await assert.rejects(f.service.change(request),{code:'MEMORY_DENIED'});assert.deepEqual(await activitySnapshot(f),before);assert.deepEqual(await activityAccess(f),access);
});
test('TOPIC-02 unrelated Topic and empty Section restrictions do not block safe activity',async()=>{
 const f=await restrictedActivity(),other=await topic(f.s,'Unrelated restricted Topic'),empty=await f.s.createSection({topicId:f.a.id,title:'Empty excluded section',expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op()});
 await f.memory.authorize({topicIds:[other.id],decision:'denied'});await f.memory.exclude({topicId:f.a.id,sectionId:empty.sectionId,excluded:true});const before=await activityAccess(f);assert.deepEqual(before.paths,[f.b.id]);
 const result=await f.service.change(await activityRequest(f));assert.equal(result.lifecycle,'dormant');assert.deepEqual(await activityAccess(f),before);assert.equal((await f.s.entry(f.entry.id)).body,'One synthetic shared body');
});
