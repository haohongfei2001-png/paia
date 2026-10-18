import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,assessment,citation,topic,request,rows,raw,op,addInput,snapshot} from './harness/topic-03.mjs';
import {TopicFormationService} from '../core/topic-formation.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {fail} from '../core/ai-usage/contracts.js';
import {key as memoryKey} from '../core/memory/model.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {validContextEvidenceSpecs} from '../core/context-item-lineage.js';
import {planMaintenanceExistingContext,maintenanceExistingContextScope,captureMaintenanceExistingContext,assertMaintenanceExistingContext,resolveMaintenanceExistingContext} from '../core/ai-usage/maintenance-existing-context.js';
import {readMaintenanceContextMemberships,selectMaintenanceContextTopic,readMaintenanceContextTopicSelection} from '../core/ai-usage/maintenance-context-topic-selection.js';

const read=(s,fn)=>s.repository.transaction(false,fn);
const refuse=fn=>assert.rejects(fn,{code:'STALE_BASE'});
async function inputSnapshot(s,inputId){const p=await read(s,t=>inputProjection(s,t,inputId));return {inputId,revision:p.contentRevision,removalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.identities,digest:await hashText(p.body)};}
async function fixture(){
 let extra;const f=await formationFixture({decide:view=>{const a=assessment(view);a.entries[0].additional=[{topicId:extra.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}}];return a;}});
 extra=await topic(f.s,'SYNTHETIC additional Topic');await f.s.setFilterMode('off');const operation=request(f),result=await f.service.commit(await f.service.prepare(operation));
 // These are observed original owner results after its actual transaction, not
 // model-authored IDs. The selection helper does not authenticate this binding.
 const main=(await rows(f.s,'topics')).find(t=>t.id!==extra.id),receipt=await raw(f.s,'operationReceipts',operation.operationId),input=await inputSnapshot(f.s,f.scope[0].inputId);
 const privateResult=result,owner={result,settled:true,inputIds:[input.inputId],mainTopicId:main.id};
 const assertSelection=(_t,inputId)=>{if(owner.result!==privateResult||owner.settled!==true||!owner.inputIds.includes(inputId))fail('STALE_BASE');return owner.mainTopicId;};
 // Simulate the existing session's original guarded read, retaining the exact
 // current original receipt separately from the synchronous private selector.
 const guardedRead=fn=>read(f.s,async t=>{assert.deepEqual(await t.get('operationReceipts',operation.operationId),receipt);return fn(t);});
 return {...f,extra,main,input,result,operation,receipt,owner,assertSelection,read:guardedRead};
}
const select=(f,overrides={})=>readMaintenanceContextTopicSelection(f.s,{input:f.input,read:f.read,assertSelection:f.assertSelection,...overrides});
const mutate=(f,name,id,change)=>f.s.repository.transaction(true,async t=>{const row=await t.get(name,id);await t.put(name,{...row,...change(row)});});
const evidence=(f,selected,input=f.input)=>({topicId:selected.topicId,inputId:input.inputId,selectedFields:['body'],fieldDigests:{body:input.digest},expectedTopicBinding:selected.scope.binding,expectedRemovalSequence:input.removalSequence});

// Guarded read deliberately throws STALE_BASE instead of assertions in negative
// receipt fixtures, exactly as the owning session would reject a changed receipt.
const guardedReceiptRead=f=>fn=>read(f.s,async t=>{if(JSON.stringify(await t.get('operationReceipts',f.operation.operationId))!==JSON.stringify(f.receipt))fail('STALE_BASE');return fn(t);});

test('actual original Store permits a legitimate additional membership and selects exact owner main without writes',async()=>{
 const f=await fixture(),before=await snapshot(f.s),context=await raw(f.s,'meta',CONTEXT_CARDS_ROW),projection=await read(f.s,t=>readMaintenanceContextMemberships(f.s,t,f.input.inputId));
 assert.equal(new Set(projection.candidates.map(c=>c.topicId)).size,2);
 const reversed={...projection,candidates:[...projection.candidates].reverse()};
 assert.equal(selectMaintenanceContextTopic(reversed,{inputId:f.input.inputId,topicId:f.main.id}),f.main.id);
 assert.equal(selectMaintenanceContextTopic(reversed,{inputId:f.input.inputId,topicId:f.extra.id}),f.extra.id,'pure data selector is explicitly not an authentication proof');
 const original=f.s.repository.transaction.bind(f.s.repository);let writes=0;
 f.s.repository.transaction=(write,...args)=>{if(write)writes++;return original(write,...args);};
 try{const selected=await select(f);assert.equal(selected.topicId,f.main.id);assert.equal(selected.scope.scope.eligibility,'eligible');assert.equal(selected.scope.externalAllowed,false);assert.ok(selected.scope.scope.topicIds.includes(f.extra.id));}finally{f.s.repository.transaction=original;}
 assert.equal(writes,0);assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await raw(f.s,'meta',CONTEXT_CARDS_ROW),context);
 assert.equal(JSON.stringify(projection).includes('Synthetic explicit working input'),false);
});

