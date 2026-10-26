import {AI_FIELDS,AI_LIST_FIELDS,isStoredAIPresentation} from './ai-contract.js';
import {fail} from '../ai-usage/contracts.js';

// This decoder is used only after the original action's separate processing
// policy grants this exact accepted presentation. It never follows a proposal,
// unknown property or another Topic's cache. Original validity checks still run.
const need=x=>{if(!x)fail('UNAVAILABLE');};
const own=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x,k);need(d&&Object.hasOwn(d,'value'));return d.value;};
export function readPermittedOrganizePresentation(row,{topicId,entryIds,check,charge}){
 let nodes=0;
 const scalar=x=>{check();need(++nodes<=16384);need(x===null||['string','boolean'].includes(typeof x)||typeof x==='number'&&Number.isFinite(x));return typeof x==='string'?charge(x):x;};
 const record=(x,fields)=>{check();need(x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ks=Reflect.ownKeys(x);need(ks.length<=16384-nodes&&ks.every(k=>typeof k==='string'&&Object.hasOwn(fields,k)));nodes+=ks.length;const out={};for(const k of ks){check();out[k]=fields[k](own(x,k));}return out;};
 const list=(x,max,decode)=>{check();need(Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype);const length=own(x,'length');need(Number.isSafeInteger(length)&&length<=max&&Reflect.ownKeys(x).length===length+1);nodes+=length;need(nodes<=16384);return Array.from({length},(_,i)=>{check();return decode(own(x,String(i)));});};
 const ids=x=>list(x,100,scalar),profile=x=>record(x,Object.fromEntries(['contractVersion','modelVersion','promptVersion'].map(k=>[k,scalar])));
 const strings=x=>{check();need(x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ks=Reflect.ownKeys(x);need(ks.length<=100&&ks.every(k=>typeof k==='string'&&entryIds.includes(k)));return record(x,Object.fromEntries(ks.map(k=>[k,scalar])));};
 const fields=x=>record(x,Object.fromEntries(AI_FIELDS.map(k=>[k,scalar])));
 const projection=x=>record(x,{topicId:scalar,evidenceEntryIds:ids,...Object.fromEntries(AI_FIELDS.map(k=>[k,AI_LIST_FIELDS.includes(k)?v=>list(v,20,item=>record(item,{text:scalar,evidenceEntryIds:ids})):scalar]))});
 const generation=x=>record(x,{kind:scalar,jobId:scalar,commitIdentity:scalar,acceptedDigest:scalar,style:scalar,profile,control:scalar,children:v=>list(v,4,c=>record(c,Object.fromEntries(['childId','operationReceiptId','payloadDigest','validatedOutputDigest'].map(k=>[k,scalar]))))});
 const generations=x=>{check();need(x&&typeof x==='object'&&!Array.isArray(x));const ks=Reflect.ownKeys(x);need(ks.length<=1032&&ks.every(k=>typeof k==='string'&&/^[a-f0-9]{64}$/.test(k)));return record(x,Object.fromEntries(ks.map(k=>[k,generation])));};
 const block=x=>record(x,{id:scalar,field:scalar,index:scalar,start:scalar,end:scalar,manual:scalar,generation:scalar,support:v=>list(v,100,s=>record(s,{id:scalar,version:scalar,scope:scalar})),spans:v=>list(v,100,s=>record(s,{entryId:scalar,revision:scalar,start:scalar,end:scalar}))});
 const manifest=x=>record(x,{version:scalar,style:scalar,profile,control:scalar,blocks:v=>list(v,1024,block),generations,fields:v=>record(v,Object.fromEntries(AI_FIELDS.map(k=>[k,f=>record(f,{style:scalar,generations:g=>list(g,1032,scalar)})])))});
 const cache=x=>record(x,{version:scalar,topicId:scalar,presentationRevision:scalar,profile,style:v=>record(v,{value:scalar,policyVersion:scalar}),evidenceVersion:scalar});
 const accepted=record(row,{id:scalar,topicId:scalar,schemaVersion:scalar,presentationVersion:scalar,revision:scalar,evidenceEntryIds:ids,projection,manifest,protections:fields,recoveryGeneration:scalar,recoveryPurgeRevision:scalar,basedOnCheckpoint:v=>record(v,{entryVersions:strings}),cacheBinding:cache,needsUpdate:scalar,stale:scalar,updatedAt:scalar,userEditedAt:scalar,...Object.fromEntries(AI_FIELDS.map(k=>[k,AI_LIST_FIELDS.includes(k)?v=>list(v,20,item=>record(item,{text:scalar,evidenceEntryIds:ids})):scalar]))});
 check();need(accepted.id==='aiPresentation:'+topicId&&accepted.topicId===topicId&&isStoredAIPresentation(accepted,new Set(entryIds)));check();return accepted;
}
