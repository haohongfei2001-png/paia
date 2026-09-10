import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {emptyStructure, emptyRow} from '../core/diagnostics.js';

const captureSource = await readFile(new URL('../content/capture.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../core/diagnostics-schema.js', import.meta.url), 'utf8');

async function schedulerFixture(status, options = {}) {
  const sent = [];
  const state = {reads: 0, watching: 0, stops: 0, captures: 0, invalidations: 0, diagnostics: 0};
  const timers = [];
  class FakeAdapter {
    version = '0.3.0';
    watch() { state.watching += 1; }
    stopWatching() { state.stops += 1; }
    invalidate() { state.invalidations += 1; }
    isSameChat() { return !(options.navigateAfterFirst && state.captures > 0); }
    collect() {
      state.reads += 1;
      if (options.adapterThrows) throw new Error('synthetic adapter failure');
      return {code: options.code || 'CAPTURING', structure: options.structures?.[Math.min(state.reads - 1, options.structures.length - 1)], scanned: options.count || 1, chat: {id: 'chat-fixture-001', url: 'https://chatgpt.com/c/chat-fixture-001', title: '虚构'}, messages: options.noMessages ? [] : Array.from({length: options.count || 1}, (_, index) => ({sourceMessageId: `message-fixture-${index}`, pageOrder: index + 1, originalText: '虚构'}))};
    }
  }
  const context = vm.createContext({
    ChatGPTAdapter: FakeAdapter,
    ArchiveResponseTime: options.responseDiagnosticThrows ? {observe() {throw new Error('synthetic optional diagnostic failure');}} : undefined,
    chrome: {runtime: {id: options.invalidated ? undefined : 'synthetic-extension', async sendMessage(message) {
      sent.push(message);
      if (options.fail) throw new Error('synthetic error that must not be logged');
      if (message.type === 'CAPTURE') {
        state.captures += 1;
        if (options.failedCaptureAt === state.captures) return {ok: false, error: options.error || 'PAUSED'};
      }
      if (message.type === 'DIAGNOSTIC') {
        state.diagnostics += 1;
        if (options.failedDiagnosticAt === state.diagnostics) return {ok: false, error: 'STORAGE_FAILED'};
      }
      return message.type === 'GET_STATUS' ? {ok: true, data: status} : {ok: true, data: {added: 1}};
    }}},
    setTimeout(callback, delay) { timers.push({callback, delay}); return timers.length; },
    clearTimeout() {}, Date
  });
  vm.runInContext(schemaSource, context);
  vm.runInContext(captureSource, context);
  await new Promise((resolve) => setImmediate(resolve));
  return {sent, state, timers};
}

test('capture scheduler never reads content before consent, while paused, or after status failure', async () => {
  for (const status of [
    {enabled: false, consented: false, epoch: 0, adapterVersion: '0.3.0'},
    {enabled: true, consented: false, epoch: 0, adapterVersion: '0.3.0'},
    {enabled: false, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {enabled: true, consented: true, epoch: 1, adapterVersion: 'different'}
  ]) {
    const result = await schedulerFixture(status);
    assert.equal(result.state.reads, 0);
    assert.equal(result.state.watching, 0);
    assert.equal(result.sent.some((message) => message.type === 'CAPTURE'), false);
  }
  const failed = await schedulerFixture({}, {fail: true});
  assert.equal(failed.state.reads, 0);
  assert.equal(failed.timers.length, 1);
  const invalidated = await schedulerFixture({}, {invalidated: true});
  assert.equal(invalidated.state.reads, 0);
  assert.equal(invalidated.timers.length, 0);
});

test('enabled capture forwards the current consent epoch and keeps polling at most every two seconds', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0'});
  assert.equal(result.state.reads, 1);
  assert.equal(result.sent.find((message) => message.type === 'CAPTURE').epoch, 42);
  assert.equal(result.timers.length, 1);
  assert.ok(result.timers[0].delay >= 1900 && result.timers[0].delay <= 2000);
});

test('large scans use batches of at most 200 and retain the same checked consent epoch', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0'}, {count: 501});
  const batches = result.sent.filter((message) => message.type === 'CAPTURE');
  assert.deepEqual(batches.map((message) => message.messages.length), [200, 200, 101]);
  assert.equal(batches.every((message) => message.epoch === 42), true);
});

