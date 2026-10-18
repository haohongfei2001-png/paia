import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createPostgresProviderRunner} from '../provider-runner.mjs';
import {providerFixture,completion,sseCompletion} from './provider-fixtures.mjs';

function wire(t,f,{body=JSON.stringify(completion()),status=200,headers={'content-type':'application/json'},onStart,onResponse,stall=false}={}){
 const calls=[];
 t.mock.method(https,'request',(options,callback)=>{
  calls.push(options);onStart?.(options);
  const request=new EventEmitter();request.destroy=error=>{queueMicrotask(()=>{request.emit('error',error);request.emit('close');});return request;};
  request.end=written=>{
   calls.at(-1).written=written;
   if(stall)return;
   queueMicrotask(()=>{
    onResponse?.();const incoming=Readable.from([Buffer.from(body)]);incoming.statusCode=status;incoming.headers=headers;
    callback(incoming);incoming.once('close',()=>request.emit('close'));
   });
  };
  options.signal?.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC aborted')),{once:true});
  return request;
 });return calls;
}
function safe(result){assert.equal(result.financialAuthority,false);assert.equal(result.dispatchAllowed,false);assert.equal(result.retryAllowed,false);assert.equal(result.qualification,'NOT_ESTABLISHED');assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_BODY'),false);assert.equal(JSON.stringify(result).includes('SYNTHETIC-NOT-A-KEY'),false);}

test('disabled and missing tokenizer never read a credential or open any connection',async t=>{
 let reads=0,sends=0; t.mock.method(https,'request',()=>{sends++;throw Error();});
 const off=createPostgresProviderRunner({get providerCredential(){reads++;throw Error();}});
 assert.equal((await off.run(null)).reason,'PROVIDER_DISABLED');
 const f=providerFixture();const missing=createPostgresProviderRunner({...f.config,tokenize:undefined,get providerCredential(){reads++;throw Error();}});
 assert.equal((await missing.run(f.input)).reason,'QUALIFIED_TOKENIZER_UNAVAILABLE');assert.equal(reads,0);assert.equal(sends,0);assert.equal(f.connected(),0);
});
test('actual original DISPATCHED commit precedes the sole fixed physical request; parsed response never settles money',async t=>{
 const f=providerFixture();assert.equal((await f.reserve()).decision,'reserved');
 const calls=wire(t,f,{onStart:()=>{assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.calls.filter(c=>c.role==='ledger'&&c.sql==='COMMIT').length,2);}});
 const result=await f.runner().run(f.input);assert.equal(result.decision,'response_received',JSON.stringify(result));safe(result);
 assert.deepEqual({...result.value},{action:'KEEP'});assert.equal(result.usage.neutral.inputTokens,100);assert.equal(calls.length,1);
 assert.equal(calls[0].hostname,f.manifest.profile.endpoint.host);assert.equal(calls[0].path,'/compatible-mode/v1/chat/completions');assert.equal(calls[0].agent,false);assert.equal(calls[0].rejectUnauthorized,true);
 const body=JSON.parse(calls[0].written);assert.equal(body.n,1);assert.equal(body.enable_thinking,false);assert.deepEqual(JSON.parse(body.messages[1].content),f.input.payload);
 const row=f.saved().rows[0];assert.equal(row.state,'DISPATCHED');assert.equal(row.reservationMicros,700);assert.equal(row.settlement,undefined);
 const repeat=await f.runner().run(f.input);assert.equal(repeat.decision,'deny');assert.equal(calls.length,1);
});
test('SSE actual terminator and EOF preserve original usage decoder and bounded derivative',async t=>{
 const f=providerFixture();f.input.stream=true;await f.reserve();const calls=wire(t,f,{body:sseCompletion(),headers:{'content-type':'text/event-stream; charset=utf-8'}});
 const result=await f.runner().run(f.input);assert.equal(result.decision,'response_received',JSON.stringify(result));safe(result);assert.equal(result.usage.transportComplete,true);assert.equal(calls.length,1);
 assert.deepEqual(JSON.parse(calls[0].written).stream_options,{include_usage:true});
});

