import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {disposablePostgresConfig} from './postgres-test-config.mjs';
import {providerFixture,completion} from './provider-fixtures.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
import {createPostgresProviderRunner} from '../provider-runner.mjs';
import {createPostgresProviderEvidencePublisher} from '../postgres-provider-evidence.mjs';
import {prepareProviderRequest,snapshotProviderInput} from '../provider-request.mjs';
import {createPostgresProviderSettlementService,providerSettlementId} from '../provider-settlement.mjs';

// NOT part of local protocol tests. NEW loopback disposable database only, no
// credential/ambient DSN fallback. HTTPS is intercepted in EVERY runner test;
// real database locks/privileges never constitute provider qualification.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const suffix=`${process.pid}_${Date.now()}`,ledgerRole=`paia_settlement_ledger_${suffix}`,eventRole=`paia_settlement_events_${suffix}`;
const admin=new Pool({...connection,max:4}),pools=[],tables=['service_control','principal_authority','route_authority','request_authority','operation_evidence'];
let createdSchema=false,createdRoles=[],f;
const query=(sql,args)=>admin.query(sql,args);
const state=async()=> (await query('SELECT snapshot FROM paia_ai_private.budget_snapshot')).rows[0].snapshot;
const eventCount=async()=>Number((await query('SELECT count(*) AS n FROM paia_ai_private.operation_evidence')).rows[0].n);
const signal=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function pool(role,hook){
 const p=new Pool({...connection,max:2,onConnect:async client=>{await client.query(`SET ROLE ${role}`);if(hook){const original=client.query.bind(client);client.query=(sql,args)=>hook(sql,args,()=>original(sql,args));}}});
 p.on('error',()=>{});pools.push(p);return p;
}
const service=p=>createPostgresReservationService({pool:p,identityConfig:f.identityConfig,profileId:f.profileId});
const runner=(ledger=pool(ledgerRole),events=pool(eventRole))=>createPostgresProviderRunner({...f.config,reservationPool:ledger,evidencePool:events});
function wire(t,{beforeResponse,body=completion()}={}){let sends=0;t.mock.method(https,'request',(options,callback)=>{
 sends++;const request=new EventEmitter();request.destroy=error=>{queueMicrotask(()=>{request.emit('error',error);request.emit('close');});return request;};
 request.end=()=>queueMicrotask(async()=>{try{await beforeResponse?.();const incoming=Readable.from([Buffer.from(JSON.stringify(body))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));}catch(error){request.destroy(error);}});
 options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });return ()=>sends;}
async function blocked(fragment){for(let i=0;i<100;i++){const r=await query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);if(r.rowCount)return;await new Promise(r=>setTimeout(r,20));}assert.fail('Expected actual PostgreSQL lock wait');}

before(async()=>{
 assert.equal((await query('SELECT current_database() AS name')).rows[0].name,connection.database);
 assert.equal((await query("SELECT 1 FROM pg_namespace WHERE nspname='paia_ai_private'")).rowCount,0,'Refuse existing private schema');
 await query(await readFile(new URL('../schema/001-budget-ledger.sql',import.meta.url),'utf8'));createdSchema=true;
 await query(await readFile(new URL('../schema/002-service-authority.sql',import.meta.url),'utf8'));
 for(const role of [ledgerRole,eventRole]){
  await query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);createdRoles.push(role);
  await query(`GRANT USAGE ON SCHEMA paia_ai_private TO ${role}`);
  await query(`GRANT SELECT,UPDATE(updated_at) ON paia_ai_private.budget_snapshot TO ${role}`);
  await query(`CREATE POLICY ${role}_read ON paia_ai_private.budget_snapshot FOR SELECT TO ${role} USING(ledger_key='aiu:budget-reservations:v1')`);
  await query(`CREATE POLICY ${role}_lock ON paia_ai_private.budget_snapshot FOR UPDATE TO ${role} USING(ledger_key='aiu:budget-reservations:v1') WITH CHECK(ledger_key='aiu:budget-reservations:v1')`);
  for(const table of tables){
   await query(`GRANT SELECT,UPDATE(lock_anchor) ON paia_ai_private.${table} TO ${role}`);
   await query(`CREATE POLICY ${role}_read ON paia_ai_private.${table} FOR SELECT TO ${role} USING(true)`);
   await query(`CREATE POLICY ${role}_lock ON paia_ai_private.${table} FOR UPDATE TO ${role} USING(true) WITH CHECK(lock_anchor=1)`);
  }
 }
 await query(`GRANT UPDATE(snapshot) ON paia_ai_private.budget_snapshot TO ${ledgerRole}`);
 await query(`GRANT INSERT(event_id,operation_id,request_hash,event,evidence,expires_at_ms) ON paia_ai_private.operation_evidence TO ${eventRole}`);
 await query(`CREATE POLICY provider_insert ON paia_ai_private.operation_evidence FOR INSERT TO ${eventRole} WITH CHECK(true)`);
});
beforeEach(async()=>{
 await query('UPDATE paia_ai_private.budget_snapshot SET snapshot=NULL');await query('TRUNCATE '+tables.map(t=>'paia_ai_private.'+t).join(','));
 f=providerFixture({at:Date.now()});const c=f.control,r=f.input.bundle.request,p=f.principal(r),g=f.grants.get(r.operationId),route=f.routeRow;
 await query('INSERT INTO paia_ai_private.service_control(singleton,profile_id,identity_config_hash,generation,enabled,day_limit_micros,month_limit_micros,expires_at_ms) VALUES(true,$1,$2,$3,$4,$5,$6,$7)',[c.profile_id,c.identity_config_hash,c.generation,c.enabled,c.day_limit_micros,c.month_limit_micros,c.expires_at_ms]);
 await query('INSERT INTO paia_ai_private.principal_authority(principal_id,library_id,security,time_zone) VALUES($1,$2,$3::jsonb,$4)',[r.principalId,r.libraryId,JSON.stringify(p.security),p.time_zone]);
 await query('INSERT INTO paia_ai_private.route_authority(route_version,generation,facts,expires_at_ms) VALUES($1,$2,$3::jsonb,$4)',[r.routeVersion,route.generation,JSON.stringify(route.facts),route.expires_at_ms]);
 await query('INSERT INTO paia_ai_private.request_authority(operation_id,request_hash,request,generation,authorized,issued_at_ms,expires_at_ms) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)',[r.operationId,g.request_hash,JSON.stringify(r),g.generation,g.authorized,g.issued_at_ms,g.expires_at_ms]);
 assert.equal((await service(pool(ledgerRole)).reserve(f.input.bundle)).state,'RESERVED');
});
after(async()=>{await Promise.all(pools.map(p=>p.end()));try{if(createdSchema)await query('DROP SCHEMA paia_ai_private CASCADE');for(const role of createdRoles)await query(`DROP ROLE ${role}`);}finally{await admin.end();}});


