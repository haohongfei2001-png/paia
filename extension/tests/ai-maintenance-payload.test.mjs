import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicFormationService} from '../core/topic-formation.js';
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
  assert.ok(r.material,'actual maintenance provider requires bounded Working material');const view={...r.material,inputs:r.material.inputs.map(i=>({id:i.inputId,role:'primary',fields:{body:i.body},revision:i.revision})),entries:[]};
  const proposed=assessment(view,{name:'Synthetic maintenance object '+calls.length,evidence:view.inputs.map(i=>citation(i)),entries:view.inputs.map(i=>({span:citation(i),type:'idea',additional:[]}))});
  const response={accepted:true,operationReceiptId:'synthetic-physical-'+r.childOperationId,fixture:{binding:{logicalJobId:r.logicalJobId,childOperationId:r.childOperationId,operationReceiptId:'synthetic-physical-'+r.childOperationId},topicAssessment:proposed,contextProposal:{operation:'ADD',card:'info',body:'Resolved from '+view.inputs[0].fields.body,section:'Synthetic maintenance',inputIds:r.coverage.filter(u=>u.facet==='context').map(u=>JSON.parse(u.key)[1])},token:'PRIVATE_PROVIDER_BODY '+calls.length}};const actual=JSON.parse(JSON.stringify(response));responses.push(actual);return actual;
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

test('actual bounded Working provider request is causally consumed by original Topic and Context ACK',async()=>{
 const f=await fixture(),block=(await f.s.snapshot()).library.blocks[0];await inputEdit(f.s,block.id,{libraryText:'SYNTHETIC_CURRENT_WORKING'});
 const sources=await read(f.s,'records');const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.inputs[0].body,'SYNTHETIC_CURRENT_WORKING');assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0].body,'Resolved from SYNTHETIC_CURRENT_WORKING');assert.equal((await ack(f)).length,2);assert.deepEqual(await read(f.s,'records'),sources);const wire=JSON.stringify(f.calls[0]);assert.ok(!wire.includes('Synthetic explicit working input'));assert.ok(!wire.includes('https://'));assert.equal(Object.hasOwn(f.calls[0].material,'context'),false);const durable=await snapshot(f.s);assert.ok(!JSON.stringify([durable.organizerJobs,durable.organizerUsage,durable.organizerWorkItems]).includes('SYNTHETIC_CURRENT_WORKING'));
});


test('two explicitly authorized conversations share a bounded purpose request without legacy organize gateway relaxation',async()=>{
 const f=await fixture();await f.s.capture({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'other-synthetic-conversation',url:'https://chatgpt.com/c/other-synthetic-conversation',title:'NOT_OUTBOUND_SOURCE_TITLE'},messages:[{sourceMessageId:'second-user',pageOrder:1,originalText:'SECOND_ALLOWED_WORKING'}]});
 const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.inputs.length,2);assert.ok(f.calls[0].material.inputs.some(i=>i.body==='SECOND_ALLOWED_WORKING'));assert.equal((await ack(f)).length,4);assert.ok(!JSON.stringify(f.calls).includes('NOT_OUTBOUND_SOURCE_TITLE'));assert.ok(!JSON.stringify(f.calls).includes('https://'));
});

test('source-equal Working body is intentionally transmitted but no Source object, note or history is collected',async()=>{
 const f=await fixture(),b=(await f.s.snapshot()).library.blocks[0];await inputEdit(f.s,b.id,{note:'PRIVATE_NOTE_NOT_SELECTED'});
 const r=await f.session.run(await f.session.prepare(options));assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls[0].material.inputs[0].body,'Synthetic explicit working input');assert.ok(!JSON.stringify(f.calls).includes('PRIVATE_NOTE_NOT_SELECTED'));assert.ok(f.calls[0].material.inputs.every(i=>!Object.hasOwn(i,'note')&&!Object.hasOwn(i,'originalText')&&!Object.hasOwn(i,'sourceIds')));
});

for(const missing of ['allowed','epoch','scope'])test('missing original processing '+missing+' refuses before actual dispatch attempt',async()=>{
 const f=await fixture();f.service.topic.resolveProcessing=async(_t,q)=>({allowed:missing!=='allowed',epoch:missing==='epoch'?null:'synthetic',inputIds:missing==='scope'?[]:[...q.inputIds],topicIds:[...q.topicIds]});const session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service}),h=await session.prepare(options),r=await session.run(h);
 assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);assert.equal((await ack(f)).length,0);
});

