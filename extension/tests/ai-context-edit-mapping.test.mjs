import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
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
async function editedFixture({fields=['body'],card='info',initialEdit=true,temporal=undefined}={}){
 const f=await fixture(),c=await request(f,{fields,card,...(temporal===undefined?{}:{temporal})});await put(f,c);
 const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:'SYNTHETIC human correction retaining derived meaning',section:c.section};if(initialEdit)await f.cards.change(change);
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

async function restoredFixture(options={}){
 const f=await editedFixture(options),item=(await row(f)).items.find(i=>i.id===f.c.itemId),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:item.revision};
 assert.equal((await f.cards.change(deletion)).ok,true);
 const restoration={kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:item.revision+1,deletedBy:deletion.operationId};
 assert.equal((await f.cards.change(restoration)).ok,true);return {...f,deletion,restoration};
}
test('current human restoration rechecks the original complete lineage and settles only protected Context',async()=>{
 const f=await restoredFixture(),before=await row(f),humanReceipt=await raw(f.s,'operationReceipts','context:'+f.restoration.operationId),result=await f.session.run(await f.session.prepare(options));
 assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);
 const selected=f.calls[0].material.contextItems[0];assert.equal(selected.revision,4);assert.equal(selected.proof.kind,'restore');assert.equal(selected.proof.receiptId,humanReceipt.id);assert.deepEqual(selected.fields,{body:f.change.body,section:f.change.section});
 assert.equal(f.calls[0].material.inputs[0].body,'SYNTHETIC eligible source body');assert.deepEqual(await row(f),before);assert.deepEqual(await raw(f.s,'operationReceipts',humanReceipt.id),humanReceipt);
 const done=(await acks(f.s)).filter(a=>a.unit.key===f.key);assert.deepEqual(done.map(a=>[a.unit.facet,a.outcome]),[['context','NO_CHANGE']]);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets,['topic']);assert.ok((await usages(f.s)).every(a=>a.effectiveResultCount===0));f.session.dispose();
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
for(const variant of ['cosmetic','unchanged','manual','restore-missing-removal-receipt'])test('unsupported '+variant+' stays pending without a fabricated Context ACK',async()=>{
 const f=await editedFixture();
 if(variant==='cosmetic'||variant==='unchanged')await f.cards.change({...f.change,operationId:op(),expectedRevision:2,body:f.change.body+(variant==='cosmetic'?'  ':'')});
 if(variant==='manual'){await f.cards.change({kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2});await f.cards.change({...f.change,itemId:op(),operationId:op(),expectedRevision:0});}
 if(variant==='restore-missing-removal-receipt'){const operationId=op();await f.cards.change({kind:'delete',operationId,epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2});await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:operationId});await f.s.foundationWrite(t=>t.delete('operationReceipts','context:'+operationId));}
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
for(const restored of [false,true])for(const changed of [false,true])test('old Context '+(restored?'restoration':'correction')+' DEFER '+(changed?'requalifies only Context on a different admitted route':'does not retry on the same route'),async()=>{
 const f=await (restored?restoredFixture():editedFixture()),ai=new AIUsageFoundation(f.s,{resolveAuthority:usageAuthority}),batch=await readMaintenanceBatch(ai,options),job=await ai.plan(batch.request),groups=[];
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

for(const card of ['info','rules','now'])test('restoring an unedited automatic '+card+' Item uses its current human restore, never local creation ACK',async()=>{
 const f=await restoredFixture({card,initialEdit:false}),before=await row(f),result=await f.session.run(await f.session.prepare(options));
 assert.equal(result.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal(f.calls[0].material.contextItems[0].revision,3);assert.equal(f.calls[0].material.contextItems[0].fields.body,f.c.body);assert.deepEqual(await row(f),before);assert.deepEqual((await acks(f.s)).map(a=>a.unit.facet),['context']);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets,['topic']);f.session.dispose();
});
for(const defect of ['missing','namespace','schemaVersion','id','owner','epoch','digest','revision','future-revision','lifecycle','deletedBy','createdAt','unknown','undefined-extra'])test('current restore rejects '+defect+' original deletion receipt before provider',async()=>{
 const f=await restoredFixture(),id='context:'+f.deletion.operationId;
 if(defect==='missing')await f.s.foundationWrite(t=>t.delete('operationReceipts',id));else await mutation(f.s,'operationReceipts',id,r=>{
  if(defect==='namespace')r.namespace='context-maintenance';if(defect==='schemaVersion')r.schemaVersion=2;if(defect==='id')r.id='context:'+op();if(defect==='owner')r.ownerId=op();if(defect==='epoch')r.epoch='another-epoch';if(defect==='digest')r.digest='0'.repeat(64);if(defect==='revision')r.result.revision--;if(defect==='future-revision')r.result.revision++;if(defect==='lifecycle')r.result.lifecycle='active';if(defect==='deletedBy')r.result.deletedBy=op();if(defect==='createdAt')r.createdAt='invalid';if(defect==='unknown')r.unrecognized=true;if(defect==='undefined-extra')r.result.unrecognized=undefined;
 });
 if(defect==='id')await f.s.foundationWrite(t=>t.delete('operationReceipts',id));
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets.slice().sort(),['context','topic']);f.session.dispose();
});
for(const defect of ['input-body','input-excluded','input-state','source-purge','source-missing','source-hidden','source-body','context-body','context-order','context-provenance','context-delete','restore','legacy-input','placement'])test('restoration retains original currentness refusal for '+defect,async()=>{
 const f=await restoredFixture(),h=await f.session.prepare(options);await alter(f,defect);const result=await f.session.run(h);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
for(const defect of ['missing-removal','wrong-owner','wrong-revision','fake-active','another-item','other-source'])test('original restore preparer cannot mint from '+defect+' removal authority',async()=>{
 const f=await editedFixture(),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(deletion);const id='context:'+deletion.operationId;
 if(defect==='missing-removal')await f.s.foundationWrite(t=>t.delete('operationReceipts',id));
 else if(defect==='other-source')await alter(f,'source-purge');
 else if(defect==='another-item'){const c=await request(f,{body:'SYNTHETIC different Item'});const owner=authority(f.s);await owner.service.maintain(owner.caller,c);const d={...deletion,operationId:op(),itemId:c.itemId,expectedRevision:1};await f.cards.change(d);const receipt=await raw(f.s,'operationReceipts','context:'+d.operationId);await f.s.foundationWrite(t=>t.put('operationReceipts',{...receipt,id}));}
 else await mutation(f.s,'operationReceipts',id,r=>{if(defect==='wrong-owner')r.ownerId=op();if(defect==='wrong-revision')r.result.revision--;if(defect==='fake-active'){r.result.lifecycle='active';r.result.deletedBy=null;}});
 await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId});
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
test('duplicate human restoration keeps its original receipt and settles exact Context at most once',async()=>{
 const f=await restoredFixture(),receipt=await raw(f.s,'operationReceipts','context:'+f.restoration.operationId),known=await raw(f.s,'meta',KNOWN_PREFIX+f.key);await f.cards.change(f.restoration);assert.deepEqual(await raw(f.s,'meta',KNOWN_PREFIX+f.key),known);
 const h=await f.session.prepare(options);assert.equal((await f.session.run(h)).processedState,'COMMITTED');const checked=await acks(f.s),usage=await usages(f.s),before=await row(f);await f.cards.change(f.restoration);await f.session.run(h);const next=await f.session.run(await f.session.prepare(options));assert.notEqual(next.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.deepEqual(await acks(f.s),checked);assert.deepEqual(await usages(f.s),usage);assert.deepEqual(await row(f),before);assert.deepEqual(await raw(f.s,'operationReceipts',receipt.id),receipt);f.session.dispose();
});
for(const defect of ['removal-receipt','restore-receipt','body','source','revoke'])test('last restoration authority await cannot publish '+defect+' drift',async()=>{
 const f=await restoredFixture();f.session.dispose();let hit=false,grant,allowed=true;
 const authority=async(t,r)=>{const result=await usageAuthority(t,r);if(!hit&&(await t.all('organizerWorkItems')).some(x=>x.state==='ACKNOWLEDGED'&&x.unit.key===f.key)){hit=true;
  if(defect==='removal-receipt'||defect==='restore-receipt'){const id='context:'+(defect==='removal-receipt'?f.deletion.operationId:f.restoration.operationId),receipt=await t.get('operationReceipts',id);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);}
  if(defect==='body')await alter(f,'context-body',t);if(defect==='source')await alter(f,'source-purge',t);if(defect==='revoke'){allowed=false;f.controller.abort();}
 }return {...result,allowed};};
 const caller=Object.freeze({id:op()}),expiresAt=Date.now()+600000,processing={resolve:async(_t,scope)=>({version:1,store:f.s,caller,scope,epoch:'synthetic-final-restore',processing:true,expiresAt,revocationSignal:f.controller.signal}),isCurrent:()=>!f.controller.signal.aborted};f.service.context.caller=caller;
 const session=new LocalMaintenanceSession(f.s,{authority,processing,provider:f.provider,service:f.service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:f.controller.signal}),isCurrent:r=>r===grant}});
 const before=await row(f),result=await session.run(await session.prepare(options));assert.equal(hit,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);session.dispose();
});