test('concurrent fresh server instances produce one durable claim and one physical attempt',async t=>{
 const f=providerFixture();await f.reserve();const calls=wire(t,f);
 const results=await Promise.all([f.runner().run(f.input),f.runner().run(f.input)]);
 assert.equal(calls.length,1);assert.equal(results.filter(r=>r.decision==='response_received').length,1);assert.equal(f.events().size,1);assert.equal(f.saved().rows.length,1);
});
test('lost evidence COMMIT acknowledgement yields zero sends, no replay and retained original hold',async t=>{
 let armed=false;const f=providerFixture({after:({sql,role})=>{if(armed&&role==='publisher'&&sql==='COMMIT'){armed=false;throw Error('SYNTHETIC lost ack');}}});
 await f.reserve();armed=true;const calls=wire(t,f);const result=await f.runner().run(f.input);
 assert.equal(result.decision,'outcome_unknown');safe(result);assert.equal(calls.length,0);assert.equal(f.events().size,1);assert.equal(f.saved().rows[0].state,'RESERVED');assert.equal(f.saved().rows[0].reservationMicros,700);
 assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(calls.length,0);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');
});
test('lost ORIGINAL DISPATCHED COMMIT acknowledgement never permits physical send',async t=>{
 let armed=false;const f=providerFixture({after:({sql,role})=>{if(armed&&role==='ledger'&&sql==='COMMIT'){armed=false;throw Error('SYNTHETIC lost ack');}}});
 await f.reserve();armed=true;const calls=wire(t,f);const result=await f.runner().run(f.input);
 assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'DISPATCH_COMMIT_UNKNOWN');assert.equal(calls.length,0);assert.equal(f.saved().rows[0].state,'DISPATCHED');
 assert.equal(f.released.some(r=>r.role==='ledger'&&r.discard),true);assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(calls.length,0);
});
test('known failed ORIGINAL ledger write has zero send and cannot erase the evidence hold',async t=>{
 let armed=false;const f=providerFixture({hook:({sql,role})=>{if(armed&&role==='ledger'&&sql.startsWith('WITH publication'))throw Error('SYNTHETIC write failure');}});
 await f.reserve();armed=true;const calls=wire(t,f);const result=await f.runner().run(f.input);
 assert.equal(result.decision,'deny');assert.equal(calls.length,0);assert.equal(f.saved().rows[0].state,'RESERVED');assert.equal(f.events().size,1);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');
});
test('declaration generation, payload, child, profile and tokenizer binds cannot be supplied or rebound by caller',async t=>{
 for(const change of [
  f=>{f.grants.get(f.input.bundle.request.operationId).generation='f'.repeat(64);},
  f=>{f.input.payload.text='SYNTHETIC CHANGED';},
  f=>{f.input.childIdentity.automaticRetries=1;},
  f=>{f.input.profileId='SYNTHETIC OTHER';},
  f=>{f.input.tokenizer={inputTokens:100};},
  f=>{f.input.bundle.request.inputTokens=101;},
  f=>{f.config.tokenize=async()=>({inputTokens:100});},
  f=>{f.manifest.route.region='SYNTHETIC-wrong';},
 ]){
  const f=providerFixture();await f.reserve();change(f);const calls=wire(t,f);const result=await f.runner().run(f.input);assert.equal(result.decision,'deny',JSON.stringify(result));safe(result);assert.equal(calls.length,0);assert.equal(f.events().size,0);t.mock.restoreAll();
 }
});
test('disposed during final async tokenizer cannot publish an event, dispatch or revive later',async t=>{
 const f=providerFixture();await f.reserve();let entered,release;const waiting=new Promise(r=>entered=r);
 const runner=f.runner({tokenize:async()=>{entered();return new Promise(r=>release=r);}});const calls=wire(t,f);
 const pending=runner.run(f.input);await waiting;runner.dispose();const result=await pending;assert.equal(result.decision,'deny');assert.equal(calls.length,0);assert.equal(f.events().size,0);
 release({});assert.equal((await runner.run(f.input)).reason,'PROVIDER_STOPPED');
});
test('revocation committed before post-DISPATCHED send fence leaves hold and sends zero',async t=>{
 let armed=false;const f=providerFixture({after:({role,sql})=>{if(armed&&role==='ledger'&&sql==='COMMIT'){armed=false;f.grants.get(f.input.bundle.request.operationId).authorized=false;}}});
 await f.reserve();armed=true;const calls=wire(t,f);const result=await f.runner().run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(calls.length,0);assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.saved().rows[0].reservationMicros,700);
});
test('DB time expiry before original dispatch publication and before send refuses without clock substitution',async t=>{
 for(const stage of ['record','send']){
  let armed=false;const f=providerFixture({hook:({role,sql,setClock})=>{if(armed&&((stage==='record'&&role==='ledger'&&sql.includes('FROM paia_ai_private.service_control'))||(stage==='send'&&role==='publisher'&&sql.startsWith('SELECT schema_version')))){armed=false;setClock(f.now+60000);}}});
  await f.reserve();const calls=wire(t,f,{onStart:()=>assert.fail('expired send')});
  if(stage==='record')armed=true;
  else f.config.isCurrent=()=>{if(f.saved().rows[0].state==='DISPATCHED')armed=true;return true;};
  const result=await f.runner().run(f.input);assert.notEqual(result.decision,'response_received');assert.equal(calls.length,0);assert.equal(f.saved().rows[0].reservationMicros,700);t.mock.restoreAll();
 }
});
test('HTTP failures, missing usage, over-cap counts and incomplete SSE preserve unknown cost without retry/refund',async t=>{
 for(const options of [
  {status:500,body:'SYNTHETIC_PROVIDER_SECRET_ERROR'},
  {body:JSON.stringify(completion({usage:null}))},
  {body:JSON.stringify(completion({usage:{...completion().usage,completion_tokens:601,total_tokens:701}}))},
  {body:sseCompletion().replace('data: [DONE]\n\n',''),headers:{'content-type':'text/event-stream'},stream:true},
 ]){
  const f=providerFixture();f.input.stream=!!options.stream;await f.reserve();const calls=wire(t,f,options);const result=await f.runner().run(f.input);assert.equal(result.decision,'outcome_unknown');safe(result);assert.equal(JSON.stringify(result).includes('SYNTHETIC_PROVIDER_SECRET_ERROR'),false);assert.equal(calls.length,1);assert.equal(f.saved().rows[0].state,'OUTCOME_UNKNOWN');assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(calls.length,1);t.mock.restoreAll();
 }
});
test('client cancellation after initiation remains one unknown attempt and no response disclosure',async t=>{
 const f=providerFixture();await f.reserve();const controller=new AbortController();const calls=wire(t,f,{stall:true,onStart:()=>queueMicrotask(()=>controller.abort())});
 const result=await f.runner().run(f.input,{signal:controller.signal});assert.equal(result.decision,'outcome_unknown');assert.equal(calls.length,1);assert.equal(f.saved().rows[0].state,'OUTCOME_UNKNOWN');safe(result);
});
test('post-send original authority revocation suppresses a valid private derivative',async t=>{
 const f=providerFixture();await f.reserve();const calls=wire(t,f,{onResponse:()=>{f.grants.get(f.input.bundle.request.operationId).authorized=false;}});
 const result=await f.runner().run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(calls.length,1);assert.equal(f.saved().rows[0].state,'DISPATCHED');safe(result);
});
test('send-fence COMMIT acknowledgement loss after initiation never replays and retains unknown spend',async t=>{
 let publisherCommits=0;const f=providerFixture({after:({role,sql})=>{if(role==='publisher'&&sql==='COMMIT'&&++publisherCommits===2)throw Error('SYNTHETIC fence lost ack');}});
 await f.reserve();const calls=wire(t,f);const result=await f.runner().run(f.input);assert.equal(result.decision,'outcome_unknown');assert.equal(calls.length,1);assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal(f.released.some(r=>r.role==='publisher'&&r.discard),true);
});

