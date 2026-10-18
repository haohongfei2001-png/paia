import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenancePayload} from '../core/ai-usage/maintenance-payload.js';
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


// Production checks both the timer and monotonic deadline. Advance their
// test clocks together so provider-entry and pre-entry expiry are distinct.
function deterministicClock(t){
 let monotonic=0;
 t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(performance,'now',()=>monotonic);
 return {tick(ms){monotonic+=ms;t.mock.timers.tick(ms);},advance(ms){monotonic+=ms;}};
}
for(const stop of ['timeout','dispose','window-revoke'])test('bounded '+stop+' settles an ignored-signal provider; late actual proposal never decodes or ACKs',async t=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;
 let release,entered,physical,controls;const admitted=new Promise(r=>{entered=r;});f.state.held=new Promise(r=>{release=r;});
 const execute=f.provider.execute.bind(f.provider);f.provider.execute=(request,execution)=>{controls=execution;physical=execute(request);entered();return physical;};
 const h=await f.session.prepare(options);const testClock=deterministicClock(t);const running=f.session.run(h);await Promise.race([admitted,running.then(result=>{assert.fail('Maintenance settled before provider entry: '+result.state);})]);
 assert.equal(controls.timeoutMs,25);assert.ok(controls.signal instanceof AbortSignal);assert.equal(controls.signal.aborted,false);
 testClock.tick(24);await Promise.resolve();assert.equal(controls.signal.aborted,false,'the original25ms budget is not exhausted at24ms');
 if(stop==='dispose')f.session.dispose();else if(stop==='window-revoke')f.clock.abort();else testClock.tick(1);
 const result=await running;assert.equal(result.state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');nonAuthority(result);assert.equal(controls.signal.aborted,true);
 const rows=await read(f.s,'organizerUsage');assert.equal(rows.length,1);assert.equal(rows[0].attemptCount,1);assert.equal(rows[0].state,'OUTCOME_UNKNOWN');assert.equal(rows[0].spendState,'RESERVATION_RETAINED');assert.equal((await ack(f)).length,0);
 const before=await snapshot(f.s),writes=f.s.repository.metrics.writes;release();await physical;await Promise.resolve();
 assert.equal(f.responses.length,1,'actual late complete proposal returned');assert.equal(f.state.topicAssessments,0);assert.equal(f.state.contextOperations,0);assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,1);
 assert.equal((await f.session.run(h)).state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');
 if(stop==='timeout'){const restart=new LocalMaintenanceSession(f.s,f.constructor);assert.equal((await restart.run(await restart.prepare(options))).state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,1);assert.deepEqual(await snapshot(f.s),before);}
});

test('the original25ms Maintenance deadline can expire during final authority before provider entry',async t=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;
 const testClock=deterministicClock(t);let armed=false,expired=false;
 const schedule=globalThis.setTimeout,resolve=f.materialProcessing.resolve;
 t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>{if(delay===25)armed=true;return schedule(callback,delay,...args);});
 f.materialProcessing.resolve=async(...args)=>{const result=await resolve(...args);if(armed&&!expired){expired=true;testClock.tick(24);assert.equal(f.calls.length,0);testClock.tick(1);}return result;};
 const session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare(options),result=await session.run(h);assert.equal(armed,true);assert.equal(expired,true);assert.equal(result.state,'OUTCOME_UNKNOWN');nonAuthority(result);assert.equal(f.calls.length,0,'expired pre-provider authority cannot dispatch');
 const rows=await read(f.s,'organizerUsage');assert.equal(rows.length,1);assert.equal(rows[0].attemptCount,1);assert.equal(rows[0].state,'OUTCOME_UNKNOWN');assert.equal(rows[0].spendState,'RESERVATION_RETAINED');assert.equal((await ack(f)).length,0);
 assert.equal((await session.run(h)).state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,0);assert.equal(f.state.topicAssessments,0);assert.equal(f.state.contextOperations,0);
});


test('independent: monotonic expiry in final authority also refuses entry with the timer still pending',async t=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;const testClock=deterministicClock(t);let armed=false,expired=false;
 const schedule=globalThis.setTimeout,resolve=f.materialProcessing.resolve;
 t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>{if(delay===25)armed=true;return schedule(callback,delay,...args);});
 f.materialProcessing.resolve=async(...args)=>{const result=await resolve(...args);if(armed&&!expired){expired=true;testClock.advance(24);assert.equal(f.calls.length,0);testClock.advance(1);}return result;};
 const session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare(options),result=await session.run(h);assert.equal(armed,true);assert.equal(expired,true);assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);
 const rows=await read(f.s,'organizerUsage');assert.equal(rows[0].attemptCount,1);assert.equal(rows[0].state,'OUTCOME_UNKNOWN');assert.equal(rows[0].spendState,'RESERVATION_RETAINED');
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

test('bounded Maintenance completion retains outstanding next-page work without redispatch',async()=>{
 const f=await fixture({inputs:2}),handle=await f.session.prepare({...options,limit:1});
 assert.equal(handle.complete,false);assert.ok(handle.nextCursor);assert.equal(handle.remainingWork,true);
 const result=await f.session.run(handle);assert.equal(result.state,'COMMITTED');assert.equal(result.remainingWork,true);assert.equal(result.complete,false);assert.equal(result.nextCursor,handle.nextCursor);
 assert.equal((await ack(f)).length,2);assert.equal(f.calls.length,1);
 const before=await snapshot(f.s);assert.deepEqual(await f.session.run(handle),{...result,facets:[]});assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);

});

async function restoredEntryFixture(){
 const f=await fixture(),input=(await f.s.snapshot()).library.blocks[0],scope=[{inputId:input.id,role:'primary',selectedFields:['body']}];
 const owner=new TopicFormationService(f.s,{resolveProcessing:f.service.topic.resolveProcessing,parameters,decision:{version:'synthetic-entry-setup',assess:view=>assessment(view)}});
 const made=await owner.commit(await owner.prepare({scope,operationId:op()})),id=made.entryIds[0];
 const current=await f.s.entry(id);await f.s.removeEntry({id,expectedRevision:current.revision,operationId:op()});
 const removed=await read(f.s,'thoughts',id);await f.s.restoreEntry({id,expectedRevision:removed.revision,operationId:op()});
 const entry=await read(f.s,'thoughts',id),execute=f.provider.execute;
 f.provider.execute=async request=>{const response=await execute(request),value=response.fixture.topicAssessment;
  response.fixture.contextProposal.inputIds=[input.id];
  value.entries=[{span:{inputId:input.id,field:'body',start:0,end:request.material.inputs[0].body.length},entryId:id,type:'idea',additional:[]}];
  for(const relation of value.relations)if(relation.topicId===made.topicIds[0])relation.relation='same';
  return response;
 };
 return {...f,entry,input};
}

