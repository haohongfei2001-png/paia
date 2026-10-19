import test from 'node:test';
import assert from 'node:assert/strict';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
test('production worker installs original Filter authority and explicit session consent, default service remains unqualified',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html',frameId:0},values={},sessions={};let listener,network=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.55.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(sessions)}};globalThis.fetch=async()=>{network++;throw Error('unexpected network');};toolbarRegistrationFixture(chrome);await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={})=>{const r=await send({type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
 assert.equal((await send({type:'PAIA_AI_FILTER_STATUS'})).error,'CONSENT_REQUIRED');await rpc('CONSENT',{accepted:true});const before=await rpc('PAIA_AI_FILTER_STATUS');assert.equal(before.phase,'off');
 for(const sender of [{...ui,id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'},{...ui,url:'https://chatgpt.com/c/synthetic',tab:{id:1}},{...ui,url:origin+'ui/prompt-surface.html'},{...ui,frameId:1},{...ui,tab:{incognito:true}}])assert.equal((await send({type:'PAIA_AI_FILTER_STATUS'},sender)).error,'FORBIDDEN');
 const after=await rpc('PAIA_AI_FILTER_CONFIGURE',{optIn:true,remoteProcessing:true,expectedGeneration:before.generation,confirmed:true});assert.equal(after.phase,'awaiting_qualification');assert.equal(after.optIn,true);assert.equal(after.remoteProcessing,true);assert.equal((await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT',{mode:'home'})).access.global.enabled,false);
 assert.equal((await send({type:'PAIA_AI_FILTER_CONFIGURE',optIn:true,remoteProcessing:true,expectedGeneration:after.generation,confirmed:true,localPro:true})).error,'INVALID_REQUEST');assert.equal(network,0);
});
