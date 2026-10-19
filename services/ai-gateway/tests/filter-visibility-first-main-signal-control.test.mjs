import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createIdentityCurrentnessHub,createHubMaintenanceIdentity,reserveHubIdentityObservation,releaseHubIdentityObservation} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
import {prepareMaintenanceIdentityConnection} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
import {AIFilterConsent} from '../../../extension/background/ai-filter-consent.js';
import {createAIFilterVisibilityOwner} from '../../../extension/core/ai-usage/filter-visibility-owner.js';
const policy={version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'},tick=()=>new Promise(r=>setImmediate(r));
const visible=async f=>(await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id);
const rows=(f,n)=>f.s.repository.transaction(false,t=>t.all(n));
async function setup(t,{alter=null}={}){
 let owner,hub,channel,metadata=0,proofCalls=0;const issuer={read:null};const saved={},storage={get:async k=>({[k]:structuredClone(saved[k])}),set:async value=>Object.assign(saved,structuredClone(value))};
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,configure:context=>{const {local,configuration,server,filterRuntime,filterConsent,filterIdentity}=context;filterIdentity.dispose();channel=identityChannelFixture({authority:server});hub=createIdentityCurrentnessHub({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:r=>{metadata++;return channel.handler(r);}});configuration.filterIdentity=createHubMaintenanceIdentity(hub);const read=configuration.readProofs;configuration.readProofs=async request=>{proofCalls++;return issuer.read?issuer.read(request):read(request);};
  owner=createAIFilterVisibilityOwner({getStore:()=>local.s,consent:filterConsent,policy,configuration,hub,storage});assert.ok(owner);assert.equal(filterRuntime.configureVisibility(owner),true);alter?.({...context,owner,hub,channel,storage});
 }});t.after(()=>{owner.dispose();hub.dispose();channel.close();f.session.dispose();});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));await owner.settled();const entry=saved.aiFilterVisibilityHistoryV1?.entries?.[0];assert.ok(entry,'actual joined ACK must retain its historical witness');const id=entry.data.publication.operationId;
 return {...f,owner,hub,channel,saved,storage,id,issuer,metadata:()=>metadata,proofCalls:()=>proofCalls};
}

for(const boundary of ['unaborted','already aborted','issuer abort','later abort'])test('original native readonly Signal '+boundary+' cannot be replaced by its own aborted getter',async t=>{
 const controller=new AbortController();if(boundary==='already aborted')controller.abort();let reads=0,changed=false;Object.defineProperty(controller.signal,'aborted',{configurable:true,get(){reads++;return boundary==='unaborted';}});
 const f=await setup(t,{alter:({configuration})=>{const resolve=configuration.processing.resolve,current=configuration.processing.isCurrent;configuration.processing.resolve=async(tx,scope)=>{const raw=await resolve(tx,scope);return scope.purpose==='ai-filter-visibility-qualification'?{...raw,revocationSignal:controller.signal}:raw;};configuration.processing.isCurrent=(raw,s)=>{if(boundary==='issuer abort'&&!changed&&raw.scope.purpose==='ai-filter-visibility-qualification'){changed=true;controller.abort();}return current(raw,s);};}});f.session.dispose();const accepted=await f.owner.renew(f.id);t.diagnostic(JSON.stringify({boundary,accepted,getterReads:reads}));assert.equal(accepted,['unaborted','later abort'].includes(boundary));assert.equal(reads,0);if(boundary==='issuer abort')assert.equal(changed,true);if(boundary==='later abort'){assert.equal(await visible(f),false);controller.abort();assert.equal(await visible(f),true);assert.equal(reads,0);}assert.equal(f.physical(),1);
});
