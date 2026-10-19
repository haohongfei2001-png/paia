import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenancePayload} from '../core/ai-usage/maintenance-payload.js';
import {createMaintenanceServiceResponseAdapter,MAINTENANCE_SERVICE_RESPONSE_SCHEMA} from '../core/ai-usage/maintenance-service-response.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {readMaintenanceBatch,unsupportedMaintenanceCoverage} from '../core/ai-usage/maintenance-batch.js';
import {TopicFormationService} from '../core/topic-formation.js';
import {authoredContextEvidence} from '../core/context-authored-entry.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {CONTEXT_CARDS_ROW,ContextCardsService} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup,capture,inputEdit} from './harness/thought-m1.mjs';
import {TopicIdentityRetrieval} from '../core/topic-retrieval.js';
import {readFormationEvidence} from '../core/topic-formation-evidence.js';
import {assessment,parameters,citation} from './harness/topic-03.mjs';

const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const snapshot=s=>s.repository.transaction(false,async t=>{const all={};for(const n of s.repository.stores)all[n]=await t.all(n);return all;});
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
function nonAuthority(r){assert.equal(r.dispatchAllowed,false);assert.equal(r.financialAuthority,false);assert.doesNotMatch(JSON.stringify(r),/PRIVATE_CONTEXT_BODY|PRIVATE_PROVIDER_BODY/);}

async function fixture({inputs=1,tier='free',providerMode='valid',adapterMode='valid',groupSize=16}={}){
 const f=await setup(OrganizerStore);await f.s.setFilterMode('off');for(let i=1;i<inputs;i++)await f.s.capture(capture((await f.s.status()).epoch,'synthetic-maintenance-'+i,'Synthetic independent maintenance body '+i));
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
  const response={topicResult:{outcome:'create',topicIds:['untrusted-provider-id']},accepted:true,operationReceiptId:'synthetic-physical-'+r.childOperationId,fixture:{binding:{logicalJobId:r.logicalJobId,childOperationId:r.childOperationId,operationReceiptId:'synthetic-physical-'+r.childOperationId},topicAssessment:proposed,contextProposal:{operation:'ADD',card:'info',body:'PRIVATE_CONTEXT_BODY '+calls.length,section:'Synthetic maintenance',inputIds:r.coverage.filter(u=>u.facet==='context').map(u=>JSON.parse(u.key)[1])},token:'PRIVATE_PROVIDER_BODY '+calls.length}};const actual=JSON.parse(JSON.stringify(response));responses.push(actual);return actual;
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
 const constructor={provider,service,window,authority,processing:materialProcessing},session=new LocalMaintenanceSession(f.s,constructor);
 return {...f,session,constructor,provider,service,window,authority,materialProcessing,verifier,caller,clock,contextAbort,permission,processing,state,calls,responses,decoded};
}

test('Context receives immutable actual same-child Topic result only after exact ACK',async()=>{
 const f=await fixture(),observed=[];
 f.state.contextHook=async(_response,metadata,binding)=>{
  assert.deepEqual(Object.keys(metadata.topicResult).sort(),['outcome','topicIds']);
  assert.equal(metadata.topicResult.outcome,'create');assert.ok(Object.isFrozen(metadata.topicResult));assert.ok(Object.isFrozen(metadata.topicResult.topicIds));
  assert.throws(()=>metadata.topicResult.topicIds.push('forged'),TypeError);
  const job=await read(f.s,'organizerJobs',binding.logicalJobId),index=job.childIds.indexOf(binding.childOperationId),units=job.childCoverage[index].filter(u=>u.facet==='topic');
  const acknowledgements=await ack(f);for(const u of units)assert.ok(acknowledgements.some(r=>r.unit.key===u.key&&r.unit.facet==='topic'));
  assert.deepEqual(metadata.topicResult.topicIds,(await read(f.s,'topics')).map(t=>t.id));assert.notDeepEqual(metadata.topicResult.topicIds,['untrusted-provider-id']);observed.push(structuredClone(metadata.topicResult));
 };
 const h=await f.session.prepare(options);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(observed.length,1);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(observed.length,1);assert.equal(f.calls.length,1);f.session.dispose();
});

