import {maintenanceQualificationWorkBudget} from './maintenance-qualification.js';
import {CONTEXT_CARDS_ROW,CONTEXT_LIMITS,CONTEXT_ITEM_CARDS} from '../context-cards.js';
import {CONTEXT_READ_LIMITS} from '../context-read.js';
import {contextTemporalProjection,validContextTemporal} from '../context-temporal.js';
import {ContextTopicAccessService} from '../context-topic-access.js';
import {contextTopicOperationId,sameContextTopicBinding} from '../context-topic-preferences.js';
import {captureContextEvidence,contextLineageAdmission,fenceContextLineage,releaseContextLineage,validContextMaintenance,validContextEvidenceSpecs,contextEvidenceKey,CONTEXT_LINEAGE_LIMITS} from '../context-item-lineage.js';
import {createContextScopeWorkBudget,forkContextScopeWorkBudget,contextScopeTransactionReader,readContextProcessingPreflight,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {readAuthoredEntryContext,authoredSelectedFields,authoredSelectedText,authoredContextEvidence} from '../context-authored-entry.js';
import {readBoundEntryContext,boundSelectedText,boundContextEvidence} from '../context-bound-entry.js';
import {structuralContextProperty,structuralContextEvidence,readStructuralContextEvidence} from './structural-context-mapping.js';
import {inputProjection} from '../thought-evidence.js';
import * as topicPublicationOwner from '../topic-formation.js';
import * as contextPublicationOwner from '../context-maintenance.js';
import {MemoryService} from '../memory/service.js';
import {hashText} from '../dedupe.js';
import {prefix,idOK,revisionOK} from '../thought-model.js';
import {equal,fail} from './contracts.js';

// Ephemeral own-data qualification only. This is neither an external Context
// reader nor a grant, provider, writer, catalog, cache, scheduler or ACK owner.
// The existing canonical row is bounded, but selection never accesses, clones,
// serializes or hashes its unselected body/section/temporal strings.
export const MAINTENANCE_EXISTING_CONTEXT_LIMITS=Object.freeze({items:CONTEXT_READ_LIMITS.page,evidence:CONTEXT_LINEAGE_LIMITS.inputs});
const held=new WeakMap(),copy=x=>structuredClone(x),bytes=x=>new TextEncoder().encode(JSON.stringify(x)).byteLength;
const need=(v,code='STALE_BASE')=>{if(!v)fail(code);};
const own=(o,k)=>{const d=Object.getOwnPropertyDescriptor(o||{},k);need(d&&Object.hasOwn(d,'value'));return d.value;};
const values=(o,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(o||{},k)).map(k=>[k,copy(own(o,k))]));
const structure=e=>e.humanTopic||e.humanSection;
const entryEvidence=e=>e.kind==='humanEntry'||e.kind==='boundEntry';
const evidenceId=e=>JSON.stringify([contextEvidenceKey(e),e.topicId]);
const list=(x,max)=>Array.isArray(x)&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1;
const scopeKeys=['inputs','entries','authoredEntries','boundEntries','structuralTopics','structuralSections'];
function selectedScope(scope){
 const out={};for(const key of scopeKeys)out[key]=copy(scope?.[key]||[]);
 need(list(out.inputs,20)&&new Set(out.inputs.map(x=>x.inputId)).size===out.inputs.length&&out.inputs.every(x=>idOK(x.inputId)&&list(x.selectedFields,2)&&x.selectedFields.length&&x.selectedFields.every(f=>['body','note'].includes(f))&&new Set(x.selectedFields).size===x.selectedFields.length),'UNAVAILABLE');
 for(const key of scopeKeys.slice(1))need(list(out[key],100),'UNAVAILABLE');
 return out;
}
function metadata(item){
 const m=own(item,'maintenance');
 const maintenance=values(m,['version','associationIds','provenance','invalidation']);
 need(validContextMaintenance(maintenance));
 return {...values(item,['id','card','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy']),maintenance,hasTemporal:Object.hasOwn(m,'temporal')};
}
function scoped(e,scope){
 const selected=entryEvidence(e)?scope[e.kind==='humanEntry'?'authoredEntries':'boundEntries'].find(x=>x.entryId===e.entryId&&x.topicId===e.topicId):scope.inputs.find(x=>x.inputId===e.inputId);
 if(!selected||!e.selectedFields.every(f=>(selected.selectedFields||['body']).includes(f)))return false;
 if(entryEvidence(e)&&(selected.birthOperationId!==e.birthOperationId||selected.entryCreatedAt!==e.entryCreatedAt||e.kind==='boundEntry'&&(selected.inputId!==e.inputId||!scope.inputs.some(x=>x.inputId===e.inputId&&x.selectedFields.includes('body')))))return false;
 const s=structure(e);if(!s)return true;
 const current=scope[s.kind==='topic'?'structuralTopics':'structuralSections'].find(x=>x.topicId===s.topicId&&(s.kind==='topic'||x.sectionId===s.sectionId));
 return !!current&&s.selectedFields.every(f=>current.selectedFields.includes(f))&&[...s.entries,...current.entries].every(x=>scope.inputs.some(i=>i.inputId===x.inputId&&i.selectedFields.includes('body')));
}
function descriptor(m){return {kind:'existingContextItem',itemId:m.id,revision:m.revision,card:m.card,origin:m.origin,protected:m.protected,userEdited:m.userEdited,lifecycle:m.lifecycle,selectedFields:['body','section',...(m.hasTemporal?['temporal']:[])],inputIds:[...new Set([m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence.filter(e=>e.kind!=='humanEntry').map(e=>e.inputId)))].sort()};}
function state(handle){const h=held.get(handle);need(h&&!h.released,'UNAVAILABLE');return h;}
function live(h){
 need(!h.released&&h.store.repository.db===h.database&&!h.signal?.aborted,'UNAVAILABLE');
 if(h.assertProcessing){let result;try{result=h.assertProcessing();}catch{fail('UNAVAILABLE');}if(result!==true){Promise.resolve(result).catch(()=>{});fail('UNAVAILABLE');}}
}
function charge(h,text){const n=new TextEncoder().encode(text).byteLength;h.budget.hashBytes+=n;h.budget.hashFields++;need(h.budget.hashBytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes&&h.budget.hashFields<=CONTEXT_TOPIC_SCOPE_LIMITS.hashFields,'BUDGET_EXCEEDED');}
async function read(h,fn){live(h);const result=await h.read(t=>fn(contextScopeTransactionReader(h.store,t,h.budget)));live(h);return result;}
export async function selectMaintenanceExistingContext(store,t,scope,{limits=store.organizerBudget?.limits}={}){
 const selected=selectedScope(scope),admission=await contextLineageAdmission(store,t),row=await t.get('meta',CONTEXT_CARDS_ROW),candidates=[],keys=new Set(),topics=new Set(),sources=new Set();let omitted=0;
 if(row){need(row.id===CONTEXT_CARDS_ROW&&row.version===1&&list(row.items,CONTEXT_LIMITS.items));const seen=new Set();
  for(const item of row.items){const id=own(item,'id');need(contextTopicOperationId(id)&&!seen.has(id));seen.add(id);
   if(own(item,'origin')!=='automatic'||!['active','invalidated'].includes(own(item,'lifecycle'))||own(item,'protected')!==false||own(item,'userEdited')!==false)continue;
   const m=metadata(item),evidence=[m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence);
   const relevant=evidence.some(e=>entryEvidence(e)?selected[e.kind==='humanEntry'?'authoredEntries':'boundEntries'].some(x=>x.entryId===e.entryId):selected.inputs.some(x=>x.inputId===e.inputId));if(!relevant)continue;
   const union=new Set([...keys,...evidence.map(contextEvidenceKey)]),topicUnion=new Set([...topics,...evidence.map(e=>e.topicId)]),sourceUnion=new Set([...sources,...evidence.flatMap(e=>e.sourceRecordIds||[])]);
   if(!CONTEXT_ITEM_CARDS.includes(m.card)||!revisionOK(m.revision)||m.revision<1||evidence.some(e=>e.expectedTopicBinding.epoch!==admission.epoch||!scoped(e,selected))||candidates.length>=MAINTENANCE_EXISTING_CONTEXT_LIMITS.items||union.size>CONTEXT_LINEAGE_LIMITS.inputs||topicUnion.size>CONTEXT_LINEAGE_LIMITS.topics||sourceUnion.size>CONTEXT_LINEAGE_LIMITS.sources){omitted++;continue;}
   candidates.push(m);for(const key of union)keys.add(key);for(const id of topicUnion)topics.add(id);for(const id of sourceUnion)sources.add(id);
  }
 }
 const handle=Object.freeze({});held.set(handle,{store,database:store.repository.db,admission,scope:selected,selected:candidates,omitted,limits,captured:false,released:false,read:null,signal:null,assertProcessing:null,budget:createContextScopeWorkBudget({database:store.repository.db}),items:[],lineage:null,snapshot:null,entrySnapshots:new Map(),structureSnapshots:new Map(),removeAbort:null});return handle;
}
export function maintenanceExistingContextScope(handle){return state(handle).selected.map(descriptor);}
export function maintenanceExistingContextSummary(handle){const h=state(handle),n=h.captured?h.items.length:h.selected.length;return {version:1,coverage:'selected_processing_scope',selectedItems:n,omittedItems:h.omitted+(h.captured?h.selected.length-n:0),complete:h.omitted+(h.captured?h.selected.length-n:0)===0};}
// Body-free qualification closure. It advances only through original-owner
// write capabilities rooted at the sent admission; it never refreshes content.
export async function maintenanceExistingContextQualification(store,t,handle,{publications=[]}={}){
 const h=state(handle);need(h.store===store);live(h);const published=publishedExpected(h,t,publications),admission=await contextLineageAdmission(store,t,h.admission.epoch);
 need(admission.gate===h.admission.gate&&(!h.selected.length||h.captured&&!h.items.length||admission.authority===published.authority));
 const entries=new Set(),structures=[],selected=h.captured?h.items.map(x=>x.original):h.selected;for(const topicId of new Set(selected.flatMap(m=>m.maintenance.provenance.evidence.map(e=>e.topicId)))){
  let current;try{current=await topicClosure(h,t,topicId);}catch(error){live(h);if(h.captured||!['UNAVAILABLE','STALE_BASE'].includes(error?.code))throw error;continue;}
  const before=h.snapshot?.closures.find(x=>x.topicId===topicId);if(before)need(closureEqual(current,expectedClosure(before,published.writes)));for(const row of current.entries)entries.add(row.id);
 }
 for(const m of [...h.scope.structuralTopics,...h.scope.structuralSections])structures.push({store:m.kind==='topic'?'topics':'sections',recordId:m.recordId,selectedFields:[m.kind==='topic'?'name':'title']});
 live(h);return {entryIds:[...entries].sort(),structures};
}


