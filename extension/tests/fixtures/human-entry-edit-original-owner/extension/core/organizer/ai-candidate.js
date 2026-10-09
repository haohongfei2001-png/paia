import {isIncrementalV3,validIncrementalV3,adoptIncrementalV3,validIncrementalGeneration} from './ai-incremental-v3.js';
import {isIncrementalV2,validIncrementalV2,adoptIncrementalFields} from './ai-incremental-v2.js';
import {AI_FIELDS,AI_LIST_FIELDS,isStoredAIPresentation,presentationContent} from './ai-contract.js';
import {reject} from './contracts.js';

export const AI_CANDIDATE_SCHEMA_VERSION=2;
export const AI_CANDIDATE_ENVELOPE_VERSION=1;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value);
const emptyField=field=>AI_LIST_FIELDS.includes(field)?[]:'';
const fieldsEmpty=row=>AI_FIELDS.every(field=>!Object.hasOwn(row,field));
const ENVELOPE_KEYS=new Set(['id','topicId','envelopeVersion','currentState','revision','recoveryGeneration','recoveryPurgeRevision','basedOnCheckpoint','candidate','needsUpdate','stale']);
export function isBaseNoneEnvelope(row,{portable=false}={}){
 if(!record(row)||Object.keys(row).some(key=>!ENVELOPE_KEYS.has(key))||row.envelopeVersion!==AI_CANDIDATE_ENVELOPE_VERSION||row.currentState!=='none'||typeof row.topicId!=='string'||!row.topicId.length||row.topicId.length>200||row.id!=='aiPresentation:'+row.topicId||row.revision!==0||!fieldsEmpty(row)||Object.hasOwn(row,'evidenceEntryIds'))return false;
 if(portable){if(row.recoveryGeneration!==undefined||row.recoveryPurgeRevision!==undefined)return false;}
 else if(typeof row.recoveryGeneration!=='string'||row.recoveryGeneration.length<1||row.recoveryGeneration.length>200||row.recoveryPurgeRevision!==undefined&&(!Number.isSafeInteger(row.recoveryPurgeRevision)||row.recoveryPurgeRevision<0))return false;
 if(['needsUpdate','stale'].some(key=>row[key]!==undefined&&typeof row[key]!=='boolean'))return false;
 if(!record(row.basedOnCheckpoint)||Object.keys(row.basedOnCheckpoint).some(key=>key!=='entryVersions')||!validMaterialVersions(row.basedOnCheckpoint.entryVersions))return false;
 return row.candidate===undefined||record(row.candidate)&&[2,3,4].includes(row.candidate.schemaVersion)&&row.candidate.baseKind==='none'&&row.candidate.proposal?.topicId===row.topicId;
}
function validMaterialVersions(value){return record(value)&&Object.keys(value).length<=10000&&Object.entries(value).every(([id,version])=>typeof id==='string'&&id.length>0&&id.length<=200&&typeof version==='string'&&version.length<=4000);}
function validBinding(value){return record(value)&&Object.keys(value).length===5&&Number.isSafeInteger(value.organizationRevision)&&value.organizationRevision>=0&&Number.isSafeInteger(value.generation)&&value.generation>=0&&typeof value.epoch==='string'&&value.epoch.length<=200&&typeof value.coverage==='string'&&value.coverage.length<=4000000&&typeof value.policy==='string'&&value.policy.length<=2000;}

