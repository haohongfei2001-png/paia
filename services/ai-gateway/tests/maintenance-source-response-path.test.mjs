import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {emptyTopic,emptyTemporal} from './maintenance-source-response-fixture.mjs';
import {LocalMaintenanceSession} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {hashText} from '../../../extension/core/dedupe.js';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const read=(s,n,id)=>s.repository.transaction(false,t=>t.get(n,id));
const acks=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const defers=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='DEFERRED');
const deferGroup=keys=>({operation:'DEFER',reason:'Not enough evidence',unitKeys:keys,topicId:'',itemId:'',expectedRevision:0,card:'info',body:'',section:'',temporal:emptyTemporal()});
async function warm(local){const session=new LocalMaintenanceSession(local.s,local.constructor);try{assert.equal((await session.run(await session.prepare(options))).state,'COMMITTED');}finally{session.dispose();}local.calls.length=0;local.responses.length=0;}

for(const mutation of ['fixture-schema','changed-source-bound','getter'])test('qualified '+mutation+' refuses before declaration, reservation or paid request',async t=>{
 let getter=0;const f=await maintenanceServiceFixture(t,{configure:async({configuration,server})=>{
  if(mutation==='getter'){const original=configuration.readProfile;configuration.readProfile=async q=>{const m=await original(q);Object.defineProperty(m.wire,'responseFormat',{enumerable:true,get(){getter++;throw Error('Must not invoke');}});return m;};}
  else{const schema=mutation==='fixture-schema'?{type:'object',properties:{data:{type:'string',minLength:1,maxLength:60000}},required:['data'],additionalProperties:false}:structuredClone(server.manifest.wire.responseFormat.json_schema.schema);if(mutation==='changed-source-bound')schema.properties.context.properties.groups.maxItems=51;server.manifest.wire.responseFormat.json_schema.schema=schema;server.manifest.profile.responseSchemaDigest=await hashText(canonical(schema));server.manifest.known.responseSchemaDigest=server.manifest.profile.responseSchemaDigest;}
 }});
 assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);assert.equal(getter,0);
});

for(const field of ['logicalJobId','childOperationId'])test('signed source response cannot swap '+field+' while retaining financial settlement',async t=>{
 const f=await maintenanceServiceFixture(t,{transformResponse:({value})=>{value[field]='SYNTHETIC-unrelated';}}),r=await f.run();assert.equal(r.state,'PARTIAL');assert.equal(f.physical(),1);assert.equal((await acks(f)).length,0);assert.equal((await rows(f.s,'topics')).length,0);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);await f.run();assert.equal(f.physical(),1);
});

for(const defect of ['unknown-topic','duplicate-coverage','missing-coverage','new-item-sentinel','temporal-sentinel'])test('source Context '+defect+' cannot ACK or undo the real Topic result',async t=>{
 const f=await maintenanceServiceFixture(t,{transformResponse:({value})=>{const g=value.context.groups[0];if(defect==='unknown-topic')g.topicId='SYNTHETIC-unknown-topic';if(defect==='duplicate-coverage')g.unitKeys.push(g.unitKeys[0]);if(defect==='missing-coverage')value.context.groups=[];if(defect==='new-item-sentinel')g.itemId=crypto.randomUUID();if(defect==='temporal-sentinel')g.temporal.validUntil='2026-12-01T00:00:00.000Z';}}),r=await f.run();assert.equal(r.state,'PARTIAL');assert.equal(f.physical(),1);assert.deepEqual((await acks(f)).map(r=>r.unit.facet),['topic']);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);await f.run();assert.equal(f.physical(),1);
});

test('a provider result reference cannot use a candidate or invent an uncommitted Topic',async t=>{
 const f=await maintenanceServiceFixture(t,{transformResponse:({value})=>{value.topic.entries=[];value.topic.additional=[];}}),r=await f.run();assert.equal(r.state,'PARTIAL');assert.equal((await rows(f.s,'topics')).length,0);assert.deepEqual((await acks(f)).map(r=>r.unit.facet),['topic']);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);assert.equal(f.physical(),1);
});

test('signed source all-facet DEFER records exact original deferred units and never redispatches',async t=>{
 const f=await maintenanceServiceFixture(t,{transformResponse:({value})=>{value.topic={...emptyTopic(),status:'DEFER',reason:'Insufficient evidence'};value.citations=[];value.context={status:'DEFER',reason:'Insufficient evidence',groups:[]};}}),r=await f.run();assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.equal(r.deferredUnits,2);assert.equal((await acks(f)).length,0);const before=await defers(f);assert.equal(before.length,2);assert.equal(f.physical(),1);const next=await f.run();assert.equal(next.deferredUnits,2);assert.deepEqual(await defers(f),before);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
});

