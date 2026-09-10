// Input search scans bounded database pages. Empty intermediate pages are progress,
// not a final "no results" answer. A newer query cancels continuation immediately.
export async function findInputPage({query,cursor=null,read,isCurrent=()=>true,onProgress=()=>{},ranked=false}){
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
