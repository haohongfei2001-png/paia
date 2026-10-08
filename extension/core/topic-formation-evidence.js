import {fail,keys,idOK,prefix,same} from './thought-model.js';
import {inputProjection} from './thought-evidence.js';
import {hashText} from './dedupe.js';
import {bindingRead} from './thought-binding.js';
import {safeOrganization} from './organizer/metadata.js';

const token=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
// Work bounds, not recurrence or semantic-quality thresholds.
export const FORMATION_WORK_LIMITS=Object.freeze({inputs:100,entries:100,sourceRecords:1000,citations:100});
export function citationText(citation,inputs){
 keys(citation,['inputId','field','start','end'],['inputId','field','start','end']);
 const input=inputs.find(x=>x.id===citation.inputId),text=input?.fields?.[citation.field];
 if(!idOK(citation.inputId)||!['body','note'].includes(citation.field)||typeof text!=='string'||!Number.isSafeInteger(citation.start)||!Number.isSafeInteger(citation.end)||citation.start<0||citation.end<=citation.start||citation.end>text.length||!text.slice(citation.start,citation.end).trim())fail();
 return text.slice(citation.start,citation.end);
}
export function validateCitations(citations,inputs,{empty=false}={}){
 if(!Array.isArray(citations)||!empty&&!citations.length||citations.length>FORMATION_WORK_LIMITS.citations)fail();
 for(const citation of citations)citationText(citation,inputs);
 return citations;
}
export async function readFormationEvidence(store,t,prepared,entryIds=[]){
 const inputs=[],sources=new Map();
 for(const evidence of prepared.evidence){
  const projection=await inputProjection(store,t,evidence.inputId);if(!projection)fail();
  const sourceIds=[...new Set(projection.sourceRecordIds)];
  for(const id of sourceIds){
   if(sources.has(id))continue;if(sources.size>=FORMATION_WORK_LIMITS.sourceRecords)fail();
   const source=(await t.get('records',id))?.value,index=await t.get('recordIndex',id);
   if(!source||!index||source.deletedAt||source.sourceKey!==index.sourceKey||!token(source.sourceKey)||!token(source.contentHash)||typeof source.originalText!=='string')fail();
   // Capture/import time is not evidence of recurrence on different dates.
   const reliableTime=['high','very_high'].includes(source.timeConfidence)&&typeof source.sourceSentAt==='string'&&Number.isFinite(Date.parse(source.sourceSentAt));
   sources.set(id,{id,key:source.sourceKey,contentHash:source.contentHash,originalText:source.originalText,previousVersionId:source.previousVersionId||null,conversation:source.platform&&source.chatId?JSON.stringify([source.platform,source.chatId]):null,date:reliableTime?new Date(source.sourceSentAt).toISOString().slice(0,10):null});
  }
  inputs.push({id:projection.inputId,role:evidence.role,fields:Object.fromEntries(evidence.selectedFields.map(field=>[field,projection[field]])),sourceIds,revision:projection.contentRevision});
 }
 const scopeIds=new Set(inputs.map(x=>x.id)),fieldsByInput=new Map(prepared.evidence.map(e=>[e.inputId,new Set(e.selectedFields)])),entries=[];
 for(const id of entryIds){
  const raw=await store.readableEntry(t,id),dependencies=await t.all('dependencies','byTarget',prefix(['entry',id]),FORMATION_WORK_LIMITS.inputs+1);
  // Input-backed Entries only. Never fabricate a Source for an independent
  // authored Thought, or read dependencies outside the supplied exact scope.
  if(raw.lifecycle!=='active'||!dependencies.length||dependencies.length>FORMATION_WORK_LIMITS.inputs||dependencies.some(d=>!scopeIds.has(d.inputId)||d.status!=='valid'||!Array.isArray(d.selectedFields)||d.selectedFields.some(field=>!fieldsByInput.get(d.inputId)?.has(field))))fail();
  const entry=await bindingRead(store,t,raw);if(!entry.thoughtText?.trim())fail();
  const provenance=await t.all('provenance','byOwner',prefix(['entry',id]),FORMATION_WORK_LIMITS.sourceRecords+1);if(!provenance.length||provenance.length>FORMATION_WORK_LIMITS.sourceRecords)fail();
  const references=provenance.filter(p=>['primary','supporting'].includes(p.role)).map(p=>({inputId:p.inputId,revision:p.basedOnContentRevision,fields:p.actualVersion?.selectedFields||[],kind:p.contributionType,span:p.span?structuredClone(p.span):null}));
  if(!references.length)fail();
  entries.push({id,body:entry.thoughtText,bodyBinding:entry.bodyBinding||null,workingInputId:entry.workingInputId||null,revision:raw.revision,organizationRevision:raw.organizationRevision,dependencyRevision:raw.dependencyRevision,dependencies:dependencies.map(d=>({inputId:d.inputId,basedOnContentRevision:d.basedOnContentRevision,selectedFields:d.selectedFields,fieldDigests:d.fieldDigests,roles:d.roles})),references,sourceRecordIds:[...raw.sourceRecordIds]});
 }
 return {inputs,sources:[...sources.values()],entries};
}
// Preserve full historical records only in the private CAS snapshot. A refreshed
// B-backed Entry must not release identifiers for an excluded historical A.
export function formationEntryDescriptor(entry,inputs){
 const references=[];
 for(const reference of entry.references){
  const input=inputs.find(x=>x.id===reference.inputId),dependency=entry.dependencies.find(d=>d.inputId===reference.inputId&&d.roles?.some(r=>['primary','supporting'].includes(r)));
  if(!input||!dependency||!Array.isArray(reference.fields))continue;
  const fields=reference.fields.filter(field=>dependency.selectedFields.includes(field)&&Object.hasOwn(input.fields,field));if(!fields.length)continue;
  const full=reference.kind==='exact_excerpt'&&reference.span?.full===true&&entry.bodyBinding==='input'&&entry.workingInputId===reference.inputId&&fields.includes(reference.span.field);
  if(reference.revision!==input.revision&&!full)continue;
  const span=reference.span&&fields.includes(reference.span.field)?{field:reference.span.field,start:full?0:reference.span.start,end:full?input.fields[reference.span.field].length:reference.span.end,...(full?{full:true}:{})}:null;
  references.push({inputId:reference.inputId,revision:full?input.revision:reference.revision,fields,kind:reference.kind,span});
 }
 const {sourceRecordIds,...descriptor}=entry;
 return {...descriptor,references};
}
// An existing Entry ID is not authority to retarget another Input's evidence.
// Keep exact-excerpt bounds where known; derived Thoughts legitimately need not
// have text equal to their Source, but still need real direct dependency fields.
export function entrySpanSupported(entry,span,inputs){
 const input=inputs.find(i=>i.id===span.inputId),dependency=entry.dependencies.find(d=>d.inputId===span.inputId&&d.selectedFields.includes(span.field)&&d.roles?.some(r=>['primary','supporting'].includes(r)));
 if(!input||!dependency)return false;
 const references=entry.references.filter(p=>p.inputId===span.inputId&&Array.isArray(p.fields)&&p.fields.includes(span.field));
 if(!references.length)return false;
 const exact=references.filter(p=>p.kind==='exact_excerpt');
 if(exact.length)return exact.some(p=>p.span?.field===span.field&&(p.span.full===true&&entry.bodyBinding==='input'&&entry.workingInputId===span.inputId||p.revision===input.revision&&Number.isSafeInteger(p.span.start)&&Number.isSafeInteger(p.span.end)&&span.start>=p.span.start&&span.end<=p.span.end));
 return references.some(p=>p.revision===input.revision&&['paraphrase','combination'].includes(p.kind));
}
// Source-safe organization owns sanitization. Generated Section labels also
// need current Input/filter eligibility, just as Topic02 generated labels do.
// Human titles remain protected; missing/ambiguous generated provenance is not
// released to the decision mechanism and is not treated as an empty Section set.
export async function readableFormationSection(store,t,row){
 const safe=await safeOrganization(store,t,'section',row);
 if(row.protections?.title?.locked||!row.sourceRecordIds?.length)return safe;
 if(safe.sourceUnavailable||row.sourceRecordIds.length>20)fail();
 const filter=await t.get('meta','smart-filter');
 for(const id of row.sourceRecordIds){
  const source=await t.get('records',id),page=await t.indexPrimaryPage('blockIndex','byRecord',id,{limit:20});
  if(source?.value?.deletedAt||page.next||!page.rows.length)fail();
  for(const {value:index}of page.rows){const input=await inputProjection(store,t,index.id);if(!input||await store.isFiltered(t,input.block,filter))fail();}
 }
 return safe;
}
export async function validateFormationSources(snapshot){for(const source of snapshot.sources)if(await hashText(source.originalText)!==source.contentHash)fail();}
// Canonical Source/Input lineage, never model-supplied counts. Stable identity,
// exact copied content and known revisions are one contribution. Ambiguous
// edited merged spans contribute zero instead of counting every Source.
export function sourceContributionSummary(snapshot,citations){
 validateCitations(citations,snapshot.inputs,{empty:true});
 const sources=snapshot.sources,byId=new Map(sources.map((s,i)=>[s.id,i])),parent=sources.map((_,i)=>i);
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 const keysSeen=new Map(),contents=new Map();
 for(let i=0;i<sources.length;i++){
  const source=sources[i];for(const [map,key]of [[keysSeen,source.key],[contents,source.contentHash]]){if(map.has(key))join(i,map.get(key));else map.set(key,i);}
  if(byId.has(source.previousVersionId))join(i,byId.get(source.previousVersionId));
 }
 const used=new Set();let unattributed=0;
 for(const citation of citations){
  const text=citationText(citation,snapshot.inputs),input=snapshot.inputs.find(x=>x.id===citation.inputId);
  if(input.role==='context_only')continue;
  const all=[...new Set(input.sourceIds.map(id=>byId.get(id)).filter(i=>i!==undefined).map(root))];
  let matches=all;
  if(all.length>1)matches=[...new Set(input.sourceIds.map(id=>byId.get(id)).filter(i=>i!==undefined&&sources[i].originalText.includes(text)).map(root))];
  if(matches.length===1)used.add(matches[0]);else unattributed++;
 }
 const conversations=new Set(),dates=new Set();
 for(const group of used){
  const members=sources.filter((_,i)=>root(i)===group),conversation=new Set(members.map(s=>s.conversation)),date=new Set(members.map(s=>s.date));
  if(conversation.size===1&&members[0].conversation)conversations.add(members[0].conversation);
  if(date.size===1&&members[0].date)dates.add(members[0].date);
 }
 return {contributions:used.size,conversations:conversations.size,dates:dates.size,contexts:Math.max(conversations.size,dates.size),unattributed};
}
export function sameFormationEvidence(a,b){return same(a,b);}
