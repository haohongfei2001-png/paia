import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceMaintenanceFixture} from './maintenance-source-response-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';

test('configured source response route commits ordinary Input Topic and Context ADD with original owners',async t=>{
 const f=await sourceMaintenanceFixture(t),result=await f.run();
 assert.equal(result.state,'COMMITTED',JSON.stringify(result));
 assert.equal(f.physical(),1);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'placements')).length,1);
 const context=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));assert.equal(context.items.length,1);assert.equal(context.items[0].body,'SYNTHETIC source mapped context 0');
 assert.equal(f.decoded.length,0);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,2);
 assert.equal(f.server.saved().rows[0].resultCommitted,true);assert.equal((await f.run()).state,'NO_DELTA');assert.equal(f.physical(),1);
});

const ack=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const context=async f=>f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
async function afterTopic(t,f,mutate){
 const {TopicFormationService}=await import('../../../extension/core/topic-formation.js'),commit=TopicFormationService.prototype.commit;let changed=false;
 t.mock.method(TopicFormationService.prototype,'commit',async function(handle){const result=await commit.call(this,handle);if(!changed){changed=true;await mutate();}return result;});
 return ()=>changed;
}

for(const mutation of ['extra','NO_CHANGE','unknown','missing-topic'])test('source provider schema refuses '+mutation+' without any local ACK',async t=>{
 const f=await sourceMaintenanceFixture(t,{responsePatch:value=>{if(mutation==='extra')value.extra=true;else if(mutation==='missing-topic')delete value.topic;else value.context[0].operation=mutation==='NO_CHANGE'?'NO_CHANGE':'UPSERT';}}),result=await f.run();
 assert.notEqual(result.state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await ack(f)).length,0);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await context(f))?.items.length??0,0);
 assert.equal(f.server.saved().rows[0].settlement.outcome,'FAILED');assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
});

for(const field of ['logicalJobId','childOperationId'])test('source adapter refuses cross-child '+field+' despite valid service schema',async t=>{
 const f=await sourceMaintenanceFixture(t,{responsePatch:value=>{value[field]='unrelated-original-operation';}}),result=await f.run();
 assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal((await ack(f)).length,0);assert.equal((await rows(f.s,'topics')).length,0);assert.equal(f.server.saved().rows[0].settlement.outcome,'VALIDATED');assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
});

for(const mode of ['empty','duplicate','foreign'])test('explicit Context '+mode+' coverage remains pending after exact Topic commit',async t=>{
 const f=await sourceMaintenanceFixture(t,{responsePatch:value=>{if(mode==='empty')value.context=[];else if(mode==='duplicate')value.context[0].inputIds.push(value.context[0].inputIds[0]);else value.context[0].inputIds[0]='unrelated-input';}}),result=await f.run();
 assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await ack(f)).filter(x=>x.unit.facet==='topic').length,1);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);assert.equal((await context(f))?.items.length??0,0);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
 const topics=await rows(f.s,'topics');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'topics'),topics);assert.equal((await ack(f)).length,1);
});

test('source schema is required by the actual profile before declaration or reservation',async t=>{
 const f=await sourceMaintenanceFixture(t,{configure:async({server})=>{const schema=server.manifest.wire.responseFormat.json_schema.schema;schema.properties.context.minItems=1;const {hashText}=await import('../../../extension/core/dedupe.js');const {canonical}=await import('../../../extension/core/ai-usage/contracts.js');server.manifest.profile.responseSchemaDigest=server.manifest.known.responseSchemaDigest=await hashText(canonical(schema));}});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);
});

test('source Topic citations cannot name evidence outside the dispatched Input packet',async t=>{
 const f=await sourceMaintenanceFixture(t,{responsePatch:value=>{value.topic.entries[0].span.inputId='unrelated-input';}});assert.equal((await f.run()).state,'PARTIAL');assert.equal((await ack(f)).length,0);assert.equal((await rows(f.s,'topics')).length,0);
});

for(const stage of ['input-edit','exclude','restored','source-purge','ambiguous-topic','excluded-placement'])test('source Context refuses post-Topic '+stage+' while preserving committed Topic',async t=>{
 const f=await sourceMaintenanceFixture(t),id=(await rows(f.s,'inputStates'))[0].id;
 const changed=await afterTopic(t,f,async()=>{
  if(stage==='input-edit'){const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');await inputEdit(f.s,id,{libraryText:'SYNTHETIC changed after paid assessment'});}
  else if(stage==='exclude'||stage==='restored'){await f.s.excludeLibrary(id,true);if(stage==='restored')await f.s.excludeLibrary(id,false);}
  else if(stage==='source-purge'){const b=await f.s.input(id);await f.s.permanentDelete(b.sourceRecordId);}
  else if(stage==='ambiguous-topic'){const target=await f.s.createTopic({operationId:crypto.randomUUID(),name:'SYNTHETIC second human target'}),input=await f.s.input(id);await f.s.addToTopics({operationId:crypto.randomUUID(),kind:'input',id,expectedRevision:input.revision,topicIds:[target.id]});}
  else await f.s.repository.transaction(true,async t=>{const p=(await t.all('placements'))[0];p.excludedByUser=true;await t.put('placements',p);});
 });
 const result=await f.run();assert.equal(changed(),true);assert.notEqual(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);assert.equal((await context(f))?.items.length??0,0);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
});

for(const stage of ['rollback','lost-ack'])test('source Context '+stage+' resumes one original Item and no provider replay',async t=>{
 const f=await sourceMaintenanceFixture(t),tx=f.s.repository.transaction.bind(f.s.repository);let fired=false;
 f.s.repository.transaction=async(write,fn,stores)=>{
  let committed=false;const result=await tx(write,async t=>{
   if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const value=await put(name,row,...args);if(!fired&&name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED'){fired=true;committed=true;if(stage==='rollback')throw Error('SYNTHETIC atomic Context abort');}return value;};}return fn(t);
  },stores);
  if(committed&&stage==='lost-ack')throw Error('SYNTHETIC local ACK lost');return result;
 };
 const first=await f.run();assert.equal(fired,true);f.s.repository.transaction=tx;if(stage==='rollback'){assert.equal(first.state,'PARTIAL');assert.equal((await context(f))?.items.length??0,0);}
 const second=await f.run();assert.equal(second.state,stage==='lost-ack'&&first.state==='COMMITTED'?'NO_DELTA':'COMMITTED',JSON.stringify(second));assert.equal(f.physical(),1);assert.equal((await context(f)).items.length,1);assert.equal((await ack(f)).length,2);assert.equal((await rows(f.s,'operationReceipts')).filter(r=>r.result?.disposition==='created').length,1);assert.equal(f.server.saved().rows[0].resultCommitted,true);
});

test('two source-owned physical children keep original immutable budgets and exact 42-unit coverage',async t=>{
 const f=await sourceMaintenanceFixture(t,{inputs:21}),result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),2);assert.equal((await ack(f)).length,42);assert.equal(f.server.saved().rows.length,2);
 for(const bill of f.server.saved().rows){assert.equal(bill.request.outputCap,2000);assert.equal(bill.request.maxCompletionTokens,1990);assert.equal(bill.request.childCount,2);}
 assert.equal(f.payloads.length,2);assert.equal(f.decoded.length,0);assert.equal(f.server.saved().rows.filter(r=>r.resultCommitted).length,1);
});

