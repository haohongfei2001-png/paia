import {createMaintenanceHumanContextResponseMapper} from './maintenance-human-context-response.js';
import {decodeMaintenanceTopicWire} from './maintenance-topic-wire.js';
import {canonical,equal,exact,fail,unitKey,validateCoverage} from './contracts.js';
import {snapshot} from './qwen-request-data.js';
import {MAINTENANCE_SERVICE_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_HUMAN_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_UNAVAILABLE_TOPIC,validateMaintenanceServiceResponse} from './maintenance-service-response-schema.js';
import {hashText} from '../dedupe.js';
import {inputProjection} from '../thought-evidence.js';
import {prefix} from '../thought-model.js';
import {readContextTopicScope,createContextScopeWorkBudget} from '../context-topic-scope.js';
import {createContextFreshInputPolicy,hasContextInputLineage,validateContextMaintenanceChange} from '../context-maintenance.js';
import {readContextCards} from '../context-cards.js';
import {readMaintenanceExistingContext,resolveMaintenanceExistingContext,assertMaintenanceExistingContext,assertMaintenanceExistingContextEmptyPlan} from './maintenance-existing-context.js';
import {validContextTemporal} from '../context-temporal.js';

// Bind the negative-only final-owner policy to this exact local adapter. No
// configuration boolean, model field or cloned JSON can disable or forge it.
const contextPolicies=new WeakMap(),existingBindings=new WeakMap(),emptyBindings=new WeakMap();
const existingProfile=schema=>[MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA].includes(schema),topicProfile=schema=>[MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA].includes(schema);
export const maintenanceResponseContextPolicy=adapter=>contextPolicies.get(adapter?.context)??null;
export function bindMaintenanceResponseExistingContext(adapter,childId,handle){const bindings=existingBindings.get(adapter?.context);if(!bindings)fail('UNAVAILABLE');bindings.set(childId,handle);}

// Only the new combined profile admits an authenticated original empty plan.
// This is negative-only ADD preparation; the final Context source policy remains
// mandatory. No model flag, cloned plan or existing-Item update is accepted.
export function bindMaintenanceResponseEmptyExistingContext(adapter,childId,handle){const owner=emptyBindings.get(adapter?.context);if(!owner||!owner.accepts())return false;assertMaintenanceExistingContextEmptyPlan(owner.store,handle);owner.bindings.set(childId,handle);return true;}
// A committed empty-plan child has no existing-Item transition witness. Only
// its exact private sent binding and already decoded ADD groups can admit a
// saved sibling response on continuation; absence of a witness is not proof.
export function maintenanceResponseEmptyExistingContextReadyForSibling(adapter,store,childId,handle){const owner=emptyBindings.get(adapter?.context);return !!owner&&owner.store===store&&owner.ready(childId,handle);}
const humanCoverage=units=>units.length>0&&units.every(u=>u.facet==='context'&&['library_entry','placement','section','topic'].includes(JSON.parse(u.key)[0]));
const ordinaryCoverage=units=>units.length>0&&units.every(u=>['topic','context'].includes(u.facet)&&JSON.parse(u.key)[0]==='input');


