import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {aiPresentationStatus} from '../core/organizer/ai-presentation.js';

const op=()=>crypto.randomUUID();

async function resetCompatibilityMarker(store){
  await store.repository.transaction(true,t=>t.delete('meta','library-documents-compat-v2'),['meta']);
}

async function seedTopic(){
  const {s,storage,indexedDB}=await setup(LibraryDocumentsStore);
  const topic=await s.createTopic({name:'Synthetic long-lived topic',operationId:op()});
  const entry=await s.createEntry({actor:'user',operationId:op(),body:'Synthetic long-lived thought',title:'Synthetic legacy title',type:'idea',formation:'explicit',evidence:[]});
  const currentEntry=await s.entry(entry.id),currentTopic=await s.topic(topic.id);
  await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:currentEntry.revision,expectedTopicRevision:currentTopic.organizationRevision,operationId:op()});
  await s.drainLibraryMaintenance();
  const page=await s.libraryIndexPage();
  assert.ok(page.items.some(item=>item.id===topic.id));
  // The production upgrade starts without the new Round 2 marker. The current
  // fixture has already executed new code while seeding, so remove only that
  // synthetic marker before the cold reopen.
  await resetCompatibilityMarker(s);
  return {s,storage,indexedDB,topic,entry};
}

async function rawTopic(store,id){
  return store.repository.transaction(false,t=>t.get('topics',id),['topics']);
}

async function rewriteTopic(store,id,mutate){
  return store.repository.transaction(true,async t=>{
    const row=await t.get('topics',id);
    assert.ok(row,'synthetic Topic must still exist in the durable object store');
    mutate(row);
    await t.put('topics',row);
    await t.delete('meta','library-documents-compat-v2');
  },['topics','meta']);
}

test('v0.11.1 current-shaped Topic remains readable after a cold store reopen',async()=>{
  const {s,storage,indexedDB,topic,entry}=await seedTopic();
  assert.ok(await rawTopic(s,topic.id));

  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  const index=await reopened.libraryIndexPage();
  assert.ok(index.items.some(item=>item.id===topic.id));
  const document=await reopened.topicDocumentPage({topicId:topic.id});
  assert.equal(document.items[0].entry.id,entry.id);
  assert.equal(document.items[0].entry.body,'Synthetic long-lived thought');
  assert.deepEqual(await reopened.libraryCompatibilityStatus(),{
    complete:true,activeTopics:1,indexedActiveTopics:1,indexGap:0,repairedTopics:0,repairedIndexTopics:0,repairedGenerationTopics:0,repairedDefaultSections:0,unresolvedLayouts:0
  });
});

test('cold upgrade repairs durable Topic index metadata without changing identity, organization, Source or Input',async()=>{
  const {s,storage,indexedDB,topic}=await seedTopic();
  const before=await rawTopic(s,topic.id),beforeSnapshot=await s.snapshot();

  await rewriteTopic(s,topic.id,row=>{delete row.activeKey;delete row.pinKey;delete row.pinRank;delete row.negativeUpdatedSequence;});
  assert.ok(await rawTopic(s,topic.id));
  const indexedKeys=await s.repository.transaction(false,t=>t.keys('topics','byIndex'),['topics']);
  assert.ok(!indexedKeys.includes(topic.id),'legacy compound index can omit a durable Topic');

  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  const index=await reopened.libraryIndexPage();
  assert.ok(index.items.some(item=>item.id===topic.id),'cold compatibility pass must restore Home visibility');
  const after=await rawTopic(reopened,topic.id),afterSnapshot=await reopened.snapshot();
  assert.equal(after.id,before.id);
  assert.equal(after.name,before.name);
  assert.equal(after.revision,before.revision);
  assert.equal(after.organizationRevision,before.organizationRevision);
  assert.equal(after.activeKey,0);
  assert.ok(after.pinKey===0||after.pinKey===1);
  assert.match(after.pinRank,/^\d{12}$/);
  assert.equal(typeof after.negativeUpdatedSequence,'number');
  assert.deepEqual(afterSnapshot.records,beforeSnapshot.records);
  assert.deepEqual(afterSnapshot.library,beforeSnapshot.library);
  const status=await reopened.libraryCompatibilityStatus();
  assert.equal(status.indexGap,0);
  assert.equal(status.repairedIndexTopics,1);
});

test('cold upgrade infers generation 1 only when the matching active section proves it',async()=>{
  const {s,storage,indexedDB,topic,entry}=await seedTopic();

  await rewriteTopic(s,topic.id,row=>{delete row.activeLayoutGeneration;});
  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  const index=await reopened.libraryIndexPage();
  assert.ok(index.items.some(item=>item.id===topic.id));
  const repaired=await rawTopic(reopened,topic.id);
  assert.equal(repaired.activeLayoutGeneration,1);

  const document=await reopened.topicDocumentPage({topicId:topic.id});
  assert.equal(document.items[0].entry.id,entry.id);
  const ai=await aiPresentationStatus(reopened);
  assert.ok(ai.topics.some(item=>item.topicId===topic.id));
  const status=await reopened.libraryCompatibilityStatus();
  assert.equal(status.repairedGenerationTopics,1);
  assert.equal(status.unresolvedLayouts,0);
});

test('compatibility pass does not guess stale generation 1 when a later layoutSequence cannot be proven',async()=>{
  const {s,storage,indexedDB,topic}=await seedTopic();

  await rewriteTopic(s,topic.id,row=>{delete row.activeLayoutGeneration;row.layoutSequence=2;});
  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  const index=await reopened.libraryIndexPage();
  assert.ok(index.items.some(item=>item.id===topic.id),'index repair remains independent from unresolved layout recovery');
  const after=await rawTopic(reopened,topic.id);
  assert.equal(after.activeLayoutGeneration,undefined,'do not silently point a Topic at an older generation');
  const status=await reopened.libraryCompatibilityStatus();
  assert.equal(status.unresolvedLayouts,1);
  assert.equal(status.indexGap,0);
  await assert.rejects(()=>reopened.topicDocumentPage({topicId:topic.id}),error=>error?.code==='INVALID_REQUEST');
});
