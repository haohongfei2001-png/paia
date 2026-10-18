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
test('actual joined Filter decision survives paid-session disposal through fresh readonly signed observation and exact processing',async t=>{
 const scopes=[];const f=await setup(t,{alter:({configuration})=>{const resolve=configuration.processing.resolve;configuration.processing.resolve=async(tx,r)=>{scopes.push(structuredClone(r));return resolve(tx,r);};}});
 assert.equal(await f.owner.renew(f.id),true);f.session.dispose();assert.equal(await visible(f),false);const before=await rows(f,'filterInputs');await assert.rejects(f.s.repository.transaction(false,t=>f.s.prepareAIMaintenanceFilter(t,scopes.find(s=>s.purpose==='ai-filter-visibility-qualification')&&{candidateIds:[f.candidate.id],neighborIds:[f.neighbor.id]})));
 assert.deepEqual(await rows(f,'filterInputs'),before);assert.equal(f.physical(),1);assert.ok(f.metadata()>=2);const scope=scopes.find(s=>s.purpose==='ai-filter-visibility-qualification');assert.ok(scope);assert.deepEqual(scope.inputs.map(i=>i.selectedFields),[['body','note'],['body','note']]);assert.equal(scope.filterOperationId,f.id);assert.equal(scope.childOperationId,f.saved.aiFilterVisibilityHistoryV1.entries[0].data.request.operationId);
});
for(const change of ['qualification','consent','channel','host','human Keep','decision'])test('readonly visibility becomes visible after '+change+' without changing its old ACK or paid count',async t=>{
 const f=await setup(t);assert.equal(await f.owner.renew(f.id),true);f.session.dispose();assert.equal(await visible(f),false);const acknowledgements=(await rows(f,'organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED');
 if(change==='qualification')f.contextAbort.abort();else if(change==='consent')f.filterConsent.invalidate();else if(change==='channel'){f.channel.notify();await tick();}else if(change==='host')f.revoke();else await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.candidate.id);if(change==='human Keep')row.filterOverride='keep';else row.aiDecision.sequence++;await tx.put('filterInputs',row);});
 assert.equal(await visible(f),true);assert.deepEqual((await rows(f,'organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED'),acknowledgements);assert.equal(f.physical(),1);
});
for(const change of ['missing note','extra Input','wrong purpose','revoked','expired','foreign caller','mutable caller'])test('fresh readonly '+change+' processing receipt is rejected before original Filter text access',async t=>{
 const f=await setup(t,{alter:({configuration,local})=>{const resolve=configuration.processing.resolve;configuration.processing.resolve=async(tx,r)=>{const raw=await resolve(tx,r);if(r.purpose!=='ai-filter-visibility-qualification')return raw;const scope=structuredClone(r);if(change==='missing note')scope.inputs[0].selectedFields=['body'];if(change==='extra Input')scope.inputs.push({inputId:local.outside.id,selectedFields:['body','note']});if(change==='wrong purpose')scope.purpose='ai-maintenance-filter-qualification';return {...raw,scope,...(change==='expired'?{expiresAt:0}:{}),...(change==='foreign caller'?{caller:Object.freeze({id:'SYNTHETIC-foreign'})}:{}),...(change==='mutable caller'?{caller:{id:'SYNTHETIC-mutable'}}:{}),...(change==='revoked'?{revocationSignal:AbortSignal.abort()}:{} )};};}});
 assert.equal(await f.owner.renew(f.id),false);f.session.dispose();assert.equal(await visible(f),true);assert.equal(f.physical(),1);
});

