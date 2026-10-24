import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {serviceFixture} from './harness/qwen-client-service-fixture.mjs';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData,qwenFoundationResponse} from '../core/ai-usage/qwen-qualified-request.js';
import {createClientDeclarationTransport} from '../core/ai-usage/client-declaration-transport.js';
import {createClientReservationTransport} from '../core/ai-usage/client-reservation-transport.js';
import {createClientProviderTransport} from '../core/ai-usage/client-provider-transport.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';
import {quoteRequestBound} from '../core/ai-usage/ratebook.js';
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false},proofs={principalToken:'synthetic-principal',entitlementToken:'synthetic-entitlement'};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const clean=value=>{assert.doesNotMatch(JSON.stringify(value),/SYNTHETIC_PRIVATE_PAYLOAD|"envelope"|"payload"|"body"/);assert.equal(value.dispatchAllowed,false);};
async function fixture({create=createQwenQualifiedRequestOwner}={}){
 const f=await serviceFixture('AI_ORGANIZE'),source=new AbortController(),session=new AbortController(),seen={charges:[],fresh:0,envelopes:[],auth:[],requests:[]};let live=true;
 const hooks={};
 const preparedContent={isCurrent:()=>live,chargeRetainedBytes:n=>{seen.charges.push(n);if(hooks.charge)return hooks.charge(n);},assertMaterialCurrent:()=>{seen.fresh++;return hooks.fresh?.();}};
 const owner=create({...f.callbacks,preparedContent,authorizePayload:q=>{assert.deepEqual(Object.keys(q).sort(),['childIdentity','payloadDigest','reservationRequest']);seen.auth.push(q);return f.callbacks.authorizePayload(q);},tokenize:q=>{seen.envelopes.push(q);return f.callbacks.tokenize(q);}});
 const fetch=async req=>{
  const data=await req.json(),path=new URL(req.url).pathname;seen.requests.push({path,data});
  if(path==='/api/declarations'){
   const result={decision:data.action==='publish'?'published':'revoked',requestHash:data.declaration.requestHash,generation:await hashText(canonical(data.declaration)),issuedAt:150,expiresAt:data.declaration.expiresAt,...flags};return hooks.publication?hooks.publication(data,result):Response.json(result);
  }
  if(path==='/api/reservations'){
   if(hooks.reserve)return hooks.reserve(data);
   const row=data.action==='reserve'?await f.ledger.reserve(data.request):await f.ledger.record(data.request,'CANCELLED_BEFORE_DISPATCH');return Response.json({decision:data.action==='reserve'?'reserved':'cancelled',...row,...flags});
  }
  if(path==='/api/provider'){
   if(hooks.provider)await hooks.provider(data);
   return Response.json({decision:'response_received',value:{action:'KEEP'},domainValidity:'NOT_EVALUATED',reservation:'SETTLED',checkedAt:160,financialSettlement:{state:'SETTLED',receiptId:'synthetic-settlement',outcome:'VALIDATED',settledSpendMicros:120,effectiveResults:0},resultFinalization:'PENDING_DOMAIN_PROOF',...flags});
  }
  throw Error('Unexpected synthetic transport');
 };
 const declaration=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch}),reservation=createClientReservationTransport({endpoint:'https://synthetic.invalid/api/reservations',fetch}),transport=createClientProviderTransport({endpoint:'https://synthetic.invalid/api/provider',fetch});
 const prepare=()=>owner.prepareWireControls({childIdentity:f.input.childIdentity,outputCap:f.input.reservationRequest.outputCap,stream:false});
 const capture=h=>owner.capturePreparedWire(h,f.input.payload,{signal:source.signal,sessionSignal:session.signal,expiresAt:750});
 const measure=async()=>{const h=await prepare();assert.equal(h.status,'CONTROLS_PREPARED');assert.equal(capture(h).status,'CAPTURED');const m=await owner.finishPreparedMeasurement(h);assert.equal(m.status,'MEASURED',m.reason);return {h,m};};
 const stage=async()=>{const {h,m}=await measure(),d=await owner.declarePrepared(h,f.input.reservationRequest);assert.equal(d.status,'DECLARED_LOCAL',d.reason);return {h,m,d};};
 const bind=async()=>{const p=await stage();assert.equal((await owner.publishDeclaration(p.d,proofs,declaration)).status,'PUBLISHED_CLIENT_DECLARATION');assert.equal((await owner.reserveDeclaration(p.d,reservation)).status,'RESERVED_SERVICE');const b=await owner.bindPrepared(p.h);assert.equal(b.status,'BOUND_LOCAL',b.reason);const provider=owner.foundationProvider(b,transport);assert.ok(provider);return {...p,b,provider};};
 return {...f,ownerHooks:f.hooks,owner,source,session,seen,hooks,prepare,capture,measure,stage,bind,declaration,reservation,transport,setLive:x=>live=x};
}

