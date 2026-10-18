import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
import {fixture} from './service-fixtures.mjs';
import {request,evidence} from './postgres-fixtures.mjs';
import {requestBindingHash} from '../signed-identity.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';

// Actual PostgreSQL tests, NOT run by the protocol suite. No production URL,
// credentials, pre-existing schema or ambient connection fallback is accepted.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const role=`paia_service_test_${process.pid}_${Date.now()}`;
const admin=new Pool({...connection,max:4}),pools=[];
const tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
let createdSchema=false,createdRole=false,f;
const query=(sql,args)=>admin.query(sql,args);
const read=async()=> (await query('SELECT snapshot FROM paia_ai_private.budget_snapshot')).rows[0].snapshot;
const signal=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function makePool(hook){
 const pool=new Pool({...connection,max:2,onConnect:async client=>{
  await client.query(`SET ROLE ${role}`);
  if(hook){const original=client.query.bind(client);client.query=(sql,args)=>hook(sql,args,()=>original(sql,args));}
 }});pool.on('error',()=>{});pools.push(pool);return pool;
}
const service=pool=>createPostgresReservationService({pool,identityConfig:f.identityConfig,profileId:f.profileId});
async function admit(r){
 const p=f.principal(r),g=f.grant(r);
 await query('INSERT INTO paia_ai_private.principal_authority(principal_id,library_id,security,time_zone) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(principal_id,library_id) DO NOTHING',[r.principalId,r.libraryId,JSON.stringify(p.security),p.time_zone]);
 await query('INSERT INTO paia_ai_private.request_authority(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)',[r.operationId,g.request_hash,JSON.stringify(r),g.generation,g.authorized,g.issued_at_ms,g.expires_at_ms]);
 return f.bundle(r);
}
async function event(r,id,kind,payload=null){
 await query('INSERT INTO paia_ai_private.operation_evidence(event_id,operation_id,request_hash,event,evidence,expires_at_ms) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[id,r.operationId,requestBindingHash(r),kind,payload===null?null:JSON.stringify(payload),f.now+60000]);
}
async function blocked(fragment){
 for(let i=0;i<100;i++){
  const rows=await query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);
  if(rows.rowCount)return;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.fail(`Expected real PostgreSQL lock wait: ${fragment}`);
}
before(async()=>{
 const identity=(await query('SELECT current_database() AS name')).rows[0];assert.equal(identity.name,connection.database);
 assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount,0,'Refuse existing schema');
 await query(await readFile(new URL('../schema/001-budget-ledger.sql',import.meta.url),'utf8'));createdSchema=true;
 await query(await readFile(new URL('../schema/002-service-authority.sql',import.meta.url),'utf8'));
 await query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS`);createdRole=true;
 await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${role}`);
 await query(`GRANT SELECT, UPDATE(snapshot,updated_at) ON paia_ai_private.budget_snapshot TO ${role}`);
 await query(`CREATE POLICY service_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${role} USING(true)`);
 await query(`CREATE POLICY service_write ON paia_ai_private.budget_snapshot FOR UPDATE TO ${role} USING(true) WITH CHECK(true)`);
 for(const table of tables){
  await query(`GRANT SELECT, UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${role}`);
  await query(`CREATE POLICY service_read ON paia_ai_private.${table} FOR SELECT TO ${role} USING(true)`);
  await query(`CREATE POLICY service_lock ON paia_ai_private.${table} FOR UPDATE TO ${role} USING(true) WITH CHECK(lock_anchor=1)`);
 }
});
beforeEach(async()=>{
 await query('UPDATE paia_ai_private.budget_snapshot SET snapshot=NULL');
 await query('TRUNCATE '+tables.map(table=>'paia_ai_private.'+table).join(','));
 f=fixture(Date.now());const c=f.control,route=f.routeRow;
 await query('INSERT INTO paia_ai_private.service_control(singleton,profile_id,identity_config_hash,generation,enabled,day_limit_micros,month_limit_micros,expires_at_ms) VALUES(true,$1,$2,$3,$4,$5,$6,$7)',[c.profile_id,c.identity_config_hash,c.generation,c.enabled,c.day_limit_micros,c.month_limit_micros,c.expires_at_ms]);
 await query('INSERT INTO paia_ai_private.route_authority(route_version,generation,facts,expires_at_ms) VALUES($1,$2,$3::jsonb,$4)',[request('route').routeVersion,route.generation,JSON.stringify(route.facts),route.expires_at_ms]);
});
after(async()=>{
 await Promise.all(pools.map(pool=>pool.end()));
 try{if(createdSchema)await query('DROP SCHEMA paia_ai_private CASCADE');if(createdRole)await query(`DROP ROLE ${role}`);}finally{await admin.end();}
});

