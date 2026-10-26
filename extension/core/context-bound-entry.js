import {ENTRY_FIELDS,validateFields,idOK,revisionOK,prefix} from './thought-model.js';
import {validOrganizationIntents} from './topic-identity-backup.js';
import {contextTopicDigest,validContextTopicBinding} from './context-topic-preferences.js';

// Metadata qualification for human fields on a complete original Input mirror.
// This is neither source-free human authority nor permission to process text.
// The body remains a separately selected, source-qualified Input evidence unit.
export const BOUND_CONTEXT_LIMITS=Object.freeze({history:4096,memberships:4096,provenance:128,page:100});
export const BOUND_CONTEXT_FIELDS=Object.freeze(['note','title']);
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const array=(x,max,min=0)=>Array.isArray(x)&&x.length>=min&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
const ids=(x,max=128,min=1)=>array(x,max,min)&&x.every(idOK)&&same(x,[...new Set(x)].sort());
const operation=x=>idOK(x)&&x.length>=8;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const rank=x=>typeof x==='string'&&/^\d{12}$/.test(x);
export const validBoundFields=x=>array(x,2,1)&&x.every(f=>BOUND_CONTEXT_FIELDS.includes(f))&&same(x,[...new Set(x)].sort());
export const boundSelectedText=(row,selected)=>Object.fromEntries(selected.map(f=>[f,row?.[f]??'']));
const fieldSnapshot=x=>Object.fromEntries(['title','note','type','formation','lifecycle','bodyBinding','workingInputId'].map(f=>[f,x?.[f]??(f==='title'?'':undefined)]));
const humanField=(row,f)=>row.authorship?.[f]?.actor==='user'&&row.authorship[f].everHumanConfirmed===true&&operation(row.authorship[f].operationId)&&stamp(row.authorship[f].at)&&row.protections?.[f]?.locked===true&&row.protections[f].operationId===row.authorship[f].operationId&&row.protections[f].at===row.authorship[f].at;

