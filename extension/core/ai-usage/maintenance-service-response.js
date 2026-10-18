import {snapshot,freeze,boundedSchema} from './qwen-request-data.js';
import {equal,fail,unitKey} from './contracts.js';
import {hashText} from '../dedupe.js';
import {inputProjection} from '../thought-evidence.js';
import {contextLineageAdmission,validContextEvidenceSpecs,contextEvidenceKey,contextEvidenceIdentity} from '../context-item-lineage.js';
import {createContextScopeWorkBudget,forkContextScopeWorkBudget,contextScopeTransactionReader,readContextProcessingPreflight} from '../context-topic-scope.js';
import {assertMaintenanceQualification,maintenanceQualificationReceipt,maintenanceQualificationWorkBudget,chargeMaintenanceQualificationHash} from './maintenance-qualification.js';
import {authoredContextEvidence} from '../context-authored-entry.js';
import {boundContextEvidence} from '../context-bound-entry.js';
import {structuralContextProperty} from './structural-context-mapping.js';
import {validateContextMaintenanceChange,validateContextMaintenanceNoChange,validateContextMaintenanceInvalidation,CONTEXT_MAINTENANCE_LIMITS} from '../context-maintenance.js';

// This is the source-owned provider DTO. Every object is closed and every field
// required; empty strings/arrays are explicit sentinels, not missing authority.
// Flattened section/additional claims keep the qualified schema at depth <= 8.
const str=(max=200,min=0,values)=>({type:'string',minLength:min,maxLength:max,...(values?{enum:values}:{})});
const choice=values=>str(Math.max(...values.map(x=>x.length)),Math.min(...values.map(x=>x.length)),values);
const number=(max=Number.MAX_SAFE_INTEGER,min=0)=>({type:'integer',minimum:min,maximum:max});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=(items,max,min=0)=>({type:'array',items,minItems:min,maxItems:max});
const citation=()=>object({inputId:str(200,1),field:choice(['body']),start:number(131072),end:number(131072,1)});
const citations=()=>array(number(99),100);
const claim=values=>object({reason:choice(values),citations:citations()});
const returnReasons=['reading','thinking','decision','reuse','none'];
const topicSchema=object({
 status:choice(['ASSESS','DEFER','NONE']),reason:str(160),version:number(1,1),kind:choice(['object','subject','unresolved']),name:str(300),boundaryKey:str(64),
 substance:claim(['substantive','incidental','empty']),boundary:claim(['independent_object','sustained_subject','internal_aspect','incidental','unknown']),returnValue:claim(returnReasons),continuity:claim(['ongoing_work','recurring_subject','incidental','unknown']),evidence:citations(),
 relations:array(object({topicId:str(200,1),relation:choice(['same','distinct','internal_aspect','ambiguous']),citations:citations()}),100),
 section:object({kind:choice(['default','existing','named']),sectionId:str(),name:str(300),aspectReason:choice(['recurring_internal_aspect','incidental','unknown']),aspectCitations:citations(),returnReason:choice(returnReasons),returnCitations:citations(),relations:array(object({sectionId:str(200,1),relation:choice(['same','distinct','ambiguous']),citations:citations()}),100)}),
 entries:array(object({span:number(99),type:choice(['fact','event','preference','decision','judgment','idea','goal_plan','reflection','creation']),entryId:str()}),100),
 additional:array(object({entryIndex:number(99),topicId:str(200,1),returnReason:choice([...returnReasons,'lexical','category']),returnCitations:citations()}),256)
});
const temporalSchema=object({present:{type:'boolean'},temporalScope:str(512),uncertainty:str(512),validUntil:str(32)});
const schema=object({version:number(1,1),logicalJobId:str(200,1),childOperationId:str(200,1),citations:array(citation(),100),topic:topicSchema,context:object({status:choice(['APPLY','DEFER','NONE']),reason:str(160),groups:array(object({operation:choice(['ADD','UPDATE','NO_CHANGE','REMOVE_CANDIDATE','DEFER']),reason:str(160),unitKeys:array(str(450,1),50,1),topicId:str(),itemId:str(),expectedRevision:number(),card:choice(['info','rules','now']),body:str(8192),section:str(80),temporal:temporalSchema}),50)}),filter:object({status:choice(['DECIDE','DEFER','NONE']),reason:str(160),decisions:array(object({inputId:str(200,1),decision:choice(['FILTER','KEEP','INSUFFICIENT'])}),20)})});
export const MAINTENANCE_SERVICE_RESPONSE_SCHEMA=freeze(snapshot(JSON.parse(JSON.stringify(schema))));
boundedSchema(MAINTENANCE_SERVICE_RESPONSE_SCHEMA);
export const MAINTENANCE_SERVICE_RESPONSE_INSTRUCTIONS='Return exactly the qualified Maintenance response schema. Copy logicalJobId and childOperationId from this request. Use only the sent material and exact coverage keys. ASSESS preserves original Topic evidence and relations; all Topic citations and entry spans are indexes into the top-level citations table, whose exact sent Input body offsets are never inferred. Unused Topic fields use unresolved, empty name/boundaryKey, empty evidence/relations/entries, empty/unknown/none claims and default empty section. NONE is only for absent facets. DEFER requires a nonempty reason and empty results. Context groups must cover each context coverage key exactly once. ADD uses empty itemId and expectedRevision 0. Existing UPDATE, NO_CHANGE and REMOVE_CANDIDATE must use the exact sent existingContextItems itemId, revision and card, with empty topicId; itemRef is only a display label and never replaces itemId. UPDATE requires a new body and section; absent temporal clears any old deadline. NO_CHANGE and REMOVE_CANDIDATE use empty body/section and absent temporal. NO_CHANGE checks only its exact selected prior-evidence subset; REMOVE_CANDIDATE requires the complete original lineage. Selected contextItems corrections retain their separate UPDATE path. Never invent existing Context Item state or use a same-name match. Use topicId "$result" only for the sole Topic created/reused by this same child; otherwise use an exact sent Topic ID. Existing authored, bound, placement and structural evidence stays in its sent Topic. Explicit DEFER groups use empty topicId/itemId/body/section, expectedRevision 0, card info and absent temporal. Absent temporal uses present false and all empty strings. Section default uses empty sectionId/name/citations/relations, aspectReason unknown and returnReason none; existing uses only sectionId. Additional Entry Topic placements use topic.additional with the exact entryIndex. No unselected fields, permission, authority or financial claims are valid.';
const deferred=new WeakMap(),conditions={topic:'TOPIC_MAPPING_UNAVAILABLE',context:'CONTEXT_MAPPING_UNAVAILABLE',filter:'FILTER_OWNER_UNAVAILABLE'};
export const readMaintenanceResponseDefer=value=>deferred.get(value)??null;
function defer(binding,facet,units,groups=[]){const error=Object.freeze({code:'MAINTENANCE_RESPONSE_DEFER'});deferred.set(error,freeze(snapshot({binding,facet,units,retryCondition:conditions[facet],groups})));throw error;}
const requireFact=(value,code='INVALID_RESPONSE')=>{if(!value)fail(code);};
function schemaValue(s,v){
 switch(s.type){
 case 'object':return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)&&schemaValue(s.properties[k],v[k]));
 case 'array':return Array.isArray(v)&&v.length>=s.minItems&&v.length<=s.maxItems&&v.every(x=>schemaValue(s.items,x));
 case 'string':return typeof v==='string'&&v.isWellFormed()&&!v.includes('\0')&&[...v].length>=s.minLength&&[...v].length<=s.maxLength&&(!s.enum||s.enum.includes(v));
 case 'integer':return Number.isSafeInteger(v)&&v>=s.minimum&&v<=s.maximum;
 case 'boolean':return typeof v==='boolean';default:return false;
 }
}
const sorted=xs=>[...xs].sort();
const sameIds=(a,b)=>equal(sorted(a),sorted(b))&&new Set(a).size===a.length;
const blankSection=s=>s.sectionId===''&&s.name===''&&s.aspectReason==='unknown'&&!s.aspectCitations.length&&s.returnReason==='none'&&!s.returnCitations.length&&!s.relations.length;
const blankTopic=t=>t.version===1&&t.kind==='unresolved'&&t.name===''&&t.boundaryKey===''&&t.substance.reason==='empty'&&!t.substance.citations.length&&t.boundary.reason==='unknown'&&!t.boundary.citations.length&&t.returnValue.reason==='none'&&!t.returnValue.citations.length&&t.continuity.reason==='unknown'&&!t.continuity.citations.length&&!t.evidence.length&&!t.relations.length&&!t.entries.length&&!t.additional.length&&t.section.kind==='default'&&blankSection(t.section);
const temporal=t=>{if(!t.present){requireFact(t.temporalScope===''&&t.uncertainty===''&&t.validUntil==='');return {};}requireFact(!!t.temporalScope||!!t.uncertainty||!!t.validUntil);return {temporal:{temporalScope:t.temporalScope||null,uncertainty:t.uncertainty||null,validUntil:t.validUntil||null}};};
function validateWire(raw,payload,binding){
 const response=snapshot(raw,{maxBytes:262144,maxKeys:16000,maxDepth:16,maxString:65536});
 requireFact(response.accepted===true&&response.operationReceiptId===binding.operationReceiptId&&Object.keys(response).length===3&&Object.hasOwn(response,'value'));
 const v=response.value;requireFact(schemaValue(MAINTENANCE_SERVICE_RESPONSE_SCHEMA,v));
 for(const c of v.citations){const input=payload.material.inputs.find(i=>i.inputId===c.inputId);requireFact(input&&c.end>c.start&&c.end<=input.body.length&&input.body.slice(c.start,c.end).trim());}
 requireFact(v.logicalJobId===payload.logicalJobId&&v.childOperationId===payload.childOperationId&&v.logicalJobId===binding.logicalJobId&&v.childOperationId===binding.childOperationId,'STALE_BASE');
 for(const [facet,active]of [['topic','ASSESS'],['context','APPLY'],['filter','DECIDE']]){
  const part=v[facet],present=payload.coverage.some(u=>u.facet===facet);
  requireFact(present?part.status!=='NONE':part.status==='NONE');
  if(part.status===active)requireFact(part.reason==='');else requireFact(part.status==='DEFER'?part.reason.trim().length>0:part.reason==='');
  if(part.status!==active)requireFact(facet==='topic'?blankTopic(part):facet==='context'?!part.groups.length:!part.decisions.length);
 }
 if(v.topic.status!=='ASSESS')requireFact(!v.citations.length);
 return v;
}
function topicValue(t,material,view,citations){
 requireFact(t.additional.every(a=>a.entryIndex<t.entries.length));
 const refs=xs=>xs.map(i=>{requireFact(citations[i]);return structuredClone(citations[i]);});
 t={...t,substance:{...t.substance,citations:refs(t.substance.citations)},boundary:{...t.boundary,citations:refs(t.boundary.citations)},returnValue:{...t.returnValue,citations:refs(t.returnValue.citations)},continuity:{...t.continuity,citations:refs(t.continuity.citations)},evidence:refs(t.evidence),relations:t.relations.map(r=>({...r,citations:refs(r.citations)})),section:{...t.section,aspectCitations:refs(t.section.aspectCitations),returnCitations:refs(t.section.returnCitations),relations:t.section.relations.map(r=>({...r,citations:refs(r.citations)}))},entries:t.entries.map((e,index)=>({...e,span:refs([e.span])[0],additional:t.additional.filter(a=>a.entryIndex===index).map(a=>({...a,returnCitations:refs(a.returnCitations)}))}))};
 // A fresh original-owner view supplies final authority, never new semantic
 // facts for an assessment generated from an older sent snapshot.
 for(const key of ['identities','sections','constraints'])requireFact(equal(view[key],material[key]),'STALE_BASE');
 const sentEntries=material.entries||[],currentEntries=view.entries.map(e=>({entryId:e.id,revision:e.revision,body:e.body,bodyBinding:e.bodyBinding,workingInputId:e.workingInputId}));
 requireFact(equal(currentEntries,sentEntries),'STALE_BASE');
 requireFact(sameIds(view.inputs.map(i=>i.id),material.inputs.map(i=>i.inputId)),'STALE_BASE');
 for(const i of view.inputs){const sent=material.inputs.find(x=>x.inputId===i.id);requireFact(i.revision===sent.revision&&equal(i.fields,{body:sent.body}),'STALE_BASE');}
 const topics=new Set(material.identities.map(i=>i.canonicalId)),sections=new Set(material.sections.map(s=>s.sectionId)),entries=new Map((material.entries||[]).map(e=>[e.entryId,e]));
 requireFact(sameIds(t.relations.map(r=>r.topicId),[...topics]));
 const checkCitations=xs=>{for(const c of xs){const input=material.inputs.find(i=>i.inputId===c.inputId);requireFact(input&&c.end>c.start&&c.end<=input.body.length&&input.body.slice(c.start,c.end).trim());}};
 for(const c of [t.substance,t.boundary,t.returnValue,t.continuity])checkCitations(c.citations);checkCitations(t.evidence);for(const r of t.relations)checkCitations(r.citations);
 requireFact(t.boundaryKey===''||/^[a-f0-9]{64}$/.test(t.boundaryKey));
 const s=t.section;let section;
 if(s.kind==='default'){requireFact(blankSection(s));section={kind:'default'};}
 else if(s.kind==='existing'){requireFact(sections.has(s.sectionId)&&blankSection({...s,sectionId:''}));section={kind:'existing',sectionId:s.sectionId};}
 else{requireFact(s.sectionId===''&&s.name.trim());checkCitations(s.aspectCitations);checkCitations(s.returnCitations);for(const r of s.relations){requireFact(sections.has(r.sectionId));checkCitations(r.citations);}section={kind:'named',name:s.name,aspect:{reason:s.aspectReason,citations:s.aspectCitations},returnValue:{reason:s.returnReason,citations:s.returnCitations},relations:s.relations};}
 const mapped=t.entries.map(e=>{checkCitations([e.span]);if(e.entryId){const sent=entries.get(e.entryId);requireFact(sent&&sent.workingInputId===e.span.inputId);}for(const a of e.additional){requireFact(topics.has(a.topicId));checkCitations(a.returnCitations);}return {span:e.span,type:e.type,...(e.entryId?{entryId:e.entryId}:{}),additional:e.additional.map(a=>({topicId:a.topicId,returnValue:{reason:a.returnReason,citations:a.returnCitations}}))};});
 return {version:1,kind:t.kind,name:t.name||null,...(t.boundaryKey?{boundaryKey:t.boundaryKey}:{}),substance:t.substance,boundary:t.boundary,returnValue:t.returnValue,continuity:t.continuity,evidence:t.evidence,relations:t.relations,section,entries:mapped};
}
const without=(value,keys)=>Object.fromEntries(Object.entries(value).filter(([k])=>!keys.includes(k)));
function unitMaterial(unit,material,metadata){
 let key;try{key=JSON.parse(unit.key);}catch{fail('INVALID_RESPONSE');}requireFact(Array.isArray(key)&&key.length===2);
 const [kind,id]=key;
 if(kind==='input'){requireFact(material.inputs.some(i=>i.inputId===id));return {inputs:[id],authored:[],bound:[],structures:[],topicId:null};}
 const authored=kind==='library_entry'?(material.authoredEntries||[]).find(e=>e.entryId===id):null;
 if(authored){const m=metadata.authoredEntries?.find(e=>e.entryId===id);requireFact(m&&equal(without(authored,['body','fields']),m),'STALE_BASE');return {inputs:[],authored:[m],bound:[],structures:[],topicId:m.topicId};}
 const bound=(material.boundEntries||[]).find(e=>kind==='library_entry'?e.entryId===id:kind==='placement'&&e.placementId===id);
 if(bound){const m=metadata.boundEntries?.find(e=>e.entryId===bound.entryId&&e.topicId===bound.topicId);requireFact(m&&equal(without(bound,['fields']),without(m,['sourceRecordIds','sourceIdentityTokens'])),'STALE_BASE');return {inputs:[m.inputId],authored:[],bound:[m],structures:[],topicId:m.topicId};}
 if(kind==='library_entry'){const entry=material.entries?.find(e=>e.entryId===id);requireFact(entry&&metadata.entries?.some(e=>e.entryId===id&&e.revision===entry.revision&&equal(e.inputIds,[entry.workingInputId])),'STALE_BASE');return {inputs:[entry.workingInputId],authored:[],bound:[],structures:[],topicId:null};}
 if(kind==='placement'){const p=material.placements?.find(e=>e.placementId===id);requireFact(p&&metadata.placements?.some(e=>equal(e,p)),'STALE_BASE');return {inputs:[p.inputId],authored:[],bound:[],structures:[],topicId:p.topicId};}
 if(kind==='section'||kind==='topic'){const list=kind==='topic'?'structuralTopics':'structuralSections',sent=material[list]?.find(e=>kind==='topic'?e.topicId===id:e.sectionId===id),m=metadata[list]?.find(e=>kind==='topic'?e.topicId===id:e.sectionId===id);requireFact(sent&&m&&equal(without(sent,['title','name']),m),'STALE_BASE');return {inputs:[...new Set(m.entries.map(e=>e.inputId))],authored:[],bound:[],structures:[m],topicId:m.topicId};}
 if(kind==='context_item'){const sent=material.contextItems?.find(e=>e.itemId===id),m=metadata.contextItems?.find(e=>e.itemId===id);requireFact(sent&&m&&equal(without(sent,['fields']),without(m,['associationIds','evidence'])),'STALE_BASE');return {inputs:sent.inputIds,authored:[],bound:[],structures:[],topicId:null,correction:m};}
 fail('INVALID_RESPONSE');
}

