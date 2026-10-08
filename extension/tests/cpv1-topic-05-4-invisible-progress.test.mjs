import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture} from './harness/original-complete.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {TopicController} from '../ui/topic-workspace.js';
const op=()=>crypto.randomUUID();
async function maskedFixture({count=245,manual=false}={}){
 const {s}=await completeFixture({texts:['SYNTHETIC generated Section backing Input']}),input=(await s.snapshot()).library.blocks[0],topic=await s.createTopic({name:'SYNTHETIC protected Topic',operationId:op()}),sectionIds=[];
 for(let i=0;i<count;i++)sectionIds.push((await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC generated Section '+i,operationId:op()})).sectionId);
 await s.foundationWrite(async t=>{const live=await t.get('topics',topic.id);for(const id of sectionIds){if(manual&&id===sectionIds[0])continue;const row=await t.get('sections',JSON.stringify([topic.id,live.activeLayoutGeneration,id]));row.protections.title={locked:false};row.sourceRecordIds=[input.sourceRecordId];await t.put('sections',row);}});
 const tail=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC human tail',operationId:op()}),entry=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC lawful independent prose',operationId:op()});
 await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:tail.sectionId,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedPlacementRevision:(await s.libraryPlacement(topic.id,entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 await s.excludeLibrary(input.id,true);const reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),calls=[];
 const load=async options=>{calls.push(structuredClone(options));return reading.page(options);};
 const make=options=>{const reader=new ContinuousTopicReader({load,...options});reader.reset({topicId:topic.id});return reader;};
 return {s,topic,id:entry.id,sectionIds,reading,load,calls,make};
}
test('TOPIC-05.4 more than200 source-masked Sections do not stop initial reading before the later eligible Entry',async()=>{
 const f=await maskedFixture();try{const first=await f.reading.page({topicId:f.topic.id});assert.equal(first.items.length,0);assert.equal(first.sections.length,100);assert.equal(first.sections.filter(row=>!row.isDefault&&row.title).length,0);assert.ok(first.nextCursor);
  const reader=f.make();const state=await reader.initial();assert.equal(f.calls.length,3);assert.deepEqual(state.items.map(item=>item.entry.id),[f.id]);assert.equal(state.terminalNext,true);assert.equal(state.errorNext,null);assert.equal(state.continuationNext,false);assert.equal(reader.sections.get(f.sectionIds[0]).title,'');assert.equal(reader.items[0].entry.body,'SYNTHETIC lawful independent prose');
 }finally{await f.s.repository.close();}
});
test('TOPIC-05.4 visible human empty headings remain meaningful progress during bounded loading',async()=>{
 const f=await maskedFixture({manual:true});try{const reader=f.make();await reader.initial();assert.equal(f.calls.length,1);assert.equal(reader.items.length,0);assert.equal(reader.sections.get(f.sectionIds[0]).title,'SYNTHETIC generated Section 0');assert.equal(reader.terminalNext,false);assert.equal(reader.continuationNext,false);await reader.next();assert.equal(reader.items.at(-1).entry.id,f.id);}finally{await f.s.repository.close();}
});
test('TOPIC-05.4 invisible progress respects its finite budget and exposes explicit continuation without a false terminal result',async()=>{
 const f=await maskedFixture();try{const reader=f.make({maxEmptyLoads:2});await reader.initial();assert.equal(f.calls.length,2);assert.equal(reader.items.length,0);assert.equal(reader.terminalNext,false);assert.equal(reader.continuationNext,true);assert.ok(reader.nextCursor);assert.equal(reader.errorNext,null);
  const previous={document:globalThis.document,scrollY:globalThis.scrollY},nodes=new Map();globalThis.scrollY=0;globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,dataset:{},textContent:''});return nodes.get(id);}};
  const owner=Object.assign(Object.create(TopicController.prototype),{id:f.topic.id,view:'original',originalMode:'content',serial:1,topicReader:reader,topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,renderTopicReader:async()=>owner.updateTopicContinuous()});
  try{owner.updateTopicContinuous();assert.equal(nodes.get('topic-continuous-after-retry').hidden,false);assert.equal(nodes.get('topic-continuous-after-retry').textContent,'继续载入');assert.equal(nodes.get('topic-continuous-after').dataset.terminal,'false');await owner.loadTopicContinuous('next',{explicit:false});assert.equal(f.calls.length,2,'automatic intersection callbacks cannot run past the budget');await owner.loadTopicContinuous('next');assert.equal(reader.items[0].entry.id,f.id);assert.equal(reader.terminalNext,true);assert.equal(reader.continuationNext,false);}finally{Object.assign(globalThis,previous);clearTimeout(owner.topicContinuousTimer);}
 }finally{await f.s.repository.close();}
});
test('TOPIC-05.4 failure during invisible continuation keeps its exact cursor for retry and never discards a protected body',async()=>{
 const f=await maskedFixture();try{let failed=true;const reader=f.make({load:async options=>{if(options.cursor&&failed){failed=false;throw Error('SYNTHETIC_CONTINUATION_FAILURE');}return f.load(options);}});await reader.initial();assert.match(reader.errorNext.message,/SYNTHETIC_CONTINUATION_FAILURE/);assert.equal(reader.terminalNext,false);const cursor=reader.nextCursor;assert.ok(cursor);await reader.next();assert.equal(f.calls[1].cursor,cursor);assert.equal(reader.items[0].entry.id,f.id);
  const pin=reader.items[0],pins=new Set([pin.entry.id]);reader.pins=()=>pins;await reader.previous();assert.equal(reader.items.find(item=>item.entry.id===pin.entry.id).entry.body,pin.entry.body);assert.ok(reader.state().retainedBodies<=120);
 }finally{await f.s.repository.close();}
});
test('TOPIC-05.4 repeated invisible cursors cannot create an unbounded loop or a false end',async()=>{
 let calls=0;const reader=new ContinuousTopicReader({maxEmptyLoads:3,load:async()=>{calls++;return {items:[],sections:[],nextCursor:'same-opaque-cursor',coverage:{activeGeneration:'g'}};}});reader.reset({topicId:'topic'});await reader.initial();assert.equal(calls,3);assert.equal(reader.continuationNext,true);assert.equal(reader.terminalNext,false);assert.equal(reader.nextCursor,'same-opaque-cursor');
});
