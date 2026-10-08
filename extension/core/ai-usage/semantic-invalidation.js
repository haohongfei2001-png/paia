import {prefix} from '../thought-model.js';
const LIMIT=100;
const stores=['meta','organizerJobs','organizerUsage'];
const integer=x=>Number.isSafeInteger(x)&&x>=0;
// This local evidence fence grants neither processing nor financial authority.
// Overflow is deliberately all-or-nothing; existing current() remains mandatory.
export async function invalidateSemanticJobs(t,changedEvidence=new Map()){
 if(!stores.every(name=>t.tx.objectStoreNames.contains(name)))return {status:'UNSUPPORTED',checked:0,cancelled:0};
 const page=await t.rangePage('organizerJobs','byMaintenance',prefix(['ai_usage_v1',0]),null,LIMIT);
 if(page.next!==null)return {status:'INCOMPLETE',reason:'SCAN_BOUND',checked:0,cancelled:0};
 if(!page.rows.length)return {status:'CHECKED',checked:0,cancelled:0,unsupported:0};
 const restore=await t.get('meta','recovery-restore-epoch'),gate=await t.get('meta','gate');
 let cancelled=0,unsupported=0;
 for(const {value:job}of page.rows){
  if(job.kind!=='ai_usage_v1'||job.version!==1||job.cancelEpoch!==0||!Array.isArray(job.items)||!job.items.length||job.items.length>100||!Array.isArray(job.childIds)||!job.childIds.length||job.childIds.length>4||!job.authority){unsupported++;continue;}
  const a=job.authority;
  // A human fence alone remains rebindable through the existing plan owner.
  // It is not evidence that this job's semantic inputs changed.
  let stale=false;
  if(typeof a.restoreEpoch==='string'&&typeof restore?.value==='string'&&a.restoreEpoch!==restore.value)stale=true;
  if(gate&&typeof gate.enabled==='boolean'&&a.gateEpoch!==undefined&&gate.epoch!==undefined&&(gate.enabled===false||a.gateEpoch!==gate.epoch))stale=true;
  for(const item of job.items){
   if(typeof item.key!=='string'||typeof item.signature!=='string')continue;
   // The semantic writer supplies only rows already validated and written in
   // this same transaction. No cross-transaction cache or historical scan.
   const known=changedEvidence.get(item.key);
   if(known?.version===1&&known.descriptor?.key===item.key&&typeof known.signature==='string'&&(known.signature!==item.signature||known.descriptor.removed===true))stale=true;
  }
  if(!stale)continue;
  const receipts=[];let valid=true;
  for(const childId of job.childIds){const row=await t.get('organizerUsage','aiu:attempt:'+childId),fence=await t.get('meta','aiu:dispatched:'+childId);if(fence&&(!row||!row.attemptCount))valid=false;if(row&&(row.kind!=='ai_usage_v1'||row.jobId!==job.id||row.childId!==childId||!integer(row.attemptCount)))valid=false;receipts.push(row);}
  if(!valid){unsupported++;continue;}
  let dispatched=false,unknown=false;
  for(const receipt of receipts){if(!receipt)continue;
   if(receipt.state==='COMMITTED'){dispatched||=receipt.attemptCount>0;continue;}
   if(receipt.attemptCount){dispatched=true;if(['DISPATCHED','OUTCOME_UNKNOWN'].includes(receipt.state)){receipt.state='OUTCOME_UNKNOWN';unknown=true;}else if(receipt.state!=='COMMITTED'){receipt.state='EXPIRED_UNCOMMITTED';receipt.stateKey=1;}receipt.spendState='RESERVATION_RETAINED';}
   else{receipt.state='CANCELLED_BEFORE_DISPATCH';receipt.stateKey=1;receipt.spendState='RELEASED_BEFORE_DISPATCH';}
   await t.put('organizerUsage',receipt);
  }
  job.cancelEpoch++;job.state=unknown?'OUTCOME_UNKNOWN':dispatched?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';job.stateKey=unknown?0:1;await t.put('organizerJobs',job);cancelled++;
 }
 return {status:unsupported?'INCOMPLETE':'CHECKED',checked:page.rows.length,cancelled,unsupported};
}
