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
 let owner,hub,channel,configuration,processing=0;
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,transformResponse:({value,payload})=>{if(value.filter.status==='DECIDE')value.filter.decisions=payload.coverage.filter(u=>u.facet==='filter').map(u=>({inputId:JSON.parse(u.key)[1],decision:'FILTER'}));},configure:context=>{
  const {local,server,filterRuntime,filterConsent,filterIdentity}=context;filterIdentity.dispose();channel=identityChannelFixture({authority:server});hub=createIdentityCurrentnessHub({endpoint:context.configuration.origin+'/api/identity-currentness',clock:context.configuration.clock,fetch:r=>channel.handler(r)});context.configuration.filterIdentity=createHubMaintenanceIdentity(hub);
  configuration={...context.configuration,readFilterReadProofs:async request=>{server.principals.set(request.principalId+'/'+request.libraryId,server.principal(request));const {request:_,...proofs}=server.readBundle(request,{entitlement:{tier:'pro'}});return proofs;}};
  const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(...args)=>{if(args[1].purpose==='ai-filter-history-visibility-qualification')processing++;return resolve(...args);}};
  owner=createAIFilterVisibilityOwner({getStore:()=>local.s,consent:filterConsent,policy,configuration,hub});assert.ok(owner);assert.equal(filterRuntime.configureVisibility(owner),true);
 }});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));await owner.settled();f.session.dispose();owner.dispose();
 const row=await f.s.repository.transaction(false,tx=>tx.get('meta',CONTEXT_CARDS_ROW));assert.ok(row.items.some(x=>x.origin==='automatic'&&x.lifecycle==='active'));
 const cold=createAIFilterVisibilityOwner({getStore:()=>f.s,consent:f.filterConsent,policy,configuration,hub});assert.ok(cold);assert.equal(f.filterRuntime.configureVisibility(cold),true);
 t.after(()=>{cold.dispose();hub.dispose();channel.close();});
 return {...f,row,owner:cold,configuration,processing:()=>processing};
}
test('cold original Context lineage prepares exact historical Filter scope outside its content transaction',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const before=f.processing();
 const result=await readableContextItems(f.s,f.row.items,{epoch:'initial',rowSerialized:JSON.stringify(f.row)});
 t.diagnostic(JSON.stringify({candidate:f.candidate.id,before:f.row.items.map(x=>({id:x.id,inputs:x.maintenance?.provenance?.evidence?.map(e=>e.inputId)})),after:result.items.map(x=>x.id),processing:f.processing()-before,status:f.owner.status()}));
 assert.equal(result.items.some(x=>x.origin==='automatic'),false,'filtered original evidence must not qualify an old Context Item');
 assert.equal(f.processing()-before,1,'one exact fresh history qualification, not opportunistic timers');assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

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
for(const refusal of ['foreign caller','unknown cursor','global off','all item cards off'])test('original external Context '+refusal+' refuses before any history processing or Input/Source text',async t=>{
 const f=await fixture(t),e=await external(f);t.mock.timers.enable({apis:['setTimeout']});
 if(refusal==='global off'||refusal==='all item cards off')for(const key of refusal==='global off'?['global']:['info','rules','now']){const row=await f.s.repository.transaction(false,tx=>e.cards.row(tx));await e.cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,enabled:false,expectedRevision:row.access[key].revision});}
 const before=f.processing(),reads=watchOriginalContent(t,f),result=await e.service.shallow(refusal==='foreign caller'?Object.freeze({}):e.caller,refusal==='unknown cursor'?{cursor:crypto.randomUUID()}:{});
 assert.equal(result.available,refusal==='all item cards off');assert.deepEqual(result.items,[]);assert.equal(f.processing(),before);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
for(const change of ['offline','generation','throw','thenable','global off','restore'])test('original external Context '+change+' after real history preparation is rechecked before its content continuation',async t=>{
 const f=await fixture(t),e=await external(f);t.mock.timers.enable({apis:['setTimeout']});let revoked=false;
 const prepare=f.s.withAIFilterVisibilityScope.bind(f.s);t.mock.method(f.s,'withAIFilterVisibilityScope',(scope,read)=>prepare(scope,async()=>{
  if(change==='offline')e.state.online=false;
  if(change==='generation')e.state.generation++;
  if(change==='throw')e.verifier.isCurrent=()=>{throw Error('Synthetic original verifier unavailable');};
  if(change==='thenable')e.verifier.isCurrent=()=>Promise.resolve(true);
  if(change==='global off'){const row=await f.s.repository.transaction(false,tx=>e.cards.row(tx));await e.cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'global',enabled:false,expectedRevision:row.access.global.revision});}
  if(change==='restore')await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}));
  revoked=true;return read();
 }));
 const before=f.processing(),reads=watchOriginalContent(t,f,()=>revoked),result=await e.service.shallow(e.caller);
 assert.equal(revoked,true);assert.equal(f.processing()-before,1);assert.equal(result.available,false);assert.deepEqual(result.items,[]);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

