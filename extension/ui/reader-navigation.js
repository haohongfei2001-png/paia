// One same-URL AppShell route and history coordinator for roots, Reader and Revisit.
import {appShellRoute,presentAppShell} from './app-shell-state.js';
import {RouteHistory,validRoute,routeViews as views} from './route-history.js';
export const requestNavigation=detail=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail}));
export function installReaderNavigation({navigate,current,captureNavigator=()=>null,restoreNavigator=()=>{},present=(route,options)=>presentAppShell(document,route,options)}){
 let applying=false,ready=false;
 const route=()=>appShellRoute(current(),captureNavigator());
 const valid=validRoute,historyRoutes=new RouteHistory();let lastRoute=null;
 const commit=({replace=false,anchor}={})=>{
  if(applying)return;const next=route(),old=history.state?.paiaReader;if(anchor!==undefined)next.anchor=anchor;
  if(ready&&lastRoute===JSON.stringify(next))return;lastRoute=JSON.stringify(next);
  const state={...(history.state?.paiaRevisitWindow?{paiaRevisitWindow:history.state.paiaRevisitWindow}:{}),paiaReader:historyRoutes.encode(next,{reuseKey:!ready||replace?old?.sessionKey:null}),paiaShell:{version:2,view:next.view,returnTo:old?.view||history.state?.paiaShell?.returnTo||null}};
  history[!ready||replace?'replaceState':'pushState'](state,'',location.href);ready=true;
 };
 document.addEventListener('paia:navigate',event=>{const r=event.detail;if(valid(r))void navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,anchor:r.anchor,returnTo:r.returnTo,searchQuery:typeof r.searchQuery==='string'&&r.searchQuery.length<=1000?r.searchQuery:undefined});});
 window.addEventListener('popstate',async event=>{
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);if(modal){if(modal.dispatchEvent(new Event('paia:request-close',{cancelable:true})))modal.close();history.pushState({...history.state,paiaReader:historyRoutes.encode(route())},'',location.href);return;}
  const r=historyRoutes.decode(event.state?.paiaReader)||{view:views.has(event.state?.paiaShell?.view)?event.state.paiaShell.view:'library'};
  applying=true;try{restoreNavigator(r.navigator);const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,history:true});if(ok===false)history.pushState({paiaReader:historyRoutes.encode(route())},'',location.href);}finally{applying=false;lastRoute=null;}
 });
 const restore=async()=>{const r=historyRoutes.decode(history.state?.paiaReader);if(valid(r)&&(r.documentId||r.view!=='library'||r.searchQuery)){applying=true;try{restoreNavigator(r.navigator);await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,restore:true});}finally{applying=false;lastRoute=null;}}commit({replace:true});};
 return {commit,restore,present:options=>present(route(),options)};
}
