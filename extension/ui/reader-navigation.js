// One same-URL AppShell route and history coordinator for roots, Reader and Revisit.
import {appShellRoute,presentAppShell} from './app-shell-state.js';
import {RouteHistory,validRoute,routeViews as views} from './route-history.js';
import {topicRootTarget,resolveTopicRootTarget} from './topic-root-target.js';
import {request} from './common.js';
import {readTopicRootSlots} from './topic-root-slots.js';
export const requestNavigation=detail=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail}));
export function installReaderNavigation({navigate,current,captureNavigator=()=>null,restoreNavigator=()=>{},captureSettings=()=>({}),restoreSettings=()=>{},present=(route,options)=>presentAppShell(document,route,options)}){
 let applying=false,ready=false,popIntent=0;
 const route=()=>{const next=appShellRoute(current(),captureNavigator());return next.view==='settings'?{...next,...captureSettings()}:next;};
 const valid=validRoute,historyRoutes=new RouteHistory();let lastRoute=null,committedState=null;
 const commit=({replace=false,anchor,originKey,checkpoint=false}={})=>{
  if(applying)return;const next=route(),old=history.state?.paiaReader;if(anchor!==undefined)next.anchor=anchor;if(originKey!==undefined)next.originKey=originKey;
  if(ready&&!checkpoint&&lastRoute===JSON.stringify(next))return;lastRoute=JSON.stringify(next);
  const previous=historyRoutes.decode(old);
  // Updating the same history entry must retain its existing Search owner.
  // A Reader push or a different owner never inherits this marker.
  const searchOwner=replace&&history.state?.paiaSearch===true&&previous&&['view','documentId','topicId','contextCard','contextInputId','sourceKey','projectRef'].every(key=>JSON.stringify(previous[key]??null)===JSON.stringify(next[key]??null));
  const state={...(searchOwner?{paiaSearch:true}:{}),...(history.state?.paiaTopicRootSlots?{paiaTopicRootSlots:readTopicRootSlots().snapshot()}:{}),...(history.state?.paiaRevisitWindow?{paiaRevisitWindow:history.state.paiaRevisitWindow}:{}),paiaReader:historyRoutes.encode(next,{reuseKey:!ready||replace?old?.sessionKey:null}),paiaShell:{version:2,view:next.view,returnTo:old?.view||history.state?.paiaShell?.returnTo||null}};
  history[!ready||replace?'replaceState':'pushState'](state,'',location.href);committedState=structuredClone(state);ready=true;
 };
 document.addEventListener('paia:navigate',event=>{const r=event.detail;if(valid(r))void navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,anchor:r.anchor,returnTo:r.returnTo,searchQuery:typeof r.searchQuery==='string'&&r.searchQuery.length<=1000?r.searchQuery:undefined});});
 // A refused pop must restore our own committed state, never the target event's
 // state. This preserves Search/Root metadata and its exact opaque session.
 const checkpoint=()=>{const previous=historyRoutes.decode(history.state?.paiaReader),next=route();if(!previous||!['view','documentId','topicId','contextCard','contextInputId','sourceKey','projectRef','originKey','returnTo'].every(key=>JSON.stringify(previous[key]??null)===JSON.stringify(next[key]??null)))return false;commit({replace:true,checkpoint:true});return true;};
 const restoreCommitted=()=>history.pushState(committedState?structuredClone(committedState):{paiaReader:historyRoutes.encode(route())},'',location.href);
 window.addEventListener('popstate',async event=>{
  const intent=++popIntent;
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);if(modal){if(modal.dispatchEvent(new Event('paia:request-close',{cancelable:true})))modal.close();history.pushState({...history.state,paiaReader:historyRoutes.encode(route())},'',location.href);return;}
  const saved=historyRoutes.decode(event.state?.paiaReader),target=saved?null:topicRootTarget(location.href);
  let r=saved||{view:views.has(event.state?.paiaShell?.view)?event.state.paiaShell.view:'library'},targetReady=false,targetCurrent=null,targetDeparture=null;
  // Native same-document links create a history entry without our route state.
  // Resolve its explicit target before committing a neutral fallback, which
  // would otherwise conceal the Section on the following reload.
  if(target){const url=location.href,state=JSON.stringify(history.state);targetDeparture=JSON.stringify(route());targetCurrent=()=>intent===popIntent&&location.href===url&&JSON.stringify(history.state)===state;try{await request('GET_LIBRARY_FOUNDATION_STATUS');targetReady=await resolveTopicRootTarget(target,options=>request('GET_LIBRARY_SECTION_PROJECTION',{options}));}catch{}if(!targetCurrent()||JSON.stringify(route())!==targetDeparture)return;r={view:'thoughts',topicId:targetReady?target.topicId:null};}
  let accepted=false;applying=true;try{const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,applyNavigator:()=>restoreNavigator(r.navigator),returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,history:true});if(target){const owner=current();if(!targetCurrent()||(ok===false?JSON.stringify(route())!==targetDeparture:owner.view!==r.view||(owner.topicId??null)!==(r.topicId??null)||owner.documentId))return;}if(ok!==false&&r.view==='settings')restoreSettings(r);if(ok===false)restoreCommitted();else{accepted=true;if(targetReady&&target.sectionId)document.dispatchEvent(new CustomEvent('paia:topic-root-target',{detail:target}));}}finally{applying=false;lastRoute=null;if(accepted)commit({replace:true});}
 });
 const restore=async()=>{
  const target=topicRootTarget(location.href);let r=historyRoutes.decode(history.state?.paiaReader)||(target?{view:'thoughts',topicId:target.topicId}:null),targetReady=false;
  if(target&&r?.topicId===target.topicId){try{await request('GET_LIBRARY_FOUNDATION_STATUS');targetReady=await resolveTopicRootTarget(target,options=>request('GET_LIBRARY_SECTION_PROJECTION',{options}));}catch{}if(!targetReady)r={view:'thoughts',topicId:null};}
  if(valid(r)&&(r.documentId||r.view!=='library'||r.searchQuery)){applying=true;try{const ok=await navigate(r.view,r.documentId||null,r.contextInputId||null,{topicId:r.topicId,contextCard:r.contextCard,originKey:r.originKey,applyNavigator:()=>restoreNavigator(r.navigator),returnTo:r.returnTo,searchQuery:r.searchQuery,sort:r.sort,anchor:r.anchor,restore:true});if(ok!==false&&r.view==='settings')restoreSettings(r);if(ok!==false&&targetReady&&target.sectionId)document.dispatchEvent(new CustomEvent('paia:topic-root-target',{detail:target}));}finally{applying=false;lastRoute=null;}}
  commit({replace:true});
 };
 return {commit,checkpoint,restore,snapshot:route,present:options=>present(route(),options)};
}
