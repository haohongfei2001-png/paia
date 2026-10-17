import {historicalInstant,historicalDateBound} from './historical-time.js';
const ROOT='archive-year:v1:';
export const archiveYearPrefix=documentId=>ROOT+'row:'+encodeURIComponent(documentId)+':';
export const archiveYearMeta=documentId=>ROOT+'build:'+encodeURIComponent(documentId);
export function archiveYearInstant(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?historicalDateBound(value):historicalInstant(value);}
export function archiveYearKey(ix){const at=archiveYearInstant(ix.sourceSentAt);return archiveYearPrefix(ix.documentId)+(at===null?'1:':'0:'+String(at+8640000000000000).padStart(17,'0')+':')+String(ix.conversationOrder??1000001).padStart(12,'0')+':'+encodeURIComponent(ix.id);}
export async function syncArchiveYearIndex(t,previous,next,{building=false}={}){
 // Sort identity can remain equal when original timestamp spelling or the
 // null-order sentinel changes. The stored projection still carries those
 // exact fields, so only an identical projection may retain its authority.
 if(!building&&previous&&next&&archiveYearKey(previous)===archiveYearKey(next)&&!!previous.excluded===!!next.excluded&&previous.sourceSentAt===next.sourceSentAt&&previous.conversationOrder===next.conversationOrder)return;
 if(!building)for(const documentId of new Set([previous?.documentId,next?.documentId].filter(Boolean))){
  const id=archiveYearMeta(documentId),meta=await t.get('meta',id);if(!meta)continue;
  // The repository invokes this before removing/replacing the original row.
  // A removed partial-build cursor or last index retires only its disposable
  // checkpoint; subsequent bounded preparation establishes a new epoch.
  if(previous?.documentId===documentId&&next?.documentId!==documentId&&(!meta.complete&&meta.cursor===previous.id||await t.count('blockIndex','byDocument',documentId)===1))await t.delete('meta',id);
  else await t.put('meta',{...meta,revision:(meta.revision||0)+1});
 }
 if(previous?.documentId)await t.delete('meta',archiveYearKey(previous));
 if(next?.documentId&&!next.excluded)await t.put('meta',{id:archiveYearKey(next),inputId:next.id,documentId:next.documentId,sourceSentAt:next.sourceSentAt,conversationOrder:next.conversationOrder});
}
export async function advanceArchiveYearIndex(store,documentId){
 let ready=false;
 for(let batch=0;batch<4&&!ready;batch++){
  ready=await store.run(()=>store.repository.transaction(true,async t=>{
   // Match the original reader's absent-document result before creating any
   // disposable metadata. A stale route cannot invent a canonical document.
   if(!await t.get('documents',documentId))return true;
   const key=archiveYearMeta(documentId),meta=await t.get('meta',key)||{id:key,epoch:store.uuid(),revision:0};if(meta.complete)return true;
   const page=await t.indexPrimaryPage('blockIndex','byDocument',documentId,{after:meta?.cursor??null,limit:100});
   for(const {value}of page.rows)await syncArchiveYearIndex(t,null,value,{building:true});
   await t.put('meta',{...meta,complete:page.next===null,cursor:page.next});return page.next===null;
  }));
 }
 return ready;
}
export async function clearArchiveYearIndex(t){
 const range=IDBKeyRange.bound(ROOT,ROOT+'\uffff',false,true);let cursor=null;
 do{const page=await t.rangePage('meta',null,range,cursor,100);for(const {value}of page.rows)await t.delete('meta',value.id);cursor=page.next;}while(cursor);
}

export const archiveYearAuthority=meta=>meta?.epoch?meta.epoch+':'+(meta.revision||0):null;
