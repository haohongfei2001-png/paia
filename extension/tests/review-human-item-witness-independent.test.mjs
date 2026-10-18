import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {formationFixture,runFormation,rows} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextMaintenanceService,createContextFreshInputPolicy} from '../core/context-maintenance.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readAuthoredEntryContext,authoredContextEvidence,authoredSelectedFields,authoredSelectedText} from '../core/context-authored-entry.js';
import {readBoundEntryContext,boundContextEvidence,boundSelectedText} from '../core/context-bound-entry.js';
import {readStructuralContext,structuralContextEvidence,structuralContextScope} from '../core/ai-usage/structural-context-mapping.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {planMaintenanceExistingContext,maintenanceExistingContextScope,captureMaintenanceExistingContext,readMaintenanceExistingContext,resolveMaintenanceExistingContext,assertMaintenanceExistingContext,bindMaintenanceExistingContextContextOperation,assertMaintenanceExistingContextContextStage,settleMaintenanceExistingContextContext,releaseMaintenanceExistingContext} from '../core/ai-usage/maintenance-existing-context.js';
const op=()=>crypto.randomUUID(),read=(s,fn)=>s.repository.transaction(false,fn),get=(f,n,id)=>read(f.s,t=>t.get(n,id)),write=(f,fn)=>f.s.repository.transaction(true,fn),limits={maxContentBytes:96*1024};
const nativePut=(t,name,row)=>new Promise((resolve,reject)=>{const request=t.tx.objectStore(name).put(row);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
const hashes=async fields=>Object.fromEntries(await Promise.all(Object.entries(fields).map(async([k,v])=>[k,await hashText(v)])));
async function fixture(kind='authored',fields={body:'SYNTHETIC authored body',note:'SYNTHETIC authored note',title:'SYNTHETIC authored title'}){
 let f,topic,entry,placement,section;
 if(kind==='authored'){
  f=await setup(OrganizerStore);await f.s.setFilterMode('off');topic=await f.s.createTopic({name:'SYNTHETIC human Topic',operationId:op()});entry=await f.s.createEntry({actor:'user',operationId:op(),...fields,type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});
 }else{
  f=await formationFixture();await runFormation(f);entry=(await rows(f.s,'thoughts'))[0];topic=(await rows(f.s,'topics'))[0];placement=(await rows(f.s,'placements'))[0];
  if(kind==='bound')await f.s.editEntry({id:entry.id,expectedRevision:entry.revision,operationId:op(),changes:{note:'SYNTHETIC bound note',title:'SYNTHETIC bound title'}});
  await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:(await read(f.s,t=>t.get('thoughts',entry.id))).revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,operationId:op()});
  section=(await rows(f.s,'sections'))[0];
  if(kind==='section')await f.s.editSection({topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC selected human Section',operationId:op()});
  if(kind==='topic')await f.s.renameTopic({id:topic.id,expectedRevision:(await f.s.topic(topic.id)).revision,name:'SYNTHETIC selected human Topic',operationId:op()});
 }
 const caller=Object.freeze({id:op()}),abort=new AbortController(),state={allowed:true,generation:1,receipts:new Set()},verifier={verify:async(actual,store,scope)=>actual===caller?{version:1,store,scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:state.generation,processing:state.allowed,expiresAt:Date.now()+600000,revocationSignal:abort.signal}:null,isCurrent:(actual,r,store)=>actual===caller&&store===f.s&&state.allowed&&!abort.signal.aborted&&r.authorizationGeneration===state.generation};
 const owner=new ContextMaintenanceService(f.s,{processingVerifier:verifier}),cards=new ContextCardsService(f.s);
 const result={...f,kind,topic,entry,placement,section,caller,abort,state,owner,cards,verifier};result.selected=await selection(result);result.change=await change(result);assert.equal((await owner.maintain(caller,result.change)).disposition,'created');return result;
}
async function selection(f){
 const selected={epoch:'initial',inputIds:[],authoredEntries:[],boundEntries:[],structuralSections:[],structuralTopics:[]};
 if(f.kind==='authored'){const m=await read(f.s,t=>readAuthoredEntryContext(f.s,t,f.entry.id));assert.ok(m);selected.authoredEntries=[{...m,selectedFields:[...authoredSelectedFields(m)]}];}
 else if(f.kind==='bound'){const m=await read(f.s,t=>readBoundEntryContext(f.s,t,f.entry.id));assert.ok(m);selected.inputIds=[m.inputId];selected.boundEntries=[m];}
 else{const descriptor=(await rows(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind===f.kind).descriptor,m=await read(f.s,t=>readStructuralContext(f.s,t,descriptor));assert.ok(m);selected.inputIds=[...new Set(m.entries.map(e=>e.inputId))];selected[f.kind==='section'?'structuralSections':'structuralTopics']=[structuralContextScope(m)];}
 return selected;
}
async function change(f,selected=f.selected){
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true,scope.reason);const evidence=[];
 for(const inputId of selected.inputIds){const p=await read(f.s,t=>inputProjection(f.s,t,inputId));evidence.push({topicId:f.topic.id,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence});}
 if(f.kind==='authored'){const m=selected.authoredEntries[0],row=await get(f,'thoughts',m.entryId);evidence.push(authoredContextEvidence(m,scope.binding,await hashes(authoredSelectedText(row,m.selectedFields))));}
 if(f.kind==='bound'){const m=selected.boundEntries[0],row=await get(f,'thoughts',m.entryId);evidence.push(boundContextEvidence(m,scope.binding,await hashes(boundSelectedText(row,m.selectedFields))));}
 if(['section','topic'].includes(f.kind)){const m=selected[f.kind==='section'?'structuralSections':'structuralTopics'][0],row=await get(f,f.kind==='section'?'sections':'topics',m.recordId),field=f.kind==='section'?'title':'name';for(const e of evidence)e[f.kind==='section'?'humanSection':'humanTopic']=structuralContextEvidence(m,{[field]:await hashText(row[field])});}
 return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC existing '+f.kind+' Context claim',section:'SYNTHETIC saved section',associationIds:[op()],evidence};
}
const plan=(f,selected=f.selected)=>read(f.s,t=>planMaintenanceExistingContext(f.s,t,selected));
async function grant(f,p,selected=f.selected,mutate=x=>x){const scope={purpose:'ai-maintenance-payload',childOperationId:op(),inputs:selected.inputIds.map(inputId=>({inputId,selectedFields:['body']})),facets:['context'],existingContextItems:maintenanceExistingContextScope(p)};for(const key of ['authoredEntries','boundEntries','structuralSections','structuralTopics'])if(selected[key]?.length)scope[key]=structuredClone(selected[key]);const receipt=Object.freeze({version:1,store:f.s,caller:f.caller,scope:mutate(structuredClone(scope)),epoch:'synthetic-processing-'+f.state.generation,processing:f.state.allowed,expiresAt:Date.now()+600000,revocationSignal:f.abort.signal});f.state.receipts.add(receipt);return receipt;}
const current=(f,r,s)=>f.state.receipts.has(r)&&s===f.s&&r.epoch==='synthetic-processing-'+f.state.generation&&f.state.allowed&&!f.abort.signal.aborted;
async function witness(f,{selected=f.selected,p=null,receipt=null,mutate=x=>x,reader=fn=>read(f.s,fn)}={}){p??=await plan(f,selected);receipt??=await grant(f,p,selected,mutate);const handle=await captureMaintenanceExistingContext(f.s,p,{processingReceipt:receipt,assertProcessing:(r,s)=>current(f,r,s),read:reader,limits});return {p,receipt,handle};}
const check=(f,h)=>read(f.s,t=>assertMaintenanceExistingContext(f.s,t,h));
const bodyFree=record=>{for(const field of ['body','section','temporal'])assert.equal(Object.hasOwn(record,field),false);};

for (const kind of ['section','topic']) test('REVIEW '+kind+' over-bound journal Source union refuses before unrelated Source material', async()=>{
 const f=await fixture(kind), originalIds=(await get(f,'thoughts',f.entry.id)).sourceRecordIds;
 await write(f,async t=>{
  const source=await t.get('records',originalIds[0]),ix=await t.get('recordIndex',originalIds[0]),extra=[];
  for(let i=0;i<20;i++){
   const id=op();extra.push(id);await nativePut(t,'records',{...source,id,value:{...source.value,id}});await nativePut(t,'recordIndex',{...ix,id,sequence:i+100,sourceKey:'synthetic-journal-source-'+i,dedupeKey:'synthetic-journal-snapshot-'+i});
  }
  const mapping=f.selected[kind==='section'?'structuralSections':'structuralTopics'][0],journal=await t.get('revisions',mapping.journalId);
  journal.sourceRecordIds=[...originalIds,...extra].sort();await nativePut(t,'revisions',journal);
 });
 const p=await plan(f),material=[];
 await assert.rejects(witness(f,{p,reader:fn=>read(f.s,t=>{const facade=Object.create(t);facade.get=async(name,id)=>{if(name==='records')material.push(id);return t.get(name,id);};return fn(facade);})}),{code:'BUDGET_EXCEEDED'});
 assert.equal(material.filter(id=>!originalIds.includes(id)).length,0,JSON.stringify({totalReads:material.length,unrelatedReads:material.filter(id=>!originalIds.includes(id)).length}));
 releaseMaintenanceExistingContext(p);
});
test('REVIEW body-only authored Item requires explicit selectedFields in original selection and receipt',async()=>{
 const f=await fixture('authored',{body:'SYNTHETIC original only body',note:'',title:''}),selected=structuredClone(f.selected);delete selected.authoredEntries[0].selectedFields;
 let reads=0;await assert.rejects(witness(f,{selected,reader:async fn=>{reads++;return read(f.s,fn);}}));assert.equal(reads,0);
});
