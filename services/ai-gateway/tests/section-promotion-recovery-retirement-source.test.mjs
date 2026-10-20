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
import {retireSectionPromotionIfUnwritten} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {takeSectionPromotionRecoveryRetirementOutcome} from '../../../extension/core/ai-usage/section-promotion-recovery-authority.js';
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

test('original no-work retirement returns only its one-use historical outcome and never restores current recovery authority',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const workBudget=createContextScopeWorkBudget({database:f.s.repository.db});
 const outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget});assert.ok(outcome);
 assert.throws(()=>readSectionPromotionRecoveryLocator(f.locator,f.s));assert.throws(()=>readSectionPromotionRecoveryAuthority(cap,f.s,f.locator));
 assert.equal(takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,{...outcome}),null);
 assert.throws(()=>takeSectionPromotionRecoveryRetirementOutcome({...cap},f.s,f.locator,outcome));
 assert.throws(()=>takeSectionPromotionRecoveryRetirementOutcome(cap,{...f.s},f.locator,outcome));
 assert.throws(()=>takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,{...f.locator},outcome));
 const result=takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,outcome);assert.ok(result.checkpoint);const {checkpoint,...visible}=result;
 assert.deepEqual(visible,{state:'unwritten',operationId:f.data.operationId,sourceTopicId:f.data.sourceTopicId,sourceSectionId:f.data.sourceSectionId});
 const historical=readSectionPromotionRecoveryLocator(checkpoint,f.s);assert.equal(historical.phase,'unwritten');assert.equal(historical.allocationId,f.data.allocationId);assert.equal(historical.operationId,f.data.operationId);
 const registry=await f.s.repository.transaction(false,tx=>tx.get('meta','section-promotion-recovery-locators:v1'));assert.equal(registry.rows.length,1);assert.equal(registry.rows[0].allocationId,f.data.allocationId);assert.ok(registry.rows[0].unwritten);
 assert.throws(()=>readSectionPromotionRecoveryLocator(f.locator,f.s));
 assert.throws(()=>takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,outcome));assert.equal(f.owner.status().active,0);assert.equal(await f.owner.open(f.locator),null);f.unchanged();
});
test('public no-work intent DTO is refused before metadata reads or an original locator can be removed',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const before=await f.s.repository.transaction(false,tx=>tx.get('meta','section-promotion-recovery-locators:v1'));
 await f.s.repository.transaction(true,async tx=>{let reads=0;const get=tx.get.bind(tx);tx.get=(...args)=>{reads++;return get(...args);};assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{locatorRetirementIntent:Object.freeze({before,after:{rows:[]}})}));assert.equal(reads,0);},['meta','organizerUsage']);
 assert.deepEqual(await f.s.repository.transaction(false,tx=>tx.get('meta','section-promotion-recovery-locators:v1')),before);assert.equal(readSectionPromotionRecoveryAuthority(cap,f.s,f.locator).operationId,f.data.operationId);f.unchanged();
});
