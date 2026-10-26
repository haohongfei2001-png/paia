// Input search scans bounded database pages. Empty intermediate pages are progress,
// not a final "no results" answer. A newer query cancels continuation immediately.
export async function findInputPage({query,cursor=null,read,isCurrent=()=>true,onProgress=()=>{},ranked=false,qualified=false}){
 if(qualified)return findQualifiedInputPage({query,cursor,read,isCurrent,onProgress,ranked});
 let next=cursor;
 for(;;){
  if(!isCurrent())return null;
  const page=await read({query,cursor:next,limit:50,...(ranked?{ranked:true}:{})});
  if(!isCurrent())return null;
  if(page.items.length||page.nextCursor===null)return page;
  if(ranked?(![0,1,2].includes(page.nextCursor?.phase)||next&&(page.nextCursor.phase<next.phase||page.nextCursor.phase===next.phase&&(page.nextCursor.offset??-1)<=(next.offset??-1))):(!Number.isSafeInteger(page.nextCursor)||page.nextCursor<0||next!==null&&page.nextCursor<=next))throw Error('INVALID_SEARCH_CURSOR');
  next=page.nextCursor;onProgress();
 }
}

const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
export const validInputSearchSnapshot=value=>exact(value,['version','generation','signature'])&&value.version===1&&Number.isSafeInteger(value.generation)&&value.generation>=0&&typeof value.signature==='string'&&/^[a-f0-9]{64}$/.test(value.signature);
const offset=value=>value===null||Number.isSafeInteger(value)&&value>=0;
export const validInputSearchCursor=value=>exact(value,['cursor','searchSnapshot'])&&validInputSearchSnapshot(value.searchSnapshot)&&(offset(value.cursor)||exact(value.cursor,['phase','offset'])&&[0,1,2].includes(value.cursor.phase)&&offset(value.cursor.offset));
async function findQualifiedInputPage({query,cursor,read,isCurrent,onProgress,ranked}){
 if(cursor!==null&&!validInputSearchCursor(cursor))throw Error('INVALID_SEARCH_CURSOR');
 let next=cursor?.cursor??null,snapshot=cursor?.searchSnapshot??null,start=next,restarted=false;
 for(;;){
  if(!isCurrent())return null;
  const page=await read({query,cursor:next,searchSnapshot:snapshot,qualified:true,limit:50,...(ranked?{ranked:true}:{})});
  if(!isCurrent())return null;
  if(page.changed){
   if(restarted)return {...page,items:[],nextCursor:null,pageCursor:null,restarted:true,restartRequired:true,complete:false};
   restarted=true;next=null;snapshot=null;start=null;onProgress();continue;
  }
  if(!validInputSearchSnapshot(page.searchSnapshot)||snapshot&&JSON.stringify(snapshot)!==JSON.stringify(page.searchSnapshot))throw Error('INVALID_SEARCH_SNAPSHOT');
  snapshot=page.searchSnapshot;
  const envelope=value=>({cursor:value,searchSnapshot:{...snapshot}});
  if(page.items.length||page.nextCursor===null)return {...page,nextCursor:page.nextCursor===null?null:envelope(page.nextCursor),pageCursor:envelope(start),restarted};
  if(ranked?(![0,1,2].includes(page.nextCursor?.phase)||next&&(page.nextCursor.phase<next.phase||page.nextCursor.phase===next.phase&&(page.nextCursor.offset??-1)<=(next.offset??-1))):(!Number.isSafeInteger(page.nextCursor)||page.nextCursor<0||next!==null&&page.nextCursor<=next))throw Error('INVALID_SEARCH_CURSOR');
  next=page.nextCursor;onProgress();
 }
}
