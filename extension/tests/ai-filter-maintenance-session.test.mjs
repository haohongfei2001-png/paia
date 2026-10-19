import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {authoredContextEvidence} from '../core/context-authored-entry.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {local,inputEdit} from './harness/thought-m1.mjs';
import {assessment,parameters,citation} from './harness/topic-03.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const snapshot=s=>s.repository.transaction(false,async t=>{const all={};for(const n of s.repository.stores)all[n]=await t.all(n);return all;});
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const filterAck=async f=>(await ack(f)).filter(r=>r.unit.facet==='filter');
const visible=async(f,extra={})=>(await f.s.page({documentId:f.candidate.documentId,...extra})).pageItemIds.includes(f.candidate.id);

async function fixture({tier='pro',noAuthority=false,decision='FILTER',selection='valid',patch={},providerMode='valid',adapterMode='valid',groupSize=16}={}){
 const filterState={generation:1,patch,hook:null,prepareHook:null,selection,scopes:[],prepared:[],released:[],decoded:0},live=new WeakMap();
 const filterAuthority={async resolve(t,r){const grant={allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...r.candidateIds,...r.neighborIds],epochs:{entitlement:'synthetic-pro-1',optIn:'synthetic-opt-1',processing:'synthetic-processing-1',userRead:'synthetic-read-1'},policy:{version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'},...filterState.patch};live.set(grant,filterState.generation);if(filterState.hook)await filterState.hook(t,r);return grant;},isCurrent:g=>live.get(g)===filterState.generation};
 const f={s:new OrganizerStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-18T00:00:00Z',...(noAuthority?{}:{aiFilterAuthority:filterAuthority})})};await f.s.consent(true);
 const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
 await f.s.capture({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-filter-session',url:'https://chatgpt.com/c/synthetic-filter-session',title:'Synthetic filter session'},messages:[{sourceMessageId:'neighbor',pageOrder:1,originalText:'Invented paper boat has a wide folded base',presence},{sourceMessageId:'candidate',pageOrder:2,originalText:'然后',presence},{sourceMessageId:'outside',pageOrder:3,originalText:'PRIVATE_OUT_OF_SCOPE_USER_BODY',presence}]});await f.s.finishFoundation();await f.s.evaluateFilters();
 const data=await f.s.snapshot(),find=key=>data.library.blocks.find(b=>data.records.find(r=>r.id===b.originalTextReference)?.sourceMessageId===key),candidate=find('candidate'),neighbor=find('neighbor'),outside=find('outside');
 await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith(DIRTY_PREFIX)){if(row.descriptor.entityId===outside.id)await t.delete('meta',row.id);else if(row.descriptor.entityId===candidate.id)await t.put('meta',{...row,pendingFacets:['topic','context','filter']});}});
 const prepare=f.s.prepareAIMaintenanceFilter.bind(f.s),release=f.s.releaseAIMaintenanceFilter.bind(f.s);f.s.prepareAIMaintenanceFilter=async(...args)=>{if(filterState.prepareHook)await filterState.prepareHook(...args);const handle=await prepare(...args);filterState.prepared.push(handle);return handle;};f.s.releaseAIMaintenanceFilter=handle=>{filterState.released.push(handle);return release(handle);};
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
  const response={accepted:true,operationReceiptId:'synthetic-physical-'+r.childOperationId,fixture:{binding:{logicalJobId:r.logicalJobId,childOperationId:r.childOperationId,operationReceiptId:'synthetic-physical-'+r.childOperationId},topicAssessment:proposed,contextProposal:{operation:'ADD',card:'info',body:'PRIVATE_CONTEXT_BODY '+calls.length,section:'Synthetic maintenance',inputIds:r.coverage.filter(u=>u.facet==='context').map(u=>JSON.parse(u.key)[1])},filterDecisions:[{inputId:candidate.id,decision}],qualified:true,optIn:true,tier:'pro',token:'PRIVATE_PROVIDER_BODY '+calls.length}};const actual=JSON.parse(JSON.stringify(response));responses.push(actual);return actual;
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
 service.filter={enabled:true,selectScope:async request=>{filterState.scopes.push(structuredClone(request));assert.ok(Object.isFrozen(request)&&Object.isFrozen(request.inputIds));assert.deepEqual(Object.keys(request).sort(),['candidateIds','inputIds']);return {candidateIds:request.candidateIds,neighborIds:filterState.selection==='missing'?[]:filterState.selection==='outside'?[outside.id]:filterState.selection==='candidate'?[candidate.id]:[neighbor.id]};}};
 service.responseAdapter.filter=async(response,metadata,binding)=>{filterState.decoded++;if(state.filterHook)await state.filterHook(response,metadata,binding);return {binding:response.fixture.binding,value:response.fixture.filterDecisions};};
 const constructor={provider,service,window,authority,processing:materialProcessing},session=new LocalMaintenanceSession(f.s,constructor);
 return {...f,candidate,neighbor,outside,filterState,filterAuthority,session,constructor,provider,service,window,authority,materialProcessing,verifier,caller,clock,contextAbort,permission,processing,state,calls,responses,decoded};
}

test('positive FILTER joins the actual same-child response and exact original ACK without changing Input, Context or Topic owners',async()=>{
 const f=await fixture(),source=await Promise.all(['records','blocks','inputStates'].map(n=>read(f.s,n))),prior=await f.s.page({documentId:f.candidate.documentId}),h=await f.session.prepare(options);
 const execute=f.provider.execute;f.provider.execute=(...args)=>{assert.equal(f.filterState.prepared.length,1,'handle exists before physical dispatch');assert.equal(f.filterState.released.length,0);return execute(...args);};
 const result=await f.session.run(h);assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);assert.equal(f.filterState.decoded,1);assert.equal(f.state.contextOperations,1);assert.equal(f.state.topicAssessments,1);assert.equal(f.filterState.scopes.length,1);assert.equal(f.filterState.released.length,1);
 assert.deepEqual(f.calls[0].material.inputs.map(i=>i.inputId).sort(),[f.candidate.id,f.neighbor.id].sort());assert.doesNotMatch(JSON.stringify(f.calls),/PRIVATE_OUT_OF_SCOPE_USER_BODY/);assert.equal((await filterAck(f)).length,1);assert.equal((await filterAck(f))[0].outcome,'COMMITTED');assert.equal((await read(f.s,'organizerUsage'))[0].attemptCount,1);assert.equal((await read(f.s,'organizerUsage'))[0].effectiveResultCount,0);
 assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(n=>read(f.s,n))),source);assert.equal((await read(f.s,'topics')).length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);assert.equal((await read(f.s,'filterInputs',f.candidate.id)).decision,'uncertain');assert.equal((await read(f.s,'filterInputs',f.candidate.id)).filterOverride,'none');
 assert.equal(await visible(f),false);assert.equal(await visible(f,{readingSnapshot:prior.readingSnapshot}),true);assert.equal(await visible(f,{includeFiltered:true}),true);assert.equal((await f.s.searchInputs({query:'然后'})).items[0].filtered,true);
 const before=await snapshot(f.s);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal(f.calls.length,1);assert.equal(f.filterState.prepared.length,1);
});
for(const decision of ['KEEP','INSUFFICIENT'])test('qualified '+decision+' preserves visibility and records exact NO_CHANGE',async()=>{const f=await fixture({decision}),result=await f.session.run(await f.session.prepare(options));assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal((await filterAck(f))[0].outcome,'NO_CHANGE');assert.equal(await visible(f),true);assert.equal((await read(f.s,'filterInputs',f.candidate.id)).aiDecision,undefined);assert.equal(f.calls.length,1);});
for(const gates of [{noAuthority:true},{selection:'missing'},{selection:'outside'},{selection:'candidate'},{tier:'free'},{patch:{allowed:false}},{patch:{tier:'free'}},{patch:{optIn:false}},{patch:{processingConsent:false}},{patch:{policy:{version:'pro-ambiguous-1',qualificationId:''}}}])test('missing positive qualification defers without trusting response booleans '+JSON.stringify(gates),async()=>{
 const f=await fixture(gates),transaction=f.s.repository.transaction.bind(f.s.repository);let outsideReads=0;f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,id,...rest)=>{if(name==='blocks'&&id===f.outside.id||name==='records'&&id===f.outside.originalTextReference)outsideReads++;return get(name,id,...rest);};return fn(t);},stores);
 const result=await f.session.run(await f.session.prepare(options));f.s.repository.transaction=transaction;assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.ok(result.facets.some(r=>r.facet==='filter'&&r.state==='DEFERRED'));assert.equal(f.filterState.decoded,0);assert.equal((await filterAck(f)).length,0);assert.equal(f.calls.length,1);assert.equal(outsideReads,0);assert.equal(await visible(f),true);assert.doesNotMatch(JSON.stringify(f.calls),/PRIVATE_OUT_OF_SCOPE_USER_BODY/);
});
for(const initial of ['FILTER','KEEP'])test('provider response mutation after receipt cannot change '+initial,async()=>{const f=await fixture({decision:initial});f.state.topicHook=()=>{f.responses[0].fixture.filterDecisions[0].decision=initial==='FILTER'?'KEEP':'FILTER';f.responses[0].fixture.filterDecisions[0].inputId=f.outside.id;};assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');assert.equal(await visible(f),initial!=='FILTER');assert.equal((await read(f.s,'filterInputs',f.outside.id)).aiDecision,undefined);assert.equal(f.calls.length,1);});
for(const action of ['keep','edit','neighbor-edit','remove','off-on','entitlement','processing','window'])test('current '+action+' change before FILTER commit cannot ACK or hide',async()=>{
 const f=await fixture();f.state.filterHook=async()=>{if(action==='keep')await f.s.keepInput(f.candidate.id);if(action==='edit')await inputEdit(f.s,f.candidate.id,{libraryText:'Synthetic later human text'});if(action==='neighbor-edit')await inputEdit(f.s,f.neighbor.id,{libraryText:'Synthetic later neighbor text'});if(action==='remove')await inputEdit(f.s,f.candidate.id,{excluded:true});if(action==='off-on'){await f.s.setFilterMode('off');await f.s.setFilterMode('light');}if(action==='entitlement'){f.filterState.generation++;f.filterState.patch={tier:'free'};}if(action==='processing')f.contextAbort.abort();if(action==='window')f.clock.abort();};
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.state,'COMMITTED');assert.equal((await filterAck(f)).length,0);assert.equal((await read(f.s,'filterInputs',f.candidate.id)).aiDecision,undefined);assert.equal(f.calls.length,1);assert.equal(f.filterState.released.length,1);
});

for(const stage of ['metadata','ack','usage','job'])test('positive FILTER '+stage+' storage failure rolls back metadata and exact ACK then retries the same response',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,before;
 f.s.repository.transaction=async(write,fn,stores)=>{if(write&&f.filterState.decoded&&!reached)before=await snapshotWith(transaction,f.s);return transaction(write,async t=>{if(write&&f.filterState.decoded&&!reached){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const value=await put(name,row,...rest),hit=stage==='metadata'?name==='filterInputs'&&row.id===f.candidate.id:stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED':stage==='usage'?name==='organizerUsage'&&row.state==='COMMITTED':name==='organizerJobs'&&row.state==='COMMITTED';if(hit&&!reached){reached=true;throw Error('SYNTHETIC_FILTER_TRANSACTION_ABORT');}return value;};}return fn(t);},stores);};
 const failed=await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(reached,true);assert.equal(failed.state,'PARTIAL',JSON.stringify(failed));assert.deepEqual(await snapshot(f.s),before);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.filterState.released.length,0);
 // Both the caller's response and the adapter are now different. Neither can
 // replace the locked decisions used by the original paid child on retry.
 f.responses[0].fixture.filterDecisions[0].decision='KEEP';f.service.responseAdapter.filter=()=>{throw Error('MUST_NOT_DECODE_TWICE');};
 const result=await f.session.run(h);assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(await visible(f),false);assert.equal(f.calls.length,1);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.decoded,1);assert.equal(f.filterState.released.length,1);
});
async function snapshotWith(transaction,s){return transaction(false,async t=>{const result={};for(const name of s.repository.stores)result[name]=await t.all(name);return result;});}
for(const revoke of ['entitlement','processing','dispose'])test('positive FILTER final '+revoke+' revocation after ACK put rolls back the entire original transaction',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,before;
 f.s.repository.transaction=async(write,fn,stores)=>{if(write&&f.filterState.decoded&&!reached)before=await snapshotWith(transaction,f.s);return transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const value=await put(name,row,...rest);if(name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED'&&!reached){reached=true;if(revoke==='entitlement')f.filterState.generation++;if(revoke==='processing')f.contextAbort.abort();if(revoke==='dispose')f.session.dispose();}return value;};}return fn(t);},stores);};
 const failed=await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(reached,true);assert.notEqual(failed.state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.filterState.released.length,1);assert.equal(f.calls.length,1);
});
test('lost positive FILTER acknowledgement resumes the durable exact ACK without another physical request or decision',async()=>{
 const f=await fixture(),h=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let lost=false;
 f.s.repository.transaction=async(write,fn,stores)=>{let filterAck=false;const result=await transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED')filterAck=true;return result;};}return fn(t);},stores);if(filterAck&&!lost){lost=true;throw Object.assign(Error('SYNTHETIC_FILTER_ACK_LOST'),{code:'STORAGE_FAILED'});}return result;};
 await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(lost,true);const before=await snapshot(f.s);assert.equal((await f.session.run(h)).state,'COMMITTED');assert.deepEqual(await snapshot(f.s),before);assert.equal(await visible(f),false);assert.equal((await filterAck(f)).length,1);assert.equal(f.calls.length,1);assert.equal(f.filterState.decoded,1);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.released.length,1);
});
for(const mode of ['off','downgrade','opt-out','processing','policy'])test('committed session FILTER visibility fails open on '+mode,async()=>{
 const f=await fixture();assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');assert.equal(await visible(f),false);
 if(mode==='off')await f.s.setFilterMode('off');if(mode==='downgrade')f.filterState.patch={tier:'free'};if(mode==='opt-out')f.filterState.patch={optIn:false};if(mode==='processing')f.filterState.patch={processingConsent:false};if(mode==='policy')f.filterState.patch={policy:{version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_OTHER_POLICY'}};
 assert.equal(await visible(f),true);assert.equal(f.calls.length,1);
});
test('disposing during the actual held provider releases the prepared filter handle and ignores late response',async()=>{
 const f=await fixture(),h=await f.session.prepare(options);let release,started;f.state.held=new Promise(resolve=>{release=resolve;});const dispatched=new Promise(resolve=>{started=resolve;}),execute=f.provider.execute;f.provider.execute=(...args)=>{started();return execute(...args);};
 const running=f.session.run(h);await dispatched;assert.equal(f.filterState.prepared.length,1);f.session.dispose();assert.equal(f.filterState.released.length,1);release();assert.notEqual((await running).state,'COMMITTED');assert.equal((await filterAck(f)).length,0);assert.equal((await read(f.s,'filterInputs',f.candidate.id)).aiDecision,undefined);assert.equal(f.calls.length,1);assert.equal((await f.session.run(h)).state,'UNAVAILABLE');
});
test('dispose after owner preparation returns still releases the uninstalled handle before dispatch',async()=>{
 const f=await fixture(),prepare=f.s.prepareAIMaintenanceFilter.bind(f.s);f.s.prepareAIMaintenanceFilter=async(...args)=>{const h=await prepare(...args);f.session.dispose();return h;};
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.state,'COMMITTED');assert.equal(f.calls.length,0);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.released.length,1);assert.equal((await filterAck(f)).length,0);
});
for(const stage of ['prepare','commit'])test('processing revocation inside filter authority '+stage+' prevents every later body read',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);let watch=false,bodyReads=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,...args)=>{if(watch&&['blocks','records'].includes(name))bodyReads++;return get(name,...args);};return fn(t);},stores);
 f.filterState.hook=()=>{if(stage==='prepare'||f.filterState.decoded){watch=true;f.processing.allowed=false;}};
 const result=await f.session.run(await f.session.prepare(options));f.s.repository.transaction=transaction;assert.notEqual(result.state,'COMMITTED');assert.equal(watch,true);assert.equal(bodyReads,0);assert.equal((await filterAck(f)).length,0);assert.equal(f.calls.length,stage==='prepare'?0:1);assert.equal(f.filterState.released.length,stage==='prepare'?0:1);
});

