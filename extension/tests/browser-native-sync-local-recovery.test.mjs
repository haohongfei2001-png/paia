import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fresh(t,device){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_local_recovery',deviceId:device});return {s,core};}
async function fixture(t,{history=false,fork=false}={}){
 const a=await fresh(t,'SYNTHETIC_device_A'),b=await fresh(t,'SYNTHETIC_device_B'),objects=new Map();
 const transport={async putImmutable(ref,raw){if(objects.has(ref.id))assert.deepEqual(objects.get(ref.id),raw);objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
 a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));
 a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});
 const input=(await a.s.snapshot()).library.blocks[0];await inputEdit(a.s,input.id,{note:'SYNTHETIC retained exact note 中文'});
 const firstCut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});let cut=firstCut;
 if(history||fork){await inputEdit(a.s,input.id,{note:'SYNTHETIC descendant exact note 中文'});cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s},parents:fork?[]:[firstCut.ref.id]});}
 const expected=await a.s.snapshot();a.s.repository.db.close();a.s.repository.db=null;
 transport.listCheckpoints=async({cursor})=>cursor===null?{items:[],nextCursor:'page2'}:{items:[cut.ref],nextCursor:null};
 return {a,b,transport,objects,cut,firstCut,expected,session:options=>new LocalSyncRecoverySession(b.core,{store:b.s,transport,...options})};
}
const canonical=s=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all([...tx.tx.objectStoreNames].filter(name=>name!=='meta').map(async name=>[name,await tx.all(name)]))));
test('local discovery traverses empty pages and restores original Source/Working with sender closed',async t=>{
 const f=await fixture(t),session=f.session(),state=await session.recoverDiscovered();assert.equal(state.state,'restored');assert.equal(state.busy,false);assert.equal(state.productionActivation,false);assert.equal(f.a.s.repository.db,null);
 const restored=await f.b.s.snapshot();assert.deepEqual(restored.records,f.expected.records);assert.deepEqual(restored.library.blocks,f.expected.library.blocks);
 const before=await canonical(f.b.s),reopened=f.session({restoreId:session.restoreId});assert.equal((await reopened.continueStored()).state,'restored');assert.deepEqual(await canonical(f.b.s),before);
 assert.equal((await f.b.core.transaction(false,async tx=>(await f.b.core.get(tx,'device',f.b.core.deviceId))?.sequence??0)),0,'restore has no local outgoing echo');
});
test('missing or corrupt transport bytes never activate; restart resumes original durable stage',async t=>{
 const f=await fixture(t),session=f.session();let first=true;const get=f.transport.get;f.transport.get=async ref=>{if(first&&ref.kind==='checkpoint-shard'){first=false;throw Error('SYNTHETIC lost read');}return get(ref);};
 const before=await canonical(f.b.s);await assert.rejects(session.recover(f.cut.ref));assert.deepEqual(await canonical(f.b.s),before);assert.equal(session.snapshot().state,'incomplete');assert.equal(session.snapshot().error,'BNS_RECOVERY_UNKNOWN');
 const restarted=f.session({restoreId:session.restoreId});assert.equal((await restarted.continueStored()).state,'restored');assert.deepEqual((await f.b.s.snapshot()).records,f.expected.records);
});
test('pause during held transport rejects late completion and preserves original destination',async t=>{
 const f=await fixture(t),before=await canonical(f.b.s),session=f.session(),get=f.transport.get;let release,entered;const arrived=new Promise(r=>entered=r),held=new Promise(r=>release=r);
 f.transport.get=async ref=>{entered();await held;return get(ref);};const pending=session.stage(f.cut.ref);await arrived;session.pause();await assert.rejects(session.stage(f.cut.ref),{code:'BNS_RECOVERY_INTERRUPTED'});release();await assert.rejects(pending,{code:'BNS_RECOVERY_INTERRUPTED'});assert.deepEqual(await canonical(f.b.s),before);assert.equal(session.snapshot().state,'paused');session.resume();f.transport.get=get;assert.equal((await session.recover(f.cut.ref)).state,'restored');
});
test('activation rollback and local edits keep their original exact owner fences',async t=>{
 const f=await fixture(t);let abort=true;const session=f.session({checkpoint:async phase=>{if(abort&&phase==='after-activation')throw Error('SYNTHETIC abort');}});await session.stage(f.cut.ref);const before=await canonical(f.b.s);await assert.rejects(session.activate(),{code:'STORAGE_FAILED'});assert.deepEqual(await canonical(f.b.s),before);abort=false;await f.b.s.capture(capture((await f.b.s.status()).epoch,'local-input','SYNTHETIC newer local body'));const changed=await canonical(f.b.s);await assert.rejects(session.activate(),{code:'BNS_RESTORE_LOCAL_CHANGED'});assert.deepEqual(await canonical(f.b.s),changed);
});
for(const scenario of ['missing','multiple','cycle','malformed'])test('discovery refuses '+scenario+' instead of selecting an arbitrary checkpoint',async t=>{
 const f=await fixture(t),before=await canonical(f.b.s);f.transport.listCheckpoints=async()=>scenario==='missing'?{items:[],nextCursor:null}:scenario==='multiple'?{items:[f.cut.ref,{...f.cut.ref,id:'f'.repeat(64),digest:'f'.repeat(64)}],nextCursor:null}:scenario==='cycle'?{items:[],nextCursor:'again'}:{items:[{kind:'checkpoint-manifest',id:'a'.repeat(64)}],nextCursor:null};
 await assert.rejects(f.session().recoverDiscovered());assert.deepEqual(await canonical(f.b.s),before);
});

