import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionTaskFixture} from './harness/maintenance-section-promotion-task.mjs';
import {captureMaintenanceProcessingReceipt} from '../core/ai-usage/maintenance-processing-receipt.js';
import {createMaintenanceSectionPromotionPermission,readMaintenanceSectionPromotionPermission,assertMaintenanceSectionPromotionPermissionFacts,releaseMaintenanceSectionPromotionPermission} from '../core/ai-usage/maintenance-section-promotion-permission.js';
import {maintenanceServiceResponseContract} from '../core/ai-usage/maintenance-service-response.js';

async function fixture(t){
 const f=await maintenanceSectionPromotionTaskFixture();t.after(()=>f.close());
 const scope=Object.freeze({purpose:'ai-maintenance-payload',logicalJobId:f.binding.logicalJobId,childOperationId:f.binding.childOperationId,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',inputs:f.scope.map(i=>({inputId:i.inputId,selectedFields:[...i.selectedFields]}))});
 const parent=await f.processing.resolve(null,scope);captureMaintenanceProcessingReceipt(parent,{processing:f.processing,store:f.s,caller:f.caller,scope});
 const create=(overrides={})=>createMaintenanceSectionPromotionPermission(f.s,f.plan,{processing:f.processing,caller:f.caller,parent,binding:f.binding,isCurrent:()=>f.state.current,signal:f.signal.signal,...overrides});
 return {...f,parent,create};
}
test('a local-only genuine Section task cannot select the remote contract',async t=>{
 const f=await fixture(t);assert.throws(()=>maintenanceServiceResponseContract({logicalJobId:f.binding.logicalJobId,childOperationId:f.binding.childOperationId,material:{sectionPromotion:f.payload}},f.s,f.task));
});
test('independent remote permission preserves original issuer receipt identity and exact bounded fields',async t=>{
 const f=await fixture(t),permission=await f.create();t.after(()=>releaseMaintenanceSectionPromotionPermission(permission));
 const value=readMaintenanceSectionPromotionPermission(permission,f.s,f.plan,f.binding);assert.equal(value.parent,f.parent);assert.equal(value.receipt.scope,value.scope);assert.equal(value.scope.purpose,'ai-maintenance-section-promotion-payload');assert.equal(value.receipt.epoch,f.parent.epoch);assert.equal(value.scope.entries.length,2);assert.ok(value.scope.entries.every(e=>JSON.stringify(e.selectedFields)==='["body"]'));assert.ok(value.scope.structures.every(e=>!e.selectedFields.includes('summary')));assert.equal(value.scope.sources,undefined);assert.equal(value.scope.journals,undefined);
 assert.throws(()=>readMaintenanceSectionPromotionPermission({...permission},f.s,f.plan,f.binding));assert.throws(()=>readMaintenanceSectionPromotionPermission(permission,{repository:f.s.repository},f.plan,f.binding));assert.throws(()=>readMaintenanceSectionPromotionPermission(permission,f.s,{},f.binding));assert.throws(()=>readMaintenanceSectionPromotionPermission(permission,f.s,f.plan,{...f.binding,childOperationId:'other'}));
});
for(const field of ['input body','entry body','topic name','section title'])test('remote grant refusing '+field+' rejects without reading any new semantic field',async t=>{
 const f=await fixture(t),resolve=f.processing.resolve;let semantic=0,requests=0;
 const original=f.s.repository.transaction.bind(f.s.repository);t.mock.method(f.s.repository,'transaction',(write,fn)=>original(write,tx=>{const get=tx.get.bind(tx);tx.get=async(...args)=>{const row=await get(...args);if(row){for(const key of args[0]==='thoughts'?['thoughtText','title','note']:args[0]==='topics'?['name','summary']:args[0]==='sections'?['title']:[]){const d=Object.getOwnPropertyDescriptor(row,key);if(d&&Object.hasOwn(d,'value'))Object.defineProperty(row,key,{enumerable:d.enumerable,configurable:true,get(){semantic++;return d.value;}});}}return row;};return fn(tx);}));
 const scope=f.parent.scope;
 f.processing.resolve=async(tx,requested)=>{if(requested.purpose!=='ai-maintenance-section-promotion-payload')return resolve(tx,requested);requests++;const copy=structuredClone(requested);if(field==='input body')copy.inputs[0].selectedFields=[];if(field==='entry body')copy.entries[0].selectedFields=[];if(field==='topic name')copy.structures.find(x=>x.store==='topics').selectedFields=[];if(field==='section title')copy.structures.find(x=>x.store==='sections').selectedFields=[];return resolve(tx,copy);};
 const fresh=await f.processing.resolve(null,scope);captureMaintenanceProcessingReceipt(fresh,{processing:f.processing,store:f.s,caller:f.caller,scope});await assert.rejects(f.create({parent:fresh}));assert.equal(semantic,0);assert.equal(requests,1);
});
for(const kind of ['released','parent signal revoked','request signal revoked','local currentness revoked'])test('Section send permission permanently refuses '+kind,async t=>{
 const f=await fixture(t),permission=await f.create();if(kind==='released')releaseMaintenanceSectionPromotionPermission(permission);if(kind==='parent signal revoked')f.fieldSignal.abort();if(kind==='request signal revoked')f.signal.abort();if(kind==='local currentness revoked')f.state.current=false;
 assert.throws(()=>readMaintenanceSectionPromotionPermission(permission,f.s,f.plan,f.binding));f.state.current=true;assert.throws(()=>readMaintenanceSectionPromotionPermission(permission,f.s,f.plan,f.binding));
});

test('permission facts performs no issuer or local callback and detects late native revoke',async t=>{
 const f=await fixture(t);let calls=0;const permission=await f.create({isCurrent:()=>{calls++;return true;}}),before=calls;
 assert.equal(assertMaintenanceSectionPromotionPermissionFacts(permission,f.s,f.plan,f.binding),true);assert.equal(calls,before);f.fieldSignal.abort();assert.throws(()=>assertMaintenanceSectionPromotionPermissionFacts(permission,f.s,f.plan,f.binding));assert.equal(calls,before);
});

test('a held original remote-field resolver releases the Store queue when the child is cancelled',async t=>{
 const f=await fixture(t),resolve=f.processing.resolve;let entered,release;const started=new Promise(r=>entered=r),held=new Promise(r=>release=r),controller=new AbortController();
 f.processing.resolve=async(tx,scope)=>{if(scope.purpose==='ai-maintenance-section-promotion-payload'){entered();await held;}return resolve(tx,scope);};
 const parent=await f.processing.resolve(null,f.parent.scope);captureMaintenanceProcessingReceipt(parent,{processing:f.processing,store:f.s,caller:f.caller,scope:f.parent.scope});
 const pending=f.create({parent,signal:controller.signal}).then(()=>({accepted:true}),error=>({error}));await started;controller.abort();
 try{const result=await Promise.race([pending,new Promise(r=>setTimeout(()=>r({stillHeld:true}),75))]);assert.equal(result.stillHeld,undefined);assert.ok(result.error);assert.equal(await f.s.run(()=>true),true);}finally{release();await pending;}
});
