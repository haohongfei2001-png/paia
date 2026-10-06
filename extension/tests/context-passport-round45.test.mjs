import {assertRetiredContext} from './harness/retired-context.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {backupMetaAllowed} from '../core/backup-format.js';

const now=Date.parse('2026-09-12T12:00:00Z');
function fakeMemory(){let shares=0;return {get shares(){return shares;},async build(){return {previewId:'preview-round45',generation:4,items:[{id:'synthetic'}],text:'preview only',characters:120,tokens:80,retrievalConfidence:'high',partial:false,budget:'standard'};},async share(){shares++;return {text:'authorized synthetic context',characters:28,tokens:12,generation:5,localOnly:true};}};}
async function fixture(prefix='round45'){const {s}=await setup(OrganizerStore,{clock:()=>new Date(now).toISOString()});const memoryState=new MemoryService(s,{clock:()=>now});await memoryState.ready();await memoryState.settings({externalAccess:true});let n=0;const passport=new PassportService(s,{clock:()=>now,uuid:()=>`${prefix}-grant-${++n}`}),memory=fakeMemory(),context=new ContextPackageService(memory,passport,{clock:()=>now,uuid:()=>`${prefix}-pkg-${++n}`});return {s,passport,memory,context};}

test("Current retirement / historical scenario: trusted Context path binds before export and once grant blocks plaintext before second reconstruction",async()=>{
 await assertRetiredContext({"owner": "package", "method": "bind", "action": "create", "variant": "once"});
});

test("Current retirement / historical scenario: unbound, mismatched and revoked grants fail before Memory share is called",async()=>{
 await assertRetiredContext({"owner": "package", "method": "share", "action": "share", "variant": "revoked"});
});

test("Current retirement / historical scenario: manual AI Context remains compatible while Product Signals stays analytics-only",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "create", "variant": "allowed"});
});