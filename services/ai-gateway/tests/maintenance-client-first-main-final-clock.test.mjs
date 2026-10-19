import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {readMaintenanceFilterCapability} from '../../../extension/core/ai-usage/maintenance-service-client.js';
import {createClientIdentityCurrentnessTransport} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
import {createMaintenanceIdentityChannelCurrentness} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
for(const branch of ['write','visibility'])for(const mutation of ['consent','dispose','revoke','abort'])test('first-main '+branch+' final clock callback '+mutation+' is rejected by the pure facts tail',async t=>{
 let client,view,armed=false,clockArmed=false,changed=false,accepted=null,getters=0;
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,configure:({configuration,server,filterRuntime,filterConsent,filterIdentity,local})=>{
  const original=configuration.processing,clock=configuration.clock;configuration.clock=()=>{if(clockArmed){clockArmed=false;changed=true;if(mutation==='consent')filterConsent.invalidate();else if(mutation==='dispose')client.dispose();else if(mutation==='revoke')filterIdentity.revoke(view.identity);else{Object.defineProperty(local.contextAbort.signal,'aborted',{configurable:true,get(){getters++;return false;}});local.contextAbort.abort();}}return clock();};
  configuration.processing={resolve:original.resolve,isCurrent:(raw,s)=>{if(armed&&raw.scope.purpose==='ai-maintenance-filter-qualification'){armed=false;clockArmed=true;}return original.isCurrent(raw,s);}};
  configuration.service.filter={...filterRuntime.serviceFilter,authorizeReservation(cap,scope){const result=filterRuntime.serviceFilter.authorizeReservation(cap,scope);if(branch==='write'){view=readMaintenanceFilterCapability(cap,local.s);assert.ok(view);armed=true;accepted=view.isCurrent();}return result;},retainPublication(cap,p){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,p);}};
 }});client=f.remote;t.after(()=>f.session.dispose());const result=await f.run();if(branch==='visibility'){assert.equal(result.state,'COMMITTED');assert.equal(view.isVisibilityCurrent(),true);armed=true;accepted=view.isVisibilityCurrent();}assert.equal(changed,true);assert.equal(accepted,false);assert.equal(getters,0);assert.equal(f.physical(),branch==='visibility'?1:mutation==='dispose'||mutation==='abort'?0:1);
});
for(const branch of ['write','visibility'])test('first-main '+branch+' final issuer crosses production channel pulse deadline before timers',async t=>{
 let channel,view,armed=false,changed=false,accepted=null;
 const f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,configure:({configuration,server,filterRuntime,filterIdentity,local})=>{
  filterIdentity.dispose();channel=identityChannelFixture({authority:server});const transport=createClientIdentityCurrentnessTransport({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:r=>channel.handler(r)});configuration.filterIdentity=createMaintenanceIdentityChannelCurrentness({origin:configuration.origin,clock:configuration.clock,transport});
  const original=configuration.processing;configuration.processing={resolve:original.resolve,isCurrent:(raw,s)=>{if(armed&&raw.scope.purpose==='ai-maintenance-filter-qualification'){armed=false;changed=true;server.now+=3000;assert.ok(server.now<view.identity.verifiedUntil);}return original.isCurrent(raw,s);}};
  configuration.service.filter={...filterRuntime.serviceFilter,authorizeReservation(cap,scope){const result=filterRuntime.serviceFilter.authorizeReservation(cap,scope);if(branch==='write'){view=readMaintenanceFilterCapability(cap,local.s);assert.ok(view);armed=true;accepted=view.isCurrent();}return result;},retainPublication(cap,p){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,p);}};
 }});t.after(()=>{f.session.dispose();channel.close();});const result=await f.run();if(branch==='visibility'){assert.equal(result.state,'COMMITTED');assert.equal(view.isVisibilityCurrent(),true);armed=true;accepted=view.isVisibilityCurrent();}assert.equal(changed,true);assert.equal(accepted,false);assert.ok(f.physical()<=1);
});
