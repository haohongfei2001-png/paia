import {HttpError} from './request-entry.mjs';
import {snapshotProviderInput} from './provider-request.mjs';
import {requireSynchronous} from './signed-identity.mjs';

export const PROVIDER_HTTP_LIMITS=Object.freeze({bytes:294912,depth:16,members:4096,nodes:8192,array:4096,stringBytes:131072,chunks:512,readMillis:5000});
const fail=(code='HTTP_REQUEST_INVALID',status=400)=>{throw new HttpError(status,code);};
const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
export const providerHttpDenial=reason=>({decision:'deny',reason,...flags});
export const providerHttpResponse=(result,status=200)=>Response.json(result,{status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});

// Parse raw, bounded bytes. Decoded object names are checked before any JSON
// parser can collapse duplicates. Null-prototype objects make __proto__ inert.
// This is syntax/buffering only; the original provider DTO owner remains final.
function parse(source){
 let at=0,members=0,nodes=0;
 const space=()=>{while(/[\x20\t\r\n]/.test(source[at]??'\0'))at++;};
 const string=()=>{
  const start=at++;
  while(at<source.length){
   const c=source[at++];if(c==='\\'){at++;continue;}
   if(c==='"'){
    const value=JSON.parse(source.slice(start,at));
    if(!value.isWellFormed()||Buffer.byteLength(JSON.stringify(value))>PROVIDER_HTTP_LIMITS.stringBytes)fail();
    return value;
   }
  }
  fail();
 };
 const value=depth=>{
  if(++nodes>PROVIDER_HTTP_LIMITS.nodes||depth>PROVIDER_HTTP_LIMITS.depth)fail();
  space();if(source[at]==='"')return string();
  if(source[at]==='{'){
   at++;space();const out=Object.create(null),seen=new Set();
   if(source[at]!=='}')while(true){
    if(source[at]!=='"'||++members>PROVIDER_HTTP_LIMITS.members)fail();
    const key=string();if(seen.has(key))fail();seen.add(key);space();
    if(source[at++]!==':')fail();out[key]=value(depth+1);space();
    if(source[at]!==',')break;at++;space();
   }
   if(source[at++]!=='}')fail();return out;
  }
  if(source[at]==='['){
   at++;space();const out=[];
   // Array length is an own key in the original bounded snapshot.
   if(++members>PROVIDER_HTTP_LIMITS.members)fail();
   if(source[at]!==']')while(true){
    if(out.length>=PROVIDER_HTTP_LIMITS.array||++members>PROVIDER_HTTP_LIMITS.members)fail();
    out.push(value(depth+1));space();if(source[at]!==',')break;at++;space();
   }
   if(source[at++]!==']')fail();return out;
  }
  const token=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(source.slice(at));
  if(!token)fail();at+=token[0].length;const result=JSON.parse(token[0]);
  if(typeof result==='number'&&!Number.isFinite(result))fail();return result;
 };
 const result=value(0);space();if(at!==source.length)fail();return result;
}
export async function parseProviderHttpRequest(request){
 let reader,timer,abort;
 try{
  if(!(request instanceof Request)||request.signal.aborted)fail('HTTP_REQUEST_ABORTED');
  const url=new URL(request.url);
  if(url.pathname!=='/api/provider'||url.search||url.hash)fail('HTTP_ROUTE_INVALID',404);
  if(request.method!=='POST')fail('HTTP_METHOD_INVALID',405);
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??'')||
     ![null,'identity'].includes(request.headers.get('content-encoding')))fail('HTTP_MEDIA_TYPE_INVALID',415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^(?:0|[1-9][0-9]{0,5})$/.test(length)||Number(length)>PROVIDER_HTTP_LIMITS.bytes))fail('HTTP_BODY_TOO_LARGE',413);
  if(!request.body||request.bodyUsed)fail();reader=request.body.getReader();
  const stopped=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new HttpError(408,'HTTP_BODY_TIMEOUT')),PROVIDER_HTTP_LIMITS.readMillis);
   abort=()=>reject(new HttpError(400,'HTTP_REQUEST_ABORTED'));
   request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  });
  const chunks=[];let size=0;
  while(true){
   const {value,done}=await Promise.race([reader.read(),stopped]);if(done)break;
   if(!(value instanceof Uint8Array)||chunks.length>=PROVIDER_HTTP_LIMITS.chunks)fail();
   size+=value.byteLength;if(size>PROVIDER_HTTP_LIMITS.bytes)fail('HTTP_BODY_TOO_LARGE',413);
   // Do not retain caller-mutable stream backing buffers across the next await.
   chunks.push(new Uint8Array(value));
  }
  if(!size||length!==null&&size!==Number(length))fail();
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const {declarationDigest,...input}=snapshotProviderInput(parse(decoder.decode(bytes)));
  return Object.freeze(input);
 }catch(error){if(error instanceof HttpError)throw error;fail();}
 finally{
  clearTimeout(timer);if(abort)request?.signal?.removeEventListener('abort',abort);
  if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}
 }
}

// The resolver is installed only by server source. HTTP cannot supply a runner,
// registry, URL/model, credential, tokenizer, configuration or authority flag.
export function createProviderHandler({resolveRunner}={}){
 return async request=>{
  let abort;
  try{
   const input=await parseProviderHttpRequest(request);
   if(request.signal.aborted)fail('HTTP_REQUEST_ABORTED');
   if(typeof resolveRunner!=='function')return providerHttpResponse(providerHttpDenial('PROVIDER_REGISTRY_UNAVAILABLE'),503);
   const cancelled=new Promise((_,reject)=>{
    abort=()=>reject(new HttpError(400,'HTTP_REQUEST_ABORTED'));
    request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
   });
   const selected=await Promise.race([resolveRunner(),cancelled]);
   if(request.signal.aborted)fail('HTTP_REQUEST_ABORTED');
   if(!selected?.runner)return providerHttpResponse(providerHttpDenial(selected?.reason??'PROVIDER_UNAVAILABLE'),503);
   const current=()=>typeof selected.isCurrent==='function'&&requireSynchronous(selected.isCurrent())===true;
   if(!current())return providerHttpResponse(providerHttpDenial('PROVIDER_STOPPED'),503);
   // Exactly one call. Never retry after HTTP abort, exceptions or unknown ACK.
   const result=await selected.runner.run(input,{signal:request.signal});
   if(request.signal.aborted||!current())return providerHttpResponse(providerHttpDenial('PROVIDER_STOPPED'),503);
   return providerHttpResponse({...result,...flags},result.decision==='response_received'?200:503);
  }catch(error){return providerHttpResponse(providerHttpDenial(error instanceof HttpError?error.code:'PROVIDER_UNAVAILABLE'),error instanceof HttpError?error.status:503);}
  finally{if(abort)request.signal.removeEventListener('abort',abort);}
 };
}
