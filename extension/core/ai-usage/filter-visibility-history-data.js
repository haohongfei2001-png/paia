import {exact,integer} from './qwen-request-data.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {equal,validateCoverage} from './contracts.js';
// A closed metadata profile, not a generic object-size exemption. Unknown row
// annotations/body/note are rejected rather than copied into retained proof.
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const list=(x,n)=>Array.isArray(x)&&x.length>0&&x.length<=n&&x.every(id)&&new Set(x).size===x.length;
const position=x=>Array.isArray(x)&&x.length>=2&&x.length<=12&&x.every(v=>typeof v==='string'?v.length<=200:typeof v==='number'&&Number.isFinite(v));
const rowRequired=['id','documentId','authorship','userEdited','filterOverride','presence','evaluationRevision','pendingKey','decision','reasonCode','filterVersion','policyVersion','classifierVersion','basedOnContentRevision','aiOperationId'];
const rowFields=[...rowRequired,'presenceInvalid','evaluatedAt','failed','decisionSequence'];
function row(r){
 return exact(r,rowFields,rowRequired)&&id(r.id)&&id(r.documentId)&&id(r.aiOperationId)&&r.authorship==='untouched'&&r.userEdited===false&&r.filterOverride==='none'&&r.decision==='uncertain'&&['context_insufficient','rule_no_match'].includes(r.reasonCode)&&r.filterVersion===1&&r.policyVersion===2&&r.classifierVersion==='deterministic-light-2'&&['evaluationRevision','pendingKey','basedOnContentRevision'].every(k=>integer(r[k]))&&(!Object.hasOwn(r,'presenceInvalid')||r.presenceInvalid===false)&&(!Object.hasOwn(r,'failed')||r.failed===false)&&(!Object.hasOwn(r,'decisionSequence')||integer(r.decisionSequence))&&(!Object.hasOwn(r,'evaluatedAt')||typeof r.evaluatedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(r.evaluatedAt))&&exact(r.presence,['version','attachment','reference','confidence'])&&r.presence.version===1&&r.presence.attachment==='absent'&&r.presence.reference==='absent'&&r.presence.confidence==='verified';
}
export function validFilterVisibilityHistoryData(d){
 try{
  if(!exact(d,['version','kind','databaseId','restoreEpoch','origin','request','identity','consentEpoch','publication','settlement'])||d.version!==1||d.kind!=='ai-filter-joined-visibility-v1'||!id(d.databaseId)||!(d.restoreEpoch===null||id(d.restoreEpoch))||!id(d.origin)||!id(d.consentEpoch))return false;
  clientDeclarationRequestData(d.request);if(d.request.jobType!=='AI_MAINTENANCE')return false;
  if(!exact(d.identity,['principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','requestHash'])||!Object.values(d.identity).every(id)||d.identity.tier!=='pro'||!['principalId','libraryId','operationId','jobType'].every(k=>d.identity[k]===d.request[k]))return false;
  const p=d.publication;if(!exact(p,['operationId','scope','decisions','epochs','policy','proof','filtered'])||!id(p.operationId)||!exact(p.scope,['candidateIds','neighborIds'])||!list(p.scope.candidateIds,8)||!list(p.scope.neighborIds,2)||p.scope.neighborIds.some(x=>p.scope.candidateIds.includes(x)))return false;
  if(!exact(p.epochs,['entitlement','optIn','processing','userRead'])||!Object.values(p.epochs).every(id)||!exact(p.policy,['version','qualificationId'])||p.policy.version!=='pro-ambiguous-1'||!id(p.policy.qualificationId))return false;
  if(!Array.isArray(p.decisions)||p.decisions.length!==p.scope.candidateIds.length||p.decisions.some(x=>!exact(x,['inputId','decision'])||!p.scope.candidateIds.includes(x.inputId)||!['FILTER','KEEP','INSUFFICIENT'].includes(x.decision))||new Set(p.decisions.map(x=>x.inputId)).size!==p.decisions.length)return false;
  if(!Array.isArray(p.filtered)||!p.filtered.length||p.filtered.length>8||p.filtered.some(x=>!exact(x,['inputId','sequence'])||!integer(x.sequence)||!p.decisions.some(z=>z.inputId===x.inputId&&z.decision==='FILTER'))||new Set(p.filtered.map(x=>x.inputId)).size!==p.filtered.length||p.filtered.length!==p.decisions.filter(x=>x.decision==='FILTER').length)return false;
  const proof=p.proof;if(!exact(proof,['gateEpoch','restore','snapshot','neighbors'])||!integer(proof.gateEpoch)||proof.restore!==d.restoreEpoch||!exact(proof.snapshot,['policyEpoch','items'])||!integer(proof.snapshot.policyEpoch)||!Array.isArray(proof.snapshot.items)||proof.snapshot.items.length!==p.scope.candidateIds.length)return false;
  for(const x of proof.snapshot.items)if(!exact(x,['inputId','contentRevision','lastRemovalSequence','sourceRecordIds','identities','row','bodyBytes','position'])||!p.scope.candidateIds.includes(x.inputId)||!integer(x.contentRevision)||!integer(x.lastRemovalSequence)||!integer(x.bodyBytes)||x.bodyBytes>4096||!list(x.sourceRecordIds,1)||!list(x.identities,1)||!position(x.position)||!row(x.row)||x.row.id!==x.inputId||x.row.aiOperationId!==p.operationId)return false;
  if(!equal(proof.snapshot.items.map(x=>x.inputId).sort(),[...p.scope.candidateIds].sort())||!Array.isArray(proof.neighbors)||proof.neighbors.length!==p.scope.neighborIds.length)return false;
  for(const x of proof.neighbors)if(!exact(x,['inputId','documentId','contentRevision','lastRemovalSequence','sourceRecordIds','identities','position'])||!p.scope.neighborIds.includes(x.inputId)||!id(x.documentId)||!integer(x.contentRevision)||!integer(x.lastRemovalSequence)||!list(x.sourceRecordIds,1)||!list(x.identities,1)||!position(x.position))return false;
  if(!equal(proof.neighbors.map(x=>x.inputId).sort(),[...p.scope.neighborIds].sort())||!exact(d.settlement,['jobId','childId','units','outcome'])||d.settlement.jobId!==d.request.jobId||d.settlement.childId!==d.request.operationId||d.settlement.outcome!=='COMMITTED'||d.settlement.units.length>8)return false;
  validateCoverage(d.settlement.units,'AI_MAINTENANCE');return d.settlement.units.every(u=>u.facet==='filter');
 }catch{return false;}
}
