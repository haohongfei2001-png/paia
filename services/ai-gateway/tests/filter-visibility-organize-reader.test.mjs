import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createIdentityCurrentnessHub,createHubMaintenanceIdentity} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
import {createAIFilterVisibilityOwner} from '../../../extension/core/ai-usage/filter-visibility-owner.js';
import {createOrganizeActionSource,captureOriginalOrganizeFilterSelection,readOriginalOrganizeAction,chargeOriginalOrganizeWork} from '../../../extension/background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../../../extension/core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant,organizeProcessingReader,captureOriginalOrganizeFilterAdmission} from '../../../extension/background/organize-processing-policy.js';
import {createOrganizeFilterVisibilityScope} from '../../../extension/core/ai-usage/filter-visibility-consumer-scope.js';
import {captureAIFilterQualifiedRead} from '../../../extension/core/ai-usage/ai-filter-authority.js';
import {readAIFilterQualifiedConsumer,assertAIFilterQualifiedConsumerFacts,assertAIFilterQualifiedConsumerCurrent} from '../../../extension/core/ai-usage/filter-visibility-qualified-reader.js';
const policy={version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'},event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 let owner,hub,channel,readConfiguration,identityReads=0;
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,transformResponse:({value,payload})=>{if(value.filter.status==='DECIDE')value.filter.decisions=payload.coverage.filter(u=>u.facet==='filter').map(u=>({inputId:JSON.parse(u.key)[1],decision:'FILTER'}));},configure:({local,configuration,server,filterRuntime,filterConsent,filterIdentity})=>{
  filterIdentity.dispose();channel=identityChannelFixture({authority:server});hub=createIdentityCurrentnessHub({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:r=>channel.handler(r)});configuration.filterIdentity=createHubMaintenanceIdentity(hub);
  readConfiguration={...configuration,readFilterReadProofs:async request=>{identityReads++;server.principals.set(request.principalId+'/'+request.libraryId,server.principal(request));const {request:_,...proofs}=server.readBundle(request,{entitlement:{tier:'pro'}});return proofs;}};
  owner=createAIFilterVisibilityOwner({getStore:()=>local.s,consent:filterConsent,policy,configuration:readConfiguration,hub});assert.ok(owner);assert.equal(filterRuntime.configureVisibility(owner),true);
 }});
 t.after(()=>{f.session.dispose();owner.dispose();hub.dispose();channel.close();f.s.repository.db?.close();});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));await owner.settled();f.session.dispose();
 const before=await f.s.repository.transaction(false,tx=>tx.get('filterInputs',f.candidate.id));assert.ok(before.aiDecision);const entries=await f.s.repository.transaction(false,tx=>tx.all('thoughts')),entry=entries.find(e=>e.workingInputId===f.candidate.id);assert.ok(entry,'actual original paid Topic owner created the candidate mirror');
 const topic=await f.s.createTopic({name:'Synthetic selected Organize scope',operationId:crypto.randomUUID()});await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 assert.deepEqual(await f.s.repository.transaction(false,tx=>tx.get('filterInputs',f.candidate.id)),before,'human placement changes no Filter decision');
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api);t.after(()=>source.dispose());const selection=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
 const withReader=callback=>f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,topic.id);let grant;try{grant=captureOrganizeProcessingGrant(source,action,f.s,tx,proof);const reader=organizeProcessingReader(grant,f.s,tx);return await callback({tx,proof,grant,reader});}finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 const prepare=async()=>{const selection=await withReader(({tx,proof,grant})=>captureOriginalOrganizeFilterSelection(source,action,f.s,tx,proof,grant));return f.s.prepareAIFilterVisibilityScope(createOrganizeFilterVisibilityScope(f.s,selection));};
 const hidden=async({reader})=>f.s.isFiltered(reader,(await reader.get('blocks',f.candidate.id)).value,await reader.get('meta','smart-filter'));
 return {...f,owner,hub,channel,readConfiguration,identityReads:()=>identityReads,source,action,topic,before,withReader,prepare,hidden};
}

test('actual paid joined Filter history stays hidden through the original independently granted Organize reader',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);try{
  await f.withReader(async context=>{const intent=readOriginalOrganizeAction(f.source,f.action,f.s,context.tx,context.proof);assert.deepEqual(intent.metadata.inputs.map(x=>x.input.id),[f.candidate.id]);assert.equal(await f.hidden(context),true);await assert.rejects(context.reader.get('blocks',f.neighbor.id),'Organize itself has no neighbor text permission');await assert.rejects(context.reader.get('filterInputs',f.candidate.id),'full decision never enters the Organize reader');});
 }finally{pin.release();}assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);assert.deepEqual(await f.s.repository.transaction(false,tx=>tx.get('filterInputs',f.candidate.id)),f.before);
});