test('real signed service admission shares one global allowance across independent connections',async()=>{
 const a=makePool(),b=makePool(),ca=await a.connect(),cb=await b.connect();
 try{assert.notEqual((await ca.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,(await cb.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);}finally{ca.release();cb.release();}
 const bundles=[];for(let i=0;i<8;i++)bundles.push(await admit(request(`race-${i}`,{principalId:`SYNTHETIC-principal-${i}`})));
 const owners=[service(a),service(b)];const results=await Promise.all(bundles.map((bundle,i)=>owners[i%2].reserve(bundle)));
 assert.equal(results.filter(result=>result.decision==='reserved').length,2);
 assert.ok(results.filter(result=>result.decision==='deny').every(result=>result.reason==='BUDGET_OR_QUOTA'));
 const state=await read();assert.equal(state.rows.length,2);assert.equal(state.rows.reduce((n,r)=>n+r.reservationMicros,0),14000);
 assert.ok(state.lastNow>=f.now);assert.ok(results.every(r=>r.dispatchAllowed===false&&r.financialAuthority===false));
});
test('revocation committed while request waits for authority lock is observed and denies publication',async()=>{
 const b=await admit(request('revoke-before')),revoker=await admin.connect();let attempt;
 try{
  await revoker.query('BEGIN');await revoker.query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{principalActive}','false')");
  attempt=service(makePool()).reserve(b);await blocked('principal_authority');await revoker.query('COMMIT');
  assert.equal((await attempt).decision,'deny');assert.equal(await read(),null);
 }finally{await revoker.query('ROLLBACK');revoker.release();if(attempt)await attempt;}
});
test('authority row locks remain held through final UPDATE and COMMIT across revocation connection',async()=>{
 const b=await admit(request('revoke-after')),held=signal(),release=signal();let clocks=0;
 const pool=makePool(async(sql,args,run)=>{if(sql.startsWith('SELECT floor')&&++clocks===2){held.resolve();await release.promise;}return run();});
 const attempt=service(pool).reserve(b);await held.promise;
 const revoke=query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{entitlementActive}','false')");
 try{await blocked('UPDATE paia_ai_private.principal_authority');}finally{release.resolve();}
 assert.equal((await attempt).decision,'reserved');await revoke;
 assert.equal((await service(makePool()).reserve(b)).decision,'deny');assert.equal((await read()).rows.length,1);
});
test('DB-time predicate aborts when a final observed timestamp is delayed beyond publication deadline',async()=>{
 const b=await admit(request('late-update'));let clocks=0;
 const pool=makePool(async(sql,args,run)=>{const result=await run();if(sql.startsWith('SELECT floor')&&++clocks===2)await query('SELECT pg_sleep(1.2)');return result;});
 const result=await service(pool).reserve(b);assert.equal(result.reason,'POSTGRES_AUTHORITY_EXPIRED');assert.equal(await read(),null);
});
test('successful COMMIT with lost acknowledgement is unknown without replay, and restart reads same hold',async()=>{
 const b=await admit(request('lost-ack'));let commits=0;
 const pool=makePool(async(sql,args,run)=>{const result=await run();if(sql==='COMMIT'){commits++;throw Error('SYNTHETIC lost acknowledgement');}return result;});
 const result=await service(pool).reserve(b);assert.equal(result.decision,'outcome_unknown');assert.equal(result.retryAllowed,false);assert.equal(commits,1);assert.equal((await read()).rows.length,1);
 assert.equal((await service(makePool()).reserve(b)).state,'RESERVED');assert.equal((await read()).rows.length,1);
});
test('real provider evidence is bound, append-only and blocks cancellation before record catches up',async()=>{
 const r=request('events'),b=await admit(r),s=service(makePool());await s.reserve(b);
 await event(r,'dispatch','DISPATCHED');assert.equal((await s.cancel(b)).reason,'OUTCOME_OR_ATTEMPT_PENDING');
 assert.equal((await s.record(b,'dispatch')).state,'DISPATCHED');assert.equal((await s.cancel(b)).decision,'deny');
 await event(r,'unknown','OUTCOME_UNKNOWN');assert.equal((await s.record(b,'unknown')).state,'OUTCOME_UNKNOWN');
 const receipt={...evidence(r,'COMMITTED'),receiptId:'settlement',committedChildren:[{operationId:r.operationId,receiptId:'settlement'}]};
 await event(r,'settlement','SETTLEMENT',receipt);assert.equal((await s.settle(b,'settlement')).state,'SETTLED');assert.equal((await read()).rows[0].settlement.usdMicros,2000);
 await assert.rejects(query("UPDATE paia_ai_private.operation_evidence SET event='OUTCOME_UNKNOWN' WHERE event_id='dispatch'"),/AI_EVIDENCE_IMMUTABLE/);
 await assert.rejects(query("DELETE FROM paia_ai_private.operation_evidence WHERE event_id='dispatch'"),/AI_EVIDENCE_IMMUTABLE/);
 const other=await admit(request('other'));assert.equal((await s.record(other,'dispatch')).decision,'deny');
});
test('event insertion cannot race cancel absence check or cross the locked accounting publication',async()=>{
 const r=request('cancel-race'),b=await admit(r),held=signal(),release=signal();const s=service(makePool());await s.reserve(b);
 let clocks=0;const pool=makePool(async(sql,args,run)=>{if(sql.startsWith('SELECT floor')&&++clocks===2){held.resolve();await release.promise;}return run();});
 const cancel=service(pool).cancel(b);await held.promise;const publishing=event(r,'too-late','DISPATCHED');
 try{await blocked('INSERT INTO paia_ai_private.operation_evidence');}finally{release.resolve();}
 assert.equal((await cancel).state,'CANCELLED_BEFORE_DISPATCH');await publishing;
 assert.equal((await s.record(b,'too-late')).decision,'deny');assert.equal((await read()).rows[0].state,'CANCELLED_BEFORE_DISPATCH');
});
test('runtime cannot mint authority or provider evidence; unsafe permission changes close entry',async()=>{
 const b=await admit(request('privileges')),pool=makePool();
 for(const sql of ["UPDATE paia_ai_private.principal_authority SET security='{}'",'UPDATE paia_ai_private.service_control SET day_limit_micros=999999',"INSERT INTO paia_ai_private.operation_evidence(event_id) VALUES('forged')",'DELETE FROM paia_ai_private.request_authority'])await assert.rejects(pool.query(sql),error=>error.code==='42501');
 await query(`GRANT UPDATE(enabled) ON paia_ai_private.service_control TO ${role}`);
 try{assert.equal((await service(pool).reserve(b)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal(await read(),null);}finally{await query(`REVOKE UPDATE(enabled) ON paia_ai_private.service_control FROM ${role}`);}
});
