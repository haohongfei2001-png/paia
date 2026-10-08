import {canonical as manifestCanonical,digest as manifestDigestOf} from '../ai-usage/contracts.js';
import {isIncrementalV2,planIncrementalV2,editIncrementalField} from './ai-incremental-v2.js';
import {readAIStyle} from '../ai-organize-style-preference.js';
import {qualifyOrganizeCache,organizeCacheEvidenceVersion,validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {entryTime} from './topic-chronology.js';
import {expressionTime} from './expression-time.js';
import {userAIDraft} from './ai-draft.js';
import {commitBoundedProgress} from './bounded-workflow.js';
import {sourceFaithfulSummary} from './source-summary.js';
import {bytes,reject,SAFE_ERRORS} from './contracts.js';
import {prefix,idOK} from '../thought-model.js';
import {validTopicGeneration} from '../topic-compatibility.js';
import {inputProjection} from '../thought-evidence.js';
import {planDelta} from '../dual-view.js';
import {migrateAIPresentationProductization} from './ai-presentation-migration.js';
import {aiCandidateKey,createAIPresentationCandidate,publicAIPresentationCandidate,applyAIPresentationCandidate,isBaseNoneEnvelope} from './ai-candidate.js';

import {AI_FIELDS,AI_LIST_FIELDS,AI_SCHEMA_VERSION,isStoredAIPresentation,presentationContent,validateAIPresentation} from './ai-contract.js';
import {validateDeepSeekRequest,DEEPSEEK_MODEL} from './deepseek.js';
import {hashText} from '../dedupe.js';
import {journal,receipt,saveReceipt} from '../thought-journal.js';
export {validateAIPresentation};
// AI generation and adoption target only this derivative metadata family.
// Adoption never grants write-back authority over Source, Working Input or
// human Thought bodies/organization; their direct human editors stay separate.
const CHECKPOINT='aiOrganizerCheckpoint',CURRENT='aiPresentationRequestCurrent',ROW='aiPresentation:',REQUEST='aiPresentationRequest:',ACTIVE=new Set(['prepared','sent','response_received','validated']);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=e=>SAFE_ERRORS.has(e?.code)?e.code:'INTERNAL_RUNTIME_ERROR';
// Trusted projection only. Neither provider nor UI receives repository handles,
// Source snapshots, Input identifiers, hidden Inputs, titles/URLs or raw history.
async function topicSnapshot(s,t,topic,{limit=null,summaryOnly=false,entryIds=null}={}){
 if(!validTopicGeneration(topic.activeLayoutGeneration))reject('STALE_BASE');
 const scanned=await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),limit===null?undefined:limit+1),placements=limit===null?scanned:scanned.slice(0,limit);
 const entries=[],versions={},scopeVersions={},incrementalVersions={},inputVersions={},unavailable=[],excluded=[],seen=new Set(),filter=await t.get('meta','smart-filter');
 for(const placement of placements){if(seen.has(placement.entryId)||entryIds&&!entryIds.has(placement.entryId))continue;seen.add(placement.entryId);let row;try{row=await s.readableEntry(t,placement.entryId);}catch{unavailable.push(placement.entryId);continue;}if(!row||row.lifecycle!=='active'){unavailable.push(placement.entryId);continue;}
  const deps=await t.all('dependencies','byTarget',prefix(['entry',row.id])),provenance=await t.all('provenance','byOwner',prefix(['entry',row.id]));if(!provenance.length&&row.provenanceType!=='user_created'){unavailable.push(row.id);continue;}const refs=[...new Map([...deps,...provenance].map(d=>[d.inputId,d])).values()];let allowed=true;const tokens=[],inputs={};
  for(const dep of refs){const input=await inputProjection(s,t,dep.inputId),state=await t.get('inputStates',dep.inputId);if(!input||await s.isFiltered(t,input.block,filter)){allowed=false;break;}tokens.push([dep.inputId,state.contentRevision,state.lastRemovalSequence||0]);inputs[dep.inputId]={contentRevision:state.contentRevision,removalState:state.removalState,sourcePurged:!!state.sourcePurged,eligible:true};}
  if(!allowed){excluded.push(row.id);continue;}Object.assign(inputVersions,inputs);versions[row.id]=JSON.stringify([row.revision,row.dependencyRevision||0,tokens]);
  const time=await expressionTime(s,t,row);scopeVersions[row.id]=JSON.stringify([versions[row.id],time,placement.revision,placement.membershipAuthorship||null]);
  incrementalVersions[row.id]=JSON.stringify([scopeVersions[row.id],placement.sectionId,placement.order,placement.rank,provenance,deps]);
  entries.push(summaryOnly?{id:row.id}:{...await entryTime(t,row.id),expressionTime:time,id:row.id,body:row.thoughtText,type:row.type,userEdited:row.userEdited,protections:row.protections,createdAt:row.createdAt,updatedAt:row.updatedAt});
 }
 return {entries,versions,scopeVersions,incrementalVersions,inputVersions,unavailable,excluded,intendedCount:seen.size,truncated:limit!==null&&scanned.length>limit,scanned:placements.length};
}
const sourceBinding=(topic,epoch,policy)=>({organizationRevision:topic.organizationRevision,generation:topic.generation??topic.activeLayoutGeneration,epoch:String(epoch??''),coverage:JSON.stringify([topic.intendedCount,topic.excluded||[],topic.unavailable||[]]),policy});
async function sourcePolicy(t){const filter=await t.get('meta','smart-filter'),config=await t.get('meta','memory:config');return JSON.stringify({filterMode:filter?.mode??'off',externalAccess:config?.externalAccess===true,localOnly:config?.localOnly===true});}
async function candidateBinding(s,t,topic,current,epoch,v2=false){
 const policy=await sourcePolicy(t);if(!v2)return sourceBinding({...topic,...current},epoch,policy);
 const restore=(await t.get('meta','recovery-restore-epoch'))?.value??'initial',style=readAIStyle((await s.control(t)).preferences,restore);
 return sourceBinding({...topic,...current},epoch,JSON.stringify([policy,restore,style]));
}
async function cacheSnapshot(s,t,topic,current){
 const gate=await t.get('meta','gate'),restore=await t.get('meta','recovery-restore-epoch'),recovering=await t.get('meta','backup-recovery-settings');
 const sections=await t.all('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]));
 const evidenceVersion=organizeCacheEvidenceVersion({topicId:topic.id,name:topic.name,organizationRevision:topic.organizationRevision,generation:topic.activeLayoutGeneration,gateEpoch:gate?.epoch??null,restoreEpoch:restore?.value??'initial',policy:await sourcePolicy(t),scopeVersions:current.scopeVersions,inputVersions:current.inputVersions,sections:sections.map(row=>({id:row.id,revision:row.revision,name:row.name??row.title??'',rank:row.rank})),coverage:{intendedCount:current.intendedCount,excluded:current.excluded,unavailable:current.unavailable}});
 const selected=readAIStyle((await s.control(t)).preferences,restore?.value??'initial');
 return {topicId:topic.id,evidenceVersion,style:selected,complete:!recovering&&!current.truncated&&!current.unavailable.length&&!current.excluded.length};
}
// Internal transaction owner for future qualified writers and synthetic tests.
// No RPC exposes this metadata; the caller must already hold the repository txn.
export async function readOrganizeCacheSnapshotInTransaction(s,t,topicId){
 const topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic,{summaryOnly:true});
 return cacheSnapshot(s,t,topic,current);
}
async function topicState(s,t,topic,cp,epoch,{summaryOnly=false,expectedProfile=null}={}){
 const current=await topicSnapshot(s,t,topic,{summaryOnly}),rawPrior=cp.topicVersions?.[topic.id]||{},stored=await t.get('meta',ROW+topic.id),allowed=new Set(current.entries.map(x=>x.id));
 const readable=stored&&stored.topicId===topic.id&&isStoredAIPresentation(stored,allowed),none=isBaseNoneEnvelope(stored),binding=await candidateBinding(s,t,topic,current,epoch,stored?.candidate?.schemaVersion===3),candidate=readable||none?publicAIPresentationCandidate(stored,allowed,stored.candidate?.schemaVersion===3?current.incrementalVersions:stored.candidate?.schemaVersion===1?current.versions:current.scopeVersions,binding):null;
 const resetCandidate=!!stored?.candidate&&(!candidate||candidate.stale),baseline=stored?.basedOnCheckpoint?.entryVersions,prior=resetCandidate?(baseline&&typeof baseline==='object'&&!Array.isArray(baseline)?baseline:{}):readable||none||!current.entries.length?rawPrior:{};
 const changed=current.entries.filter(e=>prior[e.id]!==current.versions[e.id]),removed=Object.keys(prior).filter(id=>!allowed.has(id));
 const cacheQualification=qualifyOrganizeCache({stored,readable,ownerPending:changed.length>0||removed.length>0,snapshot:readable&&stored?.cacheBinding?await cacheSnapshot(s,t,topic,current):null,expectedProfile});
 return {...current,cacheQualification,id:topic.id,name:topic.name,organizationRevision:topic.organizationRevision,generation:topic.activeLayoutGeneration,binding,prior,storedRevision:stored?.revision||0,stored,emptyCurrent:none,userDraft:!readable&&!none?userAIDraft(stored):null,presentation:readable?stored:null,candidate,changed,removed,pending:changed.length>0||removed.length>0||!!stored&&(!readable&&!none||stored.needsUpdate===true),stale:!!stored&&(!readable&&!none||stored.needsUpdate===true||changed.length>0||removed.length>0)};
}
// UX-R2 reuses the canonical pending-delta tokens without loading every topic's
// bodies or invoking the organizer/migration path just to display Revisit.
export async function revisitTopicDeltas(s,t){
 const cp=await t.get('meta',CHECKPOINT),rows=await t.all('topics','byIndex',prefix([0]),25),topics=[];let budget=240,truncated=rows.length>24;
 for(const topic of rows.slice(0,24)){
  if(!budget){truncated=true;break;}if(topic.redirectTo||!validTopicGeneration(topic.activeLayoutGeneration))continue;
  const current=await topicSnapshot(s,t,topic,{limit:Math.min(60,budget),summaryOnly:true});budget-=current.scanned;truncated ||= current.truncated;
  const prior=cp?.topicVersions?.[topic.id]||{},changed=current.entries.filter(e=>prior[e.id]!==current.versions[e.id]).length,removed=current.truncated?0:Object.keys(prior).filter(id=>!Object.hasOwn(current.versions,id)).length;
  if(changed+removed)topics.push({topicId:topic.id,name:topic.name,pendingEntryCount:changed+removed,truncated:current.truncated});
 }
 return {topics,truncated};
}
async function snapshot(s,{topicId=null,summaryOnly=false}={},expectedProfile=null){await migrateAIPresentations(s);return s.run(()=>s.repository.transaction(false,async t=>{
 const gate=await t.get('meta','gate'),cp=await t.get('meta',CHECKPOINT)||{id:CHECKPOINT,view:'ai',version:3,inputVersions:{},topicVersions:{},lastSequence:0},topics=[];
 const rows=topicId?[await s.canonicalTopic(t,topicId)]:await t.all('topics');
 for(const raw of rows){if(raw.lifecycle!=='active'||raw.redirectTo)continue;const topic=await s.canonicalTopic(t,raw.id);if(!validTopicGeneration(topic.activeLayoutGeneration))continue;topics.push(await topicState(s,t,topic,cp,gate?.epoch,{summaryOnly,expectedProfile}));}
 return {topics,checkpoint:cp,epoch:gate?.epoch,enabled:gate?.enabled};
 }));}
