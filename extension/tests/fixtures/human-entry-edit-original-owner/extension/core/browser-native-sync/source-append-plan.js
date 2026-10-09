import {validateSourceAppendEntities} from './source-append-codec.js';
import {clone,fail,equal} from './value.js';
const plans=new WeakMap();
export async function prepareSourceAppendPlan(entities,documentId){const e=clone(entities);await validateSourceAppendEntities(e,documentId);const cap=Object.freeze({});plans.set(cap,e);return cap;}
export function sourceAppendPlan(cap){const e=plans.get(cap);if(!e)fail('BNS_PREPARATION_REQUIRED');return clone(e);}
export async function verifySourceAppendWrite(t,cap){const e=sourceAppendPlan(cap),h=await t.get('revisions',e.baselineRevision.id),state=await t.get('inputStates',e.input.id);if(!h||!state)fail('BNS_SOURCE_APPEND_CHANGED');const actual={source:(await t.get('records',e.source.id))?.value??null,timeEvidence:{id:e.timeEvidence.id,value:(await t.get('times',e.timeEvidence.id))?.value??null},input:(await t.get('blocks',e.input.id))?.value??null,inputState:{...state,deltaSequence:e.inputState.deltaSequence},baselineRevision:{...h,sequence:e.baselineRevision.sequence,listKey:e.baselineRevision.listKey,documentList:e.baselineRevision.documentList}};if(!equal(actual,e))fail('BNS_SOURCE_APPEND_CHANGED');}

export async function verifyAppendDocumentPreserved(t,id,before){const keys=['firstSourceSentAt','lastSourceSentAt','status'];const stable=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));for(const name of ['documents','libraryDocuments']){const now=await t.get(name,id);if(!now||!equal(stable(now.value),stable(before[name])))fail('BNS_SOURCE_APPEND_CHANGED');}}
