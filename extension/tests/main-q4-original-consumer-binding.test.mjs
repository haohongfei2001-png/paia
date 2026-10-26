// New MAIN-bound consumer closure. Historical development tests are not replayed.
// Seven selected original-owner cases, synthetic storage only; no external call.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup} from './harness/thought-m1.mjs';
import {formationFixture,runFormation,rows,op,parameters,inputEdit} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {TopicFormationService} from '../core/topic-formation.js';
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource} from '../background/maintenance-processing-commands.js';
import {SettingsMaintenanceState} from '../ui/settings-maintenance-state.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>t.get(n,id));
const acks=async s=>(await rows(s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const deferred=async s=>(await rows(s,'organizerWorkItems')).filter(r=>r.id.startsWith('aiu:defer:'));
const history=async s=>(await rows(s,'organizerWorkItems')).filter(r=>r.id.startsWith('aiu:defer-history:'));
const tables=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions','operationReceipts'];
const semantic=async s=>Object.fromEntries(await Promise.all(tables.map(async n=>[n,await rows(s,n)])));
async function settings(s,enabled){
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'document-A',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(s,api),state=new SettingsMaintenanceState({send:(type,fields={})=>commands.handle({type,...fields},sender)});await state.load();assert.equal(state.value.enabled,false);if(enabled)assert.equal(await state.configure(true),true);return {commands,state};
}

async function settleContext(f){
 const abort=new AbortController(),expiresAt=Date.now()+30000,processing={resolve:async(_t,scope)=>Object.freeze({version:1,store:f.s,caller:f.caller,scope,epoch:'synthetic-local-context-fields',processing:true,expiresAt,revocationSignal:abort.signal}),isCurrent:()=>!abort.signal.aborted};
 const service={...f.service,topic:{...f.service.topic,reconcileHumanNames:false,reconcileHumanSections:false,reconcileHumanSectionRestores:false,reconcileHumanTopicRestores:false},responseAdapter:{topic:async()=>assert.fail('Topic remains pending'),context:async(response,metadata,binding)=>{
  const scope=await readContextTopicScope(f.s,{topicId:f.topic.id}),evidence=[];assert.equal(scope.available,true);
  for(const inputId of metadata.inputIds){const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:f.topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(input.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence,...(metadata.structuralTopics?{humanTopic:metadata.structuralTopics[0]}:{humanSection:metadata.structuralSections[0]})});}
  return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:response.body,section:'Synthetic',associationIds:[op()],evidence}}]};
 }}};
 let grant;const session=new LocalMaintenanceSession(f.s,{authority:f.authority,service,processing,provider:{describe:()=>({providerId:'synthetic-local-context',version:'1',executionKind:'fixture'}),execute:async request=>{assert.ok(request.coverage.every(u=>u.facet==='context'));f.contextResponses++;return {accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC original Context settlement'};}},window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant&&!abort.signal.aborted}});
 try{const result=await session.run(await session.prepare({...f.options,routeVersion:'synthetic-context-before-source'}));assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.deepEqual((await acks(f.s)).map(a=>a.unit.facet),['context']);assert.ok((await rows(f.s,'organizerWorkItems')).some(r=>r.state==='DEFERRED'&&r.unit.facet==='topic'));}finally{session.dispose();}
}


async function fixture(t,mode){
 const authored=mode==='authored',placement=mode==='placement',restore=mode.endsWith('restore'),kind=mode.startsWith('section')?'section':'topic';
 const f=authored?await setup(OrganizerStore):await formationFixture();
 if(authored){
  await f.s.finishFoundation();await f.s.setFilterMode('off');
  f.topic=await f.s.createTopic({name:'SYNTHETIC MAIN selected authored Topic',operationId:op()});
  f.entry=await f.s.createEntry({actor:'user',operationId:op(),body:'SYNTHETIC original authored body',type:'idea',formation:'explicit',evidence:[]});
  await f.s.placeEntry({topicId:f.topic.id,entryId:f.entry.id,expectedEntryRevision:f.entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});
  await f.s.editEntry({id:f.entry.id,expectedRevision:(await read(f.s,'thoughts',f.entry.id)).revision,operationId:op(),changes:{body:'SYNTHETIC MAIN authored body',note:'SYNTHETIC MAIN authored note',title:'SYNTHETIC MAIN authored title'}});
 }else{
  await runFormation(f);f.entry=(await rows(f.s,'thoughts'))[0];f.topic=(await rows(f.s,'topics'))[0];f.placement=(await rows(f.s,'placements'))[0];
  if(placement){await inputEdit(f.s,f.entry.workingInputId,{libraryText:'SYNTHETIC MAIN current Working Input'});f.entry=await read(f.s,'thoughts',f.entry.id);}
  await f.s.placeEntry({topicId:f.topic.id,entryId:f.entry.id,expectedEntryRevision:f.entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,expectedPlacementRevision:f.placement.revision,operationId:op()});f.section=(await rows(f.s,'sections'))[0];
  if(!placement){
   const operationId=op();if(kind==='topic')await f.s.renameTopic({id:f.topic.id,expectedRevision:f.topic.revision,name:'SYNTHETIC MAIN current Topic name',operationId});else await f.s.editSection({topicId:f.topic.id,sectionId:f.section.sectionId,expectedRevision:f.section.revision,title:'SYNTHETIC MAIN current Section title',operationId});
   f.saved=(await rows(f.s,'revisions')).find(j=>j.operationId===operationId);if(restore){f.restoreOperationId=op();await f.s.restoreRevision({id:f.saved.id,expectedRevision:f.saved.afterRevision,operationId:f.restoreOperationId,side:'before'});}
  }
 }
 f.caller=Object.freeze({id:op()});f.abort=new AbortController();f.profileCalls=0;f.transportCalls=0;f.dispatchCalls=0;f.contextResponses=0;f.material=[];f.identityRequests=[];f.identityBudgets=[];f.prepared=[];f.readHandles=[];f.released=[];const issuers=new Map(),expiresAt=Date.now()+30000;
 f.authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:f.s.databaseId,jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 const identity=Object.freeze({resolve:async(_t,scope)=>{f.identityRequests.push(structuredClone(scope));return Object.freeze({version:1,store:f.s,caller:f.caller,scope,epoch:'synthetic-main-independent-identity',processing:true,expiresAt,revocationSignal:f.abort.signal});},isCurrent:()=>!f.abort.signal.aborted});
 const resolveProcessing=authored?async(tx,request,owner)=>{assert.deepEqual(Object.keys(owner),['workBudget']);assert.equal(owner.workBudget.database,f.s.repository.db);f.identityBudgets.push(owner.workBudget);let issuer=issuers.get(owner.workBudget);if(!issuer){issuer=new TopicProcessingAuthority(f.s,{processing:identity,caller:f.caller,binding:{operationId:op()},workBudget:owner.workBudget,signal:f.abort.signal});issuers.set(owner.workBudget,issuer);}return issuer.authorize(tx,request);}:async(_t,r)=>{f.identityRequests.push(structuredClone(r));return {allowed:true,epoch:'synthetic-main-independent-topic',inputIds:r.inputIds,topicIds:r.topicIds};};
 f.service={version:1,topic:{...(authored?{reconcileAuthoredEntries:true}:placement?{reconcileHumanPlacements:true}:{}),decisionVersion:'synthetic-main-source-1',parameters,resolveProcessing},context:{caller:f.caller,processingVerifier:{verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic',processorId:'synthetic',authorizationGeneration:1,processing:true,expiresAt,revocationSignal:f.abort.signal}),isCurrent:()=>!f.abort.signal.aborted}}};
 const selectedKind=authored?'library_entry':placement?'placement':kind,routeToken=mode.replaceAll(' ','-');
 f.options={scope:'synthetic-main-q4-'+routeToken,contractVersion:'synthetic-main-1',routeVersion:'synthetic-main-q4-'+routeToken+'-source',cursor:'aiu:delta:pending:["'+selectedKind+'",',limit:1};
 if(restore)await settleContext(f);
 f.settings=await settings(f.s,true);const forbidden=()=>{f.transportCalls++;throw Error('External provider/tokenizer/transport NOT_RUN');};
 f.configuration=configureMaintenanceProcessingSource(f.settings.commands,f.s,{origin:'https://synthetic.invalid',scope:f.options.scope,contractVersion:f.options.contractVersion,routeVersion:f.options.routeVersion,service:f.service,processing:null,clock:Date.now,resolveAuthority:f.authority,isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:async()=>{f.profileCalls++;throw Object.assign(Error('Intentional original profile boundary; no provider'),{code:'UNAVAILABLE'});},currentProfile:()=>null,tokenize:forbidden,isCurrentTokenizer:()=>false,readProofs:forbidden,fetch:forbidden});
 f.session=createConfiguredMaintenanceSession(f.s,f.configuration);
 for(const method of ['prepareMaterial','prepareAuthoredMaterial']){const original=TopicFormationService.prototype[method];t.mock.method(TopicFormationService.prototype,method,async function(...args){const handle=await original.apply(this,args);if(this.store===f.s)f.prepared.push(handle);return handle;});}
 const material=TopicFormationService.prototype.readMaterial;t.mock.method(TopicFormationService.prototype,'readMaterial',async function(handle){const value=await material.call(this,handle);if(this.store===f.s){f.material.push(structuredClone(value));f.readHandles.push(handle);}return value;});
 const release=TopicFormationService.prototype.releaseMaterial;t.mock.method(TopicFormationService.prototype,'releaseMaterial',function(handle){if(this.store===f.s)f.released.push(handle);return release.call(this,handle);});
 const dispatch=AIUsageFoundation.prototype.dispatch;t.mock.method(AIUsageFoundation.prototype,'dispatch',function(...args){if(this.s===f.s)f.dispatchCalls++;return dispatch.apply(this,args);});
 t.after(async()=>{f.session.dispose();f.abort.abort();for(const issuer of issuers.values())issuer.release();await f.s.repository.close();});return f;
}
async function run(f){let handle;try{handle=await f.session.prepare(f.options);return {handle,result:await f.session.run(handle)};}catch(error){return {handle,error};}}
for(const mode of ['topic restore','section restore','topic rename','section rename','authored','placement'])test('MAIN Q4 original '+mode+' preparation',async t=>{
 const f=await fixture(t,mode),restore=mode.endsWith('restore'),before=await semantic(f.s),beforeWork=await rows(f.s,'organizerWorkItems'),beforeAcks=await acks(f.s),old=await deferred(f.s),oldJobs=await rows(f.s,'organizerJobs'),{handle,result,error}=await run(f);
 t.diagnostic(JSON.stringify({mode,prepared:!!handle?.jobId,state:result?.state,error:error?{code:error.code??error.name,message:error.message,stack:error.stack}:null,profile:f.profileCalls,transport:f.transportCalls,dispatch:f.dispatchCalls,material:f.material.length,preparedHandles:f.prepared.length,released:f.released.length,semanticUnchanged:isDeepStrictEqual(await semantic(f.s),before),acksUnchanged:isDeepStrictEqual(await acks(f.s),beforeAcks)}));
 assert.equal(error,undefined,error?.stack);assert.ok(handle.jobId);assert.equal(f.profileCalls,1,JSON.stringify(result));assert.notEqual(result.state,'COMMITTED');assert.equal(f.transportCalls,0);assert.equal(f.dispatchCalls,0);assert.equal(readMaintenanceServiceConfiguration(),null);
 assert.deepEqual(await semantic(f.s),before);assert.deepEqual(await acks(f.s),beforeAcks);for(const job of oldJobs)assert.deepEqual(await read(f.s,'organizerJobs',job.id),job);
 const job=await read(f.s,'organizerJobs',handle.jobId);assert.equal(job.items.length,1);assert.equal(job.childIds.length,1);assert.ok((await rows(f.s,'organizerUsage')).filter(r=>r.jobId===job.id).every(r=>r.attemptCount===0));assert.ok(f.identityRequests.some(r=>r.purpose==='personal-topic-identity'));
 if(restore){
  assert.equal(old.length,1);assert.equal((await deferred(f.s)).length,0);const saved=(await history(f.s)).find(r=>r.originalId===old[0].id);assert.ok(saved);const {id,originalId,reconsideredBecause,...preserved}=saved;assert.deepEqual({id:originalId,...preserved},old[0]);assert.equal(reconsideredBecause,mode.startsWith('topic')?'HUMAN_TOPIC_RECONCILIATION_V1':'HUMAN_SECTION_RECONCILIATION_V1');assert.deepEqual(job.coverage,[old[0].unit]);assert.notEqual(job.routeVersion,oldJobs.find(j=>j.id===old[0].jobId).routeVersion);
 }else{assert.deepEqual(await rows(f.s,'organizerWorkItems'),beforeWork);assert.deepEqual(job.coverage.map(u=>u.facet).sort(),['context','topic']);assert.deepEqual(job.childCoverage,[job.coverage]);}
 if(mode.endsWith('rename')){assert.equal(f.prepared.length,1);assert.deepEqual(f.readHandles,[f.prepared[0],f.prepared[0]]);assert.deepEqual(f.released,[f.prepared[0]]);assert.deepEqual(f.material[1],f.material[0]);}
 assert.ok(f.material.length);const view=f.material[0].view;
 if(mode==='authored'){assert.equal(f.material[0].sourceCount,0);assert.deepEqual(view.inputs,[]);assert.deepEqual(view.entries,[]);assert.deepEqual(view.authoredTopic.selectedFields,['body','note','title']);assert.deepEqual(view.authoredTopic.fields,{body:'SYNTHETIC MAIN authored body',note:'SYNTHETIC MAIN authored note',title:'SYNTHETIC MAIN authored title'});assert.equal(view.authoredTopic.topicName,'SYNTHETIC MAIN selected authored Topic');assert.ok(f.identityBudgets.every(b=>b===f.identityBudgets[0]));}
 else{assert.equal(view.inputs.length,1);assert.deepEqual(Object.keys(view.inputs[0].fields),['body']);assert.equal(view.entries.length,1);assert.equal(view.entries[0].id,f.entry.id);assert.equal(view.entries[0].body,view.inputs[0].fields.body);if(mode==='placement')assert.equal(view.inputs[0].fields.body,'SYNTHETIC MAIN current Working Input');}
 assert.equal(Object.hasOwn(view,'sources'),false);assert.equal(Object.hasOwn(view,'journals'),false);
});
test('MAIN Q4 restore post-delete known-signature drift rolls back original history',async t=>{
 const f=await fixture(t,'topic restore'),before=await rows(f.s,'organizerWorkItems'),beforeSemantic=await semantic(f.s),beforeJobs=await rows(f.s,'organizerJobs'),old=await deferred(f.s),key='aiu:delta:known:'+old[0].unit.key,beforeKnown=await read(f.s,'meta',key),original=IDBObjectStore.prototype.delete;let injected=0;
 t.mock.method(IDBObjectStore.prototype,'delete',function(id){const request=original.call(this,id);if(this.name==='organizerWorkItems'&&id===old[0].id){const tx=this.transaction;request.addEventListener('success',()=>{injected++;const meta=tx.objectStore('meta'),r=meta.get(key);r.addEventListener('success',()=>{const value=r.result;value.signature+='synthetic-main-late-terminal';meta.put(value);});});}return request;});
 const {error,result}=await run(f);t.diagnostic(JSON.stringify({mode:'post-delete rollback',injected,state:result?.state,error:error?{code:error.code??error.name,message:error.message,stack:error.stack}:null,profile:f.profileCalls,transport:f.transportCalls,dispatch:f.dispatchCalls,material:f.material.length,semanticUnchanged:isDeepStrictEqual(await semantic(f.s),beforeSemantic),workUnchanged:isDeepStrictEqual(await rows(f.s,'organizerWorkItems'),before)}));assert.equal(injected,1);assert.ok(error||result.state!=='COMMITTED');assert.equal(f.profileCalls,0);assert.equal(f.transportCalls,0);assert.equal(f.dispatchCalls,0);assert.deepEqual(await rows(f.s,'organizerWorkItems'),before);assert.deepEqual(await rows(f.s,'organizerJobs'),beforeJobs);assert.deepEqual(await semantic(f.s),beforeSemantic);assert.deepEqual(await read(f.s,'meta',key),beforeKnown);assert.equal((await history(f.s)).length,0);assert.equal(readMaintenanceServiceConfiguration(),null);
});
