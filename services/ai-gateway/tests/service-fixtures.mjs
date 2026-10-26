import {generateKeyPairSync,sign} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {Pool} from 'pg';
import {identityConfigHash} from '../postgres-authority.mjs';
import {requestBindingHash} from '../signed-identity.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
import {ROUTE_FIELDS} from '../../../extension/core/ai-usage/ratebook.js';
import {request,evidence} from './postgres-fixtures.mjs';

// Ephemeral synthetic test issuers only; no keys or tokens go into SQL or logs.
const keys=Object.fromEntries(['principal','entitlement'].map(kind=>[kind,generateKeyPairSync('rsa',{modulusLength:2048})]));
export function fixture(at=Date.UTC(2026,0,1)){
 const now=Math.floor(at/1000)*1000;
 const identityConfig={maxTokenAgeSeconds:300,maxSecurityStateAgeSeconds:60,...Object.fromEntries(Object.entries(keys).map(([kind,key])=>[kind,{issuer:`https://${kind}.invalid`,audience:`SYNTHETIC-${kind}`,keys:[{kid:kind,publicKeyPem:key.publicKey.export({type:'spki',format:'pem'}),notBefore:now/1000-60,notAfter:now/1000+600,revoked:false}]}]))};
 const profileId='SYNTHETIC-profile';
 const route=Object.fromEntries(ROUTE_FIELDS.map(key=>[key,`SYNTHETIC_${key}`]));route.currency='USD';
 const routeFacts={routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,route,fx:null,book:{route,rates:{standardInput:1000000,cachedReadInput:1000000,cacheCreateInput:1000000,completion:1000000},effectiveAt:0,verifiedAt:now,expiresAt:now+300000,source:'SYNTHETIC tariff',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}}};
 const control={profile_id:profileId,identity_config_hash:identityConfigHash(identityConfig),generation:'SYNTHETIC-global',enabled:true,day_limit_micros:'15000',month_limit_micros:'15000',expires_at_ms:String(now+300000)};
 const principal=r=>({security:{principalId:r.principalId,libraryId:r.libraryId,observedAt:now/1000,expiresAt:now/1000+60,principalActive:true,entitlementActive:true,principalGeneration:'SYNTHETIC-principal-generation',entitlementGeneration:'SYNTHETIC-entitlement-generation',revokedPrincipalKeys:[],revokedEntitlementKeys:[]},time_zone:'UTC'});
 const grant=r=>({request_hash:requestBindingHash(r),request:r,generation:'SYNTHETIC-content-generation',authorized:true,issued_at_ms:String(now),expires_at_ms:String(now+60000)});
 const routeRow={generation:'SYNTHETIC-route-generation',facts:routeFacts,expires_at_ms:String(now+300000)};
 const bundle=(r=request('one'),patch={})=>({request:r,...Object.fromEntries(['principal','entitlement'].map(kind=>{
  const claims={iss:identityConfig[kind].issuer,aud:identityConfig[kind].audience,sub:r.principalId,iat:now/1000,nbf:now/1000,exp:now/1000+120,jti:`SYNTHETIC-${kind}-token`,library_id:r.libraryId,operation_id:r.operationId,request_hash:requestBindingHash(r),generation:`SYNTHETIC-${kind}-generation`,...(kind==='entitlement'?{principal_issuer:identityConfig.principal.issuer,tier:'free',entitlements:[r.jobType]}:{}),...(patch[kind]??{})};
  const raw=[{alg:'RS256',typ:`paia-${kind}+jwt`,kid:kind},claims].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return [kind+'Token',raw+'.'+sign('RSA-SHA256',Buffer.from(raw),keys[kind].privateKey).toString('base64url')];
 }))});
 return {now,identityConfig,profileId,control,principal,grant,routeRow,bundle};
}
export function protocol(f=fixture(),{hook}={}){
 let saved=null,clock=f.now,connected=0;
 const calls=[],released=[],grants=new Map(),principals=new Map(),events=new Map();
 const pool=new Pool();pool.connect=async()=>{
  connected++;let pending=structuredClone(saved);const client=new EventEmitter();
  client.query=async(sql,args=[])=>{
   calls.push({sql,args});const override=await hook?.({sql,args,clock,setClock:value=>{clock=value;},save:()=>{saved=structuredClone(pending);}});if(override)return override;
   if(sql.startsWith('SELECT schema_version'))return {rows:[{schema_version:1,snapshot:pending}]};
   if(sql.includes('SELECT c.relrowsecurity'))return {rows:[{relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false}]};
   if(sql.includes('SELECT c.relname'))return {rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:false}))};
   if(sql.includes('FROM paia_ai_private.service_control'))return {rows:f.control?[structuredClone(f.control)]:[]};
   if(sql.includes('FROM paia_ai_private.principal_authority'))return {rows:principals.has(args.join('/'))?[structuredClone(principals.get(args.join('/')))]:[]};
   if(sql.includes('FROM paia_ai_private.route_authority'))return {rows:f.routeRow?[structuredClone(f.routeRow)]:[]};
   if(sql.includes('FROM paia_ai_private.request_authority'))return {rows:grants.has(args[0])?[structuredClone(grants.get(args[0]))]:[]};
   if(sql.startsWith('SELECT event_id'))return {rows:[...events.values()].some(event=>event.operation_id===args[0])?[{event_id:'existing'}]:[]};
   if(sql.includes('FROM paia_ai_private.operation_evidence'))return {rows:events.has(args[0])?[structuredClone(events.get(args[0]))]:[]};
   if(sql.startsWith('SELECT floor'))return {rows:[{now_ms:String(clock)}]};
   if(sql.startsWith('WITH publication')){if(clock<args[3]||clock>=args[4])return {rowCount:0};pending=JSON.parse(args[0]);pending.lastNow=clock;return {rowCount:1};}
   if(sql==='COMMIT')saved=structuredClone(pending);
   return {rows:[]};
  };
  client.release=discard=>released.push(discard);return client;
 };
 const admit=r=>{grants.set(r.operationId,structuredClone(f.grant(r)));principals.set([r.principalId,r.libraryId].join('/'),f.principal(r));return f.bundle(r);};
 const service=()=>createPostgresReservationService({pool,identityConfig:f.identityConfig,profileId:f.profileId});
 const event=(r,id,kind)=>events.set(id,{operation_id:r.operationId,request_hash:requestBindingHash(r),event:kind,evidence:kind==='SETTLEMENT'?{...evidence(r,'COMMITTED'),receiptId:id,committedChildren:[{operationId:r.operationId,receiptId:id}]}:null,expires_at_ms:String(f.now+60000)});
 return {pool,service,admit,event,grants,principals,events,calls,released,saved:()=>saved,setSaved:value=>{saved=value;},setClock:value=>{clock=value;},connected:()=>connected};
}