test('current route rebinding after DISPATCHED commit cannot send the earlier profile',async t=>{
 let armed=false;const f=providerFixture({after:({role,sql})=>{if(armed&&role==='ledger'&&sql==='COMMIT'){armed=false;f.routeRow.facts.route.model='SYNTHETIC-CHANGED';f.routeRow.facts.book.route.model='SYNTHETIC-CHANGED';}}});
 await f.reserve();armed=true;const calls=wire(t,f);const result=await f.runner().run(f.input);
 assert.equal(calls.length,0);assert.equal(result.decision,'outcome_unknown');assert.equal(f.saved().rows[0].reservationMicros,700);
});
test('late response revalidation COMMIT acknowledgement cannot expose an expired derivative',async t=>{
 let commits=0;const f=providerFixture({after:async({role,sql})=>{if(role==='publisher'&&sql==='COMMIT'&&++commits===3)await new Promise(r=>setTimeout(r,1100));}});
 await f.reserve();const calls=wire(t,f);const result=await f.runner().run(f.input);
 assert.equal(calls.length,1);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);
});

test('disposal while original DISPATCHED acknowledgement is delayed cannot start and cannot refund',async t=>{
 let armed=false,entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const f=providerFixture({after:async({role,sql})=>{if(armed&&role==='ledger'&&sql==='COMMIT'){armed=false;entered();await gate;}}});
 await f.reserve();armed=true;const calls=wire(t,f),runner=f.runner();const pending=runner.run(f.input);await waiting;
 assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(calls.length,0);runner.dispose();release();
 const result=await pending;assert.equal(result.decision,'outcome_unknown');assert.equal(calls.length,0);assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');
});
test('database clock rollback after physical send cannot expose the response',async t=>{
 const f=providerFixture();await f.reserve();const calls=wire(t,f,{onResponse:()=>f.setClock(f.now-1)});
 const result=await f.runner().run(f.input);assert.equal(calls.length,1);assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);
});

