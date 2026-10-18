import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {createProviderDeploymentGateway} from '../provider-deployment-bootstrap.mjs';
import {createProviderDeploymentRegistry,installedProviderRegistry} from '../provider-deployment-registry.mjs';
import {snapshotProviderDeploymentEnvironment} from '../provider-deployment-config.mjs';
import entry from '../api/provider.mjs';
import {providerFixture,completion} from './provider-fixtures.mjs';

const http=(input,options={})=>new Request('https://service.invalid/api/provider',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),...options});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function environment(f){
 const config=user=>JSON.stringify({version:1,profileId:f.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user,caPem:null},identityConfig:f.identityConfig});
 return {PAIA_PROVIDER_ENABLED:'true',PAIA_PROVIDER_CAPABILITY_ID:'SYNTHETIC-installed',PAIA_PROVIDER_MAX_CONCURRENT:'2',
  PAIA_PROVIDER_RESERVATION_CONFIG:config('paia_provider_ledger.synthetic'),PAIA_PROVIDER_EVIDENCE_CONFIG:config('paia_provider_evidence.synthetic'),
  PAIA_PROVIDER_RESERVATION_DB_PASSWORD:'SYNTHETIC-ledger-only',PAIA_PROVIDER_EVIDENCE_DB_PASSWORD:'SYNTHETIC-evidence-only',PAIA_PROVIDER_CREDENTIAL:'SYNTHETIC-NOT-A-KEY'};
}
function registry(f,patch={}){return createProviderDeploymentRegistry([{id:'SYNTHETIC-installed',manifest:f.manifest,tokenize:f.config.tokenize,isCurrent:()=>true,...patch}]);}
function change(env,name,mutate){const c=JSON.parse(env[name]);mutate(c);env[name]=JSON.stringify(c);}
function harness(t,{f=providerFixture(),connectHook,endHook,capability={}}={}){
 const env=environment(f),pools=new Set(),clients=[],ended=[],network={count:0},wire=[];
 t.mock.method(Socket.prototype,'connect',()=>{network.count++;throw Error('SYNTHETIC_NETWORK_FORBIDDEN');});
 const originalConnect=Pool.prototype.connect;
 t.mock.method(Pool.prototype,'connect',function(...args){pools.add(this);return originalConnect.apply(this,args);});
 t.mock.method(Client.prototype,'connect',function(callback){clients.push(this);Promise.resolve().then(()=>connectHook?.(this)).then(()=>callback(null),()=>callback(Error('SYNTHETIC_PRIVATE_CONNECT')));});
 t.mock.method(Client.prototype,'query',async function(sql,args){
  if(sql.startsWith('BEGIN'))this.syntheticTransaction=await (this.connectionParameters.user.includes('evidence')?f.evidencePool:f.reservationPool).connect();
  const result=await this.syntheticTransaction.query(sql,args);
  if(sql==='COMMIT'||sql==='ROLLBACK'){this.syntheticTransaction.release();this.syntheticTransaction=null;}
  return result;
 });
 t.mock.method(Client.prototype,'end',function(callback){ended.push(this);this.syntheticTransaction?.release(true);this.syntheticTransaction=null;this._ending=true;Promise.resolve().then(()=>endHook?.(this)).then(()=>{this.emit('end');callback?.();});});
 const r=registry(f,capability),gateway=createProviderDeploymentGateway({readEnvironment:()=>env,registry:r});
 t.after(async()=>{await gateway.close();assert.equal(network.count,0);});
 return {f,env,r,gateway,pools,clients,ended,wire,network};
}
function transport(t,h,{stall=false,onStart,onResponse,body=JSON.stringify(completion())}={}){
 t.mock.method(https,'request',(options,callback)=>{
  h.wire.push(options);onStart?.(options);
  const request=new EventEmitter();request.destroy=()=>{queueMicrotask(()=>{request.emit('error',Error('SYNTHETIC_PRIVATE_ERROR'));request.emit('close');});return request;};
  request.end=written=>{h.wire.at(-1).written=written;if(stall)return;queueMicrotask(()=>{onResponse?.();const incoming=Readable.from([Buffer.from(body)]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));});};
  options.signal.addEventListener('abort',()=>request.destroy(),{once:true});return request;
 });
}
const safe=result=>{assert.equal(result.financialAuthority,false);assert.equal(result.dispatchAllowed,false);assert.equal(result.retryAllowed,false);assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC-NOT-A-KEY|SYNTHETIC_PRIVATE_BODY/);};

