import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createAIFilterServiceAssembly} from '../../../extension/core/ai-usage/filter-visibility-service.js';
import {createMaintenanceServiceClient} from '../../../extension/core/ai-usage/maintenance-service-client.js';
import {laterMaintenanceService} from './maintenance-recovery-fixture.mjs';
import {LocalMaintenanceSession,getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {releaseMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator,assertSectionPromotionRecoveryLocatorFacts} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {TopicSectionPromotionCommands} from '../../../extension/background/topic-section-promotion-commands.js';
const type='PAIA_LIBRARY_SECTION_PROMOTION',url='chrome-extension://synthetic/ui/archive.html';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const selected=f=>({topicId:f.topic.id,sectionId:f.section.sectionId});
function memory(){const values={};return {values,get:async key=>Object.hasOwn(values,key)?{[key]:structuredClone(values[key])}:{},set:async next=>Object.assign(values,structuredClone(next))};}
function gateway(f,session,{tabId=4,windowId=2}={}){let live=true;const documentId=crypto.randomUUID(),sender={id:'synthetic',frameId:0,documentId,documentLifecycle:'active',url,tab:{id:tabId,windowId,incognito:false}},api={runtime:{id:'synthetic',getURL:path=>'chrome-extension://synthetic/'+path,getContexts:async()=>live?[{contextType:'TAB',tabId,windowId,frameId:0,documentId,documentUrl:url,incognito:false}]:[]},tabs:{get:async()=>({id:tabId,windowId,incognito:false,url})}},owner=new TopicSectionPromotionCommands(f.s,api,{promotionSession:f.session,checkpointStorage:{session}});return {owner,reload:()=>{live=false;},call:(command,payload={})=>owner.handle({type,command,...payload},sender)};}
function recoveredGateway(t,f,sessionStorage=memory()){
 const channel=identityChannelFixture({authority:f.server}),assembly=createAIFilterServiceAssembly({getStore:()=>f.s,consent:{onInvalidate:()=>()=>{}},policy:null,authority:{serviceFilter:undefined,configureVisibility(){},invalidate(){}},storage:null}),raw={...f.configuration,fetch:r=>new URL(r.url).pathname==='/api/identity-currentness'?channel.handler(r):f.configuration.fetch(r)},configuration=assembly.configure(raw,raw.origin+'/api/identity-currentness');assert.ok(configuration.promotionRecoveryAuthority);
 const client=createMaintenanceServiceClient(configuration);assert.ok(client);const session=new LocalMaintenanceSession(f.s,{...client.sessionOptions,remote:client});t.after(()=>{session.dispose();client.dispose();assembly.dispose();channel.close();});return {...gateway({...f,session},sessionStorage),channel,configuration};
}

for(const change of ['source revoke','session dispose'])test('an exact delivered Archive ACK cannot erase the original obligation after '+change,async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const g=gateway(f,memory()),prepared=await g.call('proposal',{request:selected(f)}),result=await g.call('confirm',{token:prepared.token,confirmed:true});assert.equal(result.state,'committed');assert.equal(typeof result.checkpointToken,'string');
 const before=await f.s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1')),ledger=structuredClone(f.server.saved());if(change==='source revoke')f.revoke();else f.session.dispose();
 await assert.rejects(g.call('acknowledge',{token:result.checkpointToken}));assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1')),before);assert.equal(f.physical(),1);assert.deepEqual(f.server.saved(),ledger);
});

for(const change of ['source revoke','session dispose'])test('the original ACK transaction rolls back when '+change+' follows its exact locator write',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const g=gateway(f,memory()),prepared=await g.call('proposal',{request:selected(f)}),result=await g.call('confirm',{token:prepared.token,confirmed:true});assert.equal(result.state,'committed');const before=await f.s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1')),transaction=f.s.repository.transaction.bind(f.s.repository),ledger=structuredClone(f.server.saved());let injected=false;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async scope=>{const put=scope.put.bind(scope);scope.put=async(table,row,...rest)=>{const value=await put(table,row,...rest);if(write&&!injected&&table==='meta'&&row.id==='section-promotion-recovery-locators:v1'&&row.rows.length===0){injected=true;if(change==='source revoke')f.revoke();else f.session.dispose();}return value;};return fn(scope);},...args);
 try{await assert.rejects(g.call('acknowledge',{token:result.checkpointToken}));}finally{f.s.repository.transaction=transaction;}
 assert.equal(injected,true);assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('meta','section-promotion-recovery-locators:v1')),before);assert.equal(f.physical(),1);assert.deepEqual(f.server.saved(),ledger);
});
