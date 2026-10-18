import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import {readFile,mkdtemp,mkdir,copyFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import entry,{closeReservationGateway} from '../api/reservations.mjs';
import {createDeploymentGateway} from '../deployment-bootstrap.mjs';
import {compileDeploymentConfig,snapshotDeploymentEnvironment,MAX_CONFIG_BYTES} from '../deployment-config.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {identityConfigHash} from '../postgres-authority.mjs';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';

// Protocol evidence only: ephemeral synthetic keys/rows and pg client transport.
// Real pg.Pool, bootstrap, readiness, signatures, owner and HTTP run intact.
// Run with an empty/synthetic environment; no socket may be contacted here.
function environment(f=fixture()) {
 return {PAIA_RESERVATIONS_ENABLED:'true',PAIA_RESERVATIONS_DB_PASSWORD:'SYNTHETIC-only-not-a-credential',
  PAIA_RESERVATIONS_CONFIG:JSON.stringify({version:1,profileId:f.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user:'paia_runtime.synthetic',caPem:null},identityConfig:f.identityConfig})};
}
function change(env,fn){const config=JSON.parse(env.PAIA_RESERVATIONS_CONFIG);fn(config);env.PAIA_RESERVATIONS_CONFIG=JSON.stringify(config);return env;}
const http=(bundle,options={})=>new Request('https://service.invalid/api/reservations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'reserve',...bundle}),...options});
const simple=()=>({request:request('HTTP'),principalToken:'a.b.c',entitlementToken:'d.e.f'});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const noAuthority=result=>{assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);assert.equal(result.retryAllowed,false);};
function harness(t,{f=fixture(),hook,connectHook,endHook}={}) {
 const p=protocol(f,{hook}),env=environment(f),pools=new Set(),clients=[],ended=[],calls=[],net={count:0};
 t.mock.method(Socket.prototype,'connect',()=>{net.count++;throw Error('SYNTHETIC_NETWORK_FORBIDDEN');});
 const originalConnect=Pool.prototype.connect;
 t.mock.method(Pool.prototype,'connect',function(...args){pools.add(this);return originalConnect.apply(this,args);});
 t.mock.method(Client.prototype,'connect',function(callback){clients.push(this);Promise.resolve().then(()=>connectHook?.(this)).then(()=>callback(null),()=>callback(Error('SYNTHETIC_PRIVATE_CONNECT_ERROR')));});
 t.mock.method(Client.prototype,'query',async function(sql,args){calls.push(sql);if(sql.startsWith('BEGIN'))this.syntheticTransaction=await p.pool.connect();return this.syntheticTransaction.query(sql,args);});
 t.mock.method(Client.prototype,'end',function(callback){ended.push(this);this._ending=true;Promise.resolve().then(()=>endHook?.(this)).then(()=>{this.emit('end');callback?.();});});
 const gateway=createDeploymentGateway({readEnvironment:()=>env});
 t.after(async()=>{await gateway.close();assert.equal(net.count,0);});
 return {f,p,env,pools,clients,ended,calls,gateway,net};
}

