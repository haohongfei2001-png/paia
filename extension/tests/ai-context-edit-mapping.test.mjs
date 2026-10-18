import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const row=f=>raw(f.s,'meta',CONTEXT_CARDS_ROW);
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts','tombstones'].map(async n=>[n,await t.all(n)]))));
const mutation=(s,name,id,fn)=>s.foundationWrite(async t=>{const r=await t.get(name,id);fn(r);await t.put(name,r);});
function authority(s){
 const caller=Object.freeze({handle:op()}),controller=new AbortController(),state={accountId:'synthetic-account',processorId:'synthetic-processor',generation:1,processing:true,expiresAt:Date.now()+600000,hook:null,currentHook:null,scope:null};
 const verifier={async verify(actual,store,scope){state.scope=structuredClone(scope);if(state.hook)await state.hook();if(actual!==caller||store!==s)return null;return {version:1,store:s,accountId:state.accountId,processorId:state.processorId,authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:state.expiresAt,revocationSignal:controller.signal};},isCurrent(actual,r,store){state.currentHook?.();return actual===caller&&store===s&&r.accountId===state.accountId&&r.processorId===state.processorId&&r.authorizationGeneration===state.generation;}};
 return {caller,controller,state,verifier,service:new ContextMaintenanceService(s,{processingVerifier:verifier})};
}
async function fixture({body='SYNTHETIC eligible source body'}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC processing Topic'});
 await inputEdit(f.s,input.id,{libraryText:body,note:'SYNTHETIC eligible note'});
 const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 return {...f,input,topic,cards:new ContextCardsService(f.s),...authority(f.s)};
}
async function request(f,{card='info',fields=['body'],...extra}={}){
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true,scope.reason);
 const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,f.input.id)),fieldDigests={};for(const field of fields)fieldDigests[field]=await hashText(input[field]);
 return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body:'SYNTHETIC extracted candidate',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:f.topic.id,inputId:f.input.id,selectedFields:fields,fieldDigests,expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence}],...extra};
}
const put=(f,c)=>f.service.maintain(f.caller,c);
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from '../core/ai-usage/delta.js';
const options={scope:'synthetic-correction',contractVersion:'synthetic-correction-1',routeVersion:'synthetic-correction-1',limit:1};
const usageAuthority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
const localSession=f=>new LocalMaintenanceSession(f.s,{authority:usageAuthority});
async function protectedFixture(){const f=await fixture(),c=await request(f);await put(f,c);const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section};await f.cards.change(change);return {...f,c,change,key:JSON.stringify(['context_item',c.itemId])};}
const usages=s=>s.repository.transaction(false,t=>t.all('organizerUsage'));
const acks=s=>s.repository.transaction(false,async t=>(await t.all('organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'));

import {parameters} from './harness/topic-03.mjs';
async function editedFixture({fields=['body']}={}){
 const f=await fixture(),c=await request(f,{fields});await put(f,c);
 const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:'SYNTHETIC human correction retaining derived meaning',section:c.section};await f.cards.change(change);
 const calls=[],scopes=[],controller=new AbortController(),caller=Object.freeze({id:op()}),expiresAt=Date.now()+600000,state={allowed:true,originalAllowed:true,processingHook:null,providerHook:null,adapterHook:null};
 const processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:state.processingHook?state.processingHook(structuredClone(scope)):scope,epoch:'synthetic-context-edit',processing:state.allowed,expiresAt,revocationSignal:controller.signal};},isCurrent:()=>state.allowed&&!controller.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.allowed,expiresAt,revocationSignal:controller.signal}),isCurrent:()=>state.allowed&&!controller.signal.aborted};
 const provider={describe:()=>({providerId:'synthetic-context-edit',version:'1',executionKind:'fixture'}),execute:async payload=>{calls.push(structuredClone(payload));await state.providerHook?.(payload);return {accepted:true,operationReceiptId:'synthetic-'+payload.childOperationId};}};
 const service={version:1,topic:{resolveProcessing:async(_t,r)=>({allowed:state.originalAllowed,epoch:'synthetic-topic-processing',inputIds:r.inputIds,topicIds:r.topicIds}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async()=>{throw Error('Context edit cannot enter Topic formation');},context:async(_response,metadata,binding)=>{await state.adapterHook?.(metadata);return {binding,value:[{units:metadata.units,operation:'UPDATE',change:{...c,operationId:op(),expectedRevision:metadata.contextItems[0].revision,body:change.body}}]};}}};
 const make=()=>{let grant;return new LocalMaintenanceSession(f.s,{authority:usageAuthority,processing,provider,service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:controller.signal}),isCurrent:r=>r===grant}});};
 return {...f,c,change,key:JSON.stringify(['context_item',c.itemId]),calls,scopes,controller,state,provider,service,make,session:make()};
}
test('genuine human Context edit uses current original Input and independently selected Context fields, then protected original owner ACKs only Context',async()=>{
 const f=await editedFixture(),before=await row(f),result=await f.session.run(await f.session.prepare(options));
 assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].material.contextItems[0].fields,{body:f.change.body,section:f.change.section});assert.deepEqual(f.scopes[0].contextItems[0].selectedFields,['body','section']);assert.equal(f.calls[0].material.inputs[0].body,'SYNTHETIC eligible source body');
 const done=(await acks(f.s)).filter(a=>a.unit.key===f.key);assert.equal(done.length,1);assert.equal(done[0].unit.facet,'context');assert.equal(done[0].outcome,'NO_CHANGE');assert.deepEqual(await row(f),before);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets,['topic']);assert.equal((await usages(f.s)).filter(a=>a.attemptCount===1).length,1);assert.ok((await usages(f.s)).every(a=>a.effectiveResultCount===0));
 assert.doesNotMatch(JSON.stringify(f.calls[0].material),/sourceRecordIds|sourceIdentityTokens/);f.session.dispose();
});

