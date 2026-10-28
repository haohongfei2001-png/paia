import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenancePayload} from '../core/ai-usage/maintenance-payload.js';
import {maintenanceSectionPromotionTaskFixture} from './harness/maintenance-section-promotion-task.mjs';

const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
async function fixture(t){
 const f=await maintenanceSectionPromotionTaskFixture();t.after(()=>f.close());
 const p=f.payload,inputs=p.pages[0].inputs,metadata={logicalJobId:p.logicalJobId,childOperationId:p.childOperationId,coverage:inputs.map(i=>({key:JSON.stringify(['input',i.id]),facet:'context',scope:'synthetic-combined'}))},material={sourceCount:inputs.length,view:{inputs,entries:[],identities:[],sections:[],constraints:[]}},comparison={version:1,mode:'current_item_text',items:[{itemRef:'c0',itemId:crypto.randomUUID(),revision:1,card:'info',origin:'manual',protected:true,userEdited:true,lifecycle:'active',body:'SYNTHETIC current comparison only',section:'SYNTHETIC'}]},summary={version:1,coverage:'open_cards_current_items',selectedItems:1,omittedItems:0,complete:true},limits={maxInputs:20,maxContentBytes:100000,maxRequestBytes:100000};
 const build=(bound=limits,promotion=p,current=comparison,coverage=metadata.coverage)=>createMaintenancePayload({...metadata,coverage},material,bound,[],[],[],[],[],[],[],null,null,null,promotion,current,{...summary,selectedItems:current.items.length});
 return {f,p,metadata,material,comparison,summary,limits,build};
}
test('current comparison and a real whole-Section task material share one exact bounded payload',async t=>{
 const f=await fixture(t),payload=f.build();assert.deepEqual(payload.material.sectionPromotion,structuredClone(f.p));assert.deepEqual(payload.material.currentContextComparison,f.comparison);assert.deepEqual(payload.material.currentContextComparisonSummary,f.summary);assert.equal(payload.logicalJobId,f.p.logicalJobId);assert.equal(payload.childOperationId,f.p.childOperationId);
});
test('combined purpose payload retains an honestly empty current comparison and the original promotion',async t=>{
 const f=await fixture(t),empty={version:1,mode:'current_item_text',items:[]},payload=f.build(f.limits,f.p,empty);assert.deepEqual(payload.material.currentContextComparison,empty);assert.deepEqual(payload.material.sectionPromotion,structuredClone(f.p));assert.equal(payload.material.currentContextComparisonSummary.complete,true);
});
test('both combined components still consume the same content and physical request byte ceilings',async t=>{
 const f=await fixture(t),payload=f.build();assert.throws(()=>f.build({...f.limits,maxContentBytes:bytes(payload.material)-1}),{code:'BUDGET_EXCEEDED'});assert.throws(()=>f.build({...f.limits,maxRequestBytes:bytes(payload)-1}),{code:'BUDGET_EXCEEDED'});assert.deepEqual(f.build({...f.limits,maxContentBytes:bytes(payload.material),maxRequestBytes:bytes(payload)}),payload);
});
test('combined material cannot borrow a foreign promotion child or a Topic-only facet',async t=>{
 const f=await fixture(t);assert.throws(()=>f.build(f.limits,{...f.p,childOperationId:'foreign-child'}),{code:'UNAVAILABLE'});assert.throws(()=>f.build(f.limits,f.p,f.comparison,f.metadata.coverage.map(u=>({...u,facet:'topic'}))),{code:'UNAVAILABLE'});
});
