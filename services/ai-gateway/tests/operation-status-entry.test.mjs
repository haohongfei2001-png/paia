import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
import {createOperationStatusHandler,parseOperationStatusHttpRequest} from '../operation-status-entry.mjs';
import {createOperationStatusDeploymentGateway,snapshotOperationStatusEnvironment} from '../operation-status-deployment-bootstrap.mjs';
import entry,{closeOperationStatusGateway} from '../api/operation-status.mjs';
const setup=()=>{const f=fixture(),p=protocol(f),bundle=p.admit(request('SYNTHETIC-query'));return {f,p,bundle,service:createPostgresOperationStatusService({pool:p.pool,identityConfig:f.identityConfig,profileId:f.profileId})};};
const raw=h=>JSON.stringify({action:'query',...h.bundle});
const http=(h,patch={})=>new Request('https://service.invalid/api/operation-status',{method:'POST',headers:{'content-type':'application/json'},body:raw(h),...patch});

test('actual status HTTP authenticates exact immutable request and returns body-free financial metadata',async()=>{
 const h=setup();await h.p.service().reserve(h.bundle);const before=structuredClone(h.p.saved());
 const response=await createOperationStatusHandler({service:h.service})(http(h)),answer=await response.json();
 assert.equal(response.status,200);assert.equal(answer.state,'RESERVED');assert.equal(answer.heldSpendMicros,before.rows[0].reservationMicros);assert.equal(answer.retryAllowed,false);assert.deepEqual(h.p.saved(),before);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
});

test('query parser snapshots allowed immutable fields and nothing else',async()=>{
 const h=setup(),bundle=await parseOperationStatusHttpRequest(http(h));assert.deepEqual(bundle,h.bundle);assert.equal(Object.isFrozen(bundle),true);assert.equal(Object.isFrozen(bundle.request),true);
});

test('duplicate decoded names bodies money evidence clocks actions depth and malformed JSON fail before configuration',async()=>{
 const h=setup();let reads=0;const handler=createOperationStatusHandler({resolveService:()=>{reads++;return {service:h.service,isCurrent:()=>true};}});
 for(const body of [raw(h).replace('{','{"action":"query",'),raw(h).replace('{','{"act\\u0069on":"query",'),raw(h).replace('"operationId":','"operationId":"wrong","operationId":'),
  ...['body','evidence','financialSettlement','verified','reconcile','settlementId','pool','clock','usdMicros'].map(key=>JSON.stringify({action:'query',...h.bundle,[key]:true})),
  ...['reserve','cancel','record','settle','finalize'].map(action=>JSON.stringify({action,...h.bundle})),
  '[]','null','{',raw(h)+'{}',raw(h).replace('SYNTHETIC-query','\\ud800'),raw(h).replace('"inputTokens":100','"inputTokens":{"a":{}}'),
 ])assert.equal((await handler(http(h,{body}))).status,400,body.slice(0,100));
 assert.equal(reads,0);assert.equal(h.p.calls.length,0);
});

test('route method media encoding size abort and invalid UTF-8 fail closed',async()=>{
 const h=setup(),handler=createOperationStatusHandler({service:h.service});
 for(const [input,status] of [
  [new Request('https://service.invalid/api/operation-status?operation=private'),404],
  [new Request('https://service.invalid/api/operation-status'),405],
  [http(h,{headers:{'content-type':'text/plain'}}),415],
  [http(h,{headers:{'content-type':'application/json','content-encoding':'gzip'}}),415],
  [http(h,{headers:{'content-type':'application/json','content-length':'1'}}),400],
  [http(h,{body:' '.repeat(24577)}),413],[http(h,{body:new Uint8Array([0xff])}),400],
  [http(h,{signal:AbortSignal.abort()}),400],
 ])assert.equal((await handler(input)).status,status);
 assert.equal(h.p.calls.length,0);
});

test('HTTP cannot select an arbitrary callable and unconfigured service cannot query',async()=>{
 const h=setup();let calls=0;
 assert.equal((await createPostgresOperationStatusService().query(h.bundle)).reason,'SERVICE_UNCONFIGURED');
 assert.equal((await createOperationStatusHandler({service:{query(){calls++;}}})(http(h))).status,503);assert.equal(calls,0);
});

