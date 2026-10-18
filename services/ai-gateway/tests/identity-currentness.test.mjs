import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createPostgresIdentityCurrentnessService,IDENTITY_INVALIDATION_CHANNEL} from '../identity-currentness-service.mjs';
import {createIdentityCurrentnessHandler} from '../identity-currentness-entry.mjs';
import {createClientIdentityCurrentnessTransport,readClientIdentityCurrentnessConnection,identityMatchesCurrentnessConnection} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(r=>setImmediate(r));
const url='https://synthetic.invalid/api/identity-currentness';
function transport(f,patch={}){return createClientIdentityCurrentnessTransport({endpoint:url,fetch:r=>f.handler(r),clock:()=>f.now,...patch});}

test('original verifier and two authority rows issue bounded metadata only after committed LISTEN and snapshot',async t=>{
 const f=identityChannelFixture();t.after(f.close);const c=await f.primary.open(f.bundle,{signal:signal()});assert.ok(c?.isCurrent());
 assert.equal(c.identity.tier,'pro');assert.equal(c.identity.verifiedUntil,f.now+60000);
 const sql=f.calls.map(x=>x.sql);assert.deepEqual(sql.slice(0,4),['BEGIN','LISTEN paia_identity_invalidated_v1','COMMIT','BEGIN']);assert.equal(sql.at(-1),'COMMIT');
 assert.equal(f.clients[0].transaction,false);assert.equal(f.released.length,0);
 assert.ok(sql.every(s=>!s.includes('budget_snapshot')&&!s.includes('operation_evidence')&&!/^(INSERT|UPDATE|DELETE)/.test(s)));
 const wire=JSON.stringify(c.identity);for(const secret of [f.bundle.principalToken,f.bundle.entitlementToken,'security','note','body'])assert.ok(!wire.includes(secret));
 c.close();assert.equal(c.isCurrent(),false);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);
});

for(const stage of ['LISTEN','first COMMIT','control','principal','attestation','last COMMIT'])test(`notification at ${stage} prevents this admission`,async t=>{
 let commits=0;const f=identityChannelFixture({hook:({client,sql})=>{
  if(sql==='COMMIT')commits++;
  if(stage==='LISTEN'&&sql.startsWith('LISTEN ')||stage==='first COMMIT'&&sql==='COMMIT'&&commits===1||stage==='control'&&sql.includes('FROM paia_ai_private.service_control')||stage==='principal'&&sql.includes('FROM paia_ai_private.principal_authority')||stage==='attestation'&&sql.includes('SELECT c.relname')||stage==='last COMMIT'&&sql==='COMMIT'&&commits===2)client.emit('notification',{channel:IDENTITY_INVALIDATION_CHANNEL});
 }});t.after(f.close);assert.equal(await f.primary.open(f.bundle,{signal:signal()}),null);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);
});

test('independent service instances share DB notifications; unrelated principal refresh conservatively closes both',async t=>{
 const f=identityChannelFixture();t.after(f.close);const a=await f.primary.open(f.bundle,{signal:signal()}),b=await f.service().open(f.bundle,{signal:signal()});
 assert.ok(a.isCurrent()&&b.isCurrent());f.notify();assert.equal(a.isCurrent(),false);assert.equal(b.isCurrent(),false);assert.equal(f.released.length,2);
});

for(const event of ['end','error','abort'])test(`${event} retires channel and discards dedicated listener`,async t=>{
 const f=identityChannelFixture();t.after(f.close);const ac=new AbortController(),c=await f.primary.open(f.bundle,{signal:ac.signal});let invalidated=0;c.onInvalidate(()=>invalidated++);
 if(event==='abort')ac.abort();else f.clients[0].emit(event,Error('SYNTHETIC'));
 assert.equal(c.isCurrent(),false);assert.equal(invalidated,1);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);
});

