import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
import {fixture} from './service-fixtures.mjs';
import {request,evidence} from './postgres-fixtures.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
import {createOperationStatusHandler} from '../operation-status-entry.mjs';
import {providerDispatchId,providerSettlementId} from '../provider-settlement.mjs';
import {requestBindingHash} from '../signed-identity.mjs';

// NOT_RUN until the dedicated disposable-loopback runner is executed. These
// tests use real PostgreSQL locks/RLS/transactions and ephemeral signed fixtures;
// financial publisher events are synthetic and NO provider/network call exists.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const role='paia_status_test_'+process.pid,admin=new Pool({...connection,max:6}),pools=[],tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
let createdSchema=false,createdRole=false,f,bundle,usage;
const query=(sql,args)=>admin.query(sql,args);
const saved=async()=>(await query('SELECT snapshot FROM paia_ai_private.budget_snapshot')).rows[0].snapshot;
function pool(hook){
 const p=new Pool({...connection,max:2,onConnect:async client=>{await client.query(`SET ROLE ${role}`);if(hook){const original=client.query.bind(client);client.query=(sql,args)=>hook(sql,args,()=>original(sql,args),original);}}});
 p.on('error',()=>{});pools.push(p);return p;
}
const service=(p=pool())=>createPostgresOperationStatusService({pool:p,identityConfig:f.identityConfig,profileId:f.profileId});
const inspect=p=>service(p).query(bundle);
const http=()=>new Request('https://service.invalid/api/operation-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'query',...bundle})});
const signal=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function blocked(fragment){for(let i=0;i<100;i++){const r=await query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);if(r.rowCount)return;await new Promise(r=>setTimeout(r,20));}assert.fail('Expected real PostgreSQL lock wait');}
async function event(id,kind,value=null){const r=bundle.request;await query('INSERT INTO paia_ai_private.operation_evidence(event_id,operation_id,request_hash,event,evidence,expires_at_ms) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[id,r.operationId,requestBindingHash(r),kind,value===null?null:JSON.stringify(value),f.now+60000]);}
async function prepare(state='PENDING'){
 const r=request('SYNTHETIC-status',{jobId:'SYNTHETIC-status-job',inputTokens:100,outputCap:600,maxCompletionTokens:590}),p=f.principal(r),g=f.grant(r);bundle=f.bundle(r);
 await query('INSERT INTO paia_ai_private.principal_authority(principal_id,library_id,security,time_zone) VALUES($1,$2,$3::jsonb,$4)',[r.principalId,r.libraryId,JSON.stringify(p.security),p.time_zone]);
 await query('INSERT INTO paia_ai_private.request_authority(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)',[r.operationId,g.request_hash,JSON.stringify(r),g.generation,g.authorized,g.issued_at_ms,g.expires_at_ms]);
 if(state==='MISSING')return;
 const owner=createPostgresReservationService({pool:pool(),identityConfig:f.identityConfig,profileId:f.profileId});assert.equal((await owner.reserve(bundle)).decision,'reserved');
 if(state==='RESERVED')return;
 if(state==='CANCELLED'){assert.equal((await owner.cancel(bundle)).state,'CANCELLED_BEFORE_DISPATCH');return;}
 await event(providerDispatchId(r),'DISPATCHED');assert.equal((await owner.record(bundle,providerDispatchId(r))).state,'DISPATCHED');
 if(state==='DISPATCHED')return;
 if(state==='UNKNOWN'){await event('SYNTHETIC-unknown','OUTCOME_UNKNOWN');assert.equal((await owner.record(bundle,'SYNTHETIC-unknown')).state,'OUTCOME_UNKNOWN');return;}
 usage={...evidence(r,'VALIDATED'),receiptId:providerSettlementId(r),usage:{inputTokens:100,completionTokens:20,totalTokens:120,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},nativeMicros:120,usdMicros:120,committedChildren:[]};
 await event(usage.receiptId,'SETTLEMENT',usage);
}
before(async()=>{
 assert.equal((await query('SELECT current_database() AS name')).rows[0].name,connection.database);
 assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount,0,'Refuse existing private schema');
 await query(await readFile(new URL('../schema/001-budget-ledger.sql',import.meta.url),'utf8'));createdSchema=true;
 await query(await readFile(new URL('../schema/002-service-authority.sql',import.meta.url),'utf8'));
 await query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);createdRole=true;
 await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${role}`);
 await query(`GRANT SELECT,UPDATE(snapshot,updated_at) ON paia_ai_private.budget_snapshot TO ${role}`);
 await query(`CREATE POLICY status_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${role} USING(ledger_key='aiu:budget-reservations:v1')`);
 await query(`CREATE POLICY status_write ON paia_ai_private.budget_snapshot FOR UPDATE TO ${role} USING(ledger_key='aiu:budget-reservations:v1') WITH CHECK(ledger_key='aiu:budget-reservations:v1')`);
 for(const table of tables){await query(`GRANT SELECT,UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${role}`);await query(`CREATE POLICY status_read ON paia_ai_private.${table} FOR SELECT TO ${role} USING(true)`);await query(`CREATE POLICY status_lock ON paia_ai_private.${table} FOR UPDATE TO ${role} USING(true) WITH CHECK(lock_anchor=1)`);}
});
beforeEach(async()=>{
 await query('UPDATE paia_ai_private.budget_snapshot SET snapshot=NULL');await query('TRUNCATE '+tables.map(t=>'paia_ai_private.'+t).join(','));
 f=fixture(Date.now());const c=f.control,route=f.routeRow;
 await query('INSERT INTO paia_ai_private.service_control(singleton,profile_id,identity_config_hash,generation,enabled,day_limit_micros,month_limit_micros,expires_at_ms) VALUES(true,$1,$2,$3,$4,$5,$6,$7)',[c.profile_id,c.identity_config_hash,c.generation,c.enabled,c.day_limit_micros,c.month_limit_micros,c.expires_at_ms]);
 await query('INSERT INTO paia_ai_private.route_authority(route_version,generation,facts,expires_at_ms) VALUES($1,$2,$3::jsonb,$4)',['SYNTHETIC-route',route.generation,JSON.stringify(route.facts),route.expires_at_ms]);
});
after(async()=>{await Promise.all(pools.map(p=>p.end()));try{if(createdSchema)await query('DROP SCHEMA paia_ai_private CASCADE');if(createdRole)await query(`DROP ROLE ${role}`);}finally{await admin.end();}});

test('real authenticated HTTP and competing recovery queries settle one original immutable event',async()=>{
 await prepare();const before=await saved();const response=await createOperationStatusHandler({service:service()})(http());assert.equal(response.status,200);const first=await response.json();assert.equal(first.settledSpendMicros,120);assert.equal(first.effectiveResults,0);assert.equal(first.resultResolution,null);assert.equal(first.financialSettlement.outcome,'VALIDATED');
 const results=await Promise.all(Array.from({length:4},()=>inspect()));assert.ok(results.every(r=>r.settledSpendMicros===120));assert.equal((await saved()).rows.length,1);assert.deepEqual((await saved()).rows[0].window,before.rows[0].window);assert.equal((await query('SELECT count(*)::int AS n FROM paia_ai_private.operation_evidence')).rows[0].n,2);
});

for(const state of ['MISSING','RESERVED','DISPATCHED','UNKNOWN','CANCELLED'])test(`real ${state} query preserves original hold and never creates a new row`,async()=>{
 await prepare(state);const before=await saved(),answer=await inspect();assert.equal(answer.decision,'queried');assert.equal(answer.state,state==='MISSING'?'NOT_FOUND':state==='UNKNOWN'?'OUTCOME_UNKNOWN':state==='CANCELLED'?'CANCELLED_BEFORE_DISPATCH':state);
 assert.deepEqual(await saved(),before);assert.equal(answer.retryAllowed,false);if(['RESERVED','DISPATCHED','UNKNOWN'].includes(state))assert.equal(answer.heldSpendMicros,700);
});

test('real content route spending revocation cannot erase immutable historical spend',async()=>{
 await prepare();await query('UPDATE paia_ai_private.request_authority SET authorized=false, expires_at_ms=0');await query('UPDATE paia_ai_private.route_authority SET expires_at_ms=0');await query('UPDATE paia_ai_private.service_control SET enabled=false, expires_at_ms=0');assert.equal((await inspect()).settledSpendMicros,120);
});

test('real current identity revocation before query prevents disclosure or recovery',async()=>{
 await prepare();const before=await saved();await query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{principalActive}','false')");assert.equal((await inspect()).reason,'AUTHORIZATION');assert.deepEqual(await saved(),before);
});

test('real principal update waits behind query locks then denies the next query',async()=>{
 await prepare('RESERVED');const entered=signal(),release=signal();let held=false;
 const pending=inspect(pool(async(sql,_args,run)=>{if(!held&&sql.startsWith('SELECT event_id')){held=true;entered.resolve();await release.promise;}return run();}));await entered.promise;
 const revoke=query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{principalActive}','false')");
 try{await blocked('UPDATE paia_ai_private.principal_authority');}finally{release.resolve();}
 assert.equal((await pending).decision,'queried');await revoke;assert.equal((await inspect()).reason,'AUTHORIZATION');
});

for(const persisted of [false,true])test(`real lost recovery COMMIT ACK ${persisted?'after':'before'} durable commit is safely queried again`,async()=>{
 await prepare();let once=true;const p=pool(async(sql,_args,run)=>{if(once&&sql==='COMMIT'){once=false;if(persisted)await run();throw Error('SYNTHETIC ACK loss');}return run();});
 const answer=await inspect(p);assert.equal(answer.decision,'outcome_unknown');assert.equal(answer.settledSpendMicros,undefined);assert.equal((await saved()).rows[0].state,persisted?'SETTLED':'DISPATCHED');assert.equal((await inspect()).settledSpendMicros,120);assert.equal((await saved()).rows.length,1);
});

test('real consumed usage cannot settle a RESERVED original row',async()=>{
 await prepare();const state=await saved(),row=state.rows[0];row.state='RESERVED';for(const key of ['dispatchedAt','dispatchedDayId','dispatchedTimeZone'])delete row[key];await query('UPDATE paia_ai_private.budget_snapshot SET snapshot=$1::jsonb',[JSON.stringify(state)]);
 const before=await saved(),answer=await inspect();assert.equal(answer.state,'RESERVED');assert.equal(answer.providerEvidenceRecorded,true);assert.equal(answer.heldSpendMicros,700);assert.deepEqual(await saved(),before);
});

test('real role mutation expansion rejects status rather than trusting caller-owned evidence',async()=>{
 await prepare();const before=await saved();await query(`GRANT UPDATE(evidence) ON paia_ai_private.operation_evidence TO ${role}`);
 try{assert.equal((await inspect()).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.deepEqual(await saved(),before);}finally{await query(`REVOKE UPDATE(evidence) ON paia_ai_private.operation_evidence FROM ${role}`);}
});

test('real final database clock rechecks identity after a held read',async()=>{
 await prepare('RESERVED');const before=await saved(),now=(await query("SELECT floor(extract(epoch FROM clock_timestamp()))::bigint::text AS now")).rows[0].now;
 await query("UPDATE paia_ai_private.principal_authority SET security=jsonb_set(security,'{expiresAt}',to_jsonb($1::bigint))",[Number(now)+2]);let clocks=0;
 const answer=await inspect(pool(async(sql,_args,run,original)=>{if(sql.startsWith('SELECT floor')&&++clocks===2)await original('SELECT pg_sleep(2.1)');return run();}));assert.equal(answer.reason,'AUTHORIZATION');assert.deepEqual(await saved(),before);
});

test('real exact operation request rebound is denied despite valid new identity signatures',async()=>{
 await prepare();const before=await saved(),changed={...bundle.request,scopeFingerprint:'SYNTHETIC-rebound'};assert.equal((await service().query(f.bundle(changed))).reason,'OPERATION_REBOUND');assert.deepEqual(await saved(),before);
});

test('real immutable event insertion waits for the same query singleton before later recovery',async()=>{
 await prepare('DISPATCHED');const entered=signal(),release=signal();let held=false;
 const pending=inspect(pool(async(sql,_args,run)=>{if(!held&&sql.startsWith('SELECT event_id')){held=true;entered.resolve();await release.promise;}return run();}));await entered.promise;
 const r=bundle.request,e={...evidence(r,'VALIDATED'),receiptId:providerSettlementId(r),usage:{inputTokens:100,completionTokens:20,totalTokens:120,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},nativeMicros:120,usdMicros:120,committedChildren:[]};
 const insert=event(e.receiptId,'SETTLEMENT',e);try{await blocked('INSERT INTO paia_ai_private.operation_evidence');}finally{release.resolve();}
 assert.equal((await pending).financialOutcome,'UNKNOWN');await insert;assert.equal((await inspect()).settledSpendMicros,120);
});

for(const boundary of ['accounting','accounting_to_read','publication'])test(`real transaction rolls back when its database-clock result regresses at ${boundary}`,async()=>{
 await prepare();const before=await saved();
 const base=Number((await query("SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS now_ms")).rows[0].now_ms);let reads=0;
 // Explicit clock-result fault injection through SQL, not a claim that the
 // physical CI clock moved backwards. Locks/RLS/rollback remain actual PG.
 const answer=await inspect(pool(async(sql,_args,run,original)=>{
  if(sql.startsWith('SELECT floor')){reads++;const high=boundary==='accounting'?1:boundary==='accounting_to_read'?2:3;
   const at=base+(reads<high?0:reads===high?1000:reads===high+1?500:1500);
   return original('SELECT $1::bigint::text AS now_ms',[at]);
  }return run();
 }));assert.equal(answer.reason,'CLOCK_ROLLBACK');assert.equal(answer.state,undefined);assert.deepEqual(await saved(),before);
});