test('restored Input-bound Entry Topic and Context facets use exact Entry authority and original owners',async()=>{
 const f=await restoredEntryFixture(),scopes=[],resolve=f.materialProcessing.resolve;
 f.materialProcessing.resolve=async(t,scope)=>{scopes.push(structuredClone(scope));return resolve(t,scope);};
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing}),h=await session.prepare(options),r=await session.run(h);
 assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);
 const key=JSON.stringify(['library_entry',f.entry.id]),entryAcks=(await ack(f)).filter(a=>a.unit.key===key);
 assert.deepEqual(entryAcks.map(a=>a.unit.facet).sort(),['context','topic']);assert.equal(h.deferredUnits,0);assert.equal((await ack(f)).length,4,'two Input facets and two original Entry facets only');assert.equal(f.calls[0].material.inputs.length,1,'shared Input is not duplicated');
 assert.deepEqual(f.calls[0].material.entries,[{entryId:f.entry.id,revision:f.entry.revision,body:'Synthetic explicit working input',bodyBinding:'input',workingInputId:f.input.id}]);
 assert.ok(scopes.length>0&&scopes.every(s=>s.entries?.some(e=>e.entryId===f.entry.id&&e.revision===f.entry.revision&&e.selectedFields.join()==='body')));
 assert.deepEqual(await read(f.s,'thoughts',f.entry.id),f.entry);assert.equal((await read(f.s,'thoughts')).length,1);
 const before=await snapshot(f.s);await session.run(h);assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);
});

for(const defect of ['missing-entry-authority','wrong-entry-revision','missing-entry-assessment','foreign-entry-assessment','entry-edit','entry-remove','unjournaled-revision'])test('restored Entry '+defect+' cannot ACK its Topic delta',async()=>{
 const f=await restoredEntryFixture(),execute=f.provider.execute,resolve=f.materialProcessing.resolve;
 f.materialProcessing.resolve=async(t,scope)=>{const r=await resolve(t,scope);if(defect==='missing-entry-authority'){const {entries,...rest}=r.scope;r.scope=rest;}if(defect==='wrong-entry-revision')r.scope={...r.scope,entries:r.scope.entries.map(e=>({...e,revision:e.revision-1}))};return r;};
 f.provider.execute=async request=>{const r=await execute(request);if(defect==='missing-entry-assessment')delete r.fixture.topicAssessment.entries[0].entryId;if(defect==='foreign-entry-assessment')r.fixture.topicAssessment.entries[0].entryId=op();if(defect==='unjournaled-revision')await f.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.entry.id);row.revision++;await t.put('thoughts',row);});if(defect==='entry-remove')await f.s.removeEntry({id:f.entry.id,expectedRevision:f.entry.revision,operationId:op()});if(defect==='entry-edit')await f.s.editEntry({id:f.entry.id,expectedRevision:f.entry.revision,changes:{note:'Synthetic later note'},operationId:op()});return r;};
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing}),r=await session.run(await session.prepare(options));
 assert.notEqual(r.processedState,'COMMITTED');const key=JSON.stringify(['library_entry',f.entry.id]);assert.equal((await ack(f)).filter(a=>a.unit.key===key).length,0);
 assert.equal(f.calls.length,['missing-entry-authority','wrong-entry-revision'].includes(defect)?0:1);
});

for(const kind of ['edit','remove'])test('restored Entry '+kind+' after prepare prevents private dispatch',async()=>{
 const f=await restoredEntryFixture(),session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare(options);
 if(kind==='edit')await f.s.editEntry({id:f.entry.id,expectedRevision:f.entry.revision,changes:{note:'Synthetic prepared change'},operationId:op()});
 else await f.s.removeEntry({id:f.entry.id,expectedRevision:f.entry.revision,operationId:op()});
 const r=await session.run(h);assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);
});

for(const defect of ['input-unit','filter-unit','foreign-unit','duplicate','shape','throw'])test('Foundation private Entry qualifier '+defect+' cannot weaken deferral coverage',async()=>{
 const f=await restoredEntryFixture();
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:f.authority,qualifyMaintenanceEntries:async(_t,r)=>{
  const entry=r.coverage.find(u=>u.facet==='topic'&&JSON.parse(u.key)[0]==='library_entry');
  if(defect==='input-unit')return [r.coverage.find(u=>JSON.parse(u.key)[0]==='input')];
  if(defect==='filter-unit')return [{...entry,facet:'filter'}];if(defect==='foreign-unit')return [{...entry,key:JSON.stringify(['library_entry',op()])}];
  if(defect==='duplicate')return [entry,entry];if(defect==='shape')return {};throw Error('Synthetic qualifier refused');
 }});
 const batch=await readMaintenanceBatch(ai,options),job=await ai.plan(batch.request),unsupported=unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage),groups=[];
 await ai.read(async t=>{const saved=await ai.job(t,job.id);for(let i=0;i<saved.childIds.length;i++)for(const facet of ['topic','context']){const units=unsupported.filter(u=>u.facet===facet&&saved.childCoverage[i].some(v=>JSON.stringify(v)===JSON.stringify(u)));if(units.length)groups.push({childId:saved.childIds[i],facet,units,retryCondition:facet==='topic'?'TOPIC_MAPPING_UNAVAILABLE':'CONTEXT_MAPPING_UNAVAILABLE'});}});
 const before=await snapshot(f.s);await assert.rejects(ai.deferMaintenanceBeforeDispatch(job.id,{groups},{signal:new AbortController().signal,isCurrent:()=>true,plan:job}));assert.deepEqual(await snapshot(f.s),before);
});

async function historicallyDeferredEntry(){
 const f=await restoredEntryFixture(),ai=new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),batch=await readMaintenanceBatch(ai,options),job=await ai.plan(batch.request),groups=[];
 await ai.read(async t=>{const saved=await ai.job(t,job.id),unsupported=unsupportedMaintenanceCoverage(saved.items,saved.coverage);for(let i=0;i<saved.childIds.length;i++)for(const facet of ['topic','context']){const units=unsupported.filter(u=>u.facet===facet&&saved.childCoverage[i].some(v=>JSON.stringify(v)===JSON.stringify(u)));if(units.length)groups.push({childId:saved.childIds[i],facet,units,retryCondition:facet==='topic'?'TOPIC_MAPPING_UNAVAILABLE':'CONTEXT_MAPPING_UNAVAILABLE'});}});
 await ai.deferMaintenanceBeforeDispatch(job.id,{groups},{signal:new AbortController().signal,isCurrent:()=>true,plan:job});
 return {...f,oldAI:ai,oldRows:(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED')};
}

test('verified Entry mapper reconsiders old unchanged Topic and Context mapping DEFER once and retains exact history',async()=>{
 const f=await historicallyDeferredEntry(),before=await snapshot(f.s);assert.equal(f.oldRows.length,2);
 const ordinary=await f.oldAI.archiveObsoleteDeferred();assert.equal(ordinary.archived,0);assert.deepEqual(await snapshot(f.s),before,'default original owner does not reinterpret retry conditions');
 const session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare({...options,routeVersion:'synthetic-entry-context-v1'});
 assert.equal(f.calls.length,0,'reconsideration and prepare never dispatch');assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);
 const rows=await read(f.s,'organizerWorkItems'),oldTopic=f.oldRows.find(r=>r.unit.facet==='topic'),oldContext=f.oldRows.find(r=>r.unit.facet==='context'),history=rows.find(r=>r.originalId===oldTopic.id);
 assert.deepEqual(history,{...oldTopic,id:'aiu:defer-history:'+oldTopic.id.slice('aiu:defer:'.length),originalId:oldTopic.id,reconsideredBecause:'RESTORED_ENTRY_TOPIC_MAPPER_V1'});
 assert.equal(rows.some(r=>r.id===oldContext.id),false);assert.deepEqual(rows.find(r=>r.originalId===oldContext.id),{...oldContext,id:'aiu:defer-history:'+oldContext.id.slice('aiu:defer:'.length),originalId:oldContext.id,reconsideredBecause:'RESTORED_ENTRY_CONTEXT_MAPPER_V1'});assert.equal(rows.some(r=>r.id===oldTopic.id),false);
 const result=await session.run(h);assert.equal(result.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,4);
 const final=await snapshot(f.s),passive=await session.prepare({...options,routeVersion:'synthetic-entry-context-v1'});assert.equal(passive.state,'NO_DELTA');assert.deepEqual(await snapshot(f.s),final);assert.equal(f.calls.length,1);
});

