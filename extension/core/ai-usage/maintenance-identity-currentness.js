import {observedClientOperationStatus} from './client-operation-status-transport.js';
import {equal} from './contracts.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {createClientIdentityCurrentnessTransport,clientIdentityCurrentnessTransportOrigin,readClientIdentityCurrentnessConnection,identityMatchesCurrentnessConnection} from './client-identity-currentness-transport.js';
// Transport observations and connection liveness are separate facts. A fresh
// connection contains no identity until its own original status query succeeds.
// Revoke is deny-only; reconnect never revives an old operation or old receipt.
const owners=new WeakSet(),preparations=new WeakMap(),lifecycles=new WeakMap();
export const isMaintenanceIdentityCurrentness=value=>owners.has(value);
function createCurrentness({origin,clock=()=>NaN,transport=null}={}){
 const channels=new Map(),spent=new Set();
 let connected=null,remove=null,serial=0,connectionEpoch=0,last=-1,disposed=false;const leases=new Map(),revoked=new Set(),seen=new WeakMap(),tickets=new WeakMap(),pending=new Set();
 const clear=()=>{serial++;leases.clear();};
 const disconnect=()=>{connectionEpoch++;pending.clear();const old=remove;remove=null;connected=null;clear();const entries=[...channels.values()];channels.clear();for(const e of entries){try{e.remove?.();e.connection?.close();}catch{}}try{old?.();}catch{}};
 function time(){const now=clock();if(!Number.isSafeInteger(now)||now<0||now<last){disconnect();return null;}last=now;return now;}
 function live(){try{if(disposed||!connected)return false;const value=connected.isCurrent();if(value instanceof Promise){value.catch(()=>{});disconnect();return false;}if(value!==true){disconnect();return false;}return time()!==null;}catch{disconnect();return false;}}
 const generation=i=>JSON.stringify([i.principalId,i.libraryId,i.principalGeneration,i.entitlementGeneration,i.authorityGeneration]);
 const owner=Object.freeze({
  connect(connection){if(transport)return false;disconnect();if(disposed||!connection||typeof connection.isCurrent!=='function'||typeof connection.onInvalidate!=='function')return false;connected=connection;const ticket=connectionEpoch;try{remove=connection.onInvalidate(()=>{if(connectionEpoch===ticket)disconnect();});if(typeof remove!=='function'||!live()){disconnect();return false;}return true;}catch{disconnect();return false;}},
  disconnect,
  beginObservation(request){if(!live()||pending.size>=8)return null;try{const ticket=Object.freeze(Object.create(null));tickets.set(ticket,{epoch:connectionEpoch,request:clientDeclarationRequestData(request)});pending.add(ticket);return ticket;}catch{return null;}},
  releaseObservation:ticket=>pending.delete(ticket),
  observe(observation,statusTransport,ticket){if(!live())return false;const issued=tickets.get(ticket);if(!issued||!pending.delete(ticket)||issued.epoch!==connectionEpoch)return false;const meta=observedClientOperationStatus(observation,statusTransport),i=meta?.authenticatedIdentity,now=time();if(meta?.witness!==ticket||!equal(meta.request,issued.request))return false;if(seen.has(observation)&&seen.get(observation)!==serial)return false;if(!i||meta.origin!==origin||i.observedAt>now||i.verifiedUntil<=now||revoked.has(generation(i))||transport&&!identityMatchesCurrentnessConnection(channels.get(i.operationId)?.connection,transport,i))return false;
   // Any changed account/library/generation retires all earlier observations.
   for(const l of leases.values())if(generation(l.identity)!==generation(i)){revoked.add(generation(l.identity));clear();if(revoked.size>32){disposed=true;disconnect();return false;}break;}
   for(const [key,l]of leases)if(l.identity.verifiedUntil<=now)leases.delete(key);
   const prior=leases.get(i.operationId);if(prior&&!equal(prior.identity,i)||!prior&&leases.size>=8)return false;
   leases.set(i.operationId,{identity:i,serial});seen.set(observation,serial);return true;
  },
  isCurrent(identity){if(!live())return false;const l=leases.get(identity?.operationId),now=time();return !!l&&l.identity===identity&&l.serial===serial&&!revoked.has(generation(identity))&&now!==null&&now>=identity.observedAt&&now<identity.verifiedUntil&&(!transport||identityMatchesCurrentnessConnection(channels.get(identity.operationId)?.connection,transport,identity));},
  revoke(identity){const l=leases.get(identity?.operationId);if(!l||l.identity!==identity)return false;revoked.add(generation(identity));clear();if(revoked.size>32){disposed=true;disconnect();}return true;},
  dispose(){disposed=true;disconnect();revoked.clear();spent.clear();transport?.dispose();}
 });owners.add(owner);
 if(transport)lifecycles.set(owner,{claimed:false,isDisposed:()=>disposed,dispose:()=>owner.dispose()});
 if(transport)preparations.set(owner,async bundle=>{
  let request;try{request=clientDeclarationRequestData(bundle?.request);}catch{return false;}
  if(disposed)return false;const key=request.operationId,existing=channels.get(key);
  if(existing)return equal(existing.request,request)&&(existing.connection?existing.connection.isCurrent():await existing.opening);
  // No automatic reconnect/renewal of an old operation. Bounded tombstones
  // require an explicit new source owner after 32 distinct operation attempts.
  if(spent.has(key)||spent.size>=32||channels.size>=8)return false;spent.add(key);
  const epoch=connectionEpoch,entry={request,connection:null,opening:null,remove:null};channels.set(key,entry);
  entry.opening=(async()=>{
   const connection=await transport.open(bundle),metadata=readClientIdentityCurrentnessConnection(connection,transport);
   if(disposed||epoch!==connectionEpoch||channels.get(key)!==entry||!metadata||metadata.origin!==origin||!equal(metadata.request,request)){connection?.close();if(channels.get(key)===entry)channels.delete(key);return false;}
   entry.connection=connection;
   // This predicate is source-owned and checks every actual private transport
   // connection. No caller-provided `true` callback participates in this path.
   connected={isCurrent:()=>{const ready=[...channels.values()].filter(e=>e.connection);return ready.length>0&&ready.every(e=>e.connection.isCurrent());}};
   entry.remove=connection.onInvalidate(()=>{if(epoch===connectionEpoch)disconnect();});
   return live();
  })();
  return entry.opening;
 });
 return owner;
}
export function createMaintenanceIdentityCurrentness({origin,clock}={}){return createCurrentness({origin,clock});}
export function createMaintenanceIdentityChannelCurrentness({origin,clock,transport}={}){
 if(!transport||clientIdentityCurrentnessTransportOrigin(transport)!==origin)return null;
 return createCurrentness({origin,clock,transport});
}
// null denotes the earlier neutral protocol owner, never a production channel.
export const prepareMaintenanceIdentityConnection=(owner,bundle)=>preparations.get(owner)?.(bundle)??null;

