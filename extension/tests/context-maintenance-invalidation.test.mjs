import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,validContextCards} from '../core/context-cards.js';
import {ContextMaintenanceService,validateContextMaintenanceChange,validateContextMaintenanceNoChange,validateContextMaintenanceInvalidation} from '../core/context-maintenance.js';
import {ContextReadService} from '../core/context-read.js';
import {readContextTopicScope,readContextProcessingPreflight,CONTEXT_PROCESSING_PREFLIGHT_LIMITS} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {contextLineageSourceIds,readableContextItems,contextEvidenceIdentity} from '../core/context-item-lineage.js';
import {MemoryService} from '../core/memory/service.js';
import {key} from '../core/memory/model.js';
import {BackupService as ExistingFileFixture} from './harness/historical-backup.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BACKUP_SECTIONS,backupHash,projectBackupEntity,validateBackupItem} from '../core/backup-format.js';

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
const manual=(c,body='SYNTHETIC human takeover')=>({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body,section:'SYNTHETIC human section'});
async function outcome(f,c){return f.service.outcome(f.caller,{operationId:c.operationId,digest:await hashText(JSON.stringify(c)),epoch:c.epoch,scope:f.state.scope});}
async function open(f){for(const key of ['global','info','rules','now']){const current=await row(f);await f.cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:current?.access[key].revision||0});}}
function reader(f){const caller={},verifier={async verify(actual,store){return actual===caller?{version:1,store,connectionId:'synthetic-connection',accountId:'synthetic-account',authorizationGeneration:1,readable:true,online:true,expiresAt:Date.now()+60000}:null;},isCurrent(actual){return actual===caller;}};return {caller,service:new ContextReadService(f.s,{connectionVerifier:verifier})};}
const draft=c=>({kind:'context_item',ownerId:c.itemId,epoch:c.epoch,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:manual(c)}});


const noChange=(c,extra={})=>({operation:'NO_CHANGE',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,associationIds:[...c.associationIds],evidence:structuredClone(c.evidence),...extra});

