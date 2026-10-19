import {ContextTopicAccessService} from '../../../extension/core/context-topic-access.js';
import {readContextTopicScope} from '../../../extension/core/context-topic-scope.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createIdentityCurrentnessHub,createHubMaintenanceIdentity} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
import {createAIFilterVisibilityOwner} from '../../../extension/core/ai-usage/filter-visibility-owner.js';
import {CONTEXT_CARDS_ROW,ContextCardsService} from '../../../extension/core/context-cards.js';
import {ThoughtLibraryReadModel} from '../../../extension/core/thought-library-read-model.js';
import {ContextReadService} from '../../../extension/core/context-read.js';
import {readableContextItems} from '../../../extension/core/context-item-lineage.js';
const policy={version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'};
async function fixture(t){
 let owner,hub,channel,configuration,processing=0;const historyState={beforeResolve:null,afterResolve:null};
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,transformResponse:({value,payload})=>{if(value.filter.status==='DECIDE')value.filter.decisions=payload.coverage.filter(u=>u.facet==='filter').map(u=>({inputId:JSON.parse(u.key)[1],decision:'FILTER'}));},configure:context=>{
  const {local,server,filterRuntime,filterConsent,filterIdentity}=context;filterIdentity.dispose();channel=identityChannelFixture({authority:server});hub=createIdentityCurrentnessHub({endpoint:context.configuration.origin+'/api/identity-currentness',clock:context.configuration.clock,fetch:r=>channel.handler(r)});context.configuration.filterIdentity=createHubMaintenanceIdentity(hub);
  configuration={...context.configuration,readFilterReadProofs:async request=>{server.principals.set(request.principalId+'/'+request.libraryId,server.principal(request));const {request:_,...proofs}=server.readBundle(request,{entitlement:{tier:'pro'}});return proofs;}};
  const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(...args)=>{if(args[1].purpose!=='ai-filter-history-visibility-qualification')return resolve(...args);processing++;await historyState.beforeResolve?.(...args);const receipt=await resolve(...args);return historyState.afterResolve?historyState.afterResolve(receipt,...args):receipt;}};
  owner=createAIFilterVisibilityOwner({getStore:()=>local.s,consent:filterConsent,policy,configuration,hub});assert.ok(owner);assert.equal(filterRuntime.configureVisibility(owner),true);
 }});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));await owner.settled();f.session.dispose();owner.dispose();
 const row=await f.s.repository.transaction(false,tx=>tx.get('meta',CONTEXT_CARDS_ROW));assert.ok(row.items.some(x=>x.origin==='automatic'&&x.lifecycle==='active'));
 const cold=createAIFilterVisibilityOwner({getStore:()=>f.s,consent:f.filterConsent,policy,configuration,hub});assert.ok(cold);assert.equal(f.filterRuntime.configureVisibility(cold),true);
 t.after(()=>{cold.dispose();hub.dispose();channel.close();});
 return {...f,row,owner:cold,configuration,historyState,processing:()=>processing};
}
async function external(f){
 const cards=new ContextCardsService(f.s),caller=Object.freeze({}),state={online:true,generation:1};
 for(const key of ['global','info','rules','now']){const row=await f.s.repository.transaction(false,t=>cards.row(t));await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,enabled:true,expectedRevision:row.access[key].revision});}
 const verifier={async verify(actual,store){return actual===caller&&store===f.s?{version:1,store:f.s,connectionId:'synthetic-context-reader',accountId:'synthetic-context-account',authorizationGeneration:state.generation,readable:true,online:state.online,expiresAt:Date.now()+600000}:null;},isCurrent(actual,r,store){return actual===caller&&store===f.s&&state.online&&r.authorizationGeneration===state.generation;}};
 const service=new ContextReadService(f.s,{connectionVerifier:verifier});
 return {service,caller,state,cards,verifier};
}
function watchOriginalContent(t,f,active=()=>true){
 const reads=[],original=f.s.repository.transaction.bind(f.s.repository);
 t.mock.method(f.s.repository,'transaction',(write,fn,stores)=>original(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(name,key)=>{const row=await get(name,key);if(row?.value&&['blocks','records'].includes(name)){const value={...row.value};for(const field of name==='blocks'?['libraryText','note']:['originalText'])if(Object.hasOwn(value,field)){const held=value[field];Object.defineProperty(value,field,{enumerable:true,get(){if(active())reads.push({name,key,field});return held;}});}return {...row,value};}return row;};return fn(tx);},stores));return reads;
}

