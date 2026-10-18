import {equal,fail} from './contracts.js';
import {freeze,snapshot} from './qwen-request-data.js';
import {citationText,entrySpanSupported} from '../topic-formation-evidence.js';

// Optional source-profile fragment only. The ordinary published response and
// the original TopicFormationService remain unchanged. No store or authority
// is owned here; decoded assessments must still pass that service and commit.
const text=(max,min=1,values)=>({type:'string',minLength:min,maxLength:max,...(values?{enum:[...values]}:{})});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,max,min=0)=>({type:'array',items,minItems:min,maxItems:max});
const integer=(maximum,minimum=0)=>({type:'integer',minimum,maximum});
const citation=()=>object({inputId:text(200),start:integer(131072),end:integer(131072)});
const claim=reasons=>object({reason:text(32,1,reasons),citations:list(citation(),100)});
const returns=['reading','thinking','decision','reuse'];
export const MAINTENANCE_TOPIC_WIRE_SCHEMA=freeze(object({
 version:integer(1,1),kind:text(10,1,['object','subject','unresolved']),name:text(300,0),
 substance:claim(['substantive','incidental','empty']),
 boundary:claim(['independent_object','sustained_subject','internal_aspect','incidental','unknown']),
 returnValue:claim([...returns,'none']),continuity:claim(['ongoing_work','recurring_subject','incidental','unknown']),
 evidence:list(citation(),100),
 relations:list(object({topicId:text(200),relation:text(15,1,['same','distinct','internal_aspect','ambiguous']),citations:list(citation(),100)}),100),
 // No optional fields/unions: unused fields have one checked neutral encoding.
 section:object({kind:text(8,1,['default','existing','named']),sectionId:text(200,0),name:text(300,0),
  aspectReason:text(32,1,['recurring_internal_aspect','incidental','unknown']),aspectCitations:list(citation(),100),
  returnReason:text(32,1,[...returns,'none']),returnCitations:list(citation(),100)}),
 sectionRelations:list(object({sectionId:text(200),relation:text(9,1,['same','distinct','ambiguous']),citations:list(citation(),100)}),100),
 entries:list(object({span:citation(),type:text(16,1,['fact','event','preference','decision','judgment','idea','goal_plan','reflection','creation']),entryId:text(200,0)}),100),
 // Keep these claims at Topic level: nested entry.additional citations exceed
 // the original full-manifest snapshot depth 16, even at schema depth eight.
 // entryIndex binds the claim to this response's exact Entry, never authority.
 additionalPlacements:list(object({entryIndex:integer(99),topicId:text(200),reason:text(32,1,[...returns,'lexical','category','none']),citations:list(citation(),100)}),100)
}));

export const MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS='For the qualified Topic profile, assess only the current Input bodies and original Topic, Section and Entry identities actually supplied in this child. Cite inputId and unchanged UTF-16 body start/end offsets. Compare every supplied canonical Topic identity exactly once; do not invent identities, evidence, permissions or receipts. Default Section is sufficient. section always contains kind, sectionId, name, aspectReason, aspectCitations, returnReason and returnCitations; sectionRelations is the separate top-level Section comparison list. For default use empty sectionId/name/sectionRelations, aspectReason unknown with empty aspectCitations and returnReason none with empty returnCitations. For existing supply only the original sectionId; keep all other fields in that same neutral form. For named keep sectionId empty and assess the stable recurring internal aspect, return value and every existing active non-default Section of the selected Topic, using original sectionIds and cited same/distinct/ambiguous sectionRelations. Incidental, uncertain or insufficient evidence must remain incidental/unknown/ambiguous/none; never force a new Section. Each entry uses an exact sent Input span and an empty entryId unless reusing a supplied original Input-bound Entry. additionalPlacements is a top-level list of entryIndex (zero-based in entries), topicId, reason and citations independently supporting that same Entry span, with at most 20 extras per Entry; lexical/category relevance alone does not justify a placement. Preserve human membership, Section, order, exclusions, fixed sets and keep-separate; these assessments grant no write authority. Do not add calls or retries; the original 20-Input child, two-child cycle and 2000-output-token limits still apply.';

function matches(schema,value){
 switch(schema.type){
 case 'object':return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length&&schema.required.every(k=>Object.hasOwn(value,k)&&matches(schema.properties[k],value[k]));
 case 'array':return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>matches(schema.items,v));
 case 'string':return typeof value==='string'&&!/[\u0000]/u.test(value)&&!/[\uD800-\uDFFF]/u.test(value.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gu,''))&&[...value].length>=schema.minLength&&[...value].length<=schema.maxLength&&(!schema.enum||schema.enum.includes(value));
 case 'integer':return Number.isSafeInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 default:return false;
 }
}
export function validateMaintenanceTopicWire(value){
 let v;try{v=snapshot(value,{maxBytes:65536,maxKeys:4096,maxDepth:12,maxString:32768});}catch{fail('INVALID_RESPONSE');}
 if(!matches(MAINTENANCE_TOPIC_WIRE_SCHEMA,v))fail('INVALID_RESPONSE');return v;
}
const unique=(values)=>new Set(values).size===values.length;
const hasId=id=>typeof id==='string'&&id.length>0&&id.length<=200;
function topicMaterial(value,wire=false){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('STALE_BASE');
 const selected={};
 for(const key of ['version',...(wire?['purpose']:[]),'inputs','entries','identities','sections','constraints']){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor&&wire&&key==='entries'){selected.entries=[];continue;}
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('STALE_BASE');selected[key]=descriptor.value;
 }
 // Deliberately do not inspect unrelated Context/Filter material. Their
 // independent original source schema/owner remains responsible for it.
 return snapshot(selected);
}

