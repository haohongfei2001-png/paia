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
async function fixture(){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC recovery Topic'});await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC recovery source',note:''});const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 const caller={},controller=new AbortController(),verifier={async verify(actual,store,scope){return actual===caller&&store===f.s?{version:1,store,scope,accountId:'synthetic-recovery-account',processorId:'synthetic-recovery-processor',authorizationGeneration:1,processing:true,expiresAt:Date.now()+600000,revocationSignal:controller.signal}:null;},isCurrent(actual,r,store){return actual===caller&&store===f.s;}};
 const scope=await readContextTopicScope(f.s,{topicId:topic.id}),p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,input.id)),request={operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC automatic body',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence}]};await new ContextMaintenanceService(f.s,{processingVerifier:verifier}).maintain(caller,request);
 const values={...(await f.storage.get(STORAGE_KEY))},local=storage(values);Object.assign(f.storage,local);
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'};let listener,network=0;globalThis.indexedDB=f.indexedDB;globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>{listener=fn;}}},storage:{local:f.storage,session:storage({})}};globalThis.fetch=async()=>{network++;throw Error('SYNTHETIC unexpected network');};
 const restart=()=>import('../background/service-worker.js?ctx405-recovery='+op());await restart();const send=message=>new Promise(resolve=>listener(message,ui,resolve));
 return {...f,request,input,values,send,restart,network:()=>network};
}
for(const scenario of ['committed','newer_edit','unknown_receipt','wrong_digest','wrong_token','unsaved'])test('CTX4-05 actual worker restart handles '+scenario+' recovery without losing or reviving draft text',async()=>{
 const f=await fixture(),change={kind:'put',operationId:op(),epoch:'initial',itemId:f.request.itemId,card:'info',expectedRevision:1,body:'SYNTHETIC first human edit',section:'SYNTHETIC human section'},draft={kind:'context_item',ownerId:change.itemId,epoch:'initial',token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}},key='paia-recovery-draft:v1:context_item:'+change.itemId;
 assert.equal((await f.send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).ok,true);const resident=structuredClone(f.values[key]);
 if(scenario!=='unsaved')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change})).data.revision,2);
 if(scenario==='newer_edit')assert.equal((await f.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change:{...change,operationId:op(),expectedRevision:2,body:'SYNTHETIC later human edit'}})).data.revision,3);
 if(scenario==='unknown_receipt')await f.s.repository.transaction(true,t=>t.delete('operationReceipts','context:'+change.operationId));
 if(scenario==='wrong_digest')await f.s.repository.transaction(true,async t=>{const receipt=await t.get('operationReceipts','context:'+change.operationId);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);});
 if(scenario==='wrong_token'){resident.token=op();await f.storage.set({[key]:resident});}
 if(scenario==='unsaved')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC source changed after unsaved draft'});
 await f.restart();
 for(let n=0;n<2;n++){
  const listed=await f.send({type:'PAIA_CONTEXT_CARDS_DRAFTS'});
  if(['committed','newer_edit'].includes(scenario)){assert.deepEqual(listed,{ok:true,data:[]});assert.equal(f.values[key],undefined);}
  else{assert.deepEqual(listed,{ok:false,error:'UNAVAILABLE'});assert.deepEqual(f.values[key],resident);assert.ok(!JSON.stringify(listed).includes('SYNTHETIC'));}
 }
 const item=(await raw(f.s,'meta',CONTEXT_CARDS_ROW)).items[0];assert.equal(item.body,scenario==='newer_edit'?'SYNTHETIC later human edit':scenario==='unsaved'?f.request.body:change.body);assert.equal(f.network(),0);
});