// The public stable Item ID is the wire target reference. itemRef is only its
// bounded display label; comparing the complete sent DTO below binds that label
// too. Private lineage comes solely from this child's original captured handle,
// never from a model-selected database lookup or the summary's completeness.
const existingPrivateKeys=['epoch','associationIds','provenance','invalidation','currentEvidence','currentProvenance'];
const evidenceAt=(xs,e)=>xs.find(x=>contextEvidenceKey(x)===contextEvidenceKey(e)&&x.topicId===e.topicId);
function sameSourceFamily(old,live){
 if(!live||!old.selectedFields.every(f=>live.selectedFields.includes(f)))return false;
 if(['humanEntry','boundEntry'].includes(old.kind)&&(!['humanEntry','boundEntry'].includes(live.kind)||old.entryCreatedAt!==live.entryCreatedAt||old.birthOperationId!==live.birthOperationId))return false;
 return old.kind==='humanEntry'||sameIds(old.sourceRecordIds,live.sourceRecordIds)&&sameIds(old.sourceIdentityTokens,live.sourceIdentityTokens);
}
function selectedExistingEvidence(baseline,selected){
 const inputs=[...new Set(selected.flatMap(m=>m.inputs))],authored=[...new Map(selected.flatMap(m=>m.authored).map(e=>[e.entryId,e])).values()],bound=[...new Map(selected.flatMap(m=>m.bound).map(e=>[e.entryId,e])).values()],structures=selected.flatMap(m=>m.structures);
 const evidence=baseline.currentEvidence.filter(e=>e.kind==='humanEntry'?authored.some(a=>a.entryId===e.entryId):e.kind==='boundEntry'?bound.some(b=>b.entryId===e.entryId):inputs.includes(e.inputId));
 // A coverage key must have its own selected evidence. Reusing one Item ID
 // cannot turn unrelated Input/Entry/Placement units into a checked result.
 if(!sameIds(inputs,[...new Set(evidence.filter(e=>!['humanEntry','boundEntry'].includes(e.kind)).map(e=>e.inputId))])||!sameIds(authored.map(e=>e.entryId),evidence.filter(e=>e.kind==='humanEntry').map(e=>e.entryId))||!sameIds(bound.map(e=>e.entryId),evidence.filter(e=>e.kind==='boundEntry').map(e=>e.entryId)))return null;
 for(const m of selected){if(m.topicId!==null&&m.inputs.some(id=>!evidence.some(e=>e.inputId===id&&e.topicId===m.topicId)))return null;}
 for(const e of evidence){const structure=e.humanTopic||e.humanSection;if(structure&&!structures.some(s=>equal(s,structure)))return null;}
 for(const s of structures)for(const entry of s.entries)if(!evidence.some(e=>e.inputId===entry.inputId&&e.topicId===s.topicId&&equal(e[structuralContextProperty(s)],s)))return null;
 return validContextEvidenceSpecs(evidence)?structuredClone(evidence):null;
}
function existingContextGroup(held,g,selected,metadata){
 const sent=(held.payload.material.existingContextItems||[]).find(x=>x.itemId===g.itemId);
 if(!sent)return null;
 const baseline=(metadata.existingContextItems||[]).find(x=>x.itemId===g.itemId);
 requireFact(baseline&&equal(sent,without(baseline,existingPrivateKeys)),'STALE_BASE');
 requireFact(sent.revision===g.expectedRevision&&sent.card===g.card&&sent.origin==='automatic'&&sent.protected===false&&sent.userEdited===false&&['active','invalidated'].includes(sent.lifecycle),'STALE_BASE');
 requireFact(g.topicId===''&&baseline.epoch===baseline.provenance?.epoch&&baseline.epoch===baseline.currentProvenance?.epoch&&validContextEvidenceSpecs(baseline.currentEvidence),'STALE_BASE');
 if(g.operation!=='UPDATE'&&sent.lifecycle!=='active')return null;
 const evidence=selectedExistingEvidence(baseline,selected);if(!evidence)return null;
 const current=evidence.map(e=>evidenceAt(baseline.currentProvenance.evidence,e));
 requireFact(current.every((e,i)=>e&&equal(without(e,['contentRevision','sourceRecordIds','sourceIdentityTokens']),without(evidence[i],['contentRevision','sourceRecordIds','sourceIdentityTokens']))),'STALE_BASE');
 const prior=[baseline.provenance,baseline.invalidation].filter(Boolean).flatMap(p=>p.evidence);
 if(g.operation==='NO_CHANGE'){
  // A real proper subset is allowed, but the Item's untouched lineage is not
  // claimed checked and no Item/provenance/revision mutation is constructed.
  if(current.some(e=>{const old=evidenceAt(baseline.provenance.evidence,e);return !old||!e.selectedFields.every(f=>old.selectedFields.includes(f))||!sameSourceFamily({...old,selectedFields:e.selectedFields},e);}))return null;
 }else{
  const required=g.operation==='REMOVE_CANDIDATE'||sent.lifecycle==='invalidated'?prior:prior.filter(e=>e.humanTopic||e.humanSection);
  for(const old of required){const live=evidenceAt(current,old),structure=old.humanTopic||old.humanSection;if(!sameSourceFamily(old,live))return null;if(structure){const actual=live[structuralContextProperty(structure)];if(!actual||actual.topicId!==structure.topicId||structure.kind!=='topic'&&actual.sectionId!==structure.sectionId||!structure.selectedFields.every(f=>actual.selectedFields.includes(f)))return null;}}
  if(sent.lifecycle==='invalidated'&&(!baseline.invalidation||contextEvidenceIdentity({epoch:baseline.epoch,evidence:current})===contextEvidenceIdentity(baseline.invalidation)))return null;
 }
 const common={operationId:held.store.uuid(),epoch:baseline.epoch,itemId:sent.itemId,card:sent.card,expectedRevision:sent.revision,associationIds:[...baseline.associationIds],evidence};
 if(g.operation==='UPDATE'){requireFact(g.body.trim()&&g.section.trim());const change={...common,body:g.body,section:g.section,...temporal(g.temporal)};if(new TextEncoder().encode(JSON.stringify(change)).byteLength>CONTEXT_MAINTENANCE_LIMITS.requestBytes)return null;validateContextMaintenanceChange(change);return change;}
 requireFact(g.body===''&&g.section===''&&!g.temporal.present);temporal(g.temporal);
 const change={operation:g.operation,...common};if(new TextEncoder().encode(JSON.stringify(change)).byteLength>CONTEXT_MAINTENANCE_LIMITS.requestBytes)return null;(g.operation==='NO_CHANGE'?validateContextMaintenanceNoChange:validateContextMaintenanceInvalidation)(change);return change;
}