for(const drift of ['processing','restore','removed','filter','working','source-hash','topic'])test('actual '+drift+' change at the final original material read blocks body dispatch',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),b=(await f.s.snapshot()).library.blocks[0];
 const check=TopicFormationService.prototype.checkMaterial;let count=0,changed=false;
 TopicFormationService.prototype.checkMaterial=async function(handle){await check.call(this,handle);count++;if(count===4){changed=true;
  if(drift==='processing')f.processing.allowed=false;
  if(drift==='restore')await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-new-restore'}));
  if(drift==='removed')await f.s.excludeLibrary(b.id,true);
  if(drift==='filter'){await f.s.setFilterMode('light');await f.s.updateLibrary(b.id,{libraryText:'继续'}); // human update is protected; corrupt prior machine state only for fault qualification
   await f.s.repository.transaction(true,async t=>{const row=await t.get('filterInputs',b.id);Object.assign(row,{userEdited:false,filterOverride:'none',authorship:'untouched',presence:{version:1,attachment:'absent',reference:'absent',confidence:'verified'},pendingKey:0});await t.put('filterInputs',row);await t.delete('filterIntents',(await t.get('recordIndex',b.originalTextReference)).sourceKey);});await f.s.evaluateFilters();}
  if(drift==='working')await inputEdit(f.s,b.id,{libraryText:'DRIFT_MUST_NOT_DISPATCH'});
  if(drift==='source-hash')await f.s.repository.transaction(true,async t=>{const row=await t.get('records',b.originalTextReference);row.value.originalText='CORRUPTED_SOURCE_BODY';await t.put('records',row);});
  if(drift==='topic')await f.s.createTopic({name:'New human identity',operationId:op()});
 }};
 try{const r=await f.session.run(h);assert.equal(changed,true);assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);const attempts=await read(f.s,'organizerUsage');assert.ok(attempts.every(a=>a.attemptCount===0||a.state==='OUTCOME_UNKNOWN'));}finally{TopicFormationService.prototype.checkMaterial=check;}
});

test('long real current Working material refuses before reserve or provider without truncation',async()=>{
 const f=await fixture(),b=(await f.s.snapshot()).library.blocks[0];await inputEdit(f.s,b.id,{libraryText:'汉'.repeat(12000)});const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'INVALID_REQUEST','original TopicFormation byte admission code is retained');assert.equal(f.calls.length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);assert.equal((await f.s.input(b.id)).libraryText.length,12000);
});

test('exact original request/content budgets reject rather than truncate a legitimate material object',()=>{
 const view={inputs:[{id:'input',role:'primary',fields:{body:'汉'.repeat(10)},revision:1}],identities:[],sections:[],constraints:[]},metadata={logicalJobId:'job',coverage:[],evidence:[]},material={view,sourceCount:1};const unlimited={maxInputs:20,maxContentBytes:32768,maxRequestBytes:49152},p=createMaintenancePayload(metadata,material,unlimited),bodyBytes=new TextEncoder().encode(JSON.stringify(p.material)).length,requestBytes=new TextEncoder().encode(JSON.stringify(p)).length;
 assert.deepEqual(createMaintenancePayload(metadata,material,{...unlimited,maxContentBytes:bodyBytes,maxRequestBytes:requestBytes}),p);for(const limits of [{...unlimited,maxContentBytes:bodyBytes-1},{...unlimited,maxRequestBytes:requestBytes-1}])assert.throws(()=>createMaintenancePayload(metadata,material,limits),{code:'BUDGET_EXCEEDED'});
 for(const sourceCount of [0,21,NaN])assert.throws(()=>createMaintenancePayload(metadata,{view,sourceCount},unlimited),{code:'BUDGET_EXCEEDED'});
 const many={...view,inputs:Array.from({length:21},(_,i)=>({...view.inputs[0],id:'input'+i}))};assert.throws(()=>createMaintenancePayload(metadata,{view:many,sourceCount:1},unlimited),{code:'BUDGET_EXCEEDED'});
});


for(const defect of ['missing','false','revoked','expired','store','caller','principal','fields','facets','epoch','async-current'])test('default-denied unified material processing '+defect+' reads no body and makes no physical attempt',async()=>{
 const f=await fixture(),original=f.materialProcessing.resolve;let bodies=0;const material=TopicFormationService.prototype.prepareMaterial;
 TopicFormationService.prototype.prepareMaterial=function(...args){bodies++;return material.apply(this,args);};
 const processing=defect==='missing'?null:{...f.materialProcessing,resolve:async(...args)=>{const r=await original(...args);if(defect==='false')r.processing=false;if(defect==='revoked')f.contextAbort.abort();if(defect==='expired')r.expiresAt=Date.now()-1;if(defect==='store')r.store={};if(defect==='caller')r.caller=Object.freeze({...f.caller});if(defect==='principal')r.scope={...r.scope,principalId:'unrelated-principal'};if(defect==='fields')r.scope={...r.scope,inputs:r.scope.inputs.map(i=>({...i,selectedFields:['body','note']}))};if(defect==='facets')r.scope={...r.scope,facets:['topic']};if(defect==='epoch')r.epoch='';return r;},isCurrent:defect==='async-current'?async()=>true:f.materialProcessing.isCurrent};
 try{const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing}),h=await session.prepare(options),r=await session.run(h);assert.notEqual(r.state,'COMMITTED');assert.equal(bodies,0);assert.equal(f.calls.length,0);assert.equal((await read(f.s,'organizerUsage')).length,0);assert.equal((await ack(f)).length,0);}finally{TopicFormationService.prototype.prepareMaterial=material;}
});

