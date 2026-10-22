import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {rows} from './harness/original-complete.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
import {captureOriginalOrganizePlan} from '../core/organizer/organize-plan-source.js';
const {AIUsageFoundation}=await import(process.env.PAIA_ORGANIZE_PLAN_BASELINE==='1'?'../core/ai-usage/foundation-plan-baseline.js':'../core/ai-usage/foundation.js');
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{authority=null}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic plan topic',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',body:'Synthetic plan selected body',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:'document',documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(s,api),scope=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});
 const ai=new AIUsageFoundation(s,{resolveAuthority:async(tx,r)=>{await authority?.({s,source,action,tx});return {allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}};}}),{items}=await ai.describe({keys:[JSON.stringify(['library_entry',entry.id])]});
 const request={type:'AI_ORGANIZE',intent:'explicit',items,coverage:items.map(i=>({key:i.key,facet:'organize',scope:topic.id})),contractVersion:'synthetic',routeVersion:'synthetic'};
 t.after(()=>{source.dispose();s.repository.db.close();});return {s,source,action,scope,ai,request};
}
async function counts(s){return {jobs:(await rows(s,'organizerJobs')).length,flights:(await rows(s,'meta')).filter(x=>x.id.startsWith('aiu:flight:')).length,receipts:(await rows(s,'organizerUsage')).length};}
test('original legal plan is reachable with the same explicit action and real Foundation owner',{timeout:10000},async t=>{
 const f=await fixture(t),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request),result=await f.ai.plan(f.request,cap);
 assert.equal(result.state,'PLANNED');assert.deepEqual(await counts(f.s),{jobs:1,flights:1,receipts:0});
});
test('authority await revocation refuses the original plan before any PLANNED job or flight',{timeout:10000},async t=>{
 let revoke=0;const f=await fixture(t,{authority:async({source})=>{if(!revoke++){await Promise.resolve();source.invalidate();}}}),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request);
 let result,error;try{result=await f.ai.plan(f.request,cap);}catch(e){error=e;}
 const actual=await counts(f.s);console.log(JSON.stringify({control:'authority-await-revoke',actual,result:result?.state,error:error?.code,revoke}));
 assert.ok(error,'the original revoked plan must reject');assert.deepEqual(actual,{jobs:0,flights:0,receipts:0});
});
test('last original flight write cannot commit after pure action retirement without abort notification',{timeout:10000},async t=>{
 const f=await fixture(t),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request),prototype=await f.s.run(()=>f.s.repository.transaction(false,t=>Object.getPrototypeOf(t.tx.objectStore('meta')))),descriptor=Object.getOwnPropertyDescriptor(prototype,'put'),repoDescriptor=Object.getOwnPropertyDescriptor(f.s,'repository');let marked=0;
 Object.defineProperty(prototype,'put',{...descriptor,value:function(...args){const result=Reflect.apply(descriptor.value,this,args);if(this.name==='meta'&&args[0]?.id?.startsWith('aiu:flight:')){marked++;Object.defineProperty(f.s,'repository',{...repoDescriptor,writable:!repoDescriptor.writable});try{assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}finally{Object.defineProperty(f.s,'repository',repoDescriptor);}}return result;}});
 let result,error;try{try{result=await f.ai.plan(f.request,cap);}catch(e){error=e;}}finally{Object.defineProperty(prototype,'put',descriptor);}
 const actual=await counts(f.s);console.log(JSON.stringify({control:'last-flight-puremark',actual,result:result?.state,error:error?.code,marked}));
 assert.equal(marked,1);assert.ok(error,'a pure-retired source cannot leave a committed original job');assert.deepEqual(actual,{jobs:0,flights:0,receipts:0});
});

