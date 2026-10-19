import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {isAIFilterConsentSnapshotCurrent} from '../../../extension/background/ai-filter-consent.js';
import {readMaintenanceFilterCapability} from '../../../extension/core/ai-usage/maintenance-service-client.js';
import {createClientIdentityCurrentnessTransport,identityMatchesCurrentnessConnectionFacts} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
import {createMaintenanceIdentityChannelCurrentness,maintenanceIdentityCurrentnessFacts} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';

test('original consent snapshot tail facts are branded and do not call its public currentness method',async t=>{
 const f=await maintenanceServiceFixture(t,{filter:true});t.after(()=>f.session.dispose());const receipt=f.filterConsent.capture();assert.ok(receipt);let calls=0;f.filterConsent.isCurrent=()=>{calls++;throw Error('SYNTHETIC_CALLBACK_MUST_NOT_RUN');};
 assert.equal(isAIFilterConsentSnapshotCurrent(receipt),true);assert.equal(isAIFilterConsentSnapshotCurrent({...receipt}),false);assert.equal(isAIFilterConsentSnapshotCurrent(Object.freeze({optIn:true,remoteProcessing:true,generation:receipt.generation})),false);assert.equal(calls,0);
 f.filterConsent.invalidate();assert.equal(isAIFilterConsentSnapshotCurrent(receipt),false);assert.equal(calls,0);
});
for(const mutation of ['disconnect','transport dispose'])test('actual source channel tail facts reject synchronous final issuer '+mutation+' with no callback refresh',async t=>{
 let channel,transport,identity,view=null,armed=false,checks=0,changed=false,clocks=0;
 const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,server,filterIdentity,filterRuntime,local})=>{
  filterIdentity.dispose();channel=identityChannelFixture({authority:server});const clock=configuration.clock;configuration.clock=()=>{clocks++;return clock();};
  transport=createClientIdentityCurrentnessTransport({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:r=>channel.handler(r)});identity=createMaintenanceIdentityChannelCurrentness({origin:configuration.origin,clock:configuration.clock,transport});configuration.filterIdentity=identity;
  const processing=configuration.processing;configuration.processing={resolve:processing.resolve,isCurrent:(raw,store)=>{if(armed&&raw.scope.purpose==='ai-maintenance-filter-qualification'&&++checks===2){armed=false;changed=true;if(mutation==='disconnect')identity.disconnect();else transport.dispose();}return processing.isCurrent(raw,store);}};
  configuration.service.filter={...filterRuntime.serviceFilter,retainPublication(cap,publication){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,publication);}};
 }});t.after(()=>{f.session.dispose();channel.close();});assert.equal((await f.run()).state,'COMMITTED');assert.ok(view);assert.equal(view.isVisibilityCurrent(),true);
 const before=clocks;assert.equal(maintenanceIdentityCurrentnessFacts(identity,view.identity,f.server.now),true);assert.equal(maintenanceIdentityCurrentnessFacts({...identity},view.identity,f.server.now),false);assert.equal(maintenanceIdentityCurrentnessFacts(identity,{...view.identity},f.server.now),false);assert.equal(identityMatchesCurrentnessConnectionFacts({isCurrent:()=>true},transport,view.identity),false);assert.equal(clocks,before);
 armed=true;assert.equal(view.isVisibilityCurrent(),false);assert.equal(changed,true);const after=clocks;assert.equal(maintenanceIdentityCurrentnessFacts(identity,view.identity,f.server.now),false);assert.equal(clocks,after);assert.equal(f.physical(),1);
});
