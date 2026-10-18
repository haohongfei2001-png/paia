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

// NOT part of local protocol tests. NEW loopback disposable database only, no
// credential/ambient DSN fallback. HTTPS is intercepted in EVERY runner test;
// real database locks/privileges never constitute provider qualification.
const connection=disposablePostgresConfig(process.env.PAIA_LEDGER_TEST_DATABASE_URL,process.env.PAIA_LEDGER_TEST_DISPOSABLE);
const suffix=`${process.pid}_${Date.now()}`,ledgerRole=`paia_runner_ledger_${suffix}`,eventRole=`paia_runner_events_${suffix}`;
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
function wire(t,onStart,body=completion()){let sends=0;t.mock.method(https,'request',(options,callback)=>{
 sends++;onStart?.();const request=new EventEmitter();request.destroy=error=>{queueMicrotask(()=>{request.emit('error',error);request.emit('close');});return request;};
 request.end=()=>queueMicrotask(()=>{const incoming=Readable.from([Buffer.from(JSON.stringify(body))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));});
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

test('independent real roles/connections yield one durable dispatch and one mocked physical send',async t=>{
 const sends=wire(t);const results=await Promise.all([runner().run(f.input),runner().run(f.input)]);
 assert.equal(sends(),1);assert.equal(results.filter(r=>r.decision==='response_received').length,1);assert.equal(await eventCount(),2);assert.equal((await state()).rows[0].state,'SETTLED');assert.equal((await state()).rows[0].settlement.usdMicros,120);assert.equal((await state()).rows[0].reservationMicros,700);
});
test('real INSERT claim or original DISPATCHED COMMIT lost acknowledgement each yields zero send',async t=>{
 const sends=wire(t);const events=pool(eventRole,async(sql,args,run)=>{const result=await run();if(sql==='COMMIT')throw Error('SYNTHETIC lost event ack');return result;});
 const result=await runner(pool(ledgerRole),events).run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(sends(),0);assert.equal(await eventCount(),1);assert.equal((await state()).rows[0].state,'RESERVED');assert.equal((await runner().run(f.input)).decision,'deny');
});
test('real committed DISPATCHED with lost ack never turns a read-back into replay authority',async t=>{
 const sends=wire(t);const ledger=pool(ledgerRole,async(sql,args,run)=>{const result=await run();if(sql==='COMMIT')throw Error('SYNTHETIC lost ledger ack');return result;});
 const result=await runner(ledger,pool(eventRole)).run(f.input);assert.equal(result.reason,'DISPATCH_COMMIT_UNKNOWN');assert.equal(sends(),0);assert.equal((await state()).rows[0].state,'DISPATCHED');assert.equal((await runner().run(f.input)).decision,'deny');
});
test('revocation committed before runner authority locks denies event and send',async t=>{
 const sends=wire(t);await query('UPDATE paia_ai_private.request_authority SET authorized=false');
 assert.equal((await runner().run(f.input)).decision,'deny');assert.equal(sends(),0);assert.equal(await eventCount(),0);assert.equal((await state()).rows[0].reservationMicros,700);
});
test('actual revocation waits through send initiation and later blocks derivative disclosure',async t=>{
 const held=signal(),release=signal();let tx=0,clocks=0;
 const events=pool(eventRole,async(sql,args,run)=>{
  if(sql.startsWith('BEGIN')){tx++;clocks=0;}
  const result=await run();if(tx===2&&sql.startsWith('SELECT floor')&&++clocks===2){held.resolve();await release.promise;}return result;
 });
 const sends=wire(t),pending=runner(pool(ledgerRole),events).run(f.input);
 await Promise.race([held.promise,pending.then(()=>{throw Error('Runner ended before send fence');})]);
 const revoke=query('UPDATE paia_ai_private.request_authority SET authorized=false');
 try{await blocked('UPDATE paia_ai_private.request_authority');}finally{release.resolve();}
 const result=await pending;await revoke;assert.equal(sends(),1);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal((await state()).rows[0].reservationMicros,700);
});
test('a delayed real DB clock sample cannot send after its publication interval',async t=>{
 let tx=0,clocks=0;const events=pool(eventRole,async(sql,args,run)=>{if(sql.startsWith('BEGIN')){tx++;clocks=0;}const result=await run();if(tx===2&&sql.startsWith('SELECT floor')&&++clocks===2)await new Promise(r=>setTimeout(r,1100));return result;});
 const sends=wire(t),result=await runner(pool(ledgerRole),events).run(f.input);assert.equal(sends(),0);assert.equal(result.decision,'outcome_unknown');assert.equal((await state()).rows[0].reservationMicros,700);
});
test('publisher cannot mutate budgets/authority and reservation role cannot publish events',async t=>{
 const eventPool=pool(eventRole),ledger=pool(ledgerRole),sends=wire(t);
 for(const sql of ["UPDATE paia_ai_private.budget_snapshot SET snapshot=NULL","UPDATE paia_ai_private.request_authority SET authorized=false","UPDATE paia_ai_private.service_control SET enabled=false"])
  await assert.rejects(eventPool.query(sql),e=>e.code==='42501');
 await assert.rejects(ledger.query("INSERT INTO paia_ai_private.operation_evidence(event_id) VALUES('SYNTHETIC-forged')"),e=>e.code==='42501');
 await query(`GRANT UPDATE(snapshot) ON paia_ai_private.budget_snapshot TO ${eventRole}`);
 try{assert.equal((await runner(ledger,eventPool).run(f.input)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal(sends(),0);assert.equal(await eventCount(),0);}finally{await query(`REVOKE UPDATE(snapshot) ON paia_ai_private.budget_snapshot FROM ${eventRole}`);}
});
test('event claim serializes cancel absence check without adding financial writes',async()=>{
 const held=signal(),release=signal();let heldOnce=false;
 const events=pool(eventRole,async(sql,args,run)=>{const result=await run();if(!heldOnce&&sql.includes('INSERT INTO paia_ai_private.operation_evidence')){heldOnce=true;held.resolve();await release.promise;}return result;});
 const publisher=createPostgresProviderEvidencePublisher({...f.config,pool:events}),input=snapshotProviderInput(f.input);
 const claim=publisher.claim(input.bundle,input.declaration,context=>prepareProviderRequest({input,manifest:f.manifest,tokenize:f.config.tokenize,...context}));
 await Promise.race([held.promise,claim.then(()=>{throw Error('Claim ended before lock gate');})]);
 const cancel=service(pool(ledgerRole)).cancel(input.bundle);
 try{await blocked('SELECT schema_version');}finally{release.resolve();}
 assert.equal((await claim).decision,'claimed');assert.equal((await cancel).decision,'deny');assert.equal((await state()).rows[0].state,'RESERVED');assert.equal((await state()).rows[0].reservationMicros,700);
});

test('current real DB time before a durable watermark suppresses output and preserves settled expenditure',async t=>{
 let tx=0,watermark;
 const events=pool(eventRole,async(sql,args,run)=>{
  const result=await run();
  if(sql.startsWith('BEGIN')&&++tx===4){
   // Do not change the machine or database clock. Install a future durable
   // watermark in this disposable fixture to represent rollback relative to
   // a previously committed observation; the actual clock stays within grants.
   watermark=Number((await query("UPDATE paia_ai_private.budget_snapshot SET snapshot=jsonb_set(snapshot,'{lastNow}',to_jsonb((floor(extract(epoch FROM clock_timestamp())*1000)+10000)::bigint)) RETURNING snapshot->>'lastNow' AS value")).rows[0].value);
  }
  return result;
 });
 const sends=wire(t),result=await runner(pool(ledgerRole),events).run(f.input);
 assert.equal(sends(),1);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);
 const current=Number((await query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::text AS value')).rows[0].value);
 assert.ok(current<watermark);assert.equal((await state()).lastNow,watermark);assert.equal((await state()).rows[0].reservationMicros,700);assert.equal((await state()).rows[0].settlement.usdMicros,120);
});
test('one input token above the real original reservation stops the runner without enlarging or releasing its hold',async t=>{
 const body=completion();body.usage.prompt_tokens=101;body.usage.total_tokens=121;
 const sends=wire(t,undefined,body),owner=runner(),result=await owner.run(f.input);
 assert.equal(sends(),1);assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'PROVIDER_USAGE_OVER_CAP');assert.equal(result.value,undefined);
 const row=(await state()).rows[0];assert.equal(row.request.inputTokens,100);assert.equal(row.reservationMicros,700);assert.equal(row.state,'OUTCOME_UNKNOWN');
 assert.equal((await owner.run(f.input)).reason,'PROVIDER_STOPPED');assert.equal(sends(),1);assert.equal((await service(pool(ledgerRole)).cancel(f.input.bundle)).decision,'deny');
});