test('historical checkpoints select the authenticated unique causal descendant, not list order',async t=>{
 const f=await fixture(t,{history:true});f.transport.listCheckpoints=async({cursor})=>cursor===null?{items:[f.cut.ref],nextCursor:'older'}:{items:[f.firstCut.ref,f.cut.ref],nextCursor:null};
 const session=f.session();assert.equal((await session.discover()).id,f.cut.ref.id);assert.equal((await session.recoverDiscovered()).recoveryState,'restored');assert.deepEqual((await f.b.s.snapshot()).library.blocks,f.expected.library.blocks);
});
test('two genuine incomparable checkpoints cannot be silently chosen',async t=>{
 const f=await fixture(t,{fork:true}),before=await canonical(f.b.s);f.transport.listCheckpoints=async()=>({items:[f.firstCut.ref,f.cut.ref],nextCursor:null});await assert.rejects(f.session().recoverDiscovered(),{code:'BNS_RECOVERY_MULTIPLE_CHECKPOINTS'});assert.deepEqual(await canonical(f.b.s),before);
});
for(const action of ['pause','close'])test(action+' after the real activation commit preserves the confirmed restored outcome',async t=>{
 const f=await fixture(t),session=f.session();await session.stage(f.cut.ref);const original=f.b.core.transaction.bind(f.b.core);let committed=0;
 f.b.core.transaction=async(...args)=>{const result=await original(...args);if(args[0]&&result?.state==='activated'){committed++;session[action]();}return result;};
 const result=await session.activate();assert.equal(committed,1);assert.equal(result.state,action==='pause'?'paused':'closed');assert.equal(result.recoveryState,'restored');assert.equal(result.error,null);assert.equal(result.busy,false);assert.deepEqual((await f.b.s.snapshot()).records,f.expected.records);assert.deepEqual((await f.b.s.snapshot()).library.blocks,f.expected.library.blocks);
});
test('pause at the original in-transaction activation checkpoint rolls back; resume uses original receipt',async t=>{
 const f=await fixture(t);let pause=true,session;session=f.session({checkpoint:async phase=>{if(pause&&phase==='after-activation')session.pause();}});await session.stage(f.cut.ref);const before=await canonical(f.b.s);
 await assert.rejects(session.activate(),{code:'BNS_RECOVERY_INTERRUPTED'});assert.deepEqual(await canonical(f.b.s),before);assert.equal(session.snapshot().recoveryState,'settlement-unknown');pause=false;session.resume();assert.equal((await session.continueStored()).recoveryState,'restored');
});
test('lost post-commit response stays settlement-unknown until original durable activation proof is checked',async t=>{
 const f=await fixture(t),session=f.session();await session.stage(f.cut.ref);const original=f.b.core.transaction.bind(f.b.core);let lose=true;
 f.b.core.transaction=async(...args)=>{const result=await original(...args);if(lose&&args[0]&&result?.state==='activated'){lose=false;throw Error('SYNTHETIC lost committed response');}return result;};
 await assert.rejects(session.activate());assert.equal(session.snapshot().state,'settlement-unknown');assert.equal(session.snapshot().recoveryState,'settlement-unknown');assert.deepEqual((await f.b.s.snapshot()).library.blocks,f.expected.library.blocks);
 const reopened=f.session({restoreId:session.restoreId});assert.equal((await reopened.continueStored()).recoveryState,'restored');
});
test('discovery enforces cumulative object budget before fetching or activating',async t=>{
 const f=await fixture(t),before=await canonical(f.b.s);let reads=0;f.transport.get=async()=>{reads++;throw Error('must not fetch');};f.transport.listCheckpoints=async()=>({items:[{...f.cut.ref,encodedBytes:1024*1024,decodedBytes:2*1024*1024}],nextCursor:null});
 await assert.rejects(f.session().recoverDiscovered(),{code:'BNS_RECOVERY_DISCOVERY_LIMIT'});assert.equal(reads,0);assert.deepEqual(await canonical(f.b.s),before);
});

