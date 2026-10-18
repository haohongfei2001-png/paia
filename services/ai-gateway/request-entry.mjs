import {exactData, snapshotRequest} from './signed-identity.mjs';
import {isReservationService} from './reservation-service.mjs';

export const MAX_REQUEST_BYTES = 24576;
const READ_DEADLINE_MS = 5000;
class HttpError extends Error { constructor(status, code) {super(code); this.status=status; this.code=code;} }
const fail = (code='HTTP_REQUEST_INVALID',status=400) => {throw new HttpError(status,code);};
const decoder = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});

// Exactly two object levels, no arrays, and duplicate detection BEFORE JSON.parse
// can discard names. Tokens remain strings in memory only. No request logging.
function parse(text) {
 let at=0, members=0;
 const space=()=>{while (/[\x20\t\r\n]/.test(text[at]??'\0')) at++;};
 const string=()=>{const start=at++; while(at<text.length){const c=text[at++];if(c==='\\'){at++;continue;}if(c==='"'){const value=JSON.parse(text.slice(start,at));if(!value.isWellFormed())fail();return value;}}fail();};
 const value=depth=>{
  space();if(text[at]==='"')return string();
  if(text[at]==='{'){
   if(depth>1)fail();at++;space();const out=Object.create(null),seen=new Set();
   if(text[at]!=='}')while(true){if(text[at]!=='"'||++members>20)fail();const key=string();if(seen.has(key))fail();seen.add(key);space();if(text[at++]!==':')fail();out[key]=value(depth+1);space();if(text[at]!==',')break;at++;space();}
   if(text[at++]!=='}')fail();return out;
  }
  const token=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
  if(!token)fail();at+=token[0].length;return JSON.parse(token[0]);
 };
 const result=value(0);space();if(at!==text.length)fail();return result;
}
export function snapshotBundle(input) {
 exactData(input,['request','principalToken','entitlementToken']);
 if(!['principalToken','entitlementToken'].every(key=>typeof input[key]==='string'&&input[key].length>0&&input[key].length<=8192))fail();
 return Object.freeze({request:snapshotRequest(input.request),principalToken:input.principalToken,entitlementToken:input.entitlementToken});
}
export async function parseHttpRequest(request) {
 let reader,timer,abort;
 try {
  if(!(request instanceof Request)||request.signal.aborted)fail();
  const url=new URL(request.url);
  if(url.pathname!=='/api/reservations'||url.search||url.hash)fail('HTTP_ROUTE_INVALID',404);
  if(request.method!=='POST')fail('HTTP_METHOD_INVALID',405);
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??'')||
     ![null,'identity'].includes(request.headers.get('content-encoding')))fail('HTTP_MEDIA_TYPE_INVALID',415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^(?:0|[1-9][0-9]{0,5})$/.test(length)||Number(length)>MAX_REQUEST_BYTES))fail('HTTP_BODY_TOO_LARGE',413);
  if(!request.body||request.bodyUsed)fail();
  reader=request.body.getReader();
  const stopped=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new HttpError(408,'HTTP_BODY_TIMEOUT')),READ_DEADLINE_MS);
   abort=()=>reject(new HttpError(400,'HTTP_REQUEST_ABORTED'));
   request.signal.addEventListener('abort',abort,{once:true});
   if(request.signal.aborted)abort();
  });
  const chunks=[];let size=0;
  while(true){const {value,done}=await Promise.race([reader.read(),stopped]);if(done)break;
   if(!(value instanceof Uint8Array)||chunks.length>=512)fail();size+=value.byteLength;if(size>MAX_REQUEST_BYTES)fail('HTTP_BODY_TOO_LARGE',413);chunks.push(value);
  }
  if(!size||length!==null&&size!==Number(length))fail();
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const input=parse(decoder.decode(bytes));exactData(input,['action','request','principalToken','entitlementToken']);
  if(!['reserve','cancel'].includes(input.action))fail();
  const {action,...bundle}=input;
  return Object.freeze({action,...snapshotBundle(bundle)});
 }catch(error){if(error instanceof HttpError)throw error;fail();}
 finally{clearTimeout(timer);if(abort)request?.signal?.removeEventListener('abort',abort);if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}}
}
const deny = reason=>({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
// Called once by a service-owned module, never with anything from request JSON.
export function createGatewayHandler({service}={}) {
 const configured=isReservationService(service);
 return async request=>{
  let status=200,result;
  try{
   const {action,...bundle}=await parseHttpRequest(request);
   if(!configured){status=503;result=deny('SERVICE_UNCONFIGURED');}
   else {result=await service[action](bundle);if(result.decision==='deny')status=result.reason==='AUTHORIZATION'?403:503;else if(result.decision==='outcome_unknown')status=503;}
  }catch(error){status=error instanceof HttpError?error.status:503;result=deny(error instanceof HttpError?error.code:'SERVICE_UNAVAILABLE');}
  return Response.json(result,{status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});
 };
}
