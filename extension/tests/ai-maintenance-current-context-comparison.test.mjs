import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
import {createMaintenancePayload} from '../core/ai-usage/maintenance-payload.js';
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



test('current comparison uses opened current Item text in the real maintenance child payload',async()=>{
 const f=await fixture(),cards=new ContextCardsService(f.s),itemId=op();
 await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId,expectedRevision:0,body:'SYNTHETIC human current comparison',section:'SYNTHETIC comparison',card:'info'});
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,expectedRevision:0,enabled:true});
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.currentContextComparison?.items[0]?.itemId,itemId);assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(result.state,'PARTIAL');assert.ok(result.blockedUnits>0);assert.equal(f.calls[0].material.currentContextComparison.items[0].protected,true);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===itemId).revision,1);}finally{f.session.dispose();}
});

async function comparisonFixture({count=1,body='SYNTHETIC human comparison'}={}){
 const f=await fixture(),cards=new ContextCardsService(f.s),ids=[];
 for(let i=0;i<count;i++){const itemId=op();ids.push(itemId);await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId,expectedRevision:0,body:body+i,section:'SYNTHETIC comparison',card:'info'});}
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,expectedRevision:0,enabled:true});return {...f,cards,ids};
}
test('current comparison duplicate commits only exact new delta ACK and leaves human Item unchanged',async()=>{
 const f=await comparisonFixture(),adapt=f.service.responseAdapter.context;let operationId;
 f.service.responseAdapter.context=async(response,metadata,binding)=>{const mapped=await adapt(response,metadata,binding),{epoch,associationIds,provenance,...comparison}=metadata.currentContextComparison.items[0];operationId=op();return {binding,value:mapped.value.map(g=>({units:g.units,operation:'DUPLICATE_CURRENT',change:{version:1,operation:'DUPLICATE_CURRENT',operationId,epoch,itemId:comparison.itemId,card:comparison.card,expectedRevision:comparison.revision,comparison,evidence:g.change.evidence}}))};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.session.prepare(options);
 try{const result=await f.session.run(handle);assert.equal(result.facets.find(x=>x.facet==='context').outcome,'NO_CHANGE',JSON.stringify(result));assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);const receipts=(await read(f.s,'operationReceipts')).filter(r=>r.id==='context-maintenance:'+operationId);assert.equal(receipts.length,1);assert.equal(receipts[0].schemaVersion,2);assert.equal(receipts[0].result.disposition,'duplicate_current');const a=(await ack(f)).filter(r=>r.unit.facet==='context');assert.equal(a.length,1);assert.equal(a[0].outcome,'NO_CHANGE');await f.session.run(handle);assert.equal(f.calls.length,1);assert.equal((await ack(f)).filter(r=>r.unit.facet==='context').length,1);}finally{f.session.dispose();}
});
for(const defect of ['missing grant','revoked grant','changed card','changed revision'])test('current comparison rejects '+defect+' before provider',async()=>{
 const f=await comparisonFixture(),resolve=f.materialProcessing.resolve;let reached=false,mutation=null;
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);if(scope.purpose==='ai-maintenance-payload'&&scope.currentContextComparison&&!reached){reached=true;if(defect==='missing grant'){const {currentContextComparison,...rest}=scope;return {...receipt,scope:rest};}if(defect==='revoked grant')f.contextAbort.abort();else if(defect==='changed card')mutation=f.cards.change({kind:'access',operationId:op(),epoch:'initial',key:'info',enabled:false,expectedRevision:1});else if(defect==='changed revision')mutation=f.cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:f.ids[0],expectedRevision:1,body:'SYNTHETIC intervening edit',section:'SYNTHETIC comparison'});}return receipt;};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});
 try{await f.session.run(await f.session.prepare(options));await mutation;assert.equal(reached,true);assert.equal(f.calls.length,0);assert.equal((await ack(f)).filter(r=>r.unit.facet==='context').length,0);}finally{f.session.dispose();}
});
test('current comparison single page reports twenty of twenty-one without continuation or false completeness',async()=>{
 const f=await comparisonFixture({count:21});try{await f.session.run(await f.session.prepare(options));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.currentContextComparison.items.length,20);assert.deepEqual(f.calls[0].material.currentContextComparisonSummary,{version:1,coverage:'open_cards_current_items',selectedItems:20,omittedItems:1,complete:false});}finally{f.session.dispose();}
});
test('current comparison new-source update preserves Item identity and uses only independently new evidence',async()=>{
 const f=await fixture({inputs:2}),blocks=(await f.s.snapshot()).library.blocks,[oldInput,newInput]=blocks,topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC unrelated original topic'});
 await f.s.addToTopics({operationId:op(),kind:'input',id:oldInput.id,expectedRevision:(await f.s.input(oldInput.id)).revision,topicIds:[topic.id]});const scope=await readContextTopicScope(f.s,{topicId:topic.id}),projection=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,oldInput.id)),itemId=op(),associationIds=[op()];
 await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,{operationId:op(),epoch:'initial',itemId,card:'info',expectedRevision:0,body:'SYNTHETIC older independent claim',section:'SYNTHETIC fact',associationIds,evidence:[{topicId:topic.id,inputId:oldInput.id,selectedFields:['body'],fieldDigests:{body:await hashText(projection.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:projection.lastRemovalSequence}]});
 const cards=new ContextCardsService(f.s);for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});const adapt=f.service.responseAdapter.context;
 f.service.responseAdapter.context=async(response,metadata,binding)=>{const mapped=await adapt(response,metadata,binding),baseline=metadata.currentContextComparison.items.find(i=>i.itemId===itemId);assert.ok(baseline);assert.equal(Object.hasOwn(baseline,'currentEvidence'),false);return {binding,value:mapped.value.map(g=>({units:g.units,operation:'UPDATE_FROM_NEW_EVIDENCE',change:{...g.change,itemId,card:'info',expectedRevision:baseline.revision,associationIds,body:'SYNTHETIC fully supported new claim',section:'SYNTHETIC replacement'}}))};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const page=await f.s.repository.transaction(false,t=>t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,limit:100})),at=page.rows.findIndex(r=>r.value.descriptor.kind==='input'&&r.value.descriptor.entityId===newInput.id);assert.ok(at>=0);
 try{const result=await f.session.run(await f.session.prepare({...options,cursor:at?page.rows[at-1].key:null,limit:1}));assert.equal(result.facets.find(x=>x.facet==='context').state,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].material.inputs.map(i=>i.inputId),[newInput.id]);assert.equal(f.calls[0].material.existingContextItems,undefined);const sent=f.calls[0].material.currentContextComparison.items[0];assert.equal(sent.itemId,itemId);for(const key of ['provenance','associationIds','currentEvidence','sourceRecordIds','epoch'])assert.equal(Object.hasOwn(sent,key),false);const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===itemId);assert.equal(item.revision,2);assert.equal(item.body,'SYNTHETIC fully supported new claim');assert.deepEqual(item.maintenance.associationIds,associationIds);assert.deepEqual(item.maintenance.provenance.evidence.map(e=>e.inputId),[newInput.id]);}finally{f.session.dispose();}
});
test('current comparison bytes omissions remain truthful inside the original request budget',async()=>{
 const f=await comparisonFixture({count:5,body:'SYNTHETIC '+'.'.repeat(7000)});try{const result=await f.session.run(await f.session.prepare(options)),payload=f.calls[0],summary=payload.material.currentContextComparisonSummary;assert.equal(f.calls.length,1);assert.ok(summary.omittedItems>0);assert.equal(summary.complete,false);assert.equal(summary.selectedItems+summary.omittedItems,5);assert.equal(result.currentContextComparisonIncomplete,true);assert.equal(result.remainingWork,true);assert.ok(new TextEncoder().encode(JSON.stringify(payload.material)).length<=f.s.organizerBudget.limits.maxContentBytes);assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length<=f.s.organizerBudget.limits.maxRequestBytes);}finally{f.session.dispose();}
});
test('current comparison selector stays metadata-only and uncaptured receipt cannot start Item reads',async()=>{
 const f=await comparisonFixture(),api=await import('../core/ai-usage/maintenance-existing-context.js'),{createContextScopeWorkBudget}=await import('../core/context-topic-scope.js');let bodyTouches=0,materialReads=0;const tables=new Set();
 try{const handle=await f.s.repository.transaction(false,async t=>{const reader=Object.create(t);reader.get=async(table,id)=>{tables.add(table);const value=await t.get(table,id);if(table==='meta'&&id===CONTEXT_CARDS_ROW)for(const item of value.items)for(const key of ['body','section'])Object.defineProperty(item,key,{enumerable:true,get(){bodyTouches++;throw Error('ungranted current Item text');}});return value;};return api.selectMaintenanceCurrentContext(f.s,reader,{workBudget:createContextScopeWorkBudget({database:f.s.repository.db})});});
  const comparison=api.maintenanceCurrentContextScope(handle);assert.equal(bodyTouches,0);assert.equal(comparison.items.length,1);assert.deepEqual([...tables],['meta']);assert.deepEqual(comparison.items[0].selectedFields,['body','section']);for(const key of ['body','section','inputIds','sourceRecordIds','provenance'])assert.equal(Object.hasOwn(comparison.items[0],key),false);
  const raw=await f.materialProcessing.resolve(null,{currentContextComparison:comparison});await assert.rejects(api.captureMaintenanceCurrentContext(f.s,handle,{receipt:raw,processing:f.materialProcessing,read(){materialReads++;throw Error('ungranted read');},limits:f.s.organizerBudget.limits}),{code:'UNAVAILABLE'});assert.equal(materialReads,0);api.releaseMaintenanceCurrentContext(handle);
 }finally{f.session.dispose();}
});
