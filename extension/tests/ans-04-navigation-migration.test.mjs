import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,seedMetadata,settled,allPages,factDigest,windowOptions,ArchiveNavigationQuery,rows,NAV_CATALOG,evidence} from './harness/ans-navigation.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {clearSourceStructureEphemeral} from '../core/source-structure-backup.js';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
const at=n=>new Date(Date.UTC(2026,8,1,0,n)).toISOString();
const ref=i=>({platform:'chatgpt',sourceConversationId:'ans04-chat-'+i});
const project=(id,namespace='n')=>({providerKey:'chatgpt',namespace,projectId:id});
async function observe(structure,subject,n,expectedRevision,fields){return structure.observeConversation({conversationRef:subject,observedAt:at(n),expectedRevision,evidence:evidence(n),...fields});}
async function edit(s,b,body){const live=await s.input(b.id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:live.revision,libraryText:body,note:live.note,excluded:false}]});}

test('ANS-04 index build/clear/rebuild is lossless for Source, edited Inputs, independent Thoughts, revisions and policies',async()=>{
 const {s}=await completeFixture({texts:['immutable synthetic Source wording']});await s.finishFoundation();
 const snapshot=await s.snapshot(),b=snapshot.library.blocks[0];await edit(s,b,'User edited working text');
 await s.continueThinking({body:'Independent human-authored thought',inputId:b.id,operationId:crypto.randomUUID()});
 await s.updateDocument(b.documentId,{userTitle:'User-owned title'});
 const before=await factDigest(s),q=new ArchiveNavigationQuery(s),p=await settled(q,windowOptions);
 assert.equal(p.items[0].title,'User-owned title');assert.equal(await factDigest(s),before);
 await s.write(t=>clearSourceStructureEphemeral(t));
 assert.equal((await q.page(windowOptions)).coverage.state,'building');await settled(q,windowOptions);
 assert.equal(await factDigest(s),before);
 const records=await rows(s,'records');assert.equal(records[0].value.originalText,'immutable synthetic Source wording');
 assert.equal((await s.input(b.id)).libraryText,'User edited working text');
});
test('ANS-04 interrupted checkpoints resume; concurrent writes cannot publish stale or incomplete generations',async()=>{
 const f=await completeFixture({texts:[]});await seedMetadata(f.s,240);let mutated=false;
 const racing=new ArchiveNavigationQuery(f.s,{checkpoint:async phase=>{if(phase==='prepared'&&!mutated){mutated=true;await f.s.repository.transaction(true,async t=>{const d=await t.get('documents','ans04-meta-000000');d.value.userTitle='Concurrent title';await t.put('documents',d);});}}});
 await racing.page(windowOptions);await racing.page(windowOptions);
 let catalog=await f.s.repository.transaction(false,t=>t.get('meta',NAV_CATALOG));assert.equal(catalog.scannedDocuments,0,'stale prepared batch must not advance');
 let stopped=false;const crashing=new ArchiveNavigationQuery(f.s,{checkpoint:async phase=>{if(phase==='batch'&&!stopped){stopped=true;throw Error('synthetic worker stop');}}});
 await assert.rejects(()=>crashing.page(windowOptions),/synthetic worker stop/);
 catalog=await f.s.repository.transaction(false,t=>t.get('meta',NAV_CATALOG));assert.equal(catalog.scannedDocuments,100);assert.equal(catalog.phase,'building');
 // A new document sorting before the persisted checkpoint must still arrive via durable invalidation.
 await f.s.write(async t=>{const row=await t.get('documents','ans04-meta-000000');row.id='000-concurrent-window';row.sequence=999;row.value={...row.value,id:row.id,sourceConversationId:'concurrent-before-cursor'};row.chatKey='chatgpt:concurrent-before-cursor';row.libraryDisplay=[0,row.id];await t.put('documents',row);});
 const restarted=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),q=new ArchiveNavigationQuery(restarted);
 assert.equal((await q.status(windowOptions)).coverage.state,'building');
 const list=await allPages(q,windowOptions);assert.equal(list.length,241);assert.equal(new Set(list.map(x=>x.id)).size,241);
 assert.equal(list.find(x=>x.id==='ans04-meta-000000').title,'Concurrent title');assert.ok(list.some(x=>x.id==='000-concurrent-window'));
});