test('prepared wire is constructed/charged/measured once, with body-free handles and exact legacy wire bytes',async()=>{
 const f=await fixture(),legacy=createQwenQualifiedRequestOwner(f.callbacks);await f.ledger.reserve(f.input.reservationRequest);const old=await legacy.bind(f.input);assert.equal(old.status,'BOUND_LOCAL');
 const before=f.calls.tokenizer,{h,m,d}=await f.stage();assert.equal(f.calls.tokenizer-before,1);assert.equal(f.seen.fresh,1);assert.equal(f.seen.charges.length,1);assert.equal(f.seen.charges[0],new TextEncoder().encode(old.envelope.body).length);
 assert.deepEqual(f.seen.envelopes[0].envelope,old.envelope);assert.equal(m.payloadDigest,old.identity.payloadDigest);assert.equal(m.requestDigest,old.identity.requestDigest);assert.equal(m.inputTokens,100);assert.equal(m.maxCompletionTokens,500);assert.equal(m.outputCap,600);
 for(const value of [h,m,d,await f.owner.finishPreparedMeasurement(h)])clean(value);
 const beforeBind=f.calls.tokenizer,reads=f.calls.reservation,b=await f.owner.bindPrepared(h);assert.equal(b.status,'BOUND_LOCAL',b.reason);clean(b);assert.equal(f.calls.reservation-reads,2);assert.equal(f.calls.tokenizer,beforeBind);assert.equal(f.seen.charges.length,1);assert.equal((await f.owner.revalidate(b)).status,'CURRENT_LOCAL');assert.equal(f.calls.tokenizer,beforeBind);
 f.owner.dispose();legacy.dispose();
});
test('capture is synchronous, descriptor-safe, privately branded and cannot be repeated or rebound',async()=>{
 const f=await fixture(),h=await f.prepare();let reads=0;const payload={get text(){reads++;return 'secret';}};
 assert.equal(f.owner.capturePreparedWire(structuredClone(h),payload,{signal:f.source.signal,expiresAt:750}).status,'UNAVAILABLE');assert.equal(reads,0);
 const out=f.capture(h);assert.equal(typeof out.then,'undefined');assert.equal(out.status,'CAPTURED');assert.equal(f.capture(h).status,'UNAVAILABLE');assert.equal((await f.owner.finishPreparedMeasurement(h)).status,'UNAVAILABLE');assert.equal(f.seen.charges.length,1);assert.equal(f.calls.tokenizer,0);assert.equal((await f.prepare()).status,'UNAVAILABLE');
 const g=await fixture(),second=await g.prepare();assert.equal(g.owner.capturePreparedWire(second,payload,{signal:g.source.signal,expiresAt:750}).status,'UNAVAILABLE');assert.equal(reads,0);assert.equal(g.seen.charges.length,0);
 f.owner.dispose();g.owner.dispose();
});
test('fresh original material admission immediately precedes the only tokenizer call',async()=>{
 const f=await fixture(),gate=deferred(),entered=deferred(),h=await f.prepare();f.capture(h);f.hooks.fresh=()=>{entered.resolve();return gate.promise;};const pending=f.owner.finishPreparedMeasurement(h);await entered.promise;assert.equal(f.calls.tokenizer,0);f.setLive(false);gate.resolve();assert.equal((await pending).status,'UNAVAILABLE');assert.equal(f.calls.tokenizer,0);f.owner.dispose();
});
test('source/session abort, deadline, owner/profile disposal and held tokenizer never resurrect capture',async()=>{
 for(const retire of [f=>f.source.abort(),f=>f.session.abort(),f=>f.setNow(750),f=>f.owner.dispose(),f=>f.owner.revoke('fixture-profile')]){
  const f=await fixture(),held=deferred(),entered=deferred(),h=await f.prepare();f.capture(h);
  f.hooks.fresh=()=>{entered.resolve();return held.promise;};const pending=f.owner.finishPreparedMeasurement(h);await entered.promise;retire(f);held.resolve();assert.equal((await pending).status,'UNAVAILABLE');assert.equal(f.calls.tokenizer,0);assert.equal(f.capture(h).status,'UNAVAILABLE');f.owner.dispose();
 }
 const f=await fixture(),entered=deferred(),held=deferred(),h=await f.prepare();f.capture(h);
 f.ownerHooks.tokenizer=async q=>{entered.resolve();await held.promise;return {profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800};};
 const pending=f.owner.finishPreparedMeasurement(h);await entered.promise;assert.equal(f.calls.tokenizer,1);f.source.abort();held.resolve();assert.equal((await pending).status,'UNAVAILABLE');assert.equal((await f.owner.finishPreparedMeasurement(h)).status,'UNAVAILABLE');assert.equal(f.calls.tokenizer,1);f.owner.dispose();
});
test('input beyond original bound fails after one measurement and before any declaration/reservation',async()=>{
 const f=await fixture(),h=await f.prepare();f.capture(h);
 f.ownerHooks.tokenizer=q=>({profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:15981,protocolOverheadTokens:20,inputTokens:16001,expiresAt:800});
 const measured=await f.owner.finishPreparedMeasurement(h);assert.equal(measured.status,'UNAVAILABLE');assert.equal(measured.reason,'REQUEST_BOUND');assert.equal((await f.owner.declarePrepared(h,f.input.reservationRequest)).status,'UNAVAILABLE');
 assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.requests.length,0);assert.equal(f.rows().length,0);f.owner.dispose();
});
test('bind performs two original financial observations and no body/compiler/tokenizer access',async()=>{
 const f=await fixture(),{h,d}=await f.stage();await f.owner.publishDeclaration(d,proofs,f.declaration);await f.owner.reserveDeclaration(d,f.reservation);
 const count=f.calls.tokenizer;
 const body=f.input.payload;Object.defineProperty(body.evidence[0],'text',{get(){throw Error('payload reread');}});
 const b=await f.owner.bindPrepared(h);assert.equal(b.status,'BOUND_LOCAL',b.reason);assert.equal(f.calls.reservation,2);assert.equal(f.calls.tokenizer,count);clean(b);assert.equal((await f.owner.revalidate(b)).status,'CURRENT_LOCAL');f.owner.dispose();
});
test('prepared provider transfers once, claims before await and preserves bound payload digest provenance',async()=>{
 const f=await fixture(),{provider,b}=await f.bind(),gate=deferred(),entered=deferred();assert.equal(f.owner.foundationProvider(b,f.transport),provider);
 f.hooks.fresh=()=>{entered.resolve();return gate.promise;};const first=provider.execute(f.input.childIdentity);await entered.promise;assert.deepEqual(await provider.execute(f.input.childIdentity),{accepted:false});assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,0);gate.resolve();const result=await first;
 assert.equal(result.accepted,true);assert.equal(qwenFoundationProviderData(provider).payloadDigest,b.identity.payloadDigest);assert.ok(qwenFoundationResponse(provider,result));assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,1);assert.deepEqual(f.seen.requests.find(r=>r.path==='/api/provider').data.payload,f.input.payload);assert.equal(qwenFoundationProviderData(provider).contentCurrent(),true);f.owner.dispose();
});
test('Foundation signal abort while preparse current is held prevents parsing and transport',async()=>{
 const f=await fixture(),{provider}=await f.bind(),gate=deferred(),entered=deferred(),execution=new AbortController();f.hooks.fresh=()=>{entered.resolve();return gate.promise;};
 const pending=provider.execute(f.input.childIdentity,{signal:execution.signal});await entered.promise;execution.abort();gate.resolve();assert.equal((await pending).accepted,false);assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,0);assert.throws(()=>qwenFoundationProviderData(provider).current());f.owner.dispose();
});
test('Foundation signal remains a denial in the existing before-fetch current fence',async()=>{
 const f=await fixture(),{h,d}=await f.stage();await f.owner.publishDeclaration(d,proofs,f.declaration);await f.owner.reserveDeclaration(d,f.reservation);const bound=await f.owner.bindPrepared(h),entered=deferred(),gate=deferred(),execution=new AbortController();let sends=0,provider;
 const transport=createClientProviderTransport({endpoint:'https://synthetic.invalid/api/provider',fetch:async()=>{entered.resolve();await gate.promise;qwenFoundationProviderData(provider).current();sends++;throw Error('not reached');}});provider=f.owner.foundationProvider(bound,transport);
 const pending=provider.execute(f.input.childIdentity,{signal:execution.signal});await entered.promise;execution.abort();gate.resolve();assert.equal((await pending).accepted,false);assert.equal(sends,0);f.owner.dispose();
});
test('unknown publication/reservation permanently retires content and does not replay',async()=>{
 for(const boundary of ['publication','reserve']){
  const f=await fixture(),{h,d}=await f.stage();f.hooks[boundary]=()=>{throw Error('lost acknowledgement');};
  const pub=await f.owner.publishDeclaration(d,proofs,f.declaration);
  if(boundary==='reserve'){assert.equal(pub.status,'PUBLISHED_CLIENT_DECLARATION');assert.equal((await f.owner.reserveDeclaration(d,f.reservation)).status,'RESERVATION_UNKNOWN');}else assert.equal(pub.status,'PUBLICATION_UNKNOWN');
  assert.equal((await f.owner.bindPrepared(h)).status,'UNAVAILABLE');assert.equal(f.capture(h).status,'UNAVAILABLE');assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,0);f.owner.dispose();
 }
});

