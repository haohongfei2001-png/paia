// Original five safety assertions were RED on base 39408c1. The source-policy
// evidence-key repair promotes them into normal test discovery unchanged.
// Synthetic tail markers below remain separate from Foundation integration.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextMaintenanceService,createContextFreshInputPolicy,contextMaintenanceSettlementFence} from '../core/context-maintenance.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readAuthoredEntryContext,authoredContextEvidence,authoredSelectedFields,authoredSelectedText} from '../core/context-authored-entry.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID(),read=(s,fn)=>s.repository.transaction(false,fn);
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.setFilterMode('off');const topic=await s.createTopic({name:'SYNTHETIC guard Topic',operationId:op()}),entry=await s.createEntry({actor:'user',operationId:op(),body:'SYNTHETIC human source body',title:'SYNTHETIC selected title',note:'',type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const mapping=await read(s,t=>readAuthoredEntryContext(s,t,entry.id)),scope=await readContextTopicScope(s,{topicId:topic.id}),fields=authoredSelectedText(await read(s,t=>t.get('thoughts',entry.id)),authoredSelectedFields(mapping)),digests={};for(const [field,body]of Object.entries(fields))digests[field]=await hashText(body);
 const abort=new AbortController(),verifier={verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:true,expiresAt:Date.now()+600000,revocationSignal:abort.signal}),isCurrent:()=>!abort.signal.aborted};
 const change={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC claim',section:'Synthetic',associationIds:[op()],evidence:[authoredContextEvidence(mapping,scope.binding,digests)]};
 return {s,verifier,change,owner:new ContextMaintenanceService(s,{processingVerifier:verifier,freshInputPolicy:createContextFreshInputPolicy()})};
}
for(const state of ['removed','corrected'])test('source fresh policy must reject fresh identity over '+state+' human-derived Item',async()=>{
 const f=await fixture(),created=await f.owner.maintain({},f.change);assert.equal(created.disposition,'created');const cards=new ContextCardsService(f.s);await cards.change(state==='removed'?{kind:'delete',operationId:op(),epoch:f.change.epoch,itemId:f.change.itemId,expectedRevision:1}:{kind:'put',operationId:op(),epoch:f.change.epoch,itemId:f.change.itemId,expectedRevision:1,card:'info',body:'SYNTHETIC human correction',section:'Human'});
 const before=await read(f.s,t=>t.get('meta',CONTEXT_CARDS_ROW)),next={...f.change,operationId:op(),itemId:op(),associationIds:[op()]},result=await f.owner.maintain({},next);
 assert.equal(result.conflict,true,'a random new Item identity must not bypass unresolved human-owned lineage');assert.deepEqual(await read(f.s,t=>t.get('meta',CONTEXT_CARDS_ROW)),before);
});
// Exercise the authentic source-policy settlement fence after the original
// Context owner callback. Tail stages are explicit synthetic markers here;
// source integration must also exercise actual Foundation ACK/usage/job writes.
for(const stage of ['ack','usage','job'])test('source final settlement fence must reject same human lineage inserted at '+stage+' tail',async()=>{
 const f=await fixture(),before=await read(f.s,t=>t.get('meta',CONTEXT_CARDS_ROW));let hit=false;
 const owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,freshInputPolicy:createContextFreshInputPolicy(),writeTransaction:fn=>f.s.repository.transaction(true,async t=>{
  const result=await fn(t),fence=contextMaintenanceSettlementFence(result);assert.equal(typeof fence,'function');
  await t.put('meta',{id:'synthetic-human-source-tail:'+stage,value:true});const row=await t.get('meta',CONTEXT_CARDS_ROW),copy=structuredClone(row.items[0]);copy.id=op();copy.order=row.sequence++;copy.maintenance.associationIds=[op()];copy.protected=true;copy.userEdited=true;copy.body='SYNTHETIC late human correction';row.items.push(copy);await t.put('meta',row);hit=true;await fence(t);return result;
 })});
 await assert.rejects(owner.maintain({},f.change),{code:'CONTEXT_INVALIDATED'});assert.equal(hit,true);assert.deepEqual(await read(f.s,t=>t.get('meta',CONTEXT_CARDS_ROW)),before);assert.equal(await read(f.s,t=>t.get('operationReceipts','context-maintenance:'+f.change.operationId)),undefined);
});
