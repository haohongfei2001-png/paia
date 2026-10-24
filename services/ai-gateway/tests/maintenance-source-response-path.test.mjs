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
async function warm(local){const session=new LocalMaintenanceSession(local.s,local.constructor);try{const result=await session.run(await session.prepare(options));assert.equal(result.state,'COMMITTED',JSON.stringify(result));}finally{session.dispose();}local.calls.length=0;local.responses.length=0;}

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

// Existing automatic Items are sent only after the child's independent Item
// grant. These cases keep the real signed source transport and original owners.
async function pendingExisting(local,{inputs=1}={}){
 await warm(local);const item=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0],topic=(await rows(local.s,'topics'))[0];
 const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs');
 for(const input of (await rows(local.s,'inputStates')).slice(0,inputs))await inputEdit(local.s,input.id,{libraryText:'SYNTHETIC changed selected current evidence '+input.id});
 return {item,topic};
}
function existingGroup(value,payload,operation,{index=0,keys=null}={}){
 const item=payload.material.existingContextItems?.[index];assert.ok(item,'independently granted existing Item must actually be sent');
 const group=value.context.groups[0];value.context.groups=[{...group,operation,unitKeys:keys??group.unitKeys,itemId:item.itemId,expectedRevision:item.revision,card:item.card,topicId:'',body:operation==='UPDATE'?'SYNTHETIC refreshed existing Context':'',section:operation==='UPDATE'?'Synthetic refreshed section':'',temporal:emptyTemporal()}];
 return item;
}
for(const operation of ['UPDATE','NO_CHANGE','REMOVE_CANDIDATE'])test('ordinary signed source '+operation+' maps the sent existing Item through exact original owner and ACK',async t=>{
 let before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;},transformResponse:({value,payload})=>{existingGroup(value,payload,operation);}}),result=await f.run();
 assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),1);
 const payload=f.calls.find(c=>c.path==='/api/provider').data.payload,sent=payload.material.existingContextItems.find(i=>i.itemId===before.id);assert.equal(sent.body,before.body);assert.equal(sent.revision,before.revision);assert.equal(sent.itemRef,'c0');assert.doesNotMatch(JSON.stringify(sent),/associationIds|sourceRecordIds|sourceIdentityTokens|provenance|expectedTopicBinding|epoch/);
 const after=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id);
 if(operation==='NO_CHANGE')assert.deepEqual(after,before);else {assert.equal(after.revision,before.revision+1);assert.equal(after.lifecycle,operation==='UPDATE'?'active':'invalidated');assert.equal(after.body,operation==='UPDATE'?'SYNTHETIC refreshed existing Context':before.body);}
 const context=(await acks(f)).filter(a=>a.unit.facet==='context'&&a.unit.scope!==undefined);assert.ok(context.some(a=>a.outcome===(operation==='NO_CHANGE'?'NO_CHANGE':'COMMITTED')));const saved=await rows(f.s,'organizerWorkItems');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'organizerWorkItems'),saved);
});

for(const field of ['expectedRevision','card'])test('signed existing '+field+' mismatch cannot commit or ACK the pending Context',async t=>{
 let before,prior;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.facet==='context');},transformResponse:({value,payload})=>{existingGroup(value,payload,'UPDATE');if(field==='expectedRevision')value.context.groups[0].expectedRevision++;else value.context.groups[0].card='rules';}}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual((await acks(f)).filter(a=>a.unit.facet==='context'),prior);await f.run();assert.equal(f.physical(),1);
});

test('independent grant omitting existing Item fields refuses before any service or provider call',async t=>{
 let requested=false;const f=await maintenanceServiceFixture(t,{configure:async({local,configuration})=>{await pendingExisting(local);const resolve=local.materialProcessing.resolve;configuration.processing={...local.materialProcessing,resolve:async(t,scope)=>{const result=await resolve(t,scope);requested=scope.existingContextItems?.length>0;const narrowed=structuredClone(scope);delete narrowed.existingContextItems;return {...result,scope:narrowed};}};}});assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(requested,true);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);assert.equal(f.server.saved(),null);
});

test('revoked existing Item grant discards settled provider output without Context mutation, ACK or paid retry',async t=>{
 let before,prior;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE'),afterResponse:({revoke})=>revoke()});assert.notEqual((await f.run()).state,'COMMITTED');assert.equal(f.physical(),1);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual(await acks(f),prior);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);await f.run();assert.equal(f.physical(),1);
});

test('signed NO_CHANGE checks only the selected real prior subset and leaves the other exact unit deferred',async t=>{
 let before,prior;const f=await maintenanceServiceFixture(t,{inputs:2,configure:async({local})=>{before=(await pendingExisting(local,{inputs:2})).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.facet==='context').length;},transformResponse:({value,payload})=>{const keys=value.context.groups[0].unitKeys;existingGroup(value,payload,'NO_CHANGE',{keys:[keys[0]]});value.context.groups.push(deferGroup([keys[1]]));}}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(result.facets.filter(x=>x.facet==='context'&&x.state==='DEFERRED').reduce((n,x)=>n+x.units,0),1,JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);const coverage=f.calls.find(c=>c.path==='/api/provider').data.payload.coverage.filter(u=>u.facet==='context');assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId&&coverage.some(u=>canonical(u)===canonical(a.unit))).length,1);const keys=f.calls.find(c=>c.path==='/api/provider').data.payload.coverage.filter(u=>u.facet==='context').map(u=>u.key);assert.equal((await defers(f)).filter(d=>keys.includes(d.unit.key)).length,1);await f.run();assert.equal(f.physical(),1);
});

test('signed REMOVE_CANDIDATE with partial old lineage defers rather than invalidating or over-ACKing',async t=>{
 let before,prior;const f=await maintenanceServiceFixture(t,{inputs:2,configure:async({local})=>{before=(await pendingExisting(local,{inputs:2})).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.facet==='context');},transformResponse:({value,payload})=>{const keys=value.context.groups[0].unitKeys;existingGroup(value,payload,'REMOVE_CANDIDATE',{keys:[keys[0]]});value.context.groups.push(deferGroup([keys[1]]));}}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(result.facets.filter(x=>x.facet==='context'&&x.state==='DEFERRED').reduce((n,x)=>n+x.units,0),2,JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual((await acks(f)).filter(a=>a.unit.facet==='context'),prior);await f.run();assert.equal(f.physical(),1);
});

test('existing UPDATE final transaction mutation race rolls back Item, receipt and ACK together',async t=>{
 let before,prior;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.facet==='context');},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE')}),transaction=f.s.repository.transaction.bind(f.s.repository);let raced=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(!raced&&name==='operationReceipts'&&row.namespace==='context-maintenance'&&row.result?.disposition==='updated'){raced=true;const cards=await t.get('meta',CONTEXT_CARDS_ROW);cards.items.find(i=>i.id===before.id).body='SYNTHETIC illicit post-mutation change';await put('meta',cards);}return result;};}return fn(t);},stores);
 const result=await f.run();assert.equal(raced,true);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual((await acks(f)).filter(a=>a.unit.facet==='context'),prior);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal(f.physical(),1);
});

