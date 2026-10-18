import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
import {fixture} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {declaration} from './client-declaration-fixtures.mjs';
import {clientDeclarationHash} from '../client-declaration.mjs';
import {createPostgresDeclarationPublisher} from '../postgres-declaration-publisher.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';

// SOURCE-ONLY until explicitly invoked on the existing approved disposable PG
// evidence route. The guard accepts only a NEW loopback paia_ledger_test_* DB,
// explicit opt-in and password-free postgres trust authentication. No ambient
// DATABASE_URL/PGPASSWORD/.pgpass fallback, database creation or server startup.
// The fixture creates ephemeral NOLOGIN roles, never login credentials. Only
// this test's new schema/roles are removed; pre-existing schemas are refused.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const suffix=`${process.pid}_${Date.now()}`;
const publisherRole=`paia_decl_publisher_test_${suffix}`,reservationRole=`paia_decl_reservation_test_${suffix}`;
const admin=new Pool({...connection,max:4}),pools=[];
const tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
let createdSchema=false,createdPublisher=false,createdReservation=false,f;
const query=(sql,args)=>admin.query(sql,args);
const snapshot=async()=> (await query('SELECT snapshot FROM paia_ai_private.budget_snapshot')).rows[0].snapshot;
const row=async id=> (await query('SELECT request_hash,request,generation,authorized,issued_at_ms::text,expires_at_ms::text FROM paia_ai_private.request_authority WHERE operation_id=$1',[id])).rows[0];
const signal=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function makePool(role=publisherRole,hook){
 const pool=new Pool({...connection,max:2,onConnect:async client=>{
  await client.query(`SET ROLE ${role}`);
  if(hook){const original=client.query.bind(client);client.query=(sql,args)=>hook(sql,args,()=>original(sql,args));}
 }});pool.on('error',()=>{});pools.push(pool);return pool;
}
const publisher=pool=>createPostgresDeclarationPublisher({pool,identityConfig:f.identityConfig,profileId:f.profileId});
const service=pool=>createPostgresReservationService({pool,identityConfig:f.identityConfig,profileId:f.profileId});
async function admit(r){
 const p=f.principal(r);
 await query('INSERT INTO paia_ai_private.principal_authority(principal_id,library_id,security,time_zone) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(principal_id,library_id) DO NOTHING',[r.principalId,r.libraryId,JSON.stringify(p.security),p.time_zone]);
 return f.bundle(r);
}
async function blocked(fragment){
 for(let i=0;i<100;i++){
  const rows=await query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);
  if(rows.rowCount)return;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.fail(`Expected real PostgreSQL lock wait: ${fragment}`);
}
const heldBeforeCompletion=(held,attempt)=>Promise.race([held.promise,attempt.then(result=>{throw Error(`Publisher ended before its lock gate: ${result.reason??result.decision}`);})]);
const denied=(result,reason)=>{assert.equal(result.decision,'deny');assert.equal(result.financialAuthority,false);assert.equal(result.dispatchAllowed,false);assert.equal(result.retryAllowed,false);if(reason)assert.equal(result.reason,reason);};

