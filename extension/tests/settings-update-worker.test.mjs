import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
test('actual Settings update-status worker admits only trusted Archive reads without mutation or activation',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},events=[];let listener,writes=0,reads=[],fail=false;
 const key='paia-consumer-update:v1',storage={setAccessLevel:async()=>{},get:async keys=>{reads.push(keys);if(fail&&keys===key)throw Error('synthetic private read failure');return keys===null?structuredClone(values):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,structuredClone(values[k])]));},set:async rows=>{writes++;Object.assign(values,structuredClone(rows));},remove:async()=>assert.fail('unexpected deletion'),getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async message=>events.push(message),requestUpdateCheck:()=>assert.fail('no update check'),reload:()=>assert.fail('no reload'),onMessage:{addListener:fn=>listener=fn}},storage:{local:storage,session:{...storage,get:async()=>({}),set:async()=>{}}}};globalThis.fetch=async()=>assert.fail('no network');await import('../background/service-worker.js');
 const send=(request={type:'PAIA_SETTINGS_UPDATE_STATUS'},sender=ui)=>new Promise(resolve=>listener(request,sender,resolve));
 assert.deepEqual(await send(),{ok:true,data:{version:'0.15.0',state:'unknown'}});await new Promise(resolve=>setImmediate(resolve));
 reads=[];events.length=0;const initialWrites=writes;values[key]={state:'available',fromVersion:'0.15.0',toVersion:'0.16.0',at:Date.now()-1000};const before=structuredClone(values);
 assert.equal((await send()).data.state,'available');assert.deepEqual(reads,[key]);
 for(const sender of [{id,url:origin+'ui/popup.html'},{id,url:ui.url,frameId:1},{id,url:ui.url,tab:{incognito:true}},{id,url:ui.url+'#spoof'},{id,url:ui.url+'?private=query'},{id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',url:ui.url},{id,url:'https://chatgpt.com/c/synthetic',frameId:0,tab:{id:1,url:'https://chatgpt.com/c/synthetic'}}])assert.equal((await send(undefined,sender)).error,'FORBIDDEN');
 assert.equal((await send({type:'PAIA_SETTINGS_UPDATE_STATUS',check:true})).error,'INVALID_REQUEST');
 assert.equal((await send(undefined,{...ui,url:ui.url+'#paia-thought?topic=synthetic-topic'})).ok,true,'canonical Root fragment retains existing admission');
 fail=true;assert.equal((await send()).error,'STORAGE_FAILED');fail=false;
 await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,initialWrites);assert.deepEqual(values,before);assert.deepEqual(events,[],'status read schedules no archive notification');
});