test('existing UPDATE storage rollback retains validated local CAS retry with exactly one physical provider request',async t=>{
 let before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE')}),transaction=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(!aborted&&name==='meta'&&row.id===CONTEXT_CARDS_ROW&&row.items.find(i=>i.id===before.id)?.revision===before.revision+1){aborted=true;throw Error('SYNTHETIC existing Context rollback');}return result;};}return fn(t);},stores);
 assert.equal((await f.run()).state,'PARTIAL');assert.equal(aborted,true);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.equal(f.physical(),1);const second=await f.run();assert.equal(second.processedState,'COMMITTED',JSON.stringify(second));assert.equal(f.physical(),1);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id).revision,before.revision+1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);
});

const evidenceSpecs=item=>item.maintenance.provenance.evidence.map(({contentRevision,sourceRecordIds,sourceIdentityTokens,...e})=>e);
async function pendingNow(local,validUntil){
 await warm(local);const {ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),{inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs'),base=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0],service=new ContextMaintenanceService(local.s,{processingVerifier:local.verifier}),itemId=crypto.randomUUID();
 const result=await service.maintain(local.caller,{operationId:crypto.randomUUID(),epoch:base.maintenance.provenance.epoch,itemId,card:'now',expectedRevision:0,body:'SYNTHETIC previous time-bound proposal',section:'Synthetic Now',associationIds:[crypto.randomUUID()],evidence:evidenceSpecs(base),temporal:{temporalScope:'SYNTHETIC near-term evidence',uncertainty:null,validUntil}});assert.equal(result.disposition,'created');
 const item=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===itemId),input=(await rows(local.s,'inputStates'))[0];await inputEdit(local.s,input.id,{libraryText:'SYNTHETIC new proposal with no temporal evidence'});return item;
}
test('signed existing Now UPDATE without explicit time clears the previous deadline through original owner',async t=>{
 let before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=await pendingNow(local,new Date(Date.now()+60000).toISOString());},transformResponse:({value,payload})=>{const index=payload.material.existingContextItems.findIndex(i=>i.card==='now');const sent=existingGroup(value,payload,'UPDATE',{index});assert.equal(sent.temporalStatus,'not_expired');}}),result=await f.run();assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id);assert.equal(item.revision,before.revision+1);assert.equal(item.card,'now');assert.equal(Object.hasOwn(item.maintenance,'temporal'),false);assert.equal(f.physical(),1);
});

test('Now expiry between source send and original commit invalidates the sent interpretation without replay',async t=>{
 let before,expires,prior;const now=Date.now;let advanced=false;t.mock.method(Date,'now',()=>advanced?expires:now());
 const f=await maintenanceServiceFixture(t,{configure:async({local})=>{expires=now()+60000;before=await pendingNow(local,new Date(expires).toISOString());prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE',{index:payload.material.existingContextItems.findIndex(i=>i.card==='now')}),afterResponse:()=>{advanced=true;}}),result=await f.run();assert.notEqual(result.processedState,'COMMITTED',JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual(await acks(f),prior);assert.equal(f.physical(),1);await f.run();assert.equal(f.physical(),1);
});

for(const kind of ['put','delete'])test('original human '+kind+' after source response wins over stale existing baseline',async t=>{
 let before,human,prior;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;prior=(await rows(local.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE'),afterResponse:async({local})=>{const change={kind,operationId:crypto.randomUUID(),epoch:before.maintenance.provenance.epoch,itemId:before.id,expectedRevision:before.revision,...(kind==='put'?{card:before.card,body:'SYNTHETIC later human edit',section:before.section}:{})};assert.equal((await new ContextCardsService(local.s).change(change)).ok,true);human=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id);}}),result=await f.run();assert.notEqual(result.processedState,'COMMITTED',JSON.stringify(result));assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),human);assert.deepEqual(await acks(f),prior);assert.equal(human.protected,true);assert.equal(human.lifecycle,kind==='delete'?'removed':'active');assert.equal(f.physical(),1);await f.run();assert.equal(f.physical(),1);
});

for(const changed of [false,true])test('invalidated existing Item '+(changed?'revives only with a changed selected evidence identity':'cannot revive from the same evidence identity'),async t=>{
 let before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{await warm(local);const {ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),item=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0],service=new ContextMaintenanceService(local.s,{processingVerifier:local.verifier});assert.equal((await service.invalidate(local.caller,{operation:'REMOVE_CANDIDATE',operationId:crypto.randomUUID(),epoch:item.maintenance.provenance.epoch,itemId:item.id,card:item.card,expectedRevision:item.revision,associationIds:[...item.maintenance.associationIds],evidence:evidenceSpecs(item)})).disposition,'invalidated');before=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0];
  if(changed){const {inputEdit}=await import('../../../extension/tests/harness/thought-m1.mjs'),input=(await rows(local.s,'inputStates'))[0];await inputEdit(local.s,input.id,{libraryText:'SYNTHETIC materially new corrected evidence'});}else{const entry=(await rows(local.s,'thoughts'))[0],topic=(await rows(local.s,'topics'))[0],placement=(await rows(local.s,'placements'))[0];await local.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:placement.revision,operationId:crypto.randomUUID()});}
 },transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE')}),result=await f.run(),after=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id);if(changed){assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(after.lifecycle,'active');assert.equal(after.revision,before.revision+1);assert.equal(Object.hasOwn(after.maintenance,'invalidation'),false);}else{assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.deepEqual(after,before);assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='DEFERRED'));}await f.run();assert.equal(f.physical(),1);
});

for(const swap of [false,true])test('two physical source children with the same c0 display ref '+(swap?'cannot borrow the first target':'keep exact separate existing baselines'),async t=>{
 let items,firstId;const f=await maintenanceServiceFixture(t,{inputs:21,configure:async({local})=>{await pendingExisting(local,{inputs:21});items=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items;},transformResponse:({value,payload})=>{
  const sent=payload.material.existingContextItems,units=payload.coverage.filter(u=>u.facet==='context');assert.ok(sent.length);assert.equal(sent[0].itemRef,'c0');const selected=sent[0],baseline=items.find(i=>i.id===selected.itemId),ids=baseline.maintenance.provenance.evidence.map(e=>e.inputId),checked=units.filter(u=>ids.includes(JSON.parse(u.key)[1])),remaining=units.filter(u=>!checked.includes(u));
  const wrong=swap&&firstId!==undefined;value.context.groups=[{operation:'NO_CHANGE',reason:'',unitKeys:checked.map(u=>u.key),topicId:'',itemId:wrong?firstId:selected.itemId,expectedRevision:selected.revision,card:selected.card,body:'',section:'',temporal:emptyTemporal()},...(remaining.length?[deferGroup(remaining.map(u=>u.key))]:[])];firstId??=selected.itemId;
 }}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),2);const payloads=f.calls.filter(c=>c.path==='/api/provider').map(c=>c.data.payload);assert.equal(new Set(payloads.map(p=>p.childOperationId)).size,2);assert.notEqual(payloads[0].material.existingContextItems[0].itemId,payloads[1].material.existingContextItems[0].itemId);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items,items);
 const currentCoverage=payloads.flatMap(p=>p.coverage.filter(u=>u.facet==='context')),checked=(await acks(f)).filter(a=>a.jobId===result.jobId&&currentCoverage.some(u=>canonical(u)===canonical(a.unit)));assert.equal(checked.length,swap?16:17);const pending=(await defers(f)).filter(d=>d.jobId===result.jobId&&currentCoverage.some(u=>canonical(u)===canonical(d.unit)));assert.equal(pending.length,swap?5:4);const records=await rows(f.s,'organizerWorkItems');await f.run();assert.equal(f.physical(),2);assert.deepEqual(await rows(f.s,'organizerWorkItems'),records);
});

