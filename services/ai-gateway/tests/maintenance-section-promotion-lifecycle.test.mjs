import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {laterMaintenanceService} from './maintenance-recovery-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {readMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOwnerState,releaseMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const selected=f=>({topicId:f.topic.id,sectionId:f.section.sectionId});

test('one original session reuses released proposal slots through the ninth genuinely paid opportunity',async t=>{
 let active;
 const f=await maintenanceSectionPromotionSourceFixture(t,{configure:({configuration})=>{
  active={...configuration};for(const key of ['clock','readProfile','currentProfile','tokenize','readProofs','fetch'])configuration[key]=(...args)=>active[key](...args);
 },transform:({value,original})=>{value.context=original.context;}});
 let service={server:f.server,configuration:active};const owners=new Set(),requests=new Set();
 for(let i=0;i<9;i++){
  if(i){
   service=laterMaintenanceService(service,service.server.saved().rows.at(-1).window.nextEligibilityAt);active=service.configuration;
   for(const entry of f.entries){const current=(await read(f.s,'thoughts')).find(e=>e.id===entry.id),placement=(await read(f.s,'placements')).find(p=>p.entryId===entry.id&&p.topicId===f.topic.id);await f.s.placeEntry({entryId:entry.id,topicId:f.topic.id,sectionId:f.section.sectionId,expectedEntryRevision:current.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,operationId:crypto.randomUUID()});}
  }
  const result=await f.run();assert.equal(result.processedState??result.state,'COMMITTED',JSON.stringify({i,result}));assert.equal(f.physical(),i+1);
  const offer=getMaintenanceSectionPromotion(f.session,f.s,selected(f));assert.ok(offer,'genuine offer '+(i+1));assert.equal(owners.has(offer.owner),false);owners.add(offer.owner);requests.add(readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle).operationId);
  assert.equal(releaseMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle),true);assert.deepEqual(readMaintenanceSectionPromotionOwnerState(offer.owner,f.s),{tasks:0,offers:0,confirming:0});
  assert.equal(getMaintenanceSectionPromotion(f.session,f.s,selected(f)),null);
 }
 assert.equal(owners.size,9);assert.equal(requests.size,9);assert.equal(service.server.saved().rows.length,9,'the original financial ledger is preserved across authenticated later windows');
 assert.equal((await read(f.s,'organizerUsage')).filter(r=>r.executionKind==='server-backed'&&r.financialSettlement?.state==='SETTLED').length,9);
});

test('the genuine offered proposal expiry timer releases it while idle without a subsequent proposal read',async t=>{
 const scheduled=[],timeout=globalThis.setTimeout;
 t.mock.method(globalThis,'setTimeout',(fn,delay,...args)=>{if(delay>=23*60*60*1000)scheduled.push({fn,delay,args});return timeout(fn,delay,...args);});
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const offer=getMaintenanceSectionPromotion(f.session,f.s,selected(f));assert.ok(offer);const descriptor=readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle),before=await read(f.s,'topics');
 assert.equal(scheduled.length,1);assert.ok(scheduled[0].delay<=24*60*60*1000);
 // Advance only the original offer's timer. Restoring the wall clock before
 // any owner read prevents an access-time expiry check from proving cleanup.
 const clock=t.mock.method(Date,'now',()=>descriptor.expiresAt);scheduled[0].fn(...scheduled[0].args);clock.mock.restore();
 assert.throws(()=>readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle));assert.deepEqual(readMaintenanceSectionPromotionOwnerState(offer.owner,f.s),{tasks:0,offers:0,confirming:0});assert.equal(getMaintenanceSectionPromotion(f.session,f.s,selected(f)),null);assert.deepEqual(await read(f.s,'topics'),before);assert.equal(f.physical(),1);
});
