import https from 'node:https';
import {Readable} from 'node:stream';
import {canonical} from '../../extension/core/ai-usage/contracts.js';

// Fixed Node transport: no SDK, redirects, automatic retries, proxy, ambient
// DashScope key or user URL. Configuration is trusted server input ONLY. No
// request/socket/credential read is performed at import or by the disabled runner.
export function createPinnedQwenTransport({endpoint,credential}={}){
 if(!endpoint||typeof endpoint.host!=='string'||!/^([a-z0-9][a-z0-9-]{0,62})\.([a-z]{2}-[a-z]+(?:-[0-9])?)\.maas\.aliyuncs\.com$/.test(endpoint.host)||
  endpoint.host.split('.').at(1)!==endpoint.region||endpoint.path!=='/compatible-mode/v1/chat/completions'||
  typeof credential!=='string'||!credential.length||credential.length>4096||/[\u0000-\u0020\u007f]/u.test(credential))throw new Error('PROVIDER_CONFIG_INVALID');
 const pinned=Object.freeze({scheme:'https',host:endpoint.host,path:endpoint.path});
 return Object.freeze({
  start(envelope,signal){
   if(signal?.aborted||envelope.method!=='POST'||canonical(envelope.endpoint)!==canonical(pinned)||canonical(envelope.headers)!==canonical({'Content-Type':'application/json'})||typeof envelope.body!=='string'||Buffer.byteLength(envelope.body)>262144)throw new Error('PROVIDER_SEND_INVALID');
   return new Promise((resolve,reject)=>{
    let request;
    try{
     request=https.request({protocol:'https:',hostname:pinned.host,port:443,path:pinned.path,method:'POST',
      rejectUnauthorized:true,minVersion:'TLSv1.2',servername:pinned.host,agent:false,
      headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream','Accept-Encoding':'identity','Content-Length':Buffer.byteLength(envelope.body),'Authorization':`Bearer ${credential}`},signal},incoming=>{
       try{
        const headers={};for(const name of ['content-type','content-length','content-encoding'])if(incoming.headers[name]!==undefined){if(typeof incoming.headers[name]!=='string')throw Error();headers[name]=incoming.headers[name];}
        resolve(new Response(Readable.toWeb(incoming),{status:incoming.statusCode,headers}));
       }catch{incoming.destroy();reject(new Error('PROVIDER_TRANSPORT_UNKNOWN'));}
      });
     request.once('error',()=>reject(new Error('PROVIDER_TRANSPORT_UNKNOWN')));
     // Includes connection/TLS/header stalls, unlike a socket-inactivity timer.
     const deadline=setTimeout(()=>request.destroy(new Error('PROVIDER_TIMEOUT')),20000);
     request.once('close',()=>clearTimeout(deadline));
     request.end(envelope.body);
    }catch{request?.destroy();reject(new Error('PROVIDER_TRANSPORT_UNKNOWN'));}
   });
  },
 });
}
