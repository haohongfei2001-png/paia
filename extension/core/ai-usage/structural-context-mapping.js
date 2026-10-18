import {readTopicContext,topicContextMaterial,validTopicContextEvidence,readTopicContextEvidence} from './topic-context-mapping.js';
import {planHumanSectionEdit} from '../thought-organization.js';
import {inputProjection} from '../thought-evidence.js';
import {prefix,revisionOK,idOK} from '../thought-model.js';
import {equal} from './contracts.js';

// Deliberately finite: an actual human Section title edit, or the companion
// selected Topic-name mapper, with complete current manual membership and
// <=16 complete original Input mirrors. This is Context
// interpretation, never Topic formation or authority to rewrite organization.
// Empty membership, cosmetic/baseline/restore/layout/type/formation/derived/unknown cases
// remain pending. Labels never stand in for evidence bodies or independent facts.
export const STRUCTURAL_CONTEXT_LIMIT=16;
const sectionSnapshot=row=>{const {searchVersion,...value}=row||{};return value;};
const normalized=x=>typeof x==='string'?x.trim().replace(/\s+/g,' '):null;
export async function readStructuralContext(store,t,d){
 if(d?.kind==='topic')return readTopicContext(store,t,d);
 if(d?.kind!=='section'||d.removed||d.fenceOnly||d.independent||!idOK(d.entityId)||!idOK(d.topicId))return null;
 const row=await t.get('sections',d.recordId),topic=await t.get('topics',d.topicId),j=await t.get('revisions',d.journalId);
 if(!row||row.id!==JSON.stringify([d.topicId,d.layoutGeneration,d.entityId])||row.sectionId!==d.entityId||row.topicId!==d.topicId||row.layoutGeneration!==d.layoutGeneration||row.revision!==d.revision||row.lifecycle!=='active'||row.activeKey!==0||row.redirectTo||!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.identity?.noRecreation||topic.activeLayoutGeneration!==d.layoutGeneration||!revisionOK(topic.revision)||!revisionOK(topic.organizationRevision))return null;
 if(j?.kind!=='section'||j.actor!=='user'||j.reason!=='rename'||j.important!==true||j.entityId!==d.entityId||j.documentId!==d.topicId||j.entityKey!=='section:'+d.entityId||!equal(j.fieldMask,['title'])||!equal(sectionSnapshot(j.after),sectionSnapshot(row))||j.afterRevision!==row.revision||!revisionOK(j.baseRevision)||j.afterRevision!==j.baseRevision+1||j.before?.revision!==j.baseRevision||!j.before||j.before.id!==row.id||j.before.lifecycle!=='active'||normalized(j.before.title)===normalized(row.title)||typeof row.title!=='string'||row.title.length>300||!idOK(j.operationId)||!equal([...(j.sourceRecordIds||[])].sort(),d.sourceRecordIds)||!await store.sourcePresent(t,j.sourceRecordIds||[]))return null;
 const latest=await t.edge('revisions','byList',prefix(['section:'+d.entityId]),'prev');
 const human=row.authorship?.title,protection=row.protections?.title;
 if(latest?.id!==j.id||human?.actor!=='user'||human.everHumanConfirmed!==true||human.operationId!==j.operationId||protection?.locked!==true||protection.operationId!==j.operationId||protection.at!==human.at||protection.reason!=='user_edit')return null;
 const receipt=await t.get('operationReceipts',j.operationId);
 if(receipt?.namespace!=='thought-library'||receipt.ownerId!==row.sectionId||receipt.result?.id!==row.sectionId||receipt.result.revision!==row.revision||!equal(sectionSnapshot(planHumanSectionEdit(j.before,{title:row.title,operationId:j.operationId},human.at)),sectionSnapshot(row)))return null;
 const range=prefix([row.topicId,row.layoutGeneration,row.sectionId,0]),count=await t.count('placements','bySectionOrder',range);
 if(!Number.isSafeInteger(count)||count<1||count>Math.min(STRUCTURAL_CONTEXT_LIMIT,store.organizerBudget.limits.maxInputs))return null;
 const placements=await t.all('placements','bySectionOrder',range,STRUCTURAL_CONTEXT_LIMIT+1);if(placements.length!==count)return null;
 const entries=[],sources=new Set();
 for(const p of placements){
  if(p.id!==JSON.stringify([row.topicId,row.layoutGeneration,p.entryId])||p.topicId!==row.topicId||p.sectionId!==row.sectionId||p.layoutGeneration!==row.layoutGeneration||p.sectionRank!==row.rank||p.lifecycle!=='active'||p.activeKey!==0||p.excludedByUser||p.membershipAuthorship!=='user'||p.sectionProtection!==true||p.orderProtection!==true||!revisionOK(p.revision))return null;
  const e=await t.get('thoughts',p.entryId),pj=await t.edge('revisions','byList',prefix(['placement:'+p.id]),'prev');
  if(!e||e.lifecycle!=='active'||e.bodyBinding!=='input'||e.provenanceType!=='input_original'||e.integrity!=='complete'||e.freshness!=='current'||e.formation!=='explicit'||e.staleReasons?.length||e.inputRefs?.length!==1||e.workingInputId!==e.inputRefs[0].inputBlockId||e.note||e.title||['title','note','type','formation'].some(f=>e.fieldRevisions?.[f]!==0)||!revisionOK(e.revision))return null;
  const intent=e.organizationIntents?.edges?.[row.topicId];
  if(intent?.actor!=='user'||intent.include!==true||!e.organizationIntents.included.includes(row.topicId)||e.organizationIntents.excluded.includes(row.topicId)||e.organizationIntents.legacyProtected||e.organizationIntents.fixed&&!e.organizationIntents.fixed.topicIds.includes(row.topicId)||pj?.actor!=='user'||pj.kind!=='placement'||pj.entityId!==p.id||pj.documentId!==row.topicId||!['place','restore'].includes(pj.reason)||!equal(pj.fieldMask,['membership','section','order'])||!equal(pj.after,p)||pj.operationId!==intent.operationId)return null;
  const input=await t.get('inputStates',e.workingInputId),ix=await t.get('blockIndex',e.workingInputId);
  if(!input||input.removalState!=='active'||input.sourcePurged||input.contentRevision!==e.bindingRevision||ix?.excluded!==false||!equal([...(input.sourceRecordIds||[])].sort(),[...(e.sourceRecordIds||[])].sort())||!await store.sourcePresent(t,e.sourceRecordIds))return null;
  for(const id of e.sourceRecordIds)sources.add(id);
  entries.push({entryId:e.id,revision:e.revision,inputId:e.workingInputId,inputRevision:input.contentRevision,removalSequence:input.lastRemovalSequence??0,placementId:p.id,placementRevision:p.revision,rank:p.rank,membershipOperationId:intent.operationId});
 }
 if((j.sourceRecordIds||[]).some(id=>!sources.has(id)))return null;
 entries.sort((a,b)=>a.entryId.localeCompare(b.entryId));
 if(new Set(entries.map(e=>e.entryId)).size!==count||sources.size>20)return null;
 return {sectionId:row.sectionId,recordId:row.id,sectionRevision:row.revision,layoutGeneration:row.layoutGeneration,topicId:topic.id,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,journalId:j.id,operationId:j.operationId,selectedFields:['title'],entries,sourceRecordIds:[...sources].sort()};
}
export function structuralContextScope(mapping){const {sourceRecordIds,...scope}=mapping;return structuredClone(scope);}
export function structuralContextMaterial(mapping,view){
 if(mapping?.kind==='topic')return topicContextMaterial(mapping,view);
 const section=view.sections?.find(s=>s.id===mapping.recordId&&s.sectionId===mapping.sectionId&&s.topicId===mapping.topicId&&s.layoutGeneration===mapping.layoutGeneration&&s.revision===mapping.sectionRevision);
 if(!section||typeof section.title!=='string')return null;
 return {...structuralContextScope(mapping),title:section.title};
}