// Test-only source instrumentation exposes the one clearable cell, not a runtime
// diagnostics API. Relative dependencies resolve to the unchanged actual owners.
async function instrumented(){
 const url=new URL('../core/ai-usage/qwen-qualified-request.js',import.meta.url),source=await readFile(url,'utf8');
 const code=('export const testCells=[];\n'+source).replace(/from '(\.[^']+)'/g,(_all,path)=>`from '${new URL(path,url).href}'`).replace('preparedHandles.set(handle,s);','testCells.push(s.cell);preparedHandles.set(handle,s);');
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
test('deterministic private cell is null after abort/disposal and remains null after held digest completion',async()=>{
 const module=await instrumented(),f=await fixture({create:module.createQwenQualifiedRequestOwner}),h=await f.prepare(),old=crypto.subtle.digest,gate=deferred();let calls=0;
 crypto.subtle.digest=function(...args){calls++;return gate.promise.then(()=>old.apply(this,args));};
 try{f.capture(h);assert.equal(calls,2);const cell=module.testCells.at(-1);assert.match(cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);f.source.abort();assert.equal(cell.body,null);gate.resolve();const out=await f.owner.finishPreparedMeasurement(h);assert.equal(out.status,'UNAVAILABLE');await new Promise(resolve=>setImmediate(resolve));assert.equal(cell.body,null);assert.equal(f.calls.tokenizer,0);clean(h);clean(out);}
 finally{crypto.subtle.digest=old;f.owner.dispose();}
});

