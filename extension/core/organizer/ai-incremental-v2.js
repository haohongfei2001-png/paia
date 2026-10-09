import {AI_FIELDS,AI_LIST_FIELDS,AI_TEXT_LIMITS} from './ai-contract.js';
import {bytes,reject} from './contracts.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),clone=structuredClone;
const exact=(x,keys)=>obj(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const ROW_KEYS=new Set(['id','topicId','presentationVersion','revision','evidenceEntryIds','projection','manifest','protections','recoveryGeneration','recoveryPurgeRevision','basedOnCheckpoint','candidate','needsUpdate','stale','updatedAt','userEditedAt']);
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
export const isIncrementalV2=row=>row?.presentationVersion===2;
const value=(projection,b)=>AI_LIST_FIELDS.includes(b.field)?projection[b.field]?.[b.index]?.text:projection[b.field];
export const incrementalBlockText=(row,b)=>value(row.projection,b).slice(b.start,b.end);
export function validIncrementalV2(row,allowed){
 try{
  if(!isIncrementalV2(row)||Object.keys(row).some(k=>!ROW_KEYS.has(k))||!id(row.topicId)||!Number.isSafeInteger(row.revision)||row.revision<0||!exact(row.manifest,['version','style','profile','control','blocks'])||row.manifest.version!==2||!['original','balanced','concise'].includes(row.manifest.style)||!validOrganizeCacheProfile(row.manifest.profile)||typeof row.manifest.control!=='string'||!row.manifest.control.length||row.manifest.control.length>5000||!Array.isArray(row.manifest.blocks)||row.manifest.blocks.length>1024||bytes(row.manifest)>256*1024)return false;
  if(AI_FIELDS.some(f=>Object.hasOwn(row,f))||!obj(row.protections)||Object.keys(row.protections).some(f=>!AI_FIELDS.includes(f)||typeof row.protections[f]!=='boolean'))return false;
  const p=row.projection;if(!same(row.evidenceEntryIds,p?.evidenceEntryIds))return false;if(!exact(p,['topicId',...AI_FIELDS,'evidenceEntryIds'])||p.topicId!==row.topicId||!Array.isArray(p.evidenceEntryIds)||p.evidenceEntryIds.length>1000||new Set(p.evidenceEntryIds).size!==p.evidenceEntryIds.length||p.evidenceEntryIds.some(r=>!id(r)||!allowed.has(r)))return false;
  for(const f of AI_FIELDS)if(AI_LIST_FIELDS.includes(f)){if(!Array.isArray(p[f])||p[f].length>20||p[f].some(x=>!exact(x,['text','evidenceEntryIds'])||typeof x.text!=='string'||x.text.length>2000||!Array.isArray(x.evidenceEntryIds)||new Set(x.evidenceEntryIds).size!==x.evidenceEntryIds.length||x.evidenceEntryIds.some(r=>!p.evidenceEntryIds.includes(r))))return false;}else if(typeof p[f]!=='string'||p[f].length>AI_TEXT_LIMITS[f])return false;
  const ids=new Set(),refs=new Set(),ranges=new Map();for(const b of row.manifest.blocks){
   if(!exact(b,['id','field','index','start','end','support','spans','manual'])||!id(b.id)||ids.has(b.id)||!AI_FIELDS.includes(b.field)||typeof b.manual!=='boolean')return false;ids.add(b.id);
   if(AI_LIST_FIELDS.includes(b.field)?!Number.isSafeInteger(b.index)||b.index<0:b.index!==null)return false;
   const text=value(p,b);if(typeof text!=='string'||!Number.isSafeInteger(b.start)||!Number.isSafeInteger(b.end)||b.start<0||(b.manual?b.end<b.start:b.end<=b.start)||b.end>text.length||!Array.isArray(b.support)||b.support.length>(b.manual?1000:100)||!Array.isArray(b.spans)||b.spans.length>100||!b.manual&&!b.support.length||b.manual&&row.protections?.[b.field]!==true)return false;
   const supportIds=new Set();for(const r of b.support){if(!exact(r,['id','version','scope'])||!id(r.id)||supportIds.has(r.id)||typeof r.version!=='string'||r.version.length>16000||typeof r.scope!=='string'||r.scope.length>16000||!allowed.has(r.id))return false;supportIds.add(r.id);refs.add(r.id);}
   if(!b.manual&&[...supportIds].some(r=>!b.spans.some(s=>s.entryId===r)))return false;
   for(const span of b.spans)if(!exact(span,['entryId','revision','start','end'])||!supportIds.has(span.entryId)||span.revision!==b.support.find(r=>r.id===span.entryId).version||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start)return false;
   if(AI_LIST_FIELDS.includes(b.field)&&!same([...supportIds].sort(),[...p[b.field][b.index].evidenceEntryIds].sort()))return false;
   const key=JSON.stringify([b.field,b.index]),list=ranges.get(key)||[];list.push([b.start,b.end]);ranges.set(key,list);
  }
  if(!same([...refs].sort(),[...p.evidenceEntryIds].sort()))return false;
  for(const f of AI_FIELDS){const vals=AI_LIST_FIELDS.includes(f)?p[f].map((x,i)=>[x.text,i]):[[p[f],null]];for(const [text,index]of vals){const intervals=(ranges.get(JSON.stringify([f,index]))||[]).sort((a,b)=>a[0]-b[0]);let at=0;for(const [start,end]of intervals){if(start<at||text.slice(at,start).trim())return false;at=end;}if(text.slice(at).trim())return false;}}
  return true;
 }catch{return false;}
}
function build(topicId,blocks,style,profile,control,protections={}){
 const p={topicId,...Object.fromEntries(AI_FIELDS.map(f=>[f,AI_LIST_FIELDS.includes(f)?[]:''])),evidenceEntryIds:[...new Set(blocks.flatMap(b=>b.support.map(r=>r.id)))]},manifest=[];
 for(const raw of blocks){const b=clone(raw),text=b.text;delete b.text;if(AI_LIST_FIELDS.includes(b.field)){b.index=p[b.field].length;p[b.field].push({text,evidenceEntryIds:[...new Set(b.support.map(r=>r.id))]});b.start=0;b.end=text.length;}else{b.index=null;const prefix=p[b.field]?'\n':'';b.start=p[b.field].length+prefix.length;p[b.field]+=prefix+text;b.end=p[b.field].length;}manifest.push(b);}
 const row={topicId,presentationVersion:2,revision:0,evidenceEntryIds:clone(p.evidenceEntryIds),projection:p,manifest:{version:2,style,profile:clone(profile),control,blocks:manifest},protections:clone(protections)};
 if(!validIncrementalV2(row,new Set(p.evidenceEntryIds)))reject('INVALID_OUTPUT');return row;
}
// Retained accepted bytes depend on transformation semantics, while current
// request/candidate owners still bind the full live preference revision.
function retainedControl(value){
 try{
  if(typeof value!=='string'||!value.length||value.length>5000)return null;
  const tuple=JSON.parse(value);if(!Array.isArray(tuple)||tuple.length!==4)return null;
  const [gate,restore,style,policyText]=tuple,epoch=x=>typeof x==='string'&&/^[a-zA-Z0-9:-]{1,128}$/.test(x);
  if(!Number.isSafeInteger(gate)||gate<0||!epoch(restore)||!exact(style,['available','value','revision','explicit','epoch'])||style.available!==true||!['original','balanced','concise'].includes(style.value)||!Number.isSafeInteger(style.revision)||style.revision<0||typeof style.explicit!=='boolean'||style.epoch!==restore)return null;
  if(style.explicit?style.revision===0:style.revision!==0||style.value!=='balanced')return null;
  if(typeof policyText!=='string')return null;const policy=JSON.parse(policyText);
  if(!exact(policy,['filterMode','externalAccess','localOnly'])||!['off','light'].includes(policy.filterMode)||typeof policy.externalAccess!=='boolean'||typeof policy.localOnly!=='boolean')return null;
  return {gate,restore,style,policyText};
 }catch{return null;}
}
function sameRetainedControl(saved,current,style){
 const prior=retainedControl(saved.manifest.control),next=retainedControl(current);
 return !!prior&&!!next&&saved.manifest.style===prior.style.value&&same(next.style,style)&&prior.style.value===next.style.value&&prior.gate===next.gate&&prior.restore===next.restore&&prior.policyText===next.policyText;
}
export function planIncrementalV2(topic,style,profile,control){
 const saved=topic.stored,isV2=isIncrementalV2(saved),entries=new Map(topic.entries.map(e=>[e.id,e]));
 if(saved&&!isV2)reject('STALE_BASE');if(entries.size>1000||isV2&&!validIncrementalV2(saved,new Set(entries.keys())))reject('STALE_BASE');
 if(isV2&&(!sameRetainedControl(saved,control,style)||saved.manifest.style!==style.value||!same(saved.manifest.profile,profile)))reject('STALE_BASE');
 // An actual human field edit is indivisible. This first local slice does not
 // generate around it or reinterpret it as unprotected incremental fragments.
 if(saved?.manifest.blocks.some(b=>b.manual))reject('STALE_BASE');
 const covered=new Set(),affected=new Set(),retained=[],replace=[];
 for(const b of saved?.manifest.blocks||[]){for(const r of b.support)covered.add(r.id);const changed=b.support.some(r=>topic.versions[r.id]!==r.version||topic.incrementalVersions[r.id]!==r.scope);if(changed){if(saved.protections?.[b.field]||b.manual)reject('STALE_BASE');replace.push(b.id);for(const r of b.support)if(entries.has(r.id))affected.add(r.id);}else retained.push({...clone(b),text:incrementalBlockText(saved,b)});}
 for(const e of topic.entries)if(!covered.has(e.id))affected.add(e.id);
 // Closed independent blocks need no model neighbor. Scope/order is decided by
 // the owner; a provider cannot request arbitrary unchanged text as context.
 const selected=topic.entries.filter(e=>affected.has(e.id));return {version:2,control,replace,retained,selected,complete:true,baseRevision:saved?.revision||0};
}
export function validateIncrementalChild(response,request,prepared){
 if(!exact(response,['version','blocks'])||response.version!==2||!Array.isArray(response.blocks)||!response.blocks.length||response.blocks.length>1024)reject('INVALID_OUTPUT');
 const allowed=new Map(request.inputs.map(i=>[i.ref,i])),seen=new Set(),represented=new Set(),newBlocks=[],bounds=text=>new Set([0,text.length,...[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>s.index)]);
 for(const [index,b]of response.blocks.entries()){
  if(!exact(b,['field','text','evidenceEntryIds','sourceSpans'])||!AI_FIELDS.includes(b.field)||typeof b.text!=='string'||!b.text.trim()||!Array.isArray(b.evidenceEntryIds)||!b.evidenceEntryIds.length||b.evidenceEntryIds.length>100||new Set(b.evidenceEntryIds).size!==b.evidenceEntryIds.length||b.evidenceEntryIds.some(r=>!allowed.has(r))||!Array.isArray(b.sourceSpans)||b.sourceSpans.length>100)reject('INVALID_OUTPUT');
  const support=b.evidenceEntryIds.map(r=>{represented.add(r);return {id:r,version:prepared.topic.versions[r],scope:prepared.topic.incrementalVersions[r]};});
  for(const span of b.sourceSpans){const input=allowed.get(span.entryId);if(!exact(span,['entryId','revision','start','end'])||!input||!b.evidenceEntryIds.includes(span.entryId)||span.revision!==input.revision||!bounds(input.text).has(span.start)||!bounds(input.text).has(span.end)||span.end<=span.start)reject('INVALID_OUTPUT');}
  if(b.evidenceEntryIds.some(id=>!b.sourceSpans.some(s=>s.entryId===id)))reject('INVALID_OUTPUT');
  if(request.style.value==='original'&&(b.sourceSpans.length!==1||allowed.get(b.sourceSpans[0].entryId).text.slice(b.sourceSpans[0].start,b.sourceSpans[0].end)!==b.text))reject('INVALID_OUTPUT');
  const key=JSON.stringify([b.field,b.text,b.evidenceEntryIds,b.sourceSpans]);if(seen.has(key))reject('INVALID_OUTPUT');seen.add(key);newBlocks.push({id:crypto.randomUUID(),field:b.field,index:null,start:0,end:0,support,spans:clone(b.sourceSpans),manual:false,text:b.text});
 }
 if(request.inputs.some(i=>!represented.has(i.ref)))reject('INVALID_OUTPUT');
 if(request.style.value==='original')for(const i of request.inputs){const ranges=response.blocks.flatMap(b=>b.sourceSpans.filter(s=>s.entryId===i.ref)).sort((a,b)=>a.start-b.start);let end=0;for(const r of ranges){if(r.start>end)reject('INVALID_OUTPUT');end=Math.max(end,r.end);}if(end!==i.text.length)reject('INVALID_OUTPUT');}
 return newBlocks;
}
export function mergeIncrementalChildren(newBlocks,request,prepared){
 const order=new Map(prepared.topic.entries.map((e,i)=>[e.id,i])),blocks=[...prepared.incremental.retained,...newBlocks];blocks.sort((a,b)=>{if(a.field===b.field&&prepared.topic.stored?.protections?.[a.field]){const old=new Set(prepared.incremental.retained.map(x=>x.id));if(old.has(a.id)!==old.has(b.id))return old.has(a.id)?-1:1;}return Math.min(...a.support.map(r=>order.get(r.id))) - Math.min(...b.support.map(r=>order.get(r.id)));});
 return build(request.topicId,blocks,request.style.value,request.profile,prepared.incremental.control,prepared.topic.stored?.protections||{});
}
export function validateIncrementalResponse(response,request,prepared){return mergeIncrementalChildren(validateIncrementalChild(response,request,prepared),request,prepared);}
export function adoptIncrementalFields(row,proposal,adopted,kept){
 const prior=isIncrementalV2(row)?row:null,protections={...row.protections,...Object.fromEntries([...adopted,...kept].map(f=>[f,!!prior]))};
 const blocks=[...(prior?.manifest.blocks||[]).filter(b=>!adopted.includes(b.field)).map(b=>({...clone(b),text:incrementalBlockText(prior,b)})),...proposal.manifest.blocks.filter(b=>adopted.includes(b.field)).map(b=>({...clone(b),text:incrementalBlockText(proposal,b)}))];
 return build(row.topicId,blocks,proposal.manifest.style,proposal.manifest.profile,proposal.manifest.control,protections);
}
export function editIncrementalField(row,field,text){
 const support=[...new Map(row.manifest.blocks.filter(b=>b.field===field).flatMap(b=>b.support).map(r=>[r.id,clone(r)])).values()];
 const blocks=row.manifest.blocks.filter(b=>b.field!==field).map(b=>({...clone(b),text:incrementalBlockText(row,b)})),values=AI_LIST_FIELDS.includes(field)?text.map(x=>x.text):[text];
 for(const [index,value]of values.entries())blocks.push({id:crypto.randomUUID(),field,index:null,start:0,end:0,support:clone(AI_LIST_FIELDS.includes(field)?support.filter(r=>text[index].evidenceEntryIds.includes(r.id)):support),spans:[],manual:true,text:value});
 return build(row.topicId,blocks,row.manifest.style,row.manifest.profile,row.manifest.control,{...row.protections,[field]:true});
}
