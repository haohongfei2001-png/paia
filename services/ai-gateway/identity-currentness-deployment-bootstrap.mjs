import {Pool} from 'pg';
import {snapshotDeploymentEnvironment,sameDeploymentSnapshot,compileDeploymentConfig} from './deployment-config.mjs';
import {HttpError} from './request-entry.mjs';
import {parseIdentityCurrentnessRequest,createIdentityCurrentnessHandler} from './identity-currentness-entry.mjs';
import {createPostgresIdentityCurrentnessService} from './identity-currentness-service.mjs';

const LIMIT=8,LIFETIME=55000,DRAIN=5000;
const deny=(reason='SERVICE_UNAVAILABLE',status=503)=>Response.json({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false},
 {status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function snapshotIdentityCurrentnessEnvironment(environment){
 try{return environment?.PAIA_IDENTITY_CURRENTNESS_ENABLED==='true'?snapshotDeploymentEnvironment(environment):Object.freeze({enabled:false});}
 catch{return Object.freeze({enabled:true,invalid:true});}
}
function bounded(promise,millis){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CURRENTNESS_DRAIN_TIMEOUT')),millis);})]).finally(()=>clearTimeout(timer));}
// Source-only default-off streaming lifecycle. HTTP input cannot choose the
// Pool, verifier, schema, limits, environment or service constructors. The
// original finite-response financial deployment runtime remains unchanged.
export function createIdentityCurrentnessDeploymentGateway({readEnvironment=()=>process.env}={}){
 let current=null,live=null,serial=Promise.resolve(),closed=false,blocked=false,closing=null;const slots=new Set();
 const snapshot=()=>{try{return snapshotIdentityCurrentnessEnvironment(readEnvironment());}catch{return Object.freeze({enabled:true,invalid:true});}};
 const retire=entry=>{
  if(!entry)return Promise.resolve(true);entry.failed=true;entry.service?.dispose();
  for(const slot of slots)if(slot.entry===entry)slot.close();
  if(!entry.pool)return Promise.resolve(true);
  if(!entry.retired)entry.retired=bounded(Promise.resolve().then(()=>entry.pool.end()).then(()=>entry.clients.size||entry.acquisitions?new Promise(resolve=>{entry.removed=resolve;}):undefined),DRAIN).then(()=>{if(live===entry)live=null;return true;},()=>{blocked=true;return false;});
  return entry.retired;
 };
 async function resolve(){
  if(closed||blocked)return null;const input=snapshot();
  if(!current||!sameDeploymentSnapshot(current.input,input)){
   const prior=current,entry={input,pool:null,service:null,failed:false,retired:null,clients:new Set(),acquisitions:0,removed:null};current=entry;
   // Discovery on this admitted request immediately revokes old streams. A deployment
   // config change alone is not a push notification and is not claimed as one.
   const retirement=retire(prior);
   entry.ready=serial.then(async()=>{
    await retirement;if(closed||blocked||current!==entry)return;
    let config;try{config=compileDeploymentConfig(input);}catch{entry.failed=true;return;}if(!config)return;
    try{
     entry.pool=new Pool({...config.poolOptions,max:LIMIT,min:0,application_name:'paia-identity-currentness-v1',fallback_application_name:'paia-identity-currentness-v1'});live=entry;
     // pg Pool.end() can resolve after release removed a client from the pool
     // array but before its actual end callback. Public connect/remove events
     // retain that physical lifecycle until removal is acknowledged too.
     const drained=()=>{if(!entry.clients.size&&!entry.acquisitions)entry.removed?.();};
     entry.pool.on('connect',client=>entry.clients.add(client));
     entry.pool.on('remove',client=>{entry.clients.delete(client);drained();});
     // Reserve before invoking the actual Pool API. HTTP admissions can race
     // with physically closing clients that pg already removed from _clients.
     // A timed-out service open does not free this unresolved acquisition.
     const connect=entry.pool.connect.bind(entry.pool);
     entry.pool.connect=()=>{
      if(entry.failed||entry.clients.size+entry.acquisitions>=LIMIT)return Promise.reject(Error('IDENTITY_CHANNEL_CAPACITY'));
      entry.acquisitions++;let pending;try{pending=connect();}catch(error){entry.acquisitions--;drained();throw error;}
      return Promise.resolve(pending).finally(()=>{entry.acquisitions--;drained();});
     };
     entry.pool.on('error',()=>{void retire(entry);});
     entry.service=createPostgresIdentityCurrentnessService({pool:entry.pool,identityConfig:config.identityConfig,profileId:config.profileId});
    }catch{entry.failed=true;await retire(entry);}
   });serial=entry.ready.catch(()=>{entry.failed=true;blocked=true;});
  }
  const entry=current;await entry.ready;
  if(closed||blocked||current!==entry||entry.failed||!sameDeploymentSnapshot(entry.input,snapshot())){if(current===entry)void retire(entry);return null;}
  return entry.service?entry:null;
 }
 const gateway={
  async fetch(request){
   if(closed||blocked||slots.size>=LIMIT||live?.clients.size>=LIMIT||!(request instanceof Request))return deny();
   const abort=new AbortController();let stopped;const stop=new Promise(resolve=>{stopped=()=>resolve(deny());});
   const slot={entry:null,tasks:0,closed:false,bodyReader:null,bodyCancelled:null,outputReader:null,outputController:null,outputCancelled:null,timer:null,remove:null};
   const release=()=>{if(slot.closed&&slot.tasks===0)slots.delete(slot);};
   const track=promise=>{slot.tasks++;return Promise.resolve(promise).finally(()=>{slot.tasks--;release();});};
   const cancelBody=()=>{if(slot.bodyReader&&!slot.bodyCancelled){try{slot.bodyCancelled=track(slot.bodyReader.cancel()).catch(()=>{});}catch{slot.bodyCancelled=Promise.resolve();}}return slot.bodyCancelled;};
   const cancelOutput=()=>{if(slot.outputReader&&!slot.outputCancelled){try{slot.outputCancelled=track(slot.outputReader.cancel()).catch(()=>{});}catch{slot.outputCancelled=Promise.resolve();}}return slot.outputCancelled;};
   slot.close=()=>{if(slot.closed)return;slot.closed=true;clearTimeout(slot.timer);slot.remove?.();abort.abort();cancelBody();cancelOutput();try{slot.outputController?.close();}catch{}stopped();release();};
   slots.add(slot);slot.timer=setTimeout(slot.close,LIFETIME);slot.timer.unref?.();request.signal.addEventListener('abort',slot.close,{once:true});slot.remove=()=>request.signal.removeEventListener('abort',slot.close);
   const task=track((async()=>{
    try{
     if(request.signal.aborted||request.bodyUsed)throw new HttpError(400,'HTTP_REQUEST_ABORTED');
     let body;if(request.body){slot.bodyReader=request.body.getReader();body=new ReadableStream({
      async pull(controller){try{const item=await track(slot.bodyReader.read());if(item.done)controller.close();else controller.enqueue(item.value);}catch{try{controller.error(Error('HTTP_BODY_UNAVAILABLE'));}catch{}}},
      cancel:()=>cancelBody()
     },{highWaterMark:0});}
     // Original strict parser still owns HTTP grammar, bytes and its 5s body
     // deadline. The forwarding reader additionally owns delayed cancellation.
     const input=new Request(request.url,{method:request.method,headers:request.headers,...(body?{body,duplex:'half'}:{}),signal:AbortSignal.any([request.signal,abort.signal])});
     const bundle=await parseIdentityCurrentnessRequest(input);if(slot.closed)return deny();
     const entry=await resolve();if(slot.closed||!entry)return deny();slot.entry=entry;
     const normalized=new Request(request.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'observe',...bundle}),signal:input.signal});
     const response=await createIdentityCurrentnessHandler({service:entry.service})(normalized);
     if(slot.closed){await response.body?.cancel();return deny();}
     if(response.status!==200||!response.body)return response;
     slot.outputReader=response.body.getReader();
     const stream=new ReadableStream({start(controller){slot.outputController=controller;},cancel:()=>{slot.close();return slot.outputCancelled;}});
     // Bounded one-chunk forwarding also observes EOF when the caller abandons
     // its Response. Backpressure denies instead of retaining a hidden stream.
     void track((async()=>{try{while(!slot.closed){const item=await slot.outputReader.read();if(item.done)break;if(slot.outputController.desiredSize<=0)break;slot.outputController.enqueue(item.value);}}catch{}finally{slot.close();}})()).catch(()=>{});
     return new Response(stream,{status:200,headers:response.headers});
    }catch(error){return deny(error instanceof HttpError?error.code:'SERVICE_UNAVAILABLE',error instanceof HttpError?error.status:503);}
   })());
   task.then(response=>{if(response.status!==200)slot.close();},()=>slot.close());
   return Promise.race([task,stop]);
  },
  close(){
   if(!closing){closed=true;for(const slot of [...slots])slot.close();const retiring=retire(live);closing=bounded(Promise.all([serial,retiring]),DRAIN).then(()=>Object.freeze({closed:true,drained:!blocked&&live===null&&slots.size===0}),()=>{blocked=true;return Object.freeze({closed:true,drained:false});});}
   return closing;
  }
 };return Object.freeze(gateway);
}
