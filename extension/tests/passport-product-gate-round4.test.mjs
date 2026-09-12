import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {ProductSignals} from '../core/product-signals.js';
import {backupMetaAllowed} from '../core/backup-format.js';

const now=Date.parse('2026-09-12T12:00:00Z');
function fakeMemory(){let shares=0;return {get shares(){return shares;},async build(){return {previewId:'preview-round45',generation:4,items:[{id:'synthetic'}],text:'preview only',characters:120,tokens:80,retrievalConfidence:'high',partial:false,budget:'standard'};},async share(){shares++;return {text:'authorized synthetic context',characters:28,tokens:12,generation:5,localOnly:true};}};}

async function fixture(prefix='round45'){
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memoryState=new MemoryService(s,{clock:()=>now});await memoryState.ready();let n=0;const passport=new PassportService(s,{clock:()=>now,uuid:()=>`${prefix}-grant-${++n}`}),memory=fakeMemory(),context=new ContextPackageService(memory,passport,{clock:()=>now,uuid:()=>`${prefix}-pkg-${++n}`});return {s,passport,memory,context};
}

test('trusted Context path binds before export and once grant blocks plaintext before second reconstruction',async()=>{
 const {passport,memory,context}=await fixture();const built=await context.build({profileId:'default',query:'synthetic',budget:'standard'});assert.equal(built.contextPackage.grantId,null);assert.equal(built.contextPackage.persistedBody,false);
 const grant=await passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'}),bound=await context.bind(built.previewId,grant.grantId);assert.equal(bound.consumer,'chatgpt');assert.equal(bound.purpose,'research');assert.equal(bound.resourceScope,'profile');
 const first=await context.share({previewId:built.previewId,format:'copy',removed:[],grantId:grant.grantId});assert.equal(first.text,'authorized synthetic context');assert.equal(first.contextPackage.grantId,grant.grantId);assert.equal(memory.shares,1);
 await assert.rejects(context.share({previewId:built.previewId,format:'copy',removed:[],grantId:grant.grantId}),{code:'MEMORY_DENIED'});assert.equal(memory.shares,1);
});

test('unbound, mismatched and revoked grants fail before Memory share is called',async()=>{
 const {passport,memory,context}=await fixture('deny');const built=await context.build({profileId:'default'}),a=await passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'}),b=await passport.create({consumer:'claude',purpose:'writing',profileId:'default',duration:'30d'});
 await assert.rejects(context.share({previewId:built.previewId,format:'copy',removed:[],grantId:a.grantId}),{code:'MEMORY_DENIED'});assert.equal(memory.shares,0);
 await context.bind(built.previewId,a.grantId);await assert.rejects(context.share({previewId:built.previewId,format:'copy',removed:[],grantId:b.grantId}),{code:'MEMORY_DENIED'});assert.equal(memory.shares,0);
 await passport.revoke(a.grantId);await assert.rejects(context.share({previewId:built.previewId,format:'markdown',removed:[],grantId:a.grantId}),{code:'MEMORY_DENIED'});assert.equal(memory.shares,0);
 assert.equal(backupMetaAllowed('passport:grant:'+a.grantId),false);assert.equal(backupMetaAllowed('passport:audit:anything'),false);
});

test('manual AI Context remains compatible while Product Signals stays analytics-only',async()=>{
 const {s,passport,memory,context}=await fixture('manual');const built=await context.build({profileId:'default'}),result=await context.share({previewId:built.previewId,format:'copy',removed:[]});assert.equal(result.text,'authorized synthetic context');assert.equal(result.contextPackage.grantId,null);assert.equal(result.contextPackage.consumer,'manual');assert.equal(memory.shares,1);assert.ok((await passport.status()).audits.some(a=>a.action==='manual_copy'));
 const signals=new ProductSignals(s,{clock:()=>now});const status=await signals.status();assert.equal(Object.hasOwn(status,'passport'),false);assert.equal(Object.hasOwn(signals,'packages'),false);assert.equal(Object.hasOwn(signals,'passport'),false);
});
