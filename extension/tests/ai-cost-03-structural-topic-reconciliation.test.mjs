import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,runFormation,rows,op,parameters,assessment,citation,inputEdit,capture} from './harness/topic-03.mjs';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {CONTEXT_CARDS_ROW,ContextCardsService,CONTEXT_LIMITS} from '../core/context-cards.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>id?t.get(n,id):t.all(n));
async function fixture(){
 const f=await formationFixture();await runFormation(f);const entry=(await rows(f.s,'thoughts'))[0],topic=(await rows(f.s,'topics'))[0],p=(await rows(f.s,'placements'))[0];
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});
 const section=(await rows(f.s,'sections'))[0];await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'SYNTHETIC changed human interpretation',operationId:op()});
 const options={scope:'synthetic-structural',contractVersion:'synthetic-1',routeVersion:'synthetic-structural-1',cursor:'aiu:delta:pending:'+JSON.stringify(['placement',p.id])},caller=Object.freeze({id:op()}),abort=new AbortController(),state={payloadAllowed:true,qualificationAllowed:true,providerHook:null,processingHook:null,evidenceHook:null},calls=[],scopes=[],expiry=Date.now()+600000;
 const authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:scope.purpose==='ai-maintenance-payload'&&state.processingHook?state.processingHook(structuredClone(scope)):scope,epoch:'synthetic-processing',processing:scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadAllowed,expiresAt:expiry,revocationSignal:abort.signal};},isCurrent:r=>(r.scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadAllowed)&&!abort.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.payloadAllowed,expiresAt:expiry,revocationSignal:abort.signal}),isCurrent:()=>state.payloadAllowed&&!abort.signal.aborted};
 let service;const provider={describe:()=>({providerId:'synthetic-structural',version:'1',executionKind:'fixture'}),execute:async request=>{calls.push(structuredClone(request));await state.providerHook?.(request);return JSON.parse(JSON.stringify({accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC Context grounded in actual Input',proposed:assessment({...request.material,inputs:request.material.inputs.map(i=>({id:i.inputId,role:'primary',revision:i.revision,fields:{body:i.body}}))},{name:request.material.structuralTopics[0].name,relations:[...new Set(request.material.identities.map(t=>t.canonicalId))].map(topicId=>({topicId,relation:topicId===topic.id?'same':'distinct',citations:request.material.inputs.map(i=>({inputId:i.inputId,field:'body',start:0,end:i.body.length}))})),entries:request.material.entries.map(e=>({entryId:e.entryId,type:'idea',span:{inputId:e.workingInputId,field:'body',start:0,end:e.body.length},additional:[]}))})}));}};
 service={version:1,topic:{reconcileHumanNames:true,resolveProcessing:async(_t,r)=>({allowed:true,epoch:'synthetic-topic-processing',inputIds:r.inputIds,topicIds:r.topicIds}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async(response,_view,binding)=>({binding,value:response.proposed}),context:async(response,metadata,binding)=>{const evidence=[],scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true);for(const inputId of metadata.inputIds){const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(input.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence,...(metadata.structuralTopics?{humanTopic:metadata.structuralTopics[0]}:{})});}await state.evidenceHook?.(evidence);return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic',associationIds:[op()],evidence}}]};}}};
 const make=()=>{let grant;return new LocalMaintenanceSession(f.s,{authority,processing,provider,service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant}});};
 return {...f,entry,topic,section,p,options,state,calls,scopes,abort,authority,provider,service,processing,make,session:make()};
}
const acks=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
test('genuine renamed Topic receives checked original-owner reuse NO_CHANGE, preserves human work, and never redispatches',async()=>{
 const f=await fixture(),names=['records','blocks','thoughts','topics','sections','placements','provenance','dependencies','revisions'],before=await Promise.all(names.map(n=>rows(f.s,n)));
 const h=await f.session.prepare(f.options),result=await f.session.run(h);
 const exact=(await acks(f)).filter(a=>a.unit.key===JSON.stringify(['topic',f.topic.id]));
 assert.equal(exact.length,2,JSON.stringify(result));
 assert.equal(exact.find(a=>a.unit.facet==='topic').outcome,'NO_CHANGE');
 assert.equal(f.calls.length,1);assert.deepEqual(f.scopes.find(s=>s.purpose==='ai-maintenance-payload').facets,['context','topic']);
 assert.equal(f.calls[0].material.structuralTopics.length,1);assert.equal(f.calls[0].material.entries.length,1);
 assert.deepEqual(await Promise.all(names.map(n=>rows(f.s,n))),before);
 assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);
 await f.session.run(h);assert.equal(f.calls.length,1);f.session.dispose();
});

for(const missing of ['grant','facet','title','member','input'])test('rename Topic needs independent complete '+missing+' processing before dispatch',async()=>{
 const f=await fixture();if(missing==='grant')f.state.payloadAllowed=false;
 f.state.processingHook=scope=>{if(missing==='facet')scope.facets=['context'];if(missing==='title')delete scope.structuralTopics;if(missing==='member')scope.entries=[];if(missing==='input')scope.inputs=[];return scope;};
 const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);f.session.dispose();
});
for(const defect of ['empty','ambiguous','distinct','different-name','partial-evidence','partial-relation','missing-member','new-member','extra-membership','named-section','insufficient-provenance'])test('structural Topic '+defect+' response cannot silently ACK or mutate human work',async()=>{
 const f=await fixture(),base=f.provider.execute;f.provider.execute=async request=>{const response=await base(request),a=response.proposed;
  if(defect==='empty')response.proposed={};if(defect==='insufficient-provenance')a.substance.reason='incidental';if(defect==='ambiguous')a.relations[0].relation='ambiguous';if(defect==='distinct')a.relations[0].relation='distinct';if(defect==='different-name')a.name='SYNTHETIC guessed identity';if(defect==='partial-evidence')a.evidence[0].end--;if(defect==='partial-relation')a.relations[0].citations[0].end--;if(defect==='missing-member')a.entries=[];if(defect==='new-member')delete a.entries[0].entryId;if(defect==='extra-membership')a.entries[0].additional=[{topicId:op(),returnValue:structuredClone(a.returnValue)}];if(defect==='named-section')a.section={kind:'named',name:'SYNTHETIC guessed Section'};return response;
 };f.session.dispose();f.session=f.make();const names=['thoughts','topics','sections','placements','provenance','dependencies','revisions','operationReceipts'],before=await Promise.all(names.map(n=>rows(f.s,n))),h=await f.session.prepare(f.options),r=await f.session.run(h);
 assert.equal(r.state,'PARTIAL');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await Promise.all(names.map(n=>rows(f.s,n))),before);await f.session.run(h);assert.equal(f.calls.length,1);f.session.dispose();
});
for(const stage of ['receipt','ack','counter'])for(const drift of ['name','input','source','membership','order','section'])test('structural Topic final '+stage+' fence rolls back '+drift+' drift and exact ACK',async()=>{
 const f=await fixture(),h=await f.session.prepare(f.options),names=['thoughts','topics','sections','placements','blocks','tombstones','operationReceipts'],before=await Promise.all(names.map(n=>rows(f.s,n))),tx=f.s.repository.transaction.bind(f.s.repository);let hit=false;
 f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const value=await put(n,row,...more),selected=stage==='receipt'?n==='operationReceipts'&&row.result?.outcome==='reuse':stage==='ack'?n==='organizerWorkItems'&&row.unit?.facet==='topic'&&row.state==='ACKNOWLEDGED':n==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0;
  if(!hit&&selected){hit=true;if(drift==='name'){const v=await t.get('topics',f.topic.id);v.name='SYNTHETIC stale final name';await put('topics',v);}if(drift==='input'){const v=await t.get('blocks',f.entry.workingInputId);v.value.libraryText='SYNTHETIC stale final body';await put('blocks',v);}if(drift==='source'){const ix=await t.get('recordIndex',f.entry.sourceRecordIds[0]);await put('tombstones',{id:'source:'+ix.sourceKey});}if(drift==='membership'||drift==='order'){const v=await t.get('placements',f.p.id);if(drift==='membership')v.membershipAuthorship='ai';else v.rank='000000000001';await put('placements',v);}if(drift==='section'){const v=await t.get('sections',f.section.id);v.revision++;await put('sections',v);}}
  return value;};}return fn(t);},...rest);
 let r;try{r=await f.session.run(h);}finally{f.s.repository.transaction=tx;f.session.dispose();}assert.equal(hit,true,JSON.stringify(r));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await Promise.all(names.map(n=>rows(f.s,n))),before);assert.equal((await read(f.s,'meta','aiu:counters:v1'))?.localResolved||0,0);
});

