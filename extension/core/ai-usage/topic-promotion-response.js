import {snapshot,freeze,boundedSchema} from './qwen-request-data.js';
import {equal,fail} from './contracts.js';
import {citationText,entrySpanSupported} from '../topic-formation-evidence.js';

const str=(max=200,min=0,values)=>({type:'string',minLength:min,maxLength:max,...(values?{enum:values}:{})});
const choice=values=>str(Math.max(...values.map(v=>v.length)),Math.min(...values.map(v=>v.length)),values);
const num=(max,min=0)=>({type:'integer',minimum:min,maximum:max});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const arr=(items,max)=>({type:'array',items,minItems:0,maxItems:max});
const refs=()=>arr(num(99),100),claim=reasons=>obj({reason:choice(reasons),citations:refs()});
const schema=obj({version:num(1,1),logicalJobId:str(200,1),childOperationId:str(200,1),proposalOperationId:str(200,8),sectionRef:str(16,1),status:choice(['PROPOSE','DEFER']),reason:str(160),
 citations:arr(obj({inputId:str(200,1),field:choice(['body','note']),start:num(131072),end:num(131072,1)}),100),
 kind:choice(['object','subject','unresolved']),name:str(300),substance:claim(['substantive','incidental','empty']),boundary:claim(['independent_object','sustained_subject','internal_aspect','incidental','unknown']),returnValue:claim(['reading','thinking','decision','reuse','none']),continuity:claim(['ongoing_work','recurring_subject','incidental','unknown']),evidence:refs(),
 relations:arr(obj({topicId:str(200,1),relation:choice(['same','distinct','internal_aspect','ambiguous']),citations:refs()}),100),
 entries:arr(obj({entryId:str(200,1),expectedRevision:num(Number.MAX_SAFE_INTEGER),span:num(99),type:choice(['fact','event','preference','decision','judgment','idea','goal_plan','reflection','creation'])}),16),
 independence:claim(['direct_naming','direct_inputs','independent_goal','separate_reuse','unknown']),
 selection:obj({kind:choice(['whole_section']),count:num(16),manifestDigest:str(64),necessary:choice(['all_selected_placements',''])})});
