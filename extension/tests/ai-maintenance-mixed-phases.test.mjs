import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {TopicFormationService} from '../core/topic-formation.js';
import {authoredContextEvidence} from '../core/context-authored-entry.js';
import {CONTEXT_CARDS_ROW,ContextCardsService} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup,capture,inputEdit} from './harness/thought-m1.mjs';
import {assessment,parameters,citation} from './harness/topic-03.mjs';

const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');

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

async function mixedFixture({authored=true,placement=true}={}){
 const f=await fixture();assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');f.session.dispose();
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
 const resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>{if(scope.purpose!=='ai-maintenance-payload')return resolve(t,scope);grants.push(structuredClone(scope));events.push('grant:'+!!scope.authoredEntries+':'+!!scope.placements);return resolve(t,scope);};
 let grant;const window={acquire:async r=>grant={version:1,kind:'fixture',dayId:'synthetic-day',windowId:'synthetic-mixed-phases',reservationId:'synthetic-mixed-phases',tier:'free',requestDigest:r.requestDigest,revocationSignal:f.clock.signal},isCurrent:r=>r===grant};
 const constructor={...f.constructor,window,processing:f.materialProcessing},session=new LocalMaintenanceSession(f.s,constructor);return {...f,constructor,session,input,topic,human,grants,events};
}
for(const variants of [{placement:true,authored:false},{placement:false,authored:true},{placement:true,authored:true}])test('one admitted cycle completes Topic then fresh Context '+JSON.stringify(variants),async()=>{
 const f=await mixedFixture(variants),beforeTopic=await read(f.s,'topics',f.topic.id),beforeHuman=f.human&&await read(f.s,'thoughts',f.human.id),h=await f.session.prepare(options),r=await f.session.run(h);
 assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(r.pendingPlacementUnits??0,0);assert.equal(r.pendingAuthoredUnits??0,0);assert.equal(f.calls.length,2);assert.equal(h.childCount,2);assert.ok(f.calls[0].coverage.some(u=>u.facet==='topic'));assert.ok(f.calls[1].coverage.every(u=>u.facet==='context'));assert.equal(f.calls[0].material.authoredEntries,undefined);assert.equal(f.calls[0].material.placements,undefined);
 const later=f.calls[1].material,now=await read(f.s,'topics',f.topic.id);assert.ok(now.organizationRevision>beforeTopic.organizationRevision);for(const m of [...later.placements||[],...later.authoredEntries||[]])assert.equal(m.topicOrganizationRevision,now.organizationRevision);
 if(f.human){assert.deepEqual(await read(f.s,'thoughts',f.human.id),beforeHuman);assert.deepEqual(later.authoredEntries[0].selectedFields,['body','note']);}
 const a=await ack(f),keys=f.calls.flatMap(c=>c.coverage);for(const unit of keys)assert.equal(a.filter(x=>JSON.stringify(x.unit)===JSON.stringify(unit)).length,1);const receipts=(await read(f.s,'organizerUsage')).filter(x=>x.jobId===h.jobId);assert.ok(receipts.every(x=>x.attemptCount===1&&x.state==='COMMITTED'));assert.equal(new Set(receipts.map(x=>x.parentReservationId)).size,1);
 assert.ok(f.events.indexOf('provider:true')<f.events.findIndex(x=>x==='grant:true:false'||x==='grant:false:true'||x==='grant:true:true'));assert.equal((await new ContextCardsService(f.s).snapshot()).items.length>=2,true);await f.session.run(h);assert.equal(f.calls.length,2);f.session.dispose();
});

