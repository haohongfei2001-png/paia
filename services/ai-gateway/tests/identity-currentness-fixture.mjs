import {Pool} from 'pg';
import {EventEmitter} from 'node:events';
import {fixture as identityFixture} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {createPostgresIdentityCurrentnessService,IDENTITY_INVALIDATION_CHANNEL} from '../identity-currentness-service.mjs';
import {createIdentityCurrentnessHandler} from '../identity-currentness-entry.mjs';
// Deterministic protocol simulation only. This does NOT prove PostgreSQL
// locks, trigger installation, transaction delivery, roles, or live identity.
export function identityChannelFixture({hook,authority=identityFixture()}={}){
 const f=authority,r=request('SYNTHETIC-channel',{jobType:'AI_MAINTENANCE'}),bundle=f.bundle(r,{entitlement:{tier:'pro'}});
 let at=f.now;const calls=[],clients=[],released=[],principals=f.principals??new Map([[r.principalId+'/'+r.libraryId,f.principal(r)]]);
 const attestation=()=>['service_control','principal_authority'].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,relispartition:false,inherited:false,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:false,anchor_qualified:true,
  tgname:'identity_currentness_invalidation',tgtype:60,tgenabled:'A',tgisinternal:false,tgnargs:0,tgqual:null,tgattr:'',proname:'invalidate_identity_currentness',prosrc:"\nBEGIN\n PERFORM pg_catalog.pg_notify('paia_identity_invalidated_v1', '');\n RETURN NULL;\nEND\n",prosecdef:false,proconfig:['search_path=pg_catalog'],provolatile:'v',proparallel:'u',prokind:'f',proleakproof:false,proretset:false,same_owner:true,can_call_or_replace:false,lanname:'plpgsql',pronargs:0,returns_trigger:true}));
 const pool=new Pool();pool.connect=async()=>{
  const client=new EventEmitter();clients.push(client);client.listening=false;client.transaction=false;let listenPending=false;
  client.query=async(sql,args=[])=>{
   calls.push({client,sql,args});const override=await hook?.({client,sql,args,f,principals,setClock:n=>at=n,attestation});if(override)return override;
   if(sql==='BEGIN')client.transaction=true;
   if(sql.startsWith('LISTEN '))listenPending=true;
   if(sql==='COMMIT'){client.transaction=false;if(listenPending)client.listening=true;}
   if(sql.includes('SELECT c.relname'))return {rows:attestation()};
   if(sql.includes('FROM paia_ai_private.service_control'))return {rows:[Object.fromEntries(['profile_id','identity_config_hash','generation','enabled','expires_at_ms'].map(k=>[k,f.control[k]]))]};
   if(sql.includes('FROM paia_ai_private.principal_authority'))return {rows:principals.has(args.join('/'))?[{security:structuredClone(principals.get(args.join('/')).security)}]:[]};
   if(sql.startsWith('SELECT floor'))return {rows:[{now_ms:String(at)}]};
   return {rows:[]};
  };
  client.release=discard=>{released.push({client,discard});client.listening=false;};return client;
 };
 const services=[];const service=()=>{const s=createPostgresIdentityCurrentnessService({pool,identityConfig:f.identityConfig,profileId:f.profileId});services.push(s);return s;};
 const primary=service(),handler=createIdentityCurrentnessHandler({service:primary});
 const notify=()=>{for(const c of clients)if(c.listening)c.emit('notification',{channel:IDENTITY_INVALIDATION_CHANNEL,payload:'',processId:99});};
 return {...f,bundle,request:r,pool,primary,service,handler,calls,clients,released,principals,attestation,notify,setClock:n=>at=n,close:()=>services.forEach(s=>s.dispose())};
}
