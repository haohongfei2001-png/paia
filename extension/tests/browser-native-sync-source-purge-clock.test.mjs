import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('permanent Source tombstone uses one clock instant and survives complete checkpoint receive and old Source denial',async t=>{
 let milliseconds=Date.parse('2026-10-23T00:00:00.000Z'),calls=0;const clock=()=>{calls++;return new Date(milliseconds++).toISOString();},make=async device=>{const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory(),clock});t.after(()=>s.repository.db?.close());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_clock_denial',deviceId:device});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.sourcePurgeJournal=new SourcePurgeJournal(core);return {s,core};};
 const a=await make('synthetic_clock_A');for(let n=0;n<2;n++){const q=capture((await a.s.status()).epoch,'synthetic_clock_message_'+n,'SYNTHETIC clock source '+n);q.chat={id:'synthetic_clock_chat_'+n,url:'https://chatgpt.com/c/synthetic_clock_chat_'+n,title:'SYNTHETIC clock'};await a.s.capture(q);}
 const original=[];for await(const r of a.core.rows('revision'))original.push(r.operation);const victim=(await a.s.snapshot()).records[0],countBefore=calls;await a.s.purge(victim.id,true);await a.s.drainPurgeCleanup();assert.ok(calls>countBefore);const tomb=await a.s.repository.transaction(false,tx=>tx.get('tombstones','source:'+victim.sourceKey));assert.equal(tomb.sequence,Date.parse(tomb.value.deletedAt));
 const objects=new Map(),transport={putImmutable:async(ref,raw)=>objects.set(ref.id,raw.slice()),get:async ref=>objects.get(ref.id)?.slice()},cp=await buildGroupedCheckpoint(a.core,transport,{store:a.s,sourcePurgeProjection:true}),b=await make('synthetic_clock_B'),restore=new GroupedCheckpointRestore(b.core,{store:b.s,restoreId:'synthetic_clock_restore',sourcePurgeProjection:true});await restore.stageCheckpoint(cp.ref,transport.get);await restore.activate();const full=()=>b.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(b.s.repository.stores.map(async name=>[name,await tx.all(name)])))),before=await full();assert.equal(before.records.length,1);assert.equal(before.tombstones.length,1);const commit=original.find(op=>op.type==='sourceBootstrapCommit'&&op.value.sourceId===victim.id),ids=new Set([commit.revisionId,...commit.value.members.map(r=>r.revisionId)]);await assert.rejects(new SourceBootstrapReceiver(b.s,b.core).receive(original.filter(op=>ids.has(op.revisionId))));assert.deepEqual(await full(),before);
});
