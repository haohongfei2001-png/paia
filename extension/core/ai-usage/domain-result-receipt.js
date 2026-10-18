import {qualifiedCoverageId} from './assist-intent-binding.js';
import {equal,exact,fail,isAssistResultJob,isHistoricalCandidateJob,isPrivateResultJob,opaque,unitKey,validateCoverage} from './contracts.js';

// Durable acknowledgement shape written only after the original transport's
// private observation was checked. A boolean alone is not cancellation evidence.
export function savedFinancialCancellation(row){
 try{const a=row?.financialCancellationEvidence;exact(a,['decision','operationId','state','reservationMicros','window','financialAuthority','dispatchAllowed','retryAllowed'],['decision','operationId','state','reservationMicros','financialAuthority','dispatchAllowed','retryAllowed']);
  return row.executionKind==='server-backed'&&row.financialCancellation===true&&a.decision==='cancelled'&&a.operationId===row.childId&&a.operationId===row.financialRequest?.operationId&&a.state==='CANCELLED_BEFORE_DISPATCH'&&Number.isSafeInteger(a.reservationMicros)&&a.reservationMicros>=0&&['financialAuthority','dispatchAllowed','retryAllowed'].every(k=>a[k]===false);
 }catch{return false;}
}

const terminal=new Set(['COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED']);
// Private, body-free metadata on the ORIGINAL transient job. This is a local
// domain receipt, never a provider spend receipt, entitlement or remote grant.
// Call only in the original transaction after its domain/ACK/child writes.
export async function domainResultReceipt(t,job){
 if(!terminal.has(job.state))return null;
 // Legacy transient rows keep their original lifecycle, without a new receipt.
 if(!/^aiu:job:[a-f0-9]{64}$/.test(job.id))return null;
 if(!Array.isArray(job.childIds)||!job.childIds.length||job.childIds.length>4||new Set(job.childIds).size!==job.childIds.length||job.childCoverage?.length!==job.childIds.length)fail('RESULT_SCOPE_INCOMPLETE');
 const children=[];
 for(let i=0;i<job.childIds.length;i++){
  const operationId=job.childIds[i],r=await t.get('organizerUsage','aiu:attempt:'+operationId);
  if(!r){if(job.state!=='CANCELLED_BEFORE_DISPATCH'||job.cancelEpoch<1)fail('RESULT_SCOPE_INCOMPLETE');children.push({operationId,state:'CANCELLED_BEFORE_DISPATCH',executionKind:null,operationReceiptId:null});continue;}
  if(r.kind!=='ai_usage_v1'||r.version!==1||r.jobId!==job.id||r.childId!==operationId||r.sequence!==i||!terminal.has(r.state))fail('RESULT_SCOPE_INCOMPLETE');
  if(r.attemptCount===0){if(!['COMMITTED','CANCELLED_BEFORE_DISPATCH'].includes(r.state)||r.state==='COMMITTED'&&(r.executionKind!=='local'||r.spendState!=='NO_PROVIDER_COST'))fail('RESULT_SCOPE_INCOMPLETE');}
  else if(r.attemptCount!==1||!opaque(r.operationReceiptId)&&!(r.state==='CANCELLED_BEFORE_DISPATCH'&&savedFinancialCancellation(r)))fail('RESULT_SCOPE_INCOMPLETE');
  children.push({operationId,state:r.state,executionKind:r.executionKind,operationReceiptId:r.operationReceiptId??null});
 }
 let outcome='FAILED';
 if(job.state==='COMMITTED'){
  if(job.cancelEpoch!==0||children.some(c=>c.state!=='COMMITTED'))fail('RESULT_SCOPE_INCOMPLETE');
  if(isPrivateResultJob(job)){
   const assist=isAssistResultJob(job),historical=isHistoricalCandidateJob(job),field=assist?'replyObligation':'candidateObligation';
   const ack=await t.get('organizerWorkItems',(assist?'aiu:assist-result:':'aiu:historical-result:')+job.id);
   if(!assist&&!historical||job.resultCommitted!==true||!ack||ack.kind!==job.kind||ack.version!==1||ack.jobId!==job.id||ack.childId!==job.childIds[0]||ack.state!=='ACKNOWLEDGED'||ack.sequence!==0||!equal(ack[field],job[field])||ack.outcome!==job.resultOutcome||![assist?'SUGGESTION':'CANDIDATES','DEFER'].includes(ack.outcome))fail('RESULT_SCOPE_INCOMPLETE');
   outcome=ack.outcome==='DEFER'?'FAILED':'COMMITTED';
  }else{
   const coverage=validateCoverage(job.coverage,job.type),keys=coverage.map(unitKey).sort();
   if(!equal([...job.committedCoverage].sort(),keys)||!equal(job.childCoverage.flatMap(c=>validateCoverage(c,job.type)).map(unitKey).sort(),keys))fail('RESULT_SCOPE_INCOMPLETE');
   let effective=false;
   for(const unit of coverage){
    const ack=await t.get('organizerWorkItems',qualifiedCoverageId(unit,job)),item=job.items.find(i=>i.key===unit.key),index=job.childCoverage.findIndex(c=>c.some(u=>equal(u,unit)));
    if(!ack||ack.kind!=='ai_usage_v1'||ack.jobId!==job.id||ack.state!=='ACKNOWLEDGED'||ack.sequence!==index||!equal(ack.unit,unit)||ack.signature!==item?.signature||!['COMMITTED','NO_CHANGE'].includes(ack.outcome))fail('RESULT_SCOPE_INCOMPLETE');
    effective||=ack.outcome==='COMMITTED';
   }
   outcome=effective?'COMMITTED':'FAILED';
  }
 }
 return {version:1,receiptId:'aiu:domain:'+job.id,jobId:job.id,outcome,localState:job.state,binding:{principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,jobType:job.type,contractVersion:job.contractVersion,routeVersion:job.routeVersion},children};
}

