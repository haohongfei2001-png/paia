import {assertRetiredContext} from './harness/retired-context.mjs';
import {reviewManualSelection} from './harness/manual-reviewed-selection.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,append} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {assertLocalNetworkAllowed} from '../core/local-network-policy.js';
import {hashText} from '../core/dedupe.js';
import {MANUAL_CONTEXT_LIMITS} from '../core/context-manifest.js';
import {BackupService} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
const op=()=>crypto.randomUUID();
async function setup(texts=['合成姓名甲 的完整历史材料','另一条真实选择']){const f=await completeFixture({texts});const memory=new MemoryService(f.s),passport=new PassportService(f.s);let now=Date.now();const service=new ContextPackageService(memory,passport,{clock:()=>now});await memory.ready();const records=await rows(f.s,'records'),blocks=(await rows(f.s,'blocks')).map(x=>x.value).sort((a,b)=>texts.indexOf(records.find(r=>r.id===a.originalTextReference).value.originalText)-texts.indexOf(records.find(r=>r.id===b.originalTextReference).value.originalText)),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));let state=await service.manual({action:'create'},'tab-a');return {...f,memory,passport,service,blocks,refs,get state(){return state;},advance:()=>{now+=900001;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'tab-a');state=next;return next;}};}

test("Current retirement / historical scenario: VS06 fixed manifest preserves explicit full text, same-input spans and exact copy/export hash",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "allowed"});
});
test("Current retirement / historical scenario: VS06 policy revision invalidates a reviewed manifest without auto-send or loosening local-only",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "local-only"});
});
test("Current retirement / historical scenario: VS06 exclusion, edit and ordering belong to the reviewed manifest; stale refs never rebind",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "reorder", "variant": "edited", "long": true});
});
test("Current retirement / historical scenario: VS06 changed payload cannot reuse the prior exact preview fingerprint",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "confirmReview", "variant": "edited"});
});
test("Current retirement / historical scenario: VS06 effective edited material budget is atomic on add, never silently truncated",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "add", "variant": "allowed", "long": true});
});

test("Current retirement / historical scenario: VS06 denial during asynchronous release fingerprinting refuses payload and clears blocked bytes",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "denied"});
});
