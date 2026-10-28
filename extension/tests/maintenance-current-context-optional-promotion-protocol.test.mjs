import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyTopic} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';
import {maintenanceServiceFixture} from '../../services/ai-gateway/tests/maintenance-client-fixture.mjs';
import {boundedSchema} from '../core/ai-usage/qwen-request-data.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';
import {promotionFixture,op} from './harness/topic-04.mjs';
import {maintenanceSectionPromotionTaskFixture} from './harness/maintenance-section-promotion-task.mjs';
import {captureMaintenanceProcessingReceipt} from '../core/ai-usage/maintenance-processing-receipt.js';
import {createMaintenanceServiceResponseAdapter,maintenanceServiceResponseContract,maintenanceServiceResponseContractForProfile,readMaintenanceResponseDefer,
 MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA,MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS,
 MAINTENANCE_CURRENT_CONTEXT_OPTIONAL_SECTION_PROMOTION_RESPONSE_SCHEMA as schema,MAINTENANCE_CURRENT_CONTEXT_OPTIONAL_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS as instructions,MAINTENANCE_NO_SECTION_PROMOTION_RESPONSE as none} from '../core/ai-usage/maintenance-service-response.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const profile=()=>({wire:{instructions,responseFormat:{json_schema:{schema:copy(schema)}}}});
function fixture({manifest=profile()}={}){
 const unit={key:JSON.stringify(['input','synthetic-input']),facet:'context',scope:'synthetic-scope'},payload={logicalJobId:'synthetic-job',childOperationId:'synthetic-child',coverage:[unit],material:{inputs:[{inputId:'synthetic-input',revision:0,body:'Synthetic independent Input'}],identities:[],sections:[],constraints:[],currentContextComparison:{version:1,mode:'current_item_text',items:[]}}};
 const binding={logicalJobId:payload.logicalJobId,childOperationId:payload.childOperationId,operationReceiptId:'synthetic-receipt'},value={version:3,logicalJobId:payload.logicalJobId,childOperationId:payload.childOperationId,citations:[],topic:emptyTopic(),context:{status:'DEFER',reason:'Synthetic independent comparison pending',groups:[]},filter:{status:'NONE',reason:'',decisions:[]},sectionProposal:copy(none)},response={accepted:true,operationReceiptId:binding.operationReceiptId,value};
 let reads=0;const foundation={s:{},read(){reads++;throw Error('No-task grammar must not read Section data');}},owner=createMaintenanceServiceResponseAdapter();owner.registerChild(foundation,payload,()=>true,null,manifest);
 return {owner,payload,binding,value,response,reads:()=>reads,decode:()=>owner.adapter.context(response,{units:[unit],inputIds:['synthetic-input']},binding)};
}

test('v3 is separately closed and bounded; v1/v2 remain exact original Section-only grammars',()=>{
 boundedSchema(schema);assert.equal(schema.properties.version.minimum,3);assert.ok(schema.required.includes('sectionProposal'));
 assert.equal(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.version.minimum,1);assert.equal(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.version.minimum,2);
 assert.deepEqual(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.sectionProposal.properties.status.enum,['PROPOSE','DEFER']);
 for(const key of ['logicalJobId','childOperationId','proposalOperationId','sectionRef'])assert.equal(none[key],'');assert.deepEqual(copy(none.selection),{kind:'',count:0,manifestDigest:'',necessary:''});
 assert.equal(Object.isFrozen(none),true);assert.equal(Object.isFrozen(none.entries),true);
});
test('task-null v3 retains a private response contract and exact NONE permits only independent facet DEFER',async()=>{
 const f=fixture();await assert.rejects(f.owner.adapter.sectionPromotion({},f.binding),{code:'UNAVAILABLE'});
 await assert.rejects(f.decode(),error=>!!readMaintenanceResponseDefer(error));assert.equal(f.reads(),0);await assert.rejects(f.decode(),{code:'UNAVAILABLE'});
});
for(const [name,change]of [
 ['PROPOSE',v=>v.sectionProposal.status='PROPOSE'],['DEFER',v=>v.sectionProposal.status='DEFER'],['invented proposal ID',v=>v.sectionProposal.proposalOperationId=op()],['invented Section reference',v=>v.sectionProposal.sectionRef='s0'],['copied job ID',v=>v.sectionProposal.logicalJobId=v.logicalJobId],['reason text',v=>v.sectionProposal.reason='Not selected'],['evidence claim',v=>v.sectionProposal.substance.reason='substantive'],['selection claim',v=>v.sectionProposal.selection.kind='whole_section'],['unknown field',v=>v.sectionProposal.extra=true],['missing required sentinel',v=>delete v.sectionProposal],['v2 downgrade',v=>v.version=2]
])test('no-task v3 rejects '+name+' before any domain or Section read',async()=>{
 const f=fixture();change(f.value);await assert.rejects(f.decode(),error=>!readMaintenanceResponseDefer(error));assert.equal(f.reads(),0);await assert.rejects(f.decode(),{code:'UNAVAILABLE'});
});
for(const mode of ['no selected profile','legacy combined v2'])test(mode+' cannot select v3 with a caller response value',async()=>{
 const f=fixture({manifest:mode==='no selected profile'?null:{wire:{instructions:MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS,responseFormat:{json_schema:{schema:copy(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA)}}}}});await assert.rejects(f.decode());assert.equal(f.reads(),0);
});
test('only exact optional profile derives v3; ordinary contract and missing comparison remain unchanged',()=>{
 const f=fixture();assert.equal(maintenanceServiceResponseContract(f.payload,{}).schema,MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA);assert.equal(maintenanceServiceResponseContractForProfile(f.payload,{},null,profile()).schema,schema);
 const wrong=profile();wrong.wire.instructions+=' unknown';assert.throws(()=>maintenanceServiceResponseContractForProfile(f.payload,{},null,wrong),{code:'UNAVAILABLE'});
 const p=copy(f.payload);delete p.material.currentContextComparison;assert.throws(()=>maintenanceServiceResponseContractForProfile(p,{},null,profile()),{code:'UNAVAILABLE'});
 p.material.sectionPromotion={};assert.throws(()=>maintenanceServiceResponseContractForProfile(p,{},null,profile()),{code:'UNAVAILABLE'});f.owner.dispose();
});

