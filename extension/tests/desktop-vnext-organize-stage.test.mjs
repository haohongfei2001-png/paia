import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,response,rows,meta,append} from './harness/original-complete.mjs';
import {reviewAI,adoptFirstAI} from './harness/ai-reviewed.mjs';
import {inputEdit} from './harness/thought-m1.mjs';
import {AIPresentationRunner,aiPresentationStatus,editAIPresentation,aiPresentationOperationOutcome} from '../core/organizer/ai-presentation.js';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AI_FIELDS,AI_LIST_FIELDS,validateAIPresentation} from '../core/organizer/ai-contract.js';
import {aiCandidateKey,isBaseNoneEnvelope} from '../core/organizer/ai-candidate.js';
import {BackupService} from '../core/backup-service.js';
const op=()=>crypto.randomUUID(),action=()=>({userActionId:op()});
async function fixture({count=2,reply=null,hold=null,limits=null}={}){
 const f=await completeFixture({texts:Array.from({length:count},(_,i)=>`Synthetic expression ${i}: uncertainty and evidence remain explicit.`),batchLimit:20,...(limits?{organizerBudget:limits}:{})});
 for(let i=0;i<Math.ceil(count/20);i++)assert.equal((await f.runner.wake(action())).error,undefined);
 const topicId=(await rows(f.s,'topics'))[0].id,calls=[];
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{
  const r=JSON.parse(JSON.parse(init.body).messages[1].content);calls.push(r);if(hold)await hold(r);
  return response({choices:[{message:{content:JSON.stringify(reply?reply(r):{topicId,blockSummary:'Synthetic proposed overview',currentView:'Still uncertain, without invented causation.',...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),decisions:[{text:'Keep the evidence unchanged.',evidenceEntryIds:[r.inputs.at(-1).ref]}],evidenceEntryIds:[r.inputs[0].ref]})}}]});
 }});return {...f,topicId,calls,provider,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials})};
}
const topic=f=>aiPresentationStatus(f.s,{topicId:f.topicId}).then(x=>x.topics[0]);
const choices=(row,decision='keep')=>Object.fromEntries(row.candidate.changedFields.map(field=>[field,decision]));
const edit=(f,row,decisions=choices(row))=>({topicId:f.topicId,expectedRevision:row.candidate.expectedRevision,expectedCandidateKey:aiCandidateKey(row.candidate),candidateDecisions:decisions,operationId:op()});
async function backup(s){const b=new BackupService(s,{appVersion:'0.12.0'}),start=await b.beginExport(),items=[start.header];for(let sequence=0;;sequence++){const page=await b.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)return items;}}
async function restore(s,items){const b=new BackupService(s,{appVersion:'0.12.0'}),{sessionId}=await b.beginRestore();for(let i=0;i<items.length;i+=30)await b.stageRestore({sessionId,items:items.slice(i,i+30)});const p=await b.previewRestore({sessionId});assert.equal(p.canRestore,true,JSON.stringify(p));await b.restore({sessionId,confirmation:p.integrity});}

test('D3 scope is body-free, Topic-only and exact across eight-item and byte cuts',async()=>{
 const f=await fixture({count:19}),before=await rows(f.s,'records'),scope=await f.ai.scope({topicId:f.topicId});
 assert.equal(scope.intendedCount,19);assert.equal(scope.eligibleCount,19);assert.equal(scope.batchCount,8);assert.equal(scope.remainingCount,11);assert.equal(scope.timeRange.unknownCount,19);assert.equal(scope.maxRequests,1);assert.equal(scope.complete,true);assert.equal(f.calls.length,0);assert.ok(!JSON.stringify(scope).includes('Synthetic expression'));
 assert.equal((await f.ai.wake({...action(),topicId:f.topicId,scopeBinding:scope.scopeBinding})).candidateCreated,true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].inputs.length,scope.batchCount);assert.deepEqual(await rows(f.s,'records'),before);assert.equal((await topic(f)).presentation,null);
 const size=f.ai.s.organizerBudget.limits.maxContentBytes;f.ai.s.organizerBudget.limits.maxContentBytes=200;const cut=await f.ai.scope({topicId:f.topicId});assert.ok(cut.batchCount<8);assert.equal(cut.remainingCount,11-cut.batchCount);assert.notEqual(cut.scopeBinding,scope.scopeBinding);f.ai.s.organizerBudget.limits.maxContentBytes=size;
});

