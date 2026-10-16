import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {stageTopicYearWindow} from '../ui/topic-year-requalification.js';

// Use the actual producer, body limit, yearly cursor and canonical lifecycle.
// A large placeholder must not acquire a fabricated active default in the UI.
test('actual body-free large descriptor retains canonical lifecycle through annual window qualification',async()=>{
 const f=await setup(OrganizerStore);await f.s.finishFoundation();
 try{
  const s=f.s,op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC actual large annual stage',operationId:op()});
  s.clock=()=> '2023-01-01T12:00:00.000Z';
  const big=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC_LARGE_BODY '+ '长表达'.repeat(18000),operationId:op()});
  await s.continueThinking({topicId:topic.id,body:'SYNTHETIC short same year',operationId:op()});
  s.clock=()=> '2021-01-01T12:00:00.000Z';
  await s.continueThinking({topicId:topic.id,body:'SYNTHETIC older year',operationId:op()});
  const sectionId=(await s.libraryPlacement(topic.id,big.id)).sectionId,reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s));
  const reader=new ContinuousTopicReader({load:options=>reading.page(options)});
  reader.reset({topicId:topic.id,scopeSectionId:sectionId,sort:'desc',chronology:'expression'});
  await reader.initial();for(let i=0;i<20&&(reader.indexing||!reader.terminalNext);i++)await reader.next();
  assert.equal(reader.stale,false);assert.equal(reader.terminalNext,true);assert.equal(reader.items.length,2);assert.equal(reader.nextYear,2021);
  const canonical=await s.entry(big.id),descriptor=reader.items.find(item=>item.entry.id===big.id);
  assert.equal(canonical.lifecycle,'active');assert.equal(descriptor.entry.large,true);assert.equal(Object.hasOwn(descriptor.entry,'body'),false);
  assert.equal(descriptor.entry.lifecycle,canonical.lifecycle,'the original producer must carry its actual canonical qualification');
  const before=structuredClone(reader.items),staged=await stageTopicYearWindow({topicId:topic.id,sectionId,sort:'desc',recoveryEpoch:reader.recoveryEpoch,items:reader.items,openedYears:reader.openedYears,readPrepared:(options,current)=>reader.readPrepared(options,current)});
  assert.equal(staged.ok,true,staged.reason);assert.equal(staged.items.length,2);assert.equal(staged.nextYear,2021);
  const retained=staged.items.find(item=>item.entry.id===big.id);
  assert.equal(retained.entry.lifecycle,'active');assert.equal(retained.entry.large,true);assert.equal(Object.hasOwn(retained.entry,'body'),false,'qualification must not hydrate an unopened full body');
  assert.deepEqual(reader.items,before,'staging cannot replace or shrink the live reader');assert.deepEqual(reader.openedYears,[2023],'qualification does not implicitly open the older year');
  const ordinary=await reading.page({topicId:topic.id,scopeSectionId:sectionId,sort:'asc',query:'',limit:40});
  const ordinaryBig=ordinary.items.find(item=>item.entry.id===big.id);
  assert.equal(ordinaryBig.entry.large,true);assert.equal(ordinaryBig.entry.lifecycle,canonical.lifecycle);assert.equal(Object.hasOwn(ordinaryBig.entry,'body'),false);
 }finally{await f.s.repository.close();}
});

for(const change of ['remove','restore-epoch'])test('actual large placeholder cannot qualify after '+change,async()=>{
 const f=await setup(OrganizerStore);await f.s.finishFoundation();
 try{
  const s=f.s,op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC large refusal',operationId:op()});
  s.clock=()=> '2023-01-01T12:00:00.000Z';
  const big=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC_LARGE_BODY '+ '长表达'.repeat(18000),operationId:op()});
  const sectionId=(await s.libraryPlacement(topic.id,big.id)).sectionId,reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),reader=new ContinuousTopicReader({load:options=>reading.page(options)});
  reader.reset({topicId:topic.id,scopeSectionId:sectionId,sort:'desc',chronology:'expression'});await reader.initial();for(let i=0;i<20&&(reader.indexing||!reader.terminalNext);i++)await reader.next();
  assert.equal(reader.items.length,1);assert.equal(reader.items[0].entry.large,true);assert.equal(reader.items[0].entry.lifecycle,'active');
  const before=structuredClone(reader.items),epoch=reader.recoveryEpoch;
  if(change==='remove'){await s.removeEntry({id:big.id,expectedRevision:(await s.entry(big.id)).revision,operationId:op()});assert.equal((await s.entry(big.id)).lifecycle,'removed');}
  else await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC restored epoch'}));
  const result=await stageTopicYearWindow({topicId:topic.id,sectionId,sort:'desc',recoveryEpoch:epoch,items:reader.items,openedYears:reader.openedYears,readPrepared:(options,current)=>reader.readPrepared(options,current)});
  assert.equal(result.ok,false,'the new metadata field cannot replace fresh original eligibility');assert.deepEqual(reader.items,before);assert.equal(Object.hasOwn(reader.items[0].entry,'body'),false);
 }finally{await f.s.repository.close();}
});