for(const refusal of ['denied','original-input-denied','missing-context','missing-input','body-only','wrong-item','wrong-revision','wrong-proof'])test('independent '+refusal+' permission neither hashes selected Context nor dispatches',async()=>{
 const f=await editedFixture();if(refusal==='denied')f.state.allowed=false;if(refusal==='original-input-denied')f.state.originalAllowed=false;
 f.state.processingHook=scope=>{if(refusal==='missing-context')delete scope.contextItems;if(refusal==='missing-input')scope.inputs=[];if(refusal==='body-only')scope.contextItems[0].selectedFields=['body'];if(refusal==='wrong-item')scope.contextItems[0].itemId=op();if(refusal==='wrong-revision')scope.contextItems[0].revision++;if(refusal==='wrong-proof')scope.contextItems[0].proof.receiptDigest='0'.repeat(64);return scope;};
 const proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let selectedHashes=0;proto.digest=function(a,data){if(new TextDecoder().decode(data).includes(f.change.body))selectedHashes++;return original.call(this,a,data);};
 try{const r=await f.session.run(await f.session.prepare(options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal(selectedHashes,0);assert.equal((await acks(f.s)).length,0);}finally{proto.digest=original;f.session.dispose();}
});
async function alter(f,kind,t=null){
 if(!t)return f.s.foundationWrite(tx=>alter(f,kind,tx));
 if(kind==='input-body'){const b=await t.get('blocks',f.input.id);b.value.libraryText+=' LATE INPUT';await t.put('blocks',b);}
 if(kind==='input-excluded'){const b=await t.get('blocks',f.input.id);b.value.excluded=true;await t.put('blocks',b);}
 if(kind==='input-state'){const r=await t.get('inputStates',f.input.id);r.removalState='user_removed';await t.put('inputStates',r);}
 if(kind==='source-purge'){const r=await t.get('recordIndex',f.input.originalTextReference);await t.put('tombstones',{id:'source:'+r.sourceKey});}
 if(kind==='source-missing')await t.delete('records',f.input.originalTextReference);
 if(kind==='source-hidden'){const r=await t.get('recordIndex',f.input.originalTextReference);r.hidden=true;await t.put('recordIndex',r);}
 if(kind==='source-body'){const r=await t.get('records',f.input.originalTextReference);r.value.originalText+=' LATE SOURCE';await t.put('records',r);}
 if(kind==='context-body'||kind==='context-order'||kind==='context-provenance'||kind==='context-delete'){const r=await t.get('meta',CONTEXT_CARDS_ROW),i=r.items.find(i=>i.id===f.c.itemId);if(kind==='context-body')i.body+=' LATE CONTEXT';if(kind==='context-order')i.order++;if(kind==='context-provenance')i.maintenance.provenance.evidence[0].fieldDigests.body='0'.repeat(64);if(kind==='context-delete'){i.lifecycle='removed';i.deletedBy=op();i.revision++;}await t.put('meta',r);}
 if(kind==='receipt'){const r=await t.get('operationReceipts','context:'+f.change.operationId);r.digest='0'.repeat(64);await t.put('operationReceipts',r);}
 if(kind==='restore')await t.put('meta',{id:'recovery-restore-epoch',value:op()});
 if(kind==='legacy-input')await t.put('meta',{id:'memory:input:'+JSON.stringify([f.input.id]),kind:'input',version:1,inputId:f.input.id,excluded:true});
 if(kind==='placement'){const rows=await t.all('placements');rows[0].excludedByUser=true;await t.put('placements',rows[0]);}
 if(kind==='revoke')f.controller.abort();
}
for(const defect of ['input-body','input-excluded','input-state','source-purge','source-missing','source-hidden','context-body','context-order','context-provenance','context-delete','receipt','restore','legacy-input','placement'])test('current '+defect+' cannot dispatch copied or stale Context meaning',async()=>{
 const f=await editedFixture(),h=defect==='context-delete'?await f.session.prepare(options):null;await alter(f,defect);let r;try{r=await f.session.run(h??await f.session.prepare(options));}catch{}assert.notEqual(r?.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
for(const defect of ['input-excluded','source-purge','context-body','revoke'])test('held selected Context digest '+defect+' prevents dispatch',async()=>{
 const f=await editedFixture(),h=await f.session.prepare(options),proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let reached=false;
 proto.digest=async function(a,data){const result=await original.call(this,a,data);if(!reached&&new TextDecoder().decode(data)===f.change.body){reached=true;await alter(f,defect);}return result;};
 try{const r=await f.session.run(h);assert.equal(reached,true);assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);}finally{proto.digest=original;f.session.dispose();}
});
for(const defect of ['input-excluded','source-purge','context-body','revoke'])test('held actual provider '+defect+' rejects stale response and never replays',async()=>{
 const f=await editedFixture();let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);f.state.providerHook=async()=>{entered();await gate;};const h=await f.session.prepare(options),running=f.session.run(h);await started;await alter(f,defect);release();const result=await running;assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);await f.session.run(h);assert.equal(f.calls.length,1);f.session.dispose();
});
for(const defect of ['input-body','input-excluded','input-state','source-purge','source-missing','source-hidden','source-body','context-body','context-order','context-provenance','context-delete','receipt','restore','legacy-input','placement','revoke'])test('last joint settlement rejects '+defect+' after exact ACK is staged',async()=>{
 const f=await editedFixture(),original=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const result=await put(n,r,...rest);if(!reached&&n==='meta'&&r.id==='aiu:counters:v1'&&r.localResolved>0){reached=true;await alter(f,defect,t);}return result;};}return fn(t);},stores);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(reached,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets.slice().sort(),['context','topic']);assert.equal((await row(f)).items[0].body,f.change.body);}finally{f.s.repository.transaction=original;f.session.dispose();}
});

