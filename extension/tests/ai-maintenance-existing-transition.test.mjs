import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {TopicFormationService,topicFormationMaintenanceReceipt} from '../core/topic-formation.js';
import {ContextMaintenanceService,createContextFreshInputPolicy,contextMaintenanceStagedItem,contextMaintenanceTransition} from '../core/context-maintenance.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {assessment,parameters} from './harness/topic-03.mjs';
import {planMaintenanceExistingContext,maintenanceExistingContextScope,captureMaintenanceExistingContext,assertMaintenanceExistingContext,bindMaintenanceExistingContextTopicOperation,assertMaintenanceExistingContextTopicStage,settleMaintenanceExistingContextTopic,bindMaintenanceExistingContextContextOperation,assertMaintenanceExistingContextContextStage,settleMaintenanceExistingContextContext} from '../core/ai-usage/maintenance-existing-context.js';
const op=()=>crypto.randomUUID(),read=(s,fn)=>s.repository.transaction(false,fn),row=s=>read(s,t=>t.get('meta',CONTEXT_CARDS_ROW));
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');const input=(await read(s,t=>t.all('inputStates')))[0],scope=[{inputId:input.id,role:'primary',selectedFields:['body']}],caller=Object.freeze({id:op()}),abort=new AbortController();
 const resolveProcessing=async(_t,r)=>({allowed:true,epoch:'synthetic-processing',inputIds:[...r.inputIds],topicIds:[...r.topicIds]}),verifier={verify:async(_c,_s,scope)=>({version:1,store:s,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,scope,processing:true,expiresAt:Date.now()+600000,revocationSignal:abort.signal}),isCurrent:()=>!abort.signal.aborted};
 const formation=new TopicFormationService(s,{resolveProcessing,parameters,decision:{version:'synthetic-initial',assess:assessment}});await formation.commit(await formation.prepare({operationId:op(),scope}));const topic=(await read(s,t=>t.all('topics')))[0],qualified=await readContextTopicScope(s,{topicId:topic.id}),p=await read(s,t=>inputProjection(s,t,input.id));
 const change={operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC exact original Item',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:qualified.binding,expectedRemovalSequence:p.lastRemovalSequence}]};await new ContextMaintenanceService(s,{processingVerifier:verifier}).maintain(caller,change);
 const f={s,input,scope,caller,abort,resolveProcessing,verifier,change,topic};f.w=await witness(f);return f;
}
async function witness(f){
 const plan=await read(f.s,t=>planMaintenanceExistingContext(f.s,t,{epoch:'initial',inputIds:[f.input.id]})),childId=op(),receipt=Object.freeze({version:1,store:f.s,caller:f.caller,scope:{purpose:'ai-maintenance-payload',logicalJobId:op(),childOperationId:childId,inputs:[{inputId:f.input.id,selectedFields:['body']}],facets:['context','topic'],existingContextItems:maintenanceExistingContextScope(plan)},epoch:'synthetic-original',processing:true,expiresAt:Date.now()+600000,revocationSignal:f.abort.signal});
 return {handle:await captureMaintenanceExistingContext(f.s,plan,{processingReceipt:receipt,assertProcessing:r=>r===receipt&&!f.abort.signal.aborted,read:fn=>read(f.s,fn),limits:{maxContentBytes:96*1024}}),childId};
}
async function topic(f,{mutate=null,alter=x=>x,lostAck=false}={}){
 const operationId=op();bindMaintenanceExistingContextTopicOperation(f.s,f.w.handle,f.w.childId,operationId);let actual;
 const owner=new TopicFormationService(f.s,{resolveProcessing:f.resolveProcessing,parameters,decision:{version:'synthetic-reuse',assess:view=>({...assessment(view),relations:view.identities.map(t=>({topicId:t.id,relation:'same',citations:assessment(view).evidence})),entries:[]})},writeTransaction:async fn=>{const result=await f.s.repository.transaction(true,async t=>{await assertMaintenanceExistingContext(f.s,t,f.w.handle);actual=await fn(t);await mutate?.(t,actual);await assertMaintenanceExistingContextTopicStage(f.s,t,f.w.handle,alter(actual));return actual;});if(lostAck)throw Error('SYNTHETIC lost Topic ACK');return result;}});
 const handle=await owner.prepare({operationId,scope:f.scope});return {run:()=>owner.commit(handle),actual:()=>actual};
}
const settle=(f,r)=>settleMaintenanceExistingContextTopic(f.s,f.w.handle,r,{read:fn=>read(f.s,fn)});
test('original receipt-only Topic proof admits exact bookkeeping once and keeps provider Item unchanged',async()=>{
 const f=await fixture(),before=await row(f.s),run=await topic(f),result=await run.run();assert.equal(topicFormationMaintenanceReceipt(result,f.s).settled,true);assert.equal(await settle(f,result),true);assert.equal(await read(f.s,t=>assertMaintenanceExistingContext(f.s,t,f.w.handle)),true);assert.deepEqual(await row(f.s),before);await assert.rejects(settle(f,result),{code:'STALE_BASE'});
});
for(const defect of ['clone','forged','cross-store'])test('original Topic stage refuses '+defect+' result proof',async()=>{
 const f=await fixture(),before=await row(f.s);let other;if(defect==='cross-store')other=await fixture();const run=await topic(f,{alter:r=>defect==='clone'?structuredClone(r):defect==='forged'?{}:r,mutate:async(t,r)=>{assert.equal(topicFormationMaintenanceReceipt(structuredClone(r),f.s,t),null);if(other)assert.equal(topicFormationMaintenanceReceipt(r,other.s,t),null);}});
 if(defect==='cross-store'){const result=await run.run();await assert.rejects(settleMaintenanceExistingContextTopic(other.s,other.w.handle,result,{read:fn=>read(other.s,fn)}),{code:'STALE_BASE'});}else await assert.rejects(run.run());assert.deepEqual(await row(f.s),before);
});
test('real old Topic result cannot be consumed by another child or job',async()=>{
 const f=await fixture(),run=await topic(f),result=await run.run();await settle(f,result);const next=await witness(f);bindMaintenanceExistingContextTopicOperation(f.s,next.handle,next.childId,op());await assert.rejects(read(f.s,t=>assertMaintenanceExistingContextTopicStage(f.s,t,next.handle,result)),{code:'STALE_BASE'});await assert.rejects(settleMaintenanceExistingContextTopic(f.s,next.handle,result,{read:fn=>read(f.s,fn)}),{code:'STALE_BASE'});
});
for(const phase of ['staged','committed'])test('one proved Topic receipt cannot mask a second +1 write at '+phase,async()=>{
 const f=await fixture(),extra=async t=>{for(const id of ['thought-sequence','backup-data-generation']){const row=await t.get('meta',id);row.value++;await t.put('meta',row);}},run=await topic(f,{mutate:phase==='staged'?extra:null});
 if(phase==='staged')await assert.rejects(run.run());else{const result=await run.run();await f.s.repository.transaction(true,extra);await assert.rejects(settle(f,result),{code:'STALE_BASE'});}
});
test('closed and reopened same Store cannot reuse the old database proof',async()=>{
 const f=await fixture(),run=await topic(f),result=await run.run();await f.s.repository.close();await f.s.repository.open();assert.equal(topicFormationMaintenanceReceipt(result,f.s),null);await assert.rejects(settle(f,result),{code:'STALE_BASE'});
});
test('domain success with unknown original Topic ACK cannot settle witness',async()=>{
 const f=await fixture(),run=await topic(f,{lostAck:true});await assert.rejects(run.run());const result=run.actual();assert.equal(topicFormationMaintenanceReceipt(result,f.s).settled,false);await assert.rejects(settle(f,result),{code:'STALE_BASE'});assert.equal((await row(f.s)).items[0].revision,1);
});
for(const defect of ['clone','cross-transaction','wrong-before'])test('Context staged transition rejects '+defect+' while original Item remains exact',async()=>{
 const f=await fixture(),run=await topic(f),topicResult=await run.run();await settle(f,topicResult);const before=(await row(f.s)).items[0],change={...f.change,operationId:op(),expectedRevision:1,body:'SYNTHETIC intended new Item'};
 const owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,freshInputPolicy:createContextFreshInputPolicy(),writeTransaction:fn=>f.s.repository.transaction(true,async t=>{await assertMaintenanceExistingContext(f.s,t,f.w.handle);const result=await fn(t);assert.equal(contextMaintenanceStagedItem(structuredClone(result),f.s,t,before),null);assert.equal(contextMaintenanceStagedItem(result,f.s,{},before),null);assert.equal(contextMaintenanceStagedItem(result,f.s,t,{...before,body:'different'}),null);if(defect==='clone')await assertMaintenanceExistingContext(f.s,t,f.w.handle,structuredClone(result));else if(defect==='cross-transaction')await assertMaintenanceExistingContext(f.s,Object.create(t),f.w.handle,result);else{assert.equal(contextMaintenanceStagedItem(result,f.s,t,{...before,body:'different'}),null);throw Error('SYNTHETIC fail closed');}return result;})});
 await assert.rejects(owner.maintain(f.caller,change));assert.deepEqual((await row(f.s)).items[0],before);
});

