import {observedClientOperationStatus} from './client-operation-status-transport.js';
import {equal} from './contracts.js';
import {clientDeclarationRequestData} from './client-declaration.js';
// Transport observations and connection liveness are separate facts. A fresh
// connection contains no identity until its own original status query succeeds.
// Revoke is deny-only; reconnect never revives an old operation or old receipt.
const owners=new WeakSet();
export const isMaintenanceIdentityCurrentness=value=>owners.has(value);
export function createMaintenanceIdentityCurrentness({origin,clock=()=>NaN}={}){
 let connected=null,remove=null,serial=0,connectionEpoch=0,last=-1,disposed=false;const leases=new Map(),revoked=new Set(),seen=new WeakMap(),tickets=new WeakMap(),pending=new Set();
 const clear=()=>{serial++;leases.clear();};
 const disconnect=()=>{connectionEpoch++;pending.clear();const old=remove;remove=null;connected=null;clear();try{old?.();}catch{}};
 function time(){const now=clock();if(!Number.isSafeInteger(now)||now<0||now<last){disconnect();return null;}last=now;return now;}
 function live(){try{if(disposed||!connected)return false;const value=connected.isCurrent();if(value instanceof Promise){value.catch(()=>{});disconnect();return false;}if(value!==true){disconnect();return false;}return time()!==null;}catch{disconnect();return false;}}
 const generation=i=>JSON.stringify([i.principalId,i.libraryId,i.principalGeneration,i.entitlementGeneration,i.authorityGeneration]);
 const owner=Object.freeze({
  connect(connection){disconnect();if(disposed||!connection||typeof connection.isCurrent!=='function'||typeof connection.onInvalidate!=='function')return false;connected=connection;const ticket=connectionEpoch;try{remove=connection.onInvalidate(()=>{if(connectionEpoch===ticket)disconnect();});if(typeof remove!=='function'||!live()){disconnect();return false;}return true;}catch{disconnect();return false;}},
  disconnect,
  beginObservation(request){if(!live()||pending.size>=8)return null;try{const ticket=Object.freeze(Object.create(null));tickets.set(ticket,{epoch:connectionEpoch,request:clientDeclarationRequestData(request)});pending.add(ticket);return ticket;}catch{return null;}},
  releaseObservation:ticket=>pending.delete(ticket),
  observe(observation,transport,ticket){if(!live())return false;const issued=tickets.get(ticket);if(!issued||!pending.delete(ticket)||issued.epoch!==connectionEpoch)return false;const meta=observedClientOperationStatus(observation,transport),i=meta?.authenticatedIdentity,now=time();if(meta?.witness!==ticket||!equal(meta.request,issued.request))return false;if(seen.has(observation)&&seen.get(observation)!==serial)return false;if(!i||meta.origin!==origin||i.observedAt>now||i.verifiedUntil<=now||revoked.has(generation(i)))return false;
   // Any changed account/library/generation retires all earlier observations.
   for(const l of leases.values())if(generation(l.identity)!==generation(i)){revoked.add(generation(l.identity));clear();if(revoked.size>32){disposed=true;disconnect();return false;}break;}
   for(const [key,l]of leases)if(l.identity.verifiedUntil<=now)leases.delete(key);
   const prior=leases.get(i.operationId);if(prior&&!equal(prior.identity,i)||!prior&&leases.size>=8)return false;
   leases.set(i.operationId,{identity:i,serial});seen.set(observation,serial);return true;
  },
  isCurrent(identity){if(!live())return false;const l=leases.get(identity?.operationId),now=time();return !!l&&l.identity===identity&&l.serial===serial&&!revoked.has(generation(identity))&&now!==null&&now>=identity.observedAt&&now<identity.verifiedUntil;},
  revoke(identity){const l=leases.get(identity?.operationId);if(!l||l.identity!==identity)return false;revoked.add(generation(identity));clear();if(revoked.size>32){disposed=true;disconnect();}return true;},
  dispose(){disposed=true;disconnect();revoked.clear();}
 });owners.add(owner);return owner;
}