for(const variant of ['other-reason','edited','missing-owner','history-collision','abort'])test('Entry mapping reconsideration '+variant+' preserves unresolved obligations or rolls back',async()=>{
 const f=await historicallyDeferredEntry(),old=f.oldRows.find(r=>r.unit.facet==='topic');
 if(variant==='other-reason')await f.s.repository.transaction(true,async t=>{const row=await t.get('organizerWorkItems',old.id);row.retryCondition='SEMANTIC_EVIDENCE_REQUIRED';await t.put('organizerWorkItems',row);});
 if(variant==='edited')await f.s.editEntry({id:f.entry.id,expectedRevision:f.entry.revision,changes:{note:'Synthetic protected note'},operationId:op()});
 if(variant==='missing-owner')await f.s.repository.transaction(true,t=>t.delete('thoughts',f.entry.id));
 if(variant==='history-collision')await f.s.repository.transaction(true,t=>t.put('organizerWorkItems',{...old,id:'aiu:defer-history:'+old.id.slice('aiu:defer:'.length),originalId:old.id,reconsideredBecause:'unrelated-reason'}));
 const session=new LocalMaintenanceSession(f.s,f.constructor),transaction=f.s.repository.transaction.bind(f.s.repository);let hit=false;
 if(variant==='abort')f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(...args)=>{const value=await put(...args);if(args[0]==='organizerWorkItems'&&args[1].reconsideredBecause){hit=true;session.dispose();}return value;};return fn(t);},stores);
 const before=await snapshot(f.s);
 if(['history-collision','abort'].includes(variant)){await assert.rejects(session.prepare({...options,routeVersion:'synthetic-entry-context-v1'}));assert.deepEqual(await snapshot(f.s),before);if(variant==='abort')assert.equal(hit,true);}
 else{await session.prepare({...options,routeVersion:'synthetic-entry-context-v1'});const rows=await read(f.s,'organizerWorkItems');assert.equal(rows.some(r=>r.originalId===old.id&&r.reconsideredBecause==='RESTORED_ENTRY_TOPIC_MAPPER_V1'),false);if(variant==='other-reason')assert.equal(rows.find(r=>r.id===old.id).retryCondition,'SEMANTIC_EVIDENCE_REQUIRED');}
 assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);f.s.repository.transaction=transaction;
});

for(const defect of ['foreign','duplicate','shape','write-failure'])test('reconsideration '+defect+' cannot retire original scheduling evidence',async()=>{
 const f=await historicallyDeferredEntry(),owner={signal:new AbortController().signal,isCurrent:()=>true};
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:f.authority,qualifyMaintenanceEntries:async(_t,r)=>defect==='foreign'?[{...r.coverage[0],scope:'other-scope'}]:defect==='duplicate'?[r.coverage[0],r.coverage[0]]:defect==='shape'?{}:r.coverage});
 const transaction=f.s.repository.transaction.bind(f.s.repository);let hit=false;
 if(defect==='write-failure')f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(...args)=>{const value=await put(...args);if(args[0]==='organizerWorkItems'&&args[1].reconsideredBecause){hit=true;throw Error('Synthetic history write failure');}return value;};return fn(t);},stores);
 const before=await snapshot(f.s);await assert.rejects(ai.archiveObsoleteDeferred({reconsiderEntryTopics:true},owner));assert.deepEqual(await snapshot(f.s),before);if(defect==='write-failure')assert.equal(hit,true);assert.equal(f.calls.length,0);f.s.repository.transaction=transaction;
});

test('reconsideration is one bounded archive page and default Foundation cannot opt itself in',async()=>{
 const f=await historicallyDeferredEntry(),owner={signal:new AbortController().signal,isCurrent:()=>true},before=await snapshot(f.s);
 await assert.rejects(f.oldAI.archiveObsoleteDeferred({reconsiderEntryTopics:true},owner),{code:'UNAVAILABLE'});assert.deepEqual(await snapshot(f.s),before);
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:f.authority,qualifyMaintenanceEntries:async(_t,r)=>r.coverage});
 await assert.rejects(ai.archiveObsoleteDeferred({limit:101,reconsiderEntryTopics:true},owner),{code:'INVALID_REQUEST'});
 const page=await ai.archiveObsoleteDeferred({limit:1,reconsiderEntryTopics:true},owner);assert.equal(page.scanned,1);assert.notEqual(page.nextCursor,null);assert.ok(page.archived<=1);assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);
});

test('default-denied local session preserves historical mapping DEFER without service activation',async()=>{
 const f=await historicallyDeferredEntry(),session=new LocalMaintenanceSession(f.s),before=await snapshot(f.s),writes=f.s.repository.metrics.writes;
 await assert.rejects(session.prepare(options),{code:'UNAVAILABLE'});assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,0);
});

