import {ViewSessions} from './view-session.js';
import {validProvider} from '../core/read-projection-keys.js';
export const routeViews=new Set(['library','archive','excluded','legacy','thoughts','thought-compose','memory','settings','revisit']);
const ref=x=>x==null||typeof x==='string'&&x.length>0&&x.length<=200;
const navValid=value=>value==null||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['expanded','loaded','scrollTop','narrowCollapsed','sourceScope'].includes(k))&&Array.isArray(value.expanded)&&value.expanded.length<=100&&value.expanded.every(x=>typeof x==='string'&&x.length<=2048)&&(value.loaded===undefined||Array.isArray(value.loaded)&&value.loaded.length<=100&&value.loaded.every(x=>Array.isArray(x)&&x.length===2&&typeof x[0]==='string'&&x[0].length<=4096&&Number.isInteger(x[1])&&x[1]>=0&&x[1]<=10000))&&Number.isFinite(value.scrollTop)&&value.scrollTop>=0&&typeof value.narrowCollapsed==='boolean'&&(value.sourceScope==null||validProvider(value.sourceScope));
const projectValid=value=>value==null||typeof value==='string'&&value.length<=200||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['providerKey','namespace','projectId'].includes(k))&&['providerKey','namespace','projectId'].every(k=>typeof value[k]==='string'&&value[k].length>0&&value[k].length<=200);
const anchorValid=a=>a==null||!!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).every(k=>['documentId','inputId','revision','offset','sort','expanded','nearby','changed','at','position','title'].includes(k))&&ref(a.documentId)&&typeof a.inputId==='string'&&ref(a.inputId)&&Number.isInteger(a.offset)&&a.offset>=0&&a.offset<=1000000&&(a.revision==null||Number.isInteger(a.revision)&&a.revision>=0)&&(a.sort==null||['asc','desc'].includes(a.sort))&&(a.expanded==null||Array.isArray(a.expanded)&&a.expanded.length<=100&&a.expanded.every(x=>typeof x==='string'&&x.length<=2048))&&(a.nearby==null||typeof a.nearby==='boolean')&&(a.changed==null||typeof a.changed==='boolean')&&(a.at==null||typeof a.at==='string'&&a.at.length<=100)&&(a.title==null||typeof a.title==='string'&&a.title.length<=10000)&&(a.position==null||Array.isArray(a.position)&&a.position.length<=8&&a.position.every(x=>typeof x==='string'&&x.length<=2048||Number.isFinite(x)));
const legacyKeys=['view','documentId','contextInputId','topicId','returnTo','sourceKey','projectRef','searchQuery','sort','anchor','navigator','composeId','returnId'];
export function validRoute(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).every(k=>legacyKeys.includes(k))&&routeViews.has(r.view)&&[r.documentId,r.contextInputId,r.topicId,r.sourceKey].every(ref)&&(r.returnTo==null||routeViews.has(r.returnTo))&&projectValid(r.projectRef)&&navValid(r.navigator)&&(r.searchQuery===undefined||typeof r.searchQuery==='string'&&r.searchQuery.length<=1000)&&(r.sort==null||['asc','desc'].includes(r.sort))&&anchorValid(r.anchor)&&(r.view==='thought-compose'?composeRef(r.composeId)&&composeRef(r.returnId)&&!r.documentId&&!r.topicId&&!r.contextInputId:r.composeId==null&&r.returnId==null);}
const composeRef=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const persistedKeys=['view','documentId','contextInputId','topicId','returnTo','sourceKey','projectRef','sort','anchor','composeId','returnId'];
const cleanAnchor=a=>a?Object.fromEntries(Object.entries(a).filter(([key])=>['documentId','inputId','revision','offset','sort','expanded','nearby'].includes(key))):null;
const projection=route=>Object.fromEntries(persistedKeys.map(key=>[key,key==='anchor'?cleanAnchor(route.anchor):route[key]??null]));
// Query and Navigator extent are tab-local metadata. History holds only safe
// refs/anchors and an opaque key. Losing a session never creates or grants data.
export class RouteHistory {
 constructor(limit=64){this.sessions=new ViewSessions(limit);}
 encode(route,{reuseKey=null}={}){
  if(!validRoute(route))throw Error('INVALID_VIEW_ROUTE');
  const previous=typeof reuseKey==='string'?this.sessions.get(reuseKey):null;
  const sameOwner=previous&&['view','documentId','topicId'].every(key=>(previous[key]??null)===(route[key]??null));
  const sessionKey=sameOwner?reuseKey:crypto.randomUUID();let snapshot={...structuredClone(route),anchor:cleanAnchor(route.anchor)};
  try{this.sessions.set(sessionKey,snapshot);}catch{snapshot={...snapshot,navigator:null,anchor:snapshot.anchor?{...snapshot.anchor,expanded:[]}:null};this.sessions.set(sessionKey,snapshot);}
  return {version:2,sessionKey,...projection(snapshot)};
 }
 decode(value){
  if(value?.version!==2)return validRoute(value)?{...structuredClone(value),anchor:cleanAnchor(value.anchor)}:null;
  if(Object.keys(value).some(k=>!['version','sessionKey',...persistedKeys].includes(k))||typeof value.sessionKey!=='string'||!/^[a-f0-9-]{36}$/.test(value.sessionKey))return null;
  const refs=projection(value);if(JSON.stringify(value.anchor??null)!==JSON.stringify(refs.anchor)||!validRoute(refs))return null;
  const snapshot=this.sessions.get(value.sessionKey);
  if(snapshot&&JSON.stringify(projection(snapshot))===JSON.stringify(refs))return snapshot;
  return {...refs,searchQuery:'',navigator:{expanded:[],loaded:[],scrollTop:0,narrowCollapsed:false,sourceScope:refs.sourceKey}};
 }
}
