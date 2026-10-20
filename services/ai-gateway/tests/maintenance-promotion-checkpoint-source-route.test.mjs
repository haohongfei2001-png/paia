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
for(const loss of [false,true])test('fixed original session checkpoint '+(loss?'resume after durable work return loss':'result after committed response loss')+' acquires a fresh source identity and preserves the one paid child',async t=>{
 const f=await fixture(t,{loss}),result=await (loss?maintenanceSectionPromotionCheckpointResume:maintenanceSectionPromotionCheckpointResult)(f.session,f.s,f.locator);assert.equal(result.operationId,f.data.operationId);assert.ok((await rows(f.s,'operationReceipts')).some(r=>r.id===f.data.operationId));assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.id==='personal-topic-promotion:'+f.data.operationId).length,0);assert.ok(f.channel.clients.length>0);f.unchanged();
});

function envelopeReads(t,f){let count=0;const transaction=f.s.repository.transaction.bind(f.s.repository);t.mock.method(f.s.repository,'transaction',(write,fn,...args)=>transaction(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(table,id)=>{if(table==='organizerWorkItems'&&id==='personal-topic-promotion:'+f.data.operationId||table==='operationReceipts'&&id===f.data.operationId)count++;return get(table,id);};return fn(tx);},...args));return ()=>count;}
test('fixed checkpoint routes refuse copied, foreign and missing source proofs before any old work envelope',async t=>{
 const f=await fixture(t),count=envelopeReads(t,f),before=f.channel.clients.length;
 for(const [session,store,locator] of [[{...f.session},f.s,f.locator],[f.session,{...f.s},f.locator],[f.session,f.s,{...f.locator}]])await assert.rejects(Promise.resolve().then(()=>maintenanceSectionPromotionCheckpointResult(session,store,locator)));
 const missing=createMaintenanceServiceClient(f.sourceConfiguration);assert.ok(missing);const session=new LocalMaintenanceSession(f.s,{...missing.sessionOptions,remote:missing});try{await assert.rejects(maintenanceSectionPromotionCheckpointResult(session,f.s,f.locator));}finally{session.dispose();missing.dispose();}
 assert.equal(count(),0);assert.equal(f.channel.clients.length,before);f.unchanged();
});
test('fixed checkpoint route refuses changed original financial request before work or fresh identity acquisition',async t=>{
 const f=await fixture(t,{loss:true}),count=envelopeReads(t,f);await f.s.repository.transaction(true,async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+f.data.paidBinding.childOperationId);row.financialRequest.inputTokens++;await tx.put('organizerUsage',row);});const before=f.channel.clients.length;await assert.rejects(maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator));assert.equal(count(),0);assert.equal(f.channel.clients.length,before);f.unchanged();
});
for(const mode of ['source revoke','session dispose'])test('fixed checkpoint '+mode+' during the independent field await releases the source proof without activation',async t=>{
 let entered,release;const started=new Promise(r=>entered=r),held=new Promise(r=>release=r);const f=await fixture(t,{loss:true,processingHook:async resolve=>{entered();await held;return resolve();}});t.after(()=>release?.());const before=await rows(f.s,'topics'),run=maintenanceSectionPromotionCheckpointResume(f.session,f.s,f.locator);await started;if(mode==='source revoke')f.revoke();else f.session.dispose();await assert.rejects(run);release();await new Promise(r=>setImmediate(r));assert.deepEqual(await rows(f.s,'topics'),before);assert.equal((await rows(f.s,'operationReceipts')).filter(r=>r.id===f.data.operationId).length,0);assert.ok((await rows(f.s,'organizerWorkItems')).some(r=>r.id==='personal-topic-promotion:'+f.data.operationId));f.unchanged();
});