test('ANS-04 aborted invalidation rolls back the canonical write and leaves the certified generation valid',async()=>{
 const {s}=await completeFixture({texts:[]});await seedMetadata(s,80);const q=new ArchiveNavigationQuery(s),first=await settled(q,windowOptions);
 const original=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,stores)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=(name,row,key)=>{if(name==='meta'&&row.id.startsWith('ans:index-state:v1:dirty:'))throw new DOMException('synthetic quota','QuotaExceededError');return put(name,row,key);};}return fn(t);},stores);
 await assert.rejects(()=>s.write(async t=>{const d=await t.get('documents','ans04-meta-000000');d.value.userTitle='MUST ROLL BACK';await t.put('documents',d);}),e=>e.code==='STORAGE_FULL');
 s.repository.transaction=original;const next=await q.page({...windowOptions,cursor:first.nextCursor});assert.equal(next.cursorInvalid,false);assert.equal(next.generation,first.generation);
 assert.equal((await rows(s,'documents')).find(x=>x.id==='ans04-meta-000000').value.userTitle,'User 0');
});
test('ANS-04 move/rename/deletion paths are exclusive; parent deletion does not delete children; other scopes retain generation',async()=>{
 const {s}=await completeFixture({texts:[]});await seedMetadata(s,100,{providers:['chatgpt','claude']});
 const q=new ArchiveNavigationQuery(s),structure=new SourceStructureStore(s),A=project('same','a'),B=project('same','b');
 const old=await settled(q,windowOptions),claude={providerKey:'claude',groupKind:'unknown'},other=await settled(q,claude);
 await observe(structure,ref(0),1,0,{membership:{state:'project',projectRef:A},projectName:'Ａ',sourceStatus:'observed_active'});
 await observe(structure,ref(2),2,0,{membership:{state:'project',projectRef:B},projectName:'a',sourceStatus:'observed_active'});
 for(const [n,P,name]of [[3,A,'Ａ'],[4,B,'a']])await structure.observeProject({projectRef:P,expectedRevision:0,observedAt:at(n),evidence:evidence(n),currentName:name,sourceStatus:'observed_active'});
 let groups=await allPages(q,{providerKey:'chatgpt'});assert.equal(groups.filter(g=>g.groupKind==='project').length,2);
 assert.deepEqual(groups.filter(g=>g.groupKind==='project').map(g=>g.projectRef.namespace),['a','b']);
 const moved=await settled(q,{...windowOptions,selectedDocumentId:'ans04-meta-000000'});assert.equal(moved.selectedPath.groupKind,'project');assert.deepEqual(moved.selectedPath.projectRef,A);
 assert.equal((await q.page({...windowOptions,cursor:old.nextCursor})).cursorInvalid,true);
 assert.equal((await q.status(claude)).generation,other.generation,'unrelated scope is not rebuilt');
 await structure.observeProject({projectRef:A,expectedRevision:1,observedAt:at(5),evidence:evidence(5),sourceStatus:'confirmed_deleted'});
 const ap={providerKey:'chatgpt',groupKind:'project',projectRef:A};
 let child=(await settled(q,ap)).items[0];assert.equal(child.parentSourceStatus,'confirmed_deleted');assert.equal(child.sourceStatus,'observed_active');
 assert.equal((await structure.conversation(ref(0))).sourceStatus,'observed_active');
 await observe(structure,ref(0),6,1,{sourceStatus:'confirmed_deleted'});
 assert.equal((await settled(q,{providerKey:'chatgpt',groupKind:'deleted'})).items[0].documentId,'ans04-meta-000000');
 assert.equal((await settled(q,ap)).items.length,0);
 await observe(structure,ref(0),7,2,{sourceStatus:'observed_active'});assert.equal((await settled(q,ap)).items.length,1);
 await observe(structure,ref(0),8,3,{membership:{state:'unassigned',projectRef:null}});
 assert.equal((await settled(q,{providerKey:'chatgpt',groupKind:'unassigned'})).items[0].documentId,'ans04-meta-000000');
 groups=await allPages(q,{providerKey:'chatgpt'});assert.equal(groups.some(g=>g.projectRef?.namespace==='a'),false,'last-known project does not duplicate a current path');
 const windows=[];for(const g of groups)windows.push(...await allPages(q,{providerKey:'chatgpt',groupKind:g.groupKind,...(g.projectRef?{projectRef:g.projectRef}:{})}));
 assert.equal(windows.length,50);assert.equal(new Set(windows.map(w=>w.documentId)).size,50);
});
test('ANS-04 hot-index purge fences old generations, removes source refs/titles, and keeps genuinely detached user work',async()=>{
 const {s}=await completeFixture({texts:['PURGE_SOURCE_WORDING']});await s.finishFoundation();const snapshot=await s.snapshot(),b=snapshot.library.blocks[0],doc=snapshot.conversations[0];
 await edit(s,b,'Independent retained user edit');await s.updateDocument(doc.id,{userTitle:'User retained title'});
 const structure=new SourceStructureStore(s),conv={platform:doc.platform,sourceConversationId:doc.sourceConversationId},P=project('PURGE_PROJECT_ID');
 await observe(structure,conv,1,0,{membership:{state:'project',projectRef:P},projectName:'PURGE_PROJECT_TITLE',sourceStatus:'observed_active'});
 await structure.observeProject({projectRef:P,expectedRevision:0,observedAt:at(2),evidence:evidence(2),currentName:'PURGE_PROJECT_TITLE'});
 const q=new ArchiveNavigationQuery(s);await settled(q,{providerKey:'chatgpt'});const hot=await settled(q,{providerKey:'chatgpt',groupKind:'project',projectRef:P});assert.equal(hot.items.length,1);
 await s.permanentDelete(snapshot.records[0].id);
 assert.equal(await structure.conversation(conv),null);assert.equal(await structure.project(P),null);
 assert.equal((await rows(s,'meta')).some(r=>r.id.startsWith('ans:')),false,'all old generations are removed in purge transaction');
 const cold=await q.page({selectedDocumentId:doc.id});assert.equal(cold.coverage.state,'building');assert.deepEqual(cold.items,[]);
 const local=await settled(q,{groupKind:'detached'});assert.equal(local.items.length,1);assert.equal(local.items[0].conversationRef,null);assert.equal(local.items[0].title,'User retained title');
 assert.equal((await s.input(b.id)).libraryText,'Independent retained user edit');
 const serialized=JSON.stringify((await rows(s,'meta')).filter(r=>r.id.startsWith('ans:')));assert.doesNotMatch(serialized,/PURGE_PROJECT_ID|PURGE_PROJECT_TITLE|complete-synthetic/);
 const backup=await exported(new BackupService(s,{appVersion:'0.12.0'}));assert.doesNotMatch(JSON.stringify(backup),/PURGE_PROJECT_ID|PURGE_PROJECT_TITLE|PURGE_SOURCE_WORDING/);
});

