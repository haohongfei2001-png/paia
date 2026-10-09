import {validateInitialSourceEntities} from './source-bootstrap-codec.js';
import {clone,equal,fail} from './value.js';
const verified=new WeakMap();
export async function prepareInitialSourcePlan(entities){const copy=clone(entities);await validateInitialSourceEntities(copy);const capability=Object.freeze({});verified.set(capability,copy);return capability;}
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