test('a real Organize action without a qualified historical lease defers instead of sending an AI-hidden Input as visible',async t=>{
 const f=await fixture(t);f.owner.invalidate();await assert.rejects(f.withReader(f.hidden));assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

test('a copied historical read capability cannot read any independent Filter candidate or neighbor',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);try{await f.withReader(async({reader})=>{const admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission);assert.throws(()=>readAIFilterQualifiedConsumer({...cap},f.s,reader,f.candidate.id));assert.throws(()=>readAIFilterQualifiedConsumer(cap,{...f.s},reader,f.candidate.id));assert.throws(()=>readAIFilterQualifiedConsumer(cap,f.s,{...reader},f.candidate.id));const view=readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id);assert.ok(Object.isFrozen(view.settings));await assert.rejects(view.reader.get('blocks',f.outside.id));});}finally{pin.release();}assert.equal(f.physical(),1);
});

function observeRawReads(tx,{onRow=null}={}){
 const seen=[],wrapped=new WeakSet(),objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=objectStore(name);if(wrapped.has(store))return store;wrapped.add(store);const get=store.get.bind(store);store.get=key=>{seen.push([name,key]);const request=get(key);request.addEventListener('success',()=>onRow?.(name,key,request.result));return request;};return store;};return seen;
}

for(const denial of ['processing denial','processing revokes action','last source clock revokes action'])test('qualified Filter '+denial+' rejects before independent Input or Source text reads',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);try{await f.withReader(async({tx,reader})=>{
  const admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission);readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id);
  const reads=observeRawReads(tx);let changed=false;const previous=f.readConfiguration.processing.isCurrent,clock=f.readConfiguration.clock;
  if(denial==='last source clock revokes action')f.readConfiguration.clock=()=>{changed=true;f.source.invalidate();return clock();};
  else f.readConfiguration.processing.isCurrent=(receipt,store)=>{if(receipt.scope.purpose==='ai-filter-history-visibility-qualification'){changed=true;if(denial==='processing revokes action')f.source.invalidate();else return false;}return previous(receipt,store);};
  assert.throws(()=>assertAIFilterQualifiedConsumerCurrent(cap,f.s,reader,f.candidate.id));assert.equal(changed,true);assert.deepEqual(reads,[]);assert.throws(()=>assertAIFilterQualifiedConsumerFacts(cap,f.s,reader,f.candidate.id));
 });}finally{pin.release();}assert.equal(f.owner.status().pinned,0);assert.equal(f.physical(),1);
});

test('qualified reader projects only needed original fields and does not clone unrelated control preferences or row metadata',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);let getters=0;try{await f.withReader(async context=>{
  const prefs=f.s.controlCache.preferences;assert.ok(prefs);Object.defineProperty(prefs,'unrelatedPrivatePreference',{configurable:true,enumerable:true,get(){getters++;throw Error('Unselected preferences');}});
  observeRawReads(context.tx,{onRow(table,key,row){if(!row)return;if(table==='blocks'){Object.defineProperty(row.value,'futureSemanticField',{enumerable:true,get(){getters++;throw Error('Unknown semantic field');}});for(const ref of row.value.provenance)Object.defineProperty(ref,'futurePrivateNote',{enumerable:true,get(){getters++;throw Error('Unknown provenance field');}});}if(table==='records')Object.defineProperty(row.value,'note',{enumerable:true,get(){getters++;throw Error('Source note is not Input note');}});}});
  assert.equal(await f.hidden(context),true);assert.equal(getters,0);
 });}finally{delete f.s.controlCache.preferences?.unrelatedPrivatePreference;pin.release();}assert.equal(getters,0);assert.equal(f.physical(),1);
});

test('same-key qualified reads preserve their first facts while every actual read still consumes the original cumulative action budget',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);try{await f.withReader(async context=>{
  const {tx,proof,reader}=context,admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission),view=readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id);
  const first=await view.reader.get('blocks',f.candidate.id);for(let i=0;i<130;i++)assert.deepEqual(await view.reader.get('blocks',f.candidate.id),first);
  let changed=false;observeRawReads(tx,{onRow(table,key,row){if(table==='blocks'&&key===f.candidate.id){row.value.note='Changed after first retained facts';changed=true;}}});await assert.rejects(view.reader.get('blocks',f.candidate.id));assert.equal(changed,true);
  assert.throws(()=>chargeOriginalOrganizeWork(f.source,f.action,f.s,tx,proof,{reads:3966}),'the preceding actual re-reads remain in the same action ledger');
 });}finally{pin.release();}assert.equal(f.physical(),1);
});

