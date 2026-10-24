import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts,readOriginalOrganizeAction,createOrganizeActionSource} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant,readOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
const nativeWall=Date.now,nativeTimeout=setTimeout,sleep=ms=>new Promise(resolve=>nativeTimeout(resolve,ms));
const event=()=>({addListener(){},removeListener(){}});
async function timedFixture(t){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic real native deadline',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic deadline material',type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};let authenticationAwaits=0;
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){authenticationAwaits++;await sleep(120);return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db?.close();});const firstGetStart=nativeWall(),selection=await source.select(sender,{topicId:topic.id}),selectedAt=nativeWall(),action=await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()}),consumedAt=nativeWall();
 const read=callback=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id,source,action);let grant;try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);return callback(null,grant,tx);}finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 return {s,source,topic,sender,action,read,firstGetStart,selectedAt,consumedAt,authenticationAwaits:()=>authenticationAwaits};
}

// Hold only the original source's notification timer; its actual 30-second
// native deadline still elapses. This distinguishes pure deadline refusal from
// an already-run timer's abort signal. No clock or production limit is mocked.
test('real native first deadline cannot be extended by current or a newer live action while notification is held',{timeout:45000},async t=>{
 let held=0;const scheduled=[];globalThis.setTimeout=function holdActionNotification(callback,ms,...args){if(new Error().stack?.split('\n')[2]?.includes('/background/organize-action-source.js:'))return nativeTimeout(()=>{held++;scheduled.push(()=>callback(...args));},ms);return nativeTimeout(callback,ms,...args);};
 let f,first,second=null;
 try{
  f=await timedFixture(t);await f.read((_reader,grant,tx)=>{first=readOrganizeProcessingGrant(grant,f.s,tx);});
  assert.ok(first.expiresAt-nativeWall()>29000,'the full original first deadline is actually exercised');assert.ok(f.selectedAt-f.firstGetStart>=200);assert.ok(f.consumedAt-f.firstGetStart>=400);assert.ok(first.expiresAt-f.firstGetStart<=30025,'the first GET deadline includes authentication await time');
  await sleep(2000);
  const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},selection=await f.source.select(sender,{topicId:f.topic.id});second=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
  const secondIntent=await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,second);try{return readOriginalOrganizeAction(f.source,second,f.s,tx,proof);}finally{releaseOriginalOrganizeScope(proof);}}));
  assert.ok(secondIntent.expiresAt-first.expiresAt>=1900);
  await sleep(first.expiresAt-nativeWall()-50);assert.equal(assertOriginalOrganizeActionCurrent(f.source,f.action,f.s),true);
  await sleep(90);assert.ok(nativeWall()>=first.expiresAt);assert.ok(held>=1);assert.equal(first.signal.aborted,false);
  assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));assert.equal(first.signal.aborted,false,'the pure rejection still dispatches no abort listener');assert.throws(()=>assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));
  assert.equal(assertOriginalOrganizeActionCurrent(f.source,second,f.s),true);assert.equal(assertOriginalOrganizeActionFacts(f.source,second,f.s),true);assert.ok(nativeWall()<secondIntent.expiresAt);t.diagnostic(JSON.stringify({firstGetStart:f.firstGetStart,selectedAt:f.selectedAt,consumedAt:f.consumedAt,firstExpiry:first.expiresAt,secondExpiry:secondIntent.expiresAt,checkedAt:nativeWall(),heldNotifications:held,authenticationAwaits:f.authenticationAwaits()}));
 }finally{globalThis.setTimeout=nativeTimeout;if(f&&second)f.source.release(second);if(f)f.source.release(f.action);}
});
