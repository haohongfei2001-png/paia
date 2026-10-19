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



async function unchangedFixture({inputs=1,groupSize=16,hole=false,forged=false,overAck=false,historical=false,card='info',temporal=null}={}){
 const f=await fixture({inputs}),blocks=(await f.s.snapshot()).library.blocks,topic=await f.s.createTopic({operationId:op(),name:'Existing real no-change identity'});
 for(const b of blocks){const input=await f.s.input(b.id);await f.s.addToTopics({operationId:op(),kind:'input',id:b.id,expectedRevision:input.revision,topicIds:[topic.id]});}
 const evidence=async ids=>{const scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true);return Promise.all(ids.map(async inputId=>{const p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));return {topicId:topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence};}));};
 const original={operationId:op(),epoch:'initial',itemId:op(),card,expectedRevision:0,...(temporal?{temporal}:{}),body:'SYNTHETIC existing stable fact',section:'Existing fact',associationIds:[op()],evidence:await evidence(blocks.map(b=>b.id))};
 await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,original);
 const execute=f.provider.execute;f.provider.execute=async(...args)=>{const response=await execute(...args);response.fixture.contextProposal={operation:'NO_CHANGE',itemId:original.itemId,card:original.card,expectedRevision:1,associationIds:original.associationIds};return response;};
 f.service.responseAdapter.context=async(response,metadata,binding)=>{
  f.state.contextOperations++;if(f.state.contextHook)await f.state.contextHook(response,metadata,binding);const proposal=response.fixture.contextProposal;assert.equal(proposal.operation,'NO_CHANGE');assert.deepEqual(response.fixture.binding,binding);
  const groups=[];for(let at=0;at<metadata.units.length;at+=groupSize){const units=metadata.units.slice(at,at+groupSize);groups.push({operation:'NO_CHANGE',units,change:{...proposal,operationId:op(),epoch:'initial',evidence:await evidence(units.map(u=>JSON.parse(u.key)[1]))}});}
  if(hole)groups.pop();if(overAck)groups[0].change.evidence.pop();if(historical)await new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).noChange(f.caller,groups[0].change);return {binding:forged?{...binding,operationReceiptId:'unrelated-output'}:binding,value:groups};
 };
 f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const page=await f.s.repository.transaction(false,t=>t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,limit:100})),at=page.rows.findIndex(r=>r.value.descriptor.kind==='input'),selected=page.rows.slice(at,at+blocks.length);assert.equal(at>=0,true);assert.equal(selected.length,blocks.length);assert.ok(selected.every(r=>r.value.descriptor.kind==='input'&&blocks.some(b=>b.id===r.value.descriptor.entityId)));const batchOptions={...options,cursor:at? page.rows[at-1].key:null,limit:blocks.length},pendingNonInputs=page.rows.filter(r=>r.value.descriptor.kind!=='input').map(r=>r.value);return {...f,original,topic,batchOptions,pendingNonInputs};
}


// Genuine final-write races, using the same production Foundation/Context owners.
for(const stage of ['receipt','ack','counter'])for(const drift of ['item','source','processing'])test('existing Context final '+stage+' '+drift+' drift rolls back the original transaction',async()=>{
 const f=await unchangedFixture(),handle=await f.session.prepare(f.batchOptions),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...more)=>{const value=await put(name,row,...more);const hit=stage==='receipt'?name==='operationReceipts'&&row.result?.disposition==='no_change':stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.outcome==='NO_CHANGE':name==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0;if(hit&&!reached){reached=true;if(drift==='item'){const value=await t.get('meta',CONTEXT_CARDS_ROW);value.items.find(i=>i.id===f.original.itemId).body='SYNTHETIC intervening Item change';await put('meta',value);}else if(drift==='source'){const values=await t.all('records');values[0].value.originalText='SYNTHETIC intervening Source change';await put('records',values[0]);}else f.state.generation++;}return value;};}return fn(t);},...rest);
 try{const result=await f.session.run(handle);assert.equal(reached,true,'injection stage reached');assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal((await read(f.s,'operationReceipts')).filter(r=>r.result?.disposition==='no_change').length,0);assert.equal(f.calls.length,1);}finally{f.s.repository.transaction=transaction;f.session.dispose();}
});

