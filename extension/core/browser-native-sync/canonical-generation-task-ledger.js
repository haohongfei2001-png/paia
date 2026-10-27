import {readOriginalCommittedTransactionWork,requireOriginalTaskControlScope,requireOriginalTaskControlFailure,registerRepositoryWorkLimit} from '../idb-repository.js';
import {ArchiveError} from '../constants.js';
import {clone,equal,hash} from './value.js';
// Numeric transition rules only. No exported function opens a repository,
// acquires a transaction capability, authenticates a graph or grants a refund.
// The fixed stage/restore consumers persist these transitions under their own
// private authority and supply measured work from the original repository.
export const GENERATION_TASK_LIMITS=Object.freeze({payloadBytes:2*1024*1024,graphReferences:4096,workBytes:16*1024*1024,activeMs:120000,tickets:4096});
export const QUALIFIED_HUMAN_TASK_LIMITS=Object.freeze({...GENERATION_TASK_LIMITS,workBytes:64*1024*1024,closureBytes:8*1024*1024,groups:129,operations:387,items:775});
export function originalGenerationTaskLimits(row){if(!row||![1,2].includes(row.version))fail();return row.version===2?QUALIFIED_HUMAN_TASK_LIMITS:GENERATION_TASK_LIMITS;}
export const CANONICAL_PHASED_TASK='canonical-generation:checkpoint:phased-task:v1';
const own=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const number=v=>Number.isSafeInteger(v)&&v>=0;
const fail=code=>{throw new ArchiveError(code??'GENERATION_TASK_CHANGED');};
export function originalGenerationTaskData(row){
 const limits=originalGenerationTaskLimits(row);
 if(!own(row,['id','version','taskId','identity','phase','tickets','burned','workBytes','activeMs','pending','transportIds',...(row.version===2?['controlSequence','controlBurned','controlPending']:[])])||row.id!==CANONICAL_PHASED_TASK||![1,2].includes(row.version)||typeof row.taskId!=='string'||!row.taskId||!own(row.identity,['manifestId','generationIdentity','sourceBase'])||!hash(row.identity.manifestId)||!['staging','authenticated','validated','applying','verified','failed'].includes(row.phase)||!number(row.tickets)||row.tickets>GENERATION_TASK_LIMITS.tickets||!number(row.burned)||row.burned>row.tickets||!number(row.workBytes)||row.workBytes>limits.workBytes||!number(row.activeMs)||row.activeMs>GENERATION_TASK_LIMITS.activeMs||!Array.isArray(row.transportIds)||row.transportIds.length>GENERATION_TASK_LIMITS.graphReferences||row.transportIds.some(x=>!hash(x))||new Set(row.transportIds).size!==row.transportIds.length)fail();
 const p=row.pending;if(p!==null&&(!own(p,['sequence','kind','bytes','ms'])||p.sequence!==row.tickets||!(row.version===2?['authenticate','validate','owner','verify','rehydrate','publication']:['authenticate','validate','owner','verify']).includes(p.kind)||!number(p.bytes)||p.bytes<1||p.bytes>row.workBytes||p.bytes>(row.version===2&&['rehydrate','publication'].includes(p.kind)?QUALIFIED_HUMAN_TASK_LIMITS.closureBytes:2*1024*1024)||!number(p.ms)||p.ms<1||p.ms>row.activeMs))fail();if(row.version===2){const c=row.controlPending;if(!number(row.controlSequence)||row.controlSequence>16384||!number(row.controlBurned)||row.controlBurned>row.controlSequence||c!==null&&(!own(c,['sequence','bytes','ms'])||c.sequence!==row.controlSequence||c.bytes!==2*1024*1024||c.ms!==30000||c.bytes>row.workBytes||c.ms>row.activeMs))fail();}return row;
}
export function originalGenerationTaskStart(identity){return originalGenerationTaskData({id:CANONICAL_PHASED_TASK,version:1,taskId:crypto.randomUUID(),identity:clone(identity),phase:'staging',tickets:0,burned:0,workBytes:0,activeMs:0,pending:null,transportIds:[]});}
// Numeric constructor only; the original qualified stage alone can persist it.
export function originalQualifiedHumanTaskStart(identity){return originalGenerationTaskData({...originalGenerationTaskStart(identity),version:2,controlSequence:0,controlBurned:0,controlPending:null});}
export function originalGenerationTaskReserve(before,kind,{bytes=2*1024*1024,ms=30000}={}){
 originalGenerationTaskData(before);const limits=originalGenerationTaskLimits(before),closure=before.version===2&&['rehydrate','publication'].includes(kind);if(before.pending||before.phase==='failed'||!(before.version===2?['authenticate','validate','owner','verify','rehydrate','publication']:['authenticate','validate','owner','verify']).includes(kind)||!number(bytes)||bytes<1||bytes>(closure?QUALIFIED_HUMAN_TASK_LIMITS.closureBytes:2*1024*1024)||!number(ms)||ms<1||ms>30000)fail();
 if(before.tickets===GENERATION_TASK_LIMITS.tickets||before.workBytes+bytes>limits.workBytes||before.activeMs+ms>GENERATION_TASK_LIMITS.activeMs)fail('BNS_GROUP_RESOURCE_LIMIT');
 return originalGenerationTaskData({...clone(before),tickets:before.tickets+1,workBytes:before.workBytes+bytes,activeMs:before.activeMs+ms,pending:{sequence:before.tickets+1,kind,bytes,ms}});
}
export function originalGenerationTaskSettle(before,ticket,{bytes,activeMs,transportIds=[]},phase=before.phase){
 originalGenerationTaskData(before);if(!equal(before.pending,ticket)||ticket===null||!number(bytes)||bytes>ticket.bytes||!Number.isFinite(activeMs)||activeMs<0||Math.ceil(activeMs)>ticket.ms||!Array.isArray(transportIds))fail('BNS_GROUP_RESOURCE_LIMIT');
 const ids=[...new Set([...before.transportIds,...transportIds])];return originalGenerationTaskData({...clone(before),phase,workBytes:before.workBytes-ticket.bytes+bytes,activeMs:before.activeMs-ticket.ms+Math.ceil(activeMs),pending:null,transportIds:ids});
}
// A lost response never reclaims a reservation. A fresh explicit consumer may
// burn it once and continue from the committed domain cursor. It cannot refund
// a ticket without the original process's immutable completion evidence.
export function originalGenerationTaskBurn(before){originalGenerationTaskData(before);if(!before.pending)fail();return originalGenerationTaskData({...clone(before),burned:before.burned+1,pending:null});}

