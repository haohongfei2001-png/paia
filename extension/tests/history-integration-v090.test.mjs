import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,rows,meta,append} from './harness/original-complete.mjs';
import {ImportLedger} from '../core/import/ledger.js';import {ImportCoordinator} from '../core/import/coordinator.js';
import {officialExportAdapter} from '../core/import/chatgpt-export.js';
import {conversation,branched,historyFile} from './fixtures/history-v090.mjs';
async function setup(){const f=await completeFixture({texts:[]});const ledger=new ImportLedger(f.s);return {...f,ledger,controller:new ImportCoordinator({adapter:officialExportAdapter,transport:(m,q)=>ledger[m](q,'synthetic-import-page')})};}
async function importAll(f,c=[conversation()]){await f.controller.select(historyFile(c),{consent:true});const p=await f.controller.preflight();assert.equal(p.phase,'ready');return f.controller.commit();}
test('real production ledger profile feeds current Input state/filter queue/delta, with no automatic AI',async()=>{
 const f=await setup(),r=await importAll(f,[branched()]);assert.equal(r.phase,'partial');assert.equal(r.counts.newSources,3);assert.equal(r.counts.review,1);
 const inputs=await rows(f.s,'inputStates'),blocks=await rows(f.s,'blocks'),filters=await rows(f.s,'filterInputs');
 assert.equal(inputs.length,3);assert.equal(filters.length,3);assert.equal(inputs.filter(x=>x.removalState==='branch_pending').length,1);
 assert.ok(inputs.every(x=>x.deltaSequence>0));assert.equal(f.requests.length,0);
 const review=blocks.find(x=>x.value.branchStatus);await f.ledger.resolveBranch({id:review.id,expectedRevision:review.value.revision,operationId:crypto.randomUUID()});
 assert.equal((await f.s.input(review.id)).branchStatus,undefined);assert.equal((await rows(f.s,'inputStates')).find(x=>x.id===review.id).removalState,'active');
});
test('import preserves existing edits, removed inputs, Topics and evidence while adding snapshots/time',async()=>{
 const f=await setup(),c=conversation(1,2),first=Object.values(c.mapping)[1].message;
 await append(f.s,first.content.parts[0],first.id,c.id);const b=(await rows(f.s,'blocks'))[0].value;
 await f.s.updateLibrary(b.id,{libraryText:'Synthetic authored text',note:'Synthetic authored note'});await f.s.excludeLibrary(b.id,true);
 await f.s.updateDocument(b.documentId,{userTitle:'Synthetic authored title'});const before=await rows(f.s,'blocks');
 let r=await importAll(f,[c]);assert.equal(r.counts.removed,1);assert.equal(r.counts.timeEnriched,1);assert.deepEqual((await rows(f.s,'blocks')).find(x=>x.id===b.id),before[0]);
 const saved=(await rows(f.s,'records')).find(x=>x.value.sourceMessageId===first.id).value;assert.equal(saved.timeSource,'official_export');
 first.content.parts=['Changed original snapshot'];r=await importAll(f,[c]);assert.equal(r.counts.added,1);assert.equal((await rows(f.s,'blocks')).length,2);assert.equal((await rows(f.s,'records')).length,3);assert.equal((await f.s.input(b.id)).libraryText,'Synthetic authored text');assert.equal(f.requests.length,0);
});
test('lost commit acknowledgment / recreated worker resumes same file and never duplicates',async()=>{
 const f=await setup(),file=historyFile([conversation(1,65)]);await f.controller.select(file,{consent:true});const p=await f.controller.preflight();
 const original=f.controller.transport;let drop=true;f.controller.transport=async(m,q)=>{const r=await original(m,q);if(m==='commit'&&drop){drop=false;throw Error('lost ack');}return r;};await assert.rejects(f.controller.commit());assert.equal((await rows(f.s,'records')).length,32);
 f.ledger=new ImportLedger(f.s);f.controller=new ImportCoordinator({adapter:officialExportAdapter,transport:(m,q)=>f.ledger[m](q,'new-page')});
 await f.controller.select(file,{consent:true,taskId:p.taskId});await f.controller.preflight();const done=await f.controller.commit();assert.equal(done.counts.added,65);assert.equal((await rows(f.s,'records')).length,65);
 assert.equal((await f.ledger.latest()).lastImport.counts.added,65);assert.equal(f.ledger.grants.size,0);
});
test('durable cancellation retains committed data, cannot resume cancelled task, fresh import dedupes',async()=>{
 const f=await setup(),file=historyFile([conversation(1,65)]);await f.controller.select(file,{consent:true});const p=await f.controller.preflight();
 const original=f.controller.transport;let stop=true;f.controller.transport=async(m,q)=>{const r=await original(m,q);if(m==='commit'&&stop){stop=false;await f.controller.cancel();}return r;};await assert.rejects(f.controller.commit());
 assert.equal((await f.ledger.status(p.taskId)).phase,'cancelled');assert.equal((await rows(f.s,'records')).length,32);
 await assert.rejects(f.ledger.begin({taskId:p.taskId,fingerprint:f.controller.session.fingerprint,adapterId:officialExportAdapter.id,consent:true},'new-page'),{code:'IMPORT_STATE'});
 f.controller.transport=original;await f.controller.select(file,{consent:true});await f.controller.preflight();const done=await f.controller.commit();assert.equal(done.counts.added,33);assert.equal(done.counts.duplicates,32);
});
test('purge and consent withdrawal after preflight prevent content writes',async()=>{
 const f=await setup(),c=conversation(1,1);await importAll(f,[c]);const source=(await rows(f.s,'records'))[0];await f.controller.select(historyFile([c]),{consent:true});await f.controller.preflight();await f.s.permanentDelete(source.id);const r=await f.controller.commit();assert.equal(r.counts.ignored,1);assert.equal((await rows(f.s,'records')).length,0);
});
test('metadata-only import never rewrites manual title and backup remains valid for v090',async()=>{
 const f=await setup(),c=conversation(1,1);c.title='';await importAll(f,[c]);const b=(await rows(f.s,'blocks'))[0].value;await f.s.updateDocument(b.documentId,{userTitle:'Synthetic manual title'});
 c.title='Synthetic enriched title';const r=await importAll(f,[c]);assert.equal(r.counts.metadataEnriched,1);assert.equal((await rows(f.s,'documents'))[0].value.userTitle,'Synthetic manual title');
 const {BackupService}=await import('../core/backup-service.js');const backup=new BackupService(f.s,{appVersion:'0.9.0'});const header=(await backup.beginExport()).header;const {validateBackupHeader}=await import('../core/backup-format.js');assert.doesNotThrow(()=>validateBackupHeader(header));
});
test('later branch changes re-review untouched Inputs, preserve authored/removal intent, and keep explicit confirmation',async()=>{
 for(const intent of ['untouched','edited','removed']){
  const f=await setup(),c=branched();await importAll(f,[c]);
  const source=(await rows(f.s,'records')).find(x=>x.value.sourceMessageId==='synthetic-message-1-2');
  const b=await f.s.input('block:'+source.id);
  if(intent==='edited')await f.s.updateLibrary(b.id,{libraryText:'Synthetic retained branch edit',note:'Synthetic retained note'});
  if(intent==='removed')await f.s.excludeLibrary(b.id,true);
  const before=await f.s.input(b.id),revisions=await rows(f.s,'revisions');c.current_node='synthetic-alternative-1';
  const result=await importAll(f,[c]);assert.equal(result.phase,'partial');const after=await f.s.input(b.id);
  if(intent==='untouched'){
   assert.equal(after.branchStatus,'ambiguous');assert.equal(after.excluded,true);
   assert.equal((await rows(f.s,'inputStates')).find(x=>x.id===b.id).removalState,'branch_pending');
   assert.equal((await rows(f.s,'inputRemovals')).length,0);assert.deepEqual(await rows(f.s,'revisions'),revisions);
   await f.ledger.resolveBranch({id:b.id,expectedRevision:after.revision,operationId:crypto.randomUUID()});
   const confirmed=await f.s.input(b.id);await importAll(f,[c]);assert.deepEqual(await f.s.input(b.id),confirmed);
  }else assert.deepEqual(after,before);
  assert.equal(f.requests.length,0);
 }
});
test('an existing untouched live-captured alternative is reviewed on first history import',async()=>{
 const f=await setup(),c=branched(),m=c.mapping['synthetic-alternative-1'].message;
 await append(f.s,m.content.parts[0],m.id,c.id);const b=(await rows(f.s,'blocks'))[0].value;
 await importAll(f,[c]);assert.equal((await f.s.input(b.id)).branchStatus,'other');
 assert.equal((await rows(f.s,'inputStates')).find(x=>x.id===b.id).removalState,'branch_pending');
 assert.equal((await rows(f.s,'inputRemovals')).length,0);
});
