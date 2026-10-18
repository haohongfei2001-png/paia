import test from 'node:test';
import assert from 'node:assert/strict';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {createClientIdentityCurrentnessTransport,readClientIdentityCurrentnessConnection} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
import {createMaintenanceIdentityChannelCurrentness,prepareMaintenanceIdentityConnection} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
const rows=(f,name)=>f.s.repository.transaction(false,t=>t.all(name));
const filterAck=async f=>(await rows(f,'organizerWorkItems')).filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED');
const visible=async f=>(await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id);
const tick=()=>new Promise(r=>setImmediate(r));
async function source(t,options={}){
 let channel,identity,transport,metadataCalls=0;
 const f=await maintenanceServiceFixture(t,{filter:true,...options,configure:async context=>{
  const {configuration,server,filterIdentity}=context;filterIdentity.dispose();channel=identityChannelFixture({authority:server});
  transport=createClientIdentityCurrentnessTransport({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:request=>{metadataCalls++;return channel.handler(request);}});
  identity=createMaintenanceIdentityChannelCurrentness({origin:configuration.origin,clock:configuration.clock,transport});configuration.filterIdentity=identity;
  await options.configure?.({...context,channel,identity});
 }});t.after(()=>{identity.dispose();channel.close();f.session.dispose();});
 return {...f,channel,identity,metadataCalls:()=>metadataCalls};
}
test('actual source uses one extra metadata channel and original two status queries for exact Filter ACK/visibility',async t=>{
 const f=await source(t);assert.equal(f.identity.connect({isCurrent:()=>true,onInvalidate:()=>()=>{}}),false);
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal((await filterAck(f)).length,1);assert.equal(await visible(f),false);
 assert.equal(f.metadataCalls(),1);assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,2);assert.equal(f.physical(),1);
 f.channel.notify();await tick();assert.equal(await visible(f),true);assert.equal((await filterAck(f)).length,1);
 await f.run();assert.equal(f.metadataCalls(),1);assert.equal(f.physical(),1);
});
test('post-provider channel notification denies original Filter commit without erasing spend or replaying',async t=>{
 let channel;const f=await source(t,{configure:c=>{channel=c.channel;},afterResponse:()=>channel.notify()});
 const result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
 assert.equal(f.server.saved().rows[0].settlement.outcome,'VALIDATED');assert.equal(f.physical(),1);await f.run();assert.equal(f.physical(),1);assert.equal(f.metadataCalls(),1);
});
test('unqualified currentness schema preserves finance and other facets but never authorizes Filter',async t=>{
 const f=await source(t,{configure:({channel})=>{const connect=channel.pool.connect;channel.pool.connect=async()=>{const c=await connect(),query=c.query;c.query=(sql,args)=>sql.includes('SELECT c.relname')?Promise.resolve({rows:[]}):query(sql,args);return c;};}});
 const result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.physical(),1);assert.equal(f.metadataCalls(),1);
});
test('production owner rejects unbranded/foreign channels and cannot reconnect the same completed observation',async t=>{
 const f=identityChannelFixture();t.after(f.close);const origin='https://synthetic.invalid',tr=createClientIdentityCurrentnessTransport({endpoint:origin+'/api/identity-currentness',fetch:r=>f.handler(r),clock:()=>f.now});t.after(()=>tr.dispose());
 assert.equal(createMaintenanceIdentityChannelCurrentness({origin,clock:()=>f.now,transport:{open:async()=>({isCurrent:()=>true})}}),null);
 assert.equal(createMaintenanceIdentityChannelCurrentness({origin:'https://other.invalid',transport:tr}),null);
 const owner=createMaintenanceIdentityChannelCurrentness({origin,clock:()=>f.now,transport:tr});t.after(()=>owner.dispose());assert.equal(await prepareMaintenanceIdentityConnection(owner,f.bundle),true);
 f.notify();await tick();assert.equal(await prepareMaintenanceIdentityConnection(owner,f.bundle),false);assert.equal(owner.beginObservation(f.request),null);
});
test('held source channel response cannot cross owner disconnect and mint a first observation afterwards',async t=>{
 const f=identityChannelFixture();t.after(f.close);let release,started;const held=new Promise(r=>release=r),ready=new Promise(r=>started=r),origin='https://synthetic.invalid';
 const tr=createClientIdentityCurrentnessTransport({endpoint:origin+'/api/identity-currentness',clock:()=>f.now,fetch:async r=>{const response=await f.handler(r);started();await held;return response;}});
 const owner=createMaintenanceIdentityChannelCurrentness({origin,clock:()=>f.now,transport:tr});t.after(()=>owner.dispose());
 const opening=prepareMaintenanceIdentityConnection(owner,f.bundle);await ready;owner.disconnect();release();assert.equal(await opening,false);assert.equal(owner.beginObservation(f.request),null);
 assert.equal(await prepareMaintenanceIdentityConnection(owner,f.bundle),false);
});

for(const revoke of [false,true])test('actual Filter storage rollback '+(revoke?'after channel revoke stays pending':'retries with the same live channel')+' without another HTTP admission or paid call',async t=>{
 const f=await source(t),transaction=f.s.repository.transaction.bind(f.s.repository);let failed=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(!failed&&name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED'){failed=true;throw Error('SYNTHETIC_FILTER_ACK_ROLLBACK');}return result;};}return fn(tx);},stores);
 const first=await f.run();assert.equal(first.state,'PARTIAL',JSON.stringify(first));assert.equal(failed,true);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
 if(revoke){f.channel.notify();await tick();}
 const second=await f.run();assert.equal(second.state,revoke?'PARTIAL':'COMMITTED',JSON.stringify(second));assert.equal((await filterAck(f)).length,revoke?0:1);assert.equal(await visible(f),revoke);
 assert.equal(f.physical(),1);assert.equal(f.metadataCalls(),1);assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,2);
});

for(const field of ['principalGeneration','entitlementGeneration','authorityGeneration'])test('actual status cannot borrow a channel with different '+field,async t=>{
 const f=await source(t,{configure:({configuration})=>{const send=configuration.fetch;configuration.fetch=async request=>{const response=await send(request);if(new URL(request.url).pathname!=='/api/operation-status')return response;const value=await response.json();value.authenticatedIdentity[field]='SYNTHETIC_OTHER_GENERATION';return Response.json(value);};}});
 const result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.metadataCalls(),1);assert.equal(f.physical(),1);
});

for(const boundary of ['session dispose','host invalidate'])test('actual '+boundary+' closes the source channel without relying on test cleanup',async t=>{
 const f=await source(t);assert.equal((await f.run()).state,'COMMITTED');assert.equal(f.channel.released.length,0);assert.equal(await visible(f),false);
 if(boundary==='session dispose')f.session.dispose();else f.revoke();await tick();
 assert.equal(f.channel.released.length,1);assert.equal(f.channel.released[0].discard,true);assert.equal(await visible(f),true);assert.equal(f.physical(),1);assert.equal(f.metadataCalls(),1);
});
