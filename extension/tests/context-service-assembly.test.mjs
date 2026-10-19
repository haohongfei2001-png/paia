import test from 'node:test';
import assert from 'node:assert/strict';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {createMaintenanceRunner} from '../core/ai-usage/maintenance-runner.js';
test('default-null maintenance status is a pure unavailable observation, never a false empty backlog',async()=>{
 let touches=0;const store=new Proxy({}, {get(){touches++;throw Error('unqualified status must not read a store');}}),runner=createMaintenanceRunner(store,null);const before=touches;
 assert.deepEqual(runner.status(),{available:false,running:false,state:'UNOBSERVED',remainingWork:null,nextEligibilityAt:null});assert.equal(touches,before);assert.equal((await runner.wake()).state,'UNAVAILABLE');runner.dispose();assert.equal(runner.status().available,false);assert.equal(touches,before);
});
test('actual worker composes Context and Pro Filter owners while preserving default-deny permission boundaries',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html',frameId:0},values={},sessions={};let listener,network=0,native=0,permissions=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.55.0'}),getURL:path=>origin+path,sendMessage:async()=>{},connectNative(){native++;throw Error('not activated');},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(sessions)},permissions:{contains:async()=>{permissions++;return false;}}};globalThis.fetch=async()=>{network++;throw Error('unexpected network');};toolbarRegistrationFixture(chrome);await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={})=>{const r=await send({type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
 assert.equal((await send({type:'PAIA_CONTEXT_CONNECTIONS_STATUS'})).error,'CONSENT_REQUIRED');await rpc('CONSENT',{accepted:true});
 const snapshot=await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT',{mode:'home'});assert.equal(snapshot.capabilities.automatic,false);assert.equal(snapshot.capabilities.external,false);assert.equal(snapshot.connections,0);assert.equal(snapshot.maintenance.remainingWork,null);assert.equal(snapshot.connectionStatus.reason,'qualification_required');
 for(const type of ['PAIA_CONTEXT_CONNECTIONS_PAIR','PAIA_CONTEXT_CONNECTIONS_REPAIR'])assert.equal((await send({type,options:{expectedRevision:0,port:49215}})).error,'FEATURE_UNAVAILABLE');
 assert.equal((await send({type:'PAIA_CONTEXT_CONNECTIONS_PAIR',options:{expectedRevision:0,port:49215,accountId:'claimed'}})).error,'INVALID_REQUEST');
 const routes=[{type:'PAIA_CONTEXT_CONNECTIONS_STATUS'},{type:'PAIA_CONTEXT_CONNECTIONS_PAIR',options:{expectedRevision:0,port:49215}},{type:'PAIA_AI_FILTER_STATUS'}];
 for(const sender of [{...ui,id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'},{...ui,url:'https://chatgpt.com/c/synthetic',tab:{id:1}},{...ui,url:origin+'ui/prompt-surface.html'}])for(const request of routes)assert.equal((await send(request,sender)).error,'FORBIDDEN');
 const filter=await rpc('PAIA_AI_FILTER_STATUS');assert.equal(filter.phase,'off');const changed=await rpc('PAIA_AI_FILTER_CONFIGURE',{optIn:true,remoteProcessing:true,expectedGeneration:filter.generation,confirmed:true});assert.equal(changed.phase,'awaiting_qualification');assert.equal(changed.optIn,true);assert.equal(changed.remoteProcessing,true);assert.equal((await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT',{mode:'home'})).access.global.enabled,false);
 assert.equal((await send({type:'CONSENT',accepted:false})).error,'INVALID_REQUEST','original consent API is accept-only; no invented revoke route');assert.equal(native,0);assert.equal(network,0);assert.equal(permissions,0,'default-null qualification refuses before native permission lookup');
});