for(const field of ['tgtype','tgenabled','tgqual','tgattr','prosrc','prosecdef','proconfig','same_owner','can_call_or_replace','can_mutate','is_owner','inherited','relispartition','rolbypassrls','anchor_qualified','provolatile','proparallel','prokind','proleakproof','proretset'])test(`unqualified original schema ${field} cannot establish a channel`,async t=>{
 const f=identityChannelFixture({hook:({sql,attestation})=>{if(sql.includes('SELECT c.relname')){const rows=attestation();rows[0][field]=typeof rows[0][field]==='boolean'?!rows[0][field]:field==='proconfig'?['search_path=public']:'INVALID';return {rows};}}});t.after(f.close);
 assert.equal(await f.primary.open(f.bundle,{signal:signal()}),null);assert.equal(f.released.length,1);
});

for(const kind of ['revoked','expired','disabled','wrong profile','forged','wrong operation'])test(`original ${kind} authority denies without ledger or provider work`,async t=>{
 const f=identityChannelFixture();t.after(f.close);let bundle=f.bundle;
 if(kind==='revoked')f.principals.get(f.request.principalId+'/'+f.request.libraryId).security.entitlementActive=false;
 if(kind==='expired')f.setClock(f.now+60000);if(kind==='disabled')f.control.enabled=false;if(kind==='wrong profile')f.control.profile_id='other';
 if(kind==='forged')bundle={...bundle,principalToken:'x.y.z'};if(kind==='wrong operation')bundle={...bundle,request:{...f.request,operationId:'other'}};
 assert.equal(await f.primary.open(bundle,{signal:signal()}),null);assert.ok(f.calls.every(c=>!c.sql.includes('budget_snapshot')));
});

test('source migration covers every statement kind with fixed empty payload and ALWAYS triggers',async()=>{
 const sql=await readFile(new URL('../schema/004-identity-currentness.sql',import.meta.url),'utf8');assert.equal((sql.match(/AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE/g)||[]).length,2);assert.equal((sql.match(/ENABLE ALWAYS TRIGGER/g)||[]).length,2);
 assert.ok(sql.includes("pg_catalog.pg_notify('paia_identity_invalidated_v1', '')"));assert.ok(!/UPDATE OF|FOR EACH ROW|GRANT |CREATE ROLE/.test(sql));
});

test('default unconfigured handler does no DB work and rejects malformed metadata',async()=>{
 const handler=createIdentityCurrentnessHandler();for(const body of [{action:'observe',body:'SYNTHETIC-private'},{}]){const response=await handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));assert.equal(response.status,400);}
 const f=identityChannelFixture();const response=await handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'observe',...f.bundle})}));assert.equal(response.status,503);assert.equal(f.calls.length,0);f.close();
 assert.equal(await createPostgresIdentityCurrentnessService().open(f.bundle,{signal:signal()}),null);
});

test('real local source handler/stream produces private exact connection; notification invalidates without new HTTP',async t=>{
 const f=identityChannelFixture();t.after(f.close);let calls=0;const tr=transport(f,{fetch:r=>{calls++;assert.equal(r.credentials,'omit');assert.equal(r.redirect,'error');return f.handler(r);}});t.after(()=>tr.dispose());
 const c=await tr.open(f.bundle);assert.ok(c?.isCurrent());const m=readClientIdentityCurrentnessConnection(c,tr);assert.deepEqual(m.request,f.request);assert.equal(m.identity.tier,'pro');assert.equal(readClientIdentityCurrentnessConnection({...c},tr),null);
 assert.equal(readClientIdentityCurrentnessConnection(c,transport(f)),null);assert.equal(identityMatchesCurrentnessConnection(c,tr,m.identity),true);
 assert.equal(identityMatchesCurrentnessConnection(c,tr,{...m.identity,entitlementGeneration:'other'}),false);
 f.notify();await tick();assert.equal(c.isCurrent(),false);assert.equal(readClientIdentityCurrentnessConnection(c,tr),null);assert.equal(calls,1);
});

test('eight active source listeners is a hard bound, close frees one slot',async t=>{
 const f=identityChannelFixture();t.after(f.close);const list=[];for(let i=0;i<8;i++)list.push(await f.primary.open(f.bundle,{signal:signal()}));assert.ok(list.every(c=>c?.isCurrent()));
 assert.equal(await f.primary.open(f.bundle,{signal:signal()}),null);assert.equal(f.clients.length,8);list[0].close();assert.ok(await f.primary.open(f.bundle,{signal:signal()}));assert.equal(f.clients.length,9);
});

