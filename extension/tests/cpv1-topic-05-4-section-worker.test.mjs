import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {FilterRunner} from '../core/filter-runner.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {topicRootURL} from '../core/topic-root-target.js';

test('TOPIC-05.4 actual worker fences local Section prose and keeps captured recovery identity',async()=>{
 const previous={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange,fetch:globalThis.fetch};
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},sessionValues={};let listener,network=0,notifications=0,wakes=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(key=>key in data).map(key=>[key,structuredClone(data[key])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async()=>{notifications++;},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(sessionValues)}};
 globalThis.fetch=async()=>{network++;throw Error('unexpected network');};
 // Observe dispatch scheduling without running unrelated background maintenance.
 // The real store, read service and worker message handler remain in use.
 const originals=[FilterRunner,SafetyRunner,LibraryRunner].map(Type=>[Type,Type.prototype.wake]);
 for(const [Type]of originals)Type.prototype.wake=async()=>{wakes++;};
 let store;const originalPage=ThoughtSectionReading.prototype.page,originalMetadata=ThoughtLibraryReadModel.prototype.topicReadingMetadata;
 try{
  await import('../background/service-worker.js');
  const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={},sender=ui)=>{const result=await send({type,...fields},sender);assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
  const request={type:'GET_LIBRARY_SECTION_READING',options:{topicId:'synthetic'}};
  const metadataRequest={type:'GET_LIBRARY_TOPIC_READING_METADATA',id:'synthetic'};
  assert.equal((await send(request)).error,'CONSENT_REQUIRED');
  assert.equal((await send(metadataRequest)).error,'CONSENT_REQUIRED');
  for(const sender of [{},{id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',url:ui.url},{id,url:'https://example.com/ui/archive.html'},{id,url:origin+'ui/archive.html?body=private'},{id,url:origin+'ui/archive.html#spoof'},{id,url:origin+'ui/prompt-surface.html'},{id,url:ui.url+'#paia-thought?topic=a&topic=b'},{id,url:'https://chatgpt.com/c/synthetic',frameId:0,tab:{incognito:false}}])for(const command of [request,metadataRequest])assert.equal((await send(command,sender)).error,'FORBIDDEN');
  await rpc('CONSENT',{accepted:true});await rpc('GET_LIBRARY_FOUNDATION_STATUS');
  const topic=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC Section reader',operationId:crypto.randomUUID()}}),body='SYNTHETIC exact prose\n\n第二段 👩🏽‍💻 é',entry=await rpc('CONTINUE_THINKING',{thought:{topicId:topic.id,body,operationId:crypto.randomUUID()}});
  const current=await rpc('GET_LIBRARY_TOPIC',{id:topic.id}),section=await rpc('CREATE_LIBRARY_SECTION',{section:{topicId:topic.id,expectedTopicRevision:current.organizationRevision,title:'SYNTHETIC empty named Section',operationId:crypto.randomUUID()}}),other=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC other identity',operationId:crypto.randomUUID()}});
  const fragment={id,url:topicRootURL(topic.id,section.sectionId,ui.url)},before={wakes,notifications};
  const page=await rpc('GET_LIBRARY_SECTION_READING',{options:{topicId:topic.id}},fragment);
  assert.equal(page.topic.id,topic.id);assert.equal(page.items.length,1);assert.equal(page.items[0].entry.id,entry.id);assert.equal(page.items[0].entry.body,body);assert.equal(page.items[0].entry.bodyBinding,'thought');assert.equal(page.sections.find(row=>row.sectionId===section.sectionId).title,'SYNTHETIC empty named Section');
  assert.equal(typeof page.recoveryEpoch,'string');assert.equal(page.topic.recoveryEpoch,page.recoveryEpoch);assert.ok(page.sections.every(row=>row.recoveryEpoch===page.recoveryEpoch));assert.ok(page.items.every(row=>row.entry.recoveryEpoch===page.recoveryEpoch));assert.deepEqual({wakes,notifications},before,'read dispatch cannot schedule maintenance or broadcast a mutation');
  const metadata=await rpc(metadataRequest.type,{id:topic.id},fragment),query=await rpc(request.type,{options:{topicId:topic.id,query:'第二段'}},fragment);
  assert.equal(metadata.id,topic.id);assert.equal(metadata.name,current.name);assert.equal(metadata.summary,current.summary);assert.equal(metadata.revision,current.revision);assert.equal(metadata.recoveryEpoch,page.recoveryEpoch);assert.equal(metadata.defaultSectionId,current.defaultSectionId);assert.equal(Object.hasOwn(metadata,'body'),false);
  assert.equal(query.kind,'section_reading');assert.equal(query.items[0].entry.body,body);assert.equal(query.items[0].entry.recoveryEpoch,query.recoveryEpoch);assert.equal(query.sections.length,1);assert.equal(query.sections[0].sectionId,topic.sectionId);assert.equal(Object.hasOwn(query,'overview'),false);assert.equal(Object.hasOwn(query.coverage,'activeCount'),false);assert.notEqual(query.coverage.activeGeneration,page.coverage.activeGeneration);assert.deepEqual({wakes,notifications},before);
  for(const malformed of [{id:topic.id,summary:'injected'},{id:topic.id,options:{}},{id:[]},{id:null},{}])assert.equal((await send({type:metadataRequest.type,...malformed})).error,'INVALID_REQUEST');
  assert.equal((await send({type:request.type,options:{topicId:topic.id,body:'injected'}})).error,'INVALID_REQUEST');assert.equal((await send({type:request.type,options:{topicId:topic.id},body:'injected'})).error,'INVALID_REQUEST');
  const crossed=await rpc(request.type,{options:{topicId:topic.id,sectionId:other.sectionId}});assert.equal(crossed.cursorInvalid,true);assert.equal(crossed.anchorUnavailable,true);assert.deepEqual(crossed.items,[]);
  const unsupported=await rpc(request.type,{options:{topicId:topic.id,query:'SYNTHETIC',view:'ai'}});assert.equal(unsupported.unsupported,true);assert.equal(unsupported.complete,false);assert.deepEqual(unsupported.items,[]);
  store=new OrganizerStore(chrome.storage.local);await store.status();await store.finishFoundation();
  // Rotate the existing restore fence immediately after the real read has
  // completed, before worker decoration. This is an epoch-race probe, not a
  // claim that the full Backup restore workflow was executed here.
  ThoughtSectionReading.prototype.page=async function(options){const result=await originalPage.call(this,options);await store.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-after-read'}));return result;};
  const raced=await rpc(request.type,{options:{topicId:topic.id}});assert.equal(raced.recoveryEpoch,page.recoveryEpoch);assert.equal(raced.items[0].entry.recoveryEpoch,page.recoveryEpoch,'old bodies retain their old recovery fence');
  ThoughtSectionReading.prototype.page=originalPage;
  const fresh=await rpc(request.type,{options:{topicId:topic.id}});assert.equal(fresh.recoveryEpoch,'synthetic-after-read');assert.equal(fresh.items[0].entry.recoveryEpoch,fresh.recoveryEpoch);
  const beforeMetadata=await rpc(metadataRequest.type,{id:topic.id});
  ThoughtLibraryReadModel.prototype.topicReadingMetadata=async function(options){const result=await originalMetadata.call(this,options);await store.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-after-metadata'}));return result;};
  const racedMetadata=await rpc(metadataRequest.type,{id:topic.id});assert.equal(racedMetadata.recoveryEpoch,beforeMetadata.recoveryEpoch,'metadata keeps its captured epoch');ThoughtLibraryReadModel.prototype.topicReadingMetadata=originalMetadata;
  const latestMetadata=await rpc(metadataRequest.type,{id:topic.id});assert.equal(latestMetadata.recoveryEpoch,'synthetic-after-metadata');
  const edited=await rpc('EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:latestMetadata.revision,changes:{name:'SYNTHETIC explicitly changed name'},operationId:crypto.randomUUID()}});assert.equal(edited.conflict,undefined);
  const conflict=await rpc('EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:latestMetadata.revision,changes:{summary:'SYNTHETIC stale summary'},operationId:crypto.randomUUID()}});assert.equal(conflict.conflict,true);
  const stale=await rpc(request.type,{options:{topicId:topic.id,anchorId:entry.id,expectedReadGeneration:page.coverage.activeGeneration}});assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[]);
  const context=await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT');assert.equal(context.access.global.enabled,false);for(const type of ['PAIA_CONTEXT_MANUAL','PAIA_MEMORY_BUILD','PAIA_BACKUP_BEGIN_EXPORT'])assert.equal((await send({type})).error,'FEATURE_UNAVAILABLE');assert.equal(network,0);
 }finally{
  ThoughtSectionReading.prototype.page=originalPage;ThoughtLibraryReadModel.prototype.topicReadingMetadata=originalMetadata;for(const [Type,wake]of originals)Type.prototype.wake=wake;await store?.repository.close();Object.assign(globalThis,previous);
 }
});
