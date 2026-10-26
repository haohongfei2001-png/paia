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

import {TopicFormationService} from '../core/topic-formation.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {readTopicContext,topicContextAllowsTopic,topicNameRestoreAllowsTopic,sameTopicNameRestoreProof} from '../core/ai-usage/topic-context-mapping.js';
import {structuralSectionRestoreAllowsTopic} from '../core/ai-usage/structural-context-mapping.js';
import {assertTopicNameRestoreAssessment,assertTopicNameRestoreResult} from '../core/ai-usage/structural-topic-reconciliation.js';
import {createMaintenanceServiceResponseAdapter} from '../core/ai-usage/maintenance-service-response.js';
import {maintenanceSourceResponse} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';
import {createMaintenanceServiceClient} from '../core/ai-usage/maintenance-service-client.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';
async function addMember(f){
 const prior=new Set((await rows(f.s,'inputStates')).map(i=>i.id));await f.s.capture(capture((await f.s.status()).epoch,op(),'SYNTHETIC independently sourced second complete member'));
 const input=(await rows(f.s,'inputStates')).find(i=>!prior.has(i.id)),owner=new TopicFormationService(f.s,{...f.serviceOptions,decision:{version:'synthetic-multi-member',assess:view=>assessment(view,{relations:view.identities.map(t=>({topicId:t.canonicalId,relation:'same',citations:[citation(view.inputs[0])]}))})},parameters});await owner.commit(await owner.prepare({scope:[{inputId:input.id,role:'primary',selectedFields:['body']}],operationId:op()}));
 let topic=await read(f.s,'topics',f.topic.id);const section=await f.s.createSection({topicId:topic.id,expectedTopicRevision:topic.organizationRevision,title:'SYNTHETIC other human Section',operationId:op()}),entry=(await rows(f.s,'thoughts')).find(e=>e.workingInputId===input.id),p=(await rows(f.s,'placements')).find(p=>p.entryId===entry.id);topic=await read(f.s,'topics',f.topic.id);await f.s.placeEntry({topicId:topic.id,sectionId:section.sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:p.revision,operationId:op()});await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'SYNTHETIC complete current two-Section interpretation',operationId:op()});return {input,entry,section};
}

// New local original-component controls only; synthetic wire responses/fake IDB.
// No signed transport, service/provider fixture, native/browser or old suite runs.
const ownerTables=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions'];
const snapshot=f=>Promise.all(ownerTables.map(n=>rows(f.s,n)));
const mapped=async f=>{const d=(await rows(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind==='topic'&&r.descriptor.entityId===f.topic.id)?.descriptor;return f.s.repository.transaction(false,t=>readTopicContext(f.s,t,d));};
async function restored({count=1,capable=true}={}){
 const f=await fixture();if(count>1)f.second=await addMember(f);
 const saved=(await rows(f.s,'revisions')).filter(j=>j.kind==='topic'&&j.entityId===f.topic.id&&j.reason==='rename').sort((a,b)=>b.sequence-a.sequence)[0],operationId=op();
 let tick=0;f.s.clock=()=>new Date(Date.UTC(2026,9,25)+tick++).toISOString();
 await f.s.restoreRevision({id:saved.id,expectedRevision:saved.afterRevision,operationId,side:'before'});
 f.session.dispose();f.service.topic.reconcileHumanTopicRestores=capable;f.session=f.make();f.options={...f.options,cursor:'aiu:delta:pending:["topic",'};
 f.saved=saved;f.restoreOperationId=operationId;f.current=await read(f.s,'topics',f.topic.id);return f;
}
async function close(f){f.session.dispose();await f.s.repository.close();}
function formal(f){
 const owner=createMaintenanceServiceResponseAdapter(),foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.authority}),execute=f.provider.execute;
 f.provider.execute=async payload=>{const response=await execute(payload);owner.registerChild(foundation,payload,()=>f.state.payloadAllowed&&!f.abort.signal.aborted,f.abort.signal);const value=maintenanceSourceResponse(payload,{fixture:{topicAssessment:response.proposed},body:response.body});for(const g of value.context.groups)g.topicId='$result';return {accepted:true,operationReceiptId:response.operationReceiptId,value};};
 f.service.responseAdapter=owner.adapter;f.session.dispose();f.session=f.make();return owner;
}
for(const count of [1,2])test('original Topic-name restore formal same-identity reuse covers '+count+' complete members and preserves current human identity',async()=>{
 const f=await restored({count}),adapter=formal(f);try{
  const before=await snapshot(f),journal=(await rows(f.s,'revisions')).find(j=>j.operationId===f.restoreOperationId),original=await read(f.s,'operationReceipts',f.restoreOperationId),h=await f.session.prepare(f.options),r=await f.session.run(h);
  assert.equal(journal.reason,'restore');assert.equal(journal.actor,'user');assert.equal(Object.hasOwn(journal,'restoreRevisionId'),false);assert.equal(original.ownerId,f.topic.id);assert.deepEqual(original.result,{id:f.topic.id,revision:f.current.revision});assert.equal(f.current.name,f.saved.before.name);assert.notDeepEqual(f.current.identity,f.saved.before.identity);assert.notEqual(f.current.identity.aliases.find(a=>a.operationId===f.restoreOperationId).at,f.current.authorship.name.at);
  assert.equal(r.state,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.structuralTopics[0].name,f.current.name);assert.equal(f.calls[0].material.structuralTopics[0].entries.length,count);assert.equal(new Set(f.calls[0].material.structuralTopics[0].entries.map(e=>e.sectionId)).size,count);
  const ack=await acks(f);assert.deepEqual(ack.map(a=>[a.unit.facet,a.outcome]).sort(),[['context','COMMITTED'],['topic','NO_CHANGE']]);assert.ok(ack.every(a=>a.unit.key===JSON.stringify(['topic',f.topic.id])));
  const result=(await rows(f.s,'operationReceipts')).find(r=>r.result?.reason==='same_identity'&&r.result.checks?.humanIntent===true&&r.result.createdEntryIds?.length===0).result;assert.deepEqual(result.topicIds,[f.topic.id]);assert.deepEqual(result.createdEntryIds,[]);assert.equal(result.entryIds.length,count);assert.deepEqual(await snapshot(f),before);await f.session.run(h);assert.equal(f.calls.length,1);
 }finally{adapter.dispose();await close(f);}
});

