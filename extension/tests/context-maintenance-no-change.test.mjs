import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,validContextCards} from '../core/context-cards.js';
import {ContextMaintenanceService,validateContextMaintenanceChange,validateContextMaintenanceNoChange} from '../core/context-maintenance.js';
import {ContextReadService} from '../core/context-read.js';
import {readContextTopicScope,readContextProcessingPreflight,CONTEXT_PROCESSING_PREFLIGHT_LIMITS} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {contextLineageSourceIds} from '../core/context-item-lineage.js';
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
test('authenticated actual unchanged Item is checked and receipted without Context/body/revision mutation',async()=>{
 const f=await fixture(),created=await request(f);await put(f,created);const before=await row(f),q=noChange(created),r=await f.service.noChange(f.caller,q);assert.deepEqual(r,{ok:true,itemId:q.itemId,revision:1,disposition:'no_change',externalAllowed:false});assert.deepEqual(await row(f),before);const receipt=await raw(f.s,'operationReceipts','context-maintenance:'+q.operationId);assert.equal(receipt.result.disposition,'no_change');assert.ok(!JSON.stringify(receipt).includes('SYNTHETIC'));assert.deepEqual(await f.service.noChange(f.caller,q),r);
});


for(const defect of ['missing','manual','protected','removed','revision','card','association','unrelated-input','source-gap','scope-revision','processing','expiry','revoked'])test('declared no-change rejects '+defect+' without a receipt or Item mutation',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);let q=noChange(c);
 if(defect==='missing')q.itemId=op();if(defect==='manual'){const mid=op();await f.cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:mid,expectedRevision:0,card:'info',body:'SYNTHETIC manual',section:'Human'});q.itemId=mid;}
 if(defect==='protected')await f.cards.change(manual(c));if(defect==='removed')await f.cards.change({kind:'delete',operationId:op(),epoch:c.epoch,itemId:c.itemId,expectedRevision:1});if(defect==='revision')q.expectedRevision=2;if(defect==='card')q.card='rules';if(defect==='association')q.associationIds=[op()];
 if(defect==='unrelated-input'){await f.s.capture(capture((await f.s.status()).epoch,'unrelated-no-change','SYNTHETIC unrelated source'));const input=(await f.s.snapshot()).library.blocks.find(b=>b.id!==f.input.id),r=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:r.revision,topicIds:[f.topic.id]});q={...q,evidence:(await request({...f,input})).evidence};}
 if(defect==='source-gap')await f.s.repository.transaction(true,t=>t.delete('records',f.input.originalTextReference));if(defect==='scope-revision')await inputEdit(f.s,f.input.id,{libraryText:'Changed declared evidence'});if(defect==='processing')f.state.processing=false;if(defect==='expiry')f.state.expiresAt=Date.now()-1;if(defect==='revoked')f.controller.abort();
 const before=await snapshot(f.s);let r,refused=false;try{r=await f.service.noChange(f.caller,q);}catch(error){assert.ok(['CONTEXT_INVALIDATED','INVALID_REQUEST'].includes(error.code),'finite original refusal for '+defect+': '+error.code);refused=true;}if(!refused)assert.equal(r?.conflict,true);assert.deepEqual(await snapshot(f.s),before);assert.equal(await raw(f.s,'operationReceipts','context-maintenance:'+q.operationId),undefined);
});

test('no-change exact parsing requires explicit operation and evidence; equality or empty body is never inferred',async()=>{
 const f=await fixture(),c=await request(f),q=noChange(c);
 for(const bad of [{...q,operation:'UPDATE'},{...q,body:''},{...q,body:c.body},{...q,section:c.section},{...q,expectedRevision:0},{...q,associationIds:[]},{...q,evidence:[]},{...q,evidence:[q.evidence[0],q.evidence[0]]},{...q,evidence:[{...q.evidence[0],sourceRecordIds:['forged']}]},{...q,operation:undefined}])assert.throws(()=>validateContextMaintenanceNoChange(bad),{code:'INVALID_REQUEST'});
 await assert.rejects(f.service.maintain(f.caller,q),{code:'INVALID_REQUEST'});await assert.rejects(f.service.noChange({...f.caller},q));assert.equal(await row(f),undefined);
});

for(const stage of ['receipt','generation'])test('no-change '+stage+' write abort rolls back body-free receipt and all stores',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const q=noChange(c),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const original=t.put.bind(t);t.put=async(name,r,...args)=>{const value=await original(name,r,...args);if(!reached&&(stage==='receipt'?name==='operationReceipts'&&r.id==='context-maintenance:'+q.operationId:name==='meta'&&r.id==='backup-data-generation')){reached=true;throw Error('synthetic no-change abort');}return value;};}return fn(t);},stores);
 try{await assert.rejects(f.service.noChange(f.caller,q),{code:'STORAGE_FAILED'});assert.equal(reached,true);assert.deepEqual(await snapshot(f.s),before);}finally{f.s.repository.transaction=transaction;}
 const result=await f.service.noChange(f.caller,q);assert.equal(result.disposition,'no_change');assert.equal((await row(f)).items[0].revision,1);
});

test('forged no-change historical receipt cannot masquerade as a prior upsert or checked subset',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const q=noChange(c);await f.service.noChange(f.caller,q);const receipt=await raw(f.s,'operationReceipts','context-maintenance:'+q.operationId);
 await f.s.repository.transaction(true,t=>t.put('operationReceipts',{...receipt,expectedRevision:0}));await assert.rejects(f.service.noChange(f.caller,q),{code:'INVALID_REQUEST'});
 await f.s.repository.transaction(true,t=>t.put('operationReceipts',receipt));await assert.rejects(f.service.noChange(f.caller,{...q,evidence:[],operationId:q.operationId}),{code:'INVALID_REQUEST'});const bad={...c,operationId:q.operationId,expectedRevision:1};await assert.rejects(f.service.maintain(f.caller,bad),{code:'INVALID_REQUEST'});
});


test('authenticated checked subset leaves other real provenance and Item bytes unchanged',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.s.capture(capture((await f.s.status()).epoch,'second-registered-source','SYNTHETIC second related Input'));const input=(await f.s.snapshot()).library.blocks.find(b=>b.id!==f.input.id),r=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:r.revision,topicIds:[f.topic.id]});
 const first=await request(f),second=await request({...f,input}),update={...c,operationId:op(),expectedRevision:1,evidence:[...first.evidence,...second.evidence]};await put(f,update);const before=await row(f),q=noChange(update,{expectedRevision:2,evidence:first.evidence});assert.equal((await f.service.noChange(f.caller,q)).disposition,'no_change');assert.deepEqual(await row(f),before);assert.equal(before.items[0].maintenance.provenance.evidence.length,2);assert.equal(q.evidence.length,1);
});
