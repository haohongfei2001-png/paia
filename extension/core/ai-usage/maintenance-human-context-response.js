import {canonical,equal,exact,fail,unitKey,validateCoverage} from './contracts.js';
import {freeze,snapshot} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {prefix} from '../thought-model.js';
import {inputProjection} from '../thought-evidence.js';
import {readAuthoredEntryContext,authoredSelectedFields,authoredSelectedText,authoredContextEvidence} from '../context-authored-entry.js';
import {readBoundEntryContext,boundSelectedText,boundContextEvidence} from '../context-bound-entry.js';
import {readStructuralContextEvidence,structuralContextProperty} from './structural-context-mapping.js';
import {readContextTopicScope,createContextScopeWorkBudget,contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {readContextCards} from '../context-cards.js';
import {contextEvidenceKey} from '../context-item-lineage.js';
import {validateContextMaintenanceChange,validateContextMaintenanceNoChange} from '../context-maintenance.js';
import {readMaintenanceExistingContext,resolveMaintenanceExistingContext,assertMaintenanceExistingContext} from './maintenance-existing-context.js';
import {validContextTemporal} from '../context-temporal.js';

// A source-profile fragment, not another processing grant or domain owner.
// Existing profile composition and authenticated response binding stay with
// maintenance-service-response. Objects are all-required and contain no unions.
const text=(max,min=1,values)=>({type:'string',minLength:min,maxLength:max,...(values?{enum:values}:{})});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,max,min=0)=>({type:'array',items,minItems:min,maxItems:max});
export const MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA=freeze(list(object({
 operation:text(9,1,['ADD','UPDATE','NO_CHANGE']),ref:text(8,0),expectedRevision:{type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER},
 card:text(5,1,['info','rules','now']),body:text(8192,0),section:text(80,0),coverageRefs:list(text(8),20,1),
 temporal:list(object({temporalScope:text(512,0),uncertainty:text(512,0),validUntil:text(64,0)}),1)
}),20));
export const MAINTENANCE_HUMAN_CONTEXT_INSTRUCTIONS='Context coverageRefs are u0, u1, and so on in the supplied context-coverage order. Partition that exact coverage once, or return an empty array when unsupported. Use only the sent authored Entry selected fields, bound Entry selected fields plus its separately supplied original Input body, or complete human Placement/Section/Topic membership and Input bodies. Preserve field clears, conditions, negation, human membership, Section and order. A human title is interpretation context, never a replacement for Input evidence. ADD uses empty ref and expectedRevision 0. UPDATE and NO_CHANGE require an available separately supplied existing Item ref, its exact revision/card and complete registered evidence closure; no invented Item, Topic, Input, association, grant or receipt IDs. NO_CHANGE keeps body, section and temporal empty. Now needs explicit evidence-backed temporalScope. Human Context correction is unavailable without the original private correction witness; sent proof JSON is not such a witness. Missing evidence or permission stays pending. No extra requests, retries, tools or external memory.';
function matches(s,v){
 switch(s.type){
 case 'object':return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)&&matches(s.properties[k],v[k]));
 case 'array':return Array.isArray(v)&&v.length>=s.minItems&&v.length<=s.maxItems&&v.every(x=>matches(s.items,x));
 case 'string':return typeof v==='string'&&!/[\u0000]/u.test(v)&&!/[\uD800-\uDFFF]/u.test(v.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gu,''))&&[...v].length>=s.minLength&&[...v].length<=s.maxLength&&(!s.enum||s.enum.includes(v));
 case 'integer':return Number.isSafeInteger(v)&&v>=s.minimum&&v<=s.maximum;
 default:return false;
 }
}
export function validateMaintenanceHumanContextResponse(value){
 let v;try{v=snapshot(value,{maxBytes:65536,maxKeys:4096,maxDepth:8,maxString:32768});}catch{fail('INVALID_RESPONSE');}
 if(!matches(MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA,v))fail('INVALID_RESPONSE');return v;
}
const without=(value,keys)=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
const unique=values=>new Set(values).size===values.length;
const allEvidence=item=>[item.maintenance.provenance,item.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence);
// Negative selection only. It does not infer semantic equality, permanently ban
// a source, or upgrade an Input grant into an existing-Item processing grant.
export function hasMaintenanceHumanContextLineage(row,evidence,excludeItemId=null){
 const keys=new Set(evidence.map(contextEvidenceKey));
 return row.items.some(item=>item.id!==excludeItemId&&item.origin==='automatic'&&allEvidence(item).some(e=>keys.has(contextEvidenceKey(e))));
}
const fieldValues=m=>m.fields??{body:m.body};
const fieldDigests=m=>m.fieldDigests??{body:m.bodyDigest};
const fieldsOf=m=>m.kind==='humanEntry'?authoredSelectedFields(m):m.selectedFields;
const mappingOf=m=>without(m,['fields','fieldDigests','body','bodyDigest']);
const structuralOf=m=>without(m,['title','name']);
const boundDTO=m=>without(m,['sourceRecordIds','sourceIdentityTokens']);

