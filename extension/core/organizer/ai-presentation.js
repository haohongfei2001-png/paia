import {entryTime} from './topic-chronology.js';
import {userAIDraft} from './ai-draft.js';
import {commitBoundedProgress} from './bounded-workflow.js';
import {sourceFaithfulSummary} from './source-summary.js';
import {bytes,reject,SAFE_ERRORS} from './contracts.js';
import {prefix,idOK} from '../thought-model.js';
import {validTopicGeneration} from '../topic-compatibility.js';
import {inputProjection} from '../thought-evidence.js';
import {planDelta} from '../dual-view.js';
import {migrateAIPresentationProductization} from './ai-presentation-migration.js';

import {AI_FIELDS,AI_LIST_FIELDS,AI_SCHEMA_VERSION,isStoredAIPresentation,presentationContent,validateAIPresentation} from './ai-contract.js';
import {validateDeepSeekRequest} from './deepseek.js';
import {hashText} from '../dedupe.js';
import {journal,receipt,saveReceipt} from '../thought-journal.js';
export {validateAIPresentation};
const CHECKPOINT='aiOrganizerCheckpoint',CURRENT='aiPresentationRequestCurrent',ROW='aiPresentation:',REQUEST='aiPresentationRequest:',ACTIVE=new Set(['prepared','sent','response_received','validated']);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=e=>SAFE_ERRORS.has(e?.code)?e.code:'INTERNAL_RUNTIME_ERROR';
// Trusted projection only. Neither provider nor UI receives repository handles,
// Source snapshots, Input identifiers, hidden Inputs, titles/URLs or raw history.
async function topicSnapshot(s,t,topic){
 if(!validTopicGeneration(topic.activeLayoutGeneration))reject('STALE_BASE');
 const placements=await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]));
 const entries=[],versions={},inputVersions={},filter=await t.get('meta','smart-filter');
 for(const placement of placements){let row;try{row=await s.readableEntry(t,placement.entryId);}catch{continue;}if(!row||row.lifecycle!=='active')continue;
  const deps=await t.all('dependencies','byTarget',prefix(['entry',row.id])),provenance=await t.all('provenance','byOwner',prefix(['entry',row.id]));if(!provenance.length&&row.provenanceType!=='user_created')continue;const refs=[...new Map([...deps,...provenance].map(d=>[d.inputId,d])).values()];let allowed=true;const tokens=[];
  for(const dep of refs){const input=await inputProjection(s,t,dep.inputId),state=await t.get('inputStates',dep.inputId);if(!input||await s.isFiltered(t,input.block,filter)){allowed=false;break;}tokens.push([dep.inputId,state.contentRevision,state.lastRemovalSequence||0]);inputVersions[dep.inputId]={contentRevision:state.contentRevision,removalState:state.removalState,sourcePurged:!!state.sourcePurged,eligible:true};}
  if(!allowed)continue;versions[row.id]=JSON.stringify([row.revision,row.dependencyRevision||0,tokens]);entries.push({...await entryTime(t,row.id),id:row.id,body:row.thoughtText,type:row.type,userEdited:row.userEdited,protections:row.protections,createdAt:row.createdAt,updatedAt:row.updatedAt});
 }
 return {entries,versions,inputVersions};
}
async function snapshot(s){await migrateAIPresentations(s);return s.run(()=>s.repository.transaction(false,async t=>{
 const gate=await t.get('meta','gate'),cp=await t.get('meta',CHECKPOINT)||{id:CHECKPOINT,view:'ai',version:3,inputVersions:{},topicVersions:{},lastSequence:0},topics=[];
 for(const raw of await t.all('topics')){if(raw.lifecycle!=='active'||raw.redirectTo)continue;const topic=await s.canonicalTopic(t,raw.id);if(!validTopicGeneration(topic.activeLayoutGeneration))continue;const current=await topicSnapshot(s,t,topic),rawPrior=cp.topicVersions?.[topic.id]||{},stored=await t.get('meta',ROW+topic.id),allowed=new Set(current.entries.map(x=>x.id));
  // Never render or resend a derived cache after any of its evidence is removed.
  const readable=stored&&stored.topicId===topic.id&&isStoredAIPresentation(stored,allowed),presentation=readable?stored:null,prior=readable||!current.entries.length?rawPrior:{};
  const changed=current.entries.filter(e=>prior[e.id]!==current.versions[e.id]),removed=Object.keys(prior).filter(id=>!allowed.has(id));
  topics.push({id:topic.id,name:topic.name,organizationRevision:topic.organizationRevision,generation:topic.activeLayoutGeneration,entries:current.entries,versions:current.versions,inputVersions:current.inputVersions,prior,storedRevision:stored?.revision||0,userDraft:!readable?userAIDraft(stored):null,presentation,changed,removed,pending:changed.length>0||removed.length>0||!!stored&&(!readable||stored.needsUpdate===true),stale:!!stored&&(!readable||stored.needsUpdate===true||changed.length>0||removed.length>0)});
 }
 return {topics,checkpoint:cp,epoch:gate?.epoch,enabled:gate?.enabled};
 }));}