test('unified processing epoch cannot silently change between preflight and physical call',async()=>{
 const f=await fixture(),resolve=f.materialProcessing.resolve;let calls=0;const processing={...f.materialProcessing,resolve:async(...args)=>({...await resolve(...args),epoch:++calls<=2?'synthetic-original':'synthetic-other'})},session=new LocalMaintenanceSession(f.s,{...f.constructor,processing});const r=await session.run(await session.prepare(options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.ok(calls>=3);assert.equal((await ack(f)).length,0);
});

for(const stop of ['false','revoked','expired'])test('unified processing '+stop+' during a returned actual proposal denies both domain writes and ACK',async()=>{
 const f=await fixture(),resolve=f.materialProcessing.resolve;let expiry=Date.now()+600000;const processing={...f.materialProcessing,resolve:async(...args)=>({...await resolve(...args),expiresAt:expiry})},provider={...f.provider,execute:async(...args)=>{const response=await f.provider.execute(...args);if(stop==='false')f.state.processing=false;if(stop==='revoked')f.contextAbort.abort();if(stop==='expired')expiry=Date.now()-1;return response;}};
 // Expiry is an immutable captured receipt, so exercise the actual captured
 // expiry with a deterministic Date clock seam rather than replacement DTO.
 const originalNow=Date.now;if(stop==='expired')Date.now=()=>originalNow();
 const session=new LocalMaintenanceSession(f.s,{...f.constructor,processing,provider});
 if(stop==='expired')provider.execute=async(...args)=>{const response=await f.provider.execute(...args);Date.now=()=>originalNow()+700000;return response;};
 try{const r=await session.run(await session.prepare(options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'topics')).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);assert.equal((await read(f.s,'organizerUsage'))[0].state,'OUTCOME_UNKNOWN');assert.equal((await read(f.s,'organizerUsage'))[0].attemptCount,1);}finally{Date.now=originalNow;}
});

test('opaque material handle current-read protects Source corruption and rejects forged/released/cancelled access',async()=>{
 const f=await fixture(),b=(await f.s.snapshot()).library.blocks[0],owner=new TopicFormationService(f.s,{resolveProcessing:f.service.topic.resolveProcessing,parameters});const scope=[{inputId:b.id,role:'primary',selectedFields:['body']}],controller=new AbortController(),handle=await owner.prepareMaterial({scope},{signal:controller.signal});
 const initial=await owner.readMaterial(handle);assert.equal(initial.sourceCount,1);assert.equal(initial.view.inputs[0].fields.body,'Synthetic explicit working input');await assert.rejects(owner.readMaterial({}));controller.abort();await assert.rejects(owner.readMaterial(handle));owner.releaseMaterial(handle);await assert.rejects(owner.readMaterial(handle));
});


for(const stop of ['false','revoked','expired'])test('unified '+stop+' after recorded response and before Topic write clears private capability and preserves zero ACK',async()=>{
 const f=await fixture(),originalNow=Date.now;
 f.state.topicHook=()=>{if(stop==='false')f.state.processing=false;if(stop==='revoked')f.contextAbort.abort();if(stop==='expired')Date.now=()=>originalNow()+700000;};
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'UNAVAILABLE');assert.equal(f.calls.length,1);assert.equal((await read(f.s,'organizerUsage'))[0].state,'RESPONSE_RECORDED');assert.equal((await read(f.s,'topics')).length,0);assert.equal((await ack(f)).length,0);if(stop==='false')f.state.processing=true;Date.now=originalNow;assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal((await ack(f)).length,0);assert.equal(f.calls.length,1);}finally{Date.now=originalNow;}
});

for(const stop of ['false','revoked','expired'])test('partial Context continuation cannot reuse processed response after unified '+stop,async()=>{
 const f=await fixture(),write=f.s.foundationWrite.bind(f.s);let failed=false;
 f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(!failed&&name==='operationReceipts'&&row.namespace==='context-maintenance'){failed=true;throw Error('synthetic Context storage failure');}return result;};return fn(t);});
 const h=await f.session.prepare(options),r=await f.session.run(h);f.s.foundationWrite=write;assert.equal(failed,true);assert.equal(r.state,'PARTIAL');assert.equal((await ack(f)).length,1);assert.equal((await read(f.s,'topics')).length,1);const before=await snapshot(f.s),writes=f.s.repository.metrics.writes,originalNow=Date.now;
 if(stop==='false')f.state.processing=false;if(stop==='revoked')f.contextAbort.abort();if(stop==='expired')Date.now=()=>originalNow()+700000;
 try{assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.s.repository.metrics.writes,writes);if(stop==='false')f.state.processing=true;Date.now=originalNow;assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal(f.calls.length,1);assert.deepEqual(await snapshot(f.s),before);}finally{Date.now=originalNow;}
});
