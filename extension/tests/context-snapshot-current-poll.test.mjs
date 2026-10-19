import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {matchesCurrentContextSnapshot} from './harness/context-snapshot-poll.mjs';
const op=()=>crypto.randomUUID();
test('original snapshot refuses a superseded human save and bounded polling reads the current protected body',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const input=(await s.snapshot()).library.blocks[0],topic=await s.createTopic({operationId:op(),name:'SYNTHETIC temporal scope'});
 await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:(await s.input(input.id)).revision,topicIds:[topic.id]});
 const scope=await readContextTopicScope(s,{topicId:topic.id}),projection=await s.repository.transaction(false,t=>inputProjection(s,t,input.id));
 const caller={},signal=new AbortController().signal,expiresAt=Date.now()+60000;
 const verifier={async verify(actual,store,selected){return actual===caller&&store===s?{version:1,store,scope:selected,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:true,expiresAt,revocationSignal:signal}:null;},isCurrent:(actual,r,store)=>actual===caller&&store===s};
 const service=new ContextMaintenanceService(s,{processingVerifier:verifier}),cards=new ContextCardsService(s),id=op(),body='SYNTHETIC original automatic Now';
 const request={operationId:op(),epoch:scope.binding.epoch,itemId:id,card:'now',expectedRevision:0,body,section:'SYNTHETIC explicit phase',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(projection.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:projection.lastRemovalSequence}],temporal:{temporalScope:'SYNTHETIC current phase',uncertainty:'SYNTHETIC conditional',validUntil:new Date(Date.now()+60000).toISOString()}};
 assert.equal((await service.maintain(caller,request)).disposition,'created');
 const original=s.run.bind(s);let nextBody='SYNTHETIC full human text',armed=true,changes=0,refusals=0;
 s.run=async job=>{const result=await original(job);if(armed&&result&&Object.hasOwn(result,'rowSerialized')&&Array.isArray(result.items)){
  armed=false;const current=result.items.find(x=>x.id===id);const changed=await cards.change({kind:'put',operationId:op(),epoch:request.epoch,itemId:id,card:'now',expectedRevision:current.revision,body:nextBody,section:request.section});assert.equal(changed.ok,true);changes++;
 }return result;};
 const send=async message=>{assert.deepEqual(message,{type:'PAIA_CONTEXT_CARDS_SNAPSHOT'});try{return {ok:true,data:await cards.snapshot()};}catch(error){if(error.code==='CONTEXT_INVALIDATED')refusals++;return {ok:false,error:error.code};}};
 const expected=()=>data=>{const item=data.items.find(x=>x.id===id);return item?.body===nextBody&&item.protected===true&&item.userEdited===true&&item.temporalStatus==='unknown';};
 try{for(const value of ['SYNTHETIC full human text',body]){nextBody=value;armed=true;assert.equal(await matchesCurrentContextSnapshot(send,expected()),false,'old snapshot is refused rather than painted');assert.equal(await matchesCurrentContextSnapshot(send,expected()),true,'fresh original snapshot contains exactly the current protected body');}assert.equal(changes,2);assert.equal(refusals,2);}finally{s.run=original;await s.repository.close();}
});
test('snapshot polling propagates every error except exact concurrent invalidation',async()=>{
 for(const error of ['STORAGE_FAILED','CONSENT_REQUIRED','UNAVAILABLE',undefined])await assert.rejects(matchesCurrentContextSnapshot(async()=>({ok:false,error}),()=>true));
 await assert.rejects(matchesCurrentContextSnapshot(async()=>{throw Error('channel closed');},()=>true),/channel closed/);
 assert.equal(await matchesCurrentContextSnapshot(async()=>({ok:true,data:{items:[]}}),x=>x.items.length===1),false);
});
