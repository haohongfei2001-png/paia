import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign, createHmac} from 'node:crypto';
import {createSignedIdentityVerifier, requestBindingHash} from '../../services/ai-gateway/signed-identity.mjs';
import {createServiceAdmission} from '../../services/ai-gateway/service-admission.mjs';
import {ROUTE_FIELDS} from '../core/ai-usage/ratebook.js';
import {group} from '../scripts/test-groups.mjs';

// Ephemeral synthetic keys never leave this test process or become credentials.
const principalKey = generateKeyPairSync('rsa', {modulusLength: 2048});
const entitlementKey = generateKeyPairSync('rsa', {modulusLength: 2048});
const attackerKey = generateKeyPairSync('rsa', {modulusLength: 2048});
const START = 1800000000000;
const request = (patch = {}) => ({operationId:'operation', jobId:'job', principalId:'subject', libraryId:'library', scopeFingerprint:'scope', contractVersion:'v1', routeVersion:'route-v1', consentEpoch:'consent-v1', jobType:'AI_ORGANIZE', childIndex:0, childCount:1, inputTokens:1000, outputCap:6000, maxCompletionTokens:5990, ...patch});
const pem = key => key.publicKey.export({type:'spki', format:'pem'});
const encode = text => Buffer.from(text).toString('base64url');
function jwt(kind, claims, {header, rawHeader, rawClaims, key, signature} = {}) {
  const h = rawHeader ?? JSON.stringify(header ?? {alg:'RS256', typ:`paia-${kind}+jwt`, kid:kind});
  const input = `${encode(h)}.${encode(rawClaims ?? JSON.stringify(claims))}`;
  return `${input}.${signature ?? sign('RSA-SHA256', Buffer.from(input), key ?? (kind === 'principal' ? principalKey : entitlementKey).privateKey).toString('base64url')}`;
}
function fixture() {
  let now = START;
  const config = {maxTokenAgeSeconds:300, maxSecurityStateAgeSeconds:60, ...Object.fromEntries(['principal','entitlement'].map(kind => [kind, {issuer:`https://${kind}.example.invalid`, audience:`paia-${kind}`, keys:[{kid:kind, publicKeyPem:pem(kind === 'principal' ? principalKey : entitlementKey), notBefore:START/1000-1000, notAfter:START/1000+10000, revoked:false}]}]))};
  const state = {principalId:'subject', libraryId:'library', observedAt:START/1000, expiresAt:START/1000+60, principalActive:true, entitlementActive:true, principalGeneration:'p1', entitlementGeneration:'e1', revokedPrincipalKeys:[], revokedEntitlementKeys:[]};
  const clock = () => now;
  const readSecurityState = () => structuredClone(state);
  const makeVerifier = (overrides = {}) => createSignedIdentityVerifier({config, clock, readSecurityState, ...overrides});
  const claims = (kind, r = request(), patch = {}) => ({iss:config[kind].issuer, aud:config[kind].audience, sub:r.principalId, iat:START/1000, nbf:START/1000, exp:START/1000+120, jti:`${kind}-token`, library_id:r.libraryId, operation_id:r.operationId, request_hash:requestBindingHash(r), generation:kind === 'principal' ? 'p1' : 'e1', ...(kind === 'entitlement' ? {principal_issuer:config.principal.issuer, tier:'free', entitlements:[r.jobType]} : {}), ...patch});
  const bundle = (r = request(), patch = {}) => ({request:r, principalToken:jwt('principal', claims('principal', r)), entitlementToken:jwt('entitlement', claims('entitlement', r)), ...patch});
  const revisions = {content:'content-1', route:'route-1', budget:'budget-1'};
  const route = Object.fromEntries(ROUTE_FIELDS.map(k => [k, `synthetic-${k}`])); route.currency = 'USD';
  const budget = {usage:{results:0, attempts:0, inputTokens:0, outputTokens:0, featureDayMicros:0, featureMonthMicros:0, userDayMicros:0, userMonthMicros:0}, global:{dayLimitMicros:15000, monthLimitMicros:15000, dayUsedMicros:0, monthUsedMicros:0}, attemptState:'PLANNED', ownsResultReservation:false};
  const content = {authorized:true};
  const routeFacts = {routeQualified:true, thinkingBoundQualified:true, inputBoundQualified:true, route, book:{route, rates:{standardInput:1000000, cachedReadInput:1000000, cacheCreateInput:1000000, completion:1000000}, effectiveAt:START-1000, verifiedAt:START, expiresAt:START+300000, source:'synthetic tariff', verified:true, inputBand:{minInclusive:0, maxInclusive:16000}}, fx:null};
  const calls = [];
  const owner = (kind, facts) => async ({request:r, identity}) => {calls.push({kind, identity, request:r}); return {request:r, generation:revisions[kind], expiresAt:START+300000, ...structuredClone(facts)};};
  const options = {identityConfig:config, clock, readSecurityState, readContentFacts:owner('content',content), readRouteFacts:owner('route',routeFacts), readBudgetFacts:owner('budget',budget), readFactGenerations:() => ({...revisions})};
  return {config, state, claims, bundle, makeVerifier, options, revisions, budget, content, routeFacts, calls, now:() => now, setNow:value => {now=value;}};
}
const denial = async (service, bundle, reason) => {const value = await service.evaluate(bundle); assert.equal(value.decision,'deny'); assert.equal(value.dispatchAllowed,false); assert.equal(value.financialAuthority,false); if(reason) assert.equal(value.reason,reason); return value;};