async function context(f,{alter=x=>x,mutate=null,lostAck=false}={}){
 const qualified=await readContextTopicScope(f.s,{topicId:f.topic.id}),change={...f.change,operationId:op(),expectedRevision:1,body:'SYNTHETIC accumulated owner Item',evidence:f.change.evidence.map(e=>({...e,expectedTopicBinding:qualified.binding}))};bindMaintenanceExistingContextContextOperation(f.s,f.w.handle,f.w.childId,change.operationId,change.itemId);let actual;
 const owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,freshInputPolicy:createContextFreshInputPolicy(),writeTransaction:async fn=>{const result=await f.s.repository.transaction(true,async t=>{await assertMaintenanceExistingContext(f.s,t,f.w.handle);actual=await fn(t);await mutate?.(t,actual);await assertMaintenanceExistingContext(f.s,t,f.w.handle,actual);await assertMaintenanceExistingContextContextStage(f.s,t,f.w.handle,alter(actual));return actual;});if(lostAck)throw Error('SYNTHETIC lost Context ACK');return result;}});return {change,run:()=>owner.maintain(f.caller,change),actual:()=>actual};
}
const settleContext=(f,r)=>settleMaintenanceExistingContextContext(f.s,f.w.handle,r,{read:fn=>read(f.s,fn)});
test('original Context proof accumulates once and rejects reused operation or Item',async()=>{
 const f=await fixture(),run=await context(f),result=await run.run();assert.equal(contextMaintenanceTransition(result,f.s).settled,true);assert.equal(await settleContext(f,result),true);assert.equal(await read(f.s,t=>assertMaintenanceExistingContext(f.s,t,f.w.handle)),true);await assert.rejects(settleContext(f,result),{code:'STALE_BASE'});assert.throws(()=>bindMaintenanceExistingContextContextOperation(f.s,f.w.handle,f.w.childId,run.change.operationId,run.change.itemId),{code:'STALE_BASE'});assert.throws(()=>bindMaintenanceExistingContextContextOperation(f.s,f.w.handle,f.w.childId,op(),run.change.itemId),{code:'STALE_BASE'});
});
for(const defect of ['clone','forged','other-operation','cross-transaction','mutated-result','mutated-receipt'])test('Context accumulation stage rejects '+defect+' under exact owner proof',async()=>{
 const f=await fixture(),before=await row(f.s),g=defect==='other-operation'?await witness(f):null;if(g)bindMaintenanceExistingContextContextOperation(f.s,g.handle,g.childId,op(),f.change.itemId);const run=await context(f,{alter:r=>defect==='clone'?structuredClone(r):defect==='forged'?{}:r,mutate:async(t,r)=>{assert.equal(contextMaintenanceTransition(structuredClone(r),f.s,t),null);assert.equal(contextMaintenanceTransition(r,f.s,Object.create(t)),null);if(defect==='other-operation')await assertMaintenanceExistingContextContextStage(f.s,t,g.handle,r);if(defect==='cross-transaction')await assertMaintenanceExistingContextContextStage(f.s,Object.create(t),f.w.handle,r);if(defect==='mutated-result')r.revision++;if(defect==='mutated-receipt'){const proof=contextMaintenanceTransition(r,f.s,t),receipt=await t.get('operationReceipts',proof.receipt.id);receipt.scopeDigest='0'.repeat(64);await t.put('operationReceipts',receipt);}}});await assert.rejects(run.run());assert.deepEqual(await row(f.s),before);
});
for(const defect of ['clone','cross-store','reopen','old-child','extra-write','lost-ack'])test('Context committed accumulation refuses '+defect+' without changing the committed Item',async()=>{
 const f=await fixture(),run=await context(f,{lostAck:defect==='lost-ack'});let result;if(defect==='lost-ack'){await assert.rejects(run.run());result=run.actual();assert.equal(contextMaintenanceTransition(result,f.s).settled,false);}else result=await run.run();const committed=await row(f.s);
 if(defect==='extra-write')await f.s.repository.transaction(true,t=>t.put('operationReceipts',{id:op(),namespace:'SYNTHETIC unrelated receipt'}));if(defect==='reopen'){await f.s.repository.close();await f.s.repository.open();assert.equal(contextMaintenanceTransition(result,f.s),null);}
 const other=defect==='cross-store'?await fixture():f,target=defect==='old-child'?await witness(f):other.w;
 await assert.rejects(settleMaintenanceExistingContextContext(other.s,target.handle,defect==='clone'?structuredClone(result):result,{read:fn=>read(other.s,fn)}),{code:'STALE_BASE'});assert.deepEqual(await row(f.s),committed);
});
