import {validateInitialSourceEntities} from './source-bootstrap-codec.js';
import {clone,equal,fail} from './value.js';
const verified=new WeakMap();
// Immutable original operation children can be lent to the private validated
// plan. The mutable top-level map is detached. Getter/symbol/mutable children
// keep the original full clone; full domain validation always runs afterwards.
function immutableEntitySnapshot(entities){
 const plain=value=>value&&typeof value==='object'&&(Array.isArray(value)?Object.getPrototypeOf(value)===Array.prototype:[Object.prototype,null].includes(Object.getPrototypeOf(value)));
 const frozen=(value,path=new Set())=>{if(!value||typeof value!=='object')return !['function','symbol'].includes(typeof value);if(!plain(value)||path.has(value)||!Object.isFrozen(value)||Object.getOwnPropertySymbols(value).length)return false;path.add(value);for(const [key,d]of Object.entries(Object.getOwnPropertyDescriptors(value))){if(!Object.hasOwn(d,'value')||(!d.enumerable&&!(Array.isArray(value)&&key==='length'))||!frozen(d.value,path))return false;}path.delete(value);return true;};
 if(!plain(entities)||Array.isArray(entities)||Object.getOwnPropertySymbols(entities).length)return null;
 const entries=Object.entries(Object.getOwnPropertyDescriptors(entities));if(!entries.every(([,d])=>d.enumerable&&Object.hasOwn(d,'value')&&frozen(d.value)))return null;return Object.freeze(Object.fromEntries(entries.map(([key,d])=>[key,d.value])));
}
export async function prepareInitialSourcePlan(entities){const copy=immutableEntitySnapshot(entities)??clone(entities);await validateInitialSourceEntities(copy);const capability=Object.freeze({});verified.set(capability,copy);return capability;}
export function initialSourcePlanBorrows(capability,entities){const value=verified.get(capability);if(!value)fail('BNS_PREPARATION_REQUIRED');return Object.keys(value).length===Object.keys(entities).length&&Object.keys(value).every(key=>value[key]===entities[key]);}
export function initialSourcePlan(capability){const value=verified.get(capability);if(!value)fail('BNS_PREPARATION_REQUIRED');return clone(value);}
// Verify the exact canonical formation after existing index/doc refresh owners.
// Physical local sequence allocation is the only permitted portable difference.
export async function verifyInitialSourceWrite(t,cap){
 const e=initialSourcePlan(cap),h=e.baselineRevision,b=e.input;
 const actual={source:(await t.get('records',e.source.id))?.value??null,timeEvidence:{id:e.timeEvidence.id,value:(await t.get('times',e.timeEvidence.id))?.value??null},inputDocument:{id:b.documentId,source:(await t.get('documents',b.documentId))?.value??null,working:(await t.get('libraryDocuments',b.documentId))?.value??null},input:(await t.get('blocks',b.id))?.value??null,inputState:await t.get('inputStates',b.id)??null,baselineRevision:await t.get('revisions',h.id)??null};
 if(!actual.inputState||!actual.baselineRevision)fail('BNS_SOURCE_BOOTSTRAP_CHANGED');
 const normalized={...actual,inputState:{...actual.inputState,deltaSequence:e.inputState.deltaSequence},baselineRevision:{...actual.baselineRevision,sequence:h.sequence,listKey:h.listKey,documentList:h.documentList}};
 if(!equal(normalized,e))fail('BNS_SOURCE_BOOTSTRAP_CHANGED');
}
