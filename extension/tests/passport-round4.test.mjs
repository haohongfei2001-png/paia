import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {PassportService,grantState,validateGrantRequest,validatePassportRow} from '../core/passport.js';
import {createContextPackage,contextPackageEnvelope,contextPackageExpired} from '../core/context-package.js';

const now=Date.parse('2026-09-12T12:00:00Z');
const stored=row=>{const {state,...value}=row;return value;};

test('Context Package is an ephemeral metadata envelope and never duplicates body storage',()=>{
 const pkg=createContextPackage({packageId:'pkg-1',previewId:'preview-1',grantId:'grant-1',profileId:'default',consumer:'chatgpt',purpose:'research',budget:'standard',generation:4,itemCount:3,characters:800,tokens:600,retrievalConfidence:'medium',partial:false,createdAt:now});
 assert.equal(pkg.type,'paia.context-package');
 assert.equal(pkg.persistedBody,false);
 assert.equal(Object.hasOwn(pkg,'text'),false);
 assert.equal(contextPackageExpired(pkg,now+14*60*1000),false);
 assert.equal(contextPackageExpired(pkg,now+16*60*1000),true);
 const envelope=contextPackageEnvelope(pkg,'synthetic payload',{format:'plain',generation:5});
 assert.equal(envelope.package.generation,5);
 assert.equal(envelope.payload.text,'synthetic payload');
 assert.equal(envelope.persistedBody,false);
});

test('Passport accepts only fixed consumer/purpose/profile/duration metadata',()=>{
 assert.deepEqual(validateGrantRequest({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'}),{consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'});
 assert.equal(validateGrantRequest({consumer:'manual',purpose:'research',profileId:'default',duration:'7d'}),null);
 assert.equal(validateGrantRequest({consumer:'chatgpt',purpose:'private free text',profileId:'default',duration:'7d'}),null);
 assert.equal(validateGrantRequest({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d',query:'secret'}),null);
});

test('Passport grant is profile-scoped, expires/revokes, consumes once grants and keeps metadata-only audit',async()=>{
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});
 const memory=new MemoryService(s,{clock:()=>now});await memory.ready();
 let clock=now,n=0;const passport=new PassportService(s,{clock:()=>clock,uuid:()=>`id-${++n}`});
 const once=await passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'});
 assert.equal(validatePassportRow(stored(once)),true);assert.equal(grantState(stored(once),clock),'active');
 await passport.authorize({grantId:once.grantId,consumer:'chatgpt',purpose:'research',profileId:'default'});
 const used=await passport.consume(once.grantId,'copy');assert.equal(used.state,'consumed');
 await assert.rejects(passport.authorize({grantId:once.grantId,consumer:'chatgpt',purpose:'research',profileId:'default'}),{code:'MEMORY_DENIED'});
 const seven=await passport.create({consumer:'coding_agent',purpose:'coding',profileId:'default',duration:'7d'});assert.equal(grantState(stored(seven),clock),'active');
 clock+=8*86400000;const status=await passport.status(),expired=status.grants.find(x=>x.grantId===seven.grantId);assert.equal(expired.state,'expired');
 const active=await passport.create({consumer:'claude',purpose:'writing',profileId:'default',duration:'30d'});const revoked=await passport.revoke(active.grantId);assert.equal(revoked.state,'revoked');
 const audit=(await passport.status()).audits[0];assert.equal(Object.hasOwn(audit,'query'),false);assert.equal(Object.hasOwn(audit,'text'),false);assert.equal(audit.permission,'context_export');
});