export const SECTION_PROMOTION_RESPONSE_SCHEMA=freeze(snapshot(JSON.parse(JSON.stringify(schema))));
boundedSchema(SECTION_PROMOTION_RESPONSE_SCHEMA);
export const SECTION_PROMOTION_RESPONSE_INSTRUCTIONS='Return exactly the Section promotion proposal schema. Copy the exact logicalJobId, childOperationId, proposalOperationId and sectionRef. Use only the complete sent whole-Section page, exact Entry IDs/revisions and every sent canonical Topic relation. Cite only exact sent Input field offsets through the citations table. A proposal needs independent identity, substantive provenance, durable return value and continuity plus a distinct non-internal relation to every known identity. A Section name or size is not promotion evidence. PROPOSE includes every selected Entry once and the exact manifest acknowledgement. It creates no Topic and grants no permission; the original owner must validate and the user must explicitly confirm. DEFER has a nonempty reason, no citations/entries/relations/evidence, unresolved kind, empty name, empty/unknown/none claims, independence unknown, selection count zero and empty digest/necessary. Never invent IDs, evidence, authority, extra placements, source lineage or a successful commit.';
const captures=new WeakMap(),requireFact=(v,code='INVALID_RESPONSE')=>{if(!v)fail(code);};
const exact=(o,keys)=>o&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
function valid(schema,value){
 if(schema.type==='object')return value&&typeof value==='object'&&!Array.isArray(value)&&exact(value,schema.required)&&schema.required.every(k=>valid(schema.properties[k],value[k]));
 if(schema.type==='array')return Array.isArray(value)&&value.length<=schema.maxItems&&value.every(v=>valid(schema.items,v));
 if(schema.type==='integer')return Number.isSafeInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 return typeof value==='string'&&value.isWellFormed()&&!value.includes('\0')&&[...value].length>=schema.minLength&&[...value].length<=schema.maxLength&&(!schema.enum||schema.enum.includes(value));
}
const bindingKeys=['logicalJobId','childOperationId','proposalOperationId','sectionRef'];
// Called INSIDE the original AI owner's assess callback, before the provider
// request is built. Its actual complete reader page is consumed now. A response
// mapper never reads extra pages afterwards to forge the owner's seen/ACK set.
export async function captureSectionPromotionResponse(binding,view,reader){
 binding=freeze(snapshot(binding));requireFact(exact(binding,bindingKeys)&&bindingKeys.every(k=>id(binding[k]))&&binding.proposalOperationId.length>=8&&!binding.proposalOperationId.includes(':')&&/^s[0-9]$/.test(binding.sectionRef));
 view=freeze(snapshot(view,{maxBytes:262144,maxKeys:16000,maxDepth:16,maxString:131072}));
 requireFact(view.version===1&&view.selection==='whole_section'&&view.manifest?.pageCount===1&&reader?.pageCount===1&&typeof reader.readPage==='function'&&view.manifest.count>=1&&view.manifest.count<=16&&Array.isArray(view.identities)&&view.identities.length<=100,'SECTION_PROMOTION_UNAVAILABLE');
 const page=freeze(snapshot(await reader.readPage(0),{maxBytes:262144,maxKeys:16000,maxDepth:16,maxString:131072}));
 requireFact(page.index===0&&page.manifestDigest===view.manifest.digest&&Array.isArray(page.entryIds)&&page.entryIds.length===view.manifest.count&&new Set(page.entryIds).size===page.entryIds.length&&Array.isArray(page.entries)&&Array.isArray(page.inputs)&&page.entries.length===page.entryIds.length&&page.entries.every(e=>page.entryIds.includes(e.id))&&new Set(page.entries.map(e=>e.id)).size===page.entries.length&&page.inputs.length<=20,'SECTION_PROMOTION_UNAVAILABLE');
 // The current original policy requires directly Input-backed evidence. The
 // source adapter cannot manufacture a Source for a standalone authored Entry.
 requireFact(equal(page.inputs,view.inputs)&&equal(page.entries,view.entries)&&page.entries.every(e=>Array.isArray(e.dependencies)&&e.dependencies.length>0&&Array.isArray(e.references)&&e.references.length>0),'SECTION_PROMOTION_UNAVAILABLE');
 const {inputs,entries,...metadata}=view,payload=freeze({version:1,...binding,view:metadata,pages:[page]}),handle=Object.freeze(Object.create(null));
 captures.set(handle,{binding,view,page,payload});return handle;
}
export const sectionPromotionResponsePayload=handle=>captures.get(handle)?.payload??null;
export function mapSectionPromotionResponse(handle,wire,currentView){
 const state=captures.get(handle);requireFact(state,'STALE_BASE');requireFact(equal(snapshot(currentView,{maxBytes:262144,maxKeys:16000,maxDepth:16,maxString:131072}),state.view),'STALE_BASE');
 const v=snapshot(wire,{maxBytes:65536,maxKeys:16000,maxDepth:16,maxString:131072});requireFact(valid(SECTION_PROMOTION_RESPONSE_SCHEMA,v));requireFact(bindingKeys.every(k=>v[k]===state.binding[k]),'STALE_BASE');
 if(v.status==='DEFER'){
  requireFact(v.reason.trim()&&!v.citations.length&&!v.evidence.length&&!v.entries.length&&!v.relations.length&&v.kind==='unresolved'&&v.name===''&&v.substance.reason==='empty'&&!v.substance.citations.length&&v.boundary.reason==='unknown'&&!v.boundary.citations.length&&v.returnValue.reason==='none'&&!v.returnValue.citations.length&&v.continuity.reason==='unknown'&&!v.continuity.citations.length&&v.independence.reason==='unknown'&&!v.independence.citations.length&&v.selection.count===0&&v.selection.manifestDigest===''&&v.selection.necessary==='');
  return freeze({status:'DEFER',reason:v.reason});
 }
 requireFact(v.reason===''&&v.kind!=='unresolved'&&v.name.trim()&&v.independence.reason!=='unknown');
 const {view,page}=state;requireFact(v.selection.count===view.manifest.count&&v.selection.manifestDigest===view.manifest.digest&&v.selection.necessary==='all_selected_placements');
 for(const c of v.citations)citationText(c,page.inputs);
 const refs=indices=>indices.map(i=>{requireFact(v.citations[i]);return structuredClone(v.citations[i]);});
 const mappedClaim=c=>({reason:c.reason,citations:refs(c.citations)}),knownTopics=[...new Set(view.identities.map(i=>i.canonicalId))].sort();
 requireFact(equal(v.relations.map(r=>r.topicId).sort(),knownTopics));
 requireFact(equal(v.entries.map(e=>e.entryId).sort(),[...page.entryIds].sort()));
 const entries=v.entries.map(e=>{const known=page.entries.find(k=>k.id===e.entryId),span=refs([e.span])[0];requireFact(known&&e.expectedRevision===known.revision&&entrySpanSupported(known,span,page.inputs));return {entryId:known.id,type:e.type,span,additional:[]};});
 const assessment={formation:{version:1,kind:v.kind,name:v.name,substance:mappedClaim(v.substance),boundary:mappedClaim(v.boundary),returnValue:mappedClaim(v.returnValue),continuity:mappedClaim(v.continuity),evidence:refs(v.evidence),relations:v.relations.map(r=>({topicId:r.topicId,relation:r.relation,citations:refs(r.citations)})),section:{kind:'default'},entries},independence:mappedClaim(v.independence),selection:structuredClone(v.selection)};
 // Original evaluateSectionPromotion, current lineage/constraint checks and
 // explicit user confirm remain authoritative. This return value is data only.
 return freeze({status:'PROPOSE',assessment});
}
export function releaseSectionPromotionResponse(handle){captures.delete(handle);}