async function pendingStructuralExisting(local,kind){
 await warm(local);const {ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),{readStructuralContext,structuralContextEvidence}=await import('../../../extension/core/ai-usage/structural-context-mapping.js'),{readContextTopicScope}=await import('../../../extension/core/context-topic-scope.js');
 const entry=(await rows(local.s,'thoughts'))[0],topic=(await rows(local.s,'topics'))[0],placement=(await rows(local.s,'placements'))[0],section=(await rows(local.s,'sections'))[0];await local.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:placement.revision,operationId:crypto.randomUUID()});
 const rename=async text=>{if(kind==='topic'){const current=await read(local.s,'topics',topic.id);await local.s.renameTopic({id:current.id,expectedRevision:current.revision,name:text,operationId:crypto.randomUUID()});}else{const current=await read(local.s,'sections',section.id);await local.s.editSection({topicId:topic.id,sectionId:section.sectionId,expectedRevision:current.revision,title:text,operationId:crypto.randomUUID()});}};
 await rename('SYNTHETIC first selected '+kind);const descriptor=(await rows(local.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind===kind).descriptor,mapping=await local.s.repository.transaction(false,t=>readStructuralContext(local.s,t,descriptor));assert.ok(mapping);const property=kind==='topic'?'humanTopic':'humanSection',field=kind==='topic'?'name':'title',structure=structuralContextEvidence(mapping,{[field]:await hashText('SYNTHETIC first selected '+kind)}),scope=await readContextTopicScope(local.s,{topicId:topic.id}),item=(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0],evidence=evidenceSpecs(item).map(e=>({...e,expectedTopicBinding:scope.binding,[property]:structure})),owner=new ContextMaintenanceService(local.s,{processingVerifier:local.verifier});
 assert.equal((await owner.maintain(local.caller,{operationId:crypto.randomUUID(),epoch:item.maintenance.provenance.epoch,itemId:item.id,expectedRevision:item.revision,card:item.card,body:'SYNTHETIC selected structural interpretation',section:item.section,associationIds:item.maintenance.associationIds,evidence})).disposition,'updated');await rename('SYNTHETIC current selected '+kind);
 return {item:(await read(local.s,'meta',CONTEXT_CARDS_ROW)).items[0],property,field,topicId:topic.id,sectionId:section.sectionId,organization:await Promise.all(['topics','sections','placements','thoughts'].map(n=>rows(local.s,n)))};
}
for(const kind of ['topic','section'])for(const omit of [false,true])test('signed existing human '+kind+' UPDATE '+(omit?'defers when its exact structural unit is omitted':'preserves the exact selected human interpretation'),async t=>{
 let baseline;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{baseline=await pendingStructuralExisting(local,kind);},transformResponse:({value,payload})=>{const keys=payload.coverage.filter(u=>u.facet==='context').map(u=>u.key),structure=keys.filter(k=>JSON.parse(k)[0]===kind),other=keys.filter(k=>!structure.includes(k));assert.equal(structure.length,1);assert.ok(other.length);existingGroup(value,payload,'UPDATE',{keys:omit?other:keys});if(omit)value.context.groups.push(deferGroup(structure));}}),result=await f.run(),after=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===baseline.item.id);
 assert.equal(f.physical(),1);assert.deepEqual(await Promise.all(['topics','sections','placements','thoughts'].map(n=>rows(f.s,n))),baseline.organization);
 if(omit){assert.deepEqual(after,baseline.item);assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId&&a.unit.facet==='context').length,0);assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='DEFERRED'));}else{assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(after.revision,baseline.item.revision+1);const selected=after.maintenance.provenance.evidence[0][baseline.property];assert.equal(selected.topicId,baseline.topicId);if(kind==='section')assert.equal(selected.sectionId,baseline.sectionId);assert.equal(selected.fieldDigests[baseline.field],await hashText('SYNTHETIC current selected '+kind));assert.notDeepEqual(selected,baseline.item.maintenance.provenance.evidence[0][baseline.property]);}
 await f.run();assert.equal(f.physical(),1);
});

