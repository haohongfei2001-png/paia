// Presentation-only recovery state. Observing a request never starts maintenance.
// Transport interruptions, stale versions and invalid requests are not evidence
// of damaged storage or a failed search index.
const states=new WeakMap();
function stateFor(document){
 if(!document||typeof document.getElementById!=='function')return null;
 let state=states.get(document);
 if(!state){state={dataFailure:false,indexFailure:false,integrityFailure:false,integrityRunning:false,dataRead:0,indexRead:0,repairRead:0,repairPending:0,repairStatus:null};states.set(document,state);}
 return state;
}
function render(document,state){
 const integrity=document.getElementById('product-diagnostics'),rebuild=document.getElementById('library-rebuild-search');
 if(integrity)integrity.hidden=!state.dataFailure&&!state.integrityFailure&&!state.integrityRunning;
 const warning=document.getElementById('settings-search-warning'),status=document.getElementById('library-maintenance-status');
 if(warning)warning.hidden=!state.indexFailure;
 if(rebuild){
  // Retain the original final control while its confirmation shows a genuine
  // request outcome. A queued acknowledgement does not claim completed repair.
  const open=rebuild.closest?.('dialog')?.open===true;
  rebuild.hidden=!state.indexFailure&&!(open&&state.repairStatus);
  rebuild.disabled=state.repairPending>0;
 }
 if(status){
  const chinese=document.documentElement?.lang==='zh-CN';
  const copy={pending:['正在请求修复搜索…','Requesting search repair…'],failed:['搜索修复尚未完成，请重试。已保存的正文仍保留。','Search repair has not completed. Retry; saved text is preserved.'],queued:['已请求更新本地搜索索引；搜索时会显示进度。','Local search index update requested; search will show its progress.']};
  const phase=state.repairPending>0?'pending':state.repairStatus;
  status.textContent=copy[phase]?.[chinese?0:1]||'';
  status.hidden=!phase;
 }
}
export function beginMaintenanceRead(type,fields={},document=globalThis.document){
 const state=stateFor(document);
 const channel=type==='GET_PAGE'?'data':type==='SEARCH_LIBRARY'||type==='REBUILD_LIBRARY_SEARCH'||type==='LIBRARY_INDEX_PAGE'&&typeof fields?.options?.query==='string'&&fields.options.query.trim()?'index':null;
 if(!state||!channel)return ()=>{};
 const sequence=++state[channel+'Read'],repair=type==='REBUILD_LIBRARY_SEARCH',repairSequence=repair?++state.repairRead:null;
 let settled=false;
 if(repair){state.repairPending++;state.repairStatus='pending';render(document,state);}
 return ({data,error}={})=>{
  if(settled)return;settled=true;
  if(repair)state.repairPending--;
  if(sequence!==state[channel+'Read']){
   if(repair&&repairSequence===state.repairRead&&state.repairStatus==='pending')state.repairStatus=error?'failed':'queued';
   render(document,state);return;
  }
  if(repair&&repairSequence===state.repairRead)state.repairStatus=error?'failed':'queued';
  else if(!error&&channel==='index'&&data?.indexing!==true)state.repairStatus=null;
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

export function refreshSettingsRecovery(document=globalThis.document){const state=stateFor(document);if(state)render(document,state);}
