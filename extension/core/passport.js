import {ArchiveError} from './constants.js';
import {key as memoryKey,idOK} from './memory/model.js';
import {CONTEXT_CONSUMERS,CONTEXT_PURPOSES} from './context-package.js';

export const PASSPORT_VERSION=1;
export const PASSPORT_PREFIX='passport:';
export const PASSPORT_PERMISSION='context_export';
export const PASSPORT_RESOURCE_SCOPE='profile';
export const PASSPORT_DURATIONS=Object.freeze(['once','7d','30d']);
export const PASSPORT_AUDIT_RETENTION_DAYS=90;
export const PASSPORT_AUDIT_LIMIT=200;
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const iso=value=>new Date(value).toISOString();
const nowMs=value=>typeof value==='number'&&Number.isFinite(value)?value:Date.parse(value||'');

export const passportGrantId=id=>PASSPORT_PREFIX+'grant:'+id;
export const passportAuditId=(at,id)=>PASSPORT_PREFIX+'audit:'+at+':'+id;
export const passportRange=()=>IDBKeyRange.bound(PASSPORT_PREFIX,PASSPORT_PREFIX+'\uffff');

export function grantExpiresAt(duration,createdAt){
 const at=nowMs(createdAt);if(!Number.isFinite(at)||!PASSPORT_DURATIONS.includes(duration))invalid();
 return duration==='once'?null:iso(at+(duration==='7d'?7:30)*86400000);
}

export function validateGrantRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['consumer','purpose','profileId','duration'].includes(k)))return null;
 const {consumer,purpose,profileId='default',duration}=value;
 if(!CONTEXT_CONSUMERS.includes(consumer)||consumer==='manual'||!CONTEXT_PURPOSES.includes(purpose)||purpose==='current_task'||!idOK(profileId)||!PASSPORT_DURATIONS.includes(duration))return null;
 return {consumer,purpose,profileId,duration};
}

export function validatePassportRow(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||row.version!==PASSPORT_VERSION||typeof row.id!=='string'||!row.id.startsWith(PASSPORT_PREFIX))return false;
 if(row.kind==='grant'){
  const allowed=['id','kind','version','grantId','consumer','purpose','resourceScope','profileId','permission','duration','createdAt','expiresAt','revokedAt','consumedAt','lastUsedAt','useCount'];
  if(Object.keys(row).some(k=>!allowed.includes(k))||row.id!==passportGrantId(row.grantId)||!idOK(row.grantId)||!CONTEXT_CONSUMERS.includes(row.consumer)||row.consumer==='manual'||!CONTEXT_PURPOSES.includes(row.purpose)||row.purpose==='current_task'||row.resourceScope!==PASSPORT_RESOURCE_SCOPE||!idOK(row.profileId)||row.permission!==PASSPORT_PERMISSION||!PASSPORT_DURATIONS.includes(row.duration)||!Number.isFinite(Date.parse(row.createdAt))||row.expiresAt!==null&&!Number.isFinite(Date.parse(row.expiresAt))||row.revokedAt!==null&&!Number.isFinite(Date.parse(row.revokedAt))||row.consumedAt!==null&&!Number.isFinite(Date.parse(row.consumedAt))||row.lastUsedAt!==null&&!Number.isFinite(Date.parse(row.lastUsedAt))||!Number.isSafeInteger(row.useCount)||row.useCount<0)return false;
  if(row.duration==='once'&&row.expiresAt!==null)return false;
  if(row.duration!=='once'&&row.expiresAt===null)return false;
  return true;
 }
 if(row.kind==='audit'){
  const allowed=['id','kind','version','auditId','grantId','consumer','purpose','resourceScope','profileId','permission','action','createdAt'];
  return !Object.keys(row).some(k=>!allowed.includes(k))&&row.id===passportAuditId(row.createdAt,row.auditId)&&idOK(row.auditId)&&(row.grantId===null||idOK(row.grantId))&&CONTEXT_CONSUMERS.includes(row.consumer)&&CONTEXT_PURPOSES.includes(row.purpose)&&row.resourceScope===PASSPORT_RESOURCE_SCOPE&&idOK(row.profileId)&&row.permission===PASSPORT_PERMISSION&&['copy','markdown','manual_copy','manual_markdown'].includes(row.action)&&Number.isFinite(Date.parse(row.createdAt));
 }
 return false;
}

export function grantState(row,now=Date.now()){
 if(!validatePassportRow(row)||row.kind!=='grant')return 'invalid';
 if(row.revokedAt)return 'revoked';
 if(row.duration==='once'&&row.consumedAt)return 'consumed';
 if(row.expiresAt&&Date.parse(row.expiresAt)<=now)return 'expired';
 return 'active';
}