test('a valid deletion receipt cannot authorize changed human body before restoration',async()=>{
 const f=await editedFixture(),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(deletion);await alter(f,'context-body');
 await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId});
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});

for(const defect of ['missing-legacy-proof','digest','revision','receipt','epoch','unknown','other-item'])test('restore refuses '+defect+' removal witness instead of guessing historical completion',async()=>{
 const f=await editedFixture(),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(deletion);
 if(defect==='other-item'){
  const g=await restoredFixture(),foreign=await raw(g.s,'meta',KNOWN_PREFIX+g.key);await mutation(f.s,'meta',KNOWN_PREFIX+f.key,r=>{r.descriptor.contextRemoval={version:1,kind:'removal',beforeRevision:2,receiptId:'context:'+deletion.operationId,receiptDigest:r.descriptor.contextRemoval.receiptDigest,epoch:'initial',semanticDigest:foreign.descriptor.contextEdit.removalSemanticDigest,updatedAt:r.descriptor.contextRemoval.updatedAt};});g.session.dispose();
 }else await mutation(f.s,'meta',KNOWN_PREFIX+f.key,r=>{const p=r.descriptor.contextRemoval;if(defect==='missing-legacy-proof')delete r.descriptor.contextRemoval;if(defect==='digest')p.semanticDigest='0'.repeat(64);if(defect==='revision')p.beforeRevision++;if(defect==='receipt')p.receiptId='context:'+op();if(defect==='epoch')p.epoch='another';if(defect==='unknown')p.unexpected=undefined;});
 await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId});const known=await raw(f.s,'meta',KNOWN_PREFIX+f.key);assert.equal(known.descriptor.contextEdit,undefined);
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
test('the same deletion receipt cannot authenticate another live Source lineage before restore',async()=>{
 const f=await editedFixture();await f.s.capture(capture((await f.s.status()).epoch,'synthetic-restore-other-source','SYNTHETIC other independent source'));
 const input=(await f.s.snapshot()).library.blocks.find(i=>i.id!==f.input.id),topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC other processing Topic'}),current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 const other={...f,input,topic},c=await request(other),owner=authority(f.s);await owner.service.maintain(owner.caller,c);const otherItem=(await row(f)).items.find(i=>i.id===c.itemId);
 const deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(deletion);await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>{r.items.find(i=>i.id===f.c.itemId).maintenance.provenance=structuredClone(otherItem.maintenance.provenance);});
 await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId});assert.equal((await raw(f.s,'meta',KNOWN_PREFIX+f.key)).descriptor.contextEdit,undefined);
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
for(const stage of ['delete','restore'])for(const defect of (stage==='delete'?['body','order']:['body','receipt','witness']))test('original '+stage+' digest await cannot mint after '+defect+' drift',async()=>{
 const f=await editedFixture(),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2},restoration={kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId};
 if(stage==='restore')await f.cards.change(deletion);const proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let hit=false;
 proto.digest=async function(a,b){const result=await original.call(this,a,b),text=new TextDecoder().decode(b);if(!hit&&text.includes('"lifecycle":"removed"')&&text.includes(f.change.body)){hit=true;
  if(defect==='body')await alter(f,'context-body');if(defect==='order')await alter(f,'context-order');
  if(defect==='receipt'){if(stage==='restore')await mutation(f.s,'operationReceipts','context:'+deletion.operationId,r=>r.digest='0'.repeat(64));else await alter(f,'context-order');}
  if(defect==='witness'){if(stage==='restore')await mutation(f.s,'meta',KNOWN_PREFIX+f.key,r=>r.descriptor.contextRemoval.semanticDigest='0'.repeat(64));else await alter(f,'context-order');}
 }return result;};
 try{await f.cards.change(stage==='restore'?restoration:deletion);}finally{proto.digest=original;}
 assert.equal(hit,true);if(stage==='delete')await f.cards.change(restoration);
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
for(const defect of ['body','removal-receipt','source','revoke'])test('held restoration provider cannot settle '+defect+' drift or replay',async()=>{
 const f=await restoredFixture();let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);f.state.providerHook=async()=>{entered();await gate;};const h=await f.session.prepare(options),running=f.session.run(h);await started;
 if(defect==='removal-receipt')await mutation(f.s,'operationReceipts','context:'+f.deletion.operationId,r=>r.result.revision--);else await alter(f,defect==='body'?'context-body':defect==='source'?'source-purge':'revoke');release();const result=await running;assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);await f.session.run(h);assert.equal(f.calls.length,1);f.session.dispose();
});
import {backupMetaAllowed,validateBackupItem,projectBackupEntity} from '../core/backup-format.js';
import {assertManualContextCurrentPhysicalShape} from '../core/browser-native-sync/manual-context-current-shape.js';
test('restoration witnesses and both human receipts remain nonportable metadata, not Sync grants',async()=>{
 const f=await restoredFixture(),known=await raw(f.s,'meta',KNOWN_PREFIX+f.key),dirty=await raw(f.s,'meta',DIRTY_PREFIX+f.key);
 for(const value of [known,dirty]){assert.equal(backupMetaAllowed(value.id),false);assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:value.id,data:value}}),{code:'BACKUP_INVALID'});}
 for(const operationId of [f.deletion.operationId,f.restoration.operationId]){const receipt=await raw(f.s,'operationReceipts','context:'+operationId);assert.throws(()=>validateBackupItem({type:'item',section:'receipts',value:projectBackupEntity('receipts',receipt)}),{code:'BACKUP_INVALID'});}
 const canonical=await row(f);assert.throws(()=>assertManualContextCurrentPhysicalShape(canonical),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
 f.session.dispose();
});

