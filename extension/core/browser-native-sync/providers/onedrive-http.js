import {ONEDRIVE_APPFOLDER_SCOPE} from './onedrive.js';
import {bytes,equal,exact,fail,SyncError} from '../value.js';
const origin='https://graph.microsoft.com';
const prefix='/v1.0/me/drive';
const fields='id,name,size,file,folder,deleted,remoteItem,parentReference,eTag,@microsoft.graph.downloadUrl';
const name=/^paia-bns1_[a-f0-9]{64}_(chunk|segment|descriptor|checkpoint-shard|checkpoint-manifest)_(identity|gzip)_[1-9][0-9]*_[1-9][0-9]*_[a-f0-9]{64}_[go]\.bin$/;
function requestShape(r){
 if(!exact(r,['method','url','headers','body','signal','maxResponseBytes','binding','authorization'])||!['GET','POST','PUT'].includes(r.method)||typeof r.url!=='string'||!r.signal||typeof r.signal.addEventListener!=='function'||!Number.isSafeInteger(r.maxResponseBytes)||r.maxResponseBytes<1||r.maxResponseBytes>1024*1024)fail('BNS_PROVIDER_HTTP_REQUEST');
 let u;try{u=new URL(r.url);}catch{fail('BNS_PROVIDER_HTTP_REQUEST');}if(u.href!==r.url||u.protocol!=='https:'||u.username||u.password||u.hash||u.port)fail('BNS_PROVIDER_HTTP_REQUEST');
 if(r.authorization==='none'){
  const suffix=r.method==='PUT'?'.up.1drv.com':'.files.1drv.com';if(!u.hostname.endsWith(suffix)||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(u.hostname.slice(0,-suffix.length)))fail('BNS_PROVIDER_HTTP_REQUEST');
  if(r.method==='GET'){if(!exact(r.headers,[])||r.body!==null)fail('BNS_PROVIDER_HTTP_REQUEST');}
  else if(r.method==='PUT'){if(!(r.body instanceof Uint8Array)||r.body.length<1||r.body.length>1024*1024||!exact(r.headers,['Content-Length','Content-Range'])||r.headers['Content-Length']!==String(r.body.length)||r.headers['Content-Range']!==`bytes 0-${r.body.length-1}/${r.body.length}`)fail('BNS_PROVIDER_HTTP_REQUEST');}
  else fail('BNS_PROVIDER_HTTP_REQUEST');return;
 }
 if(r.authorization!=='graph'||u.origin!==origin)fail('BNS_PROVIDER_HTTP_REQUEST');const params=[...u.searchParams.keys()];if(new Set(params).size!==params.length)fail('BNS_PROVIDER_HTTP_REQUEST');
 if(r.method==='POST'){
  const m=/^\/v1\.0\/me\/drive\/items\/[A-Za-z0-9!_-]{1,256}:\/(.+):\/createUploadSession$/.exec(u.pathname);if(!m||!name.test(m[1])||params.length||!exact(r.headers,['Content-Type'])||r.headers['Content-Type']!=='application/json'||!(r.body instanceof Uint8Array)||r.body.length>2048)fail('BNS_PROVIDER_HTTP_REQUEST');
  let v;try{v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(r.body));}catch{fail('BNS_PROVIDER_HTTP_REQUEST');}const expected={item:{'@microsoft.graph.conflictBehavior':'fail',name:m[1]},deferCommit:false};if(!equal(v,expected)||!equal([...r.body],[...bytes(expected)]))fail('BNS_PROVIDER_HTTP_REQUEST');return;
 }
 if(r.method!=='GET'||r.body!==null||!exact(r.headers,[]))fail('BNS_PROVIDER_HTTP_REQUEST');
 if(u.pathname===prefix+'/special/approot'){if(params.length!==1||u.searchParams.get('$select')!=='id,folder,specialFolder,parentReference')fail('BNS_PROVIDER_HTTP_REQUEST');return;}
 if(/^\/v1\.0\/me\/drive\/items\/[A-Za-z0-9!_-]{1,256}\/children$/.test(u.pathname)){if(params.some(k=>!['$top','$select','$skiptoken'].includes(k))||!/^([1-9]|[1-9][0-9]|100)$/.test(u.searchParams.get('$top')??'')||u.searchParams.get('$select')!==fields||u.searchParams.has('$skiptoken')&&(!u.searchParams.get('$skiptoken')||u.searchParams.get('$skiptoken').length>4096||/[\u0000-\u001f]/.test(u.searchParams.get('$skiptoken'))))fail('BNS_PROVIDER_HTTP_REQUEST');return;}
 const m=/^\/v1\.0\/me\/drive\/items\/[A-Za-z0-9!_-]{1,256}:\/(.+)$/.exec(u.pathname);if(!m||!name.test(m[1])||params.length!==1||u.searchParams.get('$select')!==fields)fail('BNS_PROVIDER_HTTP_REQUEST');
}