test('Topic-name restore proof is independent of rename/Section proofs, immutable and original-receipt-bound',async()=>{
 const f=await restored();try{const m=await mapped(f);assert.equal(topicContextAllowsTopic(m),false);assert.equal(structuralSectionRestoreAllowsTopic(m),false);assert.equal(topicNameRestoreAllowsTopic(m),true);assert.equal(sameTopicNameRestoreProof(m,await mapped(f)),true);
  for(const copy of [{...m},structuredClone(m),{...m,reason:'restore'}]){assert.equal(topicNameRestoreAllowsTopic(copy),false);assert.throws(()=>assertTopicNameRestoreAssessment({}, {},copy,{}),{code:'STALE_BASE'});assert.throws(()=>assertTopicNameRestoreResult({},copy),{code:'STALE_BASE'});}
  m.entries[0].rank='000000000099';assert.equal(topicNameRestoreAllowsTopic(m),false);
  const before=await mapped(f);await f.s.repository.transaction(true,async t=>{const receipt=await t.get('operationReceipts',f.restoreOperationId);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);});const after=await mapped(f);assert.ok(after);assert.equal(sameTopicNameRestoreProof(before,after),false);
 }finally{await close(f);}
});

for(const route of ['absent','rename-only','section-restore-only'])test('Topic-name restore never inherits '+route+' support',async()=>{
 const f=await restored({capable:false});try{if(route!=='rename-only')delete f.service.topic.reconcileHumanNames;if(route==='section-restore-only')f.service.topic.reconcileHumanSectionRestores=true;f.session.dispose();f.session=f.make();const r=await f.session.run(await f.session.prepare(f.options));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.ok(f.calls[0].coverage.every(u=>u.facet==='context'));assert.deepEqual((await acks(f)).map(a=>a.unit.facet),['context']);assert.ok((await rows(f.s,'organizerWorkItems')).some(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'));}finally{await close(f);}
});

for(const changed of [false,true])test('Topic-name restore '+(changed?'new route settles only pending Topic without redoing Context':'same route preserves original DEFER and attempts'),async()=>{
 const f=await restored({capable:false});let adapter;try{
  await f.session.run(await f.session.prepare(f.options));const context=await read(f.s,'meta',CONTEXT_CARDS_ROW),contextAck=(await acks(f))[0],deferred=(await rows(f.s,'organizerWorkItems')).find(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'),oldJob=await read(f.s,'organizerJobs',deferred.jobId),oldUsage=(await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId),before=await snapshot(f);
  f.service.topic.reconcileHumanTopicRestores=true;adapter=formal(f);const r=await f.session.run(await f.session.prepare({...f.options,routeVersion:changed?'synthetic-topic-restore-v1':f.options.routeVersion}));
  assert.equal(f.calls.length,changed?2:1,JSON.stringify(r));assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),context);assert.deepEqual((await acks(f)).find(a=>a.unit.facet==='context'),contextAck);assert.deepEqual(await read(f.s,'organizerJobs',deferred.jobId),oldJob);assert.deepEqual((await rows(f.s,'organizerUsage')).filter(r=>r.jobId===deferred.jobId),oldUsage);assert.deepEqual(await snapshot(f),before);
  if(changed){assert.ok(f.calls[1].coverage.every(u=>u.facet==='topic'));assert.equal((await acks(f)).filter(a=>a.unit.facet==='topic'&&a.outcome==='NO_CHANGE').length,1);}else assert.deepEqual(await read(f.s,'organizerWorkItems',deferred.id),deferred);
 }finally{adapter?.dispose();await close(f);}
});

for(const defect of ['actor','journal-reason','receipt-owner','receipt-copy','receipt-digest','protection','alias','name-token','identity-clock','field-clock','member-human','section','source','redirect'])test('Topic-name restore original '+defect+' proof failure cannot dispatch or ACK',async()=>{
 const f=await restored();try{await f.s.repository.transaction(true,async t=>{const row=await t.get('topics',f.topic.id),j=(await t.all('revisions')).find(j=>j.operationId===f.restoreOperationId),receipt=await t.get('operationReceipts',f.restoreOperationId);
  if(defect==='actor')j.actor='ai';if(defect==='journal-reason')j.reason='layout';if(defect==='receipt-owner')receipt.ownerId=op();if(defect==='receipt-copy')Object.assign(receipt,(await t.all('operationReceipts')).find(r=>r.id!==receipt.id));if(defect==='receipt-digest')receipt.digest='invalid';if(defect==='protection')row.protections.name.locked=false;
  if(defect==='alias')row.identity.aliases=[];if(defect==='name-token')row.identity.nameToken='0'.repeat(64);if(defect==='identity-clock'){const alias=j.after.identity.aliases.find(a=>a.operationId===f.restoreOperationId);assert.ok(alias);alias.at='invalid';}if(defect==='field-clock')j.after.authorship.name.at='invalid';if(defect==='redirect')row.redirectTo=op();
  if(defect==='member-human'){const p=await t.get('placements',f.p.id);p.membershipAuthorship='ai';await t.put('placements',p);}if(defect==='section'){const s=await t.get('sections',f.section.id);s.lifecycle='removed';await t.put('sections',s);}if(defect==='source'){const ix=await t.get('recordIndex',f.entry.sourceRecordIds[0]);await t.put('tombstones',{id:'source:'+ix.sourceKey});}
  await t.put('topics',row);await t.put('revisions',j);if(defect==='receipt-copy')await t.delete('operationReceipts',f.restoreOperationId);await t.put('operationReceipts',receipt);
 });assert.equal(await mapped(f),null);try{const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.processedState,'COMMITTED');}catch(e){assert.ok(['STALE_BASE','UNAVAILABLE'].includes(e.code),e.code);}assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);}finally{await close(f);}
});