test('unknown structural Topic attempt keeps identity and never redispatches',async()=>{
 const f=await fixture();f.provider.execute=async request=>{f.calls.push(structuredClone(request));throw Error('SYNTHETIC lost response');};f.session.dispose();f.session=f.make();const h=await f.session.prepare(f.options),first=await f.session.run(h);assert.equal(first.state,'OUTCOME_UNKNOWN');assert.equal((await f.session.run(h)).state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.ok((await rows(f.s,'organizerUsage')).some(r=>r.attemptCount===1&&r.state==='OUTCOME_UNKNOWN'));f.session.dispose();
});

test('one rename opportunity leaves unrelated dirty work and original cursor pending',async()=>{
 const f=await fixture();await inputEdit(f.s,f.entry.workingInputId,{libraryText:'SYNTHETIC updated Input remains an independent obligation'});const dirty=async()=>(await rows(f.s,'meta')).filter(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind!=='topic'),before=await dirty(),h=await f.session.prepare({...f.options,cursor:null}),r=await f.session.run(h);
 assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.equal(r.processedState,'COMMITTED');assert.equal(r.complete,false);assert.equal(r.nextCursor,null);assert.ok(r.pendingBatchUnits>0);assert.deepEqual(await dirty(),before);assert.equal(f.calls.length,1);assert.ok(f.calls[0].coverage.every(u=>u.key===JSON.stringify(['topic',f.topic.id])));f.session.dispose();
});

for(const changed of [false,true])test('prior Context-only route '+(changed?'reconsiders Topic on new qualified route only':'keeps same-route Topic DEFER pending'),async()=>{
 const f=await fixture();f.service.topic.reconcileHumanNames=false;f.session.dispose();f.session=f.make();const old=await f.session.run(await f.session.prepare(f.options));assert.equal(old.processedState,'COMMITTED');const deferred=(await rows(f.s,'organizerWorkItems')).find(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'),job=await read(f.s,'organizerJobs',deferred.jobId),usage=(await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId);assert.ok(deferred);f.session.dispose();f.service.topic.reconcileHumanNames=true;f.session=f.make();const result=await f.session.run(await f.session.prepare({...f.options,routeVersion:changed?'synthetic-rename-reconciliation-v2':f.options.routeVersion}));
 assert.deepEqual(await read(f.s,'organizerJobs',deferred.jobId),job);assert.deepEqual((await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId),usage);
 if(changed){assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,2);assert.ok((await acks(f)).some(a=>a.unit.facet==='topic'&&a.outcome==='NO_CHANGE'));assert.equal((await rows(f.s,'organizerWorkItems')).find(r=>r.originalId===deferred.id).reconsideredBecause,'HUMAN_TOPIC_RECONCILIATION_V1');assert.equal(f.calls[1].coverage.length,1);assert.equal(f.calls[1].coverage[0].facet,'topic');}else{assert.equal(result.state,'DEFERRED');assert.equal(f.calls.length,1);assert.deepEqual(await read(f.s,'organizerWorkItems',deferred.id),deferred);}f.session.dispose();
});

import {TopicFormationService} from '../core/topic-formation.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {readDomainCommitEvidence} from '../core/ai-usage/domain-commit-evidence.js';
async function addMember(f){
 const prior=new Set((await rows(f.s,'inputStates')).map(i=>i.id));await f.s.capture(capture((await f.s.status()).epoch,op(),'SYNTHETIC independently sourced second complete member'));
 const input=(await rows(f.s,'inputStates')).find(i=>!prior.has(i.id)),owner=new TopicFormationService(f.s,{...f.serviceOptions,decision:{version:'synthetic-multi-member',assess:view=>assessment(view,{relations:view.identities.map(t=>({topicId:t.canonicalId,relation:'same',citations:[citation(view.inputs[0])]}))})},parameters});await owner.commit(await owner.prepare({scope:[{inputId:input.id,role:'primary',selectedFields:['body']}],operationId:op()}));
 let topic=await read(f.s,'topics',f.topic.id);const section=await f.s.createSection({topicId:topic.id,expectedTopicRevision:topic.organizationRevision,title:'SYNTHETIC other human Section',operationId:op()}),entry=(await rows(f.s,'thoughts')).find(e=>e.workingInputId===input.id),p=(await rows(f.s,'placements')).find(p=>p.entryId===entry.id);topic=await read(f.s,'topics',f.topic.id);await f.s.placeEntry({topicId:topic.id,sectionId:section.sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'SYNTHETIC complete current two-Section interpretation',operationId:op()});return {input,entry,section};
}
for(const denied of [false,true])test('complete multi-Section rename '+(denied?'cannot borrow first-member grant for second Input':'checks all members and preserves actual Sections/order'),async()=>{
 const f=await fixture(),second=await addMember(f),names=['thoughts','topics','sections','placements','provenance','dependencies'],before=await Promise.all(names.map(n=>rows(f.s,n)));
 if(denied)f.state.processingHook=scope=>{scope.inputs=scope.inputs.filter(i=>i.inputId!==second.input.id);return scope;};
 const r=await f.session.run(await f.session.prepare({...f.options,cursor:'aiu:delta:pending:["topic",'}));
 if(denied){assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);}else{assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.inputs.length,2);assert.equal(f.calls[0].material.entries.length,2);assert.equal(new Set(f.calls[0].material.structuralTopics[0].entries.map(e=>e.sectionId)).size,2);assert.deepEqual(f.scopes.find(s=>s.purpose==='ai-maintenance-payload').inputs.map(i=>i.inputId).sort(),f.calls[0].material.inputs.map(i=>i.inputId).sort());assert.equal((await acks(f)).filter(a=>a.outcome==='NO_CHANGE'&&a.unit.facet==='topic').length,1);}
 assert.deepEqual(await Promise.all(names.map(n=>rows(f.s,n))),before);f.session.dispose();
});

