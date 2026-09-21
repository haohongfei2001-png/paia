import test from 'node:test';
import assert from 'node:assert/strict';
import {legacy,upgraded,canonical,digest} from './harness/ans09-legacy.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {BACKUP_LIMITS} from '../core/backup-format.js';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
import {ReaderStateService} from '../core/reader-state.js';
import {ArchiveNavigationQuery,settled} from './harness/ans-navigation.mjs';
import {clearSourceStructureEphemeral} from '../core/source-structure-backup.js';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {OrganizerStore} from '../core/organizer/store.js';

const portable=items=>items.filter(x=>x.type==='item'&&x.section!=='organizationState'&&x.section!=='settings').sort((a,b)=>(a.section+a.value.id).localeCompare(b.section+b.value.id));

test('ANS-09 M01/M02/M08 actual pre-ANS database upgrade, restart and index rebuild preserve every canonical field',async()=>{
 const f=await upgraded(),before=await canonical(f.s),policies=await new ReaderStateService(f.s).policy();
 assert.equal(legacy.baseline,'38804b99153074f54148f875e2e09c76568bc1cd');
 assert.equal((await rows(f.s,'meta')).some(x=>x.id.startsWith('ans:')),false);
 const q=new ArchiveNavigationQuery(f.s),page=await settled(q,{providerKey:'chatgpt',groupKind:'unknown'});
 assert.ok(page.items.length);assert.equal(page.items[0].groupKind,'unknown');
 await f.s.libraryIndexPage({limit:40});for(const topic of await rows(f.s,'topics'))await f.s.topicDocumentPage({topicId:topic.id,limit:40});
 assert.deepEqual(await canonical(f.s),before);assert.deepEqual(await new ReaderStateService(f.s).policy(),policies);
 await f.s.write(t=>clearSourceStructureEphemeral(t));await f.s.repository.close();
 const restarted=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});await settled(new ArchiveNavigationQuery(restarted),{providerKey:'chatgpt',groupKind:'unknown'});
 assert.deepEqual(await canonical(restarted),before);assert.equal(digest(await canonical(restarted)),digest(before));
 assert.equal((await restarted.input(legacy.firstInputId)).libraryText,'ANS09 human working text');
 assert.equal((await restarted.entry(legacy.firstEntryId)).body,'ANS09 independent human thought');
 const source=(await rows(restarted,'records')).map(x=>x.value);assert.ok(source.some(x=>x.sourceSentAt==='2021-01-01T00:00:00.000Z'));assert.ok(source.some(x=>x.sourceSentAt===null));
 assert.equal(source.filter(x=>x.originalText==='ANS09 repeated exact expression').length,2);
});

test('ANS-09 M01/V21/V22 actual pre-ANS Backup restores losslessly including bodies, identities, revisions, exclusions and fences',async()=>{
 const f=await completeFixture({texts:[]}),service=new BackupService(f.s,{appVersion:'0.12.0'}),stage=await prepared(service,legacy.backup);assert.equal(stage.preview.canRestore,true);
 await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const roundtrip=await exported(service);assert.deepEqual(portable(roundtrip),portable(legacy.backup));
 const policyItems=items=>items.filter(x=>x.section==='organizationState'&&['capture-policy:v1','revisit-policy:v1'].includes(x.value.id));assert.deepEqual(policyItems(roundtrip),policyItems(legacy.backup));
 assert.deepEqual(roundtrip.find(x=>x.section==='settings').value,legacy.backup.find(x=>x.section==='settings').value);
 assert.equal((await rows(f.s,'meta')).some(x=>/^ans:(conversation|project|event):/.test(x.id)),false);
 const before=portable(roundtrip);await settled(new ArchiveNavigationQuery(f.s),{providerKey:'chatgpt',groupKind:'unknown'});for(const topic of await rows(f.s,'topics'))await f.s.topicDocumentPage({topicId:topic.id,limit:40});
 assert.deepEqual(portable(await exported(service)),before);assert.equal(f.requests.length,0);
});

