import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
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
  const response={accepted:true,operationReceiptId:'synthetic-physical-'+r.childOperationId,fixture:{binding:{logicalJobId:r.logicalJobId,childOperationId:r.childOperationId,operationReceiptId:'synthetic-physical-'+r.childOperationId},topicAssessment:proposed,contextProposal:{operation:'ADD',card:'info',body:'PRIVATE_CONTEXT_BODY '+calls.length,section:'Synthetic maintenance',inputIds:r.coverage.filter(u=>u.facet==='context').map(u=>JSON.parse(u.key)[1])},token:'PRIVATE_PROVIDER_BODY '+calls.length}};const actual=JSON.parse(JSON.stringify(response));responses.push(actual);return actual;
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
    for(const u of units){const inputId=JSON.parse(u.key)[1],topics=await read(f.s,'topics');let matched;
     for(const topic of topics){const scope=await readContextTopicScope(f.s,{topicId:topic.id});if(scope.available&&scope.scope.inputIds.includes(inputId)){matched={topic,scope};break;}}
     assert.ok(matched,'real Topic membership required');const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:matched.topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:matched.scope.binding,expectedRemovalSequence:p.lastRemovalSequence});
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

for(const tier of ['free','pro'])test('actual '+tier+' typed domain commit shares each original-owner transaction with its exact ACK',async()=>{
 const f=await fixture({tier}),source=await Promise.all(['records','blocks','inputStates'].map(n=>read(f.s,n))),h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'COMMITTED',JSON.stringify(r));nonAuthority(r);assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,1);assert.equal(f.state.contextOperations,1);assert.equal((await read(f.s,'topics')).length,1);assert.equal((await read(f.s,'thoughts')).length,1);assert.equal((await read(f.s,'placements')).length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0].body,'PRIVATE_CONTEXT_BODY 1');assert.equal((await ack(f)).length,2);
 const receipts=await read(f.s,'organizerUsage');assert.equal(receipts.length,1);assert.equal(receipts[0].attemptCount,1);assert.equal(receipts[0].state,'COMMITTED');assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).access.global.enabled,false);assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(n=>read(f.s,n))),source);
 const durable=await snapshot(f.s);assert.doesNotMatch(JSON.stringify([durable.organizerJobs,durable.organizerUsage,durable.organizerWorkItems]),/PRIVATE_CONTEXT_BODY|PRIVATE_PROVIDER_BODY/);
 const before=await snapshot(f.s),writes=f.s.repository.metrics.writes;assert.equal((await f.session.run(h)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,1);f.session.dispose();assert.equal((await f.session.run(h)).state,'UNAVAILABLE');
});

test('37 actual Inputs become two physical children, real per-child decisions and complete domain coverage',async()=>{
 const f=await fixture({inputs:37}),h=await f.session.prepare(options);assert.equal(h.childCount,2);const r=await f.session.run(h);assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,2);assert.equal((await ack(f)).length,74);assert.equal((await read(f.s,'thoughts')).length,37);assert.equal((await read(f.s,'topics')).length,2);assert.equal(f.state.topicAssessments,2);assert.equal(f.state.contextOperations,2);
 const items=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items;assert.ok(items.length>=3);assert.deepEqual([...new Set(items.map(i=>i.body))].sort(),['PRIVATE_CONTEXT_BODY 1','PRIVATE_CONTEXT_BODY 2']);assert.equal(new Set(f.calls.flatMap(c=>c.coverage.map(u=>JSON.stringify(u)))).size,74);
 assert.equal((await read(f.s,'organizerUsage')).every(r=>r.attemptCount===1&&r.state==='COMMITTED'),true);nonAuthority(r);
});