test('rolled-back Topic ACK publishes no Context result and original response supports one safe local retry',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false,contextSeen=0;
 f.state.contextHook=async(_r,m)=>{contextSeen++;assert.equal(m.topicResult.outcome,'create');assert.deepEqual(m.topicResult.topicIds,(await read(f.s,'topics')).map(t=>t.id));};
 f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const result=await put(n,row,...more);if(!aborted&&n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){aborted=true;throw Error('SYNTHETIC Topic ACK rollback');}return result;};}return fn(t);},...rest);
 try{const first=await f.session.run(h);assert.equal(first.state,'PARTIAL');assert.equal(aborted,true);assert.equal(contextSeen,0);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'topics')).length,0);const second=await f.session.run(h);assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal(contextSeen,1);assert.equal(f.calls.length,1);}finally{f.s.repository.transaction=tx;f.session.dispose();}
});

test('lost Topic transaction acknowledgement cannot be reconstructed from durable rows or prepared schema',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),tx=f.s.repository.transaction.bind(f.s.repository);let lost=false,contextSeen=0;
 f.state.contextHook=async(_r,m)=>{contextSeen++;assert.equal(Object.hasOwn(m,'topicResult'),false);throw Object.assign(Error('SYNTHETIC missing trusted result'),{code:'STALE_BASE'});};
 f.s.repository.transaction=async(write,fn,...rest)=>{let topicAck=false;const result=await tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const value=await put(n,row,...more);if(n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic')topicAck=true;return value;};}return fn(t);},...rest);if(topicAck&&!lost){lost=true;throw Object.assign(Error('SYNTHETIC transaction acknowledgement lost'),{code:'STORAGE_FAILED'});}return result;};
 try{assert.equal((await f.session.run(h)).state,'PARTIAL');assert.equal(lost,true);assert.equal(contextSeen,0);assert.equal((await ack(f)).filter(r=>r.unit.facet==='topic').length,1);assert.equal((await f.session.run(h)).state,'PARTIAL');assert.equal(contextSeen,1);assert.equal((await ack(f)).filter(r=>r.unit.facet==='context').length,0);assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,1);}finally{f.s.repository.transaction=tx;f.session.dispose();}
});

test('two paid children expose only their own actual Topic commit even when both Topics exist before Context',async()=>{
 const f=await fixture({inputs:37}),seen=new Map();f.state.contextHook=async(_r,m,binding)=>{
  assert.equal((await read(f.s,'topics')).length,2);assert.equal(m.topicResult.topicIds.length,1);const id=m.topicResult.topicIds[0],members=(await read(f.s,'placements')).filter(p=>p.topicId===id),entries=await read(f.s,'thoughts');
  assert.deepEqual(members.map(p=>entries.find(e=>e.id===p.entryId).workingInputId).sort(),m.inputIds);seen.set(binding.childOperationId,id);
 };
 const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(seen.size,2);assert.equal(new Set(seen.values()).size,2);assert.equal(f.calls.length,2);f.session.dispose();
});

