import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {createClientIdentityCurrentnessTransport} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
import {createMaintenanceIdentityChannelCurrentness} from '../../../extension/core/ai-usage/maintenance-identity-currentness.js';
import {createIdentityCurrentnessDeploymentGateway,snapshotIdentityCurrentnessEnvironment} from '../identity-currentness-deployment-bootstrap.mjs';
import api,{closeIdentityCurrentnessGateway} from '../api/identity-currentness.mjs';
const tick=()=>new Promise(r=>setImmediate(r)),url='https://synthetic.invalid/api/identity-currentness';
const http=(bundle,extra={})=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'observe',...bundle}),...extra});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function environment(f){return {PAIA_IDENTITY_CURRENTNESS_ENABLED:'true',PAIA_RESERVATIONS_ENABLED:'true',PAIA_RESERVATIONS_DB_PASSWORD:'SYNTHETIC-NOT-A-CREDENTIAL',PAIA_RESERVATIONS_CONFIG:JSON.stringify({version:1,profileId:f.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user:'paia_currentness.synthetic',caPem:null},identityConfig:f.identityConfig})};}
function harness(t,{connectHook,endHook,hook,authority}={}){
 const f=identityChannelFixture({hook,authority}),env=environment(f),pools=new Set(),clients=[],ended=[];let network=0,reads=0;
 t.mock.method(Socket.prototype,'connect',()=>{network++;throw Error('SYNTHETIC_NETWORK_FORBIDDEN');});
 const connect=Pool.prototype.connect;t.mock.method(Pool.prototype,'connect',function(...args){pools.add(this);return connect.apply(this,args);});
 t.mock.method(Client.prototype,'connect',function(callback){clients.push(this);Promise.resolve().then(()=>connectHook?.(this)).then(async()=>{this.protocol=await f.pool.connect();this.protocol.on('notification',m=>this.emit('notification',m));callback(null);},()=>callback(Error('SYNTHETIC_CONNECT_ERROR')));});
 t.mock.method(Client.prototype,'query',function(sql,args){return this.protocol.query(sql,args);});
 t.mock.method(Client.prototype,'end',function(callback){ended.push(this);this._ending=true;Promise.resolve().then(()=>endHook?.(this)).then(()=>{this.protocol?.release(true);this.emit('end');callback?.();});});
 const gateway=createIdentityCurrentnessDeploymentGateway({readEnvironment:()=>{reads++;return env;}});
 t.after(async()=>{await gateway.close();f.close();assert.equal(network,0);});
 return {f,env,pools,clients,ended,gateway,reads:()=>reads};
}
const first=async response=>{assert.equal(response.status,200,await (response.status!==200?response.clone().text():''));const reader=response.body.getReader(),chunk=await reader.read(),frame=JSON.parse(new TextDecoder().decode(chunk.value));assert.equal(frame.type,'ready');assert.equal(frame.financialAuthority,false);assert.equal(frame.dispatchAllowed,false);assert.equal(frame.retryAllowed,false);return {reader,frame};};

