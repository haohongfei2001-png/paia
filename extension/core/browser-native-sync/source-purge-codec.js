import {exact,hash,opaque,identifier,count,fail,equal} from './value.js';
const own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const fields=['protocol','datasetId','deviceId','sequence','operationId','type','entityId','codecVersion','kind','actor','parents','value','revisionId'];
export function validateSourcePurgeIntent(v){
 if(!own(v,['id','version','datasetId','sourceId','sourceKey','documentId','inputId','baselineId','at','targets'])||v.version!==1||v.id!==v.sourceKey||!hash(v.sourceKey)||!opaque(v.datasetId)||![v.sourceId,v.documentId,v.inputId,v.baselineId].every(identifier)||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at))||new Date(v.at).toISOString()!==v.at||!Array.isArray(v.targets)||v.targets.length!==7)fail('BNS_SOURCE_PURGE_INVALID');
 const entities=new Set(),revisions=new Set(),ids=new Set(),sequences=new Set();let device=null;
 for(const x of v.targets){const b=x?.before;
  if(!own(x,['before','purgeRevisionId','purgeOperationId','purgeSequence'])||!own(b,fields)||b.protocol!==1||b.datasetId!==v.datasetId||!opaque(b.deviceId)||!opaque(b.operationId)||!count(b.sequence)||b.sequence<1||!['sourceBootstrapMember','sourceBootstrapCommit'].includes(b.type)||!identifier(b.entityId)||b.codecVersion!==1||b.kind!=='put'||b.actor!=='bootstrap'||!Array.isArray(b.parents)||b.parents.length||b.value!==null||!hash(b.revisionId)||!hash(x.purgeRevisionId)||!opaque(x.purgeOperationId)||!count(x.purgeSequence)||x.purgeSequence<1)fail('BNS_SOURCE_PURGE_INVALID');
  const key=b.type+':'+b.entityId,seq=b.deviceId+':'+b.sequence;if(entities.has(key)||revisions.has(b.revisionId)||ids.has(b.operationId)||sequences.has(seq)||revisions.has(x.purgeRevisionId)||ids.has(x.purgeOperationId))fail('BNS_SOURCE_PURGE_INVALID');entities.add(key);revisions.add(b.revisionId);revisions.add(x.purgeRevisionId);ids.add(b.operationId);ids.add(x.purgeOperationId);sequences.add(seq);
  if(device===null)device=b.deviceId;else if(device!==b.deviceId)fail('BNS_SOURCE_PURGE_INVALID');
 }
 const required=['source:'+v.sourceId,'timeEvidence:'+v.sourceKey,'inputDocument:'+v.documentId,'input:'+v.inputId,'inputState:'+v.inputId,'baselineRevision:'+v.baselineId];
 if(v.targets.filter(x=>x.before.type==='sourceBootstrapCommit').length!==1||!equal(v.targets.filter(x=>x.before.type==='sourceBootstrapMember').map(x=>x.before.entityId).sort(),required.sort()))fail('BNS_SOURCE_PURGE_INVALID');
 return v;
}
