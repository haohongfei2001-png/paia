import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
import {fixture} from './service-fixtures.mjs';
import {request,evidence} from './postgres-fixtures.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
import {createPostgresResultService} from '../result-service.mjs';
import {createResultHandler} from '../result-entry.mjs';
import {requestBindingHash} from '../signed-identity.mjs';

// SOURCE-ONLY until explicitly run against a NEW disposable loopback DB.
// Real PostgreSQL proves transaction/role/signature mechanics; all issuers,
// metadata and financial events are synthetic, and no provider is contacted.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const role='paia_result_test_'+process.pid,admin=new Pool({...connection,max:4}),pools=[],tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
let createdSchema=false,createdRole=false,f,bundles,result;
const query=(sql,args)=>admin.query(sql,args);
const saved=async()=> (await query('SELECT snapshot FROM paia_ai_private.budget_snapshot')).rows[0].snapshot;
function pool(hook){
 const p=new Pool({...connection,max:2,onConnect:async client=>{await client.query(`SET ROLE ${role}`);if(hook){const original=client.query.bind(client);client.query=(sql,args)=>hook(sql,args,()=>original(sql,args));}}});
 p.on('error',()=>{});pools.push(p);return p;
}
const service=p=>createPostgresReservationService({pool:p,identityConfig:f.identityConfig,profileId:f.profileId});
const finalizer=(p=pool())=>createPostgresResultService({pool:p,identityConfig:f.identityConfig,profileId:f.profileId});
const finish=(p)=>finalizer(p).finalize(bundles[0],result);
const http=()=>new Request('https://service.invalid/api/results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'finalize',...bundles[0],result})});
const signal=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function blocked(fragment){for(let i=0;i<100;i++){const r=await query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);if(r.rowCount)return;await new Promise(r=>setTimeout(r,20));}assert.fail('Expected actual PostgreSQL lock wait');}
async function event(r,id,kind,usage=null){await query('INSERT INTO paia_ai_private.operation_evidence(event_id,operation_id,request_hash,event,evidence,expires_at_ms) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[id,r.operationId,requestBindingHash(r),kind,usage===null?null:JSON.stringify(usage),f.now+60000]);}
async function prepare({count=1,states=[]}={}){
 bundles=[];
 for(let i=0;i<count;i++){
  const r=request('SYNTHETIC-result-'+i,{jobId:'SYNTHETIC-result-job',childIndex:i,childCount:count,inputTokens:100,outputCap:600,maxCompletionTokens:590}),b=f.bundle(r),p=f.principal(r),g=f.grant(r);
  bundles.push(b);
  await query('INSERT INTO paia_ai_private.principal_authority(principal_id,library_id,security,time_zone) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT DO NOTHING',[r.principalId,r.libraryId,JSON.stringify(p.security),p.time_zone]);
  await query('INSERT INTO paia_ai_private.request_authority(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)',[r.operationId,g.request_hash,JSON.stringify(r),g.generation,g.authorized,g.issued_at_ms,g.expires_at_ms]);
  const owner=service(pool());assert.equal((await owner.reserve(b)).decision,'reserved');
  const state=states[i]??'VALIDATED';
  if(state==='CANCELLED'){assert.equal((await owner.cancel(b)).state,'CANCELLED_BEFORE_DISPATCH');continue;}
  await event(r,'SYNTHETIC-dispatch-'+i,'DISPATCHED');assert.equal((await owner.record(b,'SYNTHETIC-dispatch-'+i)).state,'DISPATCHED');
  if(state==='UNKNOWN'){await event(r,'SYNTHETIC-unknown-'+i,'OUTCOME_UNKNOWN');assert.equal((await owner.record(b,'SYNTHETIC-unknown-'+i)).state,'OUTCOME_UNKNOWN');continue;}
  const e={...evidence(r,state),receiptId:'SYNTHETIC-usage-'+i,usage:{inputTokens:100,completionTokens:20,totalTokens:120,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},nativeMicros:120,usdMicros:120,committedChildren:[]};
  await event(r,e.receiptId,'SETTLEMENT',e);assert.equal((await owner.settle(b,e.receiptId)).state,'SETTLED');
 }
 result={receiptId:'SYNTHETIC-local-domain-result',jobId:bundles[0].request.jobId,outcome:'COMMITTED',children:(await saved()).rows.map(row=>({operationId:row.request.operationId,receiptId:row.settlement?.receiptId??null}))};
}

before(async()=>{
 assert.equal((await query('SELECT current_database() AS name')).rows[0].name,connection.database);
 assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount,0,'Refuse existing private schema');
 await query(await readFile(new URL('../schema/001-budget-ledger.sql',import.meta.url),'utf8'));createdSchema=true;
 await query(await readFile(new URL('../schema/002-service-authority.sql',import.meta.url),'utf8'));
 await query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);createdRole=true;
 await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${role}`);
 await query(`GRANT SELECT,UPDATE(snapshot,updated_at) ON paia_ai_private.budget_snapshot TO ${role}`);
 await query(`CREATE POLICY result_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${role} USING(ledger_key='aiu:budget-reservations:v1')`);
 await query(`CREATE POLICY result_write ON paia_ai_private.budget_snapshot FOR UPDATE TO ${role} USING(ledger_key='aiu:budget-reservations:v1') WITH CHECK(ledger_key='aiu:budget-reservations:v1')`);
 for(const table of tables){
  await query(`GRANT SELECT,UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${role}`);
  await query(`CREATE POLICY result_read ON paia_ai_private.${table} FOR SELECT TO ${role} USING(true)`);
  await query(`CREATE POLICY result_lock ON paia_ai_private.${table} FOR UPDATE TO ${role} USING(true) WITH CHECK(lock_anchor=1)`);
 }
});
beforeEach(async()=>{
 await query('UPDATE paia_ai_private.budget_snapshot SET snapshot=NULL');await query('TRUNCATE '+tables.map(t=>'paia_ai_private.'+t).join(','));
 f=fixture(Date.now());const c=f.control,route=f.routeRow;
 await query('INSERT INTO paia_ai_private.service_control(singleton,profile_id,identity_config_hash,generation,enabled,day_limit_micros,month_limit_micros,expires_at_ms) VALUES(true,$1,$2,$3,$4,$5,$6,$7)',[c.profile_id,c.identity_config_hash,c.generation,c.enabled,c.day_limit_micros,c.month_limit_micros,c.expires_at_ms]);
 await query('INSERT INTO paia_ai_private.route_authority(route_version,generation,facts,expires_at_ms) VALUES($1,$2,$3::jsonb,$4)',['SYNTHETIC-route',route.generation,JSON.stringify(route.facts),route.expires_at_ms]);
});
after(async()=>{await Promise.all(pools.map(p=>p.end()));try{if(createdSchema)await query('DROP SCHEMA paia_ai_private CASCADE');if(createdRole)await query(`DROP ROLE ${role}`);}finally{await admin.end();}});

test('real authenticated result handler and concurrent replay retain one immutable original paid result',async()=>{
 await prepare({count:2});const before=await saved(),response=await createResultHandler({service:finalizer()})(http());
 assert.equal(response.status,200);assert.equal((await response.json()).effectiveResults,1);
 assert.ok((await Promise.all([finish(),finish(),finish()])).every(r=>r.effectiveResults===1));
 const after=await saved();assert.deepEqual(after.rows.map(r=>r.settlement),before.rows.map(r=>r.settlement));assert.deepEqual(after.rows[0].resultResolution,result);assert.equal(after.rows[1].resultResolution,undefined);
});

test('real conflicting terminal declarations linearize exactly once',async()=>{
 await prepare();const alternate={...result,outcome:'FAILED'};
 const answers=await Promise.all([finish(),finalizer().finalize(bundles[0],alternate)]);
 assert.equal(answers.filter(r=>r.decision==='finalized').length,1);assert.equal(answers.filter(r=>r.reason==='RESULT_CONFLICT').length,1);
 assert.equal((await saved()).rows[0].settlement.usdMicros,120);
});

test('real incomplete children and wrong immutable financial receipt cannot finalize',async()=>{
 await prepare({count:2});const before=await saved();result.children.pop();assert.equal((await finish()).reason,'RESULT_SCOPE_INCOMPLETE');assert.deepEqual(await saved(),before);
 result.children=[{operationId:bundles[0].request.operationId,receiptId:'SYNTHETIC-usage-1'},{operationId:bundles[1].request.operationId,receiptId:'SYNTHETIC-usage-0'}];
 assert.equal((await finish()).decision,'deny');assert.deepEqual(await saved(),before);
});

test('real pending unknown hold survives a failed domain declaration',async()=>{
 await prepare({states:['UNKNOWN']});result.outcome='FAILED';const before=await saved();assert.equal((await finish()).reason,'RESULT_SCOPE_INCOMPLETE');assert.deepEqual(await saved(),before);assert.equal(before.rows[0].reservationMicros,700);
});

test('real known failure and cancelled child finalize failure without refunding spent money',async()=>{
 await prepare({count:2,states:['FAILED','CANCELLED']});result.outcome='FAILED';assert.equal((await finish()).effectiveResults,0);
 const after=await saved();assert.equal(after.rows[0].settlement.usdMicros,120);assert.equal(after.rows[1].state,'CANCELLED_BEFORE_DISPATCH');
});

test('real current identity rejection cannot touch history while expired content still permits genuine completion',async()=>{
 await prepare();const before=await saved(),bad={...bundles[0],request:{...bundles[0].request,principalId:'SYNTHETIC-other'}};assert.equal((await finalizer().finalize(bad,result)).decision,'deny');assert.deepEqual(await saved(),before);
 await query('UPDATE paia_ai_private.request_authority SET authorized=false,expires_at_ms=issued_at_ms');await query('UPDATE paia_ai_private.route_authority SET expires_at_ms=0');
 assert.equal((await finish()).decision,'finalized');assert.deepEqual((await saved()).rows[0].settlement,before.rows[0].settlement);
});

test('real lost COMMIT ACK never claims success and exact retry sees one durable result',async()=>{
 await prepare();let once=true;const p=pool(async(sql,args,run)=>{const value=await run();if(once&&sql==='COMMIT'){once=false;throw Error('SYNTHETIC lost ACK');}return value;});
 assert.equal((await finish(p)).decision,'outcome_unknown');assert.equal((await saved()).rows[0].resultResolution.outcome,'COMMITTED');assert.equal((await finish()).effectiveResults,1);
});

test('real conflicting finalizer waits for original ledger lock and cannot reverse the winning result',async()=>{
 await prepare();const held=signal(),release=signal();let once=true;
 const first=pool(async(sql,args,run)=>{const value=await run();if(once&&sql.startsWith('SELECT schema_version')){once=false;held.resolve();await release.promise;}return value;});
 const pending=finish(first);await Promise.race([held.promise,pending.then(()=>{throw Error('Ended before lock gate');})]);
 const conflicting=finalizer().finalize(bundles[0],{...result,outcome:'FAILED'});
 try{await blocked('SELECT schema_version');}finally{release.resolve();}
 assert.equal((await pending).decision,'finalized');assert.equal((await conflicting).reason,'RESULT_CONFLICT');
});

test('real principal revocation waits for finalization SHARE lock and denies subsequent requests',async()=>{
 await prepare();const held=signal(),release=signal();let once=true;
 const p=pool(async(sql,args,run)=>{const value=await run();if(once&&sql.startsWith('SELECT security, time_zone')){once=false;held.resolve();await release.promise;}return value;});
 const pending=finish(p);await Promise.race([held.promise,pending.then(()=>{throw Error('Ended before principal lock');})]);
 const revoking=query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{principalActive}','false'::jsonb)");
 try{await blocked('UPDATE paia_ai_private.principal_authority');}finally{release.resolve();}
 assert.equal((await pending).decision,'finalized');await revoking;assert.equal((await finish()).reason,'AUTHORIZATION');
});

test('real result reader cannot mutate financial facts or use inherited publisher privileges',async()=>{
 await prepare();await assert.rejects(pool().query("INSERT INTO paia_ai_private.operation_evidence(event_id) VALUES('SYNTHETIC-forged')"),e=>e.code==='42501');
 await query(`GRANT INSERT(event_id,operation_id,request_hash,event,evidence,expires_at_ms) ON paia_ai_private.operation_evidence TO ${role}`);
 try{const before=await saved();assert.equal((await finish()).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.deepEqual(await saved(),before);}finally{await query(`REVOKE INSERT(event_id,operation_id,request_hash,event,evidence,expires_at_ms) ON paia_ai_private.operation_evidence FROM ${role}`);}
});