before(async()=>{
 assert.equal((await query('SELECT current_database() AS name')).rows[0].name,connection.database);
 assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount,0,'Refuse pre-existing private schema; use a NEW disposable test database');
 await query(await readFile(new URL('../schema/001-budget-ledger.sql',import.meta.url),'utf8'));createdSchema=true;
 await query(await readFile(new URL('../schema/002-service-authority.sql',import.meta.url),'utf8'));
 await query(`CREATE ROLE ${publisherRole} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE INHERIT`);createdPublisher=true;
 await query(`CREATE ROLE ${reservationRole} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE INHERIT`);createdReservation=true;
 for(const role of [publisherRole,reservationRole]){
  await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${role}`);
  await query(`GRANT SELECT ON paia_ai_private.budget_snapshot TO ${role}`);
  await query(`CREATE POLICY ${role}_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${role} USING(ledger_key='aiu:budget-reservations:v1')`);
  await query(`CREATE POLICY ${role}_lock ON paia_ai_private.budget_snapshot FOR UPDATE TO ${role} USING(ledger_key='aiu:budget-reservations:v1') WITH CHECK(ledger_key='aiu:budget-reservations:v1')`);
  for(const table of tables){
   await query(`GRANT SELECT ON paia_ai_private.${table} TO ${role}`);
   await query(`CREATE POLICY ${role}_read ON paia_ai_private.${table} FOR SELECT TO ${role} USING(true)`);
  }
 }
 // Exact dedicated publisher privileges. UPDATE(updated_at) is enough for the
 // original budget row lock; INSERT/UPDATE(snapshot) are intentionally absent.
 await query(`GRANT UPDATE(updated_at) ON paia_ai_private.budget_snapshot TO ${publisherRole}`);
 for(const table of ['service_control','principal_authority']){
  await query(`GRANT UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${publisherRole}`);
  await query(`CREATE POLICY publisher_lock ON paia_ai_private.${table} FOR UPDATE TO ${publisherRole} USING(true) WITH CHECK(lock_anchor=1)`);
 }
 await query(`GRANT INSERT(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms), UPDATE(authorized) ON paia_ai_private.request_authority TO ${publisherRole}`);
 await query(`CREATE POLICY publisher_insert ON paia_ai_private.request_authority FOR INSERT TO ${publisherRole} WITH CHECK(true)`);
 // Real RLS additionally prohibits raw false→true changes. SELECT FOR UPDATE
 // needs USING(true); actual UPDATE must leave the row terminally unauthorized.
 await query(`CREATE POLICY publisher_revoke ON paia_ai_private.request_authority FOR UPDATE TO ${publisherRole} USING(true) WITH CHECK(authorized=false)`);
 // Original reservation runtime remains a separate role with its original
 // financial snapshot writer and inert authority-lock privileges only.
 await query(`GRANT UPDATE(snapshot,updated_at) ON paia_ai_private.budget_snapshot TO ${reservationRole}`);
 for(const table of tables){
  await query(`GRANT UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${reservationRole}`);
  await query(`CREATE POLICY reservation_lock ON paia_ai_private.${table} FOR UPDATE TO ${reservationRole} USING(true) WITH CHECK(lock_anchor=1)`);
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
 try{
  if(createdSchema)await query('DROP SCHEMA paia_ai_private CASCADE');
  if(createdPublisher)await query(`DROP ROLE ${publisherRole}`);
  if(createdReservation)await query(`DROP ROLE ${reservationRole}`);
 }finally{await admin.end();}
});

test('two real publisher connections publish idempotently and only the original reservation role writes a hold',async()=>{
 const a=makePool(),b=makePool(),ca=await a.connect(),cb=await b.connect();
 try{assert.notEqual((await ca.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,(await cb.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);}finally{ca.release();cb.release();}
 const r=request('duplicate'),bundle=await admit(r),d=declaration(f,r);
 const results=await Promise.all([publisher(a).publish(bundle,d),publisher(b).publish(bundle,d)]);
 assert.equal(results[0].decision,'published');assert.deepEqual(results[1],results[0]);
 const original=await row(r.operationId);assert.equal(original.generation,clientDeclarationHash(d));assert.deepEqual(original.request,r);assert.equal(await snapshot(),null);
 const financial=service(makePool(reservationRole));assert.equal((await financial.reserve(bundle)).decision,'reserved');const held=await snapshot();
 const revoked=await publisher(b).revoke(bundle,d);assert.equal(revoked.decision,'revoked');assert.equal(revoked.issuedAt,results[0].issuedAt);assert.equal(revoked.expiresAt,results[0].expiresAt);
 denied(await financial.reserve(bundle));assert.deepEqual(await snapshot(),held,'revocation does not release an existing hold');
 assert.equal((await query('SELECT count(*)::integer AS count FROM paia_ai_private.request_authority')).rows[0].count,1);
});
test('real publish/revoke races lock the same budget row, including terminal revoke-before-publish',async()=>{
 for(const firstAction of ['publish','revoke']){
  const r=request(`race-${firstAction}`),bundle=await admit(r),d=declaration(f,r),held=signal(),release=signal();let clocks=0;
  const firstPool=makePool(publisherRole,async(sql,args,run)=>{if(sql.startsWith('SELECT floor')&&++clocks===2){held.resolve();await release.promise;}return run();});
  const first=publisher(firstPool)[firstAction](bundle,d);let second,initial,next;
  try{
   await heldBeforeCompletion(held,first);
   second=publisher(makePool())[firstAction==='publish'?'revoke':'publish'](bundle,d);
   await blocked('budget_snapshot');
  }finally{release.resolve();[initial,next]=await Promise.all([first,second??Promise.resolve(undefined)]);}
  assert.equal(initial.decision,firstAction==='publish'?'published':'revoked');
  if(firstAction==='publish')assert.equal(next.decision,'revoked');else denied(next,'DECLARATION_REVOKED');
  assert.equal((await row(r.operationId)).authorized,false);denied(await publisher(makePool()).publish(bundle,d),'DECLARATION_REVOKED');
 }
 assert.equal(await snapshot(),null);
});
test('changed declaration and another authenticated principal cannot rebind an existing operation',async()=>{
 const r=request('immutable'),bundle=await admit(r),d=declaration(f,r),owner=publisher(makePool());
 assert.equal((await owner.publish(bundle,d)).decision,'published');const original=await row(r.operationId);
 for(const changed of [{...d,payloadDigest:'a'.repeat(64)},{...d,scopeDigest:'b'.repeat(64)},{...d,contentGeneration:'SYNTHETIC-replacement'},{...d,expiresAt:d.expiresAt-1}]){
  denied(await publisher(makePool()).publish(bundle,changed),'OPERATION_REBOUND');denied(await publisher(makePool()).revoke(bundle,changed),'OPERATION_REBOUND');
 }
 const other={...r,principalId:'SYNTHETIC-other-user'},otherBundle=await admit(other),otherDeclaration=declaration(f,other);
 denied(await publisher(makePool()).publish(otherBundle,otherDeclaration),'OPERATION_REBOUND');denied(await publisher(makePool()).revoke(otherBundle,otherDeclaration),'OPERATION_REBOUND');
 denied(await owner.publish({...bundle,request:other},otherDeclaration),'AUTHORIZATION');assert.deepEqual(await row(r.operationId),original);assert.equal(await snapshot(),null);
});
test('expired declaration revoke creates an irreversible zero-validity tombstone without prior publication',async()=>{
 const r=request('expired-first-revoke'),bundle=await admit(r),d=declaration(f,r,{expiresAt:f.now-1});
 const first=await publisher(makePool()).revoke(bundle,d);assert.equal(first.decision,'revoked');assert.equal(first.issuedAt,first.expiresAt);
 assert.deepEqual(await publisher(makePool()).revoke(bundle,d),first);denied(await publisher(makePool()).publish(bundle,d),'DECLARATION_REVOKED');
 assert.equal((await row(r.operationId)).authorized,false);assert.equal(await snapshot(),null);
});
test('lost real COMMIT acknowledgement never ACKs or replays publication or revocation',async()=>{
 for(const action of ['publish','revoke']){
  const r=request(`lost-${action}`),bundle=await admit(r),d=declaration(f,r);let commits=0,inserts=0,updates=0;
  if(action==='revoke')assert.equal((await publisher(makePool()).publish(bundle,d)).decision,'published');
  const pool=makePool(publisherRole,async(sql,args,run)=>{
   if(sql.includes('INSERT INTO paia_ai_private.request_authority'))inserts++;
   if(sql.includes('UPDATE paia_ai_private.request_authority'))updates++;
   const result=await run();if(sql==='COMMIT'){commits++;throw Error('SYNTHETIC lost COMMIT acknowledgement');}return result;
  });
  const result=await publisher(pool)[action](bundle,d);assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'COMMIT_OUTCOME_UNKNOWN');assert.equal(result.retryAllowed,false);assert.equal(result.dispatchAllowed,false);assert.equal(Object.hasOwn(result,'generation'),false);
  assert.equal(commits,1);assert.equal(inserts,action==='publish'?1:0);assert.equal(updates,action==='revoke'?1:0);
  const persisted=await row(r.operationId);assert.equal(persisted.authorized,action==='publish');
  if(action==='publish'){assert.equal((await publisher(makePool()).publish(bundle,d)).decision,'published');assert.deepEqual(await row(r.operationId),persisted);}
  else denied(await publisher(makePool()).publish(bundle,d),'DECLARATION_REVOKED');
 }
 assert.equal(await snapshot(),null);
});
test('minimal publisher privileges cannot mutate financial/route/identity facts or restore a revoked row',async()=>{
 const r=request('least-privilege'),bundle=await admit(r),d=declaration(f,r),pool=makePool();
 assert.equal((await publisher(pool).publish(bundle,d)).decision,'published','SELECT plus UPDATE(updated_at) must suffice for the actual PostgreSQL budget row lock');
 for(const sql of [
  "UPDATE paia_ai_private.budget_snapshot SET snapshot='{}'",
  'UPDATE paia_ai_private.budget_snapshot SET schema_version=2',
  "UPDATE paia_ai_private.route_authority SET facts='{}'",
  "UPDATE paia_ai_private.principal_authority SET security='{}'",
  'UPDATE paia_ai_private.service_control SET enabled=false',
  "UPDATE paia_ai_private.request_authority SET generation='forged'",
  'UPDATE paia_ai_private.request_authority SET expires_at_ms=expires_at_ms+1',
  'DELETE FROM paia_ai_private.request_authority',
  "INSERT INTO paia_ai_private.operation_evidence(event_id) VALUES('forged')",
 ])await assert.rejects(pool.query(sql),error=>error.code==='42501');
 assert.equal((await publisher(pool).revoke(bundle,d)).decision,'revoked');
 await assert.rejects(pool.query('UPDATE paia_ai_private.request_authority SET authorized=true'),error=>error.code==='42501');
 assert.equal((await row(r.operationId)).authorized,false);assert.equal(await snapshot(),null);
});
test('publisher and reservation roles cannot substitute, acquire membership or inherit unnoticed writer privileges',async()=>{
 const r=request('separate-roles'),bundle=await admit(r),d=declaration(f,r),pub=makePool(),financial=makePool(reservationRole);
 assert.equal((await publisher(pub).publish(bundle,d)).decision,'published');
 assert.equal((await query('SELECT pg_has_role($1,$2,\'MEMBER\') AS member',[publisherRole,reservationRole])).rows[0].member,false);
 // SET ROLE authorization is based on session_user, not current_user. This
 // extra test connection changes session authorization to the NOLOGIN test
 // publisher so a postgres session's superuser identity cannot mask the denial.
 const isolated=await admin.connect();
 try{await isolated.query(`SET SESSION AUTHORIZATION ${publisherRole}`);await assert.rejects(isolated.query(`SET ROLE ${reservationRole}`),error=>error.code==='42501');}
 finally{try{await isolated.query('RESET SESSION AUTHORIZATION');}finally{isolated.release(true);}}
 denied(await publisher(financial).publish(bundle,d),'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');
 // The publisher lacks route FOR SHARE update permission as well as the
 // reservation authority role's required mutation-free request access.
 denied(await service(pub).reserve(bundle));assert.equal(await snapshot(),null);
 // Deliberate, temporary test-only privilege expansion verifies effective
 // inherited grants are detected. No membership survives test cleanup.
 await query(`GRANT ${reservationRole} TO ${publisherRole}`);
 try{denied(await publisher(pub).publish(bundle,d),'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal(await snapshot(),null);}
 finally{await query(`REVOKE ${reservationRole} FROM ${publisherRole}`);}
 assert.equal((await query('SELECT pg_has_role($1,$2,\'MEMBER\') AS member',[publisherRole,reservationRole])).rows[0].member,false);
});
test('actual SQL clock rejects a publication delayed beyond the final verified interval',async()=>{
 const r=request('expired-sql-interval'),bundle=await admit(r),d=declaration(f,r);let clocks=0;
 const pool=makePool(publisherRole,async(sql,args,run)=>{const result=await run();if(sql.startsWith('SELECT floor')&&++clocks===2)await query('SELECT pg_sleep(1.2)');return result;});
 denied(await publisher(pool).publish(bundle,d),'AUTHORITY_EXPIRED');assert.equal(await row(r.operationId),undefined);assert.equal(await snapshot(),null);
});