function advanceFresh(t,f,{generation=null}={}){
 const at=f.server.now+65000,wall=Date.now()+65000;t.mock.method(Date,'now',()=>wall);f.server.now=at;f.channel.setClock(at);
 f.issuer.read=async request=>{const principal=f.server.principal(request);principal.security.observedAt=at/1000;principal.security.expiresAt=at/1000+60;if(generation)principal.security.entitlementGeneration=generation;f.server.principals.set(request.principalId+'/'+request.libraryId,principal);const times={iat:at/1000,nbf:at/1000,exp:at/1000+120};const {request:_,...proofs}=f.server.bundle(request,{principal:times,entitlement:{...times,tier:'pro',...(generation?{generation}:{})}});return proofs;};
}
test('after original 60-second observation expires, fresh signed exact request and independent processing restore readonly visibility without paid/status replay',async t=>{
 const f=await setup(t);assert.equal(await f.owner.renew(f.id),true);f.session.dispose();const before=await rows(f,'filterInputs'),calls=f.calls.length,proofs=f.proofCalls(),metadata=f.metadata();advanceFresh(t,f);
 assert.equal(await visible(f),true,'expired identity must fail open before fresh admission');assert.equal(await f.owner.renew(f.id),true);assert.equal(await visible(f),false);assert.deepEqual(await rows(f,'filterInputs'),before);assert.equal(f.calls.length,calls);assert.equal(f.physical(),1);assert.equal(f.proofCalls(),proofs+1);assert.equal(f.metadata(),metadata+1);
});
test('changed authenticated entitlement generation retires old decision even when issuer and current channel agree',async t=>{
 const f=await setup(t);assert.equal(await f.owner.renew(f.id),true);f.session.dispose();advanceFresh(t,f,{generation:'SYNTHETIC-next-entitlement'});assert.equal(await f.owner.renew(f.id),false);assert.equal(await visible(f),true);const calls=f.metadata();assert.equal(await f.owner.renew(f.id),false);assert.equal(f.metadata(),calls);assert.equal(f.physical(),1);
});
test('worker restart restores only authenticated same-browser-session history, then requires a fresh channel and exact current owner facts',async t=>{
 const f=await setup(t);assert.equal(await f.owner.renew(f.id),true);f.session.dispose();f.owner.dispose();f.hub.dispose();assert.equal(await visible(f),true);
 const consent=new AIFilterConsent({storage:{session:{get:async k=>({[k]:structuredClone(f.filterConsentData[k])}),set:async v=>Object.assign(f.filterConsentData,structuredClone(v))}}},{consented:async()=>true});await consent.status();
 const hub=createIdentityCurrentnessHub({endpoint:f.configuration.origin+'/api/identity-currentness',clock:f.configuration.clock,fetch:r=>f.channel.handler(r)}),owner=createAIFilterVisibilityOwner({getStore:()=>f.s,consent,policy,configuration:f.configuration,hub,storage:f.storage});t.after(()=>{owner.dispose();hub.dispose();consent.dispose();});assert.equal(f.filterRuntime.configureVisibility(owner),true);assert.equal(await owner.load(),true);assert.equal(owner.status().history,1);assert.equal(owner.status().active,0);assert.equal(await owner.renew(f.id),true);assert.equal(await visible(f),false);assert.equal(f.physical(),1);
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.candidate.id);row.filterOverride='keep';await tx.put('filterInputs',row);});assert.equal(await visible(f),true);
});
test('eight independent readonly consumers retain pending issuer slots after timeout/dispose and block a ninth paid channel until settlement',async t=>{
 const f=await setup(t);f.session.dispose();f.owner.dispose();let calls=0;const held=[];f.issuer.read=()=>{calls++;return new Promise(resolve=>held.push(resolve));};const owners=[],consents=[];
 t.mock.timers.enable({apis:['setTimeout']});
 for(let i=0;i<9;i++){
  const consent=new AIFilterConsent({storage:{session:{get:async k=>({[k]:structuredClone(f.filterConsentData[k])}),set:async()=>{}}}},{consented:async()=>true});await consent.status();consents.push(consent);const owner=createAIFilterVisibilityOwner({getStore:()=>f.s,consent,policy,configuration:f.configuration,hub:f.hub,storage:f.storage});owners.push(owner);await owner.load();
 }
 t.after(()=>{for(const owner of owners)owner.dispose();for(const consent of consents)consent.dispose();});
 const first=owners.slice(0,8).map(owner=>owner.renew(f.id));while(calls<8)await tick();assert.equal(await owners[8].renew(f.id),false);assert.equal(calls,8);t.mock.timers.tick(5001);assert.deepEqual(await Promise.all(first),Array(8).fill(false));for(const owner of owners)owner.dispose();
 const writer=createHubMaintenanceIdentity(f.hub);assert.equal(await prepareMaintenanceIdentityConnection(writer,{request:f.saved.aiFilterVisibilityHistoryV1.entries[0].data.request,principalToken:'SYNTHETIC-unread',entitlementToken:'SYNTHETIC-unread'}),false);assert.equal(calls,8);
 for(const resolve of held)resolve({principalToken:'SYNTHETIC-unread',entitlementToken:'SYNTHETIC-unread'});await tick();await tick();const slot=reserveHubIdentityObservation(f.hub);assert.ok(slot);releaseHubIdentityObservation(f.hub,slot);writer.dispose();assert.equal(f.physical(),1);
});

