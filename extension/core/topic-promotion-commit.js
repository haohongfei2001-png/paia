import {protections,markHuman,rankBetween} from './thought-model.js';
import {initializeTopicIdentity,registerTopicName} from './topic-identity.js';
import {recordMembershipIntent} from './topic-intent.js';
import {journal,saveReceipt} from './thought-journal.js';
import {queueSearch} from './library-search.js';
import {promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';
import {assertPromotionPathRemovalAllowed} from './topic-promotion-access.js';
const TABLE='organizerWorkItems';

// Shared transaction body for the two trusted, explicitly confirmed Topic04
// entry points. Callers own opaque preparation, current authority, exact staged
// selection and CAS checks. An assessor can never supply origin or this call.
export async function applyConfirmedPromotion(store,t,{snapshot,confirmed:c,request,digest,id,itemId,origin,scope,authorizeTarget}){
   await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);
   const operationId=c.request.operationId,at=store.clock(),topicId=store.uuid(),sectionId=store.uuid(),rank=rankBetween();
   const target={id:topicId,defaultSectionId:sectionId,name:c.plan.name,nameKey:c.plan.name.toLocaleLowerCase(),summary:'',sourceRecordIds:origin==='user'?[]:c.sourceRecordIds,revision:0,organizationRevision:1,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:origin,createdAt:at,protections:protections(origin,operationId,at)};
   initializeTopicIdentity(target,origin);for(const field of ['name','organization'])markHuman(target,field,operationId,at,'section_promotion');
   await authorizeTarget(topicId);await registerTopicName(t,target,c.nameToken);
   const section={id:promotionSectionId(topicId,1,sectionId),topicId,sectionId,layoutGeneration:1,isDefault:true,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',operationId,at)};markHuman(section,'title',operationId,at,'section_promotion');markHuman(section,'order',operationId,at,'section_promotion');
   await t.put('topics',target);await t.put('sections',section);
   const mappings=[];
   for(const entryId of c.plan.entryIds){
    const sourcePlacement=await t.get('placements',promotionPlacementId(snapshot.topic.id,snapshot.topic.activeLayoutGeneration,entryId)),entry=await t.get('thoughts',entryId),beforeIntent=promotionOrganization(entry),before=structuredClone(sourcePlacement);
    Object.assign(sourcePlacement,{lifecycle:'removed',activeKey:1,revision:sourcePlacement.revision+1,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId,excludedByUser:true});
    const destination={...before,id:promotionPlacementId(topicId,1,entryId),topicId,layoutGeneration:1,sectionId,sectionRank:rank,revision:0,lifecycle:'active',activeKey:0,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId};delete destination.excludedByUser;delete destination.removedWithTopicOperationId;
    recordMembershipIntent(entry,snapshot.topic.id,false,operationId,at,'user_edit');recordMembershipIntent(entry,topicId,true,operationId,at,'user_edit');entry.organizationRevision++;entry.revision++;
    await t.put('thoughts',entry);await t.put('placements',sourcePlacement);await t.put('placements',destination);
    const base={actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:entry.sourceRecordIds};
    const sourceRevisionId=await journal(store,t,{...base,kind:'placement',entityId:sourcePlacement.id,documentId:snapshot.topic.id,before,after:sourcePlacement,fieldMask:['membership'],baseRevision:before.revision,afterRevision:sourcePlacement.revision});
    const targetRevisionId=await journal(store,t,{...base,kind:'placement',entityId:destination.id,documentId:topicId,before:null,after:destination,fieldMask:['membership','section','order'],afterRevision:0});
    const intentRevisionId=await journal(store,t,{...base,kind:'membership_intent',entityId:entryId,before:beforeIntent,after:promotionOrganization(entry),fieldMask:['membership'],baseRevision:beforeIntent.organizationRevision,afterRevision:entry.organizationRevision});
    mappings.push({entryId,sourcePlacementId:sourcePlacement.id,targetPlacementId:destination.id,sourceRevisionId,targetRevisionId,intentRevisionId});await queueSearch(t,'entry',entry);
   }
   const source=await t.get('topics',snapshot.topic.id),beforeSource=structuredClone(source);source.organizationRevision++;source.revision++;
   await store.touchTopic(t,source);await store.touchTopic(t,target);await queueSearch(t,'topic',source);await queueSearch(t,'topic',target);
   const sourceTopicRevisionId=await journal(store,t,{kind:'topic',entityId:source.id,before:beforeSource,after:source,fieldMask:['organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const topicRevisionId=await journal(store,t,{kind:'topic',entityId:topicId,before:null,after:target,fieldMask:['name','organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:target.sourceRecordIds});
   await journal(store,t,{kind:'section',entityId:sectionId,documentId:topicId,before:null,after:section,fieldMask:['title','rank'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const result={kind:'personal_topic_promotion',version:1,intentMode:origin==='user'?'user_structural':'ai_proposal',id:topicId,operationId,historyOperationId:operationId,state:'after',sourceTopicId:source.id,sourceSectionId:snapshot.section.sectionId,sourceGeneration:source.activeLayoutGeneration,defaultSectionId:sectionId,entryIds:c.plan.entryIds,selection:c.request.selection,scope:scope??c.request.scope,mappings,sourceTopicRevisionId,topicRevisionId};
   for(let i=0;i<c.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);
   await authorizeTarget(topicId);await saveReceipt(store,t,request,digest,result);return result;
}
