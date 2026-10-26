import {planHumanTopicRename,planHumanTopicField} from '../topic-identity.js';
import {inputProjection} from '../thought-evidence.js';
import {prefix,revisionOK,idOK} from '../thought-model.js';
import {equal} from './contracts.js';

// A genuine current human rename/restore is selected interpretation, never an Input fact or permission
// to rewrite a Topic. Complete bounded manual membership remains indispensable.
export const TOPIC_CONTEXT_LIMIT=16;
// Only the existing rename semantics qualify the separate Topic facet.
const topicReconciliationMappings=new WeakSet(),topicNameRestoreMappings=new WeakMap();
// A restore has its own original-owner proof. Neither the rename capability
// nor the independently qualified Section restore grants this identity scope.
export const topicNameRestoreAllowsTopic=m=>!!m&&topicNameRestoreMappings.has(m)&&equal(topicNameRestoreMappings.get(m).mapping,m);
export const sameTopicNameRestoreProof=(a,b)=>topicNameRestoreAllowsTopic(a)&&topicNameRestoreAllowsTopic(b)&&equal(topicNameRestoreMappings.get(a),topicNameRestoreMappings.get(b));
export const topicContextAllowsTopic=m=>!!m&&topicReconciliationMappings.has(m);
const snapshot=row=>{const {searchVersion,updatedAt,countVersion,negativeUpdatedSequence,organizationRevision,...value}=row||{};return value;};
const normalized=x=>typeof x==='string'?x.normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/g,' '):null;
export async function readTopicContext(store,t,d){
 if(d?.kind!=='topic'||d.removed||d.fenceOnly||d.independent||!idOK(d.entityId)||d.recordId!==d.entityId)return null;
 const topic=await t.get('topics',d.entityId),j=await t.get('revisions',d.journalId);
 if(!topic||topic.id!==d.entityId||topic.revision!==d.revision||topic.lifecycle!=='active'||topic.activeKey!==0||topic.redirectTo||topic.layoutJobId||topic.identity?.noRecreation||!revisionOK(topic.revision)||!revisionOK(topic.organizationRevision)||!revisionOK(topic.activeLayoutGeneration)||topic.activeLayoutGeneration<1)return null;
 if(j?.kind!=='topic'||j.actor!=='user'||!['rename','restore'].includes(j.reason)||j.important!==true||j.entityId!==topic.id||j.documentId!==topic.id||j.entityKey!=='topic:'+topic.id||!equal(j.fieldMask,['name'])||!equal(snapshot(j.after),snapshot(topic))||j.afterRevision!==topic.revision||!revisionOK(j.baseRevision)||j.afterRevision!==j.baseRevision+1||j.before?.revision!==j.baseRevision||j.before?.id!==topic.id||j.before.lifecycle!=='active'||normalized(j.before.name)===normalized(topic.name)||typeof topic.name!=='string'||!topic.name.trim()||topic.name.length>300||!idOK(j.operationId)||!equal([...(j.sourceRecordIds||[])].sort(),d.sourceRecordIds)||!await store.sourcePresent(t,j.sourceRecordIds||[]))return null;
 const latest=await t.edge('revisions','byList',prefix(['topic:'+topic.id]),'prev'),human=topic.authorship?.name,protection=topic.protections?.name;
 if(latest?.id!==j.id||human?.actor!=='user'||human.everHumanConfirmed!==true||human.operationId!==j.operationId||protection?.locked!==true||protection.operationId!==j.operationId||protection.at!==human.at||protection.reason!=='user_edit')return null;
 const receipt=await t.get('operationReceipts',j.operationId);
 if(receipt?.namespace!=='thought-library'||receipt.ownerId!==topic.id||receipt.result?.id!==topic.id||receipt.result.revision!==topic.revision)return null;
 // Interpret the currently confirmed name; do not replay or read the old restore target.
 if(j.reason==='restore'&&(receipt.id!==j.operationId||receipt.schemaVersion!==1||!Number.isSafeInteger(receipt.operationSequence)||receipt.operationSequence<1||typeof receipt.createdAt!=='string'||!Number.isFinite(Date.parse(receipt.createdAt))||typeof receipt.digest!=='string'||!/^([a-f0-9]{64})$/.test(receipt.digest)||!equal(receipt.result,{id:topic.id,revision:topic.revision})))return null;
 try{
  const expected=structuredClone(j.before),prepared={beforeRevision:j.baseRevision,beforeName:j.before.name,oldToken:j.before.identity?.nameToken,newToken:j.after.identity?.nameToken};
  if(![prepared.oldToken,prepared.newToken].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))return null;
  // The original rename owner takes separate identity and field clocks.
  // Replay its recorded identity time rather than requiring same-millisecond writes.
  const renameTimes=[...new Set((j.after.identity?.aliases||[]).filter(a=>a.operationId===j.operationId&&a.revision===j.baseRevision).map(a=>a.at))];if(renameTimes.length>1||renameTimes.length&&!Number.isFinite(Date.parse(renameTimes[0])))return null;
  expected.identity=planHumanTopicRename(expected,prepared,j.operationId,renameTimes[0]??human.at).identity;expected.identity.nameToken=prepared.newToken;expected.name=topic.name;expected.nameKey=topic.name.toLocaleLowerCase();expected.revision++;Object.assign(expected,planHumanTopicField(expected,'name',topic.name,j.operationId,human.at));
  if(!equal(snapshot(expected),snapshot(j.after))||expected.organizationRevision!==j.after.organizationRevision)return null;
 }catch{return null;}
 const range=prefix([topic.id,topic.activeLayoutGeneration,0]),count=await t.count('placements','byTopicOrder',range);
 if(!Number.isSafeInteger(count)||count<1||count>Math.min(TOPIC_CONTEXT_LIMIT,store.organizerBudget.limits.maxInputs))return null;
 const placements=await t.all('placements','byTopicOrder',range,TOPIC_CONTEXT_LIMIT+1);if(placements.length!==count)return null;
 const entries=[],sources=new Set();
 for(const p of placements){
  const section=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,p.sectionId]));
  if(!idOK(p.entryId)||!idOK(p.sectionId)||!/^\d{12}$/.test(p.rank)||!section||!/^\d{12}$/.test(section.rank)||section.topicId!==topic.id||section.sectionId!==p.sectionId||section.layoutGeneration!==topic.activeLayoutGeneration||section.lifecycle!=='active'||section.activeKey!==0||section.redirectTo||!revisionOK(section.revision)||p.id!==JSON.stringify([topic.id,topic.activeLayoutGeneration,p.entryId])||p.topicId!==topic.id||p.layoutGeneration!==topic.activeLayoutGeneration||p.sectionRank!==section.rank||p.lifecycle!=='active'||p.activeKey!==0||p.excludedByUser||p.membershipAuthorship!=='user'||p.sectionProtection!==true||p.orderProtection!==true||!revisionOK(p.revision))return null;
  const e=await t.get('thoughts',p.entryId),pj=await t.edge('revisions','byList',prefix(['placement:'+p.id]),'prev');
  if(!e||e.lifecycle!=='active'||e.bodyBinding!=='input'||e.provenanceType!=='input_original'||e.integrity!=='complete'||e.freshness!=='current'||e.formation!=='explicit'||e.staleReasons?.length||e.inputRefs?.length!==1||e.workingInputId!==e.inputRefs[0]?.inputBlockId||!idOK(e.workingInputId)||!Array.isArray(e.sourceRecordIds)||!e.sourceRecordIds.length||e.sourceRecordIds.length>20||!e.sourceRecordIds.every(idOK)||e.note||e.title||['title','note','type','formation'].some(f=>e.fieldRevisions?.[f]!==0)||!revisionOK(e.revision))return null;
  const intent=e.organizationIntents?.edges?.[topic.id];
  if(intent?.actor!=='user'||intent.include!==true||!idOK(intent.operationId)||!Array.isArray(e.organizationIntents.included)||!Array.isArray(e.organizationIntents.excluded)||!e.organizationIntents.included.includes(topic.id)||e.organizationIntents.excluded.includes(topic.id)||e.organizationIntents.legacyProtected||e.organizationIntents.fixed&&!e.organizationIntents.fixed.topicIds.includes(topic.id)||pj?.actor!=='user'||pj.kind!=='placement'||pj.entityId!==p.id||pj.documentId!==topic.id||!['place','restore'].includes(pj.reason)||!equal(pj.fieldMask,['membership','section','order'])||!equal(pj.after,p)||pj.operationId!==intent.operationId)return null;
  const input=await t.get('inputStates',e.workingInputId),ix=await t.get('blockIndex',e.workingInputId);
  if(!input||input.removalState!=='active'||input.sourcePurged||input.contentRevision!==e.bindingRevision||!revisionOK(input.contentRevision)||!revisionOK(input.lastRemovalSequence??0)||ix?.excluded!==false||!equal([...(input.sourceRecordIds||[])].sort(),[...(e.sourceRecordIds||[])].sort())||!await store.sourcePresent(t,e.sourceRecordIds))return null;
  for(const id of e.sourceRecordIds)sources.add(id);
  entries.push({entryId:e.id,revision:e.revision,inputId:e.workingInputId,inputRevision:input.contentRevision,removalSequence:input.lastRemovalSequence??0,placementId:p.id,placementRevision:p.revision,rank:p.rank,membershipOperationId:intent.operationId,sectionId:p.sectionId,sectionRevision:section.revision,sectionRank:section.rank});
 }
 if((j.sourceRecordIds||[]).some(id=>!sources.has(id)))return null;
 entries.sort((a,b)=>a.entryId.localeCompare(b.entryId));if(new Set(entries.map(e=>e.entryId)).size!==count||sources.size>20)return null;
 const mapping={kind:'topic',recordId:topic.id,topicId:topic.id,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,layoutGeneration:topic.activeLayoutGeneration,journalId:j.id,operationId:j.operationId,selectedFields:['name'],entries,sourceRecordIds:[...sources].sort()};
 if(j.reason==='rename')topicReconciliationMappings.add(mapping);
 if(j.reason==='restore')topicNameRestoreMappings.set(mapping,{mapping:structuredClone(mapping),journal:structuredClone(j),receipt:structuredClone(receipt),topic:structuredClone(snapshot(topic))});
 return mapping;
}
export function topicContextScope(mapping){const {sourceRecordIds,...scope}=mapping;return structuredClone(scope);}
export function topicContextMaterial(mapping,view){const topic=view.identities?.find(t=>t.id===mapping.topicId&&t.revision===mapping.topicRevision);return topic&&typeof topic.name==='string'?{...topicContextScope(mapping),name:topic.name}:null;}
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const array=x=>Array.isArray(x)&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
export function validTopicContextEvidence(m){
 return exact(m,['kind','recordId','topicId','topicRevision','topicOrganizationRevision','layoutGeneration','journalId','operationId','selectedFields','entries','fieldDigests'])&&m.kind==='topic'&&['topicId','journalId','operationId'].every(k=>idOK(m[k]))&&['topicRevision','topicOrganizationRevision','layoutGeneration'].every(k=>revisionOK(m[k]))&&m.layoutGeneration>0&&m.recordId===m.topicId&&equal(m.selectedFields,['name'])&&exact(m.fieldDigests,['name'])&&/^[a-f0-9]{64}$/.test(m.fieldDigests.name)&&array(m.entries)&&m.entries.length>0&&m.entries.length<=TOPIC_CONTEXT_LIMIT&&new Set(m.entries.map(e=>e?.entryId)).size===m.entries.length&&m.entries.every(e=>exact(e,['entryId','revision','inputId','inputRevision','removalSequence','placementId','placementRevision','rank','membershipOperationId','sectionId','sectionRevision','sectionRank'])&&['entryId','inputId','membershipOperationId','sectionId'].every(k=>idOK(e[k]))&&['revision','inputRevision','removalSequence','placementRevision','sectionRevision'].every(k=>revisionOK(e[k]))&&e.placementId===JSON.stringify([m.topicId,m.layoutGeneration,e.entryId])&&/^\d{12}$/.test(e.rank)&&/^\d{12}$/.test(e.sectionRank));
}
export const topicContextEvidence=(mapping,fieldDigests)=>({...topicContextScope(mapping),fieldDigests:structuredClone(fieldDigests)});
export async function readTopicContextEvidence(store,t,spec){
 if(!validTopicContextEvidence(spec))return null;
 const j=await t.get('revisions',spec.journalId),mapping=await readTopicContext(store,t,{kind:'topic',entityId:spec.topicId,recordId:spec.recordId,revision:spec.topicRevision,journalId:spec.journalId,sourceRecordIds:[...(j?.sourceRecordIds||[])].sort()});
 if(!mapping||!equal(topicContextEvidence(mapping,spec.fieldDigests),spec))return null;
 const inputs={};for(const inputId of new Set(mapping.entries.map(e=>e.inputId))){const current=await inputProjection(store,t,inputId);if(!current)return null;inputs[inputId]=current.body;}
 return {mapping,fields:{name:(await t.get('topics',mapping.topicId)).name},inputs};
}