test('timed-out unsettled Pool acquisitions retain their capacity across repeated batches',async t=>{
 const f=identityChannelFixture();t.after(f.close);t.mock.timers.enable({apis:['setTimeout']});let requested=0;const pending=[];
 f.pool.connect=()=>{requested++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
 for(let round=0;round<4;round++){
  const batch=Array.from({length:8},()=>f.primary.open(f.bundle,{signal:signal()}));t.mock.timers.tick(5000);assert.ok((await Promise.all(batch)).every(x=>x===null));
 }
 assert.equal(requested,8,'timeouts cannot free uncancellable pending acquisition capacity');
 pending[0].reject(Error('SYNTHETIC released waiter'));await tick();
 const next=f.primary.open(f.bundle,{signal:signal()});assert.equal(requested,9);t.mock.timers.tick(5000);assert.equal(await next,null);
 for(const p of pending)p.reject(Error('SYNTHETIC cleanup'));
});

test('original lock_anchor-only UPDATE privilege is usable by FOR SHARE and accepted by schema contract',async t=>{
 // SQL-contract protocol evidence, not a claim to have run PostgreSQL ACLs.
 const f=identityChannelFixture({hook:({sql,attestation})=>{if(sql.includes('SELECT c.relname')){const rows=attestation();
  for(const row of rows)row.can_mutate=!sql.includes("a.attname<>'lock_anchor' AND has_column_privilege(current_user,c.oid,a.attname,'UPDATE')");return {rows};
 }}});t.after(f.close);const c=await f.primary.open(f.bundle,{signal:signal()});assert.ok(c?.isCurrent());
});

test('an abandoned response applies backpressure and releases its dedicated listener',async t=>{
 const f=identityChannelFixture();t.after(f.close);t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const response=await f.handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'observe',...f.bundle})}));assert.equal(response.status,200);assert.equal(f.released.length,0);
 t.mock.timers.tick(1000);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);await response.body.cancel();
});

test('late successful acquisition after timeout is discarded once and never establishes LISTEN',async t=>{
 const f=identityChannelFixture();t.after(f.close);t.mock.timers.enable({apis:['setTimeout']});let release;const original=f.pool.connect;
 f.pool.connect=()=>new Promise(resolve=>release=async()=>resolve(await original()));const pending=f.primary.open(f.bundle,{signal:signal()});t.mock.timers.tick(5000);assert.equal(await pending,null);
 await release();await tick();assert.equal(f.calls.length,0);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);
});

for(const failure of ['final expiry','final clock rollback','snapshot COMMIT loss'])test(failure+' never publishes ready or retains a listening connection',async t=>{
 let clocks=0,commits=0;const f=identityChannelFixture({hook:({sql,setClock,f})=>{
  if(sql==='COMMIT'&&++commits===2&&failure==='snapshot COMMIT loss')throw Error('SYNTHETIC lost read acknowledgement');
  if(sql.startsWith('SELECT floor')&&++clocks===2)setClock(failure==='final expiry'?f.now+60000:failure==='final clock rollback'?f.now-1:f.now);
 }});t.after(f.close);assert.equal(await f.primary.open(f.bundle,{signal:signal()}),null);assert.equal(f.released.length,1);assert.equal(f.released[0].discard,true);
});

test('arbitrary payload on the fixed channel can only invalidate, never change or renew identity',async t=>{
 const f=identityChannelFixture();t.after(f.close);const c=await f.primary.open(f.bundle,{signal:signal()}),before=structuredClone(c.identity);
 f.clients[0].emit('notification',{channel:'unrelated',payload:'ignored'});assert.equal(c.isCurrent(),true);
 f.clients[0].emit('notification',{channel:IDENTITY_INVALIDATION_CHANNEL,payload:JSON.stringify({tier:'pro',verifiedUntil:f.now+9999999})});assert.equal(c.isCurrent(),false);assert.deepEqual(c.identity,before);
});