const followingAck=(rows,f)=>rows.filter(a=>a.unit.facet==='context'&&(['library_entry',f.human?.id].every((v,i)=>JSON.parse(a.unit.key)[i]===v)||JSON.parse(a.unit.key)[0]==='placement'));
function resetSession(f){f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing,service:f.service});}
for(const refusal of ['deny','extra-field','expired-first','window-revoked'])test('mixed second child requires original authority and fresh exact grant: '+refusal,async()=>{
 const f=await mixedFixture(),resolve=f.materialProcessing.resolve,now=Date.now;let secondGrants=0;
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);if(!scope.authoredEntries)return receipt;secondGrants++;
  if(refusal==='deny')return {...receipt,processing:false};
  if(refusal==='extra-field')return {...receipt,scope:{...scope,authoredEntries:scope.authoredEntries.map(m=>({...m,selectedFields:[...m.selectedFields,'title']}))}};
  if(refusal==='expired-first')Date.now=()=>now()+600001;
  if(refusal==='window-revoked')f.clock.abort();return receipt;
 };resetSession(f);
 const digest=crypto.subtle.digest.bind(crypto.subtle);let authoredHashes=0;crypto.subtle.digest=async(a,bytes)=>{if(new TextDecoder().decode(bytes).includes('SYNTHETIC independent'))authoredHashes++;return digest(a,bytes);};
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'UNAVAILABLE',JSON.stringify(r));assert.equal(secondGrants,1);assert.equal(f.calls.length,1);assert.equal(authoredHashes,0);assert.equal(followingAck(await ack(f),f).length,0);const rs=(await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId);assert.equal(rs.length,2);assert.equal(rs.filter(r=>r.state==='RESERVED'&&r.attemptCount===0).length,1);await f.session.run(h);assert.equal(f.calls.length,1);}finally{crypto.subtle.digest=digest;if(typeof now==='function')Date.now=now;f.session.dispose();}
});

for(const failure of ['provider-unknown','topic-rejected'])test('failed Topic never sends or hashes following child: '+failure,async()=>{
 const f=await mixedFixture();if(failure==='provider-unknown'){const execute=f.provider.execute;f.provider.execute=async r=>{await execute(r);throw Error('Synthetic unknown');};}else f.service.responseAdapter.topic=async()=>null;resetSession(f);
 const digest=crypto.subtle.digest.bind(crypto.subtle);let authoredHashes=0;crypto.subtle.digest=async(a,bytes)=>{if(new TextDecoder().decode(bytes).includes('SYNTHETIC independent'))authoredHashes++;return digest(a,bytes);};
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,failure==='provider-unknown'?'OUTCOME_UNKNOWN':'PARTIAL',JSON.stringify(r));assert.equal(f.calls.length,1);assert.equal(authoredHashes,0);assert.equal(followingAck(await ack(f),f).length,0);assert.equal(f.grants.some(s=>s.authoredEntries),false);await f.session.run(h);assert.equal(f.calls.length,1);const rs=(await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId);assert.equal(rs.filter(r=>r.attemptCount===0&&r.state==='RESERVED').length,1);}finally{crypto.subtle.digest=digest;f.session.dispose();}
});

test('Topic transaction abort does not publish following mapping and retries only the original response',async()=>{
 const f=await mixedFixture(),beforeTopic=await read(f.s,'topics',f.topic.id),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...rest)=>{const result=await put(n,row,...rest);if(!aborted&&n==='topics'&&row.id===f.topic.id&&row.organizationRevision>beforeTopic.organizationRevision){aborted=true;throw Error('Synthetic atomic Topic abort');}return result;};}return fn(t);},stores);
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.ok(r.facets.some(x=>x.facet==='topic'&&x.reason==='STORAGE_FAILED'));assert.equal(aborted,true);assert.equal(f.calls.length,1);assert.equal(f.grants.some(s=>s.authoredEntries),false);assert.deepEqual(await read(f.s,'topics',f.topic.id),beforeTopic);assert.equal(followingAck(await ack(f),f).length,0);
 const retried=await f.session.run(h);assert.equal(retried.processedState,'COMMITTED',JSON.stringify(retried));assert.equal(f.calls.length,2);assert.equal((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1),true);}finally{f.s.repository.transaction=tx;f.session.dispose();}
});

