import {createIdentityCurrentnessHub,identityCurrentnessHubOrigin,identityCurrentnessHubDrained,createHubMaintenanceIdentity} from './identity-currentness-hub.js';
import {createAIFilterVisibilityOwner} from './filter-visibility-owner.js';
// The worker owns this one transport pool. Configuration contains source-owned
// issuers/processing only; UI messages and persisted history cannot configure it.
export function createAIFilterServiceAssembly({getStore,consent,policy,authority,storage}){
 let disposed=false,active=null,retiring=null;
 const stop=state=>{if(!state)return;const remove=state.remove;state.remove=null;try{remove?.();}catch{}if(!state.live)return;state.live=false;state.readOnly?.dispose();state.hub.dispose();for(const fn of state.listeners)try{fn();}catch{}state.listeners.clear();};
 const retire=()=>{if(active){stop(active);retiring=active;active=null;}authority.configureVisibility(null);};
 const removeConsent=consent.onInvalidate(()=>{active?.readOnly?.invalidate();active?.hub.invalidate();});
 function select(configuration,endpoint){
  if(disposed)return null;
  if(configuration===null){retire();return null;}
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration))){retire();return null;}
  const descriptors=Object.getOwnPropertyDescriptors(configuration);if(Reflect.ownKeys(descriptors).some(k=>typeof k!=='string'||!Object.hasOwn(descriptors[k],'value'))){retire();return null;}
  const {filterIdentity:unused,...raw}=configuration;
  if(!raw.service||![Object.prototype,null].includes(Object.getPrototypeOf(raw.service))||Reflect.ownKeys(raw.service).some(k=>typeof k!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw.service,k),'value'))||typeof raw.isCurrent!=='function'||typeof raw.onInvalidate!=='function'||typeof raw.clock!=='function'){retire();return null;}
  const same=state=>state&&state.endpoint===endpoint&&Object.keys(raw).length===Object.keys(state.raw).length&&Object.keys(raw).every(k=>raw[k]===state.raw[k]);
  if(active&&(!same(active)||!active.live)){retire();}
  const ordinary={...raw,service:{...raw.service,filter:authority.serviceFilter}};
  if(endpoint===null){retire();return ordinary;}
  // Cancel is not physical settlement. A late fetch or fresh-proof promise in
  // the old pool keeps its slot and blocks construction of a replacement pool.
  if(retiring){if(!identityCurrentnessHubDrained(retiring.hub)||retiring.readOnly&&!retiring.readOnly.isDrained())return null;retiring=null;}
  if(!active){
   const hub=createIdentityCurrentnessHub({endpoint,clock:raw.clock,fetch:raw.fetch??globalThis.fetch});
   if(!hub||identityCurrentnessHubOrigin(hub)!==raw.origin){hub?.dispose();return ordinary;}
   const state={raw,endpoint,hub,live:true,listeners:new Set(),remove:null,readOnly:null};
   const current=()=>{try{return state.live&&raw.isCurrent()===true;}catch{return false;}};
   state.configuration={...ordinary,isCurrent:current,onInvalidate(fn){if(typeof fn!=='function'||state.listeners.size>=8)throw Error('UNAVAILABLE');if(!current()){fn();return ()=>{};}state.listeners.add(fn);return ()=>state.listeners.delete(fn);}};
   state.readOnly=createAIFilterVisibilityOwner({getStore,consent,policy,configuration:state.configuration,hub,storage});
   try{state.remove=raw.onInvalidate(()=>{stop(state);authority.invalidate();});if(typeof state.remove!=='function'||!current())throw Error();}catch{stop(state);retiring=state;return null;}
   active=state;authority.configureVisibility(state.readOnly);
   // Both storage/HMAC recovery and issuer admission remain outside IDB reads.
   state.readOnly?.load().catch(()=>{});
  }
  const identity=createHubMaintenanceIdentity(active.hub);return identity?{...active.configuration,filterIdentity:identity}:null;
 }
 return Object.freeze({configure:select,invalidate(){active?.readOnly?.invalidate();active?.hub.invalidate();},dispose(){if(disposed)return;disposed=true;retire();removeConsent();}});
}
