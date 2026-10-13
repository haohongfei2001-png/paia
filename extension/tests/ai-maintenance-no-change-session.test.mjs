import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
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



async function unchangedFixture({inputs=1,groupSize=16,hole=false,forged=false,overAck=false,historical=false}={}){
 const f=await fixture({inputs}),blocks=(await f.s.snapshot()).library.blocks,topic=await f.s.createTopic({operationId:op(),name:'Existing real no-change identity'});
 for(const b of blocks){const input=await f.s.input(b.id);await f.s.addToTopics({operationId:op(),kind:'input',id:b.id,expectedRevision:input.revision,topicIds:[topic.id]});}
 const evidence=async ids=>{const scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true);return Promise.all(ids.map(async inputId=>{const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));return {topicId:topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence};}));};
 const original={operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC existing stable fact',section:'Existing fact',associationIds:[op()],evidence:await evidence(blocks.map(b=>b.id))};
 await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,original);
 const execute=f.provider.execute;f.provider.execute=async(...args)=>{const response=await execute(...args);response.fixture.contextProposal={operation:'NO_CHANGE',itemId:original.itemId,card:original.card,expectedRevision:1,associationIds:original.associationIds};return response;};
 f.service.responseAdapter.context=async(response,metadata,binding)=>{
  f.state.contextOperations++;if(f.state.contextHook)await f.state.contextHook(response,metadata,binding);const proposal=response.fixture.contextProposal;assert.equal(proposal.operation,'NO_CHANGE');assert.deepEqual(response.fixture.binding,binding);
  const groups=[];for(let at=0;at<metadata.units.length;at+=groupSize){const units=metadata.units.slice(at,at+groupSize);groups.push({operation:'NO_CHANGE',units,change:{...proposal,operationId:op(),epoch:'initial',evidence:await evidence(units.map(u=>JSON.parse(u.key)[1]))}});}
  if(hole)groups.pop();if(overAck)groups[0].change.evidence.pop();if(historical)await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).noChange(f.caller,groups[0].change);return {binding:forged?{...binding,operationReceiptId:'unrelated-output'}:binding,value:groups};
 };
 f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const page=await f.s.repository.transaction(false,t=>t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,limit:100})),at=page.rows.findIndex(r=>r.value.descriptor.kind==='input'),selected=page.rows.slice(at,at+blocks.length);assert.equal(at>=0,true);assert.equal(selected.length,blocks.length);assert.ok(selected.every(r=>r.value.descriptor.kind==='input'&&blocks.some(b=>b.id===r.value.descriptor.entityId)));const batchOptions={...options,cursor:at? page.rows[at-1].key:null,limit:blocks.length},pendingNonInputs=page.rows.filter(r=>r.value.descriptor.kind!=='input').map(r=>r.value);return {...f,original,topic,batchOptions,pendingNonInputs};
}

test('actual declared provider NO_CHANGE preserves whole Context row and publishes exact body-free ACK without effective generation',async()=>{
 const f=await unchangedFixture(),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.session.prepare(f.batchOptions),r=await f.session.run(handle);assert.equal(handle.complete,false);assert.ok(handle.nextCursor);assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(f.calls.length,1);assert.equal(f.state.contextOperations,1);assert.ok(r.facets.some(x=>x.outcome==='NO_CHANGE'));const a=await ack(f);assert.equal(a.length,2);assert.equal(a.find(x=>x.unit.facet==='context').outcome,'NO_CHANGE');assert.equal((await read(f.s,'organizerUsage'))[0].effectiveResultCount,0);
 const receipts=(await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change');assert.equal(receipts.length,1);assert.ok(!JSON.stringify(receipts).includes('SYNTHETIC existing stable fact'));const all=await snapshot(f.s),writes=f.s.repository.metrics.writes;assert.equal((await f.session.run(handle)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),all);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(f.calls.length,1);assert.deepEqual((await read(f.s,'meta')).filter(r=>r.id.startsWith(DIRTY_PREFIX)&&r.descriptor.kind!=='input'),f.pendingNonInputs);
});

for(const mode of ['hole','forged'])test('same-child no-change '+mode+' never ACKs unchecked Context evidence',async()=>{
 const f=await unchangedFixture({inputs:2,groupSize:1,[mode]:true}),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),r=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(f.calls.length,1);assert.equal((await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change').length,0);
});

for(const stage of ['receipt','ack','usage','job','generation'])test('no-change '+stage+' atomic abort preserves original Context and same-response continuation',async()=>{
 const f=await unchangedFixture(),h=await f.session.prepare(f.batchOptions),row=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,before=null;
 f.s.repository.transaction=async(write,fn,stores)=>{if(write&&f.state.contextOperations>0&&!reached)before=await transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async n=>[n,await t.all(n)]))));return transaction(write,async t=>{if(write&&f.state.contextOperations>0&&!reached){const put=t.put.bind(t);t.put=async(name,r,...args)=>{const value=await put(name,r,...args);const hit=stage==='receipt'?name==='operationReceipts'&&r.result?.disposition==='no_change':stage==='ack'?name==='organizerWorkItems'&&r.outcome==='NO_CHANGE':stage==='usage'?name==='organizerUsage'&&r.state==='COMMITTED':stage==='job'?name==='organizerJobs'&&r.state==='COMMITTED':name==='meta'&&r.id==='backup-data-generation';if(hit&&!reached){reached=true;throw Error('synthetic no-change atomic abort');}return value;};}return fn(t);},stores);};
 const result=await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(reached,true);assert.equal(result.state,'PARTIAL');assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),row);assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.contextOperations,1);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),row);
});

test('checked no-change prefix survives second-group failure and exact continuation never repeats prefix or provider',async()=>{
 const f=await unchangedFixture({inputs:2,groupSize:1}),h=await f.session.prepare(f.batchOptions),row=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let receipts=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,r,...args)=>{const value=await put(name,r,...args);if(name==='operationReceipts'&&r.result?.disposition==='no_change'&&++receipts===2)throw Error('synthetic group failure');return value;};}return fn(t);},stores);
 const first=await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(first.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.outcome==='NO_CHANGE').length,1);assert.equal((await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change').length,1);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),row);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.state.contextOperations,1);assert.equal((await ack(f)).filter(a=>a.outcome==='NO_CHANGE').length,2);assert.equal((await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change').length,2);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),row);
});


test('two claimed Context units cannot receive ACK from one checked Source/Input evidence',async()=>{
 const f=await unchangedFixture({inputs:2,overAck:true}),row=await read(f.s,'meta',CONTEXT_CARDS_ROW),r=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),row);assert.equal(f.calls.length,1);
});

test('standalone no-change historical replay is not an atomic job ACK and cold output loss never redispatches',async()=>{
 const f=await unchangedFixture({historical:true}),h=await f.session.prepare(f.batchOptions),r=await f.session.run(h);assert.equal(r.state,'PARTIAL');assert.ok(r.facets.some(x=>x.reason==='DOMAIN_REPLAY_UNACKNOWLEDGED'));assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal((await read(f.s,'operationReceipts')).filter(x=>x.result?.disposition==='no_change').length,1);const before=await snapshot(f.s),writes=f.s.repository.metrics.writes;
 f.session.dispose();const cold=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});await assert.rejects(cold.prepare(f.batchOptions),{code:'UNAVAILABLE'},'original host opportunity cannot authorize a new narrowed job after output loss');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.equal(f.calls.length,1);assert.equal(f.s.repository.metrics.writes,writes);assert.deepEqual(await snapshot(f.s),before);
});
