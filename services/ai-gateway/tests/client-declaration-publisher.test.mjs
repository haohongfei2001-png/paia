import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPostgresDeclarationPublisher,isDeclarationPublisher} from '../postgres-declaration-publisher.mjs';
import {createSignedIdentityVerifier,requestBindingHash} from '../signed-identity.mjs';
import {identityConfigHash} from '../postgres-authority.mjs';
import {clientDeclarationHash} from '../client-declaration.mjs';
import {fixture,protocol} from './service-fixtures.mjs';
import {declaration,publicationProtocol} from './client-declaration-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
const denied=(result,reason)=>{assert.equal(result.decision,'deny');assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);assert.equal(result.retryAllowed,false);if(reason)assert.equal(result.reason,reason);};
const setup=(options={})=>{const f=fixture(),p=publicationProtocol(f,options),r=request('SYNTHETIC-declaration'),b=p.admit(r),d=declaration(f,r);return {f,p,r,b,d};};

test('missing publisher configuration denies without creating authority',async()=>{
 denied(await createPostgresDeclarationPublisher().publish({},{}),'SERVICE_UNCONFIGURED');
 const {f,b,d}=setup();denied(await createPostgresDeclarationPublisher({pool:{connect(){throw Error('must not run');}},identityConfig:f.identityConfig,profileId:f.profileId}).publish(b,d),'SERVICE_UNCONFIGURED');
 assert.equal(isDeclarationPublisher({publish(){}}),false);assert.equal(isDeclarationPublisher(createPostgresDeclarationPublisher()),true);
});
test('authenticated client declaration writes only original bounded metadata in original lock order',async()=>{
 const {f,p,r,b,d}=setup(),result=await p.publisher().publish(b,d),stored=p.rows().get(r.operationId);
 assert.equal(result.decision,'published');assert.equal(result.generation,clientDeclarationHash(d));assert.equal(result.requestHash,requestBindingHash(r));assert.equal(result.issuedAt,f.now);assert.equal(result.expiresAt,f.now+60000);
 assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);assert.equal(result.retryAllowed,false);
 assert.deepEqual(stored,{request_hash:requestBindingHash(r),request:r,generation:clientDeclarationHash(d),authorized:true,issued_at_ms:String(f.now),expires_at_ms:String(f.now+60000)});
 const at=table=>p.calls.findIndex(c=>c.sql.includes('FROM paia_ai_private.'+table)&&c.sql.includes('FOR '));
 assert.ok(at('budget_snapshot')<at('service_control'));assert.ok(at('service_control')<at('principal_authority'));assert.ok(at('principal_authority')<at('request_authority'));
 assert.match(p.calls[at('budget_snapshot')].sql,/FOR UPDATE/);assert.match(p.calls[at('request_authority')].sql,/FOR UPDATE/);
 assert.equal(p.calls.filter(c=>c.sql==='COMMIT').length,1);assert.doesNotMatch(JSON.stringify(p.calls),/eyJhbGci|payloadDigest|scopeDigest|SYNTHETIC-local-grant|SYNTHETIC-content/);
});
test('verifyValidity preserves verify shape and only reports an authenticated exclusive bound',()=>{
 const {f,r,b}=setup(),state=f.principal(r).security;
 const v=createSignedIdentityVerifier({config:f.identityConfig,clock:()=>f.now+499,readSecurityState:()=>state});
 const old=v.verify(b),bounded=v.verifyValidity(b);assert.equal(Object.hasOwn(old,'verifiedUntil'),false);assert.deepEqual(bounded,{...old,verifiedUntil:f.now+60000});assert.equal(Object.isFrozen(bounded),true);
 for(const kind of ['principal','entitlement'])assert.equal(v.verifyValidity(f.bundle(r,{[kind]:{exp:f.now/1000+7}})).verifiedUntil,f.now+7000);
 state.expiresAt=f.now/1000+4;assert.equal(v.verifyValidity(b).verifiedUntil,f.now+4000);
 const parts=b.principalToken.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));claims.exp+=100000;parts[1]=Buffer.from(JSON.stringify(claims)).toString('base64url');
 assert.throws(()=>v.verifyValidity({...b,principalToken:parts.join('.')}));
});
test('actual verified token, key, security, control and client bounds cap publication expiry',async()=>{
 for(const bound of ['principal','entitlement','key','security','control','client']){
  const {f,p,r,b,d}=setup();let bundle=b,expected=f.now+7000;
  if(['principal','entitlement'].includes(bound))bundle=f.bundle(r,{[bound]:{exp:expected/1000}});
  if(bound==='key'){
   f.identityConfig.principal.keys[0].notAfter=expected/1000;f.control.identity_config_hash=identityConfigHash(f.identityConfig);
   bundle=f.bundle(r,{principal:{exp:expected/1000}});
  }
  if(bound==='security')p.principals.values().next().value.security.expiresAt=expected/1000;
  if(bound==='control')f.control.expires_at_ms=String(expected);
  if(bound==='client')d.expiresAt=expected;
  const result=await p.publisher().publish(bundle,d);assert.equal(result.decision,'published',bound);assert.equal(result.expiresAt,expected,bound);
 }
});
test('publication captures caller request/proofs/config/declaration before async work',async()=>{
 const {f,p,b,d}=setup(),publisher=p.publisher(),pending=publisher.publish(b,d);
 b.request.inputTokens=999;b.principalToken='changed';d.payloadDigest='3'.repeat(64);f.identityConfig.principal.issuer='changed';
 const result=await pending;assert.equal(result.decision,'published');assert.equal([...p.rows().values()][0].request.inputTokens,1000);
 assert.equal(result.generation,clientDeclarationHash(declaration(f,{...b.request,inputTokens:1000})));
});
test('malformed, body-bearing, proofless, unauthenticated and mismatched declarations fail closed',async()=>{
 const changes=[d=>({...d,payload:'SYNTHETIC PRIVATE BODY'}),d=>({...d,payloadDigest:'x'}),d=>({...d,scopeDigest:'f'.repeat(65)}),d=>({...d,version:2}),d=>({...d,requestHash:'f'.repeat(64)}),d=>({...d,consentEpoch:'other'}),d=>({...d,expiresAt:0.5}),d=>({...d,authorizationId:''}),d=>Object.defineProperty({...d},'payloadDigest',{get(){throw Error('never run');}})];
 for(const change of changes){const {p,b,d}=setup();denied(await p.publisher().publish(b,change(d)));assert.equal(p.connections(),0);}
 for(const change of [b=>({...b,principalToken:'forged'}),b=>({...b,entitlementToken:null}),b=>({...b,verifyRequest:()=>true}),b=>({...b,request:{...b.request,tier:'pro'}})]){const {p,b,d}=setup();denied(await p.publisher().publish(change(b),d));assert.equal(p.rows().size,0);}
 const {f,p,r,b,d}=setup();const parts=b.principalToken.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));claims.exp=f.now/1000+900;parts[1]=Buffer.from(JSON.stringify(claims)).toString('base64url');
 denied(await p.publisher().publish({...b,principalToken:parts.join('.')},d),'AUTHORIZATION');assert.equal(p.rows().size,0);
});
test('each of the original 14 request fields remains authenticated and declaration-bound',async()=>{
 for(const [key,value] of Object.entries(request('all-fields',{childCount:2}))){
  const {f,p}=setup(),b=p.admit(request('all-fields',{childCount:2})),changed={...b.request,[key]:key==='jobType'?'AI_ASSIST':typeof value==='number'?value+1:value+'-other'};
  denied(await p.publisher().publish({...b,request:changed},declaration(f,changed)));assert.equal(p.rows().size,0);
 }
});
test('first operation binding is immutable for every valid declaration variant and both actions',async()=>{
 for(const key of ['payloadDigest','scopeDigest','contentGeneration','authorizationId','expiresAt']){
  const {p,r,b,d}=setup(),publisher=p.publisher();assert.equal((await publisher.publish(b,d)).decision,'published');const original=p.rows().get(r.operationId);
  const changed={...d,[key]:key==='expiresAt'?d.expiresAt-1:key.endsWith('Digest')?'3'.repeat(64):d[key]+'-other'};
  denied(await publisher.publish(b,changed),'OPERATION_REBOUND');denied(await publisher.revoke(b,changed),'OPERATION_REBOUND');assert.deepEqual(p.rows().get(r.operationId),original);
 }
 const {f,p,r,b,d}=setup(),publisher=p.publisher();await publisher.publish(b,d);const changed={...r,inputTokens:999},bound=p.admit(changed);
 denied(await publisher.publish(bound,declaration(f,changed)),'OPERATION_REBOUND');denied(await publisher.revoke(bound,declaration(f,changed)),'OPERATION_REBOUND');
});
test('exact duplicate publication is idempotent and never refreshes issue/expiry with new proofs',async()=>{
 const {f,p,r,b,d}=setup(),publisher=p.publisher(),short=f.bundle(r,{principal:{exp:f.now/1000+5}});
 const first=await publisher.publish(short,d);p.setClock(f.now+2000);assert.deepEqual(await p.publisher().publish(b,d),first);assert.equal(p.calls.filter(c=>c.sql.includes('INSERT INTO')).length,1);
 p.setClock(f.now+5000);denied(await p.publisher().publish(b,d),'AUTHORITY_EXPIRED');assert.equal(p.rows().get(r.operationId).expires_at_ms,String(f.now+5000));
});
test('revocation is terminal, idempotent, exact-bound and never changes original issue/expiry',async()=>{
 const {f,p,r,b,d}=setup(),publisher=p.publisher(),first=await publisher.publish(b,d);p.setClock(f.now+1000);
 const revoked=await publisher.revoke(b,d);assert.equal(revoked.decision,'revoked');assert.equal(revoked.issuedAt,first.issuedAt);assert.equal(revoked.expiresAt,first.expiresAt);
 assert.deepEqual(await publisher.revoke(b,d),revoked);denied(await publisher.publish(b,d),'DECLARATION_REVOKED');assert.equal(p.rows().get(r.operationId).authorized,false);
});
test('revoke-before-publish and expired-declaration revoke retain terminal zero-validity tombstones',async()=>{
 for(const expired of [false,true]){
  const {f,p,r,b,d}=setup(),publisher=p.publisher();if(expired)d.expiresAt=f.now-1;
  const result=await publisher.revoke(b,d);assert.equal(result.decision,'revoked');assert.equal(result.issuedAt,f.now);assert.equal(result.expiresAt,f.now);
  assert.deepEqual(await publisher.revoke(b,d),result);denied(await publisher.publish(b,d),'DECLARATION_REVOKED');assert.equal(p.rows().get(r.operationId).authorized,false);
 }
});
test('parallel publishers and revoke/publish races serialize on the one global ledger lock',async()=>{
 for(const order of [['revoke','publish'],['publish','revoke']]){
  const {p,r,b,d}=setup(),results=await Promise.all(order.map(action=>p.publisher()[action](b,d)));
  assert.equal(results[0].decision,order[0]==='revoke'?'revoked':'published');assert.equal(results[1].decision,order[1]==='revoke'?'revoked':'deny');assert.equal(p.rows().get(r.operationId).authorized,false);
 }
 const {p,r,b,d}=setup(),results=await Promise.all([p.publisher().publish(b,d),p.publisher().publish(b,{...d,payloadDigest:'a'.repeat(64)})]);
 assert.equal(results[0].decision,'published');denied(results[1],'OPERATION_REBOUND');assert.equal(p.rows().size,1);assert.equal(p.rows().get(r.operationId).generation,clientDeclarationHash(d));
});
test('missing/disabled control, identity hash, principal and active generations cannot qualify publication or revoke',async()=>{
 for(const action of ['publish','revoke'])for(const mutate of [(f,p)=>{f.control=null;},f=>{f.control.enabled=false;},f=>{f.control.profile_id='other';},f=>{f.control.identity_config_hash='0'.repeat(64);},(f,p)=>{p.principals.clear();},(f,p)=>{p.principals.values().next().value.security.principalActive=false;},(f,p)=>{p.principals.values().next().value.security.entitlementGeneration='changed';},(f,p)=>{p.principals.values().next().value.security.revokedPrincipalKeys=['principal'];}]){
  const {f,p,b,d}=setup();mutate(f,p);denied(await p.publisher()[action](b,d));assert.equal(p.rows().size,0);
 }
});
test('dedicated publisher refuses owner/bypass/non-RLS/overprivileged reservation roles',async()=>{
 for(const patch of [{unsafe_privileges:true},{rolsuper:true},{is_owner:true},{relrowsecurity:false},{relforcerowsecurity:false},{rolbypassrls:true}]){
  const {p,b,d}=setup({hook:({sql,args})=>sql.includes('SELECT c.relname')?{rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,unsafe_privileges:false,...patch}))}:undefined});
  denied(await p.publisher().publish(b,d),'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal(p.rows().size,0);
 }
 const {p,b,d}=setup();await p.publisher().publish(b,d);const sql=p.calls.find(c=>c.sql.includes('SELECT c.relname')).sql;
 assert.match(sql,/has_schema_privilege/);assert.match(sql,/DELETE,TRUNCATE,TRIGGER,REFERENCES/);assert.match(sql,/budget_snapshot' AND a.attname = 'updated_at'/);assert.match(sql,/ARRAY\['authorized','lock_anchor'\]/);assert.match(sql,/has_column_privilege/);
});
test('final verified interval denies expiry, database rollback and post-check SQL clock drift',async()=>{
 for(const advance of [60000,120000,-1]){
  const f=fixture();let reads=0;const p=publicationProtocol(f,{hook:({sql,setClock})=>{if(sql.startsWith('SELECT floor')&&++reads===2)setClock(f.now+advance);}}),r=request('late'),b=p.admit(r);
  denied(await p.publisher().publish(b,declaration(f,r)));assert.equal(p.rows().size,0);assert.ok(p.calls.some(c=>c.sql==='ROLLBACK'));
 }
 for(const delta of [1000,-1]){
  const {p,b,d}=setup({hook:({sql,args,setClock})=>{if(sql.startsWith('WITH publication'))setClock(args[6]+delta);}});
  denied(await p.publisher().publish(b,d),'AUTHORITY_EXPIRED');assert.equal(p.rows().size,0);
 }
 const {f,p,b,d}=setup();p.setLastNow(String(f.now+1));denied(await p.publisher().publish(b,d),'CLOCK_ROLLBACK');
});
test('SQL issue time is actual database publication time, and TTL cannot exceed verified validity',async()=>{
 const {f,p,b,d}=setup({hook:({sql,args,setClock})=>{if(sql.startsWith('WITH publication'))setClock(args[6]+499);}}),result=await p.publisher().publish(b,d);
 assert.equal(result.decision,'published');assert.equal(result.issuedAt,f.now+499);assert.equal(result.expiresAt,f.now+60000);
 const sql=p.calls.find(c=>c.sql.includes('INSERT INTO')).sql;assert.match(sql,/clock_timestamp/);assert.match(sql,/publication.millis\+60000/);assert.match(sql,/publication.millis >= \$7/);assert.match(sql,/publication.millis < \$8/);
});
test('unknown COMMIT never returns ACK, automatically retries or reveals private errors',async()=>{
 for(const applied of [false,true]){
  let lost=true;const {p,r,b,d}=setup({hook:({sql,save})=>{if(sql==='COMMIT'&&lost){if(applied)save();throw Error('SYNTHETIC PRIVATE DATABASE SECRET');}}});
  const result=await p.publisher().publish(b,d);assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'COMMIT_OUTCOME_UNKNOWN');assert.equal(result.retryAllowed,false);assert.equal(result.dispatchAllowed,false);assert.equal(Object.hasOwn(result,'generation'),false);
  assert.equal(p.connections(),1);assert.deepEqual(p.released,[true]);assert.equal(p.calls.some(c=>c.sql==='ROLLBACK'),false);assert.equal(p.rows().has(r.operationId),applied);assert.doesNotMatch(JSON.stringify(result),/SECRET|principalToken/);
  lost=false;if(applied){const saved=p.rows().get(r.operationId);assert.equal((await p.publisher().publish(b,d)).decision,'published');assert.deepEqual(p.rows().get(r.operationId),saved);}
 }
});
test('publication does not replace financial checks and revoked/expired authority never releases old holds',async()=>{
 const {f,p,r,b,d}=setup();await p.publisher().publish(b,d);const financial=protocol(f),proof=financial.admit(r);financial.grants.set(r.operationId,p.rows().get(r.operationId));
 assert.equal((await financial.service().reserve(proof)).decision,'reserved');const held=financial.saved();
 await p.publisher().revoke(b,d);financial.grants.set(r.operationId,p.rows().get(r.operationId));denied(await financial.service().reserve(proof));assert.deepEqual(financial.saved(),held);
 f.control.day_limit_micros='0';const other=request('other'),otherProof=p.admit(other),otherDeclaration=declaration(f,other);assert.equal((await p.publisher().publish(otherProof,otherDeclaration)).decision,'published');financial.admit(other);financial.grants.set(other.operationId,p.rows().get(other.operationId));denied(await financial.service().reserve(otherProof),'ALLOWANCE_UNSET');assert.deepEqual(financial.saved(),held);
});
test('publisher source has no role/grant creation, arbitrary fact callback or financial snapshot mutation',async()=>{
 const source=await readFile(new URL('../postgres-declaration-publisher.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/CREATE ROLE|GRANT\s+(?:SELECT|INSERT|UPDATE)|UPDATE paia_ai_private\.budget_snapshot|readContentFacts|readFactGenerations/);
});

test('unexpected database timestamp rewrites or socket failures roll back before any acknowledgement',async()=>{
 for(const kind of ['expiry','issue','socket']){
  const {f,p,r,b,d}=setup({hook:({sql,args,client})=>{
   if(!sql.startsWith('WITH publication'))return;
   if(kind==='socket'){client.emit('error',Error('SYNTHETIC PRIVATE SOCKET'));return;}
   return {rows:[{request_hash:args[1],generation:args[3],authorized:true,issued_at_ms:String(kind==='issue'?args[6]-1:args[6]),expires_at_ms:String(kind==='expiry'?args[5]+1:args[5])}]};
  }});
  denied(await p.publisher().publish(b,d));assert.equal(p.rows().size,0);assert.equal(p.calls.some(c=>c.sql==='COMMIT'),false);assert.ok(p.calls.some(c=>c.sql==='ROLLBACK'));
 }
 let rewrite=false;const {p,b,d}=setup({hook:({sql,args})=>{
  if(rewrite&&sql.startsWith('WITH publication'))return {rows:[{request_hash:args[1],generation:args[2],authorized:false,issued_at_ms:String(args[3]+1),expires_at_ms:String(args[3]+60000)}]};
 }});
 await p.publisher().publish(b,d);const before=p.rows();rewrite=true;denied(await p.publisher().revoke(b,d),'AUTHORITY_INVALID');assert.deepEqual(p.rows(),before);
});
