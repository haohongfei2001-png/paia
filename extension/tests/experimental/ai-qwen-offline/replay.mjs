// Explicit offline experiment. No transport or model selection: production owners
// consume frozen literal fixture output; synthetic financial authority is not real.
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from '../../vendor/fake-indexeddb/build/esm/index.js';
import {local} from '../../harness/thought-m1.mjs';
import {OrganizerStore} from '../../../core/organizer/store.js';
import {LocalOrganizeSession} from '../../../core/organizer/local-organize-session.js';
import {aiCandidateKey} from '../../../core/organizer/ai-candidate.js';
import {digest,readArtifacts} from './artifacts.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const profile={contractVersion:'local-incremental-v2',modelVersion:'offline-literal-fixture-not-qwen',promptVersion:'frozen-literal-v1'};
const authority=async(_t,r)=>({allowed:true,principalId:'synthetic-offline',libraryId:'synthetic-offline',consentEpoch:'fixture-only',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
const options={resolveAuthority:authority,profile,routeVersion:'offline-literal-fixture-v1',incrementalVersion:3};
export const rows=(store,table)=>store.run(()=>store.repository.transaction(false,t=>t.all(table)));
export const saved=f=>f.store.run(()=>f.store.repository.transaction(false,t=>t.get('meta','aiPresentation:'+f.topic.id)));
export async function loadTopic(data,topicId,style){
 const definition=data.corpus.topics.find(t=>t.id===topicId);assert.ok(definition);assert.ok(data.corpus.modes.includes(style));
 const store=new OrganizerStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-04-01T00:00:00.000Z'});await store.consent(true);await store.finishFoundation();
 const topic=await store.createTopic({name:definition.title,operationId:crypto.randomUUID()}),sections=new Map();
 for(const section of definition.sections){const created=await store.createSection({topicId:topic.id,title:'Synthetic '+section.id,expectedTopicRevision:(await store.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});assert.ok(!created.conflict);sections.set(section.id,created.sectionId);}
 const pref=await store.aiStylePreference();await store.updatePreferences({aiOrganizeStyle:{version:1,value:style,expectedRevision:pref.revision,expectedEpoch:pref.epoch}});
 return {data,definition,style,store,topic,sections,entries:new Map(),calls:0,receipts:[],qualification:'NOT_RUN',timeMetadata:'CORPUS_ONLY_NOT_REPRODUCED_AS_SOURCE_TIME'};
}
export async function addPhase(f,phase){
 const ids=phase.addEntryIds??phase.visibleEntryIds;
 // Removed fixture entries are actually created and removed through the owner.
 const toAdd=phase.addEntryIds?f.definition.entries.filter(e=>ids.includes(e.id)):f.definition.entries;
 for(const e of toAdd){if(f.entries.has(e.id))continue;const changed=e.revision>1;
  const created=await f.store.createEntry({actor:'user',operationId:crypto.randomUUID(),body:changed?'被替换的离线合成旧稿。':e.body,type:'idea',formation:'explicit',evidence:[]});
  if(changed){const now=await f.store.entry(created.id);await f.store.editEntry({id:created.id,expectedRevision:now.revision,changes:{body:e.body},operationId:crypto.randomUUID()});}
  const actual=await f.store.entry(created.id);assert.equal(actual.body,e.body);
  const placed=await f.store.placeEntry({topicId:f.topic.id,entryId:created.id,sectionId:f.sections.get(e.sectionId),expectedEntryRevision:actual.revision,expectedTopicRevision:(await f.store.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});assert.ok(!placed.conflict);
  if(e.lifecycle==='removed')await f.store.removeEntry({id:created.id,expectedRevision:(await f.store.entry(created.id)).revision,operationId:crypto.randomUUID()});
  f.entries.set(e.id,{id:created.id,corpusRevision:e.revision,definition:e});
 }
}
function providerFor(f,phase,onExecute){
 const c=f.data.artifact.cases.find(c=>c.topicId===f.definition.id&&c.phaseId===phase.id&&c.style===f.style);assert.ok(c);
 return {describe:()=>({providerId:'frozen-literal-offline-fixture',version:'1',executionKind:'fixture'}),execute:async request=>{
  f.calls++;assert.equal(request.style.value,f.style);assert.equal(request.usage.organizeStyle.value,f.style);
  const mapping=new Map([...f.entries].map(([key,value])=>[value.id,{key,...value}])),blocks=[];assert.ok(request.inputs.length>0&&request.inputs.length<=20);
  for(const input of request.inputs){const actual=mapping.get(input.ref),block=c.blocks.find(b=>b.sourceRef.id===actual?.key);assert.ok(block,'artifact covers exact current child input');assert.equal(input.text,block.text);assert.equal(actual.corpusRevision,block.sourceRef.corpusRevision);const current=await f.store.entry(input.ref);assert.equal(current.body,input.text);assert.equal(current.revision,JSON.parse(input.revision)[0],'actual canonical Entry revision inside qualified source version');
   blocks.push({field:block.field,text:block.text,evidenceEntryIds:[input.ref],sourceSpans:[{entryId:input.ref,revision:input.revision,start:block.sourceRef.start,end:block.sourceRef.end}]});
  }
  f.receipts.push({phase:phase.id,style:f.style,payloadDigest:digest(request),evidenceDigest:digest(request.inputs.map(i=>({corpusId:mapping.get(i.ref).key,bodyDigest:digest(i.text),corpusRevision:mapping.get(i.ref).corpusRevision}))),requestedRefs:request.inputs.map(i=>i.ref),inputVersions:request.inputs.map(i=>({ref:i.ref,revision:i.revision})),usageIdentity:structuredClone(request.usage),outputDigest:digest({version:2,blocks})});
  if(onExecute)await onExecute(request);return {version:2,blocks};
 }};
}
export async function replayPhase(f,phase,{adopt=true,onExecute=null}={}){
 const session=new LocalOrganizeSession(f.store,options),before=await rows(f.store,'thoughts'),sourceBefore=await rows(f.store,'records'),inputsBefore=await rows(f.store,'blocks');
 try{
  if(f.definition.id==='SYN-T12'){
   const removed=[...f.entries.values()].filter(e=>e.definition.lifecycle==='removed').map(e=>e.id);assert.equal(removed.length,1);assert.ok(before.some(e=>e.id===removed[0]&&e.lifecycle==='removed'));
   const jobsBefore=await rows(f.store,'organizerJobs'),attemptsBefore=await rows(f.store,'organizerUsage'),calls=f.calls;
   await assert.rejects(session.prepare({topicId:f.topic.id,children:phase.children??1}),{code:'STALE_BASE'});
   assert.deepEqual(await rows(f.store,'organizerJobs'),jobsBefore);assert.deepEqual(await rows(f.store,'organizerUsage'),attemptsBefore);assert.deepEqual(await rows(f.store,'thoughts'),before);assert.equal(f.calls,calls);assert.equal(await saved(f),undefined);
   return {fixtureOnly:true,quality:'NOT_RUN',topicId:f.definition.id,phaseId:phase.id,style:f.style,state:'STALE_REFUSED',ownerCode:'STALE_BASE',reason:'actual_removed_member_excludes_scope',jobId:null,children:[],newProviderCalls:0,newAttempts:0,sourceRecords:sourceBefore.length,workingBlocks:inputsBefore.length,canonicalEntryDigest:digest(before),timeMetadata:f.timeMetadata};
  }
  const handle=await session.prepare({topicId:f.topic.id,children:phase.children??1}),result=await session.run(handle,providerFor(f,phase,onExecute));
  assert.equal(result.state,'COMMITTED');const status=(await f.store.aiPresentationStatus({topicId:f.topic.id})).topics[0],candidate=status.candidate;assert.ok(candidate);assert.equal(candidate.schemaVersion,4);
  const candidateKey=aiCandidateKey(candidate),proposalDigest=digest(candidate.proposal),decisions=Object.fromEntries(candidate.changedFields.map(k=>[k,'adopt']));
  if(adopt)await f.store.editAIPresentation({topicId:f.topic.id,expectedRevision:candidate.expectedRevision,expectedCandidateKey:candidateKey,candidateDecisions:decisions,operationId:crypto.randomUUID()});
  const row=await saved(f);if(adopt)assert.equal(row.projection.currentView,f.definition.entries.filter(e=>f.entries.has(e.id)&&e.lifecycle==='active').map(e=>e.body).join('\n'),'literal projection follows exact human Entry order across children');const jobs=(await rows(f.store,'organizerJobs')).filter(j=>j.id===handle.jobId),attempts=await rows(f.store,'organizerUsage'),work=await rows(f.store,'organizerWorkItems');assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');
  const generation=Object.values((adopt?row.manifest:candidate.proposal.manifest).generations).find(g=>g.jobId===handle.jobId);assert.ok(generation);assert.equal(generation.style,f.style);assert.deepEqual(generation.children.map(c=>c.childId),jobs[0].childIds);const children=jobs[0].childIds.map(id=>{const a=attempts.find(a=>a.childId===id);const proof=generation.children.find(c=>c.childId===id);assert.match(proof.payloadDigest,/^[a-f0-9]{64}$/);assert.match(proof.validatedOutputDigest,/^[a-f0-9]{64}$/);assert.ok(f.receipts.some(r=>r.payloadDigest===proof.payloadDigest));assert.ok(a);assert.equal(a.attemptCount,1);assert.equal(a.state,'COMMITTED');assert.equal(a.operationReceiptId,proof.operationReceiptId);assert.equal(a.operationReceiptId,id);return {id,state:a.state,attemptCount:a.attemptCount,operationReceiptId:a.operationReceiptId,payloadDigest:proof.payloadDigest,validatedOutputDigest:proof.validatedOutputDigest};});
  const acknowledged=work.filter(w=>w.jobId===handle.jobId&&w.state==='ACKNOWLEDGED').length;assert.equal(acknowledged,f.receipts.filter(r=>r.phase===phase.id).flatMap(r=>r.requestedRefs).length);const calls=f.calls;assert.equal((await session.run(handle,{describe:()=>({providerId:'frozen-literal-offline-fixture',version:'1',executionKind:'fixture'}),execute:()=>{throw Error('committed replay must never dispatch');}})).state,'COMMITTED');assert.equal(f.calls,calls);
  assert.deepEqual(await rows(f.store,'thoughts'),before);assert.deepEqual(await rows(f.store,'records'),sourceBefore);assert.deepEqual(await rows(f.store,'blocks'),inputsBefore);
  return {fixtureOnly:true,quality:'NOT_RUN',topicId:f.definition.id,phaseId:phase.id,style:f.style,ownerTopicId:f.topic.id,jobId:handle.jobId,state:result.state,children,candidateKeyDigest:digest(candidateKey),proposalDigest,decisionsDigest:digest(decisions),presentationDigest:digest(row?.projection),manifestDigest:digest(row?.manifest),acknowledged,canonicalEntryDigest:digest(before),sourceRecords:sourceBefore.length,workingBlocks:inputsBefore.length,timeMetadata:f.timeMetadata};
 }finally{session.dispose();}
}
export async function runTopic(topicId,style,data=null){const f=await loadTopic(data??await readArtifacts(),topicId,style),results=[];for(const phase of f.definition.phases){await addPhase(f,phase);results.push(await replayPhase(f,phase));}return {f,results};}
export async function protectedRefusal(f){
 const current=await saved(f),text='离线合成人工保留：不覆盖 👩🏽‍💻。';assert.ok(current?.projection);
 await f.store.editAIPresentation({topicId:f.topic.id,expectedRevision:current.revision,field:'currentView',value:text,operationId:crypto.randomUUID()});const protectedRow=await saved(f);assert.equal(protectedRow.protections.currentView,true);
 const count=(await rows(f.store,'organizerUsage')).length,calls=f.calls,session=new LocalOrganizeSession(f.store,options);
 try{await assert.rejects(session.prepare({topicId:f.topic.id,refreshStyle:true}),{code:'STALE_BASE'});assert.deepEqual(await saved(f),protectedRow);assert.equal(f.calls,calls);assert.equal((await rows(f.store,'organizerUsage')).length,count);return {state:'STALE_BASE',newAttempts:0,newProviderCalls:0,protectedBeforeAfterDigest:digest(protectedRow),quality:'NOT_RUN'};}finally{session.dispose();}
}
export async function unknownAttemptNoReplay(f,phase){
 const first=new LocalOrganizeSession(f.store,options),handle=await first.prepare({topicId:f.topic.id});
 try{assert.equal((await first.run(handle,providerFor(f,phase,()=>{throw Error('synthetic offline response lost');}))).state,'OUTCOME_UNKNOWN');}finally{first.dispose();}
 await assert.rejects(first.assemble(handle),{code:'UNAVAILABLE'});assert.equal(await saved(f),undefined);
 const next=new LocalOrganizeSession(f.store,options);
 try{const same=await next.prepare({topicId:f.topic.id});assert.equal(same.jobId,handle.jobId);await assert.rejects(next.run(same,providerFor(f,phase)),{code:'OUTCOME_UNKNOWN'});assert.equal(f.calls,1);
  const attempts=await rows(f.store,'organizerUsage');assert.equal(attempts.length,1);assert.equal(attempts[0].attemptCount,1);assert.equal(attempts[0].state,'OUTCOME_UNKNOWN');assert.equal((await rows(f.store,'organizerWorkItems')).filter(w=>w.state==='ACKNOWLEDGED').length,0);assert.equal(await saved(f),undefined);
  return {fixtureOnly:true,quality:'NOT_RUN',state:'OUTCOME_UNKNOWN',jobId:handle.jobId,attempts:1,attemptCount:1,providerCalls:1,acknowledged:0,candidate:false};
 }finally{next.dispose();}
}