test('Topic-only checked reuse has no effective result and no persisted provider body',async()=>{
 const f=await fixture();f.service.topic.reconcileHumanNames=false;f.session.dispose();f.session=f.make();await f.session.run(await f.session.prepare(f.options));f.session.dispose();f.service.topic.reconcileHumanNames=true;f.session=f.make();const h=await f.session.prepare({...f.options,routeVersion:'synthetic-reconcile-only-v2'}),r=await f.session.run(h);assert.equal(r.state,'COMMITTED');const evidence=await readDomainCommitEvidence(new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),h.jobId);assert.equal(evidence.status,'NO_EFFECTIVE_RESULT');assert.equal((await rows(f.s,'organizerUsage')).find(r=>r.jobId===h.jobId).effectiveResultCount,0);
 const persisted=JSON.stringify(await Promise.all(['organizerJobs','organizerUsage','organizerWorkItems'].map(n=>rows(f.s,n))));assert.equal(persisted.includes('SYNTHETIC changed human interpretation'),false);assert.equal(persisted.includes('Synthetic explicit working input'),false);assert.equal(persisted.includes('SYNTHETIC Context grounded'),false);f.session.dispose();
});

test('structural Topic original transaction failure rolls back receipt and ACK, retry uses same paid response',async()=>{
 const f=await fixture(),h=await f.session.prepare(f.options),tx=f.s.repository.transaction.bind(f.s.repository),before=await rows(f.s,'operationReceipts');let hit=false;
 f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const result=await put(n,row,...more);if(!hit&&n==='organizerWorkItems'&&row.unit?.facet==='topic'&&row.state==='ACKNOWLEDGED'){hit=true;throw Error('SYNTHETIC transaction abort');}return result;};}return fn(t);},...rest);
 try{const first=await f.session.run(h);assert.equal(hit,true);assert.equal(first.state,'PARTIAL');assert.equal((await acks(f)).length,0);assert.deepEqual(await rows(f.s,'operationReceipts'),before);assert.equal(f.calls.length,1);const second=await f.session.run(h);assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal(f.calls.length,1);assert.equal((await acks(f)).filter(a=>a.unit.facet==='topic').length,1);}finally{f.s.repository.transaction=tx;f.session.dispose();}
});

