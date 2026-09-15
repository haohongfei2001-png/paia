import {revisitTopicDeltas} from './organizer/ai-presentation.js';
import {ArchiveError} from './constants.js';
import {searchExcerpt} from './search-service.js';
import {VISIT_ROW,readRevisitPolicy,inputRevisitExcluded,topicRevisitExcluded} from './reader-state.js';

// v1 is read-only historical evidence; never interpret its marker as a read position.
export const REVISIT_VERSION=2,REVISIT_ROW='revisit:v1';
export const REVISIT_OLD_DAYS=90;
const MAX_NEW_SCAN=400,MAX_OLD_SCAN=1200,RESURFACE_LIMIT=4;
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const seed=text=>{let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function selectResurface(items,day,limit=RESURFACE_LIMIT){
 const preferred=items.filter(x=>x.meaningful),fallback=items.filter(x=>!x.meaningful),pool=(preferred.length>=limit?preferred:[...preferred,...fallback]).sort((a,b)=>String(a.sourceSentAt||'').localeCompare(String(b.sourceSentAt||''))||String(a.id).localeCompare(String(b.id)));
 if(!pool.length)return [];const count=Math.min(limit,pool.length),offset=seed(day)%pool.length;return Array.from({length:count},(_,i)=>pool[(offset+i)%pool.length]);
}
async function inputDTO(store,t,ix,filterState,policy,{oldCutoff=null,fresh=false}={}){
 if(!ix||ix.excluded)return null;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.excluded||b.branchStatus)return null;
 if(await store.isFiltered(t,b,filterState)||await inputRevisitExcluded(t,b,policy))return null;
 const source=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null;
 if(fresh&&source?.importedAt)return null; // Explicit history import is never unread debt.
 const sourceSentAt=ix.sourceSentAt||source?.sourceSentAt||null,at=Date.parse(sourceSentAt||'');
 if(oldCutoff!==null&&(!Number.isFinite(at)||at>oldCutoff))return null;
 const text=b.libraryText??source?.originalText??'',doc=(await t.get('documents',b.documentId))?.value,meta=await t.get('inputStates',b.id),meaningful=(meta?.contentRevision||0)>0||(await t.count('dependencies','byInput',b.id))>0;
 return {kind:'input',id:b.id,documentId:b.documentId,title:doc?.userTitle||doc?.originalConversationTitle||'独立整理文档',snippet:searchExcerpt(text,'',240),sourceSentAt,meaningful};
}
async function newInputs(store,t,start,end,filterState,policy){
 const items=[];if(start>=end)return {count:0,truncated:false,items};
 const range=IDBKeyRange.bound(start,end,false,true);let cursor=null,scanned=0,visible=0,truncated=false;
 do{const page=await t.rangePage('blockIndex','bySequence',range,cursor,Math.min(100,MAX_NEW_SCAN-scanned),'prev');for(const {value:ix}of page.rows){scanned++;const item=await inputDTO(store,t,ix,filterState,policy,{fresh:true});if(item){visible++;if(items.length<5)items.push(item);}}cursor=page.next;truncated=cursor!==null&&scanned>=MAX_NEW_SCAN;}while(cursor!==null&&scanned<MAX_NEW_SCAN);
 return {count:visible,truncated,items};
}
async function oldInputs(store,t,filterState,policy,now,start){
 if(!policy.oldContent)return {items:[],truncated:false};
 const candidates=[];let cursor=null,scanned=0,truncated=false;
 do{const page=await t.rangePage('blockIndex','bySequence',null,cursor,Math.min(100,MAX_OLD_SCAN-scanned),'prev');for(const {value:ix}of page.rows){scanned++;if(ix.sequence>=start)continue;const item=await inputDTO(store,t,ix,filterState,policy,{oldCutoff:now-REVISIT_OLD_DAYS*86400000});if(item)candidates.push(item);}cursor=page.next;if(candidates.length>=28)break;truncated=cursor!==null&&scanned>=MAX_OLD_SCAN;}while(cursor!==null&&scanned<MAX_OLD_SCAN);
 return {items:selectResurface(candidates,new Date(now).toISOString().slice(0,10)),truncated};
}
export class RevisitService {
 constructor(store,{clock=()=>Date.now()}={}){this.store=store;this.clock=clock;}
 async initialize(t){
  let row=await t.get('meta',VISIT_ROW);const sequence=(await t.get('meta','sequence'))?.blocks||0;
  if(row&&(row.version!==2||!integer(row.boundary)||!Array.isArray(row.windows)))invalid();
  if(!row){row={id:VISIT_ROW,version:2,boundary:sequence,lastOpenedEnd:sequence,windows:[],initializedAt:new Date(this.clock()).toISOString()};await t.put('meta',row);}
  return {row,sequence};
 }
 async open({windowId=null}={}){
  if(windowId!==null&&(typeof windowId!=='string'||windowId.length>100))invalid();
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const {row,sequence}=await this.initialize(t),saved=row.windows.find(x=>x.id===windowId);if(saved)return saved;
   const window={id:crypto.randomUUID(),start:Math.max(row.boundary,row.lastOpenedEnd),end:sequence,at:new Date(this.clock()).toISOString()};row.boundary=window.start;row.lastOpenedEnd=sequence;row.windows=[...row.windows,window].slice(-20);await t.put('meta',row);return window;
  },['meta']));
 }
 async close({windowId}={}){if(typeof windowId!=='string'||windowId.length>100)invalid();return this.store.run(()=>this.store.repository.transaction(true,async t=>{const {row}=await this.initialize(t),window=row.windows.find(x=>x.id===windowId);if(window){row.boundary=Math.max(row.boundary,window.end);row.windows=row.windows.filter(x=>x.id!==windowId);await t.put('meta',row);}return {ok:true};},['meta']));}
 async status({windowId=null,includeOld=false}={}){
  if(typeof includeOld!=='boolean'||windowId!==null&&(typeof windowId!=='string'||windowId.length>100))invalid();
  await this.store.run(()=>this.store.repository.transaction(true,t=>this.initialize(t),['meta']));
  // Build every exposed preview in one serialized snapshot after async work.
  // Concurrent policy changes or purge must never leave an older snippet behind.
  return this.store.run(()=>this.store.repository.transaction(false,async t=>{
   const now=this.clock(),row=await t.get('meta',VISIT_ROW),sequence=(await t.get('meta','sequence'))?.blocks||0,window=row.windows.find(x=>x.id===windowId),start=window?.start??row.boundary,end=window?.end??sequence,policy=await readRevisitPolicy(t),filter=await t.get('meta','smart-filter');
   const ai=await revisitTopicDeltas(this.store,t).catch(()=>({topics:[],unavailable:true}));
   const fresh=await newInputs(this.store,t,start,end,filter,policy),old=includeOld?await oldInputs(this.store,t,filter,policy,now,start):{items:[],truncated:false},topics=[];
   for(const topic of (ai?.topics||[]).filter(x=>x.pendingEntryCount>0).sort((a,b)=>b.pendingEntryCount-a.pendingEntryCount||String(a.topicId).localeCompare(String(b.topicId)))){
    if(await topicRevisitExcluded(t,topic.topicId,policy))continue;
    topics.push({topicId:topic.topicId,name:topic.name||'未命名主题',pendingEntryCount:topic.pendingEntryCount,hasPresentation:false,truncated:!!topic.truncated});if(topics.length===6)break;
   }
   return {version:2,firstRun:false,lastSeenAt:row.initializedAt,window:window||null,anchor:{blockSequence:sequence},newInputs:fresh,topicUpdates:topics,topicsUnavailable:!!ai.unavailable,topicsTruncated:!!ai.truncated,resurface:old.items,resurfaceTruncated:old.truncated,oldContent:policy.oldContent,localOnly:true,storesBody:false};
  }));
 }
 // Compatibility for an old trusted UI. Writes only v2 visit metadata, never v1
 // or a reading anchor. Current UX has no mark/read-all button.
 async mark({blockSequence}={}){if(!integer(blockSequence))invalid();return this.store.run(()=>this.store.repository.transaction(true,async t=>{const {row,sequence}=await this.initialize(t);if(blockSequence>sequence)invalid();row.boundary=Math.max(row.boundary,blockSequence);row.lastOpenedEnd=Math.max(row.lastOpenedEnd,blockSequence);await t.put('meta',row);return {ok:true,lastBlockSequence:row.boundary};},['meta']));}
}
