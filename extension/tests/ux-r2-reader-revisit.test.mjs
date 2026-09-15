import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,meta} from './harness/original-complete.mjs';
import {capture,inputEdit} from './harness/thought-m1.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {ReaderStateService,READING_ROW,VISIT_ROW,REVISIT_POLICY_ROW,CAPTURE_POLICY_ROW,safeOffset} from '../core/reader-state.js';
import {RevisitService,REVISIT_ROW} from '../core/revisit.js';
import {BackupService} from '../core/backup-service.js';
import {backupMetaAllowed,validateBackupItem} from '../core/backup-format.js';
const op=()=>crypto.randomUUID();
const anchor=b=>({documentId:b.documentId,inputId:b.id,revision:b.revision,offset:3,sort:'asc',expanded:[b.id]});
async function add(s,id='r2-new-message',chatId='r2-new-chat',text='UX-R2 synthetic later input'){
 const req=capture((await s.status()).epoch,id,text);req.chat={id:chatId,url:'https://chatgpt.com/c/'+chatId,title:'Synthetic conversation'};return s.capture(req);
}

test('T-03/05 MIG-02 stores a real bounded position without source text; new captures never reorder reads',async()=>{
 const f=await completeFixture(),reader=new ReaderStateService(f.s),b=(await rows(f.s,'blocks'))[0].value,before=await rows(f.s,'records');
 assert.deepEqual(await reader.recent(),[]);assert.equal(await meta(f.s,READING_ROW),undefined);
 assert.deepEqual(await reader.save(anchor(b)),{saved:true});await add(f.s);const recent=await reader.recent();assert.equal(recent[0].inputId,b.id);assert.equal(recent[0].offset,3);
 const saved=await meta(f.s,READING_ROW);assert.equal(saved.anchors.length,1);assert.doesNotMatch(JSON.stringify(saved),/originalText|libraryText|snippet|Synthetic|事实/);assert.equal(backupMetaAllowed(READING_ROW),false);
 assert.deepEqual((await rows(f.s,'records')).filter(x=>before.some(y=>y.id===x.id)),before);
 await inputEdit(f.s,b.id,{libraryText:'今天的工作版本'});assert.deepEqual(await reader.save(anchor(b)),{saved:false,conflict:true});assert.equal((await reader.resolve(b.documentId)).revision,b.revision+1);
 assert.equal(f.requests.length,0);
});

test('T-05 removal and purge resume nearby without reviving the old target; Unicode offsets are grapheme safe',async()=>{
 const f=await completeFixture(),reader=new ReaderStateService(f.s),b=(await rows(f.s,'blocks'))[0].value;
 await reader.save(anchor(b));await inputEdit(f.s,b.id,{excluded:true});const near=await reader.resolve(b.documentId);assert.equal(near.nearby,true);assert.notEqual(near.inputId,b.id);
 await f.s.permanentDelete(b.originalTextReference);assert.equal((await meta(f.s,READING_ROW)).anchors[0].inputId,null);assert.equal((await meta(f.s,READING_ROW)).anchors[0].expanded.includes(b.id),false);
 assert.notEqual((await reader.resolve(b.documentId))?.inputId,b.id);assert.equal(safeOffset('甲👩‍💻e\u0301乙',4),1);assert.equal(safeOffset('甲👩‍💻e\u0301乙',7),6);
});

test('T-05 MIG-02 evicts only position metadata after 200 documents and rejects injected bodies/future versions',async()=>{
 const f=await completeFixture({texts:[]}),reader=new ReaderStateService(f.s);for(let i=0;i<201;i++){await add(f.s,'r2-cap-'+i,'r2-doc-'+i);const b=(await f.s.page({view:'library',limit:1})).recentCapturedDocument;const page=await f.s.page({view:'library',documentId:b.id});await reader.save(anchor(page.library.blocks[0]));}
 assert.equal((await meta(f.s,READING_ROW)).anchors.length,200);assert.equal((await rows(f.s,'blocks')).length,201);
 await assert.rejects(async()=>reader.save({...anchor((await rows(f.s,'blocks'))[0].value),body:'must not persist'}));
 await f.s.run(()=>f.s.repository.transaction(true,t=>t.put('meta',{id:READING_ROW,version:99,anchors:[]})));await assert.rejects(()=>reader.recent());
});