test('missing authentication seam refuses before reads; boolean, JSON and asynchronous callbacks are not proof',async()=>{
 const f=await fixture();let reads=0;const counted=fn=>{reads++;return f.read(fn);};
 await assert.rejects(select(f,{read:counted,assertSelection:undefined}),{code:'UNAVAILABLE'});assert.equal(reads,0);
 for(const value of [true,{topicId:f.main.id},f.result,Promise.resolve(f.main.id),null])await refuse(()=>select(f,{assertSelection:()=>value}));
});
for(const defect of ['clone','forged','unknown-ack','wrong-input','missing-topic','ambiguous'])test('private owner binding refuses '+defect+' while ordinary JSON cannot self-authenticate',async()=>{
 const f=await fixture();
 if(defect==='clone')f.owner.result=structuredClone(f.result);
 if(defect==='forged')f.owner.result={...f.result,topicIds:[f.main.id]};
 if(defect==='unknown-ack')f.owner.settled=false;
 if(defect==='wrong-input')f.owner.inputIds=[op()];
 if(defect==='missing-topic')f.owner.mainTopicId=op();
 if(defect==='ambiguous')f.owner.mainTopicId=[f.main.id,f.extra.id];
 const before=await snapshot(f.s);await refuse(()=>select(f));assert.deepEqual(await snapshot(f.s),before);
});
test('stale original operation receipt cannot be used by the guarded owner read',async()=>{
 const f=await fixture();f.read=guardedReceiptRead(f);await mutate(f,'operationReceipts',f.operation.operationId,row=>({digest:'0'.repeat(64)}));const before=await snapshot(f.s);await refuse(()=>select(f));assert.deepEqual(await snapshot(f.s),before);
});

test('pure selector refuses duplicate, missing, wrong-Input and unknown membership projections',async()=>{
 const f=await fixture(),p=await read(f.s,t=>readMaintenanceContextMemberships(f.s,t,f.input.inputId));
 for(const [projection,selection]of [[{...p,candidates:[...p.candidates,p.candidates[0]]},{inputId:f.input.inputId,topicId:f.main.id}],[{...p,candidates:[]},{inputId:f.input.inputId,topicId:f.main.id}],[p,{inputId:op(),topicId:f.main.id}],[p,{inputId:f.input.inputId,topicId:op()}],[{...p,candidates:[{...p.candidates[0],topicRevision:'unknown'}]},{inputId:f.input.inputId,topicId:f.main.id}]])assert.throws(()=>selectMaintenanceContextTopic(projection,selection),{code:'STALE_BASE'});
});
for(const defect of ['excluded','removed-placement','layout','layout-job','redirect','removed-topic','removed-section','section-identity','wrong-input-entry','detached-entry','input-revision','input-removed','input-excluded'])test('current original membership rejects '+defect,async()=>{
 const f=await fixture(),p=(await rows(f.s,'placements')).find(p=>p.topicId===f.main.id),section=JSON.stringify([f.main.id,p.layoutGeneration,p.sectionId]);
 const specs={
  excluded:['placements',p.id,()=>({excludedByUser:true})],
  'removed-placement':['placements',p.id,()=>({lifecycle:'removed'})],
  layout:['topics',f.main.id,r=>({activeLayoutGeneration:r.activeLayoutGeneration+1})],
  'layout-job':['topics',f.main.id,()=>({layoutJobId:op()})],
  redirect:['topics',f.main.id,()=>({redirectTo:f.extra.id})],
  'removed-topic':['topics',f.main.id,()=>({lifecycle:'removed'})],
  'removed-section':['sections',section,()=>({lifecycle:'removed'})],
  'section-identity':['sections',section,()=>({sectionId:op()})],
  'wrong-input-entry':['thoughts',p.entryId,()=>({workingInputId:op()})],
  'detached-entry':['thoughts',p.entryId,()=>({bodyBinding:'thought'})],
  'input-revision':['inputStates',f.input.inputId,r=>({contentRevision:r.contentRevision+1})],
  'input-removed':['inputStates',f.input.inputId,()=>({removalState:'user_removed'})],
  'input-excluded':['blockIndex',f.input.inputId,()=>({excluded:true})]
 };
 await mutate(f,...specs[defect]);const before=await snapshot(f.s);await refuse(()=>select(f));assert.deepEqual(await snapshot(f.s),before);
});
for(const phase of ['before-material','final-read'])for(const field of ['topic','section','entry','placement','input'])test('exact '+field+' revision drift at '+phase+' is refused',async()=>{
 const f=await fixture(),p=(await rows(f.s,'placements')).find(p=>p.topicId===f.main.id);let calls=0;
 const spec={topic:['topics',f.main.id,'revision'],section:['sections',JSON.stringify([f.main.id,p.layoutGeneration,p.sectionId]),'revision'],entry:['thoughts',p.entryId,'revision'],placement:['placements',p.id,'revision'],input:['inputStates',f.input.inputId,'contentRevision']}[field];
 const changedRead=async fn=>{if(++calls===(phase==='before-material'?2:3))await mutate(f,spec[0],spec[1],r=>({[spec[2]]:r[spec[2]]+1}));return f.read(fn);};
 await refuse(()=>select(f,{read:changedRead}));assert.ok(calls>=(phase==='before-material'?2:3));
});