test('default-off API and constructor perform no environment or socket work before request',async t=>{
 const h=harness(t);assert.equal(h.reads(),0);assert.equal(h.pools.size,0);
 const original=process.env;process.env={};try{const response=await api.fetch(http(h.f.bundle));assert.equal(response.status,503);assert.equal(h.pools.size,0);process.env=h.env;const active=await first(await api.fetch(http(h.f.bundle)));await active.reader.cancel();assert.equal(h.pools.size,1);}finally{process.env=original;await closeIdentityCurrentnessGateway();}
 let secrets=0;assert.deepEqual(snapshotIdentityCurrentnessEnvironment({PAIA_IDENTITY_CURRENTNESS_ENABLED:'false',get PAIA_RESERVATIONS_CONFIG(){secrets++;throw Error();},get PAIA_RESERVATIONS_DB_PASSWORD(){secrets++;throw Error();}}),{enabled:false});assert.equal(secrets,0);
});
test('actual dedicated Pool, signed snapshot, streaming ready and caller cancellation are composed',async t=>{
 const h=harness(t),response=await h.gateway.fetch(http(h.f.bundle)),{reader,frame}=await first(response);
 assert.equal(h.pools.size,1);assert.equal(h.clients.length,1);const pool=[...h.pools][0];assert.equal(pool.options.max,8);assert.equal(pool.options.min,0);assert.equal(pool.options.connectionTimeoutMillis,5000);assert.equal(pool.options.ssl.rejectUnauthorized,true);assert.equal(pool.options.ssl.minVersion,'TLSv1.2');assert.equal(pool.options.application_name,'paia-identity-currentness-v1');
 assert.equal(frame.identity.operationId,h.f.request.operationId);assert.equal(h.f.calls.filter(c=>c.sql==='COMMIT').length,2);assert.equal(h.f.calls.some(c=>/ledger|INSERT|UPDATE|DELETE/.test(c.sql)&&!c.sql.includes('SELECT c.relname')),false);
 await reader.cancel();await tick();assert.equal(h.ended.length,1);assert.equal(h.f.released.length,1);assert.deepEqual(await h.gateway.close(),{closed:true,drained:true});
});
test('malformed metadata, route, and request-selected configuration never read environment or SQL',async t=>{
 const h=harness(t);
 for(const body of ['{}',JSON.stringify({action:'observe',...h.f.bundle,pool:{max:100}}),JSON.stringify({action:'observe',...h.f.bundle,resolveService:true})])assert.equal((await h.gateway.fetch(http(h.f.bundle,{body}))).status,400);
 assert.equal((await h.gateway.fetch(new Request(url+'?endpoint=other'))).status,404);assert.equal(h.reads(),0);assert.equal(h.pools.size,0);
});
test('eight returned unconsumed Responses occupy all stream slots until cancellation',async t=>{
 const h=harness(t),responses=await Promise.all(Array.from({length:8},()=>h.gateway.fetch(http(h.f.bundle))));assert.ok(responses.every(r=>r.status===200));assert.equal(h.clients.length,8);
 assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.clients.length,8);
 await responses[0].body.cancel();await tick();const next=await h.gateway.fetch(http(h.f.bundle));assert.equal(next.status,200);assert.equal(h.clients.length,9);
 await Promise.all([...responses.slice(1),next].map(r=>r.body.cancel()));
});
test('request abort, database invalidation, and gateway shutdown close delivered streams',async t=>{
 const h=harness(t),abort=new AbortController(),a=await first(await h.gateway.fetch(http(h.f.bundle,{signal:abort.signal}))),b=await first(await h.gateway.fetch(http(h.f.bundle)));
 abort.abort();assert.equal((await a.reader.read()).done,true);await tick();assert.equal(h.ended.length,1);
 h.f.notify();assert.equal((await b.reader.read()).done,true);await tick();assert.equal(h.ended.length,2);
 const c=await first(await h.gateway.fetch(http(h.f.bundle)));const result=await h.gateway.close();assert.equal(result.closed,true);assert.equal((await c.reader.read()).done,true);assert.equal(h.ended.length,3);assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);
});
test('observed disable revokes previous streams before returning new unavailable response',async t=>{
 const h=harness(t),a=await first(await h.gateway.fetch(http(h.f.bundle)));h.env.PAIA_IDENTITY_CURRENTNESS_ENABLED='false';
 assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal((await a.reader.read()).done,true);assert.equal(h.ended.length,1);assert.equal(h.pools.size,1);
});
test('rotation cannot create another Pool until prior end is acknowledged',async t=>{
 const hold=deferred();let old;const h=harness(t,{endHook:c=>c===old?hold.promise:undefined});const a=await first(await h.gateway.fetch(http(h.f.bundle)));old=h.clients[0];h.env.PAIA_RESERVATIONS_DB_PASSWORD='SYNTHETIC-ROTATED';
 let finished=false;const pending=h.gateway.fetch(http(h.f.bundle)).then(r=>{finished=true;return r;});await tick();assert.equal(finished,false);assert.equal((await a.reader.read()).done,true);assert.equal(h.pools.size,1);
 hold.resolve();const response=await pending;assert.equal(response.status,200);assert.equal(h.pools.size,2);await response.body.cancel();
});
test('backpressure on an abandoned response releases original listener and gateway capacity',async t=>{
 const h=harness(t);t.mock.timers.enable({apis:['setTimeout','setInterval']});const response=await h.gateway.fetch(http(h.f.bundle));assert.equal(response.status,200);await tick();t.mock.timers.tick(1000);await tick();assert.equal(h.ended.length,1);await response.body.cancel();
});

