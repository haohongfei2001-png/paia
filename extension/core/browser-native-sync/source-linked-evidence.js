import {clone,exact,equal,fail,hash,identifier,plain,count} from './value.js';
// One finite original-owner evidence edge. Device-local keyed tokens and epoch
// never cross the wire; the destination recomputes them through evidenceFor.
const fields=['inputId','basedOnContentRevision','selectedFields','fieldDigests','role','sourceRecordIds','sourceIdentityTokens'];
export function validateSourceLinkedEvidence(value){
 if(!plain(value)||!exact(value,fields)||Object.keys(value).length!==fields.length||!identifier(value.inputId)||!count(value.basedOnContentRevision)||value.role!=='primary'||!Array.isArray(value.selectedFields)||!value.selectedFields.length||value.selectedFields.length>2||new Set(value.selectedFields).size!==value.selectedFields.length||value.selectedFields.some(x=>!['body','note'].includes(x))||!equal(value.selectedFields,[...value.selectedFields].sort())||!plain(value.fieldDigests)||!exact(value.fieldDigests,value.selectedFields)||Object.keys(value.fieldDigests).length!==value.selectedFields.length||Object.values(value.fieldDigests).some(x=>!hash(x))||!Array.isArray(value.sourceRecordIds)||value.sourceRecordIds.length!==1||!identifier(value.sourceRecordIds[0])||!Array.isArray(value.sourceIdentityTokens)||value.sourceIdentityTokens.length!==1||!hash(value.sourceIdentityTokens[0]))fail('BNS_SOURCE_LINKED_EVIDENCE_INVALID');return value;
}
export function orderedSourceLinkedEvidence(value){validateSourceLinkedEvidence(value);return Object.fromEntries(fields.map(key=>[key,key==='fieldDigests'?Object.fromEntries(value.selectedFields.map(field=>[field,value.fieldDigests[field]])):clone(value[key])]));}
export function portableSourceLinkedEvidence(evidence){
 if(!Array.isArray(evidence)||evidence.length!==1||!plain(evidence[0])||!exact(evidence[0],[...fields,'scopeToken','versionToken','epoch'])||Object.keys(evidence[0]).length!==fields.length+3||!hash(evidence[0].scopeToken)||!hash(evidence[0].versionToken)||!count(evidence[0].epoch))fail('BNS_SOURCE_LINKED_EVIDENCE_INVALID');
 return validateSourceLinkedEvidence(Object.fromEntries(fields.map(key=>[key,clone(evidence[0][key])])));
}
export async function restoreSourceLinkedEvidence(store,wire){
 const value=validateSourceLinkedEvidence(clone(wire));if(typeof store?.evidenceFor!=='function')fail('BNS_SOURCE_LINKED_EVIDENCE_INVALID');
 const evidence=await store.evidenceFor([{inputId:value.inputId,role:value.role,selectedFields:value.selectedFields}]);if(!equal(portableSourceLinkedEvidence(evidence),value))fail('BNS_SOURCE_LINKED_EVIDENCE_CHANGED');return evidence;
}
// Typed pair identity for the single-edge named owner. This is portable data,
// not permission to create provenance rows or replay a canonical mutation.
export function sourceLinkedDescriptor(provenance,dependency){
 const p=provenance,d=dependency,evidence=portableSourceLinkedEvidence([{inputId:p.inputId,basedOnContentRevision:p.basedOnContentRevision,selectedFields:p.actualVersion.selectedFields,fieldDigests:p.actualVersion.fieldDigests,role:p.role,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.sourceIdentityTokens,scopeToken:p.scopeToken,versionToken:p.versionToken,epoch:d.eligibilityEpochAtUse}]);
 return validateSourceLinkedDescriptor({id:p.ownerId,version:p.contributionType==='exact_excerpt'?2:1,evidence,provenanceId:p.id,generationId:p.generationId,at:p.generatedAt,...(p.contributionType==='exact_excerpt'?{span:clone(p.span)}:{})});
}
export function validateSourceLinkedDescriptor(value){
 if(!plain(value)||!exact(value,['id','version','evidence','provenanceId','generationId','at',...(value.version===2?['span']:[])])||Object.keys(value).length!==(value.version===2?7:6)||![1,2].includes(value.version)||![value.id,value.provenanceId,value.generationId].every(identifier)||typeof value.at!=='string'||!Number.isFinite(Date.parse(value.at)))fail('BNS_SOURCE_LINKED_EVIDENCE_INVALID');validateSourceLinkedEvidence(value.evidence);if(value.version===2&&(!plain(value.span)||!exact(value.span,['field','start','end','full'])||Object.keys(value.span).length!==4||value.span.field!=='body'||!count(value.span.start)||!count(value.span.end)||value.span.end<=value.span.start||typeof value.span.full!=='boolean'))fail('BNS_SOURCE_LINKED_EVIDENCE_INVALID');return value;
}
