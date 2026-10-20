import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {LocalMaintenanceSession,getMaintenanceSectionPromotion,maintenanceSectionPromotionCheckpointResult,maintenanceSectionPromotionCheckpointResume} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {confirmMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {createAIFilterServiceAssembly} from '../../../extension/core/ai-usage/filter-visibility-service.js';
import {createMaintenanceServiceClient} from '../../../extension/core/ai-usage/maintenance-service-client.js';
const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
async function fixture(t,{loss=false,processingHook=null}={}){
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();assert.equal(f.physical(),1);
 const offer=getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId});assert.ok(offer);const proposal=readMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle),checkpoints=new SectionPromotionCheckpoints(f.s),locator=await checkpoints.accept(offer.owner,offer.handle,{tab:{id:4,windowId:2}},()=>true),data=readSectionPromotionRecoveryLocator(locator,f.s);assert.equal(proposal.operationId,data.operationId);
 const write=f.s.foundationWrite.bind(f.s);let injected=0;
 if(loss)f.s.foundationWrite=async fn=>{const result=await write(fn);if(!injected&&result?.workId==='personal-topic-promotion:'+data.operationId){injected++;throw Object.assign(Error('original durable confirmation return lost'),{code:'OUTCOME_UNKNOWN'});}return result;};
 try{const operation=confirmMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle);if(loss){await assert.rejects(operation,e=>e.code==='OUTCOME_UNKNOWN');assert.equal(injected,1);assert.ok((await rows(f.s,'organizerWorkItems')).some(r=>r.id==='personal-topic-promotion:'+data.operationId));}else assert.equal((await operation).operationId,data.operationId);}finally{f.s.foundationWrite=write;}
 const channel=identityChannelFixture({authority:f.server}),assembly=createAIFilterServiceAssembly({getStore:()=>f.s,consent:{onInvalidate:()=>()=>{}},policy:null,authority:{serviceFilter:undefined,configureVisibility(){},invalidate(){}},storage:null}),raw={...f.configuration,fetch:r=>new URL(r.url).pathname==='/api/identity-currentness'?channel.handler(r):f.configuration.fetch(r)},configuration=assembly.configure(raw,raw.origin+'/api/identity-currentness');assert.ok(configuration.promotionRecoveryAuthority);
 if(processingHook){const source=configuration.processing;configuration.processing={resolve:(tx,scope)=>processingHook(()=>source.resolve(tx,scope),tx,scope),isCurrent:(...args)=>source.isCurrent(...args)};}
 const client=createMaintenanceServiceClient(configuration);assert.ok(client);const session=new LocalMaintenanceSession(f.s,{...client.sessionOptions,remote:client});t.after(()=>{session.dispose();client.dispose();assembly.dispose();channel.close();});const paidBefore=structuredClone(f.server.saved()),callsBefore=f.calls.length;
 return {...f,sourceConfiguration:f.configuration,session,client,assembly,channel,configuration,locator,data,paidBefore,callsBefore,unchanged:()=>{assert.equal(f.physical(),1);assert.equal(f.calls.length,callsBefore);assert.deepEqual(f.server.saved(),paidBefore);assert.equal(configuration.promotionRecoveryAuthority.status().active,0);}};
}

for(const kind of ['result','resume'])for(const change of ['source revoke','client dispose','session dispose','repository accessor'])test('ordinary checkpoint '+kind+' refuses delivery after financial close triggers '+change,async t=>{
 const f=await fixture(t,{loss:kind==='resume'}),OriginalController=globalThis.AbortController,descriptor=Object.getOwnPropertyDescriptor(f.s,'repository');let observed=0,closed=0,reads=0;
 globalThis.AbortController=class extends OriginalController{
  constructor(){super();const caller=new Error().stack.split('\n')[2]||'';if(caller.includes('/section-promotion-recovery-authority.js:')){observed++;this.signal.addEventListener('abort',()=>{closed++;if(change==='source revoke')f.revoke();else if(change==='client dispose')f.client.dispose();else if(change==='session dispose')f.session.dispose();else Object.defineProperty(f.s,'repository',{configurable:true,get(){reads++;return descriptor.value;}});},{once:true});}}
 };
 try{await assert.rejects((kind==='result'?maintenanceSectionPromotionCheckpointResult:maintenanceSectionPromotionCheckpointResume)(f.session,f.s,f.locator));assert.equal(observed,1);assert.equal(closed,1);assert.equal(reads,0);}finally{globalThis.AbortController=OriginalController;Object.defineProperty(f.s,'repository',descriptor);}
 // The original completed work remains recoverable; a lost delivery neither
 // creates a new operation nor repeats the paid child.
 assert.ok((await rows(f.s,'operationReceipts')).some(r=>r.id===f.data.operationId));assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.id==='personal-topic-promotion:'+f.data.operationId).length,0);f.unchanged();
});