const settle=(p=pool(ledgerRole))=>createPostgresProviderSettlementService({pool:p,identityConfig:f.identityConfig,profileId:f.profileId}).settle(f.input.bundle.request,providerSettlementId(f.input.bundle.request));

test('real independent workers produce one physical attempt and one original usage settlement',async t=>{
 const sends=wire(t),results=await Promise.all([runner().run(f.input),runner().run(f.input)]);
 assert.equal(sends(),1);assert.equal(results.filter(r=>r.decision==='response_received').length,1);assert.equal(await eventCount(),2);
 const row=(await state()).rows[0];assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);assert.equal(row.reservationMicros,700);assert.equal(row.resultCommitted,undefined);
 const reconciled=await Promise.all([settle(),settle(),settle()]);assert.ok(reconciled.every(r=>r.settledSpendMicros===120&&r.effectiveResults===0));assert.equal((await state()).rows.length,1);assert.equal(sends(),1);
});

test('real revocation before response delivery blocks the derivative but not historical expenditure',async t=>{
 const sends=wire(t,{beforeResponse:async()=>{await query('UPDATE paia_ai_private.request_authority SET authorized=false');await query('UPDATE paia_ai_private.service_control SET enabled=false');}});
 const result=await runner().run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(result.reservation,'SETTLED');
 const row=(await state()).rows[0];assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);assert.equal(row.resultCommitted,undefined);assert.equal((await settle()).settledSpendMicros,120);assert.equal(sends(),1);
});

test('real known usage and invalid content settle FAILED without a successful result',async t=>{
 const body=completion();body.choices[0].message.content='{"action":"INVALID"}';const sends=wire(t,{body}),result=await runner().run(f.input);
 assert.equal(result.value,undefined);assert.equal(result.resultFinalization,'FAILED');assert.equal(result.financialSettlement.effectiveResults,0);
 const row=(await state()).rows[0];assert.equal(row.settlement.outcome,'FAILED');assert.equal(row.settlement.usdMicros,120);assert.equal(sends(),1);
});

