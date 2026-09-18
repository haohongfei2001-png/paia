import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,append,rows} from './harness/original-complete.mjs';
import {exported} from './harness/backup-v081.mjs';
import {BackupService} from '../core/backup-service.js';
import {SourceStructureStore} from '../core/source-structure-store.js';

const project=(id,name=id)=>({ref:{providerKey:'chatgpt',namespace:'account-main',projectId:id},name});
const evidence=(id,generation)=>({id,contractId:'ans-test-contract',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:generation,evidenceKind:'relationship',digest:generation.toString(16).padStart(64,'0')});
const at=n=>new Date(Date.UTC(2026,8,18,16,n,0)).toISOString();
const convOf=state=>({platform:state.conversations[0].platform,sourceConversationId:state.conversations[0].sourceConversationId});
const stableProjection=state=>({
 records:state.records.map(r=>({id:r.id,sourceKey:r.sourceKey,dedupeKey:r.dedupeKey,contentHash:r.contentHash,sourceSentAt:r.sourceSentAt,capturedAt:r.capturedAt,originalText:r.originalText})),
 inputs:state.library.blocks.map(b=>({id:b.id,revision:b.revision,libraryText:b.libraryText,note:b.note,provenance:b.provenance}))
});

test('ANS-02 none → Project A → Project B → unassigned preserves Source/Input identity and records only effective history',async()=>{
 const {s}=await completeFixture({texts:['ANS02 synthetic source wording']}),before=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(before),A=project('project-a','Project A'),B=project('project-b','Project B');
 const first=await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(1),evidence:evidence('ev-a',1),membership:{state:'project',projectRef:A.ref},projectName:A.name,sourceStatus:'observed_active'});
 assert.equal(first.current.relationshipRevision,1);assert.equal(first.current.membership.state,'project');assert.equal(first.current.lastKnownSourceProject.name,'Project A');
 const a=await structure.observeProject({projectRef:A.ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(2),evidence:evidence('ev-a-name',2),currentName:A.name,sourceStatus:'observed_active'});
 assert.equal(a.current.currentName,'Project A');assert.equal(a.current.relationshipRevision,1);
 const duplicate=await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(3),evidence:evidence('ev-a-repeat',3),membership:{state:'project',projectRef:A.ref},projectName:A.name,sourceStatus:'observed_active'});
 assert.equal(duplicate.event,null);assert.equal(duplicate.current.relationshipRevision,1);
 const moved=await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(4),evidence:evidence('ev-b',4),membership:{state:'project',projectRef:B.ref},projectName:B.name});
 assert.equal(moved.current.relationshipRevision,2);assert.deepEqual(moved.current.membership.projectRef,B.ref);
 await structure.observeProject({projectRef:B.ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(5),evidence:evidence('ev-b-name',5),currentName:B.name});
 const unassigned=await structure.observeConversation({conversationRef:conv,expectedRevision:2,observedAt:at(6),evidence:evidence('ev-none',6),membership:{state:'unassigned',projectRef:null}});
 assert.equal(unassigned.current.membership.state,'unassigned');assert.deepEqual(unassigned.current.lastKnownSourceProject.projectRef,B.ref);
 const history=await structure.history({kind:'conversation',conversationRef:conv});assert.equal(history.items.length,3);assert.deepEqual(history.items.map(x=>x.observationSequence),[1,2,3]);
 assert.deepEqual(stableProjection(await s.snapshot()),stableProjection(before));
});

test('ANS-02 duplicate, stale and CAS-conflicting observations fail closed without history spam or phantom Projects',async()=>{
 const {s}=await completeFixture({texts:['ANS02 conflict fixture']}),state=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(state),A=project('cas-project-a'),B=project('cas-project-b');
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(10),evidence:evidence('cas-a',10),membership:{state:'project',projectRef:A.ref},sourceStatus:'observed_active'});
 await assert.rejects(()=>structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(11),evidence:evidence('wrong-cas',11),membership:{state:'project',projectRef:B.ref}}),error=>error.code==='SOURCE_STRUCTURE_CONFLICT');
 const stale=await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(9),evidence:evidence('late-generation',9),membership:{state:'project',projectRef:B.ref}});
 assert.equal(stale.stale,true);assert.equal(await structure.project(B.ref),null);
 await assert.rejects(()=>structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(10),evidence:evidence('same-time-conflict',12),membership:{state:'unassigned',projectRef:null}}),error=>error.code==='SOURCE_STRUCTURE_CONFLICT');
 assert.equal((await structure.history({kind:'conversation',conversationRef:conv})).items.length,1);
 const current=await structure.conversation(conv);assert.deepEqual(current.membership.projectRef,A.ref);assert.equal(current.relationshipRevision,1);
});

test('ANS-02 external lifecycle facts never purge PAIA content and Project deletion never cascades to child Conversations',async()=>{
 const {s}=await completeFixture({texts:['ANS02 lifecycle source']}),before=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(before),A=project('lifecycle-project','Lifecycle Project');
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(20),evidence:evidence('life-conv',20),membership:{state:'project',projectRef:A.ref},projectName:A.name,sourceStatus:'observed_active'});
 await structure.observeProject({projectRef:A.ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(21),evidence:evidence('life-project',21),currentName:A.name,sourceStatus:'observed_active'});
 await structure.observeProject({projectRef:A.ref,expectedRevision:1,observedAt:at(22),evidence:evidence('life-project-delete',22),sourceStatus:'confirmed_deleted'});
 assert.equal((await structure.project(A.ref)).sourceStatus,'confirmed_deleted');assert.equal((await structure.conversation(conv)).sourceStatus,'observed_active');
 await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(23),evidence:evidence('life-conv-delete',23),sourceStatus:'confirmed_deleted'});
 assert.equal((await structure.conversation(conv)).sourceStatus,'confirmed_deleted');assert.deepEqual(stableProjection(await s.snapshot()),stableProjection(before));
 await structure.observeConversation({conversationRef:conv,expectedRevision:2,observedAt:at(24),evidence:evidence('life-conv-back',24),sourceStatus:'observed_active'});
 assert.equal((await structure.conversation(conv)).sourceStatus,'observed_active');
});

