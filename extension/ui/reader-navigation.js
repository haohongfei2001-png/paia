// One same-URL AppShell route and history coordinator for roots, Reader and Revisit.
import {appShellRoute,presentAppShell} from './app-shell-state.js';
import {RouteHistory,validRoute,routeViews as views} from './route-history.js';
import {topicRootTarget,resolveTopicRootTarget} from './topic-root-target.js';
import {request} from './common.js';
import {readTopicRootSlots} from './topic-root-slots.js';
export const requestNavigation=detail=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail}));
export function installReaderNavigation({navigate,current,captureNavigator=()=>null,restoreNavigator=()=>{},captureSettings=()=>({}),restoreSettings=()=>{},present=(route,options)=>presentAppShell(document,route,options)}){
 let applying=false,ready=false;
 const route=()=>{const next=appShellRoute(current(),captureNavigator());return next.view==='settings'?{...next,...captureSettings()}:next;};
 const valid=validRoute,historyRoutes=new RouteHistory();let lastRoute=null;
 const commit=({replace=false,anchor,originKey}={})=>{
  if(applying)return;const next=route(),old=history.state?.paiaReader;if(anchor!==undefined)next.anchor=anchor;if(originKey!==undefined)next.originKey=originKey;
  if(ready&&lastRoute===JSON.stringify(next))return;lastRoute=JSON.stringify(next);
  const state={...(history.state?.paiaTopicRootSlots?{paiaTopicRootSlots:readTopicRootSlots().snapshot()}:{}),...(history.state?.paiaRevisitWindow?{paiaRevisitWindow:history.state.paiaRevisitWindow}:{}),paiaReader:historyRoutes.encode(next,{reuseKey:!ready||replace?old?.sessionKey:null}),paiaShell:{version:2,view:next.view,returnTo:old?.view||history.state?.paiaShell?.returnTo||null}};
  history[!ready||replace?'replaceState':'pushState'](state,'',location.href);ready=true;
 };
 document.addEventListener('paia:navigate',event=>{const r=event.detail;if(valid(r))void navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,anchor:r.anchor,returnTo:r.returnTo,searchQuery:typeof r.searchQuery==='string'&&r.searchQuery.length<=1000?r.searchQuery:undefined});});
 window.addEventListener('popstate',async event=>{
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);if(modal){if(modal.dispatchEvent(new Event('paia:request-close',{cancelable:true})))modal.close();history.pushState({...history.state,paiaReader:historyRoutes.encode(route())},'',location.href);return;}
  const r=historyRoutes.decode(event.state?.paiaReader)||{view:views.has(event.state?.paiaShell?.view)?event.state.paiaShell.view:'library'};
  applying=true;try{const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,applyNavigator:()=>restoreNavigator(r.navigator),returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,history:true});if(ok!==false&&r.view==='settings')restoreSettings(r);if(ok===false)history.pushState({paiaReader:historyRoutes.encode(route())},'',location.href);}finally{applying=false;lastRoute=null;}
 });
 const restore=async()=>{
  const target=topicRootTarget(location.href);let r=historyRoutes.decode(history.state?.paiaReader)||(target?{view:'thoughts',topicId:target.topicId}:null),targetReady=false;
  if(target&&r?.topicId===target.topicId){try{await request('GET_LIBRARY_FOUNDATION_STATUS');targetReady=await resolveTopicRootTarget(target,options=>request('GET_LIBRARY_SECTION_PROJECTION',{options}));}catch{}if(!targetReady)r={view:'thoughts',topicId:null};}
  if(valid(r)&&(r.documentId||r.view!=='library'||r.searchQuery)){applying=true;try{const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,applyNavigator:()=>restoreNavigator(r.navigator),returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,restore:true});if(ok!==false&&r.view==='settings')restoreSettings(r);if(ok!==false&&targetReady&&target.sectionId)document.dispatchEvent(new CustomEvent('paia:topic-root-target',{detail:target}));}finally{applying=false;lastRoute=null;}}
  commit({replace:true});
 };
 return {commit,restore,snapshot:route,present:options=>present(route(),options)};
}