test('extra same-Input membership inserted after genuine Topic ACK cannot become existing Context settlement authority',async t=>{
 let before,oldEntry,oldPlacement;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;oldEntry=(await rows(local.s,'thoughts'))[0];oldPlacement=(await rows(local.s,'placements'))[0];},transformResponse:({value,payload})=>existingGroup(value,payload,'UPDATE')}),{TopicFormationService}=await import('../../../extension/core/topic-formation.js'),commit=TopicFormationService.prototype.commit;let injected=false;
 t.mock.method(TopicFormationService.prototype,'commit',async function(handle){const result=await commit.call(this,handle);if(!injected&&f.physical()===1){injected=true;await f.s.repository.transaction(true,async tx=>{const entryId=crypto.randomUUID();await tx.put('thoughts',{...structuredClone(oldEntry),id:entryId});await tx.put('placements',{...structuredClone(oldPlacement),id:JSON.stringify([oldPlacement.topicId,oldPlacement.layoutGeneration,entryId]),entryId,rank:'999999999999'});});}return result;});
 const result=await f.run();assert.equal(injected,true);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId&&a.unit.facet==='context').length,0);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.equal(f.physical(),1);await f.run();assert.equal(f.physical(),1);
});

test('NO_CHANGE cannot borrow a sent Item to ACK an unrelated newly selected Input',async t=>{
 let before;const f=await maintenanceServiceFixture(t,{configure:async({local})=>{before=(await pendingExisting(local)).item;const {capture}=await import('../../../extension/tests/harness/thought-m1.mjs');await local.s.capture(capture((await local.s.status()).epoch,'synthetic-unrelated-existing-check','SYNTHETIC different new Input outside original Item provenance'));},transformResponse:({value,payload})=>{assert.equal(payload.material.inputs.length,2);existingGroup(value,payload,'NO_CHANGE');}}),result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId&&a.unit.facet==='context').length,0);assert.equal(result.facets.filter(x=>x.facet==='context'&&x.state==='DEFERRED').reduce((n,x)=>n+x.units,0),2);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);await f.run();assert.equal(f.physical(),1);
});

async function partialExcerptFixture(t,operation='UPDATE'){
 let before,topicId,inputId,excerpt,prior;
 const f=await maintenanceServiceFixture(t,{configure:async({local})=>{
  const pending=await pendingExisting(local);before=pending.item;topicId=pending.topic.id;
  prior=Object.fromEntries(await Promise.all(['thoughts','placements','dependencies','provenance','operationReceipts','records','blocks','inputStates'].map(async n=>[n,await rows(local.s,n)])));
 },transformResponse:({value,payload})=>{
  const relation=value.topic.relations.find(r=>r.topicId===topicId);assert.ok(relation,'the old Topic identity was actually sent');relation.relation='same';
  const input=payload.material.inputs[0];inputId=input.inputId;excerpt=input.body.slice(0,32);assert.ok(input.body.length>excerpt.length);
  const span=value.citations.length;value.citations.push({inputId,field:'body',start:0,end:excerpt.length});value.topic.entries=[{span,type:'idea',entryId:''}];value.topic.additional=[];
  existingGroup(value,payload,operation);
 }});
 return {f,before,topicId,prior,input:()=>({inputId,excerpt})};
}
for(const operation of ['UPDATE','NO_CHANGE'])test('same-child ungranted partial-excerpt commits only independently authorized Topic before refusing Context '+operation,async t=>{
 const {f,before,topicId,prior,input}=await partialExcerptFixture(t,operation),transaction=f.s.repository.transaction.bind(f.s.repository),commit=contextDeferTopic.TopicFormationService.prototype.commit;
 let afterTopic=false,textReads=0;
 t.mock.method(contextDeferTopic.TopicFormationService.prototype,'commit',async function(...args){const result=await commit.apply(this,args);if(this.store===f.s)afterTopic=true;return result;});
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(n,id)=>{const row=await get(n,id);if(afterTopic&&n==='thoughts'&&row&&!prior.thoughts.some(e=>e.id===id))for(const key of ['thoughtText','title','note']){const d=Object.getOwnPropertyDescriptor(row,key);if(d)Object.defineProperty(row,key,{enumerable:d.enumerable,configurable:true,get(){textReads++;return d.value;}});}return row;};return fn(tx);},...args);
 let result;try{result=await f.run();}finally{f.s.repository.transaction=transaction;}
 assert.equal(afterTopic,true);assert.equal(textReads,0,'Context must not acquire any new Entry field');assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='COMMITTED'));
 const {inputId,excerpt}=input(),created=(await rows(f.s,'thoughts')).filter(e=>!prior.thoughts.some(p=>p.id===e.id));assert.equal(created.length,1);assert.equal(created[0].thoughtText,excerpt);assert.notEqual(created[0].bodyBinding,'input');
 const placements=(await rows(f.s,'placements')).filter(p=>!prior.placements.some(x=>x.id===p.id)),dependencies=(await rows(f.s,'dependencies')).filter(d=>!prior.dependencies.some(x=>x.id===d.id));assert.equal(placements.length,1);assert.equal(placements[0].entryId,created[0].id);assert.equal(placements[0].topicId,topicId);assert.equal(dependencies.length,1);assert.equal(dependencies[0].targetId,created[0].id);assert.equal(dependencies[0].inputId,inputId);
 assert.deepEqual((await acks(f)).filter(a=>a.jobId===result.jobId).map(a=>a.unit.facet),['topic']);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);
 const graph=await Promise.all(Object.keys(prior).map(n=>rows(f.s,n))),usage=await rows(f.s,'organizerUsage');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await Promise.all(Object.keys(prior).map(n=>rows(f.s,n))),graph);assert.deepEqual(await rows(f.s,'organizerUsage'),usage);
});
for(const drift of ['source','protected','revoke','graph','ack-abort'])test('partial-excerpt Topic final '+drift+' still rolls back original mutation and ACK',async t=>{
 const {f,before,prior}=await partialExcerptFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(n,row,...rest)=>{const result=await put(n,row,...rest);
  if(!reached&&n==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){
   reached=true;
   if(drift==='ack-abort')throw Error('SYNTHETIC original Topic ACK storage rollback');
   if(drift==='revoke')f.contextAbort.abort();
   if(drift==='protected'){const card=await tx.get('meta',CONTEXT_CARDS_ROW);card.items.find(i=>i.id===before.id).protected=true;await put('meta',card);}
   if(drift==='source'){const inputId=JSON.parse(row.unit.key)[1],block=await tx.get('blocks',inputId),source=await tx.get('records',block.value.originalTextReference);source.value.originalText='SYNTHETIC final Source drift';await put('records',source);}
   if(drift==='graph'){const p=prior.placements[0],e=prior.thoughts[0],id=crypto.randomUUID();await put('thoughts',{...e,id});await put('placements',{...p,id:JSON.stringify([p.topicId,p.layoutGeneration,id]),entryId:id,rank:'999999999999'});}
  }return result;};}return fn(tx);},...args);
 const result=await f.run();f.s.repository.transaction=transaction;
 assert.equal(reached,true);assert.equal(result.state,drift==='revoke'?'UNAVAILABLE':'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId).length,0);
 for(const [name,rowsBefore]of Object.entries(prior))assert.deepEqual(await rows(f.s,name),rowsBefore,name+' rolled back');
 assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);
 if(drift==='ack-abort'||drift==='source'){const next=await f.run();assert.ok(next.facets.some(x=>x.facet==='topic'&&x.state==='COMMITTED'));assert.deepEqual((await acks(f)).filter(a=>a.jobId===result.jobId).map(a=>a.unit.facet),['topic']);}else {await f.run();assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId).length,0);}
 assert.equal(f.physical(),1);
});

