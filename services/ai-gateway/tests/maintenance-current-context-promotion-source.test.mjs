import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceCurrentContextPromotionSourceFixture} from './maintenance-current-context-promotion-source-fixture.mjs';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
const read=(s,table,id)=>s.repository.transaction(false,t=>id?t.get(table,id):t.all(table)),op=()=>crypto.randomUUID();
async function fixture(t,{item=true,itemCount=1,itemBody='SYNTHETIC complete human current comparison',configure=null,transform=null}={}){
 let itemId=null;const grants=[];
 const f=await maintenanceCurrentContextPromotionSourceFixture(t,{configure:async context=>{
  const {local,configuration}=context;
  if(item){const cards=new ContextCardsService(local.s);for(let i=0;i<itemCount;i++){const id=op();itemId??=id;await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:id,expectedRevision:0,body:itemBody+i,section:'SYNTHETIC comparison',card:'info'});}for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});}
  const resolve=configuration.processing.resolve;configuration.processing.resolve=async(tx,scope)=>{grants.push(structuredClone(scope));return resolve(tx,scope);};await configure?.({...context,itemId});
 },transform:async context=>{
  const {payload,value,original}=context;value.version=2;assert.ok(payload.material.currentContextComparison);if(item){const selected=payload.material.currentContextComparison.items.find(i=>i.itemId===itemId);assert.ok(selected);value.context=structuredClone(original.context);value.context.groups=value.context.groups.map(g=>({...g,operation:'DUPLICATE_CURRENT',itemId,expectedRevision:selected.revision,card:selected.card,body:'',section:''}));}await transform?.({...context,itemId});
 }});return {...f,itemId,grants};
}
test('one real signed child reaches both exact duplicate ACK and original whole-Section promotion offer',async t=>{
 const f=await fixture(t),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),result=await f.run();assert.equal(f.physical(),1,JSON.stringify(result));assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);assert.ok(f.captured().material.sectionPromotion);assert.ok(f.captured().material.currentContextComparison.items.some(i=>i.itemId===f.itemId));assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);
 const payload=f.captured(),units=payload.coverage.filter(u=>u.facet==='context'),ack=(await read(f.s,'organizerWorkItems')).filter(r=>r.jobId===payload.logicalJobId&&r.state==='ACKNOWLEDGED'&&r.unit?.facet==='context');assert.equal(ack.length,units.length,JSON.stringify(result));assert.ok(ack.every(r=>r.outcome==='NO_CHANGE'));assert.ok(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));assert.ok(f.grants.some(g=>g.purpose==='ai-maintenance-payload'&&g.currentContextComparison?.items.some(i=>i.itemId===f.itemId)));assert.ok(f.grants.some(g=>g.purpose==='ai-maintenance-section-promotion-payload'));
 await f.run();assert.equal(f.physical(),1);
});

test('a composed child with zero enabled Items retains its real empty grant and reaches the proposal offer',async t=>{
 const f=await fixture(t,{item:false}),result=await f.run();assert.equal(f.physical(),1,JSON.stringify(result));assert.deepEqual(f.captured().material.currentContextComparison,{version:1,mode:'current_item_text',items:[]});assert.ok(f.grants.some(g=>g.purpose==='ai-maintenance-payload'&&g.currentContextComparison?.items.length===0));assert.ok(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));
});
for(const denied of ['current comparison','Section payload'])test('the combined original child refuses a missing '+denied+' grant before tokenization or provider',async t=>{
 let deniedCount=0,tokenized=0;const f=await fixture(t,{configure:({configuration})=>{const resolve=configuration.processing.resolve;configuration.processing.resolve=async(tx,scope)=>{const raw=await resolve(tx,scope);if(denied==='current comparison'&&scope.purpose==='ai-maintenance-payload'&&scope.currentContextComparison){deniedCount++;const {currentContextComparison,...rest}=scope;return {...raw,scope:rest};}if(denied==='Section payload'&&scope.purpose==='ai-maintenance-section-promotion-payload'){deniedCount++;return {...raw,processing:false};}return raw;};const tokenize=configuration.tokenize;configuration.tokenize=async q=>{tokenized++;return tokenize(q);};}});
 const before=await read(f.s,'meta',CONTEXT_CARDS_ROW),result=await f.run();assert.equal(result.state,'UNAVAILABLE');assert.equal(deniedCount,1);assert.equal(tokenized,0);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);
});
test('card closure during the original tokenizer wait prevents both combined purposes from dispatching',async t=>{
 let tokenized=0;const f=await fixture(t,{configure:({local,configuration})=>{const tokenize=configuration.tokenize;configuration.tokenize=async q=>{tokenized++;const value=await tokenize(q);await new ContextCardsService(local.s).change({kind:'access',operationId:op(),epoch:'initial',key:'info',enabled:false,expectedRevision:1});return value;};}});
 const result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(tokenized,1);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);
});
test('comparison byte omissions preserve the real promotion within the unchanged aggregate request bounds',async t=>{
 const f=await fixture(t,{itemCount:5,itemBody:'SYNTHETIC '+'.'.repeat(7000)}),result=await f.run(),payload=f.captured();assert.equal(f.physical(),1,JSON.stringify(result));assert.ok(payload.material.sectionPromotion);assert.ok(payload.material.currentContextComparisonSummary.omittedItems>0);assert.equal(payload.material.currentContextComparisonSummary.complete,false);assert.equal(result.currentContextComparisonIncomplete,true);assert.equal(result.remainingWork,true);assert.ok(new TextEncoder().encode(JSON.stringify(payload.material)).length<=f.s.organizerBudget.limits.maxContentBytes);assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length<=f.s.organizerBudget.limits.maxRequestBytes);assert.ok(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));
});
test('an exact legacy v1 promotion profile keeps its original no-comparison behavior',async t=>{
 const grants=[];const f=await maintenanceSectionPromotionSourceFixture(t,{configure:async({local,configuration})=>{const cards=new ContextCardsService(local.s);await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:'SYNTHETIC opened but no v2 profile',section:'SYNTHETIC comparison',card:'info'});for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});const resolve=configuration.processing.resolve;configuration.processing.resolve=async(tx,scope)=>{grants.push(structuredClone(scope));return resolve(tx,scope);};}});
 const result=await f.run();assert.equal(f.physical(),1,JSON.stringify(result));assert.equal(Object.hasOwn(f.captured().material,'currentContextComparison'),false);assert.equal(grants.some(g=>Object.hasOwn(g,'currentContextComparison')),false);assert.ok(f.captured().material.sectionPromotion);assert.ok(getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));
});