// Prove the complete graph the ORIGINAL lineage owner will read is already
// inside this child. No sibling Input body is acquired or hashed to discover
// eligibility. Whole mirrors have precisely the selected Input's body; other
// Entry prose requires its own authored/bound/Entry-field selection.
async function topicClosure(h,t,topicId){
 const topic=await t.get('topics',topicId);need(topic&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo&&!topic.layoutJobId&&!topic.identity?.noRecreation);
 const binding=await new ContextTopicAccessService(h.store).prospective(t,topic,h.admission.epoch);need(binding);
 const placements=await t.all('placements','byTopicOrder',prefix([topicId,topic.activeLayoutGeneration,0]));need(placements.length<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');
 const entries=[],dependencies=[],provenance=[];
 for(const p of placements){
  need(p.lifecycle==='active'&&!p.excludedByUser);
  const e=await t.get('thoughts',p.entryId);need(e&&e.lifecycle==='active');
  const deps=await t.all('dependencies','byTarget',prefix(['entry',e.id]));
  const ids=new Set([...(e.inputRefs||[]).map(x=>x.inputBlockId),...deps.map(d=>d.inputId),...(e.bodyBinding==='input'?[e.workingInputId]:[])]);
  need([...ids].every(id=>h.scope.inputs.some(i=>i.inputId===id)),'UNAVAILABLE');
  need(deps.every(d=>d.selectedFields?.every(f=>h.scope.inputs.find(i=>i.inputId===d.inputId)?.selectedFields.includes(f))),'UNAVAILABLE');
  if(e.bodyBinding!=='input')need(h.scope.authoredEntries.some(x=>x.entryId===e.id)||h.scope.entries.some(x=>x.entryId===e.id&&x.revision===e.revision&&x.selectedFields.includes('body')),'UNAVAILABLE');
  entries.push(values(e,['id','revision','lifecycle','freshness','staleReasons','bodyBinding','workingInputId','bindingRevision','bindingLength','sourceRecordIds','inputRefs','provenanceType','integrity']));dependencies.push(...deps);
  provenance.push(...await t.all('provenance','byOwner',prefix(['entry',e.id])));
 }
 return {topicId,binding,placements,entries,dependencies,provenance};
}
async function negativeRows(t){const rows=[];await t.scanPrimary('meta','memory:',r=>{if(['config','topic','section','entry','input'].includes(r.kind))rows.push(copy(r));});return rows;}
// Current Input qualification cannot authorize legacy Source annotations or
// conversation titles. Freeze only the original text actually used by lineage;
// exact identity/removal facts stay in the separate original indexed rows.
const sourceMaterial=row=>row?{id:row.id,value:{originalText:row.value?.originalText}}:row;
async function sourceSnapshot(h,t,inputIds){
 const inputs=[],sources=new Map();let retainedBytes=0;const retain=value=>{retainedBytes+=bytes(value);need(retainedBytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'BUDGET_EXCEEDED');return value;};const memory=new MemoryService(h.store),filter=await t.get('meta','smart-filter');
 for(const inputId of inputIds){
  const p=await inputProjection(h.store,t,inputId),grant=h.scope.inputs.find(x=>x.inputId===inputId);need(p&&grant&&!await h.store.isFiltered(t,p.block,filter)&&await memory.safeSources(t,p.sourceRecordIds));
  const fields=Object.fromEntries(grant.selectedFields.map(f=>[f,p[f]]));need(Object.values(fields).every(x=>typeof x==='string'));
  inputs.push(retain({inputId,contentRevision:p.contentRevision,lastRemovalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.identities,fields,state:await t.get('inputStates',inputId),index:await t.get('blockIndex',inputId)}));
  for(const id of p.sourceRecordIds)if(!sources.has(id)){need(sources.size<CONTEXT_LINEAGE_LIMITS.sources,'BUDGET_EXCEEDED');sources.set(id,retain({id,index:await t.get('recordIndex',id),record:sourceMaterial(await t.get('records',id))}));}
 }
 return {inputs,sources:[...sources.values()],filter,restrictions:await negativeRows(t)};
}
function selectedStructure(h,material,old){
 const key=old.kind==='topic'?'structuralTopics':'structuralSections';
 const m=material[key]?.find(x=>x.topicId===old.topicId&&(old.kind==='topic'||x.sectionId===old.sectionId));need(m);
 const {name,title,fieldDigests,...mapping}=m;const proof=structuralContextEvidence(mapping,fieldDigests);
 need(equal(Object.fromEntries(Object.entries(mapping).filter(([k])=>k!=='sourceRecordIds')),h.scope[key].find(x=>x.topicId===old.topicId&&(old.kind==='topic'||x.sectionId===old.sectionId))));return proof;
}
async function evidenceFor(h,t,m,material,closures,inputHashes,sources){
 const old=[m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence),result=new Map();
 for(const e of old){
  const binding=closures.get(e.topicId).binding;
  // Exact identity/removal history cannot be replaced by a same-name Topic or
  // an ambient surviving association. Selected structural interpretation has
  // its own current mapping, but does not forgive a Topic resurrection.
  need(binding.topicId===e.expectedTopicBinding.topicId&&binding.epoch===e.expectedTopicBinding.epoch&&binding.createdAt===e.expectedTopicBinding.createdAt&&binding.removalOperationId===e.expectedTopicBinding.removalOperationId);
  let next;
  if(entryEvidence(e)){
   const bound=e.kind==='boundEntry',mapping=bound?await readBoundEntryContext(h.store,t,e.entryId,null,e.topicId):await readAuthoredEntryContext(h.store,t,e.entryId),sent=material[bound?'boundEntries':'authoredEntries']?.find(x=>x.entryId===e.entryId&&x.topicId===e.topicId);
   need(mapping&&sent&&mapping.entryCreatedAt===e.entryCreatedAt&&mapping.birthOperationId===e.birthOperationId);
   const fields=bound?boundSelectedText(await t.get('thoughts',e.entryId),mapping.selectedFields):authoredSelectedText(await t.get('thoughts',e.entryId),authoredSelectedFields(mapping));
   need(equal(fields,sent.fields||{body:sent.body}));
   const granted=h.scope[bound?'boundEntries':'authoredEntries'].find(x=>x.entryId===e.entryId&&x.topicId===e.topicId);
   need(equal({...mapping,selectedFields:bound?mapping.selectedFields:authoredSelectedFields(mapping)},{...granted,selectedFields:bound?granted.selectedFields:authoredSelectedFields(granted)}));
   h.entrySnapshots.set(evidenceId(e),{mapping:copy(mapping),fields:copy(fields),bound});
   const digests=sent.fieldDigests||{body:sent.bodyDigest};next=(bound?boundContextEvidence:authoredContextEvidence)(mapping,binding,digests);
   need(e.selectedFields.every(f=>next.selectedFields.includes(f))&&scoped(next,h.scope));
  }else{
   const p=sources.inputs.find(x=>x.inputId===e.inputId),sent=material.inputs?.find(x=>(x.id||x.inputId)===e.inputId);need(p&&sent&&p.contentRevision===sent.revision&&equal(p.sourceRecordIds,e.sourceRecordIds)&&equal(p.sourceIdentityTokens,e.sourceIdentityTokens)&&p.lastRemovalSequence===e.expectedRemovalSequence);
   need(e.selectedFields.every(f=>p.fields[f]===(sent.fields?sent.fields[f]:f==='body'?sent.body:undefined)));
   next={topicId:e.topicId,inputId:e.inputId,selectedFields:[...e.selectedFields],fieldDigests:Object.fromEntries(e.selectedFields.map(f=>[f,inputHashes.get(e.inputId)[f]])),expectedTopicBinding:copy(binding),expectedRemovalSequence:p.lastRemovalSequence,...(structure(e)?{[structuralContextProperty(structure(e))]:selectedStructure(h,material,structure(e))}:{})};
  }
  const key=contextEvidenceKey(next),prior=result.get(key);need(!prior||equal(prior,next),'UNAVAILABLE');result.set(key,next);
 }
 need(validContextEvidenceSpecs([...result.values()]));return [...result.values()];
}
function semanticItem(item,index){return {itemRef:'c'+index,itemId:item.id,revision:item.revision,card:item.card,origin:item.origin,protected:item.protected,userEdited:item.userEdited,lifecycle:item.lifecycle,body:item.body,section:item.section,...contextTemporalProjection(item)};}
export async function captureMaintenanceExistingContext(store,handle,{read:reader,signal=null,assertProcessing,scope,material,limits=store.organizerBudget?.limits,publications=[],settledItems=[],qualification=null,recoveryWork=null}={}){
 const h=state(handle);need(h.store===store&&typeof reader==='function'&&typeof assertProcessing==='function'&&(signal===null||signal instanceof AbortSignal),'UNAVAILABLE');
 need(equal(selectedScope(scope),h.scope)&&equal(scope.existingContextItems||[],maintenanceExistingContextScope(handle)),'UNAVAILABLE');
 if(h.captured){live(h);await reader(t=>assertMaintenanceExistingContext(store,t,handle,{publications,settledItems}));return handle;}
 need(!h.read&&list(settledItems,0),'UNAVAILABLE');h.read=reader;h.signal=signal;h.assertProcessing=assertProcessing;h.budget=qualification?forkContextScopeWorkBudget(maintenanceQualificationWorkBudget(qualification,store),{database:h.database,signal,qualification,isCurrent:()=>{live(h);return true;}}):h.budget;h.budget.signal=signal;h.limits=limits;
 if(signal){const abort=()=>releaseMaintenanceExistingContext(handle);signal.addEventListener('abort',abort,{once:true});h.removeAbort=()=>signal.removeEventListener('abort',abort);}
 try{
  need(limits&&['maxContentBytes','maxRequestBytes'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>=0),'UNAVAILABLE');
  live(h);const effective=await read(h,async t=>{await assertMaintenanceExistingContext(store,t,handle,{publications});return publishedExpected(h,t,publications);});
  if(!h.selected.length||Math.min(limits.maxContentBytes,limits.maxRequestBytes)<2){h.captured=true;return handle;}
  const closures=new Map(),possible=[];
  // A failed complete-scope guard is a truthful omission; never attempt the
  // original body reader to discover an ungranted sibling's contents.
  for(const m of h.selected){let allowed=true;for(const topicId of new Set([m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence.map(e=>e.topicId)))){
   if(!closures.has(topicId))try{closures.set(topicId,await read(h,t=>topicClosure(h,t,topicId)));}catch(error){live(h);if(!['UNAVAILABLE','STALE_BASE'].includes(error?.code))throw error;closures.set(topicId,null);}
   if(!closures.get(topicId))allowed=false;
  }if(allowed)possible.push(m);}
  if(!possible.length){h.captured=true;return handle;}
  for(const topicId of new Set(possible.flatMap(m=>[m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence.map(e=>e.topicId))))){
   const evidence=possible.flatMap(m=>[m.maintenance.provenance,m.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence)).filter(e=>e.topicId===topicId),preflight=await readContextProcessingPreflight(store,{topicId,inputIds:[...new Set(evidence.filter(e=>!entryEvidence(e)).map(e=>e.inputId))],...(evidence.some(e=>e.kind==='humanEntry')?{entryIds:[...new Set(evidence.filter(e=>e.kind==='humanEntry').map(e=>e.entryId))]}:{}),expectedAuthority:effective.authority},h.budget,recoveryWork);live(h);need(preflight.available&&sameContextTopicBinding(preflight.binding,closures.get(topicId).binding));
  }
  // A lawful own Topic publication can introduce another already-selected
  // Input into this graph. Freeze its original granted fields/Source now, not
  // by refreshing after the write; evidence below remains the true old subset.
  const ids=h.scope.inputs.map(x=>x.inputId).sort();
  const sources=await read(h,t=>sourceSnapshot(h,t,ids)),hashes=new Map();
  for(const p of sources.inputs){const digests={};for(const [field,text]of Object.entries(p.fields)){charge(h,text);digests[field]=await hashText(text);live(h);}hashes.set(p.inputId,digests);}
  const collected=await read(h,async t=>{const row=await t.get('meta',CONTEXT_CARDS_ROW),items=[],evidence=new Map();let contentBytes=2;
   for(const m of possible){const item=row?.items?.find(x=>x.id===m.id);need(item&&equal(metadata(item),m));
    const specs=await evidenceFor(h,t,m,material,closures,hashes,sources);
    for(const spec of specs.filter(e=>structure(e))){const key=JSON.stringify(structure(spec));if(!h.structureSnapshots.has(key)){const current=await readStructuralContextEvidence(store,t,structure(spec));need(current);h.structureSnapshots.set(key,{spec:copy(structure(spec)),snapshot:copy(current)});}}
    if(specs.some(e=>evidence.has(contextEvidenceKey(e))&&!equal(evidence.get(contextEvidenceKey(e)),e)))continue;
    // Only independently granted Item fields are accessed here.
    const body=own(item,'body'),section=own(item,'section');need(typeof body==='string'&&body.length<=CONTEXT_LIMITS.body&&typeof section==='string'&&section.length<=80);
    if(m.hasTemporal)need(validContextTemporal(own(item.maintenance,'temporal')));
    const original={...copy(m),body,section,maintenance:{...copy(m.maintenance),...(m.hasTemporal?{temporal:copy(item.maintenance.temporal)}:{})}};delete original.hasTemporal;
    const dto=semanticItem(original,items.length),size=bytes(dto)+(items.length?1:0);if(contentBytes+size>Math.min(limits.maxContentBytes,limits.maxRequestBytes))continue;
    contentBytes+=size;items.push({original,dto,evidence:specs});for(const e of specs)evidence.set(contextEvidenceKey(e),e);
   }
   return {items,evidence:[...evidence.values()]};
  });
  if(!collected.items.length){h.captured=true;return handle;}
  need(validContextEvidenceSpecs(collected.evidence));
  // Exactly one original lineage capture and its original request-wide work
  // budget, never a fresh allowance for every selected Item.
  const lineage=await captureContextEvidence(store,collected.evidence,{epoch:h.admission.epoch,expectedAuthority:effective.authority,signal,workBudget:h.budget,recoveryWork});h.lineage=lineage.captured;live(h);
  h.items=collected.items.map(item=>({...item,currentProvenance:{epoch:lineage.provenance.epoch,evidence:item.evidence.map(e=>copy(lineage.provenance.evidence.find(x=>evidenceId(x)===evidenceId(e))))}}));
  h.snapshot={sources,closures:[...closures.values()].filter(Boolean)};h.captured=true;
  await read(h,t=>assertMaintenanceExistingContext(store,t,handle,{publications}));return handle;
 }catch(error){releaseMaintenanceExistingContext(handle);throw error;}
}
export function maintenanceExistingContextPayload(handle){const h=state(handle);live(h);need(h.captured,'UNAVAILABLE');return h.items.map(x=>copy(x.dto));}
export function maintenanceExistingContextMetadata(handle){const h=state(handle);live(h);need(h.captured,'UNAVAILABLE');return h.items.map(x=>({...copy(x.dto),epoch:h.admission.epoch,associationIds:[...x.original.maintenance.associationIds],provenance:copy(x.original.maintenance.provenance),...(x.original.maintenance.invalidation?{invalidation:copy(x.original.maintenance.invalidation)}:{}),currentEvidence:copy(x.evidence),currentProvenance:copy(x.currentProvenance)}));}
// Only original-owner branded publications can advance the held root/graph.
// A received token is not a provider field, and no live graph is adopted here.
function publishedExpected(h,t,publications){
 need(list(publications,100));if(!h.selected.length||h.captured&&!h.items.length)return {authority:h.admission.authority,writes:[]};let authority=h.admission.authority;const writes=[],seen=new Set();
 for(const token of publications){need(token&&!seen.has(token));seen.add(token);let publication=null;
  for(const read of [topicPublicationOwner.readTopicFormationPublication,contextPublicationOwner.readContextMaintenancePublication]){
   if(typeof read!=='function')continue;
   publication=read(token,h.store,{transaction:t})||read(token,h.store);if(publication)break;
  }
  need(publication&&publication.beforeAuthority===authority&&Array.isArray(publication.writes));authority=publication.authority;writes.push(...publication.writes);
 }
 return {authority,writes};
}
function expectedClosure(before,writes){
 const expected=copy(before),rows=Object.fromEntries(['placements','thoughts','dependencies','provenance'].map(k=>[k,new Map((k==='thoughts'?before.entries:before[k]).map(row=>[row.id,copy(row)]))]));
 for(const write of writes){const map=rows[write.store];if(!map)continue;if(write.value===null)map.delete(write.id);else map.set(write.id,copy(write.value));}
 expected.placements=[...rows.placements.values()].filter(p=>p.topicId===before.topicId&&p.layoutGeneration===before.binding.layoutGeneration&&p.lifecycle==='active');
 const ids=new Set(expected.placements.map(p=>p.entryId));expected.entries=[...ids].map(id=>{const row=rows.thoughts.get(id);need(row);return row;});
 expected.dependencies=[...rows.dependencies.values()].filter(d=>d.targetKind==='entry'&&ids.has(d.targetId));expected.provenance=[...rows.provenance.values()].filter(p=>p.ownerKind==='entry'&&ids.has(p.ownerId));
 return expected;
}
const closureEqual=(a,b)=>equal({...a,...Object.fromEntries(['placements','entries','dependencies','provenance'].map(k=>[k,[...a[k]].sort((x,y)=>x.id.localeCompare(y.id))]))},{...b,...Object.fromEntries(['placements','entries','dependencies','provenance'].map(k=>[k,[...b[k]].sort((x,y)=>x.id.localeCompare(y.id))]))});
export async function assertMaintenanceExistingContext(store,t,handle,{settledItems=[],phase='prepared',publications=[]}={}){
 const h=state(handle);need(h.store===store&&['prepared','settlement'].includes(phase)&&list(settledItems,MAINTENANCE_EXISTING_CONTEXT_LIMITS.items));live(h);
 const published=publishedExpected(h,t,publications),admission=await contextLineageAdmission(store,t,h.admission.epoch);need(admission.gate===h.admission.gate&&((!h.selected.length||h.captured&&!h.items.length)||admission.authority===published.authority));
 const row=await t.get('meta',CONTEXT_CARDS_ROW),settled=new Map();for(const x of settledItems){need(x&&x.itemId===x.item?.id&&!settled.has(x.itemId)&&h.items.some(v=>v.original.id===x.itemId));settled.set(x.itemId,x.item);}
 if(!h.captured){need(!settled.size);for(const m of h.selected){const actual=row?.items?.find(x=>x.id===m.id);need(actual&&equal(metadata(actual),m));}live(h);return true;}
 for(const x of h.items){const actual=row?.items?.find(i=>i.id===x.original.id),expected=settled.get(x.original.id)||x.original;need(actual&&equal(actual,expected));need(equal(contextTemporalProjection(x.original),Object.hasOwn(x.dto,'temporal')?{temporal:x.dto.temporal,temporalStatus:x.dto.temporalStatus}:null));}
 if(h.snapshot){
  const current=await sourceSnapshot(h,contextScopeTransactionReader(store,t,h.budget),h.snapshot.sources.inputs.map(x=>x.inputId));need(equal(current,h.snapshot.sources));
  for(const before of h.snapshot.closures){const now=await topicClosure(h,contextScopeTransactionReader(store,t,h.budget),before.topicId);need(sameContextTopicBinding(before.binding,now.binding));
   need(closureEqual(expectedClosure(before,published.writes),now));
  }
  if(phase==='prepared'&&!publications.length)await fenceContextLineage(store,h.lineage,{transaction:t});
  for(const {mapping,fields,bound}of h.entrySnapshots.values()){const now=bound?await readBoundEntryContext(store,t,mapping.entryId,null,mapping.topicId):await readAuthoredEntryContext(store,t,mapping.entryId);need(equal(now,mapping));const currentFields=bound?boundSelectedText(await t.get('thoughts',mapping.entryId),mapping.selectedFields):authoredSelectedText(await t.get('thoughts',mapping.entryId),authoredSelectedFields(mapping));need(equal(currentFields,fields));}
  // Selected structural/Entry fields remain frozen even after a lawful own
  // Topic transaction advances unrelated global bookkeeping.
  for(const {spec,snapshot}of h.structureSnapshots.values()){const current=await readStructuralContextEvidence(store,t,spec);need(current&&equal(current,snapshot));}
 }
 live(h);return true;
}
export function releaseMaintenanceExistingContext(handle){const h=held.get(handle);if(!h)return;h.released=true;releaseContextLineage(h.lineage);h.items.length=0;h.selected.length=0;h.snapshot=null;h.scope=null;h.read=null;h.assertProcessing=null;h.lineage=null;h.entrySnapshots.clear();h.structureSnapshots.clear();h.removeAbort?.();h.removeAbort=null;held.delete(handle);}
