import test from 'node:test';
import assert from 'node:assert/strict';
import {identityConfigHash} from '../postgres-authority.mjs';
import {filterReadFixture} from './filter-read-identity-fixture.mjs';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {filterReadRequestBindingHash} from '../signed-identity.mjs';
import {createClientIdentityCurrentnessTransport,readClientIdentityCurrentnessConnection,readClientFilterReadIdentityConnection,identityMatchesCurrentnessConnection,clientIdentityCurrentnessTransportDrained,readClientIdentityCurrentnessConnectionFacts,readClientFilterReadIdentityConnectionFacts} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
import {createIdentityCurrentnessHub,reserveHubIdentityObservation,openHubIdentityObservation,openHubFilterReadIdentityObservation,readHubIdentityObservation,readHubFilterReadIdentityObservation,identityCurrentnessHubDrained,readHubIdentityObservationFacts,readHubFilterReadIdentityObservationFacts} from '../../../extension/core/ai-usage/identity-currentness-hub.js';
const url='https://synthetic.invalid/api/identity-currentness',tick=()=>new Promise(r=>setImmediate(r)),signal=()=>new AbortController().signal;
export function readChannelFixture(options={}){
 const r=filterReadFixture(),authority={now:r.now,identityConfig:r.config,profileId:'synthetic-profile',control:{profile_id:'synthetic-profile',identity_config_hash:identityConfigHash(r.config),generation:'synthetic-control',enabled:true,expires_at_ms:String(r.now+300000)},principal:q=>({security:r.security(q)}),bundle:(q,p)=>r.financialBundle(q,p)};
 const f=identityChannelFixture({...options,authority});f.principals.set(r.request.principalId+'/'+r.request.libraryId,{security:r.security(r.request)});
 return {...f,readRequest:r.request,readBundle:r.bundle(),readFixture:r};
}
function transport(f,fetch=q=>f.handler(q)){return createClientIdentityCurrentnessTransport({endpoint:url,fetch,clock:()=>f.now});}
test('new action is verified by original security owner without ledger reservation and yields private read-only observation',async t=>{
 const f=readChannelFixture();t.after(f.close);let calls=0;const tr=transport(f,async q=>{calls++;const data=await q.clone().json();assert.equal(data.action,'observe-filter-read');return f.handler(q);});t.after(()=>tr.dispose());
 const c=await tr.openFilterRead(f.readBundle);assert.ok(c?.isCurrent());const m=readClientFilterReadIdentityConnection(c,tr);assert.deepEqual(m.request,f.readRequest);assert.equal(m.identity.readRequestHash,filterReadRequestBindingHash(f.readRequest));assert.equal(m.identity.verifiedUntil,f.now+60000);
 assert.equal(readClientIdentityCurrentnessConnection(c,tr),null);assert.equal(identityMatchesCurrentnessConnection(c,tr,m.identity),false);assert.equal(readClientFilterReadIdentityConnection({...c},tr),null);
 assert.equal(f.clients[0].transaction,false);assert.ok(f.calls.every(x=>!x.sql.includes('budget_snapshot')&&!x.sql.includes('operation_evidence')&&!x.sql.includes('request_authority')));
 f.notify();await tick();assert.equal(c.isCurrent(),false);assert.equal(calls,1);assert.equal(f.released.length,1);
});
test('financial connection is rejected by read reader and mixed token/action requests fail closed',async t=>{
 const f=readChannelFixture();t.after(f.close);const tr=transport(f);t.after(()=>tr.dispose());const c=await tr.open(f.bundle);assert.ok(c?.isCurrent());assert.equal(readClientFilterReadIdentityConnection(c,tr),null);
 assert.equal(await tr.openFilterRead(f.bundle),null);assert.equal(await tr.open(f.readBundle),null);
 for(const [action,bundle] of [['observe-filter-read',{...f.readBundle,principalToken:f.bundle.principalToken,entitlementToken:f.bundle.entitlementToken}],['observe',{...f.bundle,principalToken:f.readBundle.principalToken,entitlementToken:f.readBundle.entitlementToken}],['observe',f.readBundle],['observe-filter-read',f.bundle]]){
  const response=await f.handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...bundle})}));assert.ok([400,503].includes(response.status));const value=await response.json();assert.equal(value.financialAuthority,false);assert.equal(value.dispatchAllowed,false);assert.equal(value.retryAllowed,false);
 }
});
for(const key of ['libraryId','readerSessionId','consentEpoch','localBindingHash','policyId'])test(`real channel denies old proof with changed ${key}`,async t=>{
 const f=readChannelFixture();t.after(f.close);const tr=transport(f);t.after(()=>tr.dispose());const request={...f.readRequest,[key]:key==='localBindingHash'?'b'.repeat(64):'changed'};assert.equal(await tr.openFilterRead({...f.readBundle,request}),null);assert.ok(f.clients.every(c=>!c.listening));
});
for(const stage of ['LISTEN','snapshot','last COMMIT'])test(`read admission closes on deny-only notification during ${stage}`,async t=>{
 let commits=0;const f=readChannelFixture({hook:({client,sql})=>{if(sql==='COMMIT')commits++;if(stage==='LISTEN'&&sql.startsWith('LISTEN ')||stage==='snapshot'&&sql.includes('FROM paia_ai_private.principal_authority')||stage==='last COMMIT'&&sql==='COMMIT'&&commits===2)client.emit('notification',{channel:'paia_identity_invalidated_v1'});}});t.after(f.close);
 assert.equal(await f.primary.openFilterRead(f.readBundle,{signal:signal()}),null);assert.equal(f.released.length,1);
});
for(const kind of ['disabled','security generation','expiry','unsafe trigger'])test(`read purpose preserves original ${kind} denial`,async t=>{
 const f=readChannelFixture({hook:({sql,attestation})=>{if(kind==='unsafe trigger'&&sql.includes('SELECT c.relname')){const rows=attestation();rows[0].tgenabled='D';return {rows};}}});t.after(f.close);
 if(kind==='disabled')f.control.enabled=false;if(kind==='security generation')f.principals.get(f.readRequest.principalId+'/'+f.readRequest.libraryId).security.principalGeneration='changed';if(kind==='expiry')f.setClock(f.now+60000);
 assert.equal(await f.primary.openFilterRead(f.readBundle,{signal:signal()}),null);assert.ok(f.clients.every(c=>!c.listening));
});
test('paid and new read-purpose observations share all eight source hub slots and disjoint branded readers',async t=>{
 const f=readChannelFixture();t.after(f.close);const hub=createIdentityCurrentnessHub({endpoint:url,fetch:q=>f.handler(q),clock:()=>f.now});t.after(()=>hub.dispose());const list=[];
 for(let n=0;n<8;n++){const ticket=reserveHubIdentityObservation(hub);assert.ok(ticket);const read=n%2===1,c=await (read?openHubFilterReadIdentityObservation:openHubIdentityObservation)(hub,ticket,read?f.readBundle:f.bundle);assert.ok(c?.isCurrent());list.push(c);assert.ok((read?readHubFilterReadIdentityObservation:readHubIdentityObservation)(hub,c));assert.equal((read?readHubIdentityObservation:readHubFilterReadIdentityObservation)(hub,c),null);assert.equal(await openHubFilterReadIdentityObservation(hub,ticket,f.readBundle),null);}
 assert.equal(reserveHubIdentityObservation(hub),null);assert.equal(f.clients.length,8);list[0].close();await tick();const ticket=reserveHubIdentityObservation(hub);assert.ok(ticket);const c=await openHubFilterReadIdentityObservation(hub,ticket,f.readBundle);assert.ok(c.isCurrent());assert.equal(f.clients.length,9);hub.dispose();await tick();assert.equal(identityCurrentnessHubDrained(hub),true);assert.equal(f.released.length,9);
});
test('read and financial held fetches keep the shared eight occupied after dispose until actual settlement',async t=>{
 const f=readChannelFixture();t.after(f.close);const held=[];const hub=createIdentityCurrentnessHub({endpoint:url,fetch:q=>new Promise(resolve=>held.push({q,resolve})),clock:()=>f.now});const work=[];
 for(let n=0;n<8;n++){const ticket=reserveHubIdentityObservation(hub);assert.ok(ticket);work.push((n%2?openHubFilterReadIdentityObservation:openHubIdentityObservation)(hub,ticket,n%2?f.readBundle:f.bundle));}
 await tick();assert.equal(held.length,8);assert.equal(reserveHubIdentityObservation(hub),null);hub.dispose();assert.deepEqual(await Promise.all(work),Array(8).fill(null));assert.equal(identityCurrentnessHubDrained(hub),false);assert.ok(held.every(h=>h.q.signal.aborted));for(const h of held)h.resolve(new Response('',{status:503}));await tick();assert.equal(identityCurrentnessHubDrained(hub),true);
});
test('old unobserved held response cannot publish after the read transport was disposed',async t=>{
 const f=readChannelFixture();t.after(f.close);let release;const tr=transport(f,q=>new Promise(resolve=>{release=async()=>resolve(await f.handler(q));}));const p=tr.openFilterRead(f.readBundle);await tick();tr.dispose();assert.equal(await p,null);assert.equal(clientIdentityCurrentnessTransportDrained(tr),false);await release();await tick();assert.equal(clientIdentityCurrentnessTransportDrained(tr),true);assert.ok(f.clients.every(c=>!c.listening));
});
for(const field of ['readerSessionId','consentEpoch','localBindingHash','policyId','readRequestHash'])test(`transport does not accept a ready frame with wrong ${field}`,async t=>{
 const f=readChannelFixture();t.after(f.close);const tr=transport(f,async q=>{const response=await f.handler(q),reader=response.body.getReader(),first=await reader.read(),v=JSON.parse(new TextDecoder().decode(first.value));v.identity[field]='foreign';return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify(v)+'\n'));},cancel(){return reader.cancel();}}),{headers:{'content-type':'application/x-ndjson'}});});t.after(()=>tr.dispose());assert.equal(await tr.openFilterRead(f.readBundle),null);await tick();assert.ok(f.clients.every(c=>!c.listening));
});

