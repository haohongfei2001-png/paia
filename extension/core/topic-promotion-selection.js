import {fail,prefix,same,keys,idOK} from './thought-model.js';
import {hashText} from './dedupe.js';
import {publicTopicAuthority} from './topic-processing.js';
import {readFormationEvidence,formationEntryDescriptor,readableFormationSection,validateFormationSources} from './topic-formation-evidence.js';
import {promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';

export const PROMOTION_PAGE_SIZE=100;
const unique=xs=>[...new Set(xs)];
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};

// A complete, read-only selection manifest. Sources/Inputs are authorized in
// bounded scopes and pages are read at their current generation. The full
// manifest is body-free; complete reading evidence is transient and is never
// persisted with staged work. A whole Section is never silently truncated.
export class PromotionSelection {
 constructor(service){this.service=service;this.store=service.store;}
 async collect(request,initial){
  const svc=this.service,scope=request.scope;
  if(!Array.isArray(scope)||!scope.length||new Set(scope.map(s=>s.inputId)).size!==scope.length)fail();
  const byInput=new Map();for(const spec of scope){keys(spec,['inputId','role','selectedFields'],['inputId','role','selectedFields']);if(!idOK(spec.inputId))fail();byInput.set(spec.inputId,spec);}
  const guards=[];
  const prepare=async specs=>{const p=await svc.retrieval.guard.prepare(specs);if(!same(publicTopicAuthority(p.authority),publicTopicAuthority(initial.authority)))fail();guards.push(p);return p;};
  for(let offset=0;offset<scope.length;offset+=PROMOTION_PAGE_SIZE)await prepare(scope.slice(offset,offset+PROMOTION_PAGE_SIZE));
  const base=await svc.read(initial,async t=>{
   await svc.authorize(t,initial,[request.topicId]);const topic=await t.get('topics',request.topicId);
   if(!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId)fail();
   const raw=await t.get('sections',promotionSectionId(topic.id,topic.activeLayoutGeneration,request.sectionId));if(!raw||raw.lifecycle!=='active'||raw.redirectTo)fail();
   const section=await readableFormationSection(this.store,t,raw);if(section.sourceUnavailable)fail();return {topic,section};
  });
  const evidenceByInput=new Map(guards.flatMap(g=>g.evidence).map(e=>[e.inputId,e]));
  const placements=[],organizations=[],entryScopes=[],authoredIds=new Set();let cursor=null;
  const authoredGuard={evidence:[],authority:initial.authority};
  const authoredEntry=async(t,id)=>{await svc.retrieval.guard.check(t,authoredGuard);await svc.authorize(t,authoredGuard,[request.topicId]);const row=await this.store.readableEntry(t,id);if(row.lifecycle!=='active'||row.origin!=='user'||row.provenanceType!=='user_created'||row.bodyBinding!=='thought'||row.sourceRecordIds?.length||row.inputRefs?.length||typeof row.thoughtText!=='string'||!row.thoughtText.trim()||await t.count('dependencies','byTarget',prefix(['entry',id]))||await t.count('provenance','byOwner',prefix(['entry',id])))fail();return row;};
  const add=async(t,placement)=>{
   if(!placement||placement.lifecycle!=='active'||placement.sectionId!==base.section.sectionId)fail();
   const dependencies=await t.all('dependencies','byTarget',prefix(['entry',placement.entryId]),PROMOTION_PAGE_SIZE+1);
   if(dependencies.length>PROMOTION_PAGE_SIZE)fail();
   if(!dependencies.length){const row=await authoredEntry(t,placement.entryId);authoredIds.add(row.id);placements.push(placement);organizations.push({entryId:row.id,...promotionOrganization(row)});entryScopes.push({id:row.id,scope:[]});return;}
   const specs=[];for(const dependency of dependencies){const spec=byInput.get(dependency.inputId);if(!spec||dependency.status!=='valid'||!Array.isArray(dependency.selectedFields)||dependency.selectedFields.some(field=>!spec.selectedFields.includes(field)))fail();if(!specs.some(s=>s.inputId===spec.inputId))specs.push(spec);}
   const prepared={...initial,evidence:specs.map(s=>evidenceByInput.get(s.inputId))};await svc.retrieval.guard.check(t,prepared);await svc.authorize(t,prepared,[request.topicId]);
   const row=await this.store.readableEntry(t,placement.entryId);if(row.lifecycle!=='active')fail();
   placements.push(placement);organizations.push({entryId:row.id,...promotionOrganization(row)});entryScopes.push({id:row.id,scope:specs});
  };
  if(request.selection==='whole_section'){
   do{const page=await svc.read(initial,async t=>{await svc.authorize(t,initial,[request.topicId]);const page=await t.rangePage('placements','bySectionOrder',prefix([base.topic.id,base.topic.activeLayoutGeneration,base.section.sectionId,0]),cursor,PROMOTION_PAGE_SIZE);for(const {value}of page.rows)await add(t,value);return page;});cursor=page.next;}while(cursor);
  }else for(let offset=0;offset<request.entryIds.length;offset+=PROMOTION_PAGE_SIZE)await svc.read(initial,async t=>{await svc.authorize(t,initial,[request.topicId]);for(const id of request.entryIds.slice(offset,offset+PROMOTION_PAGE_SIZE))await add(t,await t.get('placements',promotionPlacementId(base.topic.id,base.topic.activeLayoutGeneration,id)));});
  if(!placements.length)fail();if(authoredIds.size)guards.push(authoredGuard);placements.sort((a,b)=>a.rank<b.rank?-1:a.rank>b.rank?1:a.entryId<b.entryId?-1:a.entryId>b.entryId?1:0);
  const scopeByEntry=new Map(entryScopes.map(e=>[e.id,e.scope])),grouped=[];let group={entryIds:[],scope:[]};
  for(const placement of placements){const needed=scopeByEntry.get(placement.entryId),newInputs=needed.filter(s=>!group.scope.some(x=>x.inputId===s.inputId));if(group.entryIds.length===PROMOTION_PAGE_SIZE||group.scope.length+newInputs.length>PROMOTION_PAGE_SIZE){grouped.push(group);group={entryIds:[],scope:[]};}group.entryIds.push(placement.entryId);for(const s of needed)if(!group.scope.some(x=>x.inputId===s.inputId))group.scope.push(s);}if(group.entryIds.length)grouped.push(group);
  const pages=[],manifestPages=[];
  const pending=[...grouped];
  while(pending.length){const group=pending.shift(),index=pages.length;
   const prepared=group.scope.length?await prepare(group.scope):authoredGuard,read=await svc.read(prepared,async t=>{await svc.authorize(t,prepared,[request.topicId]);const backed=group.entryIds.filter(id=>!authoredIds.has(id)),evidence=backed.length?await readFormationEvidence(this.store,t,prepared,backed):{inputs:[],sources:[],entries:[]},authored=[];for(const id of group.entryIds.filter(id=>authoredIds.has(id))){const row=await authoredEntry(t,id);authored.push({id:row.id,body:row.thoughtText,bodyBinding:row.bodyBinding,revision:row.revision,contentRevision:row.contentRevision,organizationRevision:row.organizationRevision,evidenceKind:'independent_user_entry',sourceRecordIds:[],dependencies:[],references:[]});}return {evidence,authored};}),{evidence,authored}=read;await validateFormationSources(evidence);
   const limits=this.store.organizerBudget?.limits,view={inputs:evidence.inputs.map(({sourceIds,...input})=>input),entries:[...evidence.entries.map(e=>formationEntryDescriptor(e,evidence.inputs)),...authored]};
   if(limits&&(new TextEncoder().encode(JSON.stringify(view.inputs)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(view)).length>limits.maxRequestBytes)){
    if(group.entryIds.length===1)fail();const middle=Math.ceil(group.entryIds.length/2),parts=[group.entryIds.slice(0,middle),group.entryIds.slice(middle)].map(entryIds=>({entryIds,scope:[...new Map(entryIds.flatMap(id=>scopeByEntry.get(id)).map(s=>[s.inputId,s])).values()]}));pending.unshift(...parts);continue;
   }
   const evidenceDigest=await hashText(JSON.stringify({evidence,authored}));
   pages.push({index,evidence,authored});manifestPages.push({index,entryIds:group.entryIds,scope:group.scope,evidenceDigest});
  }
  const manifest={version:1,selection:request.selection,topicId:base.topic.id,sectionId:base.section.sectionId,generation:base.topic.activeLayoutGeneration,count:placements.length,entryIds:placements.map(p=>p.entryId),pages:manifestPages};
  const manifestDigest=await hashText(JSON.stringify(manifest));
  const sourceRecordIds=unique([...guards.flatMap(g=>g.evidence.flatMap(e=>e.sourceRecordIds)),...(base.topic.sourceRecordIds||[]),...(base.section.sourceRecordIds||[]),...pages.flatMap(p=>p.evidence.entries.flatMap(e=>e.sourceRecordIds))]);
  const anchor=pages.find(p=>p.evidence.entries.length);if(!anchor)fail();
  const snapshot={...base,evidence:anchor.evidence,placements,organizations,selection:{manifest,manifestDigest,sourceRecordIds}};
  await svc.read(initial,t=>this.check(t,{snapshot,guards},[]));return {snapshot,guards,pages};
 }
 async check(t,{snapshot,guards},identityIds){
  const svc=this.service;for(const guard of guards){await svc.retrieval.guard.check(t,guard);await svc.authorize(t,guard,unique([snapshot.topic.id,...identityIds]));}
  const topic=await t.get('topics',snapshot.topic.id),section=await t.get('sections',snapshot.section.id);
  if(!same(topic,snapshot.topic)||!same(section,snapshot.section))fail();
  if(snapshot.selection.manifest.selection==='whole_section'&&await t.count('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,section.sectionId,0]))!==snapshot.placements.length)fail();
  const organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));for(const p of snapshot.placements){if(!same(p,await t.get('placements',p.id)))fail();const e=await t.get('thoughts',p.entryId);if(!e||!same(organizations.get(p.entryId),{entryId:p.entryId,...promotionOrganization(e)}))fail();}
 }
 reader(state,signal,identityIds){
  const seen=new Set(),svc=this.service;
  return {seen,api:Object.freeze({pageCount:state.pages.length,readPage:async index=>{
   if(signal?.aborted||!Number.isSafeInteger(index)||index<0||index>=state.pages.length)fail();
   await svc.read(state.guards[0],t=>this.check(t,state,identityIds));const p=state.pages[index],inputs=p.evidence.inputs.map(({sourceIds,...input})=>input),entries=[...p.evidence.entries.map(e=>formationEntryDescriptor(e,p.evidence.inputs)),...p.authored];seen.add(index);
   return freeze(structuredClone({index,inputs,entries,entryIds:state.snapshot.selection.manifest.pages[index].entryIds,manifestDigest:state.snapshot.selection.manifestDigest}));
  }})};
 }
 acknowledge(assessment,state,seen){
  const acknowledgement=assessment.selection;keys(acknowledgement,['kind','count','manifestDigest','necessary'],['kind','count','manifestDigest','necessary']);
  if(acknowledgement.kind!==state.snapshot.selection.manifest.selection||acknowledgement.count!==state.snapshot.placements.length||acknowledgement.manifestDigest!==state.snapshot.selection.manifestDigest||acknowledgement.necessary!=='all_selected_placements'||seen.size!==state.pages.length)fail();
  const {selection,...claims}=assessment;return claims;
 }
}