async function filterFixture({decision='KEEP',tier='pro',enabled=true}={}){
 const f=await fixture({tier});await f.s.setFilterMode('light');await f.s.evaluateFilters();
 await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith('aiu:delta:pending:'))await t.put('meta',{...row,pendingFacets:['topic','context','filter']});});
 f.service.filter={enabled:true};f.state.filterOperations=0;
 f.service.responseAdapter.filter=async(response,metadata,binding)=>{f.state.filterOperations++;if(f.state.filterHook)await f.state.filterHook();return {binding:response.fixture.binding,value:metadata.inputIds.map(inputId=>({inputId,decision}))};};
 if(!enabled){delete f.service.filter;delete f.service.responseAdapter.filter;}
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});return f;
}
for(const decision of ['KEEP','INSUFFICIENT'])test('Maintenance filter '+decision+' keeps original visible classifier row and atomically ACKs exact NO_CHANGE with same response',async()=>{
 const f=await filterFixture({decision}),before=await read(f.s,'filterInputs'),r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.state.filterOperations,1);assert.equal(f.state.topicAssessments,1);assert.equal(f.state.contextOperations,1);assert.equal((await ack(f)).length,3);assert.equal((await ack(f)).find(a=>a.unit.facet==='filter').outcome,'NO_CHANGE');assert.deepEqual(await read(f.s,'filterInputs'),before);assert.equal((await read(f.s,'filterIntents')).length,0);assert.equal((await read(f.s,'topics')).length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);assert.equal((await read(f.s,'organizerUsage'))[0].attemptCount,1);
});
for(const decision of ['FILTER','keep','UNCERTAIN'])test('Maintenance filter refuses unsupported decision '+decision,async()=>{const f=await filterFixture({decision}),before=await read(f.s,'filterInputs'),r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.deepEqual(await read(f.s,'filterInputs'),before);assert.equal(f.calls.length,1);});
for(const gates of [{enabled:false},{tier:'free'}])test('Maintenance filter missing original host capability remains DEFER '+JSON.stringify(gates),async()=>{const f=await filterFixture(gates),r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'PARTIAL');assert.equal(f.state.filterOperations,0);assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.ok((await read(f.s,'organizerWorkItems')).some(r=>r.retryCondition==='FILTER_OWNER_UNAVAILABLE'));});
for(const action of ['keep','mode','edit'])test('Maintenance filter rechecks original '+action+' before NO_CHANGE ACK',async()=>{const f=await filterFixture(),id=(await read(f.s,'inputStates'))[0].id;f.state.filterHook=async()=>{if(action==='keep')await f.s.keepInput(id);if(action==='mode')await f.s.setFilterMode('off');if(action==='edit')await inputEdit(f.s,id,{libraryText:'New human text'});};const r=await f.session.run(await f.session.prepare(options));assert.notEqual(r.state,'COMMITTED');assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.equal(f.calls.length,1);});
test('Maintenance filter ACK storage failure rolls back exact original transaction and resumes same response',async()=>{const f=await filterFixture(),h=await f.session.prepare(options),hook=corruptWrite(f,(name,row)=>name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED',()=>{throw Error('synthetic filter ACK failure');});const r=await f.session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,'PARTIAL');assert.deepEqual(await snapshot(f.s),hook.record.before);assert.equal((await ack(f)).length,2);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.filterOperations,1);assert.equal(f.state.contextOperations,1);});
for(const action of ['excluded','purged','legacy','protected'])test('Maintenance filter never qualifies '+action+' Input for ACK',async()=>{const f=await filterFixture(),id=(await read(f.s,'inputStates'))[0].id;if(action==='excluded')await inputEdit(f.s,id,{excluded:true});if(action==='purged'){const b=(await f.s.input(id));await f.s.permanentDelete(b.sourceRecordId);}if(action==='protected')await f.s.keepInput(id);if(action==='legacy')await f.s.foundationWrite(async t=>{const row=await t.get('filterInputs',id);await t.put('filterInputs',{...row,authorship:'legacy_unknown'});});const before=await read(f.s,'filterInputs');try{await f.session.run(await f.session.prepare(options));}catch(error){assert.ok(['STALE_BASE','UNAVAILABLE'].includes(error.code));}assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.deepEqual(await read(f.s,'filterInputs'),before);});
for(const fault of ['missing','duplicate','extra','wrong-binding'])test('Maintenance filter exact response closure rejects '+fault,async()=>{const f=await filterFixture();f.service.responseAdapter.filter=async(response,metadata)=>({binding:fault==='wrong-binding'?{...response.fixture.binding,childOperationId:'foreign'}:response.fixture.binding,value:fault==='missing'?[]:fault==='duplicate'?metadata.inputIds.flatMap(inputId=>[{inputId,decision:'KEEP'},{inputId,decision:'KEEP'}]):metadata.inputIds.map(inputId=>({inputId,decision:'KEEP',...(fault==='extra'?{reason:'unbounded external'}:{})}))});f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.equal(f.calls.length,1);});
test('Maintenance filter original processing revocation during adapter cannot ACK',async()=>{const f=await filterFixture();f.state.filterHook=()=>{f.processing.allowed=false;};const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'UNAVAILABLE');assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.equal(f.calls.length,1);});
test('Maintenance filter filter-only remaining delta never opens another provider opportunity',async()=>{const f=await filterFixture({enabled:false});await f.session.run(await f.session.prepare(options));const before=f.calls.length,r=await f.session.prepare(options);assert.equal(r.state,'DEFERRED');assert.equal(f.calls.length,before);});
test('Maintenance filter window revoke after ACK put rolls back and cannot resume',async()=>{const f=await filterFixture(),h=await f.session.prepare(options),hook=corruptWrite(f,(name,row)=>name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED',()=>f.clock.abort());const r=await f.session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,'UNAVAILABLE');assert.deepEqual(await snapshot(f.s),hook.record.before);assert.equal((await ack(f)).length,2);assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal(f.calls.length,1);});
test('Maintenance filter lost commit acknowledgement recovers the original receipt without a second provider or owner call',async()=>{const f=await filterFixture(),h=await f.session.prepare(options),original=f.s.repository.transaction.bind(f.s.repository);let dropped=false;f.s.repository.transaction=async(write,fn,stores)=>{let filterAck=false;const value=await original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED')filterAck=true;return result;};}return fn(t);},stores);if(filterAck&&!dropped){dropped=true;throw Object.assign(Error('synthetic lost acknowledgement'),{code:'STORAGE_FAILED'});}return value;};await f.session.run(h);f.s.repository.transaction=original;assert.equal(dropped,true);const before=await snapshot(f.s);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);assert.equal(f.state.filterOperations,1);assert.equal((await ack(f)).length,3);});
test('Maintenance filter cannot bypass the original in-flight Source purge owner gate',async()=>{const f=await filterFixture(),id=(await read(f.s,'inputStates'))[0].id,b=await f.s.input(id),before=await read(f.s,'filterInputs');let gate;f.state.filterHook=async()=>{try{await f.s.permanentDelete(b.sourceRecordId);}catch(error){gate=error.code;throw error;}};const r=await f.session.run(await f.session.prepare(options));assert.equal(gate,'SOURCE_PURGE_OWNER_GATE');assert.notEqual(r.state,'COMMITTED');assert.equal((await ack(f)).filter(a=>a.unit.facet==='filter').length,0);assert.deepEqual(await read(f.s,'filterInputs'),before);assert.equal((await read(f.s,'records')).length,1);assert.equal(f.calls.length,1);});

for(const defect of ['unjournaled-binding','unjournaled-note','entry-remove','revocation'])test('restored Entry Context '+defect+' after Topic commit cannot ACK Context',async()=>{
 const f=await restoredEntryFixture();
 f.state.contextHook=async()=>{
  if(defect==='entry-remove')await f.s.removeEntry({id:f.entry.id,expectedRevision:f.entry.revision,operationId:op()});
  else if(defect==='revocation')f.contextAbort.abort();
  else await f.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.entry.id);if(defect==='unjournaled-binding')row.workingInputId=op();else row.note='Synthetic protected authored note';await t.put('thoughts',row);});
 };
 const r=await f.session.run(await f.session.prepare(options)),key=JSON.stringify(['library_entry',f.entry.id]);
 assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);
 assert.equal((await ack(f)).filter(a=>a.unit.key===key&&a.unit.facet==='topic').length,1);
 assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);
 assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
});

test('restored Entry Context ACK write failure rolls back original Context and both exact keys, then resumes same response',async()=>{
 const f=await restoredEntryFixture(),h=await f.session.prepare(options),key=JSON.stringify(['library_entry',f.entry.id]);
 const hook=corruptWrite(f,(name,row)=>name==='organizerWorkItems'&&row.unit?.key===key&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED',()=>{throw Error('synthetic Entry Context ACK fault');});
 const r=await f.session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,'PARTIAL');assert.deepEqual(await snapshot(f.s),hook.record.before);
 assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
 assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.contextOperations,1);assert.equal((await ack(f)).length,4);
});

test('restored Entry Context missing exact unit cannot acknowledge Input alias instead',async()=>{
 const f=await restoredEntryFixture(),adapter=f.service.responseAdapter.context;
 f.service.responseAdapter.context=async(...args)=>{const r=await adapter(...args);r.value[0].units=r.value[0].units.filter(u=>JSON.parse(u.key)[0]!=='library_entry');return r;};
 const session=new LocalMaintenanceSession(f.s,f.constructor),r=await session.run(await session.prepare(options));
 assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);assert.equal(f.calls.length,1);
});

test('remaining Entry Context-only coverage still requests Entry processing and material after Topic ACK',async()=>{
 const f=await restoredEntryFixture(),adapter=f.service.responseAdapter.context;
 f.service.responseAdapter.context=async()=>{throw Error('synthetic Context unavailable');};
 const first=new LocalMaintenanceSession(f.s,f.constructor),initial=await first.prepare(options);assert.equal((await first.run(initial)).state,'PARTIAL');first.dispose();
 // The prior dispatched partial job must be explicitly closed by its original
 // owner before a different remaining-scope job can be admitted.
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.authority});await foundation.cancel(initial.jobId);
 const oldAttempt=structuredClone((await read(f.s,'organizerUsage'))[0]);
 f.service.responseAdapter.context=adapter;const scopes=[],resolve=f.materialProcessing.resolve;
 f.materialProcessing.resolve=async(t,scope)=>{scopes.push(structuredClone(scope));return resolve(t,scope);};
 let grant;const window={acquire:async r=>(grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-context-next',reservationId:'synthetic-context-next',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal}),isCurrent:r=>r===grant};
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,window,processing:f.materialProcessing}),h=await session.prepare(options),r=await session.run(h);
 assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,2);assert.equal(f.calls[1].coverage.every(u=>u.facet==='context'),true);assert.equal(f.calls[1].material.entries.length,1);
 assert.ok(scopes.length&&scopes.every(s=>s.facets.join()==='context'&&s.entries.length===1&&s.entries[0].entryId===f.entry.id));assert.equal((await ack(f)).length,4);assert.deepEqual(await read(f.s,'thoughts',f.entry.id),f.entry);assert.deepEqual((await read(f.s,'organizerUsage')).find(r=>r.id===oldAttempt.id),oldAttempt);
});

 test('unchanged route cannot retire old Entry Context DEFER or reopen cancelled job',async()=>{
 const f=await historicallyDeferredEntry(),old=f.oldRows.find(r=>r.unit.facet==='context'),job=await read(f.s,'organizerJobs',old.jobId);
 const session=new LocalMaintenanceSession(f.s,f.constructor);await session.prepare(options);
 for(const row of f.oldRows)assert.deepEqual(await read(f.s,'organizerWorkItems',row.id),row);assert.deepEqual(await read(f.s,'organizerJobs',old.jobId),job);assert.equal(f.calls.length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);
});


