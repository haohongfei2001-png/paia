import {protections,markHuman,rankBetween,fail,prefix,same} from './thought-model.js';
import {initializeTopicIdentity,registerTopicName} from './topic-identity.js';
import {recordMembershipIntent} from './topic-intent.js';
import {journal,saveReceipt} from './thought-journal.js';
import {queueSearch} from './library-search.js';
import {promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';
import {bindingRead} from './thought-binding.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {assertPromotionPathRemovalAllowed} from './topic-promotion-access.js';
const TABLE='organizerWorkItems';
// Explicit private CAS projection. The byte cap is a resource bound, never a
// processing grant; a production caller still needs each semantic field's grant.
const ENTRY_FACT_FIELDS=['id','revision','contentRevision','organizationRevision','dependencyRevision','thoughtText','title','note','type','formation','bodyBinding','workingInputId','bindingRevision','bindingLength','thoughtEditedAt','origin','provenanceType','lifecycle','freshness','integrity','staleReasons','sourceRecordIds','inputRefs','hasHumanAction','userEdited','protections','authorship','organizationIntents','topics'];
export function promotionEntryFacts(row){
 if(!row)fail();const facts={};for(const key of ENTRY_FACT_FIELDS)if(Object.hasOwn(row,key))facts[key]=structuredClone(row[key]);return facts;
}

// Shared transaction body for the two trusted, explicitly confirmed Topic04
// entry points. Callers own opaque preparation, current authority, exact staged
// selection and CAS checks. An assessor can never supply origin or this call.
export async function applyConfirmedPromotion(store,t,{snapshot,confirmed:c,request,digest,id,itemId,origin,scope,authorizeTarget,finalFence=null}){
   if(finalFence!==null&&typeof finalFence!=='function')fail();
   // Private original-writer intents are captured BEFORE put/delete, with nested
   // injected writes excluded. They describe this mutation, not refreshed rows.
   const intents=new Map(),graphs=[],rootIds=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation'];let bytes=0,depth=0,expectedRoot=null,sourceCountBefore=null;
   const originalPut=t.put,originalDelete=t.delete;
   if(finalFence){
    expectedRoot=JSON.parse(await rootReadAuthority(t));sourceCountBefore=await t.count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0]));if(c.request.selection==='whole_section'&&sourceCountBefore!==snapshot.placements.length)fail();
    for(const entryId of c.plan.entryIds)for(const [table,index,key]of [['placements','byEntry',[entryId]],['dependencies','byTarget',['entry',entryId]],['provenance','byOwner',['entry',entryId]]]){const range=prefix(key),rows=await t.all(table,index,range,1001);if(rows.length>1000)fail();bytes+=new TextEncoder().encode(JSON.stringify(rows)).length;if(bytes>8*1024*1024)fail();graphs.push({table,index,range,rows,entryId});}
    const record=(table,key,value)=>{if(depth)return;const encoded=JSON.stringify([table,key]),prior=intents.get(encoded),next={table,key,value:value===null?null:structuredClone(value)};bytes-=prior?new TextEncoder().encode(JSON.stringify(prior)).length:0;bytes+=new TextEncoder().encode(JSON.stringify(next)).length;if(bytes>8*1024*1024)fail();intents.set(encoded,next);if(table==='meta'){const i=rootIds.indexOf(key);if(i>=0)expectedRoot[i]=value?.value??null;else if(key==='smart-filter')expectedRoot[6]=['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>value?.[k]??null);}};
    t.put=async(table,value,key)=>{record(table,key===undefined?value?.id:key,value);depth++;try{return await originalPut.call(t,table,value,key);}finally{depth--;}};
    t.delete=async(table,key)=>{record(table,key,null);depth++;try{return await originalDelete.call(t,table,key);}finally{depth--;}};
   }
   try{
   await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);
   const operationId=c.request.operationId,at=store.clock(),topicId=store.uuid(),sectionId=store.uuid(),rank=rankBetween();
   const target={id:topicId,defaultSectionId:sectionId,name:c.plan.name,nameKey:c.plan.name.toLocaleLowerCase(),summary:'',sourceRecordIds:origin==='user'?[]:c.sourceRecordIds,revision:0,organizationRevision:1,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:origin,createdAt:at,protections:protections(origin,operationId,at)};
   initializeTopicIdentity(target,origin);for(const field of ['name','organization'])markHuman(target,field,operationId,at,'section_promotion');
   await authorizeTarget(topicId);await registerTopicName(t,target,c.nameToken);
   const section={id:promotionSectionId(topicId,1,sectionId),topicId,sectionId,layoutGeneration:1,isDefault:true,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',operationId,at)};markHuman(section,'title',operationId,at,'section_promotion');markHuman(section,'order',operationId,at,'section_promotion');
   await t.put('topics',target);await t.put('sections',section);
   const mappings=[],entryFacts=new Map((snapshot.entryFacts||[]).map(row=>[row.id,row])),sourcePlacements=new Map(snapshot.placements.map(row=>[row.entryId,row]));
   for(const entryId of c.plan.entryIds){
    const sourcePlacement=await t.get('placements',promotionPlacementId(snapshot.topic.id,snapshot.topic.activeLayoutGeneration,entryId)),entry=await t.get('thoughts',entryId),beforeIntent=promotionOrganization(entry),before=structuredClone(sourcePlacement);
    if(!same(sourcePlacement,sourcePlacements.get(entryId))||!same({entryId,...promotionOrganization(entry)},snapshot.organizations.find(row=>row.entryId===entryId)))fail();
    if(finalFence){if(!entryFacts.has(entryId)||!same(promotionEntryFacts(entry),entryFacts.get(entryId)))fail();}
    else if(snapshot.entries){const expected=snapshot.entries.find(row=>row.entryId===entryId),bound=await bindingRead(store,t,entry);if(!expected||bound.thoughtText!==expected.body||entry.revision!==expected.revision||entry.contentRevision!==expected.contentRevision||entry.bodyBinding!==expected.bodyBinding||(entry.workingInputId??null)!==expected.workingInputId||entry.origin!==expected.origin||entry.provenanceType!==expected.provenanceType||!same(entry.sourceRecordIds||[],expected.sourceRecordIds))fail();}
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
   const source=await t.get('topics',snapshot.topic.id),beforeSource=structuredClone(source);if(!same(source,snapshot.topic))fail();source.organizationRevision++;source.revision++;
   await store.touchTopic(t,source);await store.touchTopic(t,target);await queueSearch(t,'topic',source);await queueSearch(t,'topic',target);
   const sourceTopicRevisionId=await journal(store,t,{kind:'topic',entityId:source.id,before:beforeSource,after:source,fieldMask:['organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const topicRevisionId=await journal(store,t,{kind:'topic',entityId:topicId,before:null,after:target,fieldMask:['name','organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:target.sourceRecordIds});
   await journal(store,t,{kind:'section',entityId:sectionId,documentId:topicId,before:null,after:section,fieldMask:['title','rank'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const result={kind:'personal_topic_promotion',version:1,intentMode:origin==='user'?'user_structural':'ai_proposal',id:topicId,operationId,historyOperationId:operationId,state:'after',sourceTopicId:source.id,sourceSectionId:snapshot.section.sectionId,sourceGeneration:source.activeLayoutGeneration,defaultSectionId:sectionId,entryIds:c.plan.entryIds,selection:c.request.selection,scope:scope??c.request.scope,mappings,sourceTopicRevisionId,topicRevisionId};
   for(let i=0;i<c.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);
   await authorizeTarget(topicId);await saveReceipt(store,t,request,digest,result);
   // The actual receipt/history writes are still inside this original transaction.
   await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);
   if(finalFence){
    if(await rootReadAuthority(t)!==JSON.stringify(expectedRoot))fail();
    for(const {table,key,value}of intents.values())if(!same((await t.get(table,key))??null,value))fail();
    for(const graph of graphs){const expected=new Map(graph.rows.map(row=>[row.id,row]));for(const {table,key,value}of intents.values())if(table===graph.table){if(value===null)expected.delete(key);else if(graph.table==='placements'?value.entryId===graph.entryId:graph.table==='dependencies'?value.targetKind==='entry'&&value.targetId===graph.entryId:value.ownerKind==='entry'&&value.ownerId===graph.entryId)expected.set(key,value);}const rows=await t.all(graph.table,graph.index,graph.range,1001),sort=xs=>xs.sort((a,b)=>a.id.localeCompare(b.id));if(!same(sort(rows),sort([...expected.values()])))fail();}
    if(!same(await t.get('sections',snapshot.section.id),snapshot.section))fail();
    const sourceCount=await t.count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0])),targetCount=await t.count('placements','bySectionOrder',prefix([topicId,1,sectionId,0]));
    if(sourceCount!==sourceCountBefore-c.plan.entryIds.length||targetCount!==c.plan.entryIds.length)fail();
    // No storage read follows the terminal original evidence/authority fence.
    await finalFence(topicId);
   }
   return result;
   }finally{t.put=originalPut;t.delete=originalDelete;intents.clear();graphs.length=0;}
}
