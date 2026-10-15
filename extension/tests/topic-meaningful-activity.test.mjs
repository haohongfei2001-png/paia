import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {prepareTopicRootActivity} from '../core/organizer/topic-root-activity.js';

// Root ranking is a metadata projection. These assertions intentionally retain
// the existing no-canonical-body-read boundary while exercising real writers.
test('TL-PT1-UI1.2 Root ranks the complete set by acknowledged human expression before paging',async()=>{
 let at='2020-01-01T00:00:00.000Z';
 const {s}=await setup(OrganizerStore,{clock:()=>at});await s.finishFoundation();
 const a=await s.createTopic({name:'SYNTHETIC A',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC B',operationId:crypto.randomUUID()});
 const [older,newer]=[a,b].sort((x,y)=>x.id.localeCompare(y.id));
 await s.continueThinking({operationId:crypto.randomUUID(),topicId:older.id,body:'SYNTHETIC older human expression'});
 at='2021-01-01T00:00:00.000Z';
 await s.continueThinking({operationId:crypto.randomUUID(),topicId:newer.id,body:'SYNTHETIC latest human expression'});
 await prepareTopicRootActivity(s);
 const original=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,stores)=>{assert.equal(write,false);return original(write,t=>{const get=t.get.bind(t);t.get=(table,...args)=>{assert.notEqual(table,'thoughts','Root must use qualified metadata, not scan Thought bodies');assert.notEqual(table,'blocks','Root must not scan Input bodies');return get(table,...args);};return fn(t);},stores);};
 try{
  const m=new ThoughtLibraryReadModel(s),first=await m.rootPage({limit:1});
  assert.equal(first.items[0].id,newer.id,'latest activity must rank first even when it is beyond the first identity page');
  const second=await m.rootPage({limit:1,cursor:first.nextCursor});assert.equal(second.items[0].id,older.id);assert.equal(second.complete,true);
 }finally{s.repository.transaction=original;}
});

test('TL-PT1-UI1.2 complete-set preparation is bounded and does not publish partial ordering',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const m=new ThoughtLibraryReadModel(s),ids=[];
 for(let i=0;i<41;i++)ids.push((await s.createTopic({name:'SYNTHETIC '+i,operationId:crypto.randomUUID()})).id);
 await prepareTopicRootActivity(s);const pending=await m.rootPage({limit:50});assert.equal(pending.indexing,true);assert.deepEqual(pending.items,[]);assert.equal(pending.complete,false);
 await prepareTopicRootActivity(s);const ready=await m.rootPage({limit:50});assert.equal(ready.complete,true);assert.deepEqual(ready.items.map(x=>x.id),ids.sort());
});