function versionInputs(value){try{return (JSON.parse(value)[2]||[]).map(x=>x[0]);}catch{return [];}}
// Only touched Inputs and their actual cross-Topic memberships are read. A
// partial Topic batch cannot acknowledge an Input still pending in another Topic.
async function acknowledgedInputs(s,t,checkpoint,topic,completedVersions){
 const versions={...checkpoint.inputVersions},ids=new Set([...Object.keys(topic.inputVersions),...Object.values(topic.prior).flatMap(versionInputs)]),filter=await t.get('meta','smart-filter');
 for(const id of ids){let pending=false;const related=new Map();
  for(const dep of await t.all('dependencies','byInput',id)){const entryId=dep.targetId||dep.thoughtId;if(!entryId)continue;for(const p of await t.all('placements','byEntry',prefix([entryId]))){const other=await t.get('topics',p.topicId);if(!other||other.lifecycle!=='active'||other.redirectTo||p.layoutGeneration!==other.activeLayoutGeneration)continue;if(!related.has(other.id))related.set(other.id,{topic:other,ids:new Set()});related.get(other.id).ids.add(entryId);}}
  for(const {topic:other,ids:entryIds}of related.values()){const current=other.id===topic.id?topic:await topicSnapshot(s,t,other,{entryIds,summaryOnly:true}),ack=other.id===topic.id?completedVersions:checkpoint.topicVersions?.[other.id]||{};if([...entryIds].some(entryId=>current.versions[entryId]!==ack[entryId])){pending=true;break;}}
  if(pending)continue;const row=await t.get('inputStates',id),projection=await inputProjection(s,t,id);if(row)versions[id]={contentRevision:row.contentRevision,removalState:row.removalState,sourcePurged:!!row.sourcePurged,eligible:!!projection&&!await s.isFiltered(t,projection.block,filter)};else delete versions[id];
 }return versions;
}
const publicTopic=t=>({cacheQualification:t.cacheQualification,topicId:t.id,name:t.name,sourceHint:sourceFaithfulSummary(t.entries),userDraft:t.userDraft,presentation:t.presentation?{...presentationContent(t.presentation),revision:t.presentation.revision,recoveryGeneration:t.presentation.recoveryGeneration||'legacy',schemaVersion:t.presentation.schemaVersion,protections:t.presentation.protections||{},updatedAt:t.presentation.updatedAt,stale:t.stale}:null,candidate:t.candidate,stale:t.stale,pending:t.pending,pendingEntryCount:t.changed.length+t.removed.length});
async function readAIPresentationStatus(s,{topicId=null,summaryOnly=false}={},expectedProfile=null){
 if(topicId!==null&&!idOK(topicId)||typeof summaryOnly!=='boolean')reject('INVALID_OUTPUT');
 const all=summaryOnly?{topics:[]}:await snapshot(s,{topicId},expectedProfile),delta=topicId||summaryOnly?null:await planDelta(s,'ai');
 const runtime=await s.run(()=>s.repository.transaction(false,async t=>{const pointer=await t.get('meta',CURRENT),row=pointer?await t.get('meta',REQUEST+pointer.requestId):null;return row&&(!topicId||row.topicId===topicId)?row:null;},['meta']));
 return {topics:summaryOnly?[]:all.topics.map(publicTopic),pendingTopics:all.topics.filter(t=>t.pending).length,nextTopic:all.topics.filter(t=>t.pending).map(t=>({topicId:t.id,name:t.name,inputCount:Math.min(t.changed.length||t.entries.length,8)}))[0]||null,counts:delta?.counts||{addedInput:0,changedInput:0,removedInput:0,affectedTopic:all.topics.filter(t=>t.pending).length,affectedEntry:all.topics.reduce((n,t)=>n+t.changed.length+t.removed.length,0)},approximateBytes:summaryOnly?0:all.topics.filter(t=>t.pending).reduce((n,t)=>n+bytes(t.changed.slice(0,8).map(e=>e.body)),0),runtime:runtime?{topicId:runtime.topicId,phase:runtime.phase,state:runtime.state,errorCode:runtime.errorCode||null,httpStatus:runtime.httpStatus??null,responseBytes:runtime.responseBytes||0,requestCount:runtime.requestCount||0}:null};
}
export async function aiPresentationStatus(s,options={},expectedProfile=null){
 // Third argument is internal only; worker request options cannot supply it.
 const profile=expectedProfile===null?null:structuredClone(expectedProfile);
 const result=await readAIPresentationStatus(s,options,profile),compatibility=await s.libraryCompatibilityStatus?.().catch(()=>null);
 return compatibility?.unresolvedLayouts>0?{...result,degraded:{reason:'topic_compatibility_unresolved',unresolvedLayouts:compatibility.unresolvedLayouts}}:result;
}

