import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,op,rows,raw,topic} from './harness/topic-02.mjs';
import {TopicLifecycleService} from '../core/topic-lifecycle.js';
import {OrganizerStore} from '../core/organizer/store.js';

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
