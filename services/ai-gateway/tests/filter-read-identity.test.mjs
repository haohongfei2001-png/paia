import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignedIdentityVerifier,createSignedFilterReadIdentityVerifier,filterReadRequestBindingHash,snapshotFilterReadRequest} from '../signed-identity.mjs';
import {filterReadFixture} from './filter-read-identity-fixture.mjs';
const f=filterReadFixture();
function verifier({config=f.config,clock=()=>f.now,state=f.security(f.request)}={}){return createSignedFilterReadIdentityVerifier({config,clock,readSecurityState:()=>state});}
const deny=(fn,code)=>assert.throws(fn,e=>e.name==='IdentityVerificationError'&&(!code||e.code===code));
test('separate read identity binds the complete request with a short verified bound and no financial fields',()=>{
 const i=verifier().verifyValidity(f.bundle());assert.deepEqual(i,{...f.request,tier:'pro',principalGeneration:'synthetic-principal-generation',entitlementGeneration:'synthetic-entitlement-generation',verifiedUntil:f.now+60000});assert.ok(Object.isFrozen(i));assert.equal(Object.hasOwn(i,'operationId'),false);assert.equal(Object.hasOwn(i,'requestHash'),false);
});
test('financial and read tokens reject replay in both directions, including mixed token pairs',()=>{
 const paid=createSignedIdentityVerifier({config:f.config,clock:()=>f.now,readSecurityState:()=>f.security(f.financial)}),b=f.bundle(),p=f.financialBundle();assert.equal(paid.verify(p).operationId,f.financial.operationId);
 deny(()=>verifier().verifyValidity({...b,principalToken:p.principalToken,entitlementToken:p.entitlementToken}));deny(()=>paid.verify({...p,principalToken:b.principalToken,entitlementToken:b.entitlementToken}));
 for(const field of ['principalToken','entitlementToken']){deny(()=>verifier().verifyValidity({...b,[field]:p[field]}));deny(()=>paid.verify({...p,[field]:b[field]}));}
 deny(()=>verifier().verifyValidity(p));deny(()=>paid.verify(b));
});
for(const field of ['principalId','libraryId','readerSessionId','consentEpoch','localBindingHash','policyId'])test(`same signed read proof rejects changed ${field}`,()=>{
 const r={...f.request,[field]:field==='localBindingHash'?'b'.repeat(64):'changed'};deny(()=>verifier().verifyValidity({...f.bundle(),request:r}),'IDENTITY_BINDING');assert.notEqual(filterReadRequestBindingHash(r),filterReadRequestBindingHash(f.request));
});
for(const [label,patch,code] of [
 ['wrong typ',{header:{principal:{typ:'paia-principal+jwt'}}}],['wrong algorithm',{header:{entitlement:{alg:'HS256'}}}],['unknown key',{header:{principal:{kid:'unknown'}}},'IDENTITY_REVOKED'],
 ['wrong issuer',{principal:{iss:'https://foreign.invalid'}}],['wrong audience',{entitlement:{aud:'foreign'}}],['wrong subject',{principal:{sub:'foreign'}},'IDENTITY_BINDING'],
 ['wrong purpose',{entitlement:{purpose:'MAINTENANCE'}},'IDENTITY_BINDING'],['wrong session',{principal:{read_session_id:'foreign'}},'IDENTITY_BINDING'],['wrong hash',{principal:{read_request_hash:'b'.repeat(64)}},'IDENTITY_BINDING'],
 ['financial extra claim',{principal:{operation_id:'forbidden'}}],['wrong entitlement',{entitlement:{entitlements:['MAINTENANCE']}},'ENTITLEMENT_INVALID'],['entitlement union',{entitlement:{entitlements:['AI_FILTER_VISIBILITY','MAINTENANCE']}},'ENTITLEMENT_INVALID'],
 ['principal issuer swap',{entitlement:{principal_issuer:'https://other.invalid'}},'ENTITLEMENT_INVALID'],['expired',{principal:{exp:f.now/1000}},'IDENTITY_TIME_INVALID'],['future',{principal:{iat:f.now/1000+1,nbf:f.now/1000+1}},'IDENTITY_TIME_INVALID'],
 ['too long',{entitlement:{exp:f.now/1000+301}},'IDENTITY_TIME_INVALID'],['duplicate claim',{raw:{principal:c=>JSON.stringify(c).replace('"purpose":','"purpose":"AI_FILTER_VISIBILITY","purpose":')}}],
])test(`read profile denies ${label}`,()=>deny(()=>verifier().verifyValidity(f.bundle(f.request,patch)),code));
for(const [label,patch] of [['principal revocation',{principalActive:false}],['entitlement revocation',{entitlementActive:false}],['principal generation',{principalGeneration:'new'}],['entitlement generation',{entitlementGeneration:'new'}],['principal key',{revokedPrincipalKeys:['principal']}],['entitlement key',{revokedEntitlementKeys:['entitlement']}],['foreign library',{libraryId:'foreign'}],['stale state',{expiresAt:f.now/1000}]])test(`read identity rechecks original security ${label}`,()=>deny(()=>verifier({state:{...f.security(f.request),...patch}}).verifyValidity(f.bundle())));
test('Free is authenticated as Free and cannot be promoted by a local flag',()=>assert.equal(verifier().verifyValidity(f.bundle(f.request,{entitlement:{tier:'free'}})).tier,'free'));
test('read request is closed and never invokes an unknown or selected accessor',()=>{
 for(const value of [{...f.request,operationId:'extra'},{...f.request,purpose:'MAINTENANCE'},{...f.request,localBindingHash:'x'},{...f.request,version:2}])assert.throws(()=>snapshotFilterReadRequest(value));
 let reads=0;const v={...f.request};Object.defineProperty(v,'policyId',{enumerable:true,get(){reads++;return f.request.policyId;}});assert.throws(()=>snapshotFilterReadRequest(v));assert.equal(reads,0);
});
test('unconfigured, asynchronous security, malformed signature and clock rollback fail closed',()=>{
 deny(()=>createSignedFilterReadIdentityVerifier().verifyValidity(f.bundle()));deny(()=>verifier({state:Promise.resolve(f.security(f.request))}).verifyValidity(f.bundle()));
 const b=f.bundle();b.principalToken=b.principalToken.slice(0,-4)+'AAAA';deny(()=>verifier().verifyValidity(b));let now=f.now;const v=verifier({clock:()=>now});v.verifyValidity(f.bundle());now--;deny(()=>v.verifyValidity(f.bundle()),'UNTRUSTED_CLOCK');
});
test('read profile pins issuer keys without changing the old financial profile',()=>{
 const c=structuredClone(f.config);c.principal.keys[0].revoked=true;deny(()=>verifier({config:c}).verifyValidity(f.bundle()),'IDENTITY_REVOKED');
 const c2=structuredClone(f.config);c2.entitlement.keys[0].publicKeyPem=c2.principal.keys[0].publicKeyPem;deny(()=>verifier({config:c2}).verifyValidity(f.bundle()),'IDENTITY_UNCONFIGURED');
 const old=createSignedIdentityVerifier({config:f.config,clock:()=>f.now,readSecurityState:()=>f.security(f.financial)});assert.deepEqual(Object.keys(old.verify(f.financialBundle())).sort(),['principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration'].sort());
});
