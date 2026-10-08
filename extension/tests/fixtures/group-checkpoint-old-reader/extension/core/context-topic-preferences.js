import {ArchiveError} from './constants.js';
import {idOK,revisionOK} from './thought-model.js';

// Local selection metadata only. Never portable content, a Topic catalog or a
// second authorization owner. Unknown rows are preserved and refused, not fixed.
export const CONTEXT_TOPIC_ACCESS_ROW='context-topic-access:v1';
export const CONTEXT_TOPIC_ACCESS_LIMITS=Object.freeze({choices:4096,bytes:4*1024*1024,page:100});
export const CONTEXT_TOPIC_BINDING_KEYS=Object.freeze(['topicId','epoch','createdAt','layoutGeneration','removalOperationId','organizationOperationId','organizationOperationSequence','organizationOperationDigest']);
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export const contextTopicOperationId=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
export const contextTopicEpoch=x=>x==='initial'||contextTopicOperationId(x);
export const contextTopicDigest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validContextTopicBinding(x){
 return exact(x,CONTEXT_TOPIC_BINDING_KEYS)&&idOK(x.topicId)&&contextTopicEpoch(x.epoch)&&typeof x.createdAt==='string'&&x.createdAt.length<=64&&Number.isFinite(Date.parse(x.createdAt))&&revisionOK(x.layoutGeneration)&&x.layoutGeneration>0&&(x.removalOperationId===null||idOK(x.removalOperationId))&&(x.organizationOperationId===null?x.organizationOperationSequence===null&&x.organizationOperationDigest===null:idOK(x.organizationOperationId)&&x.organizationOperationId.length>=8&&revisionOK(x.organizationOperationSequence)&&x.organizationOperationSequence>0&&contextTopicDigest(x.organizationOperationDigest));
}
export const sameContextTopicBinding=(a,b)=>a===null||b===null?a===b:validContextTopicBinding(a)&&validContextTopicBinding(b)&&CONTEXT_TOPIC_BINDING_KEYS.every(k=>a[k]===b[k]);
export const emptyContextTopicPreferences=()=>({id:CONTEXT_TOPIC_ACCESS_ROW,version:1,revision:0,choices:[]});
export function validContextTopicPreferences(row){
 return exact(row,['id','version','revision','choices'])&&row.id===CONTEXT_TOPIC_ACCESS_ROW&&row.version===1&&revisionOK(row.revision)&&Array.isArray(row.choices)&&row.choices.length<=CONTEXT_TOPIC_ACCESS_LIMITS.choices&&row.choices.every(c=>exact(c,['topicId','enabled','revision','binding'])&&idOK(c.topicId)&&typeof c.enabled==='boolean'&&revisionOK(c.revision)&&c.revision>0&&c.revision<=row.revision&&validContextTopicBinding(c.binding)&&c.binding.topicId===c.topicId)&&new Set(row.choices.map(c=>c.topicId)).size===row.choices.length&&new TextEncoder().encode(JSON.stringify(row)).length<=CONTEXT_TOPIC_ACCESS_LIMITS.bytes;
}
export function validateContextTopicChange(c){
 if(!exact(c,['topicId','enabled','expectedRevision','expectedBinding','epoch','operationId'])||!idOK(c.topicId)||typeof c.enabled!=='boolean'||!revisionOK(c.expectedRevision)||!contextTopicEpoch(c.epoch)||!contextTopicOperationId(c.operationId)||!(c.expectedBinding===null||validContextTopicBinding(c.expectedBinding)&&c.expectedBinding.topicId===c.topicId)||c.enabled&&(!c.expectedBinding||c.expectedBinding.epoch!==c.epoch))throw new ArchiveError('INVALID_REQUEST');
 return c;
}