test('no-delta opportunity and forged/passive/disposed handles never create a provider call',async()=>{
 const f=await fixture();await f.session.run(await f.session.prepare(options));const before=await snapshot(f.s),h=await f.session.prepare(options);assert.equal(h.state,'NO_DELTA');assert.equal((await f.session.run(h)).state,'NO_DELTA');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);assert.equal((await f.session.run({...h})).state,'UNAVAILABLE');f.session.dispose();assert.equal((await f.session.run(h)).state,'UNAVAILABLE');
});

for(const mode of ['throw','empty'])test('physical '+mode+' is unknown, cannot decode/ACK/retry or reset on a fresh session',async()=>{
 const f=await fixture({providerMode:mode}),h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,0);assert.equal(f.state.contextOperations,0);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'topics')).length,0);const before=await snapshot(f.s);assert.equal((await f.session.run(h)).state,'OUTCOME_UNKNOWN');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);
 const restart=new LocalMaintenanceSession(f.s,f.constructor),again=await restart.prepare(options);assert.equal((await restart.run(again)).state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,1);nonAuthority(r);
});

for(const mode of ['missing','invalid','swap','swap-context'])test('same-child response '+mode+' cannot produce false domain ACK',async()=>{
 const f=await fixture({adapterMode:mode}),h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'PARTIAL');const rows=await ack(f);assert.equal(rows.filter(x=>x.unit.facet==='context').length,0);if(mode!=='swap-context')assert.equal(rows.length,0);assert.equal(f.calls.length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);nonAuthority(r);
});

test('actual returned proposal mutation after capture cannot alter the published domain data',async()=>{
 const f=await fixture();f.state.topicHook=()=>{f.responses[0].fixture.topicAssessment.name='Unrelated late name';f.responses[0].fixture.contextProposal.body='Unrelated late body';};
 const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'COMMITTED');assert.equal((await read(f.s,'topics'))[0].name,'Synthetic maintenance object 1');assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0].body,'PRIVATE_CONTEXT_BODY 1');assert.equal(f.calls.length,1);
});

test('duplicate run/prepare clicks use one original job and one physical response',async()=>{
 const f=await fixture(),[a,b]=await Promise.all([f.session.prepare(options),f.session.prepare(options)]);assert.equal(a,b);const pending=f.session.run(a);assert.equal(f.session.run(b),pending);assert.equal((await pending).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await read(f.s,'organizerJobs')).length,1);
});

test('ACKs acquired after batch read and before plan produce a real passive NO_DELTA handle',async()=>{
 const f=await fixture(),first=await f.session.prepare(options);let actualGrant;
 const window={async acquire(r){await f.session.run(first);return actualGrant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-later-window',reservationId:'synthetic-later-reservation',tier:'free',requestDigest:r.requestDigest,revocationSignal:new AbortController().signal});},isCurrent:r=>r===actualGrant};
 const second=new LocalMaintenanceSession(f.s,{...f.constructor,window}),h=await second.prepare({...options,routeVersion:'synthetic-maintenance-new-route'});
 assert.equal(h.state,'NO_DELTA');assert.equal(h.jobId,null);const before=await snapshot(f.s),r=await second.run(h);assert.equal(r.state,'NO_DELTA');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);assert.equal((await read(f.s,'organizerJobs')).length,1);
});

for(const capability of ['provider','service','window','authority'])test('missing '+capability+' refuses before any physical call or new job',async()=>{
 const f=await fixture(),before=await snapshot(f.s),session=new LocalMaintenanceSession(f.s,{...f.constructor,[capability]:null});await assert.rejects(session.prepare(options),{code:'UNAVAILABLE'});assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,0);
});

test('actual remote descriptor and caller-supplied window/tier flags cannot activate a route',async()=>{
 const f=await fixture(),before=await snapshot(f.s);f.provider.describe=()=>({providerId:'synthetic',version:'1',executionKind:'remote'});await assert.rejects(f.session.prepare(options),{code:'UNAVAILABLE'});assert.equal(f.state.acquires,0);assert.deepEqual(await snapshot(f.s),before);
 await assert.rejects(f.session.prepare({...options,tier:'pro',eligible:true,now:Date.now()}),{code:'INVALID_REQUEST'});assert.equal(f.calls.length,0);
});

