import {equal} from './contracts.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {snapshot,exact,freeze,integer} from './qwen-request-data.js';
import {fixedGatewayHttp} from './client-gateway-http.js';
const transports=new WeakMap(),observations=new WeakMap(),denials=new WeakMap();
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
const unknown=()=>freeze({decision:'outcome_unknown',reason:'TRANSPORT_OUTCOME_UNKNOWN',...flags});
export const observedClientReservationDenial=(receipt,transport)=>{const r=denials.get(receipt);return r?.transport===transport?r:null;};
export const clientReservationTransportOrigin=t=>transports.get(t)??null;
export const observedClientReservation=(receipt,transport)=>{const r=observations.get(receipt);return r?.transport===transport?r:null;};
export function createClientReservationTransport(options){
 const http=fixedGatewayHttp(options,'/api/reservations',{bytes:24576,millis:5000});if(!http)return null;
 let transport;
 function execute(action,bundle){
  let b,pending;
  try{
   b=snapshot(bundle,{maxBytes:24576,maxKeys:32,maxDepth:2,maxString:8192});
   if(!exact(b,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof b[k]==='string'&&b[k].length>0&&b[k].length<=8192))throw Error();
   b.request=clientDeclarationRequestData(b.request);freeze(b);pending=http.send({action,...b});
  }catch{return Promise.resolve(unknown());}
  return (async()=>{try{
   const {status,value:v}=await pending;
   if(action==='reserve'&&status===503&&b.request.jobType==='AI_MAINTENANCE'&&exact(v,['decision','reason','request','observedAt','nextEligibilityAt',...Object.keys(flags)])&&v.decision==='deny'&&v.reason==='MAINTENANCE_CADENCE'&&equal(v.request,b.request)&&integer(v.observedAt)&&integer(v.nextEligibilityAt)&&v.nextEligibilityAt>v.observedAt&&Object.keys(flags).every(k=>v[k]===false)){
    const answer=freeze(v);denials.set(answer,freeze({transport,origin:http.origin,request:b.request,observedAt:v.observedAt,nextEligibilityAt:v.nextEligibilityAt}));return answer;
   }
   if(status!==200||!exact(v,['decision','operationId','state','reservationMicros','window',...Object.keys(flags)],['decision','operationId','state','reservationMicros',...Object.keys(flags)])||v.decision!==(action==='reserve'?'reserved':'cancelled')||v.operationId!==b.request.operationId||v.state!==(action==='reserve'?'RESERVED':'CANCELLED_BEFORE_DISPATCH')||!integer(v.reservationMicros)||!Object.keys(flags).every(k=>v[k]===false))return unknown();
   const answer=freeze({...v});observations.set(answer,freeze({transport,origin:http.origin,request:b.request,action,reservationMicros:v.reservationMicros}));return answer;
  }catch{return unknown();}})();
 }
 transport=Object.freeze({reserve:b=>execute('reserve',b),cancel:b=>execute('cancel',b)});transports.set(transport,http.origin);return transport;
}
