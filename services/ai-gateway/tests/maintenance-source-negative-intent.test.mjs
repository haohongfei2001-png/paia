import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceMaintenanceFixture} from './maintenance-source-response-fixture.mjs';
import {TopicFormationService} from '../../../extension/core/topic-formation.js';
import {ContextMaintenanceService} from '../../../extension/core/context-maintenance.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {readContextTopicScope} from '../../../extension/core/context-topic-scope.js';
import {inputProjection} from '../../../extension/core/thought-evidence.js';
import {hashText} from '../../../extension/core/dedupe.js';
const op=()=>crypto.randomUUID();
const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
for(const intent of ['removed','protected'])test('review: source ADD respects existing '+intent+' automatic lineage',async t=>{
 const f=await sourceMaintenanceFixture(t),commit=TopicFormationService.prototype.commit;let seeded;
 t.mock.method(TopicFormationService.prototype,'commit',async function(handle){
  const result=await commit.call(this,handle);if(seeded)return result;
  const topic=(await rows(f.s,'topics'))[0],input=(await rows(f.s,'inputStates'))[0],scope=await readContextTopicScope(f.s,{topicId:topic.id}),p=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,input.id));
  seeded={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC source mapped context 0',section:'Synthetic source context',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence}]};
  const owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier});assert.equal((await owner.maintain(f.caller,seeded)).disposition,'created');
  const cards=new ContextCardsService(f.s);await cards.change(intent==='removed'?{kind:'delete',operationId:op(),epoch:scope.binding.epoch,itemId:seeded.itemId,expectedRevision:1}:{kind:'put',operationId:op(),epoch:scope.binding.epoch,itemId:seeded.itemId,card:'info',expectedRevision:1,body:'SYNTHETIC user corrected prior claim',section:'Human'});
  return result;
 });
 const result=await f.run(),row=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
 assert.ok(seeded);console.log(JSON.stringify({intent,state:result.state,physical:f.physical(),items:row.items.map(x=>({id:x.id,body:x.body,lifecycle:x.lifecycle,protected:x.protected,associations:x.maintenance.associationIds}))}));
 assert.equal(row.items.filter(x=>x.id!==seeded.itemId&&x.lifecycle==='active').length,0,'must not recreate removed or human-corrected claim with a fresh association');
});
import {LocalMaintenanceSession} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {inputEdit} from '../../../extension/tests/harness/thought-m1.mjs';
for(const intent of ['removed','protected'])test('review: preexisting '+intent+' lineage cannot resurrect after later Input revision',async t=>{
 let previous;const f=await sourceMaintenanceFixture(t,{configure:async({local})=>{
  const session=new LocalMaintenanceSession(local.s,local.constructor);
  const result=await session.run(await session.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}));assert.equal(result.state,'COMMITTED');session.dispose();
  previous=(await local.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW))).items[0];
  const cards=new ContextCardsService(local.s);await cards.change(intent==='removed'?{kind:'delete',operationId:op(),epoch:'initial',itemId:previous.id,expectedRevision:1}:{kind:'put',operationId:op(),epoch:'initial',itemId:previous.id,card:'info',expectedRevision:1,body:'SYNTHETIC human corrected fact',section:'Human'});
  const input=(await rows(local.s,'inputStates'))[0];await inputEdit(local.s,input.id,{libraryText:'Synthetic explicit working input plus a new clarification'});
 },responsePatch:value=>{value.context[0].body=previous.body;for(const relation of value.topic.relations)relation.relation='same';}});
 const results=[];for(let i=0;i<3;i++){results.push(await f.run());if(f.physical())break;}
 const row=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
 console.log(JSON.stringify({intent,results,physical:f.physical(),items:row.items.map(x=>({id:x.id,body:x.body,lifecycle:x.lifecycle,protected:x.protected,associations:x.maintenance.associationIds}))}));
 assert.equal(f.physical(),1,'must exercise a new actual signed child');
 assert.equal(row.items.filter(x=>x.id!==previous.id&&x.lifecycle==='active').length,0,'must not recreate removed or human-corrected claim with a fresh association');
});