test('opaque host opportunity cannot be changed or requalified by matching body fields',async()=>{
 const f=await fixture(),h=await f.session.prepare(options);f.state.windowCurrent=false;assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal(f.calls.length,0);
 const g=await fixture(),plain=g.window.acquire;g.window.acquire=async r=>({...await plain(r)});await assert.rejects(g.session.prepare(options),{code:'UNAVAILABLE'});assert.equal(g.calls.length,0);
});

test('processing revocation after physical response creates no domain publication or retry',async()=>{
 const f=await fixture(),h=await f.session.prepare(options);f.state.topicHook=()=>{f.processing.allowed=false;};const r=await f.session.run(h);assert.equal(r.state,'UNAVAILABLE');assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'topics')).length,0);assert.equal(f.calls.length,1);f.processing.allowed=true;assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal((await ack(f)).length,0);assert.equal(f.calls.length,1);
});

function corruptWrite(f,predicate,action,{contextOnly=true}={}){
 const original=f.s.repository.transaction.bind(f.s.repository),record={reached:false,before:null};
 f.s.repository.transaction=async(write,fn,stores)=>{
  const targeted=write&&(!contextOnly||f.state.contextOperations>0)&&!record.reached;
  if(targeted)record.before=await original(false,async t=>{const out={};for(const n of f.s.repository.stores)out[n]=await t.all(n);return out;});
  return original(write,async t=>{if(targeted){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const r=await put(name,row,...args);if(!record.reached&&predicate(name,row)){record.reached=true;action(t);}return r;};}return fn(t);},stores);
 };return {...record,record,restore:()=>{f.s.repository.transaction=original;}};
}
const stages={item:(n,r)=>n==='meta'&&r.id===CONTEXT_CARDS_ROW,receipt:(n,r)=>n==='operationReceipts'&&r.namespace==='context-maintenance',ack:(n,r)=>n==='organizerWorkItems'&&r.state==='ACKNOWLEDGED'&&r.unit.facet==='context',usage:(n,r)=>n==='organizerUsage'&&r.state==='COMMITTED',job:(n,r)=>n==='organizerJobs'&&r.state==='COMMITTED',generation:(n,r)=>n==='meta'&&r.id==='backup-data-generation'};

for(const [stage,predicate]of Object.entries(stages))for(const fault of ['storage','window-revoke'])test('Context '+fault+' after '+stage+' rolls back its entire original-owner transaction and ACK',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),hook=corruptWrite(f,predicate,()=>{if(fault==='storage')throw Error('PRIVATE_PROVIDER_BODY storage');f.clock.abort();});
 const r=await f.session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,fault==='storage'?'PARTIAL':'UNAVAILABLE');assert.deepEqual(await snapshot(f.s),hook.record.before,'domain/receipt/ACK/dirty/job/generation all roll back');assert.equal((await ack(f)).filter(a=>a.unit.facet==='topic').length,1);assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'topics')).length,1);assert.equal(f.calls.length,1);
 if(fault==='storage'){const resumed=await f.session.run(h);assert.equal(resumed.state,'COMMITTED',JSON.stringify(resumed));assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,1);assert.equal(f.state.contextOperations,1);}else assert.equal((await f.session.run(h)).state,'UNAVAILABLE');nonAuthority(r);
});

