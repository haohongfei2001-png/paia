import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {LocalMaintenanceSession,getMaintenanceSectionPromotion,assertMaintenanceSectionPromotionRecoveryAuthority,maintenanceSectionPromotionCheckpointResult,maintenanceSectionPromotionCheckpointResume} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {createAIFilterServiceAssembly} from '../../../extension/core/ai-usage/filter-visibility-service.js';
import {createMaintenanceServiceClient} from '../../../extension/core/ai-usage/maintenance-service-client.js';

const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const registry=s=>s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1'));
async function fixture(t){
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();assert.equal(f.physical(),1);
 const selected={topicId:f.topic.id,sectionId:f.section.sectionId},offer=getMaintenanceSectionPromotion(f.session,f.s,selected);assert.ok(offer);
 const checkpoints=new SectionPromotionCheckpoints(f.s),locator=await checkpoints.accept(offer.owner,offer.handle,{tab:{id:4,windowId:2}},()=>true),data=readSectionPromotionRecoveryLocator(locator,f.s);
 const channel=identityChannelFixture({authority:f.server}),assembly=createAIFilterServiceAssembly({getStore:()=>f.s,consent:{onInvalidate:()=>()=>{}},policy:null,authority:{serviceFilter:undefined,configureVisibility(){},invalidate(){}},storage:null});
 const raw={...f.configuration,fetch:r=>new URL(r.url).pathname==='/api/identity-currentness'?channel.handler(r):f.configuration.fetch(r)},configuration=assembly.configure(raw,raw.origin+'/api/identity-currentness');assert.ok(configuration.promotionRecoveryAuthority);
 let fields=0;const processing=configuration.processing;configuration.processing={resolve:(...args)=>{fields++;return processing.resolve(...args);},isCurrent:(...args)=>processing.isCurrent(...args)};
 const client=createMaintenanceServiceClient(configuration);assert.ok(client);const session=new LocalMaintenanceSession(f.s,{...client.sessionOptions,remote:client});t.after(()=>{session.dispose();client.dispose();assembly.dispose();channel.close();});
 const financial=structuredClone(f.server.saved()),calls=f.calls.length,domain=await Promise.all(['topics','sections','thoughts','placements','dependencies','provenance'].map(table=>rows(f.s,table)));
 const unchanged=async()=>{assert.equal(fields,0);assert.equal(f.physical(),1);assert.equal(f.calls.length,calls);assert.deepEqual(f.server.saved(),financial);assert.deepEqual(await Promise.all(['topics','sections','thoughts','placements','dependencies','provenance'].map(table=>rows(f.s,table))),domain);assert.equal(configuration.promotionRecoveryAuthority.status().active,0);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.id==='personal-topic-promotion:'+data.operationId).length,0);assert.equal((await rows(f.s,'operationReceipts')).filter(r=>r.id===data.operationId).length,0);};
 const reopen=async()=>{const next=new SectionPromotionCheckpoints(f.s),historical=await next.lookup(selected,{tab:{id:90,windowId:91}},authority=>assertMaintenanceSectionPromotionRecoveryAuthority(session,f.s,authority),()=>true);assert.ok(historical);assert.equal(readSectionPromotionRecoveryLocator(historical,f.s).phase,'unwritten');return historical;};
 return {...f,session,client,configuration,channel,selected,checkpoints,locator,data,unchanged,reopen};
}
function assertHistory(result,f){assert.deepEqual(Object.keys(result).sort(),['checkpoint','operationId','sourceSectionId','sourceTopicId','state']);assert.equal(result.state,'unwritten');assert.equal(result.operationId,f.data.operationId);assert.equal(result.sourceTopicId,f.topic.id);assert.equal(result.sourceSectionId,f.section.sectionId);assert.equal(readSectionPromotionRecoveryLocator(result.checkpoint,f.s).phase,'unwritten');}
function auditEnvelopeReads(t,f){let reads=0;const original=f.s.repository.transaction.bind(f.s.repository);t.mock.method(f.s.repository,'transaction',(write,fn,...args)=>original(write,scope=>{const get=scope.get.bind(scope);scope.get=(table,key,...rest)=>{if(table==='organizerWorkItems'||table==='operationReceipts')reads++;return get(table,key,...rest);};return fn(scope);},...args));return ()=>reads;}

