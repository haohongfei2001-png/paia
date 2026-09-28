// Local Prompt reuse model. Callers supply an already-authorized complete Input
// projection. This module performs no storage, permission, reply, network,
// clipboard or provider-input access; source refs remain historical trace only.
import {MAX_MESSAGE_LENGTH} from './constants.js';
import {normalizeSearch,searchRank} from './search-service.js';

export class PromptReuseError extends Error {
 constructor(code='PROMPT_INVALID'){super(code);this.code=code;}
}
const fail=code=>{throw new PromptReuseError(code);};
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)
 &&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function object(value,required,optional=[]){
 if(!plain(value))fail();
 const descriptors=Object.getOwnPropertyDescriptors(value),allowed=new Set([...required,...optional]);
 if(required.some(key=>!Object.hasOwn(descriptors,key))
  ||Reflect.ownKeys(descriptors).some(key=>typeof key!=='string'||!allowed.has(key)
    ||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable))fail();
 return value;
}
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const revision=value=>Number.isSafeInteger(value)&&value>=1;
const inputRevision=value=>Number.isSafeInteger(value)&&value>=0;
const text=value=>typeof value==='string'&&value.length<=MAX_MESSAGE_LENGTH;
const order=(a,b)=>a<b?-1:a>b?1:0;
const frozen=items=>Object.freeze(items.map(item=>Object.freeze(item)));
const CONTROL=new Set(['继续','继续吧','好的继续','好','好的','好的谢谢','谢谢','谢谢你',
 '感谢','明白','收到','可以','是','否','对','不','ok','okay','yes','no','thanks',
 'thankyou','continue','goon','gotit','proceed']);

// A finite exclusion rule, not semantic inference or learned usefulness.
// Fixed templates remain an explicit user choice, including a short control.
export function isReusablePromptCandidate(value){
 if(!text(value))fail();
 const compact=normalizeSearch(value).replace(/[\s\p{P}]/gu,'');
 return /\p{L}/u.test(compact)&&!CONTROL.has(compact);
}
function sourceTime(value){
 if(value===null)return null;
 if(typeof value!=='string'||value.length>40||!/^\d{4}-\d\d-\d\dT/.test(value)
  ||!/(Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))fail();
 return value;
}
function ref(value){
 object(value,['kind','id','revision','sourceId']);
 if(value.kind!=='input'||!id(value.id)||!inputRevision(value.revision)||!id(value.sourceId))fail();
 return {kind:'input',id:value.id,revision:value.revision,sourceId:value.sourceId};
}
function refs(values){
 if(!Array.isArray(values))fail();
 const seen=new Set(),versions=new Map(),out=[];
 for(const value of values){
  const item=ref(value),identity=JSON.stringify([item.id,item.sourceId]);
  if(seen.has(identity)||versions.has(item.id)&&versions.get(item.id)!==item.revision)fail();
  seen.add(identity);versions.set(item.id,item.revision);out.push(item);
 }
 return frozen(out.sort((a,b)=>order(a.id,b.id)||order(a.sourceId,b.sourceId)));
}
function options(value,complete=false){
 object(value,complete?['complete']:[],['query','limit','offset']);
 const query=value.query??'',limit=value.limit??50,offset=value.offset??0;
 if(complete&&value.complete!==true||typeof query!=='string'||query.length>1000
  ||!Number.isSafeInteger(limit)||limit<1||limit>100
  ||!Number.isSafeInteger(offset)||offset<0)fail();
 return {query,limit,offset};
}
function page(items,{query,limit,offset},compare){
 const matched=query.trim()?items.filter(item=>searchRank(query,'',item.text)>=0):items;
 matched.sort(compare);
 return Object.freeze({items:Object.freeze(matched.slice(offset,offset+limit)),
  total:matched.length,offset,nextOffset:offset+limit<matched.length?offset+limit:null});
}