async function placedEntryFixture(){
 const f=await fixture();assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');f.session.dispose();
 const input=(await f.s.snapshot()).library.blocks[0],entryId=(await read(f.s,'thoughts'))[0].id,topicId=(await read(f.s,'topics'))[0].id;
 const entry=await read(f.s,'thoughts',entryId),topic=await read(f.s,'topics',topicId),placementId=JSON.stringify([topic.id,topic.activeLayoutGeneration,entry.id]),prior=await read(f.s,'placements',placementId);
 await f.s.placeEntry({entryId,topicId,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:prior.revision,operationId:op()});
 const placement=await read(f.s,'placements',placementId),current=await read(f.s,'thoughts',entryId),execute=f.provider.execute,adapter=f.service.responseAdapter.context;
 f.provider.execute=async request=>{const response=await execute(request),value=response.fixture.topicAssessment;response.fixture.contextProposal.inputIds=[input.id];
  value.entries=[{span:{inputId:input.id,field:'body',start:0,end:request.material.inputs[0].body.length},type:'idea',additional:[]}];
  for(const relation of value.relations)if(relation.topicId===topicId)relation.relation='same';return response;
 };
 f.service.responseAdapter.context=async(response,metadata,binding)=>{
  const translated={...metadata,units:metadata.units.map(u=>JSON.parse(u.key)[0]==='placement'?{...u,key:JSON.stringify(['input',metadata.placements.find(p=>p.placementId===JSON.parse(u.key)[1]).inputId])}:u)};
  // The existing Input adapter creates actual current Topic evidence. Restore
  // original coverage keys; aliases are not permission to ACK a different unit.
  const result=await adapter(response,translated,binding);result.value[0].units=structuredClone(metadata.units);return result;
 };
 let grant;const window={acquire:async r=>(grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-placement',reservationId:'synthetic-placement',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal}),isCurrent:r=>r===grant};
 return {...f,constructor:{...f.constructor,window},entry:current,input,placement,topicId};
}

test('manual Placement Context uses original target and exact key without changing human placement',async()=>{
 const f=await placedEntryFixture(),scopes=[],resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>{scopes.push(structuredClone(scope));return resolve(t,scope);};
 const before=await Promise.all(['thoughts','topics','sections','placements'].map(n=>read(f.s,n))),session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing}),h=await session.prepare(options),r=await session.run(h);
 assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,2);const key=JSON.stringify(['placement',f.placement.id]);
 assert.deepEqual((await ack(f)).filter(a=>a.unit.key===key).map(a=>a.unit.facet),['context']);assert.equal((await ack(f)).length,3);assert.equal(h.deferredUnits,1);
 assert.deepEqual(await Promise.all(['thoughts','topics','sections','placements'].map(n=>read(f.s,n))),before);
 assert.equal(f.calls[1].material.placements.length,1);assert.equal(f.calls[1].material.placements[0].placementId,f.placement.id);assert.equal(f.calls[1].material.placements[0].topicId,f.topicId);assert.equal(f.calls[1].material.entries[0].entryId,f.entry.id);
 assert.ok(scopes.length&&scopes.every(s=>s.placements?.[0].placementId===f.placement.id&&s.entries?.[0].entryId===f.entry.id));
 assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,2);assert.equal((await read(f.s,'organizerUsage')).filter(a=>a.attemptCount===1).length,2);
});

