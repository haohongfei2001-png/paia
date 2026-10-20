import {captureSectionPromotionRecovery,captureSectionPromotionResult} from '../../../extension/core/ai-usage/section-promotion-recovery.js';
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
import {createSectionPromotionRecoveryAuthority,takeSectionPromotionRecoveryRetirementOutcome,readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,assertSectionPromotionRecoveryAuthoritySnapshot,registerSectionPromotionRecoveryAuthorityFence} from '../../../extension/core/ai-usage/section-promotion-recovery-authority.js';
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

import {retireSectionPromotionIfUnwritten,readSectionPromotionUnwrittenOutcome,takeSectionPromotionRetirementOutcome,assertSectionPromotionPendingLocator,assertSectionPromotionRecoveryLocatorFacts} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {confirmMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOffer,releaseMaintenanceSectionPromotionOffer,assertMaintenanceSectionPromotionOfferFacts} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
const index=f=>f.s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1'));
const budget=f=>createContextScopeWorkBudget({database:f.s.repository.db});
const offer=f=>getMaintenanceSectionPromotion(f.session,f.s,selected(f));
const confirm=(f,o)=>confirmMaintenanceSectionPromotionOffer(o.owner,f.s,o.handle,{confirmationLocator:f.locator});

test('genuine original no-work recovery retires one exact locator and returns only a one-use committed historical outcome',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const before=await index(f),workBudget=budget(f),result=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget});assert.equal(workBudget.reads,21);
 assert.ok(result);const after=await index(f);assert.equal(after.revision,before.revision+1);assert.equal(after.rows.length,1);assert.equal(after.rows[0].unwritten.version,1);assert.throws(()=>assertSectionPromotionRecoveryLocatorFacts(f.locator,f.s));assert.throws(()=>readSectionPromotionRecoveryAuthority(cap,f.s,f.locator));
 assert.equal(takeSectionPromotionRetirementOutcome({...result},f.s,f.locator,cap),null);assert.throws(()=>takeSectionPromotionRetirementOutcome(result,{},f.locator,cap));
 const historical=takeSectionPromotionRetirementOutcome(result,f.s,f.locator,cap);assert.deepEqual({...historical,checkpoint:undefined},{state:'unwritten',operationId:f.data.operationId,sourceTopicId:f.topic.id,sourceSectionId:f.section.sectionId,checkpoint:undefined});assert.equal(readSectionPromotionRecoveryLocator(historical.checkpoint,f.s).phase,'unwritten');assert.throws(()=>assertSectionPromotionPendingLocator(historical.checkpoint,f.s));assert.throws(()=>takeSectionPromotionRetirementOutcome(result,f.s,f.locator,cap));f.unchanged();
});

test('retirement committed before a delayed original confirm forces that original operation to reject without any work or receipt',async t=>{
 const f=await fixture(t),o=offer(f),cap=await f.owner.open(f.locator);assert.ok(cap);const write=f.s.foundationWrite.bind(f.s);let enter,release;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r);let once=false;
 f.s.foundationWrite=async fn=>{if(!once){once=true;enter();await held;}return write(fn);};const running=confirm(f,o);const checked=running.then(value=>({value}),error=>({error}));await Promise.race([entered,checked.then(result=>{throw result.error??Error('original confirm ended before the actual held boundary');})]);
 let result;try{result=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)});}finally{release();}assert.ok(result);const final=await checked;f.s.foundationWrite=write;assert.ok(final.error);assert.equal((await index(f)).rows.length,1);assert.equal((await index(f)).rows[0].unwritten.version,1);
 assert.equal(await f.s.repository.transaction(false,t=>t.has('organizerWorkItems','personal-topic-promotion:'+f.data.operationId)),false);assert.equal(await f.s.repository.transaction(false,t=>t.has('operationReceipts',f.data.operationId)),false);f.unchanged();
});

