import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {MemoryService} from '../core/memory/service.js';
import {planMaintenanceExistingContext,maintenanceExistingContextScope,captureMaintenanceExistingContext,readMaintenanceExistingContext,resolveMaintenanceExistingContext,assertMaintenanceExistingContext,releaseMaintenanceExistingContext} from '../core/ai-usage/maintenance-existing-context.js';

const op=()=>crypto.randomUUID(),read=(s,fn)=>s.repository.transaction(false,fn),row=f=>read(f.s,t=>t.get('meta',CONTEXT_CARDS_ROW));
const limits={maxContentBytes:96*1024};
async function fixture(){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');
 const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC existing claim Topic'});
 await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC current allowed working body',note:'SYNTHETIC unselected private note'});
 await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:(await f.s.input(input.id)).revision,topicIds:[topic.id]});
 const caller=Object.freeze({id:op()}),controller=new AbortController(),state={allowed:true,generation:1,expiresAt:Date.now()+600000,receipts:new Set(),existingAllowed:true};
 const verifier={verify:async(actual,store,scope)=>actual===caller&&store===f.s?{version:1,store,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:state.generation,scope,processing:state.allowed,expiresAt:state.expiresAt,revocationSignal:controller.signal}:null,isCurrent:(actual,r,store)=>actual===caller&&store===f.s&&r.authorizationGeneration===state.generation&&state.allowed};
 const service=new ContextMaintenanceService(f.s,{processingVerifier:verifier}),cards=new ContextCardsService(f.s);
 const processing={
  async resolve(_t,scope){if(scope.existingContextItems?.length&&!state.existingAllowed)return null;const receipt=Object.freeze({version:1,store:f.s,caller,scope:structuredClone(scope),epoch:'synthetic-processing-'+state.generation,processing:state.allowed,expiresAt:state.expiresAt,revocationSignal:controller.signal});state.receipts.add(receipt);return receipt;},
  isCurrent(r,store){return state.receipts.has(r)&&store===f.s&&r.caller===caller&&r.epoch==='synthetic-processing-'+state.generation&&state.allowed&&!controller.signal.aborted;}
 };
 const value={...f,input,topic,caller,controller,state,service,cards,processing};value.c=await add(value);return value;
}
async function add(f,{input=f.input,topic=f.topic,body='SYNTHETIC existing automatic claim',card='info',...extra}={}){
 const scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true,scope.reason);const p=await read(f.s,t=>inputProjection(f.s,t,input.id));
 const c={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body,section:'SYNTHETIC saved section',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence}],...extra};assert.equal((await f.service.maintain(f.caller,c)).disposition,'created');return c;
}
async function plan(f,inputIds=[f.input.id]){return read(f.s,t=>planMaintenanceExistingContext(f.s,t,{epoch:'initial',inputIds}));}
async function grant(f,p,mutate=x=>x){
 const scope=mutate({purpose:'ai-maintenance-payload',logicalJobId:op(),childOperationId:op(),principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',inputs:[{inputId:f.input.id,selectedFields:['body']}],facets:['context'],coverage:[{key:JSON.stringify(['input',f.input.id]),facet:'context',scope:'synthetic-scope'}],existingContextItems:maintenanceExistingContextScope(p)});
 return read(f.s,t=>f.processing.resolve(t,scope));
}
async function witness(f,{p=null,receipt=null,mutate=x=>x,config=limits}={}){p??=await plan(f);receipt??=await grant(f,p,mutate);const handle=await captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:fn=>read(f.s,fn),limits:config});return {p,receipt,handle};}
const check=(f,h)=>read(f.s,t=>assertMaintenanceExistingContext(f.s,t,h));
const human=(f,changes={})=>f.cards.change({kind:'put',operationId:op(),epoch:f.c.epoch,itemId:f.c.itemId,card:f.c.card,expectedRevision:1,body:'SYNTHETIC human-corrected private claim',section:'SYNTHETIC human section',...changes});
async function otherInput(f){await f.s.capture(capture((await f.s.status()).epoch,'synthetic-unrelated-input','SYNTHETIC unrelated source'));await f.s.finishFoundation();const input=(await f.s.snapshot()).library.blocks.find(i=>i.id!==f.input.id);const topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC unrelated Topic'});await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:(await f.s.input(input.id)).revision,topicIds:[topic.id]});return {input,topic};}

test('existing automatic Item has exact separately granted body, stable IDs and original associations, with no private Source/manual upload',async()=>{
 const f=await fixture(),other=await otherInput(f);await add(f,{...other,body:'UNRELATED_AUTOMATIC_PRIVATE_BODY'});await f.cards.change({kind:'put',operationId:op(),epoch:'initial',itemId:op(),card:'info',expectedRevision:0,body:'MANUAL_PRIVATE_BODY',section:'Manual'});
 const before=await row(f),w=await witness(f),records=readMaintenanceExistingContext(w.handle);assert.equal(records.length,1);assert.equal(records[0].state,'available');assert.equal(records[0].body,f.c.body);assert.equal(records[0].section,f.c.section);assert.equal(records[0].ref,'c0');assert.equal(records[0].revision,1);
 const selected=resolveMaintenanceExistingContext(w.handle,records[0].ref);assert.equal(selected.itemId,f.c.itemId);assert.deepEqual(selected.associationIds,f.c.associationIds);assert.deepEqual(selected.provenance,before.items.find(i=>i.id===f.c.itemId).maintenance.provenance);assert.equal(Object.hasOwn(selected,'body'),false);
 assert.ok(!JSON.stringify(records).includes('PRIVATE'));assert.ok(!JSON.stringify(records).includes('Synthetic explicit working input'));assert.ok(!JSON.stringify(records).includes('sourceRecordIds'));assert.ok(!JSON.stringify(records).includes('https://'));assert.ok(!JSON.stringify(maintenanceExistingContextScope(w.p)).includes(f.c.body));assert.equal(await check(f,w.handle),true);assert.deepEqual(await row(f),before);releaseMaintenanceExistingContext(w.handle);
});

for(const defect of ['missing-item-scope','extra-item','wrong-revision','wrong-fields','input-only','declined-owner'])test('ordinary Input permission cannot authorize existing Context '+defect,async()=>{
 const f=await fixture(),p=await plan(f);if(defect==='declined-owner')f.state.existingAllowed=false;
 const mutate=s=>{if(defect==='missing-item-scope'||defect==='input-only')delete s.existingContextItems;if(defect==='extra-item')s.existingContextItems=[...s.existingContextItems,{...s.existingContextItems[0],itemId:op()}];if(defect==='wrong-revision')s.existingContextItems=[{...s.existingContextItems[0],revision:99}];if(defect==='wrong-fields')s.existingContextItems=[{...s.existingContextItems[0],selectedFields:[]}];return s;};
 await assert.rejects(witness(f,{p,mutate}),{code:'UNAVAILABLE'});assert.equal((await row(f)).items[0].revision,1);
});

for(const defect of ['expired','revoked','generation','processing','cloned-receipt','async-current'])test('original processing receipt '+defect+' is rechecked before exposing existing Item material',async()=>{
 const f=await fixture(),w=await witness(f);if(defect==='expired')f.state.expiresAt=0;if(defect==='revoked')f.controller.abort();if(defect==='generation')f.state.generation++;if(defect==='processing')f.state.allowed=false;
 if(defect==='expired'){// Original host also owns its current expiry, independent of the frozen snapshot.
  const original=f.processing.isCurrent;f.processing.isCurrent=(r,s)=>f.state.expiresAt>Date.now()&&original(r,s);
 }
 if(defect==='cloned-receipt'||defect==='async-current')await assert.rejects(captureMaintenanceExistingContext(f.s,w.p,{processingReceipt:defect==='cloned-receipt'?{...w.receipt}:w.receipt,assertProcessing:defect==='async-current'?async()=>true:(r,s)=>f.processing.isCurrent(r,s),read:fn=>read(f.s,fn),limits}),{code:'UNAVAILABLE'});
 else assert.throws(()=>readMaintenanceExistingContext(w.handle),{code:'UNAVAILABLE'});releaseMaintenanceExistingContext(w.handle);
});

for(const mutation of ['input-body','input-exclusion','source-trash','context-edit','context-remove','context-update','legacy-permission','source-body','item-body','item-revision'])test('actual Store '+mutation+' invalidates the existing witness before dispatch/final owner use',async()=>{
 const f=await fixture(),w=await witness(f);
 if(mutation==='input-body')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC actual newer Input meaning'});
 if(mutation==='input-exclusion')await inputEdit(f.s,f.input.id,{excluded:true});
 if(mutation==='source-trash')await f.s.trash(f.input.originalTextReference);
 if(mutation==='context-edit')await human(f);
 if(mutation==='context-remove')await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:f.c.itemId,expectedRevision:1});
 if(mutation==='context-update')await f.service.maintain(f.caller,{...f.c,operationId:op(),expectedRevision:1,body:'SYNTHETIC newer automatic claim'});
 if(mutation==='legacy-permission')await new MemoryService(f.s).exclude({inputId:f.input.id,excluded:true});
 if(mutation==='source-body'||mutation==='item-body'||mutation==='item-revision')await f.s.repository.transaction(true,async t=>{if(mutation==='source-body'){const r=await t.get('records',f.input.originalTextReference);r.value.originalText+=' SAME_REVISION_DRIFT';await t.put('records',r);}else{const r=await t.get('meta',CONTEXT_CARDS_ROW),item=r.items.find(i=>i.id===f.c.itemId);if(mutation==='item-body')item.body+=' SAME_REVISION_DRIFT';else item.revision++;await t.put('meta',r);}});
 await assert.rejects(check(f,w.handle));releaseMaintenanceExistingContext(w.handle);
});