function versionInputs(value){try{return (JSON.parse(value)[2]||[]).map(x=>x[0]);}catch{return [];}}
function acknowledgedInputs(checkpoint,topic,delta,completedVersions,topics){
 const versions={...checkpoint.inputVersions},ids=new Set([...Object.keys(topic.inputVersions),...Object.values(topic.prior).flatMap(versionInputs)]);
 for(const id of ids){const pending=topics.some(other=>{const acknowledged=other.id===topic.id?completedVersions:checkpoint.topicVersions?.[other.id]||{};return [...new Set([...Object.keys(other.versions),...Object.keys(acknowledged)])].some(entryId=>(versionInputs(other.versions[entryId]).includes(id)||versionInputs(acknowledged[entryId]).includes(id))&&other.versions[entryId]!==acknowledged[entryId]);});if(pending)continue;const current=delta.nextCheckpoint.inputVersions[id];if(current)versions[id]=current;else delete versions[id];}return versions;
}
async function readAIPresentationStatus(s){const [all,delta]=await Promise.all([snapshot(s),planDelta(s,'ai')]);const runtime=await s.run(()=>s.repository.transaction(false,async t=>{const pointer=await t.get('meta',CURRENT);return pointer?await t.get('meta',REQUEST+pointer.requestId):null;},['meta']));return {topics:all.topics.map(t=>({topicId:t.id,name:t.name,sourceHint:sourceFaithfulSummary(t.entries),userDraft:t.userDraft,presentation:t.presentation?{...presentationContent(t.presentation),revision:t.presentation.revision,schemaVersion:t.presentation.schemaVersion,protections:t.presentation.protections||{},updatedAt:t.presentation.updatedAt,stale:t.stale}:null,stale:t.stale,pending:t.pending,pendingEntryCount:t.changed.length+t.removed.length})),pendingTopics:all.topics.filter(t=>t.pending).length,nextTopic:all.topics.filter(t=>t.pending).map(t=>({topicId:t.id,name:t.name,inputCount:Math.min(t.changed.length||t.entries.length,8)}))[0]||null,counts:delta.counts,approximateBytes:all.topics.filter(t=>t.pending).reduce((n,t)=>n+bytes(t.changed.slice(0,8).map(e=>e.body)),0),runtime:runtime?{phase:runtime.phase,state:runtime.state,errorCode:runtime.errorCode||null,httpStatus:runtime.httpStatus??null,responseBytes:runtime.responseBytes||0,requestCount:runtime.requestCount||0}:null};}
export async function aiPresentationStatus(s){
 const result=await readAIPresentationStatus(s),compatibility=await s.libraryCompatibilityStatus?.().catch(()=>null);
 return compatibility?.unresolvedLayouts>0?{...result,degraded:{reason:'topic_compatibility_unresolved',unresolvedLayouts:compatibility.unresolvedLayouts}}:result;
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
async function aiJournal(s,t,before,after,actor,operationId){
 const evidenceEntryIds=[...new Set([...(before?.evidenceEntryIds||[]),...(after?.evidenceEntryIds||[])])],sourceRecordIds=[];
 for(const id of evidenceEntryIds){const e=await t.get('thoughts',id);if(e)sourceRecordIds.push(...(e.sourceRecordIds||[]));}
 await t.put('libraryMigrationItems',{id:'ai-presentation-fence:'+after.topicId,entityKind:'organizer_metadata',ownerKind:'ai_presentation',ownerId:after.topicId,statusKey:1,sourceRecordIds:[...new Set(sourceRecordIds)]});
 return journal(s,t,{kind:'ai_presentation',entityId:after.topicId,documentId:after.topicId,before:before?presentationContent(before):null,after:presentationContent(after),fieldMask:AI_FIELDS,actor,reason:actor==='ai'?'ai_update':'edit',important:true,operationId,baseRevision:before?.revision||0,afterRevision:after.revision,sourceRecordIds:[...new Set(sourceRecordIds)],evidenceEntryIds});
}
export async function aiPresentationRevisions(s,{topicId}={}){
 if(!idOK(topicId))reject('INVALID_OUTPUT');await migrateAIPresentations(s);
 return s.run(()=>s.repository.transaction(false,async t=>{const topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic),allowed=new Set(current.entries.map(e=>e.id)),items=[];
 for(const row of await t.all('revisions','byEntitySequence',prefix(['ai_presentation:'+topicId]))){if(!await s.sourcePresent(t,row.sourceRecordIds)||row.evidenceEntryIds.some(id=>!allowed.has(id)))continue;items.push({id:row.id,actor:row.actor,at:row.at,reason:row.reason,before:row.before,after:row.after,revision:row.afterRevision});}return {items:items.slice(-50)};
 }));
}
export async function editAIPresentation(s,{topicId,field,value,expectedRevision,operationId=null}){
 if(!idOK(topicId)||!AI_FIELDS.includes(field)||operationId!==null&&(!idOK(operationId)||operationId.length<8))reject('INVALID_OUTPUT');await migrateAIPresentations(s);const edit={id:topicId,field,value,expectedRevision,operationId,kind:'ai-field-edit'},digest=operationId?await hashText(JSON.stringify(edit)):null;
 return s.foundationWrite(async t=>{if(operationId){const prior=await receipt(t,edit,digest);if(prior)return prior;}const row=await t.get('meta',ROW+topicId),topic=await s.canonicalTopic(t,topicId),current=await topicSnapshot(s,t,topic),allowed=new Set(current.entries.map(e=>e.id));if(!row||row.revision!==expectedRevision||!isStoredAIPresentation(row,allowed))reject('STALE_BASE');
 if(AI_LIST_FIELDS.includes(field)){if(!Array.isArray(value)||value.length!==row[field].length||value.some((x,i)=>typeof x?.text!=='string'||x.text.length>2000||!equal(x.evidenceEntryIds,row[field][i].evidenceEntryIds)))reject('INVALID_OUTPUT');value=value.map(x=>({text:x.text,evidenceEntryIds:[...x.evidenceEntryIds]}));}else if(typeof value!=='string'||value.length>(field==='blockSummary'?300:4000))reject('INVALID_OUTPUT');
 if(equal(row[field],value))return {revision:row.revision};const next={...row,[field]:value,revision:row.revision+1,protections:{...row.protections,[field]:true},userEditedAt:s.clock()};await t.put('meta',next);await aiJournal(s,t,row,next,'user',operationId||s.uuid());const result={revision:next.revision};if(operationId)await saveReceipt(s,t,edit,digest,result);return result;
 });
}