const invalidation=c=>{const {body,section,...rest}=c;return {...rest,operation:'REMOVE_CANDIDATE',operationId:op(),expectedRevision:1};};
test('automatic invalidation preserves exact body/provenance and removes all readable surfaces without a human tombstone',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const before=await row(f),q=invalidation(c),r=await f.service.invalidate(f.caller,q),after=await row(f),item=after.items[0];assert.equal(r.disposition,'invalidated');assert.equal(item.lifecycle,'invalidated');assert.equal(item.deletedBy,null);assert.equal(item.protected,false);assert.equal(item.userEdited,false);assert.equal(item.revision,2);assert.equal(item.body,before.items[0].body);assert.deepEqual(item.maintenance.provenance,before.items[0].maintenance.provenance);assert.deepEqual(after.access,before.access);assert.equal(validContextCards(after),true);assert.deepEqual((await f.cards.snapshot()).items,[]);assert.deepEqual((await readableContextItems(f.s,after.items,{epoch:'initial'})).items,[]);assert.deepEqual(await f.service.invalidate(f.caller,q),r);assert.equal((await row(f)).items[0].revision,2);assert.equal((await outcome(f,q)).result.disposition,'invalidated');
});
for(const defect of ['manual','protected','removed','revision','association','card','foreign-evidence','epoch','revoked','stale-evidence'])test('invalidation rejects '+defect+' with zero mutation/receipt',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);let q=invalidation(c);
 if(defect==='manual'){const itemId=op();await f.cards.change({...manual(c),itemId,expectedRevision:0});q.itemId=itemId;}
 if(defect==='protected')await f.cards.change(manual(c));if(defect==='removed')await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1});if(defect==='revision')q.expectedRevision=8;if(defect==='association')q.associationIds=[op()];if(defect==='card')q.card='now';if(defect==='epoch')q.epoch='new';if(defect==='revoked')f.controller.abort();if(defect==='stale-evidence')await inputEdit(f.s,f.input.id,{libraryText:'Changed'});
 if(defect==='foreign-evidence'){await f.s.capture(capture((await f.s.status()).epoch,'other-input','SYNTHETIC unrelated'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id),topic=await f.s.createTopic({name:'Other topic',operationId:op()});await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});q.evidence=(await request({...f,input,topic})).evidence;}
 const before=await snapshot(f.s);let r;try{r=await f.service.invalidate(f.caller,q);}catch(e){assert.ok(['INVALID_REQUEST','CONTEXT_INVALIDATED'].includes(e.code));}if(r)assert.equal(r.conflict,true);assert.deepEqual(await snapshot(f.s),before);
});
test('same evidence cannot reactivate; genuine changed qualified body can update the same automatic identity',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.service.invalidate(f.caller,invalidation(c));const update={...c,operationId:op(),expectedRevision:2,body:'New candidate'};assert.equal((await put(f,update)).conflict,true);assert.equal((await row(f)).items[0].lifecycle,'invalidated');await f.s.capture(capture((await f.s.status()).epoch,'new-qualified-correction','SYNTHETIC newly corrected fact'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[f.topic.id]});update.evidence=[...(await request(f)).evidence,...(await request({...f,input})).evidence];update.operationId=op();const result=await put(f,update);assert.equal(result.disposition,'updated');const item=(await row(f)).items[0];assert.equal(item.id,c.itemId);assert.equal(item.lifecycle,'active');assert.equal(item.revision,3);assert.equal(item.body,update.body);assert.equal(Object.hasOwn(item.maintenance,'invalidation'),false);assert.equal((await f.cards.snapshot()).items.length,1);
});
test('new correction evidence must include target old authorized closure and preserve both source closures',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.s.capture(capture((await f.s.status()).epoch,'correction-input','SYNTHETIC correction'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[f.topic.id]});const original=(await request(f)).evidence,correction=(await request({...f,input})).evidence,q={...invalidation(c),evidence:[...original,...correction]};assert.equal((await f.service.invalidate(f.caller,q)).disposition,'invalidated');const item=(await row(f)).items[0];assert.equal(item.maintenance.provenance.evidence.length,1);assert.equal(item.maintenance.invalidation.evidence.length,2);assert.equal(contextLineageSourceIds(item).length,2);
 const same={...c,operationId:op(),expectedRevision:2,evidence:[...q.evidence].reverse(),body:'Forbidden same facts'};assert.equal((await put(f,same)).conflict,true);const missing={...same,operationId:op(),evidence:original};assert.equal((await put(f,missing)).conflict,true);
});
test('human edits cannot use invalidated identity and schema rejects invalidated manual/protected or stale marker',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const legacy=await row(f);assert.equal(validContextCards(legacy),true);await f.service.invalidate(f.caller,invalidation(c));const before=await row(f);assert.equal((await f.cards.change({...manual(c),expectedRevision:2})).conflict,true);assert.deepEqual(await row(f),before);
 for(const change of [{origin:'manual'},{protected:true,userEdited:true},{deletedBy:op()},{lifecycle:'active'},{lifecycle:'removed'}]){const bad=structuredClone(before);Object.assign(bad.items[0],change);assert.equal(validContextCards(bad),false);}const missing=structuredClone(before);delete missing.items[0].maintenance.invalidation;assert.equal(validContextCards(missing),false);
});
for(const stage of ['receipt','generation'])test('invalidation '+stage+' failure rolls back item and receipt then exact retry succeeds',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const q=invalidation(c),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const original=t.put.bind(t);t.put=async(name,r,...args)=>{const value=await original(name,r,...args);if(!reached&&(stage==='receipt'?name==='operationReceipts'&&r.id==='context-maintenance:'+q.operationId:name==='meta'&&r.id==='backup-data-generation')){reached=true;throw Error('synthetic invalidation abort');}return value;};}return fn(t);},stores);
 try{await assert.rejects(f.service.invalidate(f.caller,q),{code:'STORAGE_FAILED'});assert.equal(reached,true);assert.deepEqual(await snapshot(f.s),before);}finally{f.s.repository.transaction=transaction;}assert.equal((await f.service.invalidate(f.caller,q)).disposition,'invalidated');
});
test('strict invalidation DTO accepts no body or zero revision, and ordinary maintenance cannot masquerade as it',async()=>{
 const f=await fixture(),c=await request(f),q=invalidation(c);for(const bad of [{...q,body:'replacement'},{...q,expectedRevision:0},{...q,operation:'UPDATE'},{...q,evidence:[]}])assert.throws(()=>validateContextMaintenanceInvalidation(bad));await assert.rejects(put(f,q));
});

test('old invalidation receipt cannot invalidate a later qualified update',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const q=invalidation(c);await f.service.invalidate(f.caller,q);await f.s.capture(capture((await f.s.status()).epoch,'later-qualified-evidence','SYNTHETIC later evidence'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[f.topic.id]});await put(f,{...c,operationId:op(),expectedRevision:2,body:'SYNTHETIC renewed',evidence:[...(await request(f)).evidence,...(await request({...f,input})).evidence]});const before=await row(f);assert.equal((await f.service.invalidate(f.caller,q)).disposition,'invalidated');assert.deepEqual(await row(f),before);assert.equal(before.items[0].lifecycle,'active');
});
test('invalidated evidence identity ignores evidence, fields, Source and association ordering',async()=>{
 const f=await fixture(),c=await request(f,{fields:['body','note'],associationIds:[op(),op()]});await put(f,c);const q=invalidation(c);await f.service.invalidate(f.caller,q);const evidence=structuredClone(c.evidence);evidence[0].selectedFields.reverse();const r=await put(f,{...c,operationId:op(),expectedRevision:2,associationIds:[...c.associationIds].reverse(),evidence});assert.equal(r.conflict,true);assert.equal((await row(f)).items[0].lifecycle,'invalidated');
});

