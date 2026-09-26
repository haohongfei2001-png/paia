import {AI_FIELDS,isStoredAIPresentation,presentationContent} from './ai-contract.js';
import {reject} from './contracts.js';

export const AI_CANDIDATE_SCHEMA_VERSION=1;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value);

function validMaterialVersions(value){
 return record(value)&&Object.keys(value).length<=10000&&Object.entries(value).every(([id,version])=>typeof id==='string'&&id.length>0&&id.length<=200&&typeof version==='string'&&version.length<=4000);
}

// The reviewed candidate identity is shared by UI staging and the transaction
// fence. Current-work revision alone cannot identify a replaced proposal.
export function aiCandidateKey(candidate){
 if(!candidate)return '';
 return JSON.stringify([candidate.expectedRevision,candidate.createdAt||null,candidate.changedFields,candidate.proposal]);
}

export function createAIPresentationCandidate(current,proposal,{createdAt=null,materialVersions={}}={}){
 if(!current||!proposal||current.topicId!==proposal.topicId||!Number.isSafeInteger(current.revision)||!validMaterialVersions(materialVersions))reject('INVALID_OUTPUT');
 const changedFields=AI_FIELDS.filter(field=>!equal(current[field],proposal[field]));
 if(!changedFields.length)return null;
 return {schemaVersion:AI_CANDIDATE_SCHEMA_VERSION,expectedRevision:current.revision,changedFields,proposal:presentationContent({...proposal,revision:current.revision}),materialVersions:clone(materialVersions),createdAt};
}

export function validAIPresentationCandidate(candidate,allowed){
 if(!record(candidate)||candidate.schemaVersion!==AI_CANDIDATE_SCHEMA_VERSION||!Number.isSafeInteger(candidate.expectedRevision)||candidate.expectedRevision<0)return false;
 if(!Array.isArray(candidate.changedFields)||!candidate.changedFields.length||new Set(candidate.changedFields).size!==candidate.changedFields.length||candidate.changedFields.some(field=>!AI_FIELDS.includes(field)))return false;
 if(!record(candidate.proposal)||!validMaterialVersions(candidate.materialVersions))return false;
 const pseudo={...candidate.proposal,revision:candidate.expectedRevision};return isStoredAIPresentation(pseudo,allowed);
}

export function publicAIPresentationCandidate(row,allowed,currentVersions={}){
 const candidate=row?.candidate;if(!validAIPresentationCandidate(candidate,allowed))return null;
 return {schemaVersion:candidate.schemaVersion,expectedRevision:candidate.expectedRevision,changedFields:[...candidate.changedFields],proposal:clone(candidate.proposal),createdAt:candidate.createdAt||null,stale:row.revision!==candidate.expectedRevision||!equal(candidate.materialVersions,currentVersions)};
}

export function applyAIPresentationCandidate(row,{decisions,expectedRevision,expectedCandidateKey},allowed,currentVersions,clock){
 const visible=publicAIPresentationCandidate(row,allowed,currentVersions);
 if(!visible||typeof expectedCandidateKey!=='string'||expectedCandidateKey!==aiCandidateKey(visible)||visible.stale||!Number.isSafeInteger(expectedRevision)||row.revision!==expectedRevision||visible.expectedRevision!==expectedRevision)reject('STALE_BASE');
 if(!record(decisions)||Object.keys(decisions).length!==visible.changedFields.length||visible.changedFields.some(field=>!Object.hasOwn(decisions,field)||!['adopt','keep'].includes(decisions[field]))||Object.keys(decisions).some(field=>!visible.changedFields.includes(field)))reject('INVALID_OUTPUT');
 const next=clone(row),adopted=visible.changedFields.filter(field=>decisions[field]==='adopt'),kept=visible.changedFields.filter(field=>decisions[field]==='keep');
 for(const field of adopted)next[field]=clone(visible.proposal[field]);
 if(adopted.length)next.evidenceEntryIds=[...new Set([...(row.evidenceEntryIds||[]),...(visible.proposal.evidenceEntryIds||[])])];
 delete next.candidate;next.needsUpdate=false;next.stale=false;next.revision=row.revision+1;next.protections={...(row.protections||{}),...Object.fromEntries(visible.changedFields.map(field=>[field,true]))};next.userEditedAt=clock;next.updatedAt=clock;
 return {next,changed:true,revision:next.revision,adopted,kept};
}
