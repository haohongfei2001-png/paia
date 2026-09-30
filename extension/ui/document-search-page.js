// Reader search is a projection. Never mix pages across archive generations.
export function resetDocumentSearchPage(state,{keepActive=false}={}){
 state.cursor=null;state.history=[];state.nextCursor=null;state.items=[];state.generation=null;
 state.complete=true;state.indexing=false;state.loading=false;state.error=false;state.unsaved=false;
 if(!keepActive)state.activeInputId=null;
}
export async function readDocumentSearchPage({read,cursor=null,generation=null,isCurrent=()=>true}){
 let at=cursor,expected=generation;const seen=new Set();
 for(let scanned=0;scanned<=50;scanned++){
  const key=JSON.stringify(at);if(seen.has(key))throw Error('INVALID_SEARCH_CURSOR');seen.add(key);
  const page=await read(at);if(!isCurrent())return null;
  if(page.changed||expected!==null&&page.generation!==expected)return {restart:true};
  expected??=page.generation;
  if(page.items.length||!page.nextCursor)return page;
  at=page.nextCursor;
 }
 throw Error('INVALID_SEARCH_CURSOR');
}

// Rebase a page-navigation intent when a shared archive generation advances.
// Publish only the requested page reached entirely through fresh cursors; do
// not silently turn a Next click into page one or keep retrying indefinitely.
export async function readDocumentSearchWindow({read,cursor=null,generation=null,history=[],isCurrent=()=>true,onRestart=()=>{},maxReads=100,maxRebuildPages=20}){
 let reads=0;const boundedRead=at=>{if(++reads>maxReads)throw Error('SEARCH_CHANGED');return read(at);};
 const first=await readDocumentSearchPage({read:boundedRead,cursor,generation,isCurrent});
 if(!first)return null;
 if(!first.restart)return {page:first,cursor,history};
 onRestart();const targetPage=history.length;if(targetPage>=maxRebuildPages)throw Error('SEARCH_CHANGED');
 for(let attempt=0;attempt<2;attempt++){
  let at=null,expected=null;const freshHistory=[];
  for(let index=0;index<=targetPage;index++){
   const page=await readDocumentSearchPage({read:boundedRead,cursor:at,generation:expected,isCurrent});
   if(!page)return null;if(page.restart)break;
   expected=page.generation;
   if(index===targetPage||!page.nextCursor)return {page,cursor:at,history:freshHistory,restarted:true};
   freshHistory.push(at);at=page.nextCursor;
  }
 }
 throw Error('SEARCH_CHANGED');
}