for(const refusal of ['denied','original-input-denied','missing-context','missing-input','wrong-removal-proof'])test('restoration needs independent '+refusal+' authority and never locally settles',async()=>{
 const f=await restoredFixture();if(refusal==='denied')f.state.allowed=false;if(refusal==='original-input-denied')f.state.originalAllowed=false;
 f.state.processingHook=scope=>{if(refusal==='missing-context')delete scope.contextItems;if(refusal==='missing-input')scope.inputs=[];if(refusal==='wrong-removal-proof')scope.contextItems[0].proof.removalSemanticDigest='0'.repeat(64);return scope;};
 const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});
test('old same-Item deletion digest cannot replace the next adjacent removal revision',async()=>{
 const f=await editedFixture(),first={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(first);const witness=(await raw(f.s,'meta',KNOWN_PREFIX+f.key)).descriptor.contextRemoval;
 await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:first.operationId});const second={...first,operationId:op(),expectedRevision:4};await f.cards.change(second);
 await mutation(f.s,'meta',KNOWN_PREFIX+f.key,r=>r.descriptor.contextRemoval=witness);await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:5,deletedBy:second.operationId});
 assert.equal((await raw(f.s,'meta',KNOWN_PREFIX+f.key)).descriptor.contextEdit,undefined);const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});

