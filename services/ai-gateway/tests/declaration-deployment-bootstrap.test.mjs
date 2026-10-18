import test from 'node:test';
import assert from 'node:assert/strict';
import {Socket} from 'node:net';
import {Pool,Client} from 'pg';
import entry,{closeDeclarationGateway} from '../api/declarations.mjs';
import {createDeclarationDeploymentGateway,snapshotDeclarationEnvironment} from '../declaration-deployment-bootstrap.mjs';
import {declarationPublisherFixture} from './client-declaration-fixtures.mjs';
const http=f=>new Request('https://synthetic.invalid/api/declarations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'publish',...f.bundle,declaration:f.declaration})});
function harness(t){
 const f=declarationPublisherFixture(),env={PAIA_DECLARATIONS_ENABLED:'true',PAIA_DECLARATIONS_DB_PASSWORD:'SYNTHETIC-only-not-a-credential',PAIA_DECLARATIONS_CONFIG:JSON.stringify({version:1,profileId:f.fixture.profileId,postgres:{host:'database.synthetic.example',port:6543,database:'synthetic',user:'paia_publisher.synthetic',caPem:null},identityConfig:f.fixture.identityConfig})},clients=[],pools=new Set();let sockets=0;
 t.mock.method(Socket.prototype,'connect',()=>{sockets++;throw Error('NETWORK_FORBIDDEN');});
 const connect=Pool.prototype.connect;t.mock.method(Pool.prototype,'connect',function(...args){pools.add(this);return connect.apply(this,args);});
 t.mock.method(Client.prototype,'connect',function(callback){clients.push(this);queueMicrotask(()=>callback(null));});
 t.mock.method(Client.prototype,'query',async function(sql,args){if(sql.startsWith('BEGIN'))this.syntheticTransaction=await f.protocol.pool.connect();return this.syntheticTransaction.query(sql,args);});
 t.mock.method(Client.prototype,'end',function(callback){this._ending=true;queueMicrotask(()=>{this.emit('end');callback?.();});});
 const gateway=createDeclarationDeploymentGateway({readEnvironment:()=>env});t.after(async()=>{await gateway.close();assert.equal(sockets,0);});return {f,env,gateway,clients,pools};
}
test('actual declarations default export constructs dedicated publisher and exact same DB declaration',async t=>{
 const h=harness(t),original=process.env;process.env={...h.env};
 try{assert.equal(h.clients.length,0);const response=await entry.fetch(http(h.f));assert.equal(response.status,200);assert.equal((await response.json()).decision,'published');assert.equal(h.clients.length,1);assert.equal(h.pools.size,1);assert.equal(h.f.rows().size,1);assert.equal(h.f.protocol.calls.filter(x=>x.sql==='COMMIT').length,1);assert.equal(h.clients[0].connectionParameters.user,'paia_publisher.synthetic');}
 finally{await closeDeclarationGateway();process.env=original;}
});
test('publisher default-off reads no secret and never inherits reservation credential/configuration',async t=>{
 const h=harness(t);let reads=0;const env={PAIA_RESERVATIONS_ENABLED:'true',PAIA_RESERVATIONS_CONFIG:h.env.PAIA_DECLARATIONS_CONFIG,PAIA_RESERVATIONS_DB_PASSWORD:h.env.PAIA_DECLARATIONS_DB_PASSWORD,get PAIA_DECLARATIONS_CONFIG(){reads++;throw Error();},get PAIA_DECLARATIONS_DB_PASSWORD(){reads++;throw Error();}};
 assert.deepEqual(snapshotDeclarationEnvironment(env),{enabled:false});const gateway=createDeclarationDeploymentGateway({readEnvironment:()=>env});assert.equal((await gateway.fetch(http(h.f))).status,503);await gateway.close();assert.equal(reads,0);assert.equal(h.clients.length,0);
});
test('publisher uses shared strict config and rejects role/target/client overrides before any connection',async t=>{
 const h=harness(t);
 for(const mutate of [c=>{c.postgres.user='postgres';},c=>{c.postgres.host='localhost';},c=>{c.postgres.ssl={rejectUnauthorized:false};},c=>{c.publisher=true;},c=>{c.identityConfig.entitlement.keys=[];}]){
  const config=JSON.parse(h.env.PAIA_DECLARATIONS_CONFIG);mutate(config);const env={...h.env,PAIA_DECLARATIONS_CONFIG:JSON.stringify(config)},gateway=createDeclarationDeploymentGateway({readEnvironment:()=>env});assert.equal((await gateway.fetch(http(h.f))).status,503);await gateway.close();
 }
 assert.equal(h.clients.length,0);assert.equal(h.f.protocol.calls.length,0);
});
test('disable and close invalidate warm publisher without reviving or replaying authority',async t=>{
 const h=harness(t);assert.equal((await h.gateway.fetch(http(h.f))).status,200);const count=h.f.protocol.calls.length;h.env.PAIA_DECLARATIONS_ENABLED='false';assert.equal((await h.gateway.fetch(http(h.f))).status,503);assert.equal(h.f.protocol.calls.length,count);await h.gateway.close();h.env.PAIA_DECLARATIONS_ENABLED='true';assert.equal((await h.gateway.fetch(http(h.f))).status,503);assert.equal(h.clients.length,1);
});
