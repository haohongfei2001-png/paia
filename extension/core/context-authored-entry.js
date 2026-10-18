import {ENTRY_FIELDS,entrySnapshot,validateFields,idOK,revisionOK,prefix} from './thought-model.js';
import {validOrganizationIntents} from './topic-identity-backup.js';
import {validContextTopicBinding,contextTopicDigest} from './context-topic-preferences.js';

// Only the original source-free human owner. This module grants no processing,
// creates no Input/Source, and never retains body material or writes an owner.
export const AUTHORED_CONTEXT_LIMITS=Object.freeze({memberships:4096,restoreHistory:4096,page:100});
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>plain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const empty=x=>Array.isArray(x)&&x.length===0&&Reflect.ownKeys(x).length===1;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const operation=x=>idOK(x)&&x.length>=8;
const rank=x=>typeof x==='string'&&/^\d{12}$/.test(x);
const human=x=>plain(x)&&x.actor==='user'&&x.everHumanConfirmed===true&&operation(x.operationId)&&stamp(x.at);
const locked=x=>plain(x)&&x.locked===true&&operation(x.operationId)&&stamp(x.at);

export function sourceFreeHumanEntry(row){
 try{validateFields({body:row?.thoughtText,title:row?.title??'',note:row?.note,type:row?.type,formation:row?.formation});}catch{return false;}
 return !!row&&idOK(row.id)&&row.storageSchema===2&&row.origin==='user'&&row.provenanceType==='user_created'&&row.bodyBinding==='thought'
  &&!['workingInputId','bindingRevision','bindingLength'].some(k=>Object.hasOwn(row,k))&&empty(row.inputRefs)&&empty(row.sourceRecordIds)
  &&row.hasHumanAction===true&&row.userEdited===true&&row.integrity==='detached'&&row.lifecycle==='active'&&row.freshness==='current'&&empty(row.staleReasons)
  &&revisionOK(row.revision)&&revisionOK(row.contentRevision)&&revisionOK(row.organizationRevision)&&row.dependencyRevision===0&&stamp(row.createdAt)
  &&typeof row.thoughtText==='string'&&new TextEncoder().encode(row.thoughtText).length<=200*1024
  &&ENTRY_FIELDS.every(f=>revisionOK(row.fieldRevisions?.[f])&&human(row.authorship?.[f])&&locked(row.protections?.[f])&&row.authorship[f].operationId===row.protections[f].operationId)
  &&row.organizationIntents?.version===1&&validOrganizationIntents(row.organizationIntents)&&!row.organizationIntents.legacyProtected;
}
// The zero-count shortcut is specific to this canonical owner, not a general
// empty Source array. Count both actual indexed closures in the same read.
export async function sourceFreeHumanEntryProof(t,row){
 if(!sourceFreeHumanEntry(row))return false;
 return await t.count('dependencies','byTarget',prefix(['entry',row.id]))===0&&await t.count('provenance','byOwner',prefix(['entry',row.id]))===0;
}

