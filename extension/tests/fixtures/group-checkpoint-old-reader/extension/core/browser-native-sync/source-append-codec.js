import {validateSourceBootstrapMember,validateInitialSourceEntities} from './source-bootstrap-codec.js';
import {initialSourceObjects} from '../source-initial.js';
import {clone,exact,identifier,hash,fail,equal} from './value.js';
export const SOURCE_APPEND_TYPES=Object.freeze(['source','timeEvidence','input','inputState','baselineRevision']);
const all=(x,k)=>exact(x,k)&&Object.keys(x).length===k.length;
export function validateSourceAppendMember(v){if(!SOURCE_APPEND_TYPES.includes(v?.entityType))fail('BNS_SOURCE_APPEND_INVALID');return validateSourceBootstrapMember(v);}
export function validateSourceAppendCommit(v){
 if(!all(v,['id','logicalCommitId','datasetId','deviceId','sourceId','sourceKey','documentId','inputId','baselineId','conversation','bootstrap','refs'])||v.id!==v.logicalCommitId||![v.id,v.datasetId,v.deviceId,v.sourceId,v.documentId,v.inputId,v.baselineId].every(identifier)||!hash(v.sourceKey)||!all(v.conversation,['platform','chatId'])||v.conversation.platform!=='chatgpt'||!identifier(v.conversation.chatId)||!all(v.bootstrap,['operationId','revisionId','documentMemberRevisionId'])||!identifier(v.bootstrap.operationId)||!hash(v.bootstrap.revisionId)||!hash(v.bootstrap.documentMemberRevisionId)||!Array.isArray(v.refs)||v.refs.length!==5)fail('BNS_SOURCE_APPEND_INVALID');
 if(v.refs.some(x=>!all(x,['type','entityId','revisionId'])||x.type!=='sourceAppendMember'||!identifier(x.entityId)||!hash(x.revisionId))||new Set(v.refs.map(x=>x.entityId)).size!==5)fail('BNS_SOURCE_APPEND_INVALID');return v;
}
export async function validateSourceAppendEntities(e,documentId){
 if(!all(e,SOURCE_APPEND_TYPES)||!identifier(documentId))fail('BNS_SOURCE_APPEND_INVALID');
 for(const type of SOURCE_APPEND_TYPES)validateSourceAppendMember({id:type+':'+e[type].id,entityType:type,entity:e[type],logicalCommitId:'validation',datasetId:'validation',deviceId:'validation'});
 if(e.input.documentId!==documentId||e.inputState.documentId!==documentId||e.baselineRevision.documentId!==documentId||!equal(e.baselineRevision.documentList,[documentId,e.baselineRevision.sequence]))fail('BNS_SOURCE_APPEND_INVALID');
 // Reuse the exact initial Source/time/Input/baseline validator. Only the
 // verified existing document binding differs; no initial proof is relaxed.
 const x=clone(e),d=initialSourceObjects(e.source).document,source={...d,titleRevision:0};delete source.sourceRecordIds;const working=clone(source);delete working.titleRevision;
 x.input.documentId=d.id;x.inputState.documentId=d.id;x.baselineRevision.documentId=d.id;x.baselineRevision.documentList=[d.id,x.baselineRevision.sequence];
 await validateInitialSourceEntities({...x,inputDocument:{id:d.id,source,working}});return e;
}
