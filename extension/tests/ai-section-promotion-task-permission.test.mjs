import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,op} from './harness/topic-04.mjs';
import {maintenanceSectionPromotionTaskFixture} from './harness/maintenance-section-promotion-task.mjs';
import {captureMaintenanceProcessingReceipt} from '../core/ai-usage/maintenance-processing-receipt.js';
import {maintenanceServiceResponseContract} from '../core/ai-usage/maintenance-service-response.js';
import {readMaintenanceSectionPromotionTask,findMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOffer,confirmMaintenanceSectionPromotionOffer,releaseMaintenanceSectionPromotionOffer,resultMaintenanceSectionPromotion,resumeMaintenanceSectionPromotion,readMaintenanceSectionPromotionOwnerState} from '../core/ai-usage/maintenance-section-promotion-session.js';

async function fixture(t){
 const base=await promotionFixture({count:2});t.after(()=>base.s.repository.close());const caller=Object.freeze({id:op()}),binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'},raws=new WeakSet(),parentSignal=new AbortController(),remoteSignal=new AbortController(),fieldSignal=new AbortController(),expiresAt=Date.now()+600000;let calls=0;
 const processing={resolve:async(_t,scope)=>{const signal=scope.purpose==='ai-maintenance-payload'?parentSignal:scope.purpose==='ai-maintenance-section-promotion-payload'?remoteSignal:fieldSignal,raw={version:1,store:base.s,caller,scope,epoch:'synthetic-exact-processing',processing:true,expiresAt,revocationSignal:signal.signal};raws.add(raw);return raw;},isCurrent:raw=>{calls++;return raws.has(raw)&&!raw.revocationSignal.aborted;}};
 const scope={purpose:'ai-maintenance-payload',logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',inputs:base.scope.map(x=>({inputId:x.inputId,selectedFields:[...x.selectedFields]}))},parentReceipt=await processing.resolve(null,scope);captureMaintenanceProcessingReceipt(parentReceipt,{processing,store:base.s,caller,scope});
 const f=await maintenanceSectionPromotionTaskFixture({store:base.s,scope:base.scope,topicIds:[base.parent.id],entryIds:base.entryIds,binding,caller,processing,parentReceipt});t.after(()=>f.release());return {...f,parentSignal,remoteSignal,fieldSignal,get calls(){return calls;}};
}
test('an independently granted original task chooses the extended schema only through its actual private plan and permission',async t=>{
 const f=await fixture(t),captured=readMaintenanceSectionPromotionTask(f.task,f.s);assert.equal(captured.plan,f.plan);assert.equal(captured.permission,f.payloadPermission);assert.equal(await f.owner.check(f.task),true);const payload={logicalJobId:f.binding.logicalJobId,childOperationId:f.binding.childOperationId,material:{sectionPromotion:f.payload}},contract=maintenanceServiceResponseContract(payload,f.s,f.task);assert.ok(contract.schema.required.includes('sectionProposal'));assert.throws(()=>maintenanceServiceResponseContract(payload,f.s,{...f.task}));assert.throws(()=>maintenanceServiceResponseContract(payload,f.s));assert.throws(()=>maintenanceServiceResponseContract({...payload,childOperationId:op()},f.s,f.task));
});
for(const name of ['remoteSignal','parentSignal','fieldSignal'])test('waiting task eagerly clears original capture on '+name+' revocation without a new issuer call',async t=>{
 const f=await fixture(t);readMaintenanceSectionPromotionTask(f.task,f.s);const calls=f.calls;f[name].abort();assert.throws(()=>readMaintenanceSectionPromotionTask(f.task,f.s));assert.equal(f.calls,calls);await assert.rejects(f.owner.ready(f.task));await assert.rejects(f.owner.check(f.task));
});

test('fixed source routes use the original private task owner and ignore replaced public methods',async t=>{
 const f=await fixture(t),fake=Object.freeze({});let called=0;for(const key of ['available','descriptor','confirm','release','result','resume'])f.owner[key]=()=>{called++;return fake;};
 const request={topicId:f.topicIds[0],sectionId:'nonexistent-section'};assert.equal(findMaintenanceSectionPromotionOffer(f.owner,f.s,request),null);assert.throws(()=>readMaintenanceSectionPromotionOffer(f.owner,f.s,fake));await assert.rejects(confirmMaintenanceSectionPromotionOffer(f.owner,f.s,fake));assert.equal(releaseMaintenanceSectionPromotionOffer(f.owner,f.s,fake),true);await assert.rejects(resultMaintenanceSectionPromotion(f.owner,f.s,op()));await assert.rejects(resumeMaintenanceSectionPromotion(f.owner,f.s,op()));assert.equal(called,0);
 const copied=Object.create(Object.getPrototypeOf(f.owner));for(const owner of [copied,{...f.owner}])assert.throws(()=>findMaintenanceSectionPromotionOffer(owner,f.s,request));assert.throws(()=>findMaintenanceSectionPromotionOffer(f.owner,{repository:f.s.repository},request));
});

test('the fixed owner state reports real waiting tasks and releases empty slots without granting or generating',async t=>{
 const f=await fixture(t);let called=0;f.owner.state=()=>{called++;return {tasks:0,offers:8,confirming:0};};assert.deepEqual(readMaintenanceSectionPromotionOwnerState(f.owner,f.s),{tasks:1,offers:0,confirming:0});const issuerCalls=f.calls;f.owner.release(f.task);assert.deepEqual(readMaintenanceSectionPromotionOwnerState(f.owner,f.s),{tasks:0,offers:0,confirming:0});assert.equal(f.calls,issuerCalls);assert.equal(called,0);assert.throws(()=>readMaintenanceSectionPromotionOwnerState({...f.owner},f.s));
});