// Body edits and lifecycle restores share one retained journal authority chain.
// Every before-image must match the immediately preceding after-image; row
// revision gaps may be human placement changes, never a missing content link.
async function authoredBodyAuthority(t,row,birth,current){
 const entityKey='library_entry:'+row.id;
 const valid=j=>j&&j.kind==='library_entry'&&j.entityId===row.id&&j.entityKey===entityKey&&j.documentId===row.id&&j.actor==='user'&&empty(j.sourceRecordIds)&&operation(j.operationId)&&revisionOK(j.baseRevision)&&revisionOK(j.afterRevision)&&j.afterRevision>=j.baseRevision&&revisionOK(j.sequence)&&j.sequence>0&&same(j.listKey,[entityKey,j.sequence]);
 let reads=0;const previous=j=>reads++<AUTHORED_CONTEXT_LIMITS.restoreHistory?t.edge('revisions','byList',IDBKeyRange.bound([entityKey],[entityKey,j.sequence],false,true),'prev'):null;
 if(row.contentRevision!==row.fieldRevisions.body||current.reason==='restore'&&ENTRY_FIELDS.some(f=>row.authorship[f].operationId!==current.operationId||row.protections[f].reason!=='restore'||row.authorship[f].at!==row.protections[f].at))return false;
 let journal=current,edits=0;const operations=new Set();
 while(valid(journal)&&!operations.has(journal.operationId)){
  operations.add(journal.operationId);
  if(journal.id===birth.id)return same(journal,birth)&&(edits?row.fieldRevisions.body>=edits:row.fieldRevisions.body===0);
  const before=journal.before,after=journal.after;
  if(!human(after?.bodyAuthorship)||!locked(after?.bodyProtection)||after.bodyAuthorship.operationId!==journal.operationId||after.bodyProtection.operationId!==journal.operationId||after.bodyAuthorship.at!==after.bodyProtection.at)return false;
  if(journal.reason==='edit'){
   // Coalesced A -> B -> A edits are genuine: require exact owner linkage,
   // not unequal body bytes or a one-row revision span.
   if(!same(journal.fieldMask,['body'])||journal.important!==false||journal.afterRevision<=journal.baseRevision||before?.lifecycle!=='active'||after.lifecycle!=='active'||after.bodyProtection.reason!=='user_edit'||!same(after,{...before,body:after.body,bodyAuthorship:after.bodyAuthorship,bodyProtection:after.bodyProtection,thoughtEditedAt:after.thoughtEditedAt}))return false;
   edits++;const authority=await previous(journal);
   if(!valid(authority)||authority.sequence>=journal.sequence||authority.afterRevision>journal.baseRevision||!same(authority.after,before))return false;
   journal=authority;continue;
  }
  if(journal.reason!=='restore'||journal.important!==true||!same(journal.fieldMask,['lifecycle'])||journal.afterRevision!==journal.baseRevision+1||before?.lifecycle!=='removed'||after.lifecycle!=='active'||after.bodyProtection.reason!=='restore'||journal.operationId===before.bodyAuthorship?.operationId||!same(after,{...before,lifecycle:'active',bodyAuthorship:after.bodyAuthorship,bodyProtection:after.bodyProtection}))return false;
  const removal=await previous(journal);
  if(!valid(removal)||removal.sequence>=journal.sequence||operations.has(removal.operationId)||removal.reason!=='remove'||removal.important!==true||!same(removal.fieldMask,['lifecycle'])||removal.afterRevision!==removal.baseRevision+1||removal.afterRevision!==journal.baseRevision||removal.before?.lifecycle!=='active'||!same(removal.after,{...removal.before,lifecycle:'removed'})||!same(removal.after,before))return false;
  operations.add(removal.operationId);const authority=await previous(removal);
  if(!valid(authority)||authority.sequence>=removal.sequence||authority.afterRevision>removal.baseRevision||!same(authority.after,removal.before))return false;
  journal=authority;
 }
 return false;
}