for(const operation of ['UPDATE','ADD'])for(const mutation of ['protected','removed','duplicate'])test('schema-valid '+operation+' racing '+mutation+' never ACKs a misleading original-owner disposition',async()=>{
 const f=await unchangedFixture(),adapt=f.service.responseAdapter.context;let operationId=null;
 f.service.responseAdapter.context=async(...args)=>{const decoded=await adapt(...args);for(const group of decoded.value){group.operation=operation;if(operation==='ADD')group.change.expectedRevision=0;delete group.change.operation;group.change.body='SYNTHETIC proposed update';group.change.section='SYNTHETIC update';operationId=group.change.operationId;}return decoded;};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.session.prepare(f.batchOptions),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const get=t.get.bind(t);t.get=async(name,id,...more)=>{const value=await get(name,id,...more);if(!reached&&operationId&&name==='operationReceipts'&&id==='context-maintenance:'+operationId){reached=true;const row=await get('meta',CONTEXT_CARDS_ROW),target=row.items.find(i=>i.id===f.original.itemId);if(mutation==='duplicate'){target.id=op();}else{target.protected=true;target.userEdited=true;if(mutation==='removed'){target.lifecycle='removed';target.deletedBy=op();}}await t.put('meta',row);}return value;};}return fn(t);},...rest);
 try{const result=await f.session.run(handle);assert.equal(reached,true);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal((await read(f.s,'operationReceipts')).filter(r=>r.id==='context-maintenance:'+operationId).length,0);assert.equal(f.calls.length,1);}finally{f.s.repository.transaction=transaction;f.session.dispose();}
});

test('ordinary existing Item state crosses only its independent exact field grant',async()=>{
 const f=await unchangedFixture(),resolve=f.materialProcessing.resolve,scopes=[];
 f.materialProcessing.resolve=async(t,scope)=>{if(scope.purpose!=='ai-maintenance-payload')return resolve(t,scope);scopes.push(structuredClone(scope));assert.equal(scope.existingContextItems.length,1);const selected=scope.existingContextItems[0];assert.equal(selected.itemId,f.original.itemId);assert.deepEqual(selected.selectedFields,['body','section']);assert.equal(Object.hasOwn(selected,'body'),false);assert.equal(Object.hasOwn(selected,'section'),false);assert.equal(Object.hasOwn(selected,'provenance'),false);return resolve(t,scope);};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const result=await f.session.run(await f.session.prepare(f.batchOptions));
 assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.ok(scopes.length>=2);assert.ok(scopes.every(s=>JSON.stringify(s)===JSON.stringify(scopes[0])));assert.equal(f.calls.length,1);
 const item=f.calls[0].material.existingContextItems[0];assert.equal(item.itemId,f.original.itemId);assert.equal(item.body,f.original.body);assert.equal(item.section,f.original.section);for(const key of ['associationIds','provenance','currentEvidence','currentProvenance','sources'])assert.equal(Object.hasOwn(item,key),false);
 assert.deepEqual(f.calls[0].material.existingContextSummary,{version:1,coverage:'selected_processing_scope',selectedItems:1,omittedItems:0,complete:true});f.session.dispose();
});

