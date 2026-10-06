import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PassportService,passportGrantId,passportAuditId} from '../core/passport.js';
const now=Date.parse('2026-09-12T12:00:00Z');
const grant=(id,revokedAt=null)=>({id:passportGrantId(id),kind:'grant',version:1,grantId:id,consumer:'chatgpt',purpose:'research',resourceScope:'profile',profileId:'default',permission:'context_export',duration:'once',createdAt:new Date(now-1000).toISOString(),expiresAt:null,revokedAt,consumedAt:null,lastUsedAt:null,useCount:0});
test('revoking legacy connections is durable, idempotent and preserves source, edits and audit rows',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const before=await s.snapshot(),at=new Date(now).toISOString(),audit={id:passportAuditId(at,'audit-one'),kind:'audit',version:1,auditId:'audit-one',grantId:'first',consumer:'chatgpt',purpose:'research',resourceScope:'profile',profileId:'default',permission:'context_export',action:'copy',createdAt:at};
 await s.foundationWrite(async t=>{await t.put('meta',grant('first'));await t.put('meta',grant('second'));await t.put('meta',grant('old',at));await t.put('meta',audit);});
 const service=new PassportService(s,{clock:()=>now});assert.deepEqual(await service.revokeAll(),{revoked:2});const status=await new PassportService(s,{clock:()=>now+1000}).status();assert.equal(status.grants.length,3);assert.ok(status.grants.every(g=>g.state==='revoked'));assert.deepEqual(status.audits,[audit]);assert.deepEqual(await service.revokeAll(),{revoked:0});assert.deepEqual((await s.snapshot()).records,before.records);assert.deepEqual((await s.snapshot()).library,before.library);
 await assert.rejects(service.resolve('first'),{code:'MEMORY_DENIED'});
});
test('revocation failure aborts all writes instead of claiming partial success',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.foundationWrite(async t=>{await t.put('meta',grant('first'));await t.put('meta',grant('second'));});
 const original=s.repository.transaction.bind(s.repository);s.repository.transaction=(write,fn,stores)=>original(write,t=>fn(new Proxy(t,{get(target,key){if(key==='put')return async(store,row)=>{if(row.grantId==='second')throw Error('SYNTHETIC write failure');return target.put(store,row);};const value=target[key];return typeof value==='function'?value.bind(target):value;}})),stores);
 const service=new PassportService(s,{clock:()=>now});await assert.rejects(service.revokeAll(),{code:'STORAGE_FAILED'});assert.ok((await service.status()).grants.every(g=>g.revokedAt===null));
});
