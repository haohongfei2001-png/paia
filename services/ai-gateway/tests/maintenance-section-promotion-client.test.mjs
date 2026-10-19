import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';

for(const kind of ['unsolicited Section DTO','forged task capability'])test('source client refuses '+kind+' before profile, tokenizer, declaration or reservation',async t=>{
 let profiles=0,tokens=0;const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:({configuration})=>{const read=configuration.readProfile,tokenize=configuration.tokenize;configuration.readProfile=(...args)=>{profiles++;return read(...args);};configuration.tokenize=(...args)=>{tokens++;return tokenize(...args);};}});
 const payload={logicalJobId:'synthetic-job',childOperationId:'synthetic-child',material:{sectionPromotion:{version:1}}},options={signal:new AbortController().signal,assertCurrent:async()=>true,assertBeforeSend:async()=>()=>true,isCurrent:()=>true,...kind==='forged task capability'?{promotionTask:Object.freeze({})}:{}};
 let reads=0;await assert.rejects(f.remote.prepareChild({s:f.s,read(){reads++;throw Error('unqualified Section must not enter Foundation');}},{id:'synthetic-job'},payload,options));
 assert.equal(reads,0);assert.equal(profiles,0);assert.equal(tokens,0);assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal(f.server.saved(),null);
});

import {MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA,MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS} from '../../../extension/core/ai-usage/maintenance-service-response.js';
import {hashText} from '../../../extension/core/dedupe.js';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
for(const change of ['ordinary','qualified metadata','wrong instructions','expired','revoked','wrong route','foreign schema','unknown callback'])test('source promotion metadata hint '+change+' is bounded and performs no network or payload read',async t=>{
 const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:async({server,configuration})=>{
  if(change==='ordinary')return;
  const manifest=server.manifest;manifest.wire.responseFormat.json_schema.schema=structuredClone(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA);manifest.wire.instructions=MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS;manifest.profile.responseSchemaDigest=manifest.known.responseSchemaDigest=await hashText(canonical(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA));
  if(change==='wrong instructions')manifest.wire.instructions+=' unqualified';if(change==='expired')manifest.profile.validity.expiresAt=server.now;if(change==='revoked')manifest.profile.validity.revoked=true;if(change==='wrong route')manifest.profile.routeVersion='other';if(change==='foreign schema')manifest.wire.responseFormat.json_schema.schema={type:'object'};if(change==='unknown callback')configuration.currentProfile=()=>Promise.resolve(manifest);
 }});
 assert.equal(f.remote.sectionPromotionAvailable(),change==='qualified metadata');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);
});

import {maintenanceSectionPromotionTaskFixture} from '../../../extension/tests/harness/maintenance-section-promotion-task.mjs';
import {captureMaintenanceProcessingReceipt} from '../../../extension/core/ai-usage/maintenance-processing-receipt.js';
// These controls stop at the genuine Foundation boundary. They prove only the
// source client's admission contract, never a simulated paid-result authority.
for(const mode of ['local task only','exact original issuer','foreign issuer','copied parent','revoke during original assertion'])test('real Section task source admission: '+mode,async t=>{
 let profiles=0;const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:({configuration})=>{
  const read=configuration.readProfile;configuration.readProfile=(...args)=>{profiles++;return read(...args);};
  if(mode==='foreign issuer'){const issuer=configuration.processing;configuration.processing={resolve:(...args)=>issuer.resolve(...args),isCurrent:(...args)=>issuer.isCurrent(...args)};}
 }});t.after(()=>f.session.dispose());
 const inputs=(await f.s.snapshot()).library.blocks,scope=inputs.map(input=>({inputId:input.id,role:'primary',selectedFields:['body']})),binding={logicalJobId:crypto.randomUUID(),childOperationId:crypto.randomUUID(),proposalOperationId:crypto.randomUUID(),sectionRef:'s0'};
 const requested=Object.freeze({purpose:'ai-maintenance-payload',logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',inputs:scope.map(({inputId,selectedFields})=>({inputId,selectedFields}))});
 const parent=await f.materialProcessing.resolve(null,requested);captureMaintenanceProcessingReceipt(parent,{processing:f.materialProcessing,store:f.s,caller:f.caller,scope:requested});
 const task=await maintenanceSectionPromotionTaskFixture({store:f.s,scope,binding,caller:f.caller,processing:f.materialProcessing,...mode==='local task only'?{}:{parentReceipt:parent}});t.after(()=>task.close());
 const sentinel=Error('original Foundation boundary reached'),payload={logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,material:{sectionPromotion:task.payload}};let reads=0,assertions=0;
 const options={signal:new AbortController().signal,assertCurrent:async()=>{assertions++;if(mode==='revoke during original assertion')f.contextAbort.abort();},assertBeforeSend:async()=>()=>true,isCurrent:()=>true,processing:mode==='copied parent'?{...parent}:parent,promotionTask:task.task};
 await assert.rejects(f.remote.prepareChild({s:f.s,read(){reads++;throw sentinel;}},{id:binding.logicalJobId},payload,options),error=>mode==='exact original issuer'?error===sentinel:error!==sentinel);
 assert.equal(reads,mode==='exact original issuer'?1:0);assert.equal(assertions,['exact original issuer','revoke during original assertion'].includes(mode)?1:0);assert.equal(profiles,0);assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal(f.server.saved(),null);
});