test('held Foundation execution uses captured native signal getter and EventTarget methods',async()=>{
 const f=await fixture(),{provider}=await f.bind(),gate=deferred(),entered=deferred(),execution=new AbortController(),descriptor=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted'),add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;let reads=0;
 f.hooks.fresh=()=>{entered.resolve();return gate.promise;};
 try{
  Object.defineProperty(AbortSignal.prototype,'aborted',{...descriptor,get(){reads++;return false;}});
  EventTarget.prototype.addEventListener=()=>{throw Error('replaced add');};EventTarget.prototype.removeEventListener=()=>{throw Error('replaced remove');};
  const pending=provider.execute(f.input.childIdentity,{signal:execution.signal});await entered.promise;execution.abort();gate.resolve();assert.equal((await pending).accepted,false);assert.equal(reads,0);assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,0);
 }finally{Object.defineProperty(AbortSignal.prototype,'aborted',descriptor);EventTarget.prototype.addEventListener=add;EventTarget.prototype.removeEventListener=remove;gate.resolve();f.owner.dispose();}
});

test('prepared metadata authorizations and financial rows reject changed originals at each observation',async()=>{
 for(const boundary of ['first-status','second-status','auth','profile','identity-digest']){
  const f=await fixture(),{h,d}=await f.stage();await f.owner.publishDeclaration(d,proofs,f.declaration);await f.owner.reserveDeclaration(d,f.reservation);let reached=0;const originalDigest=crypto.subtle.digest;
  if(boundary.endsWith('status'))f.ownerHooks.reservation=()=>{reached++;const row=f.rows()[0];if(reached===(boundary==='first-status'?1:2))row.request.principalId='different-principal';return row;};
  if(boundary==='auth')f.ownerHooks.auth=q=>{reached++;return {authorizationId:'different-authorization',childIdentity:q.childIdentity,reservationRequest:q.reservationRequest,payloadDigest:q.payloadDigest,expiresAt:900};};
  if(boundary==='profile')f.ownerHooks.profile=()=>{reached++;const m=structuredClone(f.manifest);m.wire.instructions='Changed instructions';return m;};
  if(boundary==='identity-digest')crypto.subtle.digest=async function(algorithm,bytes){const result=await originalDigest.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes).includes('authorizationExpiresAt')){reached++;f.source.abort();}return result;};
  try{const result=await f.owner.bindPrepared(h);assert.equal(result.status,'UNAVAILABLE',boundary);assert.ok(reached>0,boundary);assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.requests.filter(r=>r.path==='/api/provider').length,0);assert.equal(f.rows()[0].state,'RESERVED');assert.equal(f.capture(h).status,'UNAVAILABLE');}
  finally{crypto.subtle.digest=originalDigest;f.owner.dispose();}
 }
});
test('prepared tokenizer metadata rejects every original wire/count/expiry mismatch',async()=>{
 for(const patch of [{profileId:'other'},{tokenizerProfileId:'other'},{qualificationRef:'other'},{requestDigest:'a'.repeat(64)},{contentTokens:81},{protocolOverheadTokens:19},{inputTokens:99},{expiresAt:150},{expiresAt:1001},{inputBoundQualified:true}]){
  const f=await fixture(),h=await f.prepare();f.capture(h);f.ownerHooks.tokenizer=q=>({...{profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800},...patch});const out=await f.owner.finishPreparedMeasurement(h);assert.equal(out.status,'UNAVAILABLE');assert.equal(out.reason,'TOKENIZER_BINDING_MISMATCH');assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.auth.length,0);assert.equal(f.seen.requests.length,0);f.owner.dispose();
 }
});
test('prepared reservation identity dimensions are all compared before metadata authorization',async()=>{
 for(const patch of [{operationId:'other'},{jobId:'other'},{jobType:'AI_ASSIST'},{contractVersion:'other'},{routeVersion:'other'},{childIndex:1},{childCount:5},{inputTokens:101},{outputCap:601},{maxCompletionTokens:501}]){
  const f=await fixture(),{h}=await f.measure(),r={...f.input.reservationRequest,...patch};const out=await f.owner.declarePrepared(h,r);assert.equal(out.status,'UNAVAILABLE');assert.equal(f.seen.auth.length,0);assert.equal(f.calls.reservation,0);assert.equal(f.seen.requests.length,0);f.owner.dispose();
 }
});
test('charge denial, hostile lifecycle and exact payload/wire bounds fail before retained measurement',async()=>{
 for(const change of [f=>{f.hooks.charge=()=>false;},f=>{f.hooks.charge=()=>Promise.resolve(true);},f=>{f.hooks.charge=()=>{throw Error('ledger exhausted');};},f=>{f.input.payload.evidence[0].text='X'.repeat(49153);},f=>{f.manifest.tokenizer.maxWireBytes=30;}]){
  const f=await fixture();change(f);const h=await f.prepare();assert.equal(h.status,'CONTROLS_PREPARED');assert.equal(f.capture(h).status,'UNAVAILABLE');assert.equal((await f.owner.finishPreparedMeasurement(h)).status,'UNAVAILABLE');assert.equal(f.calls.tokenizer,0);f.owner.dispose();
 }
 for(const lifecycle of [{signal:{aborted:false},expiresAt:750},{signal:new AbortController().signal,expiresAt:150},{signal:new AbortController().signal,expiresAt:750,extra:true}]){
  const f=await fixture(),h=await f.prepare();assert.equal(f.owner.capturePreparedWire(h,f.input.payload,lifecycle).status,'UNAVAILABLE');assert.equal(f.seen.charges.length,0);assert.equal(f.calls.tokenizer,0);f.owner.dispose();
 }
});
test('retired controls and foreign owners never obtain a second body or tokenizer use',async()=>{
 const f=await fixture(),g=await fixture(),h=await f.prepare();assert.equal(g.capture(h).status,'UNAVAILABLE');assert.equal(g.seen.charges.length,0);assert.equal(f.capture(h).status,'CAPTURED');
 const [a,b]=await Promise.all([f.owner.finishPreparedMeasurement(h),f.owner.finishPreparedMeasurement(h)]);assert.equal(a.status,'MEASURED');assert.deepEqual(a,b);assert.equal(f.calls.tokenizer,1);f.owner.dispose();assert.equal((await f.owner.finishPreparedMeasurement(h)).status,'UNAVAILABLE');assert.equal(f.capture(h).status,'UNAVAILABLE');g.owner.dispose();
});
test('prepared profile refresh does not rehash/recompile the schema and no body follows the final financial fence',async()=>{
 const f=await fixture(),{h,d}=await f.stage();await f.owner.publishDeclaration(d,proofs,f.declaration);await f.owner.reserveDeclaration(d,f.reservation);const original=crypto.subtle.digest;let schemaDigests=0,payloadDigests=0;
 crypto.subtle.digest=function(algorithm,bytes){const text=new TextDecoder().decode(bytes);if(text===canonical(f.manifest.wire.responseFormat.json_schema.schema))schemaDigests++;if(text.includes('SYNTHETIC_PRIVATE_PAYLOAD'))payloadDigests++;return original.call(this,algorithm,bytes);};
 try{const b=await f.owner.bindPrepared(h);assert.equal(b.status,'BOUND_LOCAL');assert.equal((await f.owner.revalidate(b)).status,'CURRENT_LOCAL');assert.equal(schemaDigests,0);assert.equal(payloadDigests,0);assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.envelopes.length,1);}
 finally{crypto.subtle.digest=original;f.owner.dispose();}
});
test('private cell clears before transport await and metadata-only completion cannot recreate it',async()=>{
 const module=await instrumented(),f=await fixture({create:module.createQwenQualifiedRequestOwner}),{provider,h,b}=await f.bind(),entered=deferred(),gate=deferred();f.hooks.provider=()=>{entered.resolve();return gate.promise;};const cell=module.testCells.at(-1);assert.match(cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);
 const pending=provider.execute(f.input.childIdentity);await entered.promise;assert.equal(cell.body,null);gate.resolve();assert.equal((await pending).accepted,true);assert.equal(cell.body,null);assert.equal((await f.owner.revalidate(b)).status,'CURRENT_LOCAL');assert.equal(cell.body,null);clean(await f.owner.finishPreparedMeasurement(h));f.owner.dispose();assert.equal(cell.body,null);
});