for(const action of ['remove','correct','restore'])test('human '+action+' stays an exact body-free negative witness after a real Input edit',async()=>{
 const f=await fixture();let revision=1;if(action==='correct'){await human(f);revision++;}else{const deletion=op();await f.cards.change({kind:'delete',operationId:deletion,epoch:'initial',itemId:f.c.itemId,expectedRevision:1});revision++;if(action==='restore'){await f.cards.change({kind:'restore',operationId:op(),epoch:'initial',itemId:f.c.itemId,expectedRevision:2,deletedBy:deletion});revision++;}}
 await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC changed Input with a different legitimate claim'});
 const w=await witness(f),records=readMaintenanceExistingContext(w.handle),item=resolveMaintenanceExistingContext(w.handle,records[0].ref);assert.equal(records.length,1);assert.equal(records[0].state,action==='remove'?'removed':'protected');assert.equal(records[0].revision,revision);assert.equal(item.itemId,f.c.itemId);assert.deepEqual(item.associationIds,f.c.associationIds);assert.equal(item.protected,true);assert.equal(Object.hasOwn(records[0],'body'),false);assert.equal(Object.hasOwn(records[0],'section'),false);assert.deepEqual(maintenanceExistingContextScope(w.p)[0].selectedFields,[]);assert.ok(!JSON.stringify(records).includes(f.c.body));assert.ok(!JSON.stringify(records).includes('human-corrected'));assert.equal(await check(f,w.handle),true);releaseMaintenanceExistingContext(w.handle);
});