import {beginOriginalOrganizePlan,releaseOriginalOrganizePlan} from '../core/organizer/organize-plan-source.js';
test('one original action cannot mint two plan capabilities, and copied caps give no invocation',{timeout:10000},async t=>{
 const f=await fixture(t),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request);
 assert.throws(()=>captureOriginalOrganizePlan(f.source,f.action,f.s,f.request));
 assert.throws(()=>beginOriginalOrganizePlan({...cap},f.s,f.request));
 assert.throws(()=>beginOriginalOrganizePlan(cap,{...f.s},f.request));
 beginOriginalOrganizePlan(cap,f.s,f.request);assert.throws(()=>beginOriginalOrganizePlan(cap,f.s,f.request));releaseOriginalOrganizePlan(cap);
 assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});
test('a request substitution consumes and rejects the same original plan cap',{timeout:10000},async t=>{
 const f=await fixture(t),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request);
 assert.throws(()=>beginOriginalOrganizePlan(cap,f.s,{...f.request,routeVersion:'changed'}));
 assert.throws(()=>beginOriginalOrganizePlan(cap,f.s,f.request));assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});
test('plan request accessors are rejected without invoking a getter',{timeout:10000},async t=>{
 const f=await fixture(t);let getters=0;const request={...f.request};Object.defineProperty(request,'type',{enumerable:true,get(){getters++;return 'AI_ORGANIZE';}});
 assert.throws(()=>captureOriginalOrganizePlan(f.source,f.action,f.s,request));assert.equal(getters,0);assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});
test('two concurrent plans cannot consume one private invocation while original authority is held',{timeout:10000},async t=>{
 let enter,release,held=true;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const f=await fixture(t,{authority:async()=>{if(held){held=false;enter();await gate;}}}),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request),first=f.ai.plan(f.request,cap);
 try{await Promise.race([entered,first.then(()=>{throw Error('plan ended before authority control');})]);await assert.rejects(f.ai.plan(f.request,cap));release();assert.equal((await first).state,'PLANNED');assert.deepEqual(await counts(f.s),{jobs:1,flights:1,receipts:0});}
 finally{release();await first.catch(()=>{});}
});
test('a cancelled action cannot plan after its original authority await returns late',{timeout:10000},async t=>{
 let enter,release,held=true;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const f=await fixture(t,{authority:async()=>{if(held){held=false;enter();await gate;}}}),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request),first=f.ai.plan(f.request,cap);first.catch(()=>{});
 try{await Promise.race([entered,first.then(()=>{throw Error('plan ended before authority control');})]);f.source.release(f.action);release();await assert.rejects(first);assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});}
 finally{release();await first.catch(()=>{});}
});
test('a real but unselected Input cannot be added to an explicit Topic plan',{timeout:10000},async t=>{
 const f=await fixture(t),collected=await f.ai.collect({limit:100}),foreign=collected.items.find(i=>i.descriptor.entityKind==='input'||JSON.parse(i.key)[0]==='input');assert.ok(foreign);
 const request={...f.request,items:[foreign],coverage:[{key:foreign.key,facet:'organize',scope:f.scope.topicId}]},cap=captureOriginalOrganizePlan(f.source,f.action,f.s,request);
 await assert.rejects(f.ai.plan(request,cap));assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});

test('late accessor substitution is refused before Foundation can clone caller data',{timeout:10000},async t=>{
 const f=await fixture(t),cap=captureOriginalOrganizePlan(f.source,f.action,f.s,f.request);let getters=0;
 Object.defineProperty(f.request,'type',{enumerable:true,get(){getters++;return 'AI_ORGANIZE';}});
 await assert.rejects(f.ai.plan(f.request,cap));assert.equal(getters,0);assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});

test('a public aliased coverage graph stays rejected by the original closed snapshot',{timeout:10000},async t=>{
 const f=await fixture(t),request={...f.request,commitMode:'organize-atomic-v1',children:[f.request.coverage]};
 assert.throws(()=>captureOriginalOrganizePlan(f.source,f.action,f.s,request));
 assert.deepEqual(await counts(f.s),{jobs:0,flights:0,receipts:0});
});
