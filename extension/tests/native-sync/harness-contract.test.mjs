// Node-only fixture preflight. Passing this file is explicitly NOT native IDB,
// a worker termination result, source/release browser proof, or provider evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {IDBFactory, IDBKeyRange, IDBTransaction} from '../vendor/fake-indexeddb/build/esm/index.js';
import {ImmutableObjects} from './immutable-objects.mjs';
import {instrumentedExtension, root} from './storage-harness.mjs';
import {assertReceipt, CASES, assertInputWorkingReceipt, INPUT_WORKING_PATHS, INPUT_WORKING_CASES} from './receipt.mjs';
import {assertPromptCrashOutcome, portablePrompt, LifetimeNetworkLedger, assertNetworkLedger, assertWorkerLifecycle} from './proof-oracles.mjs';

function promptTransition(text = 'Synthetic distinct new text') {
  const preferences = {id: 'prompt-reuse:v1', version: 1, revision: 1, pins: [], overrides: [{id: 'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', text: 'Synthetic prior text', hidden: false, reuseCount: 0}], splits: []};
  const previous = {protocol: 1, datasetId: 'synthetic_dataset', deviceId: 'synthetic_device', type: 'promptPreferences', entityId: preferences.id, codecVersion: 1, kind: 'put', actor: 'user', sequence: 1, operationId: 'synthetic_old_operation', revisionId: 'a'.repeat(64), parents: [], value: portablePrompt(preferences)};
  const before = {preferences, state: [{type: previous.type, entityId: previous.entityId, purged: false, revisions: [previous.revisionId], versions: [previous]}], outbox: [previous], namespace: 'initial', pending: [], generation: 1, sequence: 1};
  const next = structuredClone(preferences); next.revision++; next.overrides[0].text = text;
  const operation = {...previous, sequence: 2, operationId: 'synthetic_new_operation', revisionId: 'b'.repeat(64), parents: [previous.revisionId], value: portablePrompt(next)};
  const after = {...structuredClone(before), preferences: next, sequence: 2, generation: 2, outbox: [previous, operation], state: [{...before.state[0], revisions: [operation.revisionId], versions: [operation]}]};
  return {before, after, text, operation};
}
const networkIdentity = lifetime => ({lifetime, nativeFactory: true, networkAttempts: []});

test('crash oracle rejects revision-only, same-text and every partial journal transition', () => {
  const {before, after, text, operation} = promptTransition();
  assert.equal(assertPromptCrashOutcome(before, before, {text, operation}), 'neither');
  assert.equal(assertPromptCrashOutcome(before, after, {text, operation}), 'both');
  const onlyRevision = structuredClone(before); onlyRevision.preferences.revision++;
  assert.throws(() => assertPromptCrashOutcome(before, onlyRevision, {text, operation}));
  assert.throws(() => assertPromptCrashOutcome(before, onlyRevision, {text: before.preferences.overrides[0].text, operation}), /distinct edit/);
  const onlyCanonical = {...structuredClone(before), preferences: after.preferences};
  assert.throws(() => assertPromptCrashOutcome(before, onlyCanonical, {text, operation}));
  for (const field of ['preferences', 'outbox', 'state', 'generation', 'sequence']) {
    const omitted = {...structuredClone(after), [field]: structuredClone(before[field])};
    const alone = {...structuredClone(before), [field]: structuredClone(after[field])};
    assert.throws(() => assertPromptCrashOutcome(before, omitted, {text, operation}), 'omitted ' + field);
    assert.throws(() => assertPromptCrashOutcome(before, alone, {text, operation}), 'only ' + field);
  }
  for (const change of [{sequence: 3}, {generation: 3}, {outbox: [operation]}, {namespace: 'wrong'}]) assert.throws(() => assertPromptCrashOutcome(before, {...after, ...change}, {text, operation}));
  for (const change of [{operationId: before.outbox[0].operationId}, {revisionId: before.outbox[0].revisionId}, {parents: []}]) assert.throws(() => assertPromptCrashOutcome(before, after, {text, operation: {...operation, ...change}}));
});