test('uncancellable physical Client.end callbacks retain capacity after HTTP cancellation',async t=>{
 const held=deferred(),h=harness(t,{endHook:()=>held.promise});t.after(()=>held.resolve());
 for(let round=0;round<4;round++){
  const responses=await Promise.all(Array.from({length:8},()=>h.gateway.fetch(http(h.f.bundle))));
  await Promise.all(responses.map(r=>r.body?.cancel()));await tick();
 }
 assert.equal(h.clients.length,8,'closed HTTP streams do not free still-closing physical clients');
 held.resolve();await tick();const response=await h.gateway.fetch(http(h.f.bundle));assert.equal(response.status,200);assert.equal(h.clients.length,9);await response.body.cancel();
});
test('body timeout keeps an uncancellable underlying cancel promise occupied',async t=>{
 const h=harness(t),held=deferred();t.mock.timers.enable({apis:['setTimeout']});let cancellations=0;
 for(let round=0;round<4;round++){
  const waiting=Array.from({length:8},()=>h.gateway.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},duplex:'half',body:new ReadableStream({cancel(){cancellations++;return held.promise;}})})));
  await tick();t.mock.timers.tick(5000);await Promise.all(waiting);
 }
 assert.equal(cancellations,8);assert.equal(h.clients.length,0);assert.equal(h.reads(),0);
 held.resolve();await tick();const response=await h.gateway.fetch(http(h.f.bundle));assert.equal(response.status,200);await response.body.cancel();
});
test('held actual Pool acquisitions stay bounded after repeated request timeout',async t=>{
 const held=deferred(),h=harness(t,{connectHook:()=>held.promise});t.mock.timers.enable({apis:['setTimeout']});
 for(let round=0;round<4;round++){
  const waiting=Array.from({length:8},()=>h.gateway.fetch(http(h.f.bundle)));await tick();t.mock.timers.tick(5000);assert.ok((await Promise.all(waiting)).every(r=>r.status===503));
 }
 assert.equal(h.clients.length,8);assert.equal(h.f.calls.length,0);
 held.resolve();await tick();await tick();assert.equal(h.ended.length,8);assert.equal(h.f.calls.length,0);
});
test('uncertain physical shutdown blocks rotation permanently even if close completes later',async t=>{
 const held=deferred(),h=harness(t,{endHook:()=>held.promise});t.mock.timers.enable({apis:['setTimeout']});const a=await first(await h.gateway.fetch(http(h.f.bundle)));h.env.PAIA_RESERVATIONS_DB_PASSWORD='SYNTHETIC-NEW';
 const pending=h.gateway.fetch(http(h.f.bundle));await tick();t.mock.timers.tick(5000);assert.equal((await pending).status,503);assert.equal((await a.reader.read()).done,true);assert.equal(h.pools.size,1);
 held.resolve();await tick();assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.pools.size,1);assert.deepEqual(await h.gateway.close(),{closed:true,drained:false});
});
test('55 second entry deadline closes a consumed stream without changing original expiry',async t=>{
 const h=harness(t);t.mock.timers.enable({apis:['setTimeout','setInterval']});const {reader,frame}=await first(await h.gateway.fetch(http(h.f.bundle))),expiry=frame.identity.verifiedUntil;
 for(let second=1;second<55;second++){const next=reader.read();t.mock.timers.tick(1000);const value=await next;assert.equal(value.done,false);assert.equal(JSON.parse(new TextDecoder().decode(value.value)).type,'pulse');}
 const last=reader.read();t.mock.timers.tick(1000);assert.equal((await last).done,true);await tick();assert.equal(h.ended.length,1);assert.equal(frame.identity.verifiedUntil,expiry);assert.ok(expiry>frame.identity.observedAt+55000);
});

