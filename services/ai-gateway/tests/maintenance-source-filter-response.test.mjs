import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFilterFixture} from './maintenance-source-filter-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const ack=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const filterAck=async f=>(await ack(f)).filter(r=>r.unit.facet==='filter');
const visible=async(f,extra={})=>(await f.s.page({documentId:f.candidate.documentId,...extra})).pageItemIds.includes(f.candidate.id);

test('configured source Filter profile commits same-child Topic, Context and positive Filter without an injected adapter',async t=>{
 const f=await sourceFilterFixture(t),result=await f.run();
 assert.equal(result.state,'COMMITTED',JSON.stringify(result));
 assert.equal(f.physical(),1);assert.equal((await filterAck(f)).length,1);assert.equal((await ack(f)).length,5);
 assert.equal(await visible(f),false);assert.equal(f.filterState.decoded,0);assert.equal(f.decoded.length,0);
 assert.equal(f.server.saved().rows[0].resultCommitted,true);
});

for(const decision of ['KEEP','INSUFFICIENT'])test('source '+decision+' records exact NO_CHANGE without hiding or human keep',async t=>{
 const f=await sourceFilterFixture(t,{decision}),result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),1);
 assert.equal((await filterAck(f))[0].outcome,'NO_CHANGE');assert.equal(await visible(f),true);
 const row=await f.s.repository.transaction(false,t=>t.get('filterInputs',f.candidate.id));assert.equal(row.aiDecision,undefined);assert.equal(row.filterOverride,'none');
});

test('source Filter signed Free reservation refuses physical dispatch despite local Pro booleans',async t=>{
 const f=await sourceFilterFixture(t,{tier:'free'}),result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),0);assert.equal((await ack(f)).length,0);assert.equal(await visible(f),true);
 assert.equal(f.server.saved().rows[0].window.windowId.startsWith('free:'),true);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
});

for(const filterOptions of [{noAuthority:true},{selection:'missing'},{selection:'outside'},{selection:'candidate'},{patch:{optIn:false}},{patch:{processingConsent:false}},{patch:{tier:'free'}}])test('source invalid original Filter selection defers '+JSON.stringify(filterOptions),async t=>{
 const f=await sourceFilterFixture(t,{filterOptions}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);
 assert.ok(result.facets.some(r=>r.facet==='filter'&&r.state==='DEFERRED'));assert.equal((await ack(f)).length,4);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
 assert.equal(f.payloads[0].material.filter,undefined);assert.doesNotMatch(JSON.stringify(f.payloads),/PRIVATE_OUT_OF_SCOPE_USER_BODY/);await f.run();assert.equal(f.physical(),1);
});

for(const kind of ['extra','unknown-decision','missing-filter'])test('closed source Filter schema rejects '+kind+' before domain ACK',async t=>{
 const f=await sourceFilterFixture(t,{responsePatch:value=>{if(kind==='extra')value.filter[0].qualified=true;else if(kind==='unknown-decision')value.filter[0].decision='DELETE';else delete value.filter;}}),result=await f.run();
 assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await ack(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.server.saved().rows[0].settlement.outcome,'FAILED');
});

for(const kind of ['empty','duplicate','foreign'])test('source Filter '+kind+' coverage keeps exact pending hole and never dispatches a repair',async t=>{
 const f=await sourceFilterFixture(t,{responsePatch:value=>{if(kind==='empty')value.filter=[];else if(kind==='duplicate')value.filter.push({...value.filter[0]});else value.filter[0].inputId='outside-original-child';}}),result=await f.run();
 assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).length,4);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
 await f.run();assert.equal(f.physical(),1);assert.equal((await ack(f)).length,4);
});

for(const field of ['logicalJobId','childOperationId'])test('source Filter profile rejects substituted '+field+' for the entire response',async t=>{
 const f=await sourceFilterFixture(t,{responsePatch:value=>{value[field]='unrelated-paid-child';}});assert.equal((await f.run()).state,'PARTIAL');assert.equal(f.physical(),1);assert.equal((await ack(f)).length,0);assert.equal(await visible(f),true);
});

test('source interpretation binds exact original session snapshot rather than recapturing changed Filter state',async t=>{
 const f=await sourceFilterFixture(t),read=f.s.maintenanceFilterSnapshot.bind(f.s);let plain=0;
 f.s.maintenanceFilterSnapshot=async(...args)=>{const result=await read(...args);if(!args[2]?.contentBounds&&++plain===2)result.policyEpoch++;return result;};
 const result=await f.run();assert.equal(plain,2);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).length,4);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.physical(),1);
});

for(const change of ['keep','edit','restore','neighbor-edit','off-on','entitlement','processing'])test('source final original Filter owner rejects late '+change+' after Context commit',async t=>{
 const f=await sourceFilterFixture(t),{ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),maintain=ContextMaintenanceService.prototype.maintain;let changed=false;
 t.mock.method(ContextMaintenanceService.prototype,'maintain',async function(...args){const result=await maintain.apply(this,args);if(!changed){changed=true;
  if(change==='keep')await f.s.keepInput(f.candidate.id);
  if(change==='edit'||change==='neighbor-edit'){const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');await inputEdit(f.s,change==='edit'?f.candidate.id:f.neighbor.id,{libraryText:'Synthetic later meaningful user statement'});}
  if(change==='restore'){await f.s.excludeLibrary(f.candidate.id,true);await f.s.excludeLibrary(f.candidate.id,false);}
  if(change==='off-on'){await f.s.setFilterMode('off');await f.s.setFilterMode('light');}
  if(change==='entitlement')f.filterState.generation++;
  if(change==='processing')f.contextAbort.abort();
 }return result;});
 const result=await f.run();assert.equal(changed,true);assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await filterAck(f)).length,0);
 assert.equal((await f.s.repository.transaction(false,t=>t.get('filterInputs',f.candidate.id)))?.aiDecision,undefined);
});

