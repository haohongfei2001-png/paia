// Synthetic original-owner fixture retained from the owning Maintenance tests.
import assert from 'node:assert/strict';
import {createMaintenancePayload} from '../../../extension/core/ai-usage/maintenance-payload.js';
import {LocalMaintenanceSession} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {readMaintenanceBatch,unsupportedMaintenanceCoverage} from '../../../extension/core/ai-usage/maintenance-batch.js';
import {TopicFormationService} from '../../../extension/core/topic-formation.js';
import {authoredContextEvidence} from '../../../extension/core/context-authored-entry.js';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {ContextMaintenanceService} from '../../../extension/core/context-maintenance.js';
import {CONTEXT_CARDS_ROW,ContextCardsService} from '../../../extension/core/context-cards.js';
import {readContextTopicScope} from '../../../extension/core/context-topic-scope.js';
import {inputProjection} from '../../../extension/core/thought-evidence.js';
import {hashText} from '../../../extension/core/dedupe.js';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {setup,capture,inputEdit} from '../../../extension/tests/harness/thought-m1.mjs';
import {TopicIdentityRetrieval} from '../../../extension/core/topic-retrieval.js';
import {readFormationEvidence} from '../../../extension/core/topic-formation-evidence.js';
import {assessment,parameters,citation} from '../../../extension/tests/harness/topic-03.mjs';

const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const snapshot=s=>s.repository.transaction(false,async t=>{const all={};for(const n of s.repository.stores)all[n]=await t.all(n);return all;});
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
function nonAuthority(r){assert.equal(r.dispatchAllowed,false);assert.equal(r.financialAuthority,false);assert.doesNotMatch(JSON.stringify(r),/PRIVATE_CONTEXT_BODY|PRIVATE_PROVIDER_BODY/);}

export async function localMaintenanceFixture({inputs=1,tier='free',providerMode='valid',adapterMode='valid',groupSize=16}={}){
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

export async function mixedMaintenanceFixture({authored=true,placement=true}={}){
 const f=await localMaintenanceFixture();assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');f.session.dispose();
 const input=(await f.s.snapshot()).library.blocks[0],topic=(await read(f.s,'topics'))[0],entry=(await read(f.s,'thoughts'))[0];
 if(placement){const p=(await read(f.s,'placements'))[0];await f.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});}
 let human=null;if(authored){human=await f.s.createEntry({actor:'user',operationId:op(),body:'SYNTHETIC independent body',note:'SYNTHETIC independent note',type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({entryId:human.id,topicId:topic.id,expectedEntryRevision:human.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});}
 await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC changed current Input'});f.calls.length=0;f.responses.length=0;const execute=f.provider.execute,grants=[],events=[];
 f.provider.execute=async request=>{events.push('provider:'+request.coverage.some(u=>u.facet==='topic'));if(request.coverage.some(u=>u.facet==='topic')){const response=await execute(request);for(const relation of response.fixture.topicAssessment.relations)if(relation.topicId===topic.id)relation.relation='same';return response;}f.calls.push(structuredClone(request));return {accepted:true,operationReceiptId:'synthetic-context-'+request.childOperationId,body:'SYNTHETIC final Context'};};
 f.service.responseAdapter.context=async(response,metadata,binding)=>{const evidence=[];
  for(const inputId of metadata.inputIds){let scope;const target=metadata.placements?.find(p=>p.inputId===inputId)?.topicId??topic.id;scope=await readContextTopicScope(f.s,{topicId:target});assert.equal(scope.available,true);const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:target,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence});}
  for(const m of metadata.authoredEntries||[]){const scope=await readContextTopicScope(f.s,{topicId:m.topicId});assert.equal(scope.available,true);evidence.push(authoredContextEvidence(m,scope.binding,m.fieldDigests??m.bodyDigest));}
  return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body??response.fixture.contextProposal.body,section:'Synthetic mixed',associationIds:[op()],evidence}}]};
 };
 const resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>{grants.push(structuredClone(scope));events.push('grant:'+!!scope.authoredEntries+':'+!!scope.placements);return resolve(t,scope);};
 let grant;const window={acquire:async r=>grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-mixed-phases',reservationId:'synthetic-mixed-phases',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal},isCurrent:r=>r===grant};
 const constructor={...f.constructor,window,processing:f.materialProcessing},session=new LocalMaintenanceSession(f.s,constructor);return {...f,constructor,session,input,topic,human,grants,events};
}
