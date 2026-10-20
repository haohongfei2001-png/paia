import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import * as sessionOwner from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {MaintenanceSectionPromotionTasks,readMaintenanceSectionPromotionOffer,releaseMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
test('a genuine whole Section proposal shares the exact paid child and durable facet DEFER without new ACK or mutation',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t),before={topics:await read(f.s,'topics'),entries:await read(f.s,'thoughts'),placements:await read(f.s,'placements')},ackBefore=(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,result=await f.run();
 assert.equal(result.state,'PARTIAL');assert.equal(f.physical(),1);assert.ok(f.captured().material.sectionPromotion);assert.equal((await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,ackBefore);assert.ok((await read(f.s,'organizerWorkItems')).some(r=>r.state==='DEFERRED'));
 assert.deepEqual({topics:await read(f.s,'topics'),entries:await read(f.s,'thoughts'),placements:await read(f.s,'placements')},before);
 const offer=sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId});assert.ok(offer);assert.equal(offer.owner.proposal(offer.handle).selection,'whole_section');assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});

test('a real Context commit and its exact joined ACK permit the original proposal handoff',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t,{transform:({value,original})=>{value.context=original.context;}}),before=(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,result=await f.run();
 assert.equal(result.processedState??result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,before+2);
 assert.ok(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));
});
for(const mode of ['malformed sibling','wrong proposal binding'])test('actual paid proposal refuses '+mode+' without any facet ACK or offer',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t,{transform:({value})=>{if(mode==='malformed sibling')value.context.forbidden=true;else value.sectionProposal.childOperationId='synthetic-foreign-child';}}),before=(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length;
 const result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,before);assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);
 assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('a rejected independent remote Section grant cannot reach tokenizer or the paid provider',async t=>{
 let tokenize=0,grant=0;const f=await maintenanceSectionPromotionSourceFixture(t,{configure:({configuration})=>{const original=configuration.processing.resolve;configuration.processing.resolve=async(tx,scope)=>{const raw=await original(tx,scope);if(scope.purpose==='ai-maintenance-section-promotion-payload'){grant++;return {...raw,processing:false};}return raw;};const token=configuration.tokenize;configuration.tokenize=async q=>{tokenize++;return token(q);};}});
 const result=await f.run();assert.equal(result.state,'UNAVAILABLE');assert.equal(grant,1);assert.equal(tokenize,0);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
});
test('the separate Section payload receipt revoked during tokenizer wait sends nothing',async t=>{
 const signal=new AbortController();let tokenized=0;const f=await maintenanceSectionPromotionSourceFixture(t,{configure:({configuration})=>{const original=configuration.processing.resolve;configuration.processing.resolve=async(tx,scope)=>{const raw=await original(tx,scope);return scope.purpose==='ai-maintenance-section-promotion-payload'?{...raw,revocationSignal:signal.signal}:raw;};const token=configuration.tokenize;configuration.tokenize=async q=>{tokenized++;const measurement=await token(q);signal.abort();return measurement;};}});
 const result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(tokenized,1);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
});
test('a durable DEFER storage rollback retries only the original validated response before handing off',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 t.mock.method(f.s.repository,'transaction',(write,fn)=>transaction(write,tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(!injected&&f.physical()===1&&table==='organizerWorkItems'&&row.state==='DEFERRED'){injected=true;throw Error('synthetic DEFER storage rollback');}return result;};}return fn(tx);}));
 const first=await f.run();assert.ok(injected);assert.equal(f.physical(),1);assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);assert.notEqual(first.state,'COMMITTED');
 const second=await f.run();assert.equal(second.state,'PARTIAL');assert.equal(f.physical(),1);assert.ok(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));
});

test('the exact source session route refuses copied or foreign owners and global revoke retires the genuine offer',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const request={topicId:f.topic.id,sectionId:f.section.sectionId},offer=sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request);assert.ok(offer);
 assert.throws(()=>sessionOwner.getMaintenanceSectionPromotion(Object.create(f.session),f.s,request));assert.throws(()=>sessionOwner.getMaintenanceSectionPromotion(f.session,{repository:f.s.repository},request));
 offer.owner.available=()=>({forged:true});offer.owner.dispose=()=>{};assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request).handle,offer.handle);
 f.revoke();assert.throws(()=>sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request));assert.throws(()=>readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle));assert.equal(f.physical(),1);
});
test('a late Source write in the durable DEFER transaction cannot yield a usable proposal offer',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 t.mock.method(f.s.repository,'transaction',(write,fn)=>transaction(write,tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(!injected&&f.physical()===1&&table==='organizerWorkItems'&&row.state==='DEFERRED'){injected=true;const source=(await tx.all('records'))[0];source.originalText+=' synthetic later Source';await put('records',source);}return result;};}return fn(tx);}));
 await f.run();assert.ok(injected);assert.equal(f.physical(),1);assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);
});
test('the original paid handoff rejects copied and foreign capabilities and is consumed exactly once',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t),finish=MaintenanceSectionPromotionTasks.prototype.finish;let actual=null;
 t.mock.method(MaintenanceSectionPromotionTasks.prototype,'finish',async function(task,handoff){actual=handoff;assert.throws(()=>sessionOwner.readMaintenanceSectionPromotionHandoff({...handoff},f.s));assert.throws(()=>sessionOwner.readMaintenanceSectionPromotionHandoff(handoff,{repository:f.s.repository}));return finish.call(this,task,handoff);});
 await f.run();assert.ok(actual);assert.ok(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}));assert.throws(()=>sessionOwner.readMaintenanceSectionPromotionHandoff(actual,f.s));assert.equal(f.physical(),1);
});
test('a missing durable DEFER cannot be replaced by a completed paid response or session-local progress',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 t.mock.method(f.s.repository,'transaction',(write,fn)=>transaction(write,tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(!injected&&f.physical()===1&&table==='organizerWorkItems'&&row.state==='DEFERRED'){injected=true;await tx.delete(table,row.id);}return result;};}return fn(tx);}));
 await f.run();assert.ok(injected);assert.equal(f.physical(),1);assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),null);
});

test('original configured source constructed before Repository open binds once in real proposal preparation',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t,{configure:async({local})=>{await local.s.repository.close();assert.equal(local.s.repository.db,null);}}),request={topicId:f.topic.id,sectionId:f.section.sectionId},repository=f.s.repository;
 assert.equal(repository.db,null);assert.equal(sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request),null);assert.equal(f.calls.length,0);
 f.s.repository={db:null};try{assert.throws(()=>sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request));}finally{f.s.repository=repository;}
 await repository.open();const database=repository.db,result=await f.run();assert.equal(result.state,'PARTIAL');const offer=sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request);assert.ok(offer);assert.equal(f.physical(),1);
 await repository.close();await repository.open();assert.notEqual(repository.db,database);assert.throws(()=>sessionOwner.getMaintenanceSectionPromotion(f.session,f.s,request));assert.throws(()=>readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle));assert.equal(f.physical(),1);assert.doesNotThrow(()=>f.session.dispose());
});