for(const failAck of [false,true])test('mixed following-child refusal preserves first paid FILTER response'+(failAck?' across filter ACK rollback':''),async()=>{
 const f=await fixture(),topic=await f.s.createTopic({operationId:op(),name:'Synthetic human Topic'}),human=await f.s.createEntry({actor:'user',operationId:op(),body:'PRIVATE_FOLLOWING_AUTHORED_BODY',type:'idea',formation:'explicit',evidence:[]});
 await f.s.placeEntry({entryId:human.id,topicId:topic.id,expectedEntryRevision:human.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});
 let deny=true;const resolve=f.materialProcessing.resolve;f.materialProcessing.resolve=async(t,scope)=>{const grant=await resolve(t,scope);return scope.authoredEntries&&deny?{...grant,processing:false}:grant;};
 const execute=f.provider.execute;f.provider.execute=async request=>{if(!request.material.authoredEntries)return execute(request);f.calls.push(structuredClone(request));return {accepted:true,operationReceiptId:'synthetic-following-'+request.childOperationId,body:'Synthetic following Context'};};
 const adapt=f.service.responseAdapter.context;f.service.responseAdapter.context=async(response,metadata,binding)=>{if(!metadata.authoredEntries)return adapt(response,metadata,binding);const evidence=[];for(const m of metadata.authoredEntries){const scope=await readContextTopicScope(f.s,{topicId:m.topicId});assert.equal(scope.available,true);evidence.push(authoredContextEvidence(m,scope.binding,m.fieldDigests??m.bodyDigest));}return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic following',associationIds:[op()],evidence}}]};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,processing:f.materialProcessing,service:f.service});const h=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let failed=false;
 if(failAck)f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(!failed&&name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED'){failed=true;throw Error('SYNTHETIC_MIXED_FILTER_ACK_ABORT');}return result;};}return fn(t);},stores);
 const first=await f.session.run(h);f.s.repository.transaction=transaction;assert.equal(first.state,'UNAVAILABLE',JSON.stringify(first));assert.equal(h.childCount,2);assert.equal(f.calls.length,1);assert.equal(f.filterState.decoded,1);assert.equal((await filterAck(f)).length,failAck?0:1);assert.equal(failed,failAck);assert.equal(f.filterState.released.length,failAck?0:1,'a fully ACKed child releases its handle even while an unsent sibling remains');assert.doesNotMatch(JSON.stringify(f.calls),/PRIVATE_FOLLOWING_AUTHORED_BODY/);
 deny=false;const second=await f.session.run(h);assert.equal(second.processedState??second.state,'COMMITTED',JSON.stringify(second));assert.equal(f.calls.length,2);assert.equal(f.filterState.decoded,1);assert.equal(f.filterState.prepared.length,1);assert.equal((await filterAck(f)).length,1);assert.equal(await visible(f),false);assert.equal(f.filterState.released.length,1);assert.equal(f.calls[1].material.authoredEntries[0].body,'PRIVATE_FOLLOWING_AUTHORED_BODY');assert.equal((await read(f.s,'organizerUsage')).filter(r=>r.jobId===h.jobId).every(r=>r.attemptCount===1&&r.state==='COMMITTED'),true);
});

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const stop of ['timeout','dispose','window-revoke'])test('held selectScope must settle under original bounded '+stop,async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;
 let release,entered;const held=new Promise(resolve=>{release=resolve;}),admitted=new Promise(resolve=>{entered=resolve;});
 f.service.filter.selectScope=async request=>{entered();await held;return {candidateIds:request.candidateIds,neighborIds:[f.neighbor.id]};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});
 const h=await f.session.prepare(options),running=f.session.run(h);await admitted;
 if(stop==='dispose')f.session.dispose();if(stop==='window-revoke')f.clock.abort();
 const settled=await Promise.race([running,pause(200).then(()=>({state:'STILL_PENDING_AFTER_200MS'}))]);
 const before={state:settled.state,providerCalls:f.calls.length,usage:(await read(f.s,'organizerUsage')).map(r=>r.state)};
 // Release only for test cleanup, never as the means of passing cancellation.
 release();const late=await running;
 const after={state:late.state,providerCalls:f.calls.length,filterACKs:(await filterAck(f)).length,hidden:!await visible(f)};
 f.session.dispose();
 assert.equal(settled.state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE',JSON.stringify({stop,before,after}));
 assert.equal(after.providerCalls,0,'late selection must not dispatch after stop');
 assert.equal(after.filterACKs,0);assert.equal(after.hidden,false);
});

