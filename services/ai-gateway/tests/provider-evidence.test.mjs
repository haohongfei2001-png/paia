import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresProviderEvidencePublisher} from '../postgres-provider-evidence.mjs';

test('provider evidence is unavailable without dedicated server configuration',async()=>{
 const publisher=createPostgresProviderEvidencePublisher();
 assert.equal((await publisher.claim(null,null)).decision,'deny');
});

import {createHash} from 'node:crypto';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {providerFixture} from './provider-fixtures.mjs';
import {snapshotProviderInput,prepareProviderRequest} from '../provider-request.mjs';
import {requestBindingHash} from '../signed-identity.mjs';
import {clientDeclarationHash} from '../client-declaration.mjs';
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
function secondInput(f){
 const input=structuredClone(f.input),r=input.bundle.request;r.operationId+='-two';r.jobId+='-two';
 input.bundle=f.bundle(r);input.childIdentity.childOperationId=r.operationId;input.childIdentity.logicalJobId=r.jobId;
 input.declaration.requestHash=requestBindingHash(r);input.declaration.scopeDigest=digest({childIdentity:input.childIdentity,reservationRequest:r,authorizationId:input.declaration.authorizationId});
 f.grants.set(r.operationId,{...f.grant(r),generation:clientDeclarationHash(input.declaration)});return input;
}
const publisher=(f,patch={})=>createPostgresProviderEvidencePublisher({...f.config,pool:f.evidencePool,...patch});
const claim=(p,f,input=f.input)=>{input=snapshotProviderInput(input);return p.claim(input.bundle,input.declaration,context=>prepareProviderRequest({input,manifest:f.manifest,tokenize:f.config.tokenize,...context}));};

test('pending evidence occupations enforce shared concurrency before original DISPATCHED catches up',async()=>{
 const f=providerFixture();await f.reserve();const other=secondInput(f);assert.equal((await f.service.reserve(other.bundle)).state,'RESERVED');
 const a=publisher(f,{maxConcurrent:1}),b=publisher(f,{maxConcurrent:1});
 const outcomes=await Promise.all([claim(a,f),claim(b,f,other)]);
 assert.equal(outcomes.filter(v=>v.decision==='claimed').length,1);assert.equal(outcomes.filter(v=>v.reason==='PROVIDER_CAPACITY').length,1);assert.equal(f.saved().rows.every(r=>r.state==='RESERVED'),true);assert.equal(f.events().size,1);
});
test('publisher rejects reservation-writer privileges and exact declaration generation mismatch',async()=>{
 const f=providerFixture();await f.reserve();const broad=publisher(f,{pool:f.reservationPool});
 assert.equal((await claim(broad,f)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.equal(f.events().size,0);
 f.grants.get(f.input.bundle.request.operationId).generation='f'.repeat(64);
 assert.equal((await claim(publisher(f),f)).reason,'OPERATION_REBOUND');assert.equal(f.events().size,0);
});
test('plain copies of a fresh claim cannot trigger send and a claim alone is never enough',async()=>{
 const f=providerFixture();await f.reserve();const p=publisher(f),c=await claim(p,f);assert.equal(c.decision,'claimed');let sends=0;
 const callbacks={isCurrent:()=>true,start:()=>{sends++;}};
 assert.equal((await p.sendOnce({...c.ticket},callbacks)).decision,'deny');
 assert.equal((await p.sendOnce(c.ticket,callbacks)).reason,'OUTCOME_OR_ATTEMPT_PENDING');assert.equal(sends,0);assert.equal(f.saved().rows[0].state,'RESERVED');
 assert.equal((await f.service.record(f.input.bundle,c.ticket.eventId)).state,'DISPATCHED');
 assert.equal((await p.sendOnce(c.ticket,callbacks)).decision,'deny');assert.equal(sends,0);
});
test('known evidence publication failure rolls back, keeps money and never retries internally',async()=>{
 let inserts=0;const f=providerFixture({hook:({sql})=>{if(sql.includes('INSERT INTO paia_ai_private.operation_evidence')){inserts++;throw Error('SYNTHETIC failure');}}});
 await f.reserve();assert.equal((await claim(publisher(f),f)).decision,'deny');assert.equal(inserts,1);assert.equal(f.events().size,0);assert.equal(f.saved().rows[0].reservationMicros,700);
});