test('changed Input never silently certifies old automatic text current, while retaining identity for future typed UPDATE',async()=>{
 const f=await fixture();await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC actual changed meaning'});const w=await witness(f),record=readMaintenanceExistingContext(w.handle)[0];assert.equal(record.state,'unavailable');assert.equal(Object.hasOwn(record,'body'),false);assert.equal(resolveMaintenanceExistingContext(w.handle,record.ref).itemId,f.c.itemId);assert.deepEqual(resolveMaintenanceExistingContext(w.handle,record.ref).associationIds,f.c.associationIds);releaseMaintenanceExistingContext(w.handle);
});

test('distinct real claims sharing an Input retain different identities, and a removed claim does not erase the other',async()=>{
 const f=await fixture(),other=await add(f,{body:'SYNTHETIC distinct legitimate claim',card:'rules'});await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:f.c.itemId,expectedRevision:1});const w=await witness(f),records=readMaintenanceExistingContext(w.handle);assert.equal(records.length,2);const removed=records.find(i=>i.state==='removed'),active=records.find(i=>i.state==='available');assert.equal(resolveMaintenanceExistingContext(w.handle,removed.ref).itemId,f.c.itemId);assert.equal(resolveMaintenanceExistingContext(w.handle,active.ref).itemId,other.itemId);assert.equal(active.body,other.body);assert.notEqual(removed.ref,active.ref);releaseMaintenanceExistingContext(w.handle);
});