// sentMaterial is the exact original child payload.material. currentView is
// the current original TopicFormationService decision view, not model output.
// Caller retains job/child/receipt binding, processing/currentness, and final
// transactional guards. These comparisons cannot mint any of those powers.
export function decodeMaintenanceTopicWire(value,sentMaterial,currentView){
 const wire=validateMaintenanceTopicWire(value);
 let sent,view;
 try{sent=topicMaterial(sentMaterial,true);view=topicMaterial(currentView);}catch{fail('STALE_BASE');}
 if(view.version!==1||sent.version!==1||sent.purpose!=='AI_MAINTENANCE'||!Array.isArray(sent.inputs)||!sent.inputs.length||sent.inputs.length>20||!Array.isArray(view?.inputs)||view.inputs.length!==sent.inputs.length||!unique(sent.inputs.map(i=>i?.inputId))||!unique(view.inputs.map(i=>i?.id)))fail('STALE_BASE');
 const inputs=sent.inputs.map((input,index)=>{
  const current=view.inputs.find(i=>i?.id===input?.inputId);
  if(!input||!hasId(input.inputId)||input.ref!=='i'+index||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.body!=='string'||current?.role!=='primary'||current.revision!==input.revision||!equal(current.fields,{body:input.body}))fail('STALE_BASE');
  return current;
 });
 for(const key of ['identities','sections','constraints'])if(!Array.isArray(sent[key])||!Array.isArray(view[key])||!equal(sent[key],view[key]))fail('STALE_BASE');
 const entries=sent.entries??[];
 if(!Array.isArray(entries)||entries.length>100||!Array.isArray(view.entries)||view.entries.length!==entries.length||!unique(entries.map(e=>e?.entryId))||!unique(view.entries.map(e=>e?.id)))fail('STALE_BASE');
 for(const entry of entries){
  const original=view.entries.find(e=>e?.id===entry?.entryId),input=sent.inputs.find(i=>i.inputId===entry?.workingInputId);
  if(!entry||!hasId(entry.entryId)||!original||entry.bodyBinding!=='input'||!input||entry.body!==input.body||!equal(entry,{entryId:original.id,revision:original.revision,body:original.body,bodyBinding:original.bodyBinding,workingInputId:original.workingInputId}))fail('STALE_BASE');
 }
 const topics=new Set(sent.identities.map(i=>i?.canonicalId));
 if([...topics].some(id=>!hasId(id))||wire.relations.length!==topics.size||!unique(wire.relations.map(r=>r.topicId))||wire.relations.some(r=>!topics.has(r.topicId)))fail('INVALID_RESPONSE');
 const span=c=>{
  const result={inputId:c.inputId,field:'body',start:c.start,end:c.end};
  try{citationText(result,inputs);}catch{fail('INVALID_RESPONSE');}return result;
 };
 const citations=values=>values.map(span);
 const mapClaim=c=>({reason:c.reason,citations:citations(c.citations)});
 const section=wire.section;let mappedSection;
 if(section.kind==='named'){
  if(section.sectionId||!unique(wire.sectionRelations.map(r=>r.sectionId))||wire.sectionRelations.some(r=>!sent.sections.some(s=>s?.sectionId===r.sectionId)))fail('INVALID_RESPONSE');
  mappedSection={kind:'named',name:section.name,aspect:{reason:section.aspectReason,citations:citations(section.aspectCitations)},returnValue:{reason:section.returnReason,citations:citations(section.returnCitations)},relations:wire.sectionRelations.map(r=>({...r,citations:citations(r.citations)}))};
 }else{
  if(section.name||section.aspectReason!=='unknown'||section.aspectCitations.length||section.returnReason!=='none'||section.returnCitations.length||wire.sectionRelations.length||section.kind==='default'&&section.sectionId||section.kind==='existing'&&(!section.sectionId||!sent.sections.some(s=>s?.sectionId===section.sectionId)))fail('INVALID_RESPONSE');
  mappedSection=section.kind==='default'?{kind:'default'}:{kind:'existing',sectionId:section.sectionId};
 }
 const additional=wire.entries.map(()=>[]),placementKeys=new Set();
 for(const placement of wire.additionalPlacements){
  const group=additional[placement.entryIndex],key=JSON.stringify([placement.entryIndex,placement.topicId]);
  if(!group||group.length>=20||placementKeys.has(key)||!topics.has(placement.topicId))fail('INVALID_RESPONSE');placementKeys.add(key);
  group.push({topicId:placement.topicId,returnValue:mapClaim(placement)});
 }
 const entryKeys=new Set();
 const mappedEntries=wire.entries.map((entry,index)=>{
  const selected=span(entry.span),key=entry.entryId||JSON.stringify(selected);
  if(entryKeys.has(key))fail('INVALID_RESPONSE');entryKeys.add(key);
  if(entry.entryId){
   const original=view.entries.find(e=>e.id===entry.entryId);
   let supported=false;try{supported=!!original&&entries.some(e=>e.entryId===entry.entryId)&&entrySpanSupported(original,selected,inputs);}catch{fail('INVALID_RESPONSE');}
   if(!supported)fail('INVALID_RESPONSE');
  }
  return {span:selected,type:entry.type,...(entry.entryId?{entryId:entry.entryId}:{}),additional:additional[index]};
 });
 return {version:wire.version,kind:wire.kind,name:wire.name||null,substance:mapClaim(wire.substance),boundary:mapClaim(wire.boundary),returnValue:mapClaim(wire.returnValue),continuity:mapClaim(wire.continuity),evidence:citations(wire.evidence),relations:wire.relations.map(r=>({...r,citations:citations(r.citations)})),section:mappedSection,entries:mappedEntries};
}
