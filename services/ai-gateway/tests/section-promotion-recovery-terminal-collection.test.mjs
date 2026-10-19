import test from 'node:test';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {createAIFilterServiceAssembly} from '../../../extension/core/ai-usage/filter-visibility-service.js';
import {createMaintenanceServiceClient,openMaintenanceSectionPromotionRecoveryAuthority,closeMaintenanceSectionPromotionRecoveryAuthority} from '../../../extension/core/ai-usage/maintenance-service-client.js';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from '../../../extension/core/context-topic-scope.js';
import {createSectionPromotionRecoveryAuthority,readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,assertSectionPromotionRecoveryAuthoritySnapshot,registerSectionPromotionRecoveryAuthorityFence} from '../../../extension/core/ai-usage/section-promotion-recovery-authority.js';
import {createIdentityCurrentnessHub,reserveHubIdentityObservation,releaseHubIdentityObservation,identityCurrentnessHubDrained} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
const selected=f=>({topicId:f.topic.id,sectionId:f.section.sectionId});
async function fixture(t){
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();assert.equal(f.physical(),1);const offer=getMaintenanceSectionPromotion(f.session,f.s,selected(f));assert.ok(offer);
 const checkpoints=new SectionPromotionCheckpoints(f.s),locator=await checkpoints.accept(offer.owner,offer.handle,{tab:{id:4,windowId:2}},()=>true),data=readSectionPromotionRecoveryLocator(locator,f.s),before=structuredClone(f.server.saved()),calls=f.calls.length;
 assert.equal(typeof data.paidRequestHash,'string');const channel=identityChannelFixture({authority:f.server});let at=f.server.now;
 const hub=createIdentityCurrentnessHub({endpoint:f.configuration.origin+'/api/identity-currentness',clock:()=>at,fetch:req=>channel.handler(req)});
 let live=true,hook=null,proofs=null;const listeners=new Set(),configuration={origin:f.configuration.origin,clock:()=>{hook?.();return at;},isCurrent:()=>live,readProofs:request=>proofs?proofs(request):f.configuration.readProofs(request),onInvalidate:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}};
 const owner=createSectionPromotionRecoveryAuthority({store:f.s,configuration,hub});assert.ok(owner);t.after(()=>{owner.dispose();hub.dispose();channel.close();});
 return {...f,sourceConfiguration:f.configuration,checkpoints,locator,data,channel,hub,owner,configuration,before,callsBefore:calls,setClock:n=>{at=n;channel.setClock(n);},clockHook:fn=>{hook=fn;},setProofs:fn=>{proofs=fn;},revoke:()=>{live=false;for(const fn of listeners)fn();},unchanged:()=>{assert.equal(f.physical(),1);assert.equal(f.calls.length,calls);assert.deepEqual(f.server.saved(),before);}};
}

import {TopicProcessingAuthority} from '../../../extension/core/topic-processing-authority.js';
import {TopicProcessingGuard} from '../../../extension/core/topic-processing.js';

for(const effect of ['close','clock'])test(`last independent original Topic issuer cannot ${effect} an already checked recovery cap and commit the shared original transaction`,async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const recoveryView=readSectionPromotionRecoveryAuthority(cap,f.s,f.locator);const caller=Object.freeze({id:crypto.randomUUID()}),signal=new AbortController(),budget=createContextScopeWorkBudget({database:f.s.repository.db}),issued=new WeakSet();let calls=0,atLast=Infinity,armed=false,revoked=0;
 const expiresAt=Date.now()+600000,processing={resolve:async(_t,scope)=>{const raw=Object.freeze({version:1,store:f.s,caller,scope,epoch:'original-independent-terminal-identity',processing:true,expiresAt,revocationSignal:signal.signal});issued.add(raw);return raw;},isCurrent:raw=>{assert.equal(issued.has(raw),true,'the original raw identity receipt reaches its own issuer');if(armed&&++calls===atLast){revoked++;if(effect==='close')f.owner.close(cap);else f.setClock(recoveryView.identity.verifiedUntil);}else if(!armed)calls++;return true;}},identity=new TopicProcessingAuthority(f.s,{caller,processing,binding:{operationId:crypto.randomUUID(),mode:'original-adjacent-identity'},workBudget:budget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(tx,request)=>identity.authorize(tx,request)});t.after(()=>identity.release());
 const key='SYNTHETIC-recovery-terminal-probe',write=async value=>f.s.repository.transaction(true,async tx=>{
  await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx,{workBudget:budget});registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget:budget});
  await guard.processing(tx,[],[f.topic.id]);guard.registerProcessingFinalFence(tx);await tx.put('meta',{id:key,value});
 },['meta','organizerUsage']);
 // Calibrate the original fixed plan once with two unchanged genuine owners.
 // The second identical plan revokes only at its last actual issuer callback.
 await write('original baseline');atLast=calls;assert.ok(atLast>10);calls=0;armed=true;let error=null;try{await write('must roll back');}catch(e){error=e;}
 const actual=await f.s.repository.transaction(false,tx=>tx.get('meta',key));assert.equal(revoked,1);assert.ok(error,'the original Repository must reject the late independent issuer revocation');assert.deepEqual(actual,{id:key,value:'original baseline'});f.unchanged();
});

test('the last fixed recovery clock sample cannot revoke an earlier original Topic grant after the group facts sweep',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const caller=Object.freeze({id:crypto.randomUUID()}),signal=new AbortController(),budget=createContextScopeWorkBudget({database:f.s.repository.db}),issued=new WeakSet();let calls=0,last=Infinity,armed=false,revoked=0;
 const expiresAt=Date.now()+600000,processing={resolve:async(_t,scope)=>{const raw=Object.freeze({version:1,store:f.s,caller,scope,epoch:'original-clock-neighbor-identity',processing:true,expiresAt,revocationSignal:signal.signal});issued.add(raw);return raw;},isCurrent:raw=>{assert.equal(issued.has(raw),true);return true;}},identity=new TopicProcessingAuthority(f.s,{caller,processing,binding:{operationId:crypto.randomUUID(),mode:'original-clock-neighbor'},workBudget:budget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(tx,request)=>identity.authorize(tx,request)});t.after(()=>identity.release());
 f.clockHook(()=>{calls++;if(armed&&calls===last){revoked++;signal.abort();}});
 const key='SYNTHETIC-recovery-clock-neighbor',write=value=>f.s.repository.transaction(true,async tx=>{await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx,{workBudget:budget});registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget:budget});await guard.processing(tx,[],[f.topic.id]);guard.registerProcessingFinalFence(tx);await tx.put('meta',{id:key,value});},['meta','organizerUsage']);
 await write('original baseline');last=calls;assert.ok(last>10);calls=0;armed=true;await assert.rejects(write('must roll back'));assert.equal(revoked,1);assert.deepEqual(await f.s.repository.transaction(false,tx=>tx.get('meta',key)),{id:key,value:'original baseline'});f.unchanged();
});
