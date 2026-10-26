import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,runFormation,rows,op,parameters,assessment,citation,inputEdit,capture} from './harness/topic-03.mjs';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>id?t.get(n,id):t.all(n));
async function fixture({named=false}={}){
 const f=await formationFixture();await runFormation(f);const entry=(await rows(f.s,'thoughts'))[0],topic=(await rows(f.s,'topics'))[0],p=(await rows(f.s,'placements'))[0];
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});
 let section=(await rows(f.s,'sections'))[0];
 if(named){const current=await read(f.s,'topics',topic.id);section=await f.s.createSection({topicId:topic.id,expectedTopicRevision:current.organizationRevision,title:'SYNTHETIC named aspect',operationId:op()});const e=await read(f.s,'thoughts',entry.id),p=await read(f.s,'placements',JSON.stringify([topic.id,1,entry.id])),t=await read(f.s,'topics',topic.id);await f.s.placeEntry({topicId:topic.id,sectionId:section.sectionId,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});}
 await f.s.editSection({topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC changed human interpretation',operationId:op()});
 const options={scope:'synthetic-structural',contractVersion:'synthetic-1',routeVersion:'synthetic-structural-1',cursor:'aiu:delta:pending:'+JSON.stringify(['placement',p.id])},caller=Object.freeze({id:op()}),abort=new AbortController(),state={payloadAllowed:true,qualificationAllowed:true,consentEpoch:'synthetic-consent',topicEpoch:'synthetic-topic-processing',providerHook:null,processingHook:null,evidenceHook:null},calls=[],scopes=[],expiry=Date.now()+600000;
 const authority=async(_t,r)=>({allowed:true,consentEpoch:state.consentEpoch,principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:scope.purpose==='ai-maintenance-payload'&&state.processingHook?state.processingHook(structuredClone(scope)):scope,epoch:'synthetic-processing',processing:scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadAllowed,expiresAt:expiry,revocationSignal:abort.signal};},isCurrent:r=>(r.scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadAllowed)&&!abort.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.payloadAllowed,expiresAt:expiry,revocationSignal:abort.signal}),isCurrent:()=>state.payloadAllowed&&!abort.signal.aborted};
 let service;const provider={describe:()=>({providerId:'synthetic-structural',version:'1',executionKind:'fixture'}),execute:async request=>{calls.push(structuredClone(request));await state.providerHook?.(request);return JSON.parse(JSON.stringify({accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC Context grounded in actual Input',proposed:assessment({...request.material,inputs:request.material.inputs.map(i=>({id:i.inputId,role:'primary',revision:i.revision,fields:{body:i.body}}))},{name:request.material.structuralSections[0].title,boundary:{reason:'internal_aspect',citations:request.material.inputs.map(i=>({inputId:i.inputId,field:'body',start:0,end:i.body.length}))},section:{kind:'existing',sectionId:request.material.structuralSections[0].sectionId},relations:[...new Set(request.material.identities.map(t=>t.canonicalId))].map(topicId=>({topicId,relation:topicId===topic.id?'internal_aspect':'distinct',citations:request.material.inputs.map(i=>({inputId:i.inputId,field:'body',start:0,end:i.body.length}))})),entries:request.material.entries.map(e=>({entryId:e.entryId,type:'idea',span:{inputId:e.workingInputId,field:'body',start:0,end:e.body.length},additional:[]}))})}));}};
 service={version:1,topic:{reconcileHumanSections:true,resolveProcessing:async(_t,r)=>({allowed:true,epoch:state.topicEpoch,inputIds:r.inputIds,topicIds:r.topicIds}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async(response,_view,binding)=>({binding,value:response.proposed}),context:async(response,metadata,binding)=>{const evidence=[],scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true);for(const inputId of metadata.inputIds){const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(input.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence,...(metadata.structuralSections?{humanSection:metadata.structuralSections[0]}:{})});}await state.evidenceHook?.(evidence);return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic',associationIds:[op()],evidence}}]};}}};
 const make=()=>{let grant;return new LocalMaintenanceSession(f.s,{authority,processing,provider,service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant}});};
 return {...f,entry,topic,section,p,options,state,calls,scopes,abort,authority,provider,service,processing,make,session:make()};
}
const acks=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');

import {TopicFormationService} from '../core/topic-formation.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {readStructuralContext,structuralContextAllowsTopic,structuralSectionRestoreAllowsTopic,sameStructuralSectionRestoreProof} from '../core/ai-usage/structural-context-mapping.js';
import {assertSectionRestoreTopicAssessment,assertSectionRestoreTopicResult} from '../core/ai-usage/structural-topic-reconciliation.js';
import {createMaintenanceServiceResponseAdapter} from '../core/ai-usage/maintenance-service-response.js';
import {maintenanceSourceResponse} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';
import {createMaintenanceServiceClient} from '../core/ai-usage/maintenance-service-client.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';
async function completeMembers(f,count){
 for(let n=1;n<count;n++){
  const prior=new Set((await rows(f.s,'inputStates')).map(i=>i.id));await f.s.capture(capture((await f.s.status()).epoch,op(),'SYNTHETIC complete Section Input '+n));
  const input=(await rows(f.s,'inputStates')).find(i=>!prior.has(i.id)),owner=new TopicFormationService(f.s,{...f.serviceOptions,decision:{version:'synthetic-section-member',assess:view=>assessment(view,{relations:[...new Set(view.identities.map(t=>t.canonicalId))].map(topicId=>({topicId,relation:topicId===f.topic.id?'same':'distinct',citations:[citation(view.inputs[0])]}))})},parameters});
  await owner.commit(await owner.prepare({scope:[{inputId:input.id,role:'primary',selectedFields:['body']}],operationId:op()}));
  const entry=(await rows(f.s,'thoughts')).find(e=>e.workingInputId===input.id),p=(await rows(f.s,'placements')).find(p=>p.entryId===entry.id&&p.topicId===f.topic.id),topic=await read(f.s,'topics',f.topic.id);
  await f.s.placeEntry({topicId:topic.id,sectionId:f.section.sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});
 }
 const section=await read(f.s,'sections',f.section.id);await f.s.editSection({topicId:f.topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC complete current Section interpretation',operationId:op()});
}

// These new controls execute original components over synthetic fake IDB only.
// A wire response is synthetic; no service transport, signed issuer or model runs.
const ownerTables=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions'];
const snapshot=f=>Promise.all(ownerTables.map(n=>rows(f.s,n)));
const mapped=async f=>{const d=(await rows(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind==='section'&&r.descriptor.entityId===f.section.sectionId)?.descriptor;return f.s.repository.transaction(false,t=>readStructuralContext(f.s,t,d));};
async function restored({named=true,count=1,capable=true}={}){
 const f=await fixture({named});if(count>1)await completeMembers(f,count);
 const saved=(await rows(f.s,'revisions')).filter(j=>j.kind==='section'&&j.entityId===f.section.sectionId&&j.reason==='rename').sort((a,b)=>b.sequence-a.sequence)[0],operationId=op();
 await f.s.restoreRevision({id:saved.id,expectedRevision:saved.afterRevision,operationId,side:'before'});
 f.session.dispose();f.service.topic.reconcileHumanSectionRestores=capable;f.session=f.make();
 f.options={...f.options,cursor:'aiu:delta:pending:["section",'};
 f.saved=saved;f.restoreOperationId=operationId;f.current=await read(f.s,'sections',f.section.id);
 return f;
}
async function close(f){f.session.dispose();await f.s.repository.close();}
function formal(f){
 const owner=createMaintenanceServiceResponseAdapter(),foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),execute=f.provider.execute;
 f.provider.execute=async payload=>{const response=await execute(payload);owner.registerChild(foundation,payload,()=>f.state.payloadAllowed&&!f.abort.signal.aborted,f.abort.signal);const value=maintenanceSourceResponse(payload,{fixture:{topicAssessment:response.proposed},body:response.body});for(const g of value.context.groups)g.topicId='$result';return {accepted:true,operationReceiptId:response.operationReceiptId,value};};
 f.service.responseAdapter=owner.adapter;f.session.dispose();f.session=f.make();return owner;
}
for(const named of [false,true])test('original Section restore '+(named?'named two-member':'default')+' receives formal checked same-parent Topic reuse without changing human work',async()=>{
 const f=await restored({named,count:named?2:1}),adapter=formal(f);try{
  const before=await snapshot(f),journal=(await rows(f.s,'revisions')).find(j=>j.operationId===f.restoreOperationId),original=await read(f.s,'operationReceipts',f.restoreOperationId),h=await f.session.prepare(f.options),r=await f.session.run(h);
  assert.equal(journal.reason,'restore');assert.equal(journal.actor,'user');assert.equal(Object.hasOwn(journal,'restoreRevisionId'),false);assert.equal(original.ownerId,f.section.sectionId);assert.deepEqual(original.result,{id:f.section.sectionId,revision:f.current.revision});
  assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.structuralSections[0].title,f.current.title);assert.equal(f.calls[0].material.structuralSections[0].entries.length,named?2:1);
  const ack=await acks(f);assert.deepEqual(ack.map(a=>[a.unit.facet,a.outcome]).sort(),[['context','COMMITTED'],['topic','NO_CHANGE']]);assert.ok(ack.every(a=>a.unit.key===JSON.stringify(['section',f.section.sectionId])));
  const result=(await rows(f.s,'operationReceipts')).find(r=>r.result?.reason==='internal_aspect').result;assert.deepEqual(result.topicIds,[f.topic.id]);assert.equal(result.checks.humanIntent,true);assert.deepEqual(result.createdEntryIds,[]);assert.equal(result.entryIds.length,named?2:1);assert.deepEqual(await snapshot(f),before);
  await f.session.run(h);assert.equal(f.calls.length,1);
 }finally{adapter.dispose();await close(f);}
});

test('restore proof is distinct from rename, immutable in meaning, original-receipt-bound and never copyable',async()=>{
 const f=await restored();try{const m=await mapped(f);assert.equal(structuralContextAllowsTopic(m),false);assert.equal(structuralSectionRestoreAllowsTopic(m),true);assert.equal(sameStructuralSectionRestoreProof(m,await mapped(f)),true);
  for(const copy of [{...m},structuredClone(m),{...m,reason:'restore'}]){assert.equal(structuralSectionRestoreAllowsTopic(copy),false);assert.throws(()=>assertSectionRestoreTopicAssessment({}, {},copy,{}),{code:'STALE_BASE'});assert.throws(()=>assertSectionRestoreTopicResult({},copy),{code:'STALE_BASE'});}
  m.entries[0].rank='000000000099';assert.equal(structuralSectionRestoreAllowsTopic(m),false);
  const before=await mapped(f);await f.s.repository.transaction(true,async t=>{const receipt=await t.get('operationReceipts',f.restoreOperationId);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);});const after=await mapped(f);assert.ok(after);assert.equal(sameStructuralSectionRestoreProof(before,after),false);
 }finally{await close(f);}
});

for(const route of ['absent','rename-only','topic-name-only'])test('restore never inherits '+route+' support and retains exact pending Topic',async()=>{
 const f=await restored({capable:false});try{if(route==='absent')delete f.service.topic.reconcileHumanSections;if(route==='topic-name-only'){delete f.service.topic.reconcileHumanSections;f.service.topic.reconcileHumanNames=true;}f.session.dispose();f.session=f.make();const r=await f.session.run(await f.session.prepare(f.options));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.ok(f.calls[0].coverage.every(u=>u.facet==='context'));assert.deepEqual((await acks(f)).map(a=>a.unit.facet),['context']);assert.ok((await rows(f.s,'organizerWorkItems')).some(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'));}finally{await close(f);}
});

for(const changed of [false,true])test('restore '+(changed?'new admitted route settles Topic only without redoing committed Context':'same route cannot replay historical DEFER'),async()=>{
 const f=await restored({capable:false});let adapter;try{
  await f.session.run(await f.session.prepare(f.options));const context=await read(f.s,'meta',CONTEXT_CARDS_ROW),contextAck=(await acks(f))[0],deferred=(await rows(f.s,'organizerWorkItems')).find(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'),oldJob=await read(f.s,'organizerJobs',deferred.jobId),oldUsage=(await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId),before=await snapshot(f);
  f.service.topic.reconcileHumanSectionRestores=true;adapter=formal(f);const r=await f.session.run(await f.session.prepare({...f.options,routeVersion:changed?'synthetic-restore-reconciliation-v1':f.options.routeVersion}));
  assert.equal(f.calls.length,changed?2:1,JSON.stringify(r));assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),context);assert.deepEqual((await acks(f)).find(a=>a.unit.facet==='context'),contextAck);assert.deepEqual(await read(f.s,'organizerJobs',deferred.jobId),oldJob);assert.deepEqual((await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId),oldUsage);assert.deepEqual(await snapshot(f),before);
  if(changed){assert.ok(f.calls[1].coverage.every(u=>u.facet==='topic'));assert.equal((await acks(f)).filter(a=>a.unit.facet==='topic'&&a.outcome==='NO_CHANGE').length,1);}else assert.deepEqual(await read(f.s,'organizerWorkItems',deferred.id),deferred);
 }finally{adapter?.dispose();await close(f);}
});

for(const defect of ['actor','journal-reason','receipt-owner','receipt-copy','receipt-digest','protection','member-human','member-source','parent'])test('restore original '+defect+' proof failure defers without dispatch or ACK',async()=>{
 const f=await restored();try{await f.s.repository.transaction(true,async t=>{const row=await t.get('sections',f.section.id),j=(await t.all('revisions')).find(j=>j.operationId===f.restoreOperationId),receipt=await t.get('operationReceipts',f.restoreOperationId);
  if(defect==='actor')j.actor='ai';if(defect==='journal-reason')j.reason='layout';if(defect==='receipt-owner')receipt.ownerId=op();if(defect==='receipt-copy')Object.assign(receipt,(await t.all('operationReceipts')).find(r=>r.id!==receipt.id));if(defect==='receipt-digest')receipt.digest='invalid';if(defect==='protection')row.protections.title.locked=false;if(defect==='parent')row.topicId=op();
  if(defect==='member-human'){const p=await t.get('placements',f.p.id);p.membershipAuthorship='ai';await t.put('placements',p);}if(defect==='member-source'){const ix=await t.get('recordIndex',f.entry.sourceRecordIds[0]);await t.put('tombstones',{id:'source:'+ix.sourceKey});}
  await t.put('sections',row);await t.put('revisions',j);if(defect==='receipt-copy')await t.delete('operationReceipts',f.restoreOperationId);await t.put('operationReceipts',receipt);
 });assert.equal(await mapped(f),null);const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);}finally{await close(f);}
});

for(const missing of ['grant','facet','title','member','input','topic-issuer','topic-id'])test('restore needs independent complete '+missing+' authority before dispatch',async()=>{
 const f=await restored({count:2});try{if(missing==='grant')f.state.payloadAllowed=false;
  f.state.processingHook=scope=>{if(missing==='facet')scope.facets=['context'];if(missing==='title')delete scope.structuralSections;if(missing==='member')scope.entries=scope.entries.slice(0,1);if(missing==='input')scope.inputs=scope.inputs.slice(0,1);return scope;};
  if(missing.startsWith('topic-'))f.service.topic.resolveProcessing=async(_t,r)=>({allowed:missing!=='topic-issuer',epoch:'synthetic-identity-denied',inputIds:r.inputIds,topicIds:missing==='topic-id'?[]:r.topicIds});f.session.dispose();f.session=f.make();
  const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0,JSON.stringify(r));assert.equal((await acks(f)).length,0);
 }finally{await close(f);}
});

for(const defect of ['wrong-parent','different-title','missing-member','partial-evidence','partial-aspect','extra-membership','new-section','blanket-no-change'])test('restore semantic '+defect+' cannot substitute for actual same-parent reuse',async()=>{
 const f=await restored({count:2}),execute=f.provider.execute;try{f.provider.execute=async request=>{const r=await execute(request),a=r.proposed;if(defect==='wrong-parent')a.relations.find(r=>r.topicId===f.topic.id).relation='distinct';if(defect==='different-title')a.name+=' guessed';if(defect==='missing-member')a.entries.pop();if(defect==='partial-evidence')a.evidence.pop();if(defect==='partial-aspect')a.boundary.citations.pop();if(defect==='extra-membership')a.entries[0].additional=[{topicId:op(),returnValue:structuredClone(a.returnValue)}];if(defect==='new-section')a.section={kind:'named',name:'SYNTHETIC new aspect'};if(defect==='blanket-no-change')r.proposed={outcome:'NO_CHANGE'};return r;};f.session.dispose();f.session=f.make();const before=await snapshot(f),r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);}finally{await close(f);}
});

for(const stage of ['receipt','ack','counter'])for(const drift of ['restore-receipt','title','membership','source','revoke'])test('restore final '+stage+' fence rolls back '+drift+' and precise ACK',async()=>{
 const f=await restored(),tx=f.s.repository.transaction.bind(f.s.repository);let hit=false;try{
  const h=await f.session.prepare(f.options),before=await snapshot(f),receipts=await rows(f.s,'operationReceipts');
  f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const value=await put(n,row,...more),selected=stage==='receipt'?n==='operationReceipts'&&row.result?.outcome==='reuse':stage==='ack'?n==='organizerWorkItems'&&row.unit?.facet==='topic'&&row.state==='ACKNOWLEDGED':n==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0;if(!hit&&selected){hit=true;if(drift==='restore-receipt'){const r=await t.get('operationReceipts',f.restoreOperationId);r.digest='0'.repeat(64);await put('operationReceipts',r);}if(drift==='title'){const s=await t.get('sections',f.section.id);s.title+=' late';await put('sections',s);}if(drift==='membership'){const p=await t.get('placements',f.p.id);p.rank='000000000099';await put('placements',p);}if(drift==='source'){const r=await t.get('records',f.entry.sourceRecordIds[0]);r.value.originalText+=' late';await put('records',r);}if(drift==='revoke')f.state.payloadAllowed=false;}return value;};}return fn(t);},...rest);
  const r=await f.session.run(h);assert.equal(hit,true,JSON.stringify(r));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);assert.equal((await read(f.s,'meta','aiu:counters:v1'))?.localResolved||0,0);
 }finally{f.s.repository.transaction=tx;await close(f);}
});