// The UI receives counts and an opaque binding, never a second request planner.
// Dispatch reconstructs this SAME request and rejects every changed input, cut,
// current/candidate, policy or layout instead of silently widening confirmation.
function planRequest(s,topic,requestId){
 const pool=topic.changed.length?topic.changed:topic.entries,selected=[];
 for(const entry of pool){if(selected.length>=Math.min(8,s.organizerBudget.limits.maxInputs))break;if(bytes([...selected,entry].map(e=>({ref:e.id,role:'primary',text:e.body})))>s.organizerBudget.limits.maxContentBytes)break;selected.push(entry);}
 const existing=topic.candidate&&!topic.candidate.stale?structuredClone(topic.candidate.proposal):topic.presentation?presentationContent(topic.presentation):null,context=existing?[{ref:'existing-presentation',role:'context_only',text:JSON.stringify(existing)}]:[];
 context.push({ref:'topic-delta',role:'context_only',text:JSON.stringify({added:selected.filter(e=>!Object.hasOwn(topic.prior,e.id)).map(e=>e.id),changed:selected.filter(e=>Object.hasOwn(topic.prior,e.id)).map(e=>e.id),chronology:selected.map(e=>({entryId:e.id,expressedAt:e.expressionTime.at,basis:e.expressionTime.basis})),removedCount:topic.removed.length,remainingEntryCount:Math.max(0,pool.length-selected.length)})});
 return {selected,request:{requestId,taskProfile:'ai_synthesis',inputs:selected.map(e=>({ref:e.id,role:'primary',text:e.body})),context,topicCandidates:[{id:topic.id,name:topic.name,sections:[]}],budget:{maxOutputBytes:s.organizerBudget.limits.maxOutputBytes}}};
}
async function readScopeInTransaction(s,t,topicId){
 const gate=await t.get('meta','gate'),checkpoint=await t.get('meta',CHECKPOINT)||{id:CHECKPOINT,view:'ai',version:3,inputVersions:{},topicVersions:{},lastSequence:0},topic=await topicState(s,t,await s.canonicalTopic(t,topicId),checkpoint,gate?.epoch),planned=planRequest(s,topic,'00000000-0000-0000-0000-000000000000'),controls=await t.get('meta','organizer-controls'),policy=await t.get('meta','memory:config');
 const proof=JSON.stringify([topic.id,topic.name,topic.binding,topic.versions,topic.scopeVersions,topic.prior,topic.stored,gate,controls?.dailyRequests??null,{localOnly:policy?.localOnly??null,externalAccess:policy?.externalAccess??null},s.organizerBudget.limits,planned.request]);
 const ledger=await t.get('meta','organizer-budget'),dailyLimit=controls?.dailyRequests??s.organizerBudget.limits.dailyRequests,age=Date.parse(s.clock())-ledger?.dailyAt,used=ledger&&Number.isFinite(age)&&age>=0&&age<86400000?ledger.daily?.requests:0;
 return {topic,checkpoint,gate,proof,budget:{usedRequests:used??0,dailyLimit,remainingRequests:Number.isSafeInteger(used)?Math.max(0,dailyLimit-used):0},...planned};
}
async function readScope(s,topicId){if(!idOK(topicId))reject('INVALID_OUTPUT');await migrateAIPresentations(s);return s.run(()=>s.repository.transaction(false,t=>readScopeInTransaction(s,t,topicId)));}
export async function aiPresentationScope(s,{topicId}={}){
 const plan=await readScope(s,topicId),{topic,request,selected}=plan,pool=topic.changed.length?topic.changed:topic.entries,times=topic.entries.map(e=>e.expressionTime.at).filter(Boolean).sort();
 let blockedReason=!plan.gate?.enabled?'CANCELLED':topic.userDraft?'STALE_BASE':topic.unavailable.length?'UNAVAILABLE':topic.entries.length>10000?'BUDGET_EXCEEDED':!topic.pending?'NO_DELTA':null;
 if(!blockedReason&&topic.entries.length&&plan.budget.remainingRequests<1)blockedReason='BUDGET_EXCEEDED';
 if(!blockedReason&&topic.entries.length){try{validateDeepSeekRequest(request,s.organizerBudget.limits);if(!selected.length)blockedReason='BUDGET_EXCEEDED';}catch(e){blockedReason=safe(e);}}
 return {version:1,topicId:topic.id,topicName:topic.name,scopeBinding:await hashText(plan.proof),provider:'DeepSeek',model:DEEPSEEK_MODEL,budget:plan.budget,maxRequests:topic.entries.length?1:0,intendedCount:topic.intendedCount,eligibleCount:topic.entries.length,excludedCount:topic.excluded.length,unavailableCount:topic.unavailable.length,newCount:pool.filter(e=>!Object.hasOwn(topic.prior,e.id)).length,changedCount:pool.filter(e=>Object.hasOwn(topic.prior,e.id)).length,removedCount:topic.removed.length,batchCount:selected.length,remainingCount:Math.max(0,pool.length-selected.length),contentBytes:bytes(request.inputs),requestBytes:bytes(request),complete:!topic.unavailable.length,timeRange:{from:times[0]||null,to:times.at(-1)||null,unknownCount:topic.entries.length-times.length},blockedReason};
}
const migrations=new WeakMap(),completedMigrations=new WeakMap();
export async function migrateAIPresentations(s){
 if(completedMigrations.has(s))return completedMigrations.get(s);
 if(!migrations.has(s)){
  const task=migrateAIPresentationProductization(s).then(marker=>{if(marker.complete)completedMigrations.set(s,marker);return marker;}).finally(()=>{if(migrations.get(s)===task)migrations.delete(s);});
  migrations.set(s,task);
 }
 return migrations.get(s);
}
async function sourceIdsForEntries(t,entryIds){const sourceRecordIds=[];for(const id of entryIds||[]){const e=await t.get('thoughts',id);if(e)sourceRecordIds.push(...(e.sourceRecordIds||[]));}return [...new Set(sourceRecordIds)];}
async function candidateFence(t,topicId,candidate){const id='ai-presentation-candidate-fence:'+topicId;if(!candidate){await t.delete('libraryMigrationItems',id);return;}await t.put('libraryMigrationItems',{id,entityKind:'organizer_metadata',ownerKind:'ai_presentation_candidate',ownerId:topicId,statusKey:1,sourceRecordIds:await sourceIdsForEntries(t,candidate.proposal?.evidenceEntryIds)});}
async function aiJournal(s,t,before,after,actor,operationId){
 const evidenceEntryIds=[...new Set([...(before?.evidenceEntryIds||[]),...(after?.evidenceEntryIds||[])])],sourceRecordIds=await sourceIdsForEntries(t,evidenceEntryIds);
 await t.put('libraryMigrationItems',{id:'ai-presentation-fence:'+after.topicId,entityKind:'organizer_metadata',ownerKind:'ai_presentation',ownerId:after.topicId,statusKey:1,sourceRecordIds});
 return journal(s,t,{kind:'ai_presentation',entityId:after.topicId,documentId:after.topicId,before:before?(isIncrementalV2(before)?{presentationVersion:2,projection:before.projection,manifest:before.manifest}:presentationContent(before)):null,after:isIncrementalV2(after)?{presentationVersion:2,projection:after.projection,manifest:after.manifest}:presentationContent(after),fieldMask:AI_FIELDS,actor,reason:actor==='ai'?'ai_update':'edit',important:true,operationId,baseRevision:before?.revision||0,afterRevision:after.revision,sourceRecordIds,evidenceEntryIds});
}
export async function aiPresentationRevisions(s,{topicId}={}){
 if(!idOK(topicId))reject('INVALID_OUTPUT');await migrateAIPresentations(s);
 return s.run(()=>s.repository.transaction(false,async t=>{const topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic),allowed=new Set(current.entries.map(e=>e.id)),items=[];
 for(const row of await t.all('revisions','byEntitySequence',prefix(['ai_presentation:'+topicId]))){if(!await s.sourcePresent(t,row.sourceRecordIds)||row.evidenceEntryIds.some(id=>!allowed.has(id)))continue;items.push({id:row.id,actor:row.actor,at:row.at,reason:row.reason,before:isIncrementalV2(row.before)?structuredClone(row.before.projection):row.before,after:isIncrementalV2(row.after)?structuredClone(row.after.projection):row.after,revision:row.afterRevision});}return {items:items.slice(-50)};
 }));
}
export async function editAIPresentation(s,edit={}){
 const {topicId,field,value,expectedRevision,operationId=null,candidateDecisions,expectedCandidateKey}=edit;
 if(candidateDecisions!==undefined){
  if(!idOK(topicId)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!candidateDecisions||typeof candidateDecisions!=='object'||Array.isArray(candidateDecisions)||!idOK(operationId)||operationId.length<8)reject('INVALID_OUTPUT');
  await migrateAIPresentations(s);const request={id:topicId,expectedRevision,expectedCandidateKey,candidateDecisions:structuredClone(candidateDecisions),operationId,kind:'ai-candidate-save'},digest=await hashText(JSON.stringify(request));
  // Verify cryptographic proposal binding outside IDB; the write transaction
  // compares these exact bytes again after its existing idempotent receipt check.
  const captured=await s.run(()=>s.repository.transaction(false,t=>t.get('meta',ROW+topicId))),v2=captured?.candidate?.schemaVersion===3,proposalBytes=v2?manifestCanonical(captured.candidate.proposal):null,proposalVerified=v2?await manifestDigestOf(captured.candidate.proposal)===captured.candidate.manifestDigest:false;
  const result=await s.foundationWrite(async t=>{const prior=await receipt(t,request,digest);if(prior)return prior;const row=await t.get('meta',ROW+topicId),topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic),allowed=new Set(current.entries.map(e=>e.id));if(row?.candidate?.schemaVersion===3&&(!v2||!proposalVerified||manifestCanonical(row.candidate.proposal)!==proposalBytes||row.candidate.manifestDigest!==captured.candidate.manifestDigest))reject('STALE_BASE');if(!row||!isStoredAIPresentation(row,allowed)&&!isBaseNoneEnvelope(row))reject('STALE_BASE');const gate=await t.get('meta','gate');const resolved=applyAIPresentationCandidate(row,{decisions:candidateDecisions,expectedRevision,expectedCandidateKey},allowed,row.candidate?.schemaVersion===3?current.incrementalVersions:row.candidate?.schemaVersion===1?current.versions:current.scopeVersions,s.clock(),await candidateBinding(s,t,topic,current,gate?.epoch,row.candidate?.schemaVersion===3)),checkpoint=await t.get('meta',CHECKPOINT);resolved.next.basedOnCheckpoint={entryVersions:structuredClone(checkpoint?.topicVersions?.[topicId]||row.basedOnCheckpoint?.entryVersions||{})};if(row.candidate.schemaVersion===3){if(!resolved.kept.length)await t.put('meta',{id:CHECKPOINT,version:3,...checkpoint,topicVersions:{...checkpoint?.topicVersions,[topicId]:current.versions},inputVersions:await acknowledgedInputs(s,t,checkpoint||{inputVersions:{},topicVersions:{}},{...topic,...current,prior:checkpoint?.topicVersions?.[topicId]||{}},current.versions)});}else await bindAdoptedLocalCache(s,t,{row,topic,current,resolved,checkpoint});await t.put('meta',resolved.next);if(resolved.changed)await aiJournal(s,t,isBaseNoneEnvelope(row)?null:row,resolved.next,'user',operationId);await candidateFence(t,topicId,null);const result={revision:resolved.revision,adopted:resolved.adopted,kept:resolved.kept,hasCurrent:resolved.hasCurrent};await saveReceipt(s,t,request,digest,result);return result;});
  for(const [token,proof]of localCacheProofs)if(proof.store===s&&proof.key===expectedCandidateKey)localCacheProofs.delete(token);return result;
 }
 if(!idOK(topicId)||!AI_FIELDS.includes(field)||operationId!==null&&(!idOK(operationId)||operationId.length<8))reject('INVALID_OUTPUT');await migrateAIPresentations(s);const request={id:topicId,field,value,expectedRevision,operationId,kind:'ai-field-edit'},digest=operationId?await hashText(JSON.stringify(request)):null;
 return s.foundationWrite(async t=>{if(operationId){const prior=await receipt(t,request,digest);if(prior)return prior;}const row=await t.get('meta',ROW+topicId),topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic),allowed=new Set(current.entries.map(e=>e.id));if(!row||row.revision!==expectedRevision||!isStoredAIPresentation(row,allowed))reject('STALE_BASE');
 const projected=presentationContent(row);
 if(AI_LIST_FIELDS.includes(field)){if(!Array.isArray(value)||value.length!==projected[field].length||value.some((x,i)=>typeof x?.text!=='string'||x.text.length>2000||!equal(x.evidenceEntryIds,projected[field][i].evidenceEntryIds)))reject('INVALID_OUTPUT');}else if(typeof value!=='string'||value.length>(field==='blockSummary'?300:4000))reject('INVALID_OUTPUT');
 const normalizedValue=AI_LIST_FIELDS.includes(field)?value.map(x=>({text:x.text,evidenceEntryIds:[...x.evidenceEntryIds]})):value;
 if(equal(projected[field],normalizedValue))return {revision:row.revision};const next={...row,...(isIncrementalV2(row)?editIncrementalField(row,field,normalizedValue):{[field]:normalizedValue}),revision:row.revision+1,protections:{...row.protections,[field]:true},userEditedAt:s.clock(),needsUpdate:row.candidate?true:row.needsUpdate};await t.put('meta',next);await aiJournal(s,t,row,next,'user',operationId||s.uuid());const result={revision:next.revision};if(operationId)await saveReceipt(s,t,request,digest,result);return result;
 });
}

