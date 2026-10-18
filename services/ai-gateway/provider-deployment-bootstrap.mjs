import {Pool} from 'pg';
import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {createPostgresProviderRunner} from './provider-runner.mjs';
import {createProviderHandler,providerHttpDenial,providerHttpResponse} from './provider-entry.mjs';
import {installedProviderRegistry} from './provider-deployment-registry.mjs';
import {snapshotProviderDeploymentEnvironment,sameProviderDeploymentSnapshot,compileProviderDeploymentConfig} from './provider-deployment-config.mjs';

const STARTUP_WAIT_MS=25000,DISPOSE_WAIT_MS=35000,CURRENT_POLL_MS=250,MAX_IN_FLIGHT=16;
async function bounded(promise,millis){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('PROVIDER_LIFECYCLE_TIMEOUT')),millis);})]);}
 finally{clearTimeout(timer);}
}

// Fixed production composition. Pool, readiness, original financial owner,
// original once-send runner and limits cannot be chosen by HTTP. Import and
// construction read no environment, credential, body, or socket. A registry is
// installed source only; the shipped one is empty, never a synthetic fallback.
export function createProviderDeploymentGateway({readEnvironment=()=>process.env,registry=installedProviderRegistry}={}){
 let current=null,serial=Promise.resolve(),closed=false,blocked=false,inFlight=0,closePromise;
 const live=new Set();
 const snapshot=()=>{
  try{return snapshotProviderDeploymentEnvironment(readEnvironment(),registry);}
  catch{return Object.freeze({enabled:false,reason:'PROVIDER_CONFIG_INVALID'});}
 };
 const stop=entry=>{
  if(!entry)return;
  entry.failed=true;clearTimeout(entry.watch);entry.watch=null;
  entry.raw?.revoke();
 };
 const matches=entry=>!closed&&!blocked&&current===entry&&!entry.failed&&sameProviderDeploymentSnapshot(entry.input,snapshot());
 const retire=entry=>{
  if(!entry)return Promise.resolve(true);
  stop(entry);
  if(!entry.retired){
   // Abort active physical attempts first, retain their original holds, then
   // drain their UNKNOWN publication before closing either dedicated Pool.
   const drained=Promise.allSettled([...entry.operations]).then(async()=>{
    await Promise.all(entry.pools.map(pool=>pool.end()));
    live.delete(entry);return true;
   });
   entry.retired=bounded(drained,DISPOSE_WAIT_MS).catch(()=>{blocked=true;return false;});
  }
  return entry.retired;
 };
 const isCurrent=entry=>{
  if(matches(entry))return true;
  stop(entry);void retire(entry);return false;
 };
 const watch=entry=>{
  if(entry.watch||!entry.operations.size||entry.failed)return;
  entry.watch=setTimeout(()=>{
   entry.watch=null;
   if(isCurrent(entry)&&entry.operations.size)watch(entry);
  },CURRENT_POLL_MS);
  entry.watch.unref?.();
 };
 const resolveRunner=async()=>{
  if(closed||blocked)return {reason:'PROVIDER_STOPPED'};
  const input=snapshot();
  if(!current||!sameProviderDeploymentSnapshot(current.input,input)){
   const prior=current,entry={input,pools:[],operations:new Set(),raw:null,runner:null,failed:false,retired:null,watch:null,reason:input.reason??'PROVIDER_UNAVAILABLE'};
   current=entry;stop(prior); // Synchronous abort on observed disable/rotation.
   entry.ready=serial.then(async()=>{
    await retire(prior);
    // A waiter may have timed out and retired this generation while the
    // preceding Pool was draining. Retirement is terminal, even with no pools.
    // A source/configuration change during that wait must also precede
    // every new connection, not only the later post-readiness runner fence.
    if(entry.retired||!matches(entry)){stop(entry);return;}
    let config;
    try{config=compileProviderDeploymentConfig(input);}catch{entry.failed=true;entry.reason='PROVIDER_CONFIG_INVALID';return;}
    if(!config)return;
    try{
     const reservationPool=new Pool(config.reservationPoolOptions);entry.pools.push(reservationPool);live.add(entry);
     const evidencePool=new Pool(config.evidencePoolOptions);entry.pools.push(evidencePool);
     for(const pool of entry.pools)pool.on('error',()=>{stop(entry);void retire(entry);});
     await new PostgresLedgerStorage({pool:reservationPool}).checkReady();
     if(!matches(entry)){await retire(entry);return;}
     entry.raw=createPostgresProviderRunner({enabled:true,reservationPool,evidencePool,
      identityConfig:config.identityConfig,profileId:config.profileId,maxConcurrent:input.maxConcurrent,
      manifest:input.capability.manifest,tokenize:input.capability.tokenize,providerCredential:input.credential,isCurrent:()=>isCurrent(entry)});
     entry.runner=Object.freeze({run(value,options){
      if(!isCurrent(entry))return Promise.resolve(providerHttpDenial('PROVIDER_STOPPED'));
      const pending=Promise.resolve().then(()=>entry.raw.run(value,options));
      entry.operations.add(pending);watch(entry);
      return pending.finally(()=>{entry.operations.delete(pending);if(!entry.operations.size){clearTimeout(entry.watch);entry.watch=null;}});
     }});
    }catch{stop(entry);await retire(entry);}
   });
   serial=entry.ready.catch(()=>{stop(entry);blocked=true;});
  }
  const entry=current;
  try{await bounded(entry.ready,STARTUP_WAIT_MS);}catch{stop(entry);void retire(entry);return {reason:'PROVIDER_UNAVAILABLE'};}
  if(!entry.runner)return {reason:entry.reason};
  return isCurrent(entry)?{runner:entry.runner,isCurrent:()=>isCurrent(entry)}:{reason:'PROVIDER_STOPPED'};
 };
 const handler=createProviderHandler({resolveRunner});
 return Object.freeze({
  async fetch(request){
   if(closed||blocked||inFlight>=MAX_IN_FLIGHT)return providerHttpResponse(providerHttpDenial('PROVIDER_UNAVAILABLE'),503);
   inFlight++;
   try{return await handler(request);}finally{inFlight--;}
  },
  close(){
   if(!closePromise){
    closed=true;stop(current);
    closePromise=bounded(Promise.all([serial,retire(current),...[...live].map(retire)]),DISPOSE_WAIT_MS)
     .then(()=>Object.freeze({closed:true,drained:!blocked&&live.size===0}))
     .catch(()=>{blocked=true;return Object.freeze({closed:true,drained:false});});
   }
   return closePromise;
  },
 });
}