for(const field of ['receipt','witness'])test('restore digest await rejects undefined-extra '+field+' shape drift',async()=>{
 const f=await editedFixture(),deletion={kind:'delete',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:2};await f.cards.change(deletion);
 const proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let hit=false;
 proto.digest=async function(a,b){const result=await original.call(this,a,b),text=new TextDecoder().decode(b);if(!hit&&text.includes('"lifecycle":"removed"')&&text.includes(f.change.body)){hit=true;
  if(field==='receipt')await mutation(f.s,'operationReceipts','context:'+deletion.operationId,r=>r.unexpected=undefined);
  else await mutation(f.s,'meta',KNOWN_PREFIX+f.key,r=>r.descriptor.contextRemoval.unexpected=undefined);
 }return result;};
 try{await f.cards.change({kind:'restore',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,expectedRevision:3,deletedBy:deletion.operationId});}finally{proto.digest=original;}
 assert.equal(hit,true);const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);f.session.dispose();
});

const temporalCases={expired:{temporalScope:'SYNTHETIC prior task',uncertainty:null,validUntil:'2000-01-01T00:00:00.000Z'},future:{temporalScope:'SYNTHETIC future task',uncertainty:'SYNTHETIC scope uncertainty',validUntil:'2099-01-01T00:00:00.000Z'},unknown:{temporalScope:null,uncertainty:null,validUntil:null}};
for(const action of ['edit','restore'])for(const [time,temporal]of Object.entries(temporalCases))test('temporal Context '+action+' '+time+' reconciles through original protected owner without changing time metadata',async()=>{
 const f=await(action==='restore'?restoredFixture:editedFixture)({card:'now',temporal}),before=await row(f);
 try{const r=await f.session.run(await f.session.prepare(options));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.deepEqual(await row(f),before);assert.deepEqual((await row(f)).items.find(i=>i.id===f.c.itemId).maintenance.temporal,temporal);assert.deepEqual(f.calls[0].material.contextItems[0].fields,{body:f.change.body,section:f.change.section});assert.equal(Object.hasOwn(f.calls[0].material.contextItems[0],'temporal'),false);assert.equal((await f.cards.snapshot()).items.find(i=>i.id===f.c.itemId).temporalStatus,'unknown');const done=(await acks(f.s)).filter(a=>a.unit.key===f.key);assert.deepEqual(done.map(a=>[a.unit.facet,a.outcome]),[['context','NO_CHANGE']]);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets,['topic']);assert.ok((await usages(f.s)).every(a=>a.effectiveResultCount===0));}finally{f.session.dispose();}
});

