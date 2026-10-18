import test from 'node:test';
import assert from 'node:assert/strict';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {withMaintenanceIdentityCurrentness,prepareMaintenanceIdentityConnection,createMaintenanceIdentityCurrentness} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
import {createMaintenanceServiceClient} from '../../../extension/core/ai-usage/maintenance-service-client.js';
const tick=()=>new Promise(r=>setImmediate(r));
async function setup(t){
 const f=identityChannelFixture();t.after(f.close);let invalidate;
 const base={origin:'https://synthetic.invalid',scope:'synthetic',contractVersion:'synthetic-v1',routeVersion:'synthetic-v1',service:{version:1,topic:{},context:{}},processing:{},clock:()=>f.now,
  fetch:r=>f.handler(r),resolveAuthority:()=>null,isCurrent:()=>true,onInvalidate:fn=>{invalidate=fn;return ()=>{};},readProfile:()=>null,currentProfile:()=>null,tokenize:()=>null,isCurrentTokenizer:()=>true,readProofs:()=>null};
 const config=withMaintenanceIdentityCurrentness(base,base.origin+'/api/identity-currentness');t.after(()=>config.filterIdentity.dispose());
 assert.equal(await prepareMaintenanceIdentityConnection(config.filterIdentity,f.bundle),true);assert.equal(f.released.length,0);
 return {f,config,invalidate:()=>invalidate()};
}
for(const event of ['dispose','invalidate'])test('actual source client '+event+' immediately closes its production metadata listener',async t=>{
 const x=await setup(t),client=createMaintenanceServiceClient(x.config);assert.ok(client);client.onInvalidate(()=>{});
 if(event==='dispose')client.dispose();else x.invalidate();await tick();assert.equal(x.f.released.length,1);assert.equal(x.f.released[0].discard,true);assert.equal(x.config.filterIdentity.beginObservation(x.f.request),null);
});
test('failed source client construction closes an unclaimed production owner',async t=>{
 const x=await setup(t);assert.equal(createMaintenanceServiceClient({...x.config,unexpected:true}),null);await tick();assert.equal(x.f.released.length,1);
});
test('two source clients cannot share and prematurely dispose a single production owner',async t=>{
 const x=await setup(t),first=createMaintenanceServiceClient(x.config);assert.ok(first);const second=createMaintenanceServiceClient(x.config);assert.equal(second,null);assert.equal(x.f.released.length,0);first.dispose();await tick();assert.equal(x.f.released.length,1);
});
test('source client disposal does not own a caller-shared neutral protocol connection',async t=>{
 const x=await setup(t),neutral=createMaintenanceIdentityCurrentness({origin:x.config.origin,clock:x.config.clock});t.after(()=>neutral.dispose());assert.equal(neutral.connect({isCurrent:()=>true,onInvalidate:()=>()=>{}}),true);
 const client=createMaintenanceServiceClient({...x.config,filterIdentity:neutral});assert.ok(client);client.dispose();assert.ok(neutral.beginObservation(x.f.request));
});
