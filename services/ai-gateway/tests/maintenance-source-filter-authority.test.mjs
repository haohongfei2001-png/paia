import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFilterFixture} from './maintenance-source-filter-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {validateMaintenanceServiceResponse,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA} from '../../../extension/core/ai-usage/maintenance-service-response-schema.js';
const ack=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.facet==='filter');
for(const reason of ['opt-out','entitlement','filter-processing'])test('independent: revoked original '+reason+' before profile cannot transmit Filter scope',async t=>{
 let fired=false,tokenizations=0;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{const tokenize=configuration.tokenize;configuration.tokenize=(...args)=>{tokenizations++;return tokenize(...args);};const read=configuration.readProfile;configuration.readProfile=async(...args)=>{const result=await read(...args);if(!fired){assert.equal(local.filterState.prepared.length,1);fired=true;local.filterState.generation++;local.filterState.patch=reason==='opt-out'?{optIn:false}:reason==='entitlement'?{tier:'free'}:{processingConsent:false};}return result;};}});
 const result=await f.run();
 t.diagnostic(JSON.stringify({result,fired,physical:f.physical(),payloadFilter:f.payloads.map(x=>x.material.filter),filterAck:(await ack(f)).length,server:(f.server.saved()?.rows??[]).map(r=>({state:r.state,window:r.window,settlement:r.settlement}))}));
 assert.equal(fired,true);assert.equal(f.physical(),0,'revoked private Filter authority must be rechecked before sending its selected scope');assert.equal((await ack(f)).length,0);assert.equal(tokenizations,0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);
});
test('independent: selected scope alias is detached before profile processing',async t=>{
 let selected;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{configuration.service.filter.selectScope=async r=>(selected={candidateIds:[...r.candidateIds],neighborIds:[local.neighbor.id]});const read=configuration.readProfile;configuration.readProfile=async(...args)=>{selected.candidateIds[0]=local.outside.id;selected.neighborIds[0]=local.outside.id;return read(...args);};}});
 assert.equal((await f.run()).state,'COMMITTED');assert.deepEqual(f.payloads[0].material.filter,{candidateIds:[f.candidate.id],neighborIds:[f.neighbor.id]});assert.equal((await ack(f)).length,1);assert.equal(f.physical(),1);
});
for(const slot of ['candidateIds','neighborIds'])test('independent: selected scope '+slot+' getter never executes',async t=>{
 let reads=0;const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{configuration.service.filter.selectScope=async r=>Object.defineProperty({candidateIds:[...r.candidateIds],neighborIds:[local.neighbor.id]},slot,{enumerable:true,get(){reads++;throw Error('must not execute');}});}});
 assert.equal((await f.run()).state,'PARTIAL');assert.equal(reads,0);assert.equal(f.payloads[0].material.filter,undefined);assert.equal((await ack(f)).length,0);assert.equal(f.physical(),1);
});
for(const kind of ['filter-getter','decision-getter','array-hole','array-extra'])test('independent: closed Filter schema rejects '+kind+' without getter execution',()=>{
 let reads=0;let value={filter:[]};
 if(kind==='filter-getter')Object.defineProperty(value,'filter',{enumerable:true,get(){reads++;return [];}});
 if(kind==='decision-getter')value.filter=[{inputId:'synthetic',get decision(){reads++;return 'FILTER';}}];
 if(kind==='array-hole')value.filter=Array(1);
 if(kind==='array-extra')value.filter.extra='FILTER';
 assert.throws(()=>validateMaintenanceServiceResponse(value,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA),{code:'INVALID_RESPONSE'});assert.equal(reads,0);
});

test('independent: original opt-out after reservation is checked before final provider send',async t=>{
 let fired=false;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{const fetch=configuration.fetch;configuration.fetch=async request=>{const data=await request.clone().json(),result=await fetch(request);if(!fired&&new URL(request.url).pathname==='/api/reservations'&&data.action==='reserve'){fired=true;local.filterState.generation++;local.filterState.patch={optIn:false};}return result;};}});
 const result=await f.run();t.diagnostic(JSON.stringify({result,fired,physical:f.physical(),payloadFilter:f.payloads.map(x=>x.material.filter),filterAck:(await ack(f)).length}));
 assert.equal(fired,true);assert.equal(f.physical(),0,'Filter opt-out after reservation must prevent final send, preserving/cancelling only original financial ownership');assert.equal((await ack(f)).length,0);
});
test('independent: generic processing abort at identical profile boundary already prevents dispatch',async t=>{
 let fired=false;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{const read=configuration.readProfile;configuration.readProfile=async(...args)=>{const result=await read(...args);if(!fired){fired=true;local.contextAbort.abort();}return result;};}});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(fired,true);assert.equal(f.physical(),0);assert.equal((await ack(f)).length,0);
});

