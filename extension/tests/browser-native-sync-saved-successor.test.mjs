import {SavedWorkSyncJournal} from '../core/browser-native-sync/saved-work-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {SourceSavedWorkReceiver} from '../core/browser-native-sync/saved-work-receive.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {captureSavedWorkBootstrap,prepareSavedWorkBootstrap,applySavedWorkBootstrap,prepareSavedWorkGroupApplication,applySavedWorkGroupStep,prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../core/browser-native-sync/saved-work-bootstrap.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
async function make(t,id){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-saved-work',deviceId:id});return {s,core};}
async function saved(t,{edit=true}={}){const a=await make(t,'synthetic-A');a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));a.input=(await a.s.snapshot()).library.blocks[0];a.evidence=await a.s.evidenceFor([{inputId:a.input.id,role:'primary',selectedFields:['body']}]);a.created=await a.s.createEntry({actor:'ai',operationId:crypto.randomUUID(),body:'SYNTHETIC retained AI artifact',type:'idea',formation:'explicit',evidence:a.evidence,generator});if(edit)await a.s.editEntry({id:a.created.id,expectedRevision:0,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC human protected result',note:'SYNTHETIC personal note'}});a.source=[];for await(const r of a.core.rows('revision'))a.source.push(r.operation);return a;}
async function cold(t,a,id='synthetic-B'){const b=await make(t,id);await new SourceBootstrapReceiver(b.s,b.core).receive(a.source);return b;}

const cloud=()=>{const rows=new Map();return {async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}};};
async function fixture(t){const a=await saved(t),publication=await prepareSavedWorkPublication(a.s,a.core,a.created.id);a.operation=await publishSavedWorkBootstrap(a.s,publication);const transport=cloud(),cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});return {a,transport,cut};}
const semantic=x=>({thoughts:x.thoughts.map(({exactSignature,...r})=>r),provenance:x.provenance.map(({scopeToken,versionToken,...r})=>r),dependencies:x.dependencies.map(({scopeToken,versionToken,...r})=>r),revisions:x.revisions.map(({sequence,listKey,documentList,...r})=>r).sort((a,b)=>a.id.localeCompare(b.id))});
test('saved original editor records typed successor atomically after cold B restore',async t=>{
 const {a,transport,cut}=await fixture(t),b=await make(t,'synthetic-B'),restore=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await restore.activate();
 b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);const request={id:a.created.id,expectedRevision:1,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC B successor'}};
 const result=await b.s.editEntry(request);assert.equal(result.revision,2);const head=await b.core.read('head','savedWorkSuccessor',a.created.id),op=(await b.core.read('revision',head.revisions[0])).operation;
 assert.equal(op.actor,'user');assert.equal(op.value.after.entry.origin,'ai');assert.deepEqual(op.value.after.generator,generator);assert.equal((await b.core.read('outbox',op.operationId)).state,'queued');
 const before=await snapshot(b.s);assert.deepEqual(await b.s.editEntry(request),result);assert.deepEqual(await snapshot(b.s),before);
 const next=await buildCheckpoint(b.core,transport,{grouped:{store:b.s},parents:[cut.ref.id]}),c=await make(t,'synthetic-C'),last=new StagedSyncRestore(c.core,{grouped:{store:c.s}});await last.stageCheckpoint(next.ref,r=>transport.get(r));await last.activate();assert.deepEqual(semantic(await snapshot(c.s)),semantic(await snapshot(b.s)));assert.equal(await c.core.read('outbox',op.operationId),undefined);
 c.s.humanLibraryJournal=new SavedWorkSyncJournal(c.core);await c.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC C next successor'}});
 const again=await buildCheckpoint(c.core,transport,{grouped:{store:c.s},parents:[next.ref.id]}),d=await make(t,'synthetic-D'),fourth=new StagedSyncRestore(d.core,{grouped:{store:d.s}});await fourth.stageCheckpoint(again.ref,r=>transport.get(r));await fourth.activate();assert.deepEqual(semantic(await snapshot(d.s)),semantic(await snapshot(c.s)));

});
async function restoredEditor(t,id='synthetic-B'){
 const data=await fixture(t),b=await make(t,id),restore=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await restore.stageCheckpoint(data.cut.ref,r=>data.transport.get(r));await restore.activate();b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);return {...data,b};
}
const edit=(a,changes={title:'SYNTHETIC typed later title'})=>({id:a.created.id,expectedRevision:1,operationId:crypto.randomUUID(),changes});
test('saved successor stale revision and field CAS preserve canonical and complete protocol',async t=>{
 const {a,b}=await restoredEditor(t);for(const request of [{...edit(a),expectedRevision:0},{...edit(a),expectedFieldRevisions:{title:999}}]){const before=await snapshot(b.s);assert.deepEqual(await b.s.editEntry(request),{conflict:true});assert.deepEqual(await snapshot(b.s),before);}
});
test('saved successor lost response retries original receipt and outbox without a second edit',async t=>{
 const {a,b}=await restoredEditor(t),request=edit(a),original=b.s.foundationWrite.bind(b.s);let lost=true;b.s.foundationWrite=async(...args)=>{const result=await original(...args);if(lost){lost=false;throw Error('SYNTHETIC lost response after durable commit');}return result;};
 await assert.rejects(b.s.editEntry(request),/lost response/);const before=await snapshot(b.s);assert.equal(before.thoughts[0].revision,2);assert.deepEqual(await b.s.editEntry(request),{id:a.created.id,revision:2});assert.deepEqual(await snapshot(b.s),before);await assert.rejects(b.s.editEntry({...request,changes:{title:'SYNTHETIC changed retry'}}),{code:'BNS_SAVED_WORK_COLLISION'});assert.deepEqual(await snapshot(b.s),before);
});
test('saved successor cannot weaken existing user-only Source journal or accept changed Source',async t=>{
 const {HumanLibrarySyncJournal}=await import('../core/browser-native-sync/human-library-journal.js');const {a,b}=await restoredEditor(t);b.s.humanLibraryJournal=new HumanLibrarySyncJournal(b.core);let before=await snapshot(b.s);await assert.rejects(b.s.editEntry(edit(a)));assert.deepEqual(await snapshot(b.s),before);
 b.s.humanLibraryJournal=null;await inputEdit(b.s,a.input.id,{libraryText:'SYNTHETIC revoked source body'});b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);before=await snapshot(b.s);await assert.rejects(b.s.editEntry(edit(a)));assert.deepEqual(await snapshot(b.s),before);
});
for(const drift of ['source','control','frontier','receipt','history','budget','failure'])test('saved successor final '+drift+' failure rolls back canonical and atomic outbox',async t=>{
 const {a,b}=await restoredEditor(t),original=b.s.foundationWrite.bind(b.s);let injected=false;b.s.foundationWrite=(fn,budget)=>original(async tx=>{
  const result=await fn(tx);injected=true;
  if(drift==='failure')throw Error('SYNTHETIC after edit');
  if(drift==='budget'){for(let i=0;i<4097;i++){tx.metrics.reads=0;tx.metrics.writes=0;await tx.get('meta','synthetic-no-row');}return result;}
  if(drift==='source'){const row=await tx.get('blocks',a.input.id);await tx.put('blocks',{...row,value:{...row.value,libraryText:'SYNTHETIC late source drift'}});}
  if(drift==='control'){const row=await tx.get('meta','migration');await tx.put('meta',{...row,databaseId:'synthetic-wrong-database'});}
  if(drift==='frontier'){const row=await b.core.get(tx,'frontier',b.core.deviceId);await tx.put('meta',{...row,frontier:999});}
  if(drift==='receipt'){const head=await b.core.get(tx,'head','savedWorkSuccessor',a.created.id),op=(await b.core.get(tx,'revision',head.revisions[0])).operation,row=await b.core.get(tx,'receipt',op.operationId);await tx.put('meta',{...row,sequence:999});}
  if(drift==='history'){const rows=await tx.rangePage('revisions','byList',IDBKeyRange.bound(['library_entry:'+a.created.id],['library_entry:'+a.created.id,[]]),null,64),row=rows.rows.at(-1).value;await tx.put('revisions',{...row,actor:'ai'});}
  return result;
 },budget);
 const before=await snapshot(b.s);await assert.rejects(b.s.editEntry(edit(a)));assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('saved successor concurrent device branches are refused as conflict rather than silently losing either edit',async t=>{
 const {a,transport,cut,b}=await restoredEditor(t),c=await make(t,'synthetic-C'),restore=new StagedSyncRestore(c.core,{grouped:{store:c.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await restore.activate();c.s.humanLibraryJournal=new SavedWorkSyncJournal(c.core);
 await b.s.editEntry(edit(a));await c.s.editEntry(edit(a,{title:'SYNTHETIC competing title'}));const operations=[];for await(const row of b.core.rows('revision'))operations.push(row.operation);for await(const row of c.core.rows('revision'))if(row.operation.type==='savedWorkSuccessor')operations.push(row.operation);
 const before=await snapshot(b.s);await assert.rejects(prepareGroupCheckpointPlan(b.core,operations));assert.deepEqual(await snapshot(b.s),before);
});
test('saved successor typed Core rejects direct application without original owner capability',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const head=await b.core.read('head','savedWorkSuccessor',a.created.id),op=(await b.core.read('revision',head.revisions[0])).operation,before=await snapshot(a.s);
 await assert.rejects(a.core.transaction(true,tx=>a.core.applyInTransaction(tx,op,{origin:'remote',materialize:false})),{code:'BNS_SAVED_WORK_OWNER_REQUIRED'});assert.deepEqual(await snapshot(a.s),before);
});
test('saved successor unrepresented ordinary edit remains an explicit refusal',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));
 b.s.humanLibraryJournal=null;await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC unrepresented edit'}});const changed=await snapshot(b.s);await assert.rejects(buildCheckpoint(b.core,transport,{grouped:{store:b.s}}));assert.deepEqual(await snapshot(b.s),changed);
});
test('saved successor typed validator and graph refuse forged request allocation origin and ancestry',async t=>{
 const {sealOperation}=await import('../core/browser-native-sync/core.js');const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const head=await b.core.read('head','savedWorkSuccessor',a.created.id),op=(await b.core.read('revision',head.revisions[0])).operation,base=[];for await(const r of b.core.rows('revision'))if(r.operation.type!=='savedWorkSuccessor')base.push(r.operation);
 for(const mutate of [o=>o.value.request.changes.title='SYNTHETIC forged request',o=>o.value.events[2].value='synthetic-different-history',o=>o.value.after.entry.origin='user',o=>o.value.after.generator.modelVersion='synthetic-different-model',o=>o.actor='bootstrap',o=>o.value.sequenceBefore++,o=>o.value.events[3].value='2100-01-01T00:00:00.000Z']){
  const altered=structuredClone(op);mutate(altered);await assert.rejects(sealOperation(altered));
 }
 const altered=structuredClone(op);altered.value.anchor='0'.repeat(64);const validButUnanchored=await sealOperation(altered),before=await snapshot(b.s);await assert.rejects(prepareGroupCheckpointPlan(b.core,[...base,validButUnanchored]));assert.deepEqual(await snapshot(b.s),before);
});
for(const phase of ['applied-group','after-activation'])test('saved successor cold recovery '+phase+' fault leaves complete stage and canonical state unchanged',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));const cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C');let injected=false;
 const restore=new StagedSyncRestore(c.core,{grouped:{store:c.s},checkpoint:async(name,arg)=>{if(name!==phase)return;if(phase==='applied-group'){injected=true;throw Error('SYNTHETIC group fault');}const row=await arg.get('blocks',a.input.id);await arg.put('blocks',{...row,value:{...row.value,libraryText:'SYNTHETIC late changed source'}});injected=true;}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(c.s);await assert.rejects(restore.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(c.s),before);
});
test('saved successor budget is admitted before the original first transaction query',async t=>{
 const {a,b}=await restoredEditor(t),original=b.s.foundationWrite.bind(b.s);let scopeEntered=false,ownerEntered=false;b.s.foundationWrite=(fn)=>original(async t=>{scopeEntered=true;await t.get('meta','synthetic-first-owner-read');ownerEntered=true;return fn(t);},{references:1});
 const before=await snapshot(b.s);await assert.rejects(b.s.editEntry(edit(a)),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(scopeEntered,true);assert.equal(ownerEntered,false);assert.deepEqual(await snapshot(b.s),before);
});
test('saved original edit planner refuses duplicate physical index keys hidden at a page boundary',async t=>{
 const {humanPlanEntry,prepareSavedEntryEditPlan}=await import('../core/browser-native-sync/human-library-plan.js'),{a,b}=await restoredEditor(t);
 await b.s.repository.transaction(true,async tx=>{const rows=await tx.rangePage('revisions','byList',IDBKeyRange.bound(['library_entry:'+a.created.id],['library_entry:'+a.created.id,[]]),null,64),row=rows.rows[0].value;for(let n=0;n<65;n++)await tx.put('revisions',{...row,id:'synthetic-duplicate-index-'+n});});
 const before=await snapshot(b.s);await assert.rejects(prepareSavedEntryEditPlan(b.s,b.core,edit(a),await humanPlanEntry(b.s,b.core)),{code:'BNS_HUMAN_HISTORY_LIMIT'});assert.deepEqual(await snapshot(b.s),before);
});
test('saved successor cold final receipt drift rolls back every canonical protocol and activated stage row',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));const successorHead=await b.core.read('head','savedWorkSuccessor',a.created.id),operation=(await b.core.read('revision',successorHead.revisions[0])).operation,cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C');let injected=false;
 const restore=new StagedSyncRestore(c.core,{grouped:{store:c.s},checkpoint:async(name,tx)=>{if(name!=='after-activation')return;const active=await tx.get('meta',c.core.prefix+'active'),replay=new BrowserNativeSyncCore(c.s.repository,{datasetId:c.core.datasetId,deviceId:c.core.deviceId,namespace:active.namespace}),receipt=await replay.get(tx,'receipt',operation.operationId);assert.equal(receipt.digest,operation.revisionId);await tx.put('meta',{...receipt,sequence:receipt.sequence+1});injected=true;}});
 await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(c.s);await assert.rejects(restore.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(c.s),before);
});
test('saved coalesced typed edits preserve every operation through B to cold C and continuation',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));const request={id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC quick second title'}};
 assert.equal((await b.s.editEntry(request)).revision,3);const rows=await snapshot(b.s);assert.equal(rows.thoughts[0].revision,3);assert.equal(rows.revisions.filter(r=>r.kind==='library_entry').length,3);const savedOps=[];for await(const row of b.core.rows('revision'))if(row.operation.type==='savedWorkSuccessor')savedOps.push(row.operation);assert.equal(savedOps.length,2);assert.equal(savedOps.find(op=>op.value.request.operationId===request.operationId).value.allocation.domainCount,3);
 const before=await snapshot(b.s);assert.deepEqual(await b.s.editEntry(request),{id:a.created.id,revision:3});assert.deepEqual(await snapshot(b.s),before);
 const cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C'),restore=new StagedSyncRestore(c.core,{grouped:{store:c.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await restore.activate();assert.deepEqual(semantic(await snapshot(c.s)),semantic(await snapshot(b.s)));
 c.s.humanLibraryJournal=new SavedWorkSyncJournal(c.core);assert.equal((await c.s.editEntry({id:a.created.id,expectedRevision:3,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC quick third title'}})).revision,4);const final=await snapshot(c.s);assert.equal(final.revisions.filter(r=>r.kind==='library_entry').length,3);await buildCheckpoint(c.core,transport,{grouped:{store:c.s}});
});
for(const damage of ['missing','changed','tail'])test('saved coalesced continuation authenticates every original typed ancestor '+damage,async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const firstHead=await b.core.read('head','savedWorkSuccessor',a.created.id),first=await b.core.read('revision',firstHead.revisions[0]);
 await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC second title'}});
 if(damage==='tail'){const original=b.s.foundationWrite.bind(b.s);b.s.foundationWrite=(fn,limit)=>original(async tx=>{const result=await fn(tx);await tx.put('meta',{...first,redacted:true});return result;},limit);}else await b.s.repository.transaction(true,async tx=>{if(damage==='missing')await tx.delete('meta',first.id);else await tx.put('meta',{...first,operation:{...first.operation,value:{...first.operation.value,request:{...first.operation.value.request,changes:{title:'SYNTHETIC forged hidden intermediate'}}}}});});
 const before=await snapshot(b.s);await assert.rejects(b.s.editEntry({id:a.created.id,expectedRevision:3,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC third title'}}));assert.deepEqual(await snapshot(b.s),before);
});
for(const drift of ['source','receipt'])test('saved coalesced edit tail '+drift+' rolls back original row replacement and outbox',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const original=b.s.foundationWrite.bind(b.s);let injected=false;b.s.foundationWrite=(fn,limit)=>original(async tx=>{const result=await fn(tx);injected=true;if(drift==='source'){const r=await tx.get('blocks',a.input.id);await tx.put('blocks',{...r,value:{...r.value,libraryText:'SYNTHETIC late source'}});}else{const h=await b.core.get(tx,'head','savedWorkSuccessor',a.created.id),op=(await b.core.get(tx,'revision',h.revisions[0])).operation,r=await b.core.get(tx,'receipt',op.operationId);await tx.put('meta',{...r,sequence:r.sequence+1});}return result;},limit);
 const before=await snapshot(b.s);await assert.rejects(b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC coalesced fault'}}));assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('saved coalesced cold final activation failure preserves every table and stage',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC coalesced cold'}});const cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C');let injected=false;const restore=new StagedSyncRestore(c.core,{grouped:{store:c.s},checkpoint:async(name,tx)=>{if(name!=='after-activation')return;const row=await tx.get('thoughts',a.created.id);await tx.put('thoughts',{...row,revision:row.revision+1});injected=true;}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(c.s);await assert.rejects(restore.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(c.s),before);
});
test('saved coalesced initial capture still refuses missing typed intermediate facts',async t=>{
 const a=await saved(t);await a.s.editEntry({id:a.created.id,expectedRevision:1,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC first ordinary title'}});await a.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC second ordinary title'}});const before=await snapshot(a.s);await assert.rejects(captureSavedWorkBootstrap(a.s,a.core,a.created.id));assert.deepEqual(await snapshot(a.s),before);
});
for(const phase of ['before-owner','after-owner'])for(const drift of ['anchor-head','ancestor-receipt'])test('saved coalesced ancestry authority '+phase+' '+drift+' rolls back',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const original=b.s.foundationWrite.bind(b.s),anchor=(await b.core.read('head','savedWorkBootstrap',a.created.id)),anchorOp=(await b.core.read('revision',anchor.revisions[0])).operation;let injected=false;
 const change=async tx=>{if(drift==='anchor-head')await tx.put('meta',{...anchor,purged:true});else{const r=await b.core.get(tx,'receipt',anchorOp.operationId);await tx.put('meta',{...r,sequence:r.sequence+1});}injected=true;};
 b.s.foundationWrite=(fn,limit)=>original(async tx=>{if(phase==='before-owner')await change(tx);const result=await fn(tx);if(phase==='after-owner')await change(tx);return result;},limit);const before=await snapshot(b.s);await assert.rejects(b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC authority fault'}}));assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('saved coalesced edit preserves a later original global history counter',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));b.s.humanLibraryJournal=null;await b.s.createTopic({name:'SYNTHETIC independent original owner',operationId:crypto.randomUUID()});b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);const value=(await b.s.repository.transaction(false,t=>t.get('meta','revision-sequence'))).value;
 assert.equal((await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC counter continuation'}})).revision,3);assert.equal((await b.s.repository.transaction(false,t=>t.get('meta','revision-sequence'))).value,value);
});

test('saved typed retention uses original canonical policy and preserves a provable cold continuation',async t=>{
 const {a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));const before=await snapshot(b.s),old=before.revisions.filter(r=>r.kind==='library_entry'&&!r.important);assert.equal(old.length,2);
 const nextTime=new Date(Date.parse(before.thoughts[0].updatedAt)+91*86400000).toISOString();b.s.clock=()=>nextTime;const request={id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC edit after retention cutoff'}};assert.equal((await b.s.editEntry(request)).revision,3);const retained=await snapshot(b.s),history=retained.revisions.filter(r=>r.kind==='library_entry');assert.equal(history.length,2);assert.equal(history[0].important||history[1].important,true);for(const row of old)assert.equal(retained.revisions.some(x=>x.id===row.id),false);assert.deepEqual(await b.s.editEntry(request),{id:a.created.id,revision:3});
 const cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C'),restore=new StagedSyncRestore(c.core,{grouped:{store:c.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await restore.activate();assert.deepEqual(semantic(await snapshot(c.s)),semantic(retained));c.s.clock=()=>nextTime;c.s.humanLibraryJournal=new SavedWorkSyncJournal(c.core);assert.equal((await c.s.editEntry({id:a.created.id,expectedRevision:3,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC retained continuation'}})).revision,4);await buildCheckpoint(c.core,transport,{grouped:{store:c.s}});
});
for(const drift of ['throw','resurrect-outside-index'])test('saved typed retention '+drift+' aborts canonical pruning and outbox together',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const baseline=await snapshot(b.s),retired=baseline.revisions.find(r=>r.kind==='library_entry'&&!r.important),future=new Date(Date.parse(baseline.thoughts[0].updatedAt)+91*86400000).toISOString();b.s.clock=()=>future;const original=b.s.foundationWrite.bind(b.s);let injected=false;
 b.s.foundationWrite=(fn,limit)=>original(async tx=>{const result=await fn(tx);injected=true;assert.equal(await tx.get('revisions',retired.id),undefined);if(drift==='throw')throw Error('SYNTHETIC post-prune failure');await tx.put('revisions',{...retired,entityKey:'synthetic-other-key',listKey:['synthetic-other-key',retired.sequence]});return result;},limit);
 const before=await snapshot(b.s);await assert.rejects(b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC prune fault'}}));assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('saved typed retention exact cutoff preserves the original important and boundary rows',async t=>{
 const {a,b}=await restoredEditor(t);await b.s.editEntry(edit(a));const before=await snapshot(b.s),history=before.revisions.filter(r=>r.kind==='library_entry'),last=history.filter(r=>!r.important).sort((a,b)=>a.sequence-b.sequence).at(-1),future=new Date(Date.parse(last.at)+90*86400000).toISOString();b.s.clock=()=>future;
 await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC exact cutoff'}});const after=await snapshot(b.s);assert.equal(after.revisions.some(row=>row.id===last.id),true);for(const row of history.filter(row=>row.important))assert.equal(after.revisions.some(r=>r.id===row.id),true);
});
test('saved typed retention cannot forge removed histories or restore them through cold canonical activation',async t=>{
 const {sealOperation}=await import('../core/browser-native-sync/core.js'),{a,b,transport}=await restoredEditor(t);await b.s.editEntry(edit(a));const baseline=await snapshot(b.s);b.s.clock=()=>new Date(Date.parse(baseline.thoughts[0].updatedAt)+91*86400000).toISOString();await b.s.editEntry({id:a.created.id,expectedRevision:2,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC qualified pruning'}});
 const h=await b.core.read('head','savedWorkSuccessor',a.created.id),op=(await b.core.read('revision',h.revisions[0])).operation,forged=structuredClone(op);forged.value.after.history=forged.value.before.history;await assert.rejects(sealOperation(forged));assert.ok(op.value.before.history.length>op.value.after.history.length);
 const cut=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}}),c=await make(t,'synthetic-C');let injected=false;const restore=new StagedSyncRestore(c.core,{grouped:{store:c.s},checkpoint:async(name,tx)=>{if(name!=='after-activation')return;const old=baseline.revisions.find(r=>r.kind==='library_entry'&&!r.important);await tx.put('revisions',old);injected=true;}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(c.s);await assert.rejects(restore.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(c.s),before);
});
