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
import {ArchiveRepository,registerRepositoryFinalReadFence} from '../../../extension/core/idb-repository.js';
import {requireSectionPromotionRecoveryFinalFacts,sampleSectionPromotionRecoveryFinalFacts} from '../../../extension/core/ai-usage/section-promotion-recovery-authority.js';
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

test('source terminal registration repeats the same original cap without spending a second read plan',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);
 const workBudget=createContextScopeWorkBudget({database:f.s.repository.db});workBudget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads-16;
 await f.s.repository.transaction(true,async tx=>{
  await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx,{workBudget});
  assert.equal(registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget}),true);
  assert.equal(registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget}),true);
 },['meta','organizerUsage']);
 assert.equal(workBudget.reads,CONTEXT_TOPIC_SCOPE_LIMITS.reads);f.unchanged();
});
test('raw recovery cap and copied DTO cannot be supplied as the private Repository final token',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);
 for(const token of [cap,{...cap},Object.freeze({})]){
  let plans=0,reads=0;
  await assert.rejects(f.s.repository.transaction(true,async tx=>{
   readSectionPromotionRecoveryAuthority(cap,f.s,f.locator);
   assert.throws(()=>requireSectionPromotionRecoveryFinalFacts(token,f.s.repository,tx));
   assert.throws(()=>sampleSectionPromotionRecoveryFinalFacts(token,f.s.repository,tx));
   const get=tx.get.bind(tx);tx.get=(...args)=>{reads++;return get(...args);};
   registerRepositoryFinalReadFence(f.s.repository,tx,{isCurrent:()=>true,promotionRecoveryAuthority:token,plan:function*(){plans++;return true;}});
  },['meta','organizerUsage']));
  assert.equal(plans,0);assert.equal(reads,0);
 }
 f.unchanged();
});
test('a second original recovery cap is refused before any further reads in the already bound scope',async t=>{
 const f=await fixture(t),first=await f.owner.open(f.locator),other=createSectionPromotionRecoveryAuthority({store:f.s,configuration:f.configuration,hub:f.hub});t.after(()=>other.dispose());const second=await other.open(f.locator);assert.ok(first);assert.ok(second);assert.notEqual(first,second);
 await f.s.repository.transaction(true,async tx=>{
  await assertSectionPromotionRecoveryAuthoritySnapshot(first,f.s,f.locator,tx);let reads=0;const get=tx.get.bind(tx);tx.get=(...args)=>{reads++;return get(...args);};
  await assert.rejects(assertSectionPromotionRecoveryAuthoritySnapshot(second,f.s,f.locator,tx));
  assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(second,f.s,f.locator,tx));assert.equal(reads,0);
  assert.equal(registerSectionPromotionRecoveryAuthorityFence(first,f.s,f.locator,tx),true);
 },['meta','organizerUsage']);
 await f.s.repository.transaction(true,async tx=>{await assertSectionPromotionRecoveryAuthoritySnapshot(second,f.s,f.locator,tx);registerSectionPromotionRecoveryAuthorityFence(second,f.s,f.locator,tx);},['meta','organizerUsage']);f.unchanged();
});
test('the same recovery cap cannot replace the original shared ledger within a transaction',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const first=createContextScopeWorkBudget({database:f.s.repository.db}),second=createContextScopeWorkBudget({database:f.s.repository.db});
 await f.s.repository.transaction(true,async tx=>{
  await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx,{workBudget:first});let reads=0;const get=tx.get.bind(tx);tx.get=(...args)=>{reads++;return get(...args);};
  await assert.rejects(assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx,{workBudget:second}));
  assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget:second}));assert.equal(reads,0);assert.equal(second.reads,0);
  assert.equal(registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx,{workBudget:first}),true);
 },['meta','organizerUsage']);f.unchanged();
});
test('a copied transaction cannot register the source final token and original completion invalidates its scope',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);let saved;
 const foreign=new ArchiveRepository(f.s.repository.local,{indexedDB:f.s.repository.factory,name:'SYNTHETIC-foreign-'+crypto.randomUUID()});t.after(()=>foreign.db?.close());
 await foreign.transaction(true,async tx=>{let reads=0;const get=tx.get.bind(tx);tx.get=(...args)=>{reads++;return get(...args);};await assert.rejects(assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx));assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx));assert.equal(reads,0);},['meta']);
 await f.s.repository.transaction(true,async tx=>{
  saved=tx;await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx);
  for(const copied of [{...tx},Object.create(tx)]){
   await assert.rejects(assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,copied));
   assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,copied));
  }
  registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx);
 },['meta','organizerUsage']);
 assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,saved));
 await assert.rejects(assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,saved));f.unchanged();
});
test('rollback invalidates the original final registration and a fresh transaction still uses its own exact scope',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);let saved;
 await assert.rejects(f.s.repository.transaction(true,async tx=>{saved=tx;await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx);registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx);throw Error('SYNTHETIC rollback');},['meta','organizerUsage']));
 assert.throws(()=>registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,saved));
 await f.s.repository.transaction(true,async tx=>{await assertSectionPromotionRecoveryAuthoritySnapshot(cap,f.s,f.locator,tx);registerSectionPromotionRecoveryAuthorityFence(cap,f.s,f.locator,tx);},['meta','organizerUsage']);f.unchanged();
});