for(const phase of ['before','response','settlement','backup'])for(const defect of ['deadline','temporal-scope','receipt','source-purge','revoke'])test('temporal correction '+phase+' rejects '+defect+' and retains the original obligation',async()=>{
 const f=await editedFixture({card:'now',temporal:temporalCases.future}),before=await row(f),original=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 const change=async t=>{reached=true;if(defect==='deadline'||defect==='temporal-scope'){const r=await t.get('meta',CONTEXT_CARDS_ROW),item=r.items.find(i=>i.id===f.c.itemId);if(defect==='deadline')item.maintenance.temporal.validUntil='2001-01-01T00:00:00.000Z';else item.maintenance.temporal.temporalScope='SYNTHETIC substituted scope';await t.put('meta',r);}else await alter(f,defect,t);};
 if(phase==='before')await original(true,change);else if(phase==='response')f.state.providerHook=()=>original(true,change);else f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const value=await put(n,r,...rest);if(!reached&&n==='meta'&&(phase==='backup'?r.id==='backup-data-generation':r.id==='aiu:counters:v1'&&r.localResolved>0))await change(t);return value;};}return fn(t);},...args);
 try{let result;try{result=await f.session.run(await f.session.prepare(options));}catch(error){assert.ok(['STALE_BASE','UNAVAILABLE'].includes(error.code),error.code);}assert.equal(reached,true);assert.notEqual(result?.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.equal(f.calls.length,phase==='before'?0:1);if(['settlement','backup'].includes(phase))assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
test('temporal correction ACK abort rolls back and retries the same physical response',async()=>{
 const f=await restoredFixture({card:'now',temporal:temporalCases.expired}),before=await row(f),original=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const value=await put(n,r,...rest);if(!reached&&n==='organizerWorkItems'&&r.state==='ACKNOWLEDGED'&&r.unit.facet==='context'){reached=true;t.tx.abort();}return value;};}return fn(t);},...args);
 try{const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(reached,true);assert.notEqual(first.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);const second=await f.session.run(h);assert.equal(second.processedState,'COMMITTED',JSON.stringify(second));assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).filter(a=>a.unit.key===f.key).length,1);assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
for(const refusal of ['context-field','input-field','processing'])test('temporal correction cannot borrow '+refusal+' authorization',async()=>{
 const f=await editedFixture({card:'now',temporal:temporalCases.expired});if(refusal==='processing')f.state.allowed=false;else f.state.processingHook=scope=>{if(refusal==='context-field')scope.contextItems[0].selectedFields=['body'];else scope.inputs=[];return scope;};try{const r=await f.session.run(await f.session.prepare(options));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal((await acks(f.s)).length,0);}finally{f.session.dispose();}
});

