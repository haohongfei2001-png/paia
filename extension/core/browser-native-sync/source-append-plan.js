import {validateSourceAppendEntities} from './source-append-codec.js';
import {clone,fail,equal} from './value.js';
const plans=new WeakMap();
// Immutable original operation children can be lent to the private validated
// plan. The mutable top-level map is detached. Getter/symbol/mutable children
// keep the original full clone; full domain validation always runs afterwards.
function immutableEntityChildren(entities){
 const plain=value=>value&&typeof value==='object'&&(Array.isArray(value)||[Object.prototype,null].includes(Object.getPrototypeOf(value)));
 const frozen=(value,path=new Set())=>{if(!value||typeof value!=='object')return !['function','symbol'].includes(typeof value);if(!plain(value)||path.has(value)||!Object.isFrozen(value)||Object.getOwnPropertySymbols(value).length)return false;path.add(value);for(const [key,d]of Object.entries(Object.getOwnPropertyDescriptors(value))){if(!Object.hasOwn(d,'value')||(!d.enumerable&&!(Array.isArray(value)&&key==='length'))||!frozen(d.value,path))return false;}path.delete(value);return true;};
 if(!plain(entities)||Array.isArray(entities)||Object.getOwnPropertySymbols(entities).length)return false;
 return Object.values(Object.getOwnPropertyDescriptors(entities)).every(d=>d.enumerable&&Object.hasOwn(d,'value')&&frozen(d.value));
}
export async function prepareSourceAppendPlan(entities,documentId){const e=immutableEntityChildren(entities)?Object.freeze({...entities}):clone(entities);await validateSourceAppendEntities(e,documentId);const cap=Object.freeze({});plans.set(cap,e);return cap;}
export function sourceAppendPlanBorrows(cap,entities){const value=plans.get(cap);if(!value)fail('BNS_PREPARATION_REQUIRED');return Object.keys(value).length===Object.keys(entities).length&&Object.keys(value).every(key=>value[key]===entities[key]);}
export function sourceAppendPlan(cap){const e=plans.get(cap);if(!e)fail('BNS_PREPARATION_REQUIRED');return clone(e);}
export async function verifySourceAppendWrite(t,cap){const e=sourceAppendPlan(cap),h=await t.get('revisions',e.baselineRevision.id),state=await t.get('inputStates',e.input.id);if(!h||!state)fail('BNS_SOURCE_APPEND_CHANGED');const actual={source:(await t.get('records',e.source.id))?.value??null,timeEvidence:{id:e.timeEvidence.id,value:(await t.get('times',e.timeEvidence.id))?.value??null},input:(await t.get('blocks',e.input.id))?.value??null,inputState:{...state,deltaSequence:e.inputState.deltaSequence},baselineRevision:{...h,sequence:e.baselineRevision.sequence,listKey:e.baselineRevision.listKey,documentList:e.baselineRevision.documentList}};if(!equal(actual,e))fail('BNS_SOURCE_APPEND_CHANGED');}

export async function verifyAppendDocumentPreserved(t,id,before){const keys=['firstSourceSentAt','lastSourceSentAt','status'];const stable=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));for(const name of ['documents','libraryDocuments']){const now=await t.get(name,id);if(!now||!equal(stable(now.value),stable(before[name])))fail('BNS_SOURCE_APPEND_CHANGED');}}