export function buildPromptCandidates(rows,settings){
 const settingsCopy=options(settings,true);if(!Array.isArray(rows))fail();
 const unique=new Map(),groups=new Map();
 for(const row of rows){
  object(row,['kind','role','id','revision','sourceId','text','sourceSentAt','eligible'],['sourceIds']);
  if(row.kind!=='input'||!['user','assistant','system','tool'].includes(row.role)
   ||!id(row.id)||!inputRevision(row.revision)||!id(row.sourceId)||!text(row.text)
   ||typeof row.eligible!=='boolean')fail();
  const time=sourceTime(row.sourceSentAt),sourceIds=row.sourceIds??[row.sourceId];
  if(!Array.isArray(sourceIds)||!sourceIds.length||sourceIds.some(value=>!id(value))
   ||new Set(sourceIds).size!==sourceIds.length||!sourceIds.includes(row.sourceId))fail();
  const canonicalSources=[...sourceIds].sort(order);
  const previous=unique.get(row.id);
  // Repeated pages cannot inflate frequency or disguise conflicting revisions.
  if(previous){
   if(previous.revision!==row.revision||previous.sourceId!==row.sourceId
    ||previous.text!==row.text||previous.role!==row.role||previous.eligible!==row.eligible
    ||previous.sourceSentAt!==time
    ||JSON.stringify(previous.sourceIds)!==JSON.stringify(canonicalSources))fail();
   continue;
  }
  unique.set(row.id,{...row,sourceIds:canonicalSources,sourceSentAt:time});
  if(!row.eligible||row.role!=='user'||!isReusablePromptCandidate(row.text))continue;
  // Exact original text only: whitespace/code/negations are not merged by search
  // normalization. No body clipping, auto-rewrite or generated template.
  let group=groups.get(row.text);
  if(!group){group={text:row.text,sourceRefs:[],frequency:0,lastSourceSentAt:null};groups.set(row.text,group);}
  group.frequency++;
  for(const sourceId of canonicalSources)
   group.sourceRefs.push({kind:'input',id:row.id,revision:row.revision,sourceId});
  if(time&&(group.lastSourceSentAt===null
    ||Date.parse(time)>Date.parse(group.lastSourceSentAt)))group.lastSourceSentAt=time;
 }
 const items=[...groups.values()].map(group=>{
  const sourceRefs=refs(group.sourceRefs);
  return Object.freeze({kind:'candidate',id:'prompt-candidate:'+sourceRefs[0].id,
   text:group.text,frequency:group.frequency,lastSourceSentAt:group.lastSourceSentAt,sourceRefs});
 });
 return page(items,settingsCopy,(a,b)=>b.frequency-a.frequency
  ||(Date.parse(b.lastSourceSentAt)||0)-(Date.parse(a.lastSourceSentAt)||0)||order(a.id,b.id));
}
function active(value){
 object(value,['kind','id','revision','lifecycle','text','pinned','sourceRefs']);
 if(value.kind!=='template'||!id(value.id)||!revision(value.revision)
  ||value.lifecycle!=='active'||!text(value.text)||!value.text.trim()
  ||typeof value.pinned!=='boolean')fail();
 return {kind:'template',id:value.id,revision:value.revision,lifecycle:'active',
  text:value.text,pinned:value.pinned,sourceRefs:refs(value.sourceRefs)};
}
function expected(value,current){
 if(!revision(value)||value!==current.revision)fail('PROMPT_STALE');
 if(current.revision===Number.MAX_SAFE_INTEGER)fail();
}
export function createPromptTemplate(value){
 object(value,['id','text'],['sourceRefs','pinned']);
 if(!id(value.id)||!text(value.text)||!value.text.trim()
  ||value.pinned!==undefined&&typeof value.pinned!=='boolean')fail();
 return Object.freeze({kind:'template',id:value.id,revision:1,lifecycle:'active',
  text:value.text,pinned:value.pinned??true,sourceRefs:refs(value.sourceRefs??[])});
}
export function editPromptTemplate(value,change){
 const current=active(value);object(change,['expectedRevision'],['text','pinned']);
 expected(change.expectedRevision,current);
 if(!Object.hasOwn(change,'text')&&!Object.hasOwn(change,'pinned'))fail();
 if(Object.hasOwn(change,'text')&&(!text(change.text)||!change.text.trim())
  ||Object.hasOwn(change,'pinned')&&typeof change.pinned!=='boolean')fail();
 const body=change.text??current.text,pinned=change.pinned??current.pinned;
 return Object.freeze({...current,revision:current.revision
  +(body!==current.text||pinned!==current.pinned?1:0),text:body,pinned});
}
export function removePromptTemplate(value,change){
 const current=active(value);object(change,['expectedRevision']);expected(change.expectedRevision,current);
 // This is a template tombstone, never a Source deletion command.
 return Object.freeze({kind:'template',id:current.id,revision:current.revision+1,lifecycle:'removed'});
}
export function promptTemplatePage(values,settings={}){
 const settingsCopy=options(settings);if(!Array.isArray(values))fail();
 const seen=new Set(),items=[];
 for(const value of values){
  object(value,['kind','id','revision','lifecycle'],['text','pinned','sourceRefs']);
  if(value.lifecycle==='removed'){
   object(value,['kind','id','revision','lifecycle']);
   if(value.kind!=='template'||!id(value.id)||!revision(value.revision))fail();
  }else items.push(Object.freeze(active(value)));
  if(seen.has(value.id))fail();seen.add(value.id);
 }
 return page(items,settingsCopy,(a,b)=>Number(b.pinned)-Number(a.pinned)||order(a.id,b.id));
}
