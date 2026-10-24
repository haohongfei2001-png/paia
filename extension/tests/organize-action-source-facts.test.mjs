// Native-clock successor: old public Date simulations are explicit source-replacement
// refusals here. Actual first-deadline/later-action timing is separately proven in
// organize-action-native-deadline.test.mjs with real elapsed time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import * as original from '../background/organize-action-source.js';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic source facts',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic selected body',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=original.createOrganizeActionSource(s,api),scope=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});
 const repository=s.repository,database=repository.db;t.after(()=>{source.dispose();database.close();});return {s,repository,database,source,scope,action,sender,api};
}
for(const property of ['repository','db'])test('original action rejects a same-value '+property+' accessor without evaluating it',{timeout:10000},async t=>{
 const f=await fixture(t),target=property==='repository'?f.s:f.repository,d=Object.getOwnPropertyDescriptor(target,property);let getters=0;
 Object.defineProperty(target,property,{configurable:true,enumerable:d.enumerable,get(){getters++;return d.value;}});
 try{assert.equal(await f.source.current(f.action,f.sender),false);assert.equal(getters,0);}finally{Object.defineProperty(target,property,d);}
 assert.equal(await f.source.current(f.action,f.sender),false,'an observed invalid original action never revives');
});
test('a substituted public action clock is rejected before it can replace the repository',{timeout:10000},async t=>{
 const f=await fixture(t),d=Object.getOwnPropertyDescriptor(f.s,'repository'),now=Date.now;let calls=0,getters=0;
 Date.now=()=>{if(++calls===2)Object.defineProperty(f.s,'repository',{configurable:true,enumerable:d.enumerable,get(){getters++;return d.value;}});return now();};
 try{assert.equal(await f.source.current(f.action,f.sender),false);assert.equal(calls,0);assert.equal(getters,0);}finally{Date.now=now;Object.defineProperty(f.s,'repository',d);}
 assert.equal(await f.source.current(f.action,f.sender),false);
});
test('original action pins complete data descriptors and cannot revive after a witnessed change',{timeout:10000},async t=>{
 const f=await fixture(t),d=Object.getOwnPropertyDescriptor(f.s,'repository');
 Object.defineProperty(f.s,'repository',{...d,writable:!d.writable});
 try{assert.equal(await f.source.current(f.action,f.sender),false);}finally{Object.defineProperty(f.s,'repository',d);}
 assert.equal(await f.source.current(f.action,f.sender),false);
});

test('a substituted public GET clock cannot run a revocation callback or mint a ticket',{timeout:10000},async t=>{
 const f=await fixture(t);f.source.release(f.action);const now=Date.now,contexts=f.api.runtime.getContexts;let contextCalls=0,armed=false,revocations=0;
 f.api.runtime.getContexts=async function(...args){const value=await Reflect.apply(contexts,this,args);if(++contextCalls===2)armed=true;return value;};
 Date.now=()=>{if(armed){armed=false;revocations++;f.source.invalidate();}return now();};
 try{await assert.rejects(f.source.select(f.sender,{topicId:f.scope.topicId}));assert.equal(contextCalls,0);assert.equal(revocations,0);}finally{Date.now=now;f.api.runtime.getContexts=contexts;}
});

test('private source checks reject DTO, action copies and a different Store without user getters',{timeout:10000},async t=>{
 const f=await fixture(t);assert.equal(original.requireOriginalOrganizeActionSource(f.source,f.s),f.source);
 assert.equal(original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s),true);
 assert.equal(original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s),true);
 let getters=0;const fake={get current(){getters++;throw Error('Unselected');}};
 assert.throws(()=>original.requireOriginalOrganizeActionSource(fake,f.s));assert.throws(()=>original.requireOriginalOrganizeActionSource(f.source,{...f.s}));
 for(const check of [original.assertOriginalOrganizeActionCurrent,original.assertOriginalOrganizeActionFacts]){assert.throws(()=>check({...f.source},f.action,f.s));assert.throws(()=>check(f.source,{...f.action},f.s));assert.throws(()=>check(f.source,f.action,{...f.s}));}
 assert.equal(getters,0);
});

test('pure action facts cannot invoke replaceable wall or monotonic clock callbacks',{timeout:10000},async t=>{
 const f=await fixture(t),now=Date.now,p=Object.getOwnPropertyDescriptor(performance,'now');let calls=0;
 original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s);
 Date.now=()=>{calls++;throw Error('Unexpected wall callback');};Object.defineProperty(performance,'now',{configurable:true,value:()=>{calls++;throw Error('Unexpected monotonic callback');}});
 try{assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));assert.equal(calls,0);}finally{Date.now=now;if(p)Object.defineProperty(performance,'now',p);else delete performance.now;}
});