for(const defect of ['input-body','input-excluded','input-state','source-purge','source-missing','source-hidden','source-body','context-body','context-order','context-provenance','context-delete','receipt','restore','legacy-input','placement','revoke'])test('closed Context correction fence rejects '+defect+' after backup generation is staged',async()=>{
 const f=await editedFixture(),before=await row(f),original=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const value=await put(n,r,...rest);if(!reached&&n==='meta'&&r.id==='backup-data-generation'){reached=true;await alter(f,defect,t);}return value;};}return fn(t);},...args);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(reached,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
for(const defect of ['legacy-same-count','membership-added','removal-receipt'])test('closed restored Context fence rejects '+defect+' collection substitution',async()=>{
 const f=await restoredFixture(),original=f.s.repository.transaction.bind(f.s.repository);
 if(defect==='legacy-same-count')await original(true,t=>t.put('meta',{id:'memory:profile:'+JSON.stringify(['synthetic-unrelated']),kind:'profile',version:1,profileId:'synthetic-unrelated',name:'SYNTHETIC unrelated profile',budget:'standard',instruction:'',revision:0}));
 const before=await row(f);let reached=false;
 f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const value=await put(n,r,...rest);if(!reached&&n==='meta'&&r.id==='backup-data-generation'){reached=true;
  if(defect==='legacy-same-count'){await t.delete('meta','memory:profile:'+JSON.stringify(['synthetic-unrelated']));await alter(f,'legacy-input',t);}
  if(defect==='membership-added'){const p=(await t.all('placements'))[0];await put('placements',{...p,id:op(),entryId:op(),activeKey:0});}
  if(defect==='removal-receipt'){const receipt=await t.get('operationReceipts','context:'+f.deletion.operationId);receipt.digest='0'.repeat(64);await put('operationReceipts',receipt);}
 }return value;};}return fn(t);},...args);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(reached,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});

for(const action of ['edit','restore'])test('complete body and note Context '+action+' retains exact original fields with independent note permission',async()=>{
 const f=await(action==='restore'?restoredFixture:editedFixture)({fields:['body','note']}),before=await row(f);
 try{const r=await f.session.run(await f.session.prepare(options));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));assert.equal(f.calls.length,1);assert.deepEqual(f.scopes[0].inputs,[{inputId:f.input.id,selectedFields:['body','note']}]);const input=f.calls[0].material.inputs.find(i=>i.inputId===f.input.id);assert.equal(input.body,'SYNTHETIC eligible source body');assert.equal(input.note,'SYNTHETIC eligible note');assert.deepEqual(f.calls[0].material.contextItems[0].inputFields,[{inputId:f.input.id,selectedFields:['body','note']}]);assert.deepEqual(await row(f),before);assert.deepEqual((await acks(f.s)).map(x=>[x.unit.facet,x.outcome]),[['context','NO_CHANGE']]);assert.deepEqual((await raw(f.s,'meta',DIRTY_PREFIX+f.key)).pendingFacets,['topic']);}finally{f.session.dispose();}
});

for(const fields of [['body','note'],['note']])for(const denial of ['note','context','extra-input','processing'])test('exact '+fields.join('+')+' correction refuses independent '+denial+' grant loss before selected note hashing',async()=>{
 const f=await editedFixture({fields});if(denial==='processing')f.state.allowed=false;else f.state.processingHook=scope=>{if(denial==='note')scope.inputs[0].selectedFields=['body'];if(denial==='context')delete scope.contextItems;if(denial==='extra-input')scope.inputs.push({inputId:op(),selectedFields:['body','note']});return scope;};
 const proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let hashes=0;proto.digest=function(a,b){if(new TextDecoder().decode(b)==='SYNTHETIC eligible note')hashes++;return original.call(this,a,b);};
 try{const result=await f.session.run(await f.session.prepare(options));assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,0);assert.equal(hashes,0);assert.equal((await acks(f.s)).length,0);}finally{proto.digest=original;f.session.dispose();}
});
for(const fields of [['body','note'],['note']])for(const phase of ['before','provider','settlement','backup'])for(const defect of ['note','source-purge','receipt','revoke'])test('complete '+fields.join('+')+' lineage '+phase+' rejects '+defect+' without a Context ACK',async()=>{
 const f=await editedFixture({fields}),original=f.s.repository.transaction.bind(f.s.repository),before=await row(f);let reached=false;
 const change=async t=>{reached=true;if(defect==='note'){const r=await t.get('blocks',f.input.id);r.value.note+=' SYNTHETIC DRIFT';await t.put('blocks',r);}else await alter(f,defect,t);};
 if(phase==='before')await original(true,change);else if(phase==='provider')f.state.providerHook=()=>original(true,change);else f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{const value=await put(n,r,...rest);if(!reached&&n==='meta'&&(phase==='backup'?r.id==='backup-data-generation':r.id==='aiu:counters:v1'&&r.localResolved>0))await change(t);return value;};}return fn(t);},...args);
 try{let result;try{result=await f.session.run(await f.session.prepare(options));}catch(error){assert.ok(['STALE_BASE','UNAVAILABLE'].includes(error.code));}assert.equal(reached,true);assert.notEqual(result?.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);assert.equal(f.calls.length,phase==='before'?0:1);if(['settlement','backup'].includes(phase))assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});