test('ANS-04 official Backup excludes projections and restore drops hot indexes before rebuilding canonical metadata',async()=>{
 const source=await completeFixture({texts:['Backup exact Source']}),q=new ArchiveNavigationQuery(source.s);await source.s.finishFoundation();
 const snapshot=await source.s.snapshot(),b=snapshot.library.blocks[0];await edit(source.s,b,'Backup exact working body');await settled(q,windowOptions);
 const items=await exported(new BackupService(source.s,{appVersion:'0.12.0'}));assert.doesNotMatch(JSON.stringify(items),/ans:index:v1:|ans:index-state:v1:/);
 const occupied=await completeFixture({texts:['Unrelated stale target']});
 const blocked=await prepared(new BackupService(occupied.s,{appVersion:'0.12.0'}),items);assert.equal(blocked.preview.canRestore,false);assert.equal(blocked.preview.reason,'BACKUP_TARGET_NOT_EMPTY');
 const target=await completeFixture({texts:[]}),tq=new ArchiveNavigationQuery(target.s);assert.equal((await settled(tq,windowOptions)).items.length,0);
 const service=new BackupService(target.s,{appVersion:'0.12.0'}),stage=await prepared(service,items);assert.equal(stage.preview.canRestore,true);
 await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 assert.equal((await tq.page(windowOptions)).coverage.state,'building');const restored=await settled(tq,windowOptions);assert.equal(restored.items.length,1);assert.equal(restored.items[0].documentId,b.documentId);
 assert.equal((await target.s.input(b.id)).libraryText,'Backup exact working body');assert.equal((await rows(target.s,'records'))[0].value.originalText,'Backup exact Source');
});
test('ANS-04 actual Input removal/restoration and title edits invalidate without changing Source identity',async()=>{
 const {s}=await completeFixture({texts:['Source one','Source two']});await s.finishFoundation();const snapshot=await s.snapshot(),q=new ArchiveNavigationQuery(s),sourceRows=JSON.stringify(await rows(s,'records'));
 const first=await settled(q,windowOptions);assert.equal(first.items.length,1);
 for(const b of snapshot.library.blocks)await s.excludeLibrary(b.id,true);
 assert.equal((await settled(q,windowOptions)).items.length,0);
 await s.excludeLibrary(snapshot.library.blocks[0].id,false);await s.updateDocument(snapshot.conversations[0].id,{userTitle:'Restored user title'});
 const restored=await settled(q,windowOptions);assert.equal(restored.items.length,1);assert.equal(restored.items[0].title,'Restored user title');assert.notEqual(restored.generation,first.generation);
 assert.equal(JSON.stringify(await rows(s,'records')),sourceRows);
});

