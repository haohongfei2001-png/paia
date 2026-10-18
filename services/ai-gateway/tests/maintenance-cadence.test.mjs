import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {createClientReservationTransport,observedClientReservationDenial} from '../../../extension/core/ai-usage/client-reservation-transport.js';
import {qwenReservationDenial} from '../../../extension/core/ai-usage/qwen-qualified-request.js';
const maintenance=id=>request(id,{jobType:'AI_MAINTENANCE',outputCap:2000,maxCompletionTokens:1990});
const transport=fetch=>createClientReservationTransport({endpoint:'https://service.invalid/api/reservations',fetch});
async function deniedCycle(){const f=fixture(),p=protocol(f),one=p.admit(maintenance('one')),two=p.admit(maintenance('two'));await p.service().reserve(one);return {f,p,one,two,handler:createGatewayHandler({service:p.service()})};}

test('only exact original server cadence rollback yields a bound private transport observation',async()=>{
 const {f,p,two,handler}=await deniedCycle(),before=structuredClone(p.saved()),client=transport(handler),reply=await client.reserve(two),proof=observedClientReservationDenial(reply,client);
 assert.equal(reply.reason,'MAINTENANCE_CADENCE');assert.deepEqual(proof.request,two.request);assert.equal(proof.observedAt,f.now);assert.equal(proof.nextEligibilityAt,f.now+8*3600000);assert.deepEqual(p.saved(),before);assert.equal(p.calls.at(-1).sql,'ROLLBACK');
 assert.equal(observedClientReservationDenial(structuredClone(reply),client),null);assert.equal(observedClientReservationDenial(reply,transport(handler)),null);assert.equal(qwenReservationDenial(reply),null);
 assert.doesNotMatch(JSON.stringify(reply),/principalToken|entitlementToken|eyJ/);
});

test('every financial request identity is bound; wrong/missing/extra denial fields and wrong HTTP remain unknown',async()=>{
 const {p,two}=await deniedCycle(),raw=await p.service().reserve(two);
 const changes=Object.keys(two.request).map(key=>v=>{v.request[key]=typeof v.request[key]==='number'?v.request[key]+1:v.request[key]+'-other';});
 changes.push(v=>{delete v.observedAt;},v=>{delete v.request;},v=>{v.nextEligibilityAt=v.observedAt;},v=>{v.observedAt=-1;},v=>{v.nextEligibilityAt=Infinity;},v=>{v.reason='BUDGET_OR_QUOTA';},v=>{v.financialAuthority=true;},v=>{v.extra=true;});
 for(const change of changes){const value=structuredClone(raw);change(value);const client=transport(async()=>Response.json(value,{status:503})),reply=await client.reserve(two);assert.equal(reply.decision,'outcome_unknown');assert.equal(observedClientReservationDenial(reply,client),null);}
 for(const status of [200,400,500]){const client=transport(async()=>Response.json(raw,{status}));assert.equal((await client.reserve(two)).decision,'outcome_unknown');}
 const lost=transport(async()=>{throw Error('SYNTHETIC lost ACK');});assert.equal((await lost.reserve(two)).decision,'outcome_unknown');
 const other=transport(async()=>Response.json(raw,{status:503}));assert.equal((await other.reserve({...two,request:{...two.request,jobType:'AI_ORGANIZE'}})).decision,'outcome_unknown');
});

test('existing RESERVED, DISPATCHED and UNKNOWN holds never become cadence denials or releases',async()=>{
 for(const state of ['RESERVED','DISPATCHED','OUTCOME_UNKNOWN']){
  const {p,one,two}=await deniedCycle();if(state!=='RESERVED'){p.event(one.request,'dispatch','DISPATCHED');await p.service().record(one,'dispatch');}if(state==='OUTCOME_UNKNOWN'){p.event(one.request,'unknown','OUTCOME_UNKNOWN');await p.service().record(one,'unknown');}
  const before=structuredClone(p.saved()),client=transport(createGatewayHandler({service:p.service()})),same=await client.reserve(one);assert.equal(observedClientReservationDenial(same,client),null);assert.deepEqual(p.saved(),before);
  const denied=await client.reserve(two);assert.equal(denied.reason,'MAINTENANCE_CADENCE');assert.deepEqual(p.saved(),before);
 }
});

test('server rollback and lost negative ACK grant no local retirement or next-window authority',async()=>{
 const {f,p,two,handler}=await deniedCycle(),before=structuredClone(p.saved());p.setSaved({...before,lastNow:f.now+1});const client=transport(handler),reply=await client.reserve(two);assert.equal(reply.decision,'outcome_unknown');assert.equal(observedClientReservationDenial(reply,client),null);assert.equal(p.saved().lastNow,f.now+1);
 p.setSaved(before);const lost=transport(async r=>{await handler(r);throw Error('SYNTHETIC lost cadence denial');});assert.equal((await lost.reserve(two)).decision,'outcome_unknown');assert.deepEqual(p.saved(),before);
});

test('Free eight-hour and Pro hourly admission remain actual server ledger policy across reconstruction',async()=>{
 for(const tier of ['free','pro']){
  const at=Date.UTC(2026,0,1,7,30),f=fixture(at),p=protocol(f),r=maintenance('original-'+tier),bundle=p.admit(r);Object.assign(bundle,f.bundle(r,{entitlement:{tier}}));assert.equal((await p.service().reserve(bundle)).decision,'reserved');const interval=(tier==='free'?8:1)*3600000;
  const r2=maintenance('next-'+tier),b2=p.admit(r2);Object.assign(b2,f.bundle(r2,{entitlement:{tier}}));const denial=await p.service().reserve(b2);assert.equal(denial.nextEligibilityAt,at+interval);
  for(const delta of [interval-1000,interval]){const next=fixture(at+delta),again=protocol(next);again.setSaved(structuredClone(p.saved()));const b=again.admit(r2);Object.assign(b,next.bundle(r2,{entitlement:{tier}}));const result=await again.service().reserve(b);assert.equal(result.decision,delta<interval?'deny':'reserved');assert.equal(again.saved().rows.length,delta<interval?1:2);}
 }
});
