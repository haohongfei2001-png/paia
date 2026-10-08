// Copied ONLY into a temporary source/release extension by storage-harness.mjs.
// The production worker is retained, and these explicit test owners use isolated
// native databases and chrome.storage key prefixes. No production command exists.
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {PromptSyncJournal, materializePrompt, restorePromptPreferences} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {projectEntity} from '../core/browser-native-sync/codecs.js';
import {buildCheckpoint, StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {packOperations, publishObjects, readSegmentDescriptor} from '../core/browser-native-sync/segments.js';
import {ImmutableObjects} from './bns-native-immutable-objects.mjs';

const DATASET = 'synthetic_native_storage_01';
const devices = new Map(), restores = new Map();
const lifetime = crypto.randomUUID();
const networkAttempts = [];
globalThis.fetch = (...args) => { networkAttempts.push(String(args[0])); throw Error('SYNTHETIC_NETWORK_FORBIDDEN'); };
for (const name of ['WebSocket', 'EventSource', 'XMLHttpRequest']) {
  globalThis[name] = class { constructor() { networkAttempts.push(name); throw Error('SYNTHETIC_NETWORK_FORBIDDEN'); } };
}

const collect = async iterable => { const result = []; for await (const item of iterable) result.push(item); return result; };
function check(value, message) { if (!value) throw Error(message); }
function storageFor(name) {
  const prefix = 'bns-native-test:' + name + ':';
  return {
    async get(key) { const values = await chrome.storage.local.get(prefix + key); return {[key]: values[prefix + key]}; },
    async set(values) { await chrome.storage.local.set(Object.fromEntries(Object.entries(values).map(([key, value]) => [prefix + key, value]))); }
  };
}
async function device(name) {
  check(/^[a-z][a-z0-9_-]{1,48}$/.test(name), 'SYNTHETIC_DATABASE_NAME');
  if (!devices.has(name)) {
    const store = new OrganizerStore(storageFor(name), {indexedDB, name: 'bns-native-test-' + name});
    await store.finishFoundation();
    const core = new BrowserNativeSyncCore(store.repository, {datasetId: DATASET, deviceId: 'native_device_' + name, materialize: materializePrompt});
    const journal = new PromptSyncJournal(core), service = new PromptReuseService(store, {syncJournal: journal});
    devices.set(name, {store, core, journal, service});
  }
  return devices.get(name);
}
async function snapshot(name) {
  const {store, core} = await device(name);
  return {
    preferences: await store.repository.transaction(false, t => readPromptPreferences(t), ['meta']),
    state: await core.state(), outbox: (await collect(core.outbox())).sort((a, b) => a.sequence - b.sequence),
    namespace: await core.namespace(), pending: await collect(core.rows('pending')),
    generation: (await core.read('generation'))?.value || 0,
    sequence: (await core.read('device', core.deviceId))?.sequence || 0
  };
}
// A real debugger pause in the current synchronous stack. There is deliberately
// no timer, external Promise, network, or test-runner wait inside an IDB callback.
function phase(name, scope, prepared = null) {
  globalThis.__bnsNativePhase = {name, lifetime, hasNativeTransaction: scope?.tx instanceof IDBTransaction, preparedOperation: prepared ? structuredClone(prepared.operations[0]) : null};
  debugger; // Native test driver must observe Debugger.paused, then stop the worker.
}
function fault(name, scope, prepared = null) {
  check(scope.tx instanceof IDBTransaction, 'NATIVE_TRANSACTION_REQUIRED');
  if (name === 'abort') { scope.tx.abort(); throw new DOMException('Synthetic transaction abort', 'AbortError'); }
  if (name === 'quota') throw new DOMException('Injected quota fault; not physical disk exhaustion', 'QuotaExceededError');
  if (name === 'pause-before-journal' || name === 'pause-after-journal') phase(name, scope, prepared);
}
async function change({name, text, faultAt = null}) {
  const d = await device(name), before = await snapshot(name), previous = d.journal.commit.bind(d.journal);
  d.journal.commit = async (scope, prepared) => {
    if (faultAt === 'pause-before-journal') fault(faultAt, scope, prepared);
    const result = await previous(scope, prepared);
    if (faultAt && faultAt !== 'pause-before-journal') fault(faultAt, scope, prepared);
    return result;
  };
  try {
    const existing = before.preferences.overrides[0];
    const result = await d.service.change(existing
      ? {action: 'edit', id: existing.id, revision: before.preferences.revision, text}
      : {action: 'create', revision: before.preferences.revision, text});
    return {ok: true, result, snapshot: await snapshot(name)};
  } catch (error) {
    return {ok: false, code: error.code, dbCategory: error.dbCategory, snapshot: await snapshot(name)};
  } finally { d.journal.commit = previous; }
}
function restoreKey(name, id) { return name + ':' + id; }
async function restore({name, restoreId, checkpointRef, entries, pauseAt = null, faultAt = null}) {
  const {core} = await device(name), key = restoreKey(name, restoreId);
  let item = restores.get(key);
  if (!item) {
    const objects = new ImmutableObjects(entries);
    const staged = new StagedSyncRestore(core, {
      restoreId, owners: {promptPreferences: restorePromptPreferences},
      checkpoint(point, detail) {
        if (point === pauseAt) phase(point, detail);
        if (point === faultAt) fault('abort', detail);
      }
    });
    item = {staged, objects}; restores.set(key, item);
  }
  if (checkpointRef) await item.staged.stageCheckpoint(checkpointRef, ref => item.objects.get(ref));
  return item;
}
async function createCloudFixture() {
  const name = 'producer', {core} = await device(name), objects = new ImmutableObjects();
  check((await change({name, text: 'Synthetic root e\u0301\n第一行'})).ok, 'SYNTHETIC_ROOT_SAVE_FAILED');
  const first = await buildCheckpoint(core, objects);
  check((await change({name, text: 'Synthetic intermediate revision'})).ok, 'SYNTHETIC_SECOND_SAVE_FAILED');
  check((await change({name, text: 'Synthetic exact final e\u0301\n第二行🙂'})).ok, 'SYNTHETIC_FINAL_SAVE_FAILED');
  const final = await buildCheckpoint(core, objects), operations = (await collect(core.outbox())).sort((a, b) => a.sequence - b.sequence);
  const descriptors = await publishObjects(packOperations(operations, {datasetId: DATASET, producer: core.deviceId}), objects);
  return {first: first.ref, final: final.ref, entries: objects.entries(), descriptors, expected: await snapshot(name)};
}
async function remoteOperations(entries, descriptors) {
  const objects = new ImmutableObjects(entries), operations = [];
  for (const ref of descriptors) operations.push(...await readSegmentDescriptor(ref, id => objects.get(id), {datasetId: DATASET}));
  return operations;
}
async function run(command, args = {}) {
  if(command==='prompt-conflict-matrix')return runPromptConflictMatrix();
  if (command.startsWith('retirement-')) {
    // Explicit pure-Core test instance; production Prompt service/materializer
    // stays unchanged and continues to reject aggregate Prompt purge.
    const d=await device(args.name),core=new BrowserNativeSyncCore(d.store.repository,{datasetId:DATASET,deviceId:'native_device_'+args.name,materialize:null});
    const journal=new PreparedPublicationJournal(core,{checkpoint:async(stage,t)=>{if(args.abort&&stage==='publication-retired-before-commit')fault('abort',t);}}),objects=new ImmutableObjects(args.entries||[]);
    let result,code;
    try{
      if(command==='retirement-setup'){
        const value={id:'prompt-reuse:v1',version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text:'Synthetic pure Core obsolete body',hidden:false}],splits:[]};
        await core.commit(await core.prepare([{type:'promptPreferences',value}]));
        result=await journal.prepare();
        await core.commit(await core.prepare([{type:'promptPreferences',entityId:value.id,kind:'purge'}]));
        try{await journal.run(result.publicationId,objects);}catch(error){if(error.code!=='BNS_PUBLICATION_OBSOLETE')throw error;}
      }else if(command==='retirement-retire')result=await journal.retireObsolete(args.publicationId);
      else if(command==='retirement-checkpoint')result=(await buildCheckpoint(core,objects)).ref;
      else if(command==='retirement-activate'){
        const staged=new StagedSyncRestore(core,{restoreId:args.restoreId,owners:{promptPreferences:async()=>{}}});
        await staged.stageCheckpoint(args.checkpointRef,ref=>objects.get(ref));result=await staged.activate();
      }else if(command==='retirement-old-id')result=await journal.prepare({publicationId:args.publicationId});
      else if(command!=='retirement-state')throw Error('UNKNOWN_RETIREMENT_COMMAND');
    }catch(error){code=error.code||error.name;}
    return {result,code,entries:objects.entries(),namespace:await core.namespace(),retained:await journal.retainedObjects(),pending:await journal.pending(),outbox:await collect(core.outbox()),state:await core.state()};
  }
  if (command.startsWith('publication-')) {
    const {core} = await device(args.name), objects = new ImmutableObjects(args.entries || []), puts = [], gets = [];
    const transport = {
      async putImmutable(ref, value) { puts.push(ref.id); await objects.putImmutable(ref, value); if (args.unknownUpload) throw Error('SYNTHETIC_LOST_UPLOAD_ACK'); },
      async get(ref) { gets.push(ref.id); return objects.get(ref); }
    };
    const journal = new PreparedPublicationJournal(core, {checkpoint: async stage => {
      if (args.abortAck && stage === 'publication-after-ack') throw Error('SYNTHETIC_ACK_ABORT');
    }});
    let result, code;
    try {
      if (command === 'publication-prepare') result = await journal.prepare(args.publicationId ? {publicationId: args.publicationId} : {});
      else if (command === 'publication-run') result = await journal.run(args.publicationId, transport);
      else if (command === 'publication-checkpoint') result = (await buildCheckpoint(core, transport)).ref;
      else if (command !== 'publication-state') throw Error('UNKNOWN_PUBLICATION_COMMAND');
    } catch (error) { code = error.code || error.message; }
    return {result, code, entries: objects.entries(), puts, gets,
      row: args.publicationId ? await core.read('publication', args.publicationId) : null,
      receipt: args.publicationId ? await core.read('publicationReceipt', args.publicationId) : null,
      pending: await journal.pending(), snapshot: await snapshot(args.name)};
  }
  if (command === 'prompt-owner-guard') {
    const remote=await device('guard_remote'),local=await device('guard_'+args.mode);
    let operations=(await collect(remote.core.outbox()));
    if(!operations.length){await change({name:'guard_remote',text:'Synthetic remote initial'});await change({name:'guard_remote',text:'Synthetic remote descendant'});operations=await collect(remote.core.outbox());}
    operations.sort((a,b)=>a.sequence-b.sequence);
    const service=new PromptReuseService(local.store);
    if(args.mode==='changed')await local.core.receive(operations[0]);
    if(args.mode!=='empty'){
      const prefs=await local.store.repository.transaction(false,t=>readPromptPreferences(t));
      await service.change(args.mode==='changed'?{action:'edit',id:prefs.overrides[0].id,revision:prefs.revision,text:'Synthetic independent local edit'}:{action:'create',revision:prefs.revision,text:'Synthetic independent local manual'});
    }
    const before=await local.store.repository.transaction(false,t=>t.all('meta'));let code=null,result=null;
    try{result=await local.core.receive(operations[args.mode==='changed'?1:0]);}catch(error){code=error.code;}
    const after=await local.store.repository.transaction(false,t=>t.all('meta'));
    return {before,after,code,result,snapshot:await snapshot('guard_'+args.mode)};
  }
  if (command === 'identity') return {...networkEvidence(), databases: (await indexedDB.databases()).map(row => row.name)};
  if (command === 'pause-for-restart') { phase('restart-boundary'); return true; }
  if (command === 'snapshot') return snapshot(args.name);
  if (command === 'change') return change(args);
  if (command === 'create-cloud-fixture') return createCloudFixture();
  if (command === 'receive') {
    const {core} = await device(args.name), operations = await remoteOperations(args.entries, args.descriptors);
    const selected = args.indices.map(index => operations[index]);
    return {results: await core.receiveBatch(selected), snapshot: await snapshot(args.name)};
  }
  if (command === 'stage') {
    const {staged} = await restore(args);
    return {receipt: await staged.stage.read('restore'), snapshot: await snapshot(args.name)};
  }
  if (command === 'activate') {
    const {staged} = await restore(args);
    try { return {ok: true, result: await staged.activate(), snapshot: await snapshot(args.name)}; }
    catch (error) { return {ok: false, code: error.code, snapshot: await snapshot(args.name)}; }
  }
  if (command === 'stage-receive') {
    const {staged} = await restore(args), operations = await remoteOperations(args.entries, args.descriptors);
    return {result: await staged.stage.receive(operations[args.index]), generation: (await staged.stage.read('generation'))?.value, pending: await collect(staged.stage.rows('pending'))};
  }
  if (command === 'old-preparation') {
    const {core} = await device(args.name), portable = projectEntity('promptPreferences', (await snapshot(args.name)).preferences);
    const prepared = await core.prepare([{type: 'promptPreferences', value: portable}]);
    const {staged} = await restore(args); await staged.activate();
    try { await core.commit(prepared); return {ok: true}; } catch (error) { return {ok: false, code: error.code, snapshot: await snapshot(args.name)}; }
  }
  if (command === 'counter-during-validation') {
    const {core, service} = await device(args.name), operations = await remoteOperations(args.entries, args.descriptors);
    await core.receive(operations[0]);
    const original = crypto.subtle.digest.bind(crypto.subtle); let once = false;
    // Digest validation occurs before opening the receive transaction. The
    // competing owner transaction completes here, not inside an IDB callback.
    crypto.subtle.digest = async (...values) => {
      const result = await original(...values);
      if (!once) { once = true; await service.noteVerifiedReuse(operations[0].value.overrides[0].id); }
      return result;
    };
    try { await core.receive(operations[1]); } finally { crypto.subtle.digest = original; }
    return snapshot(args.name);
  }
  throw Error('UNKNOWN_SYNTHETIC_COMMAND');
}
function networkEvidence() {
  return {lifetime, nativeFactory: indexedDB instanceof IDBFactory && Function.prototype.toString.call(IDBFactory).includes('[native code]'), networkAttempts: [...networkAttempts]};
}
globalThis.__bnsNative = {run, networkEvidence};

