import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {parameters} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {readAuthoredEntryContext,authoredContextEvidence,validAuthoredContextEvidence,validAuthoredFields,authoredSelectedText,authoredSelectedFields} from '../core/context-authored-entry.js';
import {contextEvidenceIdentity,captureContextEvidence,fenceContextLineage,releaseContextLineage,validContextMaintenance} from '../core/context-item-lineage.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const options={scope:'synthetic-authored-context',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-authored-context-1'};
const ownerRows=async s=>Promise.all(['records','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance'].map(n=>read(s,n)));
async function fixture(fields={}){
 const f=await setup(OrganizerStore);await f.s.setFilterMode('off');const topic=await f.s.createTopic({name:'Synthetic authored Topic',operationId:op()}),birth=op();
 const entry=await f.s.createEntry({actor:'user',operationId:birth,body:'SYNTHETIC authored private body',...fields,type:'idea',formation:'explicit',evidence:[]});
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});
 const input=(await read(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor.kind==='input');
 const selected={...options,cursor:input.id},calls=[],scopes=[],state={payloadProcessing:true,qualificationAllowed:true,mode:'valid',adapterHook:null,providerHook:null,itemId:op(),associationId:op(),expectedRevision:0},abort=new AbortController(),caller=Object.freeze({id:op()}),expiry=Date.now()+600000;
 const authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 const processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:scope.purpose==='ai-maintenance-payload'&&state.scopeHook?state.scopeHook(structuredClone(scope)):scope,epoch:'synthetic-processing',processing:scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadProcessing,expiresAt:expiry,revocationSignal:abort.signal};},isCurrent:receipt=>(receipt.scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadProcessing)&&!abort.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope:state.contextScopeHook?state.contextScopeHook(structuredClone(scope)):scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.payloadProcessing,expiresAt:expiry,revocationSignal:abort.signal}),isCurrent:()=>state.payloadProcessing&&!abort.signal.aborted};
 const provider={describe:()=>({providerId:'synthetic-authored',version:'1',executionKind:'fixture'}),execute:async request=>{calls.push(structuredClone(request));await state.providerHook?.(request);if(state.mode==='throw')throw Error('synthetic unknown');return {accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC derived Context'};}};
 const service={version:1,topic:{resolveProcessing:async()=>({allowed:false}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async()=>{throw Error('Authored Topic must never execute');},context:async(response,metadata,binding)=>{
  await state.adapterHook?.(metadata);const evidence=[];for(const mapping of metadata.authoredEntries){const scope=await readContextTopicScope(f.s,{topicId:mapping.topicId});assert.equal(scope.available,true,JSON.stringify(scope));evidence.push(authoredContextEvidence(mapping,scope.binding,mapping.fieldDigests??mapping.bodyDigest));}
  return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:state.itemId,card:'info',expectedRevision:state.expectedRevision,body:response.body,section:'Synthetic authored',associationIds:[state.associationId],evidence}}]};
 }}};
 const make=()=>{let grant;const window={acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant};return new LocalMaintenanceSession(f.s,{authority,processing,provider,service,window});};
 return {...f,processing,authority,b:(await f.s.snapshot()).library.blocks[0],topic,entry,birth,selected,calls,scopes,state,abort,caller,verifier,make,session:make()};
}
async function mapping(f){return f.s.repository.transaction(false,t=>readAuthoredEntryContext(f.s,t,f.entry.id));}
async function evidence(f){const m=await mapping(f),scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.ok(m);assert.equal(scope.available,true);const fields=authoredSelectedText(await read(f.s,'thoughts',f.entry.id),authoredSelectedFields(m)),digests={};for(const [field,text]of Object.entries(fields))digests[field]=await hashText(text);return authoredContextEvidence(m,scope.binding,digests);}
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED');


// These cases explicitly deny every processing purpose. The legacy fixtures'
// payloadProcessing flag exercises only the later payload/Context permission.
for(const mode of ['all purposes','qualification only','current field','history field','expired receipt'])test('real pre-job '+mode+' refusal reads no text and creates no job or provider request',async()=>{
 const f=await fixture({title:'SYNTHETIC current title',note:'SYNTHETIC current note'}),original=f.s.repository.transaction.bind(f.s.repository),resolve=f.processing.resolve;let texts=0;
 if(mode==='all purposes'){f.state.qualificationAllowed=false;f.state.payloadProcessing=false;}
 else if(mode==='qualification only')f.state.qualificationAllowed=false;
 else f.processing.resolve=async(t,scope)=>{const raw=await resolve(t,scope);if(scope.purpose!=='ai-maintenance-qualification')return raw;if(mode==='expired receipt')return {...raw,expiresAt:Date.now()};const copy=structuredClone(scope);if(mode==='current field')copy.entries[0].selectedFields=copy.entries[0].selectedFields.filter(x=>x!=='note');else {const journal=copy.journals.find(j=>j.selectedFields.includes('after.body'));assert.ok(journal);journal.selectedFields=journal.selectedFields.filter(x=>x!=='after.body');}return {...raw,scope:copy};};
 f.session.dispose();f.session=f.make();
 const wrap=(table,row)=>{if(!row)return row;const fields=(object,keys)=>{for(const key of keys){const d=Object.getOwnPropertyDescriptor(object||{},key);if(d)Object.defineProperty(object,key,{configurable:true,enumerable:d.enumerable,get(){texts++;return d.value;}});}};if(table==='thoughts')fields(row,['thoughtText','title','note']);if(table==='revisions')for(const side of ['before','after'])fields(row[side],['body','title','note','name']);if(table==='blocks')fields(row.value,['libraryText','note']);if(table==='records')fields(row.value,['originalText','note','editedText']);return row;};
 f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{for(const name of ['get','edge']){const call=t[name].bind(t);t[name]=async(...a)=>wrap(a[0],await call(...a));}const all=t.all.bind(t);t.all=async(...a)=>(await all(...a)).map(row=>wrap(a[0],row));const page=t.rangePage.bind(t);t.rangePage=async(...a)=>{const value=await page(...a);for(const row of value.rows)row.value=wrap(a[0],row.value);return value;};return fn(t);},...args);
 try{await assert.rejects(f.session.prepare(f.selected),{code:'UNAVAILABLE'});assert.equal(texts,0);assert.equal(f.calls.length,0);assert.equal((await read(f.s,'organizerJobs')).length,0);assert.equal((await ack(f)).length,0);assert.ok(f.scopes.length>0);assert.ok(f.scopes.every(scope=>scope.purpose==='ai-maintenance-qualification'));}finally{f.s.repository.transaction=original;f.session.dispose();await f.s.repository.close();}
});
