// Transaction-local observations are rebuildable metadata, never Source facts.
import {NAV_CATALOG,NAV_DIRTY,stringKey} from './read-projection-keys.js';
function signature(store,row){
 if(!row)return null;
 if(store==='documents')return [row.id,row.chatKey,row.libraryDisplay,row.value?.platform,row.value?.sourceConversationId,row.value?.userTitle,row.value?.originalConversationTitle];
 if(row.id?.startsWith('ans:conversation:v1:'))return [row.conversationRef,row.membership,row.sourceStatus];
 if(row.id?.startsWith('ans:project:v1:'))return [row.projectRef,row.currentName,row.sourceStatus];
 return null;
}
export async function trackNavigationWrite(t,store,id,value){
 if(store!=='documents'&&!(store==='meta'&&/^ans:(conversation|project):v1:/.test(id||'')))return;
 if(t.navigationEnabled===undefined)t.navigationEnabled=!!await t.get('meta',NAV_CATALOG);
 if(!t.navigationEnabled)return;
 const before=await t.get(store,id);
 if(JSON.stringify(signature(store,before))===JSON.stringify(signature(store,value)))return;
 const row=value||before;if(!row)return;
 const kind=store==='documents'?'document':row.projectRef?'project':'conversation';
 const subject=kind==='document'?{documentId:id}:kind==='project'?{projectRef:row.projectRef}:{conversationRef:row.conversationRef};
 (t.navigationChanges??=new Map()).set(NAV_DIRTY+kind+':'+stringKey(id),{kind,...subject});
}
export async function flushNavigationWrites(t){
 if(!t.navigationChanges?.size)return;
 const state=await t.get('meta',NAV_CATALOG);if(!state)return;
 state.revision++;state.pending=true;
 for(const [id,subject]of t.navigationChanges)await t.put('meta',{id,version:1,...subject,revision:state.revision,cursor:null});
 await t.put('meta',state);
}
