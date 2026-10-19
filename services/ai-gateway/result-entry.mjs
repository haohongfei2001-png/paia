import {HttpError} from './request-entry.mjs';
import {exactData,requireSynchronous} from './signed-identity.mjs';
import {snapshotResultBundle,snapshotResultDeclaration} from './result-declaration.mjs';
import {isResultService} from './result-service.mjs';

export const RESULT_HTTP_LIMITS=Object.freeze({bytes:24576,depth:3,members:40,array:4,chunks:512,readMillis:5000});
const fail=(code='HTTP_REQUEST_INVALID',status=400)=>{throw new HttpError(status,code);};
const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const deny=reason=>({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
// Duplicate decoded names must be refused before JSON.parse can erase them.
// Only the exact result metadata DTO is returned; no bodies or errors are logged.
function parse(source){
 let at=0,members=0;
 const space=()=>{while(/[\x20\t\r\n]/.test(source[at]??'\0'))at++;};
 const string=()=>{const start=at++;while(at<source.length){const c=source[at++];if(c==='\\'){at++;continue;}if(c==='"'){const value=JSON.parse(source.slice(start,at));if(!value.isWellFormed())fail();return value;}}fail();};
 const value=depth=>{
  if(depth>RESULT_HTTP_LIMITS.depth+1)fail();space();
  if(source[at]==='"')return string();
  if(source[at]==='{'){
   if(depth>RESULT_HTTP_LIMITS.depth)fail();
   at++;space();const out=Object.create(null),seen=new Set();
   if(source[at]!=='}')while(true){if(source[at]!=='"'||++members>RESULT_HTTP_LIMITS.members)fail();const key=string();if(seen.has(key))fail();seen.add(key);space();if(source[at++]!==':')fail();out[key]=value(depth+1);space();if(source[at]!==',')break;at++;space();}
   if(source[at++]!=='}')fail();return out;
  }
  if(source[at]==='['){
   if(depth>RESULT_HTTP_LIMITS.depth)fail();
   at++;space();const out=[];
   if(source[at]!==']')while(true){if(out.length>=RESULT_HTTP_LIMITS.array)fail();out.push(value(depth+1));space();if(source[at]!==',')break;at++;space();}
   if(source[at++]!==']')fail();return out;
  }
  const token=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(source.slice(at));if(!token)fail();at+=token[0].length;return JSON.parse(token[0]);
 };
 const result=value(0);space();if(at!==source.length)fail();return result;
}
export async function parseResultHttpRequest(request){
 let reader,timer,abort;
 try{
  if(!(request instanceof Request)||request.signal.aborted)fail('HTTP_REQUEST_ABORTED');
  const url=new URL(request.url);if(url.pathname!=='/api/results'||url.search||url.hash)fail('HTTP_ROUTE_INVALID',404);
  if(request.method!=='POST')fail('HTTP_METHOD_INVALID',405);
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??'')||![null,'identity'].includes(request.headers.get('content-encoding')))fail('HTTP_MEDIA_TYPE_INVALID',415);
  const length=request.headers.get('content-length');if(length!==null&&(!/^(?:0|[1-9][0-9]{0,5})$/.test(length)||Number(length)>RESULT_HTTP_LIMITS.bytes))fail('HTTP_BODY_TOO_LARGE',413);
  if(!request.body||request.bodyUsed)fail();reader=request.body.getReader();
  const stopped=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new HttpError(408,'HTTP_BODY_TIMEOUT')),RESULT_HTTP_LIMITS.readMillis);abort=()=>reject(new HttpError(400,'HTTP_REQUEST_ABORTED'));request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();});
  const chunks=[];let size=0;
  while(true){const {value,done}=await Promise.race([reader.read(),stopped]);if(done)break;
   if(!(value instanceof Uint8Array)||chunks.length>=RESULT_HTTP_LIMITS.chunks)fail();size+=value.byteLength;if(size>RESULT_HTTP_LIMITS.bytes)fail('HTTP_BODY_TOO_LARGE',413);chunks.push(new Uint8Array(value));}
  if(!size||length!==null&&size!==Number(length))fail();
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const input=parse(decoder.decode(bytes));exactData(input,['action','request','principalToken','entitlementToken','result']);
  if(input.action!=='finalize')fail();const {action,result,...rest}=input,bundle=snapshotResultBundle(rest);
  return Object.freeze({bundle,result:snapshotResultDeclaration(bundle.request,result)});
 }catch(error){if(error instanceof HttpError)throw error;fail();}
 finally{clearTimeout(timer);if(abort)request?.signal?.removeEventListener('abort',abort);if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}}
}
export function createResultHandler({service,resolveService}={}){
 return async request=>{
  let result,status=200;
  try{
   const parsed=await parseResultHttpRequest(request);
   const selected=typeof resolveService==='function'?await resolveService():null;
   const active=typeof resolveService==='function'?selected?.service:service;
   const current=isResultService(active)&&(typeof resolveService!=='function'||typeof selected?.isCurrent==='function'&&requireSynchronous(selected.isCurrent())===true);
   if(request.signal.aborted)fail('HTTP_REQUEST_ABORTED');
   if(!current){status=503;result=deny('SERVICE_UNCONFIGURED');}
   else{result=await active.finalize(parsed.bundle,parsed.result);if(result.decision==='deny')status=result.reason==='AUTHORIZATION'?403:503;else if(result.decision==='outcome_unknown')status=503;}
  }catch(error){status=error instanceof HttpError?error.status:503;result=deny(error instanceof HttpError?error.code:'SERVICE_UNAVAILABLE');}
  return Response.json(result,{status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});
 };
}
