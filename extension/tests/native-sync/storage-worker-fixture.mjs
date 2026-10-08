// Copied ONLY into a temporary source/release extension by storage-harness.mjs.
// The production worker is retained, and these explicit test owners use isolated
// native databases and chrome.storage key prefixes. No production command exists.
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {PromptSyncJournal, materializePrompt, restorePromptPreferences} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {readPromptPreferences} from '../core/prompt-reuse-preferences.js';
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