for(const missing of ['grant','facet','name','member','input','topic-issuer','topic-id'])test('Topic-name restore needs independent complete '+missing+' authority',async()=>{
 const f=await restored({count:2});try{if(missing==='grant')f.state.payloadAllowed=false;f.state.processingHook=scope=>{if(missing==='facet')scope.facets=['context'];if(missing==='name')delete scope.structuralTopics;if(missing==='member')scope.entries=scope.entries.slice(0,1);if(missing==='input')scope.inputs=scope.inputs.slice(0,1);return scope;};if(missing.startsWith('topic-'))f.service.topic.resolveProcessing=async(_t,r)=>({allowed:missing!=='topic-issuer',epoch:'synthetic-denied',inputIds:r.inputIds,topicIds:missing==='topic-id'?[]:r.topicIds});f.session.dispose();f.session=f.make();
  const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,0,JSON.stringify(r));assert.equal((await acks(f)).length,0);
 }finally{await close(f);}
});

for(const defect of ['different-identity','different-name','null-name','missing-member','partial-evidence','partial-relation','extra-membership','new-section','blanket-no-change'])test('Topic-name restore semantic '+defect+' cannot substitute for actual same-identity reuse',async()=>{
 const f=await restored({count:2}),execute=f.provider.execute;try{f.provider.execute=async request=>{const r=await execute(request),a=r.proposed;if(defect==='different-identity')a.relations.find(r=>r.topicId===f.topic.id).relation='distinct';if(defect==='different-name')a.name+=' guessed';if(defect==='null-name')a.name=null;if(defect==='missing-member')a.entries.pop();if(defect==='partial-evidence')a.evidence.pop();if(defect==='partial-relation')a.relations.find(r=>r.topicId===f.topic.id).citations.pop();if(defect==='extra-membership')a.entries[0].additional=[{topicId:op(),returnValue:structuredClone(a.returnValue)}];if(defect==='new-section')a.section={kind:'named',name:'SYNTHETIC new aspect'};if(defect==='blanket-no-change')r.proposed={outcome:'NO_CHANGE'};return r;};f.session.dispose();f.session=f.make();const before=await snapshot(f),r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);}finally{await close(f);}
});