test('route changes and backend rejection stop remaining batches; adapter errors become fixed diagnostics', async () => {
  const status = {enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0'};
  const navigated = await schedulerFixture(status, {count: 501, navigateAfterFirst: true});
  assert.equal(navigated.state.captures, 1);
  assert.equal(navigated.state.invalidations, 1);
  assert.equal(navigated.sent.at(-1).code, 'UNSTABLE_PAGE');
  const rejected = await schedulerFixture(status, {count: 501, failedCaptureAt: 1});
  assert.equal(rejected.state.captures, 1);
  assert.equal(rejected.sent.at(-1).code, 'PAUSED');
  const thrown = await schedulerFixture(status, {adapterThrows: true});
  assert.equal(thrown.state.captures, 0);
  assert.equal(thrown.state.invalidations, 1);
  assert.equal(thrown.sent.at(-1).code, 'CAPTURE_FAILED');
});

test('backend failures preserve only known diagnostic codes and never forward arbitrary error text', async () => {
  const status = {enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0'};
  for (const error of ['STORAGE_FULL', 'STORAGE_FAILED', 'MESSAGE_TOO_LARGE', 'ADAPTER_MISMATCH', 'CONTEXT_INVALIDATED', 'CONSENT_REQUIRED', 'STALE_CAPTURE', 'unknown synthetic private value']) {
    const result = await schedulerFixture(status, {failedCaptureAt: 1, error});
    assert.equal(result.sent.at(-1).code, error.startsWith('unknown') ? 'CAPTURE_FAILED' : error);
    if (error === 'CONTEXT_INVALIDATED') assert.equal(result.timers.length, 0);
    if (error === 'STALE_CAPTURE') assert.equal(result.state.invalidations, 1);
    assert.equal(JSON.stringify(result.sent).includes('unknown synthetic private value'), false);
  }
});

test('structure diagnostics are projected before sending and never forward snapshot content', async () => {
  const structure = {...emptyStructure(), userRoleCount: 1, visibleUserRoleCount: 1,
    originalText: 'SYNTHETIC_PRIVATE_SENTINEL', url: 'SYNTHETIC_PRIVATE_SENTINEL',
    rows: [{...emptyRow(), textMatches: 2, safeTextMatches: 2, messageId: 'SYNTHETIC_PRIVATE_SENTINEL', title: 'SYNTHETIC_PRIVATE_SENTINEL'}]};
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {code: 'ADAPTER_MISMATCH', noMessages: true, structures: [structure]});
  const diagnostic = result.sent.find(message => message.type === 'DIAGNOSTIC');
  assert.equal(diagnostic.structure.rows[0].safeTextMatches, 2);
  assert.equal(JSON.stringify(diagnostic).includes('SYNTHETIC_PRIVATE_SENTINEL'), false);
  assert.deepEqual(Object.keys(diagnostic).sort(), ['adapterVersion', 'code', 'scanned', 'structure', 'type']);
  assert.equal(result.state.captures, 0);
  const invalid = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {code: 'ADAPTER_MISMATCH', noMessages: true, structures: [{...structure, userRoleCount: 'SYNTHETIC_PRIVATE_SENTINEL'}]});
  assert.equal(invalid.sent.find(message => message.type === 'DIAGNOSTIC').structure, null);
});

test('same status and scanned count report changed structure immediately, without thirty-second masking', async () => {
  const first = {...emptyStructure(), userRoleCount: 1, visibleUserRoleCount: 1};
  const second = {...first, validTurnCount: 1};
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {code: 'ADAPTER_MISMATCH', noMessages: true, structures: [first, second, second]});
  result.timers[0].callback();
  await new Promise(resolve => setImmediate(resolve));
  let diagnostics = result.sent.filter(message => message.type === 'DIAGNOSTIC');
  assert.equal(diagnostics.length, 2);
  assert.equal(diagnostics[0].structure.validTurnCount, 0);
  assert.equal(diagnostics[1].structure.validTurnCount, 1);
  result.timers[1].callback();
  await new Promise(resolve => setImmediate(resolve));
  diagnostics = result.sent.filter(message => message.type === 'DIAGNOSTIC');
  assert.equal(diagnostics.length, 2);
});

test('version mismatch has a separate reason and performs no structure scan', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: 'different'});
  assert.equal(result.state.reads, 0);
  assert.equal(result.sent.at(-1).code, 'ADAPTER_VERSION_MISMATCH');
  assert.equal(result.sent.at(-1).structure, null);
});

test('mixed normal and oversized messages restore the skipped-message diagnostic after successful capture', async () => {
  const structure = {...emptyStructure(), userRoleCount: 2, finalCandidateCount: 2};
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {code: 'MESSAGE_TOO_LARGE', structures: [structure]});
  assert.equal(result.state.captures, 1);
  const lastCapture = result.sent.findLastIndex(message => message.type === 'CAPTURE');
  const lastDiagnostic = result.sent.findLastIndex(message => message.type === 'DIAGNOSTIC');
  assert.ok(lastDiagnostic > lastCapture, 'capture replaces backend status; the warning must follow it');
  assert.equal(result.sent.at(-1).code, 'MESSAGE_TOO_LARGE');
  assert.equal(result.sent.at(-1).structure.finalCandidateCount, 2);
});

test('failed structural diagnostic is retried on the next cycle despite unchanged counts', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 1, adapterVersion: '0.3.0'},
    {code: 'ADAPTER_MISMATCH', noMessages: true, structures: [emptyStructure()], failedDiagnosticAt: 1});
  assert.equal(result.state.diagnostics, 1);
  result.timers[0].callback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result.state.diagnostics, 2);
  assert.equal(result.sent.at(-1).code, 'ADAPTER_MISMATCH');
  assert.equal(result.state.captures, 0);
});


test('optional response diagnostic failure cannot stop the canonical capture path', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0'}, {responseDiagnosticThrows: true});
  assert.equal(result.state.captures, 1);
  assert.equal(result.sent.some(message => message.type === 'CAPTURE'), true);
});