test('only a completed restart no-op may survive a verified worker stop and fresh heap', () => {
  const event = {phase: {name: 'restart-boundary', lifetime: 'before', hasNativeTransaction: false}, beforeLifetime: 'before', afterLifetime: 'after', stopped: true, restarted: true, interruptedCall: 'returned', completedNoopValue: true};
  assertWorkerLifecycle(event);
  assertWorkerLifecycle({...event, interruptedCall: 'terminated'});
  for (const change of [{stopped: false}, {restarted: false}, {afterLifetime: 'before'}, {afterLifetime: ''}, {completedNoopValue: false}, {completedNoopValue: undefined}, {interruptedCall: 'pending'}]) assert.throws(() => assertWorkerLifecycle({...event, ...change}));
  for (const phase of [{...event.phase, lifetime: 'wrong'}, {...event.phase, hasNativeTransaction: true}, {...event.phase, name: 'staged-item'}, {...event.phase, name: 'pause-before-journal'}, {...event.phase, name: 'pause-after-journal'}, {...event.phase, name: 'after-activation'}]) assert.throws(() => assertWorkerLifecycle({...event, phase}));
});

test('network oracle retains denied requests from stopped heaps and refuses missing pause evidence', () => {
  const ledger = new LifetimeNetworkLedger(); ledger.observe(networkIdentity('first'), 'opened');
  assert.throws(() => ledger.observe({...networkIdentity('first'), networkAttempts: ['https://synthetic.invalid/denied']}, 'paused-before-stop'));
  assert.equal(ledger.evidence.observations[1].networkAttempts.length, 1);
  ledger.restarted(networkIdentity('first'), networkIdentity('second'));
  assert.throws(() => ledger.finish(networkIdentity('second')), /prior lifetime/);
  const valid = new LifetimeNetworkLedger(); valid.observe(networkIdentity('first'), 'opened'); valid.observe(networkIdentity('first'), 'paused-before-stop'); valid.restarted(networkIdentity('first'), networkIdentity('second')); valid.finish(networkIdentity('second'));
  const erased = structuredClone(valid.evidence); erased.observations.splice(1, 1);
  assert.throws(() => assertNetworkLedger(erased), /synchronous final/);
  const missingLife = structuredClone(valid.evidence); missingLife.transitions = [];
  assert.throws(() => assertNetworkLedger(missingLife));
  const unexpected = new LifetimeNetworkLedger(); unexpected.observe(networkIdentity('first'), 'opened');
  assert.throws(() => unexpected.observe(networkIdentity('second'), 'final'), /Unobserved/);
});

test('synthetic immutable object transport owns bytes and rejects changed retry payloads', async () => {
  const transport = new ImmutableObjects(), ref = {id: 'synthetic'}, input = Uint8Array.of(1, 2, 3);
  await transport.putImmutable(ref, input); input[0] = 9;
  const returned = await transport.get(ref); assert.deepEqual(returned, Uint8Array.of(1, 2, 3)); returned[1] = 9;
  assert.deepEqual(await transport.get(ref), Uint8Array.of(1, 2, 3));
  await transport.putImmutable(ref, Uint8Array.of(1, 2, 3));
  await assert.rejects(transport.putImmutable(ref, Uint8Array.of(1, 9, 3)), /COLLISION/);
  await assert.rejects(transport.get({id: 'missing'}), /MISSING/);
  const entries = transport.entries(), restored = new ImmutableObjects(entries); entries[0][1][0] = 9;
  assert.deepEqual(await restored.get(ref), Uint8Array.of(1, 2, 3));
});