// Process-local mutual exclusion complements the durable exact-row CAS. A live
// invocation cannot have its prepaid ticket cold-burned by another instance.
const liveInvocations=new WeakMap();
export function enterOriginalGenerationTaskInvocation(repository){if(liveInvocations.has(repository))fail('GENERATION_TASK_BUSY');const lease=Object.freeze({});liveInvocations.set(repository,lease);return lease;}
export function leaveOriginalGenerationTaskInvocation(repository,lease){if(liveInvocations.get(repository)!==lease)fail('GENERATION_TASK_CHANGED');liveInvocations.delete(repository);}

// Process-local diagnostics only: these totals neither settle nor refund a task.
// Only a genuine completed original transaction may be recorded, once.
const controlWork=new WeakMap(),controlScopes=new WeakSet();
export function recordOriginalGenerationControlWork(repository,scope){
 const work=readOriginalCommittedTransactionWork(repository,scope);if(controlScopes.has(scope))fail('GENERATION_TASK_CHANGED');controlScopes.add(scope);
 const before=controlWork.get(repository)||{transactions:0,references:0,bytes:0,activeMs:0,maxReferences:0,maxBytes:0,maxActiveMs:0};
 controlWork.set(repository,{transactions:before.transactions+1,references:before.references+work.references,bytes:before.bytes+work.bytes,activeMs:before.activeMs+work.activeMs,maxReferences:Math.max(before.maxReferences,work.references),maxBytes:Math.max(before.maxBytes,work.bytes),maxActiveMs:Math.max(before.maxActiveMs,work.activeMs)});
}
export function readOriginalGenerationControlWork(repository){return Object.freeze({...controlWork.get(repository)||{transactions:0,references:0,bytes:0,activeMs:0,maxReferences:0,maxBytes:0,maxActiveMs:0}});}