for(const stage of ['receipt','ack','counter'])for(const drift of ['restore-receipt','name','membership','source','revoke'])test('Topic-name restore final '+stage+' fence rolls back '+drift+' and precise ACK',async()=>{
 const f=await restored(),tx=f.s.repository.transaction.bind(f.s.repository);let hit=false;try{const h=await f.session.prepare(f.options),before=await snapshot(f),receipts=await rows(f.s,'operationReceipts');
  f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const value=await put(n,row,...more),selected=stage==='receipt'?n==='operationReceipts'&&row.result?.outcome==='reuse':stage==='ack'?n==='organizerWorkItems'&&row.unit?.facet==='topic'&&row.state==='ACKNOWLEDGED':n==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0;if(!hit&&selected){hit=true;if(drift==='restore-receipt'){const r=await t.get('operationReceipts',f.restoreOperationId);r.digest='0'.repeat(64);await put('operationReceipts',r);}if(drift==='name'){const v=await t.get('topics',f.topic.id);v.name+=' late';await put('topics',v);}if(drift==='membership'){const p=await t.get('placements',f.p.id);p.rank='000000000099';await put('placements',p);}if(drift==='source'){const r=await t.get('records',f.entry.sourceRecordIds[0]);r.value.originalText+=' late';await put('records',r);}if(drift==='revoke')f.state.payloadAllowed=false;}return value;};}return fn(t);},...rest);
  const r=await f.session.run(h);assert.equal(hit,true,JSON.stringify(r));assert.notEqual(r.state,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);assert.equal((await read(f.s,'meta','aiu:counters:v1'))?.localResolved||0,0);
 }finally{f.s.repository.transaction=tx;await close(f);}
});

for(const drift of ['alias','name-token','identity-clock','field-clock'])test('Topic-name restore terminal counter rejects late '+drift+' changes',async()=>{
 const f=await restored(),tx=f.s.repository.transaction.bind(f.s.repository);let hit=false;try{const h=await f.session.prepare(f.options),before=await snapshot(f);
  f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const result=await put(n,row,...more);if(!hit&&n==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0){hit=true;const v=await t.get('topics',f.topic.id);if(drift==='alias')v.identity.aliases=[];if(drift==='name-token')v.identity.nameToken='0'.repeat(64);if(drift==='identity-clock')v.identity.aliases.find(a=>a.operationId===f.restoreOperationId).at='2020-01-01T00:00:00.000Z';if(drift==='field-clock')v.authorship.name.at='2020-01-01T00:00:00.000Z';await put('topics',v);}return result;};}return fn(t);},...rest);
  const r=await f.session.run(h);assert.equal(hit,true,JSON.stringify(r));assert.notEqual(r.state,'COMMITTED');assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);
 }finally{f.s.repository.transaction=tx;await close(f);}
});

test('Topic-name restore exact ACK abort rolls back original reuse and consumes the same received response once',async()=>{
 const f=await restored(),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;try{const h=await f.session.prepare(f.options),before=await snapshot(f),receipts=await rows(f.s,'operationReceipts');
  f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...more)=>{const result=await put(n,row,...more);if(!aborted&&n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){aborted=true;t.tx.abort();}return result;};}return fn(t);},...rest);
  const first=await f.session.run(h);assert.equal(aborted,true);assert.notEqual(first.state,'COMMITTED');assert.equal((await acks(f)).length,0);assert.deepEqual(await snapshot(f),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);f.s.repository.transaction=tx;
  const second=await f.session.run(h);assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal(f.calls.length,1);assert.equal((await acks(f)).find(a=>a.unit.facet==='topic').outcome,'NO_CHANGE');assert.deepEqual(await snapshot(f),before);
 }finally{f.s.repository.transaction=tx;await close(f);}
});

