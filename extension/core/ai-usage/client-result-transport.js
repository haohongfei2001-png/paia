// Metadata-only finalization. This transport creates no domain or spend proof.
import {clientDeclarationRequestData} from './client-declaration.js';
import {snapshotResultEvidence} from './result-finalization.js';
import {parseQwenWireJson} from './qwen-wire-primitives.js';
import {snapshot,exact,freeze} from './qwen-request-data.js';
const transports=new WeakMap(),MAX_RESPONSE_BYTES=4096,DEADLINE_MS=5000;
const flags=Object.freeze({dispatchAllowed:false,financialAuthority:false,retryAllowed:false});
const closed=()=>({decision:'deny',reason:'TRANSPORT_UNAVAILABLE',...flags});
const unknown=()=>({decision:'outcome_unknown',reason:'TRANSPORT_OUTCOME_UNKNOWN',...flags});
export const clientResultTransportOrigin=value=>transports.get(value)??null;
export const isClientResultTransport=value=>transports.has(value);
export function createClientResultTransport(options){
 let endpoint,origin,send;
 try{
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options)))return null;
  const descriptors=Object.getOwnPropertyDescriptors(options),keys=Reflect.ownKeys(descriptors);
  if(!keys.every(k=>['endpoint','fetch'].includes(k))||!keys.includes('endpoint')||keys.some(k=>!Object.hasOwn(descriptors[k],'value')))return null;
  if(typeof descriptors.endpoint.value!=='string')return null;
  const url=new URL(descriptors.endpoint.value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/api/results'||url.port)return null;
  endpoint=url.href;origin=url.origin;send=descriptors.fetch?.value??globalThis.fetch;if(typeof send!=='function')return null;
 }catch{return null;}
 function finalize(bundle,result){
  let controller,timer,pending,stopped,contacted=false,r,e;
  try{
   const b=snapshot(bundle,{maxBytes:32768,maxKeys:32,maxDepth:2,maxString:8192});
   if(!exact(b,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof b[k]==='string'&&b[k].length>0&&b[k].length<=8192))return Promise.resolve(closed());
   r=clientDeclarationRequestData(b.request);e=snapshotResultEvidence(snapshot(result,{maxBytes:4096,maxKeys:24,maxDepth:3,maxString:256}));
   if(r.childIndex!==0||e.jobId!==r.jobId||!e.children.some(c=>c.operationId===r.operationId))return Promise.resolve(closed());
   const body=JSON.stringify({action:'finalize',...b,request:r,result:e});if(new TextEncoder().encode(body).length>24576)return Promise.resolve(closed());
   controller=new AbortController();stopped=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('RESULT_TIMEOUT'));},DEADLINE_MS);});
   const request=new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   contacted=true;pending=send(request);
  }catch{clearTimeout(timer);return Promise.resolve(contacted?unknown():closed());}
  return (async()=>{
   let reader;
   try{
    const response=await Promise.race([pending,stopped]);
    if(!(response instanceof Response)||!response.body||response.redirected||response.url&&response.url!==endpoint||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type')??''))return unknown();
    reader=response.body.getReader();let size=0,chunks=0;const parts=[];
    while(true){const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;if(!(value instanceof Uint8Array)||++chunks>64||(size+=value.byteLength)>MAX_RESPONSE_BYTES)return unknown();parts.push(new Uint8Array(value));}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    const value=snapshot(parseQwenWireJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxDepth:2,maxKeys:16,maxStringBytes:256},{keys:0},()=>{throw Error('RESULT_RESPONSE_INVALID');},{json:'INVALID',duplicate:'INVALID'}),{maxBytes:MAX_RESPONSE_BYTES,maxKeys:16,maxDepth:1,maxString:256});
    if(!['financialAuthority','dispatchAllowed','retryAllowed'].every(k=>value[k]===false))return unknown();
    if(value.decision==='finalized'){
     if(response.status!==200||!exact(value,['decision','operationId','jobId','receiptId','resultOutcome','effectiveResults',...Object.keys(flags)])||value.operationId!==r.operationId||value.jobId!==r.jobId||value.receiptId!==e.receiptId||value.resultOutcome!==e.outcome||value.effectiveResults!==(e.outcome==='COMMITTED'?1:0))return unknown();
    }else if(!exact(value,['decision','reason',...Object.keys(flags)])||!['deny','outcome_unknown'].includes(value.decision)||typeof value.reason!=='string'||!/^[A-Z_]{1,100}$/.test(value.reason))return unknown();
    return freeze(value);
   }catch{return unknown();}
   finally{clearTimeout(timer);if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}}
  })();
 }
 const transport=Object.freeze({finalize});transports.set(transport,origin);return transport;
}