// The four independent probes above are retained byte-for-byte. These controls
// exercise final-owner races, exact ACKs/replay and unrelated Input admission.
const contextRow=s=>s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
const maintenanceReceipts=async s=>(await rows(s,'operationReceipts')).filter(r=>r.namespace==='context-maintenance');
const humanIntent=(s,item,intent)=>new ContextCardsService(s).change(intent==='removed'?{kind:'delete',operationId:op(),epoch:'initial',itemId:item.id,expectedRevision:item.revision}:{kind:'put',operationId:op(),epoch:'initial',itemId:item.id,card:item.card,expectedRevision:item.revision,body:'SYNTHETIC human correction',section:'Human'});
async function seedHistory(local,{intent=null,edit=true}={}){
 const session=new LocalMaintenanceSession(local.s,local.constructor);
 assert.equal((await session.run(await session.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}))).state,'COMMITTED');session.dispose();
 const item=(await contextRow(local.s)).items[0];if(intent)assert.equal((await humanIntent(local.s,item,intent)).ok,true);
 if(edit)await inputEdit(local.s,item.maintenance.provenance.evidence[0].inputId,{libraryText:'SYNTHETIC genuine later Input clarification'});
 return item;
}
const reuseTopic=value=>{for(const relation of value.topic.relations)relation.relation='same';};
async function assertContextPending(f,result,beforeReceipts,{retry=true}={}){
 assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='COMMITTED'));assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='FAILED'));
 const job=(await rows(f.s,'organizerJobs')).find(j=>j.id===result.jobId);assert.equal(job.committedCoverage.length,1);assert.ok(job.committedCoverage.every(u=>JSON.parse(u)[1]==='topic'));
 assert.deepEqual(await maintenanceReceipts(f.s),beforeReceipts);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal(f.physical(),1);
 if(retry){await f.run();assert.equal(f.physical(),1);assert.deepEqual(await maintenanceReceipts(f.s),beforeReceipts);}
}
for(const intent of ['removed','protected'])test('source negative lineage remains pending without extra receipt, ACK or provider retry: '+intent,async t=>{
 let previous;const f=await sourceMaintenanceFixture(t,{configure:async({local})=>{previous=await seedHistory(local,{intent});},responsePatch:reuseTopic}),before=await contextRow(f.s),receipts=await maintenanceReceipts(f.s);
 await assertContextPending(f,await f.run(),receipts);assert.deepEqual(await contextRow(f.s),before);assert.equal(before.items[0].id,previous.id);
});
for(const intent of ['active','removed','protected'])test('original final Context owner refuses '+intent+' Item lineage appearing after source IDs were allocated',async t=>{
 const f=await sourceMaintenanceFixture(t),maintain=ContextMaintenanceService.prototype.maintain,receipts=await maintenanceReceipts(f.s);let changed=false,mapped,previous;
 t.mock.method(ContextMaintenanceService.prototype,'maintain',async function(caller,change,options){if(!changed){mapped=structuredClone(change);changed=true;const seed={...structuredClone(change),operationId:op(),itemId:op(),associationIds:[op()],body:'SYNTHETIC prior claim'},owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier});assert.equal((await maintain.call(owner,f.caller,seed)).disposition,'created');previous=(await contextRow(f.s)).items[0];if(intent!=='active')assert.equal((await humanIntent(f.s,previous,intent)).ok,true);}return maintain.call(this,caller,change,options);});
 const result=await f.run();assert.equal(changed,true);assert.notEqual(mapped.itemId,previous.id);const expectedReceipts=await maintenanceReceipts(f.s);assert.equal(expectedReceipts.length,receipts.length+1);assert.ok(expectedReceipts.every(r=>r.ownerId!==mapped.itemId));await assertContextPending(f,result,expectedReceipts);const row=await contextRow(f.s);assert.equal(row.items.length,1);assert.equal(row.items[0].protected,intent!=='active');assert.equal(row.items[0].lifecycle,intent==='removed'?'removed':'active');
});
for(const stage of ['item','receipt'])for(const intent of ['active','removed','protected'])test('original final fresh ADD fence rolls back '+intent+' existing lineage drift after staged '+stage,async t=>{
 const f=await sourceMaintenanceFixture(t),before=await contextRow(f.s),receipts=await maintenanceReceipts(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let fired=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...args)=>{const result=await put(name,row,...args);if(!fired&&(stage==='item'?name==='meta'&&row.id===CONTEXT_CARDS_ROW:name==='operationReceipts'&&row.namespace==='context-maintenance')){
  fired=true;const current=await tx.get('meta',CONTEXT_CARDS_ROW),old=structuredClone(current.items[0]);old.id=op();old.maintenance.associationIds=[op()];old.order=current.sequence++;old.protected=old.userEdited=intent!=='active';if(intent==='removed'){old.lifecycle='removed';old.deletedBy=op();}current.items.push(old);await put('meta',current);
 }return result;};}return fn(tx);},stores);
 const result=await f.run();assert.equal(fired,true);f.s.repository.transaction=transaction;await assertContextPending(f,result,receipts,{retry:false});assert.deepEqual(await contextRow(f.s),before);
 // The injected in-transaction drift was rolled back, so a genuine retry may
 // now succeed, reusing the same child/Item rather than a second provider call.
 assert.equal((await f.run()).state,'COMMITTED');assert.equal(f.physical(),1);assert.equal((await contextRow(f.s)).items.length,1);
});