export class PassportService {
 constructor(store,{clock=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){this.store=store;this.clock=clock;this.uuid=uuid;}
 run(write,fn){return this.store.run(()=>this.store.repository.transaction(write,fn,['meta']));}
 async prune(t){const now=this.clock(),rows=(await t.all('meta',null,passportRange())).filter(validatePassportRow),audits=rows.filter(r=>r.kind==='audit').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));for(const row of audits.filter((r,i)=>Date.parse(r.createdAt)<now-PASSPORT_AUDIT_RETENTION_DAYS*86400000||i<audits.length-PASSPORT_AUDIT_LIMIT))await t.delete('meta',row.id);}
 async status(){return this.run(true,async t=>{await this.prune(t);const rows=(await t.all('meta',null,passportRange())).filter(validatePassportRow),grants=rows.filter(r=>r.kind==='grant').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(row=>({...row,state:grantState(row,this.clock())})),audits=rows.filter(r=>r.kind==='audit').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50);return {version:PASSPORT_VERSION,permission:PASSPORT_PERMISSION,resourceScope:PASSPORT_RESOURCE_SCOPE,localOnly:true,storesBody:false,consumers:CONTEXT_CONSUMERS.filter(x=>x!=='manual'),purposes:CONTEXT_PURPOSES.filter(x=>x!=='current_task'),durations:PASSPORT_DURATIONS,grants,audits};});}
 async create(request){const input=validateGrantRequest(request);if(!input)invalid();return this.run(true,async t=>{if(!await t.get('meta',memoryKey('profile',input.profileId)))invalid();const createdAt=iso(this.clock()),grantId=this.uuid(),row={id:passportGrantId(grantId),kind:'grant',version:PASSPORT_VERSION,grantId,...input,resourceScope:PASSPORT_RESOURCE_SCOPE,permission:PASSPORT_PERMISSION,createdAt,expiresAt:grantExpiresAt(input.duration,createdAt),revokedAt:null,consumedAt:null,lastUsedAt:null,useCount:0};if(!validatePassportRow(row))invalid();await t.put('meta',row);return {...row,state:'active'};});}
 async revoke(grantId){if(!idOK(grantId))invalid();return this.run(true,async t=>{const row=await t.get('meta',passportGrantId(grantId));if(!validatePassportRow(row)||row.kind!=='grant')invalid();if(!row.revokedAt)row.revokedAt=iso(this.clock());await t.put('meta',row);return {...row,state:grantState(row,this.clock())};});}
 async clearAudits(){return this.run(true,async t=>{for(const row of await t.all('meta',null,passportRange()))if(row?.kind==='audit')await t.delete('meta',row.id);return {ok:true};});}
 async authorize({grantId,consumer,purpose,profileId}={}){if(!idOK(grantId)||!CONTEXT_CONSUMERS.includes(consumer)||!CONTEXT_PURPOSES.includes(purpose)||!idOK(profileId))invalid();return this.run(false,async t=>{const row=await t.get('meta',passportGrantId(grantId));if(!validatePassportRow(row)||row.kind!=='grant'||grantState(row,this.clock())!=='active'||row.consumer!==consumer||row.purpose!==purpose||row.resourceScope!==PASSPORT_RESOURCE_SCOPE||row.profileId!==profileId||row.permission!==PASSPORT_PERMISSION)throw new ArchiveError('MEMORY_DENIED');if(!await t.get('meta',memoryKey('profile',profileId)))throw new ArchiveError('MEMORY_UNAVAILABLE');return row;});}
 async audit({grantId=null,consumer,purpose,profileId,action}){if(grantId!==null&&!idOK(grantId)||!CONTEXT_CONSUMERS.includes(consumer)||!CONTEXT_PURPOSES.includes(purpose)||!idOK(profileId)||!['copy','markdown','manual_copy','manual_markdown'].includes(action))invalid();return this.run(true,async t=>{await this.prune(t);const createdAt=iso(this.clock()),auditId=this.uuid(),row={id:passportAuditId(createdAt,auditId),kind:'audit',version:PASSPORT_VERSION,auditId,grantId,consumer,purpose,resourceScope:PASSPORT_RESOURCE_SCOPE,profileId,permission:PASSPORT_PERMISSION,action,createdAt};await t.put('meta',row);return row;});}
 async consume(grantId,action){if(!idOK(grantId)||!['copy','markdown'].includes(action))invalid();return this.run(true,async t=>{const row=await t.get('meta',passportGrantId(grantId));if(!validatePassportRow(row)||row.kind!=='grant'||grantState(row,this.clock())!=='active')throw new ArchiveError('MEMORY_DENIED');const at=iso(this.clock());row.useCount++;row.lastUsedAt=at;if(row.duration==='once')row.consumedAt=at;await t.put('meta',row);await this.prune(t);const auditId=this.uuid(),audit={id:passportAuditId(at,auditId),kind:'audit',version:PASSPORT_VERSION,auditId,grantId:row.grantId,consumer:row.consumer,purpose:row.purpose,resourceScope:PASSPORT_RESOURCE_SCOPE,profileId:row.profileId,permission:PASSPORT_PERMISSION,action,createdAt:at};await t.put('meta',audit);return {...row,state:grantState(row,this.clock())};});}
}
