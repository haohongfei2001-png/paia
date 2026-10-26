import assert from 'node:assert/strict';

export const portablePrompt = preferences => ({id: preferences.id, version: preferences.version, pins: preferences.pins, overrides: preferences.overrides.map(({reuseCount, ...item}) => item), splits: preferences.splits});

// Compare the entire transition, not just matching text in two independently
// stale owners. The operation is captured from the actual prepared transaction
// at its synchronous debugger pause, before that worker is terminated.
export function assertPromptCrashOutcome(before, after, {text, operation}) {
  assert.equal(before.state.length, 1); assert.equal(before.state[0].purged, false);
  assert.notEqual(text, before.preferences.overrides[0].text, 'Each interrupted phase must perform a distinct edit');
  assert.equal(operation.sequence, before.sequence + 1);
  assert.ok(!before.outbox.some(value => value.operationId === operation.operationId || value.revisionId === operation.revisionId), 'The phase must prepare a genuinely new operation and revision');
  assert.deepEqual(operation.parents, before.state[0].revisions);
  const preferences = structuredClone(before.preferences);
  preferences.revision++; preferences.overrides[0].text = text;
  assert.deepEqual(operation.value, portablePrompt(preferences));
  const prior = before.state[0].versions[0];
  for (const field of ['protocol', 'datasetId', 'deviceId', 'type', 'entityId', 'codecVersion', 'kind', 'actor']) assert.equal(operation[field], prior[field]);
  if (after.preferences.revision === before.preferences.revision) { assert.deepEqual(after, before); return 'neither'; }
  const expected = {
    ...structuredClone(before), preferences, sequence: before.sequence + 1, generation: before.generation + 1,
    outbox: [...before.outbox, operation],
    state: [{...before.state[0], revisions: [operation.revisionId], versions: [operation]}]
  };
  assert.deepEqual(after, expected, 'Canonical revision, new outbox operation, sequence, generation and head must commit together');
  return 'both';
}

// A cooperative worker stop may complete the synthetic no-op used only for a
// clean restart. Transaction/staging interruption evaluations must still reject.
export function assertWorkerLifecycle(event) {
  assert.equal(event.stopped, true); assert.equal(event.restarted, true);
  for (const lifetime of [event.beforeLifetime, event.afterLifetime]) assert.ok(typeof lifetime === 'string' && lifetime.length > 0);
  assert.notEqual(event.beforeLifetime, event.afterLifetime);
  assert.equal(event.phase.lifetime, event.beforeLifetime);
  if (event.interruptedCall === 'returned') {
    assert.equal(event.phase.name, 'restart-boundary');
    assert.equal(event.phase.hasNativeTransaction, false);
    assert.equal(event.completedNoopValue, true);
  } else assert.equal(event.interruptedCall, 'terminated');
  return event;
}

export function assertNetworkLedger(ledger, expectedTransitions = ledger.transitions) {
  assert.equal(ledger.complete, true); assert.ok(ledger.observations.length >= 2);
  const observed = [], seen = new Set(); let current;
  for (let index = 0; index < ledger.observations.length; index++) {
    const value = ledger.observations[index], previous = ledger.observations[index - 1];
    assert.equal(typeof value.lifetime, 'string'); assert.ok(value.lifetime.length > 0);
    assert.equal(value.nativeFactory, true); assert.deepEqual(value.networkAttempts, [], 'A denied request in any prior lifetime invalidates the proof');
    assert.ok(['opened', 'before-stop', 'paused-before-stop', 'restarted', 'final'].includes(value.point));
    if (index === 0) { assert.equal(value.point, 'opened'); current = value.lifetime; seen.add(current); }
    else if (value.lifetime !== current) {
      assert.equal(previous.point, 'paused-before-stop', 'Every terminated heap needs a synchronous final network observation');
      assert.equal(value.point, 'restarted'); assert.ok(!seen.has(value.lifetime));
      observed.push({beforeLifetime: current, afterLifetime: value.lifetime}); current = value.lifetime; seen.add(current);
    } else assert.ok(!['opened', 'restarted'].includes(value.point));
  }
  assert.equal(ledger.observations.at(-1).point, 'final');
  assert.deepEqual(ledger.transitions, observed);
  assert.deepEqual(observed, expectedTransitions.map(({beforeLifetime, afterLifetime}) => ({beforeLifetime, afterLifetime})));
  return ledger;
}

// Held by the Node driver, never a worker heap. Observations are append-only and
// retained even if validation throws, so a later clean lifetime cannot erase one.
export class LifetimeNetworkLedger {
  evidence = {observations: [], transitions: [], complete: false};
  current = null;
  observe(value, point) {
    const row = {...structuredClone(value), point}; this.evidence.observations.push(row);
    assert.equal(row.nativeFactory, true); assert.deepEqual(row.networkAttempts, []);
    if (this.current === null) { assert.equal(point, 'opened'); this.current = row.lifetime; }
    assert.equal(row.lifetime, this.current, 'Unobserved worker lifetime change');
    return row;
  }
  restarted(before, after) {
    assert.equal(before.lifetime, this.current); assert.notEqual(after.lifetime, this.current);
    assert.equal(this.evidence.observations.at(-1).point, 'paused-before-stop');
    this.evidence.transitions.push({beforeLifetime: this.current, afterLifetime: after.lifetime});
    this.current = after.lifetime; this.observe(after, 'restarted');
  }
  finish(value) {
    this.observe(value, 'final'); this.evidence.complete = true;
    return assertNetworkLedger(this.evidence);
  }
}