test('unrelated Input produces an empty complete witness instead of a library-wide ban',async()=>{
 const f=await fixture(),other=await otherInput(f),p=await plan(f,[other.input.id]),scope={purpose:'ai-maintenance-payload',inputs:[{inputId:other.input.id,selectedFields:['body']}],facets:['context'],existingContextItems:maintenanceExistingContextScope(p)},receipt=await read(f.s,t=>f.processing.resolve(t,scope));const w=await witness(f,{p,receipt});assert.deepEqual(readMaintenanceExistingContext(w.handle),[]);releaseMaintenanceExistingContext(w.handle);
});

test('bound budget refuses without clipping and forged/released handles cannot become Item authority',async()=>{
 const f=await fixture();await assert.rejects(witness(f,{config:{maxContentBytes:1}}),{code:'BUDGET_EXCEEDED'});const w=await witness(f);assert.throws(()=>resolveMaintenanceExistingContext(w.handle,'c999'),{code:'INVALID_REQUEST'});assert.throws(()=>readMaintenanceExistingContext({...w.handle}),{code:'STALE_BASE'});releaseMaintenanceExistingContext(w.handle);assert.throws(()=>readMaintenanceExistingContext(w.handle),{code:'STALE_BASE'});await assert.rejects(check(f,w.handle),{code:'STALE_BASE'});
});

test('same-revision Item drift between plan and explicit qualification is rejected',async()=>{
 const f=await fixture(),p=await plan(f),receipt=await grant(f,p);await f.s.repository.transaction(true,async t=>{const r=await t.get('meta',CONTEXT_CARDS_ROW);r.items[0].body='SYNTHETIC unqualified replacement';await t.put('meta',r);});await assert.rejects(witness(f,{p,receipt}),{code:'STALE_BASE'});
});

test('original temporal text is included only in the exact explicit Item field scope',async()=>{
 const f=await fixture(),temporal={temporalScope:'SYNTHETIC temporary engagement',uncertainty:'SYNTHETIC exact qualification',validUntil:'2099-01-01T00:00:00.000Z'};
 assert.equal((await f.service.maintain(f.caller,{...f.c,operationId:op(),expectedRevision:1,temporal})).disposition,'updated');const p=await plan(f);assert.deepEqual(maintenanceExistingContextScope(p)[0].selectedFields,['body','section','temporal']);
 await assert.rejects(witness(f,{p,mutate:s=>({...s,existingContextItems:[{...s.existingContextItems[0],selectedFields:['body','section']}]})}),{code:'UNAVAILABLE'});const w=await witness(f,{p});assert.deepEqual(readMaintenanceExistingContext(w.handle)[0].temporal,temporal);releaseMaintenanceExistingContext(w.handle);assert.throws(()=>maintenanceExistingContextScope(p),{code:'STALE_BASE'});
});

test('more than 32 genuine relevant Items stays pending instead of sending a misleading truncated witness',async()=>{
 const f=await fixture();for(let i=0;i<32;i++)await add(f,{body:'SYNTHETIC distinct claim '+i});assert.equal((await row(f)).items.length,33);await assert.rejects(plan(f),{code:'BUDGET_EXCEEDED'});
});

