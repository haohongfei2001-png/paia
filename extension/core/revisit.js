import {ArchiveError} from './constants.js';
import {searchExcerpt} from './search-service.js';

export const REVISIT_VERSION=1;
export const REVISIT_ROW='revisit:v1';
export const REVISIT_OLD_DAYS=90;
const MAX_NEW_SCAN=400,MAX_OLD_SCAN=1200,RESURFACE_LIMIT=4;
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const iso=value=>new Date(value).toISOString();
const validRow=row=>!!row&&row.id===REVISIT_ROW&&row.version===REVISIT_VERSION&&Number.isSafeInteger(row.lastBlockSequence)&&row.lastBlockSequence>=0&&Number.isFinite(Date.parse(row.lastSeenAt));
const dayKey=now=>new Date(now).toISOString().slice(0,10);
const seed=text=>{let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export function selectResurface(items,day,limit=RESURFACE_LIMIT){
 const preferred=items.filter(x=>x.meaningful),fallback=items.filter(x=>!x.meaningful),pool=(preferred.length>=limit?preferred:[...preferred,...fallback]).sort((a,b)=>String(a.sourceSentAt||'').localeCompare(String(b.sourceSentAt||''))||String(a.id).localeCompare(String(b.id)));
 if(!pool.length)return [];
 const count=Math.min(limit,pool.length),offset=seed(day)%pool.length,out=[];for(let i=0;i<count;i++)out.push(pool[(offset+i)%pool.length]);return out;
}

async function inputDTO(store,t,ix,filterState,{oldCutoff=null}={}){
 if(!ix||ix.excluded)return null;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.excluded||b.branchStatus)return null;
 if(await store.isFiltered(t,b,filterState))return null;
 const source=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null,sourceSentAt=ix.sourceSentAt||source?.sourceSentAt||null,at=Date.parse(sourceSentAt||'');
 if(oldCutoff!==null&&(!Number.isFinite(at)||at>oldCutoff))return null;
 const text=b.libraryText??source?.originalText??'',doc=(await t.get('documents',b.documentId))?.value,meta=await t.get('inputStates',b.id),meaningful=(meta?.contentRevision||0)>0||(await t.count('dependencies','byInput',b.id))>0;
 return {kind:'input',id:b.id,documentId:b.documentId,title:doc?.userTitle||doc?.originalConversationTitle||'独立整理文档',snippet:searchExcerpt(text,'',240),sourceSentAt,meaningful};
}

async function newInputs(store,t,marker,filterState){
 if(!marker)return {count:0,truncated:false,items:[]};
 const range=IDBKeyRange.lowerBound(marker.lastBlockSequence),items=[];let cursor=null,scanned=0,visible=0,truncated=false;
 do{const page=await t.rangePage('blockIndex','bySequence',range,cursor,Math.min(100,MAX_NEW_SCAN-scanned));if(!page.rows.length)break;for(const {value:ix}of page.rows){scanned++;const item=await inputDTO(store,t,ix,filterState);if(!item)continue;visible++;items.push(item);if(items.length>5)items.shift();}cursor=page.next;if(scanned>=MAX_NEW_SCAN&&cursor!==null){truncated=true;break;}}while(cursor!==null&&scanned<MAX_NEW_SCAN);
 return {count:visible,truncated,items:items.reverse()};
}

async function oldInputs(store,t,filterState,now){
 const cutoff=now-REVISIT_OLD_DAYS*86400000,candidates=[];let cursor=null,scanned=0,truncated=false;
 do{const page=await t.rangePage('blockIndex','bySequence',null,cursor,Math.min(100,MAX_OLD_SCAN-scanned),'prev');if(!page.rows.length)break;for(const {value:ix}of page.rows){scanned++;const item=await inputDTO(store,t,ix,filterState,{oldCutoff:cutoff});if(item)candidates.push(item);}cursor=page.next;if(candidates.length>=28)break;if(scanned>=MAX_OLD_SCAN&&cursor!==null){truncated=true;break;}}while(cursor!==null&&scanned<MAX_OLD_SCAN);
 return {items:selectResurface(candidates,dayKey(now)),truncated};
}

export class RevisitService {
 constructor(store,{clock=()=>Date.now()}={}){this.store=store;this.clock=clock;}
 async status(){
  const now=this.clock(),base=await this.store.run(()=>this.store.repository.transaction(false,async t=>{const raw=await t.get('meta',REVISIT_ROW),marker=validRow(raw)?raw:null,sequence=await t.get('meta','sequence'),filterState=await t.get('meta','smart-filter'),fresh=await newInputs(this.store,t,marker,filterState),old=await oldInputs(this.store,t,filterState,now);return {marker,anchor:{blockSequence:Number.isSafeInteger(sequence?.blocks)?sequence.blocks:0},fresh,old};}));
  const ai=await this.store.aiPresentationStatus().catch(()=>({topics:[]})),topics=(ai?.topics||[]).filter(t=>Number.isSafeInteger(t.pendingEntryCount)&&t.pendingEntryCount>0).sort((a,b)=>b.pendingEntryCount-a.pendingEntryCount||String(a.name).localeCompare(String(b.name))).slice(0,6).map(t=>({topicId:t.topicId,name:t.name||'未命名主题',pendingEntryCount:t.pendingEntryCount,hasPresentation:!!t.presentation}));
  return {version:REVISIT_VERSION,firstRun:!base.marker,lastSeenAt:base.marker?.lastSeenAt||null,anchor:base.anchor,newInputs:base.fresh,topicUpdates:topics,resurface:base.old.items,resurfaceTruncated:base.old.truncated,localOnly:true,storesBody:false};
 }
 async mark({blockSequence}={}){
  if(!Number.isSafeInteger(blockSequence)||blockSequence<0)invalid();const now=this.clock();return this.store.run(()=>this.store.repository.transaction(true,async t=>{const sequence=await t.get('meta','sequence'),current=Number.isSafeInteger(sequence?.blocks)?sequence.blocks:0;if(blockSequence>current)invalid();const row={id:REVISIT_ROW,kind:'revisit_state',version:REVISIT_VERSION,lastBlockSequence:blockSequence,lastSeenAt:iso(now)};await t.put('meta',row);return {ok:true,lastSeenAt:row.lastSeenAt,lastBlockSequence:blockSequence};},['meta']));
 }
}