async function existingGraphFixture(t,operation){
 let before,topicId,priorEntries,priorPlacements,priorDependencies,priorProvenance,inputId,oldInputId,newBody;
 const f=await maintenanceServiceFixture(t,{configure:async({local})=>{
  const pending=await pendingExisting(local);before=pending.item;topicId=pending.topic.id;oldInputId=before.maintenance.provenance.evidence[0].inputId;
  priorEntries=new Set((await rows(local.s,'thoughts')).map(e=>e.id));priorPlacements=new Set((await rows(local.s,'placements')).map(p=>p.id));priorDependencies=new Set((await rows(local.s,'dependencies')).map(d=>d.id));priorProvenance=new Set((await rows(local.s,'provenance')).map(p=>p.id));
  const {capture}=await import('../../../extension/tests/harness/thought-m1.mjs'),priorInputs=new Set((await rows(local.s,'inputStates')).map(i=>i.id));newBody='SYNTHETIC independently selected new Input for the same real Topic';await local.s.capture(capture((await local.s.status()).epoch,'synthetic-new-topic-membership',newBody));inputId=(await rows(local.s,'inputStates')).find(i=>!priorInputs.has(i.id)).id;
 },transformResponse:({value,payload})=>{
  assert.ok(payload.material.inputs.some(i=>i.inputId===inputId&&i.body===newBody));const relation=value.topic.relations.find(r=>r.topicId===topicId);assert.ok(relation);relation.relation='same';
  const oldKey=JSON.stringify(['input',oldInputId]),rest=payload.coverage.filter(u=>u.facet==='context'&&u.key!==oldKey).map(u=>u.key);existingGroup(value,payload,operation,{keys:[oldKey]});assert.equal(rest.length,1);value.context.groups.push(deferGroup(rest));
 }});return {f,before,topicId,priorEntries,priorPlacements,priorDependencies,priorProvenance,inputId,oldInputId,newBody};
}
for(const operation of ['UPDATE','NO_CHANGE'])test('same-child signed Topic adds an independently selected new Input mirror before existing Context '+operation,async t=>{
 const {f,before,topicId,priorEntries,priorPlacements,priorDependencies,priorProvenance,inputId,oldInputId}=await existingGraphFixture(t,operation),result=await f.run();
 assert.equal(f.physical(),1);assert.equal((await rows(f.s,'topics')).length,1);
 const created=(await rows(f.s,'thoughts')).filter(e=>!priorEntries.has(e.id));assert.equal(created.length,2,JSON.stringify(result));assert.ok(created.every(e=>e.lifecycle==='active'&&e.bodyBinding==='input'));assert.deepEqual(created.map(e=>e.workingInputId).sort(),[oldInputId,inputId].sort());const fresh=created.filter(e=>e.workingInputId===inputId);assert.equal(fresh.length,1);
 const placements=(await rows(f.s,'placements')).filter(p=>!priorPlacements.has(p.id)),dependencies=(await rows(f.s,'dependencies')).filter(d=>!priorDependencies.has(d.id)),provenance=(await rows(f.s,'provenance')).filter(p=>!priorProvenance.has(p.id));assert.equal(placements.length,2);assert.equal(dependencies.length,2);assert.equal(provenance.length,2);
 for(const entry of created){
  const member=placements.filter(p=>p.entryId===entry.id);assert.equal(member.length,1);assert.equal(member[0].topicId,topicId);assert.equal(member[0].lifecycle,'active');
  const proof=dependencies.filter(d=>d.targetKind==='entry'&&d.targetId===entry.id);assert.equal(proof.length,1);assert.equal(proof[0].inputId,entry.workingInputId);assert.ok(proof[0].selectedFields.includes('body'));
  const lineage=provenance.filter(p=>p.ownerKind==='entry'&&p.ownerId===entry.id);assert.equal(lineage.length,1);assert.equal(lineage[0].inputId,entry.workingInputId);assert.deepEqual(lineage[0].sourceRecordIds,proof[0].sourceRecordIds);
 }
 const payload=f.calls.find(c=>c.path==='/api/provider').data.payload,expected=payload.coverage.filter(u=>u.facet==='topic'||u.facet==='context'&&u.key===JSON.stringify(['input',oldInputId])),actual=(await acks(f)).filter(a=>a.jobId===result.jobId);assert.deepEqual(actual.map(a=>canonical(a.unit)).sort(),expected.map(canonical).sort());assert.ok(actual.some(a=>a.unit.facet==='context'&&a.outcome===(operation==='NO_CHANGE'?'NO_CHANGE':'COMMITTED')));
 const deferred=(await defers(f)).filter(a=>a.jobId===result.jobId);assert.deepEqual(deferred.map(a=>a.unit),payload.coverage.filter(u=>u.facet==='context'&&u.key===JSON.stringify(['input',inputId])));
 const after=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id);if(operation==='NO_CHANGE')assert.deepEqual(after,before);else {assert.equal(after.revision,before.revision+1);assert.equal(after.body,'SYNTHETIC refreshed existing Context');}
 const graph={entries:await rows(f.s,'thoughts'),placements:await rows(f.s,'placements'),dependencies:await rows(f.s,'dependencies'),provenance:await rows(f.s,'provenance')};await f.run();assert.equal(f.physical(),1);assert.deepEqual({entries:await rows(f.s,'thoughts'),placements:await rows(f.s,'placements'),dependencies:await rows(f.s,'dependencies'),provenance:await rows(f.s,'provenance')},graph);
});

