import {AI_FIELDS} from './ai-contract.js';
import {isIncrementalV2,validIncrementalV2,planIncrementalV2,mergeIncrementalChildren,editIncrementalField,adoptIncrementalFields,sameRetainedControl} from './ai-incremental-v2.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {canonical,digest} from '../ai-usage/contracts.js';
import {bytes,reject} from './contracts.js';
const copy=structuredClone,record=x=>!!x&&typeof x==='object'&&!Array.isArray(x),exact=(x,ks)=>record(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k)),same=(a,b)=>canonical(a)===canonical(b),hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),opaque=x=>typeof x==='string'&&x.length>0&&x.length<=200;
export const isIncrementalV3=r=>r?.presentationVersion===3;
const cleanBlock=b=>{const x=copy(b);delete x.generation;return x;};
export function validIncrementalGeneration(g){
 if(!record(g)||!['original','balanced','concise'].includes(g.style)||!validOrganizeCacheProfile(g.profile)||typeof g.control!=='string'||g.control.length>5000)return false;
 let style;try{style=JSON.parse(g.control)[2];}catch{return false;}if(!sameRetainedControl({manifest:g},g.control,style))return false;
 if(g.kind==='accepted-v2')return exact(g,['kind','style','profile','control','acceptedDigest'])&&hash(g.acceptedDigest);
 return exact(g,['kind','jobId','children','commitIdentity','style','profile','control'])&&g.kind==='local-committed-v1'&&opaque(g.jobId)&&hash(g.commitIdentity)&&Array.isArray(g.children)&&g.children.length>=1&&g.children.length<=4&&new Set(g.children.map(c=>c.childId)).size===g.children.length&&g.children.every(c=>exact(c,['childId','operationReceiptId','payloadDigest','validatedOutputDigest'])&&opaque(c.childId)&&opaque(c.operationReceiptId)&&hash(c.payloadDigest)&&hash(c.validatedOutputDigest));
}
export function asIncrementalV2(row){
 const first=Object.values(row.manifest.generations)[0];return {...copy(row),presentationVersion:2,manifest:{version:2,style:first.style,profile:copy(first.profile),control:first.control,blocks:row.manifest.blocks.map(cleanBlock)}};
}
export function validIncrementalV3(row,allowed){
 try{
  if(!isIncrementalV3(row)||!exact(row.manifest,['version','fields','generations','blocks'])||row.manifest.version!==3||bytes(row.manifest)>256*1024||!exact(row.manifest.fields,AI_FIELDS)||!record(row.manifest.generations)||!Object.keys(row.manifest.generations).length||Object.keys(row.manifest.generations).length>1032||!Array.isArray(row.manifest.blocks)||row.manifest.blocks.length>1024)return false;
  const {generations,fields,blocks}=row.manifest,used=new Set();for(const [key,g]of Object.entries(generations))if(!hash(key)||!validIncrementalGeneration(g)||(g.kind==='local-committed-v1'&&g.commitIdentity!==key)||(g.kind==='accepted-v2'&&g.acceptedDigest!==key))return false;
  for(const f of AI_FIELDS){const field=fields[f];if(!exact(field,['style','generations'])||!['original','balanced','concise'].includes(field.style)||!Array.isArray(field.generations)||!field.generations.length||new Set(field.generations).size!==field.generations.length||field.generations.some(k=>!generations[k]||generations[k].style!==field.style))return false;for(const k of field.generations)used.add(k);}
  if(Object.keys(generations).some(k=>!used.has(k)))return false;
  for(const b of blocks)if(!Object.hasOwn(b,'generation')||!(b.manual&&b.generation===null)&&(!hash(b.generation)||!fields[b.field]?.generations.includes(b.generation)))return false;
  return validIncrementalV2(asIncrementalV2(row),allowed);
 }catch{return false;}
}
export async function legacyV2Generation(row){
 if(!validIncrementalV2(row,new Set(row.evidenceEntryIds)))reject('STALE_BASE');const acceptedDigest=await digest({projection:row.projection,manifest:row.manifest});return {kind:'accepted-v2',style:row.manifest.style,profile:copy(row.manifest.profile),control:row.manifest.control,acceptedDigest};
}
export async function committedV3Generation({jobId,children,style,profile,control}){
 const g={kind:'local-committed-v1',jobId,children:copy(children),style,profile:copy(profile),control};g.commitIdentity=await digest(['paia-organize-generation-v1',jobId,g.children,style,profile,control]);if(!validIncrementalGeneration(g))reject('INVALID_OUTPUT');return g;
}
const generationId=g=>g.commitIdentity||g.acceptedDigest;
function finish(row,fields,generations,blocks){
 const used=new Set(Object.values(fields).flatMap(f=>f.generations)),next={...copy(row),presentationVersion:3,manifest:{version:3,fields:copy(fields),generations:Object.fromEntries(Object.entries(generations).filter(([k])=>used.has(k)).map(([k,v])=>[k,copy(v)])),blocks:copy(blocks)}};if(!validIncrementalV3(next,new Set(next.evidenceEntryIds)))reject('INVALID_OUTPUT');return next;
}
export function promoteIncrementalV2(row,generation){
 if(!validIncrementalGeneration(generation))reject('INVALID_OUTPUT');const key=generationId(generation);return finish(row,Object.fromEntries(AI_FIELDS.map(f=>[f,{style:generation.style,generations:[key]}])),{[key]:generation},row.manifest.blocks.map(b=>({...copy(b),generation:b.manual?null:key})));
}
export function planIncrementalV3(topic,style,profile,control,{refreshStyle=false}={}){
 const saved=topic.stored;if(saved&&!isIncrementalV3(saved)&&!isIncrementalV2(saved))reject('STALE_BASE');
 if(saved&&!((isIncrementalV3(saved)?validIncrementalV3:validIncrementalV2)(saved,new Set(topic.entries.map(e=>e.id)))))reject('STALE_BASE');
 if(isIncrementalV2(saved)&&(!refreshStyle||saved.manifest.style===style.value))reject('STALE_BASE');
 if(saved?.manifest.blocks.some(b=>b.manual))reject('STALE_BASE');
 const gens=isIncrementalV3(saved)?Object.values(saved.manifest.generations):saved?[saved.manifest]:[];
 // Explicit recomputation can change style only, never gate/restore/policy/profile.
 for(const g of gens){const old=JSON.parse(g.control),now=JSON.parse(control);if(refreshStyle){const priorStyle=old[2];if(!sameRetainedControl({manifest:g},g.control,priorStyle)||!sameRetainedControl({manifest:{...g,style:style.value,control:JSON.stringify([old[0],old[1],now[2],old[3]])}},control,style)||!same(g.profile,profile))reject('STALE_BASE');}else if(!sameRetainedControl({manifest:g},control,style)||!same(g.profile,profile))reject('STALE_BASE');}
 if(refreshStyle)return {version:3,control,replace:saved?.manifest.blocks.map(b=>b.id)||[],retained:[],selected:topic.entries,complete:true,baseRevision:saved?.revision||0,refreshStyle:true};
 const base=isIncrementalV3(saved)?asIncrementalV2(saved):saved,plan=planIncrementalV2({...topic,stored:base},style,profile,control),byId=new Map(saved?.manifest.blocks.map(b=>[b.id,b])||[]);
 return {...plan,version:3,retained:plan.retained.map(b=>({...b,...(isIncrementalV3(saved)?{generation:byId.get(b.id).generation}:{})})),refreshStyle:false};
}
export function mergeIncrementalV3(newBlocks,request,prepared,generation,legacyGeneration=null){
 const key=generationId(generation),saved=prepared.topic.stored,prior=isIncrementalV3(saved)?saved:isIncrementalV2(saved)?promoteIncrementalV2(saved,legacyGeneration):null;
 const output=mergeIncrementalChildren(newBlocks,request,{...prepared,incremental:{...prepared.incremental,retained:prepared.incremental.retained.map(cleanBlock)}}),retainedIds=new Set(prepared.incremental.retained.map(b=>b.id)),byId=new Map(prior?.manifest.blocks.map(b=>[b.id,b])||[]);
 const blocks=output.manifest.blocks.map(b=>({...b,generation:retainedIds.has(b.id)?byId.get(b.id).generation:key})),generations={...prior?.manifest.generations,[key]:generation},fields={};
 for(const f of AI_FIELDS){const ids=[...new Set(blocks.filter(b=>b.field===f).map(b=>b.generation).filter(Boolean))];fields[f]=!ids.length&&prior&&!prepared.incremental.refreshStyle?copy(prior.manifest.fields[f]):{style:request.style.value,generations:ids.length?ids:[key]};}
 return finish(output,fields,generations,blocks);
}
export function adoptIncrementalV3(row,proposal,adopted,kept,legacyGeneration=null){
 const prior=isIncrementalV3(row)?row:isIncrementalV2(row)?promoteIncrementalV2(row,legacyGeneration):null,projected=adoptIncrementalFields(prior?asIncrementalV2(prior):row,asIncrementalV2(proposal),adopted,kept),fields={},byId=new Map([...prior?.manifest.blocks||[],...proposal.manifest.blocks].map(b=>[b.id,b]));
 for(const f of AI_FIELDS)fields[f]=copy(adopted.includes(f)||!prior?proposal.manifest.fields[f]:prior.manifest.fields[f]);
 return finish(projected,fields,{...prior?.manifest.generations,...proposal.manifest.generations},projected.manifest.blocks.map(b=>({...b,generation:byId.get(b.id).generation})));
}
export function editIncrementalV3(row,field,value){
 const projected=editIncrementalField(asIncrementalV2(row),field,value),byId=new Map(row.manifest.blocks.map(b=>[b.id,b]));return finish(projected,row.manifest.fields,row.manifest.generations,projected.manifest.blocks.map(b=>({...b,generation:b.manual?null:byId.get(b.id).generation})));
}