test('restore exact ACK abort rolls back original reuse and reuses one received response',async()=>{
 const f=await restored(),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;try{const h=await f.session.prepare(f.options),before=await snapshot(f),receipts=await rows(f.s,'operationReceipts');
  f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const result=await put(n,row,...more);if(!aborted&&n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){aborted=true;t.tx.abort();}return result;};}return fn(t);},...rest);
  const first=await f.session.run(h);assert.equal(aborted,true);assert.notEqual(first.state,'COMMITTED');assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);f.s.repository.transaction=tx;
  const second=await f.session.run(h);assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal(f.calls.length,1);assert.equal((await acks(f)).find(a=>a.unit.facet==='topic').outcome,'NO_CHANGE');assert.deepEqual(await snapshot(f),before);
 }finally{f.s.repository.transaction=tx;await close(f);}
});

for(const deny of [false,true])test('actual dormant configured client restore projection '+(deny?'cannot manufacture denied authority':'reaches original preparation')+' with zero signed transport',async()=>{
 const f=await restored({capable:false});let remote,configured;try{
  let forbidden=0;const no=()=>{forbidden++;throw Error('Signed client/provider stage is not authorized in this check');}, {responseAdapter:unused,...service}=f.service,configuration={origin:'https://synthetic.invalid',scope:f.options.scope,contractVersion:f.options.contractVersion,routeVersion:f.options.routeVersion,service,processing:f.processing,clock:Date.now,resolveAuthority:deny?async()=>({allowed:false}):f.authority,isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:no,currentProfile:()=>null,tokenize:no,isCurrentTokenizer:()=>false,readProofs:no,fetch:no};
  assert.equal(readMaintenanceServiceConfiguration(),null);remote=createMaintenanceServiceClient(configuration);assert.ok(remote);assert.equal(remote.sessionOptions.service.topic.reconcileHumanSectionRestores,true);assert.equal(remote.sessionOptions.service.topic.resolveProcessing,f.service.topic.resolveProcessing);assert.equal(remote.sessionOptions.processing,f.processing);assert.equal(service.topic.reconcileHumanSectionRestores,false);configured=createConfiguredMaintenanceSession(f.s,configuration);assert.equal(configured.available(),true);
  if(deny)await assert.rejects(configured.prepare(f.options));else{const h=await configured.prepare(f.options),job=await read(f.s,'organizerJobs',h.jobId);assert.ok(job.coverage.some(u=>u.facet==='topic'));assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.unit.facet==='topic').length,0);}
  assert.equal(forbidden,0);assert.equal((await acks(f)).length,0);assert.equal(f.calls.length,0);
 }finally{configured?.dispose();remote?.dispose();await close(f);}
});

