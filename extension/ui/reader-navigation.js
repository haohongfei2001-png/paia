import './ux-r6-settings.js';

// A single same-URL history coordinator, shared by roots, Reader and Revisit.
// Search text and transient filters stay in the owning page's memory.
const views=new Set(['library','archive','excluded','legacy','thoughts','memory','settings','revisit']);
export const requestNavigation=detail=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail}));
export function installReaderNavigation({navigate,current}){
 let applying=false,ready=false;
 const route=()=>{const s=current();return {view:s.view,documentId:s.documentId||null,topicId:s.topicId||null,contextInputId:s.contextInputId||null,returnTo:s.returnTo||null};};
 const valid=r=>r&&views.has(r.view)&&[r.documentId,r.contextInputId,r.topicId].every(x=>x==null||typeof x==='string'&&x.length<=200);
 const commit=({replace=false}={})=>{
  if(applying)return;const next=route(),old=history.state?.paiaReader;
  if(ready&&JSON.stringify(old)===JSON.stringify(next))return;
  const state={...(history.state?.paiaRevisitWindow?{paiaRevisitWindow:history.state.paiaRevisitWindow}:{}),paiaReader:next,paiaShell:{version:1,view:next.view,returnTo:old?.view||history.state?.paiaShell?.returnTo||null}};
  history[!ready||replace?'replaceState':'pushState'](state,'',location.href);ready=true;
 };
 document.addEventListener('paia:navigate',event=>{const r=event.detail;if(valid(r))void navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,anchor:r.anchor,returnTo:r.returnTo,searchQuery:typeof r.searchQuery==='string'&&r.searchQuery.length<=1000?r.searchQuery:undefined});});
 window.addEventListener('popstate',async event=>{
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);if(modal){if(modal.dispatchEvent(new Event('paia:request-close',{cancelable:true})))modal.close();history.pushState({...history.state,paiaReader:route()},'',location.href);return;}
  const r=valid(event.state?.paiaReader)?event.state.paiaReader:{view:views.has(event.state?.paiaShell?.view)?event.state.paiaShell.view:'library'};
  applying=true;try{const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,returnTo:r.returnTo,history:true});if(ok===false)history.pushState({paiaReader:route()},'',location.href);}finally{applying=false;}
 });
 const restore=async()=>{const r=history.state?.paiaReader;if(valid(r)&&(r.documentId||r.view!=='library')){applying=true;try{await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,returnTo:r.returnTo,restore:true});}finally{applying=false;}}commit({replace:true});};
 return {commit,restore};
}