test('external shallow and local preview reject old cursor and withhold invalidated text',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await open(f);await f.cards.change({...manual(c,'SYNTHETIC independent manual'),itemId:op(),expectedRevision:0});const external=reader(f),cap=Object.freeze({}),preview=new ContextReadService(f.s,{localPreviewCapability:cap});const first=await external.service.shallow(external.caller,{limit:1});assert.equal(first.items[0].itemId,c.itemId);assert.ok(first.nextCursor);const before=await preview.preview(cap,{kind:'shallow',options:{}});assert.equal(before.items.length,2);await f.service.invalidate(f.caller,invalidation(c));const stale=await external.service.shallow(external.caller,{limit:1,cursor:first.nextCursor});assert.equal(stale.available,false);const now=await external.service.shallow(external.caller),local=await preview.preview(cap,{kind:'shallow',options:{}});for(const value of [now,local]){assert.equal(value.available,true);assert.equal(value.items.length,1);assert.notEqual(value.items[0].itemId,c.itemId);assert.ok(!JSON.stringify(value).includes(c.body));}assert.notEqual(local.scopeVersion,before.scopeVersion);
});
test('actual legacy file replacement preserves invalidation locally and never imports its receipt or grants',async()=>{
 const source=await fixture(),file=await exported(new ExistingFileFixture(source.s)),f=await fixture(),c=await request(f);await put(f,c);const q=invalidation(c);await f.service.invalidate(f.caller,q);const before=await row(f),receipt=projectBackupEntity('receipts',await raw(f.s,'operationReceipts','context-maintenance:'+q.operationId));assert.throws(()=>validateBackupItem({type:'item',section:'receipts',value:receipt}),{code:'BACKUP_INVALID'});assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:CONTEXT_CARDS_ROW,data:before}}),{code:'BACKUP_INVALID'});
 const backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});await f.s.finishFoundation();assert.deepEqual(await row(f),before);assert.deepEqual((await f.cards.snapshot()).items,[]);await assert.rejects(f.service.invalidate(f.caller,q),{code:'CONTEXT_INVALIDATED'});
});
test('human takeover after evidence capture makes automatic invalidation refuse without a receipt',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);let checks=0;f.state.hook=async()=>{if(++checks===2)await f.cards.change(manual(c));};const q=invalidation(c);await assert.rejects(f.service.invalidate(f.caller,q),{code:'CONTEXT_INVALIDATED'});assert.equal((await row(f)).items[0].body,'SYNTHETIC human takeover');assert.equal(await raw(f.s,'operationReceipts','context-maintenance:'+q.operationId),undefined);
});

test('only invalidation Source still triggers original B-02 purge gate',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.service.invalidate(f.caller,invalidation(c));const automatic=structuredClone((await row(f)).items[0]);const target=await setup(OrganizerStore);await target.s.finishFoundation();const source=(await target.s.snapshot()).records[0];assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'unambiguous');
 // Original body evidence is retained as an unrelated unavailable modern family.
 // Only the qualified invalidation evidence identifies this target Source.
 const evidence=automatic.maintenance.provenance.evidence[0];evidence.inputId=op();evidence.sourceRecordIds=[op()];evidence.sourceIdentityTokens=['a'.repeat(64)];await target.s.write(async t=>{const cards=new ContextCardsService(target.s),row=await cards.row(t);row.items.push(automatic);row.sequence=1;assert.equal(validContextCards(row),true);await t.put('meta',row);});const before=await snapshot(target.s);assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'owner_gate_required');await assert.rejects(target.s.permanentDelete(source.id),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(target.s),before);
});
test('renames, layout grants and unselected revisions cannot make identical qualified evidence novel',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.service.invalidate(f.caller,invalidation(c));const p=(await row(f)).items[0].maintenance.invalidation,changed=structuredClone(p);changed.epoch='another-epoch';const e=changed.evidence[0];e.contentRevision++;e.expectedRemovalSequence++;e.expectedTopicBinding.epoch='another-epoch';e.expectedTopicBinding.layoutGeneration++;e.expectedTopicBinding.organizationOperationId=op();e.expectedTopicBinding.organizationOperationSequence=99;e.expectedTopicBinding.organizationOperationDigest='a'.repeat(64);assert.equal(contextEvidenceIdentity(changed),contextEvidenceIdentity(p));
});