test('cold original Thought entry page qualifies only its selected generated labels while retaining original Entry rows',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const before=f.processing();
 const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active'));
 assert.ok(topic);const model=new ThoughtLibraryReadModel(f.s),page=await model.entryPage({topicId:topic.id,limit:40});
 t.diagnostic(JSON.stringify({topic:{id:topic.id,createdBy:topic.createdBy,sourceRecordIds:topic.sourceRecordIds,protections:topic.protections},page,processing:f.processing()-before}));
 assert.equal(page.topic.sourceUnavailable,true);assert.equal(page.topic.name,'未命名主题');assert.ok(page.items.length>0,'Filter must not remove original local Entry work');assert.equal(f.processing()-before,1);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

for(const refusal of ['unknown cursor','removed Topic'])test('original Thought '+refusal+' rejects before cold history processing or Input/Source text',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});let topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active'));
 if(refusal==='removed Topic')assert.equal((await f.s.removeTopic({id:topic.id,expectedRevision:topic.revision,operationId:crypto.randomUUID()})).removed,true);
 const before=f.processing(),reads=watchOriginalContent(t,f),model=new ThoughtLibraryReadModel(f.s),page=await model.entryPage({topicId:topic.id,...refusal==='unknown cursor'?{cursor:crypto.randomUUID()}:{}});
 assert.deepEqual(page.items,[]);assert.equal(refusal==='unknown cursor'?page.cursorInvalid:page.unavailable,true);assert.equal(f.processing(),before);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pinned,0);assert.equal(f.owner.status().pages,0);
});
for(const change of ['restore','page revision','cursor replacement'])test('original Thought '+change+' during preparation rejects the old selected page before content',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),model=new ThoughtLibraryReadModel(f.s);
 // A real original cursor, from the original one-row placement page. The first
 // page is intentionally cold; make the next page cold with a distinct owner.
 let cursor=null;
 if(change==='cursor replacement'){
  const first=await model.entryPage({topicId:topic.id,limit:1});assert.ok(first.nextCursor);cursor=first.nextCursor;
 }
 let changed=false;const original=f.s.withAIFilterVisibilityScope.bind(f.s);
 t.mock.method(f.s,'withAIFilterVisibilityScope',(scope,read)=>original(scope,async()=>{
  if(change==='restore')await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}));
  if(change==='page revision')await f.s.repository.transaction(true,async tx=>{const p=(await tx.all('placements')).find(x=>x.topicId===topic.id&&x.lifecycle==='active');await tx.put('placements',{...p,revision:p.revision+1});});
  if(change==='cursor replacement')model.cursors.set(cursor,structuredClone(model.cursors.get(cursor)));
  changed=true;return read();
 }));
 const reads=watchOriginalContent(t,f,()=>changed),page=await model.entryPage({topicId:topic.id,cursor,limit:1});
 assert.equal(changed,true);assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pinned,0);assert.equal(f.owner.status().pages,0);assert.equal(f.physical(),1);
});
test('original Thought one-row continuations retain exact Entry order and release every history page',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),model=new ThoughtLibraryReadModel(f.s);
 const expected=await f.s.repository.transaction(false,async tx=>(await tx.all('placements')).filter(x=>x.topicId===topic.id&&x.lifecycle==='active').sort((a,b)=>a.rank.localeCompare(b.rank)).map(x=>x.entryId));
 const first=await model.entryPage({topicId:topic.id,limit:1});assert.ok(first.nextCursor);assert.equal(first.items.length,1);assert.equal(f.owner.status().pinned,0);
 const second=await model.entryPage({topicId:topic.id,cursor:first.nextCursor,limit:1});assert.equal(second.items.length,1);assert.equal(second.nextCursor,null);
 assert.deepEqual([...first.items,...second.items].map(x=>x.entryRef.id),expected);assert.equal(new Set(expected).size,2);assert.equal(first.topic.sourceUnavailable,true);assert.equal(second.topic.sourceUnavailable,true);assert.equal(f.owner.status().pinned,0);assert.equal(f.owner.status().pages,0);assert.equal(f.physical(),1);
});