for(const variant of ['second-body','section','clear-to-replacement'])test('original repeated protected '+variant+' edit retains lineage and current receipt',async()=>{
 const f=await editedFixture(),c={...f.change,operationId:op(),expectedRevision:2,...(variant==='section'?{section:'SYNTHETIC corrected classification'}:{body:variant==='second-body'?'SYNTHETIC a later human correction':'SYNTHETIC complete pasted replacement'})};await f.cards.change(c);const before=await row(f),result=await f.session.run(await f.session.prepare(options));assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls[0].material.contextItems[0].revision,3);assert.equal(f.calls[0].material.contextItems[0].proof.receiptId,'context:'+c.operationId);assert.equal(f.calls[0].material.inputs.length,1);assert.deepEqual(await row(f),before);assert.equal((await acks(f.s)).length,1);f.session.dispose();
});
for(const variant of ['cosmetic','unchanged','manual','note-lineage','restore'])test('unsupported '+variant+' stays pending without a fabricated Context ACK',async()=>{
 const f=await editedFixture({fields:variant==='note-lineage'?['body','note']:['body']});
 if(variant==='cosmetic'||variant==='unchanged')await f.cards.change({...f.change,operationId:op(),expectedRevision:2,body:f.change.body+(variant==='cosmetic'?'  ':'')});
 if(variant==='manual'){await f.cards.change({kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2});await f.cards.change({...f.change,itemId:op(),operationId:op(),expectedRevision:0});}
 if(variant==='restore'){const operationId=op();await f.cards.change({kind:'delete',operationId,epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2});await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:operationId});}
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
for(const defect of ['new-item','wrong-item','missing-evidence','wrong-field','new-association','NO_CHANGE','REMOVE_CANDIDATE'])test('adapter '+defect+' cannot turn correction into unrelated result',async()=>{
 const f=await editedFixture(),adapter=f.service.responseAdapter.context;f.session.dispose();f.service.responseAdapter.context=async(...args)=>{const r=await adapter(...args),group=r.value[0];if(defect==='new-item'){group.change.itemId=op();group.change.expectedRevision=0;group.operation='ADD';}if(defect==='wrong-item')group.change.itemId=op();if(defect==='missing-evidence')group.change.evidence=[];if(defect==='wrong-field'){group.change.evidence[0].selectedFields=['note'];group.change.evidence[0].fieldDigests={note:group.change.evidence[0].fieldDigests.body};}if(defect==='new-association')group.change.associationIds=[op()];if(['NO_CHANGE','REMOVE_CANDIDATE'].includes(defect)){group.operation=defect;group.change.operation=defect;delete group.change.body;delete group.change.section;}return r;};f.session=f.make();const before=await row(f),result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);f.session.dispose();
});