for(const stop of ['timeout','dispose','window-revoke'])test('held filter authority releases the Store queue under original '+stop,async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;let release,entered,watch=false,bodyReads=0;
 const held=new Promise(resolve=>{release=resolve;}),admitted=new Promise(resolve=>{entered=resolve;}),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,...args)=>{if(watch&&['blocks','records'].includes(name))bodyReads++;return get(name,...args);};return fn(t);},stores);
 f.filterState.hook=async()=>{watch=true;entered();await held;};
 const h=await f.session.prepare(options),running=f.session.run(h);await admitted;if(stop==='dispose')f.session.dispose();if(stop==='window-revoke')f.clock.abort();
 const settled=await Promise.race([running,pause(200).then(()=>({state:'STILL_PENDING_AFTER_200MS'}))]);
 // Observe settlement before releasing the held authority. A blocked Store
 // queue must not be made to look healthy by the test's cleanup release.
 release();await running;await pause(0);f.s.repository.transaction=transaction;
 assert.equal(settled.state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');assert.equal(bodyReads,0);assert.equal(f.calls.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(f.filterState.prepared.length,0);assert.equal(await visible(f),true);assert.equal((await read(f.s,'organizerUsage'))[0].state,'OUTCOME_UNKNOWN');f.session.dispose();
});
for(const stop of ['timeout','dispose','window-revoke'])test('late uninstalled filter handle is released after original '+stop,async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;let release,entered,released;
 const held=new Promise(resolve=>{release=resolve;}),admitted=new Promise(resolve=>{entered=resolve;}),retired=new Promise(resolve=>{released=resolve;}),prepare=f.s.prepareAIMaintenanceFilter.bind(f.s),retire=f.s.releaseAIMaintenanceFilter.bind(f.s);
 f.s.prepareAIMaintenanceFilter=async(...args)=>{const handle=await prepare(...args);entered();await held;return handle;};f.s.releaseAIMaintenanceFilter=handle=>{retire(handle);released(true);};
 const h=await f.session.prepare(options),running=f.session.run(h);await admitted;if(stop==='dispose')f.session.dispose();if(stop==='window-revoke')f.clock.abort();
 const settled=await Promise.race([running,pause(200).then(()=>({state:'STILL_PENDING_AFTER_200MS'}))]);assert.equal(f.filterState.released.length,0);release();await running;
 assert.equal(await Promise.race([retired,pause(200).then(()=>false)]),true,'late owner handle must be released without installation');
 assert.equal(settled.state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');assert.equal(f.calls.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.released.length,1);assert.equal(await visible(f),true);assert.equal((await f.session.run(h)).state,stop==='timeout'?'OUTCOME_UNKNOWN':'UNAVAILABLE');f.session.dispose();
});
test('a selector crossing the original deadline before the timer task runs cannot dispatch',async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;f.service.filter.selectScope=request=>{const end=performance.now()+30;while(performance.now()<end){}return {candidateIds:request.candidateIds,neighborIds:[f.neighbor.id]};};
 f.session.dispose();f.session=new LocalMaintenanceSession(f.s,{...f.constructor,service:f.service});const h=await f.session.prepare(options),result=await f.session.run(h);
 assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,0);assert.equal(f.filterState.prepared.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);f.session.dispose();
});

