import {equal,exact,fail,integer,opaque} from './contracts.js';

const fields=['receiptId','jobId','outcome','children'];
const binding=r=>Object.fromEntries(['jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childCount'].map(k=>[k,r[k]]));
const ordered=children=>[...children].sort((a,b)=>a.operationId.localeCompare(b.operationId));
export function snapshotResultEvidence(value){
 exact(value,fields);
 if(!opaque(value.receiptId)||!opaque(value.jobId)||!['COMMITTED','FAILED'].includes(value.outcome)||!Array.isArray(value.children)||value.children.length<1||value.children.length>4)fail('RESULT_INVALID');
 const seen=new Set();
 for(const child of value.children){exact(child,['operationId','receiptId']);if(!opaque(child.operationId)||!(child.receiptId===null||opaque(child.receiptId))||seen.has(child.operationId))fail('RESULT_INVALID');seen.add(child.operationId);}
 return structuredClone(value);
}
function qualifiedGroup(anchor,group,e){
 const r=anchor.request;
 if(r.childIndex!==0||!integer(r.childCount)||r.childCount<1||r.childCount>4||group.length>r.childCount||e.jobId!==r.jobId||group.some(row=>!equal(binding(row.request),binding(r))||!integer(row.request.childIndex)||row.request.childIndex>=r.childCount)||new Set(group.map(row=>row.request.childIndex)).size!==group.length)fail('RESULT_SCOPE_INCOMPLETE');
 if(group.some(row=>!['SETTLED','CANCELLED_BEFORE_DISPATCH'].includes(row.state)))fail('RESULT_SCOPE_INCOMPLETE');
 if(group.some(row=>row.state==='SETTLED'&&!['VALIDATED','FAILED'].includes(row.settlement?.outcome)))fail('RESULT_SCOPE_INCOMPLETE');
 if(e.outcome==='COMMITTED'&&(group.length!==r.childCount||group.some(row=>row.state!=='SETTLED'||row.settlement.outcome!=='VALIDATED')))fail('RESULT_SCOPE_INCOMPLETE');
 const expected=group.map(row=>({operationId:row.request.operationId,receiptId:row.state==='SETTLED'?row.settlement.receiptId:null}));
 if(!equal(ordered(e.children),ordered(expected)))fail('RESULT_SCOPE_INCOMPLETE');
}
// Additive metadata on the original child-zero row. Spend receipts, pricing,
// operation states and dispatch history are immutable. No body or second ledger.
export function validateResultHistory(state,now){
 const groups=new Map(),receipts=new Set();
 for(const row of state.rows){
  if(Object.hasOwn(row,'resultResolution')!==Object.hasOwn(row,'resultResolvedAt'))fail('RESULT_HISTORY_INVALID');
  const id=row?.request?.jobId,group=groups.get(id)||[];group.push(row);groups.set(id,group);for(const receipt of [row?.settlement?.receiptId,row?.unknownReceipt?.receiptId])if(receipt)receipts.add(receipt);}
 for(const group of groups.values()){
  const anchors=group.filter(row=>Object.hasOwn(row,'resultResolution'));
  if(!anchors.length)continue;
  if(anchors.length!==1)fail('RESULT_HISTORY_INVALID');
  const anchor=anchors[0],e=snapshotResultEvidence(anchor.resultResolution);
  qualifiedGroup(anchor,group,e);
  if(receipts.has(e.receiptId))fail('RECEIPT_REBOUND');receipts.add(e.receiptId);
  if(!integer(anchor.resultResolvedAt)||anchor.resultResolvedAt>now||group.some(row=>!integer(row.settledAt??row.reservedAt)||anchor.resultResolvedAt<(row.settledAt??row.reservedAt)))fail('RESULT_HISTORY_INVALID');
  if(e.outcome==='COMMITTED'?(anchor.resultCommitted!==true||anchor.resultCommittedAt!==anchor.resultResolvedAt):anchor.resultCommitted===true||['resultCommittedAt','resultDayId','resultTimeZone'].some(key=>Object.hasOwn(anchor,key)))fail('RESULT_HISTORY_INVALID');
  if(group.some(row=>row!==anchor&&row.resultCommitted===true))fail('RESULT_HISTORY_INVALID');
 }
}
export function resolveLedgerResult(state,request,evidence,now,window){
 const anchor=state.rows.find(row=>row.request.operationId===request.operationId);
 if(!anchor||!equal(anchor.request,request))fail('OPERATION_REBOUND');
 const group=state.rows.filter(row=>row.request.jobId===request.jobId);
 qualifiedGroup(anchor,group,evidence);
 const prior=group.find(row=>Object.hasOwn(row,'resultResolution'));
 if(prior){if(prior!==anchor||!equal(prior.resultResolution,evidence))fail('RESULT_CONFLICT');return anchor;}
 if(group.some(row=>row.resultCommitted))fail('RESULT_CONFLICT');
 if(state.rows.some(row=>[row.settlement?.receiptId,row.unknownReceipt?.receiptId,row.resultResolution?.receiptId].includes(evidence.receiptId)))fail('RECEIPT_REBOUND');
 anchor.resultResolution=structuredClone(evidence);anchor.resultResolvedAt=now;
 if(evidence.outcome==='COMMITTED'){
  anchor.resultCommitted=true;anchor.resultCommittedAt=now;
  if(window){anchor.resultDayId=window.dayId;anchor.resultTimeZone=window.timeZone;}
 }
 return anchor;
}