async function fieldAuthority(t,row,current,selected){
 const entityKey='library_entry:'+row.id,seen=new Set(),operations=new Map(),latest=new Set(),counts={note:0,title:0},maximum={note:0,title:0};let reads=0,j=current,pendingRestore=null;
 const valid=j=>j&&idOK(j.id)&&j.kind==='library_entry'&&j.entityId===row.id&&j.entityKey===entityKey&&j.documentId===row.id&&['ai','user'].includes(j.actor)&&operation(j.operationId)&&revisionOK(j.baseRevision)&&revisionOK(j.afterRevision)&&j.afterRevision>=j.baseRevision&&revisionOK(j.sequence)&&j.sequence>0&&same(j.listKey,[entityKey,j.sequence])&&same([...(j.sourceRecordIds||[])].sort(),row.sourceRecordIds);
 const authority=(fields,j,reason)=>fields.every(f=>{if(!selected.includes(f)||latest.has(f))return true;latest.add(f);return humanField(row,f)&&row.authorship[f].operationId===j.operationId&&(Array.isArray(reason)?reason:[reason]).includes(row.protections[f].reason);});
 while(valid(j)&&!seen.has(j.id)&&reads++<BOUND_CONTEXT_LIMITS.history){
  seen.add(j.id);const lifecycleRestore=j.reason==='restore'&&same(j.fieldMask,['lifecycle']);if(operations.has(j.operationId)&&(lifecycleRestore||operations.get(j.operationId)))return null;operations.set(j.operationId,lifecycleRestore||operations.get(j.operationId)||false);const before=fieldSnapshot(j.before),after=fieldSnapshot(j.after);
  if(after.bodyBinding!=='input'||after.workingInputId!==row.workingInputId||after.type!==row.type||after.formation!=='explicit')return null;
  if(pendingRestore){if(j.reason!=='remove'||j.actor!=='user'||j.afterRevision!==pendingRestore.baseRevision||!same(after,fieldSnapshot(pendingRestore.before)))return null;pendingRestore=null;}
  if(j.reason==='baseline'){
   if(j.important!==true||j.baseRevision!==0||j.afterRevision!==0||!same(j.fieldMask,ENTRY_FIELDS)||after.lifecycle!=='active'||j.actor!==row.origin||j.after.bodyAuthorship?.actor!==j.actor||j.after.bodyAuthorship?.operationId!==j.operationId||j.after.bodyAuthorship?.at!==row.createdAt||j.after.bodyProtection?.operationId!==j.operationId||j.after.bodyProtection?.at!==row.createdAt||!['title','note','type','formation','lifecycle'].every(f=>(j.before?.[f]??(f==='title'?'':undefined))===after[f])||!selected.every(f=>latest.has(f)||j.actor==='user'&&authority([f],j,'user_created'))||!BOUND_CONTEXT_FIELDS.every(f=>counts[f]?row.fieldRevisions[f]>=counts[f]&&row.fieldRevisions[f]<=maximum[f]:row.fieldRevisions[f]===0))return null;
   return {birthOperationId:j.operationId};
  }
  if(before.bodyBinding!=='input'||before.workingInputId!==row.workingInputId||before.type!==row.type||before.formation!=='explicit')return null;
  const mergedBody=['shared_entry_edit','restore'].includes(j.reason)&&array(j.fieldMask,3,2)&&j.fieldMask[0]==='body'&&validBoundFields([...j.fieldMask.slice(1)].sort());
  if(['edit','undo','redo'].includes(j.reason)||j.reason==='restore'&&!same(j.fieldMask,['lifecycle'])&&!same(j.fieldMask,['body'])||mergedBody){
   const fields=mergedBody?j.fieldMask.slice(1):j.fieldMask,receipt=j.important?await t.get('operationReceipts',j.operationId):null;
   const item=receipt?.namespace==='thought-library'&&receipt.result?.items?.find(x=>x.id===row.id&&x.revision===j.afterRevision),single=receipt?.namespace==='thought-library'&&receipt.ownerId===row.id&&receipt.result?.id===row.id&&receipt.result.revision===j.afterRevision;
   if(j.actor!=='user'||!array(fields,2,1)||!validBoundFields([...fields].sort())||typeof j.important!=='boolean'||j.reason!=='edit'&&!j.important||j.important&&!item&&!single||j.reason==='shared_entry_edit'&&(!item?.shared||!fields.every(f=>revisionOK(item.fieldRevisions?.[f])&&item.fieldRevisions[f]>0&&item.fieldRevisions[f]<=row.fieldRevisions[f]))||j.afterRevision<=j.baseRevision||before.lifecycle!=='active'||after.lifecycle!=='active'||!same(after,{...before,...Object.fromEntries(fields.map(f=>[f,after[f]]))})||!authority(fields,j,j.reason==='restore'?['restore','user_edit']:'user_edit'))return null;
   if(mergedBody&&(j.before.body===j.after.body||j.after.bindingRevision<=j.before.bindingRevision||j.after.bindingLength!==j.after.body?.length||j.reason==='shared_entry_edit'&&(j.baseRevision!==0||j.after.bodyAuthorship?.operationId!==j.operationId||j.after.bodyProtection?.operationId!==j.operationId)))return null;
   for(const field of fields){counts[field]++;maximum[field]+=j.important?1:j.afterRevision-j.baseRevision;}
  }else if((j.reason==='restore'||j.reason==='remove')&&same(j.fieldMask,['lifecycle'])){
   const restore=j.reason==='restore';
   if(j.actor!=='user'||j.important!==true||!same(j.fieldMask,['lifecycle'])||j.afterRevision!==j.baseRevision+1||before.lifecycle!==(restore?'removed':'active')||!same(after,{...before,lifecycle:restore?'active':'removed'})||restore&&!authority(selected,j,'restore'))return null;
   if(restore)pendingRestore=j;
  }else if((['shared_input_edit','shared_entry_edit'].includes(j.reason)||j.reason==='restore'&&same(j.fieldMask,['body']))){
   if(j.actor!=='user'||!same(j.fieldMask,['body'])||j.afterRevision<=j.baseRevision||before.lifecycle!=='active'||!same(before,after))return null;
  }else if(j.reason==='organizer'){
   if(j.actor!=='ai'||j.important!==true||!same(j.fieldMask,['provenance'])||!same(before,after)||j.afterRevision!==j.baseRevision)return null;
  }else return null;
  const prior=await t.edge('revisions','byList',IDBKeyRange.bound([entityKey],[entityKey,j.sequence],false,true),'prev');
  if(!valid(prior)||prior.sequence>=j.sequence||!same(fieldSnapshot(prior.after),before))return null;
  if(!same(j.fieldMask,['body'])&&!(mergedBody&&j.reason==='shared_entry_edit')&&prior.afterRevision>j.baseRevision){
   // The original reverse-edit owner atomically journals shared body first,
   // then metadata from the same original base. Only that exact paired write
   // may overlap; unrelated or synthetic predecessors remain disallowed.
   const receipt=await t.get('operationReceipts',j.operationId);
   if(!['edit','restore'].includes(j.reason)||!validBoundFields([...(mergedBody?j.fieldMask.slice(1):j.fieldMask)].sort())||prior.reason!=='shared_entry_edit'||prior.actor!=='user'||prior.important!==true||!same(prior.fieldMask,['body'])||prior.operationId!==j.operationId||prior.afterRevision!==j.baseRevision+1||j.afterRevision!==prior.afterRevision+1||!same(prior.before,j.before)||prior.after.body!==j.after.body||prior.after.bindingRevision!==j.after.bindingRevision||prior.after.bindingLength!==j.after.bindingLength||receipt?.namespace!=='thought-library'||!(receipt.ownerId===row.id&&receipt.result?.id===row.id&&receipt.result.revision===j.afterRevision||receipt.result?.items?.some(x=>x.id===row.id&&x.revision===j.afterRevision)))return null;
   if(!j.important)for(const f of j.fieldMask)maximum[f]--;
  }else if((same(j.fieldMask,['body'])||mergedBody&&j.reason==='shared_entry_edit')&&prior.afterRevision>=j.afterRevision)return null;
  j=prior;
 }
 return null;
}