test('final asynchronous authority callback cannot publish unchecked original Context or Input drift',async()=>{
 const f=await editedFixture();f.session.dispose();let hit=false,grant;const authority=async(t,r)=>{const result=await usageAuthority(t,r);if(!hit&&(await t.all('organizerWorkItems')).some(x=>x.state==='ACKNOWLEDGED'&&x.unit.key===f.key)){hit=true;await alter(f,'input-excluded',t);await alter(f,'context-body',t);}return result;};
 // Keep the same explicitly selected processing scope, but inject at the final
 // original Foundation authority await after its exact Context ACK is staged.
 const caller=Object.freeze({id:op()}),expiresAt=Date.now()+600000,processing={resolve:async(_t,scope)=>({version:1,store:f.s,caller,scope,epoch:'synthetic-final-authority',processing:true,expiresAt,revocationSignal:f.controller.signal}),isCurrent:()=>!f.controller.signal.aborted};f.service.context.caller=caller;
 const session=new LocalMaintenanceSession(f.s,{authority,processing,provider:f.provider,service:f.service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:f.controller.signal}),isCurrent:r=>r===grant}});
 const result=await session.run(await session.prepare(options));assert.equal(hit,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.equal((await row(f)).items[0].body,f.change.body);session.dispose();
});

test('mixed page selects one complete Context correction and leaves unrelated obligations at incoming boundary',async()=>{
 const f=await editedFixture(),result=await f.session.run(await f.session.prepare({...options,limit:37}));assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(result.complete,false);assert.equal(result.nextCursor,null);assert.ok(result.pendingBatchUnits>0);assert.equal(f.calls.length,1);assert.equal(f.calls[0].coverage.length,1);assert.equal(f.calls[0].coverage[0].key,f.key);assert.equal(f.calls[0].coverage[0].facet,'context');assert.equal((await acks(f.s)).length,1);assert.ok((await f.s.repository.transaction(false,t=>t.all('meta'))).some(r=>r.id.startsWith(DIRTY_PREFIX)&&r.descriptor.kind==='input'));f.session.dispose();
});