test('actual API has no installed registry and fails before secret reads, pools or sockets',async t=>{
 const f=providerFixture();let reads=0,connections=0;const original=process.env;
 t.mock.method(Pool.prototype,'connect',()=>{connections++;throw Error();});
 const forbidden={get(){reads++;throw Error('SYNTHETIC_PRIVATE');}};
 const env={PAIA_PROVIDER_ENABLED:'true',PAIA_PROVIDER_CAPABILITY_ID:'SYNTHETIC-installed'};
 for(const name of ['PAIA_PROVIDER_CREDENTIAL','PAIA_PROVIDER_RESERVATION_CONFIG','PAIA_PROVIDER_EVIDENCE_CONFIG','PAIA_PROVIDER_RESERVATION_DB_PASSWORD','PAIA_PROVIDER_EVIDENCE_DB_PASSWORD'])Object.defineProperty(env,name,forbidden);
 try{process.env=env;const response=await entry.fetch(http(f.input));assert.equal(response.status,503);assert.equal((await response.json()).reason,'PROVIDER_REGISTRY_UNAVAILABLE');assert.equal(reads,0);assert.equal(connections,0);}finally{process.env=original;}
 assert.equal(installedProviderRegistry.resolve('SYNTHETIC-installed'),null);
});
test('off and missing tokenizer gates do not read any secret or config',async()=>{
 const f=providerFixture();let reads=0;
 const env={PAIA_PROVIDER_ENABLED:'false',get PAIA_PROVIDER_CAPABILITY_ID(){reads++;throw Error();},get PAIA_PROVIDER_CREDENTIAL(){reads++;throw Error();}};
 assert.equal(snapshotProviderDeploymentEnvironment(env,registry(f)).reason,'PROVIDER_DISABLED');assert.equal(reads,0);
 const missing={PAIA_PROVIDER_ENABLED:'true',PAIA_PROVIDER_CAPABILITY_ID:'SYNTHETIC-installed',get PAIA_PROVIDER_CREDENTIAL(){reads++;throw Error();},get PAIA_PROVIDER_RESERVATION_CONFIG(){reads++;throw Error();}};
 assert.equal(snapshotProviderDeploymentEnvironment(missing,registry(f,{tokenize:null})).reason,'QUALIFIED_TOKENIZER_UNAVAILABLE');assert.equal(reads,0);
});
test('registry snapshots trusted manifests and refuses getters, duplicates and unbranded objects',()=>{
 const f=providerFixture(),r=registry(f);f.manifest.profile.model.requested='changed';assert.equal(r.resolve('SYNTHETIC-installed').manifest.profile.model.requested,'SYNTHETIC-qwen');
 let reads=0;
 const own={id:'x',manifest:{},isCurrent:()=>true};Object.defineProperty(own,'tokenize',{enumerable:true,get(){reads++;throw Error();}});const before=reads;assert.throws(()=>createProviderDeploymentRegistry([own]));assert.equal(reads,before);
 const item={id:'same',manifest:{},tokenize:null,isCurrent:()=>true};assert.throws(()=>createProviderDeploymentRegistry([item,item]));
 assert.equal(snapshotProviderDeploymentEnvironment(environment(f),{resolve(){return {};}}).reason,'PROVIDER_REGISTRY_UNAVAILABLE');
});
test('invalid body never reads deployment configuration or performs SQL',async t=>{
 const h=harness(t);let reads=0;const gateway=createProviderDeploymentGateway({readEnvironment:()=>{reads++;return h.env;},registry:h.r});
 for(const body of ['{}',JSON.stringify({...h.f.input,model:'untrusted'}),JSON.stringify({...h.f.input,registry:'untrusted'})])assert.equal((await gateway.fetch(http(h.f.input,{body}))).status,400);
 assert.equal(reads,0);assert.equal(h.pools.size,0);assert.equal(h.f.calls.length,0);await gateway.close();
});
test('actual bootstrap reaches original runner through distinct fixed TLS Pools and never replays',async t=>{
 const h=harness(t);await h.f.reserve();transport(t,h,{onStart:()=>assert.equal(h.f.saved().rows[0].state,'DISPATCHED')});
 const response=await h.gateway.fetch(http(h.f.input)),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.decision,'response_received');safe(result);assert.deepEqual(result.value,{action:'KEEP'});
 assert.equal(h.wire.length,1);assert.equal(h.pools.size,2);assert.equal(h.clients.length,2);assert.notEqual(...[...h.pools]);
 const options=[...h.pools].map(p=>p.options);assert.notEqual(options[0].user,options[1].user);
 for(const option of options){assert.equal(option.host,'database.synthetic.example');assert.equal(option.database,'synthetic');assert.equal(option.ssl.rejectUnauthorized,true);assert.equal(option.ssl.minVersion,'TLSv1.2');assert.equal(option.ssl.servername,option.host);assert.equal(option.max,2);assert.equal(option.query_timeout,16000);assert.equal(option.options,'-c search_path=pg_catalog');}
 assert.equal((await h.gateway.fetch(http(h.f.input))).status,503);assert.equal(h.wire.length,1);
});
test('dual-pool config rejects same role/database disagreement, override fields, malformed trust and duplicate names before sockets',async t=>{
 const h=harness(t),mutations=[
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.postgres.user='paia_provider_ledger.synthetic'),
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.postgres.database='other'),
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.postgres.host='other.synthetic.example'),
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.profileId='other'),
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.identityConfig.principal.keys[0].revoked=true),
  e=>change(e,'PAIA_PROVIDER_RESERVATION_CONFIG',c=>c.postgres.ssl={rejectUnauthorized:false}),
  e=>change(e,'PAIA_PROVIDER_RESERVATION_CONFIG',c=>c.postgres.connectionString='postgres://bad'),
  e=>change(e,'PAIA_PROVIDER_EVIDENCE_CONFIG',c=>c.postgres.user='postgres'),
  e=>e.PAIA_PROVIDER_EVIDENCE_CONFIG=e.PAIA_PROVIDER_EVIDENCE_CONFIG.replace('{','{"vers\\u0069on":1,'),
  e=>e.PAIA_PROVIDER_MAX_CONCURRENT='17',e=>e.PAIA_PROVIDER_MAX_CONCURRENT='2.0',e=>e.PAIA_PROVIDER_CREDENTIAL='bad\nsecret',
 ];
 for(const mutate of mutations){const env=environment(h.f);mutate(env);const gateway=createProviderDeploymentGateway({readEnvironment:()=>env,registry:h.r});const response=await gateway.fetch(http(h.f.input));assert.equal(response.status,503);assert.equal((await response.json()).reason,'PROVIDER_CONFIG_INVALID');await gateway.close();}
 assert.equal(h.clients.length,0);assert.equal(h.f.calls.length,0);
});
test('hostile ambient PG environment cannot replace either service-owned connection',async t=>{
 const h=harness(t),original=process.env;
 process.env={PGHOST:'/tmp',PGPORT:'1',PGDATABASE:'other',PGUSER:'postgres',PGPASSWORD:'wrong',PGSSLMODE:'disable',PGOPTIONS:'-c role=postgres',DATABASE_URL:'postgres://wrong',NODE_TLS_REJECT_UNAUTHORIZED:'0'};
 try{await h.f.reserve();transport(t,h);assert.equal((await h.gateway.fetch(http(h.f.input))).status,200);for(const client of h.clients){assert.equal(client.connectionParameters.host,'database.synthetic.example');assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);assert.equal(client.connectionParameters.options,'-c search_path=pg_catalog');assert.match(client.connectionParameters.password,/^SYNTHETIC-/);}}
 finally{process.env=original;}
});
test('concurrent cold requests share initialization and one durable physical attempt',async t=>{
 const gate=deferred(),entered=deferred();let held=false;
 const h=harness(t,{connectHook:async()=>{if(!held){held=true;entered.resolve();await gate.promise;}}});await h.f.reserve();transport(t,h);
 const pending=Array.from({length:6},()=>h.gateway.fetch(http(h.f.input)));await entered.promise;assert.equal(h.clients.length,1);gate.resolve();
 const responses=await Promise.all(pending);assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(h.wire.length,1);assert.equal(h.pools.size,2);
});
test('revoked installed capability prevents startup, source flags never become financial authority',async t=>{
 const h=harness(t,{capability:{isCurrent:()=>false}});const response=await h.gateway.fetch(http(h.f.input));assert.equal(response.status,503);assert.equal((await response.json()).reason,'PROVIDER_PROFILE_UNAVAILABLE');assert.equal(h.clients.length,0);
});
test('connect failure is sanitized, retires both pools and cannot retry same generation',async t=>{
 const h=harness(t,{connectHook:()=>{throw Error('SYNTHETIC_PRIVATE_CONNECTION');}});
 for(let i=0;i<2;i++){const response=await h.gateway.fetch(http(h.f.input));assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/SYNTHETIC_PRIVATE/);}
 assert.equal(h.clients.length,1);assert.equal(h.wire.length,0);assert.equal(h.f.calls.length,0);
});
test('deployment-source import and construction read no process environment or sockets',()=>{
 const program=`import {Socket} from 'node:net'; Socket.prototype.connect=()=>{throw Error('socket');}; const old=process.env; process.env=new Proxy({}, {get(_,key){if(/^(?:PAIA_|PGPASSWORD$|DATABASE_URL$|DASHSCOPE_API_KEY$)/.test(String(key)))throw Error('deployment-read');return old[key];}}); await import('./services/ai-gateway/api/provider.mjs'); process.env=old; console.log('IMPORT_SAFE');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('../../../',import.meta.url),env:{},encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/IMPORT_SAFE/);
});

test('disable during tokenizer work aborts before evidence publication and never revives',async t=>{
 const entered=deferred(),late=deferred();const h=harness(t,{capability:{tokenize:async()=>{entered.resolve();return late.promise;}}});await h.f.reserve();transport(t,h);
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;h.env.PAIA_PROVIDER_ENABLED='false';
 const disabled=h.gateway.fetch(http(h.f.input));assert.equal((await pending).status,503);assert.equal((await disabled).status,503);late.resolve({});
 assert.equal(h.wire.length,0);assert.equal(h.f.events().size,0);assert.equal(h.f.saved().rows[0].state,'RESERVED');
 assert.equal(h.ended.length,2);
});
test('rotation aborts an active physical attempt without another incoming request',async t=>{
 const entered=deferred();const h=harness(t);await h.f.reserve();transport(t,h,{stall:true,onStart:()=>entered.resolve()});
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATED';
 const response=await pending;assert.equal(response.status,503);safe(await response.json());assert.equal(h.wire.length,1);assert.equal(h.wire[0].signal.aborted,true);assert.equal(h.f.saved().rows[0].state,'OUTCOME_UNKNOWN');
 assert.equal((await h.gateway.fetch(http(h.f.input))).status,503);assert.equal(h.wire.length,1);assert.equal(h.pools.size,4);assert.equal(h.ended.length,2);
});
test('installed source revocation aborts an active attempt and does not activate an empty fallback',async t=>{
 let current=true;const entered=deferred();const h=harness(t,{capability:{isCurrent:()=>current}});await h.f.reserve();transport(t,h,{stall:true,onStart:()=>entered.resolve()});
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;current=false;const response=await pending;assert.equal(response.status,503);assert.equal(h.wire.length,1);assert.equal(h.wire[0].signal.aborted,true);
 const next=await h.gateway.fetch(http(h.f.input));assert.equal((await next.json()).reason,'PROVIDER_PROFILE_UNAVAILABLE');assert.equal(h.wire.length,1);
});
test('close is terminal/idempotent and drains both pools after retaining post-send unknown cost',async t=>{
 const entered=deferred(),h=harness(t);await h.f.reserve();transport(t,h,{stall:true,onStart:()=>entered.resolve()});
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;const closing=h.gateway.close();assert.equal(h.gateway.close(),closing);
 assert.equal((await pending).status,503);assert.deepEqual(await closing,{closed:true,drained:true});assert.equal(h.ended.length,2);assert.equal(h.f.saved().rows[0].state,'OUTCOME_UNKNOWN');
 const before=h.f.calls.length;assert.equal((await h.gateway.fetch(http(h.f.input))).status,503);assert.equal(h.f.calls.length,before);assert.equal(h.wire.length,1);
});
test('late startup cannot revive disable, rotation, close or client abort',async t=>{
 for(const action of ['disable','rotate','close','abort'])await t.test(action,async t=>{
  const entered=deferred(),gate=deferred(),h=harness(t,{connectHook:async()=>{entered.resolve();await gate.promise;}});await h.f.reserve();transport(t,h);
  const controller=new AbortController(),pending=h.gateway.fetch(http(h.f.input,{signal:controller.signal}));await entered.promise;let closing;
  if(action==='disable')h.env.PAIA_PROVIDER_ENABLED='false';
  if(action==='rotate')h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATED';
  if(action==='close')closing=h.gateway.close();
  if(action==='abort')controller.abort();
  gate.resolve();assert.equal((await pending).status,action==='abort'?400:503);await closing;await h.gateway.close();
  assert.equal(h.wire.length,0);assert.equal(h.f.events().size,0);assert.equal(h.f.saved().rows[0].state,'RESERVED');
 });
});
test('idle Pool error is sanitized and cannot reconnect same generation',async t=>{
 const h=harness(t);await h.f.reserve();transport(t,h);assert.equal((await h.gateway.fetch(http(h.f.input))).status,200);
 const before=h.clients.length;h.clients[0].emit('error',Error('SYNTHETIC_PRIVATE_CONNECTION'));
 const response=await h.gateway.fetch(http(h.f.input));assert.equal(response.status,503);safe(await response.json());assert.equal(h.clients.length,before);assert.equal(h.wire.length,1);
});
test('original dispatch acknowledgement loss reaches HTTP as unknown with zero attempts and no retry',async t=>{
 let armed=false;const f=providerFixture({after:({role,sql})=>{if(armed&&role==='ledger'&&sql==='COMMIT'){armed=false;throw Error('SYNTHETIC lost ACK');}}});
 const h=harness(t,{f});await f.reserve();transport(t,h);
 // Readiness also commits. Arm only once the durable dispatch evidence exists.
 const original=f.evidencePool.connect;f.evidencePool.connect=async()=>{armed=true;return original();};
 const response=await h.gateway.fetch(http(f.input)),result=await response.json();assert.equal(response.status,503);assert.equal(result.decision,'outcome_unknown');assert.equal(h.wire.length,0);assert.equal(f.saved().rows[0].state,'DISPATCHED');
 assert.equal((await h.gateway.fetch(http(f.input))).status,503);assert.equal(h.wire.length,0);safe(result);
});
test('HTTP concurrency is bounded before buffering; body abort returns capacity without configuration',async t=>{
 const h=harness(t),controllers=Array.from({length:16},()=>new AbortController());
 const pending=controllers.map(controller=>h.gateway.fetch(http(h.f.input,{body:new ReadableStream(),duplex:'half',signal:controller.signal})));
 assert.equal((await h.gateway.fetch(http(h.f.input))).status,503);assert.equal(h.clients.length,0);
 controllers.forEach(c=>c.abort());await Promise.all(pending);assert.equal((await h.gateway.fetch(http(h.f.input,{body:'{}'}))).status,400);assert.equal(h.clients.length,0);
});
test('startup timeout cannot revive a late initializer or replay a request',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const entered=deferred(),gate=deferred();
 const h=harness(t,{connectHook:async()=>{entered.resolve();await gate.promise;}});transport(t,h);
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;t.mock.timers.tick(25000);assert.equal((await pending).status,503);
 gate.resolve();assert.deepEqual(await h.gateway.close(),{closed:true,drained:true});assert.equal(h.wire.length,0);assert.equal(h.f.saved(),null);
});
test('uncertain pool disposal blocks replacement and reports undrained close',async t=>{
 const h=harness(t);await h.f.reserve();transport(t,h);assert.equal((await h.gateway.fetch(http(h.f.input))).status,200);
 t.mock.timers.enable({apis:['setTimeout']});const held=deferred(),entered=deferred(),originalEnd=Pool.prototype.end;
 t.mock.method(Pool.prototype,'end',function(){entered.resolve();return held.promise;});
 h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATED';const pending=h.gateway.fetch(http(h.f.input));await entered.promise;t.mock.timers.tick(35000);
 assert.equal((await pending).status,503);assert.equal(h.pools.size,2);assert.deepEqual(await h.gateway.close(),{closed:true,drained:false});assert.equal(h.wire.length,1);
 held.resolve();await Promise.all([...h.pools].map(pool=>originalEnd.call(pool)));
});

test('timed-out replacement cannot start after the prior pool drain finishes',async t=>{
 const h=harness(t);await h.f.reserve();transport(t,h);
 assert.equal((await h.gateway.fetch(http(h.f.input))).status,200);
 const originalEnd=Pool.prototype.end,oldPools=[...h.pools],gate=deferred(),entered=deferred();
 t.mock.method(Pool.prototype,'end',function(){entered.resolve();return gate.promise.then(()=>originalEnd.call(this));});
 t.mock.timers.enable({apis:['setTimeout']});
 h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATED';
 const pending=h.gateway.fetch(http(h.f.input));await entered.promise;
 // Original startup deadline expires while disposal still has ten seconds.
 // Completing the old drain at 26s must never revive the retired replacement.
 t.mock.timers.tick(25000);assert.equal((await pending).status,503);
 const clientsAtTimeout=h.clients.length,callsAtTimeout=h.f.calls.length;
 let lateSecretReads=0;
 Object.defineProperty(h.env,'PAIA_PROVIDER_CREDENTIAL',{get(){lateSecretReads++;return 'SYNTHETIC-ROTATED';}});
 t.mock.timers.tick(1000);gate.resolve();
 for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));
 const clientsAfterDrain=h.clients.length,callsAfterDrain=h.f.calls.length;
 const closed=await h.gateway.close();
 // RED cleanup releases only a leaked synthetic pool, without masking failure.
 for(const pool of h.pools)if(!oldPools.includes(pool))await originalEnd.call(pool);
 assert.equal(clientsAfterDrain,clientsAtTimeout,'timed-out replacement must not open another connection');
 assert.equal(h.pools.size,2,'only the two original dedicated pools were used');
 assert.equal(callsAfterDrain,callsAtTimeout,'retired replacement cannot run readiness or authority SQL');
 assert.equal(lateSecretReads,0,'retired startup cannot resnapshot deployment secrets');
 assert.equal(h.ended.length,2);assert.deepEqual(closed,{closed:true,drained:true});
 assert.equal(h.wire.length,1);
});

test('replacement rechecks disable, rotation and source revocation after the old drain',async t=>{
 for(const action of ['disable','rotate','revoke'])await t.test(action,async t=>{
  let current=true;const h=harness(t,{capability:{isCurrent:()=>current}});await h.f.reserve();transport(t,h);
  assert.equal((await h.gateway.fetch(http(h.f.input))).status,200);
  const originalEnd=Pool.prototype.end,oldPools=[...h.pools],gate=deferred(),entered=deferred();
  t.mock.method(Pool.prototype,'end',function(){entered.resolve();return gate.promise.then(()=>originalEnd.call(this));});
  h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATION-ONE';
  const pending=h.gateway.fetch(http(h.f.input));await entered.promise;
  const callsBeforeDrain=h.f.calls.length;
  if(action==='disable')h.env.PAIA_PROVIDER_ENABLED='false';
  if(action==='rotate')h.env.PAIA_PROVIDER_CREDENTIAL='SYNTHETIC-ROTATION-TWO';
  if(action==='revoke')current=false;
  gate.resolve();assert.equal((await pending).status,503);
  const clientsAfterDrain=h.clients.length,callsAfterDrain=h.f.calls.length;
  const closed=await h.gateway.close();
  // Keep RED cleanup local to the synthetic regression harness.
  for(const pool of h.pools)if(!oldPools.includes(pool)&&!pool.ended)await originalEnd.call(pool);
  assert.equal(clientsAfterDrain,2,'stale replacement cannot open a connection after the prior drain');
  assert.equal(callsAfterDrain,callsBeforeDrain,'stale replacement cannot perform readiness SQL');
  assert.equal(h.pools.size,2);assert.equal(h.ended.length,2);assert.deepEqual(closed,{closed:true,drained:true});
  assert.equal(h.wire.length,1);
 });
});
