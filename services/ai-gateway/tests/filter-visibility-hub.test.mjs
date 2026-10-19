import test from 'node:test';
import assert from 'node:assert/strict';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createIdentityCurrentnessHub,createHubMaintenanceIdentity,reserveHubIdentityObservation,releaseHubIdentityObservation,openHubIdentityObservation,readHubIdentityObservation,identityCurrentnessHubOrigin} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
import {prepareMaintenanceIdentityConnection,claimMaintenanceIdentityChannel} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
const tick=()=>new Promise(r=>setImmediate(r));
function setup(t,{send=null}={}){const f=identityChannelFixture();t.after(f.close);let calls=0;const hub=createIdentityCurrentnessHub({endpoint:'https://synthetic.invalid/api/identity-currentness',clock:()=>f.now,fetch:r=>{calls++;return send?send(r,f):f.handler(r);}});t.after(()=>hub.dispose());return {...f,hub,calls:()=>calls};}
test('one exact hub shares eight slots between original write currentness and pending readonly proofs',async t=>{
 const f=setup(t),write=createHubMaintenanceIdentity(f.hub);assert.equal(await prepareMaintenanceIdentityConnection(write,f.bundle),true);const tickets=Array.from({length:7},()=>reserveHubIdentityObservation(f.hub));assert.ok(tickets.every(Boolean));assert.equal(reserveHubIdentityObservation(f.hub),null);assert.equal(f.calls(),1);
 write.dispose();const next=reserveHubIdentityObservation(f.hub);assert.ok(next);assert.equal(reserveHubIdentityObservation(f.hub),null);for(const r of [...tickets,next])assert.equal(releaseHubIdentityObservation(f.hub,r),true);assert.ok(reserveHubIdentityObservation(f.hub));
});
test('client lifecycle release closes only its own channel, leaving an independently observed readonly connection current',async t=>{
 const f=setup(t),write=createHubMaintenanceIdentity(f.hub);assert.equal(await prepareMaintenanceIdentityConnection(write,f.bundle),true);const ticket=reserveHubIdentityObservation(f.hub),connection=await openHubIdentityObservation(f.hub,ticket,f.bundle);assert.ok(readHubIdentityObservation(f.hub,connection));
 const release=claimMaintenanceIdentityChannel(write);release();assert.equal(f.released.length,1);assert.equal(connection.isCurrent(),true);assert.ok(readHubIdentityObservation(f.hub,connection));f.hub.dispose();assert.equal(connection.isCurrent(),false);assert.equal(f.released.length,2);
});
test('copied/foreign/consumed reservation cannot open or steal another hub slot',async t=>{
 const a=setup(t),b=setup(t),ticket=reserveHubIdentityObservation(a.hub);assert.equal(await openHubIdentityObservation(a.hub,{...ticket},a.bundle),null);assert.equal(await openHubIdentityObservation(b.hub,ticket,a.bundle),null);assert.equal(releaseHubIdentityObservation(b.hub,ticket),false);
 const connection=await openHubIdentityObservation(a.hub,ticket,a.bundle);assert.ok(connection);assert.equal(await openHubIdentityObservation(a.hub,ticket,a.bundle),null);assert.equal(releaseHubIdentityObservation(a.hub,ticket),false);assert.equal(b.calls(),0);
});
test('unsettled abort-ignoring write fetches block readonly ninth acquisition until actual completion',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const held=[];const f=setup(t,{send:r=>new Promise(resolve=>held.push({r,resolve}))}),writers=[];
 for(let i=0;i<8;i++){const owner=createHubMaintenanceIdentity(f.hub);writers.push(owner);const opening=prepareMaintenanceIdentityConnection(owner,{...f.bundle,request:{...f.request,operationId:'SYNTHETIC-held-'+i}});while(f.calls()<i+1)await tick();t.mock.timers.tick(5001);assert.equal(await opening,false);owner.dispose();}
 assert.equal(f.calls(),8);assert.equal(reserveHubIdentityObservation(f.hub),null);for(const h of held)h.resolve(new Response('',{status:503}));await tick();assert.ok(reserveHubIdentityObservation(f.hub));
});
test('pending pre-proof slots remain bounded until explicitly settled and cannot be reused twice',async t=>{
 const f=setup(t),tickets=Array.from({length:8},()=>reserveHubIdentityObservation(f.hub));assert.ok(tickets.every(Boolean));assert.equal(reserveHubIdentityObservation(f.hub),null);assert.equal(f.calls(),0);assert.equal(releaseHubIdentityObservation(f.hub,tickets[0]),true);assert.equal(releaseHubIdentityObservation(f.hub,tickets[0]),false);assert.ok(reserveHubIdentityObservation(f.hub));assert.equal(reserveHubIdentityObservation(f.hub),null);
});
test('disposed hubs cannot admit old held tickets or manufacture a writer, and old write spent protection remains',async t=>{
 const f=setup(t),writer=createHubMaintenanceIdentity(f.hub);assert.equal(await prepareMaintenanceIdentityConnection(writer,f.bundle),true);f.notify();await tick();assert.equal(await prepareMaintenanceIdentityConnection(writer,f.bundle),false);const ticket=reserveHubIdentityObservation(f.hub);f.hub.dispose();assert.equal(await openHubIdentityObservation(f.hub,ticket,f.bundle),null);assert.equal(createHubMaintenanceIdentity(f.hub),null);assert.equal(identityCurrentnessHubOrigin(f.hub),null);
});
