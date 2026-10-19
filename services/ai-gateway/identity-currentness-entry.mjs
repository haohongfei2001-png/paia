import {HttpError,parseMetadataRequest} from './request-entry.mjs';
import {exactData,snapshotFilterReadBundle} from './signed-identity.mjs';
import {snapshotResultBundle} from './result-declaration.mjs';
import {isIdentityCurrentnessService,isIdentityCurrentnessConnection} from './identity-currentness-service.mjs';
const readRequests=new WeakSet();
const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
const headers={'cache-control':'no-store','content-type':'application/x-ndjson; charset=utf-8','x-content-type-options':'nosniff','x-accel-buffering':'no'};
export async function parseIdentityCurrentnessRequest(request){
 try{const input=await parseMetadataRequest(request,{pathname:'/api/identity-currentness',maxMembers:20});
  exactData(input,['action','request','principalToken','entitlementToken']);if(!['observe','observe-filter-read'].includes(input.action))throw Error();
  const {action,...bundle}=input;if(action==='observe'){return snapshotResultBundle(bundle);}
  const read=snapshotFilterReadBundle(bundle);readRequests.add(read);return read;
 }catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'HTTP_REQUEST_INVALID');}
}
// No deployment configuration or service activation. A deployment owner must
// supply the source-created service and retain its bounded streaming lifetime.
// Existing finite financial JSON endpoints do not use this handler.
export function createIdentityCurrentnessHandler({service=null}={}){
 return async request=>{
  try{
   const bundle=await parseIdentityCurrentnessRequest(request);
   if(!isIdentityCurrentnessService(service))throw new HttpError(503,'SERVICE_UNCONFIGURED');
   const channel=await (readRequests.has(bundle)?service.openFilterRead(bundle,{signal:request.signal}):service.open(bundle,{signal:request.signal}));
   if(!isIdentityCurrentnessConnection(channel)||!channel.isCurrent())throw new HttpError(503,'IDENTITY_UNAVAILABLE');
   let controller,closed=false,timer,remove,sequence=0,bytes=0;
   const close=()=>{if(closed)return;closed=true;clearInterval(timer);remove?.();channel.close();try{controller?.close();}catch{}};
   const stream=new ReadableStream({
    start(c){controller=c;remove=channel.onInvalidate(close);
     const emit=value=>{if(closed||!channel.isCurrent()||sequence>60||controller.desiredSize<=0){close();return;}
      const data=new TextEncoder().encode(JSON.stringify(value)+'\n');if(data.length>2048||(bytes+=data.length)>8192){close();return;}controller.enqueue(data);
     };
     emit({version:1,type:'ready',sequence:sequence++,identity:channel.identity,...flags});
     if(!closed){timer=setInterval(()=>emit({version:1,type:'pulse',sequence:sequence++}),1000);timer.unref?.();}
    },cancel(){close();}
   });
   return new Response(stream,{status:200,headers});
  }catch(e){return Response.json({decision:'deny',reason:e instanceof HttpError?e.code:'SERVICE_UNAVAILABLE',...flags},{status:e instanceof HttpError?e.status:503,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});}
 };
}