for(const missing of ['existing-item','temporal'])test('Input processing never supplies missing '+missing+' field authority',async()=>{
 const f=await unchangedFixture(missing==='temporal'?{card:'now',temporal:{temporalScope:'SYNTHETIC current plan',uncertainty:null,validUntil:'2099-01-01T00:00:00.000Z'}}:{}),resolve=f.materialProcessing.resolve;
 f.materialProcessing.resolve=async(t,scope)=>{if(scope.purpose!=='ai-maintenance-payload')return resolve(t,scope);const raw=await resolve(t,scope),wrong=structuredClone(scope);if(missing==='existing-item')delete wrong.existingContextItems;else wrong.existingContextItems[0].selectedFields=['body','section'];return {...raw,scope:wrong};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const before=await read(f.s,'meta',CONTEXT_CARDS_ROW),result=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(result.state,'UNAVAILABLE');assert.equal(f.calls.length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal((await ack(f)).length,0);f.session.dispose();
});

test('existing Now UPDATE without explicit fresh time clears the old deadline',async()=>{
 const f=await unchangedFixture({card:'now',temporal:{temporalScope:'SYNTHETIC old plan',uncertainty:'SYNTHETIC uncertainty',validUntil:'2099-01-01T00:00:00.000Z'}}),adapt=f.service.responseAdapter.context;
 f.service.responseAdapter.context=async(...args)=>{const decoded=await adapt(...args);for(const group of decoded.value){group.operation='UPDATE';delete group.change.operation;group.change.body='SYNTHETIC new plan without time claim';group.change.section='Current plan';}return decoded;};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const result=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.calls[0].material.existingContextItems[0].temporalStatus,'not_expired');const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===f.original.itemId);assert.equal(item.revision,2);assert.equal(Object.hasOwn(item.maintenance,'temporal'),false);assert.equal(f.calls.length,1);f.session.dispose();
});

for(const stage of ['receipt','ack','usage'])test('ordinary ADD final '+stage+' Source drift cannot publish Context or ACK',async()=>{
 const f=await fixture(),handle=await f.session.prepare(options),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...more)=>{const value=await put(name,row,...more),hit=stage==='receipt'?name==='operationReceipts'&&row.result?.disposition==='created':stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED':name==='organizerUsage'&&row.state==='COMMITTED';if(hit&&!reached&&f.state.contextOperations){reached=true;const records=await t.all('records');records[0].value.originalText='SYNTHETIC concurrent ADD Source drift';await put('records',records[0]);}return value;};}return fn(t);},...rest);
 try{const result=await f.session.run(handle);assert.equal(reached,true);assert.equal(result.state,'PARTIAL');assert.equal((await ack(f)).filter(a=>a.unit.facet==='context').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(f.calls.length,1);}finally{f.s.repository.transaction=transaction;f.session.dispose();}
});

test('direct original Context ADD fences exact selected Input and Source after its own receipt',async()=>{
 const f=await unchangedFixture(),change={...f.original,operationId:op(),itemId:op(),associationIds:[op()]},before=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!reached&&name==='operationReceipts'&&row.id==='context-maintenance:'+change.operationId){reached=true;const records=await t.all('records');records[0].value.originalText='SYNTHETIC direct Source drift';await put('records',records[0]);}return value;};}return fn(t);},...rest);
 try{await assert.rejects(new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,change));assert.equal(reached,true);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);}finally{f.s.repository.transaction=transaction;f.session.dispose();}
});

for(const drift of ['same-input-membership','same-input-dependency','root-epoch'])test('sent existing baseline rejects unauthenticated '+drift+' after Topic ACK and before Context prepare',async()=>{
 const f=await unchangedFixture(),before=await read(f.s,'meta',CONTEXT_CARDS_ROW);let reached=false;
 f.state.contextHook=async()=>{assert.equal((await ack(f)).filter(x=>x.unit.facet==='topic').length,1);reached=true;await f.s.repository.transaction(true,async t=>{
  if(drift==='root-epoch'){const row=await t.get('meta','thought-epoch');await t.put('meta',{id:'thought-epoch',value:(row?.value||0)+1});return;}
  const placements=(await t.all('placements')).filter(x=>x.topicId===f.topic.id),entry=await t.get('thoughts',placements[0].entryId),dependencies=(await t.all('dependencies')).filter(x=>x.entryId===entry.id||x.targetId===entry.id);
  if(drift==='same-input-membership'){const id=op();await t.put('thoughts',{...entry,id});const placement={...placements[0],entryId:id,id:JSON.stringify([f.topic.id,placements[0].layoutGeneration,id])};await t.put('placements',placement);}
  else{assert.ok(dependencies.length);const d=dependencies[0];await t.put('dependencies',{...d,id:d.id+':synthetic-extra'});}
 });};
 try{const result=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(reached,true);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(f.calls.length,1);}finally{f.session.dispose();}
});