for(const mutation of ['authored-note','placement','input','source','topic'])test('original currentness fence rejects mixed candidate drift before second dispatch: '+mutation,async()=>{
 const f=await mixedFixture(),resolve=f.materialProcessing.resolve;let changed=false;
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);if(scope.authoredEntries&&!changed){changed=true;
  // An owner-independent drift models a race after qualification; unchanged
  // dirty/epoch metadata cannot excuse accepting a changed canonical row.
  const name=mutation==='authored-note'?'thoughts':mutation==='placement'?'placements':mutation==='input'?'blocks':mutation==='source'?'records':'topics';
  const rows=await t.all(name),row=mutation==='authored-note'?rows.find(x=>x.id===f.human.id):mutation==='topic'?rows.find(x=>x.id===f.topic.id):mutation==='placement'?rows.find(x=>x.id===scope.placements[0].placementId):rows[0];
  if(mutation==='placement'){assert.equal(row.membershipAuthorship,'user');assert.equal(row.orderProtection,true);}
  queueMicrotask(()=>f.s.repository.transaction(true,async w=>{const current=await w.get(name,row.id??row.key);if(mutation==='authored-note')current.note='SYNTHETIC changed unjournaled note';else if(mutation==='placement')current.orderProtection=false;else if(mutation==='input')current.value.libraryText='SYNTHETIC changed unjournaled Input';else if(mutation==='source'){await w.delete(name,row.id??row.key);return;}else current.organizationRevision++;await w.put(name,current);}));
 }return receipt;};resetSession(f);const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(changed,true);assert.notEqual(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1,JSON.stringify(r));assert.equal(followingAck(await ack(f),f).length,0);f.session.dispose();
});

test('saturated two-child cycle keeps mixed obligations pending without a third child or scan advance',async()=>{
 const f=await mixedFixture();for(let i=0;i<20;i++)await f.s.capture(capture((await f.s.status()).epoch,'synthetic-saturated-'+i,'SYNTHETIC saturated Input '+i));
 const cursor='aiu:delta:pending:',h=await f.session.prepare({...options,cursor}),job=await read(f.s,'organizerJobs',h.jobId);assert.equal(h.childCount,2);assert.equal(h.pendingAuthoredUnits,1);assert.equal(h.pendingPlacementUnits,1);assert.equal(h.nextCursor,cursor);assert.equal(h.complete,false);assert.equal(f.calls.length,0);assert.equal(job.childIds.length,2);assert.ok(job.coverage.every(u=>!['library_entry','placement'].includes(JSON.parse(u.key)[0])));assert.equal(followingAck(await ack(f),f).length,0);f.session.dispose();
});

for(const mutation of ['placement','authored','input'])test('following child final shared transaction rejects late '+mutation+' drift',async()=>{
 const f=await mixedFixture({placement:true,authored:mutation!=='placement'}),check=TopicFormationService.prototype.checkMaterial,topicRead=TopicFormationService.prototype.read;let active=null,checks=0,changed=false;
 TopicFormationService.prototype.checkMaterial=async function(handle,finalFence){const prior=active;active={read:0,final:typeof finalFence==='function'&&f.grants.some(s=>s.placements)?++checks:0};try{return await check.call(this,handle,finalFence);}finally{active=prior;}};
 TopicFormationService.prototype.read=async function(...args){if(active&&++active.read===2&&active.final===2&&!changed){changed=true;await f.s.repository.transaction(true,async t=>{
  if(mutation==='placement'){const row=(await t.all('placements')).find(p=>p.entryId!==f.human?.id&&p.membershipAuthorship==='user');row.orderProtection=false;await t.put('placements',row);}
  if(mutation==='authored'){const row=await t.get('thoughts',f.human.id);row.note='SYNTHETIC final note drift';await t.put('thoughts',row);}
  if(mutation==='input'){const row=await t.get('blocks',f.input.id);row.value.libraryText='SYNTHETIC final Input drift';await t.put('blocks',row);}
 });}return topicRead.apply(this,args);};
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(changed,true);assert.equal(f.calls.length,1,JSON.stringify(r));assert.equal(followingAck(await ack(f),f).length,0);}finally{TopicFormationService.prototype.checkMaterial=check;TopicFormationService.prototype.read=topicRead;f.session.dispose();}
});

