import {qualifiedCoverageId} from './assist-intent-binding.js';
import {canonical,digest,equal,fail,opaque,unitKey,validateCoverage,CHILD_LIMITS} from './contracts.js';

// A read-only bridge to the existing domain owner, not a financial verifier.
// No receipt is persisted and no entitlement, remote route or dispatch is granted.
const answer=(status,evidence=null)=>({status,dispatchAllowed:false,financialAuthority:false,evidence});
export async function readDomainCommitEvidence(foundation,jobId){
 if(!opaque(jobId))fail();
 if(typeof foundation?.read!=='function'||typeof foundation?.current!=='function')fail('UNAVAILABLE');
 const snapshot=await foundation.read(async t=>{
  const job=await t.get('organizerJobs',jobId);
  if(!job||job.id!==jobId||job.kind!=='ai_usage_v1'||job.version!==1)return answer('UNSUPPORTED');
  // Reuse consent, gate/restore/human epochs, revisions and source presence in
  // this same transaction. Read failures propagate; stale authority is not proof.
  await foundation.current(t,job);
  if(job.state!=='COMMITTED'||job.cancelEpoch!==0)return answer('INCOMPLETE');
  const coverage=validateCoverage(job.coverage,job.type),keys=coverage.map(unitKey).sort();
  if(!equal([...job.committedCoverage].sort(),keys)||!Array.isArray(job.childIds)||!job.childIds.length||job.childIds.length>CHILD_LIMITS[job.type]||new Set(job.childIds).size!==job.childIds.length||job.childCoverage?.length!==job.childIds.length)return answer('INCOMPLETE');
  if(!equal(job.childCoverage.flatMap(c=>validateCoverage(c,job.type)).map(unitKey).sort(),keys))return answer('INCOMPLETE');
  const children=[];
  for(let i=0;i<job.childIds.length;i++){
   const id=job.childIds[i],row=await t.get('organizerUsage','aiu:attempt:'+id);
   if(!row||row.kind!=='ai_usage_v1'||row.version!==1||row.jobId!==jobId||row.childId!==id||row.sequence!==i||row.state!=='COMMITTED')return answer('INCOMPLETE');
   if(row.executionKind==='local'&&row.attemptCount===0&&row.spendState==='NO_PROVIDER_COST')children.push({local:true});
   else if(row.executionKind==='fixture'&&row.attemptCount===1&&opaque(row.operationReceiptId)&&opaque(row.parentReservationId))children.push({operationId:id,operationReceiptId:row.operationReceiptId,parentReservationId:row.parentReservationId});
   else return answer('UNSUPPORTED');
  }
  const attempts=children.filter(c=>!c.local);
  if(new Set(attempts.map(c=>c.parentReservationId)).size>1||new Set(attempts.map(c=>c.operationReceiptId)).size!==attempts.length)return answer('INCOMPLETE');
  const acknowledgements=[];
  for(const unit of coverage){
   const row=await t.get('organizerWorkItems',qualifiedCoverageId(unit,job)),item=job.items.find(i=>i.key===unit.key),index=job.childCoverage.findIndex(c=>c.some(u=>unitKey(u)===unitKey(unit)));
   if(!row||row.kind!=='ai_usage_v1'||row.jobId!==jobId||row.state!=='ACKNOWLEDGED'||row.sequence!==index||!equal(row.unit,unit)||!item||row.signature!==item.signature)return answer('INCOMPLETE');
   if(!['COMMITTED','NO_CHANGE'].includes(row.outcome))return answer('UNSUPPORTED');
   acknowledgements.push({unit,signature:row.signature,outcome:row.outcome});
  }
  if(children.every(c=>c.local)||acknowledgements.every(a=>a.outcome==='NO_CHANGE'))return answer('NO_EFFECTIVE_RESULT');
  // Mixed local/remote or mixed NO_CHANGE work needs an explicit result-owner
  // rule before it can be represented as one effective financial result.
  if(children.some(c=>c.local)||acknowledgements.some(a=>a.outcome!=='COMMITTED'))return answer('UNSUPPORTED');
  return {job,children,acknowledgements};
 });
 if(snapshot.status)return snapshot;
 const {job,children,acknowledgements}=snapshot;
 return answer('CANDIDATE_ONLY',{version:1,executionKind:'fixture',jobId,jobType:job.type,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,gateEpoch:job.authority.gateEpoch,restoreEpoch:job.authority.restoreEpoch,humanFence:job.authority.humanFence,contractVersion:job.contractVersion,routeVersion:job.routeVersion,coverageFingerprint:await digest(acknowledgements),children});
}