test('native receipt contract cannot turn missing cases or model evidence into native PASS', () => {
  const source = new LifetimeNetworkLedger(); source.observe(networkIdentity('source'), 'opened'); source.finish(networkIdentity('source'));
  const destination = new LifetimeNetworkLedger(); destination.observe(networkIdentity('life-0'), 'opened');
  const lifecycle = ['restart-boundary', 'pause-before-journal', 'pause-after-journal', 'restart-boundary', 'staged-item', 'after-activation'].map((name, index) => {
    const before = networkIdentity('life-' + index), after = networkIdentity('life-' + (index + 1));
    destination.observe(before, 'before-stop'); const pausedNetwork = destination.observe(before, 'paused-before-stop'); destination.restarted(before, after);
    const event = {phase: {name, lifetime: before.lifetime, hasNativeTransaction: !['staged-item', 'restart-boundary'].includes(name)}, beforeLifetime: before.lifetime, afterLifetime: after.lifetime, stopped: true, restarted: true, interruptedCall: 'terminated', pausedNetwork, durabilityOutcome: 'neither'};
    if (name.startsWith('pause-')) { const proof = promptTransition('Synthetic distinct text: ' + name); event.phase.preparedOperation = proof.operation; event.promptProof = {text: proof.text, before: proof.before, after: proof.before}; }
    return event;
  });
  destination.finish(networkIdentity('life-6'));
  const receipt = {
    schema: 1, result: 'PASS', head: 'a'.repeat(40), tree: 'a'.repeat(40), browserVersion: '142.0.0.0', variant: 'source', evidence: 'SYNTHETIC_NATIVE_INDEXEDDB_PARTIAL_CORE',
    cases: CASES.map(id => ({id, result: 'PASS'})), nativeFactory: true, networkAttempts: 0,
    sourceDeviceClosedBeforeRestore: true, profileHashes: ['b'.repeat(64), 'c'.repeat(64)], ownerCoverage: 'promptPreferences-only',
    quotaEvidence: 'injected-DOMException-not-physical-exhaustion',
    productionActivation: false, uiQualification: false, providerQualification: false, installedUserBuild: false, fullCanonicalCoverage: false,
    productionHashes: Object.fromEntries(Array.from({length: 6}, (_, i) => ['module' + i, 'd'.repeat(64)])),
    committedRestart: lifecycle[0], activationAbortRestart: lifecycle[3], terminations: [lifecycle[1], lifecycle[2], lifecycle[4], lifecycle[5]],
    sourceNetwork: source.evidence, destinationNetwork: destination.evidence
  };
  const validate = value => assertReceipt(value, {head: receipt.head, variant: 'source'});
  validate(receipt);
  assert.throws(()=>assertReceipt(receipt,{head:receipt.head,variant:'source',requiredFilterIntent:true}));
  const extendedNetwork=new LifetimeNetworkLedger();extendedNetwork.observe(networkIdentity('life-0'),'opened');
  const extendedLife=[...lifecycle,{phase:{name:'restart-boundary',lifetime:'life-6',hasNativeTransaction:false},beforeLifetime:'life-6',afterLifetime:'life-7',stopped:true,restarted:true,interruptedCall:'terminated'}].map(event=>{
   const before=networkIdentity(event.beforeLifetime),after=networkIdentity(event.afterLifetime);extendedNetwork.observe(before,'before-stop');const pausedNetwork=extendedNetwork.observe(before,'paused-before-stop');extendedNetwork.restarted(before,after);return {...event,pausedNetwork};
  });extendedNetwork.finish(networkIdentity('life-7'));
  const extended={...receipt,destinationNetwork:extendedNetwork.evidence,filterIntentRestart:extendedLife[6],filterIntentCases:Array.from({length:23},(_,i)=>'synthetic Keep case '+i),filterIntentHashes:Object.fromEntries(['core/browser-native-sync/codecs.js','core/browser-native-sync/filter-intent-journal.js','core/smart-filter-store.js'].map(p=>[p,'f'.repeat(64)]))};
  const validateKeep=r=>assertReceipt(r,{head:receipt.head,variant:'source',requiredFilterIntent:true});validateKeep(extended);
  for(const field of ['filterIntentRestart','filterIntentCases','filterIntentHashes']){const missing=structuredClone(extended);delete missing[field];assert.throws(()=>validateKeep(missing));}
  for(const value of [false,null,undefined])assert.throws(()=>validateKeep({...extended,filterIntentRestart:value}));
  const completedRestart = structuredClone(receipt); completedRestart.committedRestart.interruptedCall = 'returned'; completedRestart.committedRestart.completedNoopValue = true; validate(completedRestart);
  for (const change of [{stopped: false}, {afterLifetime: completedRestart.committedRestart.beforeLifetime}, {completedNoopValue: false}]) { const invalid = structuredClone(completedRestart); Object.assign(invalid.committedRestart, change); assert.throws(() => validate(invalid)); }
  for (const index of [0, 1, 2, 3]) { const invalid = structuredClone(receipt); Object.assign(invalid.terminations[index], {interruptedCall: 'returned', completedNoopValue: true}); assert.throws(() => validate(invalid)); }
  for (const change of [{nativeFactory: false}, {result: 'IN_PROGRESS'}, {head: 'e'.repeat(40)}, {cases: receipt.cases.slice(1)}, {terminations: []}, {networkAttempts: 1}, {fullCanonicalCoverage: true}]) assert.throws(() => validate({...receipt, ...change}));
  const hiddenDenied = structuredClone(receipt); hiddenDenied.destinationNetwork.observations[2].networkAttempts.push('https://synthetic.invalid/denied'); assert.throws(() => validate(hiddenDenied));
  const missingRecovery = structuredClone(receipt); delete missingRecovery.activationAbortRestart; assert.throws(() => validate(missingRecovery));
  const revisionOnly = structuredClone(receipt); revisionOnly.terminations[0].promptProof.after.preferences.revision++; revisionOnly.terminations[0].durabilityOutcome = 'both'; assert.throws(() => validate(revisionOnly));
});