test('following Context transaction abort retries its saved response without a third physical attempt',async()=>{
 const f=await mixedFixture(),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...rest)=>{const result=await put(n,row,...rest);if(!aborted&&n==='meta'&&row.id===CONTEXT_CARDS_ROW&&row.items.some(i=>i.maintenance?.provenance.evidence.some(e=>e.kind==='humanEntry'&&e.entryId===f.human.id))){aborted=true;throw Error('Synthetic following Context abort');}return result;};}return fn(t);},stores);
 try{const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(aborted,true);assert.equal(r.state,'PARTIAL');assert.equal(f.calls.length,2);assert.equal(followingAck(await ack(f),f).length,0);const result=await f.session.run(h);assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,2);assert.equal(followingAck(await ack(f),f).length,2);assert.ok((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1&&r.state==='COMMITTED'));}finally{f.s.repository.transaction=tx;f.session.dispose();}
});

test('unknown following child keeps original two attempts and cannot replay after session restart',async()=>{
 const f=await mixedFixture(),execute=f.provider.execute;f.provider.execute=async r=>{const response=await execute(r);if(!r.coverage.some(u=>u.facet==='topic'))throw Error('Synthetic following outcome unknown');return response;};const h=await f.session.prepare(options),r=await f.session.run(h);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,2);assert.equal(followingAck(await ack(f),f).length,0);assert.equal((await f.session.run(h)).state,'OUTCOME_UNKNOWN');f.session.dispose();const next=new LocalMaintenanceSession(f.s,f.constructor);await assert.rejects(next.prepare(options),{code:'REQUEST_ALREADY_IN_FLIGHT'});assert.equal(f.calls.length,2);assert.ok((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1));next.dispose();
});

for(const variants of [{placement:true,authored:false},{placement:false,authored:true},{placement:true,authored:true}])test('temporary following grant refusal preserves the valid first response '+JSON.stringify(variants),async()=>{
 const f=await mixedFixture(variants),resolve=f.materialProcessing.resolve,decode=f.service.responseAdapter.context,decoded=[];let denied=true;
 f.service.responseAdapter.context=async(...args)=>{decoded.push(args[2].childOperationId);return decode(...args);};
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);return denied&&(scope.placements||scope.authoredEntries)?{...receipt,processing:false}:receipt;};resetSession(f);
 const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(first.state,'UNAVAILABLE');assert.equal(f.calls.length,1);assert.equal(followingAck(await ack(f),f).length,0);
 const firstChild=f.calls[0].childOperationId,receipts=await read(f.s,'organizerUsage');assert.equal(receipts.find(r=>r.childId===firstChild).state,'COMMITTED','the still-authorized first Context consumes its original response');
 const firstAck=(await ack(f)).filter(r=>r.jobId===h.jobId);assert.equal(firstAck.length,f.calls[0].coverage.length);assert.equal(decoded.filter(id=>id===firstChild).length,1);
 assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal(f.calls.length,1);assert.deepEqual((await ack(f)).filter(r=>r.jobId===h.jobId),firstAck);
 denied=false;const completed=await f.session.run(h);assert.equal(completed.processedState,'COMMITTED',JSON.stringify(completed));assert.equal(f.calls.length,2);assert.equal(decoded.filter(id=>id===firstChild).length,1,'the first response is never decoded twice');
 const finalReceipts=(await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId);assert.ok(finalReceipts.every(r=>r.attemptCount===1&&r.state==='COMMITTED'));assert.equal(new Set(finalReceipts.map(r=>r.parentReservationId)).size,1);await f.session.run(h);assert.equal(f.calls.length,2);f.session.dispose();
 const next=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing,service:f.service}),passive=await next.prepare(options);assert.equal(passive.jobId,null);assert.equal(f.calls.length,2);next.dispose();
});