test('D3 unconfirmed, wrong Topic or changed scope sends zero requests and writes no successful receipt',async()=>{
 const f=await fixture(),scope=await f.ai.scope({topicId:f.topicId});assert.equal((await f.ai.wake(action())).error,'INVALID_OUTPUT');
 const e=(await rows(f.s,'thoughts'))[0],r=await f.s.entry(e.id);await f.s.editEntry({id:e.id,expectedRevision:r.revision,expectedInputRevision:r.currentInputRevision,changes:{body:r.body+' Later explicit change.'},operationId:op()});
 const result=await f.ai.wake({...action(),topicId:f.topicId,scopeBinding:scope.scopeBinding});assert.equal(result.error,'STALE_BASE');assert.equal(f.calls.length,0);assert.equal(await meta(f.s,'aiOrganizerCheckpoint'),undefined);assert.equal((await topic(f)).presentation,null);
});

test('D3 changed material during credential/network boundary refuses before actual dispatch',async()=>{
 const f=await fixture(),scope=await f.ai.scope({topicId:f.topicId}),acquire=f.credentials.acquire.bind(f.credentials);f.credentials.acquire=async()=>{await f.s.foundationWrite(async t=>{const row=await t.get('topics',f.topicId);await t.put('topics',{...row,organizationRevision:row.organizationRevision+1});});return acquire();};
 assert.equal((await f.ai.wake({...action(),topicId:f.topicId,scopeBinding:scope.scopeBinding})).error,'STALE_BASE');assert.equal(f.calls.length,0);
 const second=await fixture();second.provider.networkGuard=async()=>second.s.foundationWrite(async t=>{const row=await t.get('topics',second.topicId);await t.put('topics',{...row,organizationRevision:row.organizationRevision+1});});
 assert.equal((await reviewAI(second.ai,action())).error,'STALE_BASE');assert.equal(second.calls.length,0);
});

test('D3 scope discloses exclusions and refuses an unreadable member instead of calling a prefix complete',async()=>{
 const f=await fixture({count:3}),entry=(await rows(f.s,'thoughts'))[0],dep=(await rows(f.s,'dependencies')).find(x=>x.targetId===entry.id);await inputEdit(f.s,dep.inputId,{excluded:true});
 const scope=await f.ai.scope({topicId:f.topicId});assert.equal(scope.intendedCount,3);assert.equal(scope.excludedCount,1);assert.equal(scope.eligibleCount,2);assert.equal(scope.batchCount,2);
 const read=f.s.readableEntry.bind(f.s),bad=(await rows(f.s,'thoughts')).find(x=>x.id!==entry.id).id;f.s.readableEntry=async(t,id)=>{if(id===bad)throw Error('Synthetic unavailable member');return read(t,id);};const blocked=await f.ai.scope({topicId:f.topicId});assert.equal(blocked.unavailableCount,1);assert.equal(blocked.complete,false);assert.equal(blocked.blockedReason,'UNAVAILABLE');assert.equal((await f.ai.wake({...action(),topicId:f.topicId,scopeBinding:blocked.scopeBinding})).error,'UNAVAILABLE');assert.equal(f.calls.length,0);
});

