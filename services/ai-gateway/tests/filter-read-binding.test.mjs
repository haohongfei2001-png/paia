import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedVisibilityFixture} from './filter-visibility-history-fixture.mjs';
import {createFilterReadIdentityBinding,readFilterReadIdentityBinding,assertFilterReadIdentityBinding} from '../../../extension/core/ai-usage/filter-read-identity-binding.js';
import {readAIFilterConsentEpoch} from '../../../extension/background/ai-filter-consent.js';
const policy={version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_NOT_PRODUCTION_QUALIFICATION'};
const args=f=>({getStore:()=>f.s,consent:f.filterConsent,witness:f.token,policy,configuration:f.configuration});
test('private read binding derives exact current local identity from original joined history without text',async t=>{
 const f=await joinedVisibilityFixture(t),binding=await createFilterReadIdentityBinding(args(f));assert.ok(binding);const r=readFilterReadIdentityBinding(binding,f.s);assert.equal(r.principalId,f.envelope.data.identity.principalId);assert.equal(r.libraryId,f.envelope.data.identity.libraryId);assert.equal(r.consentEpoch,readAIFilterConsentEpoch(f.filterConsent,f.filterConsent.capture()));assert.match(r.localBindingHash,/^[a-f0-9]{64}$/);assert.equal(r.purpose,'AI_FILTER_VISIBILITY');
 assert.deepEqual(await f.s.repository.transaction(false,tx=>assertFilterReadIdentityBinding(tx,binding,f.s),['meta']),r);assert.equal(readFilterReadIdentityBinding({...binding},f.s),null);assert.equal(readFilterReadIdentityBinding(binding,{repository:f.s.repository}),null);assert.equal(f.physical(),1);
});
test('new explicit consent creates a new read session/hash but preserves old signed history and authority',async t=>{
 const f=await joinedVisibilityFixture(t),a=await createFilterReadIdentityBinding(args(f)),ra=readFilterReadIdentityBinding(a,f.s),history=structuredClone(f.envelope);const current=f.filterConsent.capture();await f.filterConsent.configure({optIn:false,remoteProcessing:false,expectedGeneration:current.generation});assert.equal(readFilterReadIdentityBinding(a,f.s),null);assert.equal(await createFilterReadIdentityBinding(args(f)),null);const off=await f.filterConsent.status();await f.filterConsent.configure({optIn:true,remoteProcessing:true,expectedGeneration:off.generation});const b=await createFilterReadIdentityBinding(args(f)),rb=readFilterReadIdentityBinding(b,f.s);assert.ok(rb);for(const k of ['readerSessionId','consentEpoch','localBindingHash'])assert.notEqual(rb[k],ra[k]);assert.deepEqual(f.envelope,history);assert.equal(f.physical(),1);
});
for(const kind of ['witness copy','witness DTO','policy','origin','host'])test(`private binding refuses ${kind}`,async t=>{
 const f=await joinedVisibilityFixture(t),a=args(f);if(kind==='witness copy')a.witness={...f.token};if(kind==='witness DTO')a.witness=f.envelope;if(kind==='policy')a.policy={...policy,qualificationId:'foreign'};if(kind==='origin')a.configuration={...f.configuration,origin:'https://foreign.invalid'};if(kind==='host')a.configuration={...f.configuration,isCurrent:()=>false};assert.equal(await createFilterReadIdentityBinding(a),null);
});
for(const kind of ['restore','database','store','host','consent'])test(`existing binding rejects current ${kind} change in its original transaction`,async t=>{
 const f=await joinedVisibilityFixture(t);let selected=f.s;const binding=await createFilterReadIdentityBinding({...args(f),getStore:()=>selected});assert.ok(binding);
 if(kind==='restore')await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'changed'}));if(kind==='database')await f.s.repository.transaction(true,async tx=>{const row=await tx.get('meta','migration');row.databaseId='changed';await tx.put('meta',row);});if(kind==='store')selected={repository:f.s.repository};if(kind==='host')f.revoke();if(kind==='consent')f.filterConsent.invalidate();
 await assert.rejects(f.s.repository.transaction(false,tx=>assertFilterReadIdentityBinding(tx,binding,f.s),['meta']));
});
test('restore drift while generating private hash cannot mint a binding',async t=>{
 const f=await joinedVisibilityFixture(t),original=crypto.subtle.digest.bind(crypto.subtle);let injected=false;t.mock.method(crypto.subtle,'digest',async(...a)=>{const result=await original(...a);if(!injected){injected=true;await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'changed'}));}return result;});assert.equal(await createFilterReadIdentityBinding(args(f)),null);assert.equal(injected,true);
});
