import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const row=f=>raw(f.s,'meta',CONTEXT_CARDS_ROW);
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts','tombstones'].map(async n=>[n,await t.all(n)]))));
const mutation=(s,name,id,fn)=>s.foundationWrite(async t=>{const r=await t.get(name,id);fn(r);await t.put(name,r);});
function authority(s){
 const caller=Object.freeze({handle:op()}),controller=new AbortController(),state={accountId:'synthetic-account',processorId:'synthetic-processor',generation:1,processing:true,expiresAt:Date.now()+600000,hook:null,currentHook:null,scope:null};
 const verifier={async verify(actual,store,scope){state.scope=structuredClone(scope);if(state.hook)await state.hook();if(actual!==caller||store!==s)return null;return {version:1,store:s,accountId:state.accountId,processorId:state.processorId,authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:state.expiresAt,revocationSignal:controller.signal};},isCurrent(actual,r,store){state.currentHook?.();return actual===caller&&store===s&&r.accountId===state.accountId&&r.processorId===state.processorId&&r.authorizationGeneration===state.generation;}};
 return {caller,controller,state,verifier,service:new ContextMaintenanceService(s,{processingVerifier:verifier})};
}
async function fixture({body='SYNTHETIC eligible source body'}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC processing Topic'});
 await inputEdit(f.s,input.id,{libraryText:body,note:'SYNTHETIC eligible note'});
 const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 return {...f,input,topic,cards:new ContextCardsService(f.s),...authority(f.s)};
}
async function request(f,{card='info',fields=['body'],...extra}={}){
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true,scope.reason);
 const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,f.input.id)),fieldDigests={};for(const field of fields)fieldDigests[field]=await hashText(input[field]);
 return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body:'SYNTHETIC extracted candidate',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:f.topic.id,inputId:f.input.id,selectedFields:fields,fieldDigests,expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence}],...extra};
}
const put=(f,c)=>f.service.maintain(f.caller,c);
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from '../core/ai-usage/delta.js';
const options={scope:'synthetic-correction',contractVersion:'synthetic-correction-1',routeVersion:'synthetic-correction-1',limit:1};
const usageAuthority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
const localSession=f=>new LocalMaintenanceSession(f.s,{authority:usageAuthority});
async function protectedFixture(){const f=await fixture(),c=await request(f);await put(f,c);const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section};await f.cards.change(change);return {...f,c,change,key:JSON.stringify(['context_item',c.itemId])};}
const usages=s=>s.repository.transaction(false,t=>t.all('organizerUsage'));
const acks=s=>s.repository.transaction(false,async t=>(await t.all('organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'));

import {parameters} from './harness/topic-03.mjs';
async function editedFixture({fields=['body'],card='info',initialEdit=true}={}){
 const f=await fixture(),c=await request(f,{fields,card});await put(f,c);
 const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:'SYNTHETIC human correction retaining derived meaning',section:c.section};if(initialEdit)await f.cards.change(change);
 const calls=[],scopes=[],controller=new AbortController(),caller=Object.freeze({id:op()}),expiresAt=Date.now()+600000,state={allowed:true,originalAllowed:true,processingHook:null,providerHook:null,adapterHook:null};
 const processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:state.processingHook?state.processingHook(structuredClone(scope)):scope,epoch:'synthetic-context-edit',processing:state.allowed,expiresAt,revocationSignal:controller.signal};},isCurrent:()=>state.allowed&&!controller.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.allowed,expiresAt,revocationSignal:controller.signal}),isCurrent:()=>state.allowed&&!controller.signal.aborted};
 const provider={describe:()=>({providerId:'synthetic-context-edit',version:'1',executionKind:'fixture'}),execute:async payload=>{calls.push(structuredClone(payload));await state.providerHook?.(payload);return {accepted:true,operationReceiptId:'synthetic-'+payload.childOperationId};}};
 const service={version:1,topic:{resolveProcessing:async(_t,r)=>({allowed:state.originalAllowed,epoch:'synthetic-topic-processing',inputIds:r.inputIds,topicIds:r.topicIds}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async()=>{throw Error('Context edit cannot enter Topic formation');},context:async(_response,metadata,binding)=>{await state.adapterHook?.(metadata);return {binding,value:[{units:metadata.units,operation:'UPDATE',change:{...c,operationId:op(),expectedRevision:metadata.contextItems[0].revision,body:change.body}}]};}}};
 const make=()=>{let grant;return new LocalMaintenanceSession(f.s,{authority:usageAuthority,processing,provider,service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:controller.signal}),isCurrent:r=>r===grant}});};
 return {...f,c,change,key:JSON.stringify(['context_item',c.itemId]),calls,scopes,controller,state,provider,service,make,session:make()};
}

for(const field of ['input-note','entry-title','entry-note','topic-name','source-note','source-editedText'])test('human text correction independently qualifies or avoids '+field+' without losing protected NO_CHANGE',async()=>{
 const f=await editedFixture(),before=await row(f),transaction=f.s.repository.transaction.bind(f.s.repository);let ungranted=0,granted=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=async(table,id)=>{const value=await get(table,id),target=field.startsWith('input-')?'blocks':field.startsWith('entry-')?'thoughts':field.startsWith('topic-')?'topics':'records',key=field.slice(field.indexOf('-')+1);if(value&&table===target){const object=['blocks','records'].includes(table)?value.value:value,d=Object.getOwnPropertyDescriptor(object,key),text=d?.value;Object.defineProperty(object,key,{configurable:true,enumerable:true,get(){
  // Identity labels have their original independent Topic-processing purpose.
  // This assertion targets the later correction snapshot's separate copy.
  if(table==='topics'&&!new Error().stack.includes('editSnapshot'))return text;
  const allowed=table==='records'?false:f.scopes.some(scope=>(table==='blocks'?scope.inputs:table==='thoughts'?scope.entries:scope.structures)?.some(x=>(table==='blocks'?x.inputId:table==='thoughts'?x.entryId:x.recordId)===id&&x.selectedFields.includes(key)));
  if(!allowed){ungranted++;throw Error('SYNTHETIC ungranted correction '+field);}granted++;return text;
 }});}return value;};return fn(t);},stores);
 try{let result,error;try{result=await f.session.run(await f.session.prepare(options));}catch(e){error=e;}assert.equal(ungranted,0,'correction qualification or exact projection must precede original acquisition');if(error)throw error;assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);const done=(await acks(f.s)).filter(a=>a.unit.key===f.key);assert.equal(done.length,1);assert.equal(done[0].outcome,'NO_CHANGE');assert.deepEqual(await row(f),before);if(field==='input-note')assert.ok(granted>0);}finally{f.s.repository.transaction=transaction;f.session.dispose();await f.s.repository.close();}
});
