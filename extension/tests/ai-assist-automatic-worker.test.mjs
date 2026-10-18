import test from 'node:test';
import assert from 'node:assert/strict';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ASSIST_AUTH_KEY} from '../background/assist-consent.js';
import {NEXT_AUTH_KEY} from '../background/prompt-next.js';
test('actual worker update callbacks preserve separately confirmed persistent automatic settings and keep service unqualified',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html',frameId:0},values={},sessions={},installed=[];let listener,network=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.55.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn},onInstalled:{addListener:fn=>installed.push(fn)}},storage:{local:storage(values),session:storage(sessions)}};globalThis.fetch=async()=>{network++;throw Error('unexpected network');};toolbarRegistrationFixture(chrome);await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={})=>{const r=await send({type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
 await rpc('CONSENT',{accepted:true});const initial=await rpc('PAIA_PROMPT_ASSIST_STATUS');assert.equal(initial.replyAccess,false);assert.equal(initial.remoteProcessing,false);assert.equal(initial.serviceAvailable,false);assert.equal((await rpc('PAIA_PROMPT_NEXT_STATUS')).enabled,false);
 await rpc('PAIA_PROMPT_ASSIST_CONFIGURE',{consentVersion:2,replyAccess:true,remoteProcessing:true,expectedGeneration:initial.generation});await rpc('PAIA_PROMPT_NEXT_CONFIGURE',{enabled:true});const before=structuredClone({assist:values[ASSIST_AUTH_KEY],next:values[NEXT_AUTH_KEY]});assert.equal(before.assist.version,2);assert.equal(before.next.version,2);assert.ok(installed.length>=2);
 for(const fn of installed)fn({reason:'update',previousVersion:'0.54.0'});await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual({assist:values[ASSIST_AUTH_KEY],next:values[NEXT_AUTH_KEY]},before);const after=await rpc('PAIA_PROMPT_ASSIST_STATUS');assert.equal(after.replyAccess,true);assert.equal(after.remoteProcessing,true);assert.equal(after.serviceAvailable,false);assert.equal((await rpc('PAIA_PROMPT_NEXT_STATUS')).enabled,true);assert.equal(network,0);
 assert.equal((await send({type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:true,remoteProcessing:true,expectedGeneration:after.generation})).error,'FORBIDDEN');
});