// Actual owner conflict matrix in separate native databases; no production RPC.
let runPromptConflictMatrix;
{
const cases=[],test=(name,fn)=>cases.push({name,fn});
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const assert={equal(a,b){if(a!==b)throw Error('SYNTHETIC equality '+JSON.stringify([a,b]));},deepEqual(a,b){if(JSON.stringify(canonical(a))!==JSON.stringify(canonical(b)))throw Error('SYNTHETIC exact snapshot mismatch');},async rejects(p,predicate){try{await p;}catch(e){if(predicate&&!predicate(e))throw Error('SYNTHETIC wrong rejection '+e.code);return;}throw Error('SYNTHETIC expected rejection');}};
let matrixSequence=0;
async function setup(Store){const name='conflict_matrix_'+(++matrixSequence),s=new Store(storageFor(name),{indexedDB,name:'bns-native-'+name});await s.consent(true);return {s};}
const datasetId='synthetic_conflict',manualId='manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const value=text=>({id:PROMPT_REUSE_ROW,version:1,pins:[],overrides:[{id:manualId,text,hidden:false}],splits:[]});
async function operation(deviceId,sequence,text,parents=[]){return sealOperation({protocol:1,datasetId,deviceId,sequence,operationId:crypto.randomUUID(),type:'promptPreferences',entityId:PROMPT_REUSE_ROW,codecVersion:1,kind:'put',actor:'user',parents,value:value(text)});}
async function scenario(){const f=await setup(OrganizerStore);await f.s.finishFoundation();const core=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:'synthetic_local',materialize:materializePrompt}),service=new PromptReuseService(f.s,{syncJournal:new PromptSyncJournal(core)}),a=await operation('synthetic_A',1,'SYNTHETIC A'),b=await operation('synthetic_B',1,'SYNTHETIC B'),c=await operation('synthetic_A',2,'SYNTHETIC C',[a.revisionId]),resolution=await operation('synthetic_resolver',1,'SYNTHETIC resolved',[b.revisionId,c.revisionId]);await core.receive(a);assert.equal((await core.receive(b)).state,'conflict');assert.equal((await core.receive(c)).state,'conflict');return {...f,core,service,a,b,c,resolution};}
const prefs=f=>f.s.repository.transaction(false,readPromptPreferences),meta=f=>f.s.repository.transaction(false,t=>t.all('meta'));
test('advanced conflict A/B to C/B resolves from exact last materialized A owner',async()=>{const f=await scenario();assert.equal((await prefs(f)).overrides[0].text,'SYNTHETIC A');assert.equal((await f.core.receive(f.resolution)).state,'applied');assert.equal((await prefs(f)).overrides[0].text,'SYNTHETIC resolved');});
test('advanced conflict resolution still allows actual device-local verified reuse',async()=>{const f=await scenario();await f.service.noteVerifiedReuse(manualId);assert.equal((await f.core.receive(f.resolution)).state,'applied');assert.equal((await prefs(f)).overrides[0].reuseCount,1);});
test('local human edit and exact text reversion cannot masquerade as the materialized ancestor',async()=>{const f=await scenario(),plain=new PromptReuseService(f.s);for(const text of ['SYNTHETIC human edit','SYNTHETIC A']){const p=await prefs(f);await plain.change({action:'edit',id:manualId,revision:p.revision,text});}const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code==='BNS_OWNER_CHANGED');assert.deepEqual(await meta(f),before);});
test('legacy advanced conflict without proof stays blocked and retains every protocol row',async()=>{const f=await scenario();await f.core.transaction(true,async t=>t.delete('meta',await f.core.idIn(t,'materializedOwner','promptPreferences',PROMPT_REUSE_ROW)));const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code==='BNS_OWNER_CHANGED');assert.deepEqual(await meta(f),before);});
test('verified reuse saturation advances existing proof revision without inventing a counter increment',async()=>{const f=await scenario();await f.core.transaction(true,async t=>{const p=await readPromptPreferences(t);p.overrides[0].reuseCount=1000000;await t.put('meta',p);});const before=await prefs(f);await f.service.noteVerifiedReuse(manualId);const after=await prefs(f);assert.equal(after.overrides[0].reuseCount,1000000);assert.equal(after.revision,before.revision+1);assert.equal((await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW)).ownerRevision,after.revision);await f.core.receive(f.resolution);assert.equal((await prefs(f)).overrides[0].reuseCount,1000000);});
test('verified reuse never creates an absent proof or repairs prior human edits',async()=>{for(const change of ['missing','edited']){const f=await scenario();if(change==='missing')await f.core.transaction(true,async t=>t.delete('meta',await f.core.idIn(t,'materializedOwner','promptPreferences',PROMPT_REUSE_ROW)));else{const plain=new PromptReuseService(f.s);for(const text of ['SYNTHETIC changed','SYNTHETIC A']){const p=await prefs(f);await plain.change({action:'edit',id:manualId,revision:p.revision,text});}}const marker=await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW);await f.service.noteVerifiedReuse(manualId);assert.deepEqual(await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW),marker);const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code==='BNS_OWNER_CHANGED');assert.deepEqual(await meta(f),before);}});
test('proof cannot be borrowed from a different active namespace',async()=>{const f=await scenario();await f.core.transaction(true,async t=>{const marker=await f.core.get(t,'materializedOwner','promptPreferences',PROMPT_REUSE_ROW);await t.delete('meta',marker.id);await t.put('meta',{...marker,id:f.core.prefix+'generation:unrelated_namespace:materializedOwner:promptPreferences:prompt-reuse%3Av1'});});const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code==='BNS_OWNER_CHANGED');assert.deepEqual(await meta(f),before);});
test('ordinary journal commits materialize:false write exact proof and failed commit rolls it back',async()=>{const f=await scenario(),r=await f.core.receive(f.resolution);assert.equal(r.state,'applied');const p=await prefs(f);await f.service.change({action:'edit',revision:p.revision,id:manualId,text:'SYNTHETIC local next'});const current=await prefs(f),head=await f.core.read('head','promptPreferences',PROMPT_REUSE_ROW),proof=await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW);assert.equal(proof.revisionId,head.revisions[0]);assert.equal(proof.ownerRevision,current.revision);const before=await meta(f),put=f.core.recordMaterializedOwner.bind(f.core);f.core.recordMaterializedOwner=async(...args)=>{await put(...args);throw Error('SYNTHETIC abort proof');};await assert.rejects(f.service.change({action:'edit',revision:current.revision,id:manualId,text:'SYNTHETIC refused'}));assert.deepEqual(await meta(f),before);});
test('exact materialized pointer must be an ancestor of current heads, not merely equal text',async()=>{const f=await scenario(),unrelated=await operation('synthetic_unrelated',1,'SYNTHETIC A');await f.core.transaction(true,async t=>{await f.core.put(t,'revision',[unrelated.revisionId],{operation:unrelated,redacted:false});await f.core.recordMaterializedOwner(t,unrelated,(await readPromptPreferences(t)).revision);});const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code==='BNS_OWNER_CHANGED');assert.deepEqual(await meta(f),before);});
test('bounded owner ancestry refuses a too-deep conflict without protocol acknowledgement',async()=>{const f=await scenario();let last=f.c;for(let i=3;i<=130;i++){last=await operation('synthetic_A',i,'SYNTHETIC depth '+i,[last.revisionId]);await f.core.receive(last);}const resolve=await operation('synthetic_resolver',2,'SYNTHETIC too deep',[f.b.revisionId,last.revisionId]),before=await meta(f);await assert.rejects(f.core.receive(resolve),e=>e.code==='BNS_OWNER_ANCESTRY_LIMIT');assert.deepEqual(await meta(f),before);});
test('staged resolved descendant qualifies the live materialized ancestor and transfers proof to new namespace',async()=>{const f=await scenario(),g=await setup(OrganizerStore);await g.s.finishFoundation();const remote=new BrowserNativeSyncCore(g.s.repository,{datasetId,deviceId:'synthetic_checkpoint'});await remote.receiveBatch([f.a,f.b,f.c,f.resolution]);const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id).slice();}},cp=await buildCheckpoint(remote,transport),restore=new StagedSyncRestore(f.core,{owners:{promptPreferences:restorePromptPreferences}});await restore.stageCheckpoint(cp.ref,r=>transport.get(r));await restore.activate();const p=await prefs(f),proof=await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW);assert.equal(p.overrides[0].text,'SYNTHETIC resolved');assert.equal(proof.revisionId,f.resolution.revisionId);assert.equal(proof.ownerRevision,p.revision);assert.equal(await f.core.namespace(),restore.restoreId);});

test('explicit bootstrap preserves canonical revision and binds exact proof; concurrent head is refused',async()=>{for(const race of [false,true]){const f=await setup(OrganizerStore);await f.s.finishFoundation();const core=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:'synthetic_bootstrap',materialize:materializePrompt}),plain=new PromptReuseService(f.s),journal=new PromptSyncJournal(core);await plain.change({action:'create',revision:0,text:'SYNTHETIC bootstrap'});const before=await f.s.repository.transaction(false,readPromptPreferences);if(race){const prepare=core.prepare.bind(core);let once=true;core.prepare=async(...args)=>{if(once){once=false;await journal.bootstrap();}return prepare(...args);};await assert.rejects(journal.bootstrap(),e=>e.code==='BNS_HEAD_CHANGED');}else await journal.bootstrap();assert.deepEqual(await f.s.repository.transaction(false,readPromptPreferences),before);const proof=await core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW),head=await core.read('head','promptPreferences',PROMPT_REUSE_ROW);assert.equal(proof.ownerRevision,before.revision);assert.equal(proof.revisionId,head.revisions[0]);}});

runPromptConflictMatrix=async()=>{const names=[];for(const c of cases){await c.fn();names.push(c.name);}return names;};
}