test('rollback within grant validity but before durable DISPATCHED watermark suppresses derivative',async t=>{
 const f=providerFixture();await f.reserve();f.setClock(f.now+5000);
 const calls=wire(t,f,{onResponse:()=>f.setClock(f.now+4000)}),result=await f.runner().run(f.input);
 assert.equal(calls.length,1);assert.equal(f.saved().lastNow,f.now+5000);
 assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(f.saved().rows[0].reservationMicros,700);
});
test('exact reserved input is accepted; one token over it stops this runner and retains the original hold',async t=>{
 for(const stream of [false,true])for(const inputTokens of [100,101]){
  const f=providerFixture();f.input.stream=stream;await f.reserve();
  const body=stream?sseCompletion().replace('"prompt_tokens":100','"prompt_tokens":'+inputTokens).replace('"total_tokens":120','"total_tokens":'+(inputTokens+20)):
   JSON.stringify(completion({usage:{...completion().usage,prompt_tokens:inputTokens,total_tokens:inputTokens+20}}));
  const calls=wire(t,f,{body,headers:{'content-type':stream?'text/event-stream':'application/json'}}),runner=f.runner();
  const result=await runner.run(f.input);assert.equal(calls.length,1);assert.equal(f.saved().rows[0].reservationMicros,700);
  if(inputTokens===100){assert.equal(result.decision,'response_received');assert.equal(result.usage.neutral.inputTokens,100);}
  else{
   assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'PROVIDER_USAGE_OVER_CAP');assert.equal(result.value,undefined);
   assert.equal(f.saved().rows[0].state,'OUTCOME_UNKNOWN');assert.equal((await runner.run(f.input)).reason,'PROVIDER_STOPPED');assert.equal(calls.length,1);
   assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');
  }
  t.mock.restoreAll();
 }
});
test('revocation after final read-only COMMIT linearization does not retract an already authorized derivative',async t=>{
 let commits=0;const f=providerFixture({after:async({role,sql})=>{
  if(role==='publisher'&&sql==='COMMIT'&&++commits===3){
   // Model a real server COMMIT releasing final SHARE locks before its ACK:
   // revocation linearizes afterward. Delivery remains authorized by that
   // committed fence; the consumer must still apply its own revision/CAS gate.
   f.grants.get(f.input.bundle.request.operationId).authorized=false;
   await new Promise(r=>setTimeout(r,20));
  }
 }});
 await f.reserve();const calls=wire(t,f),result=await f.runner().run(f.input);
 assert.equal(calls.length,1);assert.equal(result.decision,'response_received');assert.deepEqual({...result.value},{action:'KEEP'});
});