test('after sampling, revoke, release and dispose are all synchronously visible to pure facts',{timeout:10000},async t=>{
 for(const kind of ['invalidate','release','dispose']){const f=await fixture(t);original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s);if(kind==='release')f.source.release(f.action);else f.source[kind]();assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}
});

test('an expiry-simulating public clock replacement permanently retires the action without supplying time',{timeout:10000},async t=>{
 const f=await fixture(t),now=Date.now,tick=now();Date.now=()=>tick+30001;
 try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));}finally{Date.now=now;}
 assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));
});

test('a last sampling callback cannot leave a same action valid after source retirement',{timeout:10000},async t=>{
 const f=await fixture(t),now=Date.now;Date.now=()=>{f.source.invalidate();return now();};
 try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));}finally{Date.now=now;}
 assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
async function withProof(f,callback){return f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.scope.topicId,f.source,f.action);let grant;try{grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);return await callback({tx,proof,grant});}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));}
for(const property of ['repository','db'])test('original Filter selection rejects a late '+property+' accessor before evaluation',{timeout:10000},async t=>{
 const f=await fixture(t),admission=await withProof(f,({tx,proof,grant})=>original.captureOriginalOrganizeFilterSelection(f.source,f.action,f.s,tx,proof,grant)),target=property==='repository'?f.s:f.repository,d=Object.getOwnPropertyDescriptor(target,property);let getters=0;
 assert.deepEqual(original.readOriginalOrganizeFilterSelection(admission,f.s).inputIds,[]);
 Object.defineProperty(target,property,{configurable:true,enumerable:d.enumerable,get(){getters++;return d.value;}});
 try{assert.throws(()=>original.readOriginalOrganizeFilterSelection(admission,f.s));assert.equal(getters,0);}finally{Object.defineProperty(target,property,d);}
 assert.throws(()=>original.readOriginalOrganizeFilterSelection(admission,f.s));
});

test('a failed pure facts tail marks denied without dispatching abort listeners; release still notifies once',{timeout:10000},async t=>{
 const f=await fixture(t),intent=await withProof(f,({tx,proof})=>original.readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof));let callbacks=0;intent.signal.addEventListener('abort',()=>callbacks++);
 const d=Object.getOwnPropertyDescriptor(f.s,'repository');Object.defineProperty(f.s,'repository',{...d,writable:!d.writable});
 try{assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));assert.equal(callbacks,0);assert.equal(intent.signal.aborted,false);}finally{Object.defineProperty(f.s,'repository',d);}
 assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));assert.equal(callbacks,0);
 f.source.release(f.action);assert.equal(callbacks,1);assert.equal(intent.signal.aborted,true);f.source.release(f.action);assert.equal(callbacks,1);
});

test('pure facts rejects a near-deadline public clock replacement without treating it as native time',{timeout:10000},async t=>{
 const f=await fixture(t),intent=await withProof(f,({tx,proof})=>original.readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof)),now=Date.now;let publicClockCalls=0;Date.now=()=>{publicClockCalls++;return intent.expiresAt-25;};
 try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}finally{Date.now=now;}
 assert.equal(publicClockCalls,0);assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));
});


test('an action denied for public clock replacement cannot be revived by another current call',{timeout:10000},async t=>{
 const f=await fixture(t),intent=await withProof(f,({tx,proof})=>original.readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof)),now=Date.now;let publicClockCalls=0;Date.now=()=>{publicClockCalls++;return intent.expiresAt-25;};
 try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));}finally{Date.now=now;}
 assert.equal(publicClockCalls,0);assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('a different live action cannot revive an older action after public clock replacement',{timeout:10000},async t=>{
 const f=await fixture(t);await new Promise(resolve=>setTimeout(resolve,70));
 const scope2=await f.source.select(f.sender,{topicId:f.scope.topicId}),action2=await f.source.consume(f.sender,{topicId:f.scope.topicId,scopeBinding:scope2.scopeBinding,userActionId:crypto.randomUUID()}),intent=await withProof(f,({tx,proof})=>original.readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof)),intent2=await withProof({...f,action:action2},({tx,proof})=>original.readOriginalOrganizeAction(f.source,action2,f.s,tx,proof)),now=Date.now;assert.ok(intent2.expiresAt-intent.expiresAt>=50,'the second action has its own later real first deadline');let publicClockCalls=0;Date.now=()=>{publicClockCalls++;return intent.expiresAt-25;};
 try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,action2,f.s));assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}finally{Date.now=now;f.source.release(action2);}
 assert.equal(publicClockCalls,0);assert.throws(()=>original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});