test('ANS-04 official import invalidates a cold-complete catalog without UI notifications or body-backed query fallback',async()=>{
 const {ImportLedger}=await import('../core/import/ledger.js'),{ImportCoordinator}=await import('../core/import/coordinator.js'),{getOfficialExportAdapter}=await import('../core/import/registry.js');
 const {s}=await completeFixture({texts:[]}),q=new ArchiveNavigationQuery(s);assert.equal((await settled(q)).items.length,0);
 const ledger=new ImportLedger(s),coordinator=new ImportCoordinator({transport:(method,request)=>ledger[method](request,'ans04-import-test'),resolveAdapter:getOfficialExportAdapter});
 const data=[{uuid:'ans04-claude-conversation',name:'Imported synthetic window',current_leaf_message_uuid:'ans04-assistant',chat_messages:[{uuid:'ans04-human',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'IMPORT_BODY_MUST_NOT_APPEAR_IN_NAV'}]},{uuid:'ans04-assistant',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'ans04-human',content:[{type:'text',text:'ASSISTANT_MUST_NOT_ARCHIVE'}]}]}];
 await coordinator.select(new Blob([JSON.stringify(data)]),{consent:true});await coordinator.preflight();const result=await coordinator.commit();assert.ok(['completed','partial'].includes(result.phase));
 const page=await settled(q);assert.deepEqual(page.items.map(x=>x.providerKey),['claude']);
 const imported=await settled(q,{providerKey:'claude',groupKind:'unknown'});assert.equal(imported.items.length,1);assert.doesNotMatch(JSON.stringify(imported),/IMPORT_BODY_MUST_NOT_APPEAR_IN_NAV|ASSISTANT_MUST_NOT_ARCHIVE/);
});
for(const method of ['page','status'])test(`ANS-04 cold ${method} selected-path read is fenced against a concurrent purge`,async()=>{
 const f=await completeFixture({texts:['selection fence Source']});await f.s.finishFoundation();const snap=await f.s.snapshot(),documentId=snap.conversations[0].id;
 const other=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),q=new ArchiveNavigationQuery(f.s),selected=q.index.selected.bind(q.index);let purged=false;
 q.index.selected=async(...args)=>{const result=await selected(...args);if(!purged){purged=true;await other.permanentDelete(snap.records[0].id);}return result;};
 const result=await q[method]({selectedDocumentId:documentId});assert.equal(result.selectedPath,null);assert.deepEqual(result.items,[]);assert.doesNotMatch(JSON.stringify(result),/complete-synthetic/);
});