test('original confirmed work committed before delayed return prevents no-work retirement and resumes only that original operation',async t=>{
 const f=await fixture(t),o=offer(f),cap=await f.owner.open(f.locator);assert.ok(cap);const write=f.s.foundationWrite.bind(f.s);let enter,release;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r);let once=false;
 f.s.foundationWrite=async fn=>{const result=await write(fn);if(!once&&result?.workId==='personal-topic-promotion:'+f.data.operationId){once=true;enter();await held;}return result;};const running=confirm(f,o);const checked=running.then(value=>({value}),error=>({error}));await Promise.race([entered,checked.then(result=>{throw result.error??Error('original confirm ended before the actual held boundary');})]);const before=await index(f);
 try{assert.equal(await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),null);assert.deepEqual(await index(f),before);}finally{release();}const final=await checked;f.s.foundationWrite=write;assert.equal(final.error,undefined);assert.equal(final.value.operationId,f.data.operationId);assert.equal((await index(f)).rows.length,1);f.unchanged();
});

test('a revoked fresh source identity cannot retire the original unresolved locator',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const before=await index(f);f.revoke();await assert.rejects(retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}));assert.deepEqual(await index(f),before);f.unchanged();
});

for(const drift of ['work','receipt','restore'])test('an original same-transaction '+drift+' insertion after locator intent cannot commit the no-work historical transition',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const before=await index(f),transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row)=>{const value=await put(table,row);if(!injected&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.rows.some(r=>r.unwritten?.version===1)){injected=true;await put(drift==='work'?'organizerWorkItems':drift==='receipt'?'operationReceipts':'meta',drift==='work'?{id:'personal-topic-promotion:'+f.data.operationId,kind:'SYNTHETIC-neighbor-work'}:drift==='receipt'?{id:f.data.operationId,kind:'SYNTHETIC-neighbor-receipt'}:{id:'recovery-restore-epoch',value:'SYNTHETIC-neighbor-restore'});}return value;};return fn(scope);},...args);
 try{await assert.rejects(retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}));}finally{f.s.repository.transaction=transaction;}
 assert.equal(injected,true);assert.deepEqual(await index(f),before);assert.equal(await f.s.repository.transaction(false,t=>t.has('organizerWorkItems','personal-topic-promotion:'+f.data.operationId)),false);assert.equal(await f.s.repository.transaction(false,t=>t.has('operationReceipts',f.data.operationId)),false);assert.equal((await f.s.repository.transaction(false,t=>t.get('meta','recovery-restore-epoch')))?.value??null,f.data.sourceAuthority.restoreEpoch);f.unchanged();
});

test('no-work retirement shares its original bounded reader and terminal count budget without resetting it',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator);assert.ok(cap);const before=await index(f),workBudget=budget(f);workBudget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads-20;
 await assert.rejects(retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget}));assert.deepEqual(await index(f),before);f.unchanged();
});


