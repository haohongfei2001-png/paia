import {AtomicReservationLedger} from './atomic-reservation.js';
import {fail} from './contracts.js';

// Server-side integration seam for the existing single accounting owner. The
// adapter MUST authenticate current principal/consent/entitlement/time zone and
// exact request/settlement bindings independently of client assertions. Its
// clock MUST be server-owned; transact MUST serialize every principal against
// the same durable snapshot and atomically commit/roll back all reads/writes.
// An injected object, function or verified:true flag is not evidence that those
// guarantees exist. No adapter, identity/signature root, provider or persistent
// service is installed here. All outputs explicitly deny financial/dispatch
// authority; production transport must remain unavailable until separately wired
// and qualified. In particular this class is not a browser Pro entitlement.
export class BudgetWindowReservation extends AtomicReservationLedger {
 constructor({service}={}){
  if(!service||!['transact','verifyRequest','verifySettlement','clock'].every(key=>typeof service[key]==='function'))fail('UNAVAILABLE');
  super({transact:service.transact.bind(service),verify:service.verifyRequest.bind(service),verifySettlement:service.verifySettlement.bind(service),verifyResult:typeof service.verifyResult==='function'?service.verifyResult.bind(service):undefined,clock:service.clock.bind(service),windowPolicy:'bounded-v1'});
 }
}
