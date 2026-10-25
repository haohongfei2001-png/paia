import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';

test('actual service worker creates original Store-bound insertion owner and routes authenticated receiver proof',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin='chrome-extension://'+id+'/',url='https://chatgpt.com/c/synthetic-worker-insertion',nonce='44444444-4444-4444-8444-444444444444',values={},sessions={};let listener,physical=0,qualified=0,last=null;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 const top={id,tab:{id:5,windowId:3},frameId:0,documentId:'synthetic-real-top-document',documentLifecycle:'active',url},ui={id,url:origin+'ui/prompt-reuse-test.html',frameId:0,documentId:'synthetic-original-extension-page',documentLifecycle:'active'};
 const send=(request,sender=ui)=>new Promise(resolve=>listener(request,sender,resolve));
 const rpc=async(request,sender=ui)=>{const response=await send(request,sender);assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.55.9'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>{listener=fn;}},onInstalled:{addListener(){}}},storage:{local:storage(values),session:storage(sessions)},windows:{get:async()=>({focused:true,incognito:false})},tabs:{get:async()=>({id:5,windowId:3,url,active:true,incognito:false}),update:async()=>{},query:async()=>[],sendMessage:async(tabId,message,target)=>{
  if(message.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){const registration=await rpc({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce,recoveryToken:message.recoveryToken},top);assert.equal(registration.receiver.documentId,top.documentId);return {version:1,nonce};}
  if(message.type!=='PAIA_PROMPT_INSERT_SELECTED')return {};
  physical++;last=structuredClone(message);assert.equal(tabId,5);assert.deepEqual(target,{documentId:top.documentId});assert.notEqual(message.insertionReceipt.receiver.documentId,ui.documentId);
  assert.equal((await rpc({type:'PAIA_PROMPT_INSERTION_QUALIFY',version:1,envelope:message.insertionReceipt},top)).qualified,true);qualified++;
  return {status:'inserted',verified:true,insertionAck:{version:1,envelope:message.insertionReceipt,outcome:'inserted'}};
 }}};
 toolbarRegistrationFixture(chrome);await import('../background/service-worker.js');
 await rpc({type:'CONSENT',accepted:true},{...ui,url:origin+'ui/archive.html'});const created=await rpc({type:'PAIA_PROMPT_CHANGE',change:{action:'create',revision:0,text:'SYNTHETIC worker expression'}});
 const prepared=await rpc({type:'PAIA_PROMPT_INSERT_PREPARE',id:created.id,text:'SYNTHETIC worker expression',tabId:5,url});assert.equal(physical,0);
 const request={type:'PAIA_PROMPT_INSERT',id:created.id,text:prepared.text,tabId:5,url,operationId:prepared.insertionAction.operationId,insertionAction:prepared.insertionAction};assert.equal((await rpc(request)).status,'inserted');assert.equal(physical,1);assert.equal(qualified,1);
 const forged=await send({type:'PAIA_PROMPT_INSERTION_ACK',ack:{version:1,envelope:last.insertionReceipt,outcome:'inserted'}},{...top,frameId:2,documentId:ui.documentId});assert.equal(forged.ok,false);assert.equal(physical,1);
 const exact=await rpc({type:'PAIA_PROMPT_INSERTION_ACK',ack:{version:1,envelope:last.insertionReceipt,outcome:'inserted'}},top);assert.equal(exact.settled,true);assert.equal(physical,1);
 const registration=await rpc({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce},top),batch={type:'PAIA_PROMPT_INSERTION_RECONCILE',version:1,ownerToken:registration.ownerToken,recoveryToken:registration.recoveryToken,acks:[{version:1,envelope:last.insertionReceipt,outcome:'inserted'}]};const recovered=await rpc(batch,top);assert.equal(recovered.results.length,1);assert.equal(recovered.results[0].claimId,last.insertionReceipt.claimId);assert.equal(recovered.results[0].settled,true);assert.equal((await send(batch,{...top,frameId:2,documentId:ui.documentId})).ok,false);assert.equal(physical,1);
});
