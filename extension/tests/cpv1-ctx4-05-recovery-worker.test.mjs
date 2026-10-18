import {observeLocalWorkerDrains} from './harness/local-worker-drains.mjs';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {STORAGE_KEY} from '../core/constants.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const storage=values=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(values):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,structuredClone(values[k])])),set:async rows=>Object.assign(values,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete values[key];},getBytesInUse:async()=>0});
async function fixture(t){
 const drains=observeLocalWorkerDrains();t.after(async()=>{try{await drains.idle();}finally{drains.dispose();}});
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC recovery Topic'});await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC recovery source',note:''});const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 const caller={},controller=new AbortController(),verifier={async verify(actual,store,scope){return actual===caller&&store===f.s?{version:1,store,scope,accountId:'synthetic-recovery-account',processorId:'synthetic-recovery-processor',authorizationGeneration:1,processing:true,expiresAt:Date.now()+600000,revocationSignal:controller.signal}:null;},isCurrent(actual,r,store){return actual===caller&&store===f.s;}};
 const scope=await readContextTopicScope(f.s,{topicId:topic.id}),p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,input.id)),request={operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC automatic body',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence}]};await new ContextMaintenanceService(f.s,{processingVerifier:verifier}).maintain(caller,request);
 const values={...(await f.storage.get(STORAGE_KEY))},local=storage(values);Object.assign(f.storage,local);
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'};let listener,network=0;globalThis.indexedDB=f.indexedDB;globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>{listener=fn;}}},storage:{local:f.storage,session:storage({})}};globalThis.fetch=async()=>{network++;throw Error('SYNTHETIC unexpected network');};
 toolbarRegistrationFixture(globalThis.chrome);const send=message=>new Promise(resolve=>listener(message,ui,resolve));const restart=async()=>{await drains.idle();await import('../background/service-worker.js?ctx405-recovery='+op());assert.equal((await send({type:'PAIA_CONTEXT_CONNECTIONS_STATUS'})).ok,true);await drains.idle();};await restart();
 return {...f,request,input,values,send,restart,drains,network:()=>network};
}
for(const scenario of ['committed','newer_edit','unknown_receipt','wrong_digest','wrong_token','unsaved'])test('CTX4-05 actual worker restart handles '+scenario+' recovery without losing or reviving draft text',async t=>{
 const f=await fixture(t),change={kind:'put',operationId:op(),epoch:'initial',itemId:f.request.itemId,card:'info',expectedRevision:1,body:'SYNTHETIC first human edit',section:'SYNTHETIC human section'},draft={kind:'context_item',ownerId:change.itemId,epoch:'initial',token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}},key='paia-recovery-draft:v1:context_item:'+change.itemId;
 assert.equal((await f.send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).ok,true);const resident=structuredClone(f.values[key]);
 if(scenario!=='unsaved')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change})).data.revision,2);
 if(scenario==='newer_edit')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change:{...change,operationId:op(),expectedRevision:2,body:'SYNTHETIC later human edit'}})).data.revision,3);
 if(scenario==='unknown_receipt')await f.s.repository.transaction(true,t=>t.delete('operationReceipts','context:'+change.operationId));
 if(scenario==='wrong_digest')await f.s.repository.transaction(true,async t=>{const receipt=await t.get('operationReceipts','context:'+change.operationId);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);});
 if(scenario==='wrong_token'){resident.token=op();await f.storage.set({[key]:resident});}
 if(scenario==='unsaved')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC source changed after unsaved draft'});
 await f.drains.idle();if(scenario!=='unsaved')f.drains.assertOwners();await f.restart();
 for(let n=0;n<2;n++){
  const listed=await f.send({type:'PAIA_CONTEXT_CARDS_DRAFTS'});
  if(['committed','newer_edit'].includes(scenario)){assert.deepEqual(listed,{ok:true,data:[]});assert.equal(f.values[key],undefined);}
  else{assert.deepEqual(listed,{ok:false,error:'UNAVAILABLE'});assert.deepEqual(f.values[key],resident);assert.ok(!JSON.stringify(listed).includes('SYNTHETIC'));}
 }
 const item=(await raw(f.s,'meta',CONTEXT_CARDS_ROW)).items[0];assert.equal(item.body,scenario==='newer_edit'?'SYNTHETIC later human edit':scenario==='unsaved'?f.request.body:change.body);assert.equal(f.network(),0);
});