async function placementDelta(f){return (await read(f.s,'meta')).find(x=>x.id==='aiu:delta:known:'+JSON.stringify(['placement',f.placement.id]));}
async function changePlacementFact(f,defect){
 if(defect==='remove'){const entry=await read(f.s,'thoughts',f.entry.id),topic=await read(f.s,'topics',f.topicId),p=await read(f.s,'placements',f.placement.id);return f.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,remove:true,operationId:op()});}
 const delta=await placementDelta(f);return f.s.repository.transaction(true,async t=>{
  if(defect==='journal'){const row=await t.get('revisions',delta.descriptor.journalId);row.reason='unrelated';return t.put('revisions',row);}
  if(defect==='target-layout'){const row=await t.get('topics',f.topicId);row.activeLayoutGeneration++;return t.put('topics',row);}
  if(defect==='target-removed'){const row=await t.get('topics',f.topicId);row.lifecycle='removed';return t.put('topics',row);}
  if(defect==='section-removed'){const row=await t.get('sections',JSON.stringify([f.topicId,f.placement.layoutGeneration,f.placement.sectionId]));row.lifecycle='removed';return t.put('sections',row);}
  if(defect==='placement-revision'){const row=await t.get('placements',f.placement.id);row.revision++;return t.put('placements',row);}
  const row=await t.get('thoughts',f.entry.id);
  if(defect==='note')row.note='Synthetic independent human note';if(defect==='title')row.title='Synthetic independent human title';if(defect==='binding')row.workingInputId=op();if(defect==='intent')row.organizationIntents.edges[f.topicId].include=false;if(defect==='source')row.sourceRecordIds=[];
  return t.put('thoughts',row);
 });
}
for(const defect of ['note','title','binding','intent','source','journal','target-layout','target-removed','section-removed','placement-revision'])test('manual Placement '+defect+' cannot qualify private dispatch',async()=>{
 const f=await placedEntryFixture();await changePlacementFact(f,defect);const session=new LocalMaintenanceSession(f.s,f.constructor);
 try{const h=await session.prepare(options);await session.run(h);}catch(error){assert.ok(['STALE_BASE','UNAVAILABLE','CANCELLED'].includes(error.code));}
 assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,2);
});
for(const defect of ['note','binding','journal','target-layout','section-removed','placement-revision','remove'])test('manual Placement '+defect+' after prepare prevents dispatch',async()=>{
 const f=await placedEntryFixture(),session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare(options);await changePlacementFact(f,defect);const r=await session.run(h);
 assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,2);
});
for(const defect of ['missing-placement','wrong-target','missing-entry'])test('manual Placement '+defect+' processing scope cannot borrow Input authority',async()=>{
 const f=await placedEntryFixture(),resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>{const r=await resolve(t,scope);r.scope=structuredClone(r.scope);if(defect==='missing-placement')delete r.scope.placements;if(defect==='wrong-target')r.scope.placements[0].topicId=op();if(defect==='missing-entry')delete r.scope.entries;return r;};
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing}),r=await session.run(await session.prepare(options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,2);
});
for(const defect of ['note','journal','target-layout','remove','revoke'])test('manual Placement '+defect+' after response cannot publish Context',async()=>{
 const f=await placedEntryFixture();f.state.contextHook=()=>defect==='revoke'?f.contextAbort.abort():changePlacementFact(f,defect);
 const session=new LocalMaintenanceSession(f.s,f.constructor),r=await session.run(await session.prepare(options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,2);assert.equal((await ack(f)).length,2);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);
});

test('manual Placement Context ACK failure rolls back and resumes exact original response',async()=>{
 const f=await placedEntryFixture(),session=new LocalMaintenanceSession(f.s,f.constructor),h=await session.prepare(options),key=JSON.stringify(['placement',f.placement.id]);
 const hook=corruptWrite(f,(n,r)=>n==='organizerWorkItems'&&r.unit?.key===key&&r.unit.facet==='context'&&r.state==='ACKNOWLEDGED',()=>{throw Error('synthetic placement ACK failure');});
 const r=await session.run(h);hook.restore();assert.equal(hook.record.reached,true);assert.equal(r.state,'PARTIAL');assert.deepEqual(await snapshot(f.s),hook.record.before);assert.equal((await ack(f)).length,2);
 assert.equal((await session.run(h)).processedState,'COMMITTED');assert.equal((await ack(f)).length,3);assert.equal(f.calls.length,2);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,2);
});

test('manual Placement Context cannot substitute another valid Topic for its explicit human target',async()=>{
 const f=await placedEntryFixture(),created=await f.s.createTopic({name:'Synthetic other eligible target',operationId:op()}),other=await read(f.s,'topics',created.id),entry=await read(f.s,'thoughts',f.entry.id);
 await f.s.placeEntry({entryId:entry.id,topicId:other.id,expectedEntryRevision:entry.revision,expectedTopicRevision:other.organizationRevision,operationId:op()});
 const adapter=f.service.responseAdapter.context;f.service.responseAdapter.context=async(...args)=>{const r=await adapter(...args),scope=await readContextTopicScope(f.s,{topicId:other.id});assert.equal(scope.available,true);for(const group of r.value)for(const e of group.change.evidence){e.topicId=other.id;e.expectedTopicBinding=scope.binding;}return r;};
 const session=new LocalMaintenanceSession(f.s,f.constructor),r=await session.run(await session.prepare(options));assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).length,2);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);assert.equal(f.calls.length,2);
});

async function deferredPlacementFixture(){
 const f=await placedEntryFixture(),ai=new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),batch=await readMaintenanceBatch(ai,options),job=await ai.plan(batch.request),groups=[];
 await ai.read(async t=>{const saved=await ai.job(t,job.id);for(let i=0;i<saved.childIds.length;i++)for(const facet of ['topic','context']){const units=saved.childCoverage[i].filter(u=>u.facet===facet);if(units.length)groups.push({childId:saved.childIds[i],facet,units,retryCondition:facet==='topic'?'TOPIC_MAPPING_UNAVAILABLE':'CONTEXT_MAPPING_UNAVAILABLE'});}});
 await ai.deferMaintenanceBeforeDispatch(job.id,{groups},{signal:new AbortController().signal,isCurrent:()=>true,plan:job});
 return {...f,oldAI:ai,oldJob:await read(f.s,'organizerJobs',job.id),oldAttempts:await read(f.s,'organizerUsage'),oldRows:(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED')};
}
for(const changed of [false,true])test('manual Placement old DEFER '+(changed?'new route reconsiders only Context':'same route preserves both obligations'),async()=>{
 const f=await deferredPlacementFixture(),session=new LocalMaintenanceSession(f.s,f.constructor),route={...options,...(changed?{routeVersion:'synthetic-placement-context-v1'}:{})},h=await session.prepare(route),r=await session.run(h);
 const rows=await read(f.s,'organizerWorkItems'),topic=f.oldRows.find(r=>r.unit.facet==='topic'),context=f.oldRows.find(r=>r.unit.facet==='context');assert.deepEqual(rows.find(r=>r.id===topic.id),topic);
 if(changed){assert.equal(r.processedState,'COMMITTED');assert.equal(rows.some(r=>r.id===context.id),false);assert.deepEqual(rows.find(r=>r.originalId===context.id),{...context,id:'aiu:defer-history:'+context.id.slice('aiu:defer:'.length),originalId:context.id,reconsideredBecause:'MANUAL_PLACEMENT_CONTEXT_MAPPER_V1'});assert.equal(f.calls.length,2);assert.equal((await ack(f)).length,3);}
 else{assert.equal(r.state,'DEFERRED');assert.deepEqual(rows.find(r=>r.id===context.id),context);assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,2);}
 assert.deepEqual(await read(f.s,'organizerJobs',f.oldJob.id),f.oldJob);for(const attempt of f.oldAttempts)assert.deepEqual(await read(f.s,'organizerUsage',attempt.id),attempt);
});
for(const defect of ['reason','journal','history-collision','abort'])test('manual Placement old DEFER '+defect+' preserves obligations or atomic rollback',async()=>{
 const f=await deferredPlacementFixture(),context=f.oldRows.find(r=>r.unit.facet==='context');
 if(defect==='reason')await f.s.repository.transaction(true,t=>t.put('organizerWorkItems',{...context,retryCondition:'SEMANTIC_EVIDENCE_REQUIRED'}));
 if(defect==='journal')await changePlacementFact(f,'journal');
 if(defect==='history-collision')await f.s.repository.transaction(true,t=>t.put('organizerWorkItems',{...context,id:'aiu:defer-history:'+context.id.slice('aiu:defer:'.length),originalId:context.id,reconsideredBecause:'other'}));
 const session=new LocalMaintenanceSession(f.s,f.constructor),before=await snapshot(f.s),hook=defect==='abort'?corruptWrite(f,(name,row)=>name==='organizerWorkItems'&&row.reconsideredBecause==='MANUAL_PLACEMENT_CONTEXT_MAPPER_V1',()=>session.dispose(),{contextOnly:false}):null;
 if(['history-collision','abort'].includes(defect)){await assert.rejects(session.prepare({...options,routeVersion:'synthetic-placement-context-v1'}));if(hook){hook.restore();assert.equal(hook.record.reached,true);}assert.deepEqual(await snapshot(f.s),before);}
 else{await session.prepare({...options,routeVersion:'synthetic-placement-context-v1'});assert.ok(await read(f.s,'organizerWorkItems',context.id));}
 assert.equal(f.calls.length,1);assert.deepEqual(await read(f.s,'organizerJobs',f.oldJob.id),f.oldJob);
});

