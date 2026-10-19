import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {confirmMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {createIdentityCurrentnessHub} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
import {createSectionPromotionRecoveryAuthority} from '../../../extension/core/ai-usage/section-promotion-recovery-authority.js';
import {captureSectionPromotionRecovery,captureSectionPromotionResult,readSectionPromotionRecovery,readSectionPromotionResult,assertSectionPromotionResultSnapshot,releaseSectionPromotionRecovery,releaseSectionPromotionResult} from '../../../extension/core/ai-usage/section-promotion-recovery.js';
import {createContextScopeWorkBudget} from '../../../extension/core/context-topic-scope.js';
async function fixture(t,kind){
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const offer=getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId});assert.ok(offer);
 const checkpoints=new SectionPromotionCheckpoints(f.s),locator=await checkpoints.accept(offer.owner,offer.handle,{tab:{id:4,windowId:2}},()=>true),data=readSectionPromotionRecoveryLocator(locator,f.s);
 if(kind==='work'){
  const write=f.s.foundationWrite.bind(f.s);let lost=false;f.s.foundationWrite=async fn=>{const result=await write(fn);if(!lost&&result?.workId==='personal-topic-promotion:'+data.operationId){lost=true;throw Object.assign(Error('original confirmed work committed before return loss'),{code:'OUTCOME_UNKNOWN'});}return result;};
  await assert.rejects(confirmMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle),e=>e.code==='OUTCOME_UNKNOWN');f.s.foundationWrite=write;assert.equal(lost,true);assert.ok(await f.s.repository.transaction(false,tx=>tx.get('organizerWorkItems','personal-topic-promotion:'+data.operationId)));
 }else{const result=await confirmMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle);assert.equal(result.operationId,data.operationId);assert.ok(await f.s.repository.transaction(false,tx=>tx.get('operationReceipts',data.operationId)));}
 const channel=identityChannelFixture({authority:f.server}),hub=createIdentityCurrentnessHub({endpoint:f.configuration.origin+'/api/identity-currentness',clock:()=>f.server.now,fetch:request=>channel.handler(request)}),owner=createSectionPromotionRecoveryAuthority({store:f.s,hub,configuration:{origin:f.configuration.origin,clock:()=>f.server.now,isCurrent:()=>true,readProofs:request=>f.configuration.readProofs(request)}});assert.ok(owner);t.after(()=>{owner.dispose();hub.dispose();channel.close();});const recoveryAuthority=await owner.open(locator);assert.ok(recoveryAuthority);return {...f,locator,data,recoveryAuthority,recoveryOwner:owner};
}
for(const kind of ['work','result'])test('a changed original paid request is rejected before reading the original '+kind+' recovery envelope',async t=>{
 const f=await fixture(t,kind),table=kind==='work'?'organizerWorkItems':'operationReceipts',key=kind==='work'?'personal-topic-promotion:'+f.data.operationId:f.data.operationId;
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+f.data.paidBinding.childOperationId);row.financialRequest.inputTokens++;await tx.put('organizerUsage',row);},['organizerUsage']);
 const transaction=f.s.repository.transaction.bind(f.s.repository);let envelopeReads=0;f.s.repository.transaction=(write,fn,...args)=>transaction(write,tx=>{const get=tx.get.bind(tx);tx.get=(name,id)=>{if(name===table&&id===key)envelopeReads++;return get(name,id);};return fn(tx);},...args);t.after(()=>{f.s.repository.transaction=transaction;});
 let captured=null,error=null;try{captured=await (kind==='work'?captureSectionPromotionRecovery:captureSectionPromotionResult)(f.s,f.data.operationId,{workBudget:createContextScopeWorkBudget({database:f.s.repository.db}),recoveryAuthority:f.recoveryAuthority,locator:f.locator});}catch(e){error=e;}finally{if(captured)(kind==='work'?releaseSectionPromotionRecovery:releaseSectionPromotionResult)(captured);}
 assert.ok(error,'the original capture must reject the changed paid request');assert.equal(envelopeReads,0,'no signed work or committed receipt envelope may be read before recovery metadata is revalidated');assert.equal(f.physical(),1);
});

for(const kind of ['work','result'])test('the original '+kind+' capture accepts the exact live recovery capability and rejects copied or retired capabilities before envelope reads',async t=>{
 const f=await fixture(t,kind),capture=kind==='work'?captureSectionPromotionRecovery:captureSectionPromotionResult,read=kind==='work'?readSectionPromotionRecovery:readSectionPromotionResult,release=kind==='work'?releaseSectionPromotionRecovery:releaseSectionPromotionResult,table=kind==='work'?'organizerWorkItems':'operationReceipts',key=kind==='work'?'personal-topic-promotion:'+f.data.operationId:f.data.operationId,workBudget=createContextScopeWorkBudget({database:f.s.repository.db});
 const transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0;f.s.repository.transaction=(write,fn,...args)=>transaction(write,tx=>{const get=tx.get.bind(tx);tx.get=(name,id)=>{if(name===table&&id===key)reads++;return get(name,id);};return fn(tx);},...args);t.after(()=>{f.s.repository.transaction=transaction;});
 const cap=await capture(f.s,f.data.operationId,{workBudget,recoveryAuthority:f.recoveryAuthority,locator:f.locator});assert.equal(read(cap,f.s).operationId,f.data.operationId);assert.ok(reads>0);assert.ok(workBudget.reads>=16);const prior=reads;
 for(const wrong of [{recoveryAuthority:{...f.recoveryAuthority},locator:f.locator},{recoveryAuthority:f.recoveryAuthority,locator:{...f.locator}}])await assert.rejects(capture(f.s,f.data.operationId,{workBudget,...wrong}));assert.equal(reads,prior);
 f.recoveryOwner.close(f.recoveryAuthority);assert.throws(()=>read(cap,f.s));await assert.rejects(capture(f.s,f.data.operationId,{workBudget,recoveryAuthority:f.recoveryAuthority,locator:f.locator}));assert.equal(reads,prior);release(cap);assert.equal(f.physical(),1);
});
test('the final original result snapshot rejects changed paid metadata before re-reading its committed receipt',async t=>{
 const f=await fixture(t,'result'),workBudget=createContextScopeWorkBudget({database:f.s.repository.db}),cap=await captureSectionPromotionResult(f.s,f.data.operationId,{workBudget,recoveryAuthority:f.recoveryAuthority,locator:f.locator});t.after(()=>releaseSectionPromotionResult(cap));
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+f.data.paidBinding.childOperationId);row.financialRequest.inputTokens++;await tx.put('organizerUsage',row);},['organizerUsage']);
 let reads=0;await assert.rejects(f.s.repository.transaction(false,tx=>{const get=tx.get.bind(tx);tx.get=(name,id)=>{if(name==='operationReceipts'&&id===f.data.operationId)reads++;return get(name,id);};return assertSectionPromotionResultSnapshot(cap,f.s,tx);}));assert.equal(reads,0);assert.equal(f.physical(),1);
});
