// Register the fixed invalidation surfaces before asynchronous store selection.
// No command, permission, payload queue or store capability is created here.
// Owners constructed later read current state before issuing their first lease.
export function createApplicationStartupEvents(api){
 const relay=event=>{
  if(!event?.addListener)return event;
  const listeners=new Set();
  event.addListener((...args)=>{for(const listener of [...listeners]){
   try{listener(...args);}catch(error){globalThis.reportError?.(error);}
  }});
  return Object.freeze({
   addListener(listener){if(typeof listener!=='function')throw new TypeError('Invalid event listener');listeners.add(listener);},
   removeListener(listener){listeners.delete(listener);},
   hasListener(listener){return listeners.has(listener);},
   hasListeners(){return listeners.size>0;},
  });
 };
 return Object.freeze({...api,
  storage:api.storage?Object.freeze({...api.storage,onChanged:relay(api.storage.onChanged)}):api.storage,
  permissions:api.permissions?Object.freeze({...api.permissions,onRemoved:relay(api.permissions.onRemoved)}):api.permissions,
  tabs:api.tabs?Object.freeze({...api.tabs,onRemoved:relay(api.tabs.onRemoved),onUpdated:relay(api.tabs.onUpdated)}):api.tabs,
 });
}