test('manual Placement payload rejects incomplete, duplicate, foreign, malformed and over-budget metadata',async()=>{
 const f=await placedEntryFixture(),session=new LocalMaintenanceSession(f.s,f.constructor);await session.run(await session.prepare(options));
 const {material:sent,...metadata}=f.calls[1],material={sourceCount:1,view:{...sent,inputs:sent.inputs.map(i=>({id:i.inputId,revision:i.revision,role:'primary',fields:{body:i.body}})),entries:sent.entries.map(e=>({id:e.entryId,revision:e.revision,body:e.body,bodyBinding:e.bodyBinding,workingInputId:e.workingInputId}))}},limits=f.s.organizerBudget.limits;
 assert.deepEqual(createMaintenancePayload(metadata,material,limits,sent.placements,[],[],[],[],[],sent.existingContextItems,sent.existingContextSummary).material,sent);
 for(const defect of ['missing','duplicate','extra','entry-revision','target','input','layout','budget']){let ps=structuredClone(sent.placements);if(defect==='missing')ps=[];if(defect==='duplicate')ps.push(ps[0]);if(defect==='extra')ps[0].unapproved='synthetic';if(defect==='entry-revision')ps[0].entryRevision++;if(defect==='target')ps[0].topicId=op();if(defect==='input')ps[0].inputId=op();if(defect==='layout')ps[0].layoutGeneration++;if(defect==='budget')ps[0].sectionId='x'.repeat(limits.maxContentBytes);assert.throws(()=>createMaintenancePayload(metadata,material,limits,ps),undefined,defect);}
});

test('mixed Topic and human Placement Context complete within the original two-child opportunity',async()=>{
 const f=await placedEntryFixture();await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC updated current Input before mixed maintenance'});
 const key=JSON.stringify(['placement',f.placement.id]),session=new LocalMaintenanceSession(f.s,f.constructor),before=await read(f.s,'placements',f.placement.id);
 const h=await session.prepare({...options,routeVersion:'synthetic-mixed-placement-v1'}),r=await session.run(h);
 assert.equal(r.state,'PARTIAL');assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(r.pendingPlacementUnits??0,0);
 assert.equal(r.complete,true);assert.equal(r.nextCursor,null);assert.equal(r.remainingWork,true,'unsupported Placement Topic remains separate');
 assert.equal(h.childCount,2);assert.equal(f.calls.length,3);assert.equal(f.calls[1].material.placements?.length??0,0);assert.equal(f.calls[2].material.placements.length,1);
 assert.deepEqual(await read(f.s,'placements',f.placement.id),before);assert.equal((await ack(f)).filter(a=>a.unit.key===key&&a.unit.facet==='context').length,1);
 assert.equal((await read(f.s,'organizerWorkItems')).some(x=>x.unit?.key===key&&x.unit.facet==='context'&&x.state==='DEFERRED'),false);
 const beforeCalls=f.calls.length;await session.run(h);assert.equal(f.calls.length,beforeCalls,'settled handle never repeats either child');session.dispose();
 const next=new LocalMaintenanceSession(f.s,f.constructor),result=await next.run(await next.prepare({...options,routeVersion:'synthetic-mixed-placement-v1'}));
 assert.equal(result.state,'DEFERRED');assert.equal(f.calls.length,beforeCalls);next.dispose();
});

for(const failure of ['unknown','denied-second-grant'])test('mixed Placement preserves '+failure+' admission and financial boundaries',async()=>{
 const f=await placedEntryFixture();await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC changed Input for admission refusal'});
 const key=JSON.stringify(['placement',f.placement.id]);
 if(failure==='unknown'){const execute=f.provider.execute;f.provider.execute=async request=>{await execute(request);throw Error('SYNTHETIC unknown physical outcome');};}
 else {const resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>({...await resolve(t,scope),processing:!scope.placements});}
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing}),h=await session.prepare(options),result=await session.run(h),calls=f.calls.length;
 if(failure==='unknown'){
  assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal((await session.run(h)).state,'OUTCOME_UNKNOWN');
  const next=new LocalMaintenanceSession(f.s,f.constructor);assert.equal((await next.run(await next.prepare(options))).state,'OUTCOME_UNKNOWN');next.dispose();
 }else{
  assert.equal(result.state,'UNAVAILABLE');assert.equal((await session.run(h)).state,'UNAVAILABLE');
  const receipts=(await read(f.s,'organizerUsage')).filter(x=>x.jobId===h.jobId);assert.equal(receipts.filter(x=>x.attemptCount===0&&x.state==='RESERVED').length,1);
 }
 assert.equal(f.calls.length,calls);assert.equal(calls,2);assert.equal((await ack(f)).some(a=>a.unit.key===key),false);
 assert.equal((await read(f.s,'organizerWorkItems')).some(r=>r.unit?.key===key&&r.unit.facet==='context'&&r.state==='DEFERRED'),false);session.dispose();
});

test('Topic work for a different Input reserves a separate exact Placement child',async()=>{
 const f=await placedEntryFixture();await f.s.capture(capture((await f.s.status()).epoch,'synthetic-unrelated-input','SYNTHETIC independently changed Input'));
 const session=new LocalMaintenanceSession(f.s,f.constructor),cursor='aiu:delta:pending:';
 const handle=await session.prepare({...options,cursor});assert.equal(handle.pendingPlacementUnits??0,0);assert.equal(handle.complete,true);assert.equal(handle.childCount,2);
 const job=await read(f.s,'organizerJobs',handle.jobId),key=JSON.stringify(['placement',f.placement.id]);assert.ok(job.coverage.some(u=>u.facet==='topic'));
 const child=job.childCoverage.find(us=>us.some(u=>u.key===key));assert.deepEqual(child.map(u=>u.facet),['context']);assert.equal(f.calls.length,1,'prepare has no physical call');session.dispose();
});

