import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {capture} from '../../../extension/tests/harness/thought-m1.mjs';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));

// Both responses pass the original signed adapter, actual Foundation settlement
// and Topic owner. The old Input is deliberately absent from the second payload.
// Context is explicitly DEFERred by that second response, independently of Topic.
test('actual signed second Input reuses the original exact Entry with a separate local grant',{timeout:120000},async t=>{
 const first=await maintenanceServiceFixture(t,{exposeRemote:true});t.after(()=>first.session.dispose());
 const initial=await first.run();assert.equal(initial.state,'COMMITTED',JSON.stringify(initial));assert.equal(first.physical(),1);
 const oldRows=await read(first.s,'thoughts'),oldEntry=oldRows.find(x=>x.provenanceType==='input_original');assert.ok(oldEntry);
 const oldInputId=oldEntry.workingInputId;assert.ok(oldInputId);const oldBody=oldEntry.thoughtText;
 first.session.dispose();const routes=new Map(first.calls.filter(x=>x.data.request?.operationId).map(x=>[x.data.request.operationId,first.configuration.fetch]));
 const request=capture((await first.s.status()).epoch,'SYNTHETIC-cross-input-exact-new',oldBody);request.chat={id:'SYNTHETIC-other-original-source',url:'https://chatgpt.com/c/SYNTHETIC-other-original-source',title:'Synthetic independent Source'};
 await first.s.capture(request);await first.s.finishFoundation();const newInput=(await read(first.s,'inputStates')).find(x=>x.id!==oldInputId);assert.ok(newInput);
 const grants=[],sent=[];const next=await maintenanceServiceFixture(t,{reuseLocal:first,exposeRemote:true,configure:({configuration})=>{
  const resolver=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(tx,scope)=>{grants.push(structuredClone(scope));return resolver(tx,scope);}};
  const fetch=configuration.fetch;configuration.fetch=async request=>{const data=await request.clone().json(),id=data.request?.operationId;if(id&&routes.has(id))return routes.get(id)(request);if(id)routes.set(id,fetch);return fetch(request);};
 },transformResponse:({value,payload})=>{sent.push(structuredClone(payload));value.context={status:'DEFER',reason:'Synthetic independent Context decision deferred',groups:[]};}});t.after(()=>next.session.dispose());
 let result=await next.run();if(result.state==='RECOVERED'){assert.equal(next.physical(),0);result=await next.run();}
 assert.equal(next.physical(),1);const payload=sent.at(-1);assert.ok(payload);assert.deepEqual(payload.material.inputs.map(x=>x.inputId),[newInput.id]);assert.ok(!JSON.stringify(payload.material).includes(oldInputId),'old Input is never sent as new model evidence');
 assert.equal(result.facets?.find(x=>x.facet==='topic')?.state,'COMMITTED',JSON.stringify(result));
 const entries=(await read(first.s,'thoughts')).filter(x=>x.lifecycle==='active'&&x.thoughtText===oldBody);assert.deepEqual(entries.map(x=>x.id),[oldEntry.id]);
 const deps=(await read(first.s,'dependencies')).filter(x=>x.targetId===oldEntry.id);assert.deepEqual(deps.map(x=>x.inputId).sort(),[oldInputId,newInput.id].sort());
 const local=grants.filter(x=>x.phase==='topic-exact-reuse');assert.equal(local.length,1);assert.ok(local[0].entries.some(x=>x.entryId===oldEntry.id));assert.ok(local[0].inputs.some(x=>x.inputId===oldInputId));
});
