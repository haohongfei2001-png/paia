import {fail,exact} from './contracts.js';
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
// Internal purpose-scoped domain DTO, not a Qwen wire or financial grant.
// Source originals stay in the original formation owner's local proof.
export function createMaintenancePayload(metadata,material,limits,placements=[]){
 const view=material?.view;
 if(!Array.isArray(view?.inputs)||!view.inputs.length||!Number.isSafeInteger(material.sourceCount)||material.sourceCount<1||material.sourceCount>20)fail('BUDGET_EXCEEDED');
 if(!limits||!['maxInputs','maxContentBytes','maxRequestBytes'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>0)||view.inputs.length>Math.min(20,limits.maxInputs))fail('BUDGET_EXCEEDED');
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
 const bounded={version:1,purpose:'AI_MAINTENANCE',inputs,...(placements.length?{placements:structuredClone(placements)}:{}),...(entries.length?{entries}:{}),identities:structuredClone(view.identities),sections:structuredClone(view.sections),constraints:structuredClone(view.constraints)};
 const payload={...structuredClone(metadata),material:bounded};
 if(bytes(bounded)>limits.maxContentBytes||bytes(payload)>limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
 return payload;
}
