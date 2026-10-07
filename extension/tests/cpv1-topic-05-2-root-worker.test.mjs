import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
test('TOPIC-05.2 actual worker admits exact trusted fragment pages and keeps read/consent/Context fences',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},sessionValues={};let listener,network=0,notifications=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.14.0'}),getURL:path=>origin+path,sendMessage:async()=>{notifications++;},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(sessionValues)}};globalThis.fetch=async()=>{network++;throw Error('unexpected network');};await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={},sender=ui)=>{const result=await send({type,...fields},sender);assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
 for(const type of ['GET_LIBRARY_ROOT_PROJECTION','GET_LIBRARY_SECTION_PROJECTION'])assert.equal((await send({type})).error,'CONSENT_REQUIRED');await rpc('CONSENT',{accepted:true});await rpc('GET_LIBRARY_FOUNDATION_STATUS');
 const topic=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC worker Topic',operationId:crypto.randomUUID()}}),fragment={id,url:ui.url+'#paia-thought?topic='+encodeURIComponent(topic.id)};
 assert.equal((await rpc('GET_LIBRARY_ROOT_PROJECTION',{},fragment)).items[0].id,topic.id);assert.equal((await rpc('GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:topic.id}},fragment)).topic.id,topic.id);
 const before=notifications;for(let n=0;n<3;n++)await rpc('GET_LIBRARY_ROOT_PROJECTION',{},fragment);assert.equal(notifications,before,'read-only projection cannot broadcast mutation');
 for(const sender of [{id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',url:fragment.url},{id,url:'https://example.com/ui/archive.html#paia-thought?topic=a'},{id,url:origin+'ui/prompt-surface.html#paia-thought?topic=a'},{id,url:ui.url+'?query=x#paia-thought?topic=a'},{id,url:origin+'ui/../ui/archive.html#paia-thought?topic=a'},{id,url:{}},{}])assert.equal((await send({type:'GET_LIBRARY_ROOT_PROJECTION'},sender)).error,'FORBIDDEN');
 const context=await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT',{},fragment);assert.equal(context.access.global.enabled,false);assert.equal(context.items.length,0);for(const type of ['PAIA_CONTEXT_MANUAL','PAIA_MEMORY_BUILD','PAIA_BACKUP_BEGIN_EXPORT'])assert.equal((await send({type},fragment)).error,'FEATURE_UNAVAILABLE');assert.equal(network,0);
});
