import {createClientIdentityCurrentnessTransport,clientIdentityCurrentnessTransportOrigin,clientIdentityCurrentnessTransportDrained,reserveClientIdentityCurrentnessTransport,releaseClientIdentityCurrentnessTransport,openReservedClientIdentityCurrentnessTransport,readClientIdentityCurrentnessConnection,readClientIdentityCurrentnessConnectionFacts} from './client-identity-currentness-transport.js';
import {createSharedMaintenanceIdentityChannelCurrentness} from './maintenance-identity-currentness.js';
const hubs=new WeakMap(),tickets=new WeakMap();
// One worker-owned transport budget spans BOTH paid clients and read-only
// visibility renewals. Paid client disposal closes its own channels only.
export function createIdentityCurrentnessHub(options){
 const transport=createClientIdentityCurrentnessTransport(options);if(!transport)return null;let disposed=false;const writers=new Set();
 const hub=Object.freeze({invalidate(){if(!disposed)for(const w of writers)w.disconnect();},dispose(){if(disposed)return;disposed=true;for(const w of writers)w.dispose();writers.clear();transport.dispose();}});hubs.set(hub,{transport,origin:clientIdentityCurrentnessTransportOrigin(transport),clock:options.clock,writers,current:()=>!disposed});return hub;
}
export const identityCurrentnessHubDrained=hub=>{const h=hubs.get(hub);return !!h&&clientIdentityCurrentnessTransportDrained(h.transport);};
export const identityCurrentnessHubOrigin=hub=>{const h=hubs.get(hub);return h?.current()?h.origin:null;};
export function createHubMaintenanceIdentity(hub){const h=hubs.get(hub);if(!h?.current()||h.writers.size>=8)return null;const owner=createSharedMaintenanceIdentityChannelCurrentness({origin:h.origin,clock:h.clock,transport:h.transport,onDisposed:()=>h.writers.delete(owner)});if(owner)h.writers.add(owner);return owner;}
export function reserveHubIdentityObservation(hub){
 const h=hubs.get(hub);if(!h?.current())return null;const slot=reserveClientIdentityCurrentnessTransport(h.transport);if(!slot)return null;
 const token=Object.freeze(Object.create(null));tickets.set(token,{hub,slot,active:true});return token;
}
export function releaseHubIdentityObservation(hub,ticket){const h=hubs.get(hub),r=tickets.get(ticket);if(!h||!r||r.hub!==hub||!r.active)return false;r.active=false;return releaseClientIdentityCurrentnessTransport(h.transport,r.slot);}
export async function openHubIdentityObservation(hub,ticket,bundle){
 const h=hubs.get(hub),r=tickets.get(ticket);if(!h||!r||r.hub!==hub||!r.active)return null;r.active=false;
 if(!h.current()){releaseClientIdentityCurrentnessTransport(h.transport,r.slot);return null;}
 const connection=await openReservedClientIdentityCurrentnessTransport(h.transport,r.slot,bundle);if(!h.current()){connection?.close();return null;}return connection;
}
export const readHubIdentityObservation=(hub,connection)=>{const h=hubs.get(hub);return h?.current()?readClientIdentityCurrentnessConnection(connection,h.transport):null;};

export const readHubIdentityObservationFacts=(hub,connection,at)=>{const h=hubs.get(hub);return h?.current()?readClientIdentityCurrentnessConnectionFacts(connection,h.transport,at):null;};
