import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {ImportLedger} from '../core/import/ledger.js';import {ImportCoordinator} from '../core/import/coordinator.js';import {officialExportAdapter} from '../core/import/chatgpt-export.js';
import {conversation,branched,historyFile} from './fixtures/history-v090.mjs';
import {BackupService} from '../core/backup-service.js';import {exported,prepared} from './harness/backup-v081.mjs';
async function fixture(data){const f=await completeFixture({texts:[]}),ledger=new ImportLedger(f.s);const load=async()=>{const c=new ImportCoordinator({adapter:officialExportAdapter,transport:(m,q)=>ledger[m](q,'review-test')});await c.select(historyFile(data),{consent:true});await c.preflight();await c.commit();};await load();return {...f,ledger,load};}
test('Input order is global across pages, independent of Thought preference and stable after reopen',async()=>{
 const f=await fixture([conversation(1,125)]),doc=(await f.s.page({view:'library'})).documents[0];
 await f.s.setOrganizerControls({inputReadingSort:'desc',readingSort:'asc'});assert.equal((await f.s.organizerControls()).inputReadingSort,'desc');
 const all=async sort=>{let cursor=null,ids=[];do{const p=await f.s.page({view:'library',documentId:doc.id,limit:40,sort,cursor});ids.push(...p.pageItemIds);cursor=p.nextCursor;}while(cursor);return ids;};
 const asc=await all('asc'),desc=await all('desc');assert.equal(asc.length,125);assert.deepEqual(desc,[...asc].reverse());assert.equal(new Set(desc).size,125);assert.equal((await f.s.organizerControls()).readingSort,'asc');assert.equal(f.requests.length,0);
 assert.ok((await f.s.page({view:'library',documentId:doc.id,contextInputId:asc[20],limit:10})).pageItemIds.includes(asc[20]));
});
for(const action of ['existing','standalone','ignore'])test('branch review '+action+' preserves source identity, revisions, repeat import and atomic state',async()=>{
 const f=await fixture([branched(),conversation(2,2)]),before=await rows(f.s,'records'),b=(await rows(f.s,'blocks')).find(x=>x.value.branchStatus).value,old=b.documentId,target=(await rows(f.s,'documents')).find(x=>x.id!==old).id;
 const q={id:b.id,expectedRevision:b.revision,operationId:crypto.randomUUID(),action,...(action==='existing'?{documentId:target}:{})};
 const result=await f.ledger.resolveBranch(q);assert.deepEqual(await f.ledger.resolveBranch(q),result);
 const after=await f.s.input(b.id);assert.equal(after.id,b.id);assert.deepEqual(after.provenance,b.provenance);assert.equal(after.branchStatus,undefined);assert.equal(after.excluded,action==='ignore');
 if(action==='existing')assert.equal(after.documentId,target);if(action==='standalone'){assert.notEqual(after.documentId,old);const d=(await rows(f.s,'documents')).find(x=>x.id===after.documentId);assert.equal(d.value.sourceConversationId,null);assert.ok(d.value.userTitle);}
 assert.deepEqual(await rows(f.s,'records'),before);const m=(await rows(f.s,'inputStates')).find(x=>x.id===b.id);assert.equal(m.documentId,after.documentId);assert.equal(m.removalState,action==='ignore'?'user_removed':'active');
 const fs=(await rows(f.s,'filterInputs')).find(x=>x.id===b.id);assert.equal(fs.documentId,after.documentId);
 const rev=await f.s.revisions({documentId:after.documentId,kind:'input',entityId:b.id});assert.ok(rev.items.length>=2);
 await f.load();const replay=await f.s.input(b.id);assert.equal(replay.documentId,after.documentId);assert.equal(replay.excluded,after.excluded);assert.equal(replay.branchStatus,undefined);assert.equal(f.requests.length,0);
 await assert.rejects(()=>f.ledger.resolveBranch({...q,operationId:crypto.randomUUID()}));
});
test('last branch moved out leaves original Source archive readable and failed target changes nothing',async()=>{
 const c=conversation(3,1);delete c.current_node;const f=await fixture([c]),b=(await rows(f.s,'blocks'))[0].value;
 const before=await rows(f.s,'blocks');await assert.rejects(()=>f.ledger.resolveBranch({id:b.id,expectedRevision:b.revision,operationId:crypto.randomUUID(),action:'existing',documentId:'missing'}));assert.deepEqual(await rows(f.s,'blocks'),before);
 await f.ledger.resolveBranch({id:b.id,expectedRevision:b.revision,operationId:crypto.randomUUID(),action:'standalone'});
 const archive=await f.s.page({view:'archive',documentId:b.documentId});assert.equal(archive.records.length,1);assert.equal((await f.s.page({view:'archive'})).documents.length,1);
 await f.s.setOrganizerControls({inputReadingSort:'desc',readingSort:'asc'});
 const backup=await exported(new BackupService(f.s,{appVersion:'0.9.1'})),target=await completeFixture({texts:[]}),service=new BackupService(target.s,{appVersion:'0.9.1'}),stage=await prepared(service,backup);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 assert.deepEqual(await rows(target.s,'records'),await rows(f.s,'records'));assert.deepEqual(await rows(target.s,'blocks'),await rows(f.s,'blocks'));assert.deepEqual(await rows(target.s,'revisions'),await rows(f.s,'revisions'));assert.equal((await target.s.organizerControls()).inputReadingSort,'desc');assert.equal((await target.s.page({view:'archive',documentId:b.documentId})).records.length,1);
 await f.s.trash(b.sourceRecordId);assert.equal((await f.s.page({view:'archive'})).documents.length,0);assert.ok((await rows(f.s,'documents')).some(d=>d.id===b.documentId));await f.s.restore(b.sourceRecordId);assert.equal((await f.s.page({view:'archive'})).documents.length,1);await f.s.purge(b.sourceRecordId,true);assert.equal((await rows(f.s,'documents')).some(d=>d.id===b.documentId),false);assert.equal((await rows(f.s,'records')).length,0);
});
