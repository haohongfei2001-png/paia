import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {ProductSignals} from '../core/product-signals.js';
import {backupMetaAllowed} from '../core/backup-format.js';

const now=Date.parse('2026-09-12T12:00:00Z');
const buildResult=()=>({previewId:'preview-round4',generation:4,items:[{id:'synthetic'}],characters:120,tokens:80,retrievalConfidence:'high',partial:false,budget:'standard'});
const buildRequest={type:'PAIA_MEMORY_BUILD',options:{profileId:'default',query:'synthetic question',budget:'standard'}};

test('Passport-protected release is bound before export, fail-closed, and once grant cannot release text twice',async()=>{
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memory=new MemoryService(s,{clock:()=>now});await memory.ready();let n=0;const signals=new ProductSignals(s,{clock:()=>now,uuid:()=>`round4-${++n}`});
 const built=buildResult();await signals.observe(buildRequest,built,{url:'chrome-extension://test/ui/product-signals.html'});assert.equal(built.contextPackage.persistedBody,false);assert.equal(built.contextPackage.grantId,null);
 const grant=await signals.settings({passport:{action:'create',consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'}}),bound=await signals.settings({passport:{action:'bind_package',previewId:built.previewId,grantId:grant.grantId}});
 assert.equal(bound.grantId,grant.grantId);assert.equal(bound.consumer,'chatgpt');assert.equal(bound.purpose,'research');assert.equal(bound.resourceScope,'profile');
 const first={text:'authorized synthetic context',characters:28,tokens:12,generation:5,localOnly:true};await signals.observe({type:'PAIA_MEMORY_SHARE',options:{previewId:built.previewId,format:'copy',removed:[],grantId:grant.grantId}},first,{});assert.equal(first.permissionDenied,false);assert.equal(first.text,'authorized synthetic context');assert.equal(first.contextPackage.grantId,grant.grantId);
 const second={text:'must not escape',characters:15,tokens:6,generation:5,localOnly:true};await signals.observe({type:'PAIA_MEMORY_SHARE',options:{previewId:built.previewId,format:'copy',removed:[],grantId:grant.grantId}},second,{});assert.equal(second.permissionDenied,true);assert.equal(second.permissionError,'MEMORY_DENIED');assert.equal(second.text,'');assert.equal(second.characters,0);assert.equal(second.tokens,0);
});

test('unbound or mismatched Grant never releases reconstructed plaintext',async()=>{
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memory=new MemoryService(s,{clock:()=>now});await memory.ready();let n=0;const signals=new ProductSignals(s,{clock:()=>now,uuid:()=>`mismatch-${++n}`});const built=buildResult();await signals.observe(buildRequest,built,{});const grant=await signals.settings({passport:{action:'create',consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'}});
 const result={text:'protected plaintext',characters:19,tokens:7,generation:5,localOnly:true};await signals.observe({type:'PAIA_MEMORY_SHARE',options:{previewId:built.previewId,format:'copy',removed:[],grantId:grant.grantId}},result,{});assert.equal(result.permissionDenied,true);assert.equal(result.text,'');
});

test('revoked grant cannot release reconstructed plaintext and Passport metadata is excluded from PAIA Backup',async()=>{
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memory=new MemoryService(s,{clock:()=>now});await memory.ready();let n=0;const signals=new ProductSignals(s,{clock:()=>now,uuid:()=>`revoked-${++n}`});const built=buildResult();await signals.observe(buildRequest,built,{});
 const grant=await signals.settings({passport:{action:'create',consumer:'claude',purpose:'writing',profileId:'default',duration:'30d'}});await signals.settings({passport:{action:'bind_package',previewId:built.previewId,grantId:grant.grantId}});await signals.settings({passport:{action:'revoke',grantId:grant.grantId}});
 const result={text:'reconstructed but protected',characters:27,tokens:10,generation:5,localOnly:true};await signals.observe({type:'PAIA_MEMORY_SHARE',options:{previewId:built.previewId,format:'markdown',removed:[],grantId:grant.grantId}},result,{});assert.equal(result.permissionDenied,true);assert.equal(result.text,'');assert.equal(backupMetaAllowed('passport:grant:'+grant.grantId),false);assert.equal(backupMetaAllowed('passport:audit:anything'),false);
});

test('manual explicit AI Context share remains compatible and receives an unbound package contract',async()=>{
 const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memory=new MemoryService(s,{clock:()=>now});await memory.ready();let n=0;const signals=new ProductSignals(s,{clock:()=>now,uuid:()=>`manual-${++n}`});const built=buildResult();await signals.observe(buildRequest,built,{});const result={text:'manual context',characters:14,tokens:6,generation:5,localOnly:true};await signals.observe({type:'PAIA_MEMORY_SHARE',options:{previewId:built.previewId,format:'copy',removed:[]}},result,{});assert.equal(result.text,'manual context');assert.equal(result.contextPackage.grantId,null);assert.equal(result.contextPackage.consumer,'manual');assert.equal(result.contextPackage.purpose,'current_task');const status=await signals.status();assert.ok(status.passport.audits.some(a=>a.action==='manual_copy'));
});