export async function readAuthoredEntryContext(store,t,entryId,descriptor=null){
 const row=await t.get('thoughts',entryId);
 if(!await sourceFreeHumanEntryProof(t,row)||row.id!==entryId||!row.thoughtText.trim()||row.title||row.note||row.formation!=='explicit'||ENTRY_FIELDS.filter(f=>f!=='body').some(f=>row.fieldRevisions[f]!==0))return null;
 if(descriptor&&(descriptor.kind!=='library_entry'||descriptor.entityId!==entryId||descriptor.recordId!==entryId||!empty(descriptor.sourceRecordIds)||!empty(descriptor.inputIds)))return null;
 const birth=await t.edge('revisions','byList',prefix(['library_entry:'+entryId]),'next');
 if(!birth||birth.kind!=='library_entry'||birth.entityId!==entryId||birth.actor!=='user'||birth.reason!=='baseline'||birth.important!==true||birth.baseRevision!==0||birth.afterRevision!==0||!empty(birth.sourceRecordIds)||!same(birth.fieldMask,ENTRY_FIELDS)||!same(birth.before,birth.after)||!operation(birth.operationId))return null;
 if(birth.after?.bodyAuthorship?.operationId!==birth.operationId||birth.after.bodyAuthorship.at!==row.createdAt||birth.after.bodyProtection?.operationId!==birth.operationId||birth.after.bodyProtection.reason!=='user_created'||ENTRY_FIELDS.filter(f=>f!=='body').some(f=>birth.after?.[f]!==entrySnapshot(row)[f]))return null;
 const journal=descriptor?await t.get('revisions',descriptor.journalId):await t.edge('revisions','byList',prefix(['library_entry:'+entryId]),'prev');
 if(!journal||journal.kind!=='library_entry'||journal.entityId!==entryId||journal.actor!=='user'||!empty(journal.sourceRecordIds)||!revisionOK(journal.baseRevision)||!revisionOK(journal.afterRevision)||journal.afterRevision>row.revision||descriptor&&journal.afterRevision!==descriptor.revision||journal.operationId!==row.authorship.body.operationId||!same(journal.after,entrySnapshot(row)))return null;
 const baseline=journal.id===birth.id&&row.fieldRevisions.body===0&&row.protections.body.reason==='user_created'&&row.authorship.body.at===row.createdAt;
 if(!baseline&&!await authoredBodyAuthority(t,row,birth,journal))return null;
 const count=await t.count('placements','byEntry',prefix([entryId]));
 if(!revisionOK(count)||count>AUTHORED_CONTEXT_LIMITS.memberships)return null;
 let after=null,total=0;const current=[];
 do{
  const page=await t.rangePage('placements','byEntry',prefix([entryId]),after,AUTHORED_CONTEXT_LIMITS.page);
  if(!page||!Array.isArray(page.rows)||page.rows.length>AUTHORED_CONTEXT_LIMITS.page||!Object.hasOwn(page,'next')||page.next!==null&&!page.rows.length)return null;
  let previous=after;
  for(const {key,value:p}of page.rows){
   if(++total>AUTHORED_CONTEXT_LIMITS.memberships||previous!==null&&store.repository.factory.cmp(previous,key)>=0)return null;previous=key;
   if(!p||p.entryId!==entryId||!idOK(p.topicId)||!idOK(p.sectionId)||!revisionOK(p.layoutGeneration)||p.layoutGeneration<1||p.id!==JSON.stringify([p.topicId,p.layoutGeneration,entryId])||!revisionOK(p.revision)||!rank(p.rank)||!rank(p.sectionRank)||!['active','removed','quarantined'].includes(p.lifecycle))return null;
   const topic=await t.get('topics',p.topicId);if(!topic||!revisionOK(topic.activeLayoutGeneration)||!['active','candidate','dormant','merged','removed'].includes(topic.lifecycle))return null;
   if(p.lifecycle==='active'&&topic.activeLayoutGeneration===p.layoutGeneration&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo)current.push({p,topic});
  }
  if(page.next!==null&&(previous===null||store.repository.factory.cmp(page.next,previous)!==0))return null;
  after=page.next;
 }while(after!==null);
 if(total!==count||current.length!==1)return null;
 const {p,topic}=current[0],intent=row.organizationIntents.edges[p.topicId];
 if(topic.lifecycle!=='active'||topic.layoutJobId||topic.identity?.noRecreation||!revisionOK(topic.revision)||!revisionOK(topic.organizationRevision)||p.membershipAuthorship!=='user'||p.sectionProtection!==true||p.orderProtection!==true||p.excludedByUser||intent?.actor!=='user'||intent.include!==true||!row.organizationIntents.included.includes(p.topicId)||row.organizationIntents.excluded.includes(p.topicId)||row.organizationIntents.fixed&&!row.organizationIntents.fixed.topicIds.includes(p.topicId))return null;
 const section=await t.get('sections',JSON.stringify([p.topicId,p.layoutGeneration,p.sectionId]));
 if(!section||section.lifecycle!=='active'||section.redirectTo||section.topicId!==p.topicId||section.layoutGeneration!==p.layoutGeneration||section.sectionId!==p.sectionId||section.rank!==p.sectionRank||!revisionOK(section.revision))return null;
 const placementJournal=await t.edge('revisions','byList',prefix(['placement:'+p.id]),'prev');
 if(!placementJournal||placementJournal.actor!=='user'||placementJournal.kind!=='placement'||placementJournal.entityId!==p.id||placementJournal.documentId!==p.topicId||!['place','restore'].includes(placementJournal.reason)||!same(placementJournal.fieldMask,['membership','section','order'])||!same(placementJournal.after,p)||placementJournal.operationId!==intent.operationId)return null;
 return {kind:'humanEntry',entryId,entryRevision:row.revision,entryCreatedAt:row.createdAt,birthOperationId:birth.operationId,bodyFieldRevision:row.fieldRevisions.body,bodyOperationId:row.authorship.body.operationId,topicId:p.topicId,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,sectionId:p.sectionId,sectionRevision:section.revision,layoutGeneration:p.layoutGeneration,placementId:p.id,placementRevision:p.revision,membershipOperationId:intent.operationId,rank:p.rank,sectionRank:p.sectionRank};
}