// Manual edits use the same original durable receipt proof as protected automatic
// edits. A matching body alone cannot retire recovery state after a lost clear.
const manualCases=['committed','newer_edit','unknown_receipt','wrong_digest','wrong_token','unsaved','wrong_receipt_owner','wrong_receipt_epoch','wrong_namespace','wrong_result_revision','wrong_result_item','wrong_result_lifecycle','wrong_result_ok','extra_receipt_field','different_current_body','different_current_section','newer_draft','clear_failed'];
for(const scenario of manualCases)test('CTX4-05 actual worker manual recovery exact receipt '+scenario,async t=>{
 const f=await fixture(t),first={kind:'put',operationId:op(),epoch:'initial',itemId:op(),card:'now',expectedRevision:0,body:'SYNTHETIC manual original body',section:'SYNTHETIC manual section'};
 assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change:first})).data.revision,1);
 const change={...first,operationId:op(),expectedRevision:1,body:'SYNTHETIC manual committed edit'},draft={kind:'context_item',ownerId:change.itemId,epoch:'initial',token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}},key='paia-recovery-draft:v1:context_item:'+change.itemId;
 assert.equal((await f.send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).ok,true);
 if(scenario!=='unsaved')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change})).data.revision,2);
 if(scenario==='newer_edit')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change:{...change,operationId:op(),expectedRevision:2,body:'SYNTHETIC later manual edit'}})).data.revision,3);
 if(scenario==='unknown_receipt')await f.s.repository.transaction(true,t=>t.delete('operationReceipts','context:'+change.operationId));
 const receiptChanges={wrong_digest:r=>{r.digest='0'.repeat(64);},wrong_receipt_owner:r=>{r.ownerId=op();},wrong_receipt_epoch:r=>{r.epoch='different-epoch';},wrong_namespace:r=>{r.namespace='different-owner';},wrong_result_revision:r=>{r.result.revision++;},wrong_result_item:r=>{r.result.itemId=op();},wrong_result_lifecycle:r=>{r.result.lifecycle='removed';},wrong_result_ok:r=>{r.result.ok=false;},extra_receipt_field:r=>{r.card='rules';}};
 if(receiptChanges[scenario])await f.s.repository.transaction(true,async t=>{const r=await t.get('operationReceipts','context:'+change.operationId);receiptChanges[scenario](r);await t.put('operationReceipts',r);});
 if(['different_current_body','different_current_section'].includes(scenario))await f.s.repository.transaction(true,async t=>{const row=await t.get('meta',CONTEXT_CARDS_ROW),item=row.items.find(x=>x.id===change.itemId);if(scenario==='different_current_body')item.body='SYNTHETIC unrelated same-revision body';else item.section='SYNTHETIC unrelated same-revision section';await t.put('meta',row);});
 if(scenario==='wrong_token'){const value=structuredClone(f.values[key]);value.token=op();await f.storage.set({[key]:value});}
 if(scenario==='newer_draft'){const next={...change,operationId:op(),expectedRevision:2,body:'SYNTHETIC newer unsaved manual text'};assert.equal((await f.send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:{...draft,token:next.operationId,operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:next}}})).ok,true);}
 const resident=structuredClone(f.values[key]);await f.drains.idle();if(scenario!=='unsaved')f.drains.assertOwners();await f.restart();
 const before=await f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));assert.equal(Object.keys(before).length,37);
 const remove=f.storage.remove;if(scenario==='clear_failed')f.storage.remove=async keys=>{if((Array.isArray(keys)?keys:[keys]).includes(key))throw Error('SYNTHETIC recovery clear unavailable');return remove(keys);};
 try{for(let n=0;n<2;n++){
  const result=await f.send({type:'PAIA_RECOVERY_DRAFT_LOAD',draft:{kind:'context_item',ownerId:change.itemId,epoch:'initial'}});
  if(['committed','newer_edit'].includes(scenario)){assert.deepEqual(result,{ok:true,data:null});assert.equal(f.values[key],undefined);}
  else if(scenario==='clear_failed'){assert.deepEqual(result,{ok:false,error:'STORAGE_FAILED'});assert.deepEqual(f.values[key],resident);assert.ok(!JSON.stringify(result).includes('SYNTHETIC'));}
  else{assert.deepEqual(result,{ok:true,data:resident});assert.deepEqual(f.values[key],resident);}
  const after=await f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));assert.deepEqual(after,before,'recovery reads/clears never change any canonical store');
 }}finally{f.storage.remove=remove;}
 assert.equal(f.network(),0);
});
test('CTX4-05 original manual receipt predicate refuses wrong card, source envelope and owner/epoch/token substitution',async t=>{
 const f=await fixture(t),change={kind:'put',operationId:op(),epoch:'initial',itemId:op(),card:'now',expectedRevision:0,body:'SYNTHETIC original manual receipt',section:'SYNTHETIC original section'},draft={kind:'context_item',ownerId:change.itemId,epoch:'initial',token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}};
 assert.equal((await f.send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).ok,true);assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change})).data.revision,1);
 const resident=structuredClone(f.values['paia-recovery-draft:v1:context_item:'+change.itemId]),service=new ContextCardsService(f.s),sourceId=(await raw(f.s,'inputStates',f.input.id)).sourceRecordIds[0];
 for(const invalid of [{...resident,sourceRecordIds:[sourceId]},{...resident,ownerId:op()},{...resident,epoch:'different-epoch'},{...resident,token:op()},{...resident,operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:{...change,card:'rules'}}}])assert.equal(await service.recoveryCommitted(invalid),false);
 assert.equal(await service.recoveryCommitted(resident),true);
 assert.deepEqual(f.values['paia-recovery-draft:v1:context_item:'+change.itemId],resident,'predicate itself never removes recovery state');assert.equal(f.network(),0);
});

