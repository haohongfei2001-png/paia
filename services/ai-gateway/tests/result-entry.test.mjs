import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import {resultFixture,http} from './result-fixtures.mjs';
import {parseResultHttpRequest,createResultHandler,RESULT_HTTP_LIMITS} from '../result-entry.mjs';
import {snapshotResultDeclaration} from '../result-declaration.mjs';
import {snapshotResultEnvironment,createResultDeploymentGateway} from '../result-deployment-bootstrap.mjs';
import entry,{closeResultGateway} from '../api/results.mjs';

const payload=f=>JSON.stringify({action:'finalize',...f.bundles[0],result:f.result});

test('strict result HTTP accepts all four original financial child bindings',async()=>{
 const f=await resultFixture();const result={...f.result,children:Array.from({length:4},(_,i)=>({operationId:'SYNTHETIC-child-'+i,receiptId:'SYNTHETIC-usage-'+i}))};
 const parsed=await parseResultHttpRequest(http(f,{body:JSON.stringify({action:'finalize',...f.bundles[0],result})}));
 assert.deepEqual(parsed.result,result);assert.equal(Object.isFrozen(parsed.result.children),true);
});

test('duplicates escaped duplicates bodies money booleans callbacks depth and malformed input fail before configuration',async()=>{
 const f=await resultFixture();let reads=0;const handler=createResultHandler({resolveService:()=>{reads++;return {service:f.service,isCurrent:()=>true};}}),raw=payload(f);
 for(const body of [raw.replace('{','{"action":"finalize",'),raw.replace('{','{"act\\u0069on":"finalize",'),raw.replace('"receiptId":','"receiptId":"duplicate","receiptId":'),
  JSON.stringify({action:'finalize',...f.bundles[0],result:{...f.result,body:'SYNTHETIC_PRIVATE_BODY'}}),
  ...['verifiedResultFacts','verifiedDomainFacts','verifyResult','usdMicros','settlement','pool','clock'].map(key=>JSON.stringify({action:'finalize',...f.bundles[0],result:f.result,[key]:true})),
  raw.replace('"finalize"','"settle"'),raw.replace('SYNTHETIC-local-domain-result','\\ud800'),raw+'{}','[]','null',raw.replace('"children":[','"children":[[[['),
 ])assert.equal((await handler(http(f,{body}))).status,400,body.slice(0,60));
 assert.equal(reads,0);
});

test('route method encoding media byte count limits and abort remain closed',async()=>{
 const f=await resultFixture(),handler=createResultHandler({service:f.service});
 for(const [request,status] of [
  [new Request('https://service.invalid/api/results?x=1'),404],[new Request('https://service.invalid/api/results'),405],
  [http(f,{headers:{'content-type':'text/plain'}}),415],[http(f,{headers:{'content-type':'application/json','content-encoding':'gzip'}}),415],
  [http(f,{headers:{'content-type':'application/json','content-length':'1'}}),400],
  [http(f,{body:' '.repeat(RESULT_HTTP_LIMITS.bytes+1)}),413],
  [http(f,{signal:AbortSignal.abort()}),400],
 ])assert.equal((await handler(request)).status,status);
});

test('descriptor snapshot refuses proxies accessors sparse children and injected prototypes without invoking getters',async()=>{
 const f=await resultFixture(),r=f.requests[0];let reads=0;
 const accessor={...f.result};Object.defineProperty(accessor,'outcome',{get(){reads++;return 'COMMITTED';},enumerable:true});
 const sparse={...f.result,children:Array(1)},proxy=new Proxy(f.result,{get(){reads++;throw Error();}});
 const child={...f.result,children:[Object.assign(Object.create({secret:'SYNTHETIC'}),f.result.children[0])]};
 for(const value of [accessor,sparse,proxy,child])assert.throws(()=>snapshotResultDeclaration(r,value));assert.equal(reads,0);
});

test('held resolver rechecks abort current lifecycle and exact service brand',async()=>{
 const f=await resultFixture();let release;const gate=new Promise(r=>release=r),controller=new AbortController();
 const handler=createResultHandler({resolveService:async()=>{await gate;return {service:f.service,isCurrent:()=>true};}}),before=f.p.saved();
 const pending=handler(http(f,{signal:controller.signal}));await new Promise(r=>setImmediate(r));controller.abort();release();assert.equal((await pending).status,400);assert.deepEqual(f.p.saved(),before);
 for(const isCurrent of [()=>false,async()=>true])assert.equal((await createResultHandler({resolveService:async()=>({service:f.service,isCurrent})})(http(f))).status,503);
});

test('result bootstrap and actual API entry stay off without their explicit source configuration and do not connect',async t=>{
 let reads=0,connections=0;t.mock.method(Socket.prototype,'connect',()=>{connections++;throw Error('SYNTHETIC network forbidden');});t.mock.method(Pool.prototype,'connect',()=>{connections++;throw Error('SYNTHETIC DB forbidden');});
 assert.deepEqual(snapshotResultEnvironment({get PAIA_RESERVATIONS_CONFIG(){reads++;throw Error();},get PAIA_RESERVATIONS_DB_PASSWORD(){reads++;throw Error();}}),{enabled:false});assert.equal(reads,0);
 const f=await resultFixture(); // Fixture has its own pool.connect implementation.
 const original=process.env;process.env={};
 try{assert.equal((await entry.fetch(http(f))).status,503);}finally{process.env=original;}
 for(const env of [{},{PAIA_RESULTS_ENABLED:'true'},{PAIA_RESERVATIONS_ENABLED:'true'},{PAIA_RESULTS_ENABLED:'true',PAIA_RESERVATIONS_ENABLED:'true'}]){
  const gateway=createResultDeploymentGateway({readEnvironment:()=>env});assert.equal((await gateway.fetch(http(f))).status,503);await gateway.close();
 }
 assert.equal(connections,0);
});

test('configured actual result API uses original Pool lifecycle readiness signatures and ledger owner',async t=>{
 const f=await resultFixture(),before=f.p.saved().rows[0].settlement;let network=0,connected=0;
 t.mock.method(Socket.prototype,'connect',()=>{network++;throw Error('SYNTHETIC network forbidden');});
 t.mock.method(Client.prototype,'connect',function(callback){connected++;queueMicrotask(()=>callback(null));});
 t.mock.method(Client.prototype,'query',async function(sql,args){if(sql.startsWith('BEGIN'))this.syntheticTransaction=await f.p.pool.connect();return this.syntheticTransaction.query(sql,args);});
 t.mock.method(Client.prototype,'end',function(callback){this._ending=true;queueMicrotask(()=>{this.emit('end');callback?.();});});
 const env={PAIA_RESULTS_ENABLED:'true',PAIA_RESERVATIONS_ENABLED:'true',PAIA_RESERVATIONS_DB_PASSWORD:'SYNTHETIC-only-not-a-credential',
  PAIA_RESERVATIONS_CONFIG:JSON.stringify({version:1,profileId:f.f.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user:'paia_runtime.synthetic',caPem:null},identityConfig:f.f.identityConfig})};
 const original=process.env;process.env=env;const gateway={fetch:entry.fetch,close:closeResultGateway};
 try{
  assert.equal(connected,0);const response=await gateway.fetch(http(f));assert.equal(response.status,200);assert.equal((await response.json()).decision,'finalized');
  assert.equal(connected,1);assert.deepEqual(f.p.saved().rows[0].settlement,before);
  env.PAIA_RESULTS_ENABLED='false';assert.equal((await gateway.fetch(http(f))).status,503);assert.equal(network,0);
 }finally{await gateway.close();process.env=original;}
});