test('deadline during an awaited positive-owner body read prevents subsequent body reads and dispatch',async()=>{
 const f=await fixture();f.s.organizerBudget.limits.timeoutMs=25;let release,entered,watch=false,bodyReads=0,paused=false;
 const held=new Promise(resolve=>{release=resolve;}),admitted=new Promise(resolve=>{entered=resolve;}),transaction=f.s.repository.transaction.bind(f.s.repository);f.filterState.prepareHook=()=>{watch=true;};
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=async(name,...args)=>{if(watch&&['blocks','records'].includes(name))bodyReads++;const result=await get(name,...args);if(watch&&name==='blocks'&&!paused){paused=true;entered();await held;}return result;};return fn(t);},stores);
 const running=f.session.run(await f.session.prepare(options));await admitted;const settled=await Promise.race([running,pause(200).then(()=>({state:'STILL_PENDING_AFTER_200MS'}))]);release();await running;await pause(0);f.s.repository.transaction=transaction;
 assert.equal(settled.state,'OUTCOME_UNKNOWN');assert.equal(bodyReads,1);assert.equal(f.calls.length,0);assert.equal(f.filterState.prepared.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);f.session.dispose();
});
test('owner handle is released if its original read transaction fails after preparation',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);let failed=false;
 f.s.repository.transaction=async(write,fn,stores)=>{const result=await transaction(write,fn,stores);if(!write&&f.filterState.prepared.length&&!failed){failed=true;throw Object.assign(Error('SYNTHETIC_PREPARED_READ_FAILURE'),{code:'STORAGE_FAILED'});}return result;};
 const result=await f.session.run(await f.session.prepare(options));f.s.repository.transaction=transaction;assert.equal(failed,true);assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal(f.calls.length,0);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.released.length,1);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);f.session.dispose();
});
