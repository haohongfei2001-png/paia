// Baseline audit only: passing means the documented current limitation is reproduced.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../harness/thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {AIUsageFoundation} from '../../core/ai-usage/foundation.js';
const binding={version:1,sessionId:'synthetic-session',leaseId:'synthetic-lease',replyId:'synthetic-reply',replyGeneration:1,consentEpoch:'synthetic-remote',permissionEpoch:'synthetic-access'};
async function fixture(){const {s}=await setup(OrganizerStore);const ai=new AIUsageFoundation(s,{resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),resolveAssistIntent:async(_t,r)=>({allowed:true,remoteProcessing:true,binding:r.binding,scope:r.scope})});const items=(await ai.collect()).items;return {s,ai,request:{type:'AI_ASSIST',intent:'explicit',items,coverage:items.map(i=>({key:i.key,facet:'assist',scope:'synthetic'})),contractVersion:'synthetic',routeVersion:'synthetic',assistIntent:binding}};}
const snapshot=s=>s.repository.transaction(false,async t=>({jobs:await t.all('organizerJobs'),usage:await t.all('organizerUsage'),work:await t.all('organizerWorkItems')}));
test('actual Foundation denies reply-only empty dependency even with synthetic distinct trusted authority',async()=>{const {s,ai,request}=await fixture(),before=await snapshot(s);await assert.rejects(ai.plan({...request,items:[],coverage:[]}),e=>e.code==='INVALID_REQUEST');assert.deepEqual(await snapshot(s),before);});
test('actual Foundation accepts real dependencies but generic authority cannot replace remote intent resolver',async()=>{const {s,ai,request}=await fixture();assert.ok(request.items.length);const job=await ai.plan(request);assert.equal(job.state,'PLANNED');const before=await snapshot(s);ai.resolveAssistIntent=null;await assert.rejects(ai.reserve(job.id,{reservationId:'synthetic'}),e=>e.code==='UNAVAILABLE');assert.deepEqual(await snapshot(s),before);});
test('separate remote refusal cannot be bypassed by a valid-looking binding or ordinary AI authority',async()=>{const {s,ai,request}=await fixture(),before=await snapshot(s);ai.resolveAssistIntent=async(_t,r)=>({allowed:true,remoteProcessing:false,binding:r.binding,scope:r.scope});await assert.rejects(ai.plan(request),e=>e.code==='UNAVAILABLE');assert.deepEqual(await snapshot(s),before);});

import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const fixtureRoot=new URL('../fixtures/ai-assist-old-owner/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',fixtureRoot),'utf8'));
for(const file of manifest.files){const bytes=await readFile(new URL(file.path,fixtureRoot));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),file.gitBlob);}
const frozen=await readFile(new URL('core/ai-usage/foundation.js',fixtureRoot),'utf8');
assert.equal(createHash('sha256').update(frozen).digest('hex'),'0a1896e078dcbcf55334bb76af7277b24415728733eee147b8f642563da3b65c');
const oldModule=await import(new URL('core/ai-usage/foundation.js',fixtureRoot));
test('frozen 3f6c9d2a Foundation job/commitFacet/resolveLocal reject proposed Assist result kind with whole-store zero writes',async()=>{
 const {s,ai,request}=await fixture();let commits=0;
 const old=new oldModule.AIUsageFoundation(s,{resolveAuthority:ai.resolveAuthority,resolveAssistIntent:ai.resolveAssistIntent,committers:{assist:()=>{commits++;throw Error('must not reach domain owner');}}});
 const j=await old.plan(request);await old.reserve(j.id,{reservationId:'synthetic'});await old.dispatch(j.id,j.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic'})});
 const prior=await old.read(t=>old.job(t,j.id));
 // Proposed wire fixture only. There is intentionally no new-kind producer yet.
 await old.write(t=>t.put('organizerJobs',{...prior,kind:'ai_assist_result_v1',version:1}));
 const all=()=>old.read(async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
 const before=await all();
 // Frozen ArchiveError has a distinct class identity; the current repository
 // maps it to STORAGE_FAILED. Capture the actual old-owner refusal inside the
 // transaction and rethrow unchanged; never alter old code or commit behavior.
 let refused;for(const name of ['read','write']){const original=old[name].bind(old);old[name]=fn=>original(async t=>{try{return await fn(t);}catch(error){refused=error;throw error;}});}
 for(const action of [()=>old.read(t=>old.job(t,j.id)),()=>old.commitFacet(j.id,j.childIds[0],{facet:'assist',units:request.coverage}),()=>old.resolveLocal(j.id,{facet:'assist',units:request.coverage})]){refused=null;await assert.rejects(action(),e=>['INVALID_REQUEST','STORAGE_FAILED'].includes(e.code));assert.equal(refused?.code,'INVALID_REQUEST');assert.deepEqual(await all(),before);}
 assert.equal(commits,0);console.log('FROZEN_ASSIST_OWNER',JSON.stringify({base:'3f6c9d2a',sha256:createHash('sha256').update(frozen).digest('hex'),entrypoints:3,wholeStoreUnchanged:true}));
});