test('a genuinely different Input can still create an Item beside removed historical lineage',async t=>{
 let previous,otherInput;
 const f=await sourceMaintenanceFixture(t,{inputs:2,configure:async({local})=>{
  const seeded=await seedHistory(local,{edit:false}),first=seeded.maintenance.provenance.evidence[0];otherInput=seeded.maintenance.provenance.evidence[1].inputId;
  const {contentRevision,sourceRecordIds,sourceIdentityTokens,...evidence}=first,owner=new ContextMaintenanceService(local.s,{processingVerifier:local.verifier});
  assert.equal((await owner.maintain(local.caller,{operationId:op(),epoch:'initial',itemId:seeded.id,card:seeded.card,expectedRevision:seeded.revision,body:'SYNTHETIC first Input only',section:seeded.section,associationIds:seeded.maintenance.associationIds,evidence:[evidence]})).disposition,'updated');
  previous=(await contextRow(local.s)).items[0];assert.equal((await humanIntent(local.s,previous,'removed')).ok,true);await inputEdit(local.s,otherInput,{libraryText:'SYNTHETIC independently revised second Input'});
 },responsePatch:reuseTopic});
 let result;for(let i=0;i<3&&!f.physical();i++)result=await f.run();assert.equal(f.physical(),1,JSON.stringify(result));assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='COMMITTED'),JSON.stringify(result));
 const row=await contextRow(f.s);assert.equal(row.items.length,2);assert.equal(row.items.find(i=>i.id===previous.id).protected,true);const created=row.items.find(i=>i.id!==previous.id);assert.equal(created.lifecycle,'active');assert.notEqual(created.maintenance.provenance.evidence[0].inputId,previous.maintenance.provenance.evidence[0].inputId);assert.equal(f.server.saved().rows[0].resultCommitted,true);
});

test('negative admission uses original Input identity rather than shared Source, Topic, body or revision',async()=>{
 const {hasContextInputLineage:blocked}=await import('../../../extension/core/context-maintenance.js');
 const old={inputId:'original-input',topicId:'old-topic',contentRevision:1,fieldDigests:{body:'old-digest'},sourceRecordIds:['same-source']},row={items:[{origin:'automatic',protected:true,lifecycle:'active',maintenance:{provenance:{evidence:[old]}}}]};
 assert.equal(blocked(row,[{...old,inputId:'different-input'}]),false);assert.equal(blocked(row,[{...old,topicId:'new-topic',contentRevision:99,fieldDigests:{body:'new-digest'},sourceRecordIds:['different-source']}]),true);
});