// Each registration is an exact already-qualified physical child, private to
// this client. No body is persisted and no repository-wide discovery occurs.
export function createMaintenanceServiceResponseAdapter(){
 const children=new Map();let disposed=false;
 const releaseChild=id=>{const held=children.get(id);if(held){children.delete(id);held.signal?.removeEventListener('abort',held.abort);held.payload=null;held.foundation=null;held.store=null;}};
 const current=held=>{let live=false;try{live=!disposed&&!!held.payload&&children.get(held.payload.childOperationId)===held&&held.isCurrent()===true;}catch{/* A throwing currentness owner is denial, never a retained body lease. */}if(!live){if(held.payload)releaseChild(held.payload.childOperationId);fail('UNAVAILABLE');}};
 const consumed=(held,facet)=>{held.decoded.add(facet);if(held.facets.every(f=>held.decoded.has(f)))releaseChild(held.payload.childOperationId);};
 async function decode(facet,raw,metadata,binding,qualification=null){
  const correlation=snapshot(binding);requireFact(Object.keys(correlation).length===3&&['logicalJobId','childOperationId','operationReceiptId'].every(k=>typeof correlation[k]==='string'&&correlation[k].length>0));
  const held=children.get(correlation.childOperationId);requireFact(held,'UNAVAILABLE');current(held);
  try{const payload=held.payload,v=validateWire(raw,payload,correlation);requireFact(!held.receipt||held.receipt===correlation.operationReceiptId,'STALE_BASE');held.receipt=correlation.operationReceiptId;
  const m=snapshot(metadata,{maxBytes:524288,maxKeys:16000,maxDepth:20,maxString:131072}),units=payload.coverage.filter(u=>u.facet===facet);
  requireFact(units.length>0);if(facet!=='topic')requireFact(sameIds(m.units.map(unitKey),units.map(unitKey)),'STALE_BASE');
  if(v[facet].status==='DEFER')defer(correlation,facet,units);
  let value;
  if(facet==='topic')value=topicValue(v.topic,payload.material,m,v.citations);
  else if(facet==='filter'){
   requireFact(sameIds(v.filter.decisions.map(d=>d.inputId),m.inputIds));for(const d of v.filter.decisions)requireFact(payload.material.inputs.some(i=>i.inputId===d.inputId));value=v.filter.decisions;
  }else value=await contextValue(held,v.context,m,correlation,units,current,qualification);
  current(held);consumed(held,facet);return {binding:correlation,value};
  }catch(error){if(readMaintenanceResponseDefer(error)){current(held);consumed(held,facet);}else if(!['STORAGE_FAILED','STORAGE_FULL'].includes(error?.code))releaseChild(correlation.childOperationId);throw error;}
 }
 return Object.freeze({adapter:Object.freeze(Object.fromEntries(['topic','context','filter'].map(facet=>[facet,(raw,metadata,binding,qualification)=>decode(facet,raw,metadata,binding,qualification)]))),
  registerChild(foundation,payload,isCurrent,signal=null){requireFact(!disposed&&typeof isCurrent==='function'&&foundation?.s&&(!signal||signal instanceof AbortSignal&&!signal.aborted),'UNAVAILABLE');const copied=freeze(snapshot(payload));requireFact(!children.has(copied.childOperationId)&&children.size<16,'UNAVAILABLE');const abort=()=>releaseChild(copied.childOperationId);children.set(copied.childOperationId,{foundation,store:foundation.s,payload:copied,isCurrent,receipt:null,facets:[...new Set(copied.coverage.map(u=>u.facet))],decoded:new Set(),signal,abort});signal?.addEventListener('abort',abort,{once:true});current(children.get(copied.childOperationId));},
  releaseChild,
  releaseJob(jobId){for(const [id,held]of children)if(held.payload.logicalJobId===jobId)releaseChild(id);},
  dispose(){disposed=true;for(const id of children.keys())releaseChild(id);}
 });
}
async function contextValue(held,context,metadata,binding,units,current,qualification){
 const material=held.payload.material,mapped=new Map(units.map(u=>[u.key,{unit:u,...unitMaterial(u,material,metadata)}]));
 requireFact(sameIds([...new Set([...mapped.values()].flatMap(m=>m.inputs))],metadata.inputIds),'STALE_BASE');
 const all=context.groups.flatMap(g=>g.unitKeys);requireFact(sameIds(all,units.map(u=>u.key)));
 const check=()=>{current(held);if(qualification)assertMaintenanceQualification(qualification,held.store);return true;};
 if(qualification){const receipt=maintenanceQualificationReceipt(qualification,held.store),scope=receipt.scope;requireFact(['child','post-topic'].includes(scope.phase)&&scope.binding.logicalJobId===binding.logicalJobId&&scope.binding.childOperationId===binding.childOperationId,'STALE_BASE');}
 const groups=[],deferredUnits=[],budget=qualification?forkContextScopeWorkBudget(maintenanceQualificationWorkBudget(qualification,held.store),{database:held.store.repository.db,qualification,isCurrent:check}):createContextScopeWorkBudget({database:held.store.repository.db});
 const admitted=await held.foundation.read(t=>contextLineageAdmission(held.store,contextScopeTransactionReader(held.store,t,budget)));current(held);
 for(const g of context.groups){
  const selected=g.unitKeys.map(key=>mapped.get(key)),groupUnits=selected.map(m=>m.unit);requireFact(selected.every(Boolean));
  if(g.operation==='DEFER'){requireFact(g.reason.trim()&&g.topicId===''&&g.itemId===''&&g.expectedRevision===0&&g.card==='info'&&g.body===''&&g.section===''&&!g.temporal.present);temporal(g.temporal);deferredUnits.push(...groupUnits);continue;}
  requireFact(g.reason==='');const extra=temporal(g.temporal);
  const corrections=selected.filter(m=>m.correction);
  if(corrections.length){
   const c=corrections[0].correction;requireFact(selected.length===1&&corrections.length===1&&g.operation==='UPDATE'&&g.itemId===c.itemId&&g.expectedRevision===c.revision&&g.card===c.card&&g.topicId===''&&!g.temporal.present);
   const change={operationId:held.store.uuid(),epoch:c.proof.epoch,itemId:c.itemId,card:c.card,expectedRevision:c.revision,body:g.body,section:g.section,associationIds:[...c.associationIds],evidence:structuredClone(c.evidence)};validateContextMaintenanceChange(change);groups.push({units:groupUnits,operation:'UPDATE',change});continue;
  }
  if(g.operation!=='ADD'){
   requireFact(g.itemId!==''&&g.expectedRevision>0&&g.topicId==='');
   if(g.operation!=='UPDATE')requireFact(g.body===''&&g.section===''&&!g.temporal.present);
   const change=existingContextGroup(held,g,selected,metadata);
   if(change)groups.push({units:groupUnits,operation:g.operation,change});else deferredUnits.push(...groupUnits);
   continue;
  }
  requireFact(g.itemId===''&&g.expectedRevision===0&&g.body.trim()&&g.section.trim());
  // Material capture requires the exact original local field capability, never
  // a provider claim or a fresh independent budget for the response phase.
  requireFact(qualification,'UNAVAILABLE');check();
  let topicId=g.topicId;
  if(topicId==='$result'){const result=metadata.topicResult;requireFact(result&&['create','reuse'].includes(result.outcome)&&Array.isArray(result.topicIds)&&result.topicIds.length===1);topicId=result.topicIds[0];}
  else requireFact(topicId&&[...(material.identities||[]).flatMap(t=>[t.id,t.canonicalId]),...(material.placements||[]).map(p=>p.topicId),...(material.authoredEntries||[]).map(e=>e.topicId),...(material.boundEntries||[]).map(e=>e.topicId),...(material.structuralTopics||[]).map(e=>e.topicId),...(material.structuralSections||[]).map(e=>e.topicId)].includes(topicId));
  requireFact(selected.every(m=>m.topicId===null||m.topicId===topicId));
  const inputIds=[...new Set(selected.flatMap(m=>m.inputs))],authored=[...new Map(selected.flatMap(m=>m.authored).map(e=>[e.entryId,e])).values()],bound=[...new Map(selected.flatMap(m=>m.bound).map(e=>[e.entryId,e])).values()],structures=selected.flatMap(m=>m.structures);
  requireFact(inputIds.length+authored.length+bound.length<=16);
  const preflight=await readContextProcessingPreflight(held.store,{topicId,inputIds,...(authored.length?{entryIds:authored.map(e=>e.entryId)}:{}),expectedAuthority:admitted.authority},budget);current(held);requireFact(preflight.available,'STALE_BASE');
  const inputDigests=new Map();for(const inputId of inputIds){const sent=material.inputs.find(i=>i.inputId===inputId);requireFact(sent);chargeMaintenanceQualificationHash(qualification,held.store,sent.body);inputDigests.set(inputId,await hashText(sent.body));check();}
  const evidence=await held.foundation.read(async transaction=>{const t=contextScopeTransactionReader(held.store,transaction,budget),now=await contextLineageAdmission(held.store,t,admitted.epoch);requireFact(now.authority===admitted.authority&&now.gate===admitted.gate,'STALE_BASE');const result=[];
   for(const inputId of inputIds){const sent=material.inputs.find(i=>i.inputId===inputId),p=await inputProjection(held.store,t,inputId);requireFact(sent&&p&&sent.revision===p.contentRevision&&sent.body===p.body,'STALE_BASE');const structural=structures.filter(s=>s.entries.some(e=>e.inputId===inputId));requireFact(structural.length<=1);result.push({topicId,inputId,selectedFields:['body'],fieldDigests:{body:inputDigests.get(inputId)},expectedTopicBinding:structuredClone(preflight.binding),expectedRemovalSequence:p.lastRemovalSequence,...(structural.length?{[structuralContextProperty(structural[0])]:structuredClone(structural[0])}:{})});}
   for(const e of authored)result.push(authoredContextEvidence(e,preflight.binding,e.fieldDigests??e.bodyDigest));
   for(const e of bound)result.push(boundContextEvidence(e,preflight.binding,e.fieldDigests));
   return result;
  });current(held);requireFact(validContextEvidenceSpecs(evidence));
  const change={operationId:held.store.uuid(),epoch:admitted.epoch,itemId:held.store.uuid(),card:g.card,expectedRevision:0,body:g.body,section:g.section,associationIds:[held.store.uuid()],evidence,...extra};validateContextMaintenanceChange(change);groups.push({units:groupUnits,operation:'ADD',change});
 }
 current(held);if(deferredUnits.length)defer(binding,'context',deferredUnits,groups);return groups;
}