test('original session resume returns the committed no-work outcome without reopening its retired financial capability',async t=>{
 const f=await fixture(t),reads=auditEnvelopeReads(t,f),result=await maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator);assertHistory(result,f);assert.equal(reads(),0);assert.equal((await registry(f.s)).rows.length,1);assert.throws(()=>readSectionPromotionRecoveryLocator(f.locator,f.s));await f.unchanged();
});

for(const kind of ['result','resume'])test('original fixed session '+kind+' redelivers authenticated no-work history with a fresh source proof and no field or envelope read',async t=>{
 const f=await fixture(t);assertHistory(await maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator),f);const locator=await f.reopen(),reads=auditEnvelopeReads(t,f),count=f.channel.clients.length;
 const result=await (kind==='result'?maintenanceSectionPromotionCheckpointResult:maintenanceSectionPromotionCheckpointResume)(f.session,f.s,locator);assertHistory(result,f);assert.equal(result.checkpoint,locator);assert.ok(f.channel.clients.length>count);assert.equal(reads(),0);await f.unchanged();
});

test('lost original no-work return remains discoverable and the fixed session result never retries the paid child',async t=>{
 const f=await fixture(t),original=f.s.repository.transaction.bind(f.s.repository);let lost=false;
 f.s.repository.transaction=async(write,fn,...args)=>{let selected=false;const result=await original(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row)=>{const value=await put(table,row);if(write&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.rows.some(r=>r.unwritten?.version===1))selected=true;return value;};return fn(scope);},...args);if(selected&&!lost){lost=true;throw Object.assign(Error('original no-work transaction committed but return lost'),{code:'OUTCOME_UNKNOWN'});}return result;};
 try{await assert.rejects(maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator),e=>e.code==='OUTCOME_UNKNOWN');}finally{f.s.repository.transaction=original;}
 assert.equal(lost,true);assert.equal(configurationActive(f),0);const locator=await f.reopen(),reads=auditEnvelopeReads(t,f);assertHistory(await maintenanceSectionPromotionCheckpointResult(f.session,f.s,locator),f);assert.equal(reads(),0);await f.unchanged();
});
const configurationActive=f=>f.configuration.promotionRecoveryAuthority.status().active;

for(const change of ['source revoke','session dispose'])test('a committed no-work outcome is not delivered after '+change+' at the original transaction return',async t=>{
 const f=await fixture(t),original=f.s.repository.transaction.bind(f.s.repository);let stopped=false;
 f.s.repository.transaction=async(write,fn,...args)=>{let selected=false;const result=await original(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row)=>{const value=await put(table,row);if(write&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.rows.some(r=>r.unwritten?.version===1))selected=true;return value;};return fn(scope);},...args);if(selected&&!stopped){stopped=true;if(change==='source revoke')f.revoke();else f.session.dispose();}return result;};
 try{await assert.rejects(maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator));}finally{f.s.repository.transaction=original;}
 assert.equal(stopped,true);const index=await registry(f.s);assert.equal(index.rows.length,1);assert.equal(index.rows[0].unwritten.version,1);await f.unchanged();
});

for(const change of ['repository accessor','client dispose','session dispose'])test('original financial capability close cannot bypass the source route final facts: '+change,async t=>{
 const f=await fixture(t),OriginalController=globalThis.AbortController,descriptor=Object.getOwnPropertyDescriptor(f.s,'repository');let observed=0,closed=0,reads=0;
 // Observe only the actual native controller constructed by the original
 // financial authority owner. The listener runs from that owner's real close;
 // no result, grant, transaction, or fixed take implementation is replaced.
 globalThis.AbortController=class extends OriginalController{
  constructor(){super();const caller=new Error().stack.split('\n')[2]||'';if(caller.includes('/section-promotion-recovery-authority.js:')){observed++;this.signal.addEventListener('abort',()=>{closed++;if(change==='repository accessor')Object.defineProperty(f.s,'repository',{configurable:true,get(){reads++;return descriptor.value;}});else if(change==='client dispose')f.client.dispose();else f.session.dispose();},{once:true});}}
 };
 try{await assert.rejects(maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator));assert.equal(observed,1);assert.equal(closed,1);assert.equal(reads,0);}finally{globalThis.AbortController=OriginalController;Object.defineProperty(f.s,'repository',descriptor);}
 assert.equal((await registry(f.s)).rows[0].unwritten.version,1);await f.unchanged();
});