// Replay reads the ORIGINAL transactional event. Later edits or a later job's
// coverage ACK do not undo a completed event and cannot authorize body reads.
export async function savedDomainResultReceipt(t,job){
 const r=job.domainResultReceipt;if(!r)return null;
 exact(r,['version','receiptId','jobId','outcome','localState','binding','children']);
 if(!/^aiu:job:[a-f0-9]{64}$/.test(job.id)||r.version!==1||r.receiptId!=='aiu:domain:'+job.id||!opaque(r.receiptId)||r.jobId!==job.id||!['COMMITTED','FAILED'].includes(r.outcome)||r.localState!==job.state||!terminal.has(r.localState)||!equal(r.binding,{principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,jobType:job.type,contractVersion:job.contractVersion,routeVersion:job.routeVersion})||!Array.isArray(r.children)||r.children.length!==job.childIds.length)fail('RESULT_CONFLICT');
 if(r.outcome==='COMMITTED'&&r.localState!=='COMMITTED')fail('RESULT_CONFLICT');
 for(let i=0;i<r.children.length;i++){
  const c=r.children[i];exact(c,['operationId','state','executionKind','operationReceiptId']);const row=await t.get('organizerUsage','aiu:attempt:'+job.childIds[i]);
  if(c.operationId!==job.childIds[i])fail('RESULT_CONFLICT');
  if(!row){if(c.state!=='CANCELLED_BEFORE_DISPATCH'||c.executionKind!==null||c.operationReceiptId!==null)fail('RESULT_CONFLICT');continue;}
  // The original local cancellation can have no attempt row. An exact
  // original-owner recovery adds financial evidence without rewriting that
  // already-issued FAILED domain event or claiming a recovered body.
  const financialOnly=c.state==='CANCELLED_BEFORE_DISPATCH'&&c.executionKind===null&&c.operationReceiptId===null&&r.outcome==='FAILED'&&row.executionKind==='server-backed'&&(savedFinancialCancellation(row)||row.financialSettlement?.state==='SETTLED'&&row.financialSettlementEvidence?.receiptId===row.operationReceiptId);
  if(row.kind!=='ai_usage_v1'||row.version!==1||row.jobId!==job.id||row.childId!==c.operationId||row.sequence!==i||row.state!==c.state||!financialOnly&&(row.executionKind!==c.executionKind||(row.operationReceiptId??null)!==c.operationReceiptId))fail('RESULT_CONFLICT');
 }
 return structuredClone(r);
}