test('D3 scoped status never reads another Topic body and global old runtime cannot masquerade as this Topic',async()=>{
 const f=await fixture(),other=await f.s.createTopic({name:'Other synthetic Topic',operationId:op()});await f.s.continueThinking({topicId:other.id,body:'A separate unrelated source',operationId:op()});
 const read=f.s.readableEntry.bind(f.s),allowed=new Set((await rows(f.s,'placements')).filter(x=>x.topicId===f.topicId).map(x=>x.entryId));f.s.readableEntry=async(t,id)=>{assert.ok(allowed.has(id),'scoped status cannot touch another Topic body');return read(t,id);};
 await f.s.foundationWrite(async t=>{await t.put('meta',{id:'aiPresentationRequestCurrent',requestId:'other-request'});await t.put('meta',{id:'aiPresentationRequest:other-request',topicId:'other-topic',state:'failed'});});
 const status=await aiPresentationStatus(f.s,{topicId:f.topicId});assert.equal(status.topics.length,1);assert.equal(status.runtime,null);assert.equal(f.calls.length,0);
});

test('D3 first generation stages no Current, revision or journal; all Keep remains no Current with durable idempotent receipt',async()=>{
 const f=await fixture(),before=await rows(f.s,'records');assert.equal((await reviewAI(f.ai,action())).candidateCreated,true);const row=await topic(f),stored=await meta(f.s,'aiPresentation:'+f.topicId);
 assert.equal(row.presentation,null);assert.equal(isBaseNoneEnvelope(stored),true);assert.ok(AI_FIELDS.every(field=>!Object.hasOwn(stored,field)));assert.equal((await rows(f.s,'revisions')).filter(x=>x.kind==='ai_presentation').length,0);
 const command=edit(f,row),result=await editAIPresentation(f.s,command);assert.equal(result.hasCurrent,false);assert.equal(result.revision,0);assert.deepEqual(await editAIPresentation(f.s,command),result);assert.equal((await topic(f)).presentation,null);assert.equal((await topic(f)).candidate,null);assert.equal((await rows(f.s,'revisions')).filter(x=>x.kind==='ai_presentation').length,0);assert.deepEqual(await rows(f.s,'records'),before);assert.equal(f.calls.length,1);
});

test('D3 first mixed adoption constructs canonical defaults and only adopted field evidence',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const row=await topic(f),selected=choices(row);selected.decisions='adopt';const result=await editAIPresentation(f.s,edit(f,row,selected)),after=await topic(f);
 assert.equal(result.hasCurrent,true);assert.equal(after.presentation.blockSummary,'');assert.equal(after.presentation.currentView,'');assert.equal(after.presentation.decisions.length,1);assert.deepEqual(after.presentation.evidenceEntryIds,f.calls[0].inputs.slice(-1).map(x=>x.ref));assert.equal(after.presentation.revision,1);assert.equal(after.candidate,null);assert.equal(f.calls.length,1);
});

test('D3 explicit invalid field/ref is rejected as one response while legal omitted defaults stay supported',()=>{
 const request={inputs:[{ref:'a'},{ref:'b'}],context:[],topicCandidates:[{id:'t'}]},base={topicId:'t',blockSummary:'A bounded supported statement'};
 assert.deepEqual(validateAIPresentation(base,request).evidenceEntryIds,['a','b']);
 for(const patch of [{thoughtText:'Unauthorized Thought rewrite'},{libraryText:'Unauthorized Working Input rewrite'},{originalText:'Unauthorized Source rewrite'},{placements:[]},{currentView:42},{keyInformation:{}},{keyInformation:[{text:'',evidenceEntryIds:['a']}]},{decisions:[{text:'Unsupported evidence',evidenceEntryIds:['outside']}]},{evidenceEntryIds:['a','outside']},{evidenceEntryIds:[]},{openQuestions:[{text:'missing refs'}]}])assert.throws(()=>validateAIPresentation({...base,...patch},request),error=>error.code==='INVALID_OUTPUT');
});

