import {fail,keys,idOK,revisionOK,same,prefix} from './thought-model.js';
import {checkEvidenceInTransaction} from './thought-evidence.js';
import {assertTopicIdentityBase,prepareTopicIdentityName,registerTopicName,setTopicLifecycle} from './topic-identity.js';
import {recordMembershipIntent} from './topic-intent.js';
import {journal} from './thought-journal.js';
import {queueSearch} from './library-search.js';
import {PROMOTION_LIMITS,promotionSectionId,promotionPlacementId,promotionOrganization,samePromotionPlacement} from './topic-promotion-policy.js';
import {assertPromotionPathRemovalAllowed} from './topic-promotion-access.js';

// Ordinary explicit-user structural history. It restores selected membership
// edges, never Entry bodies, Source/Input facts, labels or external grants.
// No automatic caller or ordinary revision-dispatch hook is installed here.
function validateResult(result,historyId){
 if(result?.kind!=='personal_topic_promotion'||result.version!==1||result.historyOperationId!==historyId||!['before','after'].includes(result.state)||!['id','operationId','sourceTopicId','sourceSectionId','defaultSectionId','topicRevisionId','sourceTopicRevisionId'].every(k=>idOK(result[k]))||result.id===result.sourceTopicId||!revisionOK(result.sourceGeneration)||!Array.isArray(result.entryIds)||!result.entryIds.length||new Set(result.entryIds).size!==result.entryIds.length||!Array.isArray(result.mappings)||result.mappings.length!==result.entryIds.length||!['explicit_entries','whole_section'].includes(result.selection))fail();
 for(const [i,mapping]of result.mappings.entries()){
  keys(mapping,['entryId','sourcePlacementId','targetPlacementId','sourceRevisionId','targetRevisionId','intentRevisionId'],['entryId','sourcePlacementId','targetPlacementId','sourceRevisionId','targetRevisionId','intentRevisionId']);
  if(['entryId','sourceRevisionId','targetRevisionId','intentRevisionId'].some(k=>!idOK(mapping[k]))||mapping.entryId!==result.entryIds[i]||mapping.sourcePlacementId!==promotionPlacementId(result.sourceTopicId,result.sourceGeneration,mapping.entryId)||mapping.targetPlacementId!==promotionPlacementId(result.id,1,mapping.entryId))fail();
 }
}
async function revision(store,t,id,{kind,entityId,operationId}){
 const row=await t.get('revisions',id);
 if(!row||row.kind!==kind||row.entityId!==entityId||row.operationId!==operationId||row.actor!=='user'||!['section_promotion','section_promotion_restore'].includes(row.reason)||!row.important||!await store.sourcePresent(t,row.sourceRecordIds))fail();return row;
}
const sameTopic=(a,b)=>a&&b&&same(Object.fromEntries(['id','name','summary','revision','organizationRevision','activeLayoutGeneration','defaultSectionId','lifecycle','identity','pinKey','pinRank','protections','authorship'].map(k=>[k,a[k]])),Object.fromEntries(['id','name','summary','revision','organizationRevision','activeLayoutGeneration','defaultSectionId','lifecycle','identity','pinKey','pinRank','protections','authorship'].map(k=>[k,b[k]])));