test('shared Entry legacy restriction on the additional Topic blocks selected main before Input/Source material',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,t=>t.put('meta',{id:memoryKey('topic','default',f.extra.id),kind:'topic',version:1,profileId:'default',topicId:f.extra.id,decision:'never',layoutGeneration:1}));
 const transaction=f.s.repository.transaction.bind(f.s.repository);let material=0;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=async(name,...args)=>{if(['blocks','records'].includes(name))material++;return get(name,...args);};return fn(t);},...args);
 try{await refuse(()=>select(f));assert.equal(material,0);}finally{f.s.repository.transaction=transaction;}
});
test('additional shared Section restriction and selected human exclusion retain original policy',async()=>{
 for(const kind of ['section','entry','input']){
  const f=await fixture(),p=(await rows(f.s,'placements')).find(p=>p.topicId===f.extra.id),row=kind==='section'?{topicId:f.extra.id,sectionId:p.sectionId}:kind==='entry'?{entryId:p.entryId}:{inputId:f.input.inputId};
  await f.s.repository.transaction(true,t=>t.put('meta',{id:memoryKey(kind,...Object.values(row)),kind,version:1,...row,excluded:true}));await refuse(()=>select(f));
 }
});
for(const defect of ['dependencies','memberships','topics'])test('entire '+defect+' bound is checked before any Entry/Input/Source values',async()=>{
 const f=await fixture(),placement=(await rows(f.s,'placements'))[0],dep=(await rows(f.s,'dependencies'))[0];
 await f.s.repository.transaction(true,async t=>{
  if(defect==='dependencies')for(let i=0;i<101;i++){const entryId='synthetic-entry-'+i;await t.put('dependencies',{...dep,id:JSON.stringify([f.input.inputId,'entry',entryId]),targetId:entryId});}
  else for(let i=0;i<(defect==='memberships'?101:9);i++){const topicId='synthetic-topic-'+i;await t.put('placements',{...placement,id:JSON.stringify([topicId,1,placement.entryId]),topicId,layoutGeneration:1});}
 });
 let material=0;
 await assert.rejects(read(f.s,async t=>{const get=t.get.bind(t);t.get=async(name,...args)=>{if(['thoughts','blocks','records'].includes(name))material++;return get(name,...args);};return readMaintenanceContextMemberships(f.s,t,f.input.inputId);}),{code:'BUDGET_EXCEEDED'});assert.equal(material,0);
});

test('current complete Input text and original digest remain required',async()=>{
 const f=await fixture();await refuse(()=>select(f,{input:{...f.input,digest:'0'.repeat(64)}}));await refuse(()=>select(f,{input:{...f.input,sourceIdentityTokens:['legacy:wrong-source']}}));
});
test('a database replacement after initial membership read cannot finish selection',async()=>{
 const f=await fixture();let count=0;await refuse(()=>select(f,{read:async fn=>{const result=await f.read(fn);if(++count===1){await f.s.repository.close();await f.s.repository.open();}return result;}}));
});