// Ephemeral interpretation of one original service cycle. It owns no store,
// consent, membership, domain ACK or financial writer. Each exact profile maps
// only its sent ordinary Input or independently qualified human Context units.
export function createMaintenanceServiceResponseOwner(store){
 if(!store?.repository||typeof store.uuid!=='function')fail('UNAVAILABLE');
 const children=new Map(),existing=new Map(),emptyExisting=new Map();let disposed=false,profileSchema=MAINTENANCE_SERVICE_RESPONSE_SCHEMA;
 const live=s=>{if(disposed||s.isCurrent()!==true)fail('STALE_BASE');};
 const read=(s,fn)=>{live(s);return store.repository.transaction(false,async t=>{live(s);const value=await fn(t);live(s);return value;});};
 const project=async(s,t,input)=>{
  const p=await inputProjection(store,t,input.inputId);live(s);
  if(!p||p.contentRevision!==input.revision||await store.isFiltered(t,p.block,await t.get('meta','smart-filter')))fail('STALE_BASE');
  live(s);return p;
 };
 const evidenceSnapshot=p=>({revision:p.contentRevision,removalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.identities});
 async function bind(payload,isCurrent,{read:originalRead=null,workBudget=null}={}){
  const p=snapshot(payload),material=p.material;
  if(disposed||typeof isCurrent!=='function'||children.has(p.childOperationId)||children.size>=2||p.type!=='AI_MAINTENANCE'||p.automaticRetries!==0)fail('UNAVAILABLE');
  if(profileSchema===MAINTENANCE_SERVICE_HUMAN_RESPONSE_SCHEMA||profileSchema===MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA&&humanCoverage(p.coverage)){
   const units=validateCoverage(p.coverage,'AI_MAINTENANCE');
   if(typeof originalRead!=='function'||!workBudget||!humanCoverage(units))fail('UNAVAILABLE');
   const s={schema:profileSchema,jobId:p.logicalJobId,childId:p.childOperationId,units,isCurrent,responseDigest:null,humanMapper:null,combined:profileSchema===MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA};
   live(s);s.humanMapper=createMaintenanceHumanContextResponseMapper(store,{material,coverage:units,read:originalRead,isCurrent:()=>{live(s);return true;},workBudget});
   live(s);children.set(s.childId,s);return;
  }
  exact(material,['version','purpose','inputs','identities','sections','constraints','filter','existingContextItems',...(topicProfile(profileSchema)?['entries']:[])],['version','purpose','inputs','identities','sections','constraints']);
  if(material.version!==1||material.purpose!=='AI_MAINTENANCE'||!Array.isArray(material.inputs)||!material.inputs.length||material.inputs.length>20)fail('UNAVAILABLE');
  const units=validateCoverage(p.coverage,'AI_MAINTENANCE'),ids=material.inputs.map(i=>i.inputId),filterUnits=units.filter(u=>u.facet==='filter'),ordinary=units.filter(u=>u.facet!=='filter');
  if(new Set(ids).size!==ids.length||ordinary.length!==ids.length*2||ordinary.some(u=>!['topic','context'].includes(u.facet)||!ids.some(id=>u.key===JSON.stringify(['input',id])))||ids.some(id=>!['topic','context'].every(facet=>units.some(u=>u.key===JSON.stringify(['input',id])&&u.facet===facet))))fail('UNAVAILABLE');
  if(filterUnits.length&&(profileSchema!==MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA||filterUnits.some(u=>!ids.some(id=>u.key===JSON.stringify(['input',id])))))fail('UNAVAILABLE');
  const filterIds=filterUnits.map(u=>JSON.parse(u.key)[1]).sort();
  if(material.filter!==undefined){
   exact(material.filter,['candidateIds','neighborIds']);
   if(!filterIds.length||filterIds.length>8||!equal(material.filter.candidateIds,filterIds)||!Array.isArray(material.filter.neighborIds)||!material.filter.neighborIds.length||material.filter.neighborIds.length>2||new Set(material.filter.neighborIds).size!==material.filter.neighborIds.length||material.filter.neighborIds.some(id=>!ids.includes(id)||filterIds.includes(id)))fail('UNAVAILABLE');
  }
  const existingHandle=existingProfile(profileSchema)?existing.get(p.childOperationId):null;
  const emptyHandle=profileSchema===MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA?emptyExisting.get(p.childOperationId):null;
  if(emptyHandle)assertMaintenanceExistingContextEmptyPlan(store,emptyHandle);
  if(existingProfile(profileSchema)&&!existingHandle&&!emptyHandle)fail('UNAVAILABLE');
  if(existingHandle?!equal(material.existingContextItems,readMaintenanceExistingContext(existingHandle)):emptyHandle?!equal(material.existingContextItems,[]):material.existingContextItems!==undefined)fail('UNAVAILABLE');
  const topicMaterial=topicProfile(profileSchema)?snapshot(Object.fromEntries(['version','purpose','inputs','entries','identities','sections','constraints'].map(key=>[key,material[key]??(key==='entries'?[]:undefined)]))):null;
  const s={topicMaterial,existingHandle,emptyHandle,combined:profileSchema===MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA,schema:profileSchema,filterIds,filterScope:material.filter??null,filterSnapshot:null,jobId:p.logicalJobId,childId:p.childOperationId,units,isCurrent,inputs:[],topicSnapshot:await hashText(canonical({identities:material.identities,sections:material.sections,constraints:material.constraints})),responseDigest:null,groups:null};
  for(const [index,input]of material.inputs.entries()){
   exact(input,['ref','inputId','revision','body']);if(input.ref!=='i'+index||typeof input.body!=='string')fail('UNAVAILABLE');
   live(s);const digest=await hashText(input.body),current=await read(s,t=>project(s,t,input));
   if(await hashText(current.body)!==digest)fail('STALE_BASE');live(s);
   s.inputs.push({inputId:input.inputId,revision:input.revision,digest,...evidenceSnapshot(current)});
  }
  if(filterIds.length)try{s.filterSnapshot=await read(s,t=>store.maintenanceFilterSnapshot(t,filterIds));}catch(error){live(s);if(!['STALE_BASE','UNAVAILABLE'].includes(error?.code))throw error;}
  live(s);children.set(s.childId,s);
 }
 async function response(raw,binding){
  exact(binding,['logicalJobId','childOperationId','operationReceiptId']);exact(raw,['accepted','operationReceiptId','value']);
  const s=children.get(binding.childOperationId);if(!s||s.jobId!==binding.logicalJobId||raw.accepted!==true||raw.operationReceiptId!==binding.operationReceiptId)fail('STALE_BASE');live(s);
  const value=validateMaintenanceServiceResponse(raw.value,s.schema);
  if(s.combined&&(s.humanMapper?value.context.length>0||!equal(value.topic,MAINTENANCE_SERVICE_UNAVAILABLE_TOPIC):value.humanContext.length>0||value.topic.kind==='unavailable'))fail('STALE_BASE');
  if(value.logicalJobId!==s.jobId||value.childOperationId!==s.childId)fail('STALE_BASE');
  const responseDigest=await hashText(canonical({value,receipt:binding.operationReceiptId}));live(s);
  if(s.responseDigest!==null&&s.responseDigest!==responseDigest)fail('STALE_BASE');s.responseDigest=responseDigest;return {s,value};
 }
 async function topic(raw,view,binding){
  const {s,value}=await response(raw,binding);
  if(s.humanMapper)fail('UNAVAILABLE');
  if(!equal(view.inputs.map(i=>i.id).sort(),s.inputs.map(i=>i.inputId).sort())||!s.topicMaterial&&view.entries.length||await hashText(canonical({identities:view.identities,sections:view.sections,constraints:view.constraints}))!==s.topicSnapshot)fail('STALE_BASE');
  for(const input of s.inputs){const v=view.inputs.find(i=>i.id===input.inputId);if(v.revision!==input.revision||v.role!=='primary'||!equal(Object.keys(v.fields),['body'])||await hashText(v.fields.body)!==input.digest)fail('STALE_BASE');live(s);}
  if(s.topicMaterial)return {binding:{...binding},value:decodeMaintenanceTopicWire(value.topic,s.topicMaterial,view)};
  // Citation grammar, evidence sufficiency and creation/reuse remain entirely
  // with TopicFormationService. Empty service names map to its original null.
  const map=value=>Array.isArray(value)?value.map(map):value&&typeof value==='object'?{...Object.fromEntries(Object.entries(value).map(([k,v])=>[k,map(v)])),...(Object.hasOwn(value,'inputId')&&Object.hasOwn(value,'start')?{field:'body'}:{})}:value;
  return {binding:{...binding},value:{...map(value.topic),name:value.topic.name||null}};
 }
 async function context(raw,metadata,binding){
  const {s,value}=await response(raw,binding),units=s.units.filter(u=>u.facet==='context');
  if(s.humanMapper)return {binding:{...binding},value:await s.humanMapper.decode(s.combined?value.humanContext:value.context,metadata)};
  exact(metadata,['units','inputIds']);
  if(!equal(validateCoverage(metadata.units,'AI_MAINTENANCE'),units)||!equal([...metadata.inputIds].sort(),s.inputs.map(i=>i.inputId).sort()))fail('STALE_BASE');
  const covered=value.context.flatMap(g=>g.inputIds);
  if(!equal([...covered].sort(),s.inputs.map(i=>i.inputId).sort()))fail('STALE_BASE');
  if(s.groups)return {binding:{...binding},value:structuredClone(s.groups)};
  const job=await read(s,t=>t.get('organizerJobs',s.jobId));
  if(!job||!s.units.filter(u=>u.facet==='topic').every(u=>job.committedCoverage.includes(unitKey(u))))fail('STALE_BASE');
  const scopeBudget=createContextScopeWorkBudget({database:store.repository.db}),scopes=new Map(),evidence=new Map();
  for(const input of s.inputs){
   const selected=await read(s,async t=>{
    const p=await project(s,t,input);if(!equal(evidenceSnapshot(p),{revision:input.revision,removalSequence:input.removalSequence,sourceRecordIds:input.sourceRecordIds,sourceIdentityTokens:input.sourceIdentityTokens}))fail('STALE_BASE');
    const dependencies=await t.all('dependencies','byInputTarget',prefix([input.inputId,'entry']),101);if(dependencies.length>100)fail('BUDGET_EXCEEDED');
    const topics=new Set();let count=0;
    for(const d of dependencies){
     if(d.status!=='valid'||!d.selectedFields?.includes('body')||!d.roles?.includes('primary'))continue;
     const entry=await t.get('thoughts',d.targetId);
     if(!entry||entry.lifecycle!=='active'||entry.bodyBinding!=='input'||entry.workingInputId!==input.inputId||entry.inputRefs?.length!==1||entry.provenanceType!=='input_original'||entry.integrity!=='complete')continue;
     const placements=await t.all('placements','byEntry',prefix([entry.id]),101);count+=placements.length;if(count>100)fail('BUDGET_EXCEEDED');
     for(const placement of placements){
      const target=await t.get('topics',placement.topicId),section=target&&await t.get('sections',JSON.stringify([target.id,target.activeLayoutGeneration,placement.sectionId]));
      if(placement.lifecycle==='active'&&!placement.excludedByUser&&target?.lifecycle==='active'&&!target.redirectTo&&!target.layoutJobId&&target.activeLayoutGeneration===placement.layoutGeneration&&section?.lifecycle==='active'&&!section.redirectTo)topics.add(target.id);
     }
    }
    if(topics.size!==1)fail('STALE_BASE');return {p,topicId:[...topics][0]};
   });
   if(await hashText(selected.p.body)!==input.digest)fail('STALE_BASE');live(s);
   if(!scopes.has(selected.topicId)){
    if(scopes.size>=8)fail('BUDGET_EXCEEDED');const scope=await readContextTopicScope(store,{topicId:selected.topicId},scopeBudget);live(s);if(!scope.available)fail('STALE_BASE');scopes.set(selected.topicId,scope);
   }
   const scope=scopes.get(selected.topicId);if(!scope.scope.inputIds.includes(input.inputId))fail('STALE_BASE');
   evidence.set(input.inputId,{topicId:selected.topicId,inputId:input.inputId,selectedFields:['body'],fieldDigests:{body:input.digest},expectedTopicBinding:scope.binding,expectedRemovalSequence:input.removalSequence});
  }
  // No Item content is sent or retained. Unresolved existing Item lineage is a local
  // negative-only guard before allocating a fresh identity; the original
  // Context owner repeats it in its final transaction, including cached retry.
  if(s.existingHandle)await read(s,t=>assertMaintenanceExistingContext(store,t,s.existingHandle));
  else if(await read(s,async t=>hasContextInputLineage(await readContextCards(t),[...evidence.values()])))fail('STALE_BASE');
  const groups=value.context.map(proposal=>{
   const selected=proposal.inputIds.map(id=>evidence.get(id)),groupUnits=units.filter(u=>proposal.inputIds.some(id=>u.key===JSON.stringify(['input',id])));
   if(!s.existingHandle){
    let temporal=null;
    if(s.emptyHandle){assertMaintenanceExistingContextEmptyPlan(store,s.emptyHandle);if(proposal.operation!=='ADD'||proposal.ref!==''||proposal.expectedRevision!==0)fail('STALE_BASE');temporal=proposal.temporal.length?Object.fromEntries(Object.entries(proposal.temporal[0]).map(([k,v])=>[k,v||null])):null;if(temporal&&!validContextTemporal(temporal)||proposal.card==='now'&&!temporal?.temporalScope)fail('STALE_BASE');}
    const change={operationId:store.uuid(),epoch:selected[0].expectedTopicBinding.epoch,itemId:store.uuid(),card:proposal.card,expectedRevision:0,body:proposal.body,section:proposal.section,associationIds:[store.uuid()],evidence:selected,...(temporal?{temporal}:{})};validateContextMaintenanceChange(change);return {operation:'ADD',units:groupUnits,change};
   }
   const records=readMaintenanceExistingContext(s.existingHandle),operation=proposal.operation;
   let item;
   if(operation==='ADD'){
    if(proposal.ref!==''||proposal.expectedRevision!==0||records.some(r=>r.inputIds.some(id=>proposal.inputIds.includes(id))))fail('STALE_BASE');
   }else{
    item=resolveMaintenanceExistingContext(s.existingHandle,proposal.ref);
    if(item.state!=='available'||item.revision!==proposal.expectedRevision||item.card!==proposal.card)fail('STALE_BASE');
    const old=[item.provenance,item.invalidation].filter(Boolean).flatMap(p=>p.evidence),ids=[...new Set(old.map(e=>e.inputId))].sort();
    if(!equal(ids,[...proposal.inputIds].sort())||old.some(e=>e.kind||e.humanSection||e.humanTopic||!equal(e.selectedFields,['body'])||!selected.some(live=>live.inputId===e.inputId&&live.topicId===e.topicId)))fail('STALE_BASE');
    // Original registered claims sharing an Input remain separate identities.
    // Unknown negative lineage cannot authorize ADD or rewrite another Item.
   }
   const common={operationId:store.uuid(),epoch:selected[0].expectedTopicBinding.epoch,itemId:item?.itemId??store.uuid(),card:proposal.card,expectedRevision:item?.revision??0,associationIds:item?.associationIds??[store.uuid()],evidence:selected};
   if(operation==='NO_CHANGE'||operation==='REMOVE_CANDIDATE'){
    if(proposal.body!==''||proposal.section!==''||proposal.temporal.length)fail('STALE_BASE');
    return {operation,units:groupUnits,change:{operation,...common}};
   }
   const temporal=proposal.temporal.length?Object.fromEntries(Object.entries(proposal.temporal[0]).map(([key,value])=>[key,value||null])):null;
   if(temporal&&!validContextTemporal(temporal)||proposal.card==='now'&&(!temporal||!temporal.temporalScope))fail('STALE_BASE');
   const change={...common,body:proposal.body,section:proposal.section,...(temporal?{temporal}:{})};validateContextMaintenanceChange(change);return {operation,units:groupUnits,change};
  });
  live(s);s.groups=groups;return {binding:{...binding},value:structuredClone(groups)};
 }
 async function filter(raw,metadata,binding){
  const {s,value}=await response(raw,binding),units=s.units.filter(u=>u.facet==='filter');
  exact(metadata,['units','inputIds','snapshot']);
  if(!s.filterSnapshot||!units.length||!equal(validateCoverage(metadata.units,'AI_MAINTENANCE'),units)||!equal([...metadata.inputIds].sort(),s.filterIds)||!equal(metadata.snapshot,s.filterSnapshot))fail('STALE_BASE');
  if(!Array.isArray(value.filter)||!equal(value.filter.map(d=>d.inputId).sort(),s.filterIds)||!s.filterScope&&value.filter.some(d=>d.decision==='FILTER'))fail('STALE_BASE');
  // Original Filter owner owns current permission/proof and the final write.
  // This only interprets this exact paid child, without allocating an operation.
  live(s);return {binding:{...binding},value:structuredClone(value.filter)};
 }
 const adapter=Object.freeze({topic,context,filter});contextPolicies.set(context,createContextFreshInputPolicy());existingBindings.set(context,existing);emptyBindings.set(context,{store,bindings:emptyExisting,accepts:()=>!disposed&&profileSchema===MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA,ready(childId,handle){
  const s=children.get(childId);
  if(disposed||!s||s.schema!==MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA||!handle||s.emptyHandle!==handle||emptyExisting.get(childId)!==handle||s.existingHandle||!s.responseDigest||!s.groups?.length||s.groups.some(g=>g.operation!=='ADD'))return false;
  assertMaintenanceExistingContextEmptyPlan(store,handle);live(s);return true;
 }});
 return Object.freeze({adapter,bind,
  assertProfile(manifest){const schema=manifest?.wire?.responseFormat?.json_schema?.schema;profileSchema=[MAINTENANCE_SERVICE_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_EXISTING_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_HUMAN_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA].find(s=>equal(schema,s));if(!profileSchema)fail('UNAVAILABLE');},
  usesExistingContext(metadata){return existingProfile(profileSchema)&&(profileSchema!==MAINTENANCE_SERVICE_COMBINED_RESPONSE_SCHEMA||metadata===undefined||ordinaryCoverage(metadata.coverage));},
  discard(childId){children.get(childId)?.humanMapper?.dispose();children.delete(childId);existing.delete(childId);emptyExisting.delete(childId);},
  release(jobId){for(const [id,s]of children)if(s.jobId===jobId){s.humanMapper?.dispose();children.delete(id);existing.delete(id);emptyExisting.delete(id);}},
  dispose(){disposed=true;for(const s of children.values())s.humanMapper?.dispose();children.clear();existing.clear();emptyExisting.clear();}
 });
}