test('T-06/26 MIG-03 upgrades old baseline read-only, first visit is quiet, windows survive reload and close advances only its fixed end',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s),legacy={id:REVISIT_ROW,version:1,lastBlockSequence:0,lastSeenAt:'2020-01-01T00:00:00Z'};
 await f.s.run(()=>f.s.repository.transaction(true,t=>t.put('meta',legacy)));const before=await rows(f.s,'records');const initial=await service.status();assert.equal(initial.newInputs.count,0);assert.deepEqual(await meta(f.s,REVISIT_ROW),legacy);
 await add(f.s);const win=await service.open();assert.equal((await service.status({windowId:win.id})).newInputs.count,1);
 await add(f.s,'r2-next-message','r2-next-chat');assert.equal((await service.status({windowId:win.id})).newInputs.count,1);
 const restarted=new RevisitService(f.s);assert.deepEqual(await restarted.open({windowId:win.id}),win);await restarted.close({windowId:win.id});assert.equal((await restarted.status()).newInputs.count,1);
 await restarted.status();assert.deepEqual((await rows(f.s,'records')).filter(x=>before.some(y=>y.id===x.id)),before);assert.equal(backupMetaAllowed(VISIT_ROW),false);
});

test('T-06/26 migration failure retries atomically; imported history never becomes new debt',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let fail=true;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write&&fail){const put=t.put.bind(t);t.put=(name,row)=>{if(row.id===VISIT_ROW){fail=false;throw {code:'STORAGE_FAILED'};}return put(name,row);};}return fn(t);},stores);
 await assert.rejects(()=>service.status());assert.equal(await meta(f.s,VISIT_ROW),undefined);assert.equal((await service.status()).newInputs.count,0);
 await add(f.s);const r=(await rows(f.s,'records')).find(x=>x.value.chatId==='r2-new-chat');await f.s.run(()=>f.s.repository.transaction(true,t=>t.put('records',{...r,value:{...r.value,importedAt:'2026-09-13T00:00:00Z'}})));
 assert.equal((await service.status()).newInputs.count,0);assert.equal((await rows(f.s,'records')).length,6);
});

test('T-06 old recall requires opt-in even on explicit visit; input/document/topic rules suppress derived previews without touching AI authorization',async()=>{
 const f=await completeFixture();await f.s.enrich({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'complete-synthetic',url:'https://chatgpt.com/c/complete-synthetic'},messages:(await rows(f.s,'records')).map((r,i)=>({sourceMessageId:r.value.sourceMessageId,pageOrder:i+1,sourceTime:{state:'valid',createTime:1609459200,updateTime:1609459201}}))});await f.runner.wake({userActionId:op()});const reader=new ReaderStateService(f.s),service=new RevisitService(f.s),before=await rows(f.s,'records');
 await service.status();assert.deepEqual((await service.status({includeOld:true})).resurface,[]);await reader.configure({oldContent:true});
 const recalled=await service.status({includeOld:true});assert.ok(recalled.resurface.length>0);const topic=(await rows(f.s,'topics'))[0];await reader.configure({kind:'topic',id:topic.id,excluded:true});
 const blocked=await service.status({includeOld:true});assert.equal(blocked.resurface.length,0);assert.equal(blocked.topicUpdates.some(x=>x.topicId===topic.id),false);
 assert.equal((await reader.policy()).revisit.oldContent,true);assert.deepEqual(await rows(f.s,'records'),before);assert.equal(await meta(f.s,'memory:config'),undefined);
 await reader.configure({kind:'topic',id:topic.id,excluded:false});const b=(await rows(f.s,'blocks'))[0].value;await reader.save(anchor(b));await reader.configure({kind:'input',id:b.id,excluded:true});assert.deepEqual(await reader.recent(),[]);assert.equal((await reader.resolve(b.documentId)).inputId,b.id);assert.equal((await service.status({includeOld:true})).resurface.some(x=>x.id===b.id),false);
 await reader.configure({kind:'document',id:b.documentId,excluded:true});assert.equal((await service.status({includeOld:true})).resurface.length,0);
});

test('T-31 DELTA-08 precise capture exclusion is atomic, persists across worker restart, rejects late enrichment, leaves other conversations and existing content intact',async()=>{
 const f=await completeFixture(),reader=new ReaderStateService(f.s),b=(await rows(f.s,'blocks'))[0].value,doc=(await rows(f.s,'documents'))[0].value,before=await rows(f.s,'records');
 await reader.captureScope({documentId:b.documentId,excluded:true});assert.equal((await add(f.s,'r2-excluded-message',doc.sourceConversationId)).excluded,true);assert.deepEqual(await rows(f.s,'records'),before);
 assert.equal((await add(f.s,'r2-unrelated-message','r2-unrelated')).added,1);await f.s.repository.close();const restarted=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});assert.equal((await add(restarted,'r2-after-restart',doc.sourceConversationId)).excluded,true);
 const request=capture((await restarted.status()).epoch);request.chat={id:doc.sourceConversationId,url:'https://chatgpt.com/c/'+doc.sourceConversationId};request.messages=[{sourceMessageId:before[0].value.sourceMessageId,pageOrder:1}];assert.equal((await restarted.enrich(request)).excluded,true);
 await assert.rejects(()=>new ReaderStateService(restarted).captureScope({chatKey:'chatgpt:unknown',excluded:false}));await new ReaderStateService(restarted).captureScope({chatKey:'chatgpt:'+doc.sourceConversationId,excluded:false});assert.equal((await add(restarted,'r2-after-restart',doc.sourceConversationId)).added,1);
});