for(const stage of ['metadata','ack','usage','job'])test('source Filter '+stage+' rollback retries original response without new paid attempt',async t=>{
 const f=await sourceFilterFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let fired=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{let filterWrite=false;if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(name==='filterInputs'&&row.id===f.candidate.id&&row.aiDecision)filterWrite=true;
  const hit=stage==='metadata'?name==='filterInputs'&&!!row.aiDecision:stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED':stage==='usage'?filterWrite&&name==='organizerUsage'&&row.state==='COMMITTED':filterWrite&&name==='organizerJobs'&&row.state==='COMMITTED';
  if(hit&&!fired){fired=true;throw Error('SYNTHETIC source Filter rollback');}return result;};}return fn(t);},stores);
 const first=await f.run();f.s.repository.transaction=transaction;assert.equal(fired,true);assert.equal(first.state,'PARTIAL',JSON.stringify(first));assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
 const second=await f.run();assert.equal(second.state,'COMMITTED',JSON.stringify(second));assert.equal((await filterAck(f)).length,1);assert.equal(await visible(f),false);assert.equal(f.physical(),1);assert.equal(f.filterState.prepared.length,1);
});

test('source Filter entitlement revoked after staged exact ACK aborts metadata and result atomically',async t=>{
 const f=await sourceFilterFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let fired=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const result=await put(name,row,...rest);if(!fired&&name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED'){fired=true;f.filterState.generation++;}return result;};}return fn(t);},stores);
 const result=await f.run();f.s.repository.transaction=transaction;assert.equal(fired,true);assert.notEqual(result.state,'COMMITTED');assert.equal((await filterAck(f)).length,0);assert.equal((await ack(f)).length,4);assert.equal(await visible(f),true);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal(f.physical(),1);
});

test('source positive Filter preserves reading snapshots, discovery, Source and current Input bytes',async t=>{
 const f=await sourceFilterFixture(t),before=await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n))),prior=await f.s.page({documentId:f.candidate.documentId});
 assert.equal((await f.run()).state,'COMMITTED');assert.equal(await visible(f),false);assert.equal(await visible(f,{readingSnapshot:prior.readingSnapshot}),true);assert.equal(await visible(f,{includeFiltered:true}),true);assert.equal((await f.s.searchInputs({query:'然后'})).items[0].filtered,true);
 assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n))),before);assert.deepEqual(f.payloads[0].material.filter,{candidateIds:[f.candidate.id],neighborIds:[f.neighbor.id]});assert.doesNotMatch(JSON.stringify(f.payloads),/PRIVATE_OUT_OF_SCOPE_USER_BODY|snapshot|qualificationId/);
 const row=f.server.saved().rows[0];assert.equal(row.request.outputCap,2000);assert.equal(row.request.maxCompletionTokens,1990);assert.equal(row.request.childCount,1);assert.equal((await f.run()).state,'NO_DELTA');assert.equal(f.physical(),1);
 assert.doesNotMatch(JSON.stringify(f.calls.filter(x=>x.path==='/api/results')),/body|PRIVATE|neighborIds/);
});

for(const mode of ['off','downgrade','opt-out'])test('source committed visibility withdraws on '+mode,async t=>{
 const f=await sourceFilterFixture(t);assert.equal((await f.run()).state,'COMMITTED');assert.equal(await visible(f),false);if(mode==='off')await f.s.setFilterMode('off');else f.filterState.patch=mode==='downgrade'?{tier:'free'}:{optIn:false};assert.equal(await visible(f),true);assert.equal(f.physical(),1);
});

test('only a pending Filter hole cannot acquire or dispatch another Maintenance cycle',async t=>{
 const f=await sourceFilterFixture(t),{DIRTY_PREFIX}=await import('../../../extension/core/ai-usage/delta.js');
 await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith(DIRTY_PREFIX)){if(row.descriptor.entityId===f.candidate.id)await t.put('meta',{...row,pendingFacets:['filter']});else await t.delete('meta',row.id);}});
 const result=await f.run();assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);
});

for(const limit of ['maxContentBytes','maxRequestBytes'])test('selected Filter metadata respects unchanged '+limit+' before declaration',async t=>{
 const sample=await sourceFilterFixture(t);assert.equal((await sample.run()).state,'COMMITTED');
 const bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length,ceiling=bytes(limit==='maxContentBytes'?sample.payloads[0].material:sample.payloads[0])-1;
 const f=await sourceFilterFixture(t);f.s.organizerBudget.limits[limit]=ceiling;
 const result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal(f.payloads[0].material.filter,undefined);assert.equal((await filterAck(f)).length,0);assert.equal(await visible(f),true);assert.equal(f.filterState.prepared.length,1);assert.equal(f.filterState.released.length,1);
 assert.ok(bytes(limit==='maxContentBytes'?f.payloads[0].material:f.payloads[0])<=ceiling);
});
