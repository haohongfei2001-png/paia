import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,snapshot,op} from './harness/topic-04.mjs';
import {maintenanceSectionPromotionTaskFixture} from './harness/maintenance-section-promotion-task.mjs';
import {maintenanceServiceFixture} from '../../services/ai-gateway/tests/maintenance-client-fixture.mjs';
import {captureMaintenanceProcessingReceipt} from '../core/ai-usage/maintenance-processing-receipt.js';
import {contextCurrentComparisonDescriptor} from '../core/context-maintenance.js';
import {boundedSchema} from '../core/ai-usage/qwen-request-data.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';
import {
 maintenanceServiceResponseContract,
 MAINTENANCE_SERVICE_RESPONSE_SCHEMA,
 MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA,
 MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA,
 MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS,
 MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA,
 MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS
} from '../core/ai-usage/maintenance-service-response.js';

// Synthetic local grants around the real task/permission/response owners.
// No fixture creates a paid response, new processing grant type or network call.
const copy=x=>JSON.parse(JSON.stringify(x));
const envelope=items=>({version:1,mode:'current_item_text',items});
const item=()=>({itemRef:'c0',itemId:op(),revision:1,card:'info',origin:'manual',protected:true,userEdited:true,lifecycle:'active',body:'Synthetic current Item comparison only',section:'Synthetic current'});
async function protocolFixture(t,{empty=false,grant=true}={}){
 const f=await promotionFixture({count:1}),caller=Object.freeze({id:op()}),signal=new AbortController(),receipts=new WeakSet(),expiresAt=Date.now()+600000;
 const processing={async resolve(_t,scope){const raw={version:1,store:f.s,caller,scope,epoch:'synthetic-composed-processing',processing:true,expiresAt,revocationSignal:signal.signal};receipts.add(raw);return raw;},isCurrent:raw=>receipts.has(raw)&&!signal.signal.aborted};
 const binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'},comparison=envelope(empty?[]:[item()]);
 const requested={purpose:'ai-maintenance-payload',logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',inputs:f.scope.map(({inputId,selectedFields})=>({inputId,selectedFields})),...(grant?{currentContextComparison:envelope(comparison.items.map(contextCurrentComparisonDescriptor))}:{})};
 const parent=await processing.resolve(null,requested);captureMaintenanceProcessingReceipt(parent,{processing,store:f.s,caller,scope:requested});
 const task=await maintenanceSectionPromotionTaskFixture({store:f.s,scope:f.scope,topicIds:[f.parent.id],entryIds:f.entryIds,binding,caller,processing,parentReceipt:parent});
 t.after(async()=>{task.release();signal.abort();await f.s.repository.close();});
 const payload={logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,material:{sectionPromotion:task.payload,currentContextComparison:comparison}};
 return {...f,task,parent,signal,payload,contract:()=>maintenanceServiceResponseContract(payload,f.s,task.task)};
}

test('composed schema is the closed v2 grammar plus the unchanged required original Section proposal',()=>{
 const expected=copy(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA);expected.properties.version={type:'integer',minimum:2,maximum:2};expected.properties.context=copy(MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA.properties.context);
 assert.deepEqual(copy(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA),expected);
 boundedSchema(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA);
 assert.deepEqual(copy(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.sectionProposal),copy(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.sectionProposal));
 assert.ok(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA.required.includes('sectionProposal'));
 assert.equal(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.version.maximum,1);
 assert.equal(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.version.maximum,1);
 assert.equal(MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA.properties.context.properties.groups.items.properties.operation.enum.includes('DUPLICATE_CURRENT'),false);
 assert.ok(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS.startsWith(MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS));
 assert.match(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS,/Manual, protected and user-edited Items may ONLY be compared/);
});

for(const empty of [false,true])test('genuine original task composes '+(empty?'explicitly granted empty':'manual current Item')+' comparison without writes or another budget',async t=>{
 const f=await protocolFixture(t,{empty}),before=await snapshot(f.s),reads=f.task.workBudget.reads,hashBytes=f.task.workBudget.hashBytes,contract=f.contract();
 assert.equal(contract.schema,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA);assert.equal(contract.instructions,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS);
 assert.equal(f.task.workBudget.reads,reads);assert.equal(f.task.workBudget.hashBytes,hashBytes);assert.deepEqual(await snapshot(f.s),before);
 const legacy=copy(f.payload);delete legacy.material.currentContextComparison;const old=maintenanceServiceResponseContract(legacy,f.s,f.task.task);assert.equal(old.schema,MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA);assert.equal(old.instructions,MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS);
});

for(const mode of ['missing task','copied task','foreign store','wrong job','wrong child','changed Section payload','ungranted Item','changed selected fields','revoked original receipt','authored Topic grammar'])test('combined contract rejects '+mode+' without owner writes',async t=>{
 const f=await protocolFixture(t),before=await snapshot(f.s);let store=f.s,task=f.task.task;
 if(mode==='missing task')task=null;if(mode==='copied task')task={...task};if(mode==='foreign store')store={repository:f.s.repository};
 if(mode==='wrong job')f.payload.logicalJobId=op();if(mode==='wrong child')f.payload.childOperationId=op();
 if(mode==='changed Section payload'){f.payload.material.sectionPromotion=copy(f.payload.material.sectionPromotion);f.payload.material.sectionPromotion.sectionRef='s1';}
 if(mode==='ungranted Item')f.payload.material.currentContextComparison.items[0].itemId=op();
 if(mode==='changed selected fields'){const i=f.payload.material.currentContextComparison.items[0];i.card='now';i.temporal={temporalScope:'Synthetic period',uncertainty:null,validUntil:null};i.temporalStatus='unknown';}
 if(mode==='revoked original receipt')f.signal.abort();if(mode==='authored Topic grammar')f.payload.material.authoredTopic={version:1};
 assert.throws(()=>maintenanceServiceResponseContract(f.payload,store,task));assert.deepEqual(await snapshot(f.s),before);
});
for(const empty of [false,true])test('PT08 permission without original comparison scope refuses '+(empty?'empty shape':'Item text')+' rather than acquiring another grant',async t=>{
 const f=await protocolFixture(t,{empty,grant:false});assert.throws(f.contract,{code:'UNAVAILABLE'});
});

test('bounded omission remains an exact subset of the original comparison field grant',async t=>{
 const f=await protocolFixture(t);f.payload.material.currentContextComparison.items=[];assert.equal(f.contract().schema,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA);
});

for(const mode of ['ordinary','legacy promotion','composed','wrong instructions','expired','revoked','wrong route','foreign schema','unknown callback'])test('source composed-profile hint '+mode+' is exact metadata only and preserves legacy hint',async t=>{
 const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:async({server,configuration})=>{
  if(mode==='ordinary')return;const legacy=mode==='legacy promotion',schema=legacy?MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA:MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA,instructions=legacy?MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS:MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS,m=server.manifest;
  m.wire.responseFormat.json_schema.schema=copy(schema);m.wire.instructions=instructions;m.profile.responseSchemaDigest=m.known.responseSchemaDigest=await hashText(canonical(schema));
  if(mode==='wrong instructions')m.wire.instructions+=' unqualified';if(mode==='expired')m.profile.validity.expiresAt=server.now;if(mode==='revoked')m.profile.validity.revoked=true;if(mode==='wrong route')m.profile.routeVersion='other';if(mode==='foreign schema')m.wire.responseFormat.json_schema.schema={type:'object'};if(mode==='unknown callback')configuration.currentProfile=()=>Promise.resolve(m);
 }});t.after(()=>f.session.dispose());
 assert.equal(f.remote.currentContextSectionPromotionAvailable(),mode==='composed');assert.equal(f.remote.sectionPromotionAvailable(),mode==='legacy promotion');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);
});
