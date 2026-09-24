// One same-URL AppShell route and history coordinator for roots, Reader and Revisit.
import {appShellRoute,presentAppShell} from './app-shell-state.js';
const views=new Set(['library','archive','excluded','legacy','thoughts','memory','settings','revisit']);
export const requestNavigation=detail=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail}));
export function installReaderNavigation({navigate,current,captureNavigator=()=>null,restoreNavigator=()=>{}}){
 let applying=false,ready=false;
 const route=()=>appShellRoute(current(),captureNavigator());
 const navValid=value=>value==null||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['expanded','loaded','scrollTop','narrowCollapsed','sourceScope'].includes(k))&&Array.isArray(value.expanded)&&value.expanded.length<=100&&value.expanded.every(x=>typeof x==='string'&&x.length<=2048)&&(value.loaded===undefined||Array.isArray(value.loaded)&&value.loaded.length<=100&&value.loaded.every(x=>Array.isArray(x)&&x.length===2&&typeof x[0]==='string'&&x[0].length<=4096&&Number.isInteger(x[1])&&x[1]>=0&&x[1]<=10000))&&Number.isFinite(value.scrollTop)&&value.scrollTop>=0&&typeof value.narrowCollapsed==='boolean'&&(value.sourceScope==null||typeof value.sourceScope==='string'&&value.sourceScope.length<=80);
 const projectValid=value=>value==null||typeof value==='string'&&value.length<=200||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['providerKey','namespace','projectId'].includes(k))&&['providerKey','namespace','projectId'].every(k=>typeof value[k]==='string'&&value[k].length>0&&value[k].length<=200);
 const valid=r=>r&&views.has(r.view)&&[r.documentId,r.contextInputId,r.topicId,r.sourceKey].every(x=>x==null||typeof x==='string'&&x.length<=200)&&projectValid(r.projectRef)&&navValid(r.navigator)&&(r.searchQuery===undefined||typeof r.searchQuery==='string'&&r.searchQuery.length<=1000)&&(r.sort==null||['asc','desc'].includes(r.sort))&&(r.anchor==null||!!r.anchor&&typeof r.anchor==='object'&&typeof r.anchor.inputId==='string'&&r.anchor.inputId.length<=200&&Number.isInteger(r.anchor.offset)&&r.anchor.offset>=0&&r.anchor.offset<=1000000);
 const commit=({replace=false,anchor}={})=>{
  if(applying)return;const next=route(),old=history.state?.paiaReader;if(anchor!==undefined)next.anchor=anchor;
  if(ready&&JSON.stringify(old)===JSON.stringify(next))return;
  const state={...(history.state?.paiaRevisitWindow?{paiaRevisitWindow:history.state.paiaRevisitWindow}:{}),paiaReader:next,paiaShell:{version:1,view:next.view,returnTo:old?.view||history.state?.paiaShell?.returnTo||null}};
  history[!ready||replace?'replaceState':'pushState'](state,'',location.href);ready=true;
 };
 document.addEventListener('paia:navigate',event=>{const r=event.detail;if(valid(r))void navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,anchor:r.anchor,returnTo:r.returnTo,searchQuery:typeof r.searchQuery==='string'&&r.searchQuery.length<=1000?r.searchQuery:undefined});});
 window.addEventListener('popstate',async event=>{
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);if(modal){if(modal.dispatchEvent(new Event('paia:request-close',{cancelable:true})))modal.close();history.pushState({...history.state,paiaReader:route()},'',location.href);return;}
  const r=valid(event.state?.paiaReader)?event.state.paiaReader:{view:views.has(event.state?.paiaShell?.view)?event.state.paiaShell.view:'library'};
  applying=true;try{restoreNavigator(r.navigator);const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,history:true});if(ok===false)history.pushState({paiaReader:route()},'',location.href);}finally{applying=false;}
 });
 const restore=async()=>{const r=history.state?.paiaReader;if(valid(r)&&(r.documentId||r.view!=='library'||r.searchQuery)){applying=true;try{restoreNavigator(r.navigator);await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,restore:true});}finally{applying=false;}}commit({replace:true});};
 return {commit,restore,present:options=>presentAppShell(document,route(),options)};
}