for(const defect of ['fake-defer-properties','forged-groups'])test('ordinary adapter '+defect+' cannot manufacture a DEFER or drop Context coverage',async()=>{
 const f=await fixture();f.state.contextHook=async(_r,m,binding)=>{if(defect==='fake-defer-properties')throw Object.assign(Error('DEFER'),{binding,facet:'context',units:m.units,retryCondition:'CONTEXT_MAPPING_UNAVAILABLE',groups:[]});};
 if(defect==='forged-groups'){f.session.dispose();f.service.responseAdapter.context=async(_r,m,binding)=>({binding,value:[{units:m.units,operation:'DEFER',change:{}}]});f.session=new LocalMaintenanceSession(f.s,f.constructor);}
 const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(r=>r.unit.facet==='context').length,0);assert.equal((await read(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED').length,0);assert.equal((await f.session.run(h)).state,'PARTIAL');assert.equal(f.calls.length,1);f.session.dispose();
});
async function sourceAdapterFixture({mode='mixed',inputs=2}={}){
 const f=await fixture({inputs}),source=createMaintenanceServiceResponseAdapter(),foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),execute=f.provider.execute,decodeErrors=[];let contextDecodes=0;
 f.session.dispose();let existingTopicId=null;if(mode==='topic-defer-add'){const owner=new TopicFormationService(f.s,{resolveProcessing:f.service.topic.resolveProcessing,parameters,decision:{version:'synthetic-existing-topic',assess:view=>assessment(view,{entries:view.inputs.map(i=>({span:citation(i),type:'idea',additional:[]}))})}}),ids=(await read(f.s,'inputStates')).map(i=>i.id);existingTopicId=(await owner.commit(await owner.prepare({scope:ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),operationId:op()}))).topicIds[0];}f.service.responseAdapter={...source.adapter,topic:async(...args)=>{try{return await source.adapter.topic(...args);}catch(error){decodeErrors.push({code:error.code,stack:error.stack});throw error;}},context:async(...args)=>{contextDecodes++;try{return await source.adapter.context(...args);}catch(error){decodeErrors.push({code:error.code,stack:error.stack});throw error;}}};
 f.provider.execute=async request=>{
  const old=await execute(request),assessment=old.fixture.topicAssessment,topic={status:'ASSESS',reason:'',...assessment,boundaryKey:'',candidateRef:'',section:{kind:'default',sectionId:'',name:'',aspectReason:'unknown',aspectCitations:[],returnReason:'none',returnCitations:[],relations:[]},entries:assessment.entries.map(e=>({...e,entryId:e.entryId||''}))};
  const citations=[],ref=c=>{let i=citations.findIndex(v=>JSON.stringify(v)===JSON.stringify(c));if(i<0){i=citations.length;citations.push(c);}return i;};for(const field of ['substance','boundary','returnValue','continuity'])topic[field]={...topic[field],citations:topic[field].citations.map(ref)};topic.evidence=topic.evidence.map(ref);topic.relations=topic.relations.map(r=>({...r,citations:r.citations.map(ref)}));topic.entries=topic.entries.map(e=>({entryId:e.entryId,type:e.type,span:ref(e.span)}));topic.additional=[];if(['both-defer','topic-defer-add'].includes(mode)){citations.length=0;Object.assign(topic,{status:'DEFER',reason:'SYNTHETIC bounded Topic uncertainty',kind:'unresolved',name:'',substance:{reason:'empty',citations:[]},boundary:{reason:'unknown',citations:[]},returnValue:{reason:'none',citations:[]},continuity:{reason:'unknown',citations:[]},evidence:[],relations:[],entries:[],additional:[]});}
  const units=request.coverage.filter(u=>u.facet==='context'),groups=units.map((u,i)=>({operation:mode==='mixed'&&i>0?'DEFER':'ADD',reason:mode==='mixed'&&i>0?'SYNTHETIC insufficient existing Item state':'',unitKeys:[u.key],topicId:mode==='mixed'&&i>0?'':existingTopicId||'$result',itemId:'',expectedRevision:0,card:'info',body:mode==='mixed'&&i>0?'':'Synthetic qualified source Context '+i,section:mode==='mixed'&&i>0?'':'Synthetic source',temporal:{present:false,temporalScope:'',uncertainty:'',validUntil:''}}));
  source.registerChild(foundation,request,()=>!f.clock.signal.aborted&&!f.contextAbort.signal.aborted&&f.state.processing&&f.state.windowCurrent);
  const result={accepted:true,operationReceiptId:old.operationReceiptId,value:{version:1,logicalJobId:request.logicalJobId,childOperationId:request.childOperationId,citations,topic,context:['all-defer','both-defer'].includes(mode)?{status:'DEFER',reason:'SYNTHETIC qualified request has no existing Item baseline',groups:[]}:{status:'APPLY',reason:'',groups},filter:{status:'NONE',reason:'',decisions:[]}}};
  const check=(s,v,path)=>{if(s.type==='object'){assert.deepEqual(Object.keys(v).sort(),s.required.slice().sort(),path);for(const k of s.required)check(s.properties[k],v[k],path+'.'+k);}else if(s.type==='array'){assert.ok(v.length>=s.minItems&&v.length<=s.maxItems,path);v.forEach((x,i)=>check(s.items,x,path+'['+i+']'));}else if(s.type==='string')assert.ok(typeof v==='string'&&[...v].length>=s.minLength&&[...v].length<=s.maxLength&&(!s.enum||s.enum.includes(v)),path+':'+JSON.stringify(v));else if(s.type==='integer')assert.ok(Number.isSafeInteger(v)&&v>=s.minimum&&v<=s.maximum,path);else if(s.type==='boolean')assert.equal(typeof v,'boolean',path);};try{check(MAINTENANCE_SERVICE_RESPONSE_SCHEMA,result.value,'response');}catch(error){decodeErrors.push({message:error.message});throw error;}return result;
 };
 f.session=new LocalMaintenanceSession(f.s,f.constructor);return {...f,source,decodeErrors,contextDecodes:()=>contextDecodes};
}
for(const mode of ['mixed','all-defer'])test('source-owned '+mode+' preserves exact pending Context obligations and truthful idempotent DEFER progress',async()=>{
 const f=await sourceAdapterFixture({mode});try{
  const h=await f.session.prepare(options),r=await f.session.run(h),expected=mode==='mixed'?1:2;assert.equal(r.state,'PARTIAL',JSON.stringify({r,errors:f.decodeErrors}));assert.equal(r.remainingWork,true);assert.equal(r.deferredUnits,expected,JSON.stringify({r,errors:f.decodeErrors}));assert.equal(f.calls.length,1);assert.equal(f.contextDecodes(),1);
  const work=await read(f.s,'organizerWorkItems'),defers=work.filter(x=>x.state==='DEFERRED');assert.equal(defers.length,expected);assert.ok(defers.every(x=>x.unit.facet==='context'&&x.retryCondition==='CONTEXT_MAPPING_UNAVAILABLE'));assert.equal(work.filter(x=>x.state==='ACKNOWLEDGED'&&x.unit.facet==='context').length,mode==='mixed'?1:0);assert.equal(work.filter(x=>x.state==='ACKNOWLEDGED'&&x.unit.facet==='topic').length,2);
  const context=await read(f.s,'meta',CONTEXT_CARDS_ROW);assert.equal(context?.items?.length||0,mode==='mixed'?1:0);const second=await f.session.run(h);assert.equal(second.state,'PARTIAL');assert.equal(second.deferredUnits,expected);assert.equal(f.contextDecodes(),1);assert.equal(f.calls.length,1);assert.deepEqual((await read(f.s,'organizerWorkItems')).filter(x=>x.state==='DEFERRED'),defers);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),context);
 }finally{f.session.dispose();f.source.dispose();}
});
test('source mixed DEFER retains validated supported groups across rollback without repeating Topic, decoding or physical calls',async()=>{
 const f=await sourceAdapterFixture(),h=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let failed=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...extra)=>{const value=await put(name,row,...extra);if(!failed&&name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='context'){failed=true;throw Error('SYNTHETIC supported Context rollback');}return value;};}return fn(t);},...rest);
 try{const first=await f.session.run(h);assert.equal(failed,true);assert.equal(first.state,'PARTIAL');assert.equal(first.deferredUnits,1);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);const second=await f.session.run(h);assert.equal(second.state,'PARTIAL');assert.equal(second.deferredUnits,1);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,1);assert.equal((await ack(f)).filter(x=>x.unit.facet==='topic').length,2);assert.equal(f.calls.length,1);assert.equal(f.contextDecodes(),1);}finally{f.s.repository.transaction=transaction;f.session.dispose();f.source.dispose();}
});
for(const mode of ['both-defer','topic-defer-add'])test('source '+mode+' survives original assess fail-closed without false ACK or suppressing independent Context',async()=>{
 const f=await sourceAdapterFixture({mode});try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'PARTIAL',JSON.stringify({r,errors:f.decodeErrors}));assert.equal(r.deferredUnits,mode==='both-defer'?4:2,JSON.stringify(r));assert.equal(r.facets.find(x=>x.facet==='topic')?.state,'DEFERRED');const acknowledgements=await ack(f);assert.equal(acknowledgements.filter(x=>x.unit.facet==='topic').length,0);assert.equal(acknowledgements.filter(x=>x.unit.facet==='context').length,mode==='both-defer'?0:2);assert.equal((await read(f.s,'topics')).length,mode==='both-defer'?0:1);const again=await f.session.run(h);assert.equal(again.deferredUnits,r.deferredUnits);assert.equal(f.calls.length,1);assert.equal(f.contextDecodes(),1);}finally{f.session.dispose();f.source.dispose();}
});