for(const target of ['rename','topic-restore'])test('restore-only route never reopens unrelated '+target+' Topic DEFER',async()=>{
 const f=await fixture();try{
  f.service.topic.reconcileHumanSections=false;
  if(target==='topic-restore'){let topic=await read(f.s,'topics',f.topic.id);await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'SYNTHETIC historical other Topic name',operationId:op()});const j=(await rows(f.s,'revisions')).filter(j=>j.kind==='topic'&&j.entityId===topic.id&&j.reason==='rename').sort((a,b)=>b.sequence-a.sequence)[0];await f.s.restoreRevision({id:j.id,expectedRevision:j.afterRevision,operationId:op(),side:'before'});}
  f.session.dispose();f.session=f.make();const options={...f.options,cursor:'aiu:delta:pending:["section",'};await f.session.run(await f.session.prepare(options));const deferred=(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'),calls=f.calls.length;assert.ok(deferred.length);
  f.service.topic.reconcileHumanSectionRestores=true;f.session.dispose();f.session=f.make();const before=await rows(f.s,'organizerUsage');await f.session.run(await f.session.prepare({...options,routeVersion:'synthetic-restore-only-v1'}));assert.equal(f.calls.length,calls);for(const row of deferred)assert.deepEqual(await read(f.s,'organizerWorkItems',row.id),row);assert.deepEqual(await rows(f.s,'organizerUsage'),before);
 }finally{await close(f);}
});