test('T-25/26 MIG-04/10 v0.12 backup round-trip preserves exclusions and preferences; positions excluded and old recall resets off',async()=>{
 const f=await completeFixture(),reader=new ReaderStateService(f.s),b=(await rows(f.s,'blocks'))[0].value;await reader.save(anchor(b));await new RevisitService(f.s).status();await reader.configure({oldContent:true});await reader.configure({kind:'input',id:b.id,excluded:true});await reader.captureScope({documentId:b.documentId,excluded:true});await f.s.updatePreferences({language:'en',appearance:'dark',fontSize:'large',sidebarCollapsed:true});
 const items=await exported(new BackupService(f.s,{appVersion:'0.12.0'}));assert.ok(items.some(x=>x.value?.id===REVISIT_POLICY_ROW));assert.ok(items.some(x=>x.value?.id===CAPTURE_POLICY_ROW));assert.ok(!items.some(x=>[READING_ROW,VISIT_ROW,REVISIT_ROW].includes(x.value?.id)));
 const target=await completeFixture({texts:[]}),backup=new BackupService(target.s),stage=await prepared(backup,items);assert.equal(stage.preview.canRestore,true);await backup.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const restored=await new ReaderStateService(target.s).policy();assert.equal(restored.revisit.oldContent,false);assert.deepEqual(restored.revisit.exclusions,(await reader.policy()).revisit.exclusions);assert.deepEqual(restored.capture,(await reader.policy()).capture);assert.equal((await target.s.snapshot()).preferences.language,'en');assert.equal((await new RevisitService(target.s).status()).newInputs.count,0);assert.deepEqual(await new ReaderStateService(target.s).recent(),[]);assert.equal(target.requests.length,0);
 const future=structuredClone(items);future[0].formatVersion=99;await assert.rejects(()=>prepared(backup,future));
 assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:REVISIT_POLICY_ROW,data:{id:REVISIT_POLICY_ROW,version:2,oldContent:true,exclusions:[]}}}));
});

test('T-06/24 concurrent Revisit reads serialize with policy changes and never cache the earlier preview',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s),reader=new ReaderStateService(f.s);await service.status();await add(f.s);
 const pending=service.status({includeOld:true});await reader.configure({kind:'document',id:(await f.s.page({view:'library',limit:1})).recentCapturedDocument.id,excluded:true});const result=await service.status({includeOld:true});await pending;assert.equal(result.newInputs.items.length,0);assert.doesNotMatch(JSON.stringify(result),/UX-R2 synthetic later input/);
});

test('T-04/24 failed undo remains retryable and a concurrent edit cannot be overwritten by a stale restore',async()=>{
 const f=await completeFixture(),b=(await rows(f.s,'blocks'))[0].value;await inputEdit(f.s,b.id,{libraryText:'Synthetic revision one'});const edited=await f.s.input(b.id),history=await f.s.revisions({documentId:b.documentId,kind:'input',entityId:b.id}),revision=history.items[0];
 await inputEdit(f.s,b.id,{libraryText:'Synthetic concurrent revision two'});assert.equal((await f.s.restoreRevision({id:revision.id,side:'before',expectedRevision:edited.revision,operationId:op()})).conflict,true);assert.equal((await f.s.input(b.id)).libraryText,'Synthetic concurrent revision two');
 const transaction=f.s.repository.transaction.bind(f.s.repository);let fail=true;f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=(store,row)=>{if(fail&&store==='blocks'){fail=false;throw {code:'STORAGE_FAILED'};}return put(store,row);};return fn(t);},stores);
 const current=await f.s.input(b.id),restore={id:revision.id,side:'before',expectedRevision:current.revision,operationId:op()};await assert.rejects(()=>f.s.restoreRevision(restore));assert.equal((await f.s.input(b.id)).libraryText,current.libraryText);await f.s.restoreRevision(restore);assert.equal((await f.s.input(b.id)).libraryText,revision.before.libraryText);assert.equal(f.requests.length,0);
});