test('default-null source service stays unavailable with no hidden activation or body/network read',async t=>{
 const f=await sourceMaintenanceFixture(t),{createConfiguredMaintenanceSession}=await import('../../../extension/core/ai-usage/configured-maintenance-session.js');const session=createConfiguredMaintenanceSession(f.s);
 assert.equal(session.available(),false);assert.equal((await session.opportunity()).state,'UNAVAILABLE');assert.equal(f.calls.length,0);assert.equal(f.physical(),0);
});

test('original final Context CAS refuses an Input change after source mapping',async t=>{
 const f=await sourceMaintenanceFixture(t),{ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),maintain=ContextMaintenanceService.prototype.maintain;let changed=false;
 t.mock.method(ContextMaintenanceService.prototype,'maintain',async function(caller,change,options){if(!changed){changed=true;const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');await inputEdit(f.s,change.evidence[0].inputId,{libraryText:'SYNTHETIC final Context CAS drift'});}return maintain.call(this,caller,change,options);});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(changed,true);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,0);assert.equal((await context(f))?.items.length??0,0);assert.equal(f.physical(),1);
});

test('source two-group Context retains committed prefix and exact original second Item after rollback',async t=>{
 const f=await sourceMaintenanceFixture(t,{inputs:2,responsePatch:value=>{const proposal=value.context[0];value.context=proposal.inputIds.map((inputId,i)=>({...proposal,body:'SYNTHETIC separate Context group '+i,inputIds:[inputId]}));}}),tx=f.s.repository.transaction.bind(f.s.repository);let writes=0,failed=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(!failed&&name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED'&&++writes===2){failed=true;throw Error('SYNTHETIC second Context rollback');}return result;};}return fn(t);},stores);
 const first=await f.run();assert.equal(first.state,'PARTIAL');assert.equal(failed,true);assert.equal((await ack(f)).filter(x=>x.unit.facet==='context').length,1);const prefix=structuredClone((await context(f)).items);assert.equal(prefix.length,1);f.s.repository.transaction=tx;
 assert.equal((await f.run()).state,'COMMITTED');assert.equal((await context(f)).items.length,2);assert.deepEqual((await context(f)).items[0],prefix[0]);assert.equal((await ack(f)).length,4);assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].resultCommitted,true);
});

test('source packet contains only authorized current Input bodies and immutable declared coverage',async t=>{
 const f=await sourceMaintenanceFixture(t);const before=await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n)));assert.equal((await f.run()).state,'COMMITTED');assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(n=>rows(f.s,n))),before);
 const payload=f.payloads[0];assert.deepEqual(Object.keys(payload.material).sort(),['constraints','identities','inputs','purpose','sections','version']);assert.ok(payload.material.inputs.every(i=>Object.keys(i).sort().join(',')==='body,inputId,ref,revision'));
 assert.equal(payload.automaticRetries,0);assert.equal(payload.coverage.length,2);const resultCalls=f.calls.filter(c=>c.path==='/api/results');assert.equal(resultCalls.length,1);assert.doesNotMatch(JSON.stringify(resultCalls),/SYNTHETIC source mapped context|Synthetic explicit working input|"body"|"payload"/);
});

test('source validator bounds closed data without executing accessors or admitting unknown Now semantics',async()=>{
 const {validateMaintenanceServiceResponse,MAINTENANCE_SERVICE_RESPONSE_SCHEMA}=await import('../../../extension/core/ai-usage/maintenance-service-response-schema.js'),{boundedSchema}=await import('../../../extension/core/ai-usage/qwen-request-data.js');boundedSchema(MAINTENANCE_SERVICE_RESPONSE_SCHEMA);
 let called=false;assert.throws(()=>validateMaintenanceServiceResponse({get version(){called=true;return 1;}}),{code:'INVALID_RESPONSE'});assert.equal(called,false);assert.throws(()=>validateMaintenanceServiceResponse({data:'{"operation":"NO_CHANGE"}'}),{code:'INVALID_RESPONSE'});
 assert.deepEqual(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.context.items.properties.card.enum,['info','rules']);assert.deepEqual(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.context.items.properties.operation.enum,['ADD']);
});