// Additional repair controls retain all independent assertions above. The only
// changed independent expression is the null-safe diagnostic for an absent ledger.
for(const stage of ['tokenizer','proofs','declaration','reservation-status'])test('original Filter currentness fences revocation after '+stage+' await',async t=>{
 let fired=false;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{
  const revoke=()=>{fired=true;local.filterState.generation++;local.filterState.patch={optIn:false};};
  if(stage==='tokenizer'||stage==='proofs'){const key=stage==='tokenizer'?'tokenize':'readProofs',original=configuration[key];configuration[key]=async(...args)=>{const result=await original(...args);if(!fired)revoke();return result;};}
  else{const fetch=configuration.fetch;configuration.fetch=async request=>{const response=await fetch(request);if(!fired&&new URL(request.url).pathname===(stage==='declaration'?'/api/declarations':'/api/operation-status'))revoke();return response;};}
 }});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(fired,true);assert.equal(f.physical(),0);assert.equal((await ack(f)).length,0);assert.equal(f.calls.some(c=>c.path==='/api/provider'),false);
});

test('revocation after original prepare returns cannot be swallowed into a new ordinary packet',async t=>{
 let fired=false;
 const f=await sourceFilterFixture(t,{configure:({local})=>{const prepare=local.s.prepareAIMaintenanceFilter.bind(local.s);local.s.prepareAIMaintenanceFilter=async(...args)=>{const handle=await prepare(...args);fired=true;local.filterState.generation++;return handle;};}});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(fired,true);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);assert.equal(f.filterState.released.length,1);
});

test('original-handle currentness is synchronous and never resolves permission or reads material',async t=>{
 const f=await sourceFilterFixture(t),scope={candidateIds:[f.candidate.id],neighborIds:[f.neighbor.id]},handle=await f.s.repository.transaction(false,t=>f.s.prepareAIMaintenanceFilter(t,scope));
 const resolve=f.filterAuthority.resolve,transaction=f.s.repository.transaction;let resolutions=0,reads=0;
 f.filterAuthority.resolve=(...args)=>{resolutions++;return resolve(...args);};f.s.repository.transaction=(...args)=>{reads++;return transaction.apply(f.s.repository,args);};
 assert.equal(f.s.assertAIMaintenanceFilterCurrent(handle),true);assert.throws(()=>f.s.assertAIMaintenanceFilterCurrent({}),{code:'STALE_BASE'});
 f.filterState.generation++;assert.throws(()=>f.s.assertAIMaintenanceFilterCurrent(handle),{code:'STALE_BASE'});f.filterState.generation--;assert.throws(()=>f.s.assertAIMaintenanceFilterCurrent(handle),{code:'STALE_BASE'});
 assert.equal(resolutions,0);assert.equal(reads,0);f.s.repository.transaction=transaction;
});

for(const reason of ['opt-out','entitlement','filter-processing'])test('final provider boundary rechecks original '+reason+' after dispatch preparation',async t=>{
 let dispatched=false,fired=false;
 const f=await sourceFilterFixture(t,{configure:({local,configuration})=>{
  const tx=local.s.repository.transaction.bind(local.s.repository);local.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(name==='organizerUsage'&&row.state==='DISPATCHED')dispatched=true;return result;};}return fn(t);},stores);
  const profile=configuration.currentProfile;configuration.currentProfile=(...args)=>{const result=profile(...args);if(dispatched&&!fired){fired=true;local.filterState.generation++;local.filterState.patch=reason==='opt-out'?{optIn:false}:reason==='entitlement'?{tier:'free'}:{processingConsent:false};}return result;};
 }});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(dispatched,true);assert.equal(fired,true);assert.equal(f.physical(),0);assert.equal(f.calls.some(c=>c.path==='/api/provider'),false);assert.equal((await ack(f)).length,0);
 const count=f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length;await f.run();assert.equal(f.physical(),0);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,count);
});