/**
 * material and coverage must be the immutable packet retained by the source
 * bind, after the ORIGINAL session granted every selected field. read is that
 * session/Foundation's original read callback; isCurrent synchronously checks
 * its original processing receipt. This mapper never resolves authority.
 * metadata is the original session's private adapter metadata, not model JSON.
 * existingContext accepts only the existing owner's authentic WeakMap handle.
 * Caller still owns job/child/receipt binding and final transaction/CAS/ACK.
 */
export function createMaintenanceHumanContextResponseMapper(store,{material,coverage,read,isCurrent,existingContext=null,workBudget=null}){
 if(!store?.repository?.db||typeof store.uuid!=='function'||typeof read!=='function'||typeof isCurrent!=='function')fail('UNAVAILABLE');
 const database=store.repository.db,budget=workBudget??createContextScopeWorkBudget({database});let disposed=false,pending=null,cached=null;
 const live=()=>{if(disposed||store.repository.db!==database||isCurrent()!==true)fail('STALE_BASE');};
 live();const sent=snapshot(material),sentCoverage=snapshot(coverage);validateCoverage(sentCoverage,'AI_MAINTENANCE');const units=sentCoverage.filter(u=>u.facet==='context');
 exact(sent,['version','purpose','inputs','entries','placements','authoredEntries','boundEntries','structuralSections','structuralTopics','contextItems','identities','sections','constraints','existingContextItems'],['version','purpose','inputs','identities','sections','constraints']);
 if(sent.version!==1||sent.purpose!=='AI_MAINTENANCE'||!units.length||units.length>20||!Array.isArray(sent.inputs)||!unique(sent.inputs.map(i=>i.inputId))||sent.inputs.length+(sent.authoredEntries?.length??0)+(sent.boundEntries?.length??0)>Math.min(20,store.organizerBudget.limits.maxInputs))fail('UNAVAILABLE');
 // A correction's sent proof is deliberately not an accepted private witness.
 if(sent.contextItems?.length)fail('UNAVAILABLE');
 if(existingContext?!equal(sent.existingContextItems,readMaintenanceExistingContext(existingContext)):sent.existingContextItems!==undefined)fail('UNAVAILABLE');
 const boundedRead=fn=>{live();return read(async transaction=>{live();const value=await fn(contextScopeTransactionReader(store,transaction,budget));live();return value;}).then(value=>{live();return value;});};
 const digest=async value=>{live();budget.hashBytes+=new TextEncoder().encode(value).length;budget.hashFields++;if(budget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||budget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');const hash=await hashText(value);live();return hash;};
 const authored=sent.authoredEntries??[],bound=sent.boundEntries??[],placements=sent.placements??[],structures=[...(sent.structuralSections??[]),...(sent.structuralTopics??[])];
 const descriptor=unit=>{let value;try{value=JSON.parse(unit.key);}catch{fail('STALE_BASE');}if(!Array.isArray(value)||value.length!==2||!['library_entry','placement','section','topic'].includes(value[0])||typeof value[1]!=='string')fail('UNAVAILABLE');return value;};
 const selection=units.map(unit=>{
  const [kind,id]=descriptor(unit),a=kind==='library_entry'?authored.filter(m=>m.entryId===id):[],b=['library_entry','placement'].includes(kind)?bound.filter(m=>(kind==='library_entry'?m.entryId:m.placementId)===id):[],p=kind==='placement'?placements.filter(m=>m.placementId===id):[],s=structures.filter(m=>kind===(m.kind==='topic'?'topic':'section')&&(m.kind==='topic'?m.topicId:m.sectionId)===id);
  if(a.length+b.length+s.length!==1&&!(a.length+b.length+s.length===0&&p.length===1)||p.length>1||b.length&&p.some(x=>x.entryId!==b[0].entryId||x.topicId!==b[0].topicId))fail('UNAVAILABLE');
  return {unit,authored:a[0],bound:b[0],placement:p[0],structure:s[0]};
 });
 for(const [values,key]of [[authored,'authored'],[bound,'bound'],[placements,'placement'],[structures,'structure']])if(!Array.isArray(values)||values.some(m=>!selection.some(s=>s[key]===m))||!unique(values.map(m=>JSON.stringify([m.entryId??m.recordId??m.placementId,m.topicId]))))fail('STALE_BASE');
 const expectedInputs=[...new Set(selection.flatMap(s=>s.bound?[s.bound.inputId]:s.placement?[s.placement.inputId]:s.structure?s.structure.entries.map(e=>e.inputId):[]))].sort();
 if(!equal(expectedInputs,sent.inputs.map(i=>i.inputId).sort()))fail('STALE_BASE');
 const expectedEntries=[...new Map(selection.flatMap(s=>s.bound?[{entryId:s.bound.entryId,revision:s.bound.entryRevision,inputIds:[s.bound.inputId]}]:s.placement?[{entryId:s.placement.entryId,revision:s.placement.entryRevision,inputIds:[s.placement.inputId]}]:s.structure?s.structure.entries.map(e=>({entryId:e.entryId,revision:e.revision,inputIds:[e.inputId]})):[]).map(e=>[e.entryId,e])).values()].sort((a,b)=>a.entryId.localeCompare(b.entryId));
 if(!equal(expectedEntries,(sent.entries??[]).map(e=>({entryId:e.entryId,revision:e.revision,inputIds:[e.workingInputId]})).sort((a,b)=>a.entryId.localeCompare(b.entryId)))||sent.entries?.some(e=>e.bodyBinding!=='input'||!sent.inputs.some(i=>i.inputId===e.workingInputId&&i.body===e.body)))fail('STALE_BASE');
 for(const [index,input]of sent.inputs.entries()){exact(input,['ref','inputId','revision','body']);if(input.ref!=='i'+index||typeof input.body!=='string')fail('STALE_BASE');}

 async function current(metadata){
  return boundedRead(async t=>{
   const result={inputs:[],authored:[],bound:[],placements:[],structures:[]};
   for(const input of sent.inputs){const now=await inputProjection(store,t,input.inputId);if(!now||now.contentRevision!==input.revision||now.body!==input.body||await store.isFiltered(t,now.block,await t.get('meta','smart-filter')))fail('STALE_BASE');result.inputs.push(now);}
   for(const m of authored){const now=await readAuthoredEntryContext(store,t,m.entryId);if(!now||!equal(now,mappingOf(m))||!equal(authoredSelectedText(await t.get('thoughts',m.entryId),authoredSelectedFields(now)),fieldValues(m)))fail('STALE_BASE');result.authored.push(now);}
   for(const m of bound){const now=await readBoundEntryContext(store,t,m.entryId,null,m.topicId),privateMapping=metadata.boundEntries.find(e=>e.entryId===m.entryId&&e.topicId===m.topicId);if(!now||!equal(now,mappingOf(privateMapping))||!equal(boundDTO(now),mappingOf(m))||!equal(boundSelectedText(await t.get('thoughts',m.entryId),now.selectedFields),m.fields))fail('STALE_BASE');result.bound.push(now);}
   for(const m of placements){
    const p=await t.get('placements',m.placementId),entry=await t.get('thoughts',m.entryId),topic=await t.get('topics',m.topicId),section=await t.get('sections',JSON.stringify([m.topicId,m.layoutGeneration,m.sectionId])),journal=await t.edge('revisions','byList',prefix(['placement:'+m.placementId]),'prev'),intent=entry?.organizationIntents?.edges?.[m.topicId];
    if(!p||!entry||!topic||!section||p.id!==JSON.stringify([m.topicId,m.layoutGeneration,m.entryId])||p.revision!==m.revision||p.entryId!==m.entryId||p.topicId!==m.topicId||p.sectionId!==m.sectionId||p.layoutGeneration!==m.layoutGeneration||p.lifecycle!=='active'||p.excludedByUser||p.membershipAuthorship!=='user'||p.sectionProtection!==true||p.orderProtection!==true||p.sectionRank!==section.rank||entry.lifecycle!=='active'||entry.revision!==m.entryRevision||entry.bodyBinding!=='input'||entry.workingInputId!==m.inputId||entry.provenanceType!=='input_original'||entry.integrity!=='complete'||entry.freshness!=='current'||entry.inputRefs?.length!==1||entry.inputRefs[0].inputBlockId!==m.inputId||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.identity?.noRecreation||topic.revision!==m.topicRevision||topic.organizationRevision!==m.topicOrganizationRevision||topic.activeLayoutGeneration!==m.layoutGeneration||section.lifecycle!=='active'||section.redirectTo||section.revision!==m.sectionRevision||intent?.actor!=='user'||intent.include!==true||!entry.organizationIntents.included.includes(m.topicId)||entry.organizationIntents.excluded.includes(m.topicId)||entry.organizationIntents.legacyProtected||entry.organizationIntents.fixed&&!entry.organizationIntents.fixed.topicIds.includes(m.topicId)||journal?.actor!=='user'||journal.kind!=='placement'||journal.entityId!==p.id||journal.documentId!==m.topicId||!['place','restore'].includes(journal.reason)||!equal(journal.fieldMask,['membership','section','order'])||!equal(journal.after,p)||journal.operationId!==intent.operationId||!equal([...(journal.sourceRecordIds??[])].sort(),[...entry.sourceRecordIds].sort()))fail('STALE_BASE');
    if(!bound.some(b=>b.entryId===entry.id&&b.topicId===m.topicId)&&(entry.title||entry.note||entry.fieldRevisions?.title>0||entry.fieldRevisions?.note>0))fail('STALE_BASE');
    result.placements.push({p,entry,topic,section,journal});
   }
   for(const m of structures){const spec=structuralOf(m),now=await readStructuralContextEvidence(store,t,spec),field=m.kind==='topic'?'name':'title';if(!now||!equal(now.fields,{[field]:m[field]})||!equal(now.inputs,Object.fromEntries(m.entries.map(e=>[e.inputId,sent.inputs.find(i=>i.inputId===e.inputId)?.body]))))fail('STALE_BASE');const topic=await t.get('topics',m.topicId),identity=sent.identities.find(i=>i.id===m.topicId);if(!identity||topic.name!==identity.name)fail('STALE_BASE');result.structures.push(now);}
   if(existingContext)await assertMaintenanceExistingContext(store,t,existingContext);
   return result;
  });
 }
 async function interpret(value,metadata){
  live();const proposals=validateMaintenanceHumanContextResponse(value),meta=snapshot(metadata);
  exact(meta,['units','inputIds','entries','placements','authoredEntries','boundEntries','structuralSections','structuralTopics'],['units','inputIds']);
  if(!equal(validateCoverage(meta.units,'AI_MAINTENANCE'),validateCoverage(units,'AI_MAINTENANCE'))||!equal(meta.inputIds,expectedInputs)||!equal(meta.entries??[],expectedEntries)||!equal(meta.placements??[],placements)||!equal(meta.authoredEntries??[],authored.map(m=>without(m,['body','fields'])))||!equal((meta.boundEntries??[]).map(boundDTO),bound.map(m=>without(m,['fields'])))||!equal(meta.structuralSections??[],(sent.structuralSections??[]).map(structuralOf))||!equal(meta.structuralTopics??[],(sent.structuralTopics??[]).map(structuralOf)))fail('STALE_BASE');
  const refs=units.map((_,i)=>'u'+i),covered=proposals.flatMap(p=>p.coverageRefs);if(!unique(covered)||!equal([...covered].sort(),[...refs].sort()))fail('INVALID_RESPONSE');
  const before=await current(meta),inputHashes=new Map();
  for(const input of sent.inputs)inputHashes.set(input.inputId,await digest(input.body));
  for(const m of [...authored,...bound]){const fields=fieldsOf(m),values=fieldValues(m),hashes=fieldDigests(m);exact(values,fields);exact(hashes,fields);for(const field of fields)if(await digest(values[field])!==hashes[field])fail('STALE_BASE');}
  for(const m of structures){const field=m.kind==='topic'?'name':'title';if(await digest(m[field])!==m.fieldDigests[field])fail('STALE_BASE');}
  const scopes=new Map();for(const topicId of new Set(selection.map(s=>(s.authored??s.bound??s.placement??s.structure).topicId))){if(scopes.size>=8)fail('BUDGET_EXCEEDED');live();const scope=await readContextTopicScope(store,{topicId},budget);live();if(!scope.available||scope.scope.eligibility!=='eligible')fail('STALE_BASE');scopes.set(topicId,scope);}
  const inputEvidence=(id,topicId,structure=null)=>{const input=before.inputs.find(i=>i.inputId===id),scope=scopes.get(topicId);if(!input||!scope.scope.inputIds.includes(id))fail('STALE_BASE');return {topicId,inputId:id,selectedFields:['body'],fieldDigests:{body:inputHashes.get(id)},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence,...(structure?{[structuralContextProperty(structure)]:structuralOf(structure)}:{})};};
  const evidenceByUnit=selection.map(s=>s.authored?[authoredContextEvidence(s.authored,scopes.get(s.authored.topicId).binding,fieldDigests(s.authored))]:s.bound?[inputEvidence(s.bound.inputId,s.bound.topicId),boundContextEvidence(before.bound.find(m=>m.entryId===s.bound.entryId&&m.topicId===s.bound.topicId),scopes.get(s.bound.topicId).binding,s.bound.fieldDigests)]:s.structure?s.structure.entries.map(e=>inputEvidence(e.inputId,s.structure.topicId,s.structure)):[inputEvidence(s.placement.inputId,s.placement.topicId)]);
  if(!equal(await current(meta),before))fail('STALE_BASE');
  const groups=[];
  for(const proposal of proposals){
   const indices=proposal.coverageRefs.map(ref=>refs.indexOf(ref)),selected=new Map();
   for(const index of indices)for(const e of evidenceByUnit[index]){const key=contextEvidenceKey(e),prior=selected.get(key);if(prior&&!equal(prior,e)){const plain=x=>without(x,['humanSection','humanTopic']);if(!equal(plain(prior),plain(e))||prior.humanSection&&e.humanTopic||prior.humanTopic&&e.humanSection||prior.humanSection&&e.humanSection||prior.humanTopic&&e.humanTopic)fail('STALE_BASE');if(prior.humanSection||prior.humanTopic)continue;}selected.set(key,e);}
   const evidence=[...selected.values()],operation=proposal.operation;let item;
   if(operation==='ADD'){
    if(proposal.ref!==''||proposal.expectedRevision!==0||await boundedRead(async t=>hasMaintenanceHumanContextLineage(await readContextCards(t),evidence)))fail('STALE_BASE');
   }else{
    if(!existingContext)fail('UNAVAILABLE');item=resolveMaintenanceExistingContext(existingContext,proposal.ref);
    const old=[item.provenance,item.invalidation].filter(Boolean).flatMap(p=>p.evidence),keys=xs=>[...new Set(xs.map(contextEvidenceKey))].sort();
    if(item.state!=='available'||item.revision!==proposal.expectedRevision||item.card!==proposal.card||!equal(keys(old),keys(evidence))||old.some(prior=>!evidence.some(e=>contextEvidenceKey(e)===contextEvidenceKey(prior)&&e.topicId===prior.topicId&&equal(e.selectedFields,prior.selectedFields)&&(!prior.kind||e.birthOperationId===prior.birthOperationId&&e.entryCreatedAt===prior.entryCreatedAt)&&(!prior.humanSection||e.humanSection?.sectionId===prior.humanSection.sectionId)&&(!prior.humanTopic||e.humanTopic?.topicId===prior.humanTopic.topicId))))fail('STALE_BASE');
   }
   const common={operationId:store.uuid(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:item?.itemId??store.uuid(),card:proposal.card,expectedRevision:item?.revision??0,associationIds:item?.associationIds??[store.uuid()],evidence};let change;
   if(operation==='NO_CHANGE'){if(proposal.body!==''||proposal.section!==''||proposal.temporal.length)fail('INVALID_RESPONSE');change={operation,...common};validateContextMaintenanceNoChange(change);}
   else{const temporal=proposal.temporal.length?Object.fromEntries(Object.entries(proposal.temporal[0]).map(([k,v])=>[k,v||null])):null;if(temporal&&!validContextTemporal(temporal)||proposal.card==='now'&&!temporal?.temporalScope)fail('INVALID_RESPONSE');change={...common,body:proposal.body,section:proposal.section,...(temporal?{temporal}:{})};validateContextMaintenanceChange(change);}
   groups.push({operation,units:indices.map(i=>units[i]).sort((a,b)=>unitKey(a).localeCompare(unitKey(b))),change});
  }
  live();return structuredClone(groups);
 }
 function decode(value,metadata){
  live();let selected;try{selected=snapshot({value,metadata});}catch{fail('INVALID_RESPONSE');}
  const key=canonical(selected);
  if(cached){if(cached.key!==key)fail('STALE_BASE');return current(selected.metadata).then(()=>{live();return structuredClone(cached.groups);});}
  if(pending){if(pending.key!==key)fail('STALE_BASE');return pending.promise;}
  const request={key,promise:null};pending=request;
  request.promise=interpret(selected.value,selected.metadata).then(groups=>{live();cached={key,groups:structuredClone(groups)};return groups;}).finally(()=>{if(pending===request)pending=null;});return request.promise;
 }
 return Object.freeze({decode,dispose(){disposed=true;cached=null;pending=null;for(const key of Object.keys(sent))delete sent[key];for(const values of [sentCoverage,units,selection,authored,bound,placements,structures,expectedInputs,expectedEntries])values.length=0;}});
}