const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const array=x=>Array.isArray(x)&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
const mappingKeys=['sectionId','recordId','sectionRevision','layoutGeneration','topicId','topicRevision','topicOrganizationRevision','journalId','operationId','selectedFields','entries'];
export function validStructuralContextEvidence(m){
 if(m?.kind==='topic')return validTopicContextEvidence(m);
 return exact(m,[...mappingKeys,'fieldDigests'])&&['sectionId','topicId','journalId','operationId'].every(k=>idOK(m[k]))&&['sectionRevision','topicRevision','topicOrganizationRevision'].every(k=>revisionOK(m[k]))&&revisionOK(m.layoutGeneration)&&m.layoutGeneration>0&&m.recordId===JSON.stringify([m.topicId,m.layoutGeneration,m.sectionId])&&equal(m.selectedFields,['title'])&&exact(m.fieldDigests,['title'])&&/^[a-f0-9]{64}$/.test(m.fieldDigests.title)&&array(m.entries)&&m.entries.length>0&&m.entries.length<=STRUCTURAL_CONTEXT_LIMIT&&new Set(m.entries.map(e=>e?.entryId)).size===m.entries.length&&m.entries.every(e=>exact(e,['entryId','revision','inputId','inputRevision','removalSequence','placementId','placementRevision','rank','membershipOperationId'])&&['entryId','inputId','membershipOperationId'].every(k=>idOK(e[k]))&&['revision','inputRevision','removalSequence','placementRevision'].every(k=>revisionOK(e[k]))&&e.placementId===JSON.stringify([m.topicId,m.layoutGeneration,e.entryId])&&/^\d{12}$/.test(e.rank));
}
export const structuralContextEvidence=(mapping,fieldDigests)=>({...structuralContextScope(mapping),fieldDigests:structuredClone(fieldDigests)});
export async function readStructuralContextEvidence(store,t,spec){
 if(spec?.kind==='topic')return readTopicContextEvidence(store,t,spec);
 if(!validStructuralContextEvidence(spec))return null;
 const j=await t.get('revisions',spec.journalId),mapping=await readStructuralContext(store,t,{kind:'section',entityId:spec.sectionId,recordId:spec.recordId,topicId:spec.topicId,layoutGeneration:spec.layoutGeneration,revision:spec.sectionRevision,journalId:spec.journalId,sourceRecordIds:[...(j?.sourceRecordIds||[])].sort()});
 if(!mapping||!equal(structuralContextEvidence(mapping,spec.fieldDigests),spec))return null;
 const inputs={};for(const inputId of new Set(mapping.entries.map(e=>e.inputId))){const current=await inputProjection(store,t,inputId);if(!current)return null;inputs[inputId]=current.body;}
 return {mapping,fields:{title:(await t.get('sections',mapping.recordId)).title},inputs};
}

export const structuralContextProperty=m=>m?.kind==='topic'?'humanTopic':'humanSection';
export function structuralContextGroups(mappings,convert=structuralContextScope){const sections=mappings.filter(m=>m.kind!=='topic'),topics=mappings.filter(m=>m.kind==='topic');return {...(sections.length?{structuralSections:sections.map(convert)}:{}),...(topics.length?{structuralTopics:topics.map(convert)}:{})};}
