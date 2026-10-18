import {EventEmitter} from 'node:events';
import {Pool} from 'pg';
import {fixture} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {requestBindingHash} from '../signed-identity.mjs';
import {createPostgresDeclarationPublisher} from '../postgres-declaration-publisher.mjs';

export const declaration=(f,request,patch={})=>({version:1,requestHash:requestBindingHash(request),payloadDigest:'1'.repeat(64),scopeDigest:'2'.repeat(64),contentGeneration:'SYNTHETIC-content',consentEpoch:request.consentEpoch,authorizationId:'SYNTHETIC-local-grant',expiresAt:f.now+60000,...patch});
const clone=value=>structuredClone(value);
const summary=row=>Object.fromEntries(['request_hash','generation','authorized','issued_at_ms','expires_at_ms'].map(key=>[key,row[key]]));
// Protocol fake only. Actual signature verification and production publisher
// execute; this helper models PG's transaction/global-row lock, not a live DB.
export function publicationProtocol(f=fixture(),{hook}={}){
 let now=f.now,connections=0,tail=Promise.resolve(),saved=new Map(),lastNow=null;
 const calls=[],released=[],principals=new Map();
 const pool=new Pool();pool.connect=async()=>{
  connections++;let pending=null,unlock=null;const client=new EventEmitter();
  const done=()=>{if(unlock){unlock();unlock=null;}};
  const save=()=>{if(pending)saved=clone(pending);};
  client.query=async(sql,args=[])=>{
   calls.push({sql,args:clone(args)});
   const overridden=await hook?.({sql,args,setClock:value=>{now=value;},save,client});if(overridden)return overridden;
   if(sql.includes("snapshot ->> 'lastNow'")){
    const before=tail;tail=new Promise(resolve=>{unlock=resolve;});await before;
    pending=clone(saved);return {rows:[{schema_version:1,last_now_ms:lastNow}]};
   }
   if(sql.includes('FROM paia_ai_private.service_control'))return {rows:f.control?[clone(f.control)]:[]};
   if(sql.includes('FROM paia_ai_private.principal_authority'))return {rows:principals.has(args.join('/'))?[clone(principals.get(args.join('/')))]:[]};
   if(sql.startsWith('SELECT request_hash'))return {rows:pending.has(args[0])?[clone(pending.get(args[0]))]:[]};
   if(sql.includes('SELECT c.relname'))return {rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,unsafe_privileges:false}))};
   if(sql.startsWith('SELECT floor'))return {rows:[{now_ms:String(now)}]};
   if(sql.startsWith('WITH publication')){
    const insert=sql.includes('INSERT INTO'),from=insert?6:3;
    if(now<args[from]||now>=args[from+1])return {rows:[],rowCount:0};
    if(insert){
     if(pending.has(args[0]))return {rows:[],rowCount:0};
     const row={request_hash:args[1],request:JSON.parse(args[2]),generation:args[3],authorized:args[4],issued_at_ms:String(now),expires_at_ms:String(args[4]?Math.min(args[5],now+60000):now)};
     pending.set(args[0],row);return {rows:[summary(row)],rowCount:1};
    }
    const row=pending.get(args[0]);if(!row||row.request_hash!==args[1]||row.generation!==args[2])return {rows:[],rowCount:0};
    if(sql.includes('UPDATE paia_ai_private.request_authority'))row.authorized=false;
    return {rows:[summary(row)],rowCount:1};
   }
   if(sql==='COMMIT'){save();done();}
   if(sql==='ROLLBACK')done();
   if(sql.startsWith('UPDATE paia_ai_private.budget_snapshot')||sql.includes('GRANT ')||sql.includes('CREATE ROLE'))throw Error('unexpected mutation');
   return {rows:[]};
  };
  client.release=discard=>{released.push(discard);done();};return client;
 };
 const publisher=()=>createPostgresDeclarationPublisher({pool,identityConfig:f.identityConfig,profileId:f.profileId});
 const admit=(r,patch={})=>{principals.set([r.principalId,r.libraryId].join('/'),f.principal(r));return f.bundle(r,patch);};
 return {pool,publisher,admit,principals,calls,released,rows:()=>clone(saved),connections:()=>connections,setClock:value=>{now=value;},setLastNow:value=>{lastNow=value;},seed:(id,row)=>saved.set(id,clone(row))};
}

// HTTP composition fixture: production-branded publisher, actual signed bundle
// and metadata-only declaration; inspect durable rows() and protocol.calls.
export function declarationPublisherFixture(id='SYNTHETIC-http-declaration',options={}){
 const f=fixture(),p=publicationProtocol(f,options);
 const r=request(id);
 return {publisher:p.publisher(),bundle:p.admit(r),declaration:declaration(f,r),rows:p.rows,protocol:p,fixture:f};
}