test('qualified consumer capability is bound to one original active transaction and cannot cross an await into a replacement transaction',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);let saved;try{
  await f.withReader(async({reader})=>{const admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission),view=readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id);saved={reader,cap,view};assert.ok(await view.reader.get('blocks',f.candidate.id));});
  assert.throws(()=>assertAIFilterQualifiedConsumerCurrent(saved.cap,f.s,saved.reader,f.candidate.id));await assert.rejects(saved.view.reader.get('blocks',f.candidate.id));
  await f.withReader(async({reader})=>assert.throws(()=>readAIFilterQualifiedConsumer(saved.cap,f.s,reader,f.candidate.id)));
 }finally{pin.release();}assert.equal(f.physical(),1);
});

for(const phase of ['processing issuer','source clock'])for(const property of ['store repository','repository database'])test('qualified Filter '+phase+' cannot evaluate a replaced '+property+' getter',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);let getters=0,changed=false,observed;const repository=f.s.repository,target=property==='store repository'?f.s:repository,key=property==='store repository'?'repository':'db',descriptor=Object.getOwnPropertyDescriptor(target,key);
 try{await f.withReader(async({tx,reader})=>{
  const admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission);readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id);const reads=observeRawReads(tx),previous=f.readConfiguration.processing.isCurrent,clock=f.readConfiguration.clock;
  const replace=()=>{if(!changed){changed=true;Object.defineProperty(target,key,{configurable:true,enumerable:descriptor.enumerable,get(){getters++;return descriptor.value;}});}};
  if(phase==='source clock')f.readConfiguration.clock=()=>{replace();return clock();};
  else f.readConfiguration.processing.isCurrent=(receipt,store)=>{if(receipt.scope.purpose==='ai-filter-history-visibility-qualification')replace();return previous(receipt,store);};
  try{let rejected=false,factsRejected=false;try{assertAIFilterQualifiedConsumerCurrent(cap,f.s,reader,f.candidate.id);}catch{rejected=true;}try{assertAIFilterQualifiedConsumerFacts(cap,f.s,reader,f.candidate.id);}catch{factsRejected=true;}observed={rejected,factsRejected,changed,reads:[...reads],getters};}
  finally{Object.defineProperty(target,key,descriptor);f.readConfiguration.processing.isCurrent=previous;f.readConfiguration.clock=clock;}
 });}finally{Object.defineProperty(target,key,descriptor);pin.release();}assert.deepEqual(observed,{rejected:true,factsRejected:true,changed:true,reads:[],getters:0},'late owner fields must be denied without evaluating getters');assert.equal(f.physical(),1);
});

test('qualified reader rejects an object key before any key coercion or original storage request',async t=>{
 const f=await fixture(t),pin=await f.prepare();assert.ok(pin);let observed;try{await f.withReader(async({tx,reader})=>{
  const admission=await captureOriginalOrganizeFilterAdmission(reader,f.s,f.candidate.id),cap=captureAIFilterQualifiedRead(f.filterRuntime.authority,f.s,admission),view=readAIFilterQualifiedConsumer(cap,f.s,reader,f.candidate.id),reads=observeRawReads(tx);let coercions=0;
  let rejected=false;try{await view.reader.get('meta',{[Symbol.toPrimitive](){coercions++;throw Error('A rejected key must not run caller code');}});}catch{rejected=true;}observed={rejected,coercions,reads:[...reads]};
 });}finally{pin.release();}assert.deepEqual(observed,{rejected:true,coercions:0,reads:[]});assert.equal(f.physical(),1);
});

test('a new cold original history owner requalifies the same joined decision before the Organize transaction',async t=>{
 const f=await fixture(t),before=f.identityReads(),cold=createAIFilterVisibilityOwner({getStore:()=>f.s,consent:f.filterConsent,policy,configuration:f.readConfiguration,hub:f.hub});assert.ok(cold);t.after(()=>cold.dispose());assert.equal(f.filterRuntime.configureVisibility(cold),true);assert.equal(cold.status().history,0);assert.equal(cold.status().active,0);
 const pin=await f.prepare();assert.ok(pin);try{await f.withReader(async context=>assert.equal(await f.hidden(context),true));}finally{pin.release();}
 assert.ok(f.identityReads()>before,'the new original read session obtains fresh identity proofs');assert.equal(cold.status().pinned,0);assert.equal(f.physical(),1);assert.deepEqual(await f.s.repository.transaction(false,tx=>tx.get('filterInputs',f.candidate.id)),f.before);
});