test('new service tests remain in the original unit selector', () => assert.equal(group('ai-service-identity.test.mjs'),'unit'));
test('real RSA signatures qualify both Free and Pro only with explicit entitlement', () => {
  const f=fixture(), verifier=f.makeVerifier();
  for(const tier of ['free','pro']) {
    const b=f.bundle(request(), {entitlementToken:jwt('entitlement',f.claims('entitlement',request(),{tier}))});
    assert.deepEqual(verifier.verify(b), {principalId:'subject', libraryId:'library', operationId:'operation', jobType:'AI_ORGANIZE', tier, principalGeneration:'p1', entitlementGeneration:'e1'});
  }
});
test('configured trust roots are immutable and cannot be supplied in a request', () => {
  const f=fixture(), verifier=f.makeVerifier(), bundle=f.bundle(); f.config.principal.keys[0].publicKeyPem=pem(attackerKey); f.config.principal.issuer='https://attacker.example.invalid';
  assert.equal(verifier.verify(bundle).tier,'free');
  assert.throws(() => verifier.verify({...bundle, config:f.config}));
});
for(const kind of ['principal','entitlement']) {
  for(const [label,patch] of Object.entries({issuer:{iss:'https://attacker.example.invalid'}, audience:{aud:'other'}, audienceArray:{aud:['paia-'+kind]}, subject:{sub:'other'}, library:{library_id:'other'}, operation:{operation_id:'other'}, request:{request_hash:'0'.repeat(64)}, expired:{exp:START/1000}, notYetValid:{nbf:START/1000+1}, issuedInFuture:{iat:START/1000+1}, overlongLifetime:{exp:START/1000+301}, invalidLifetime:{iat:START/1000+119, nbf:START/1000, exp:START/1000+118}, generation:{generation:'other'}, fractionalTime:{iat:START/1000+0.5}})) {
    test(`${kind}: rejects ${label}`, () => {const f=fixture(); assert.throws(() => f.makeVerifier().verify(f.bundle(request(),{[kind+'Token']:jwt(kind,f.claims(kind,request(),patch))})));});
  }
  test(`${kind}: wrong signature or unknown kid does not reach service facts`, async () => {
    const f=fixture(), service=createServiceAdmission(f.options);
    for(const opts of [{key:attackerKey.privateKey},{header:{alg:'RS256',typ:`paia-${kind}+jwt`,kid:'unknown'}}]) await denial(service,f.bundle(request(),{[kind+'Token']:jwt(kind,f.claims(kind),opts)}));
    assert.equal(f.calls.length,0);
  });
}
test('rejects unsigned, algorithm confusion and unsupported JOSE key selection', () => {
  const f=fixture(), verifier=f.makeVerifier(), c=f.claims('principal');
  for(const header of [{alg:'none',typ:'paia-principal+jwt',kid:'principal'}, {alg:'HS256',typ:'paia-principal+jwt',kid:'principal'}, ...['jku','x5u','jwk','x5c','crit','b64'].map(k => ({alg:'RS256',typ:'paia-principal+jwt',kid:'principal',[k]:'attacker'}))]) assert.throws(() => verifier.verify(f.bundle(request(),{principalToken:jwt('principal',c,{header})})));
  const h=encode(JSON.stringify({alg:'HS256',typ:'paia-principal+jwt',kid:'principal'})), p=encode(JSON.stringify(c));
  assert.throws(() => verifier.verify(f.bundle(request(),{principalToken:`${h}.${p}.${createHmac('sha256',pem(principalKey)).update(`${h}.${p}`).digest('base64url')}`})));
  assert.throws(() => verifier.verify(f.bundle(request(),{principalToken:jwt('principal',c,{signature:''})})));
});
test('rejects duplicate or escaped duplicate header and claim names', () => {
  const f=fixture(), verifier=f.makeVerifier(), c=f.claims('principal');
  for(const rawHeader of ['{"alg":"RS256","alg":"RS256","typ":"paia-principal+jwt","kid":"principal"}','{"alg":"RS256","al\\u0067":"RS256","typ":"paia-principal+jwt","kid":"principal"}']) assert.throws(() => verifier.verify(f.bundle(request(),{principalToken:jwt('principal',c,{rawHeader})})));
  for(const key of ['sub','s\\u0075b']) assert.throws(() => verifier.verify(f.bundle(request(),{principalToken:jwt('principal',c,{rawClaims:JSON.stringify(c).replace(/}$/,`,"${key}":"subject"}`)})})));
});
test('strict bounded UTF-8/base64url/JSON rejects invalid or ambiguous serializations', () => {
  const f=fixture(), verifier=f.makeVerifier(), b=f.bundle(), parts=b.principalToken.split('.');
  const malformed=['', 'a'.repeat(8193), b.principalToken+'.extra', '=' + b.principalToken, `${parts[0]}.${parts[1]}.${parts[2]}=`, `${parts[0]}.${parts[1]}.AA`, ...['null','[]','{"alg":', '{"extra":'+ '['.repeat(100)+'0'+']'.repeat(100)+'}', '{"sub":"\\ud800"}'].map(rawClaims => jwt('principal',f.claims('principal'),{rawClaims}))];
  for(const principalToken of malformed) assert.throws(() => verifier.verify({...b,principalToken}));
  assert.throws(() => verifier.verify({...b,principalToken:`${Buffer.from([0xc3,0x28]).toString('base64url')}.${parts[1]}.${parts[2]}`}));
});
test('principal and entitlement token types cannot substitute for each other', () => {const f=fixture(), b=f.bundle(); assert.throws(() => f.makeVerifier().verify({...b,principalToken:b.entitlementToken,entitlementToken:b.principalToken}));});
test('all original request fields are bound, not only principal/library/operation', () => {
  const f=fixture(), b=f.bundle(), verifier=f.makeVerifier();
  for(const [field,value] of Object.entries(b.request)) assert.throws(() => verifier.verify({...b,request:{...b.request,[field]:typeof value==='number'?value+1:value+'-changed'}}));
  assert.throws(() => verifier.verify({...b,request:{...b.request,tier:'pro'}}));
});
test('Free also needs entitlement and explicit exact operation-family permission', () => {
  const f=fixture(), verifier=f.makeVerifier();
  for(const patch of [{tier:'enterprise'}, {entitlements:[]}, {entitlements:['AI_ASSIST']}, {entitlements:['AI_ORGANIZE','AI_ORGANIZE']}, {entitlements:['*']}, {principal_issuer:'other'}, {tier:undefined}]) assert.throws(() => verifier.verify(f.bundle(request(),{entitlementToken:jwt('entitlement',f.claims('entitlement',request(),patch))})));
  for(const entitlementToken of [undefined,null,'',JSON.stringify({tier:'pro',email:'synthetic@example.invalid',apiKey:'synthetic'})]) assert.throws(() => verifier.verify(f.bundle(request(),{entitlementToken})));
});
test('current key revocation, principal disable and entitlement generation revoke existing handles', () => {
  for(const patch of [{principalId:'other'},{libraryId:'other'},{revokedPrincipalKeys:['principal']},{revokedEntitlementKeys:['entitlement']},{principalActive:false},{entitlementActive:false},{principalGeneration:'p2'},{entitlementGeneration:'e2'}]) {const f=fixture(), verifier=f.makeVerifier(); verifier.verify(f.bundle()); Object.assign(f.state,patch); assert.throws(() => verifier.verify(f.bundle()));}
});
test('stale, absent, async, malformed and rollback service security state deny', () => {
  for(const readSecurityState of [undefined,()=>null,async()=>({}),async()=>{throw Error('private details');},()=>{throw Error('private backend details');}]) {const f=fixture(); assert.throws(() => f.makeVerifier({readSecurityState}).verify(f.bundle()));}
  for(const patch of [{observedAt:START/1000+1},{observedAt:START/1000-61},{expiresAt:START/1000},{revokedPrincipalKeys:undefined}]) {const f=fixture(); Object.assign(f.state,patch); assert.throws(() => f.makeVerifier().verify(f.bundle()));}
  const f=fixture(), verifier=f.makeVerifier(); verifier.verify(f.bundle()); f.setNow(START-1); assert.throws(() => verifier.verify(f.bundle()));
});
test('missing/ambiguous trust roots, private keys, weak keys and invalid key windows deny', () => {
  const f=fixture();
  for(const alter of [c=>delete c.principal, c=>c.principal.keys=[], c=>c.principal.keys.push({...c.principal.keys[0]}), c=>c.principal.keys.push({...c.principal.keys[0],kid:'alias'}), c=>c.principal.keys[0].publicKeyPem+=pem(principalKey), c=>c.principal.keys=Array(17).fill(c.principal.keys[0]), c=>c.principal.keys[0].publicKeyPem=principalKey.privateKey.export({type:'pkcs8',format:'pem'}), c=>c.principal.keys[0].revoked=true, c=>c.principal.keys[0].notAfter=START/1000, c=>c.principal.keys[0].notBefore=START/1000+1, c=>c.entitlement.keys[0].publicKeyPem=pem(principalKey)]) {const config=structuredClone(f.config); alter(config); assert.throws(() => f.makeVerifier({config}).verify(f.bundle()));}
  const weak=generateKeyPairSync('rsa',{modulusLength:1024}); const config=structuredClone(f.config); config.principal.keys[0].publicKeyPem=pem(weak); assert.throws(() => f.makeVerifier({config}).verify(f.bundle()));
});
test('actual service entry verifies signatures then uses original quote and admission', async () => {
  const f=fixture(), result=await createServiceAdmission(f.options).evaluate(f.bundle());
  assert.deepEqual(result,{decision:'eligible_for_atomic_reservation',reservationMicros:7000,dispatchAllowed:false,financialAuthority:false});
  assert.equal(f.calls.length,3); assert.ok(f.calls.every(c=>c.identity.tier==='free'&&!Object.hasOwn(c,'principalToken')));
});
test('unconfigured service and arbitrary client authority always deny', async () => {
  await denial(createServiceAdmission(),fixture().bundle());
  const f=fixture(), service=createServiceAdmission(f.options);
  for(const patch of [{tier:'pro'}, {verifiedServiceFacts:true}, {clock:START}, {serviceFacts:{authorized:true}}, {browserLogin:true}, {apiKey:'synthetic'}]) await denial(service,{...f.bundle(),...patch});
  assert.equal(f.calls.length,0);
});
test('identity cannot grant consent, route qualification, cap, global budget or pending-attempt permission', async () => {
  for(const patch of [{content:{authorized:false}}, {routeFacts:{routeQualified:false}}, {routeFacts:{thinkingBoundQualified:false}}, {routeFacts:{inputBoundQualified:false}}, {budget:{global:{dayLimitMicros:0,monthLimitMicros:15000}}}, {budget:{attemptState:'OUTCOME_UNKNOWN'}}, {budget:{usage:{results:3,attempts:0,inputTokens:0,outputTokens:0,featureDayMicros:0,featureMonthMicros:0,userDayMicros:0,userMonthMicros:0}}}]) {const f=fixture();for(const [kind,value] of Object.entries(patch)) Object.assign(f[kind],value); await denial(createServiceAdmission(f.options),f.bundle());}
});
test('facts may not override identity or rebind request, and unavailable owners deny without leaks', async () => {
  for(const owner of ['readContentFacts','readRouteFacts','readBudgetFacts']) {
    for(const mode of ['missing','throws','identity','binding','expired']) {
      const f=fixture(), original=f.options[owner];
      f.options[owner]=mode==='missing'?undefined:async context=>{if(mode==='throws')throw Error('secret token body'); const value=await original(context); if(mode==='identity')value.tier='pro'; if(mode==='binding')value.request={...value.request,libraryId:'other'}; if(mode==='expired')value.expiresAt=START; return value;};
      const result=await denial(createServiceAdmission(f.options),f.bundle()); assert.ok(!JSON.stringify(result).includes('secret'));
    }
  }
});
test('after asynchronous facts, expiry/revocation/generation/owner changes are synchronously fenced', async () => {
  const changes=[f=>f.setNow(START+120000),f=>f.state.revokedPrincipalKeys.push('principal'),f=>f.state.revokedEntitlementKeys.push('entitlement'),f=>f.state.entitlementGeneration='e2',f=>f.state.principalGeneration='p2',f=>f.revisions.content='content-2',f=>f.revisions.route='route-2',f=>f.revisions.budget='budget-2'];
  for(const change of changes) {
    const f=fixture(), original=f.options.readBudgetFacts; let release; const held=new Promise(resolve=>release=resolve);
    f.options.readBudgetFacts=async context=>{const facts=await original(context); await held; return facts;};
    const pending=createServiceAdmission(f.options).evaluate(f.bundle()); await Promise.resolve(); await Promise.resolve(); change(f); release(); await denial({evaluate:()=>pending},null);
  }
});
test('generation fence must be synchronous and complete', async () => {
  for(const readFactGenerations of [undefined,()=>null,async()=>({content:'content-1',route:'route-1',budget:'budget-1'}),async()=>{throw Error('private details');},()=>({content:'content-1',route:'route-1'})]) {const f=fixture(); f.options.readFactGenerations=readFactGenerations; await denial(createServiceAdmission(f.options),f.bundle());}
});
test('same operation evaluation is non-mutating and never a reservation or dispatch receipt', async () => {
  const f=fixture(), service=createServiceAdmission(f.options), b=f.bundle(), before=structuredClone(f.budget);
  const results=await Promise.all([service.evaluate(b),service.evaluate(b)]); assert.deepEqual(results[0],results[1]); assert.deepEqual(f.budget,before); assert.ok(results.every(v=>v.dispatchAllowed===false&&v.financialAuthority===false&&!Object.hasOwn(v,'state')));
});

