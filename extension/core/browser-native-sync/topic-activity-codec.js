import {exact,identifier,opaque,count,equal,fail} from './value.js';
import {topicLifecyclePolicy,evaluateTopicInactivity} from '../topic-lifecycle-policy.js';
const keys=(v,names)=>exact(v,names)&&Object.keys(v).length===names.length;
const refuse=()=>fail('BNS_TOPIC_ACTIVITY_INVALID');
// This wire contains only the original lifecycle identity/CAS metadata. It is
// neither a Topic bootstrap nor a source/processing grant.
export function topicActivityIdentity(row){
 if(!row)return null;return {id:row.id,revision:row.revision,organizationRevision:row.organizationRevision,lifecycle:row.lifecycle,layoutGeneration:row.activeLayoutGeneration,identityRevision:row.identity?.revision??0,identityOrigin:row.identity?.origin??'unknown',nameToken:row.identity?.nameToken??null,sourceRecordIds:[...(row.sourceRecordIds??[])].sort()};
}
export function validateTopicActivity(value){
 if(!keys(value,['id','version','domainOperationId','before','policy','observedAt','previousObservedAt','transitionAt'])||value.version!==1||!identifier(value.id)||!opaque(value.domainOperationId))refuse();
 const b=value.before;if(!keys(b,['id','revision','organizationRevision','lifecycle','layoutGeneration','identityRevision','identityOrigin','nameToken','sourceRecordIds'])||b.id!==value.id||b.lifecycle!=='active'||!['revision','organizationRevision','layoutGeneration','identityRevision'].every(k=>count(b[k]))||b.layoutGeneration<1||!['ai','user','unknown'].includes(b.identityOrigin)||b.nameToken!==null&&!/^[a-f0-9]{64}$/.test(b.nameToken)||!Array.isArray(b.sourceRecordIds)||b.sourceRecordIds.length>1000||b.sourceRecordIds.some(x=>!identifier(x))||!equal([...new Set(b.sourceRecordIds)].sort(),b.sourceRecordIds))refuse();
 try{topicLifecyclePolicy(value.policy);}catch{refuse();}
 if(!evaluateTopicInactivity({policy:value.policy,now:value.observedAt,previousObservedAt:value.previousObservedAt,activityAt:'1970-01-01T00:00:00.000Z'}).eligible||typeof value.transitionAt!=='string'||!Number.isFinite(Date.parse(value.transitionAt))||new Date(value.transitionAt).toISOString()!==value.transitionAt)refuse();return value;
}
export function assertTopicActivityOperation(op){
 if(op.type!=='topicActivity'||op.kind!=='put'||op.actor!=='activity'||op.parents.length!==0||op.entityId!==op.value.id)refuse();validateTopicActivity(op.value);
}
