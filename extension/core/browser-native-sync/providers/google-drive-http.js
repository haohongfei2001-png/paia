import {GOOGLE_APPDATA_SCOPE} from './google-drive.js';
import {equal,exact,fail,SyncError} from '../value.js';

const origin='https://www.googleapis.com';
const fields='id,name,mimeType,spaces,trashed,size,appProperties';
const query=/^trashed = false and appProperties has \{ key='paiaProtocol' and value='1' \} and appProperties has \{ key='paiaDataset' and value='[a-f0-9]{64}' \}(?: and appProperties has \{ key='paiaDigest' and value='[a-f0-9]{64}' \}| and appProperties has \{ key='paiaKind' and value='checkpoint-manifest' \} and appProperties has \{ key='paiaRecovery' and value='grouped-v1' \})?$/;
function requestShape(r){
 if(!exact(r,['method','url','headers','body','signal','maxResponseBytes','binding'])||!['GET','POST'].includes(r.method)||typeof r.url!=='string'||!r.signal||typeof r.signal.addEventListener!=='function'||!Number.isSafeInteger(r.maxResponseBytes)||r.maxResponseBytes<1||r.maxResponseBytes>1024*1024)fail('BNS_PROVIDER_HTTP_REQUEST');
 let u;try{u=new URL(r.url);}catch{fail('BNS_PROVIDER_HTTP_REQUEST');}
 if(u.origin!==origin||u.username||u.password||u.hash||u.href!==r.url)fail('BNS_PROVIDER_HTTP_REQUEST');
 const params=[...u.searchParams.keys()];if(new Set(params).size!==params.length)fail('BNS_PROVIDER_HTTP_REQUEST');
 if(r.method==='POST'){
  if(u.pathname!=='/upload/drive/v3/files'||u.searchParams.get('uploadType')!=='multipart'||u.searchParams.get('fields')!=='id'||params.length!==2||!exact(r.headers,['Content-Type'])||!/^multipart\/related; boundary=paia_[a-f0-9]{32}$/.test(r.headers['Content-Type'])||!(r.body instanceof Uint8Array)||r.body.byteLength<1||r.body.byteLength>1024*1024+16384)fail('BNS_PROVIDER_HTTP_REQUEST');
 }else{
  if(!exact(r.headers,[])||r.body!==null)fail('BNS_PROVIDER_HTTP_REQUEST');
  if(u.pathname==='/drive/v3/files/generateIds'){
   if(params.length!==3||u.searchParams.get('count')!=='1'||u.searchParams.get('space')!=='appDataFolder'||u.searchParams.get('type')!=='files')fail('BNS_PROVIDER_HTTP_REQUEST');
  }else if(u.pathname==='/drive/v3/files'){
   if(params.some(k=>!['spaces','q','pageSize','fields','pageToken'].includes(k))||u.searchParams.get('spaces')!=='appDataFolder'||!query.test(u.searchParams.get('q')??'')||u.searchParams.get('fields')!==`nextPageToken,incompleteSearch,files(${fields})`||u.searchParams.has('pageToken')&&(!u.searchParams.get('pageToken')||u.searchParams.get('pageToken').length>2048||/[\u0000-\u001f]/.test(u.searchParams.get('pageToken')))||!/^([1-9]|[1-9][0-9]|100)$/.test(u.searchParams.get('pageSize')??''))fail('BNS_PROVIDER_HTTP_REQUEST');
  }else if(/^\/drive\/v3\/files\/[A-Za-z0-9_-]{1,256}$/.test(u.pathname)){
   if(params.length!==1||!(u.searchParams.get('alt')==='media'||params[0]==='fields'&&u.searchParams.get('fields')==='id,name,mimeType,spaces,trashed,size,appProperties'))fail('BNS_PROVIDER_HTTP_REQUEST');
  }else fail('BNS_PROVIDER_HTTP_REQUEST');
 }
}

// Private-to-transport capability: the qualified host supplies fetch and an
// ephemeral credential issuer. No default fetch, login, token persistence or
// product activation. Do not expose this function to page messages or DOM code.
export function createGoogleDriveHttpCapability({binding,isCurrent,authorize,fetchImpl}={}){
 if(!exact(binding,['subject','clientId','generation','scopes'])||!Array.isArray(binding.scopes)||binding.scopes.length!==1||binding.scopes[0]!==GOOGLE_APPDATA_SCOPE||typeof isCurrent!=='function'||typeof authorize!=='function'||typeof fetchImpl!=='function')fail('BNS_PROVIDER_BINDING');
 const bound=Object.freeze({...structuredClone(binding),scopes:Object.freeze([...binding.scopes])});
 const check=signal=>{if(signal.aborted||isCurrent(bound)!==true)fail('BNS_PROVIDER_BINDING_CHANGED');};
 return async request=>{
  requestShape(request);request={...request,headers:{...request.headers},binding:structuredClone(request.binding),body:request.body===null?null:Uint8Array.prototype.slice.call(request.body)};if(!equal(request.binding,bound))fail('BNS_PROVIDER_BINDING_CHANGED');const signal=request.signal;check(signal);
  let rejectAbort,reader=null,response=null,completed=false;
  const aborted=new Promise((_,reject)=>rejectAbort=()=>reject(new SyncError('BNS_PROVIDER_BINDING_CHANGED')));signal.addEventListener('abort',rejectAbort,{once:true});
  const wait=async action=>{check(signal);const value=await Promise.race([Promise.resolve().then(()=>{check(signal);return action();}),aborted]);check(signal);return value;};
  try{
   let grant;try{grant=await wait(()=>authorize(bound,{signal}));}catch(error){if(error instanceof SyncError)throw error;fail('BNS_PROVIDER_AUTH_REQUIRED');}
   if(!exact(grant,['binding','accessToken','expiresAt'])||!equal(grant.binding,bound)||typeof grant.accessToken!=='string'||grant.accessToken.length<1||grant.accessToken.length>8192||!/^[A-Za-z0-9._~+\/-]+=*$/.test(grant.accessToken)||!Number.isFinite(grant.expiresAt)||grant.expiresAt<=Date.now())fail('BNS_PROVIDER_AUTH_REQUIRED');
   // Never forward caller headers other than the validated content type. The
   // issuer must verify the account; an email or unverified token payload does
   // not mint this capability. Token material is not returned or logged.
   const outgoing=new Request(request.url,{method:request.method,headers:{...request.headers,Authorization:`Bearer ${grant.accessToken}`},body:request.body,signal,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});grant=null;
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
