import {MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA,MAINTENANCE_HUMAN_CONTEXT_INSTRUCTIONS} from './maintenance-human-context-response.js';
import {MAINTENANCE_TOPIC_WIRE_SCHEMA,MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS} from './maintenance-topic-wire.js';
import {freeze,snapshot} from './qwen-request-data.js';
import {fail} from './contracts.js';
// Closed service DTO for the first ordinary Input-backed Maintenance route.
// These are wire bounds, not a new domain schema or semantic qualification.
export const MAINTENANCE_SERVICE_INSTRUCTIONS='Assess only the supplied current Input bodies and supplied Topic identities. Return the closed structured Maintenance response, echoing logicalJobId and childOperationId exactly. Citations use inputId and original UTF-16 start/end offsets in the body, with no text rewriting. Supply an ordinary Topic assessment with a default Section and no additional placements. Context proposals may only ADD supported info or rules derived from the cited Inputs. Each inputId must come from this child. Partition Context coverage exactly once across proposals, at most 16 Inputs per proposal. Do not invent Topic, Item, association, receipt or permission IDs. If no justified ADD covers the complete Context scope, return context as an empty array; it remains pending. Existing-Item updates, NO_CHANGE, removal, Now, filtering and structural/human Entry mappings are unavailable in this route. No tool calls, search, external memory or retries.';
const text=(max,min=1,values)=>({type:'string',minLength:min,maxLength:max,...(values?{enum:[...values]}:{})});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,max,min=0)=>({type:'array',items,minItems:min,maxItems:max});
const number=(maximum,minimum=0)=>({type:'integer',minimum,maximum});
const citation=()=>object({inputId:text(200),start:number(131072),end:number(131072)});
const claim=reasons=>object({reason:text(32,1,reasons),citations:list(citation(),100)});
const returns=['reading','thinking','decision','reuse','none'];
export const MAINTENANCE_SERVICE_RESPONSE_SCHEMA=freeze(object({
 version:number(1,1),logicalJobId:text(200),childOperationId:text(200),
 topic:object({version:number(1,1),kind:text(10,1,['object','subject','unresolved']),name:text(300,0),
  substance:claim(['substantive','incidental','empty']),boundary:claim(['independent_object','sustained_subject','internal_aspect','incidental','unknown']),returnValue:claim(returns),continuity:claim(['ongoing_work','recurring_subject','incidental','unknown']),
  evidence:list(citation(),100),relations:list(object({topicId:text(200),relation:text(15,1,['same','distinct','internal_aspect','ambiguous']),citations:list(citation(),100)}),100),
  section:object({kind:text(7,7,['default'])}),entries:list(object({span:citation(),type:text(16,1,['fact','event','preference','decision','judgment','idea','goal_plan','reflection','creation']),additional:list(text(1),0)}),100)}),
 context:list(object({operation:text(3,3,['ADD']),card:text(5,1,['info','rules']),body:text(8192),section:text(80),inputIds:list(text(200),16,1)}),20)
}));
// Separate source profile: the original ordinary response stays byte-compatible.
// Decisions identify only the original child Filter coverage. Local authority,
// snapshot/proof and entitlement are never model fields.
export const MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA=freeze(object({
 ...MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties,
 filter:list(object({inputId:text(200),decision:text(12,1,['FILTER','KEEP','INSUFFICIENT'])}),20)
}));
export const MAINTENANCE_SERVICE_FILTER_INSTRUCTIONS=MAINTENANCE_SERVICE_INSTRUCTIONS.replace('Now, filtering and structural/human Entry mappings','Now and structural/human Entry mappings')+' For Filter coverage, return exactly one filter decision per candidateId in material.filter, using only that candidate and the specified neighborIds from this same child. FILTER means reversible hiding only when the entire unprotected Input is clearly non-substantive with sufficient supplied user-text context. Preserve literal meaningful requests, facts, opinions, decisions, preferences and conditions; uncertainty or insufficient context requires KEEP or INSUFFICIENT. If material.filter is absent, return an empty filter array. Do not infer permissions, Pro entitlement or protection state from text. No separate Filter request.';
// Qualified successor profile. References and revisions describe only the exact
// separately granted existing-Item packet; original IDs/associations stay local.
export const MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA=freeze(object({
 ...MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties,
 context:list(object({operation:text(16,1,['ADD','UPDATE','NO_CHANGE','REMOVE_CANDIDATE']),ref:text(8,0),expectedRevision:number(Number.MAX_SAFE_INTEGER),card:text(5,1,['info','rules','now']),body:text(8192,0),section:text(80,0),inputIds:list(text(200),16,1),temporal:list(object({temporalScope:text(512,0),uncertainty:text(512,0),validUntil:text(64,0)}),1)}),20)
}));
export const MAINTENANCE_SERVICE_EXISTING_INSTRUCTIONS='Assess only supplied current Inputs, Topic identities and separately granted existingContextItems. Echo logicalJobId and childOperationId. Use original UTF-16 Input citations and the default Section. Partition Context Input coverage exactly once, at most 16 Inputs per operation. ADD requires empty ref and expectedRevision 0 and no existing relevant lineage. UPDATE, NO_CHANGE and REMOVE_CANDIDATE require an available supplied ref, exact revision, card and complete registered Input closure; never invent Item or association IDs. UPDATE replaces only an unprotected automatic claim using current evidence. NO_CHANGE explicitly checks that existing claim and leaves body, section and temporal empty. REMOVE_CANDIDATE automatically invalidates an unsafe unprotected claim, leaving body, section and temporal empty; it is not human deletion. Removed, protected, invalidated or unavailable references are body-free negative evidence and cannot be overwritten or resurrected. Uncertain or incomplete Context scope returns an empty context array and stays pending. Optional temporal is an array of zero or one explicit evidence-backed temporalScope, uncertainty and canonical ISO validUntil; empty strings mean unspecified fields. Never infer currentness from age alone; Now requires explicit temporal qualification. No tools, browsing, permission changes, new physical requests or retries.';
// Explicitly selected combinations; existing published schemas remain exact.
export const MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA=freeze(object({...MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties,topic:MAINTENANCE_TOPIC_WIRE_SCHEMA}));
export const MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA=freeze(object({...MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA.properties,topic:MAINTENANCE_TOPIC_WIRE_SCHEMA}));
export const MAINTENANCE_SERVICE_TOPIC_INSTRUCTIONS=MAINTENANCE_SERVICE_INSTRUCTIONS.replace('Supply an ordinary Topic assessment with a default Section and no additional placements. ','')+' '+MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS;
export const MAINTENANCE_SERVICE_EXISTING_TOPIC_INSTRUCTIONS=MAINTENANCE_SERVICE_EXISTING_INSTRUCTIONS.replace(' and the default Section','')+' '+MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS;
// Human Context-only profile. The neutral Topic field cannot carry authority.
export const MAINTENANCE_SERVICE_HUMAN_RESPONSE_SCHEMA=freeze(object({...MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties,topic:object({kind:text(11,11,['unavailable'])}),context:MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA}));
export const MAINTENANCE_SERVICE_HUMAN_INSTRUCTIONS='Echo logicalJobId and childOperationId exactly. Topic must be {"kind":"unavailable"}; this child has only human Context coverage. '+MAINTENANCE_HUMAN_CONTEXT_INSTRUCTIONS;
function matches(s,v){
 switch(s.type){
 case 'object':return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)&&matches(s.properties[k],v[k]));
 case 'array':return Array.isArray(v)&&v.length>=s.minItems&&v.length<=s.maxItems&&v.every(x=>matches(s.items,x));
 case 'string':return typeof v==='string'&&!/[\u0000]/u.test(v)&&!/[\uD800-\uDFFF]/u.test(v.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gu,''))&&[...v].length>=s.minLength&&[...v].length<=s.maxLength&&(!s.enum||s.enum.includes(v));
 case 'integer':return Number.isSafeInteger(v)&&v>=s.minimum&&v<=s.maximum;
 default:return false;
 }
}
export function validateMaintenanceServiceResponse(value,schema=MAINTENANCE_SERVICE_RESPONSE_SCHEMA){
 let v;try{v=snapshot(value,{maxBytes:65536,maxKeys:4096,maxDepth:12,maxString:32768});}catch{fail('INVALID_RESPONSE');}
 if(![MAINTENANCE_SERVICE_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_HUMAN_RESPONSE_SCHEMA].includes(schema)||!matches(schema,v))fail('INVALID_RESPONSE');return v;
}