test('nested same-Input Topic write injection cannot enter the private publication ledger',async()=>{
 const f=await unchangedFixture(),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!reached&&name==='operationReceipts'&&row.result?.outcome){reached=true;const placement=(await t.all('placements')).find(p=>p.topicId===f.topic.id),entry=await t.get('thoughts',placement.entryId),id=op();await t.put('thoughts',{...entry,id});await t.put('placements',{...placement,entryId:id,id:JSON.stringify([f.topic.id,placement.layoutGeneration,id])});}return value;};}return fn(t);},...rest);
 try{const result=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(reached,true);assert.equal(result.state,'PARTIAL');assert.equal((await ack(f)).length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(f.calls.length,1);}finally{f.s.repository.transaction=transaction;f.session.dispose();}
});

test('non-storage stale existing command is released and never locally replayed',async()=>{
 const f=await unchangedFixture(),adapt=f.service.responseAdapter.context;let decodes=0;
 f.service.responseAdapter.context=async(...args)=>{decodes++;const value=await adapt(...args);value.value[0].change.expectedRevision++;return value;};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const handle=await f.session.prepare(f.batchOptions),first=await f.session.run(handle);assert.equal(first.state,'PARTIAL');assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);const second=await f.session.run(handle);assert.equal(second.state,'PARTIAL');assert.equal(decodes,1);assert.equal(f.calls.length,1);f.session.dispose();
});

for(const bound of ['maxContentBytes','maxRequestBytes'])test('existing Item consumes only the remaining original '+bound+' envelope',async()=>{
 const f=await unchangedFixture();await f.s.repository.transaction(true,async t=>{const row=await t.get('meta',CONTEXT_CARDS_ROW);row.items.find(i=>i.id===f.original.itemId).body='SYNTHETIC bounded body '.repeat(300);await t.put('meta',row);});f.s.organizerBudget.limits[bound]=4000;
 try{const result=await f.session.run(await f.session.prepare(f.batchOptions));assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.calls.length,1);const sent=f.calls[0];assert.equal(sent.material.existingContextItems,undefined);assert.deepEqual(sent.material.existingContextSummary,{version:1,coverage:'selected_processing_scope',selectedItems:0,omittedItems:1,complete:false});assert.ok(new TextEncoder().encode(JSON.stringify(bound==='maxContentBytes'?sent.material:sent)).length<=4000);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);}finally{f.session.dispose();}
});

test('existing Context payload strictly rejects metadata/proof leakage and writable-state substitution',async()=>{
 const f=await unchangedFixture();try{assert.equal((await f.session.run(await f.session.prepare(f.batchOptions))).state,'COMMITTED');const {material:sent,...metadata}=f.calls[0],view={...sent,inputs:sent.inputs.map(x=>({id:x.inputId,revision:x.revision,role:'primary',fields:{body:x.body}})),entries:[]},material={sourceCount:1,view},args=[metadata,material,f.s.organizerBudget.limits,[],[],[],[],[],[]];
 assert.deepEqual(createMaintenancePayload(...args,sent.existingContextItems,sent.existingContextSummary).material,sent);
 for(const defect of ['proof','extra','duplicate','manual','protected','edited','removed','revision','card','temporal']){const items=structuredClone(sent.existingContextItems);if(defect==='proof')items[0].provenance={evidence:[]};if(defect==='extra')items[0].ungranted='synthetic';if(defect==='duplicate')items.push(items[0]);if(defect==='manual')items[0].origin='manual';if(defect==='protected')items[0].protected=true;if(defect==='edited')items[0].userEdited=true;if(defect==='removed')items[0].lifecycle='removed';if(defect==='revision')items[0].revision=0;if(defect==='card')items[0].card='unknown';if(defect==='temporal')items[0].temporalStatus='not_expired';assert.throws(()=>createMaintenancePayload(...args,items,sent.existingContextSummary),undefined,defect);}
 }finally{f.session.dispose();}
});
