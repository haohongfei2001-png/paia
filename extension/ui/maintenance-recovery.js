// Presentation-only recovery state. Observing a request never starts maintenance.
// Transport interruptions, stale versions and invalid requests are not evidence
// of damaged storage or a failed search index.
const states=new WeakMap();
function stateFor(document){
 if(!document||typeof document.getElementById!=='function')return null;
 let state=states.get(document);
 if(!state){state={dataFailure:false,indexFailure:false,integrityFailure:false,integrityRunning:false,dataRead:0,indexRead:0};states.set(document,state);}
 return state;
}
function render(document,state){
 const integrity=document.getElementById('product-diagnostics'),rebuild=document.getElementById('library-rebuild-search');
 if(integrity)integrity.hidden=!state.dataFailure&&!state.integrityFailure&&!state.integrityRunning;
 if(rebuild)rebuild.hidden=!state.indexFailure;
}
export function beginMaintenanceRead(type,fields={},document=globalThis.document){
 const state=stateFor(document);
 const channel=type==='GET_PAGE'?'data':type==='SEARCH_LIBRARY'||type==='REBUILD_LIBRARY_SEARCH'||type==='LIBRARY_INDEX_PAGE'&&typeof fields?.options?.query==='string'&&fields.options.query.trim()?'index':null;
 if(!state||!channel)return ()=>{};
 const sequence=++state[channel+'Read'];
 return ({data,error}={})=>{
  if(sequence!==state[channel+'Read'])return;
  if(error){if(error.code==='STORAGE_FAILED')state[channel+'Failure']=true;}
  else if(channel==='data'||type==='REBUILD_LIBRARY_SEARCH'||data?.indexing!==true)state[channel+'Failure']=false;
  render(document,state);
 };
}
export function presentSettingsRecovery({dataFailure,indexFailure,integrityFailure,integrityRunning}={},document=globalThis.document){
 const state=stateFor(document);if(!state)return;
 for(const channel of ['data','index']){
  const value=channel==='data'?dataFailure:indexFailure;
  if(typeof value==='boolean'){state[channel+'Failure']=value;state[channel+'Read']++;}
 }
 if(typeof integrityFailure==='boolean')state.integrityFailure=integrityFailure;
 if(typeof integrityRunning==='boolean')state.integrityRunning=integrityRunning;
 render(document,state);
}
