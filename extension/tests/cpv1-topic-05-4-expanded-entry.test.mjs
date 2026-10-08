import test from 'node:test';
import assert from 'node:assert/strict';
import {inputEdit} from './harness/thought-m1.mjs';
import {completeFixture} from './harness/original-complete.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';
import {TopicController} from '../ui/topic-workspace.js';
import {TopicTimelinePositions} from '../ui/topic-timeline-window.js';
const op=()=>crypto.randomUUID(),largeBody='中文'.repeat(28000);
async function fixture({query='',count=1,generated=false,inputBound=false}={}){
 const {s}=await completeFixture({texts:generated?['SYNTHETIC source for saved AI work']:inputBound?[largeBody]:[]});let topic,created;const input=generated||inputBound?(await s.snapshot()).library.blocks[0]:null;
 if(generated){
  await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();
  topic=await s.repository.transaction(false,async t=>(await t.all('topics'))[0]);created=await s.repository.transaction(false,async t=>(await t.all('thoughts'))[0]);
  // Seed preexisting large saved AI prose. Keep its actual untouched AI
  // authorship/protections and source links; never weaken purge admission.
  await s.foundationWrite(async t=>{const row=await t.get('thoughts',created.id);row.thoughtText=largeBody;row.revision++;row.contentRevision++;row.fieldRevisions.body++;await t.put('thoughts',row);});
 }else{topic=await s.createTopic({name:'SYNTHETIC expansion',operationId:op()});created=inputBound?await s.addToTopics({kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id],operationId:op()}):await s.continueThinking({topicId:topic.id,body:largeBody,operationId:op()});}
 if(count>1)await s.foundationWrite(async t=>{
  const live=await t.get('topics',topic.id),template=await t.get('thoughts',created.id),placement=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,created.id]));
  for(let i=1;i<count;i++){const id='synthetic-small-'+String(i).padStart(5,'0');await t.put('thoughts',{...structuredClone(template),id,thoughtText:'中文 small '+i});await t.put('placements',{...structuredClone(placement),id:JSON.stringify([topic.id,live.activeLayoutGeneration,id]),entryId:id,rank:String(Number(placement.rank)+i*1024).padStart(12,'0')});}
  live.organizationRevision++;await t.put('topics',live);
 });
 const model=new ThoughtLibraryReadModel(s),reading=new ThoughtSectionReading(model),calls=[],fullReads=[];
 const load=async options=>{calls.push(structuredClone(options));const page=await reading.page(options);return {...page,items:page.items?.map(item=>({...item,entry:{...item.entry,recoveryEpoch:page.recoveryEpoch}}))};};
 const full=async id=>{fullReads.push(id);const epoch=await s.recoveryDraftEpoch(),row=await s.readingEntry(id);if(epoch!==await s.recoveryDraftEpoch())throw Error('BACKUP_CHANGED');return {...row,recoveryEpoch:epoch};};
 const make=()=>{const reader=new ContinuousTopicReader({load,loadEntry:full});reader.reset({topicId:topic.id,query});return reader;};
 return {s,topic,id:created.id,input,load,full,calls,fullReads,make};
}
async function expandThroughController(reader,item){
 let replacement,focused=false;const old={isConnected:true,replaceWith(node){replacement=node;}},owner=Object.assign(Object.create(TopicController.prototype),{id:reader.topicId,view:'original',originalMode:'content',readingSort:'asc',topicProviderKey:null,serial:1,topicReader:reader,contentPositions:new TopicTimelinePositions(),editor:{entry:{addRows(rows){assert.equal(rows[0].body,largeBody);}}},onStatus:message=>assert.fail(message),refresh:()=>assert.fail('unchanged expansion cannot require refresh'),entryNode(full){return {dataset:{entryId:full.entry.id},getBoundingClientRect:()=>({top:140,bottom:43350,height:43210}),querySelector:()=>({focus:()=>{focused=true;}})};}});
 owner.originalPane={querySelectorAll:selector=>selector==='[data-entry-id]'&&replacement?[replacement]:[]};
 await owner.loadLargeEntry(item,old);assert.ok(replacement);assert.equal(focused,true);assert.equal(replacement.dataset.sectionId,item.placement.sectionId);return owner;
}
for(const query of ['', '中文'])test('TOPIC-05.4 explicitly expanded '+(query?'qualified query':'ordinary')+' large Entry survives Settings snapshot and eviction without storing body bytes',async()=>{
 const f=await fixture({query,count:165});try{
  const reader=f.make();await reader.initial();const descriptor=reader.items.find(item=>item.entry.id===f.id);assert.equal(descriptor.entry.large,true);assert.equal(Object.hasOwn(descriptor.entry,'body'),false);
  const owner=await expandThroughController(reader,descriptor);assert.equal(reader.items[reader.index.get(f.id)].expanded,true);assert.equal(reader.items[reader.index.get(f.id)].entry.body,largeBody);
  owner.rememberContent();owner.restoreContent(f.topic.id);const settings=owner.contentResume;assert.doesNotMatch(JSON.stringify(settings),/中文中文中文/);assert.equal(settings.extent.find(item=>item.entry.id===f.id).expanded,true);
  const returned=f.make();assert.equal(returned.restore(settings),true);assert.equal(await returned.hydrateWindow(),true);assert.equal(returned.stale,false);assert.equal(returned.items[returned.index.get(f.id)].entry.body,largeBody);assert.equal(returned.items[returned.index.get(f.id)].entry.large,undefined);assert.equal(returned.measurements.get(f.id),43210);
  while(!reader.terminalNext)await reader.next();assert.equal(reader.items[reader.index.get(f.id)].unloaded,true);assert.equal(reader.items[reader.index.get(f.id)].expanded,true);assert.ok(reader.state().retainedBodies<=120);
  const reads=f.fullReads.length,evicted=f.make();assert.equal(evicted.restore(reader.snapshot()),true);await evicted.initial();assert.equal(f.fullReads.length,reads,'an off-window expansion remains body-free');assert.ok(evicted.layout().filter(part=>part.kind==='spacer').some(part=>part.height>=43210));evicted.moveWindowToStart();assert.equal(await evicted.hydrateWindow(),true);assert.equal(evicted.items[evicted.index.get(f.id)].entry.body,largeBody);assert.equal(f.fullReads.length,reads+1);assert.ok(evicted.state().retainedBodies<=120);
 }finally{await f.s.repository.close();}
});
for(const query of ['', '中文'])test('TOPIC-05.4 an unexpanded '+(query?'query':'ordinary')+' placeholder remains unexpanded on return',async()=>{
 const f=await fixture({query});try{const reader=f.make();await reader.initial();const restored=f.make();restored.restore(reader.snapshot({id:f.id,top:140}));assert.equal(await restored.hydrateWindow(),true);assert.equal(restored.items[0].entry.large,true);assert.equal(f.fullReads.length,0);assert.equal(Object.hasOwn(restored.items[0].entry,'body'),false);}finally{await f.s.repository.close();}
});
for(const query of ['', '中文'])for(const change of ['edit','remove','move','restore','binding-response','epoch-response','purge'])test(`TOPIC-05.4 ${query?'query':'ordinary'} expanded hydration rejects ${change} across the full-body await`,async()=>{
 const f=await fixture({query,generated:change==='purge'});try{
  const reader=f.make();await reader.initial();await reader.expandEntry(reader.items[0]);const restored=f.make();restored.restore(reader.snapshot({id:f.id,top:140}));
  restored.loadEntry=async id=>{const row=await f.full(id);
   if(change==='edit')await f.s.editLibraryFields({id,expectedRevision:row.revision,expectedFieldRevisions:row.fieldRevisions,changes:{body:'SYNTHETIC edited'},operationId:op()});
   if(change==='remove')await f.s.removeEntry({id,expectedRevision:row.revision,operationId:op()});
   if(change==='move'){const section=await f.s.createSection({topicId:f.topic.id,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,title:'SYNTHETIC moved',operationId:op()});await f.s.placeEntry({entryId:id,topicId:f.topic.id,sectionId:section.sectionId,expectedEntryRevision:row.revision,expectedPlacementRevision:(await f.s.libraryPlacement(f.topic.id,id)).revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});}
   if(change==='restore')await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restored'}));
   if(change==='purge')await f.s.permanentDelete(f.input.sourceRecordId);
   if(change==='binding-response')return {...row,bodyBinding:'input',workingInputId:'wrong-owner',bindingRevision:99,currentInputRevision:99};
   if(change==='epoch-response')return {...row,recoveryEpoch:'unrelated-epoch'};
   return row;
  };
  assert.equal(await restored.hydrateWindow(),false);assert.equal(restored.stale,true,JSON.stringify({code:restored.hydrationError?.code,message:restored.hydrationError?.message}));assert.equal(restored.pageMeta,null);assert.doesNotMatch(JSON.stringify(restored.items),/中文中文中文/);
 }finally{await f.s.repository.close();}
});
test('TOPIC-05.4 an interrupted expanded full-body read retries the same explicit expansion and respects newer scope',async()=>{
 const f=await fixture();try{const reader=f.make();await reader.initial();await reader.expandEntry(reader.items[0]);const saved=reader.snapshot({id:f.id,top:140}),restored=f.make();restored.restore(saved);restored.loadEntry=async()=>{throw Error('FULL_READ_FAILED');};assert.equal(await restored.hydrateWindow(),false);assert.match(restored.hydrationError.message,/FULL_READ_FAILED/);assert.equal(restored.items[0].expanded,true);assert.equal(restored.items[0].unloaded,true);restored.loadEntry=f.full;assert.equal(await restored.hydrateWindow(),true);assert.equal(restored.items[0].entry.body,largeBody);
  const held=f.make();held.restore(saved);let release,started;const ready=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);held.loadEntry=async id=>{const row=await f.full(id);started();await gate;return row;};const pending=held.hydrateWindow();await ready;held.reset({topicId:'other'});release();assert.equal(await pending,false);assert.deepEqual(held.items,[]);
 }finally{await f.s.repository.close();}
});
for(const query of ['', '中文'])test('TOPIC-05.4 expanded '+(query?'query':'ordinary')+' whole-Input binding restores only its captured current Input revision',async()=>{
 const f=await fixture({query,inputBound:true});try{const reader=f.make();await reader.initial();await reader.expandEntry(reader.items[0]);const snapshot=reader.snapshot({id:f.id,top:140}),returned=f.make();returned.restore(snapshot);assert.equal(await returned.hydrateWindow(),true);assert.equal(returned.items[0].entry.bodyBinding,'input');assert.equal(returned.items[0].entry.workingInputId,f.input.id);assert.equal(returned.items[0].entry.body,largeBody);
  const stale=f.make();stale.restore(snapshot);stale.loadEntry=async id=>{const prior=await f.full(id);await inputEdit(f.s,f.input.id,{libraryText:'中文 changed canonical Input'});return prior;};assert.equal(await stale.hydrateWindow(),false);assert.equal(stale.stale,true);assert.doesNotMatch(JSON.stringify(stale.items),/中文中文中文/);
 }finally{await f.s.repository.close();}
});