test('ANS-09 M05 corrupt/truncated/oversized/unknown-version legacy restore leaves an existing archive byte-for-byte usable',async()=>{
 const f=await upgraded(),before=await canonical(f.s),badHash=structuredClone(legacy.backup);badHash[1].value.id+='corrupt';
 const future=structuredClone(legacy.backup);future[0].schemaVersion=999;
 const oversized=structuredClone(legacy.backup);oversized.find(x=>x.section==='sources').value.originalText='x'.repeat(BACKUP_LIMITS.lineBytes+1);
 for(const [items,code]of [[badHash,'BACKUP_INTEGRITY_FAILED'],[future,'BACKUP_VERSION_UNSUPPORTED'],[oversized,'BACKUP_TOO_LARGE'],[legacy.backup.slice(0,-1),'BACKUP_INCOMPLETE']]){
  await assert.rejects(()=>prepared(new BackupService(f.s),items),error=>error.code===code);assert.deepEqual(await canonical(f.s),before);
 }
 const service=new BackupService(f.s),stage=await prepared(service,legacy.backup);assert.equal(stage.preview.reason,'BACKUP_TARGET_NOT_EMPTY');await assert.rejects(()=>service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity}));assert.deepEqual(await canonical(f.s),before);
});

test('ANS-09 M04/M06 legacy upgrade then external-delete history, Backup and purge preserve human work without source leakage',async()=>{
 const f=await upgraded(),before=await canonical(f.s),doc=before.documents[0].value,conv={platform:doc.platform,sourceConversationId:doc.sourceConversationId},projectRef={providerKey:'chatgpt',namespace:'ans09',projectId:'ANS09_PURGE_PROJECT'},structure=new SourceStructureStore(f.s);
 const ev=n=>({id:'ans09-'+n,contractId:'ans09.synthetic',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
 for(const [n,fields]of [[1,{membership:{state:'project',projectRef},projectName:'ANS09_PURGE_TITLE'}],[2,{sourceStatus:'confirmed_deleted'}]])await structure.observeConversation({conversationRef:conv,expectedRevision:n-1,observedAt:new Date(Date.UTC(2026,8,20,0,n)).toISOString(),evidence:ev(n),...fields});
 assert.deepEqual(await canonical(f.s),before,'external deletion is only metadata');
 const items=await exported(new BackupService(f.s)),target=await completeFixture({texts:[]}),service=new BackupService(target.s),stage=await prepared(service,items);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const restored=new SourceStructureStore(target.s);assert.equal((await restored.conversation(conv)).sourceStatus,'confirmed_deleted');
 const events=(await restored.history({kind:'conversation',conversationRef:conv})).items;assert.equal(events.length,2);assert.equal(events[0].observedAt,'2026-09-20T00:01:00.000Z');assert.ok(events.every(x=>x.evidence.channel==='restored'));
 for(const row of await rows(target.s,'records'))await target.s.permanentDelete(row.id);await target.s.drainPurgeCleanup();
 assert.equal(await restored.conversation(conv),null);assert.equal(await restored.project(projectRef),null);
 assert.doesNotMatch(JSON.stringify(await exported(service)),/ANS09_PURGE_PROJECT|ANS09_PURGE_TITLE|ANS09 legacy immutable source|ANS09 repeated exact expression/);
 assert.equal((await target.s.entry(legacy.independentEntryId)).body,'ANS09 wholly new human thought');
});

test('ANS-09 M05 legacy archive exclusion cannot produce a Backup with orphan placements',async()=>{
 const f=await upgraded();for(const b of await rows(f.s,'blocks'))await f.s.excludeLibrary(b.id,true);
 await f.s.drainInvalidations();await f.s.drainLibraryMaintenance();
 const items=await exported(new BackupService(f.s)),target=await completeFixture({texts:[]}),service=new BackupService(target.s),stage=await prepared(service,items);
 assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 assert.deepEqual(portable(await exported(service)),portable(items));
 assert.equal((await target.s.entry(legacy.independentEntryId)).body,'ANS09 wholly new human thought');
});
