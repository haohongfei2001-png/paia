// Scoped lifecycle evidence using the original synthetic Filter/Topic/Context
// transaction fixture. No production lifecycle or timer is replaced here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {local} from './harness/thought-m1.mjs';
import {assessment,parameters,citation} from './harness/topic-03.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const snapshot=s=>s.repository.transaction(false,async t=>{const all={};for(const n of s.repository.stores)all[n]=await t.all(n);return all;});
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const filterAck=async f=>(await ack(f)).filter(r=>r.unit.facet==='filter');
const visible=async(f,extra={})=>(await f.s.page({documentId:f.candidate.documentId,...extra})).pageItemIds.includes(f.candidate.id);

async function fixture({tier='pro',noAuthority=false,decision='FILTER',selection='valid',patch={},providerMode='valid',adapterMode='valid',groupSize=16}={}){
 const filterState={generation:1,patch,hook:null,prepareHook:null,selection,scopes:[],prepared:[],released:[],decoded:0},live=new WeakMap();
 const filterAuthority={async resolve(t,r){const grant={allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...r.candidateIds,...r.neighborIds],epochs:{entitlement:'synthetic-pro-1',optIn:'synthetic-opt-1',processing:'synthetic-processing-1',userRead:'synthetic-read-1'},policy:{version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'},...filterState.patch};live.set(grant,filterState.generation);if(filterState.hook)await filterState.hook(t,r);return grant;},isCurrent:g=>live.get(g)===filterState.generation};
 const f={s:new OrganizerStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-18T00:00:00Z',...(noAuthority?{}:{aiFilterAuthority:filterAuthority})})};await f.s.consent(true);
 const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
 await f.s.capture({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-filter-session',url:'https://chatgpt.com/c/synthetic-filter-session',title:'Synthetic filter session'},messages:[{sourceMessageId:'neighbor',pageOrder:1,originalText:'Invented paper boat has a wide folded base',presence},{sourceMessageId:'candidate',pageOrder:2,originalText:'然后',presence},{sourceMessageId:'outside',pageOrder:3,originalText:'PRIVATE_OUT_OF_SCOPE_USER_BODY',presence}]});await f.s.finishFoundation();await f.s.evaluateFilters();
 const data=await f.s.snapshot(),find=key=>data.library.blocks.find(b=>data.records.find(r=>r.id===b.originalTextReference)?.sourceMessageId===key),candidate=find('candidate'),neighbor=find('neighbor'),outside=find('outside');
 await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith(DIRTY_PREFIX)){if(row.descriptor.entityId===outside.id)await t.delete('meta',row.id);else if(row.descriptor.entityId===candidate.id)await t.put('meta',{...row,pendingFacets:['topic','context','filter']});}});
 const prepare=f.s.prepareAIMaintenanceFilter.bind(f.s),release=f.s.releaseAIMaintenanceFilter.bind(f.s);f.s.prepareAIMaintenanceFilter=async(...args)=>{if(filterState.prepareHook)await filterState.prepareHook(...args);const handle=await prepare(...args);filterState.prepared.push(handle);return handle;};f.s.releaseAIMaintenanceFilter=handle=>{filterState.released.push(handle);return release(handle);};
 const processing={allowed:true,epoch:'synthetic-maintenance-processing'},permission={allowed:true,consentEpoch:'synthetic-consent'},clock=new AbortController(),contextAbort=new AbortController(),caller=Object.freeze({id:op()});
 const calls=[],responses=[],decoded=[],state={processing:true,generation:1,windowCurrent:true,acquires:0,contextOperations:0,topicAssessments:0,held:null,topicHook:null,contextHook:null};
 const authority=async(_t,r)=>({...permission,principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 const verifier={async verify(actual,store,scope){return actual===caller&&store===f.s?{version:1,store:f.s,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:Date.now()+600000,revocationSignal:contextAbort.signal}:null;},isCurrent(actual,r,store){return actual===caller&&store===f.s&&r.authorizationGeneration===state.generation;}};
 let acquired=null;
 const window={async acquire(r){state.acquires++;if(acquired&&acquired.requestDigest!==r.requestDigest)throw Object.assign(Error('window consumed'),{code:'UNAVAILABLE'});return acquired??=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-window',reservationId:'synthetic-reservation',tier,requestDigest:r.requestDigest,revocationSignal:clock.signal});},isCurrent(r){return state.windowCurrent&&r===acquired;}};
 const provider={describe:()=>({providerId:'synthetic-maintenance',version:'1',executionKind:'fixture'}),async execute(r){calls.push(structuredClone(r));assert.equal(r.type,'AI_MAINTENANCE');assert.equal(r.automaticRetries,0);assert.ok(r.coverage.length<=50);assert.equal(r.material.purpose,'AI_MAINTENANCE');assert.ok(r.material.inputs.every(i=>Object.keys(i).sort().join(',')==='body,inputId,ref,revision'));assert.equal(Object.hasOwn(r.material,'sources'),false);
  if(state.held)await state.held;if(providerMode==='throw')throw Error('PRIVATE_PROVIDER_BODY');if(providerMode==='empty')return {accepted:false};
  const view={...r.material,inputs:r.material.inputs.map(i=>({id:i.inputId,role:'primary',fields:{body:i.body},revision:i.revision})),entries:[]};
  const proposed=assessment(view,{name:'Synthetic maintenance object '+calls.length,evidence:view.inputs.map(i=>citation(i)),entries:view.inputs.map(i=>({span:citation(i),type:'idea',additional:[]}))});
  const response={accepted:true,operationReceiptId:'synthetic-physical-'+r.childOperationId,fixture:{binding:{logicalJobId:r.logicalJobId,childOperationId:r.childOperationId,operationReceiptId:'synthetic-physical-'+r.childOperationId},topicAssessment:proposed,contextProposal:{operation:'ADD',card:'info',body:'PRIVATE_CONTEXT_BODY '+calls.length,section:'Synthetic maintenance',inputIds:r.coverage.filter(u=>u.facet==='context').map(u=>JSON.parse(u.key)[1])},filterDecisions:[{inputId:candidate.id,decision}],qualified:true,optIn:true,tier:'pro',token:'PRIVATE_PROVIDER_BODY '+calls.length}};const actual=JSON.parse(JSON.stringify(response));responses.push(actual);return actual;
 }};
 const service={version:1,topic:{resolveProcessing:async(_t,r)=>({...processing,inputIds:[...r.inputIds],topicIds:[...r.topicIds]}),decisionVersion:'synthetic-maintenance-annotations-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{
  async topic(response,view,binding){state.topicAssessments++;if(state.topicHook)await state.topicHook(response,view,binding);assert.ok(calls.some(c=>c.childOperationId===binding.childOperationId));assert.equal(response.fixture?.binding.childOperationId,binding.childOperationId);decoded.push({facet:'topic',childId:binding.childOperationId,token:response.fixture?.token});
   if(adapterMode==='missing')return null;assert.deepEqual([...new Set(response.fixture.topicAssessment.evidence.map(e=>e.inputId))].sort(),view.inputs.map(i=>i.id).sort());const value=structuredClone(response.fixture.topicAssessment);if(adapterMode==='invalid')value.forbidden=true;
   return {binding:adapterMode==='swap'?{...response.fixture.binding,childOperationId:'unrelated-child'}:response.fixture.binding,value};
  },
  async context(response,metadata,binding){state.contextOperations++;if(state.contextHook)await state.contextHook(response,metadata,binding);assert.equal(response.fixture?.binding.childOperationId,binding.childOperationId);decoded.push({facet:'context',childId:binding.childOperationId,token:response.fixture?.token});
   if(adapterMode==='missing')return null;
   assert.equal(response.fixture.contextProposal.operation,'ADD');assert.deepEqual([...new Set(response.fixture.contextProposal.inputIds)].sort(),metadata.inputIds);
   const groups=[];for(let at=0;at<metadata.units.length;at+=groupSize){const units=metadata.units.slice(at,at+groupSize),evidence=[];
    for(const u of units){const rawId=JSON.parse(u.key)[1],inputId=metadata.entries?.find(e=>e.entryId===rawId)?.inputIds[0]??rawId,topics=await read(f.s,'topics');let matched;
     for(const topic of topics){const scope=await readContextTopicScope(f.s,{topicId:topic.id});if(scope.available&&scope.scope.inputIds.includes(inputId)){matched={topic,scope};break;}}
     assert.ok(matched,'real Topic membership required');const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));if(!evidence.some(e=>e.inputId===inputId))evidence.push({topicId:matched.topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:matched.scope.binding,expectedRemovalSequence:p.lastRemovalSequence});
    }
    groups.push({units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:op(),card:response.fixture.contextProposal.card,expectedRevision:0,body:response.fixture.contextProposal.body,section:response.fixture.contextProposal.section,associationIds:[op()],evidence}});
   }
   if(adapterMode==='invalid')groups[0].change.extra=true;
   return {binding:adapterMode==='swap-context'?{...response.fixture.binding,childOperationId:'unrelated-child'}:response.fixture.binding,value:groups};
  }
 }};
 await f.s.finishFoundation();
 const processingExpiry=Date.now()+600000;const materialProcessing={resolve:async(_t,scope)=>({version:1,store:f.s,caller,scope,epoch:'synthetic-processing-v1',processing:state.processing&&processing.allowed,expiresAt:processingExpiry,revocationSignal:contextAbort.signal}),isCurrent:(receipt,store)=>store===f.s&&receipt.caller===caller&&state.processing&&processing.allowed&&!contextAbort.signal.aborted};
 service.filter={enabled:true,selectScope:async request=>{filterState.scopes.push(structuredClone(request));assert.ok(Object.isFrozen(request)&&Object.isFrozen(request.inputIds));assert.deepEqual(Object.keys(request).sort(),['candidateIds','inputIds']);return {candidateIds:request.candidateIds,neighborIds:filterState.selection==='missing'?[]:filterState.selection==='outside'?[outside.id]:filterState.selection==='candidate'?[candidate.id]:[neighbor.id]};}};
 service.responseAdapter.filter=async(response,metadata,binding)=>{filterState.decoded++;if(state.filterHook)await state.filterHook(response,metadata,binding);return {binding:response.fixture.binding,value:response.fixture.filterDecisions};};
 const constructor={provider,service,window,authority,processing:materialProcessing},session=new LocalMaintenanceSession(f.s,constructor);
 return {...f,candidate,neighbor,outside,filterState,filterAuthority,session,constructor,provider,service,window,authority,materialProcessing,verifier,caller,clock,contextAbort,permission,processing,state,calls,responses,decoded};
}


async function failedLocalContinuation(f){
 const handle=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,before;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{
  if(write&&f.filterState.decoded&&!reached){
   before={};for(const name of f.s.repository.stores)before[name]=await t.all(name);
   const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const value=await put(name,row,...rest);if(!reached&&name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED'){reached=true;throw Error('SYNTHETIC_LIFECYCLE_STORAGE_ROLLBACK');}return value;};
  }return fn(t);
 },stores);
 try{
  const result=await f.session.run(handle);assert.equal(reached,true);assert.equal(result.state,'PARTIAL');assert.equal(result.facets.find(x=>x.facet==='filter').reason,'STORAGE_FAILED');
  assert.deepEqual(await snapshot(f.s),before,'the actual failed Filter transaction rolls back all stores');
 }finally{f.s.repository.transaction=transaction;}
 assert.equal(f.calls.length,1);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.decoded,1);assert.equal(f.filterState.released.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
 return {handle,before,transaction};
}

for(const action of ['retry-before-expiry','expiry-next-access','clock-rollback','idle-revoke','idle-dispose'])test('retained storage continuation lifecycle: '+action,async t=>{
 let monotonic=0;if(action==='clock-rollback')t.mock.method(performance,'now',()=>monotonic);
 const start=Date.parse('2026-10-18T00:00:00Z');t.mock.timers.enable({apis:['Date','setTimeout'],now:start});
 const f=await fixture();try{
  const {handle,before,transaction}=await failedLocalContinuation(f),priorCalls=f.calls.length,priorDecodes=f.filterState.decoded;
  if(action==='retry-before-expiry'){
   t.mock.timers.tick(60000);assert.equal(f.filterState.released.length,0);
   const result=await f.session.run(handle);assert.equal(result.state,'COMMITTED');assert.equal((await filterAck(f)).length,1);assert.equal(await visible(f),false);assert.equal(f.filterState.released.length,1);const committed=await snapshot(f.s);t.mock.timers.tick(600001);assert.deepEqual(await snapshot(f.s),committed);assert.equal(f.filterState.released.length,1,'completed jobs cancel idle expiry cleanup');
  }else{
   const expires=action==='expiry-next-access';
   t.mock.timers.tick(expires?599999:60000);await Promise.resolve();
   assert.equal(f.filterState.released.length,0,'valid retained storage continuation remains available before expiry');
   if(action==='clock-rollback'){t.mock.method(Date,'now',()=>start-600000);monotonic=600000;t.mock.timers.tick(540000);assert.ok(Date.now()<start);assert.equal(f.filterState.released.length,1,'wall-clock rollback cannot extend the captured monotonic lifetime');}
   if(expires){t.mock.timers.tick(1);await Promise.resolve();assert.equal(Date.now(),start+600000);assert.equal(f.filterState.released.length,1,'processing expiry must retire the retained rollback handle while idle, before another owner read');}
   assert.equal(f.calls.length,priorCalls);assert.equal(f.filterState.decoded,priorDecodes);assert.deepEqual(await snapshot(f.s),before);
   if(action==='idle-revoke'){f.contextAbort.abort();assert.equal(f.filterState.released.length,1,'host revocation retires the handle synchronously without another run');}
   if(action==='idle-dispose'){f.session.dispose();assert.equal(f.filterState.released.length,1,'host disposal retires the handle synchronously without another run');}
   let bodyReads=0;
   f.s.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{
    for(const method of ['get','all']){const read=tx[method].bind(tx);tx[method]=(...args)=>{if(['records','blocks','thoughts'].includes(args[0]))bodyReads++;return read(...args);};}return fn(tx);
   },stores);
   try{assert.equal((await f.session.run(handle)).state,'UNAVAILABLE');}finally{f.s.repository.transaction=transaction;}
   assert.equal(bodyReads,0,'expired continuation cannot acquire Input, Source or Entry body rows');assert.equal(f.filterState.released.length,1);assert.equal((await filterAck(f)).length,0);assert.deepEqual(await snapshot(f.s),before);assert.equal(await visible(f),true);
   f.contextAbort.abort();f.session.dispose();t.mock.timers.tick(600001);assert.equal(f.filterState.released.length,1,'expiry and late cleanup are idempotent');
  }
  assert.equal(f.calls.length,priorCalls,'no second physical request');assert.equal(f.filterState.decoded,priorDecodes,'no second response decode');
 }finally{f.session.dispose();await f.s.repository.close();t.mock.timers.reset();}
});
