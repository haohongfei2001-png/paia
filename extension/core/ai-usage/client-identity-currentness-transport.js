import {snapshotFilterReadRequest,filterReadRequestBindingData} from './filter-read-identity-data.js';
import {snapshot,exact,freeze,integer} from './qwen-request-data.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,opaque} from './contracts.js';
import {hashText} from '../dedupe.js';
import {parseQwenWireJson} from './qwen-wire-primitives.js';
// A dedicated, bounded metadata stream. A pulse confirms transport liveness;
// it NEVER extends the single original signed snapshot's identity lifetime.
const transports=new WeakMap(),connections=new WeakMap(),connectionFacts=new WeakMap(),reservations=new WeakMap();
// Source-only pre-acquisition tickets count against the SAME eight transport
// slots while a fresh issuer proof is pending. Copying a ticket cannot open it.
export const reserveClientIdentityCurrentnessTransport=t=>transports.get(t)?.reserve()??null;
export const releaseClientIdentityCurrentnessTransport=(t,r)=>transports.get(t)?.release(r)??false;
export const openReservedClientIdentityCurrentnessTransport=(t,r,b)=>transports.get(t)?.openReserved(r,b,false)??Promise.resolve(null);
export const openReservedClientFilterReadIdentityTransport=(t,r,b)=>transports.get(t)?.openReserved(r,b,true)??Promise.resolve(null);
const fields=['version','principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','observedAt','verifiedUntil','requestHash'];
const readFields=['version','purpose','principalId','libraryId','readerSessionId','consentEpoch','localBindingHash','policyId','tier','principalGeneration','entitlementGeneration','authorityGeneration','observedAt','verifiedUntil','readRequestHash'];
const flags=['financialAuthority','dispatchAllowed','retryAllowed'];
export const clientIdentityCurrentnessTransportDrained=t=>transports.get(t)?.drained()===true;
export const clientIdentityCurrentnessTransportOrigin=t=>transports.get(t)?.origin??null;
export const readClientIdentityCurrentnessConnection=(value,transport)=>{const m=connections.get(value);return m?.transport===transport&&m.profile==='financial'&&value.isCurrent()?m:null;};
export const readClientFilterReadIdentityConnection=(value,transport)=>{const m=connections.get(value);return m?.transport===transport&&m.profile==='filter-read'&&value.isCurrent()?m:null;};
export function createClientIdentityCurrentnessTransport(options){
 let endpoint,origin,send,clock;
 try{
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options)))return null;
  const ds=Object.getOwnPropertyDescriptors(options),keys=Reflect.ownKeys(ds);
  if(!keys.includes('endpoint')||keys.some(k=>!['endpoint','fetch','clock'].includes(k)||!Object.hasOwn(ds[k],'value')))return null;
  const u=new URL(ds.endpoint.value);send=ds.fetch?.value??globalThis.fetch;clock=ds.clock?.value??Date.now;
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/api/identity-currentness'||typeof send!=='function'||typeof clock!=='function')return null;
  endpoint=u.href;origin=u.origin;
 }catch{return null;}
 const active=new Set(),occupied=new Set();let disposed=false,transport,opening=0;
 const reserve=()=>{if(disposed||occupied.size+opening>=8)return null;const ticket=Object.freeze(Object.create(null));opening++;reservations.set(ticket,{transport,active:true});return ticket;};
 const release=ticket=>{const held=reservations.get(ticket);if(!held||held.transport!==transport||!held.active)return false;held.active=false;opening--;return true;};
 async function open(input,ticket=null,readPurpose=false){
  if(ticket!==null){const held=reservations.get(ticket);if(!held||held.transport!==transport||!held.active)return null;held.active=false;if(disposed){opening--;return null;}}
  else {if(disposed||occupied.size+opening>=8)return null;opening++;}
  let bundle,requestHash;
  try{bundle=snapshot(input,{maxBytes:24576,maxKeys:32,maxDepth:2,maxString:8192});
   if(!exact(bundle,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof bundle[k]==='string'&&bundle[k].length>0&&bundle[k].length<=8192))return null;
   bundle.request=readPurpose?snapshotFilterReadRequest(bundle.request):clientDeclarationRequestData(bundle.request);requestHash=await hashText(readPurpose?filterReadRequestBindingData(bundle.request):canonical(bundle.request));
  }catch{return null;}finally{opening--;}
  if(disposed||occupied.size>=8)return null;
  const request=freeze(structuredClone(bundle.request)),abort=new AbortController(),listeners=new Set();
  let reader=null,timer=null,closed=false,ready=false,fetchPending=true,last=-1,lastPulse=-1,identity=null,connection=null,resolveReady;
  const result=new Promise(resolve=>{resolveReady=resolve;});
  const close=()=>{if(closed)return;closed=true;ready=false;active.delete(close);if(!fetchPending)occupied.delete(close);clearTimeout(timer);abort.abort();resolveReady(null);if(reader)reader.cancel().catch(()=>{});for(const fn of listeners)try{fn();}catch{}listeners.clear();};
  const now=()=>{let n;try{n=clock();}catch{}if(!integer(n)||n<last){close();return null;}last=n;return n;};
  const live=()=>{if(closed||!ready)return false;const n=now();if(n===null||n<identity.observedAt||n>=identity.verifiedUntil||n-lastPulse>=3000){close();return false;}return true;};
  const arm=ms=>{clearTimeout(timer);timer=setTimeout(close,ms);timer.unref?.();};
  active.add(close);occupied.add(close);arm(5000);
  let body=JSON.stringify({action:readPurpose?'observe-filter-read':'observe',...bundle});bundle=null;
  let outgoing=new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:abort.signal});body=null;
  // Consume independently of the caller, so revocation/EOF takes effect even
  // while the original Filter owner is performing a local storage retry.
  (async()=>{
   try{
    // A configured wrapper may ignore abort. Until its original fetch promise
    // settles it still occupies one of eight slots, even after local denial.
    const fetchResult=send(outgoing);outgoing=null;const response=await fetchResult;fetchPending=false;
    if(closed){occupied.delete(close);response?.body?.cancel().catch(()=>{});return;}
    if(!(response instanceof Response)||response.status!==200||!response.body||response.redirected||response.url&&response.url!==endpoint||
     !/^application\/x-ndjson(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type')??'')||![null,'identity'].includes(response.headers.get('content-encoding'))||response.headers.get('content-length')!==null){if(response instanceof Response)response.body?.cancel().catch(()=>{});throw Error();}
    reader=response.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let pending='',bytes=0,frames=0;
    for(;;){
     const {done,value}=await reader.read();if(closed)return;if(done){if(decoder.decode()||pending)throw Error();break;}
     if(!(value instanceof Uint8Array)||(bytes+=value.length)>8192)throw Error();pending+=decoder.decode(value,{stream:true});
     let end;while((end=pending.indexOf('\n'))>=0){
      const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line||new TextEncoder().encode(line).length>2048||frames>=61)throw Error();
      const limits={maxBytes:2048,maxDepth:2,maxKeys:24,maxStringBytes:200};
      const v=parseQwenWireJson(line,limits,{keys:0},()=>{throw Error();},{json:'IDENTITY_CHANNEL_INVALID',duplicate:'IDENTITY_CHANNEL_INVALID'}),at=now();
      if(at===null||v.version!==1||v.sequence!==frames++)throw Error();
      if(!ready){
       if(!exact(v,['version','type','sequence','identity',...flags])||v.type!=='ready'||v.sequence!==0||!flags.every(k=>v[k]===false))throw Error();
       const i=v.identity;if(!exact(i,readPurpose?readFields:fields)||i.version!==1||!(readPurpose?['purpose','principalId','libraryId','readerSessionId','consentEpoch','localBindingHash','policyId']:['principalId','libraryId','operationId','jobType']).every(k=>i[k]===request[k])||!['free','pro'].includes(i.tier)||!['principalGeneration','entitlementGeneration','authorityGeneration'].every(k=>opaque(i[k]))||i[readPurpose?'readRequestHash':'requestHash']!==requestHash||!integer(i.observedAt)||!integer(i.verifiedUntil)||i.observedAt>at||i.verifiedUntil<=at||i.verifiedUntil-i.observedAt>60000)throw Error();
       identity=freeze(i);lastPulse=at;ready=true;
       connection=Object.freeze({isCurrent:live,onInvalidate(fn){if(typeof fn!=='function')return null;if(closed){fn();return ()=>{};}listeners.add(fn);return ()=>listeners.delete(fn);},close});
       connections.set(connection,freeze({transport,origin,request,identity,profile:readPurpose?'filter-read':'financial'}));connectionFacts.set(connection,at=>!disposed&&!closed&&ready&&!abort.signal.aborted&&active.has(close)&&occupied.has(close)&&integer(at)&&at>=last&&at>=identity.observedAt&&at<identity.verifiedUntil&&at-lastPulse<3000);resolveReady(connection);
      }else if(!exact(v,['version','type','sequence'])||v.type!=='pulse'||!live())throw Error();
      lastPulse=at;arm(Math.min(3000,identity.verifiedUntil-at));
     }
     if(new TextEncoder().encode(pending).length>2048)throw Error();
    }
   }catch{/* Invalid, unknown or interrupted observations never authorize. */}
   finally{outgoing=null;fetchPending=false;close();occupied.delete(close);try{reader?.releaseLock();}catch{}}
  })();
  return result;
 }
 transport=Object.freeze({open:input=>open(input,null,false),openFilterRead:input=>open(input,null,true),dispose(){disposed=true;for(const close of [...active])close();}});transports.set(transport,{origin,reserve,release,drained:()=>occupied.size+opening===0,openReserved:(ticket,bundle,readPurpose)=>open(bundle,ticket,readPurpose)});return transport;
}
// Status identity may be observed after the channel's snapshot. It must still
// name exactly that connection's request and all authenticated generations.
function matchesIdentity(m,identity){
 const i=m?.identity;
 return !!i&&identity&&['principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','requestHash'].every(k=>identity[k]===i[k])&&
  integer(identity.observedAt)&&identity.observedAt>=i.observedAt&&integer(identity.verifiedUntil)&&identity.verifiedUntil<=i.verifiedUntil&&identity.verifiedUntil>identity.observedAt;
}

export function identityMatchesCurrentnessConnection(connection,transport,identity){return matchesIdentity(readClientIdentityCurrentnessConnection(connection,transport),identity);}
// This tail fence only reads this transport's original private connection state.
// Full clock/pulse qualification must already have run through isCurrent.
export function identityMatchesCurrentnessConnectionFacts(connection,transport,identity,at){const m=connections.get(connection);return m?.transport===transport&&m.profile==='financial'&&connectionFacts.get(connection)?.(at)===true&&matchesIdentity(m,identity);}

// Final sampled-clock facts; these readers never invoke connection.isCurrent.
export const readClientIdentityCurrentnessConnectionFacts=(value,transport,at)=>{const m=connections.get(value);return m?.transport===transport&&m.profile==='financial'&&connectionFacts.get(value)?.(at)===true?m:null;};
export const readClientFilterReadIdentityConnectionFacts=(value,transport,at)=>{const m=connections.get(value);return m?.transport===transport&&m.profile==='filter-read'&&connectionFacts.get(value)?.(at)===true?m:null;};
