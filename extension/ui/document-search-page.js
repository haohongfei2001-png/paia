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