// A committed no-work settlement whose response was lost still needs an exact
// discoverable historical obligation; absence alone is not a UI receipt.
test('a no-work retirement commit with lost return retains an authenticated discoverable result until the exact Archive acknowledgment',async t=>{
 const f=await fixture(t),originalOffer=offer(f),cap=await f.owner.open(f.locator);assert.ok(cap);const transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 f.s.repository.transaction=async(write,fn,...args)=>{let target=false;const result=await transaction(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row)=>{const value=await put(table,row);if(write&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.revision>0&&row.rows.some(r=>r.unwritten?.version===1))target=true;return value;};return fn(scope);},...args);if(target&&!injected){injected=true;throw Object.assign(Error('genuine no-work commit response lost'),{code:'OUTCOME_UNKNOWN'});}return result;};
 try{await assert.rejects(retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),error=>error.code==='OUTCOME_UNKNOWN');}finally{f.s.repository.transaction=transaction;}
 assert.equal(injected,true);const registry=await index(f);assert.equal(registry.rows.length,1,'an unacknowledged no-work result cannot disappear from the only durable locator');assert.equal(registry.rows[0].operationId,f.data.operationId);assert.equal(registry.rows[0].unwritten.version,1);
 assert.equal(readMaintenanceSectionPromotionOffer(originalOffer.owner,f.s,originalOffer.handle).operationId,f.data.operationId,'a lost transaction return has not run the original post-commit offer cleanup');
 for(const change of [r=>{r.rows[0].unwritten.signature='0'.repeat(64);},r=>{r.rows[0].childOperationId='SYNTHETIC-other-child';}]){
  const tampered=structuredClone(registry);change(tampered);await f.s.repository.transaction(true,t=>t.put('meta',tampered));const denied=new SectionPromotionCheckpoints(f.s);await assert.rejects(denied.lookup(selected(f),{tab:{id:90,windowId:91}},async()=>true,()=>true));assert.equal(readMaintenanceSectionPromotionOffer(originalOffer.owner,f.s,originalOffer.handle).operationId,f.data.operationId,'unverified history must not retire a real live offer');
 }
 await f.s.repository.transaction(true,t=>t.put('meta',registry));
 const restarted=new SectionPromotionCheckpoints(f.s),historical=await restarted.lookup(selected(f),{tab:{id:90,windowId:91}},async()=>true,()=>true);assert.ok(historical);assert.equal(readSectionPromotionRecoveryLocator(historical,f.s).phase,'unwritten');assert.throws(()=>assertSectionPromotionPendingLocator(historical,f.s));
 assert.throws(()=>readMaintenanceSectionPromotionOffer(originalOffer.owner,f.s,originalOffer.handle),'new owner lookup retires the old live offer before any UI acknowledgment');
 assert.throws(()=>readSectionPromotionRecoveryLocator(f.locator,f.s));f.owner.dispose();const restartedSource=createSectionPromotionRecoveryAuthority({store:f.s,configuration:f.configuration,hub:f.hub});assert.ok(restartedSource);t.after(()=>restartedSource.dispose());const fresh=await restartedSource.open(historical);assert.ok(fresh);const outcome=await readSectionPromotionUnwrittenOutcome(historical,f.s,{recoveryAuthority:fresh,workBudget:budget(f)}),delivered=takeSectionPromotionRetirementOutcome(outcome,f.s,historical,fresh);assert.equal(delivered.checkpoint,historical);assert.equal(delivered.state,'unwritten');
 await restarted.clear(delivered.checkpoint,()=>true);assert.equal((await index(f)).rows.length,0);await assert.rejects(restarted.clear(delivered.checkpoint,()=>true));assert.equal(await restarted.lookup(selected(f),{tab:{id:90,windowId:91}},async()=>true,()=>true),null);f.unchanged();
});

test('a persisted unwritten result requires both original allocation and independent history signatures before any recovery authority lookup',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator),outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)});assert.ok(outcome);const original=await index(f);let authorityCalls=0;
 for(const change of [r=>{r.rows[0].unwritten.at++;},r=>{r.rows[0].operationId='SYNTHETIC-other-operation';},r=>{r.rows[0].unwritten.extra='unapproved';},r=>{r.rows[0].unwritten.signature='0'.repeat(64);}]){
  const changed=structuredClone(original);change(changed);await f.s.repository.transaction(true,t=>t.put('meta',changed));const reopened=new SectionPromotionCheckpoints(f.s);await assert.rejects(reopened.lookup(selected(f),{tab:{id:5,windowId:8}},async()=>{authorityCalls++;},()=>true));assert.equal(authorityCalls,0);
 }
 await f.s.repository.transaction(true,t=>t.put('meta',original));const reopened=new SectionPromotionCheckpoints(f.s),history=await reopened.lookup(selected(f),{tab:{id:5,windowId:8}},async()=>{authorityCalls++;},()=>true);assert.equal(authorityCalls,1);assert.equal(readSectionPromotionRecoveryLocator(history,f.s).phase,'unwritten');f.unchanged();
});

