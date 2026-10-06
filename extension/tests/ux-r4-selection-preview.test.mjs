import {assertRetiredContext} from './harness/retired-context.mjs';
import {reviewManualSelection} from './harness/manual-reviewed-selection.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,append} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {assertLocalNetworkAllowed} from '../core/local-network-policy.js';
import {BackupService} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
const op=()=>crypto.randomUUID();
async function setup(texts=['合成姓名甲 的完整历史材料','另一条真实选择']){const f=await completeFixture({texts});const memory=new MemoryService(f.s),passport=new PassportService(f.s);let now=Date.now();const service=new ContextPackageService(memory,passport,{clock:()=>now});await memory.ready();const records=await rows(f.s,'records'),blocks=(await rows(f.s,'blocks')).map(x=>x.value).sort((a,b)=>texts.indexOf(records.find(r=>r.id===a.originalTextReference).value.originalText)-texts.indexOf(records.find(r=>r.id===b.originalTextReference).value.originalText)),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));let state=await service.manual({action:'create'},'tab-a');return {...f,memory,passport,service,blocks,refs,get state(){return state;},advance:()=>{now+=900001;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'tab-a');state=next;return next;}};}
test("Current retirement / historical scenario: UX-R4 full fixed Inputs need no Topic/Profile grant, dedupe exact selections and preserve overrides/redactions across rebuild and suggestions",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "add", "variant": "allowed"});
});
test("Current retirement / historical scenario: UX-R4 explicit deny and inherited never block Input and derived Thought; ordinary allow does not override inherited exclusions",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "never"});
});
test("Current retirement / historical scenario: UX-R4 preview generation, sender ownership, malformed spans and source revision CAS reject stale output",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "edited"});
});
test("Current retirement / historical scenario: CURRENT B-02 refusal + historical fixture: UX-R4 removal, purge and policy changes clear old output; independent human response survives its context source purge",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "removed"});
});
test("Current retirement / historical scenario: UX-R4 TTL, worker restart and grant identity cannot be converted into manual authorization",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "expired"});
});
test("Current retirement / historical scenario: UX-R4 external connections are explicit opt-in for new and legacy missing-field configs",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "settings", "action": "create", "variant": "legacy", "payload": {"externalAccess": true}});
});
test("Current retirement / historical scenario: UX-R4 Local-only and legacy externalAccess=false prohibit connections while exact manual output and Backup retain restrictions",async()=>{
 await assertRetiredContext({"owner": "package", "method": "share", "action": "share", "variant": "local-only"});
});
test('UX-R4 Backup drops AI presentation caches without restorable evidence and rejects evidence-incomplete restore state',async()=>{const f=await completeFixture(),topic=await f.s.createTopic({name:'备份证据主题',operationId:op()}),ai={id:'aiPresentation:'+topic.id,topicId:topic.id,schemaVersion:1,revision:1,blockSummary:'仅派生缓存',currentView:'需要证据才能恢复',keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:['missing-entry'],protections:{},stale:false,needsUpdate:false},backup=new BackupService(f.s);const projected=await f.s.run(()=>f.s.repository.transaction(false,t=>backup.project(t,'organizationState',ai)));assert.equal(projected,null);const topicItem=await f.s.run(()=>f.s.repository.transaction(false,async t=>backup.project(t,'topics',await t.get('topics',topic.id))));assert.ok(topicItem);const aiItem={type:'item',section:'organizationState',value:{id:ai.id,data:ai}};await assert.rejects(backup.validateReferences({items:[topicItem,aiItem]}),{code:'BACKUP_INVALID'});});
test("Current retirement / historical scenario: UX-R4 same-input versions/spans remain explicit; excluded suggestions never repopulate removed material and fixed ordering is validated",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "reorder", "variant": "excluded"});
});
