import {reviewAndAdoptFirstAI} from './harness/ai-reviewed.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {completeFixture,append,rows} from './harness/original-complete.mjs';
import {BackupService} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {projectBackupEntity} from '../core/backup-format.js';
import {RecoveryDraftSession} from '../ui/recovery-draft.js';
const op=()=>crypto.randomUUID();
const draftFor=b=>({kind:'document',ownerId:b.documentId,token:op(),operation:{type:'EDIT_DOCUMENT',edit:{operationId:op(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:b.libraryText??'Synthetic draft',note:b.note,excluded:b.excluded}]}}});

test('CURRENT B-02 refusal + historical fixture: purge floor rejects pre-purge text but permits subsequent legitimate and conflicted survivor drafts',async()=>{
 const {s}=await setup(OrganizerStore),b=(await s.snapshot()).library.blocks[0];await inputEdit(s,b.id,{libraryText:'Independent human text'});
 const stale=draftFor(await s.input(b.id));await admitPreGatePurgeFixture(s,b.sourceRecordId);
 const survivor=await s.input(b.id);assert.equal(survivor.libraryText,'Independent human text');assert.equal(survivor.recoveryPurgeRevision,survivor.revision);
 await assert.rejects(()=>s.recoveryDraftSourceIds(stale),e=>e.code==='INVALID_REQUEST');
 const fresh=draftFor(survivor);assert.deepEqual(await s.recoveryDraftSourceIds(fresh),[]);
 await inputEdit(s,b.id,{libraryText:'Concurrent ordinary edit after purge'});
 assert.deepEqual(await s.recoveryDraftSourceIds(fresh),[],'later ordinary revision conflict remains protectable');
 assert.equal((await s.input(b.id)).recoveryPurgeRevision,survivor.revision);
 const replay=await s.capture(capture((await s.status()).epoch));assert.equal(replay.added,0,'capture cannot restore the deleted Source');
});

test('CURRENT B-02 refusal + historical fixture: older purged survivors establish one conservative floor then permit later conflicts',async()=>{
 const {s}=await setup(OrganizerStore),b=(await s.snapshot()).library.blocks[0];await inputEdit(s,b.id,{libraryText:'Old-version human survivor'});const old=draftFor(await s.input(b.id));await admitPreGatePurgeFixture(s,b.sourceRecordId);
 await s.run(()=>s.repository.transaction(true,async t=>{const row=await t.get('blocks',b.id);delete row.value.recoveryPurgeRevision;await t.put('blocks',row);}));
 await assert.rejects(()=>s.recoveryDraftSourceIds(old),e=>e.code==='INVALID_REQUEST');
 const fresh=draftFor(await s.input(b.id));await s.recoveryDraftSourceIds(fresh);const floor=(await s.input(b.id)).recoveryPurgeRevision;
 await inputEdit(s,b.id,{note:'Later ordinary note'});await s.recoveryDraftSourceIds(fresh);assert.equal((await s.input(b.id)).recoveryPurgeRevision,floor);
});

test('CURRENT B-02 refusal + historical fixture: Thought recovery ownership and independent post-purge conflicts retain human work',async()=>{
 const {s}=await setup(OrganizerStore),b=(await s.snapshot()).library.blocks[0],created=await s.continueThinking({operationId:op(),body:'Independently authored thought',inputId:b.id});
 const before=await s.entry(created.id);assert.equal(before.provenanceType,'user_created');
 const draft=e=>({kind:'library_entry',ownerId:e.id,token:op(),operation:{type:'EDIT_LIBRARY_BATCH',edit:{operationId:op(),entries:[{id:e.id,expectedRevision:e.revision,expectedFieldRevisions:e.fieldRevisions,changes:{body:'Human recovery work'}}]}}});
 const stale=draft(before);await admitPreGatePurgeFixture(s,b.sourceRecordId);await s.drainPurgeCleanup();await s.drainInvalidations();
 await assert.rejects(()=>s.recoveryDraftSourceIds(stale),e=>e.code==='INVALID_REQUEST');
 const current=await s.entry(before.id);assert.equal(current.body,'Independently authored thought');const fresh=draft(current);await s.recoveryDraftSourceIds(fresh);
 await s.editLibraryBatch({operationId:op(),entries:[{id:current.id,expectedRevision:current.revision,expectedFieldRevisions:current.fieldRevisions,changes:{note:'Concurrent new note'}}]});
 await s.recoveryDraftSourceIds(fresh);
 const wrong=structuredClone(fresh);wrong.operation.edit.entries[0].id='different-owner';await assert.rejects(()=>s.recoveryDraftSourceIds(wrong));
});