export async function readBoundEntryContext(store,t,entryId,descriptor=null,topicId=null){
 const row=await t.get('thoughts',entryId);
 try{validateFields({body:row?.thoughtText,title:row?.title??'',note:row?.note,type:row?.type,formation:row?.formation});}catch{return null;}
 if(!row||row.id!==entryId||!idOK(entryId)||row.storageSchema!==2||!['ai','user'].includes(row.origin)||row.hasHumanAction!==true||row.userEdited!==true||row.lifecycle!=='active'||row.bodyBinding!=='input'||row.provenanceType!=='input_original'||row.formation!=='explicit'||row.integrity!=='complete'||row.freshness!=='current'||!array(row.staleReasons,0)||!stamp(row.createdAt)||!revisionOK(row.revision)||!revisionOK(row.contentRevision)||!revisionOK(row.organizationRevision)||!revisionOK(row.bindingRevision)||!revisionOK(row.bindingLength)||row.bindingLength!==row.thoughtText.length||!ids(row.sourceRecordIds)||!array(row.inputRefs,1,1)||row.inputRefs[0].inputBlockId!==row.workingInputId||!idOK(row.workingInputId)||!ENTRY_FIELDS.every(f=>revisionOK(row.fieldRevisions?.[f]))||row.fieldRevisions.type!==0||row.fieldRevisions.formation!==0||!validOrganizationIntents(row.organizationIntents)||row.organizationIntents.legacyProtected)return null;
 const selectedFields=BOUND_CONTEXT_FIELDS.filter(f=>(row[f]??'').trim()||row.fieldRevisions[f]>0);
 if(!selectedFields.length||!selectedFields.every(f=>humanField(row,f)))return null;
 const state=await t.get('inputStates',row.workingInputId),index=await t.get('blockIndex',row.workingInputId);
 if(!state||state.removalState!=='active'||state.sourcePurged||!revisionOK(state.contentRevision)||state.contentRevision!==row.bindingRevision||!revisionOK(state.lastRemovalSequence??0)||!same([...(state.sourceRecordIds||[])].sort(),row.sourceRecordIds)||!index||index.excluded!==false)return null;
 const dependencies=await t.all('dependencies','byTarget',prefix(['entry',entryId]),2);
 if(dependencies.length!==1)return null;const dep=dependencies[0];
 if(dep.targetKind!=='entry'||dep.targetId!==entryId||dep.inputId!==row.workingInputId||dep.status!=='valid'||!same(dep.roles,['primary'])||!same(dep.selectedFields,['body'])||!contextTopicDigest(dep.fieldDigests?.body)||!same([...(dep.sourceRecordIds||[])].sort(),row.sourceRecordIds))return null;
 const provenance=await t.all('provenance','byOwner',prefix(['entry',entryId]),BOUND_CONTEXT_LIMITS.provenance+1);
 if(!provenance.length||provenance.length>BOUND_CONTEXT_LIMITS.provenance||provenance.some(p=>p.ownerKind!=='entry'||p.ownerId!==entryId||p.inputId!==row.workingInputId||p.role!=='primary'||p.contributionType!=='exact_excerpt'||p.span?.field!=='body'||p.span.start!==0||p.span.full!==true||!revisionOK(p.span.end)||!same(p.actualVersion?.selectedFields,['body'])||!same([...(p.sourceRecordIds||[])].sort(),row.sourceRecordIds)))return null;
 const sourceIdentityTokens=[];
 for(const id of row.sourceRecordIds){const ix=await t.get('recordIndex',id);if(!ix||!await t.get('records',id)||await t.get('tombstones','source:'+ix.sourceKey)||await t.get('tombstones','snapshot:'+ix.dedupeKey))return null;sourceIdentityTokens.push(ix.sourceKey||'legacy:'+id);}
 const journal=await t.edge('revisions','byList',prefix(['library_entry:'+entryId]),'prev');
 if(!journal||journal.afterRevision>row.revision||!same(fieldSnapshot(journal.after),fieldSnapshot({...row,body:row.thoughtText})))return null;
 if(descriptor?.kind==='library_entry'&&(descriptor.entityId!==entryId||descriptor.recordId!==entryId||descriptor.removed||descriptor.independent||descriptor.journalId!==journal.id||descriptor.revision!==journal.afterRevision||!same(descriptor.sourceRecordIds,row.sourceRecordIds)||!array(descriptor.inputIds,0)))return null;
 if(descriptor&&!['library_entry','placement'].includes(descriptor.kind))return null;
 const history=await fieldAuthority(t,row,journal,selectedFields);if(!history)return null;
 const count=await t.count('placements','byEntry',prefix([entryId]));if(!revisionOK(count)||count>BOUND_CONTEXT_LIMITS.memberships)return null;
 let after=null,total=0;const active=[];
 do{const page=await t.rangePage('placements','byEntry',prefix([entryId]),after,BOUND_CONTEXT_LIMITS.page);if(!page||!array(page.rows,BOUND_CONTEXT_LIMITS.page)||!Object.hasOwn(page,'next')||page.next!==null&&!page.rows.length)return null;let previous=after;
  for(const {key,value:p}of page.rows){if(++total>BOUND_CONTEXT_LIMITS.memberships||previous!==null&&store.repository.factory.cmp(previous,key)>=0)return null;previous=key;if(!p||p.entryId!==entryId||p.id!==JSON.stringify([p.topicId,p.layoutGeneration,entryId])||!revisionOK(p.layoutGeneration)||p.layoutGeneration<1||!revisionOK(p.revision)||!rank(p.rank)||!rank(p.sectionRank)||!['active','removed','quarantined'].includes(p.lifecycle))return null;const topic=await t.get('topics',p.topicId);if(!topic||!revisionOK(topic.activeLayoutGeneration))return null;if(p.lifecycle==='active'&&topic.activeLayoutGeneration===p.layoutGeneration&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo)active.push({p,topic});}
  if(page.next!==null&&(previous===null||store.repository.factory.cmp(page.next,previous)!==0))return null;after=page.next;
 }while(after!==null);
 if(total!==count)return null;const selected=topicId?active.filter(x=>x.p.topicId===topicId):active;if(selected.length!==1)return null;
 const {p,topic}=selected[0],intent=row.organizationIntents.edges[p.topicId],section=await t.get('sections',JSON.stringify([p.topicId,p.layoutGeneration,p.sectionId]));
 if(topic.lifecycle!=='active'||topic.layoutJobId||topic.identity?.noRecreation||!revisionOK(topic.revision)||!revisionOK(topic.organizationRevision)||p.membershipAuthorship!=='user'||p.sectionProtection!==true||p.orderProtection!==true||p.excludedByUser||intent?.actor!=='user'||intent.include!==true||!row.organizationIntents.included.includes(p.topicId)||row.organizationIntents.excluded.includes(p.topicId)||row.organizationIntents.fixed&&!row.organizationIntents.fixed.topicIds.includes(p.topicId)||!section||section.lifecycle!=='active'||section.redirectTo||section.topicId!==p.topicId||section.sectionId!==p.sectionId||section.layoutGeneration!==p.layoutGeneration||section.rank!==p.sectionRank||!revisionOK(section.revision))return null;
 const placementJournal=await t.edge('revisions','byList',prefix(['placement:'+p.id]),'prev');
 if(!placementJournal||placementJournal.actor!=='user'||placementJournal.kind!=='placement'||placementJournal.entityId!==p.id||placementJournal.documentId!==p.topicId||!['place','restore'].includes(placementJournal.reason)||!same(placementJournal.fieldMask,['membership','section','order'])||!same(placementJournal.after,p)||placementJournal.operationId!==intent.operationId||!same([...(placementJournal.sourceRecordIds||[])].sort(),row.sourceRecordIds))return null;
 if(descriptor?.kind==='placement'&&(descriptor.entityId!==p.id||descriptor.recordId!==p.id||descriptor.revision!==p.revision||descriptor.journalId!==placementJournal.id||descriptor.removed||!same(descriptor.sourceRecordIds,row.sourceRecordIds)))return null;
 return {kind:'boundEntry',entryId,entryRevision:row.revision,entryCreatedAt:row.createdAt,...history,inputId:row.workingInputId,inputContentRevision:state.contentRevision,expectedRemovalSequence:state.lastRemovalSequence??0,sourceRecordIds:[...row.sourceRecordIds],sourceIdentityTokens:[...new Set(sourceIdentityTokens)].sort(),selectedFields,fieldRevisions:Object.fromEntries(selectedFields.map(f=>[f,row.fieldRevisions[f]])),fieldOperationIds:Object.fromEntries(selectedFields.map(f=>[f,row.authorship[f].operationId])),topicId:p.topicId,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,sectionId:p.sectionId,sectionRevision:section.revision,layoutGeneration:p.layoutGeneration,placementId:p.id,placementRevision:p.revision,membershipOperationId:intent.operationId,rank:p.rank,sectionRank:p.sectionRank};
}
const evidenceKeys=['kind','topicId','entryId','entryCreatedAt','birthOperationId','inputId','sourceRecordIds','sourceIdentityTokens','expectedRemovalSequence','selectedFields','fieldRevisions','fieldOperationIds','fieldDigests','expectedTopicBinding','membership'];
export function validBoundContextEvidence(x){
 const m=x?.membership,fields=x?.selectedFields;
 return exact(x,evidenceKeys)&&x.kind==='boundEntry'&&idOK(x.entryId)&&idOK(x.inputId)&&idOK(x.topicId)&&stamp(x.entryCreatedAt)&&operation(x.birthOperationId)&&ids(x.sourceRecordIds)&&array(x.sourceIdentityTokens,128,1)&&same(x.sourceIdentityTokens,[...new Set(x.sourceIdentityTokens)].sort())&&x.sourceIdentityTokens.every(s=>typeof s==='string'&&(contextTopicDigest(s)||s.startsWith('legacy:')&&x.sourceRecordIds.includes(s.slice(7))))&&revisionOK(x.expectedRemovalSequence)&&validBoundFields(fields)&&exact(x.fieldRevisions,fields)&&exact(x.fieldOperationIds,fields)&&exact(x.fieldDigests,fields)&&fields.every(f=>revisionOK(x.fieldRevisions[f])&&operation(x.fieldOperationIds[f])&&contextTopicDigest(x.fieldDigests[f]))&&validContextTopicBinding(x.expectedTopicBinding)&&x.expectedTopicBinding.topicId===x.topicId&&exact(m,['placementId','revision','sectionId','sectionRevision','layoutGeneration','operationId','rank','sectionRank'])&&idOK(m.sectionId)&&revisionOK(m.revision)&&revisionOK(m.sectionRevision)&&revisionOK(m.layoutGeneration)&&m.layoutGeneration>0&&m.placementId===JSON.stringify([x.topicId,m.layoutGeneration,x.entryId])&&operation(m.operationId)&&rank(m.rank)&&rank(m.sectionRank);
}
export function boundContextEvidence(mapping,binding,digests){
 const m=mapping;return {kind:'boundEntry',topicId:m.topicId,entryId:m.entryId,entryCreatedAt:m.entryCreatedAt,birthOperationId:m.birthOperationId,inputId:m.inputId,sourceRecordIds:[...m.sourceRecordIds],sourceIdentityTokens:[...m.sourceIdentityTokens],expectedRemovalSequence:m.expectedRemovalSequence,selectedFields:[...m.selectedFields],fieldRevisions:structuredClone(m.fieldRevisions),fieldOperationIds:structuredClone(m.fieldOperationIds),fieldDigests:structuredClone(digests),expectedTopicBinding:structuredClone(binding),membership:{placementId:m.placementId,revision:m.placementRevision,sectionId:m.sectionId,sectionRevision:m.sectionRevision,layoutGeneration:m.layoutGeneration,operationId:m.membershipOperationId,rank:m.rank,sectionRank:m.sectionRank}};
}
export const boundContextEvidenceMatches=(spec,mapping)=>!!mapping&&validBoundContextEvidence(spec)&&same(spec,boundContextEvidence(mapping,spec.expectedTopicBinding,spec.fieldDigests));