for(const read of [false,true])test((read?'read-purpose':'financial')+' final connection facts preserve private brand and sample all expiry bounds without clock callbacks',async t=>{
 const f=readChannelFixture();t.after(f.close);let clocks=0;const tr=createClientIdentityCurrentnessTransport({endpoint:url,fetch:q=>f.handler(q),clock:()=>{clocks++;return f.now;}});t.after(()=>tr.dispose());const c=await (read?tr.openFilterRead(f.readBundle):tr.open(f.bundle)),reader=read?readClientFilterReadIdentityConnection:readClientIdentityCurrentnessConnection,facts=read?readClientFilterReadIdentityConnectionFacts:readClientIdentityCurrentnessConnectionFacts,other=read?readClientIdentityCurrentnessConnectionFacts:readClientFilterReadIdentityConnectionFacts;
 const m=reader(c,tr);assert.ok(m);const before=clocks;assert.equal(facts(c,tr,f.now),m);assert.equal(other(c,tr,f.now),null);assert.equal(facts({...c},tr,f.now),null);assert.equal(facts(c,{...tr},f.now),null);assert.equal(facts(c,tr,f.now-1),null);assert.equal(facts(c,tr,f.now+3000),null);assert.equal(facts(c,tr,m.identity.verifiedUntil),null);assert.equal(clocks,before);c.close();assert.equal(facts(c,tr,f.now),null);assert.equal(clocks,before);
});
for(const read of [false,true])test((read?'read-purpose':'financial')+' final hub facts reject foreign purpose and disposed original hub without invoking a clock',async t=>{
 const f=readChannelFixture();t.after(f.close);let clocks=0;const hub=createIdentityCurrentnessHub({endpoint:url,fetch:q=>f.handler(q),clock:()=>{clocks++;return f.now;}});t.after(()=>hub.dispose());const ticket=reserveHubIdentityObservation(hub),c=await(read?openHubFilterReadIdentityObservation:openHubIdentityObservation)(hub,ticket,read?f.readBundle:f.bundle),reader=read?readHubFilterReadIdentityObservation:readHubIdentityObservation,facts=read?readHubFilterReadIdentityObservationFacts:readHubIdentityObservationFacts,other=read?readHubIdentityObservationFacts:readHubFilterReadIdentityObservationFacts;
 const m=reader(hub,c);assert.ok(m);const before=clocks;assert.equal(facts(hub,c,f.now),m);assert.equal(other(hub,c,f.now),null);assert.equal(facts({...hub},c,f.now),null);assert.equal(facts(hub,{...c},f.now),null);assert.equal(clocks,before);hub.dispose();assert.equal(facts(hub,c,f.now),null);assert.equal(clocks,before);
});
