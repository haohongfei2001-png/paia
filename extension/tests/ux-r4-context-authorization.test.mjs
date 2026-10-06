import {assertRetiredContext} from './harness/retired-context.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
const op=()=>crypto.randomUUID();
async function setup(){const f=await completeFixture({texts:['AUTH_MATCH 可核验的合成材料']}),memory=new MemoryService(f.s),passport=new PassportService(f.s),service=new ContextPackageService(memory,passport);await memory.ready();const b=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'授权范围',operationId:op()}),entry=await f.s.addToTopics({kind:'input',id:b.id,expectedRevision:b.revision,topicIds:[topic.id],operationId:op()});await memory.authorize({topicIds:[topic.id],decision:'allowed'});return {...f,memory,passport,service,b,topic,entry};}
test("Current retirement / historical scenario: UX-R4 grant-bound identity keeps once consumption, revocation, scope and intent fences independently of manual output",async()=>{
 await assertRetiredContext({"owner": "package", "method": "bind", "action": "create", "variant": "once"});
});
test("Current retirement / historical scenario: UX-R4 unbound manual package output remains local when external connections are disabled",async()=>{
 await assertRetiredContext({"owner": "package", "method": "share", "action": "share", "variant": "local-only"});
});
test("Current retirement / historical scenario: UX-R4 grant-bound output rechecks external access after reconstruction and before release",async()=>{
 await assertRetiredContext({"owner": "package", "method": "share", "action": "share", "variant": "revoked"});
});
test("Current retirement / historical scenario: CURRENT B-02 refusal + historical fixture: UX-R4 mixed generated paragraphs inherit every evidence restriction and clear output on purge; selection does not change any grant",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "missing"});
});
test("Current retirement / historical scenario: UX-R4 bind and final output serialize on one package boundary and report the exact emitted item count",async()=>{
 await assertRetiredContext({"owner": "package", "method": "bind", "action": "create", "variant": "consumed"});
});
test("Current retirement / historical scenario: UX-R4 real MemoryService propagates the post-removal item count into the package envelope",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "share", "action": "share", "variant": "removed"});
});
