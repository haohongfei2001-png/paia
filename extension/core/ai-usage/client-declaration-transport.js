// Fixed metadata-only HTTP bridge. No provider body, content store, login or key.
import {clientDeclarationData,clientDeclarationRequestData} from './client-declaration.js';
import {snapshot,exact,freeze} from './qwen-request-data.js';
const transports=new WeakMap(),MAX_RESPONSE_BYTES=4096,DEADLINE_MS=5000;
const closed=()=>({decision:'deny',reason:'TRANSPORT_UNAVAILABLE',dispatchAllowed:false,financialAuthority:false,retryAllowed:false});
const unknown=()=>({decision:'outcome_unknown',reason:'TRANSPORT_OUTCOME_UNKNOWN',dispatchAllowed:false,financialAuthority:false,retryAllowed:false});
export const clientDeclarationTransportOrigin=value=>transports.get(value)??null;
export const isClientDeclarationTransport=value=>value!==null&&typeof value==='object'&&transports.has(value);
export function createClientDeclarationTransport(options){
 let endpoint,send;
 try{
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options)))return null;
  const descriptors=Object.getOwnPropertyDescriptors(options),keys=Reflect.ownKeys(descriptors);
  if(!keys.every(k=>['endpoint','fetch'].includes(k))||!keys.includes('endpoint')||keys.some(k=>!Object.hasOwn(descriptors[k],'value')))return null;
  if(typeof descriptors.endpoint.value!=='string')return null;
  const url=new URL(descriptors.endpoint.value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/api/declarations'||url.port)return null;
  endpoint=url.href;send=descriptors.fetch?.value??globalThis.fetch;if(typeof send!=='function')return null;
 }catch{return null;}
 function execute(action,bundle,declaration){
  let request,controller,timer,pending,stopped,contacted=false;
  try{
   const b=snapshot(bundle,{maxBytes:32768,maxKeys:32,maxDepth:2,maxString:8192});
   if(!exact(b,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof b[k]==='string'&&b[k].length>0&&b[k].length<=8192))return Promise.resolve(closed());
   const originalRequest=clientDeclarationRequestData(b.request);
   const d=clientDeclarationData(declaration),body=JSON.stringify({action,...b,request:originalRequest,declaration:d});
   if(new TextEncoder().encode(body).length>24576)return Promise.resolve(closed());
   controller=new AbortController();stopped=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('DECLARATION_TIMEOUT'));},DEADLINE_MS);});
   request=new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   // No Promise scheduling, async input resolution or retries before this call.
   contacted=true;pending=send(request);
  }catch{clearTimeout(timer);return Promise.resolve(contacted?unknown():closed());}
  return (async()=>{
   let reader;
   try{
    const response=await Promise.race([pending,stopped]);if(!(response instanceof Response)||!response.body||response.status<200||response.status>=600)return unknown();
    reader=response.body.getReader();let size=0,chunks=0;const parts=[];
    while(true){const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;if(!(value instanceof Uint8Array)||++chunks>64||(size+=value.byteLength)>MAX_RESPONSE_BYTES)return unknown();parts.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    const value=snapshot(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),{maxBytes:MAX_RESPONSE_BYTES,maxKeys:16,maxDepth:1,maxString:200});
    if(!exact(value,['decision','reason','requestHash','generation','issuedAt','expiresAt','financialAuthority','dispatchAllowed','retryAllowed'],['decision','financialAuthority','dispatchAllowed','retryAllowed'])||!['published','revoked','deny','outcome_unknown'].includes(value.decision)||value.financialAuthority!==false||value.dispatchAllowed!==false||value.retryAllowed!==false)return unknown();
    if(['published','revoked'].includes(value.decision)&&(response.status!==200||!/^[a-f0-9]{64}$/.test(value.requestHash)||!/^[a-f0-9]{64}$/.test(value.generation)||!Number.isSafeInteger(value.issuedAt)||!Number.isSafeInteger(value.expiresAt)||value.issuedAt<0||value.expiresAt<value.issuedAt))return unknown();
    return freeze(value);
   }catch{return unknown();}
   finally{clearTimeout(timer);if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}}
  })();
 }
 const transport=Object.freeze({publish:(bundle,declaration)=>execute('publish',bundle,declaration),revoke:(bundle,declaration)=>execute('revoke',bundle,declaration)});
 transports.set(transport,new URL(endpoint).origin);return transport;
}