test('concurrent admissions share capacity with seven physically closing clients',async t=>{
 const held=deferred(),h=harness(t,{endHook:()=>held.promise});const first=await Promise.all(Array.from({length:7},()=>h.gateway.fetch(http(h.f.bundle))));await Promise.all(first.map(r=>r.body.cancel()));await tick();
 const second=await Promise.all(Array.from({length:8},()=>h.gateway.fetch(http(h.f.bundle))));await Promise.all(second.map(r=>r.body.cancel()));
 held.resolve();await tick();assert.equal(h.clients.length,8,'admission reserves a physical slot before awaiting connect');assert.equal(second.filter(r=>r.status===200).length,1);
});


test('at full capacity a denied request does not inspect config; next admitted request discovers disable',async t=>{
 const h=harness(t),readers=await Promise.all(Array.from({length:8},async()=>first(await h.gateway.fetch(http(h.f.bundle))))),reads=h.reads();h.env.PAIA_IDENTITY_CURRENTNESS_ENABLED='false';
 assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.reads(),reads);assert.equal(h.ended.length,0);
 await readers[0].reader.cancel();await tick();assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.ended.length,8);
 for(const r of readers.slice(1))assert.equal((await r.reader.read()).done,true);
});
test('actual source session reaches Filter ACK through the streaming bootstrap and disposes its listener',async t=>{
 let h,metadata=0;const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,server,filterIdentity})=>{
  filterIdentity.dispose();h=harness(t,{authority:server});const transport=createClientIdentityCurrentnessTransport({endpoint:configuration.origin+'/api/identity-currentness',clock:configuration.clock,fetch:request=>{metadata++;return h.gateway.fetch(request);}});
  configuration.filterIdentity=createMaintenanceIdentityChannelCurrentness({origin:configuration.origin,clock:configuration.clock,transport});
 }});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));const rows=await f.s.repository.transaction(false,t=>t.all('organizerWorkItems'));assert.equal(rows.filter(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED').length,1);
 assert.equal((await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id),false);assert.equal(f.physical(),1);assert.equal(metadata,1);assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,2);
 f.session.dispose();await tick();assert.equal(h.ended.length,1);assert.equal((await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id),true);
});

for(const variant of ['missing config','invalid TLS target','missing original enable'])test('source deployment rejects '+variant+' before opening a Pool',async t=>{
 const h=harness(t);if(variant==='missing config')delete h.env.PAIA_RESERVATIONS_CONFIG;
 if(variant==='missing original enable')delete h.env.PAIA_RESERVATIONS_ENABLED;
 if(variant==='invalid TLS target'){const config=JSON.parse(h.env.PAIA_RESERVATIONS_CONFIG);config.postgres.host='127.0.0.1';h.env.PAIA_RESERVATIONS_CONFIG=JSON.stringify(config);}
 assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.pools.size,0);assert.equal(h.f.calls.length,0);
});
test('actual Pool error invalidates its streams and cannot reopen the same runtime entry',async t=>{
 const h=harness(t),a=await first(await h.gateway.fetch(http(h.f.bundle)));[...h.pools][0].emit('error',Error('SYNTHETIC'));assert.equal((await a.reader.read()).done,true);await tick();assert.equal(h.ended.length,1);assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);assert.equal(h.pools.size,1);
});
test('shutdown reports incomplete drain for an unresolved inbound cancel and remains closed',async t=>{
 const h=harness(t),held=deferred(),started=deferred();const request=new Request(url,{method:'POST',headers:{'content-type':'application/json'},duplex:'half',body:new ReadableStream({pull(){started.resolve();},cancel(){return held.promise;}})});
 const pending=h.gateway.fetch(request);await started.promise;const close=await h.gateway.close();assert.deepEqual(close,{closed:true,drained:false});assert.equal((await pending).status,503);assert.equal(h.pools.size,0);
 held.resolve();await tick();assert.equal((await h.gateway.fetch(http(h.f.bundle))).status,503);
});
