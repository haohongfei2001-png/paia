import {ArchiveError} from './constants.js';

export const FAMILY_BY_TYPE=Object.freeze({fact:'Information',event:'Information',preference:'Thinking',decision:'Thinking',judgment:'Thinking',idea:'Thinking',goal_plan:'Thinking',reflection:'Thinking',creation:'Creation'});
export const ENTRY_FIELDS=Object.freeze(['title','body','note','type','formation']);
export const ORGANIZATION_FIELDS=Object.freeze(['topics','section','order']);
export const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
export const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
export const revisionOK=v=>Number.isSafeInteger(v)&&v>=0;
export function keys(value,allowed,required=[]) {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(value,k)))fail();
}
export function validateFields(value) {
 keys(value,ENTRY_FIELDS);
 if(!Object.keys(value).length)fail();
 for(const [key,v]of Object.entries(value)) {
  if(key==='type'){if(!Object.hasOwn(FAMILY_BY_TYPE,v))fail();}
  else if(key==='formation'){if(!['explicit','synthesized','inferred'].includes(v))fail();}
  else if(typeof v!=='string'||(key==='title'?v.length>300:new TextEncoder().encode(v).length>200*1024))fail();
 }
 return value;
}
export function validateGenerator(g) {
 keys(g,['providerId','providerVersion','modelVersion','taskSchemaVersion','promptTemplateVersion','policyVersion'],['providerId','providerVersion','modelVersion','taskSchemaVersion','promptTemplateVersion','policyVersion']);
 for(const k of ['providerId','providerVersion','modelVersion'])if(typeof g[k]!=='string'||!/^[-a-zA-Z0-9_.]{1,80}$/.test(g[k]))fail();
 for(const k of ['taskSchemaVersion','promptTemplateVersion','policyVersion'])if(!Number.isSafeInteger(g[k])||g[k]<1)fail();
 return structuredClone(g);
}
export function protections(actor,operationId,at,legacy=false) {
 return Object.fromEntries([...ENTRY_FIELDS,...ORGANIZATION_FIELDS].map(field=>[field,{locked:actor==='user'||legacy,reason:legacy?'legacy_unknown':actor==='user'?'user_created':'none',operationId,at}]));
}
export function markHuman(row,field,operationId,at,reason='user_edit') {
 row.authorship??={};row.protections??={};
 row.protections[field]={locked:true,reason,operationId,at};row.hasHumanAction=true;row.userEdited=true;
 row.authorship[field]={actor:'user',everHumanConfirmed:true,operationId,at};
}
export function refreshEntryIndex(row) {
 row.lifecycleKey=['active','removed','invalidated','quarantined'].indexOf(row.lifecycle);
 row.activeKey=row.lifecycle==='active'?0:1;row.listKey=[row.activeKey,row.id];row.negativeUpdatedSequence=-(row.updatedSequence||0);
}
export function entrySnapshot(row) {
 return {title:row.title??'',body:row.thoughtText,note:row.note,type:row.type,formation:row.formation,lifecycle:row.lifecycle};
}
export function entryDTO(row) {return {...structuredClone(row),title:row.title??'',body:row.thoughtText};}
export function normalizeRank(rank) {if(typeof rank!=='string'||!/^\d{12}$/.test(rank))fail();return rank;}
export function rankBetween(left=null,right=null) {
 const a=left===null?0:Number(normalizeRank(left)),b=right===null?999999999999:Number(normalizeRank(right));
 if(a>=b||b-a<2)fail();return String(Math.floor((a+b)/2)).padStart(12,'0');
}
export async function keyedHash(secret,value) {
 const key=await crypto.subtle.importKey('raw',new Uint8Array(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(value))));
 return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