test('restore complete membership cannot be truncated to a lowered original Input budget',async()=>{
 const f=await restored({count:2}),limits=f.s.organizerBudget.limits;try{f.s.organizerBudget.limits={...limits,maxInputs:1};const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);}finally{f.s.organizerBudget.limits=limits;await close(f);}
});

for(const value of ['true',1,null])test('restore adapter support rejects non-boolean '+JSON.stringify(value),async()=>{
 const f=await restored();try{f.session.dispose();f.service.topic.reconcileHumanSectionRestores=value;assert.throws(()=>f.make(),{code:'INVALID_REQUEST'});}finally{await close(f);}
});

test('restore empty-name sentinel accepts exact empty-null only and rejects missing, nonempty, whitespace and copied proof',async()=>{
 for(const mode of ['empty','missing','nonempty','whitespace','copy']){
  const f=await restored({named:mode==='nonempty'});let owner,handle;try{
   if(mode==='whitespace'){
    let current=await read(f.s,'sections',f.section.id);await f.s.editSection({topicId:f.topic.id,sectionId:current.sectionId,expectedRevision:current.revision,title:'  ',operationId:op()});current=await read(f.s,'sections',f.section.id);const later=op();await f.s.editSection({topicId:f.topic.id,sectionId:current.sectionId,expectedRevision:current.revision,title:'SYNTHETIC later interpretation',operationId:later});const saved=(await rows(f.s,'revisions')).find(j=>j.operationId===later);await f.s.restoreRevision({id:saved.id,expectedRevision:saved.afterRevision,operationId:op(),side:'before'});
   }
   const mapping=await mapped(f);assert.ok(mapping);const section=await read(f.s,'sections',mapping.recordId);owner=new TopicFormationService(f.s,{...f.serviceOptions,parameters});handle=await owner.prepareMaterial({scope:mapping.entries.map(e=>({inputId:e.inputId,role:'primary',selectedFields:['body']})),entryIds:mapping.entries.map(e=>e.entryId)});const {view}=await owner.readMaterial(handle),spans=view.inputs.map(i=>citation(i)),a=assessment(view,{name:null,boundary:{reason:'internal_aspect',citations:spans},section:{kind:'existing',sectionId:mapping.sectionId},relations:[...new Set(view.identities.map(i=>i.canonicalId))].map(topicId=>({topicId,relation:topicId===f.topic.id?'internal_aspect':'distinct',citations:spans})),entries:view.entries.map(e=>({entryId:e.id,type:'idea',span:citation(view.inputs.find(i=>i.id===e.workingInputId)),additional:[]}))});
   if(mode==='missing')delete a.name;const check=()=>assertSectionRestoreTopicAssessment(a,view,mode==='copy'?structuredClone(mapping):mapping,{topicId:mapping.topicId,title:section.title});
   if(mode==='empty'){assert.equal(section.title,'');assert.doesNotThrow(check);}else assert.throws(check,{code:'STALE_BASE'});
  }finally{if(handle)owner.releaseMaterial(handle);await close(f);}
 }
});