test('recovery floor is omitted from portable rows, nested revision images and organizationState',()=>{
 const row={id:'fixture',recoveryPurgeRevision:4,before:{body:'Human',recoveryPurgeRevision:3},after:{body:'Human 2',nested:{recoveryPurgeRevision:4}},data:{id:'aiPresentation:fixture',recoveryPurgeRevision:4}};
 for(const kind of ['inputs','entries','topics','sections','revisions','organizationState'])assert.doesNotMatch(JSON.stringify(projectBackupEntity(kind,row)),/recoveryPurgeRevision/);
});

test('Backup empty/replace rotates only local recovery epoch; merge preserves it and failed restore rolls it back',async()=>{
 const source=await completeFixture({texts:[]});await append(source.s,'Portable source','source-one','portable-chat');const items=await exported(new BackupService(source.s));
 assert.doesNotMatch(JSON.stringify(items),/recovery-restore-epoch|recoveryPurgeRevision/);
 for(const mode of ['empty','replace','merge']){
  const target=await completeFixture({texts:[]});if(mode!=='empty')await append(target.s,'Local existing source','local-one','local-chat');
  const service=new BackupService(target.s),stage=await prepared(service,items),preview=await service.previewRestore({sessionId:stage.sessionId,mode}),before=await target.s.recoveryDraftEpoch();assert.equal(preview.canRestore,true,preview.reason);
  await service.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode,targetGeneration:preview.targetGeneration,confirmReplace:true,confirmMerge:true});
  const after=await target.s.recoveryDraftEpoch();if(mode==='merge')assert.equal(after,before);else assert.notEqual(after,before);
  assert.doesNotMatch(JSON.stringify(await exported(new BackupService(target.s))),/recovery-restore-epoch|recoveryPurgeRevision/);
 }
 const target=await completeFixture({texts:[]});await append(target.s,'Preserve on failure','failure-one','failure-chat');const service=new BackupService(target.s),stage=await prepared(service,items),preview=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'}),before=await target.s.recoveryDraftEpoch(),transaction=target.s.repository.transaction.bind(target.s.repository);
 target.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=(name,row)=>{if(name==='records')throw {code:'STORAGE_FAILED'};return put(name,row);};}return fn(t);},stores);
 await assert.rejects(()=>service.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true}));assert.equal(await target.s.recoveryDraftEpoch(),before);assert.equal((await rows(target.s,'records'))[0].value.originalText,'Preserve on failure');
});

test('an editor built from an old snapshot after restore never refreshes its recovery token',async()=>{
 const requests=[];globalThis.chrome={runtime:{sendMessage:async message=>{requests.push(message);return {ok:false,error:'INVALID_REQUEST'};}}};
 const session=new RecoveryDraftSession({kind:'document',ownerId:'fixture',epoch:'old-read-epoch'});
 await assert.rejects(()=>session.protect({type:'EDIT_DOCUMENT',edit:{documentId:'fixture',blocks:[]}},'old-snapshot-token'));
 assert.equal(requests.length,1);assert.equal(requests[0].type,'PAIA_RECOVERY_DRAFT_SAVE');assert.equal(requests[0].draft.epoch,'old-read-epoch');
 const legacy=new RecoveryDraftSession({kind:'document',ownerId:'fixture'});await assert.rejects(()=>legacy.protect({},'legacy-token'));assert.equal(requests.length,1,'missing snapshot identity fails without fetching a new token');
});

test('CURRENT B-02 refusal + historical fixture: repeated Source purge advances the surviving Thought floor while retaining its protected note',async()=>{
 const f=await completeFixture({texts:['Synthetic context one','Synthetic context two']}),blocks=(await rows(f.s,'blocks')).map(r=>r.value);
 const evidence=await f.s.evidenceFor(blocks.map(b=>({inputId:b.id,role:'primary',selectedFields:['body']})));
 const created=await f.s.createEntry({operationId:op(),actor:'user',body:'Source-derived body',note:'Independent authored note',type:'idea',formation:'synthesized',evidence});
 const floors=[];
 for(const block of blocks){
  const before=await f.s.entry(created.id),draft={kind:'library_entry',ownerId:created.id,operation:{type:'EDIT_LIBRARY_BATCH',edit:{entries:[{id:created.id,expectedRevision:before.revision}]}}};
  await admitPreGatePurgeFixture(f.s,block.sourceRecordId);await f.s.drainPurgeCleanup();await f.s.drainInvalidations();
  await assert.rejects(()=>f.s.recoveryDraftSourceIds(draft),e=>e.code==='INVALID_REQUEST');
  const after=await f.s.entry(created.id);assert.equal(after.note,'Independent authored note');floors.push(after.recoveryPurgeRevision);
 }
 assert.ok(floors[1]>floors[0]);
});