async function deepExternal(f){
 const e=await external(f),row=await f.s.repository.transaction(false,t=>e.cards.row(t));await e.cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'inputs',enabled:true,expectedRevision:row.access.inputs.revision});
 const topics=await f.s.repository.transaction(false,t=>t.all('topics'));let topic,scope;
 for(const value of topics){const candidate=await readContextTopicScope(f.s,{topicId:value.id});if(candidate.available&&candidate.scope.inputIds.includes(f.candidate.id)){topic=value;scope=candidate;break;}}
 assert.ok(topic,'original selected Topic contains the actual Filter candidate');const access=new ContextTopicAccessService(f.s),changed=await access.change({operationId:crypto.randomUUID(),epoch:'initial',topicId:topic.id,enabled:true,expectedRevision:0,expectedBinding:scope.binding});assert.equal(changed.ok,true,JSON.stringify(changed));return {...e,topic,access};
}
for(const kind of ['topics','searchTopic','readTopic'])test('cold original deep Context '+kind+' awaits its exact historical Filter qualification',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f),before=f.processing(),options=kind==='topics'?{}:{topicId:e.topic.id,...(kind==='searchTopic'?{query:'Synthetic'}:{})};const result=await e.service[kind](e.caller,options);
 t.diagnostic(JSON.stringify({kind,result,processing:f.processing()-before,status:f.owner.status()}));assert.equal(f.processing()-before,1,'one awaited original history scope');assert.equal(result.items.some(x=>x.inputId===f.candidate.id),false);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

const deepOptions=(e,kind)=>kind==='topics'?{}:{topicId:e.topic.id,...(kind==='searchTopic'?{query:'然后'}:{})};
for(const kind of ['topics','searchTopic','readTopic'])for(const fault of ['caller','cursor','global','inputs','topic'])test('cold deep '+kind+' rejects original '+fault+' admission before history processing or Input text',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f),options=deepOptions(e,kind);let caller=e.caller;
 if(fault==='caller')caller=Object.freeze({});
 if(fault==='cursor')options.cursor=crypto.randomUUID();
 if(fault==='global'||fault==='inputs'){const row=await f.s.repository.transaction(false,tx=>e.cards.row(tx));await e.cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:fault,enabled:false,expectedRevision:row.access[fault].revision});}
 if(fault==='topic'){const row=await f.s.repository.transaction(false,tx=>e.access.row(tx)),choice=row.choices.find(x=>x.topicId===e.topic.id);assert.equal((await e.access.change({operationId:crypto.randomUUID(),epoch:choice.binding.epoch,topicId:e.topic.id,enabled:false,expectedRevision:choice.revision,expectedBinding:choice.binding})).ok,true);}
 const before=f.processing(),reads=watchOriginalContent(t,f),result=await e.service[kind](caller,options);
 if(kind==='topics'&&fault==='topic'){assert.equal(result.available,true);assert.deepEqual(result.items,[]);}else{assert.equal(result.available,false,JSON.stringify(result));assert.deepEqual(result.items,[]);}
 assert.equal(f.processing(),before);assert.equal(reads.length,0,JSON.stringify(reads));assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
for(const kind of ['topics','searchTopic','readTopic'])for(const change of ['offline','generation','global','restore'])test('cold deep '+kind+' rejects '+change+' during history grant before subsequent Input content and releases its pin',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f);let changed=false;
 f.historyState.afterResolve=async receipt=>{if(change==='offline')e.state.online=false;if(change==='generation')e.state.generation++;if(change==='global'){const row=await f.s.repository.transaction(false,tx=>e.cards.row(tx));await e.cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'global',enabled:false,expectedRevision:row.access.global.revision});}if(change==='restore')await f.s.foundationWrite(tx=>tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}));changed=true;return receipt;};
 const reads=watchOriginalContent(t,f,()=>changed),before=f.processing(),result=await e.service[kind](e.caller,deepOptions(e,kind));
 assert.equal(changed,true,'real history issuer reached');assert.equal(f.processing()-before,1);assert.equal(result.available,false,JSON.stringify(result));assert.deepEqual(result.items,[]);assert.equal(reads.length,0,JSON.stringify(reads));assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