test('a valid history locator cannot authorize original confirmation or read a later injected work envelope',async t=>{
 const f=await fixture(t),o=offer(f),cap=await f.owner.open(f.locator),outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),delivered=takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,outcome),historical=delivered.checkpoint;
 await assert.rejects(confirmMaintenanceSectionPromotionOffer(o.owner,f.s,o.handle,{confirmationLocator:historical}));const fresh=await f.owner.open(historical);assert.ok(fresh);
 await f.s.repository.transaction(true,t=>t.put('organizerWorkItems',{id:'personal-topic-promotion:'+f.data.operationId,kind:'SYNTHETIC-late-work',snapshot:{body:'SYNTHETIC-never-qualified'}}));
 const transaction=f.s.repository.transaction.bind(f.s.repository);let envelopes=0;f.s.repository.transaction=(write,fn,...args)=>transaction(write,async scope=>{const get=scope.get.bind(scope);scope.get=(table,key,...rest)=>{if(table==='organizerWorkItems'||table==='operationReceipts')envelopes++;return get(table,key,...rest);};return fn(scope);},...args);
 try{await assert.rejects(readSectionPromotionUnwrittenOutcome(historical,f.s,{recoveryAuthority:fresh,workBudget:budget(f)}));await assert.rejects(captureSectionPromotionRecovery(f.s,f.data.operationId,{recoveryAuthority:fresh,locator:historical,workBudget:budget(f)}));await assert.rejects(captureSectionPromotionResult(f.s,f.data.operationId,{recoveryAuthority:fresh,locator:historical,workBudget:budget(f)}));}finally{f.s.repository.transaction=transaction;}
 assert.equal(envelopes,0,'history identity never reads a work or result envelope');assert.equal((await index(f)).rows.length,1);f.unchanged();
});

test('an acknowledged historical result whose clear return is lost stays cleared and cannot create a new original operation',async t=>{
 const f=await fixture(t),cap=await f.owner.open(f.locator),outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),delivered=takeSectionPromotionRetirementOutcome(outcome,f.s,f.locator,cap),transaction=f.s.repository.transaction.bind(f.s.repository);let lost=false;
 f.s.repository.transaction=async(write,fn,...args)=>{let selected=false;const result=await transaction(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row)=>{const result=await put(table,row);if(table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.rows.length===0)selected=true;return result;};return fn(scope);},...args);if(selected&&!lost){lost=true;throw Object.assign(Error('exact ACK committed but return lost'),{code:'OUTCOME_UNKNOWN'});}return result;};
 try{await assert.rejects(f.checkpoints.clear(delivered.checkpoint,()=>true),error=>error.code==='OUTCOME_UNKNOWN');}finally{f.s.repository.transaction=transaction;}
 assert.equal(lost,true);const reopened=new SectionPromotionCheckpoints(f.s);assert.equal(await reopened.lookup(selected(f),{tab:{id:4,windowId:2}},async()=>true,()=>true),null);assert.equal((await index(f)).rows.length,0);await assert.rejects(f.checkpoints.clear(delivered.checkpoint,()=>true));f.unchanged();
});

test('acknowledging a known unwritten result cannot make its still-live original paid offer acceptable again',async t=>{
 const f=await fixture(t),original=offer(f),cap=await f.owner.open(f.locator),outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),delivered=takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,outcome);
 await f.checkpoints.clear(delivered.checkpoint,()=>true);assert.equal((await index(f)).rows.length,0);const newOwner=new SectionPromotionCheckpoints(f.s);
 await assert.rejects(newOwner.accept(original.owner,original.handle,{tab:{id:90,windowId:91}},()=>true));assert.equal((await index(f)).rows.length,0);assert.equal(await f.s.repository.transaction(false,t=>t.has('organizerWorkItems','personal-topic-promotion:'+f.data.operationId)),false);f.unchanged();
});