export class AIPresentationRunner {
 constructor(store,{provider,credentials}){this.s=store;this.provider=provider;this.credentials=credentials;this.running=null;}
 wake({userActionId,topicId=null,boundedActionId=null}={}){if(!idOK(userActionId)||topicId!==null&&!idOK(topicId))return Promise.resolve({error:'INVALID_OUTPUT'});if(this.running)return Promise.resolve({error:'REQUEST_ALREADY_IN_FLIGHT'});this.controller=new AbortController();this.running=this.run(userActionId,topicId,boundedActionId).finally(()=>{this.running=null;this.controller=null;});return this.running;}
 async reconcileInterrupted(){if(this.running)return;return this.s.foundationWrite(async t=>{const p=await t.get('meta',CURRENT),row=p&&await t.get('meta',REQUEST+p.requestId);if(row&&ACTIVE.has(row.state))await t.put('meta',{...row,state:'outcome_unknown',errorCode:'OUTCOME_UNKNOWN'});});}
 async stop(){this.controller?.abort();return this.reconcileInterrupted();}
 async run(userActionId,topicId,boundedActionId=null){const s=this.s,deadlineAt=Date.now()+30000,signal=this.controller.signal;let requestId=null,usageId=null,credential,phase='preparing',calls=0;const check=()=>{if(signal.aborted)reject('CANCELLED');if(Date.now()>=deadlineAt)reject('PROVIDER_TIMEOUT');};
 const trace=async patch=>s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId);if(!row||!ACTIVE.has(row.state))reject('OUTCOME_UNKNOWN');phase=patch.phase||phase;await t.put('meta',{...row,...patch,phase,phaseTimestamps:{...row.phaseTimestamps,[phase]:s.clock()},state:phase==='fetch_started'?'sent':phase==='preparing'?'prepared':'response_received',requestCount:phase==='fetch_started'?1:calls});});
 try{const [all,delta]=await Promise.all([snapshot(s),planDelta(s,'ai')]);if(!all.enabled)reject('CANCELLED');const topic=all.topics.find(t=>t.pending&&(!topicId||t.id===topicId));if(!topic)return {completed:true,noDelta:true,requestCount:0};if(!topic.presentation&&Object.values((await s.run(()=>s.repository.transaction(false,t=>t.get('meta',ROW+topic.id),['meta'])))?.protections||{}).some(Boolean))reject('STALE_BASE');if(!topic.entries.length){await s.foundationWrite(async t=>{const fresh=await topicSnapshot(s,t,await s.canonicalTopic(t,topic.id));if(!equal(fresh.versions,topic.versions))reject('STALE_BASE');const current=await t.get('meta',CHECKPOINT)||all.checkpoint;await t.put('meta',{...current,inputVersions:acknowledgedInputs(current,topic,delta,{},all.topics),topicVersions:{...current.topicVersions,[topic.id]:{}},updatedAt:s.clock()});const old=await t.get('meta',ROW+topic.id);if(!old||!Object.values(old.protections||{}).some(Boolean))await t.delete('meta',ROW+topic.id);});return {completed:true,requestCount:0};}
 const pool=topic.changed.length?topic.changed:topic.entries,selected=[];for(const entry of pool){if(selected.length>=Math.min(8,s.organizerBudget.limits.maxInputs))break;if(bytes([...selected,entry].map(e=>({ref:e.id,role:'primary',text:e.body})))>s.organizerBudget.limits.maxContentBytes)break;selected.push(entry);}if(!selected.length)reject('BUDGET_EXCEEDED');const existing=topic.presentation?presentationContent(topic.presentation):null;
 const context=existing?[{ref:'existing-presentation',role:'context_only',text:JSON.stringify(existing)}]:[];context.push({ref:'topic-delta',role:'context_only',text:JSON.stringify({added:selected.filter(e=>!Object.hasOwn(topic.prior,e.id)).map(e=>e.id),changed:selected.filter(e=>Object.hasOwn(topic.prior,e.id)).map(e=>e.id),chronology:selected.map(e=>({entryId:e.id,expressedAt:e.sourceSentAt||e.capturedAt||e.createdAt,basis:e.sourceSentAt?'source':e.capturedAt?'capture':'created'})),removedCount:topic.removed.length,remainingEntryCount:Math.max(0,topic.changed.length-selected.length)})});
 requestId=s.uuid();const request={requestId,taskProfile:'ai_synthesis',inputs:selected.map(e=>({ref:e.id,role:'primary',text:e.body})),context,topicCandidates:[{id:topic.id,name:topic.name,sections:[]}],budget:{maxOutputBytes:s.organizerBudget.limits.maxOutputBytes}};
 validateDeepSeekRequest(request,s.organizerBudget.limits);credential=await this.credentials.acquire();if(credential.status!=='ready')reject('CREDENTIAL_FAILURE');check();
 await s.foundationWrite(async t=>{const gate=await t.get('meta','gate'),freshTopic=await s.canonicalTopic(t,topic.id),fresh=await topicSnapshot(s,t,freshTopic);if(!gate?.enabled||gate.epoch!==all.epoch||!equal(fresh.versions,topic.versions))reject('STALE_BASE');if(await t.get('meta','aiPresentationAction:'+userActionId))reject('REQUEST_ALREADY_IN_FLIGHT');for(const key of [CURRENT,'originalProviderRequestCurrent']){const p=await t.get('meta',key),row=p&&await t.get('meta',(key===CURRENT?REQUEST:'originalProviderRequest:')+p.requestId);if(row&&ACTIVE.has(row.state))reject('REQUEST_ALREADY_IN_FLIGHT');}
 await t.put('meta',{id:'aiPresentationAction:'+userActionId,requestId});await t.put('meta',{id:CURRENT,requestId});await t.put('meta',{id:REQUEST+requestId,requestId,userActionId,batchId:requestId,inputCount:selected.length,approximateBytes:bytes(request),provider:'deepseek',model:'deepseek-v4-flash',state:'prepared',phase,startedAt:s.clock(),phaseTimestamps:{preparing:s.clock()},requestCount:0});
 usageId=await s.organizerLedger.reserve(t,{id:requestId,attempts:1,boundedActionId,audit:{taskType:'ai_synthesis',inputCount:selected.length,approximateSize:bytes(request),dataCategories:['topic_entries','derived_presentation']}},request);});
 const providerResult=await this.provider.execute(request,{credential:credential.handle,signal,deadlineAt,onTrace:trace,onDispatch:()=>{calls=1;}});check();const result=validateAIPresentation(providerResult,request);if(!result.evidenceEntryIds.length)reject('INVALID_SCHEMA');phase='committing';await trace({phase});
 await s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId),gate=await t.get('meta','gate');if(!row||!ACTIVE.has(row.state)||signal.aborted||!gate?.enabled||gate.epoch!==all.epoch)reject('CANCELLED');const nowTopic=await s.canonicalTopic(t,topic.id);if(nowTopic.organizationRevision!==topic.organizationRevision||nowTopic.activeLayoutGeneration!==topic.generation)reject('STALE_BASE');const now=await topicSnapshot(s,t,nowTopic);if(!equal(now.versions,topic.versions))reject('STALE_BASE');const allowed=new Set(now.entries.map(e=>e.id));if(result.evidenceEntryIds.some(id=>!allowed.has(id)))reject('INVALID_OUTPUT');const old=await t.get('meta',ROW+topic.id);if((old?.revision||0)!==topic.storedRevision)reject('STALE_BASE');const merged={...result};for(const field of AI_FIELDS)if(topic.presentation&&old?.protections?.[field])merged[field]=old[field];merged.evidenceEntryIds=[...new Set([...merged.evidenceEntryIds,...(topic.presentation&&old?.protections&&Object.values(old.protections).some(Boolean)?old.evidenceEntryIds:[])])];if(merged.evidenceEntryIds.some(id=>!allowed.has(id)))reject('STALE_BASE');
 const cp=await t.get('meta',CHECKPOINT)||all.checkpoint,versions={...topic.prior};for(const id of topic.removed)delete versions[id];for(const entry of selected)versions[entry.id]=topic.versions[entry.id];
 const next={id:ROW+topic.id,...merged,schemaVersion:AI_SCHEMA_VERSION,revision:(old?.revision||0)+1,protections:old?.protections||{},updatedAt:s.clock(),basedOnCheckpoint:{entryVersions:versions},stale:false,needsUpdate:false};await t.put('meta',next);await aiJournal(s,t,topic.presentation,next,'ai',requestId);
 await t.put('meta',{...cp,version:3,topicVersions:{...cp.topicVersions,[topic.id]:versions},inputVersions:acknowledgedInputs(cp,topic,delta,versions,all.topics),lastSequence:Math.max(cp.lastSequence||0,delta.nextCheckpoint.lastSequence),updatedAt:s.clock()});
 await commitBoundedProgress(t,boundedActionId,{topics:1});if(usageId)await s.organizerLedger.settle(t,usageId);
 await t.put('operationReceipts',{id:'ai-presentation:'+requestId,namespace:'ai-presentation',ownerId:topic.id,operationSequence:0,createdAt:s.clock(),result:{committed:1}});
 await t.put('meta',{...row,state:'committed',phase:'completed',requestCount:calls,committedItemCount:1,phaseTimestamps:{...row.phaseTimestamps,completed:s.clock()}});});return {completed:true,requestCount:calls,topicId:topic.id};
 }catch(error){const code=safe(error);try{if(requestId)await s.foundationWrite(async t=>{const row=await t.get('meta',REQUEST+requestId);if(row&&ACTIVE.has(row.state))await t.put('meta',{...row,state:'failed',errorCode:code,phase,requestCount:calls});});}catch{}return {error:code,phase,requestCount:calls};}finally{if(credential?.handle)this.credentials.revoke(credential.handle);}}
}