test('TL-PT1-UI1.2 human body edits outrank expression while metadata and AI clocks cannot',async()=>{
 let at='2020-01-01T00:00:00.000Z';const {s}=await setup(OrganizerStore,{clock:()=>at});await s.finishFoundation();const m=new ThoughtLibraryReadModel(s);
 const a=await s.createTopic({name:'SYNTHETIC A',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC B',operationId:crypto.randomUUID()});
 const old=await s.continueThinking({operationId:crypto.randomUUID(),topicId:a.id,body:'SYNTHETIC early'});
 at='2021-01-01T00:00:00.000Z';await s.continueThinking({operationId:crypto.randomUUID(),topicId:b.id,body:'SYNTHETIC later'});
 await prepareTopicRootActivity(s);assert.equal((await m.rootPage()).items[0].id,b.id);
 at='2022-01-01T00:00:00.000Z';await s.editEntry({id:old.id,expectedRevision:(await s.entry(old.id)).revision,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC substantive acknowledged edit'}});
 await prepareTopicRootActivity(s);assert.equal((await m.rootPage()).items[0].id,a.id);
 at='2023-01-01T00:00:00.000Z';await s.renameTopic({id:b.id,expectedRevision:(await s.topic(b.id)).revision,name:'SYNTHETIC renamed only',operationId:crypto.randomUUID()});
 await prepareTopicRootActivity(s);assert.equal((await m.rootPage()).items[0].id,a.id);
});

test('TL-PT1-UI1.2 large retained edit history resumes without clipping a qualified human event',async()=>{
 let now=Date.parse('2025-01-01T00:00:00.000Z');const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});await s.finishFoundation();const m=new ThoughtLibraryReadModel(s),a=await s.createTopic({name:'SYNTHETIC retained proof',operationId:crypto.randomUUID()});
 const e=await s.continueThinking({operationId:crypto.randomUUID(),topicId:a.id,body:'SYNTHETIC before'});now+=60000;
 await s.editEntry({id:e.id,expectedRevision:(await s.entry(e.id)).revision,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC real latest human body'}});const expected=new Date(now).toISOString();
 for(let i=0;i<105;i++){now+=60000;await s.editEntry({id:e.id,expectedRevision:(await s.entry(e.id)).revision,operationId:crypto.randomUUID(),changes:i%2?{title:'SYNTHETIC title '+i}:{note:'SYNTHETIC note '+i}});}
 let reads=0;const original=s.repository.transaction.bind(s.repository);s.repository.transaction=(write,fn,stores)=>original(write,t=>{const range=t.rangePage.bind(t);t.rangePage=async(table,...args)=>{const page=await range(table,...args);if(table==='revisions')reads+=page.rows.length;return page;};return fn(t);},stores);
 try{
  await prepareTopicRootActivity(s);assert.equal(reads,100,'one build shares 100 revision rows across placements');assert.equal((await m.rootPage()).indexing,true);
  const partial=await original(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.ok(partial.activityProof?.cursor);assert.equal(partial.indexed,0);
  reads=0;await prepareTopicRootActivity(s);assert.ok(reads<=100);assert.equal((await m.rootPage()).complete,true);
  const complete=await original(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.equal(complete.activityAt,expected);assert.equal(complete.activityProof,null);
 }finally{s.repository.transaction=original;}
});

test('TL-PT1-UI1.2 old Input uses original expression time and unknown arrival cannot become fresh',async()=>{
 let at='2025-01-01T00:00:00.000Z';const {s}=await setup(OrganizerStore,{clock:()=>at});await s.finishFoundation();const m=new ThoughtLibraryReadModel(s);
 const a=await s.createTopic({name:'SYNTHETIC imported old',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC actual local',operationId:crypto.randomUUID()}),input=(await s.snapshot()).library.blocks[0];
 await s.foundationWrite(async t=>{const r=await t.get('records',input.sourceRecordId);r.value.sourceSentAt='2001-01-01T00:00:00.000Z';await t.put('records',r);});
 await s.addToTopics({operationId:crypto.randomUUID(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]});
 await s.continueThinking({operationId:crypto.randomUUID(),topicId:b.id,body:'SYNTHETIC actual recent'});
 await prepareTopicRootActivity(s);assert.equal((await m.rootPage()).items[0].id,b.id);
 let meta=await s.repository.transaction(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.equal(meta.activityAt,'2001-01-01T00:00:00.000Z');
 at='2026-01-01T00:00:00.000Z';await s.foundationWrite(async t=>{const r=await t.get('records',input.sourceRecordId);r.value.sourceSentAt=null;await t.put('records',r);});
 await prepareTopicRootActivity(s);meta=await s.repository.transaction(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.equal(meta.activityAt,null);assert.equal((await m.rootPage()).items[0].id,b.id);
});

test('TL-PT1-UI1.2 v6 derived metadata is rebuilt without trusting old clocks or mutating canonical content',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const m=new ThoughtLibraryReadModel(s),a=await s.createTopic({name:'SYNTHETIC upgrade',operationId:crypto.randomUUID()});
 await s.continueThinking({operationId:crypto.randomUUID(),topicId:a.id,body:'SYNTHETIC expression'});await prepareTopicRootActivity(s);
 const original=await s.repository.transaction(false,async t=>({topic:await t.get('topics',a.id),entries:await t.all('thoughts')}));
 await s.repository.transaction(true,async t=>{const meta=await t.get('meta','thought-read-index:v1:topic:'+a.id);meta.version=6;meta.activityAt='9999-01-01T00:00:00.000Z';await t.put('meta',meta);});
 // A new process uses the same durable owner data; ephemeral snapshots do not
 // make a legacy projection authoritative.
 const {prepareTopicRootActivity:prepareFresh}=await import('../core/organizer/topic-root-activity.js?upgrade');await prepareFresh(s);
 const meta=await s.repository.transaction(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.equal(meta.version,7);assert.notEqual(meta.activityAt,'9999-01-01T00:00:00.000Z');
 assert.deepEqual(await s.repository.transaction(false,async t=>({topic:await t.get('topics',a.id),entries:await t.all('thoughts')})),original);
 assert.equal((await m.rootPage()).items[0].id,a.id);
});

 test('TL-PT1-UI1.2 shared Input human edit uses the real acknowledged journal',async()=>{
 let at='2025-01-01T00:00:00.000Z';const {s}=await setup(OrganizerStore,{clock:()=>at});await s.finishFoundation();const m=new ThoughtLibraryReadModel(s);
 const a=await s.createTopic({name:'SYNTHETIC shared',operationId:crypto.randomUUID()}),input=(await s.snapshot()).library.blocks[0];
 await s.addToTopics({operationId:crypto.randomUUID(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]});
 at='2025-02-01T00:00:00.000Z';const b=await s.input(input.id);
 await s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'SYNTHETIC human shared edit',note:b.note,excluded:b.excluded}]});
 await s.drainInvalidations();await prepareTopicRootActivity(s);
 const meta=await s.repository.transaction(false,t=>t.get('meta','thought-read-index:v1:topic:'+a.id));assert.equal(meta.activityAt,at);assert.equal((await m.rootPage()).items[0].id,a.id);
 });