for(const stage of ['receipt','ack','counter'])for(const drift of ['body','source'])test('new selected graph Input '+drift+' drift at existing Context '+stage+' cannot ACK',async t=>{
 const {f,before,inputId,oldInputId}=await existingGraphFixture(t,stage==='counter'?'NO_CHANGE':'UPDATE'),transaction=f.s.repository.transaction.bind(f.s.repository),block=await read(f.s,'blocks',inputId),sourceId=block.value.originalTextReference,source=await read(f.s,'records',sourceId),receipts=(await rows(f.s,'operationReceipts')).filter(r=>r.namespace==='context-maintenance');let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{
  const result=await put(name,row,...args),hit=stage==='receipt'?name==='operationReceipts'&&row.namespace==='context-maintenance'&&row.requestItemId===before.id:stage==='ack'?name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='context'&&row.unit.key===JSON.stringify(['input',oldInputId]):name==='meta'&&row.id==='aiu:counters:v1'&&row.localResolved>0;
  if(!reached&&hit){reached=true;if(drift==='body'){const current=await t.get('blocks',inputId);current.value.libraryText='SYNTHETIC new graph Input changed after original Context mutation';await put('blocks',current);}else {const current=await t.get('records',sourceId);current.value.originalText='SYNTHETIC new graph Source changed after original Context mutation';await put('records',current);}}
  return result;
 };}return fn(t);},stores);
 const result=await f.run();assert.equal(reached,true,'injection reached the original '+stage);assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.equal(f.physical(),1);
 const current=(await acks(f)).filter(a=>a.jobId===result.jobId);assert.equal(current.filter(a=>a.unit.facet==='context').length,0,JSON.stringify(result));assert.equal(current.filter(a=>a.unit.facet==='topic').length,2,'the earlier genuine Topic transaction stays committed');
 assert.deepEqual((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===before.id),before);assert.deepEqual((await rows(f.s,'operationReceipts')).filter(r=>r.namespace==='context-maintenance'),receipts);assert.deepEqual(await read(f.s,'blocks',inputId),block);assert.deepEqual(await read(f.s,'records',sourceId),source);
 await f.run();assert.equal(f.physical(),1);assert.equal((await acks(f)).filter(a=>a.jobId===result.jobId&&a.unit.facet==='context').length,0);
});

// Current-main paid Context DEFER terminal fence regressions. The original
// registered source root above is preserved byte-for-byte; no CI root is replaced.
import * as contextDeferFoundation from '../../../extension/core/ai-usage/foundation.js';
import * as contextDeferTopic from '../../../extension/core/topic-formation.js';
import * as contextDeferMaintenance from '../../../extension/core/context-maintenance.js';
import * as contextDeferScope from '../../../extension/core/context-topic-scope.js';
import * as contextDeferQualification from '../../../extension/core/ai-usage/maintenance-qualification.js';
{
const {AIUsageFoundation}=contextDeferFoundation;
const {TopicFormationService}=contextDeferTopic;
const {ContextMaintenanceService}=contextDeferMaintenance;
const {CONTEXT_TOPIC_SCOPE_LIMITS}=contextDeferScope;
const {maintenanceQualificationWorkBudget}=contextDeferQualification;
const rows=(store,name)=>store.repository.transaction(false,t=>t.all(name));
const read=(store,name,key)=>store.repository.transaction(false,t=>t.get(name,key));
const deferGroup=keys=>({operation:'DEFER',reason:'Not enough evidence',unitKeys:keys,topicId:'',itemId:'',expectedRevision:0,card:'info',body:'',section:'',temporal:emptyTemporal()});
async function mixedFixture(t){
 let payload;
 const f=await maintenanceServiceFixture(t,{inputs:2,transformResponse:arg=>{payload=arg.payload;const first=arg.value.context.groups[0],keys=first.unitKeys;assert.equal(keys.length,2);arg.value.context.groups=[{...first,unitKeys:[keys[0]]},deferGroup([keys[1]])];}});
 t.after(()=>{f.session.dispose();return f.s.repository.close();});return {f,payload:()=>payload};
}

// Uses the existing signed source mixed ADD/DEFER fixture. Topic succeeds;
// no continuation after Topic refusal, old-evidence selection, or Filter lease.
for(const drift of [false,true])test('current signed Context DEFER fences the original receipt after its last put: '+(drift?'receipt drift':'unchanged positive'),async t=>{
 let payload;
 const f=await maintenanceServiceFixture(t,{inputs:2,transformResponse:arg=>{payload=arg.payload;const first=arg.value.context.groups[0],keys=first.unitKeys;assert.equal(keys.length,2);arg.value.context.groups=[{...first,unitKeys:[keys[0]]},deferGroup([keys[1]])];}});
 t.after(()=>{f.session.dispose();return f.s.repository.close();});
 const repository=f.s.repository,transaction=repository.transaction.bind(repository),apply=AIUsageFoundation.prototype.applyFacet;
 let active=null,receiptBefore,puts=0,injected=false,priorAcks,priorContext;
 t.mock.method(AIUsageFoundation.prototype,'applyFacet',async function(tx,job,index,options){
  if(this.s===f.s&&options.facet==='context'&&options.outcome==='DEFER'){
   assert.equal(active,null);active={jobId:job.id,childId:job.childIds[index],units:options.units.map(canonical)};
   assert.equal(active.units.length,1);assert.equal(active.childId,payload.childOperationId);
   receiptBefore=structuredClone(await tx.get('organizerUsage','aiu:attempt:'+active.childId));
   priorAcks=(await tx.all('organizerWorkItems')).filter(row=>row.state==='ACKNOWLEDGED');priorContext=await tx.get('meta',CONTEXT_CARDS_ROW);
  }
  return apply.call(this,tx,job,index,options);
 });
 repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{
  if(write){const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{const value=await put(table,row,...rest);
   if(active&&table==='organizerWorkItems'&&row.jobId===active.jobId&&row.state==='DEFERRED'&&row.unit?.facet==='context'&&active.units.includes(canonical(row.unit))){
    puts++;if(drift&&puts===active.units.length){injected=true;await put('organizerUsage',{...receiptBefore,operationReceiptId:'SYNTHETIC changed after original final DEFER put'});}
   }return value;};
  }return fn(tx);
 },...args);
 const result=await f.run(),work=await rows(f.s,'organizerWorkItems'),deferred=work.filter(row=>row.jobId===result.jobId&&row.state==='DEFERRED'&&row.unit?.facet==='context'),receipt=await read(f.s,'organizerUsage',receiptBefore.id);
 assert.equal(puts,1);assert.equal(injected,drift);assert.equal(priorAcks.filter(row=>row.unit?.facet==='topic').length,2);assert.equal(priorAcks.filter(row=>row.unit?.facet==='context').length,1);
 assert.deepEqual(work.filter(row=>row.state==='ACKNOWLEDGED'),priorAcks);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),priorContext);
 assert.equal(f.physical(),1);assert.equal(f.calls.filter(call=>call.path==='/api/provider').length,1);assert.equal(f.server.saved().rows.length,1);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);
 t.diagnostic(JSON.stringify({drift,puts,injected,deferred:deferred.length,receiptUnchanged:receipt.operationReceiptId===receiptBefore.operationReceiptId,state:result.state,facets:result.facets}));
 if(drift){assert.deepEqual(deferred,[]);assert.deepEqual(receipt,receiptBefore);}else{assert.deepEqual(deferred.map(row=>canonical(row.unit)),active.units);assert.equal(receipt.operationReceiptId,receiptBefore.operationReceiptId);}
});

