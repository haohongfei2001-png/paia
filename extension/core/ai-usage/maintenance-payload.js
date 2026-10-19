import {MAINTENANCE_EXISTING_CONTEXT_LIMITS} from './maintenance-existing-context.js';
import {validContextTemporal} from '../context-temporal.js';
import {validStructuralContextEvidence} from './structural-context-mapping.js';
import {validBoundFields} from '../context-bound-entry.js';
import {validAuthoredFields,authoredSelectedFields} from '../context-authored-entry.js';
import {fail,exact} from './contracts.js';
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
// Internal purpose-scoped domain DTO, not a Qwen wire or financial grant.
// Source originals stay in the original formation owner's local proof.
export function createMaintenancePayload(metadata,material,limits,placements=[],authoredEntries=[],boundEntries=[],structuralSections=[],structuralTopics=[],contextItems=[],existingContextItems=[],existingContextSummary=null,topicCandidateMaterial=null,topicCandidateSummary=null){
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
 // Exact human structural scope accompanies genuine Input evidence. The title
 // is a changed interpretation hint, never substituted for the Input body.
 if(!Array.isArray(structuralSections)||structuralSections.length>50)fail('BUDGET_EXCEEDED');
 for(const m of structuralSections){
  const {title,...proof}=m||{};
  if(!validStructuralContextEvidence(proof)||typeof m.title!=='string'||m.title.length>300||JSON.stringify(m.selectedFields)!=='["title"]'||!metadata.coverage?.some(u=>['topic','context'].includes(u.facet)&&u.key===JSON.stringify(['section',m.sectionId]))||!view.sections?.some(s=>s.id===m.recordId&&s.revision===m.sectionRevision&&s.title===m.title)||!Array.isArray(m.entries)||!m.entries.length||m.entries.length>20||!m.entries.every(e=>entries.some(x=>x.entryId===e.entryId&&x.revision===e.revision&&x.workingInputId===e.inputId)&&inputs.some(i=>i.inputId===e.inputId&&i.revision===e.inputRevision)))fail('UNAVAILABLE');
 }
 if((metadata.coverage||[]).some(u=>['topic','context'].includes(u.facet)&&u.key?.startsWith('["section",')&&!structuralSections.some(m=>u.key===JSON.stringify(['section',m.sectionId])))||new Set(structuralSections.map(m=>m.recordId)).size!==structuralSections.length)fail('UNAVAILABLE');
 if(!Array.isArray(structuralTopics)||structuralTopics.length>50)fail('BUDGET_EXCEEDED');
 for(const m of structuralTopics){
  const {name,...proof}=m||{};
  if(!validStructuralContextEvidence(proof)||m.kind!=='topic'||typeof name!=='string'||name.length>300||!metadata.coverage?.some(u=>['topic','context'].includes(u.facet)&&u.key===JSON.stringify(['topic',m.topicId]))||!view.identities?.some(t=>t.id===m.topicId&&t.revision===m.topicRevision&&t.name===name)||!m.entries.every(e=>entries.some(x=>x.entryId===e.entryId&&x.revision===e.revision&&x.workingInputId===e.inputId)&&inputs.some(i=>i.inputId===e.inputId&&i.revision===e.inputRevision)))fail('UNAVAILABLE');
 }
 if((metadata.coverage||[]).some(u=>['topic','context'].includes(u.facet)&&u.key?.startsWith('["topic",')&&!structuralTopics.some(m=>u.key===JSON.stringify(['topic',m.topicId])))||new Set(structuralTopics.map(m=>m.recordId)).size!==structuralTopics.length)fail('UNAVAILABLE');
 // A selected correction is still an automatic Item with retained Source
 // closure. Only the separately granted fields cross this purpose boundary.
 if(!Array.isArray(contextItems)||contextItems.length>1)fail('BUDGET_EXCEEDED');
 for(const m of contextItems){
  exact(m,['kind','itemId','revision','card','selectedFields','proof','inputIds','fields','fieldDigests']);exact(m.fields,['body','section']);exact(m.fieldDigests,['body','section']);
  if(m.kind!=='contextEdit'||!Number.isSafeInteger(m.revision)||m.revision<2||!['info','rules','now'].includes(m.card)||JSON.stringify(m.selectedFields)!=='["body","section"]'||!m.selectedFields.every(f=>typeof m.fields[f]==='string'&&/^[a-f0-9]{64}$/.test(m.fieldDigests[f]))||!metadata.coverage?.some(u=>u.facet==='context'&&u.key===JSON.stringify(['context_item',m.itemId]))||!Array.isArray(m.inputIds)||!m.inputIds.length||!m.inputIds.every(id=>inputs.some(i=>i.inputId===id)))fail('UNAVAILABLE');
 }
 if((metadata.coverage||[]).some(u=>u.key?.startsWith('["context_item",')&&(u.facet!=='context'||!contextItems.some(m=>u.key===JSON.stringify(['context_item',m.itemId])))))fail('UNAVAILABLE');
 // Existing automatic Items are independently selected/granted by the session.
 // This closed semantic DTO contains no Source originals, association IDs or
 // local provenance. A serialized DTO is never a writable-item capability.
 if(!Array.isArray(existingContextItems)||existingContextItems.length>MAINTENANCE_EXISTING_CONTEXT_LIMITS.items)fail('BUDGET_EXCEEDED');
 for(const item of existingContextItems){
  const temporal=Object.hasOwn(item,'temporal');exact(item,['itemRef','itemId','revision','card','origin','protected','userEdited','lifecycle','body','section',...(temporal?['temporal','temporalStatus']:[])]);
  if(!/^c[0-9]+$/.test(item.itemRef)||typeof item.itemId!=='string'||!item.itemId||!Number.isSafeInteger(item.revision)||item.revision<1||!['info','rules','now'].includes(item.card)||item.origin!=='automatic'||item.protected!==false||item.userEdited!==false||!['active','invalidated'].includes(item.lifecycle)||typeof item.body!=='string'||!item.body.trim()||item.body.length>8192||typeof item.section!=='string'||!item.section.trim()||item.section.length>80||temporal&&(!validContextTemporal(item.temporal)||!['expired','not_expired','unknown'].includes(item.temporalStatus))||contextItems.length||!metadata.coverage?.some(u=>u.facet==='context'))fail('UNAVAILABLE');
 }
 if(new Set(existingContextItems.map(x=>x.itemId)).size!==existingContextItems.length||new Set(existingContextItems.map(x=>x.itemRef)).size!==existingContextItems.length)fail('UNAVAILABLE');
 if(existingContextSummary!==null){exact(existingContextSummary,['version','coverage','selectedItems','omittedItems','complete']);if(existingContextSummary.version!==1||existingContextSummary.coverage!=='selected_processing_scope'||existingContextSummary.selectedItems!==existingContextItems.length||!Number.isSafeInteger(existingContextSummary.omittedItems)||existingContextSummary.omittedItems<0||existingContextSummary.complete!==(existingContextSummary.omittedItems===0))fail('UNAVAILABLE');}
 // Historical pending-candidate evidence is separate from current Input work.
 // It consumes the same combined item and byte ceilings and adds no coverage.
 let candidateDTO={};
 if(topicCandidateMaterial!==null){
  exact(topicCandidateMaterial,['candidates','inputs']);const {candidates,inputs:historical}=topicCandidateMaterial;
  if(!Array.isArray(candidates)||!candidates.length||candidates.length>50||!Array.isArray(historical)||inputs.length+historical.length+authored.length+bound.length>Math.min(20,limits.maxInputs)||!metadata.coverage?.some(u=>u.facet==='topic'))fail('BUDGET_EXCEEDED');
  const selected=new Map(inputs.map(i=>[i.inputId,{role:'primary',selectedFields:['body']}]));
  for(const input of historical){exact(input,['inputId','revision','role','fields']);if(typeof input.inputId!=='string'||!input.inputId||selected.has(input.inputId)||!Number.isSafeInteger(input.revision)||input.revision<0||!['primary','supporting'].includes(input.role)||!input.fields||typeof input.fields!=='object'||Array.isArray(input.fields))fail('UNAVAILABLE');const fields=Object.keys(input.fields);if(!fields.length||fields.length>2||fields.some(f=>!['body','note'].includes(f)||typeof input.fields[f]!=='string'))fail('UNAVAILABLE');selected.set(input.inputId,{role:input.role,selectedFields:fields});}
  const refs=new Set(),used=new Set();for(const item of candidates){exact(item,['candidateRef','revision','evidence']);if(!/^candidate-(0|[1-9][0-9]*)$/.test(item.candidateRef)||refs.has(item.candidateRef)||!Number.isSafeInteger(item.revision)||item.revision<0||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.length>20)fail('UNAVAILABLE');refs.add(item.candidateRef);const ids=new Set();for(const e of item.evidence){exact(e,['inputId','role','selectedFields']);const sent=selected.get(e.inputId);if(ids.has(e.inputId)||!sent||e.role!==sent.role||!Array.isArray(e.selectedFields)||JSON.stringify([...e.selectedFields].sort())!==JSON.stringify([...sent.selectedFields].sort()))fail('UNAVAILABLE');ids.add(e.inputId);used.add(e.inputId);}}
  if(historical.some(i=>!used.has(i.inputId)))fail('UNAVAILABLE');candidateDTO={topicCandidates:structuredClone(candidates),...(historical.length?{topicCandidateInputs:structuredClone(historical)}:{})};
 }
 if(topicCandidateSummary!=null){exact(topicCandidateSummary,['version','coverage','visited','selectedCandidates','omittedCandidates','complete','nextCursor']);const {nextCursor,...summary}=topicCandidateSummary;if(summary.version!==1||summary.coverage!=='bounded_candidate_page'||!['visited','selectedCandidates','omittedCandidates'].every(k=>Number.isSafeInteger(summary[k])&&summary[k]>=0)||summary.visited>50||summary.selectedCandidates!==(topicCandidateMaterial?.candidates.length??0)||summary.selectedCandidates+summary.omittedCandidates>summary.visited||typeof summary.complete!=='boolean'||summary.complete&&(summary.omittedCandidates!==0||nextCursor!==null)||nextCursor!==null&&typeof nextCursor!=='string')fail('UNAVAILABLE');if(summary.visited)candidateDTO.topicCandidateSummary=structuredClone(summary);}
 const bounded={version:1,purpose:'AI_MAINTENANCE',inputs,...candidateDTO,...(existingContextItems.length?{existingContextItems:structuredClone(existingContextItems)}:{}),...(existingContextSummary&&(existingContextSummary.selectedItems||existingContextSummary.omittedItems)?{existingContextSummary:structuredClone(existingContextSummary)}:{}),...(contextItems.length?{contextItems:structuredClone(contextItems)}:{}),...(structuralTopics.length?{structuralTopics:structuredClone(structuralTopics)}:{}),...(structuralSections.length?{structuralSections:structuredClone(structuralSections)}:{}),...(bound.length?{boundEntries:bound}:{}),...(authored.length?{authoredEntries:authored}:{}),...(placements.length?{placements:structuredClone(placements)}:{}),...(entries.length?{entries}:{}),identities:structuredClone(view.identities),sections:structuredClone(view.sections),constraints:structuredClone(view.constraints)};
 const payload={...structuredClone(metadata),material:bounded};
 if(bytes(bounded)>limits.maxContentBytes||bytes(payload)>limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
 return payload;
}