test('default API export consumes explicit runtime configuration and original service',async t=>{
 const h=harness(t),bundle=h.p.admit(request('actual-export')),original=process.env;process.env={...h.env};
 try {
  assert.equal(h.clients.length,0,'import creates no connection');
  const response=await entry.fetch(http(bundle));assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.state,'RESERVED');noAuthority(result);
  assert.equal(h.p.saved().rows.length,1);assert.equal(h.pools.size,1);assert.equal(h.clients.length,1);
  assert.equal(h.calls.filter(sql=>sql==='COMMIT').length,2,'readiness plus guarded reservation');
 }finally{await closeReservationGateway();process.env=original;}
});
test('unset/disabled/partial configuration closes without reading secret when off',async t=>{
 const h=harness(t);
 for(const env of [{},{PAIA_RESERVATIONS_ENABLED:'false'},{PAIA_RESERVATIONS_ENABLED:'TRUE'},{PAIA_RESERVATIONS_ENABLED:'true'},{...h.env,PAIA_RESERVATIONS_DB_PASSWORD:''},{...h.env,PAIA_RESERVATIONS_CONFIG:''}]){
  const gateway=createDeploymentGateway({readEnvironment:()=>env}),response=await gateway.fetch(http(simple()));assert.equal(response.status,503);noAuthority(await response.json());await gateway.close();
 }
 let reads=0;assert.deepEqual(snapshotDeploymentEnvironment({PAIA_RESERVATIONS_ENABLED:'false',get PAIA_RESERVATIONS_CONFIG(){reads++;throw Error();},get PAIA_RESERVATIONS_DB_PASSWORD(){reads++;throw Error();}}),{enabled:false});
 assert.equal(reads,0);assert.equal(h.pools.size,0);assert.equal(h.calls.length,0);
});
test('strict configuration rejects target, privilege, TLS, unknown and private-key overrides before network',async t=>{
 const h=harness(t),mutations=[c=>{c.version=2;},c=>{c.profileId='';},c=>{c.budget=50000;},c=>{c.postgres.connectionString='postgres://example';},c=>{c.postgres.ssl={rejectUnauthorized:false};},c=>{c.postgres.options='-c role=postgres';},c=>{c.postgres.password='embedded';},
  ...['localhost','db.localhost','127.0.0.1','::1','/tmp','2130706433','0x7f000001','https://db.example','DB.EXAMPLE','db.example.','db.internal'].map(host=>c=>{c.postgres.host=host;}),
  ...[0,65536,'6543'].map(port=>c=>{c.postgres.port=port;}),...['postgres','postgres.project','anon','authenticated','service_role.project'].map(user=>c=>{c.postgres.user=user;}),
  c=>{c.postgres.database='';},c=>{c.postgres.caPem='not a CA';},c=>{c.identityConfig.maxTokenAgeSeconds=301;},c=>{c.identityConfig.maxSecurityStateAgeSeconds=61;},c=>{c.identityConfig.principal.keys=[];},c=>{c.identityConfig.principal.jwksUri='https://keys.example';},
  c=>{c.identityConfig.principal.keys[0].publicKeyPem='-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----';},c=>{c.identityConfig.entitlement.keys[0].publicKeyPem=c.identityConfig.principal.keys[0].publicKeyPem;},c=>{c.identityConfig.principal.keys.push({...c.identityConfig.principal.keys[0]});},c=>{c.identityConfig.principal.keys[0].notAfter=c.identityConfig.principal.keys[0].notBefore;}];
 for(const mutate of mutations){const env=change(environment(h.f),mutate),gateway=createDeploymentGateway({readEnvironment:()=>env});assert.equal((await gateway.fetch(http(simple()))).status,503);await gateway.close();}
 assert.equal(h.pools.size,0);assert.equal(h.calls.length,0);
});
test('configuration grammar refuses duplicates, malformed Unicode, excessive depth/size and secret controls',async t=>{
 const h=harness(t),valid=h.env.PAIA_RESERVATIONS_CONFIG;
 for(const json of [valid.replace('{','{"version":1,'),valid.replace('{','{"vers\\u0069on":1,'),valid+'{}',valid.replace('"version":1','"version":1.0'),valid.replace('"profileId":','"__proto__":{},"profileId":'),valid.replace('SYNTHETIC-profile','\\ud800'),'['.repeat(20)+']'.repeat(20),' '.repeat(MAX_CONFIG_BYTES+1),'[]','null']){
  const env={...h.env,PAIA_RESERVATIONS_CONFIG:json},gateway=createDeploymentGateway({readEnvironment:()=>env});assert.equal((await gateway.fetch(http(simple()))).status,503);await gateway.close();
 }
 for(const password of ['','x\n','x'.repeat(1025),'\ud800'])assert.equal(snapshotDeploymentEnvironment({...h.env,PAIA_RESERVATIONS_DB_PASSWORD:password}).invalid,true);
 assert.equal(h.pools.size,0);
});
test('explicit pg fields and verified TLS cannot inherit hostile connection environment',async t=>{
 const h=harness(t),original=process.env;
 process.env={PGHOST:'/tmp',PGPORT:'1',PGDATABASE:'wrong',PGUSER:'postgres',PGPASSWORD:'wrong',PGSSLMODE:'disable',PGOPTIONS:'-c role=postgres',PGAPPNAME:'wrong',PGCLIENT_ENCODING:'wrong',PGREPLICATION:'database',PGSSLNEGOTIATION:'direct',DATABASE_URL:'postgres://wrong',NODE_TLS_REJECT_UNAUTHORIZED:'0'};
 try {
  assert.equal((await h.gateway.fetch(http(h.p.admit(request('options'))))).status,200);
  const pool=[...h.pools][0],client=h.clients[0],options=pool.options;
  assert.equal(options.host,'database.synthetic.example');assert.equal(options.port,6543);assert.equal(options.database,'synthetic');assert.equal(options.user,'paia_runtime.synthetic');assert.equal(client.connectionParameters.password,h.env.PAIA_RESERVATIONS_DB_PASSWORD);
  assert.equal(client.connectionParameters.options,'-c search_path=pg_catalog');assert.equal(client.connectionParameters.replication,'false');assert.equal(client.connectionParameters.client_encoding,'UTF8');assert.equal(client.connectionParameters.sslnegotiation,'postgres');
  assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.ssl.servername,options.host);assert.equal(options.ssl.minVersion,'TLSv1.2');
  assert.equal(options.ssl.checkServerIdentity(options.host,{subjectaltname:'DNS:other.example'}).code,'ERR_TLS_CERT_ALTNAME_INVALID');assert.equal(options.ssl.checkServerIdentity(options.host,{subjectaltname:'DNS:database.synthetic.example'}),undefined);
  for(const key of ['connectionString','stream','Client','verify','onConnect'])assert.equal(Object.hasOwn(options,key),false);
  assert.equal(options.max,2);assert.equal(options.connectionTimeoutMillis,5000);assert.equal(options.query_timeout,16000);assert.equal(options.statement_timeout,15000);assert.equal(options.idleTimeoutMillis,10000);assert.equal(options.maxLifetimeSeconds,300);
 }finally{process.env=original;}
});
test('malformed or authority-bearing HTTP performs zero config reads and SQL',async t=>{
 const h=harness(t);let reads=0;const gateway=createDeploymentGateway({readEnvironment:()=>{reads++;return h.env;}});
 for(const body of ['{}',JSON.stringify({action:'reserve',...simple(),postgres:{host:'other.example'}}),JSON.stringify({action:'reserve',...simple(),resolveService:true}),JSON.stringify({action:'settle',...simple()}),JSON.stringify({action:'reserve',...simple(),budget:100})])assert.equal((await gateway.fetch(http(simple(),{body}))).status,400);
 assert.equal((await gateway.fetch(new Request('https://service.invalid/api/reservations?host=other.example'))).status,404);
 assert.equal(reads,0);assert.equal(h.calls.length,0);assert.equal(h.pools.size,0);await gateway.close();
});
test('concurrent cold requests share one startup and one actual bounded Pool',async t=>{
 const entered=deferred(),release=deferred();let first=true;
 const h=harness(t,{hook:async({sql})=>{if(first&&sql.startsWith('SELECT schema_version')){first=false;entered.resolve();await release.promise;}}});
 const bundle=h.p.admit(request('singleflight')),pending=Array.from({length:6},()=>h.gateway.fetch(http(bundle)));
 await entered.promise;assert.equal(h.pools.size,1);assert.equal(h.clients.length,1);assert.equal(h.calls.filter(sql=>sql.startsWith('BEGIN')).length,1);
 release.resolve();for(const response of await Promise.all(pending))noAuthority(await response.json());
 assert.equal(h.pools.size,1);assert.ok(h.clients.length<=2);assert.equal([...h.pools][0].options.max,2);
 // No claim of real PostgreSQL lock concurrency from this synthetic transport.
});
test('readiness failure retires once without retry loop or cached authority',async t=>{
 const h=harness(t,{hook:({sql})=>sql.startsWith('SELECT schema_version')?{rows:[{schema_version:999,snapshot:null}]}:undefined});
 for(let i=0;i<3;i++)assert.equal((await h.gateway.fetch(http(simple()))).status,503);
 assert.equal(h.pools.size,1);assert.equal(h.clients.length,1);assert.equal(h.ended.length,1);assert.equal(h.calls.some(sql=>sql.includes('service_control')),false);assert.equal(h.p.saved(),null);
});
test('startup health cannot supply absent request authority',async t=>{
 const h=harness(t),bundle=h.p.admit(request('missing-grant'));h.p.grants.clear();
 const response=await h.gateway.fetch(http(bundle));assert.equal(response.status,503);assert.equal((await response.json()).reason,'AUTHORITY_MISSING');assert.equal(h.p.saved(),null);assert.equal(h.calls.filter(sql=>sql==='COMMIT').length,1);
});
test('warm requests reacquire DB authority and retain original publication guard',async t=>{
 const h=harness(t),bundle=h.p.admit(request('current'));assert.equal((await h.gateway.fetch(http(bundle))).status,200);
 h.f.control.enabled=false;assert.equal((await h.gateway.fetch(http(bundle))).status,503);h.f.control.enabled=true;h.p.setClock(h.f.now+120000);assert.equal((await h.gateway.fetch(http(bundle))).status,503);
 assert.equal(h.pools.size,1);assert.equal(h.p.saved().rows.length,1);assert.equal(h.calls.filter(sql=>sql.includes('service_control')).length,3);assert.equal(h.calls.filter(sql=>sql.startsWith('WITH publication')).length,1);
});
test('final database timestamp expiry is refused through actual bootstrap',async t=>{
 const h=harness(t,{hook:({sql,args,setClock})=>{if(sql.startsWith('WITH publication'))setClock(args[4]);}});
 const response=await h.gateway.fetch(http(h.p.admit(request('final-expiry'))));assert.equal(response.status,503);noAuthority(await response.json());assert.equal(h.p.saved(),null);assert.ok(h.calls.includes('ROLLBACK'));
});
test('profile/key rotation drains old Pool before replacing and revokes old proof',async t=>{
 const h=harness(t),bundle=h.p.admit(request('rotate'));assert.equal((await h.gateway.fetch(http(bundle))).status,200);
 change(h.env,c=>{c.profileId='SYNTHETIC-profile-2';c.identityConfig.principal.keys[0].revoked=true;});h.f.control.profile_id='SYNTHETIC-profile-2';h.f.control.identity_config_hash=identityConfigHash(JSON.parse(h.env.PAIA_RESERVATIONS_CONFIG).identityConfig);
 assert.equal((await h.gateway.fetch(http(bundle))).status,403);assert.equal(h.pools.size,2);assert.equal(h.ended.length,1);assert.equal([...h.pools][0].ended,true);assert.equal(h.p.saved().rows.length,1);
});
test('disable closes warm Pool with zero further SQL; explicit reenable uses fresh Pool',async t=>{
 const h=harness(t),bundle=h.p.admit(request('disable'));await h.gateway.fetch(http(bundle));const before=h.calls.length;
 h.env.PAIA_RESERVATIONS_ENABLED='false';assert.equal((await h.gateway.fetch(http(bundle))).status,503);assert.equal(h.calls.length,before);assert.equal(h.ended.length,1);assert.equal(h.p.saved().rows.length,1);
 h.env.PAIA_RESERVATIONS_ENABLED='true';assert.equal((await h.gateway.fetch(http(bundle))).status,200);assert.equal(h.pools.size,2);assert.equal(h.p.saved().rows.length,1);
});
test('late startup cannot revive disabled, rotated, closed or aborted work',async t=>{
 for(const action of ['disable','rotate','close','abort'])await t.test(action,async t=>{
  const entered=deferred(),release=deferred();let first=true;
  const h=harness(t,{hook:async({sql})=>{if(first&&sql.startsWith('SELECT schema_version')){first=false;entered.resolve();await release.promise;}}});
  const bundle=h.p.admit(request(action)),controller=new AbortController(),pending=h.gateway.fetch(http(bundle,{signal:controller.signal}));await entered.promise;let closing;
  if(action==='disable')h.env.PAIA_RESERVATIONS_ENABLED='false';if(action==='rotate')change(h.env,c=>{c.profileId='other';});if(action==='close')closing=h.gateway.close();if(action==='abort')controller.abort();
  release.resolve();assert.equal((await pending).status,action==='abort'?400:503);assert.equal(h.calls.some(sql=>sql.includes('service_control')),false);assert.equal(h.p.saved(),null);await closing;
 });
});
test('resolver selections require original service brand and synchronous freshness',async()=>{
 let called=0;
 for(const selected of [{service:{reserve(){called++;}},isCurrent:()=>true},{service:protocol().service(),isCurrent:()=>false},{service:protocol().service(),isCurrent:async()=>true},{service:protocol().service(),isCurrent:async()=>{throw Error('SYNTHETIC PRIVATE');}}])assert.equal((await createGatewayHandler({resolveService:async()=>selected})(http(simple()))).status,503);
 assert.equal(called,0);
});
test('idle connection errors stay sanitized and cannot reconnect same generation',async t=>{
 const h=harness(t),bundle=h.p.admit(request('idle'));await h.gateway.fetch(http(bundle));const before=h.calls.length;h.clients[0].emit('error',Error('SYNTHETIC PRIVATE CONNECTION DETAILS'));
 const response=await h.gateway.fetch(http(bundle));assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/PRIVATE|DETAILS|password|principalToken/);
 assert.equal(h.calls.length,before);assert.equal(h.pools.size,1);assert.equal(h.ended.length,1);
});
test('shutdown is idempotent and drains entered work without refund or replay',async t=>{
 const entered=deferred(),release=deferred();let commits=0;
 const h=harness(t,{hook:async({sql})=>{if(sql==='COMMIT'&&++commits===2){entered.resolve();await release.promise;}}});
 const pending=h.gateway.fetch(http(h.p.admit(request('closing'))));await entered.promise;const closed=h.gateway.close();assert.equal(h.gateway.close(),closed);
 release.resolve();const response=await pending;assert.equal(response.status,200);noAuthority(await response.json());await closed;
 const before=h.calls.length;assert.equal((await h.gateway.fetch(http(simple()))).status,503);assert.equal(h.calls.length,before);assert.equal(h.p.saved().rows.length,1);assert.equal(h.p.saved().rows[0].state,'RESERVED');assert.equal(h.ended.length,1);
});
test('unknown COMMIT remains held across shutdown with no implicit retry',async t=>{
 let commits=0;const h=harness(t,{hook:({sql,save})=>{if(sql==='COMMIT'&&++commits===2){save();throw Error('SYNTHETIC lost acknowledgement');}}});
 const response=await h.gateway.fetch(http(h.p.admit(request('unknown'))));assert.equal(response.status,503);const result=await response.json();assert.equal(result.decision,'outcome_unknown');noAuthority(result);
 await h.gateway.close();assert.equal(h.p.saved().rows.length,1);assert.equal(h.p.saved().rows[0].reservationMicros,7000);assert.equal(commits,2);assert.equal(h.calls.includes('ROLLBACK'),false);
});
test('HTTP concurrency is bounded before buffering and capacity returns on abort',async t=>{
 const h=harness(t),controllers=Array.from({length:16},()=>new AbortController()),pending=controllers.map(controller=>h.gateway.fetch(http(simple(),{body:new ReadableStream(),duplex:'half',signal:controller.signal})));
 const response=await h.gateway.fetch(http(simple()));assert.equal(response.status,503);assert.equal((await response.json()).reason,'SERVICE_UNAVAILABLE');controllers.forEach(controller=>controller.abort());await Promise.all(pending);
 assert.equal(h.pools.size,0);assert.equal((await h.gateway.fetch(http(simple(),{body:'{}'}))).status,400);
});
test('production entry retains Node fetch and original monorepo owner dependencies',async()=>{
 const source=await readFile(new URL('../api/reservations.mjs',import.meta.url),'utf8');assert.match(source,/createDeploymentGateway/);assert.doesNotMatch(source,/runtime\s*:\s*['"]edge/);
 assert.equal(typeof compileDeploymentConfig(snapshotDeploymentEnvironment(environment())).poolOptions.ssl.checkServerIdentity,'function');
 const owner=await readFile(new URL('../../../extension/core/ai-usage/budget-window-reservation.js',import.meta.url),'utf8');assert.match(owner,/class BudgetWindowReservation/);
});
test('connect failure is sanitized and a failed generation does not reconnect',async t=>{
 const h=harness(t,{connectHook:()=>{throw Error('SYNTHETIC PRIVATE CONNECT');}});
 for(let i=0;i<2;i++){
  const response=await h.gateway.fetch(http(simple()));assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/PRIVATE|CONNECT|password/);
 }
 assert.equal(h.clients.length,1);assert.equal(h.calls.length,0);
});
test('startup wait is finite and timed-out initialization cannot later reserve',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const entered=deferred(),release=deferred();let first=true;
 const h=harness(t,{hook:async({sql})=>{if(first&&sql.startsWith('SELECT schema_version')){first=false;entered.resolve();await release.promise;}}});
 const pending=h.gateway.fetch(http(h.p.admit(request('startup-timeout'))));await entered.promise;
 t.mock.timers.tick(25000);assert.equal((await pending).status,503);assert.equal([...h.pools][0].ending,true);
 release.resolve();assert.deepEqual(await h.gateway.close(),{closed:true,drained:true});assert.equal(h.p.saved(),null);assert.equal(h.calls.some(sql=>sql.includes('service_control')),false);
});
test('uncertain Pool disposal blocks replacement and reports undrained shutdown',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=harness(t),bundle=h.p.admit(request('dispose-timeout'));await h.gateway.fetch(http(bundle));
 const originalEnd=Pool.prototype.end,held=deferred(),entered=deferred();
 t.mock.method(Pool.prototype,'end',function(){entered.resolve();return held.promise;});
 change(h.env,c=>{c.profileId='other';});const pending=h.gateway.fetch(http(bundle));await entered.promise;
 t.mock.timers.tick(35000);assert.equal((await pending).status,503);assert.equal(h.pools.size,1);
 assert.deepEqual(await h.gateway.close(),{closed:true,drained:false});assert.equal(h.p.saved().rows.length,1);
 // Release only the synthetic disposal trap and dispose the real idle Pool.
 held.resolve();await originalEnd.call([...h.pools][0]);
});
test('source build check resolves full monorepo and rejects a standalone api/service copy',async t=>{
 const service=fileURLToPath(new URL('../',import.meta.url));
 const complete=spawnSync(process.execPath,[join(service,'check-deployment-source.mjs')],{env:{},encoding:'utf8'});
 assert.equal(complete.status,0);assert.match(complete.stdout,/SOURCE_GRAPH_OK/);
 const temporary=await mkdtemp(join(tmpdir(),'paia-bootstrap-source-'));t.after(()=>rm(temporary,{recursive:true,force:true}));
 const target=join(temporary,'services','ai-gateway');await mkdir(join(target,'api'),{recursive:true});
 for(const name of ['deployment-bootstrap.mjs','deployment-config.mjs','request-entry.mjs','reservation-service.mjs','signed-identity.mjs','postgres-authority.mjs','postgres-ledger.mjs','check-deployment-source.mjs','package.json','vercel.json','api/reservations.mjs'])await copyFile(join(service,name),join(target,name));
 await symlink(join(service,'node_modules'),join(target,'node_modules'),'dir');
 const detached=spawnSync(process.execPath,[join(target,'check-deployment-source.mjs')],{env:{},encoding:'utf8'});
 assert.notEqual(detached.status,0);assert.match(detached.stderr,/ERR_MODULE_NOT_FOUND/);
});