test('private cell clears on tokenizer, authorization and financial failure before terminal metadata resolves',async()=>{
 for(const boundary of ['tokenizer','authorization','financial']){
  const module=await instrumented(),f=await fixture({create:module.createQwenQualifiedRequestOwner}),h=await f.prepare();f.capture(h);const cell=module.testCells.at(-1);assert.notEqual(cell.body,null);let result;
  if(boundary==='tokenizer'){f.ownerHooks.tokenizer=()=>{throw Error('tokenizer failure');};result=await f.owner.finishPreparedMeasurement(h);}
  else{
   assert.equal((await f.owner.finishPreparedMeasurement(h)).status,'MEASURED');
   if(boundary==='authorization'){f.ownerHooks.auth=()=>null;result=await f.owner.declarePrepared(h,f.input.reservationRequest);}
   else{const d=await f.owner.declarePrepared(h,f.input.reservationRequest);await f.owner.publishDeclaration(d,proofs,f.declaration);await f.owner.reserveDeclaration(d,f.reservation);f.mutateRow(row=>{row.state='OUTCOME_UNKNOWN';});result=await f.owner.bindPrepared(h);}
  }
  assert.equal(result.status,'UNAVAILABLE',boundary);assert.equal(cell.body,null,boundary);clean(result);assert.equal(f.capture(h).status,'UNAVAILABLE');assert.equal(cell.body,null);f.owner.dispose();
 }
});
test('held original tokenizer cannot restore the private cell after owner disposal',async()=>{
 const module=await instrumented(),f=await fixture({create:module.createQwenQualifiedRequestOwner}),h=await f.prepare(),entered=deferred(),gate=deferred();f.capture(h);const cell=module.testCells.at(-1);
 f.ownerHooks.tokenizer=async q=>{entered.resolve();await gate.promise;return {profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800};};
 const pending=f.owner.finishPreparedMeasurement(h);await entered.promise;assert.notEqual(cell.body,null);f.owner.dispose();assert.equal(cell.body,null);gate.resolve();const out=await pending;assert.equal(out.status,'UNAVAILABLE');assert.equal(cell.body,null);clean(out);assert.equal(f.calls.tokenizer,1);assert.equal(f.seen.requests.length,0);
});