for(const stage of ['topic','entry','receipt','ack','generation'])test('Topic storage fault after '+stage+' leaves its real domain and ACK absent; same response resumes',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),selector=(n,r)=>stage==='topic'?n==='topics':stage==='entry'?n==='thoughts':stage==='receipt'?n==='operationReceipts'&&r.namespace==='thought-library'&&r.result?.decisionVersion==='synthetic-maintenance-annotations-1':stage==='ack'?n==='organizerWorkItems'&&r.unit?.facet==='topic':n==='meta'&&r.id==='backup-data-generation'&&f.state.topicAssessments>0;
 const hook=corruptWrite(f,selector,()=>{throw Error('PRIVATE_PROVIDER_BODY storage');},{contextOnly:false}),r=await f.session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,'PARTIAL');assert.equal((await read(f.s,'topics')).length,0);assert.equal((await read(f.s,'thoughts')).length,0);assert.equal((await ack(f)).length,0);assert.deepEqual(await snapshot(f.s),hook.record.before);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,1);
});

test('second Context group failure preserves prior real group; continuation never repeats its write or provider',async()=>{
 const f=await fixture({inputs:4,groupSize:2}),h=await f.session.prepare(options);let receipts=0;
 const hook=corruptWrite(f,(n,r)=>n==='operationReceipts'&&r.namespace==='context-maintenance'&&++receipts===2,()=>{throw Error('PRIVATE_PROVIDER_BODY storage');}),r=await f.session.run(h);hook.restore();assert.equal(r.state,'PARTIAL');assert.equal(hook.record.reached,true);assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,2);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);const first=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0],resumed=await f.session.run(h);assert.equal(resumed.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.topicAssessments,1);assert.equal(f.state.contextOperations,1);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===first.id),first);assert.equal((await ack(f)).length,8);
});

test('old standalone Context receipt fastreturn is not this job ACK',async()=>{
 const f=await fixture();f.state.contextHook=async(response,metadata,binding)=>{
  f.state.contextHook=null;const adapted=await f.service.responseAdapter.context(response,metadata,binding);const c=adapted.value[0].change;await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,c);f.service.responseAdapter.context=async()=>adapted;
 };
 // Constructor captured the adapter function; change its result through the
 // fixture's private hook rather than replacing the session's capability.
 let historical=null;const original=f.service.responseAdapter.context;
 f.service.responseAdapter.context=async(...a)=>{if(historical)return historical;f.state.contextHook=null;historical=await original(...a);await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,historical.value[0].change);return historical;};
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service}),r=await session.run(await session.prepare(options));assert.equal(r.state,'PARTIAL');assert.ok(r.facets.some(x=>x.reason==='DOMAIN_REPLAY_UNACKNOWLEDGED'));assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);assert.equal(f.calls.length,1);
});


for(const stop of ['timeout','dispose','window-revoke'])test('bounded '+stop+' settles an ignored-signal provider; late actual proposal never decodes or ACKs',async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;
 let release,entered,physical,controls;const admitted=new Promise(r=>{entered=r;});f.state.held=new Promise(r=>{release=r;});
 const execute=f.provider.execute.bind(f.provider);f.provider.execute=(request,execution)=>{controls=execution;physical=execute(request);entered();return physical;};
 const h=await f.session.prepare(options),running=f.session.run(h);await Promise.race([admitted,running.then(result=>{assert.fail('Maintenance settled before provider entry: '+result.state);})]);
 assert.equal(controls.timeoutMs,25);assert.ok(controls.signal instanceof AbortSignal);assert.equal(controls.signal.aborted,false);
 if(stop==='dispose')f.session.dispose();else if(stop==='window-revoke')f.clock.abort();
 const result=await running;assert.equal(result.state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');nonAuthority(result);assert.equal(controls.signal.aborted,true);
 const rows=await read(f.s,'organizerUsage');assert.equal(rows.length,1);assert.equal(rows[0].attemptCount,1);assert.equal(rows[0].state,'OUTCOME_UNKNOWN');assert.equal(rows[0].spendState,'RESERVATION_RETAINED');assert.equal((await ack(f)).length,0);
 const before=await snapshot(f.s),writes=f.s.repository.metrics.writes;release();await physical;await Promise.resolve();
 assert.equal(f.responses.length,1,'actual late complete proposal returned');assert.equal(f.state.topicAssessments,0);assert.equal(f.state.contextOperations,0);assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,1);
 assert.equal((await f.session.run(h)).state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');
 if(stop==='timeout'){const restart=new LocalMaintenanceSession(f.s,f.constructor);assert.equal((await restart.run(await restart.prepare(options))).state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,1);assert.deepEqual(await snapshot(f.s),before);}
});