test('direct query rejects getters and proxy bundles without invoking their bodies',async()=>{
 const h=setup();let called=0;const getter={...h.bundle};Object.defineProperty(getter,'request',{get(){called++;throw Error();}});
 for(const bundle of [getter,new Proxy(h.bundle,{get(){called++;throw Error();}})])assert.equal((await h.service.query(bundle)).decision,'deny');assert.equal(called,0);assert.equal(h.p.calls.length,0);
});

test('held resolver abort lifecycle rotation and async current flags cannot resume old query',async()=>{
 const h=setup();let release;const gate=new Promise(r=>release=r),controller=new AbortController();
 const handler=createOperationStatusHandler({resolveService:async()=>{await gate;return {service:h.service,isCurrent:()=>true};}});
 const pending=handler(http(h,{signal:controller.signal}));await new Promise(r=>setImmediate(r));controller.abort();release();assert.equal((await pending).status,400);
 for(const isCurrent of [()=>false,async()=>true])assert.equal((await createOperationStatusHandler({resolveService:async()=>({service:h.service,isCurrent})})(http(h))).status,503);
 assert.equal(h.p.calls.length,0);
});

test('default-off operation API never reads credentials or connects without both explicit flags and qualified config',async t=>{
 let reads=0,connections=0;t.mock.method(Socket.prototype,'connect',()=>{connections++;throw Error('SYNTHETIC network forbidden');});t.mock.method(Pool.prototype,'connect',()=>{connections++;throw Error('SYNTHETIC DB forbidden');});
 assert.deepEqual(snapshotOperationStatusEnvironment({get PAIA_RESERVATIONS_CONFIG(){reads++;throw Error();},get PAIA_RESERVATIONS_DB_PASSWORD(){reads++;throw Error();}}),{enabled:false});assert.equal(reads,0);
 const h=setup(),original=process.env;process.env={};try{assert.equal((await entry.fetch(http(h))).status,503);}finally{process.env=original;}
 for(const environment of [{},{PAIA_OPERATION_STATUS_ENABLED:'true'},{PAIA_RESERVATIONS_ENABLED:'true'},{PAIA_OPERATION_STATUS_ENABLED:'true',PAIA_RESERVATIONS_ENABLED:'true'}]){
  const gateway=createOperationStatusDeploymentGateway({readEnvironment:()=>environment});assert.equal((await gateway.fetch(http(h))).status,503);await gateway.close();
 }assert.equal(connections,0);
});

test('configured actual API uses original Pool lifecycle readiness signatures and does not mint a missing row',async t=>{
 const h=setup();let network=0,connected=0;
 t.mock.method(Socket.prototype,'connect',()=>{network++;throw Error('SYNTHETIC network forbidden');});
 t.mock.method(Client.prototype,'connect',function(callback){connected++;queueMicrotask(()=>callback(null));});
 t.mock.method(Client.prototype,'query',async function(sql,args){if(sql.startsWith('BEGIN'))this.syntheticTransaction=await h.p.pool.connect();return this.syntheticTransaction.query(sql,args);});
 t.mock.method(Client.prototype,'end',function(callback){this._ending=true;queueMicrotask(()=>{this.emit('end');callback?.();});});
 const env={PAIA_OPERATION_STATUS_ENABLED:'true',PAIA_RESERVATIONS_ENABLED:'true',PAIA_RESERVATIONS_DB_PASSWORD:'SYNTHETIC-only-not-a-credential',
  PAIA_RESERVATIONS_CONFIG:JSON.stringify({version:1,profileId:h.f.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user:'paia_runtime.synthetic',caPem:null},identityConfig:h.f.identityConfig})};
 const original=process.env;process.env=env;
 try{assert.equal(connected,0);const response=await entry.fetch(http(h));assert.equal(response.status,200);assert.equal((await response.json()).state,'NOT_FOUND');assert.equal(connected,1);assert.equal(h.p.saved(),null);
  env.PAIA_OPERATION_STATUS_ENABLED='false';assert.equal((await entry.fetch(http(h))).status,503);assert.equal(network,0);
 }finally{await closeOperationStatusGateway();process.env=original;}
});
