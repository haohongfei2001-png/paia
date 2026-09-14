import {AI_FIELDS,isStoredAIPresentation,presentationContent} from './ai-contract.js';
import {reject} from './contracts.js';

export const AI_CANDIDATE_SCHEMA_VERSION=1;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value);

export function createAIPresentationCandidate(current,proposal,{createdAt}={}){
 if(!current||!proposal||current.topicId!==proposal.topicId||!Number.isSafeInteger(current.revision))reject('INVALID_OUTPUT');
 const changedFields=AI_FIELDS.filter(field=>!equal(current[field],proposal[field]));
 if(!changedFields.length)return null;
 return {
  schemaVersion:AI_CANDIDATE_SCHEMA_VERSION,
  expectedRevision:current.revision,
  changedFields,
  resolved:{},
  proposal:presentationContent({...proposal,revision:current.revision}),
  createdAt:createdAt||null
 };
}

export function validAIPresentationCandidate(candidate,allowed){
 if(!record(candidate)||candidate.schemaVersion!==AI_CANDIDATE_SCHEMA_VERSION||!Number.isSafeInteger(candidate.expectedRevision)||candidate.expectedRevision<0)return false;
 if(!Array.isArray(candidate.changedFields)||!candidate.changedFields.length||new Set(candidate.changedFields).size!==candidate.changedFields.length||candidate.changedFields.some(field=>!AI_FIELDS.includes(field)))return false;
 if(!record(candidate.resolved)||Object.entries(candidate.resolved).some(([field,decision])=>!candidate.changedFields.includes(field)||!['adopt','keep'].includes(decision)))return false;
 if(!record(candidate.proposal))return false;
 const pseudo={...candidate.proposal,revision:candidate.expectedRevision};
 return isStoredAIPresentation(pseudo,allowed);
}

export function publicAIPresentationCandidate(row,allowed){
 const candidate=row?.candidate;
 if(!validAIPresentationCandidate(candidate,allowed))return null;
 return {
  schemaVersion:candidate.schemaVersion,
  expectedRevision:candidate.expectedRevision,
  changedFields:[...candidate.changedFields],
  resolved:clone(candidate.resolved),
  proposal:clone(candidate.proposal),
  createdAt:candidate.createdAt||null,
  stale:row.revision!==candidate.expectedRevision
 };
}

export function applyAIPresentationCandidateDecision(row,{field,decision,expectedRevision},allowed,clock){
 const visible=publicAIPresentationCandidate(row,allowed);
 if(!visible||visible.stale||!Number.isSafeInteger(expectedRevision)||row.revision!==expectedRevision||visible.expectedRevision!==expectedRevision)reject('STALE_BASE');
 if(!visible.changedFields.includes(field)||Object.hasOwn(visible.resolved,field)||!['adopt','keep'].includes(decision))reject('INVALID_OUTPUT');
 const next=clone(row),candidate=clone(row.candidate);
 candidate.resolved[field]=decision;
 let changed=false;
 if(decision==='adopt'){
  next[field]=clone(candidate.proposal[field]);
  next.revision++;
  next.protections={...(next.protections||{}),[field]:true};
  next.userEditedAt=clock;
  candidate.expectedRevision=next.revision;
  changed=true;
 }
 const complete=candidate.changedFields.every(name=>Object.hasOwn(candidate.resolved,name));
 if(complete)delete next.candidate;else next.candidate=candidate;
 return {next,changed,complete,revision:next.revision,field,decision};
}
