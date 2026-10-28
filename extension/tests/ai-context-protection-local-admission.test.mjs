import test from 'node:test';
import assert from 'node:assert/strict';
import {localMaintenanceFixture} from '../../services/ai-gateway/tests/maintenance-local-fixture.mjs';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {createContextScopeWorkBudget} from '../core/context-topic-scope.js';
import {requireMaintenanceProcessingContext} from '../core/ai-usage/maintenance-processing-source-denial.js';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
const op=()=>crypto.randomUUID(),clone=x=>structuredClone(x),read=(s,n,id)=>s.repository.transaction(false,t=>id?t.get(n,id):t.all(n));
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};

// Component control: the marker below opts this Foundation into the existing
// source-only rejection, but is not a source installer or processing grant.
// Separate configured-source controls exercise the actual private installer.
async function fixture(t,{manual=false}={}){
 const f=await localMaintenanceFixture();assert.equal((await f.session.run(await f.session.prepare(options))).state,'COMMITTED');f.session.dispose();
 const cards=new ContextCardsService(f.s),automatic=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0];
 await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:automatic.id,expectedRevision:automatic.revision,card:automatic.card,body:automatic.body,section:automatic.section});
 let manualId=null;if(manual){manualId=op();await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:manualId,expectedRevision:0,card:'info',body:'SYNTHETIC unrelated manual body',section:'SYNTHETIC manual section'});}
 const ids=[automatic.id,...(manualId?[manualId]:[])],items=[];
 for(const id of ids){const dirty=await read(f.s,'meta',DIRTY_PREFIX+JSON.stringify(['context_item',id]));assert.ok(dirty);items.push({key:dirty.descriptor.key,signature:dirty.signature,descriptor:clone(dirty.descriptor)});}
 const coverage=items.flatMap(i=>['topic','context'].map(facet=>({key:i.key,facet,scope:options.scope}))),request={type:'AI_MAINTENANCE',intent:'maintenance',items,coverage,children:[coverage],contractVersion:options.contractVersion,routeVersion:options.routeVersion},controller=new AbortController(),state={live:true,handle:null,job:null,drift:null},sourceContext=requireMaintenanceProcessingContext({}),authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 let foundation;const committer=async(tx,r)=>{assert.equal(r.outcome,'NO_CHANGE');if(state.drift){const drift=state.drift;state.drift=null;await drift(tx);}return {committed:true,coverage:r.units,isCurrent:()=>state.live&&!controller.signal.aborted,fenceAfterSettlement:async transaction=>{await foundation.currentLocalContextProtection(transaction,await foundation.job(transaction,r.logicalJobId),state.handle);return state.live&&!controller.signal.aborted;}};};
 foundation=new AIUsageFoundation(f.s,{maintenanceSourceContext:sourceContext,resolveAuthority:authority,committers:{topic:committer,context:committer}});
 const admissionOptions={generation:0,signal:controller.signal,isCurrent:()=>state.live,workBudget:createContextScopeWorkBudget({database:f.s.repository.db})},capture=async()=>state.handle=await foundation.prepareLocalContextProtection(request,admissionOptions);
 t.after(()=>{if(state.handle)foundation.releaseLocalContextProtection(state.handle);f.s.repository.close();});
 return {...f,cards,automatic,manualId,request,sourceContext,authority,foundation,controller,state,capture};
}

test('private correction admission settles only the original subset with zero-cost local receipts',async t=>{
 const f=await fixture(t,{manual:true}),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.capture(),selected=f.foundation.localContextProtectionRequest(handle);assert.equal(selected.items.length,1);assert.equal(selected.items[0].descriptor.entityId,f.automatic.id);
 await assert.rejects(f.foundation.plan(selected),{code:'UNAVAILABLE'});
 const job=await f.foundation.planLocalContextProtection(handle);f.state.job=job;assert.ok(job.id);
 await assert.rejects(f.foundation.read(async tx=>f.foundation.current(tx,await f.foundation.job(tx,job.id))),{code:'UNAVAILABLE'});
 await assert.rejects(f.foundation.resolveLocalSubset(job.id,{units:selected.coverage}),{code:'UNAVAILABLE'});
 assert.equal((await f.foundation.resolveLocalContextProtection(handle,job.id)).state,'COMMITTED');
 const acks=(await read(f.s,'organizerWorkItems')).filter(r=>r.jobId===job.id&&r.state==='ACKNOWLEDGED');assert.equal(acks.length,2);assert.deepEqual(acks.map(a=>a.unit.facet).sort(),['context','topic']);assert.ok(acks.every(a=>a.outcome==='NO_CHANGE'&&a.unit.key===selected.items[0].key));
 const usage=(await read(f.s,'organizerUsage')).filter(r=>r.jobId===job.id);assert.equal(usage.length,1);assert.equal(usage[0].executionKind,'local');assert.equal(usage[0].attemptCount,0);assert.equal(usage[0].effectiveResultCount,0);assert.equal(usage[0].spendState,'NO_PROVIDER_COST');assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.ok(await read(f.s,'meta',DIRTY_PREFIX+JSON.stringify(['context_item',f.manualId])));
});

