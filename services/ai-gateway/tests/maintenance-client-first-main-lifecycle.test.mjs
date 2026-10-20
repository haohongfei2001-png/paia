import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {assertMaintenanceProcessingReceipt} from '../../../extension/core/ai-usage/maintenance-processing-receipt.js';
import {readMaintenanceFilterCapability} from '../../../extension/core/ai-usage/maintenance-service-client.js';
const acks=f=>f.s.repository.transaction(false,async tx=>(await tx.all('organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED'));
test('fixed first-main original non-branded processing path reaches actual Filter ACK and private visibility',async t=>{let view;const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,filterRuntime,local})=>{configuration.service.filter={...filterRuntime.serviceFilter,retainPublication(cap,p){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,p);}};}});t.after(()=>f.session.dispose());assert.equal((await f.run()).state,'COMMITTED');assert.equal((await acks(f)).length,1);assert.equal(f.physical(),1);assert.equal(view.isVisibilityCurrent(),true);});
// The first-main refusal recorded the former receipt clone boundary. The
// original issuer object now remains exact; copied or foreign uses still fail.
test('original raw WeakSet issuer reaches exact Filter ACK while copied and foreign receipt uses stay refused',async t=>{
 const known=new WeakSet(),issued=[],checks=[];let processing,view;
 const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,filterRuntime,local})=>{
  const original=configuration.processing;
  processing={resolve:async(tx,scope)=>{const raw=Object.freeze(await original.resolve(tx,scope));known.add(raw);issued.push(raw);return raw;},isCurrent:(raw,store)=>{checks.push({known:known.has(raw),sameStore:store===local.s});return known.has(raw)&&original.isCurrent(raw,store);}};
  configuration.processing=processing;
  configuration.service.filter={...filterRuntime.serviceFilter,retainPublication(cap,p){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,p);}};
 }});t.after(()=>f.session.dispose());
 assert.equal((await f.run()).state,'COMMITTED');assert.equal((await acks(f)).length,1);assert.equal(f.physical(),1);
 assert.ok(checks.length>0);assert.ok(checks.every(x=>x.known&&x.sameStore),'every issuer invocation receives its exact original raw and store');
 const raw=issued.find(x=>x.scope.purpose==='ai-maintenance-filter-qualification');assert.ok(raw);assert.equal(assertMaintenanceProcessingReceipt(raw,processing,f.s),true);
 for(const kind of ['same-field clone','foreign store','foreign issuer']){
  const before=checks.length;let foreignCalls=0;
  const receipt=kind==='same-field clone'?Object.freeze({...raw}):raw,store=kind==='foreign store'?{repository:f.s.repository}:f.s,issuer=kind==='foreign issuer'?{...processing,isCurrent:()=>{foreignCalls++;return true;}}:processing;
  assert.throws(()=>assertMaintenanceProcessingReceipt(receipt,issuer,store),{code:'UNAVAILABLE'});assert.equal(checks.length,before,'foreign use fails before original issuer');assert.equal(foreignCalls,0);
 }
 assert.equal(view.isVisibilityCurrent(),true);assert.equal((await acks(f)).length,1);assert.equal(f.physical(),1);
});
test('a same-field raw receipt clone is refused by the original WeakSet issuer before any paid request or Filter capability',async t=>{
 const known=new WeakSet(),checks=[];
 const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration})=>{const original=configuration.processing;configuration.processing={resolve:async(tx,scope)=>{const raw=Object.freeze(await original.resolve(tx,scope));known.add(raw);return Object.freeze({...raw});},isCurrent:(raw,store)=>{checks.push(known.has(raw));return known.has(raw)&&original.isCurrent(raw,store);}};}});t.after(()=>f.session.dispose());
 assert.notEqual((await f.run()).state,'COMMITTED');assert.ok(checks.includes(false));assert.equal((await acks(f)).length,0);assert.equal(f.physical(),0);assert.equal(f.calls.filter(x=>x.path==='/api/provider').length,0);
});
for(const branch of ['write','visibility'])for(const mutation of ['consent invalidation','client disposal','identity revoke'])test('fixed first-main source '+branch+' rejects original final issuer '+mutation,async t=>{
 let armed=false,changed=false,accepted=null,view=null,f;
 f=await maintenanceServiceFixture(t,{filter:true,exposeRemote:true,configure:({configuration,filterRuntime,filterConsent,filterIdentity,local})=>{const original=configuration.processing;configuration.processing={resolve:original.resolve,isCurrent:(raw,store)=>{if(armed&&raw.scope.purpose==='ai-maintenance-filter-qualification'){armed=false;changed=true;if(mutation==='consent invalidation')filterConsent.invalidate();else if(mutation==='identity revoke')assert.equal(filterIdentity.revoke(view.identity),true);else f.remote.dispose();}return original.isCurrent(raw,store);}};configuration.service.filter={...filterRuntime.serviceFilter,authorizeReservation(cap,scope){const result=filterRuntime.serviceFilter.authorizeReservation(cap,scope);if(branch==='write'){view=readMaintenanceFilterCapability(cap,local.s);assert.ok(view);armed=true;accepted=view.isCurrent();}return result;},retainPublication(cap,p){view=readMaintenanceFilterCapability(cap,local.s);return filterRuntime.serviceFilter.retainPublication(cap,p);}};}});t.after(()=>f.session.dispose());const result=await f.run();
 if(branch==='visibility'){assert.equal(result.state,'COMMITTED');assert.ok(view);assert.equal(view.isVisibilityCurrent(),true);armed=true;accepted=view.isVisibilityCurrent();assert.equal(f.physical(),1);}else{assert.notEqual(result.state,'COMMITTED');assert.equal((await acks(f)).length,0);assert.ok(f.physical()<=1);}
 assert.equal(changed,true);assert.equal(accepted,false);
});
