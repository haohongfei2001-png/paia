import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {capture} from '../../../extension/tests/harness/thought-m1.mjs';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const tick=ms=>new Promise(r=>setTimeout(r,ms));
for(const revoke of ['session-dispose','parent-revoke'])test('held exact reuse issuer releases original Store queue on '+revoke,{timeout:120000},async t=>{
 const first=await maintenanceServiceFixture(t,{exposeRemote:true});t.after(()=>first.session.dispose());assert.equal((await first.run()).state,'COMMITTED');const old=(await read(first.s,'thoughts')).find(x=>x.provenanceType==='input_original');first.session.dispose();
 let probe=false,underlying=0;const transaction=first.s.repository.transaction.bind(first.s.repository);t.mock.method(first.s.repository,'transaction',(write,fn,...rest)=>transaction(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(...args)=>{if(probe)underlying++;return get(...args);};return fn(tx);},...rest));
 const routes=new Map(first.calls.filter(x=>x.data.request?.operationId).map(x=>[x.data.request.operationId,first.configuration.fetch]));
 const c=capture((await first.s.status()).epoch,'SYNTHETIC-held-exact-'+revoke,old.thoughtText);c.chat={id:'SYNTHETIC-held-new-source',url:'https://chatgpt.com/c/SYNTHETIC-held-new-source',title:'Synthetic other Source'};await first.s.capture(c);await first.s.finishFoundation();
 let entered,release,issuerTx,settled=false;const ready=new Promise(r=>entered=r),held=new Promise(r=>release=r);let calls=0;
 const next=await maintenanceServiceFixture(t,{reuseLocal:first,exposeRemote:true,configure:({configuration})=>{const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(tx,scope)=>{const raw=await resolve(tx,scope);if(scope.phase==='topic-exact-reuse'){calls++;issuerTx=tx;entered();await held;settled=true;}return raw;}};const fetch=configuration.fetch;configuration.fetch=async request=>{const data=await request.clone().json(),id=data.request?.operationId;if(id&&routes.has(id))return routes.get(id)(request);if(id)routes.set(id,fetch);return fetch(request);};},transformResponse:({value})=>{value.context={status:'DEFER',reason:'Synthetic Context deferred',groups:[]};}});t.after(()=>next.session.dispose());
 let run=next.run();let outcome=await Promise.race([ready.then(()=>null),run.then(value=>value)]);if(outcome?.state==='RECOVERED'){run=next.run();outcome=await Promise.race([ready.then(()=>null),run.then(value=>value)]);}assert.equal(outcome,null,'the real exact resolver must enter');
 let queue;try{if(revoke==='session-dispose')next.session.dispose();else first.contextAbort.abort();
  queue=first.s.run(()=>first.s.repository.transaction(false,tx=>tx.get('meta','gate')));
  const freed=await Promise.race([queue.then(()=>true),tick(50).then(()=>false)]);assert.equal(settled,false);assert.equal(calls,1);assert.equal(freed,true,'cancelled private resolve must release the original Store queue before the underlying issuer settles');
  probe=true;try{await assert.rejects(issuerTx.get('meta','gate'));}finally{probe=false;}assert.equal(underlying,0,'cancelled facade must reject before the original Repository get');assert.equal(next.physical(),1);
 }finally{release();await run;await queue;}
 assert.deepEqual((await read(first.s,'thoughts')).find(x=>x.id===old.id),old);assert.equal((await read(first.s,'dependencies')).filter(x=>x.targetId===old.id).length,1);
});
