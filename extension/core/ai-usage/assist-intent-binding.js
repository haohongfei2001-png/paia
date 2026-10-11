import {canonical,exact,equal,fail,token,ASSIST_RESULT_KIND,HISTORICAL_CANDIDATE_KIND,validateReplyObligation,validateCandidateObligation} from './contracts.js';
import {organizeCoverageId} from './organize-style-binding.js';
const opaqueId=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(x);
export function validateAssistIntent(type,binding){
 if(type!=='AI_ASSIST')fail();
 exact(binding,['version','sessionId','leaseId','replyId','replyGeneration','consentEpoch','permissionEpoch']);
 if(binding.version!==1||!['sessionId','leaseId','replyId','consentEpoch','permissionEpoch'].every(k=>opaqueId(binding[k]))||!Number.isSafeInteger(binding.replyGeneration)||binding.replyGeneration<1)fail();
 return binding;
}
export function validateHistoricalIntent(type,binding){
 if(type!=='AI_ASSIST')fail();
 exact(binding,['version','evaluationKey','consentEpoch','permissionEpoch']);
 if(binding.version!==1||!token(binding.evaluationKey)||!opaqueId(binding.consentEpoch)||!opaqueId(binding.permissionEpoch))fail();
 return binding;
}
// Constructor-injected trusted local lease owner only. No production resolver
// exists yet. Next consent, arbitrary caller assertions, and a body hash cannot
// establish this separate remote-processing authorization.
export async function assertAssistIntent(foundation,t,job){
 if(Object.hasOwn(job,'historicalIntent')||job.kind===HISTORICAL_CANDIDATE_KIND){
  if(job.type!=='AI_ASSIST'||job.kind!==HISTORICAL_CANDIDATE_KIND||Object.hasOwn(job,'assistIntent')||Object.hasOwn(job,'replyObligation')||typeof foundation.resolveHistoricalIntent!=='function')fail('UNAVAILABLE');
  const binding=validateHistoricalIntent(job.type,job.historicalIntent),scope={evidenceKeys:job.items.map(i=>i.key).sort(),coverage:job.coverage,candidateObligation:validateCandidateObligation(job.candidateObligation)};
  const resolved=await foundation.resolveHistoricalIntent(t,structuredClone({binding,scope}));
  exact(resolved,['allowed','remoteProcessing','binding','scope']);
  if(resolved.allowed!==true||resolved.remoteProcessing!==true)fail('UNAVAILABLE');
  validateHistoricalIntent(job.type,resolved.binding);
  if(!equal(resolved.binding,binding)||!equal(resolved.scope,scope))fail('STALE_BASE');
  return;
 }
 if(job.type!=='AI_ASSIST'){if(Object.hasOwn(job,'assistIntent'))fail();return;}
 if(!job.assistIntent||typeof foundation.resolveAssistIntent!=='function')fail('UNAVAILABLE');
 const binding=validateAssistIntent(job.type,job.assistIntent);
 const scope={evidenceKeys:job.items.map(i=>i.key).sort(),coverage:job.coverage,...(job.kind===ASSIST_RESULT_KIND?{replyObligation:validateReplyObligation(job.replyObligation)}:{})};
 const resolved=await foundation.resolveAssistIntent(t,structuredClone({binding,scope}));
 exact(resolved,['allowed','remoteProcessing','binding','scope']);
 if(resolved.allowed!==true||resolved.remoteProcessing!==true)fail('UNAVAILABLE');
 validateAssistIntent(job.type,resolved.binding);
 if(!equal(resolved.binding,binding)||!equal(resolved.scope,scope))fail('STALE_BASE');
}
export function qualifiedCoverageId(unit,job=null){
 // Legacy and styled Organize namespaces are deliberately unchanged.
 return job?.type==='AI_ASSIST'&&job.assistIntent?'aiu:assist-coverage:'+canonical([job.id,unit.key,unit.facet,unit.scope]):organizeCoverageId(unit,job);
}