const keys=['kind','topicId','entryId','entryCreatedAt','birthOperationId','bodyFieldRevision','bodyOperationId','selectedFields','fieldDigests','expectedTopicBinding','membership'];
export function validAuthoredContextEvidence(x){
 const m=x?.membership;
 return exact(x,keys)&&x.kind==='humanEntry'&&idOK(x.entryId)&&idOK(x.topicId)&&stamp(x.entryCreatedAt)&&operation(x.birthOperationId)&&operation(x.bodyOperationId)&&revisionOK(x.bodyFieldRevision)&&same(x.selectedFields,['body'])&&exact(x.fieldDigests,['body'])&&contextTopicDigest(x.fieldDigests.body)&&validContextTopicBinding(x.expectedTopicBinding)&&x.expectedTopicBinding.topicId===x.topicId
  &&exact(m,['placementId','revision','sectionId','sectionRevision','layoutGeneration','operationId','rank','sectionRank'])&&idOK(m.sectionId)&&revisionOK(m.revision)&&revisionOK(m.sectionRevision)&&revisionOK(m.layoutGeneration)&&m.layoutGeneration>0&&m.placementId===JSON.stringify([x.topicId,m.layoutGeneration,x.entryId])&&operation(m.operationId)&&rank(m.rank)&&rank(m.sectionRank);
}
export function authoredContextEvidence(mapping,binding,bodyDigest){
 const m=mapping;
 return {kind:'humanEntry',topicId:m.topicId,entryId:m.entryId,entryCreatedAt:m.entryCreatedAt,birthOperationId:m.birthOperationId,bodyFieldRevision:m.bodyFieldRevision,bodyOperationId:m.bodyOperationId,selectedFields:['body'],fieldDigests:{body:bodyDigest},expectedTopicBinding:structuredClone(binding),membership:{placementId:m.placementId,revision:m.placementRevision,sectionId:m.sectionId,sectionRevision:m.sectionRevision,layoutGeneration:m.layoutGeneration,operationId:m.membershipOperationId,rank:m.rank,sectionRank:m.sectionRank}};
}
export function authoredContextEvidenceMatches(spec,mapping){
 return !!mapping&&validAuthoredContextEvidence(spec)&&same(spec,authoredContextEvidence(mapping,spec.expectedTopicBinding,spec.fieldDigests.body));
}