test('41 actual independent Source Inputs require a third partition and refuse without consuming a window or truncating coverage',async()=>{
 const f=await fixture({inputs:41}),before=await snapshot(f.s);assert.equal(before.records.length,41);assert.equal(before.blocks.length,41);
 await assert.rejects(f.session.prepare({...options,limit:50}),{code:'BUDGET_EXCEEDED'});assert.equal(f.state.acquires,0);assert.equal(f.calls.length,0);assert.deepEqual(await snapshot(f.s),before);assert.equal((await read(f.s,'organizerJobs')).length,0);assert.equal((await ack(f)).length,0);
});

for(const owner of ['window','processing'])test('dispose aborts physical Maintenance even when '+owner+' listener cleanup throws',async()=>{
 const f=await fixture();let release,entered,controls,physical;
 const admitted=new Promise(resolve=>{entered=resolve;});f.state.held=new Promise(resolve=>{release=resolve;});
 const execute=f.provider.execute.bind(f.provider);f.provider.execute=(request,execution)=>{controls=execution;physical=execute(request);entered();return physical;};
 const handle=await f.session.prepare(options),running=f.session.run(handle);
 await Promise.race([admitted,running.then(result=>assert.fail('Maintenance settled before entry: '+result.state))]);
 const signal=(owner==='window'?f.clock:f.contextAbort).signal,remove=signal.removeEventListener,problem=Error('synthetic cleanup failure');
 signal.removeEventListener=()=>{throw problem;};
 try{
  assert.throws(()=>f.session.dispose(),error=>error===problem);
  assert.equal(controls.signal.aborted,true,'physical work must be aborted before cleanup failure escapes');
 }finally{signal.removeEventListener=remove;release();await physical;await running;}
 assert.equal((await f.session.run(handle)).state,'UNAVAILABLE');assert.equal((await ack(f)).length,0);
 assert.equal(f.state.topicAssessments,0);assert.equal(f.state.contextOperations,0);assert.equal(f.calls.length,1);
 assert.doesNotThrow(()=>f.session.dispose(),'failed cleanup cannot retain live job state');
});

test('completed durable Maintenance remains committed when final listener cleanup fails',async()=>{
 const f=await fixture(),signal=f.clock.signal,remove=signal.removeEventListener,add=signal.addEventListener;
 let retiredListener,cleanupCalls=0;signal.addEventListener=function(type,listener,...args){retiredListener=listener;return add.call(this,type,listener,...args);};
 let result,handle;try{handle=await f.session.prepare(options);}finally{signal.addEventListener=add;}
 assert.equal(typeof retiredListener,'function');
 signal.removeEventListener=function(type,listener,...args){if(listener===retiredListener){cleanupCalls++;throw Error('synthetic final cleanup failure');}return remove.call(this,type,listener,...args);};
 try{result=await f.session.run(handle);}finally{signal.removeEventListener=remove;}
 assert.equal(cleanupCalls,1);assert.equal((await ack(f)).length,2);assert.equal((await read(f.s,'organizerUsage'))[0].state,'COMMITTED');
 assert.equal(result.state,'COMMITTED');nonAuthority(result);
 const before=await snapshot(f.s),writes=f.s.repository.metrics.writes;
 assert.equal((await f.session.run(handle)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,1);
 signal.removeEventListener=()=>{throw Error('completed job was retained');};
 try{assert.doesNotThrow(()=>f.session.dispose());}finally{signal.removeEventListener=remove;}
});