test('deep held history grant cannot publish after original request timeout and keeps cleanup tied to the pending preparation',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f);let entered,release,finished,watch=false;
 const enteredPromise=new Promise(r=>entered=r),held=new Promise(r=>release=r),finishedPromise=new Promise(r=>finished=r);
 f.historyState.beforeResolve=async()=>{entered();await held;};
 const original=f.s.withAIFilterVisibilityScope.bind(f.s);t.mock.method(f.s,'withAIFilterVisibilityScope',async(...args)=>{try{return await original(...args);}finally{finished();}});
 const reads=watchOriginalContent(t,f,()=>watch),running=e.service.readTopic(e.caller,deepOptions(e,'readTopic'));
 try{await Promise.race([enteredPromise,running.then(result=>assert.fail('read completed before held issuer: '+JSON.stringify(result)))]);watch=true;t.mock.timers.tick(10001);const result=await running;assert.equal(result.available,false);assert.equal(result.reason,'timeout');assert.deepEqual(result.items,[]);}finally{release();}await finishedPromise;await f.owner.settled();
 assert.equal(reads.length,0,JSON.stringify(reads));assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
test('deep read preserves independent authorized content when the separate historical Filter processing issuer refuses',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f),before=f.processing();f.historyState.afterResolve=()=>null;
 const result=await e.service.readTopic(e.caller,deepOptions(e,'readTopic'));assert.equal(result.available,true,JSON.stringify(result));assert.ok(result.items.some(x=>x.inputId===f.candidate.id&&x.field==='body'));assert.equal(f.processing()-before,1);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
test('deep read preserves human Keep and exact cursor continuation without retaining a history pin',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f);await f.s.keepInput(f.candidate.id);const before=f.processing(),rows=[];let cursor=null,pages=0;
 do{const result=await e.service.readTopic(e.caller,{...deepOptions(e,'readTopic'),limit:1,chunkSize:2,cursor});assert.equal(result.available,true,JSON.stringify(result));rows.push(...result.items);cursor=result.nextCursor;assert.equal(result.complete,cursor===null);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.ok(++pages<200);}while(cursor);
 const body=rows.filter(x=>x.inputId===f.candidate.id&&x.field==='body');assert.equal(body.map(x=>x.text).join(''),'然后');assert.equal(body[0].offset,0);assert.equal(body.at(-1).fieldComplete,true);assert.equal(f.processing(),before);assert.equal(f.physical(),1);
});
test('deep unknown legacy corruption is unavailable before history processing rather than a complete empty directory',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f);await f.s.foundationWrite(tx=>tx.put('meta',{id:'memory:topic:unknown',kind:'topic',version:1,body:'SYNTHETIC_PRIVATE_CORRUPTION'}));
 const reads=watchOriginalContent(t,f),before=f.processing(),result=await e.service.topics(e.caller);assert.equal(result.available,false,JSON.stringify(result));assert.equal(result.reason,'storage_unavailable');assert.deepEqual(result.items,[]);assert.equal(f.processing(),before);assert.equal(reads.length,0);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);
});
for(const table of ['dependencies','placements'])test('deep incomplete original '+table+' metadata page refuses before any history grant or Input content',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const e=await deepExternal(f),original=f.s.repository.transaction.bind(f.s.repository);let truncated=0;
 t.mock.method(f.s.repository,'transaction',(write,fn,stores)=>original(write,tx=>{const page=tx.rangePage.bind(tx);tx.rangePage=async(name,...args)=>{const value=await page(name,...args);if(name===table&&value.rows.length){truncated++;return {rows:[],next:null};}return value;};return fn(tx);},stores));
 const reads=watchOriginalContent(t,f),before=f.processing(),result=await e.service.readTopic(e.caller,deepOptions(e,'readTopic'));assert.ok(truncated>0);assert.equal(result.available,false,JSON.stringify(result));assert.deepEqual(result.items,[]);assert.equal(f.processing(),before);assert.equal(reads.length,0);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);
});