// Independent review regressions retained unchanged from the original RED fixture.
for (const defect of ['shared-section-removed','shared-topic-layout']) test('REVIEW same-revision '+defect+' must invalidate original Context witness',async()=>{
 const f=await fixture(),otherTopic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC second shared membership Topic'});
 await f.s.addToTopics({operationId:op(),kind:'input',id:f.input.id,expectedRevision:(await f.s.input(f.input.id)).revision,topicIds:[otherTopic.id]});
 const w=await witness(f);assert.equal(readMaintenanceExistingContext(w.handle)[0].state,'available');
 await f.s.repository.transaction(true,async t=>{
  const ps=await t.all('placements','byTopicOrder',IDBKeyRange.bound([otherTopic.id],[otherTopic.id,[]],false,true));assert.ok(ps.length);
  if(defect==='shared-section-removed'){const p=ps[0],section=await t.get('sections',JSON.stringify([p.topicId,p.layoutGeneration,p.sectionId]));section.lifecycle='removed';await new Promise((resolve,reject)=>{const r=t.tx.objectStore('sections').put(section);r.onsuccess=resolve;r.onerror=reject;});}
  if(defect==='shared-topic-layout'){const topic=await t.get('topics',otherTopic.id);topic.layoutJobId=op();await new Promise((resolve,reject)=>{const r=t.tx.objectStore('topics').put(topic);r.onsuccess=resolve;r.onerror=reject;});}
 });
 let fresh=null;try{fresh=await witness(f);}catch(e){assert.equal(e.code,'UNAVAILABLE');}if(fresh)assert.equal(Object.hasOwn(readMaintenanceExistingContext(fresh.handle)[0],'body'),false,'fresh original lineage must now withhold body');
 await assert.rejects(check(f,w.handle),'old witness must not remain valid after relevant currentness changed without a sequence bump');
 releaseMaintenanceExistingContext(w.handle);if(fresh)releaseMaintenanceExistingContext(fresh.handle);
});

test('REVIEW release during the last async snapshot rejects publication',async()=>{
 const f=await fixture(),p=await plan(f),receipt=await grant(f,p);let reads=0;
 await assert.rejects(captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:async fn=>{const r=await read(f.s,fn);if(++reads===2)releaseMaintenanceExistingContext(p);return r;},limits}),{code:'STALE_BASE'});
});

test('REVIEW revoke during the last async snapshot rejects publication',async()=>{
 const f=await fixture(),p=await plan(f),receipt=await grant(f,p);let reads=0;
 await assert.rejects(captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:async fn=>{const r=await read(f.s,fn);if(++reads===2)f.controller.abort();return r;},limits}),{code:'UNAVAILABLE'});
});

test('REVIEW exact store database lifetime cannot be reused',async()=>{
 const f=await fixture(),w=await witness(f);await f.s.repository.close();assert.throws(()=>readMaintenanceExistingContext(w.handle),{code:'STALE_BASE'});releaseMaintenanceExistingContext(w.handle);
});

test('REVIEW source admission bound is checked before reading record 21',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,async t=>{
  const block=await t.get('blocks',f.input.id),state=await t.get('inputStates',f.input.id),baseRecord=await t.get('records',f.input.originalTextReference),baseIndex=await t.get('recordIndex',f.input.originalTextReference);
  for(let i=0;i<20;i++){const id=op();await t.put('records',{...baseRecord,id,value:{...baseRecord.value,id}});await t.put('recordIndex',{...baseIndex,id,sequence:i+1,sourceKey:'synthetic-source-'+i,dedupeKey:'synthetic-snapshot-'+i});block.value.provenance.push({sourceRecordId:id});state.sourceRecordIds.push(id);}
  await t.put('blocks',block);await t.put('inputStates',state);
 });
 const p=await plan(f),receipt=await grant(f,p);let recordReads=0;
 await assert.rejects(captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:fn=>read(f.s,t=>{const facade=Object.create(t);facade.get=async(store,id)=>{if(store==='records')recordReads++;return t.get(store,id);};return fn(facade);}),limits}),{code:'BUDGET_EXCEEDED'});
 assert.ok(recordReads<=20,'21-Source selection materialized '+recordReads+' Source bodies before source-bound refusal');
});