test('repeated original visibility checks schedule only one bounded admission and invalidation removes it',async t=>{
 const f=await setup(t);assert.equal(await f.owner.renew(f.id),true);f.session.dispose();advanceFresh(t,f);f.owner.invalidate();const row=(await rows(f,'filterInputs')).find(r=>r.id===f.candidate.id),request={purpose:'ai-maintenance-filter-visibility',...row.aiDecision.scope,operationId:row.aiOperationId,inputId:f.candidate.id,decision:row.aiDecision};
 let queued=0;const original=globalThis.setTimeout;t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>{if(ms===0)queued++;return original(fn,ms,...args);});await Promise.all(Array.from({length:1000},()=>f.owner.resolveVisibility(null,request).catch(()=>null)));assert.equal(queued,1);assert.equal(f.owner.status().scheduled,1);f.owner.invalidate();assert.equal(f.owner.status().scheduled,0);assert.equal(f.physical(),1);
});
test('fresh processing receipt accessor is rejected without evaluating it',async t=>{
 let reads=0;const f=await setup(t,{alter:({configuration})=>{const original=configuration.processing.resolve;configuration.processing.resolve=async(tx,r)=>{const result=await original(tx,r);if(r.purpose!=='ai-filter-visibility-qualification')return result;return {...result,get epoch(){reads++;return 'SYNTHETIC-untrusted';}};};}});assert.equal(await f.owner.renew(f.id),false);assert.equal(reads,0);f.session.dispose();assert.equal(await visible(f),true);assert.equal(f.physical(),1);
});
test('cold worker repeated original visibility reads queue one history load and no issuer work',async t=>{
 const f=await setup(t);f.session.dispose();f.owner.dispose();const owner=createAIFilterVisibilityOwner({getStore:()=>f.s,consent:f.filterConsent,policy,configuration:f.configuration,hub:f.hub,storage:f.storage});t.after(()=>owner.dispose());let queued=0;const original=globalThis.setTimeout;t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>{if(ms===0)queued++;return original(fn,ms,...args);});const calls=f.proofCalls();await Promise.all(Array.from({length:1000},()=>owner.resolveVisibility(null,{}).catch(()=>null)));assert.equal(queued,1);assert.equal(owner.status().scheduled,1);assert.equal(f.proofCalls(),calls);owner.dispose();assert.equal(owner.status().scheduled,0);
});
test('synchronous source expiry at admission start does not leave a settled task permanently pending',async t=>{
 const f=await setup(t);f.session.dispose();f.owner.dispose();let armed=false,calls=0;const owner=createAIFilterVisibilityOwner({getStore:()=>f.s,consent:f.filterConsent,policy,configuration:{...f.configuration,isCurrent:()=>!armed||++calls===1},hub:f.hub,storage:f.storage});t.after(()=>owner.dispose());assert.equal(await owner.load(),true);armed=true;assert.equal(await owner.renew(f.id),false);await tick();assert.deepEqual(owner.status(),{history:1,active:0,pending:0,scheduled:0});assert.equal(owner.isDrained(),true);assert.equal(f.channel.clients.filter(c=>c.listening).length,0);const slots=Array.from({length:8},()=>reserveHubIdentityObservation(f.hub));assert.ok(slots.every(Boolean));assert.equal(reserveHubIdentityObservation(f.hub),null);for(const slot of slots)releaseHubIdentityObservation(f.hub,slot);armed=false;const wall=Date.now()+6000;t.mock.method(Date,'now',()=>wall);assert.equal(await owner.renew(f.id),true);assert.equal(owner.status().active,1);assert.equal(owner.status().pending,0);owner.dispose();assert.equal(owner.isDrained(),true);assert.equal(f.channel.clients.filter(c=>c.listening).length,0);
});