test('repeat settled handle and same revision after restart cannot dispatch or ACK correction twice',async()=>{
 const f=await editedFixture(),h=await f.session.prepare(options);await f.session.run(h);const done=await acks(f.s),attempts=await usages(f.s);await f.session.run(h);assert.equal(f.calls.length,1);assert.deepEqual(await acks(f.s),done);assert.deepEqual(await usages(f.s),attempts);f.session.dispose();const next=f.make(),result=await next.run(await next.prepare(options));assert.equal(result.state,'DEFERRED');assert.equal(f.calls.length,1);assert.deepEqual(await acks(f.s),done);next.dispose();
});

import {TopicFormationService} from '../core/topic-formation.js';
for(const defect of ['input-excluded','source-purge','context-body'])test('original final Input material transaction joins the '+defect+' Context fence before provider',async()=>{
 const f=await editedFixture(),h=await f.session.prepare(options),check=TopicFormationService.prototype.checkMaterial;let calls=0,reached=false;
 TopicFormationService.prototype.checkMaterial=async function(handle,finalRead){if(finalRead&&++calls===2)return check.call(this,handle,async t=>{const get=t.get.bind(t);t.get=async(n,id)=>{const r=await get(n,id);if(defect==='input-excluded'&&n==='blocks'&&id===f.input.id){r.value.excluded=true;reached=true;}if(defect==='source-purge'&&n==='recordIndex'&&id===f.input.originalTextReference){r.hidden=true;reached=true;}if(defect==='context-body'&&n==='meta'&&id===CONTEXT_CARDS_ROW){r.items[0].body+=' FINAL MATERIAL DRIFT';reached=true;}return r;};return finalRead(t);});return check.call(this,handle,finalRead);};
 try{const result=await f.session.run(h);assert.equal(reached,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);}finally{TopicFormationService.prototype.checkMaterial=check;f.session.dispose();}
});
for(const owner of ['input-edit','input-exclusion','source-trash','context-edit'])test('real '+owner+' during held provider keeps original human work and zero ACK',async()=>{
 const f=await editedFixture();f.state.providerHook=async()=>{if(owner==='input-edit')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC newer original Input'});if(owner==='input-exclusion')await inputEdit(f.s,f.input.id,{excluded:true});if(owner==='source-trash')await f.s.trash(f.input.originalTextReference);if(owner==='context-edit')await f.cards.change({...f.change,operationId:op(),expectedRevision:2,body:'SYNTHETIC latest human Context'});};const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,0);if(owner==='context-edit')assert.equal((await row(f)).items[0].body,'SYNTHETIC latest human Context');f.session.dispose();
});
test('source purge remains with the original B-02 protected human owner',async()=>{
 const f=await editedFixture();assert.equal((await f.s.sourcePurgePreflight(f.input.originalTextReference)).state,'owner_gate_required');await assert.rejects(f.s.purge(f.input.originalTextReference,true),{code:'SOURCE_PURGE_OWNER_GATE'});assert.ok(await raw(f.s,'records',f.input.originalTextReference));assert.equal((await row(f)).items[0].body,f.change.body);f.session.dispose();
});
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {readMaintenanceBatch} from '../core/ai-usage/maintenance-batch.js';
for(const changed of [false,true])test('old Context correction DEFER '+(changed?'requalifies only Context on a different admitted route':'does not retry on the same route'),async()=>{
 const f=await editedFixture(),ai=new AIUsageFoundation(f.s,{resolveAuthority:usageAuthority}),batch=await readMaintenanceBatch(ai,options),job=await ai.plan(batch.request),groups=[];
 await ai.read(async t=>{const saved=await ai.job(t,job.id);for(let i=0;i<saved.childIds.length;i++)for(const facet of ['topic','context']){const units=saved.childCoverage[i].filter(u=>u.facet===facet);if(units.length)groups.push({childId:saved.childIds[i],facet,units,retryCondition:facet==='topic'?'TOPIC_MAPPING_UNAVAILABLE':'CONTEXT_MAPPING_UNAVAILABLE'});}});
 await ai.deferMaintenanceBeforeDispatch(job.id,{groups},{signal:f.controller.signal,isCurrent:()=>true,plan:job});const oldJob=await raw(f.s,'organizerJobs',job.id),deferred=await f.s.repository.transaction(false,async t=>(await t.all('organizerWorkItems')).filter(r=>r.state==='DEFERRED'));
 const result=await f.session.run(await f.session.prepare({...options,routeVersion:changed?'synthetic-correction-new-route':options.routeVersion}));if(changed)assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));else assert.equal(result.state,'DEFERRED');
 for(const d of deferred)if(changed&&d.unit.facet==='context'){const history=await raw(f.s,'organizerWorkItems','aiu:defer-history:'+d.id.slice('aiu:defer:'.length));assert.deepEqual(history,{...d,id:history.id,originalId:d.id,reconsideredBecause:'HUMAN_CONTEXT_EDIT_MAPPER_V1'});}else assert.deepEqual(await raw(f.s,'organizerWorkItems',d.id),d);
 assert.deepEqual(await raw(f.s,'organizerJobs',job.id),oldJob);assert.equal(f.calls.length,changed?1:0);assert.equal((await acks(f.s)).length,changed?1:0);f.session.dispose();
});