for(const deny of [false,true])test('dormant original client Topic-restore projection '+(deny?'cannot manufacture denied grants':'retains original selected preparation')+' with zero signed transport',async()=>{
 const f=await restored({capable:false});let remote,configured;try{let forbidden=0;const no=()=>{forbidden++;throw Error('Signed client stage NOT_RUN');},{responseAdapter:unused,...service}=f.service,configuration={origin:'https://synthetic.invalid',scope:f.options.scope,contractVersion:f.options.contractVersion,routeVersion:f.options.routeVersion,service,processing:f.processing,clock:Date.now,resolveAuthority:deny?async()=>({allowed:false}):f.authority,isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:no,currentProfile:()=>null,tokenize:no,isCurrentTokenizer:()=>false,readProofs:no,fetch:no};
  assert.equal(readMaintenanceServiceConfiguration(),null);remote=createMaintenanceServiceClient(configuration);assert.ok(remote);assert.equal(remote.sessionOptions.service.topic.reconcileHumanTopicRestores,true);assert.equal(remote.sessionOptions.service.topic.reconcileHumanSectionRestores,true);assert.equal(remote.sessionOptions.service.topic.resolveProcessing,f.service.topic.resolveProcessing);assert.equal(remote.sessionOptions.processing,f.processing);assert.equal(service.topic.reconcileHumanTopicRestores,false);configured=createConfiguredMaintenanceSession(f.s,configuration);assert.equal(configured.available(),true);
  if(deny)await assert.rejects(configured.prepare(f.options));else{const h=await configured.prepare(f.options),job=await read(f.s,'organizerJobs',h.jobId);assert.ok(job.coverage.some(u=>u.facet==='topic'));assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.unit.facet==='topic').length,0);}assert.equal(forbidden,0);assert.equal((await acks(f)).length,0);assert.equal(f.calls.length,0);
 }finally{configured?.dispose();remote?.dispose();await close(f);}
});

for(const target of ['rename','section-restore'])test('Topic-restore-only route cannot reopen unrelated '+target+' DEFER',async()=>{
 const f=await fixture();try{f.service.topic.reconcileHumanNames=false;
  if(target==='section-restore'){let section=await read(f.s,'sections',f.section.id);const operationId=op();await f.s.editSection({topicId:f.topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC changed Section title',operationId});const j=(await rows(f.s,'revisions')).find(j=>j.operationId===operationId);await f.s.restoreRevision({id:j.id,expectedRevision:j.afterRevision,operationId:op(),side:'before'});}
  // Settle the first real Context job before changing route; a merely prepared
  // job correctly retains the original in-flight fence and is not retry evidence.
  f.provider.execute=async request=>{f.calls.push(structuredClone(request));assert.ok(request.coverage.every(u=>u.facet==='context'));return {accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC separately settled Context'};};
  f.service.responseAdapter.context=async(response,metadata,binding)=>{const scope=await readContextTopicScope(f.s,{topicId:f.topic.id}),evidence=[];for(const inputId of metadata.inputIds){const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:f.topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(input.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence,...(metadata.structuralTopics?{humanTopic:metadata.structuralTopics[0]}:{humanSection:metadata.structuralSections[0]})});}return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic',associationIds:[op()],evidence}}]};};
  f.session.dispose();f.session=f.make();const options={...f.options,cursor:target==='rename'?'aiu:delta:pending:["topic",':'aiu:delta:pending:["section",',limit:1},first=await f.session.run(await f.session.prepare(options));assert.equal(first.processedState,'COMMITTED',JSON.stringify(first));const deferred=(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'),calls=f.calls.length;assert.ok(deferred.length);f.service.topic.reconcileHumanTopicRestores=true;f.session.dispose();f.session=f.make();const before=await rows(f.s,'organizerUsage');await f.session.run(await f.session.prepare({...options,routeVersion:'synthetic-topic-restore-only-v1'}));assert.equal(f.calls.length,calls);for(const row of deferred)assert.deepEqual(await read(f.s,'organizerWorkItems',row.id),row);assert.deepEqual(await rows(f.s,'organizerUsage'),before);
 }finally{await close(f);}
});

test('Topic-name restore complete membership refuses original lowered budget instead of truncating a Section',async()=>{
 const f=await restored({count:2}),limits=f.s.organizerBudget.limits;try{f.s.organizerBudget.limits={...limits,maxInputs:1};const r=await f.session.run(await f.session.prepare(f.options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f)).length,0);}finally{f.s.organizerBudget.limits=limits;await close(f);}
});
for(const value of ['true',1,null])test('Topic-name restore support rejects non-boolean '+JSON.stringify(value),async()=>{const f=await restored();try{f.session.dispose();f.service.topic.reconcileHumanTopicRestores=value;assert.throws(()=>f.make(),{code:'INVALID_REQUEST'});}finally{await close(f);}});
