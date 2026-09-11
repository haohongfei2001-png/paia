import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {aiPresentationStatus} from '../core/organizer/ai-presentation.js';

const op=()=>crypto.randomUUID();

async function seedTopic(){
  const {s,storage,indexedDB}=await setup(LibraryDocumentsStore);
  const topic=await s.createTopic({name:'Synthetic long-lived topic',operationId:op()});
  const entry=await s.createEntry({actor:'user',operationId:op(),body:'Synthetic long-lived thought',title:'Synthetic legacy title',type:'idea',formation:'explicit',evidence:[]});
  const currentEntry=await s.entry(entry.id),currentTopic=await s.topic(topic.id);
  await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:currentEntry.revision,expectedTopicRevision:currentTopic.organizationRevision,operationId:op()});
  await s.drainLibraryMaintenance();
  // Complete the current library-document bootstrap before introducing legacy damage.
  const page=await s.libraryIndexPage();
  assert.ok(page.items.some(item=>item.id===topic.id));
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
  },['topics']);
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
});

test('durable Topic can survive while disappearing from the compound byIndex after legacy metadata loss',async()=>{
  const {s,storage,indexedDB,topic}=await seedTopic();

  await rewriteTopic(s,topic.id,row=>{delete row.negativeUpdatedSequence;});
  const durable=await rawTopic(s,topic.id);
  assert.equal(durable.id,topic.id);

  const indexedKeys=await s.repository.transaction(false,t=>t.keys('topics','byIndex'),['topics']);
  assert.ok(!indexedKeys.includes(topic.id),'compound IndexedDB index omits a row with an incomplete index key');

  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  assert.ok(await rawTopic(reopened,topic.id),'cold reopen must not be confused with durable deletion');
  const index=await reopened.libraryIndexPage();
  assert.ok(!index.items.some(item=>item.id===topic.id),'current Home listing cannot see the durable Topic through byIndex');
});

test('legacy Topic with missing activeLayoutGeneration remains indexed but breaks document and AI-status reads on cold reopen',async()=>{
  const {s,storage,indexedDB,topic}=await seedTopic();

  await rewriteTopic(s,topic.id,row=>{delete row.activeLayoutGeneration;});
  assert.ok(await rawTopic(s,topic.id));
  const indexedKeys=await s.repository.transaction(false,t=>t.keys('topics','byIndex'),['topics']);
  assert.ok(indexedKeys.includes(topic.id),'activeLayoutGeneration is not part of byIndex, so the Topic remains index-visible');

  const reopened=new LibraryDocumentsStore(storage,{indexedDB});
  const index=await reopened.libraryIndexPage();
  assert.ok(index.items.some(item=>item.id===topic.id));

  const invalidIndexedKey=error=>error?.code==='STORAGE_FAILED'&&error?.dbCategory==='invalid_key_or_index_value';
  await assert.rejects(()=>reopened.topicDocumentPage({topicId:topic.id}),invalidIndexedKey);
  await assert.rejects(()=>aiPresentationStatus(reopened),invalidIndexedKey);
});