import {createMaintenanceServiceResponseAdapter} from '../core/ai-usage/maintenance-service-response.js';
import {maintenanceSourceResponse} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';
for(const fields of [['body','note'],['note']])for(const defect of ['none','foreign-item','unknown-field'])test('original source response adapter carries complete '+fields.join('+')+' correction '+defect,async()=>{
 const f=await restoredFixture({fields}),before=await row(f),owner=createMaintenanceServiceResponseAdapter();f.session.dispose();f.service.responseAdapter=owner.adapter;
 f.provider.execute=async payload=>{f.calls.push(structuredClone(payload));owner.registerChild({s:f.s,read:fn=>f.s.repository.transaction(false,fn)},payload,()=>f.state.allowed&&!f.controller.signal.aborted,f.controller.signal);const value=maintenanceSourceResponse(payload,{body:'SYNTHETIC model proposal must not overwrite human'});if(defect==='foreign-item')value.context.groups[0].itemId=op();if(defect==='unknown-field')value.context.groups[0].authorization=true;return {accepted:true,operationReceiptId:'synthetic-'+payload.childOperationId,value};};f.session=f.make();
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(f.calls.length,1);if(defect==='none'){assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal((await acks(f.s)).length,1);}else{assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f.s)).length,0);}assert.deepEqual(await row(f),before);}finally{owner.dispose();f.session.dispose();}
});

for(const fields of [['body','note'],['note']])test('complete '+fields.join('+')+' correction ACK failure retries one physical response with unchanged human fields',async()=>{
 const f=await restoredFixture({fields}),before=await row(f),original=f.s.repository.transaction.bind(f.s.repository);let injected=false;
 f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,r,...rest)=>{if(!injected&&n==='organizerWorkItems'&&r.state==='ACKNOWLEDGED'){injected=true;throw Object.assign(Error('synthetic note ACK abort'),{code:'STORAGE_FAILED'});}return put(n,r,...rest);};}return fn(t);},...args);
 try{const h=await f.session.prepare(options),first=await f.session.run(h);assert.equal(injected,true);assert.notEqual(first.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,0);assert.deepEqual(await row(f),before);f.s.repository.transaction=original;const retry=await f.session.run(h);assert.equal(retry.processedState,'COMMITTED',JSON.stringify(retry));assert.equal(f.calls.length,1);assert.equal((await acks(f.s)).length,1);assert.deepEqual(await row(f),before);}finally{f.s.repository.transaction=original;f.session.dispose();}
});

for(const action of ['edit','restore'])test('note-only original Context '+action+' sends only its independently selected note field',async()=>{
 const f=await(action==='restore'?restoredFixture:editedFixture)({fields:['note']}),before=await row(f);
 try{const result=await f.session.run(await f.session.prepare(options));assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);assert.deepEqual(f.scopes[0].inputs,[{inputId:f.input.id,selectedFields:['note']}]);const input=f.calls[0].material.inputs[0];assert.deepEqual(Object.keys(input).sort(),['inputId','note','ref','revision']);assert.equal(input.note,'SYNTHETIC eligible note');assert.doesNotMatch(JSON.stringify(f.calls[0].material),/SYNTHETIC eligible source body/);assert.deepEqual(f.calls[0].material.contextItems[0].inputFields,[{inputId:f.input.id,selectedFields:['note']}]);assert.deepEqual(await row(f),before);assert.deepEqual((await acks(f.s)).map(x=>[x.unit.facet,x.outcome]),[['context','NO_CHANGE']]);}finally{f.session.dispose();}
});