test('concurrent completed mixed ACK gives a passive no-delta handle without replay',async()=>{
 const f=await placedEntryFixture();await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC mixed passive race'});
 const first=new LocalMaintenanceSession(f.s,f.constructor),h=await first.prepare(options);let grant;
 const second=new LocalMaintenanceSession(f.s,{...f.constructor,window:{acquire:async r=>{await first.run(h);return grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-later',reservationId:'synthetic-later',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal};},isCurrent:r=>r===grant}});
 const next=await second.prepare({...options,routeVersion:'synthetic-other-route'}),before=await snapshot(f.s),result=await second.run(next);
 for(const value of [next,result]){assert.equal(value.state,'NO_DELTA');assert.equal(value.pendingPlacementUnits??0,0);assert.equal(value.complete,true);assert.equal(value.nextCursor,null);assert.equal(value.remainingWork,true);}
 assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,3);second.dispose();assert.equal((await second.run(next)).state,'UNAVAILABLE');first.dispose();
});

for(const mutation of ['edit','exclude'])test('final shared material fence blocks late Input '+mutation+' before physical dispatch',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),input=(await f.s.snapshot()).library.blocks[0],check=TopicFormationService.prototype.checkMaterial,topicRead=TopicFormationService.prototype.read,foundationRead=AIUsageFoundation.prototype.read;let completedChecks=0,compositeChecks=0,active=null,changed=false;
 const mutate=async()=>{changed=true;if(mutation==='edit')await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC Input changed at final material boundary'});else await f.s.excludeLibrary(input.id,true);};
 TopicFormationService.prototype.checkMaterial=async function(handle,finalFence){const previous=active;active={composite:typeof finalFence==='function'?++compositeChecks:0,reads:0};try{return await check.call(this,handle,finalFence);}finally{active=previous;completedChecks++;}};
 TopicFormationService.prototype.read=async function(...args){if(active&&++active.reads===2&&active.composite===2&&!changed)await mutate();return topicRead.apply(this,args);};
 // Regression witness for the former separate authored-only transaction after
 // the sixth/physical Input check. The composite implementation instead meets
 // the same mutation immediately before its original final guarded read above.
 AIUsageFoundation.prototype.read=async function(...args){if(!changed&&completedChecks===6&&!f.calls.length)await mutate();return foundationRead.apply(this,args);};
 try{await f.session.run(h);assert.equal(changed,true,'real owner mutation must complete at the final asynchronous boundary');assert.equal(f.calls.length,0,'stale or excluded Working body must not reach the provider');assert.equal((await ack(f)).length,0);assert.equal(mutation==='edit'?(await f.s.input(input.id)).libraryText:(await f.s.input(input.id)).excluded,mutation==='edit'?'SYNTHETIC Input changed at final material boundary':true);}
 finally{TopicFormationService.prototype.checkMaterial=check;TopicFormationService.prototype.read=topicRead;AIUsageFoundation.prototype.read=foundationRead;f.session.dispose();}
});

async function inputAndAuthoredContextFixture(){
 const f=await fixture();f.state.contextHook=async()=>{throw Error('Synthetic unfinished Input Context');};const first=await f.session.prepare(options);assert.equal((await f.session.run(first)).state,'PARTIAL');assert.deepEqual((await ack(f)).map(a=>a.unit.facet),['topic']);await new AIUsageFoundation(f.s,{resolveAuthority:f.authority}).cancel(first.jobId);f.session.dispose();f.state.contextHook=null;
 const topic=await f.s.createTopic({name:'Synthetic authored mixed-fence Topic',operationId:op()}),entry=await f.s.createEntry({actor:'user',operationId:op(),body:'SYNTHETIC mixed-fence authored body',type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});
 f.calls.length=0;f.provider.execute=async request=>{f.calls.push(structuredClone(request));assert.equal(request.material.inputs.length,1);assert.equal(request.material.authoredEntries.length,1);return {accepted:true,operationReceiptId:'synthetic-mixed-fence-'+request.childOperationId,body:'SYNTHETIC mixed-fence Context'};};
 f.service.responseAdapter.context=async(response,metadata,binding)=>{const evidence=[];for(const inputId of metadata.inputIds){let scope;for(const topic of await read(f.s,'topics')){const next=await readContextTopicScope(f.s,{topicId:topic.id});if(next.available&&next.scope.inputIds.includes(inputId)){scope=next;break;}}assert.ok(scope);const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:scope.binding.topicId,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence});}for(const mapping of metadata.authoredEntries){const scope=await readContextTopicScope(f.s,{topicId:mapping.topicId});assert.equal(scope.available,true);evidence.push(authoredContextEvidence(mapping,scope.binding,mapping.bodyDigest));}return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic mixed',associationIds:[op()],evidence}}]};};
 let grant;const session=new LocalMaintenanceSession(f.s,{...f.constructor,window:{acquire:async r=>grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-mixed-fence',reservationId:'synthetic-mixed-fence',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal},isCurrent:r=>r===grant}}),handle=await session.prepare({...options,routeVersion:'synthetic-mixed-fence'}),job=await read(f.s,'organizerJobs',handle.jobId);assert.ok(job.coverage.every(u=>u.facet==='context'));assert.equal(job.coverage.length,2);return {...f,session,handle,entry,topic,input:(await f.s.snapshot()).library.blocks[0]};
}
for(const mutation of ['none','input-edit','input-exclude','authored-body','authored-placement'])test('mixed Input and authored Context share one final transaction: '+mutation,async()=>{
 const f=await inputAndAuthoredContextFixture(),check=TopicFormationService.prototype.checkMaterial,topicRead=TopicFormationService.prototype.read,repositoryRead=f.s.repository.transaction.bind(f.s.repository);let compositeChecks=0,active=null,changed=false;const finalTransactions=[];
 const mutate=async()=>{changed=true;if(mutation==='input-edit')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC mixed late Input edit'});else if(mutation==='input-exclude')await f.s.excludeLibrary(f.input.id,true);else{const row=await read(f.s,'thoughts',f.entry.id);if(mutation==='authored-body')await f.s.editEntry({id:row.id,expectedRevision:row.revision,operationId:op(),changes:{body:'SYNTHETIC mixed late authored edit'}});else{const p=(await read(f.s,'placements')).find(p=>p.entryId===row.id);await f.s.placeEntry({entryId:row.id,topicId:p.topicId,expectedEntryRevision:row.revision,expectedTopicRevision:(await f.s.topic(p.topicId)).organizationRevision,expectedPlacementRevision:p.revision,rank:'500000000000',operationId:op()});}}};
 TopicFormationService.prototype.checkMaterial=async function(handle,finalFence){const previous=active;active={composite:typeof finalFence==='function'?++compositeChecks:0,reads:0};try{return await check.call(this,handle,finalFence);}finally{active=previous;}};
 TopicFormationService.prototype.read=async function(...args){if(active&&++active.reads===2&&active.composite===2&&!changed&&mutation!=='none')await mutate();return topicRead.apply(this,args);};
 f.s.repository.transaction=(write,fn,...args)=>repositoryRead(write,async t=>{if(!write&&active?.composite===2&&active.reads===2){const observed={transaction:t.tx,inputs:0,authored:0,memberships:0};finalTransactions.push(observed);const get=t.get.bind(t),page=t.rangePage.bind(t);t.get=async(name,id)=>{if(name==='inputStates'&&id===f.input.id)observed.inputs++;if(name==='thoughts'&&id===f.entry.id)observed.authored++;return get(name,id);};t.rangePage=async(...args)=>{if(args[0]==='placements'&&args[1]==='byEntry')observed.memberships++;return page(...args);};}return fn(t);},...args);
 try{const result=await f.session.run(f.handle);if(mutation==='none'){assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);const materialTransactions=finalTransactions.filter(t=>t.inputs||t.authored||t.memberships);assert.equal(materialTransactions.length,1);assert.ok(materialTransactions[0].inputs>0&&materialTransactions[0].authored>0&&materialTransactions[0].memberships>0,'same final transaction reads current Input, authored owner, and complete membership');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,2);}else{assert.equal(changed,true);assert.equal(f.calls.length,0);assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);}}
 finally{TopicFormationService.prototype.checkMaterial=check;TopicFormationService.prototype.read=topicRead;f.s.repository.transaction=repositoryRead;f.session.dispose();}
});
