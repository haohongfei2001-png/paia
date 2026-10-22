import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,denyOriginalOrganizeActionRequest,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic exact stop',operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 let held=null;
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){const gate=held;if(gate){held=null;gate.enter();await gate.promise;}return [{contextType:'TAB',documentId:'document',documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db.close();});
 const selection=async()=>{const selected=await source.select(sender,{topicId:topic.id});return {topicId:topic.id,scopeBinding:selected.scopeBinding,userActionId:crypto.randomUUID()};};
 const hold=()=>{let enter,release;const entered=new Promise(r=>enter=r),promise=new Promise(r=>release=r);held={enter,promise};return {entered,release};};
 return {s,sender,source,selection,hold};
}
test('an exact stop denies only the registered pending consume before its document await settles',{timeout:10000},async t=>{
 const f=await fixture(t),request=await f.selection(),gate=f.hold(),pending=f.source.consume(f.sender,request);pending.catch(()=>{});
 try{
  await Promise.race([gate.entered,pending.then(()=>{throw Error('consume completed before the held original document check');})]);
  assert.equal(denyOriginalOrganizeActionRequest(f.source,f.s,{...request,userActionId:crypto.randomUUID()}),false);
  assert.equal(denyOriginalOrganizeActionRequest(f.source,f.s,request),true);
  gate.release();await assert.rejects(pending);assert.equal(denyOriginalOrganizeActionRequest(f.source,f.s,request),false);
 }finally{gate.release();await pending.catch(()=>{});}
 const next=await f.selection(),action=await f.source.consume(f.sender,next);assert.equal(await f.source.current(action,f.sender),true);f.source.release(action);
});
test('stopping one original action preserves another live action from the same source and Topic',{timeout:10000},async t=>{
 const f=await fixture(t),first=await f.selection(),second=await f.selection(),a=await f.source.consume(f.sender,first),b=await f.source.consume(f.sender,second);
 assert.equal(denyOriginalOrganizeActionRequest(f.source,f.s,first),true);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,a,f.s));
 assert.equal(assertOriginalOrganizeActionFacts(f.source,b,f.s),true);assert.equal(await f.source.current(b,f.sender),true);
 f.source.release(a);f.source.release(b);
});
test('stop request accessors, copied source, and foreign Store cannot mint or deny authority',{timeout:10000},async t=>{
 const f=await fixture(t),request=await f.selection(),action=await f.source.consume(f.sender,request);let getters=0;
 const forged={...request};Object.defineProperty(forged,'scopeBinding',{enumerable:true,get(){getters++;return request.scopeBinding;}});
 assert.throws(()=>denyOriginalOrganizeActionRequest(f.source,f.s,forged));assert.equal(getters,0);
 assert.throws(()=>denyOriginalOrganizeActionRequest({...f.source},f.s,request));assert.throws(()=>denyOriginalOrganizeActionRequest(f.source,{...f.s},request));
 assert.equal(assertOriginalOrganizeActionFacts(f.source,action,f.s),true);f.source.release(action);
});