test('CURRENT B-02 refusal + historical fixture: deleted and recreated AI owner cannot admit old text even when its numeric revision resets',async()=>{
 const {AIPresentationRunner}=await import('../core/organizer/ai-presentation.js');
 const {DeepSeekOrganizerProvider}=await import('./harness/historical-provider.mjs');
 const {AI_LIST_FIELDS}=await import('../core/organizer/ai-contract.js');
 const {response,meta}=await import('./harness/original-complete.mjs');
 const f=await completeFixture({texts:['Synthetic initial source for generation test']});await f.runner.wake({userActionId:op()});
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:'Synthetic summary',currentView:'Synthetic view',...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(input=>input.ref)})}}]});}});
 const runner=new AIPresentationRunner(f.s,{provider,credentials:f.credentials});assert.equal((await reviewAndAdoptFirstAI(runner,{userActionId:op()})).completed,true);
 const old=(await f.s.aiPresentationStatus()).topics.find(topic=>topic.presentation).presentation;
 const draft={kind:'ai_presentation',ownerId:old.topicId,operation:{type:'AI_RECOVERY_SNAPSHOT',topicId:old.topicId,baseRevision:old.revision,generation:old.recoveryGeneration,values:{currentView:'Pre-purge recovery'}}};await f.s.recoveryDraftSourceIds(draft);
 await admitPreGatePurgeFixture(f.s,(await rows(f.s,'records'))[0].id);await f.s.drainPurgeCleanup();await f.s.drainInvalidations();assert.equal(await meta(f.s,'aiPresentation:'+old.topicId),undefined);
 await f.s.continueThinking({operationId:op(),body:'Independent replacement evidence',topicId:old.topicId});assert.equal((await reviewAndAdoptFirstAI(runner,{userActionId:op(),topicId:old.topicId})).completed,true);
 const current=(await f.s.aiPresentationStatus()).topics.find(topic=>topic.topicId===old.topicId).presentation;assert.equal(current.revision,old.revision);assert.notEqual(current.recoveryGeneration,old.recoveryGeneration);
 await assert.rejects(()=>f.s.recoveryDraftSourceIds(draft),e=>e.code==='INVALID_REQUEST');
 const fresh={...draft,operation:{...draft.operation,generation:current.recoveryGeneration}};await f.s.recoveryDraftSourceIds(fresh);
 await f.s.editAIPresentation({topicId:current.topicId,field:'currentView',value:'Later ordinary human edit',expectedRevision:current.revision,operationId:op()});await f.s.recoveryDraftSourceIds(fresh);
 assert.doesNotMatch(JSON.stringify(await exported(new BackupService(f.s))),/recoveryGeneration|recoveryPurgeRevision/);
});


test('persisted legacy AI recovery stays readable for the unchanged legacy owner but cannot cross a new generation',async()=>{
 const f=await completeFixture({texts:[]}),topic=await f.s.createTopic({name:'Legacy recovery owner',operationId:op()});
 const draft={kind:'ai_presentation',ownerId:topic.id,operation:{type:'AI_RECOVERY_SNAPSHOT',topicId:topic.id,baseRevision:3,values:{currentView:'Interrupted legacy human edit'}}};
 await f.s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+topic.id,topicId:topic.id,revision:3,evidenceEntryIds:[],currentView:'Legacy body'}));
 assert.deepEqual(await f.s.recoveryDraftSourceIds(draft),[]);
 await f.s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+topic.id,topicId:topic.id,revision:3,recoveryGeneration:'new-generation',evidenceEntryIds:[],currentView:'New lifetime'}));
 await assert.rejects(()=>f.s.recoveryDraftSourceIds(draft),e=>e.code==='INVALID_REQUEST');
});