// Install a synthetic manifest into a separate graph of the actual source
// owner, preserving its original capability, counter and measurement brands.
let sourceFixtureHelpers=null,sourceFixtureSerial=0;
async function installedPreparedFixture(){
 if(!sourceFixtureHelpers){
  const url=new URL('./qwen-source-profile.test.mjs',import.meta.url);let code=(await readFile(url,'utf8')).split("test('real source installation")[0].replaceAll("'AI_ASSIST'","'AI_ORGANIZE'");
  code=code.replace(/^import .*$/gm,line=>line.replace(/from '(\.\.?\/[^']+)'/g,(_all,path)=>'from '+JSON.stringify(new URL(path,url).href))).replaceAll('import.meta.url',JSON.stringify(url.href));code+='\nexport {fixture,isolated};';
  sourceFixtureHelpers=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 }
 const entry=await sourceFixtureHelpers.fixture(),scope=await sourceFixtureHelpers.isolated([entry]),api=scope.api,cap=await api.loadInstalledQwenSourceProfile(entry.id);assert.ok(cap);
 const url=new URL('../core/ai-usage/qwen-qualified-request.js',import.meta.url);let code=await readFile(url,'utf8');
 code=('export const testStates=[];\n'+code).replace(/from '(\.[^']+)'/g,(_all,path)=>'from '+JSON.stringify(path==='./qwen-source-profile.js'?scope.url:new URL(path,url).href)).replace('preparedHandles.set(handle,s);','testStates.push(s);preparedHandles.set(handle,s);');code+='\n// source prepared '+sourceFixtureSerial++;
 const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')),action=new AbortController(),session=new AbortController(),hooks={},calls={fresh:0,tokenizer:0,charges:0};
 const manifest=api.installedQwenSourceManifest(cap);let authorization=null,measurement=null,row=null;calls.provider=0;
 const owner=module.createQwenQualifiedRequestOwner({clock:Date.now,resolveProfile:async()=>api.installedQwenSourceManifest(cap),authorizePayload:async q=>(authorization={authorizationId:'source-authorization',childIdentity:q.childIdentity,reservationRequest:q.reservationRequest,payloadDigest:q.payloadDigest,expiresAt:entry.qualification.expiresAt}),readReservation:async()=>row,readCurrentBinding:()=>({now:Date.now(),profile:manifest,authorization,tokenizer:measurement,reservation:row}),tokenize:q=>{calls.tokenizer++;const pending=api.measureInstalledQwenRequest(cap,q).then(value=>{measurement=value;return value;});return hooks.tokenizer?hooks.tokenizer(pending):pending;},preparedContent:{assertMaterialCurrent:()=>{calls.fresh++;return hooks.fresh?.();},isCurrent:()=>true,chargeRetainedBytes:()=>{calls.charges++;}}});
 const h=await owner.prepareWireControls({childIdentity:{logicalJobId:'job',childOperationId:'child',type:'AI_ORGANIZE',contractVersion:'contract',routeVersion:'route',automaticRetries:0},outputCap:600,stream:false});assert.equal(h.status,'CONTROLS_PREPARED',h.reason);
 const state=module.testStates.at(-1),sourceSignal=api.installedQwenSourceRetirementSignal(cap),capture=()=>owner.capturePreparedWire(h,{text:'SYNTHETIC_PRIVATE_PAYLOAD'},{signal:action.signal,sessionSignal:session.signal,expiresAt:Date.now()+30000}),dispose=()=>{owner.dispose();api.retireInstalledQwenSourceProfile(entry.id);};
 const request=m=>({operationId:'child',jobId:'job',principalId:'principal',libraryId:'library',scopeFingerprint:'scope',contractVersion:'contract',routeVersion:'route',consentEpoch:'consent',jobType:'AI_ORGANIZE',childIndex:0,childCount:1,inputTokens:m.inputTokens,outputCap:m.outputCap,maxCompletionTokens:m.maxCompletionTokens});
 const fetch=async req=>{
  const data=await req.json(),path=new URL(req.url).pathname;
  if(path==='/api/declarations')return Response.json({decision:data.action==='publish'?'published':'revoked',requestHash:data.declaration.requestHash,generation:await hashText(canonical(data.declaration)),issuedAt:Date.now(),expiresAt:data.declaration.expiresAt,...flags});
  if(path==='/api/reservations'){
   if(data.action==='reserve'){
    const now=Date.now(),book={route:manifest.route,rates:{standardInput:1000000,cachedReadInput:500000,cacheCreateInput:2000000,completion:1000000},effectiveAt:entry.qualification.verifiedAt,verifiedAt:entry.qualification.verifiedAt,expiresAt:entry.qualification.expiresAt,source:'ISOLATED_TEST_NOT_COMMERCIAL',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}},pricing={book,route:manifest.route,fx:null,now},quote=quoteRequestBound({...pricing,inputTokens:data.request.inputTokens,billableOutputCap:data.request.outputCap});
    row=JSON.parse(JSON.stringify({request:data.request,state:'RESERVED',reservedAt:now,reservationMicros:quote.usdReservationMicros,quote,pricing}));
   }else row.state='CANCELLED_BEFORE_DISPATCH';
   return Response.json({decision:data.action==='reserve'?'reserved':'cancelled',operationId:data.request.operationId,state:row.state,reservationMicros:row.reservationMicros,...flags});
  }
  if(path==='/api/provider'){calls.provider++;throw Error('No source-retirement test may send provider content');}
  throw Error('Unexpected source test route');
 };
 const declaration=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch}),reservation=createClientReservationTransport({endpoint:'https://synthetic.invalid/api/reservations',fetch}),transport=createClientProviderTransport({endpoint:'https://synthetic.invalid/api/provider',fetch});
 const bind=async()=>{assert.equal(capture().status,'CAPTURED');const m=await owner.finishPreparedMeasurement(h);assert.equal(m.status,'MEASURED');const r=request(m),d=await owner.declarePrepared(h,r);assert.equal(d.status,'DECLARED_LOCAL',d.reason);assert.equal((await owner.publishDeclaration(d,proofs,declaration)).status,'PUBLISHED_CLIENT_DECLARATION');assert.equal((await owner.reserveDeclaration(d,reservation)).status,'RESERVED_SERVICE');const b=await owner.bindPrepared(h);assert.equal(b.status,'BOUND_LOCAL',b.reason);const provider=owner.foundationProvider(b,transport);assert.ok(provider);return {m,r,d,b,provider};};
 return {entry,api,cap,owner,h,state,sourceSignal,action,session,hooks,calls,capture,dispose,request,bind,transport};
}
test('installed source retirement eagerly clears settled captured wire without another owner call',async()=>{
 const f=await installedPreparedFixture();assert.deepEqual(f.state.signals,[f.sourceSignal]);assert.equal(f.capture().status,'CAPTURED');assert.deepEqual(f.state.signals,[f.sourceSignal,f.action.signal,f.session.signal]);assert.equal((await f.state.digestPromise).status,'CAPTURED');assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);
 assert.equal(f.api.retireInstalledQwenSourceProfile(f.entry.id),true);assert.equal(f.state.cell.body,null,'source retirement itself, not a later currentness call, clears the cell');assert.equal(f.state.retired,true);assert.equal(f.state.timer,null);assert.deepEqual(f.state.signals,[]);assert.equal(f.action.signal.aborted,false);assert.equal(f.session.signal.aborted,false);assert.equal(f.calls.tokenizer,0);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.state.cell.body,null);assert.equal((await f.owner.finishPreparedMeasurement(f.h)).status,'UNAVAILABLE');f.dispose();
});
test('source listener is installed before capture and cannot authorize later payload access',async()=>{
 const f=await installedPreparedFixture();assert.deepEqual(f.state.signals,[f.sourceSignal]);f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.retired,true);let reads=0;
 const out=f.owner.capturePreparedWire(f.h,{get text(){reads++;return 'must not read';}},{signal:f.action.signal,expiresAt:Date.now()+30000});assert.equal(out.status,'UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.charges,0);assert.equal(f.calls.tokenizer,0);f.dispose();
});
test('installed source retirement clears cell during held digest and late digests cannot restore it',async()=>{
 const f=await installedPreparedFixture(),gate=deferred(),original=crypto.subtle.digest;let digests=0,settled=false;
 try{
  crypto.subtle.digest=function(...args){digests++;return original.apply(this,args).then(bytes=>gate.promise.then(()=>bytes));};assert.equal(f.capture().status,'CAPTURED');assert.equal(digests,2);const pending=f.owner.finishPreparedMeasurement(f.h).then(result=>{settled=true;return result;});
  f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.cell.body,null);assert.equal(settled,false);assert.deepEqual(f.state.signals,[]);gate.resolve();const out=await pending;assert.equal(out.status,'UNAVAILABLE');assert.equal(f.state.cell.body,null);assert.equal(f.calls.fresh,0);assert.equal(f.calls.tokenizer,0);clean(out);
 }finally{crypto.subtle.digest=original;gate.resolve();f.dispose();}
});
test('installed source retirement clears cell while material currentness is held before tokenizer',async()=>{
 const f=await installedPreparedFixture(),gate=deferred(),entered=deferred();f.hooks.fresh=()=>{entered.resolve();return gate.promise;};assert.equal(f.capture().status,'CAPTURED');const pending=f.owner.finishPreparedMeasurement(f.h);await entered.promise;assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);assert.equal(f.calls.tokenizer,0);
 f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.cell.body,null);assert.deepEqual(f.state.signals,[]);gate.resolve();assert.equal((await pending).status,'UNAVAILABLE');assert.equal(f.state.cell.body,null);assert.equal(f.calls.tokenizer,0);f.dispose();
});
test('installed source retirement clears cell during actual original tokenizer await',async()=>{
 const f=await installedPreparedFixture(),gate=deferred(),entered=deferred();f.hooks.tokenizer=pending=>{entered.resolve();return gate.promise.then(()=>pending);};assert.equal(f.capture().status,'CAPTURED');const pending=f.owner.finishPreparedMeasurement(f.h);await entered.promise;assert.equal(f.calls.tokenizer,1);assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);
 f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.cell.body,null);assert.deepEqual(f.state.signals,[]);gate.resolve();assert.equal((await pending).status,'UNAVAILABLE');assert.equal(f.state.cell.body,null);assert.equal(f.calls.tokenizer,1);assert.equal((await f.owner.finishPreparedMeasurement(f.h)).status,'UNAVAILABLE');f.dispose();
});
test('action and session signals remain independent denials after source lifecycle subscription',async()=>{
 for(const signal of ['action','session']){const f=await installedPreparedFixture();assert.equal(f.capture().status,'CAPTURED');await f.state.digestPromise;assert.equal(f.state.signals.length,3);f[signal].abort();assert.equal(f.state.cell.body,null);assert.equal(f.state.retired,true);assert.ok(f.api.inspectInstalledQwenSourceProfile(f.cap));assert.equal(f.sourceSignal.aborted,false);assert.equal(f.state.timer,null);assert.deepEqual(f.state.signals,[]);f.dispose();}
});
test('foreign installed source retirement cannot retire a different prepared capability',async()=>{
 const f=await installedPreparedFixture(),foreign=await installedPreparedFixture();assert.equal(f.capture().status,'CAPTURED');await f.state.digestPromise;foreign.api.retireInstalledQwenSourceProfile(foreign.entry.id);assert.equal(f.state.retired,false);assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);assert.equal((await f.owner.finishPreparedMeasurement(f.h)).status,'MEASURED');assert.equal(f.calls.tokenizer,1);f.dispose();foreign.dispose();
});