// These controls reuse the frozen DEFER fence's actual-owner observation points,
// but exercise current-main mixed ADD/DEFER, never its separate continuation path.
for(const mode of ['ledger','budget-exhaustion','store-getter','db-getter','dispose','signal','authority-await','storage-retry'])test('current signed Context DEFER original terminal boundary: '+mode,async t=>{
 const {f,payload}=await mixedFixture(t),repository=f.s.repository,database=repository.db,transaction=repository.transaction.bind(repository),prepare=TopicFormationService.prototype.prepare,seam=AIUsageFoundation.prototype.deferMaintenanceContextInTransaction,current=AIUsageFoundation.prototype.current,write=AIUsageFoundation.prototype.write,maintain=ContextMaintenanceService.prototype.maintain;
 const deferScopes=new WeakSet(),storeDescriptor=Object.getOwnPropertyDescriptor(f.s,'repository'),dbDescriptor=Object.getOwnPropertyDescriptor(repository,'db'),observations={first:[],terminal:[],tailBefore:null,puts:0,getters:0,held:false,authorityDrift:false,seams:0,contextCalls:0};
 let ledger,active=null,receiptBefore,acksBefore,contextBefore,graphBefore,release,arrive,storageFailed=false;const entered=new Promise(resolve=>{arrive=resolve;}),restore=()=>{Object.defineProperty(f.s,'repository',storeDescriptor);Object.defineProperty(repository,'db',dbDescriptor);};
 t.mock.method(TopicFormationService.prototype,'prepare',function(...args){if(this.store===f.s)ledger=maintenanceQualificationWorkBudget(this.retrieval.guard.qualification(),f.s);return prepare.apply(this,args);});
 t.mock.method(ContextMaintenanceService.prototype,'maintain',function(...args){observations.contextCalls++;return maintain.apply(this,args);});
 t.mock.method(AIUsageFoundation.prototype,'write',function(fn){if(this.s===f.s&&new Error().stack.includes('#deferContextGroups'))return write.call(this,tx=>{deferScopes.add(tx);return fn(tx);});return write.call(this,fn);});
 t.mock.method(AIUsageFoundation.prototype,'deferMaintenanceContextInTransaction',async function(tx,id,childId,options){
  if(this.s!==f.s)return seam.call(this,tx,id,childId,options);observations.seams++;active={id,childId,units:options.units.map(canonical)};assert.equal(active.units.length,1);receiptBefore??=structuredClone(await tx.get('organizerUsage','aiu:attempt:'+childId));acksBefore??=(await tx.all('organizerWorkItems')).filter(row=>row.jobId===id&&row.state==='ACKNOWLEDGED');contextBefore??=await tx.get('meta',CONTEXT_CARDS_ROW);graphBefore??=Object.fromEntries(await Promise.all(['thoughts','placements','dependencies','provenance','topics','sections','operationReceipts'].map(async name=>[name,await tx.all(name)])));
  try{return await seam.call(this,tx,id,childId,options);}finally{active=null;}
 });
 t.mock.method(AIUsageFoundation.prototype,'current',async function(tx,job,...rest){const result=await current.call(this,tx,job,...rest);if(mode==='authority-await'&&active&&this.s===f.s&&job.id===active.id&&!observations.authorityDrift){observations.authorityDrift=true;await Promise.resolve();await tx.put('organizerUsage',{...receiptBefore,operationReceiptId:'SYNTHETIC changed during original DEFER authority await'});}return result;});
 repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{
  if(!write)return fn(tx);let writerCheck=false;const get=tx.get.bind(tx),put=tx.put.bind(tx),objectStore=tx.tx.objectStore.bind(tx.tx),wrapped=new WeakSet();
  tx.get=async(table,key,...rest)=>{const stack=new Error().stack,own=table==='organizerUsage'&&payload()&&key==='aiu:attempt:'+payload().childOperationId&&stack.includes('#checkContextGroupReceipt')&&deferScopes.has(tx),prior=ledger?.reads;const row=await get(table,key,...rest);if(!own)return row;writerCheck=true;let observed=false;return new Proxy(row,{get(target,name,receiver){if(name==='id'&&!observed&&new Error().stack.includes('account')){observed=true;observations.first.push({before:prior,after:ledger.reads});}return Reflect.get(target,name,receiver);}});};
  tx.put=async(table,row,...rest)=>{const value=await put(table,row,...rest);if(writerCheck&&active&&table==='organizerWorkItems'&&row.jobId===active.id&&row.state==='DEFERRED'&&row.unit?.facet==='context'){observations.puts++;if(observations.puts===1){if(mode==='budget-exhaustion')ledger.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads;observations.tailBefore=ledger.reads;if(mode==='storage-retry'&&!storageFailed){storageFailed=true;throw Error('SYNTHETIC original final DEFER put storage rollback');}}}return value;};
  tx.tx.objectStore=name=>{const store=objectStore(name);if(name!=='organizerUsage'||wrapped.has(store))return store;wrapped.add(store);const read=store.get.bind(store);store.get=key=>{const terminal=writerCheck&&payload()&&key==='aiu:attempt:'+payload().childOperationId&&new Error().stack.includes('runFinalReadFences'),request=read(key);if(!terminal)return request;observations.terminal.push(ledger.reads);
   if(mode==='store-getter'||mode==='db-getter'){const object=mode==='store-getter'?f.s:repository,name=mode==='store-getter'?'repository':'db',prior=mode==='store-getter'?repository:database;Object.defineProperty(object,name,{configurable:true,enumerable:true,get(){observations.getters++;return prior;}});}
   if(mode==='dispose'||mode==='signal'){let handler;Object.defineProperty(request,'onsuccess',{configurable:true,enumerable:true,get(){return handler;},set(value){handler=event=>{observations.held=true;release=()=>value.call(request,event);arrive();};}});}return request;};return store;};
  return fn(tx);
 },...args).finally(restore);
 let result;try{const running=f.run();if(mode==='dispose'||mode==='signal'){let timer;try{await Promise.race([entered,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('actual final DEFER receipt get not reached')),5000);})]);if(mode==='dispose')f.session.dispose();else f.contextAbort.abort();const finish=release;release=null;finish();}finally{clearTimeout(timer);release?.();}result=await running;}else result=await running;}finally{restore();repository.transaction=transaction;}
 const savedWork=(await rows(f.s,'organizerWorkItems')).filter(row=>row.jobId===result.jobId),deferred=savedWork.filter(row=>row.state==='DEFERRED'&&row.unit?.facet==='context'),usage=await read(f.s,'organizerUsage',receiptBefore.id);
 t.diagnostic(JSON.stringify({mode,observations,state:result.state,facets:result.facets,physical:f.physical()}));assert.ok(ledger);assert.equal(observations.first.length,1);assert.equal(observations.first[0].after,observations.first[0].before+1);assert.equal(observations.puts,1);assert.equal(observations.getters,0);assert.deepEqual(savedWork.filter(row=>row.state==='ACKNOWLEDGED'),acksBefore);assert.equal(acksBefore.filter(row=>row.unit.facet==='context').length,1);assert.equal(acksBefore.filter(row=>row.unit.facet==='topic').length,2);assert.deepEqual(usage,receiptBefore);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),contextBefore);for(const [name,before]of Object.entries(graphBefore))assert.deepEqual(await rows(f.s,name),before);
 if(mode==='budget-exhaustion'||mode==='storage-retry')assert.equal(observations.terminal.length,0);else{assert.equal(observations.terminal.length,1);assert.equal(observations.terminal[0],observations.tailBefore+1);}if(mode==='authority-await')assert.equal(observations.authorityDrift,true);if(mode==='dispose'||mode==='signal')assert.equal(observations.held,true);
 if(mode==='ledger')assert.equal(deferred.length,1);else assert.deepEqual(deferred,[]);
 if(mode==='storage-retry'){const calls=observations.contextCalls,retry=await f.run(),after=(await rows(f.s,'organizerWorkItems')).filter(row=>row.jobId===result.jobId);assert.ok(retry.facets.some(row=>row.facet==='context'&&row.state==='DEFERRED'),JSON.stringify(retry));assert.equal(observations.seams,2);assert.equal(observations.contextCalls,calls,'earlier Context ADD is not replayed');assert.deepEqual(after.filter(row=>row.state==='ACKNOWLEDGED'),acksBefore);assert.equal(after.filter(row=>row.state==='DEFERRED'&&row.unit?.facet==='context').length,1);assert.deepEqual(await read(f.s,'organizerUsage',receiptBefore.id),receiptBefore);}
 else if(['authority-await','store-getter','db-getter'].includes(mode)){const calls=observations.contextCalls,seams=observations.seams;await f.run();assert.equal(observations.contextCalls,calls);assert.equal(observations.seams,seams,'an observed terminal rejection does not refresh the original paid response');assert.deepEqual((await rows(f.s,'organizerWorkItems')).filter(row=>row.jobId===result.jobId),savedWork);}
 assert.equal(f.physical(),1);assert.equal(f.calls.filter(call=>call.path==='/api/provider').length,1);assert.equal(f.server.saved().rows.length,1);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);
});