// Readback exposes only the outcome of the exact immutable local adoption.
// Absence is UNKNOWN, never proof that a transport-interrupted write failed.
export async function aiPresentationOperationOutcome(s,{edit,epoch}={}){
 if(!edit||!idOK(edit.topicId)||!idOK(edit.operationId)||typeof epoch!=='string'||epoch.length>200)reject('INVALID_OUTPUT');
 const {topicId,expectedRevision,expectedCandidateKey,candidateDecisions,operationId}=edit,request={id:topicId,expectedRevision,expectedCandidateKey,candidateDecisions,operationId,kind:'ai-candidate-save'},digest=await hashText(JSON.stringify(request));
 return s.run(()=>s.repository.transaction(false,async t=>{
  if(((await t.get('meta','recovery-restore-epoch'))?.value||'initial')!==epoch||!(await t.get('topics',topicId)))return {state:'unknown'};
  const row=await t.get('operationReceipts',operationId);
  return row?.namespace==='thought-library'&&row.ownerId===topicId&&row.digest===digest?{state:'committed',result:row.result}:{state:'unknown'};
 }));
}

export class AIPresentationRunner {
 constructor(store,{provider,credentials}){this.s=store;this.provider=provider;this.credentials=credentials;this.running=null;}
 async scope(options){const scope=await aiPresentationScope(this.s,options),credential=await this.credentials.status?.();return {...scope,credentialReady:credential?.hasCredential===true,blockedReason:scope.blockedReason||(!credential?.hasCredential?'CREDENTIAL_FAILURE':null)};}
 wake({userActionId,topicId=null,scopeBinding=null,boundedActionId=null}={}){if(!idOK(userActionId)||!idOK(topicId)||typeof scopeBinding!=='string'||!/^[a-f0-9]{64}$/.test(scopeBinding))return Promise.resolve({error:'INVALID_OUTPUT'});if(this.running)return Promise.resolve({error:'REQUEST_ALREADY_IN_FLIGHT'});this.controller=new AbortController();this.topicId=topicId;this.running=this.run(userActionId,topicId,scopeBinding,boundedActionId).finally(()=>{this.running=null;this.controller=null;this.topicId=null;});return this.running;}
 async reconcileInterrupted(){if(this.running)return;return this.s.foundationWrite(async t=>{const p=await t.get('meta',CURRENT),row=p&&await t.get('meta',REQUEST+p.requestId);if(row&&ACTIVE.has(row.state))await t.put('meta',{...row,state:'outcome_unknown',errorCode:'OUTCOME_UNKNOWN'});});}
 async stop({topicId=null}={}){if(topicId!==null&&this.topicId!==topicId)return {error:'STALE_BASE'};this.controller?.abort();return this.reconcileInterrupted();}
 async run(userActionId,topicId,scopeBinding,boundedActionId){
 const s=this.s,deadlineAt=Date.now()+30000,signal=this.controller.signal;let requestId=null,usageId=null,credential,phase='preparing',calls=0,plan;
 const check=()=>{if(signal.aborted)reject('CANCELLED');if(Date.now()>=deadlineAt)reject('PROVIDER_TIMEOUT');};
 const assertScope=async t=>{const fresh=await readScopeInTransaction(s,t,topicId);if(fresh.proof!==plan.proof)reject('STALE_BASE');return fresh;};
 const trace=async patch=>s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId);if(!row||!ACTIVE.has(row.state))reject('OUTCOME_UNKNOWN');if(patch.phase==='fetch_started')await assertScope(t);phase=patch.phase||phase;await t.put('meta',{...row,...patch,phase,phaseTimestamps:{...row.phaseTimestamps,[phase]:s.clock()},state:phase==='fetch_started'?'sent':phase==='preparing'?'prepared':'response_received',requestCount:phase==='fetch_started'?1:calls});});
 try{
  plan=await readScope(s,topicId);if(await hashText(plan.proof)!==scopeBinding)reject('STALE_BASE');if(!plan.gate?.enabled)reject('CANCELLED');const {topic}=plan;
  if(topic.unavailable.length)reject('UNAVAILABLE');if(topic.entries.length>10000)reject('BUDGET_EXCEEDED');if(!topic.pending)return {completed:true,noDelta:true,requestCount:0};if(topic.userDraft)reject('STALE_BASE');
  if(!topic.entries.length){await s.foundationWrite(async t=>{await assertScope(t);const current=await t.get('meta',CHECKPOINT)||plan.checkpoint;await t.put('meta',{...current,inputVersions:await acknowledgedInputs(s,t,current,topic,{}),topicVersions:{...current.topicVersions,[topic.id]:{}},updatedAt:s.clock()});const old=await t.get('meta',ROW+topic.id);if(!old||!Object.values(old.protections||{}).some(Boolean))await t.delete('meta',ROW+topic.id);else if(old.candidate){const next={...old};delete next.candidate;next.needsUpdate=true;await t.put('meta',next);}await candidateFence(t,topic.id,null);});return {completed:true,requestCount:0};}
  requestId=s.uuid();const {request,selected}=planRequest(s,topic,requestId);if(!selected.length)reject('BUDGET_EXCEEDED');validateDeepSeekRequest(request,s.organizerBudget.limits);credential=await this.credentials.acquire();if(credential.status!=='ready')reject('CREDENTIAL_FAILURE');check();
  await s.foundationWrite(async t=>{await assertScope(t);if(await t.get('meta','aiPresentationAction:'+userActionId))reject('REQUEST_ALREADY_IN_FLIGHT');for(const key of [CURRENT,'originalProviderRequestCurrent']){const p=await t.get('meta',key),row=p&&await t.get('meta',(key===CURRENT?REQUEST:'originalProviderRequest:')+p.requestId);if(row&&ACTIVE.has(row.state))reject('REQUEST_ALREADY_IN_FLIGHT');}
   await t.put('meta',{id:'aiPresentationAction:'+userActionId,requestId});await t.put('meta',{id:CURRENT,requestId});await t.put('meta',{id:REQUEST+requestId,requestId,userActionId,topicId:topic.id,scopeBinding,batchId:requestId,inputCount:selected.length,approximateBytes:bytes(request),provider:'deepseek',model:DEEPSEEK_MODEL,state:'prepared',phase,startedAt:s.clock(),phaseTimestamps:{preparing:s.clock()},requestCount:0});
   usageId=await s.organizerLedger.reserve(t,{id:requestId,attempts:1,boundedActionId,audit:{taskType:'ai_synthesis',inputCount:selected.length,approximateSize:bytes(request),dataCategories:['topic_entries','derived_presentation']}},request);
  });
  const providerResult=await this.provider.execute(request,{credential:credential.handle,signal,deadlineAt,onTrace:trace,onDispatch:()=>{calls=1;}});check();const result=validateAIPresentation(providerResult,request);if(!result.evidenceEntryIds.length)reject('INVALID_SCHEMA');phase='committing';await trace({phase});
  const committed=await s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId);if(!row||!ACTIVE.has(row.state))reject('OUTCOME_UNKNOWN');check();const fresh=await assertScope(t),allowed=new Set(fresh.topic.entries.map(e=>e.id));if(result.evidenceEntryIds.some(id=>!allowed.has(id)))reject('INVALID_OUTPUT');const old=await t.get('meta',ROW+topic.id),cp=await t.get('meta',CHECKPOINT)||plan.checkpoint,versions={...topic.prior};for(const id of topic.removed)delete versions[id];for(const entry of selected)versions[entry.id]=topic.versions[entry.id];
   const candidate=createAIPresentationCandidate(topic.presentation,result,{createdAt:s.clock(),materialVersions:topic.scopeVersions,sourceBinding:topic.binding,candidateId:requestId});
   if(candidate){const base=topic.presentation?old:{id:ROW+topic.id,topicId:topic.id,envelopeVersion:1,currentState:'none',revision:0,recoveryGeneration:isBaseNoneEnvelope(old)?old.recoveryGeneration:requestId,...(isBaseNoneEnvelope(old)&&old.recoveryPurgeRevision!==undefined?{recoveryPurgeRevision:old.recoveryPurgeRevision}:{}),basedOnCheckpoint:old?.basedOnCheckpoint||{entryVersions:{}}};await t.put('meta',{...base,candidate,needsUpdate:false,stale:false});await candidateFence(t,topic.id,candidate);}
   else if(old?.candidate){const next={...old};delete next.candidate;next.needsUpdate=false;await t.put('meta',next);await candidateFence(t,topic.id,null);}
   await t.put('meta',{...cp,version:3,topicVersions:{...cp.topicVersions,[topic.id]:versions},inputVersions:await acknowledgedInputs(s,t,cp,topic,versions),updatedAt:s.clock()});await commitBoundedProgress(t,boundedActionId,{topics:1});if(usageId)await s.organizerLedger.settle(t,usageId);
   const candidateCreated=!!candidate,revision=topic.presentation?.revision||0;
   await t.put('operationReceipts',{id:'ai-presentation:'+requestId,namespace:'ai-presentation',ownerId:topic.id,operationSequence:0,createdAt:s.clock(),result:{committed:1,candidateCreated,revision}});
   await t.put('meta',{...row,state:'committed',phase:'completed',requestCount:calls,committedItemCount:1,candidateCreated,phaseTimestamps:{...row.phaseTimestamps,completed:s.clock()}});return {candidateCreated};
  });return {completed:true,requestCount:calls,topicId:topic.id,candidateCreated:committed.candidateCreated};
 }catch(error){const code=safe(error);try{if(requestId)await s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId);if(row&&ACTIVE.has(row.state))await t.put('meta',{...row,state:'failed',errorCode:code,phase,requestCount:calls});});}catch{}return {error:code,phase,requestCount:calls};}finally{if(credential?.handle)this.credentials.revoke(credential.handle);}}
}

