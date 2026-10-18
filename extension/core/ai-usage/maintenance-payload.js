import {validBoundFields} from '../context-bound-entry.js';
import {validAuthoredFields,authoredSelectedFields} from '../context-authored-entry.js';
import {fail,exact} from './contracts.js';
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
// Internal purpose-scoped domain DTO, not a Qwen wire or financial grant.
// Source originals stay in the original formation owner's local proof.
export function createMaintenancePayload(metadata,material,limits,placements=[],authoredEntries=[],boundEntries=[]){
 const view=material?.view;
 if(!Array.isArray(view?.inputs)||!Array.isArray(authoredEntries)||!Array.isArray(boundEntries)||!view.inputs.length&&!authoredEntries.length||!Number.isSafeInteger(material.sourceCount)||material.sourceCount<(view.inputs.length?1:0)||!view.inputs.length&&material.sourceCount!==0||material.sourceCount>20)fail('BUDGET_EXCEEDED');
 if(!limits||!['maxInputs','maxContentBytes','maxRequestBytes'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>0)||view.inputs.length+authoredEntries.length+boundEntries.length>Math.min(20,limits.maxInputs))fail('BUDGET_EXCEEDED');
 const inputs=view.inputs.map((input,index)=>{
  if(typeof input.id!=='string'||input.role!=='primary'||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.fields?.body!=='string'||Object.keys(input.fields).length!==1)fail('UNAVAILABLE');
  return {ref:'i'+index,inputId:input.id,revision:input.revision,body:input.fields.body};
 });
 if(new Set(inputs.map(i=>i.inputId)).size!==inputs.length)fail('UNAVAILABLE');
 // Entry descriptors come from the original formation owner after exact Entry authority.
 const entries=(view.entries||[]).map(entry=>{const {id,body,bodyBinding,workingInputId,revision}=entry;if(typeof id!=='string'||typeof body!=='string'||bodyBinding!=='input'||!inputs.some(i=>i.inputId===workingInputId&&i.body===body)||!Number.isSafeInteger(revision)||revision<0)fail('UNAVAILABLE');return {entryId:id,revision,body,bodyBinding,workingInputId};});
 if(entries.length>100||new Set(entries.map(e=>e.entryId)).size!==entries.length)fail('BUDGET_EXCEEDED');
 // Placement facts are private owner-qualified metadata, never provider input
 // interpreted as authority. Keep their exact shape and the same byte ceilings.
 if(!Array.isArray(placements)||placements.length>100)fail('BUDGET_EXCEEDED');
 for(const p of placements){exact(p,['placementId','revision','entryId','entryRevision','topicId','topicRevision','topicOrganizationRevision','sectionId','sectionRevision','layoutGeneration','inputId']);
  if(!['placementId','entryId','topicId','sectionId','inputId'].every(k=>typeof p[k]==='string'&&p[k].length>0)||!['revision','entryRevision','topicRevision','topicOrganizationRevision','sectionRevision'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)||!Number.isSafeInteger(p.layoutGeneration)||p.layoutGeneration<1||p.placementId!==JSON.stringify([p.topicId,p.layoutGeneration,p.entryId])||!entries.some(e=>e.entryId===p.entryId&&e.revision===p.entryRevision&&e.workingInputId===p.inputId)||!metadata.coverage?.some(u=>u.facet==='context'&&u.key===JSON.stringify(['placement',p.placementId])))fail('UNAVAILABLE');
 }
 if(new Set(placements.map(p=>p.placementId)).size!==placements.length||(metadata.coverage||[]).some(u=>u.facet==='context'&&u.key?.startsWith('["placement",')&&!placements.some(p=>u.key===JSON.stringify(['placement',p.placementId]))))fail('UNAVAILABLE');
 // Authored material stays source-free and field-scoped. A whole-Entry
 // coverage key is admitted only after every meaningful/edited field is sent.
 const authored=authoredEntries.map(e=>{
  const extended=Object.hasOwn(e,'selectedFields'),selected=authoredSelectedFields(e);
  exact(e,['kind','entryId','entryRevision','entryCreatedAt','birthOperationId',...(extended?['selectedFields','fieldRevisions','fieldOperationIds','fields','fieldDigests']:['bodyFieldRevision','bodyOperationId','body','bodyDigest']),'topicId','topicRevision','topicOrganizationRevision','sectionId','sectionRevision','layoutGeneration','placementId','placementRevision','membershipOperationId','rank','sectionRank']);
  if(!validAuthoredFields(selected)||extended&&selected.length===1&&selected[0]==='body')fail('UNAVAILABLE');
  if(extended){for(const key of ['fieldRevisions','fieldOperationIds','fields','fieldDigests'])exact(e[key],selected);if(!selected.every(f=>Number.isSafeInteger(e.fieldRevisions[f])&&e.fieldRevisions[f]>=0&&typeof e.fieldOperationIds[f]==='string'&&e.fieldOperationIds[f].length>=8&&typeof e.fields[f]==='string'&&/^[a-f0-9]{64}$/.test(e.fieldDigests[f])))fail('UNAVAILABLE');}
  else if(typeof e.body!=='string'||!e.body.trim()&&e.bodyFieldRevision===0||!/^[a-f0-9]{64}$/.test(e.bodyDigest)||!Number.isSafeInteger(e.bodyFieldRevision)||e.bodyFieldRevision<0||typeof e.bodyOperationId!=='string'||e.bodyOperationId.length<8)fail('UNAVAILABLE');
  if(e.kind!=='humanEntry'||!['entryId','birthOperationId','topicId','sectionId','membershipOperationId'].every(k=>typeof e[k]==='string'&&e[k].length>0)||typeof e.entryCreatedAt!=='string'||!Number.isFinite(Date.parse(e.entryCreatedAt))||!['entryRevision','topicRevision','topicOrganizationRevision','sectionRevision','layoutGeneration','placementRevision'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0)||e.layoutGeneration<1||e.placementId!==JSON.stringify([e.topicId,e.layoutGeneration,e.entryId])||!/^\d{12}$/.test(e.rank)||!/^\d{12}$/.test(e.sectionRank)||!metadata.coverage?.some(u=>u.facet==='context'&&u.key===JSON.stringify(['library_entry',e.entryId])))fail('UNAVAILABLE');
  return structuredClone(e);
 });
 if(new Set(authored.map(e=>e.entryId)).size!==authored.length||authored.some(e=>entries.some(i=>i.entryId===e.entryId)))fail('UNAVAILABLE');
 // Bound human fields always accompany the original independently qualified Input
 // and complete Entry body. Source closure stays local, outside the provider DTO.
 const bound=boundEntries.map(e=>{
  const fields=e.selectedFields;
  exact(e,['kind','entryId','entryRevision','entryCreatedAt','birthOperationId','inputId','inputContentRevision','expectedRemovalSequence','sourceRecordIds','sourceIdentityTokens','selectedFields','fieldRevisions','fieldOperationIds','fields','fieldDigests','topicId','topicRevision','topicOrganizationRevision','sectionId','sectionRevision','layoutGeneration','placementId','placementRevision','membershipOperationId','rank','sectionRank']);
  if(e.kind!=='boundEntry'||!validBoundFields(fields)||!['entryId','birthOperationId','inputId','topicId','sectionId','membershipOperationId'].every(k=>typeof e[k]==='string'&&e[k].length>0)||typeof e.entryCreatedAt!=='string'||!Number.isFinite(Date.parse(e.entryCreatedAt))||!['entryRevision','inputContentRevision','expectedRemovalSequence','topicRevision','topicOrganizationRevision','sectionRevision','layoutGeneration','placementRevision'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0)||e.layoutGeneration<1||e.placementId!==JSON.stringify([e.topicId,e.layoutGeneration,e.entryId])||!/^\d{12}$/.test(e.rank)||!/^\d{12}$/.test(e.sectionRank))fail('UNAVAILABLE');
  for(const key of ['fieldRevisions','fieldOperationIds','fields','fieldDigests'])exact(e[key],fields);
  if(!fields.every(f=>Number.isSafeInteger(e.fieldRevisions[f])&&e.fieldRevisions[f]>=0&&typeof e.fieldOperationIds[f]==='string'&&e.fieldOperationIds[f].length>=8&&typeof e.fields[f]==='string'&&/^[a-f0-9]{64}$/.test(e.fieldDigests[f]))||!entries.some(x=>x.entryId===e.entryId&&x.revision===e.entryRevision&&x.workingInputId===e.inputId)||!inputs.some(x=>x.inputId===e.inputId&&x.revision===e.inputContentRevision)||!metadata.coverage?.some(u=>u.facet==='context'&&[JSON.stringify(['library_entry',e.entryId]),JSON.stringify(['placement',e.placementId])].includes(u.key)))fail('UNAVAILABLE');
  const {sourceRecordIds,sourceIdentityTokens,...dto}=e;return structuredClone(dto);
 });
 if(new Set(bound.map(e=>JSON.stringify([e.entryId,e.topicId]))).size!==bound.length||bound.some(e=>authored.some(x=>x.entryId===e.entryId)))fail('UNAVAILABLE');
 const bounded={version:1,purpose:'AI_MAINTENANCE',inputs,...(bound.length?{boundEntries:bound}:{}),...(authored.length?{authoredEntries:authored}:{}),...(placements.length?{placements:structuredClone(placements)}:{}),...(entries.length?{entries}:{}),identities:structuredClone(view.identities),sections:structuredClone(view.sections),constraints:structuredClone(view.constraints)};
 const payload={...structuredClone(metadata),material:bounded};
 if(bytes(bounded)>limits.maxContentBytes||bytes(payload)>limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
 return payload;
}