test('same-revision Item timestamp drift cannot launder current human correction',async()=>{
 const f=await editedFixture();await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>r.items[0].updatedAt='2099-01-01T00:00:00.000Z');const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});

for(const defect of ['missing-time','invalid-time','nonstring-time','overlong-time','extra-field','extra-undefined-field','extra-result-field','extra-undefined-result-field'])test('malformed original human receipt '+defect+' stays pending before transmission',async()=>{
 const f=await editedFixture();await mutation(f.s,'operationReceipts','context:'+f.change.operationId,r=>{
  if(defect==='missing-time')delete r.createdAt;
  if(defect==='invalid-time')r.createdAt='not-a-date';
  if(defect==='nonstring-time')r.createdAt=Date.parse(r.createdAt);
  if(defect==='overlong-time'){r.createdAt=new Date(r.createdAt).toUTCString().padEnd(65,' ');assert.equal(Number.isFinite(Date.parse(r.createdAt)),true);}
  if(defect==='extra-field')r.untrusted=true;
  if(defect==='extra-undefined-field')r.untrusted=undefined;
  if(defect==='extra-result-field')r.result.untrusted=true;
  if(defect==='extra-undefined-result-field')r.result.untrusted=undefined;
 });
 const before=await row(f),result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets.slice().sort(),['context','topic']);f.session.dispose();
});
test('original human receipt read with mismatched id cannot qualify Context mapping',async()=>{
 const f=await editedFixture(),original=f.s.repository.transaction.bind(f.s.repository),id='context:'+f.change.operationId,wrongId='context:'+op();let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>original(write,async t=>{const get=t.get.bind(t);t.get=async(n,key)=>{const r=await get(n,key);if(n==='operationReceipts'&&key===id&&r){r.id=wrongId;reached=true;}return r;};return fn(t);},stores);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(reached,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
for(const boundary of ['utc-string','64-characters'])test('original receipt accepts bounded valid '+boundary+' timestamp',async()=>{
 const f=await editedFixture();await mutation(f.s,'operationReceipts','context:'+f.change.operationId,r=>{r.createdAt=new Date(r.createdAt).toUTCString();if(boundary==='64-characters')r.createdAt=r.createdAt.padEnd(64,' ');assert.equal(Number.isFinite(Date.parse(r.createdAt)),true);});
 const before=await row(f),result=await f.session.run(await f.session.prepare(options));assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,1);assert.deepEqual(await row(f),before);f.session.dispose();
});
for(const phase of ['held-provider','final-settlement'])test('receipt shape drift at '+phase+' cannot acknowledge Context correction',async()=>{
 const f=await editedFixture(),id='context:'+f.change.operationId,original=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 if(phase==='held-provider')f.state.providerHook=async()=>{reached=true;await mutation(f.s,'operationReceipts',id,r=>delete r.createdAt);};
 else f.s.repository.transaction=(write,fn,stores)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const result=await put(n,r,...rest);if(!reached&&n==='meta'&&r.id==='aiu:counters:v1'&&r.localResolved>0){reached=true;const receipt=await t.get('operationReceipts',id);receipt.untrusted=undefined;await put('operationReceipts',receipt);}return result;};}return fn(t);},stores);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(reached,true);assert.equal(f.calls.length,1);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets.slice().sort(),['context','topic']);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
