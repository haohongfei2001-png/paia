const PREFIX='paia-recovery-draft:v1:';
const VERSION=1;
const DEFAULT_TTL_MS=7*24*60*60*1000;
const DEFAULT_MAX_BYTES=1250*1024;
const DEFAULT_MAX_DRAFTS=32;
const KINDS=new Set(['document','library_entry','topic_metadata','section_metadata','ai_presentation']);
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=512;
const clone=value=>JSON.parse(JSON.stringify(value));
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const key=(kind,ownerId)=>PREFIX+kind+':'+ownerId;

function rowValid(row){
 return plain(row)&&row.version===VERSION&&KINDS.has(row.kind)&&validId(row.ownerId)&&validId(row.token)&&
  Array.isArray(row.sourceRecordIds)&&row.sourceRecordIds.length<=200&&row.sourceRecordIds.every(validId)&&
  Number.isFinite(row.updatedAt)&&Number.isFinite(row.expiresAt)&&plain(row.operation);
}

export class RecoveryDraftStore{
 constructor(local,{clock=()=>Date.now(),ttlMs=DEFAULT_TTL_MS,maxBytes=DEFAULT_MAX_BYTES,maxDrafts=DEFAULT_MAX_DRAFTS}={}){
  if(!local?.get||!local?.set||!local?.remove)throw new TypeError('recovery storage unavailable');
  this.local=local;this.clock=clock;this.ttlMs=ttlMs;this.maxBytes=maxBytes;this.maxDrafts=maxDrafts;
 }
 async save({kind,ownerId,token,operation,sourceRecordIds=[]}){
  if(!KINDS.has(kind)||!validId(ownerId)||!validId(token)||!plain(operation)||!Array.isArray(sourceRecordIds)||sourceRecordIds.length>2000||sourceRecordIds.some(id=>!validId(id)))throw new TypeError('invalid recovery draft');
  const now=this.clock(),row={version:VERSION,kind,ownerId,token,operation:clone(operation),sourceRecordIds:[...new Set(sourceRecordIds)],updatedAt:now,expiresAt:now+this.ttlMs};
  if(bytes(row)>this.maxBytes)throw Object.assign(new Error('RECOVERY_DRAFT_TOO_LARGE'),{code:'RECOVERY_DRAFT_TOO_LARGE'});
  await this.local.set({[key(kind,ownerId)]:row});return clone(row);
 }
 async load(kind,ownerId){
  if(!KINDS.has(kind)||!validId(ownerId))return null;
  const k=key(kind,ownerId),value=(await this.local.get(k))?.[k];
  if(!rowValid(value)||value.kind!==kind||value.ownerId!==ownerId||value.expiresAt<=this.clock()){if(value!==undefined)await this.local.remove(k);return null;}
  return clone(value);
 }
 async clear(kind,ownerId,expectedToken=null){
  if(!KINDS.has(kind)||!validId(ownerId))return false;const k=key(kind,ownerId);
  if(expectedToken!==null){const value=(await this.local.get(k))?.[k];if(!rowValid(value)||value.token!==expectedToken)return false;}
  await this.local.remove(k);return true;
 }
 async prune(){
  const all=await this.local.get(null),rows=[],remove=[];
  for(const [k,row]of Object.entries(all||{})){if(!k.startsWith(PREFIX))continue;if(!rowValid(row)||row.expiresAt<=this.clock())remove.push(k);else rows.push([k,row]);}
  rows.sort((a,b)=>b[1].updatedAt-a[1].updatedAt);
  for(const [k]of rows.slice(this.maxDrafts))remove.push(k);
  if(remove.length)await this.local.remove([...new Set(remove)]);
  return {kept:Math.min(rows.length,this.maxDrafts),removed:new Set(remove).size};
 }
 async clearForSources(sourceIds){
  const ids=new Set((sourceIds||[]).filter(validId));if(!ids.size)return 0;
  const all=await this.local.get(null),remove=[];
  for(const [k,row]of Object.entries(all||{})){if(!k.startsWith(PREFIX)||!rowValid(row))continue;
   if(row.sourceRecordIds.some(id=>ids.has(id)))remove.push(k);
  }
  if(remove.length)await this.local.remove(remove);return remove.length;
 }
 async clearAll(){
  const all=await this.local.get(null),remove=Object.keys(all||{}).filter(k=>k.startsWith(PREFIX));
  if(remove.length)await this.local.remove(remove);return remove.length;
 }
}
export const recoveryDraftPrefix=PREFIX;