// The exact durable proposal identity binds local choices and the final CAS.
// Legacy update candidates retain their original key and compatible decoder.
export function aiCandidateKey(candidate){
 if(!candidate)return '';
 const legacy=[...(candidate.schemaVersion===4?[candidate.baseGenerationDigest??candidate.baseGeneration?.acceptedDigest??null]:[]),...([3,4].includes(candidate.schemaVersion)?[candidate.manifestDigest]:[]),candidate.expectedRevision,candidate.createdAt||null,candidate.changedFields,candidate.proposal];
 return JSON.stringify(candidate.schemaVersion===1?legacy:[candidate.candidateId,candidate.baseKind,...legacy]);
}
export function createAIPresentationCandidate(current,proposal,{createdAt=null,materialVersions={},sourceBinding=null,candidateId=crypto.randomUUID(),manifestDigest=null,baseGeneration=null}={}){
 if(isIncrementalV2(proposal)||isIncrementalV3(proposal)){if(!/^[a-f0-9]{64}$/.test(manifestDigest||'')||!(isIncrementalV3(proposal)?validIncrementalV3:validIncrementalV2)(proposal,new Set(proposal.evidenceEntryIds)))reject('INVALID_OUTPUT');const changedFields=AI_FIELDS.filter(f=>!equal(current?presentationContent(current)[f]:emptyField(f),proposal.projection[f])||isIncrementalV3(proposal)&&!equal(current?.manifest?.fields?.[f]||{style:current?.manifest?.style},proposal.manifest.fields[f]));if(!changedFields.length)return null;return {schemaVersion:isIncrementalV3(proposal)?4:3,...(isIncrementalV3(proposal)?{baseGeneration:clone(baseGeneration)}:{}),candidateId,baseKind:current?'current':'none',expectedRevision:current?.revision||0,changedFields,proposal:clone(proposal),manifestDigest,sourceBinding:clone(sourceBinding),materialVersions:clone(materialVersions),createdAt};}

 if(!proposal||current&&(current.topicId!==proposal.topicId||!Number.isSafeInteger(current.revision))||!validMaterialVersions(materialVersions)||!validBinding(sourceBinding))reject('INVALID_OUTPUT');
 const changedFields=AI_FIELDS.filter(field=>!equal(current?current[field]:emptyField(field),proposal[field]));
 if(!changedFields.length)return null;
 const fieldEvidenceEntryIds=Object.fromEntries(AI_FIELDS.map(field=>[field,clone(proposal.fieldEvidenceEntryIds?.[field]||(AI_LIST_FIELDS.includes(field)?[...new Set(proposal[field].flatMap(item=>item.evidenceEntryIds))]:proposal.evidenceEntryIds))]));
 return {schemaVersion:AI_CANDIDATE_SCHEMA_VERSION,candidateId,baseKind:current?'current':'none',expectedRevision:current?.revision||0,changedFields,proposal:presentationContent(proposal),fieldEvidenceEntryIds,sourceBinding:clone(sourceBinding),materialVersions:clone(materialVersions),createdAt};
}
export function validAIPresentationCandidate(candidate,allowed){
 if([3,4].includes(candidate?.schemaVersion))return record(candidate)&&Object.keys(candidate).every(k=>['schemaVersion','candidateId','baseKind','expectedRevision','changedFields','proposal','manifestDigest',...(candidate.schemaVersion===4?['baseGeneration']:[]),'sourceBinding','materialVersions','createdAt'].includes(k))&&typeof candidate.candidateId==='string'&&candidate.candidateId.length>=8&&candidate.candidateId.length<=200&&['none','current'].includes(candidate.baseKind)&&(candidate.baseKind!=='none'||candidate.expectedRevision===0)&&Number.isSafeInteger(candidate.expectedRevision)&&candidate.expectedRevision>=0&&/^[a-f0-9]{64}$/.test(candidate.manifestDigest||'')&&Array.isArray(candidate.changedFields)&&candidate.changedFields.length>0&&new Set(candidate.changedFields).size===candidate.changedFields.length&&candidate.changedFields.every(f=>AI_FIELDS.includes(f))&&validMaterialVersions(candidate.materialVersions)&&validBinding(candidate.sourceBinding)&&(candidate.schemaVersion!==4||candidate.baseGeneration===null||validIncrementalGeneration(candidate.baseGeneration)&&candidate.baseGeneration.kind==='accepted-v2')&&(candidate.schemaVersion===4?validIncrementalV3(candidate.proposal,allowed):validIncrementalV2(candidate.proposal,allowed));
 if(!record(candidate)||![1,AI_CANDIDATE_SCHEMA_VERSION].includes(candidate.schemaVersion)||!Number.isSafeInteger(candidate.expectedRevision)||candidate.expectedRevision<0)return false;
 if(!Array.isArray(candidate.changedFields)||!candidate.changedFields.length||new Set(candidate.changedFields).size!==candidate.changedFields.length||candidate.changedFields.some(field=>!AI_FIELDS.includes(field)))return false;
 if(!record(candidate.proposal)||!validMaterialVersions(candidate.materialVersions)||!isStoredAIPresentation({...candidate.proposal,revision:candidate.expectedRevision},allowed))return false;
 if(candidate.schemaVersion===1)return true;
 if(Object.keys(candidate).some(key=>!['schemaVersion','candidateId','baseKind','expectedRevision','changedFields','proposal','fieldEvidenceEntryIds','sourceBinding','materialVersions','createdAt'].includes(key))||Object.keys(candidate.proposal).some(key=>!['topicId',...AI_FIELDS,'evidenceEntryIds'].includes(key)))return false;
 if(!['none','current'].includes(candidate.baseKind)||candidate.baseKind==='none'&&candidate.expectedRevision!==0||typeof candidate.candidateId!=='string'||candidate.candidateId.length<8||candidate.candidateId.length>200||!validBinding(candidate.sourceBinding))return false;
 if(!record(candidate.fieldEvidenceEntryIds)||Object.keys(candidate.fieldEvidenceEntryIds).length!==AI_FIELDS.length)return false;
 return AI_FIELDS.every(field=>{const ids=candidate.fieldEvidenceEntryIds[field],value=candidate.proposal[field];return Array.isArray(ids)&&ids.length<=100&&ids.every(id=>allowed.has(id)&&candidate.proposal.evidenceEntryIds.includes(id))&&(!(typeof value==='string'?value.trim():value.length)||ids.length>0)&&(!AI_LIST_FIELDS.includes(field)||equal([...new Set(value.flatMap(item=>item.evidenceEntryIds))],ids));});
}
export function publicAIPresentationCandidate(row,allowed,currentVersions={},sourceBinding=null){
 const candidate=row?.candidate;if(!validAIPresentationCandidate(candidate,allowed))return null;
 const none=[2,3,4].includes(candidate.schemaVersion)&&candidate.baseKind==='none';
 if(none?!isBaseNoneEnvelope(row):!isStoredAIPresentation(row,allowed))return null;
 return {schemaVersion:candidate.schemaVersion,...(candidate.schemaVersion>=2?{candidateId:candidate.candidateId,baseKind:candidate.baseKind}:{}),...(candidate.schemaVersion===4?{baseGenerationDigest:candidate.baseGeneration?.acceptedDigest??null}:{}),expectedRevision:candidate.expectedRevision,changedFields:[...candidate.changedFields],proposal:[3,4].includes(candidate.schemaVersion)?presentationContent(candidate.proposal):clone(candidate.proposal),...([3,4].includes(candidate.schemaVersion)?{manifestDigest:candidate.manifestDigest}:{}),createdAt:candidate.createdAt||null,stale:row.revision!==candidate.expectedRevision||!equal(candidate.materialVersions,currentVersions)||candidate.schemaVersion>=2&&sourceBinding!==null&&!equal(candidate.sourceBinding,sourceBinding)};
}
export function applyAIPresentationCandidate(row,{decisions,expectedRevision,expectedCandidateKey},allowed,currentVersions,clock,sourceBinding=null){
 const visible=publicAIPresentationCandidate(row,allowed,currentVersions,sourceBinding);
 if(!visible||typeof expectedCandidateKey!=='string'||expectedCandidateKey!==aiCandidateKey(visible)||visible.stale||!Number.isSafeInteger(expectedRevision)||row.revision!==expectedRevision||visible.expectedRevision!==expectedRevision)reject('STALE_BASE');
 if(!record(decisions)||Object.keys(decisions).length!==visible.changedFields.length||visible.changedFields.some(field=>!Object.hasOwn(decisions,field)||!['adopt','keep'].includes(decisions[field]))||Object.keys(decisions).some(field=>!visible.changedFields.includes(field)))reject('INVALID_OUTPUT');
 const adopted=visible.changedFields.filter(field=>decisions[field]==='adopt'),kept=visible.changedFields.filter(field=>decisions[field]==='keep'),none=visible.baseKind==='none';
 if([3,4].includes(row.candidate.schemaVersion)){if(row.candidate.schemaVersion===4&&!adopted.length){const next=clone(row);delete next.candidate;if(!none){next.revision=row.revision+1;next.updatedAt=clock;}return {next,changed:false,revision:next.revision,adopted,kept,hasCurrent:!none};}if(none&&!adopted.length){const next=clone(row);delete next.candidate;return {next,changed:false,revision:0,adopted,kept,hasCurrent:false};}const projected=row.candidate.schemaVersion===4?adoptIncrementalV3(row,row.candidate.proposal,adopted,kept,row.candidate.baseGeneration):adoptIncrementalFields(row,row.candidate.proposal,adopted,kept),next={...row,...projected,id:row.id,revision:row.revision+1,recoveryGeneration:row.recoveryGeneration,needsUpdate:kept.length>0,stale:kept.length>0,updatedAt:clock,userEditedAt:clock};delete next.candidate;delete next.currentState;delete next.envelopeVersion;delete next.cacheBinding;return {next,changed:true,revision:next.revision,adopted,kept,hasCurrent:true};}
 if(none&&!adopted.length){const next=clone(row);delete next.candidate;next.needsUpdate=false;return {next,changed:false,revision:0,adopted,kept,hasCurrent:false};}
 const next=none?{id:row.id,topicId:row.topicId,schemaVersion:1,revision:0,recoveryGeneration:row.recoveryGeneration,...Object.fromEntries(AI_FIELDS.map(field=>[field,emptyField(field)])),evidenceEntryIds:[],protections:{}}:clone(row);
 for(const field of adopted)next[field]=clone(visible.proposal[field]);
 const fieldEvidence=row.candidate.fieldEvidenceEntryIds;
 next.evidenceEntryIds=[...new Set([...(none?[]:row.evidenceEntryIds||[]),...adopted.flatMap(field=>fieldEvidence?.[field]||visible.proposal.evidenceEntryIds||[])])];
 delete next.candidate;next.needsUpdate=false;next.stale=false;next.revision=row.revision+1;next.protections={...(row.protections||{}),...Object.fromEntries(visible.changedFields.map(field=>[field,!none]))};next.userEditedAt=clock;next.updatedAt=clock;
 if(!isStoredAIPresentation(next,allowed))reject('INVALID_OUTPUT');
 return {next,changed:true,revision:next.revision,adopted,kept,hasCurrent:true};
}