// Bounded root search over saved fields, using the same eligibility snapshot as
// the AI reader. No provider request and no all-Topic body DTO reaches the UI.
export async function searchSavedAI(s,{query,cursor=null,limit=40}={}){
 if(typeof query!=='string'||query.length>300||!Number.isInteger(limit)||limit<1||limit>100)reject('INVALID_OUTPUT');
 await migrateAIPresentations(s);const needle=query.trim().normalize('NFKC').toLocaleLowerCase();
 return s.run(()=>s.repository.transaction(false,async t=>{
  const page=await t.page('topics',{after:cursor??undefined,limit}),items=[];
  for(const {value:raw}of page.rows){
   if(raw.lifecycle!=='active'||raw.redirectTo||!validTopicGeneration(raw.activeLayoutGeneration))continue;
   const stored=await t.get('meta',ROW+raw.id);if(!stored)continue;
   const topic=await s.canonicalTopic(t,raw.id),current=await topicSnapshot(s,t,topic,{summaryOnly:true});
   if(stored.topicId!==topic.id||!isStoredAIPresentation(stored,new Set(current.entries.map(e=>e.id))))continue;
   const field=AI_FIELDS.find(field=>{const value=presentationContent(stored)[field],text=Array.isArray(value)?value.map(x=>x.text).join(' '):value;return typeof text==='string'&&text.normalize('NFKC').toLocaleLowerCase().includes(needle);});
   if(field)items.push({kind:'ai',topicId:topic.id,topicName:topic.name,aiField:field,sectionTitle:'AI整理'});
  }
  return {items,nextCursor:page.next?{mode:'compact_root_search',query:needle,phase:'ai',key:page.next}:null,complete:!page.next};
 }));
}