for(const mode of ['same-claim','different-claim'])test('ADD-only source profile leaves preexisting active '+mode+' interpretation pending after Input edit',async t=>{
 let previous;const f=await sourceMaintenanceFixture(t,{configure:async({local})=>{previous=await seedHistory(local);},responsePatch:value=>{reuseTopic(value);value.context[0].body=mode==='same-claim'?previous.body:'SYNTHETIC separately proposed fact from the revised Input';}}),before=await contextRow(f.s),receipts=await maintenanceReceipts(f.s);
 await assertContextPending(f,await f.run(),receipts);assert.deepEqual(await contextRow(f.s),before);
});

test('original qualified association still supports explicit human restore and protected replay',async t=>{
 let previous;const f=await sourceMaintenanceFixture(t,{configure:async({local})=>{previous=await seedHistory(local,{edit:false});}}),cards=new ContextCardsService(f.s),deletion=op();
 assert.equal((await cards.change({kind:'delete',operationId:deletion,epoch:'initial',itemId:previous.id,expectedRevision:previous.revision})).ok,true);
 assert.equal((await cards.change({kind:'restore',operationId:op(),epoch:'initial',itemId:previous.id,expectedRevision:previous.revision+1,deletedBy:deletion})).ok,true);
 const restored=await contextRow(f.s);assert.equal(restored.items[0].lifecycle,'active');assert.equal(restored.items[0].protected,true);assert.deepEqual(restored.items[0].maintenance,previous.maintenance);
 const {createContextFreshInputPolicy}=await import('../../../extension/core/context-maintenance.js'),owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,freshInputPolicy:createContextFreshInputPolicy()}),change={operationId:op(),epoch:'initial',itemId:previous.id,card:previous.card,expectedRevision:previous.revision+2,body:previous.body,section:previous.section,associationIds:previous.maintenance.associationIds,evidence:previous.maintenance.provenance.evidence.map(({contentRevision,sourceRecordIds,sourceIdentityTokens,...e})=>e)};
 const result=await owner.maintain(f.caller,change);assert.equal(result.disposition,'protected');assert.deepEqual(await owner.maintain(f.caller,change),result);assert.deepEqual(await contextRow(f.s),restored);assert.equal(f.physical(),0);
});

test('source-only restrictive policy does not change original explicit fresh-claim caller contract',async t=>{
 let previous;const f=await sourceMaintenanceFixture(t,{configure:async({local})=>{previous=await seedHistory(local,{intent:'removed',edit:false});}}),owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}),change={operationId:op(),epoch:'initial',itemId:op(),card:previous.card,expectedRevision:0,body:'SYNTHETIC distinct explicitly qualified original claim',section:previous.section,associationIds:[op()],evidence:previous.maintenance.provenance.evidence.map(({contentRevision,sourceRecordIds,sourceIdentityTokens,...e})=>e)};
 assert.equal((await owner.maintain(f.caller,change)).disposition,'created');const row=await contextRow(f.s);assert.equal(row.items.length,2);assert.equal(row.items.find(i=>i.id===previous.id).lifecycle,'removed');assert.equal(f.physical(),0);
});

test('source context function retains its private final policy across adapter copies; JSON cannot forge policy',async t=>{
 const f=await sourceMaintenanceFixture(t),{createMaintenanceServiceResponseOwner,maintenanceResponseContextPolicy}=await import('../../../extension/core/ai-usage/maintenance-service-response.js'),owner=createMaintenanceServiceResponseOwner(f.s),policy=maintenanceResponseContextPolicy(owner.adapter);
 assert.ok(policy);assert.equal(maintenanceResponseContextPolicy({...owner.adapter}),policy);assert.equal(maintenanceResponseContextPolicy({context:()=>null,freshInputPolicy:policy}),null);assert.throws(()=>new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,freshInputPolicy:{}}),{code:'INVALID_REQUEST'});owner.dispose();assert.equal(f.physical(),0);
});