export async function restoreSectionPromotion(store,request){
 keys(request,['historyOperationId','side','operationId'],['historyOperationId','side','operationId']);
 if(![request.historyOperationId,request.operationId].every(idOK)||!['before','after'].includes(request.side))fail();
 const prior=await store.priorOperation(request);if(prior)return prior;
 const current=await store.run(()=>store.repository.transaction(false,t=>t.get('operationReceipts',request.historyOperationId))),state=current?.result;validateResult(state,request.historyOperationId);
 const original=await store.run(()=>store.repository.transaction(false,t=>t.get('operationReceipts',state.operationId))),baseline=original?.result;validateResult(baseline,state.operationId);
 if(baseline.state!=='after'||baseline.operationId!==state.operationId||!same(state.entryIds,baseline.entryIds)||state.id!==baseline.id||state.sourceTopicId!==baseline.sourceTopicId||state.sourceSectionId!==baseline.sourceSectionId||state.sourceGeneration!==baseline.sourceGeneration||state.defaultSectionId!==baseline.defaultSectionId||!same(state.scope,baseline.scope))fail();
 const evidence=[];for(let offset=0;offset<baseline.scope.length;offset+=100)evidence.push(...await store.evidenceFor(baseline.scope.slice(offset,offset+100)));const identity=await prepareTopicIdentityName(store,state.id);
 return store.operation(request,async t=>{
  await assertTopicIdentityBase(t,identity);await checkEvidenceInTransaction(store,t,evidence);
  if(!same(current,await t.get('operationReceipts',request.historyOperationId))||!same(original,await t.get('operationReceipts',state.operationId)))fail();
  const source=await t.get('topics',state.sourceTopicId),target=await t.get('topics',state.id),topicHistory=await revision(store,t,state.topicRevisionId,{kind:'topic',entityId:state.id,operationId:request.historyOperationId});
  if(!source||!target||source.lifecycle!=='active'||source.redirectTo||source.layoutJobId||target.redirectTo||target.layoutJobId||source.activeLayoutGeneration!==state.sourceGeneration||target.activeLayoutGeneration!==1||!sameTopic(target,topicHistory.after))return {conflict:true};
  if(target.lifecycle!==(state.state==='after'?'active':'removed'))return {conflict:true};
  const section=await t.get('sections',promotionSectionId(source.id,source.activeLayoutGeneration,state.sourceSectionId)),destination=await t.get('sections',promotionSectionId(target.id,1,target.defaultSectionId));
  if(!section||section.lifecycle!=='active'||section.redirectTo||!destination||destination.lifecycle!=='active'||!destination.isDefault||destination.redirectTo)return {conflict:true};
  const changes=[];
  for(const [i,mapping]of state.mappings.entries()){
   const entry=await store.readableEntry(t,mapping.entryId),old=await t.get('placements',mapping.sourcePlacementId),placed=await t.get('placements',mapping.targetPlacementId);
   if(entry.lifecycle!=='active'||!await store.sourcePresent(t,entry.sourceRecordIds)||(await t.all('thoughtSuppressions','byEntry',entry.id)).some(r=>r.status==='active'))fail();
   const sourceHistory=await revision(store,t,mapping.sourceRevisionId,{kind:'placement',entityId:mapping.sourcePlacementId,operationId:request.historyOperationId}),targetHistory=await revision(store,t,mapping.targetRevisionId,{kind:'placement',entityId:mapping.targetPlacementId,operationId:request.historyOperationId}),intent=await revision(store,t,mapping.intentRevisionId,{kind:'membership_intent',entityId:entry.id,operationId:request.historyOperationId});
   if(!samePromotionPlacement(old,sourceHistory.after)||!samePromotionPlacement(placed,targetHistory.after)||!same(promotionOrganization(entry),intent.after))return {conflict:true};
   const originalSource=await revision(store,t,baseline.mappings[i].sourceRevisionId,{kind:'placement',entityId:mapping.sourcePlacementId,operationId:state.operationId}),originalTarget=await revision(store,t,baseline.mappings[i].targetRevisionId,{kind:'placement',entityId:mapping.targetPlacementId,operationId:state.operationId});
   if(!originalSource.before||originalSource.before.sectionId!==section.sectionId||originalSource.before.lifecycle!=='active'||originalTarget.after?.sectionId!==destination.sectionId)fail();
   changes.push({entry,old,placed,originalSource,originalTarget});
  }
  if(await t.count('placements','byTopicOrder',prefix([target.id,1,0]))!==(state.state==='after'?state.entryIds.length:0))return {conflict:true};
  if(request.side===state.state)return {...state,unchanged:true};
  await assertPromotionPathRemovalAllowed(t,request.side==='before'?target.id:source.id,[request.side==='before'?destination.sectionId:section.sectionId]);
  const operationId=request.operationId,at=store.clock(),beforeSource=structuredClone(source),beforeTarget=structuredClone(target),mappings=[];
  for(const {entry,old,placed,originalSource,originalTarget}of changes){
   const beforeOld=structuredClone(old),beforePlaced=structuredClone(placed),beforeIntent=promotionOrganization(entry),back=request.side==='before';
   Object.assign(old,{sectionId:section.sectionId,sectionRank:section.rank,rank:originalSource.before.rank,lifecycle:back?'active':'removed',activeKey:back?0:1,revision:old.revision+1,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId});if(back)delete old.excludedByUser;else old.excludedByUser=true;
   Object.assign(placed,{sectionId:destination.sectionId,sectionRank:destination.rank,rank:originalTarget.after.rank,lifecycle:back?'removed':'active',activeKey:back?1:0,revision:placed.revision+1,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId});if(back)placed.excludedByUser=true;else delete placed.excludedByUser;
   recordMembershipIntent(entry,source.id,back,operationId,at,'restore');recordMembershipIntent(entry,target.id,!back,operationId,at,'restore');entry.organizationRevision++;entry.revision++;
   await t.put('thoughts',entry);await t.put('placements',old);await t.put('placements',placed);await queueSearch(t,'entry',entry);
   const common={actor:'user',reason:'section_promotion_restore',important:true,operationId,sourceRecordIds:entry.sourceRecordIds};
   const sourceRevisionId=await journal(store,t,{...common,kind:'placement',entityId:old.id,documentId:source.id,before:beforeOld,after:old,fieldMask:['membership','section','order'],baseRevision:beforeOld.revision,afterRevision:old.revision}),targetRevisionId=await journal(store,t,{...common,kind:'placement',entityId:placed.id,documentId:target.id,before:beforePlaced,after:placed,fieldMask:['membership','section','order'],baseRevision:beforePlaced.revision,afterRevision:placed.revision}),intentRevisionId=await journal(store,t,{...common,kind:'membership_intent',entityId:entry.id,before:beforeIntent,after:promotionOrganization(entry),fieldMask:['membership'],baseRevision:beforeIntent.organizationRevision,afterRevision:entry.organizationRevision});
   mappings.push({entryId:entry.id,sourcePlacementId:old.id,targetPlacementId:placed.id,sourceRevisionId,targetRevisionId,intentRevisionId});
  }
  await registerTopicName(t,target,target.identity?.nameToken||identity.oldToken);setTopicLifecycle(target,request.side==='before'?'removed':'active',{actor:'user',operationId,at});target.revision++;target.organizationRevision++;source.revision++;source.organizationRevision++;
  await store.touchTopic(t,target);await store.touchTopic(t,source);await queueSearch(t,'topic',target);await queueSearch(t,'topic',source);
  const common={kind:'topic',fieldMask:['organization','lifecycle'],actor:'user',reason:'section_promotion_restore',important:true,operationId,sourceRecordIds:[]};
  const topicRevisionId=await journal(store,t,{...common,entityId:target.id,before:beforeTarget,after:target,baseRevision:beforeTarget.revision,afterRevision:target.revision}),sourceTopicRevisionId=await journal(store,t,{...common,entityId:source.id,before:beforeSource,after:source,baseRevision:beforeSource.revision,afterRevision:source.revision});
  return {...baseline,state:request.side,historyOperationId:operationId,mappings,topicRevisionId,sourceTopicRevisionId};
 });
}