test('D3 unavailable or invalid provider result preserves original and prior Current without hidden retry',async()=>{
 const f=await fixture({reply:r=>({topicId:r.topicCandidates[0].id,blockSummary:'Supported',decisions:[{text:'Do not drop this invalid statement',evidenceEntryIds:['outside']}]})});const before=await rows(f.s,'records'),result=await reviewAI(f.ai,action());assert.equal(result.error,'INVALID_SCHEMA');assert.equal((await topic(f)).presentation,null);assert.equal((await topic(f)).candidate,null);assert.equal(f.calls.length,1);assert.equal(await meta(f.s,'aiOrganizerCheckpoint'),undefined);assert.deepEqual(await rows(f.s,'records'),before);
});

test('D3 first candidate decisions reject incomplete, wrong identity, layout/material change and never replay',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const row=await topic(f),command=edit(f,row,choices(row,'adopt'));
 for(const wrong of [{...command,candidateDecisions:{}},{...command,expectedCandidateKey:'wrong'}])await assert.rejects(()=>editAIPresentation(f.s,wrong),error=>['INVALID_OUTPUT','STALE_BASE'].includes(error.code));
 await f.s.foundationWrite(async t=>{const t0=await t.get('topics',f.topicId);await t.put('topics',{...t0,organizationRevision:t0.organizationRevision+1});});assert.equal((await topic(f)).candidate.stale,true);await assert.rejects(()=>editAIPresentation(f.s,command),error=>error.code==='STALE_BASE');assert.equal((await topic(f)).presentation,null);
});

test('D3 late provider output after scope change never stages a candidate or Current',async()=>{
 let release,entered;const started=new Promise(r=>entered=r),held=new Promise(r=>release=r),f=await fixture({hold:async()=>{entered();await held;}}),pending=reviewAI(f.ai,action());await started;
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',f.topicId);await t.put('topics',{...row,organizationRevision:row.organizationRevision+1});});release();assert.equal((await pending).error,'STALE_BASE');assert.equal((await topic(f)).presentation,null);assert.equal((await topic(f)).candidate,null);assert.equal(await meta(f.s,'aiOrganizerCheckpoint'),undefined);assert.equal(f.calls.length,1);
});

test('D3 current-less Backup round-trip preserves candidate and source fences without manufacturing Current',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const before=await topic(f),items=await backup(f.s),target=await completeFixture({texts:[]});await restore(target.s,items);const after=(await aiPresentationStatus(target.s,{topicId:f.topicId})).topics[0];
 assert.equal(after.presentation,null);assert.deepEqual(after.candidate,before.candidate);const fences=await rows(target.s,'libraryMigrationItems');assert.ok(fences.some(x=>x.ownerKind==='ai_presentation_candidate'&&x.ownerId===f.topicId&&x.sourceRecordIds.length===2));assert.equal(fences.some(x=>x.ownerKind==='ai_presentation'&&x.ownerId===f.topicId),false);assert.equal(target.requests.length,0);
});

test('D3 new unadopted envelope obeys pure Source purge while human adoption retains the B-02 refusal',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const source=(await rows(f.s,'records'))[0];await f.s.permanentDelete(source.id);await f.s.drainPurgeCleanup();assert.equal((await topic(f)).candidate,null);assert.equal((await topic(f)).presentation,null);
 const accepted=await fixture();await reviewAI(accepted.ai,action());await adoptFirstAI(accepted.s,accepted.topicId);const id=(await rows(accepted.s,'records'))[0].id;await assert.rejects(()=>accepted.s.permanentDelete(id),error=>error.code==='SOURCE_PURGE_OWNER_GATE');
});