test('current Context DEFER fixed seam rejects foreign scope, job, facet and callback overrides',async t=>{
 const {f,payload}=await mixedFixture(t),seam=AIUsageFoundation.prototype.deferMaintenanceContextInTransaction;let foundation,originalOptions,closed;
 t.mock.method(AIUsageFoundation.prototype,'deferMaintenanceContextInTransaction',function(tx,id,childId,options){if(this.s===f.s){foundation=this;originalOptions=structuredClone(options);}return seam.call(this,tx,id,childId,options);});
 const result=await f.run(),id=result.jobId,childId=payload().childOperationId,repository=f.s.repository,work=await rows(f.s,'organizerWorkItems'),paid=await rows(f.s,'organizerUsage');assert.ok(foundation);let callbacks=0;
 const call=(tx,options=originalOptions,owner=foundation)=>seam.call(owner,tx,id,childId,options),invalid=promise=>assert.rejects(promise,error=>error.code==='INVALID_REQUEST'),scope=promise=>assert.rejects(promise,error=>['BNS_HUMAN_RETENTION_REQUIRED','STALE_BASE'].includes(error.code));
 await scope(call(null));await repository.transaction(false,tx=>scope(call(tx)));
 await repository.transaction(true,async tx=>{
  closed=tx;await scope(call(Object.create(tx)));await scope(call(tx,originalOptions,new AIUsageFoundation({repository:{db:repository.db}})));
  await invalid(call(tx,{...originalOptions,isCurrent:()=>{callbacks++;return true;}}));await invalid(call(tx,{...originalOptions,operationReceiptId:'SYNTHETIC caller replacement'}));await invalid(call(tx,{...originalOptions,facet:'filter'}));
  const descriptor=Object.getOwnPropertyDescriptor(repository,'db');Object.defineProperty(repository,'db',{...descriptor,value:{}});try{await scope(call(tx));}finally{Object.defineProperty(repository,'db',descriptor);}
  const job=foundation.job.bind(foundation);foundation.job=async()=>({type:'AI_ORGANIZE'});try{await invalid(call(tx));}finally{foundation.job=job;}
  await invalid(call(tx,{...originalOptions,units:payload().coverage.filter(unit=>unit.facet==='topic')}));
 });
 await scope(call(closed));assert.equal(callbacks,0);assert.deepEqual(await rows(f.s,'organizerWorkItems'),work);assert.deepEqual(await rows(f.s,'organizerUsage'),paid);assert.equal(f.physical(),1);
});
}