// Source-owned assembly only. The endpoint defaults to absent, and no network
// starts during configuration. Missing/invalid channel configuration removes
// an old neutral callback owner rather than promoting it as production proof.
export function withMaintenanceIdentityCurrentness(configuration,endpoint=null){
 if(configuration===null)return null;
 if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
 const descriptors=Object.getOwnPropertyDescriptors(configuration);
 if(Reflect.ownKeys(descriptors).some(k=>typeof k!=='string'||!Object.hasOwn(descriptors[k],'value')))return null;
 const {filterIdentity:previous,...base}=configuration;
 if(endpoint===null)return base;
 const transport=createClientIdentityCurrentnessTransport({endpoint,fetch:base.fetch??globalThis.fetch,clock:base.clock});
 const owner=createMaintenanceIdentityChannelCurrentness({origin:base.origin,clock:base.clock,transport});
 if(!owner){transport?.dispose();return base;}
 return {...base,filterIdentity:owner};
}


// Only a source-created production channel transfers lifecycle ownership to one
// service client. Neutral protocol owners remain caller-owned and shareable.
export function claimMaintenanceIdentityChannel(owner){
 const state=lifecycles.get(owner);if(!state)return null;
 if(state.claimed||state.isDisposed())return false;state.claimed=true;let released=false;
 return ()=>{if(!released){released=true;state.dispose();}};
}
export function disposeUnclaimedMaintenanceIdentityChannel(owner){
 const state=lifecycles.get(owner);if(state&&!state.claimed)state.dispose();
}