test('D3 lost adoption acknowledgement reads the exact receipt then same-ID retry advances one revision',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const row=await topic(f),command=edit(f,row,choices(row,'adopt')),epoch=await f.s.recoveryDraftEpoch(),write=f.s.foundationWrite.bind(f.s);let lose=true;
 f.s.foundationWrite=async fn=>{const result=await write(fn);if(lose&&result?.hasCurrent===true){lose=false;throw Object.assign(Error('Synthetic lost acknowledgement'),{code:'MESSAGE_RESPONSE_TIMEOUT'});}return result;};
 await assert.rejects(()=>editAIPresentation(f.s,command),error=>error.code==='MESSAGE_RESPONSE_TIMEOUT');const outcome=await aiPresentationOperationOutcome(f.s,{edit:command,epoch});assert.equal(outcome.state,'committed');assert.equal(outcome.result.revision,1);assert.deepEqual(await editAIPresentation(f.s,command),outcome.result);assert.equal((await rows(f.s,'revisions')).filter(x=>x.kind==='ai_presentation').length,1);assert.equal((await aiPresentationOperationOutcome(f.s,{edit:{...command,operationId:op()},epoch})).state,'unknown');assert.equal((await aiPresentationOperationOutcome(f.s,{edit:command,epoch:'different-epoch'})).state,'unknown');assert.equal(f.calls.length,1);
});

test('D3 known-envelope decoder rejects body-bearing, wrong-ID, unknown-version and malformed Backup metadata',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const row=await meta(f.s,'aiPresentation:'+f.topicId),service=new BackupService(f.s);
 for(const patch of [{id:'aiPresentation:another-topic'},{topicId:'other'},{envelopeVersion:99},{currentView:'Hidden body'},{unknownBody:'Never silently lose human work'},{basedOnCheckpoint:{entryVersions:{},body:'Hidden checkpoint body'}},{recoveryGeneration:42},{candidate:{...row.candidate,proposal:{...row.candidate.proposal,topicId:'other'}}}]){
  const malformed={...row,...patch};assert.equal(isBaseNoneEnvelope(malformed),false);await assert.rejects(()=>f.s.repository.transaction(false,t=>service.project(t,'organizationState',malformed)),error=>error.code==='BACKUP_INVALID');
 }
 const items=await backup(f.s),state={items:items.filter(item=>item.type==='item')},portable=state.items.find(item=>item.section==='organizationState'&&item.value.id==='aiPresentation:'+f.topicId).value.data;portable.unknownBody='Malformed import must refuse';await assert.rejects(()=>service.validateReferences(state),error=>error.code==='BACKUP_INVALID');
});

test('D3 retired Current editor cannot claim a no-Current envelope or its newly adopted generation',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());await adoptFirstAI(f.s,f.topicId);const old=(await topic(f)).presentation,draft={kind:'ai_presentation',ownerId:f.topicId,operation:{type:'AI_RECOVERY_SNAPSHOT',topicId:f.topicId,baseRevision:old.revision,generation:old.recoveryGeneration,values:{currentView:'Old tab edit'}}};
 await f.s.recoveryDraftSourceIds(draft);
 const entries=(await rows(f.s,'thoughts'));for(const row of entries){const path=(await f.s.entryPaths(row.id))[0];await f.s.placeEntry({entryId:row.id,topicId:f.topicId,sectionId:path.placement.sectionId,expectedEntryRevision:row.revision,expectedTopicRevision:(await f.s.topic(f.topicId)).organizationRevision,expectedPlacementRevision:path.placement.revision,remove:true,operationId:op()});}
 await f.s.continueThinking({topicId:f.topicId,operationId:op(),body:'New independent replacement material.'});const current=await meta(f.s,'aiPresentation:'+f.topicId);await f.s.foundationWrite(t=>t.put('meta',{...current,protections:{},userEditedAt:undefined}));
 assert.equal((await reviewAI(f.ai,{...action(),topicId:f.topicId})).candidateCreated,true);const staged=await meta(f.s,'aiPresentation:'+f.topicId);assert.equal(isBaseNoneEnvelope(staged),true);assert.notEqual(staged.recoveryGeneration,old.recoveryGeneration);await assert.rejects(()=>f.s.recoveryDraftSourceIds(draft),error=>error.code==='INVALID_REQUEST');
 const envelopeDraft={...draft,operation:{...draft.operation,generation:staged.recoveryGeneration}};await assert.rejects(()=>f.s.recoveryDraftSourceIds(envelopeDraft),error=>error.code==='INVALID_REQUEST');await adoptFirstAI(f.s,f.topicId);await assert.rejects(()=>f.s.recoveryDraftSourceIds(draft),error=>error.code==='INVALID_REQUEST');
});