// A control transaction pays itself before returning any task data. Its exact
// committed scope may settle only its own debt on the next original control
// transaction. Cold process loss burns the old debt, including unobserved work.
// These functions lend no transaction authority. The repository checks the
// private checkpoint/Human/publication token of every participating scope.
const controlReceipts=new WeakMap(),controlPlans=new WeakMap(),controlReads=new WeakMap();
function receiptFor(repository,row){const r=controlReceipts.get(repository);return r&&!r.failed&&r.taskId===row.taskId&&equal(r.identity,row.identity)&&equal(r.pending,row.controlPending)&&equal(r.row,row)?r:null;}
export function prepareOriginalGenerationControl(repository,scope,before,after,{terminal=false}={}){
 requireOriginalTaskControlScope(repository,scope,terminal);originalGenerationTaskData(after);
 // The original publication consumer already prepays its whole closure. Bind
 // terminal settlement to that exact debit; the old control debt below is a
 // separate receipt, never permission to refund the publication reservation.
 let terminalEnvelope=null;
 if(terminal){
  originalGenerationTaskData(before);
  if(before.version!==2||before.phase!=='applying'||before.pending?.kind!=='publication'||before.pending.ms>30000||!equal(after,originalGenerationTaskSettle(before,before.pending,{bytes:before.pending.bytes,activeMs:before.pending.ms},'verified')))fail();
  terminalEnvelope=Object.freeze({...before.pending});
 }
 if(after.version!==2)return after;
 if(controlPlans.has(scope))fail();if(before!==null){originalGenerationTaskData(before);if(before.version!==2||before.taskId!==after.taskId||!equal(before.identity,after.identity)||!equal(before.controlPending,after.controlPending)||before.controlSequence!==after.controlSequence||before.controlBurned!==after.controlBurned)fail();}
 const held=controlReceipts.get(repository);if(held?.failed)fail('BNS_GROUP_RESOURCE_LIMIT');const old=before?.controlPending??null,receipt=old?receiptFor(repository,before):null;
 if(receipt?.reading||receipt?.settling)fail('BNS_GROUP_RESOURCE_LIMIT');if(receipt&&!terminal){const bytes=receipt.pending.bytes-receipt.bytes,ms=Math.floor(receipt.pending.ms-receipt.activeMs);if(bytes<=0||ms<=0)fail('BNS_GROUP_RESOURCE_LIMIT');registerRepositoryWorkLimit(repository,scope,{bytes,ms});}
 let next=clone(after);if(old){if(receipt){if(receipt.bytes>old.bytes||Math.ceil(receipt.activeMs)>old.ms)fail('BNS_GROUP_RESOURCE_LIMIT');next.workBytes-=old.bytes-receipt.bytes;next.activeMs-=old.ms-Math.ceil(receipt.activeMs);}else next.controlBurned++;}
 next.controlPending=null;
 if(!terminal){if(next.controlSequence===16384||next.workBytes+2*1024*1024>QUALIFIED_HUMAN_TASK_LIMITS.workBytes||next.activeMs+30000>QUALIFIED_HUMAN_TASK_LIMITS.activeMs)fail('BNS_GROUP_RESOURCE_LIMIT');next.controlSequence++;next.workBytes+=2*1024*1024;next.activeMs+=30000;next.controlPending={sequence:next.controlSequence,bytes:2*1024*1024,ms:30000};}
 originalGenerationTaskData(next);controlPlans.set(scope,{repository,before,after:clone(next),receipt,terminal,terminalEnvelope});if(receipt)receipt.settling=scope;return next;
}
export function completeOriginalGenerationControl(repository,scope){
 const p=controlPlans.get(scope);if(!p||p.repository!==repository||p.failed)fail();const work=readOriginalCommittedTransactionWork(repository,scope);
 if(p.receipt&&controlReceipts.get(repository)!==p.receipt)fail();
 // This verifies an already committed original receipt. It does not roll back
 // a committed transaction, mint a new allowance or perform a cold write.
 if(p.terminal&&(!number(work.references)||work.references>4096||!number(work.bytes)||work.bytes>p.terminalEnvelope.bytes||!Number.isFinite(work.activeMs)||work.activeMs<0||Math.ceil(work.activeMs)>p.terminalEnvelope.ms)){
  p.failed=true;if(p.receipt)p.receipt.failed=true;fail('BNS_GROUP_RESOURCE_LIMIT');
 }
 // Only a committed successor consumes the predecessor receipt. Failed native
 // writes retain both the durable debt and its one-use original receipt.
 controlPlans.delete(scope);if(p.terminal){controlReceipts.delete(repository);return;}
 if(work.bytes>p.after.controlPending.bytes||Math.ceil(work.activeMs)>p.after.controlPending.ms)fail('BNS_GROUP_RESOURCE_LIMIT');
 controlReceipts.set(repository,{taskId:p.after.taskId,identity:clone(p.after.identity),pending:clone(p.after.controlPending),row:p.after,bytes:work.bytes,activeMs:work.activeMs,reading:null,failed:false});
}
// Fixed source-base registry reads spend the already-paid target control debt.
// A read scope can only tighten the ordinary 2 MiB/30s envelope; it grants no
// write permission, and a missing/failed receipt cannot claim a later refund.
export function originalGenerationControlReadWork(repository,reader,scope){
 const p=controlReceipts.get(repository);if(!p||p.failed||p.reading||p.settling)fail('BNS_GROUP_RESOURCE_LIMIT');
 const bytes=p.pending.bytes-p.bytes,ms=Math.floor(p.pending.ms-p.activeMs);if(bytes<=0||ms<=0)fail('BNS_GROUP_RESOURCE_LIMIT');
 p.reading=scope;controlReads.set(scope,{repository,reader,p});return {bytes,ms};
}
export function completeOriginalGenerationControlRead(repository,reader,scope){
 const q=controlReads.get(scope);if(!q||q.repository!==repository||q.reader!==reader||q.p.reading!==scope)fail();controlReads.delete(scope);q.p.reading=null;
 try{const work=readOriginalCommittedTransactionWork(reader,scope);q.p.bytes+=work.bytes;q.p.activeMs+=work.activeMs;if(q.p.bytes>q.p.pending.bytes||Math.ceil(q.p.activeMs)>q.p.pending.ms)fail('BNS_GROUP_RESOURCE_LIMIT');}catch(e){q.p.failed=true;throw e;}
}

export function abandonOriginalGenerationControl(repository,scope){
 const p=controlPlans.get(scope);if(!p)return;if(p.repository!==repository)fail();requireOriginalTaskControlFailure(repository,scope);controlPlans.delete(scope);
 // A failed attempt does not produce a refundable success receipt. Retain the
 // durable prepaid debt and refuse further same-process consumption. A fresh
 // explicit cold invocation can only burn it, never refund it.
 if(p.receipt){p.receipt.failed=true;p.receipt.settling=null;}
}
