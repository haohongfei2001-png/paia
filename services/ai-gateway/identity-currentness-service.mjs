import {Pool} from 'pg';
import {createSignedIdentityVerifier,createSignedFilterReadIdentityVerifier,snapshotFilterReadBundle,filterReadRequestBindingHash,exactData,requestBindingHash} from './signed-identity.mjs';
import {snapshotResultBundle} from './result-declaration.mjs';
import {identityConfigHash} from './postgres-authority.mjs';

// An observation channel, never financial/dispatch authority. LISTEN is
// committed BEFORE the short locked snapshot. No transaction remains open
// during streaming; any notification, including an unrelated principal's
// ordinary security refresh, conservatively invalidates the whole channel.
export const IDENTITY_INVALIDATION_CHANNEL='paia_identity_invalidated_v1';
const TABLES=['service_control','principal_authority'];
const services=new WeakSet(),connections=new WeakSet();
const FUNCTION_BODY="\nBEGIN\n PERFORM pg_catalog.pg_notify('paia_identity_invalidated_v1', '');\n RETURN NULL;\nEND\n";
const CLOCK="SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms";
const CONTROL='SELECT profile_id, identity_config_hash, generation, enabled, expires_at_ms::text FROM paia_ai_private.service_control WHERE singleton = true FOR SHARE';
const PRINCIPAL='SELECT security FROM paia_ai_private.principal_authority WHERE principal_id = $1 AND library_id = $2 FOR SHARE';
// A matching trigger NAME alone is not evidence. Pin function body, language,
// ownership, complete statement-event mask (4+8+16+32), ALWAYS enabled state,
// absence of predicate/arguments, original forced-RLS plain tables, and the
// runtime's inability to mutate rows, alter owners, or replace this function.
const ATTEST=`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relispartition,
 r.rolsuper,r.rolbypassrls,c.relowner=r.oid AS is_owner,
 (has_schema_privilege(current_user,n.oid,'CREATE') OR pg_has_role(current_user,c.relowner,'MEMBER')
 OR has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 AND (has_column_privilege(current_user,c.oid,a.attname,'INSERT,REFERENCES')
 OR a.attname<>'lock_anchor' AND has_column_privilege(current_user,c.oid,a.attname,'UPDATE')))) AS can_mutate,
 EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_constraint k ON k.conrelid=a.attrelid
 WHERE a.attrelid=c.oid AND a.attname='lock_anchor' AND a.atttypid='pg_catalog.int2'::regtype
 AND a.attnotnull AND NOT a.attisdropped AND k.contype='c' AND k.convalidated
 AND k.conkey=ARRAY[a.attnum]::smallint[] AND pg_get_expr(k.conbin,k.conrelid)='(lock_anchor = 1)'
 AND has_column_privilege(current_user,c.oid,'lock_anchor','UPDATE')) AS anchor_qualified,
 t.tgname,t.tgtype,t.tgenabled,t.tgisinternal,t.tgnargs,t.tgqual::text,t.tgattr::text,
 p.proname,p.prosrc,p.prosecdef,p.proconfig,p.provolatile,p.proparallel,p.prokind,p.proleakproof,p.proretset,p.proowner=c.relowner AS same_owner,
 (pg_has_role(current_user,p.proowner,'MEMBER') OR has_function_privilege(current_user,p.oid,'EXECUTE')) AS can_call_or_replace,
 l.lanname,p.pronargs,p.prorettype='pg_catalog.trigger'::regtype AS returns_trigger,
 EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhparent=c.oid OR i.inhrelid=c.oid) AS inherited
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_roles r ON r.rolname=current_user
 LEFT JOIN pg_catalog.pg_trigger t ON t.tgrelid=c.oid AND t.tgname='identity_currentness_invalidation'
 LEFT JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid AND p.pronamespace=n.oid
 LEFT JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE n.nspname='paia_ai_private' AND c.relname=ANY($1::text[]) AND c.relkind='r'`;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const text=s=>typeof s==='string'&&s.length>0&&s.length<=200&&s.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(s);