test('copied fixture calls actual owners and preserves abort, quota, restore and generation oracles in Node preflight', async () => {
  const copy = await instrumentedExtension(root), original = await readFile(join(root, 'background/service-worker.js'), 'utf8');
  assert.equal(Object.keys(copy.hashes).length, 6, 'Shared storage receipt retains its exact production hash inventory');
  assert.equal(await readFile(join(copy.path, 'background/service-worker.js'), 'utf8'), "import './bns-native-storage-fixture.mjs';\n" + original);
  const globals = ['indexedDB', 'IDBFactory', 'IDBKeyRange', 'IDBTransaction', 'chrome', 'fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', '__bnsNative', '__bnsNativePhase'];
  const before = new Map(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const local = {};
  Object.assign(globalThis, {indexedDB: new IDBFactory(), IDBFactory, IDBKeyRange, IDBTransaction, chrome: {storage: {local: {async get(key) { return {[key]: structuredClone(local[key])}; }, async set(values) { Object.assign(local, structuredClone(values)); }}}}});
  try {
    await import(pathToFileURL(join(copy.path, 'background/bns-native-storage-fixture.mjs')).href);
    const call = globalThis.__bnsNative.run;
    assert.equal((await call('identity')).nativeFactory, false, 'fake-indexeddb must never qualify as native');
    const created = await call('change', {name: 'node_preflight', text: 'Synthetic preserved bytes e\u0301\n第二行'}); assert.equal(created.ok, true);
    const edited = await call('change', {name: 'node_preflight', text: 'Synthetic actual complete delta'}); assert.equal(edited.ok, true);
    assert.equal(assertPromptCrashOutcome(created.snapshot, edited.snapshot, {text: 'Synthetic actual complete delta', operation: edited.snapshot.outbox.at(-1)}), 'both');
    for (const [faultAt, code] of [['abort', 'STORAGE_FAILED'], ['quota', 'STORAGE_FULL']]) {
      const failed = await call('change', {name: 'node_preflight', text: 'must roll back', faultAt});
      assert.equal(failed.ok, false); assert.equal(failed.code, code); assert.deepEqual(failed.snapshot, edited.snapshot);
    }
    // Node ignores debugger statements. This validates captured-operation
    // plumbing only, not a pause or native termination outcome.
    const captured = await call('change', {name: 'node_preflight', text: 'Synthetic captured phase operation', faultAt: 'pause-after-journal'});
    assert.equal(captured.ok, true); assert.equal(globalThis.__bnsNativePhase.name, 'pause-after-journal');
    assert.deepEqual(globalThis.__bnsNativePhase.preparedOperation, captured.snapshot.outbox.at(-1));
    assert.equal(assertPromptCrashOutcome(edited.snapshot, captured.snapshot, {text: 'Synthetic captured phase operation', operation: globalThis.__bnsNativePhase.preparedOperation}), 'both');
    const cloud = await call('create-cloud-fixture'), objects = {entries: cloud.entries, descriptors: cloud.descriptors};
    assert.equal(cloud.expected.outbox.length, 3); assert.deepEqual(cloud.expected.outbox.map(op => op.sequence), [1, 2, 3]);
    const replay = await call('receive', {name: 'node_replay', ...objects, indices: [2, 1, 0]}); assert.deepEqual(replay.snapshot.state, cloud.expected.state);
    const args = {name: 'node_restore', restoreId: 'native_node_restore', ...objects, checkpointRef: cloud.final};
    const staged = await call('stage', args); assert.equal(staged.receipt.phase, 'validated'); assert.deepEqual(staged.snapshot.state, []);
    const activated = await call('activate', args); assert.equal(activated.ok, true); assert.deepEqual(activated.snapshot.state, cloud.expected.state); assert.deepEqual(activated.snapshot.outbox, []);
    const abortArgs = {...args, name: 'node_activate_abort', restoreId: 'native_node_abort', faultAt: 'after-activation'};
    await call('stage', abortArgs); const failed = await call('activate', abortArgs); assert.equal(failed.ok, false); assert.deepEqual(failed.snapshot.state, []); assert.deepEqual(failed.snapshot.preferences.overrides, []); assert.equal(failed.snapshot.namespace, 'initial');
    for (const timing of ['before', 'after']) {
      const pendingArgs = {...objects, name: 'node_pending_' + timing, restoreId: 'native_node_pending_' + timing, checkpointRef: cloud.first};
      await call('receive', {...pendingArgs, indices: [0]});
      if (timing === 'before') await call('receive', {...pendingArgs, indices: [2]});
      await call('stage', pendingArgs);
      if (timing === 'after') await call('receive', {...pendingArgs, indices: [2]});
      const result = await call('activate', pendingArgs); assert.equal(result.ok, false); assert.equal(result.code, timing === 'before' ? 'BNS_RESTORE_LIVE_PENDING' : 'BNS_RESTORE_LOCAL_CHANGED'); assert.equal(result.snapshot.pending.length, 1);
    }
    const stagePendingArgs = {...objects, name: 'node_stage_pending', restoreId: 'native_node_stage_pending', checkpointRef: cloud.first};
    await call('stage', stagePendingArgs); await call('stage-receive', {...stagePendingArgs, index: 2});
    assert.equal((await call('activate', {...stagePendingArgs, checkpointRef: null})).code, 'BNS_RESTORE_STAGE_CHANGED');
    const old = await call('old-preparation', {...args, name: 'node_old_prepared', restoreId: 'native_node_old_prepared'}); assert.equal(old.code, 'BNS_PREPARATION_STALE');
    const publicationName = 'node_publication';
    await call('change', {name: publicationName, text: 'Synthetic publication preflight'});
    const preparePublication = await call('publication-prepare', {name: publicationName});
    const publicationArgs = {name: publicationName, publicationId: preparePublication.result.publicationId};
    const unknownPublication = await call('publication-run', {...publicationArgs, unknownUpload: true});
    assert.equal(unknownPublication.code, 'BNS_TRANSPORT_UNKNOWN');
    const abortedPublication = await call('publication-run', {...publicationArgs, entries: unknownPublication.entries, abortAck: true});
    assert.equal(abortedPublication.code, 'BNS_TRANSPORT_UNKNOWN');
    assert.equal(abortedPublication.snapshot.outbox.length, 1);
    assert.equal(abortedPublication.receipt, undefined);
    assert.ok(!abortedPublication.puts.includes(unknownPublication.puts[0]));
    const confirmedPublication = await call('publication-run', {...publicationArgs, entries: abortedPublication.entries});
    assert.equal(confirmedPublication.result.state, 'confirmed');
    assert.deepEqual(confirmedPublication.puts, []);
    assert.deepEqual(confirmedPublication.snapshot.outbox, []);
    const counter = await call('counter-during-validation', {name: 'node_counter', ...objects}); assert.equal(counter.preferences.overrides[0].reuseCount, 1); assert.equal(counter.preferences.overrides[0].text, 'Synthetic intermediate revision');
    assert.ok(Object.keys(local).every(key => key.startsWith('bns-native-test:')), 'all control markers must be isolated');
    assert.throws(() => globalThis.fetch('https://synthetic.invalid/pre-stop-denied'), /NETWORK_FORBIDDEN/);
    assert.deepEqual(globalThis.__bnsNative.networkEvidence().networkAttempts, ['https://synthetic.invalid/pre-stop-denied']);
  } finally {
    for (const [name, descriptor] of before) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
    await copy.cleanup();
  }
  assert.equal(await readFile(join(root, 'background/service-worker.js'), 'utf8'), original);
});


test('Working receipt refuses stale, partial, network-erased and false activation evidence',()=>{
 const before=networkIdentity('working-before'),after=networkIdentity('working-after'),ledger=new LifetimeNetworkLedger();
 ledger.observe(before,'opened');ledger.observe(before,'before-stop');const pausedNetwork=ledger.observe(before,'paused-before-stop');ledger.restarted(before,after);ledger.finish(after);
 const restart={beforeLifetime:before.lifetime,afterLifetime:after.lifetime,phase:{name:'restart-boundary',lifetime:before.lifetime,hasNativeTransaction:false},stopped:true,restarted:true,interruptedCall:'returned',completedNoopValue:true,pausedNetwork};
 const receipt={schema:1,head:'a'.repeat(40),tree:'b'.repeat(40),variant:'source',result:'PASS',scope:'optional-local-Input-Working-publication',productionActivation:false,remoteMaterializer:false,fullRecovery:false,cases:[...INPUT_WORKING_CASES],hashes:Object.fromEntries(INPUT_WORKING_PATHS.map(p=>[p,'c'.repeat(64)])),browserVersion:'1.0 synthetic contract fixture',restart,isolation:{nativeFactory:true,networkAttempts:0,httpRequests:0,networkLedger:ledger.evidence}};
 const validate=r=>assertInputWorkingReceipt(r,{head:receipt.head,tree:receipt.tree,variant:'source'});validate(receipt);assert.throws(()=>assertInputWorkingReceipt({...receipt,head:undefined,tree:undefined},{variant:'source'}));
 for(const change of [{head:'d'.repeat(40)},{tree:'d'.repeat(40)},{result:'IN_PROGRESS'},{variant:'release'},{scope:'full-sync'},{cases:receipt.cases.slice(1)},{cases:Array(14).fill('duplicate')},{cases:receipt.cases.map((x,i)=>i===0?'other case':x)},{hashes:{}},{productionActivation:true},{remoteMaterializer:true},{fullRecovery:true},{browserVersion:''}])assert.throws(()=>validate({...receipt,...change}));
 for(const mutate of [r=>r.restart.phase.name='other-phase',r=>r.restart.phase.hasNativeTransaction=true,r=>r.restart.stopped=false,r=>r.restart.afterLifetime=r.restart.beforeLifetime,r=>r.restart.pausedNetwork={},r=>r.isolation.httpRequests=1,r=>r.isolation.networkLedger.observations[1].networkAttempts.push('https://synthetic.invalid/denied'),r=>r.isolation.networkLedger.observations.splice(2,1)]){const copy=structuredClone(receipt);mutate(copy);assert.throws(()=>validate(copy));}
});