import {ThoughtSectionReading} from '../../../extension/core/thought-section-reading.js';
for(const mode of ['original','query','expression'])test('cold original Section '+mode+' page requalifies only its actual selected history',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),model=new ThoughtLibraryReadModel(f.s),reader=new ThoughtSectionReading(model),before=f.processing();
 const options={topicId:topic.id,limit:40,...mode==='query'?{query:'folded'}:mode==='expression'?{chronology:'expression'}:{}};
 let page=await reader.page(options);for(let count=0;page.indexing&&count<20;count++)page=await reader.page({...options,cursor:page.nextCursor,expectedReadGeneration:page.coverage.activeGeneration});
 t.diagnostic(JSON.stringify({mode,page,processing:f.processing()-before}));
 assert.equal(page.cursorInvalid,undefined);assert.equal(page.indexing===true,false);assert.equal(page.topic.sourceUnavailable,true);assert.equal(page.topic.name,'未命名主题');assert.ok(page.items.length>0);assert.equal(f.processing()-before,1);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

for(const mode of ['original','query','expression'])for(const refusal of ['unknown cursor','removed Topic'])test('original Section '+mode+' '+refusal+' refuses before history processing',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active'));
 if(refusal==='removed Topic')await f.s.removeTopic({id:topic.id,expectedRevision:topic.revision,operationId:crypto.randomUUID()});
 const reads=watchOriginalContent(t,f),before=f.processing(),reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s)),page=await reader.page({topicId:topic.id,...mode==='query'?{query:'folded'}:mode==='expression'?{chronology:'expression'}:{},...refusal==='unknown cursor'?{cursor:crypto.randomUUID()}:{}});
 assert.deepEqual(page.items,[]);assert.equal(refusal==='unknown cursor'?page.cursorInvalid:page.unavailable,true);assert.equal(f.processing(),before);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);
});
for(const mode of ['original','query','expression'])for(const change of ['restore','placement revision'])test('original Section '+mode+' '+change+' after real preparation rejects before later content and releases its pin',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s));let changed=false;
 const prepare=f.s.prepareAIFilterVisibilityScope.bind(f.s);t.mock.method(f.s,'prepareAIFilterVisibilityScope',async scope=>{const page=await prepare(scope);assert.ok(page);await f.s.repository.transaction(true,async tx=>{if(change==='restore')await tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()});else{const p=(await tx.all('placements')).find(row=>row.topicId===topic.id&&row.lifecycle==='active');await tx.put('placements',{...p,revision:p.revision+1});}});changed=true;return page;});
 const reads=watchOriginalContent(t,f,()=>changed),options={topicId:topic.id,...mode==='query'?{query:'folded'}:mode==='expression'?{chronology:'expression'}:{}};let page=await reader.page(options);for(let count=0;page.indexing&&!changed&&count<20;count++)page=await reader.page({...options,cursor:page.nextCursor,expectedReadGeneration:page.coverage.activeGeneration});
 assert.equal(changed,true);assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

for(const mode of ['original','query','expression'])test('original Section '+mode+' releases the real prepared pin when its original consent check throws',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),model=new ThoughtLibraryReadModel(f.s),reader=new ThoughtSectionReading(model);let prepared=false;
 const check=model.consent.bind(model);t.mock.method(model,'consent',()=>{if(prepared)throw Object.assign(Error('Synthetic original consent withdrawal'),{code:'CONSENT_REQUIRED'});return check();});
 const prepare=f.s.prepareAIFilterVisibilityScope.bind(f.s);t.mock.method(f.s,'prepareAIFilterVisibilityScope',async scope=>{const page=await prepare(scope);assert.ok(page);assert.equal(f.owner.status().pages,1);prepared=true;return page;});
 const reads=watchOriginalContent(t,f,()=>prepared),options={topicId:topic.id,...mode==='query'?{query:'folded'}:mode==='expression'?{chronology:'expression'}:{}};
 await assert.rejects(reader.page(options),{code:'CONSENT_REQUIRED'});assert.equal(prepared,true);assert.deepEqual(reads,[]);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
for(const mode of ['original','query','expression'])test('original Section '+mode+' rejects a foreign reading generation before history qualification',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});const topic=await f.s.repository.transaction(false,async tx=>(await tx.all('topics')).find(x=>x.lifecycle==='active')),reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s)),before=f.processing();
 const page=await reader.page({topicId:topic.id,expectedReadGeneration:crypto.randomUUID(),...mode==='query'?{query:'folded'}:mode==='expression'?{chronology:'expression'}:{}});
 assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(f.processing(),before);assert.equal(f.owner.status().pages,0);assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});
