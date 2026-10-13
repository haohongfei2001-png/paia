import {fail} from './contracts.js';
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
// Internal purpose-scoped domain DTO, not a Qwen wire or financial grant.
// Source originals stay in the original formation owner's local proof.
export function createMaintenancePayload(metadata,material,limits){
 const view=material?.view;
 if(!Array.isArray(view?.inputs)||!view.inputs.length||!Number.isSafeInteger(material.sourceCount)||material.sourceCount<1||material.sourceCount>20)fail('BUDGET_EXCEEDED');
 if(!limits||!['maxInputs','maxContentBytes','maxRequestBytes'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>0)||view.inputs.length>Math.min(20,limits.maxInputs))fail('BUDGET_EXCEEDED');
 const inputs=view.inputs.map((input,index)=>{
  if(typeof input.id!=='string'||input.role!=='primary'||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.fields?.body!=='string'||Object.keys(input.fields).length!==1)fail('UNAVAILABLE');
  return {ref:'i'+index,inputId:input.id,revision:input.revision,body:input.fields.body};
 });
 if(new Set(inputs.map(i=>i.inputId)).size!==inputs.length)fail('UNAVAILABLE');
 const bounded={version:1,purpose:'AI_MAINTENANCE',inputs,identities:structuredClone(view.identities),sections:structuredClone(view.sections),constraints:structuredClone(view.constraints)};
 const payload={...structuredClone(metadata),material:bounded};
 if(bytes(bounded)>limits.maxContentBytes||bytes(payload)>limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
 return payload;
}