test('signed source mixed ADD and DEFER commits only supported Context units once',async t=>{
 const f=await maintenanceServiceFixture(t,{inputs:2,transformResponse:({value})=>{const first=value.context.groups[0],keys=first.unitKeys;value.context.groups=[{...first,unitKeys:[keys[0]]},deferGroup([keys[1]])];}}),r=await f.run();assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.equal(r.deferredUnits,1);assert.equal((await acks(f)).filter(r=>r.unit.facet==='topic').length,2);assert.equal((await acks(f)).filter(r=>r.unit.facet==='context').length,1);assert.equal((await defers(f)).length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);const before=await rows(f.s,'organizerWorkItems');await f.run();assert.deepEqual(await rows(f.s,'organizerWorkItems'),before);assert.equal(f.physical(),1);
});

for(const operation of ['UPDATE','NO_CHANGE','REMOVE_CANDIDATE'])test('missing existing Item state '+operation+' defers exact Context without discovering unrelated Items',async t=>{
 const f=await maintenanceServiceFixture(t,{transformResponse:({value})=>{Object.assign(value.context.groups[0],{operation,itemId:crypto.randomUUID(),expectedRevision:1,topicId:'',body:'',section:''});}}),r=await f.run();assert.equal(r.state,'PARTIAL',JSON.stringify(r));assert.equal(r.deferredUnits,1);assert.deepEqual((await acks(f)).map(r=>r.unit.facet),['topic']);assert.equal((await defers(f)).length,1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);assert.equal(f.physical(),1);
});

test('actual selected human Context correction travels through source wire and original protected owner',async t=>{
 let before,itemId;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{await warm(local);const row=await read(local.s,'meta',CONTEXT_CARDS_ROW),item=row.items[0];itemId=item.id;await new ContextCardsService(local.s).change({kind:'put',operationId:crypto.randomUUID(),epoch:item.maintenance.provenance.epoch,itemId:item.id,card:item.card,expectedRevision:item.revision,body:'SYNTHETIC human correction',section:item.section});before=await read(local.s,'meta',CONTEXT_CARDS_ROW);}}),r=await f.run();assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.physical(),1);const call=f.calls.find(c=>c.path==='/api/provider').data.payload;assert.equal(call.material.contextItems[0].itemId,itemId);assert.equal(call.material.contextItems[0].fields.body,'SYNTHETIC human correction');assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);const exact=(await acks(f)).filter(a=>a.unit.key===JSON.stringify(['context_item',itemId]));assert.equal(exact.length,1);assert.equal(exact[0].unit.facet,'context');assert.equal(exact[0].outcome,'NO_CHANGE');
});

test('source bound human fields preserve exact human Entry and Placement while original Context consumes both proofs',async t=>{
 let entryId,before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{await warm(local);const entry=(await rows(local.s,'thoughts'))[0],topic=(await rows(local.s,'topics'))[0],p=(await rows(local.s,'placements'))[0];entryId=entry.id;await local.s.editLibraryBatch({operationId:crypto.randomUUID(),entries:[{id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{title:'SYNTHETIC selected title',note:'SYNTHETIC selected note'}}]});await local.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:(await read(local.s,'thoughts',entry.id)).revision,expectedTopicRevision:(await local.s.topic(topic.id)).organizationRevision,expectedPlacementRevision:p.revision,operationId:crypto.randomUUID()});before=await read(local.s,'thoughts',entry.id);}}),r=await f.run();assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.physical(),1);const payload=f.calls.find(c=>c.path==='/api/provider').data.payload;assert.equal(payload.material.boundEntries[0].entryId,entryId);assert.deepEqual(payload.material.boundEntries[0].fields,{note:'SYNTHETIC selected note',title:'SYNTHETIC selected title'});assert.deepEqual(await read(f.s,'thoughts',entryId),before);const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.at(-1);assert.ok(item.maintenance.provenance.evidence.some(e=>e.kind==='boundEntry'&&e.entryId===entryId));assert.ok(item.maintenance.provenance.evidence.some(e=>!e.kind&&e.inputId===before.workingInputId));
});

for(const mutation of ['topic-name','section-title'])test('post-response '+mutation+' cannot lend fresh interpretation to an older source Topic assessment',async t=>{
 const {TopicFormationService}=await import('../../../extension/core/topic-formation.js'),{inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');
 let target,section;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{await warm(local);target=(await rows(local.s,'topics'))[0];section=(await rows(local.s,'sections'))[0];const input=(await rows(local.s,'inputStates'))[0];await inputEdit(local.s,input.id,{libraryText:'SYNTHETIC new Input requiring a fresh bounded cycle'});}}),oldAcks=await acks(f),prepare=TopicFormationService.prototype.prepare;let changed=false;
 t.mock.method(TopicFormationService.prototype,'prepare',async function(request,options){if(this.store===f.s&&f.physical()===1&&!changed){changed=true;if(mutation==='topic-name')await f.s.renameTopic({id:target.id,expectedRevision:target.revision,name:'SYNTHETIC newer human interpretation',operationId:crypto.randomUUID()});else await f.s.editSection({topicId:target.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC newer human aspect',operationId:crypto.randomUUID()});}return prepare.call(this,request,options);});
 const result=await f.run();assert.equal(changed,true);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.deepEqual(await acks(f),oldAcks);assert.equal((await rows(f.s,'topics')).length,1);assert.equal(f.physical(),1);await f.run();assert.equal(f.physical(),1);
});
