import {ArchiveError} from '../constants.js';
import {clone,equal,hash} from './value.js';
// Numeric transition rules only. No exported function opens a repository,
// acquires a transaction capability, authenticates a graph or grants a refund.
// The fixed stage/restore consumers persist these transitions under their own
// private authority and supply measured work from the original repository.
export const GENERATION_TASK_LIMITS=Object.freeze({payloadBytes:2*1024*1024,graphReferences:4096,workBytes:16*1024*1024,activeMs:120000,tickets:4096});
export const CANONICAL_PHASED_TASK='canonical-generation:checkpoint:phased-task:v1';
const own=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const number=v=>Number.isSafeInteger(v)&&v>=0;
const fail=code=>{throw new ArchiveError(code??'GENERATION_TASK_CHANGED');};
export function originalGenerationTaskData(row){
 if(!own(row,['id','version','taskId','identity','phase','tickets','burned','workBytes','activeMs','pending','transportIds'])||row.id!==CANONICAL_PHASED_TASK||row.version!==1||typeof row.taskId!=='string'||!row.taskId||!own(row.identity,['manifestId','generationIdentity','sourceBase'])||!hash(row.identity.manifestId)||!['staging','authenticated','validated','applying','verified','failed'].includes(row.phase)||!number(row.tickets)||row.tickets>GENERATION_TASK_LIMITS.tickets||!number(row.burned)||row.burned>row.tickets||!number(row.workBytes)||row.workBytes>GENERATION_TASK_LIMITS.workBytes||!number(row.activeMs)||row.activeMs>GENERATION_TASK_LIMITS.activeMs||!Array.isArray(row.transportIds)||row.transportIds.length>GENERATION_TASK_LIMITS.graphReferences||row.transportIds.some(x=>!hash(x))||new Set(row.transportIds).size!==row.transportIds.length)fail();
 const p=row.pending;if(p!==null&&(!own(p,['sequence','kind','bytes','ms'])||p.sequence!==row.tickets||!['authenticate','validate','owner','verify'].includes(p.kind)||!number(p.bytes)||p.bytes<1||p.bytes>row.workBytes||!number(p.ms)||p.ms<1||p.ms>row.activeMs))fail();return row;
}
export function originalGenerationTaskStart(identity){return originalGenerationTaskData({id:CANONICAL_PHASED_TASK,version:1,taskId:crypto.randomUUID(),identity:clone(identity),phase:'staging',tickets:0,burned:0,workBytes:0,activeMs:0,pending:null,transportIds:[]});}
export function originalGenerationTaskReserve(before,kind,{bytes=2*1024*1024,ms=30000}={}){
 originalGenerationTaskData(before);if(before.pending||before.phase==='failed'||!['authenticate','validate','owner','verify'].includes(kind)||!number(bytes)||bytes<1||!number(ms)||ms<1||ms>30000)fail();
 if(before.tickets===GENERATION_TASK_LIMITS.tickets||before.workBytes+bytes>GENERATION_TASK_LIMITS.workBytes||before.activeMs+ms>GENERATION_TASK_LIMITS.activeMs)fail('BNS_GROUP_RESOURCE_LIMIT');
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
