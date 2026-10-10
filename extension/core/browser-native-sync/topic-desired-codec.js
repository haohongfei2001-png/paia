import {exact,hash,identifier,fail} from './value.js';
export const TOPIC_DESIRED_PREFIX='context-topic-desired:';
export function validateTopicDesired(value){
 if(!exact(value,['id','enabled','topicRef'])||Object.keys(value).length!==3||!identifier(value.id)||typeof value.enabled!=='boolean'||!exact(value.topicRef,['commitRevisionId','memberRevisionId'])||Object.keys(value.topicRef).length!==2||!hash(value.topicRef.commitRevisionId)||!hash(value.topicRef.memberRevisionId))fail('BNS_TOPIC_DESIRED_INVALID');return value;
}
export function assertTopicDesiredOperation(operation){if(operation.type!=='topicDesired'||operation.kind!=='put'||operation.codecVersion!==1||!['user','bootstrap'].includes(operation.actor)||operation.actor==='bootstrap'&&operation.parents.length)fail('BNS_TOPIC_DESIRED_AUTHORITY');validateTopicDesired(operation.value);}
export function assertTopicDesiredReference(value,commit,member){
 validateTopicDesired(value);
 if(commit?.type!=='humanLibraryCommit'||member?.type!=='humanLibraryMember'||commit.kind!=='put'||member.kind!=='put'||commit.revisionId!==value.topicRef.commitRevisionId||member.revisionId!==value.topicRef.memberRevisionId||member.entityId!=='topic:'+value.id||member.value.entityType!=='topic'||member.value.after?.id!==value.id||member.value.logicalCommitId!==commit.entityId||commit.datasetId!==member.datasetId||!commit.value.members.some(ref=>ref.revisionId===member.revisionId&&ref.entityId===member.entityId&&ref.type===member.type))fail('BNS_TOPIC_DESIRED_REFERENCE');
 return member.value.after;
}
export const logicalTopicFacts=topic=>({createdAt:topic.createdAt,layoutGeneration:topic.activeLayoutGeneration,removalOperationId:topic.removalOperationId??null,organizationOperationId:topic.protections?.organization?.operationId??null});