test('REVIEW membership admission count rejects before materializing over-bound pages',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,async t=>{const ps=await t.all('placements','byTopicOrder',IDBKeyRange.bound([f.topic.id],[f.topic.id,[]],false,true)),base=ps[0];assert.ok(base);for(let i=0;i<100;i++){const entryId=op();await t.put('placements',{...base,id:JSON.stringify([base.topicId,base.layoutGeneration,entryId]),entryId,rank:String(i+2).padStart(12,'0')});}});
 const p=await plan(f),receipt=await grant(f,p);let materialized=0;
 await assert.rejects(captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:fn=>read(f.s,t=>{const facade=Object.create(t);facade.rangePage=async(...args)=>{const page=await t.rangePage(...args);if(args[0]==='placements')materialized+=page.rows.length;return page;};return fn(facade);}),limits}),{code:'BUDGET_EXCEEDED'});
 assert.equal(materialized,0,'known over-bound membership count should prevent page retention');
});


for(const [character,expectedReads]of [['x',3],['界',1]])test('large '+(character==='x'?'ASCII':'UTF-8')+' Source fields are charged incrementally before retaining later records',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,async t=>{
  const block=await t.get('blocks',f.input.id),state=await t.get('inputStates',f.input.id),baseRecord=await t.get('records',f.input.originalTextReference),baseIndex=await t.get('recordIndex',f.input.originalTextReference);
  baseRecord.value.originalText=character.repeat(400000);await t.put('records',baseRecord);
  for(let i=0;i<3;i++){const id=op();await t.put('records',{...baseRecord,id,value:{...baseRecord.value,id}});await t.put('recordIndex',{...baseIndex,id,sequence:i+1,sourceKey:'synthetic-large-source-'+i,dedupeKey:'synthetic-large-snapshot-'+i});block.value.provenance.push({sourceRecordId:id});state.sourceRecordIds.push(id);}
  await t.put('blocks',block);await t.put('inputStates',state);
 });
 const p=await plan(f),receipt=await grant(f,p);let recordReads=0;
 await assert.rejects(captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>f.processing.isCurrent(r,s),read:fn=>read(f.s,t=>{const facade=Object.create(t);facade.get=async(name,id)=>{if(name==='records')recordReads++;return t.get(name,id);};return fn(facade);}),limits}),{code:'BUDGET_EXCEEDED'});
 assert.equal(recordReads,expectedReads,'no later Source body is acquired after crossing the original local snapshot byte ceiling');
});

for(const defect of ['dependency','provenance','identity-registry'])test('same-version native '+defect+' drift is covered by original owner dependency reads',async()=>{
 const f=await fixture(),w=await witness(f);await f.s.repository.transaction(true,async t=>{
  const placements=await t.all('placements','byTopicOrder',IDBKeyRange.bound([f.topic.id],[f.topic.id,[]],false,true)),entryId=placements[0].entryId;let name,value;
  if(defect==='dependency'){name='dependencies';value=(await t.all(name,'byTarget',IDBKeyRange.bound(['entry',entryId],['entry',entryId,[]],false,true)))[0];value.status='version_unknown';}
  if(defect==='provenance'){name='provenance';value=(await t.all(name,'byOwner',IDBKeyRange.bound(['entry',entryId],['entry',entryId,[]],false,true)))[0];value.span.full=false;}
  if(defect==='identity-registry'){name='meta';const topic=await t.get('topics',f.topic.id);value=await t.get(name,'personalTopicName:'+topic.identity.nameToken);value.topicIds=[];}
  await new Promise((resolve,reject)=>{const r=t.tx.objectStore(name).put(value);r.onsuccess=resolve;r.onerror=reject;});
 });await assert.rejects(check(f,w.handle));releaseMaintenanceExistingContext(w.handle);
});

test('planning cannot widen mutable Input selection after its original validation',async()=>{
 const f=await fixture(),ids=[f.input.id];let changed=false;
 await assert.rejects(read(f.s,t=>{const facade=Object.create(t);facade.get=async(...args)=>{const value=await t.get(...args);if(!changed){changed=true;for(let i=0;i<20;i++)ids.push(op());}return value;};return planMaintenanceExistingContext(f.s,facade,{epoch:'initial',inputIds:ids});}),{code:'INVALID_REQUEST'});
});