test('v3 actual whole-Section task still requires exact original permission and binding rather than NONE authority',async t=>{
 const f=await promotionFixture(),caller=Object.freeze({id:op()}),signal=new AbortController(),receipts=new WeakSet(),expiresAt=Date.now()+600000;
 const processing={async resolve(_t,scope){const raw={version:1,store:f.s,caller,scope,epoch:'synthetic-v3-processing',processing:true,expiresAt,revocationSignal:signal.signal};receipts.add(raw);return raw;},isCurrent:raw=>receipts.has(raw)&&!signal.signal.aborted};
 const binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'},comparison={version:1,mode:'current_item_text',items:[]},requested={purpose:'ai-maintenance-payload',logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',inputs:f.scope.map(({inputId,selectedFields})=>({inputId,selectedFields})),currentContextComparison:comparison},parent=await processing.resolve(null,requested);captureMaintenanceProcessingReceipt(parent,{processing,store:f.s,caller,scope:requested});
 const task=await maintenanceSectionPromotionTaskFixture({store:f.s,scope:f.scope,topicIds:[f.parent.id],entryIds:f.entryIds,binding,caller,processing,parentReceipt:parent});t.after(async()=>{task.release();signal.abort();await f.s.repository.close();});
 const payload={logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,material:{currentContextComparison:copy(comparison),sectionPromotion:task.payload}};
 assert.equal(maintenanceServiceResponseContractForProfile(payload,f.s,task.task,profile()).schema,schema);assert.throws(()=>maintenanceServiceResponseContractForProfile(payload,f.s,null,profile()));assert.throws(()=>maintenanceServiceResponseContractForProfile(payload,f.s,{...task.task},profile()));
 const noPayload=copy(payload);delete noPayload.material.sectionPromotion;assert.throws(()=>maintenanceServiceResponseContractForProfile(noPayload,f.s,task.task,profile()));signal.abort();assert.throws(()=>maintenanceServiceResponseContractForProfile(payload,f.s,task.task,profile()));
});
for(const mode of ['v3','v2','wrong instructions','expired'])test('exact optional-profile metadata hint '+mode+' does not widen old promotion hints or send requests',async t=>{
 const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:async({server})=>{const m=server.manifest,legacy=mode==='v2',selected=legacy?MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA:schema;m.wire.responseFormat.json_schema.schema=copy(selected);m.wire.instructions=legacy?MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS:instructions;m.profile.responseSchemaDigest=m.known.responseSchemaDigest=await hashText(canonical(selected));if(mode==='wrong instructions')m.wire.instructions+=' unknown';if(mode==='expired')m.profile.validity.expiresAt=server.now;}});t.after(()=>f.session.dispose());
 assert.equal(f.remote.currentContextOptionalSectionPromotionAvailable(),mode==='v3');assert.equal(f.remote.currentContextSectionPromotionAvailable(),mode==='v2');assert.equal(f.remote.sectionPromotionAvailable(),false);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
});