test('ANS-02 Project rename preserves stable identity/history and live observations cannot forge restored evidence',async()=>{
 const {s}=await completeFixture({texts:['ANS02 rename fixture']}),state=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(state),A=project('rename-project','Initial Name');
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(25),evidence:evidence('rename-link',25),membership:{state:'project',projectRef:A.ref},projectName:A.name});
 const first=await structure.observeProject({projectRef:A.ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(26),evidence:evidence('rename-first',26),currentName:'Initial Name'});
 const renamed=await structure.observeProject({projectRef:A.ref,expectedRevision:1,observedAt:at(27),evidence:evidence('rename-second',27),currentName:'Renamed Project'});
 assert.deepEqual(renamed.current.projectRef,first.current.projectRef);assert.equal(renamed.current.currentName,'Renamed Project');assert.equal(renamed.current.relationshipRevision,2);
 const history=await structure.history({kind:'project',projectRef:A.ref});assert.equal(history.items.length,2);assert.deepEqual(history.items.map(x=>x.after.currentName),['Initial Name','Renamed Project']);
 await assert.rejects(()=>structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(28),evidence:{...evidence('forged-restore',28),restored:true},sourceStatus:'observed_active'}),error=>error.code==='INVALID_REQUEST');
});

test('ANS-02 same names never merge provider/project identities and same text with different message IDs stays different Source identity',async()=>{
 const {s}=await completeFixture({texts:['identical wording','identical wording']}),state=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(state);
 assert.equal(new Set(state.records.map(r=>r.sourceKey)).size,2);
 const P1={providerKey:'chatgpt',namespace:'account-a',projectId:'same-name'},P2={providerKey:'chatgpt',namespace:'account-b',projectId:'same-name'};
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(30),evidence:evidence('ns-a',30),membership:{state:'project',projectRef:P1},projectName:'Same Name'});
 await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(31),evidence:evidence('ns-b',31),membership:{state:'project',projectRef:P2},projectName:'Same Name'});
 assert.notDeepEqual((await structure.project(P1)).projectRef,(await structure.project(P2)).projectRef);
 assert.equal(new Set((await s.snapshot()).records.map(r=>r.sourceKey)).size,2);
});

test('ANS-02 relationship write is atomic under storage failure and batch limits are enforced',async()=>{
 const {s}=await completeFixture({texts:['ANS02 atomic fixture']}),state=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(state),A=project('atomic-project');
 const write=s.write.bind(s);s.write=fn=>write(async t=>{const put=t.put.bind(t);let ansWrites=0;t.put=async(name,row,key)=>{if(name==='meta'&&String(row?.id).startsWith('ans:')&&++ansWrites===2)throw new DOMException('quota','QuotaExceededError');return put(name,row,key);};return fn(t);});
 await assert.rejects(()=>structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(40),evidence:evidence('atomic-fail',40),membership:{state:'project',projectRef:A.ref},projectName:A.name}),error=>error.code==='STORAGE_FULL');
 s.write=write;assert.equal(await structure.conversation(conv),null);assert.equal(await structure.project(A.ref),null);
 const tooMany=Array.from({length:101},(_,i)=>({kind:'conversation',conversationRef:conv,expectedRevision:0,observedAt:at(41),evidence:evidence('batch-'+i,41)}));
 await assert.rejects(()=>structure.observeBatch(tooMany),error=>error.code==='INVALID_REQUEST');
});

test('ANS-02 actual PAIA purge removes final Conversation relationship/history and orphan Project metadata in the same source transaction',async()=>{
 const {s}=await completeFixture({texts:['ANS02 purge private marker']}),state=await s.snapshot(),structure=new SourceStructureStore(s),conv=convOf(state),A=project('purge-project','PURGE_PROJECT_PRIVATE_MARKER');
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(50),evidence:evidence('purge-conv',50),membership:{state:'project',projectRef:A.ref},projectName:A.name,sourceStatus:'observed_active'});
 await structure.observeProject({projectRef:A.ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(51),evidence:evidence('purge-project',51),currentName:A.name});
 await s.permanentDelete(state.records[0].id);
 assert.equal(await structure.conversation(conv),null);assert.equal(await structure.project(A.ref),null);assert.equal((await structure.history({kind:'conversation',conversationRef:conv})).items.length,0);
 const ans=(await rows(s,'meta')).filter(row=>String(row.id).startsWith('ans:'));assert.equal(ans.length,0);assert.doesNotMatch(JSON.stringify(await rows(s,'meta')),/PURGE_PROJECT_PRIVATE_MARKER/);
 const backup=await exported(new BackupService(s,{appVersion:'0.12.0'}));assert.equal(backup.filter(row=>row.section==='organizationState'&&String(row.value?.id).startsWith('ans:')).length,0);assert.doesNotMatch(JSON.stringify(backup),/PURGE_PROJECT_PRIVATE_MARKER/);
});