// Internal local feature lifecycle. No worker route exposes these transaction APIs.
export async function readLocalOrganizeScopeInTransaction(s,t,topicId,expectedProfile=null,incrementalVersion=1){
 const gate=await t.get('meta','gate'),restore=await t.get('meta','recovery-restore-epoch'),cp=await t.get('meta',CHECKPOINT)||{id:CHECKPOINT,view:'ai',version:3,inputVersions:{},topicVersions:{},lastSequence:0};
 if(!gate?.enabled||await t.get('meta','backup-recovery-settings'))reject('UNAVAILABLE');
 const topic=await topicState(s,t,await s.canonicalTopic(t,topicId),cp,gate.epoch,{expectedProfile}),style=readAIStyle((await s.control(t)).preferences,restore?.value??'initial');
 if(!style.available||topic.userDraft||topic.candidate||topic.unavailable.length||topic.excluded.length)reject('STALE_BASE');
 const incremental=incrementalVersion===2?planIncrementalV2(topic,style,expectedProfile,JSON.stringify([gate.epoch,restore?.value??'initial',style,await sourcePolicy(t)])):null,selected=incremental?incremental.selected:topic.entries;
 if(!topic.entries.length||selected.length>100||selected.length>s.organizerBudget.limits.maxInputs||bytes(selected.map(e=>e.body))>s.organizerBudget.limits.maxContentBytes)reject('BUDGET_EXCEEDED');
 const inputs=selected.map(e=>({ref:e.id,revision:topic.versions[e.id],text:e.body})),cache=await cacheSnapshot(s,t,await s.canonicalTopic(t,topicId),topic);
 if(!cache.complete||!cache.evidenceVersion)reject('STALE_BASE');
 return {topic,incremental,incrementalVersion,profile:expectedProfile,gateEpoch:gate.epoch,cachePresentation:topic.cacheQualification.reusable?publicTopic(topic):null,checkpoint:cp,inputs,evidenceVersion:cache.evidenceVersion,style:{version:1,value:style.value,policyVersion:'AIOS-1.0',expectedRevision:style.revision,expectedEpoch:style.epoch},proof:JSON.stringify([topic.id,topic.name,topic.binding,topic.scopeVersions,topic.stored,cp,gate,restore?.value??'initial',style,cache.evidenceVersion,incrementalVersion,incrementalVersion===2?topic.incrementalVersions:null])};
}
// IDB evidence/restore/policy share the surrounding readonly transaction. Local
// preferences use this store's serialized control snapshot; recheck it after
// the final injected authority await, including a change during control().
export async function assertLocalOrganizeCacheControls(s,t,prepared){
 const controls=await s.control(t),current=s.pendingControl||s.controlCache;
 for(const value of [controls,current]){const style=readAIStyle(value?.preferences,prepared.style.expectedEpoch);if(value?.settings?.enabled!==true||value.settings.epoch!==prepared.gateEpoch||!style.available||style.value!==prepared.style.value||style.revision!==prepared.style.expectedRevision||style.epoch!==prepared.style.expectedEpoch)reject('STALE_BASE');}
}
export async function commitLocalOrganizeCandidateInTransaction(s,t,{prepared,result,candidateId,qualification=null,manifestDigest=null}){
 const current=await readLocalOrganizeScopeInTransaction(s,t,prepared.topic.id,prepared.profile,prepared.incrementalVersion);if(current.proof!==prepared.proof)reject('STALE_BASE');
 const topic=current.topic,old=topic.stored,cp=current.checkpoint,candidate=createAIPresentationCandidate(topic.presentation,result,{createdAt:s.clock(),materialVersions:prepared.incrementalVersion===2?topic.incrementalVersions:topic.scopeVersions,sourceBinding:await candidateBinding(s,t,topic,topic,current.gateEpoch,prepared.incrementalVersion===2),candidateId,manifestDigest});
 if(candidate){const base=topic.presentation?old:{id:ROW+topic.id,topicId:topic.id,envelopeVersion:1,currentState:'none',revision:0,recoveryGeneration:isBaseNoneEnvelope(old)?old.recoveryGeneration:candidateId,...(isBaseNoneEnvelope(old)&&old.recoveryPurgeRevision!==undefined?{recoveryPurgeRevision:old.recoveryPurgeRevision}:{}),basedOnCheckpoint:old?.basedOnCheckpoint||{entryVersions:{}}};await t.put('meta',{...base,candidate,needsUpdate:false,stale:false});await candidateFence(t,topic.id,candidate);}
 if(prepared.incrementalVersion!==2)await t.put('meta',{...cp,version:3,topicVersions:{...cp.topicVersions,[topic.id]:topic.versions},inputVersions:await acknowledgedInputs(s,t,cp,topic,topic.versions),updatedAt:s.clock()});
 let cacheProof=null;
 if(candidate?.schemaVersion!==3&&candidate?.baseKind==='none'&&qualification?.childId===candidateId&&validOrganizeCacheProfile(qualification.profile)){
  cacheProof=Object.freeze({});if(localCacheProofs.size>=32)localCacheProofs.delete(localCacheProofs.keys().next().value);
  localCacheProofs.set(cacheProof,{store:s,jobId:qualification.jobId,childId:candidateId,key:aiCandidateKey(candidate),topicId:topic.id,coverage:structuredClone(qualification.coverage),profile:structuredClone(qualification.profile),style:structuredClone(prepared.style),evidenceVersion:prepared.evidenceVersion,confirmed:false});
 }
 return {candidateCreated:!!candidate,cacheProof};
}