test('pending call captures original tokens/request and passes immutable metadata to owners', async () => {
  const f=fixture(), b=f.bundle(), original=f.options.readBudgetFacts; let release;
  const held=new Promise(resolve=>release=resolve);
  f.options.readBudgetFacts=async context=>{assert.ok(Object.isFrozen(context)); assert.ok(Object.isFrozen(context.request)); assert.ok(Object.isFrozen(context.identity)); const result=await original(context); await held; return result;};
  const pending=createServiceAdmission(f.options).evaluate(b);
  b.request.principalId='attacker'; b.entitlementToken='forged'; b.principalToken='forged'; release();
  assert.equal((await pending).decision,'eligible_for_atomic_reservation');
});
test('current snapshot expiry after an await denies even while both tokens are unexpired', async () => {
  const f=fixture(), original=f.options.readBudgetFacts;
  f.options.readBudgetFacts=async context=>{const result=await original(context); f.setNow(START+60000); return result;};
  await denial(createServiceAdmission(f.options),f.bundle(),'IDENTITY_STATE_UNAVAILABLE');
});
test('final quote is recalculated from current service-owned rates and cannot borrow Pro allowance', async () => {
  const f=fixture(); f.routeFacts.book.rates.completion=2000000;
  const result=await createServiceAdmission(f.options).evaluate(f.bundle()); assert.equal(result.reservationMicros,13000);
  f.budget.usage.results=3; await denial(createServiceAdmission(f.options),f.bundle(),'BUDGET_OR_QUOTA');
  const pro=f.bundle(request(),{entitlementToken:jwt('entitlement',f.claims('entitlement',request(),{tier:'pro'}))});
  assert.equal((await createServiceAdmission(f.options).evaluate(pro)).decision,'eligible_for_atomic_reservation');
});
test('configured maximum token lifetime and key validity hold at exact boundaries', () => {
  const f=fixture(), b=f.bundle(), verifier=f.makeVerifier();
  f.setNow(START+119000); f.state.observedAt=START/1000+119; f.state.expiresAt=START/1000+120;
  assert.equal(verifier.verify(b).tier,'free'); f.setNow(START+120000); assert.throws(()=>verifier.verify(b),/IDENTITY_TIME_INVALID/);
  const g=fixture(); g.config.maxTokenAgeSeconds=60; assert.throws(()=>g.makeVerifier().verify(g.bundle()),/IDENTITY_TIME_INVALID/);
});
test('final original admission retains all token and monetary upper bounds', async () => {
  const cases=[{inputTokens:16001},{outputCap:6001},{maxCompletionTokens:5991},{childCount:5},{childCount:0}];
  for(const patch of cases) {const f=fixture(), r=request(patch); if(r.childCount===0){assert.throws(()=>f.bundle(r));continue;} await denial(createServiceAdmission(f.options),f.bundle(r));}
  for(const field of ['featureDayMicros','featureMonthMicros','userDayMicros','userMonthMicros']) {const f=fixture(); f.budget.usage[field]=Number.MAX_SAFE_INTEGER; await denial(createServiceAdmission(f.options),f.bundle(),'BUDGET_OR_QUOTA');}
});