test('D3 explicit local/external policy change stales existing adoption choices without a provider rerun',async()=>{
 const f=await fixture();await reviewAI(f.ai,action());const row=await topic(f),command=edit(f,row,choices(row,'adopt'));
 await f.s.foundationWrite(t=>t.put('meta',{id:'memory:config',externalAccess:false,localOnly:true}));assert.equal((await topic(f)).candidate.stale,true);await assert.rejects(()=>editAIPresentation(f.s,command),error=>error.code==='STALE_BASE');assert.equal((await topic(f)).presentation,null);assert.equal(f.calls.length,1);
});

test('D3 root optional status carries only the job and never scans Topic bodies',async()=>{
 const f=await fixture();f.s.readableEntry=()=>{throw Error('Root status must not scan any Thought body');};const status=await aiPresentationStatus(f.s,{summaryOnly:true});assert.deepEqual(status.topics,[]);assert.equal(status.nextTopic,null);assert.equal(status.approximateBytes,0);assert.equal(f.calls.length,0);
});


test('D3 generation, adoption and update only write derivatives, preserving Archive and human Thought bodies',async()=>{
 const f=await fixture({reply:r=>({topicId:r.topicCandidates[0].id,blockSummary:'Derived overview '+r.inputs.map(x=>x.text).join(' '),evidenceEntryIds:r.inputs.map(x=>x.ref)})});
 const sourceEntry=(await rows(f.s,'thoughts'))[0],dep=(await rows(f.s,'dependencies')).find(x=>x.targetId===sourceEntry.id);
 await inputEdit(f.s,dep.inputId,{libraryText:'Explicit user-edited Working Input. Do not rewrite.',note:'Human Archive note'});
 const human=await f.s.continueThinking({topicId:f.topicId,body:'Independent human Thought with unresolved doubt.',operationId:op()});
 await f.s.drainInvalidations();
 const originalStores=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies'];
 const originals=()=>Promise.all(originalStores.map(name=>rows(f.s,name)));
 const originalHistory=async()=>(await rows(f.s,'revisions')).filter(row=>row.kind!=='ai_presentation');
 let before=await originals(),history=await originalHistory();
 const unchanged=async()=>{assert.deepEqual(await originals(),before,'AI cannot write Archive or human Thought content/organization');assert.deepEqual(await originalHistory(),history,'AI derivative history cannot rewrite human history');};
 assert.equal((await reviewAI(f.ai,action())).candidateCreated,true);await unchanged();
 let candidate=await topic(f);assert.equal(candidate.presentation,null);
 await editAIPresentation(f.s,edit(f,candidate,choices(candidate,'adopt')));await unchanged();
 assert.equal((await topic(f)).presentation.revision,1);
 // Human edits remain owned by their existing direct-edit path.
 await inputEdit(f.s,dep.inputId,{libraryText:'Later explicit human correction. Still uncertain.'});await f.s.drainInvalidations();
 assert.notDeepEqual(await originals(),before);before=await originals();history=await originalHistory();
 assert.equal((await reviewAI(f.ai,action())).candidateCreated,true);await unchanged();
 candidate=await topic(f);assert.equal(candidate.presentation.revision,1);
 await editAIPresentation(f.s,edit(f,candidate,choices(candidate,'adopt')));await unchanged();
 assert.equal((await topic(f)).presentation.revision,2);assert.equal(f.calls.length,2);
 assert.ok((await rows(f.s,'thoughts')).some(row=>row.id===human.id&&row.thoughtText==='Independent human Thought with unresolved doubt.'));
 assert.ok((await rows(f.s,'revisions')).filter(row=>row.kind==='ai_presentation').length===2);
});
