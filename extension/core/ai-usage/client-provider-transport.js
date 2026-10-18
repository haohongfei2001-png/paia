import {clientDeclarationRequestData,clientDeclarationData} from './client-declaration.js';
import {snapshot,exact,freeze,integer,token} from './qwen-request-data.js';
import {fixedGatewayHttp} from './client-gateway-http.js';
const transports=new WeakMap(),observations=new WeakMap();
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
const unknown=()=>freeze({decision:'outcome_unknown',reason:'TRANSPORT_OUTCOME_UNKNOWN',...flags});
export const clientProviderTransportOrigin=t=>transports.get(t)??null;
export const observedClientProviderResponse=(response,transport)=>{const r=observations.get(response);return r?.transport===transport?r:null;};
export function createClientProviderTransport(options){
 const http=fixedGatewayHttp(options,'/api/provider');if(!http)return null;let transport;
 function execute(input){
  let data,pending;
  try{
   data=snapshot(input,{maxBytes:294912,maxKeys:4096,maxDepth:16,maxString:131072});
   if(!exact(data,['bundle','declaration','childIdentity','payload','stream'])||typeof data.stream!=='boolean'||!exact(data.bundle,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof data.bundle[k]==='string'&&data.bundle[k].length>0&&data.bundle[k].length<=8192))throw Error();
   data.bundle.request=clientDeclarationRequestData(data.bundle.request);data.declaration=clientDeclarationData(data.declaration);
   const c=data.childIdentity,r=data.bundle.request;
   if(!exact(c,['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'])||c.logicalJobId!==r.jobId||c.childOperationId!==r.operationId||c.type!==r.jobType||c.contractVersion!==r.contractVersion||c.routeVersion!==r.routeVersion||c.automaticRetries!==0)throw Error();
   freeze(data);pending=http.send(data);
  }catch{return Promise.resolve(unknown());}
  return (async()=>{try{
   const {status,value:v}=await pending;
   if(!exact(v,['decision','reason','value','providerRequestId','usage','domainValidity','reservation','checkedAt','financialSettlement','resultFinalization','qualification','sourceKind',...Object.keys(flags)],['decision',...Object.keys(flags)])||!Object.keys(flags).every(k=>v[k]===false)||!['response_received','deny','outcome_unknown'].includes(v.decision))return unknown();
   const f=v.financialSettlement;
   if(!f)return unknown();
   if(!exact(f,['state','receiptId','outcome','settledSpendMicros','effectiveResults'])||f.state!=='SETTLED'||!token(f.receiptId)||!['VALIDATED','FAILED'].includes(f.outcome)||!integer(f.settledSpendMicros)||f.effectiveResults!==0||v.reservation!=='SETTLED')return unknown();
   const accepted=v.decision==='response_received';
   if(accepted&&(status!==200||f.outcome!=='VALIDATED'||v.domainValidity!=='NOT_EVALUATED'||v.resultFinalization!=='PENDING_DOMAIN_PROOF'||!integer(v.checkedAt)||!Object.hasOwn(v,'value')))return unknown();
   // Only the fixed HTTPS response can create this private observation. Never
   // retain provider usage, raw response, prompt or arbitrary reason fields.
   const response=freeze({decision:accepted?'response_received':'outcome_unknown',...(accepted?{value:v.value}:{}),...flags});
   observations.set(response,freeze({transport,origin:http.origin,request:data.bundle.request,financialSettlement:{...f}}));return response;
  }catch{return unknown();}})();
 }
 transport=Object.freeze({execute});transports.set(transport,http.origin);return transport;
}
