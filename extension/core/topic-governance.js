import {humanClock} from './browser-native-sync/human-library-allocation.js';
import {assertMemoryTopicTransitionAllowed} from './memory/organization-guard.js';
import {setTopicLifecycle,prepareTopicIdentityName,assertTopicIdentityBase,registerTopicName} from './topic-identity.js';
import {recordMembershipIntent} from './topic-intent.js';
import {keys,idOK,revisionOK,fail,prefix,markHuman} from './thought-model.js';
import {journal} from './thought-journal.js';
import {queueSearch} from './library-search.js';
export async function changeTopicContainer(s,r,restore=false){keys(r,['id','expectedRevision','operationId'],['id','expectedRevision','operationId']);if(!idOK(r.id)||!revisionOK(r.expectedRevision))fail();const nameIdentity=await prepareTopicIdentityName(s,r.id);return s.operation(r,t=>changeTopicContainerInTransaction(s,t,r,restore,nameIdentity));}
export async function changeTopicContainerInTransaction(s,t,r,restore,nameIdentity){await assertTopicIdentityBase(t,nameIdentity);const topic=await t.get('topics',r.id);if(!topic||topic.redirectTo)fail();if(topic.layoutJobId||topic.revision!==r.expectedRevision||topic.revision!==nameIdentity.beforeRevision||topic.name!==nameIdentity.beforeName)return {conflict:true};if(topic.lifecycle!==(restore?'removed':'active'))fail();if(!restore)await assertMemoryTopicTransitionAllowed(t,topic,{nextGeneration:null});const before=structuredClone(topic);await registerTopicName(t,topic,topic.identity?.nameToken||nameIdentity.oldToken);const reason=restore?'restore':'delete';
  for(const p of await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration]))){if(restore?(p.lifecycle!=='removed'||p.removedWithTopicOperationId!==topic.removalOperationId):p.lifecycle!=='active')continue;const old=structuredClone(p),e=await t.get('thoughts',p.entryId),planned=planHumanTopicMembership(topic,p,e,r,restore);Object.assign(p,planned.placement);if(restore)delete p.removedWithTopicOperationId;await t.put('placements',p);
   if(e){Object.assign(e,planHumanTopicMembershipEntry(e,topic.id,r,restore,humanClock(s,t)));await t.put('thoughts',e);}
   await journal(s,t,{kind:'placement',entityId:p.id,documentId:topic.id,before:old,after:p,fieldMask:['membership'],actor:'user',reason,important:true,operationId:r.operationId,sourceRecordIds:e?.sourceRecordIds||[]});
  }
  Object.assign(topic,planHumanTopicContainer(topic,r,restore,{lifecycleAt:humanClock(s,t),removedAt:restore?null:humanClock(s,t),protectionAt:humanClock(s,t)}));await t.put('topics',topic);await queueSearch(t,'topic',topic);await journal(s,t,{kind:'topic',entityId:topic.id,before,after:topic,fieldMask:['lifecycle','organization'],actor:'user',reason,important:true,operationId:r.operationId,baseRevision:before.revision,afterRevision:topic.revision,sourceRecordIds:[]});return {id:topic.id,revision:topic.revision,removed:!restore,restored:restore};}
export async function removedTopics(s,options={}){
 keys(options,['cursor','limit']);const {cursor=null,limit=40}=options;
 if(!Number.isInteger(limit)||limit<1||limit>100)fail();
 if(cursor!==null){keys(cursor,['version','key','generation','recoveryEpoch'],['version','key','generation','recoveryEpoch']);const k=cursor.key;if(cursor.version!==1||!Array.isArray(k)||k.length!==5||k[0]!==1||![0,1].includes(k[1])||typeof k[2]!=='string'||!/^\d{12}$/.test(k[2])||!Number.isSafeInteger(k[3])||k[3]>0||!idOK(k[4])||!revisionOK(cursor.generation)||!idOK(cursor.recoveryEpoch))fail();}
 await s.finishFoundation();return s.run(()=>s.repository.transaction(false,async t=>{
  const generation=(await t.get('meta','backup-data-generation'))?.value??0,recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value??'initial';if(!revisionOK(generation)||!idOK(recoveryEpoch))fail();
  if(cursor&&(cursor.generation!==generation||cursor.recoveryEpoch!==recoveryEpoch))return {items:[],nextCursor:null,cursorInvalid:true};
  const page=await t.rangePage('topics','byIndex',prefix([1]),cursor?.key??null,limit),items=[];
  for(const {value:row}of page.rows)if(row.lifecycle==='removed'&&!row.redirectTo)items.push(await s.safeOrganization(t,'topic',row));
  return {items,nextCursor:page.next?{version:1,key:page.next,generation,recoveryEpoch}:null};
 }));
}

// Shared domain computations: ordinary and private planned paths preserve the
// original per-field clock order; storage and permission remain in the owner.
export function planHumanTopicMembership(topic,placement,entry,r,restore){const p=structuredClone(placement);p.lifecycle=restore?'active':'removed';p.activeKey=restore?0:1;p.revision++;p.membershipAuthorship='user';p.sectionProtection=true;p.orderProtection=true;if(!restore)p.removedWithTopicOperationId=r.operationId;else delete p.removedWithTopicOperationId;return {placement:p};}
export function planHumanTopicMembershipEntry(entry,topicId,r,restore,at){const e=structuredClone(entry);recordMembershipIntent(e,topicId,restore,r.operationId,at,restore?'restore':'delete');e.organizationRevision++;e.revision++;return e;}
export function planHumanTopicContainer(value,r,restore,{lifecycleAt,removedAt,protectionAt}){const topic=structuredClone(value),reason=restore?'restore':'delete';setTopicLifecycle(topic,restore?'active':'removed',{actor:'user',operationId:r.operationId,at:lifecycleAt});topic.revision++;topic.organizationRevision++;if(!restore){topic.removalOperationId=r.operationId;topic.removedAt=removedAt;}markHuman(topic,'organization',r.operationId,protectionAt,reason);return topic;}