test('an original offer accept already waiting before history and acknowledgment cannot recreate that retired operation',async t=>{
 const f=await fixture(t),original=offer(f),cap=await f.owner.open(f.locator),newOwner=new SectionPromotionCheckpoints(f.s),run=f.s.run.bind(f.s);let enter,release;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r);
 f.s.run=async fn=>{f.s.run=run;enter();await held;return run(fn);};const pending=newOwner.accept(original.owner,original.handle,{tab:{id:90,windowId:91}},()=>true),checked=pending.then(value=>({value}),error=>({error}));await entered;
 try{const outcome=await retireSectionPromotionIfUnwritten(f.locator,f.s,{recoveryAuthority:cap,workBudget:budget(f)}),delivered=takeSectionPromotionRecoveryRetirementOutcome(cap,f.s,f.locator,outcome);await f.checkpoints.clear(delivered.checkpoint,()=>true);assert.equal((await index(f)).rows.length,0);}finally{f.s.run=run;release();}
 const result=await checked;assert.ok(result.error,'the captured original offer must still be live when an allocation actually executes');assert.equal((await index(f)).rows.length,0);assert.equal(await f.s.repository.transaction(false,t=>t.has('organizerWorkItems','personal-topic-promotion:'+f.data.operationId)),false);f.unchanged();
});

test('a valid pending locator lookup preserves its exact original live offer and allows that same original confirmation',async t=>{
 const f=await fixture(t),original=offer(f),reopened=new SectionPromotionCheckpoints(f.s),pending=await reopened.lookup(selected(f),{tab:{id:90,windowId:91}},async()=>true,()=>true);assert.equal(readSectionPromotionRecoveryLocator(pending,f.s).phase,'pending');assert.equal(readMaintenanceSectionPromotionOffer(original.owner,f.s,original.handle).operationId,f.data.operationId);
 assert.equal(assertMaintenanceSectionPromotionOfferFacts(original.owner,f.s,original.handle),true);assert.throws(()=>assertMaintenanceSectionPromotionOfferFacts({...original.owner},f.s,original.handle));assert.throws(()=>assertMaintenanceSectionPromotionOfferFacts(original.owner,{repository:f.s.repository},original.handle));assert.throws(()=>assertMaintenanceSectionPromotionOfferFacts(original.owner,f.s,{...original.handle}));
 const confirmed=await confirmMaintenanceSectionPromotionOffer(original.owner,f.s,original.handle,{confirmationLocator:pending});assert.equal(confirmed.operationId,f.data.operationId);assert.equal(await f.s.repository.transaction(false,t=>t.has('operationReceipts',f.data.operationId)),true);assert.equal(await f.s.repository.transaction(false,t=>t.has('organizerWorkItems','personal-topic-promotion:'+f.data.operationId)),false);assert.equal((await index(f)).rows[0].unwritten,undefined);f.unchanged();
});

for(const boundary of ['own put','last closed read'])test('accept rolls back when the exact original offer is released after its '+boundary,async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const original=getMaintenanceSectionPromotion(f.session,f.s,selected(f)),checkpoints=new SectionPromotionCheckpoints(f.s),transaction=f.s.repository.transaction.bind(f.s.repository),before=await index(f),ledger=structuredClone(f.server.saved());let injected=false,selectedScope=null,ordinaryReads=0,returned=false;
 const release=()=>{injected=true;releaseMaintenanceSectionPromotionOffer(original.owner,f.s,original.handle);};
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async scope=>{let selected=false;const put=scope.put.bind(scope);scope.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(write&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'){selected=true;if(boundary==='own put')release();}return result;};const result=await fn(scope);if(selected){selectedScope=scope;ordinaryReads=scope.metrics.reads;returned=true;}return result;},...args);
 try{await assert.rejects(checkpoints.accept(original.owner,original.handle,{tab:{id:4,windowId:2}},()=>{if(boundary==='last closed read'&&returned&&!injected&&selectedScope.metrics.reads>=ordinaryReads+5)release();return true;}));}finally{f.s.repository.transaction=transaction;}
 assert.equal(injected,true);assert.deepEqual(await index(f),before);assert.equal(f.physical(),1);assert.deepEqual(f.server.saved(),ledger);
});