// Private-to-transport capability: the qualified host supplies fetch and an
// ephemeral credential issuer. No default fetch, login, token persistence or
// product activation. Do not expose this function to page messages or DOM code.
export function createOneDriveHttpCapability({binding,isCurrent,authorize,fetchImpl}={}){
 if(!exact(binding,['subject','tenantId','clientId','generation','scopes'])||binding.tenantId!=='9188040d-6c67-4c5b-b112-36a304b66dad'||!Array.isArray(binding.scopes)||binding.scopes.length!==1||binding.scopes[0]!==ONEDRIVE_APPFOLDER_SCOPE||typeof isCurrent!=='function'||typeof authorize!=='function'||typeof fetchImpl!=='function')fail('BNS_PROVIDER_BINDING');
 const bound=Object.freeze({...structuredClone(binding),scopes:Object.freeze([...binding.scopes])});
 const check=signal=>{if(signal.aborted||isCurrent(bound)!==true)fail('BNS_PROVIDER_BINDING_CHANGED');};
 return async request=>{
  requestShape(request);request={...request,headers:{...request.headers},binding:structuredClone(request.binding),body:request.body===null?null:Uint8Array.prototype.slice.call(request.body)};if(!equal(request.binding,bound))fail('BNS_PROVIDER_BINDING_CHANGED');const signal=request.signal;check(signal);
  let rejectAbort,reader=null,response=null,completed=false;
  const aborted=new Promise((_,reject)=>rejectAbort=()=>reject(new SyncError('BNS_PROVIDER_BINDING_CHANGED')));signal.addEventListener('abort',rejectAbort,{once:true});
  const wait=async action=>{check(signal);const value=await Promise.race([Promise.resolve().then(()=>{check(signal);return action();}),aborted]);check(signal);return value;};
  try{
   let grant=null;if(request.authorization==='graph'){try{grant=await wait(()=>authorize(bound,{signal}));}catch(error){if(error instanceof SyncError)throw error;fail('BNS_PROVIDER_AUTH_REQUIRED');}
   if(!exact(grant,['binding','accessToken','expiresAt'])||!equal(grant.binding,bound)||typeof grant.accessToken!=='string'||grant.accessToken.length<1||grant.accessToken.length>8192||!/^[A-Za-z0-9._~+\/-]+=*$/.test(grant.accessToken)||!Number.isFinite(grant.expiresAt)||grant.expiresAt<=Date.now())fail('BNS_PROVIDER_AUTH_REQUIRED');}
   // Never forward caller headers other than the validated content type. The
   // issuer must verify the account; an email or unverified token payload does
   // not mint this capability. Token material is not returned or logged.
   const outgoing=new Request(request.url,{method:request.method,headers:{...request.headers,...(grant?{Authorization:`Bearer ${grant.accessToken}`}:{})},body:request.body,signal,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});grant=null;
   try{response=await wait(()=>{const pending=Promise.resolve(fetchImpl(outgoing));pending.then(late=>{response=late;if(signal.aborted||isCurrent(bound)!==true)Promise.resolve(late?.body?.cancel?.()).catch(()=>{});},()=>{});return pending;});}catch(error){if(error instanceof SyncError)throw error;fail('BNS_PROVIDER_COMPLETION_UNKNOWN');}
   if(!response||response.redirected||response.url!==request.url||!Number.isInteger(response.status)||response.status<200||response.status>599||response.type==='opaque'||typeof response.headers?.get!=='function'||response.body!==null&&typeof response.body?.getReader!=='function')fail('BNS_PROVIDER_HTTP_RESPONSE');
   const advertised=response.headers.get('content-length');if(advertised!==null&&(!/^(0|[1-9][0-9]*)$/.test(advertised)||!Number.isSafeInteger(Number(advertised))||Number(advertised)>request.maxResponseBytes))fail('BNS_PROVIDER_HTTP_LIMIT');
   if(response.body===null)return {status:response.status,body:new Uint8Array()};
   reader=response.body.getReader();const chunks=[];let total=0,reads=0;
   for(;;){if(++reads>4096)fail('BNS_PROVIDER_HTTP_LIMIT');const result=await wait(()=>reader.read());if(result.done){completed=true;break;}if(!(result.value instanceof Uint8Array)||result.value.byteLength>request.maxResponseBytes-total)fail('BNS_PROVIDER_HTTP_LIMIT');total+=result.value.byteLength;chunks.push(result.value.slice());}
   const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}check(signal);return {status:response.status,body};
  }catch(error){if(error instanceof SyncError)throw error;fail('BNS_PROVIDER_COMPLETION_UNKNOWN');}finally{
   signal.removeEventListener('abort',rejectAbort);
   // Do not let a broken injected stream's cancellation hold completion open.
   if(!reader&&response?.body)Promise.resolve().then(()=>response.body.cancel?.()).catch(()=>{});
   if(reader&&!completed)Promise.resolve().then(()=>reader.cancel()).catch(()=>{});
   if(reader&&completed)reader.releaseLock?.();
  }
 };
}