const fail=code=>{throw Object.assign(Error(code),{code});};
const millis=s=>{if(typeof s!=='string'||!/^(?:0|[1-9][0-9]{0,15})$/.test(s)||!integer(Number(s)))fail('IDENTITY_CHANNEL_CLOCK');return Number(s);};
const one=async(c,q,args=[])=>{const {rows}=await c.query(q,args);if(rows.length!==1)fail('IDENTITY_CHANNEL_AUTHORITY');return structuredClone(rows[0]);};
function attest(rows){
 if(rows.length!==2||new Set(rows.map(r=>r.relname)).size!==2||rows.some(r=>!TABLES.includes(r.relname)||
 r.relrowsecurity!==true||r.relforcerowsecurity!==true||r.relispartition!==false||r.inherited!==false||
 r.rolsuper!==false||r.rolbypassrls!==false||r.is_owner!==false||r.can_mutate!==false||r.anchor_qualified!==true||
 r.tgname!=='identity_currentness_invalidation'||r.tgtype!==60||r.tgenabled!=='A'||r.tgisinternal!==false||r.tgnargs!==0||r.tgqual!==null||r.tgattr!==''||
 r.proname!=='invalidate_identity_currentness'||r.prosrc!==FUNCTION_BODY||r.prosecdef!==false||r.provolatile!=='v'||r.proparallel!=='u'||r.prokind!=='f'||r.proleakproof!==false||r.proretset!==false||
 !Array.isArray(r.proconfig)||r.proconfig.length!==1||r.proconfig[0]!=='search_path=pg_catalog'||r.same_owner!==true||r.can_call_or_replace!==false||
 r.lanname!=='plpgsql'||r.pronargs!==0||r.returns_trigger!==true))fail('IDENTITY_CHANNEL_UNSAFE_SCHEMA');
}
export const isIdentityCurrentnessService=s=>services.has(s);
export const isIdentityCurrentnessConnection=c=>connections.has(c);
export function createPostgresIdentityCurrentnessService({pool,identityConfig,profileId}={}){
 let config=null,disposed=false;const active=new Set(),occupied=new Set();
 try{if(!(pool instanceof Pool)||!text(profileId))throw Error();config=structuredClone(identityConfig);identityConfigHash(config);}catch{}
 async function open(input,{signal}={},readPurpose=false){
   if(!config||disposed||occupied.size>=8||!(signal instanceof AbortSignal)||signal.aborted)return null;
   let bundle;try{bundle=readPurpose?snapshotFilterReadBundle(input):snapshotResultBundle(input);}catch{return null;}
   let client=null,ready=false,closed=false,busy=true,acquiring=true,timer=null,expiry=null,identity=null,deadline=0;
   const listeners=new Set();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('IDENTITY_CHANNEL_CLOSED'));});stopped.catch(()=>{});
   const release=()=>{if(closed&&client&&!busy){const c=client;client=null;try{c.release(true);}catch{}}};
   const close=()=>{if(closed)return;closed=true;ready=false;active.delete(close);if(!acquiring)occupied.delete(close);clearTimeout(timer);clearTimeout(expiry);signal.removeEventListener('abort',close);stop();for(const fn of listeners)try{fn();}catch{}listeners.clear();release();};
   active.add(close);occupied.add(close);signal.addEventListener('abort',close,{once:true});timer=setTimeout(close,5000);timer.unref?.();
   try{
    // Pool acquisition is not cancellable. A timeout denies this operation but
    // must not free its resource slot until the pending acquisition settles.
    let pending;try{pending=pool.connect();}catch(e){acquiring=false;throw e;}
    pending.then(c=>{acquiring=false;if(closed){occupied.delete(close);try{c.release(true);}catch{}}},()=>{acquiring=false;if(closed)occupied.delete(close);});
    client=await Promise.race([pending,stopped]);if(closed)fail('IDENTITY_CHANNEL_CLOSED');
    client.on('error',close);client.on('end',close);
    client.on('notification',message=>{if(message?.channel===IDENTITY_INVALIDATION_CHANNEL)close();});
    const query=(sql,args)=>Promise.race([client.query(sql,args),stopped]);
    await query('BEGIN');await query('LISTEN paia_identity_invalidated_v1');await query('COMMIT');
    await query('BEGIN');
    await query("SET LOCAL statement_timeout = '4000ms'");await query("SET LOCAL lock_timeout = '1000ms'");
    await query('LOCK TABLE paia_ai_private.service_control,paia_ai_private.principal_authority IN ACCESS SHARE MODE');
    const control=await Promise.race([one(client,CONTROL),stopped]);
    const principal=await Promise.race([one(client,PRINCIPAL,[bundle.request.principalId,bundle.request.libraryId]),stopped]);
    attest((await query(ATTEST,[TABLES])).rows);
    exactData(control,['profile_id','identity_config_hash','generation','enabled','expires_at_ms']);exactData(principal,['security']);
    if(control.profile_id!==profileId||control.identity_config_hash!==identityConfigHash(config)||control.enabled!==true||!text(control.generation))fail('IDENTITY_CHANNEL_AUTHORITY');
    const first=millis((await query(CLOCK)).rows?.[0]?.now_ms);
    const factory=readPurpose?createSignedFilterReadIdentityVerifier:createSignedIdentityVerifier;
    const verifier=factory({config,clock:()=>first,readSecurityState:()=>principal.security});
    const verified=verifier.verifyValidity(bundle),until=Math.min(verified.verifiedUntil,millis(control.expires_at_ms),first+60000);
    if(until<=first)fail('IDENTITY_CHANNEL_EXPIRED');
    const finalStarted=performance.now(),final=millis((await query(CLOCK)).rows?.[0]?.now_ms);if(final<first||final>=until)fail('IDENTITY_CHANNEL_CLOCK');
    // Re-run original cryptography/current snapshot at the final DB clock, not
    // an unsigned decoded expiry. All authority row locks still exist here.
    factory({config,clock:()=>final,readSecurityState:()=>principal.security}).verifyValidity(bundle);
    identity=Object.freeze({version:1,...verified,verifiedUntil:until,authorityGeneration:control.generation,observedAt:final,...(readPurpose?{readRequestHash:filterReadRequestBindingHash(bundle.request)}:{requestHash:requestBindingHash(bundle.request)})});
    await query('COMMIT');if(closed)fail('IDENTITY_CHANNEL_CLOSED');
    deadline=finalStarted+until-final;if(performance.now()>=deadline)fail('IDENTITY_CHANNEL_EXPIRED');
    busy=false;ready=true;clearTimeout(timer);expiry=setTimeout(close,deadline-performance.now());expiry.unref?.();
    // Capture no JWT or security row in the retained channel. They are only
    // authentication inputs to this completed short snapshot transaction.
    bundle=null;
    const connection=Object.freeze({identity,isCurrent:()=>{if(ready&&!closed&&performance.now()<deadline)return true;close();return false;},
     onInvalidate(fn){if(typeof fn!=='function')return null;if(closed){fn();return ()=>{};}listeners.add(fn);return ()=>listeners.delete(fn);},close});
    connections.add(connection);return connection;
   }catch{close();return null;}
   finally{bundle=null;busy=false;release();}
  }
 const service=Object.freeze({open:(input,options)=>open(input,options,false),openFilterRead:(input,options)=>open(input,options,true),
  dispose(){disposed=true;for(const close of [...active])close();}
 });services.add(service);return service;
}
