import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost} from './native-host-bootstrap.js';
const startupOrigins=originalBootstrapWeakMap(),productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
// Register the fixed invalidation surfaces before asynchronous store selection.
// No command, permission, payload queue or store capability is created here.
// Owners constructed later read current state before issuing their first lease.
function createStartupEvents(api,origin){
 const relay=event=>{
  if(!event?.addListener)return event;
  const listeners=new Set();
  event.addListener((...args)=>{for(const listener of [...listeners]){
   try{listener(...args);}catch(error){globalThis.reportError?.(error);}
  }});
  return originalBootstrapFreeze({
   addListener(listener){if(typeof listener!=='function')throw new TypeError('Invalid event listener');listeners.add(listener);},
   removeListener(listener){listeners.delete(listener);},
   hasListener(listener){return listeners.has(listener);},
   hasListeners(){return listeners.size>0;},
  });
 };
 const root=origin===productionOrigin?{runtime:api.runtime,scripting:api.scripting,action:api.action,windows:api.windows}:api;
 const tabSource=origin===productionOrigin?{get:api.tabs.get,query:api.tabs.query,sendMessage:api.tabs.sendMessage,create:api.tabs.create,update:api.tabs.update,onCreated:api.tabs.onCreated,onReplaced:api.tabs.onReplaced,onActivated:api.tabs.onActivated}:api.tabs;
 const storageSource=origin===productionOrigin?{local:api.storage.local,session:api.storage.session}:api.storage;
 const permissionSource=origin===productionOrigin&&api.permissions?{contains:api.permissions.contains,request:api.permissions.request,remove:api.permissions.remove,onAdded:api.permissions.onAdded}:api.permissions;
 const result=originalBootstrapFreeze({...root,
  storage:api.storage?originalBootstrapFreeze({...storageSource,onChanged:relay(api.storage.onChanged)}):api.storage,
  permissions:api.permissions?originalBootstrapFreeze({...permissionSource,onRemoved:relay(api.permissions.onRemoved)}):api.permissions,
  tabs:api.tabs?originalBootstrapFreeze({...tabSource,onRemoved:relay(api.tabs.onRemoved),onUpdated:relay(api.tabs.onUpdated)}):api.tabs,
 });
 originalBootstrapWeakSet(startupOrigins,result,{api,origin});return result;
}

export function createInjectedApplicationStartupEventsForTest(api){return createStartupEvents(api,injectedOrigin);}
export function createApplicationStartupEvents(api){return createInjectedApplicationStartupEventsForTest(api);}
export function createOrdinaryApplicationStartupEvents(api){return createStartupEvents(api,ordinaryOrigin);}
export function createProductionApplicationStartupEvents(){if(arguments.length)throw new TypeError('No injected production host');const api=readOriginalBootstrapHost(),owner=createStartupEvents(api,productionOrigin);requireOriginalBootstrapHost(api);return owner;}
export function isProductionApplicationStartupEvents(owner){const api=readOriginalBootstrapHost(),r=originalBootstrapWeakGet(startupOrigins,owner);return !!r&&r.origin===productionOrigin&&r.api===api;}

// Private producer-origin equality, no host validation or lifecycle readiness.
export function hasOriginalProductionStartupBinding(owner,api){const r=originalBootstrapWeakGet(startupOrigins,owner);return !!r&&r.origin===productionOrigin&&r.api===api;}