test('source retirement after measurement clears held controls before any declaration or resurrection',async()=>{
 const f=await installedPreparedFixture();assert.equal(f.capture().status,'CAPTURED');const m=await f.owner.finishPreparedMeasurement(f.h);assert.equal(m.status,'MEASURED');assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.cell.body,null);assert.equal(f.state.retired,true);
 for(const h of [f.h,structuredClone(f.h),{}])assert.equal((await f.owner.declarePrepared(h,f.request(m))).status,'UNAVAILABLE');assert.equal(f.capture().status,'UNAVAILABLE');assert.equal((await f.owner.finishPreparedMeasurement(f.h)).status,'UNAVAILABLE');assert.equal(f.state.cell.body,null);assert.equal(f.calls.tokenizer,1);assert.equal(f.calls.charges,1);assert.equal(f.calls.provider,0);clean(m);f.dispose();
});
test('source retirement after bind clears held wire before execute but preserves original metadata cancellation',async()=>{
 const f=await installedPreparedFixture(),{m,r,d,b,provider}=await f.bind();assert.match(f.state.cell.body,/SYNTHETIC_PRIVATE_PAYLOAD/);f.api.retireInstalledQwenSourceProfile(f.entry.id);assert.equal(f.state.cell.body,null);assert.equal(f.state.timer,null);assert.deepEqual(f.state.signals,[]);
 assert.equal(f.owner.foundationProvider(b,f.transport),null);assert.equal(f.owner.foundationProvider(structuredClone(b),f.transport),null);assert.equal((await provider.execute(f.h.childIdentity)).accepted,false);assert.equal((await f.owner.bindPrepared(f.h)).status,'UNAVAILABLE');assert.equal((await f.owner.declarePrepared(structuredClone(f.h),r)).status,'UNAVAILABLE');assert.equal(f.capture().status,'UNAVAILABLE');assert.equal(f.state.cell.body,null);assert.equal(f.calls.provider,0);assert.equal(f.calls.tokenizer,1);for(const value of [f.h,m,d,b])clean(value);
 const cancellation=await provider.cancelReservation();assert.ok(cancellation,'source retirement retains body-free original financial cancellation');assert.equal(provider.cancellation(cancellation).state,'CANCELLED_BEFORE_DISPATCH');assert.equal(f.state.cell.body,null);assert.equal(f.calls.provider,0);f.dispose();
});