async function existingFixture(){
 const f=await fixture(),caller=Object.freeze({id:op()}),abort=new AbortController(),first=f.input;
 await addInput(f,{text:'SYNTHETIC separate second Input'});const secondId=f.scope.find(x=>x.inputId!==first.inputId).inputId;
 const service=new TopicFormationService(f.s,{...f.serviceOptions,parameters:(await import('./harness/topic-03.mjs')).parameters,decision:{version:'synthetic-second-topic',assess:assessment}}),operationId=op();await service.commit(await service.prepare({operationId,scope:[{inputId:secondId,role:'primary',selectedFields:['body']}]}));
 const second=await inputSnapshot(f.s,secondId),secondTopic=(await rows(f.s,'topics')).find(t=>![f.main.id,f.extra.id].includes(t.id));
 const selectOriginal=input=>readMaintenanceContextTopicSelection(f.s,{input,read:fn=>read(f.s,fn),assertSelection:(_t,id)=>id===first.inputId?f.main.id:secondTopic.id});
 const selected=await Promise.all([selectOriginal(first),selectOriginal(second)]),verifier={verify:async(_c,_s,scope)=>({version:1,store:f.s,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,scope,processing:true,expiresAt:Date.now()+600000,revocationSignal:abort.signal}),isCurrent:()=>!abort.signal.aborted};
 const change={operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC one Item with two Input Topics',section:'SYNTHETIC facts',associationIds:[op()],evidence:selected.map((s,i)=>evidence(f,s,[first,second][i]))};
 await new ContextMaintenanceService(f.s,{processingVerifier:verifier}).maintain(caller,change);
 const plan=await read(f.s,t=>planMaintenanceExistingContext(f.s,t,{epoch:'initial',inputIds:[first.inputId,second.inputId]})),receipt=Object.freeze({version:1,store:f.s,caller,scope:{purpose:'ai-maintenance-payload',logicalJobId:op(),childOperationId:op(),inputs:[first,second].map(i=>({inputId:i.inputId,selectedFields:['body']})),facets:['context','topic'],existingContextItems:maintenanceExistingContextScope(plan)},epoch:'synthetic-processing',processing:true,expiresAt:Date.now()+600000,revocationSignal:abort.signal});
 const handle=await captureMaintenanceExistingContext(f.s,plan,{processingReceipt:receipt,assertProcessing:r=>r===receipt&&!abort.signal.aborted,read:fn=>read(f.s,fn),limits:{maxContentBytes:96*1024}});
 const existingRead=fn=>read(f.s,async t=>{await assertMaintenanceExistingContext(f.s,t,handle);return fn(t);}),assertSelection=(_t,id)=>{const item=resolveMaintenanceExistingContext(handle,'c0'),topics=new Set(item.provenance.evidence.filter(e=>e.inputId===id).map(e=>e.topicId));if(item.state!=='available'||topics.size!==1)fail('STALE_BASE');return [...topics][0];};
 return {...f,first,second,secondTopic,caller,abort,verifier,change,handle,existingRead,existingSelection:assertSelection,selected};
}
test('exact existing Item provenance preserves different Topics for different Inputs and no independentContext writes',async()=>{
 const f=await existingFixture(),before=await snapshot(f.s),context=await raw(f.s,'meta',CONTEXT_CARDS_ROW);
 for(const [input,topicId]of [[f.first,f.main.id],[f.second,f.secondTopic.id]]){const selected=await select(f,{input,read:f.existingRead,assertSelection:f.existingSelection});assert.equal(selected.topicId,topicId);}
 assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await raw(f.s,'meta',CONTEXT_CARDS_ROW),context);
 assert.equal(validContextEvidenceSpecs(f.change.evidence),true);const duplicated=[f.change.evidence[0],{...f.change.evidence[0],topicId:f.extra.id,expectedTopicBinding:{...f.change.evidence[0].expectedTopicBinding,topicId:f.extra.id}}];assert.equal(validContextEvidenceSpecs(duplicated),false);
 await assert.rejects(new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}).maintain(f.caller,{...f.change,operationId:op(),itemId:op(),evidence:duplicated}));assert.deepEqual(await snapshot(f.s),before);
});
for(const defect of ['provenance','revision','protection','revocation','wrong-input','forged-handle'])test('original existing-Item seam refuses '+defect,async()=>{
 const f=await existingFixture();let callback=f.existingSelection;
 if(['provenance','revision','protection'].includes(defect))await f.s.repository.transaction(true,async t=>{const row=await t.get('meta',CONTEXT_CARDS_ROW),item=row.items.find(i=>i.id===f.change.itemId);if(defect==='provenance')item.maintenance.provenance.evidence[0].topicId=f.extra.id;if(defect==='revision')item.revision++;if(defect==='protection')item.protected=true;await t.put('meta',row);});
 if(defect==='revocation')f.abort.abort();if(defect==='wrong-input')callback=(t,_id)=>f.existingSelection(t,op());if(defect==='forged-handle')callback=()=>resolveMaintenanceExistingContext({},'c0');
 const before=await raw(f.s,'meta',CONTEXT_CARDS_ROW);await assert.rejects(select(f,{read:f.existingRead,assertSelection:callback}));assert.deepEqual(await raw(f.s,'meta',CONTEXT_CARDS_ROW),before);
});