// Process-local capabilities only: globally bounded, never exported in DTOs or
// backups, and invalidated on adoption/disposal. A rolled-back transaction can
// leave only an unconfirmed token; durable COMMITTED checks are mandatory.
const localCacheProofs=new Map();
export function releaseLocalOrganizeCacheProof(s,token){if(localCacheProofs.get(token)?.store===s)localCacheProofs.delete(token);}
export async function confirmLocalOrganizeCacheProof(s,token){
 const proof=localCacheProofs.get(token);if(!proof||proof.store!==s)return false;
 const valid=await s.run(()=>s.repository.transaction(false,async t=>{
  const job=await t.get('organizerJobs',proof.jobId),receipt=await t.get('organizerUsage','aiu:attempt:'+proof.childId),row=await t.get('meta',ROW+proof.topicId);
  return job?.kind==='ai_usage_v1'&&job.type==='AI_ORGANIZE'&&job.state==='COMMITTED'&&job.childIds.length===1&&job.childIds[0]===proof.childId&&Array.isArray(job.coverage)&&equal(job.coverage,proof.coverage)&&Array.isArray(job.committedCoverage)&&equal([...job.committedCoverage].sort(),proof.coverage.map(u=>JSON.stringify([u.key,u.facet,u.scope])).sort())&&receipt?.jobId===proof.jobId&&receipt.state==='COMMITTED'&&isBaseNoneEnvelope(row)&&row.needsUpdate!==true&&row.stale!==true&&aiCandidateKey(row.candidate)===proof.key;
 }));
 if(!valid){localCacheProofs.delete(token);return false;}if(localCacheProofs.get(token)!==proof)return false;proof.confirmed=true;return true;
}
async function bindAdoptedLocalCache(s,t,{row,topic,current,resolved,checkpoint}){
 // Never recycle an old binding through partial adoption or a human-owned row.
 delete resolved.next.cacheBinding;
 if(!isBaseNoneEnvelope(row)||!resolved.changed||!resolved.hasCurrent||resolved.kept.length||row.needsUpdate===true||row.stale===true||Object.values(resolved.next.protections||{}).some(Boolean)||!equal(presentationContent(resolved.next),row.candidate.proposal))return;
 const key=aiCandidateKey(row.candidate),match=[...localCacheProofs].find(([,p])=>p.store===s&&p.confirmed&&p.key===key&&p.topicId===topic.id);if(!match)return;const [token,proof]=match;
 if(!equal(checkpoint?.topicVersions?.[topic.id]||{},current.versions))return;
 const snapshot=await cacheSnapshot(s,t,topic,current),style=snapshot.style;
 if(localCacheProofs.get(token)!==proof||!proof.confirmed||!snapshot.complete||snapshot.evidenceVersion!==proof.evidenceVersion||!style.available||style.value!==proof.style.value||style.revision!==proof.style.expectedRevision||style.epoch!==proof.style.expectedEpoch)return;
 resolved.next.cacheBinding={version:1,topicId:topic.id,presentationRevision:resolved.next.revision,profile:structuredClone(proof.profile),style:{value:style.value,policyVersion:proof.style.policyVersion},evidenceVersion:snapshot.evidenceVersion};
}