for(const revocation of ['first-grant','authority-epoch'])test('following grant refusal cannot retain a revoked first response: '+revocation,async()=>{
 const f=await mixedFixture(),resolve=f.materialProcessing.resolve,epoch=f.permission.consentEpoch;let changed=false;
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);if(scope.authoredEntries){if(!changed){changed=true;if(revocation==='first-grant')f.state.processing=false;else f.permission.consentEpoch='synthetic-revoked-consent';}return {...receipt,processing:false};}return receipt;};resetSession(f);
 const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(changed,true);assert.ok(['UNAVAILABLE','CANCELLED'].includes(first.state));assert.equal(f.calls.length,1);assert.equal((await ack(f)).filter(r=>r.jobId===h.jobId&&r.unit.facet==='context').length,0);
 f.state.processing=true;f.permission.consentEpoch=epoch;const retried=await f.session.run(h);assert.notEqual(retried.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).filter(r=>r.jobId===h.jobId&&r.unit.facet==='context').length,0,'restoring a host flag cannot resurrect the discarded response');f.session.dispose();
});

test('following refusal and first Context storage abort retry only the original response',async()=>{
 const f=await mixedFixture(),resolve=f.materialProcessing.resolve,decode=f.service.responseAdapter.context,decoded=[],tx=f.s.repository.transaction.bind(f.s.repository),before=await read(f.s,'meta',CONTEXT_CARDS_ROW);let denied=true,aborted=false;
 f.materialProcessing.resolve=async(t,scope)=>{const receipt=await resolve(t,scope);return denied&&scope.authoredEntries?{...receipt,processing:false}:receipt;};
 f.service.responseAdapter.context=async(...args)=>{decoded.push(args[2].childOperationId);return decode(...args);};resetSession(f);
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...rest)=>{const result=await put(n,row,...rest);if(!aborted&&n==='meta'&&row.id===CONTEXT_CARDS_ROW&&row.items.length>before.items.length){aborted=true;throw Error('Synthetic first Context storage abort');}return result;};}return fn(t);},stores);
 try{const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(aborted,true);assert.equal(first.state,'UNAVAILABLE');assert.ok(first.facets.some(r=>r.facet==='context'&&r.reason==='STORAGE_FAILED'));assert.equal(f.calls.length,1);assert.equal((await ack(f)).filter(r=>r.jobId===h.jobId&&r.unit.facet==='context').length,0);
  assert.equal((await f.session.run(h)).state,'UNAVAILABLE');assert.equal(f.calls.length,1);assert.equal(decoded.length,1);assert.equal((await ack(f)).filter(r=>r.jobId===h.jobId&&r.unit.facet==='context').length,1);
  denied=false;assert.equal((await f.session.run(h)).processedState,'COMMITTED');assert.equal(f.calls.length,2);assert.equal(decoded.filter(id=>id===f.calls[0].childOperationId).length,1);assert.ok((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1&&r.state==='COMMITTED'));
 }finally{f.s.repository.transaction=tx;f.session.dispose();}
});

test('exact Topic ACK abort publishes no following metadata and reuses the original response',async()=>{
 const f=await mixedFixture(),before=await read(f.s,'topics',f.topic.id),tx=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...rest)=>{const result=await put(n,row,...rest);if(!aborted&&n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){aborted=true;throw Error('Synthetic exact Topic ACK abort');}return result;};}return fn(t);},stores);
 try{const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(aborted,true);assert.equal(first.state,'PARTIAL');assert.equal(f.calls.length,1);assert.equal(f.grants.some(s=>s.authoredEntries),false);assert.deepEqual(await read(f.s,'topics',f.topic.id),before);assert.equal((await ack(f)).filter(r=>r.jobId===h.jobId).length,0);
  assert.equal((await f.session.run(h)).processedState,'COMMITTED');assert.equal(f.calls.length,2);assert.ok((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1&&r.state==='COMMITTED'));
 }finally{f.s.repository.transaction=tx;f.session.dispose();}
});