test('real usage publication failure keeps the original durable hold and produces no successful derivative',async t=>{
 const events=pool(eventRole,async(sql,args,run)=>{if(sql.includes('INSERT INTO paia_ai_private.operation_evidence')&&args[3]==='SETTLEMENT')throw Error('SYNTHETIC insert failed');return run();});
 const sends=wire(t),result=await runner(pool(ledgerRole),events).run(f.input);
 assert.equal(result.reason,'USAGE_PUBLICATION_FAILED');assert.equal(result.value,undefined);assert.equal(await eventCount(),1);
 assert.equal((await state()).rows[0].state,'DISPATCHED');assert.equal((await state()).rows[0].reservationMicros,700);assert.equal((await service(pool(ledgerRole)).cancel(f.input.bundle)).decision,'deny');assert.equal((await runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('real committed usage with lost ACK can be independently settled after content revocation without replay',async t=>{
 let commits=0;const events=pool(eventRole,async(sql,args,run)=>{const value=await run();if(sql==='COMMIT'&&++commits===3)throw Error('SYNTHETIC usage ACK lost');return value;});
 const sends=wire(t),result=await runner(pool(ledgerRole),events).run(f.input);assert.equal(result.reason,'USAGE_PUBLICATION_COMMIT_UNKNOWN');assert.equal(result.value,undefined);assert.equal(await eventCount(),2);assert.equal((await state()).rows[0].state,'DISPATCHED');
 await query('UPDATE paia_ai_private.request_authority SET authorized=false');assert.equal((await settle()).settledSpendMicros,120);assert.equal((await runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('real original financial settlement with lost ACK stays unknown until independent idempotent reconciliation',async t=>{
 let written=false;const ledger=pool(ledgerRole,async(sql,args,run)=>{const result=await run();if(sql.startsWith('WITH publication')&&JSON.parse(args[0]).rows[0].state==='SETTLED')written=true;if(written&&sql==='COMMIT')throw Error('SYNTHETIC settlement ACK lost');return result;});
 const sends=wire(t),result=await runner(ledger,pool(eventRole)).run(f.input);assert.equal(result.reason,'SETTLEMENT_COMMIT_UNKNOWN');assert.equal(result.value,undefined);assert.equal(result.financialSettlement,undefined);assert.equal(result.reservation,'ACKNOWLEDGEMENT_UNKNOWN');
 assert.equal((await state()).rows[0].state,'SETTLED');assert.equal((await settle()).settledSpendMicros,120);assert.equal((await runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('actual concurrent settlement waits on the original global ledger lock',async t=>{
 const ledger=pool(ledgerRole,async(sql,args,run)=>{if(sql.startsWith('WITH publication')&&JSON.parse(args[0]).rows[0].state==='SETTLED')throw Error('SYNTHETIC settlement write failure');return run();});
 const sends=wire(t),result=await runner(ledger,pool(eventRole)).run(f.input);assert.equal(result.reason,'SETTLEMENT_FAILED');assert.equal((await state()).rows[0].state,'DISPATCHED');
 const held=signal(),release=signal();let once=false;
 const first=pool(ledgerRole,async(sql,args,run)=>{const value=await run();if(!once&&sql.startsWith('SELECT schema_version')){once=true;held.resolve();await release.promise;}return value;});
 const pending=settle(first);await Promise.race([held.promise,pending.then(()=>{throw Error('First settlement ended before lock gate');})]);
 const competing=settle();try{await blocked('SELECT schema_version');}finally{release.resolve();}
 const outcomes=await Promise.all([pending,competing]);assert.ok(outcomes.every(r=>r.settledSpendMicros===120));assert.equal((await state()).rows[0].settlement.usdMicros,120);assert.equal(sends(),1);
});

for(const [label,mutate] of [
 ['missing',body=>{body.usage=null;}],['malformed',body=>{body.usage.total_tokens=119;}],['overbound',body=>{body.usage.prompt_tokens=101;body.usage.total_tokens=121;}],
])test(`real original ledger retains the full hold for ${label} provider usage`,async t=>{
 const body=completion();mutate(body);const sends=wire(t,{body}),result=await runner().run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);
 const row=(await state()).rows[0];assert.equal(row.state,'OUTCOME_UNKNOWN');assert.equal(row.settlement,undefined);assert.equal(row.reservationMicros,700);assert.equal((await query("SELECT count(*) AS n FROM paia_ai_private.operation_evidence WHERE event='SETTLEMENT'")).rows[0].n,'0');assert.equal((await runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('real accounting reader cannot also publish facts or use inherited event-write privileges',async t=>{
 const sends=wire(t);await runner().run(f.input);
 await assert.rejects(pool(ledgerRole).query("INSERT INTO paia_ai_private.operation_evidence(event_id) VALUES('SYNTHETIC-forged')"),e=>e.code==='42501');
 await query(`GRANT INSERT(event_id,operation_id,request_hash,event,evidence,expires_at_ms) ON paia_ai_private.operation_evidence TO ${ledgerRole}`);
 try{assert.equal((await settle()).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal((await state()).rows[0].settlement.usdMicros,120);assert.equal(sends(),1);}finally{await query(`REVOKE INSERT(event_id,operation_id,request_hash,event,evidence,expires_at_ms) ON paia_ai_private.operation_evidence FROM ${ledgerRole}`);}
});

test('revocation after the final real SHARE-lock COMMIT does not retroactively recall authorized output',async t=>{
 let commits=0;const events=pool(eventRole,async(sql,args,run)=>{const value=await run();if(sql==='COMMIT'&&++commits===4)await query('UPDATE paia_ai_private.request_authority SET authorized=false');return value;});
 const sends=wire(t),result=await runner(pool(ledgerRole),events).run(f.input);
 assert.equal(result.decision,'response_received');assert.deepEqual({...result.value},{action:'KEEP'});assert.equal(result.resultFinalization,'PENDING_DOMAIN_PROOF');assert.equal(result.financialSettlement.effectiveResults,0);assert.equal(sends(),1);
});