test('claimed parent alone cannot make an older valid cut supersede newer canonical revisions',async t=>{
 const f=await fixture(t,{history:true}),before=await canonical(f.b.s),forged=await protocolObject('checkpoint-manifest',bytes({...f.firstCut.manifest,parents:[f.cut.ref.id]}));await f.transport.putImmutable(forged.ref,forged.bytes);
 f.transport.listCheckpoints=async()=>({items:[f.cut.ref,forged.ref],nextCursor:null});await assert.rejects(f.session().recoverDiscovered(),{code:'BNS_GROUP_TAIL_INVALID'});assert.deepEqual(await canonical(f.b.s),before);
});
for(const heldKind of ['listing','object'])test('discovery deadline settles held '+heldKind+' and fences late completion',async t=>{
 const f=await fixture(t),session=f.session({discoveryTimeoutMs:30}),before=await canonical(f.b.s),beforeMeta=await f.b.core.transaction(false,t=>t.all('meta'));let release,arrive;const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrive=resolve),list=f.transport.listCheckpoints,get=f.transport.get;let reads=0;
 if(heldKind==='listing')f.transport.listCheckpoints=async args=>{arrive();await held;return list(args);};else f.transport.get=async ref=>{reads++;arrive();await held;return get(ref);};
 const pending=session.recoverDiscovered();await entered;await assert.rejects(pending,{code:'BNS_RECOVERY_DISCOVERY_LIMIT'});assert.equal(session.snapshot().busy,false);assert.equal(session.snapshot().recoveryState,'not-restored');release();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(await canonical(f.b.s),before);assert.deepEqual(await f.b.core.transaction(false,t=>t.all('meta')),beforeMeta);assert.equal(reads,heldKind==='object'?1:0);
});
for(const action of ['pause','close'])test(action+' settles a held discovery without pretending to cancel underlying transport',async t=>{
 const f=await fixture(t),session=f.session(),before=await canonical(f.b.s);let release,arrive;const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrive=resolve);f.transport.listCheckpoints=async()=>{arrive();await held;return {items:[f.cut.ref],nextCursor:null};};const pending=session.discover();await entered;session[action]();await assert.rejects(pending,{code:'BNS_RECOVERY_INTERRUPTED'});assert.equal(session.snapshot().busy,false);release();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(await canonical(f.b.s),before);
});
for(const action of ['stage','discover'])test(action+' rejects transport length mismatch before the object reader copies bytes',async t=>{
 const f=await fixture(t),session=f.session(),before=await canonical(f.b.s);let copies=0;f.transport.get=async ref=>{const raw=new Uint8Array(ref.encodedBytes+1);raw.slice=()=>{copies++;throw Error('unexpected oversized copy');};return raw;};await assert.rejects(action==='stage'?session.stage(f.cut.ref):session.discover(),{code:'BNS_OBJECT_INTEGRITY'});assert.equal(copies,0);assert.deepEqual(await canonical(f.b.s),before);
});