for(const defect of ['cosmetic','empty','ai-member','source','removed'])test('unqualified structural Topic '+defect+' stays deferred without provider or ACK',async()=>{
 const f=await fixture();if(defect==='cosmetic'){const topic=await read(f.s,'topics',f.topic.id);await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'  SYNTHETIC changed human interpretation  ',operationId:op()});}else await f.s.repository.transaction(true,async t=>{if(defect==='empty')await t.delete('placements',f.p.id);if(defect==='ai-member'){const p=await t.get('placements',f.p.id);p.membershipAuthorship='ai';await t.put('placements',p);}if(defect==='source'){const ix=await t.get('recordIndex',f.entry.sourceRecordIds[0]);await t.put('tombstones',{id:'source:'+ix.sourceKey});}if(defect==='removed'){const topic=await t.get('topics',f.topic.id);topic.lifecycle='removed';await t.put('topics',topic);}});
 try{const result=await f.session.run(await f.session.prepare(f.options));assert.notEqual(result.state,'COMMITTED');}catch(error){assert.ok(['STALE_BASE','UNAVAILABLE'].includes(error.code),error.code);}assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);f.session.dispose();
});

test('independent review: competing ACK preserves omitted-batch partial result',async()=>{
 const f=await fixture(),options={...f.options,cursor:null};
 const first=await f.session.prepare(options);assert.ok(first.pendingBatchUnits>0);
 let grant,other;
 other=new LocalMaintenanceSession(f.s,{authority:f.authority,processing:f.processing,provider:f.provider,service:f.service,window:{acquire:async r=>{
  const result=await f.session.run(first);assert.equal(result.state,'PARTIAL');assert.equal(result.processedState,'COMMITTED');
  return grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:f.abort.signal});
 },isCurrent:r=>r===grant}});
 try {const handle=await other.prepare(options),result=await other.run(handle);assert.equal(result.complete,false);assert.equal(result.nextCursor,null);assert.equal(result.state,'PARTIAL');assert.ok(result.pendingBatchUnits>0);assert.equal(result.pendingBatchUnits,first.pendingBatchUnits);assert.equal(result.processedState,'COMMITTED');assert.equal(result.remainingWork,true);assert.equal(f.calls.length,1);}finally{other.dispose();f.session.dispose();}
});