test('cloned, foreign-Foundation and released local handles never admit source currentness',async t=>{
 const f=await fixture(t),handle=await f.capture(),foreign=new AIUsageFoundation(f.s,{maintenanceSourceContext:f.sourceContext,resolveAuthority:f.authority});
 assert.throws(()=>f.foundation.localContextProtectionRequest(clone(handle)),{code:'UNAVAILABLE'});assert.throws(()=>foreign.localContextProtectionRequest(handle),{code:'UNAVAILABLE'});
 await assert.rejects(f.foundation.planLocalContextProtection(clone(handle)),{code:'UNAVAILABLE'});await assert.rejects(foreign.planLocalContextProtection(handle),{code:'UNAVAILABLE'});
 f.foundation.releaseLocalContextProtection(handle);assert.throws(()=>f.foundation.localContextProtectionRequest(handle),{code:'UNAVAILABLE'});
});

for(const defect of ['changed-body','revoked'])test('captured local admission rejects '+defect+' before a local plan',async t=>{
 const f=await fixture(t),handle=await f.capture(),jobs=await read(f.s,'organizerJobs');
 if(defect==='revoked')f.controller.abort();else{const current=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.find(i=>i.id===f.automatic.id);await f.cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:current.id,expectedRevision:current.revision,card:current.card,body:'SYNTHETIC actual human body change',section:current.section});}
 await assert.rejects(f.foundation.planLocalContextProtection(handle),error=>['STALE_BASE','UNAVAILABLE'].includes(error.code));assert.deepEqual(await read(f.s,'organizerJobs'),jobs);
});

test('a copied semantic-digest claim cannot replace the original current human proof',async t=>{
 const f=await fixture(t),request=clone(f.request);request.items[0].descriptor.localCorrection.semanticDigest='0'.repeat(64);
 await assert.rejects(f.foundation.prepareLocalContextProtection(request,{generation:0,signal:f.controller.signal,isCurrent:()=>true,workBudget:createContextScopeWorkBudget({database:f.s.repository.db})}),{code:'STALE_BASE'});
});

test('late original Item drift rolls back both local ACKs and the zero-cost receipt',async t=>{
 const f=await fixture(t),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.capture(),job=await f.foundation.planLocalContextProtection(handle);let reached=false;
 f.state.drift=async tx=>{reached=true;const row=await tx.get('meta',CONTEXT_CARDS_ROW);row.items.find(i=>i.id===f.automatic.id).body='SYNTHETIC late unreceipted drift';await tx.put('meta',row);};
 await assert.rejects(f.foundation.resolveLocalContextProtection(handle,job.id),{code:'STALE_BASE'});assert.equal(reached,true);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);assert.equal((await read(f.s,'organizerWorkItems')).filter(r=>r.jobId===job.id&&r.state==='ACKNOWLEDGED').length,0);assert.equal((await read(f.s,'organizerUsage')).filter(r=>r.jobId===job.id).length,0);
});

test('local current rechecks the original semantic snapshot after ordinary authority awaits',async t=>{
 const f=await fixture(t),before=await read(f.s,'meta',CONTEXT_CARDS_ROW),handle=await f.capture(),job=await f.foundation.planLocalContextProtection(handle),current=f.foundation.current.bind(f.foundation);let reached=false;
 t.mock.method(f.foundation,'current',async(tx,value,options)=>{const answer=await current(tx,value,options);if(!reached&&value.id===job.id){reached=true;const row=await tx.get('meta',CONTEXT_CARDS_ROW);row.items.find(i=>i.id===f.automatic.id).body='SYNTHETIC drift after ordinary current';await tx.put('meta',row);}return answer;});
 await assert.rejects(f.foundation.write(async tx=>f.foundation.currentLocalContextProtection(tx,await f.foundation.job(tx,job.id),handle)),{code:'STALE_BASE'});assert.equal(reached,true);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),before);
});

test('twenty-one candidate or Source metadata rows are refused before any Item capture read',async t=>{
 const f=await fixture(t),candidate=clone(f.request.items[0]);let reads=0;
 t.mock.method(f.foundation,'read',()=>{reads++;throw Error('No Item/body capture may start for an over-bound page');});
 for(const kind of ['candidates','sources']){
  // Deliberately untrusted metadata is sufficient for this negative ceiling;
  // none of these copied proof fields may be read as body authority.
  const request=clone(f.request);if(kind==='candidates'){request.items=Array.from({length:21},()=>{const item=clone(candidate),id=op();item.key=JSON.stringify(['context_item',id]);item.descriptor.key=item.key;item.descriptor.entityId=id;return item;});request.coverage=request.items.flatMap(item=>['topic','context'].map(facet=>({key:item.key,facet,scope:options.scope})));request.children=[request.coverage];}else request.items[0].descriptor.sourceRecordIds=Array.from({length:21},()=>op());
  await assert.rejects(f.foundation.prepareLocalContextProtection(request,{generation:0,signal:f.controller.signal,isCurrent:()=>true,workBudget:createContextScopeWorkBudget({database:f.s.repository.db})}),{code:'UNAVAILABLE'});assert.equal(reads,0);
 }
});
