import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ContextDesiredSyncJournal} from '../core/browser-native-sync/context-desired-journal.js';
import {ContextCardsService} from '../core/context-cards.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
globalThis.IDBKeyRange=IDBKeyRange;
const operationId=()=>crypto.randomUUID();
const all=s=>s.repository.transaction(false,async t=>{const rows={};for(const name of s.repository.stores)rows[name]=await t.all(name);return rows;});
async function producer({times=[],append=true}={}){
 let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,10)+70000*tick++).toISOString()});await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_mixed_fixed_dataset',deviceId:'SYNTHETIC_mixed_fixed_device'});
 s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 const epoch=(await s.status()).epoch,requestA=capture(epoch,'SYNTHETIC_A','SYNTHETIC immutable A 中文🙂');if(times[0]!=null)requestA.messages[0].sourceTime={state:'valid',createTime:times[0],updateTime:null};await s.capture(requestA);const a=(await s.snapshot()).library.blocks[0].id;await inputEdit(s,a,{libraryText:'SYNTHETIC genuine edited A 中文🙂',note:'SYNTHETIC first note'});
 if(append){const requestB=capture(epoch,'SYNTHETIC_B','SYNTHETIC immutable untouched B 中文🙂');if(times[1]!=null)requestB.messages[0].sourceTime={state:'valid',createTime:times[1],updateTime:null};await s.capture(requestB);await inputEdit(s,a,{note:'SYNTHETIC later note'});}
 const topic=await s.createTopic({name:'SYNTHETIC mixed Topic',operationId:operationId()}),entry=await s.createEntry({actor:'user',body:'SYNTHETIC independently owned human body 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:operationId()});
 await new PromptReuseService(s,{syncJournal:new PromptSyncJournal(core)}).change({action:'create',revision:0,text:'SYNTHETIC manual Prompt'});
 await new ContextCardsService(s,{syncJournal:new ContextDesiredSyncJournal(core)}).change({kind:'put',card:'info',itemId:operationId(),operationId:operationId(),epoch:'initial',expectedRevision:0,body:'SYNTHETIC protected manual Info',section:'SYNTHETIC'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return {s,core,operations,a,topic,entry};
}

const fakeCloud=()=>{const objects=new Map();return {async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
async function freshReceiver(a,device){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-23T12:00:00.000Z'});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:device});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function receive(source,target,cloud){const cut=await buildCheckpoint(source.core,cloud,{grouped:{store:source.s}}),restore=new GroupedCheckpointRestore(target.core,{store:target.s,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,ref=>cloud.get(ref));assert.equal((await restore.activate()).state,'activated');let step;do{step=await restore.cleanup({limit:64});}while(!step.complete);return restore;}
test('one mixed populated library preserves local Human work while receiving an independent Working edit and exports cold C',async()=>{
 const a=await producer(),cloud=fakeCloud();let b,c;
 try{
  b=await freshReceiver(a,'SYNTHETIC_mixed_nonempty_B');await receive(a,b,cloud);
  const human=await b.s.createEntry({actor:'user',body:'SYNTHETIC new local human on B',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
  const beforeOutbox=[];for await(const row of b.core.rows('outbox'))beforeOutbox.push(row);
  await inputEdit(a.s,a.a,{note:'SYNTHETIC new incoming Working'});await receive(a,b,cloud);
  assert.equal((await b.s.input(a.a)).note,'SYNTHETIC new incoming Working');assert.equal((await b.s.entry(human.id)).body,'SYNTHETIC new local human on B');
  const afterOutbox=[];for await(const row of b.core.rows('outbox'))afterOutbox.push(row);assert.deepEqual(afterOutbox,beforeOutbox);
  const source=await all(b.s);assert.equal(source.records.length,2);assert.equal(source.topics.length,1);assert.equal(source.placements.length,1);
  c=await freshReceiver(a,'SYNTHETIC_mixed_nonempty_C');await receive(b,c,cloud);assert.equal((await c.s.input(a.a)).note,'SYNTHETIC new incoming Working');assert.equal((await c.s.entry(human.id)).body,'SYNTHETIC new local human on B');
 }finally{for(const f of [a,b,c])await f?.s.repository.close();}
});

async function staged(t,{checkpoint,fork=false}={}){const a=await producer(),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_mixed_B');t.after(async()=>{await a.s.repository.close();await b.s.repository.close();});await receive(a,b,cloud);await b.s.createEntry({actor:'user',body:'SYNTHETIC local pending Human',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});if(fork)await inputEdit(b.s,a.a,{note:'SYNTHETIC conflicting B note'});await inputEdit(a.s,a.a,{note:'SYNTHETIC incoming A note'});const cut=await buildCheckpoint(a.core,cloud,{grouped:{store:a.s}}),restore=new GroupedCheckpointRestore(b.core,{store:b.s,restoreId:operationId(),checkpoint});await restore.stageCheckpoint(cut.ref,r=>cloud.get(r));return {a,b,cloud,restore};}
for(const at of ['mixed-applied-group','before-mixed-commit'])test('mixed merge interruption at '+at+' keeps every prior table',async t=>{let hit=false;const d=await staged(t,{checkpoint:async point=>{if(point===at){hit=true;throw Error('SYNTHETIC interruption');}}}),before=await all(d.b.s);await assert.rejects(d.restore.activate());assert.equal(hit,true);assert.deepEqual(await all(d.b.s),before);});
for(const phase of ['owner-return','terminal'])for(const mutation of ['old-receipt','local-outbox','unknown-protocol','Human-body','Human-key','control','annual-index','stage-cursor','working-allocation','semantic'])test(phase+' '+mutation+' drift is refused with complete rollback',async t=>{
 let hit=false,d;
 const mutate=async tx=>{hit=true;let table='meta',row;
  if(mutation==='old-receipt'){row=(await tx.all('meta')).find(r=>r.id.includes(':receipt:'));row.digest='0'.repeat(64);}
  else if(mutation==='local-outbox'){row=(await tx.all('meta')).find(r=>r.id.includes(':outbox:'));assert.ok(row);await tx.delete('meta',row.id);return;}
  else if(mutation==='unknown-protocol')row={id:d.b.core.prefix+'generation:initial:unexpected:synthetic',value:1};
  else if(mutation==='Human-body'){table='thoughts';row=(await tx.all(table))[0];row.thoughtText='SYNTHETIC unapproved rewrite';}
  else if(mutation==='Human-key'){row=await tx.get('meta','thought-suppression-key');row.value=row.value.map(v=>(v+1)%256);}
  else if(mutation==='control'){row=await tx.get('meta','gate');row.enabled=false;row.epoch++;}
  else if(mutation==='annual-index')row={id:'archive-year:v1:unknown-synthetic',value:1};
  else if(mutation==='stage-cursor'){row=(await tx.all('meta')).find(r=>r.id===d.restore.stage.prefix+'generation:'+d.restore.stage.fixedNamespace+':restore:');row.received++;}
  else if(mutation==='working-allocation'){table='inputStates';row=(await tx.all(table))[0];row.deltaSequence+=100;}
  else {row=await tx.get('meta','aiu:delta:sequence');row.value+=100;}
  await tx.put(table,row);
 };
 d=await staged(t,{checkpoint:phase==='terminal'?async(point,tx)=>{if(point==='before-mixed-commit')await mutate(tx);}:undefined});
 if(phase==='owner-return'){const original=d.b.s.applyRemoteWorking.bind(d.b.s);d.b.s.applyRemoteWorking=async(tx,...args)=>{const result=await original(tx,...args);await mutate(tx);return result;};}
 const before=await all(d.b.s);await assert.rejects(d.restore.activate());assert.equal(hit,true);assert.deepEqual(await all(d.b.s),before);
});
test('same-Input branch refuses implicit winner and keeps local Human outbox',async t=>{const d=await staged(t,{fork:true}),before=await all(d.b.s);await assert.rejects(d.restore.activate());assert.deepEqual(await all(d.b.s),before);});
test('mixed merge actual 4097-read work refuses even if diagnostics are reset',async t=>{let hit=false;const d=await staged(t,{checkpoint:async(point,tx)=>{if(point==='before-mixed-commit'){hit=true;try{for(let i=0;i<4097;i++)await tx.get('meta','synthetic-budget-probe');}finally{for(const k of Object.keys(tx.metrics))if(typeof tx.metrics[k]==='number')tx.metrics[k]=0;}}}}),before=await all(d.b.s);await assert.rejects(d.restore.activate());assert.equal(hit,true);assert.deepEqual(await all(d.b.s),before);});
test('mixed chronology accepts a second independent remote edit after later local Human work',async t=>{
 const d=await staged(t);await d.restore.activate();let next;do{next=await d.restore.cleanup({limit:64});}while(!next.complete);
 const own=await d.b.s.createEntry({actor:'user',body:'SYNTHETIC later pending B entry',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 await inputEdit(d.a.s,d.a.a,{note:'SYNTHETIC second A delta'});await receive(d.a,d.b,d.cloud);assert.equal((await d.b.s.input(d.a.a)).note,'SYNTHETIC second A delta');assert.equal((await d.b.s.entry(own.id)).body,'SYNTHETIC later pending B entry');
 const c=await freshReceiver(d.a,'SYNTHETIC_mixed_final_C');try{await receive(d.b,c,d.cloud);assert.equal((await c.s.entry(own.id)).body,'SYNTHETIC later pending B entry');assert.equal((await c.s.input(d.a.a)).note,'SYNTHETIC second A delta');}finally{await c.s.repository.close();}
});
test('mixed same checkpoint replay does not rewrite canonical rows or queued local work',async t=>{const d=await staged(t);await d.restore.activate();let step;do{step=await d.restore.cleanup({limit:64});}while(!step.complete);const before=await all(d.b.s);await receive(d.a,d.b,d.cloud);const after=await all(d.b.s);for(const name of d.b.s.repository.stores)if(name!=='meta')assert.deepEqual(after[name],before[name]);assert.deepEqual(after.meta.filter(r=>r.id.includes(':outbox:')),before.meta.filter(r=>r.id.includes(':outbox:')));});
test('genuine new Human work from populated B returns to populated A through original owner and onward to C',async t=>{
 const a=await producer(),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_human_return_B');let c;t.after(async()=>{for(const f of [a,b,c])await f?.s.repository.close();});await receive(a,b,cloud);
 const entries=[];for(let i=0;i<2;i++)entries.push(await b.s.createEntry({actor:'user',body:'SYNTHETIC B independently authored '+i,type:'idea',formation:'explicit',evidence:[],operationId:operationId()}));
 const outbox=(await all(a.s)).meta.filter(r=>r.id.includes(':outbox:'));await receive(b,a,cloud);for(let i=0;i<entries.length;i++)assert.equal((await a.s.entry(entries[i].id)).body,'SYNTHETIC B independently authored '+i);assert.deepEqual((await all(a.s)).meta.filter(r=>r.id.includes(':outbox:')),outbox);
 c=await freshReceiver(a,'SYNTHETIC_human_return_C');await receive(a,c,cloud);for(let i=0;i<entries.length;i++)assert.equal((await c.s.entry(entries[i].id)).body,'SYNTHETIC B independently authored '+i);
});

test('new Topic Section and placement return from B through real owners and preserve unrelated A content',async t=>{
 const a=await producer(),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_structure_return_B');let c;t.after(async()=>{for(const f of [a,b,c])await f?.s.repository.close();});await receive(a,b,cloud);
 const topic=await b.s.createTopic({name:'SYNTHETIC independent B Topic',operationId:operationId()}),section=await b.s.createSection({topicId:topic.id,expectedTopicRevision:0,title:'SYNTHETIC B section',operationId:operationId()});
 const entry=await b.s.createEntry({actor:'user',body:'SYNTHETIC B content in Section',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});await b.s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:section.sectionId,expectedEntryRevision:0,expectedTopicRevision:1,operationId:operationId()});
 const original=await a.s.entry(a.entry.id);await receive(b,a,cloud);assert.deepEqual(await a.s.entry(a.entry.id),original);assert.equal((await a.s.entry(entry.id)).body,'SYNTHETIC B content in Section');
 const rows=await all(a.s);assert.ok(rows.sections.some(r=>r.sectionId===section.sectionId&&r.title==='SYNTHETIC B section'));assert.ok(rows.placements.some(r=>r.entryId===entry.id&&r.sectionId===section.sectionId));
 c=await freshReceiver(a,'SYNTHETIC_structure_return_C');await receive(a,c,cloud);assert.equal((await c.s.entry(entry.id)).body,'SYNTHETIC B content in Section');assert.ok((await all(c.s)).placements.some(r=>r.entryId===entry.id&&r.sectionId===section.sectionId));
});

for(const mutation of ['interrupt','search-delete','search-extra','metadata','protocol','old-human'])test('Human receive terminal '+mutation+' refuses and restores every table',async t=>{
 const a=await producer(),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_human_failure_B');t.after(async()=>{await a.s.repository.close();await b.s.repository.close();});await receive(a,b,cloud);const entry=await b.s.createEntry({actor:'user',body:'SYNTHETIC incoming B',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 const cut=await buildCheckpoint(b.core,cloud,{grouped:{store:b.s}});let hit=false;const restore=new GroupedCheckpointRestore(a.core,{store:a.s,restoreId:operationId(),checkpoint:async(point,tx)=>{if(point!=='before-mixed-commit')return;hit=true;if(mutation==='interrupt')throw Error('SYNTHETIC failpoint');if(mutation==='search-delete')await tx.delete('libraryMigrationItems',JSON.stringify(['search','entry',entry.id]));else if(mutation==='search-extra')await tx.put('libraryMigrationItems',{id:'SYNTHETIC forged queue',entityKind:'search'});else if(mutation==='metadata')await tx.put('meta',{id:'SYNTHETIC unknown after owner',value:1});else if(mutation==='protocol'){const row=(await tx.all('meta')).find(r=>r.id.includes(':receipt:'));await tx.put('meta',{...row,digest:'0'.repeat(64)});}else{const row=await tx.get('thoughts',a.entry.id);await tx.put('thoughts',{...row,thoughtText:'SYNTHETIC unauthorized change'});}}});await restore.stageCheckpoint(cut.ref,r=>cloud.get(r));const before=await all(a.s);await assert.rejects(restore.activate());assert.equal(hit,true);assert.deepEqual(await all(a.s),before);
});

test('Human original owner cannot change an existing unrelated Working receipt',async t=>{
 const a=await producer(),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_receipt_return_B');t.after(async()=>{await a.s.repository.close();await b.s.repository.close();});await receive(a,b,cloud);await b.s.createEntry({actor:'user',body:'SYNTHETIC new B entry for receipt control',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 const cut=await buildCheckpoint(b.core,cloud,{grouped:{store:b.s}}),restore=new GroupedCheckpointRestore(a.core,{store:a.s,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,r=>cloud.get(r));const before=await all(a.s),target=before.operationReceipts.find(r=>r.namespace==='working-input');assert.ok(target);const original=a.s.operationInTransaction.bind(a.s);let hit=false;a.s.operationInTransaction=async(tx,...args)=>{const result=await original(tx,...args);hit=true;await tx.put('operationReceipts',{...target,digest:'0'.repeat(64)});return result;};await assert.rejects(restore.activate());assert.equal(hit,true);assert.deepEqual(await all(a.s),before);
});
