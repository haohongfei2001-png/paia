import {snapshot} from './qwen-request-data.js';
import {parseQwenWireJson} from './qwen-wire-primitives.js';
// Constructor-local endpoint configuration only. No default URL or permissions.
export function fixedGatewayHttp(options,path,{bytes=294912,millis=35000}={}){
 try{
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options)))return null;
  const d=Object.getOwnPropertyDescriptors(options),keys=Reflect.ownKeys(d);
  if(!keys.every(k=>['endpoint','fetch'].includes(k))||!keys.includes('endpoint')||keys.some(k=>!Object.hasOwn(d[k],'value'))||typeof d.endpoint.value!=='string')return null;
  const url=new URL(d.endpoint.value),send=d.fetch?.value??globalThis.fetch;
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!==path||url.port||typeof send!=='function')return null;
  const endpoint=url.href;
  return Object.freeze({origin:url.origin,send(value){
   const body=JSON.stringify(value);if(new TextEncoder().encode(body).length>bytes)throw Error('HTTP_BOUND');
   const controller=new AbortController();let timer,reader;
   const stopped=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('HTTP_TIMEOUT'));},millis);});
   const request=new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   let pending;try{pending=send(request);}catch(error){clearTimeout(timer);throw error;}
   return (async()=>{
    try{
     const response=await Promise.race([pending,stopped]);
     if(!(response instanceof Response)||!response.body||response.redirected||response.url&&response.url!==endpoint||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type')??'')||![null,'identity'].includes(response.headers.get('content-encoding')))throw Error('HTTP_INVALID');
     reader=response.body.getReader();let size=0;const chunks=[];
     for(;;){const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;if(!(value instanceof Uint8Array)||(size+=value.byteLength)>bytes||chunks.length>=512)throw Error('HTTP_BOUND');chunks.push(new Uint8Array(value));}
     const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
     const text=new TextDecoder('utf-8',{fatal:true}).decode(data),limits={maxBytes:bytes,maxDepth:16,maxKeys:4096,maxStringBytes:131072};
     const parsed=parseQwenWireJson(text,limits,{keys:0},()=>{throw Error('HTTP_INVALID');},{json:'HTTP_INVALID',duplicate:'HTTP_INVALID'});
     return {status:response.status,value:snapshot(parsed,{maxBytes:bytes,maxDepth:16,maxKeys:4096,maxString:131072})};
    }finally{clearTimeout(timer);if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}}
   })();
  }});
 }catch{return null;}
}
