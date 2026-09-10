import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../core/response-time.js';
import '../adapter/response-parser.js';
import {ResponseDiagnostics} from '../background/response-diagnostics.js';
import {format} from '../ui/response-time.js';
const {parse} = globalThis.ChatGPTResponseParser;
const {Model, sanitize, time} = globalThis.ResponseTimeProtocol;
const chat = 'synthetic-chat-001';
const id = 'synthetic-user-001';
const now = Date.UTC(2026, 8, 5, 10);
const stamp = now / 1000 - 2;
const row = (key = id, value = stamp) => ({id: key, role: 'user', time: value});
const envelope = (role = 'user', key = id, value = stamp) => ({conversation_id: chat, message: {id: key, author: {role}, create_time: value, content: {parts: ['SYNTHETIC_SECRET_BODY']}}});

test('response schema projects only user metadata; rejects unconfirmed shape, identity, role and time types', () => {
  assert.deepEqual(parse(envelope(), 'event', chat), {chat, rows: [row()]});
  const assistant = envelope('assistant');
  Object.defineProperty(assistant.message, 'content', {get() {throw Error('must not inspect body');}});
  assert.deepEqual(parse(assistant, 'event', chat).rows, []);
  assert.deepEqual(parse({conversation_id: chat, mapping: {one: {message: envelope().message}, root: {message: null}}}, 'snapshot', chat).rows, [row()]);
  for (const value of [{}, {...envelope(), conversation_id: 'wrong-chat-001'}, envelope('user', 12345678), envelope('user', id, '2026-09-05'), {conversation_id: chat, mapping: []}]) assert.throws(() => parse(value, 'event', chat));
  assert.equal(time(stamp, now), stamp);
  for (const value of [null, '123', NaN, Infinity, stamp * 1000, 0]) assert.equal(time(value, now), null);
});

test('exact chat+ID matching, missing/invalid times, duplicates, conflicts and ordering stay independent of capture', () => {
  const m = new Model(); m.observe(chat, [id, 'synthetic-user-002'], now);
  assert.equal(m.ingest({chat: 'different-chat-001', rows: [row()]}), false);
  m.ingest({chat, rows: [row(), row('synthetic-user-002', stamp - 86400)]});
  m.ingest({chat, rows: [row()]});
  let s = m.summary(now); assert.equal(s.metadata, 2); assert.equal(s.matched, 2); assert.equal(s.orderInversions, 1); assert.equal(s.conflicts, 0);
  m.ingest({chat, rows: [row(id, stamp + 1)]});
  s = m.summary(now); assert.equal(s.conflicts, 1); assert.equal(s.parseable, 1);
  m.observe('different-chat-001', [id], now); assert.equal(m.summary(now).metadata, 0);
  m.reset(); assert.equal(m.summary(now).canonical, 0);
});

test('controlled deltas require post-arm sending response and new canonical identity; history and edits excluded', () => {
  const m = new Model(); m.observe(chat, [id], now); m.arm();
  m.ingest({chat, rows: [row()], controlled: true});
  m.observe(chat, [id, 'synthetic-user-002'], now);
  m.ingest({chat, rows: [row('synthetic-user-002')], controlled: false});
  assert.deepEqual(m.summary(now).deltas, []);
  m.ingest({chat, rows: [row('synthetic-user-002')], controlled: true});
  assert.deepEqual(m.summary(now).deltas, [2]);
  m.ingest({chat, rows: [row('synthetic-user-002', stamp - 1)], controlled: true});
  assert.deepEqual(m.summary(now).deltas, []);
});

test('safe summaries and UI cannot carry raw IDs, body, absolute times, arbitrary strings or extra fields', () => {
  const m = new Model(); m.observe(chat, [id], now); m.ingest({chat, rows: [row()]});
  const s = m.summary(now); const payload = {...s, url: 'https://chatgpt.com/c/secret', title: 'SECRET', rows: [row()], time: stamp};
  assert.deepEqual(sanitize(payload), s);
  const output = format(payload);
  for (const secret of [chat, id, 'SECRET', String(stamp), 'https://']) assert.equal(output.includes(secret), false);
  assert.equal(sanitize({...s, earliestAge: 'SECRET'}), null);
  assert.equal(sanitize({...s, matched: '1'}), null);
  assert.equal(sanitize({...s, deltas: [stamp]}), null);
  assert.equal(sanitize({...s, deltas: Array(21).fill(1)}), null);
});

test('background relay only retains safe counts, expires sessions and requires a single live page', () => {
  const d = new ResponseDiagnostics(); const m = new Model(); m.observe(chat, [id], now);
  const sender = {tab: {id: 1}, documentId: 'doc-a'};
  const req = {session: 'session-a', summary: {...m.summary(now), raw: envelope()}};
  d.poll(req, sender, true, 0); assert.equal(d.view(true, true, 1).pages, 1);
  assert.equal(d.poll(req, sender, true, 2).arm, true);
  assert.equal(JSON.stringify([...d.pages.values()]).includes(id), false);
  d.poll(req, {tab: {id: 2}, documentId: 'doc-b'}, true, 3);
  assert.equal(d.view(true, true, 4).summary, null);
  assert.equal(d.view(true, false, 4000).pages, 0);
  d.poll(req, sender, true, 5000); assert.equal(d.view(false, false, 5001).pages, 0);
});

const schema = await readFile(new URL('../adapter/response-parser.js', import.meta.url), 'utf8');
const observer = await readFile(new URL('../content/response-observer.js', import.meta.url), 'utf8');
function observerFixture() {
  const listeners = new Map(); const sent = []; const calls = []; let result;
  const window = {addEventListener(k, f) {listeners.set(k, f);}, postMessage(v) {sent.push(v);}, fetch(...args) {calls.push({self: this, args}); return result;}};
  const context = vm.createContext({window, location: {pathname: `/c/${chat}`}, Response, URL, TextDecoder, setTimeout, clearTimeout});
  vm.runInContext(schema, context); vm.runInContext(observer, context);
  const control = (active = true, arm = 0) => listeners.get('message')({source: window, origin: 'https://chatgpt.com', data: {channel: 'archive-response-control-v1', active, chat, epoch: 1, session: 'test-session', arm}});
  return {window, get sent() {return sent.filter(value => !value.observedFetchResponse);}, observations: sent, calls, context, control, setResult(p) {result = p;}};
}
function response(body, path = `/backend-api/conversation/${chat}`, type = 'application/json') {
  const r = new Response(body, {headers: {'content-type': type}});
  Object.defineProperty(r, 'url', {value: `https://chatgpt.com${path}`}); return r;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

test('MAIN calls original exactly once, preserves this/arguments/Promise/Response and never reads request body/headers', async () => {
  const f = observerFixture(); f.control();
  const body = JSON.stringify({conversation_id: chat, mapping: {one: {message: envelope().message}}});
  const r = response(body); const promise = Promise.resolve(r); f.setResult(promise);
  const options = {get body() {throw Error('request body read');}, get headers() {throw Error('credentials read');}};
  const receiver = {};
  const result = f.window.fetch.call(receiver, 'SYNTHETIC_INPUT', options);
  assert.equal(result, promise); assert.equal(await result, r);
  assert.equal(await r.text(), body); await settle();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].self, receiver); assert.equal(f.calls[0].args[1], options);
  assert.equal(f.sent.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0].rows)), [row()]);
  assert.equal(JSON.stringify(f.sent).includes('SECRET_BODY'), false);
});

test('MAIN gate, endpoint, schema, rejection and stale-route behavior fail closed without changing original response', async () => {
  for (const mode of ['disabled', 'path', 'schema', 'stale', 'rejected']) {
    const f = observerFixture(); if (mode !== 'disabled') f.control();
    let promise;
    if (mode === 'rejected') promise = Promise.reject(new Error('synthetic rejection'));
    else promise = Promise.resolve(response(mode === 'schema' ? '{}' : JSON.stringify(envelope()), mode === 'path' ? '/backend-api/models' : '/backend-api/conversation'));
    f.setResult(promise);
    if (mode === 'stale') f.context.location.pathname = '/c/another-chat-001';
    assert.equal(f.window.fetch('input'), promise);
    await promise.catch(() => {}); await settle();
    assert.equal(f.sent.some(x => x.rows), false);
    if (mode === 'schema') assert.equal(f.sent[0].error, 'SCHEMA');
  }
});

test('MAIN full-message SSE is bounded and controlled; unknown delta envelopes reject the whole sample', async () => {
  for (const unknown of [false, true]) {
    const f = observerFixture(); f.control(true, 1);
    const body = `data: ${JSON.stringify(envelope())}\n\ndata: ${unknown ? '{"delta":"synthetic"}' : '[DONE]'}\n\n`;
    f.setResult(Promise.resolve(response(body, '/backend-api/f/conversation', 'text/event-stream')));
    await f.window.fetch('input'); await settle();
    assert.equal(f.sent.length, 1);
    if (unknown) assert.equal(f.sent[0].error, 'SCHEMA');
    else { assert.equal(f.sent[0].controlled, true); assert.equal(f.sent[0].rows.length, 1); }
  }
});

test('MAIN declared/actual size and concurrency limits discard diagnostics without consuming original bodies', async () => {
  const large = observerFixture(); large.control();
  const r = response('x'.repeat(2097153)); large.setResult(Promise.resolve(r));
  await large.window.fetch('input'); await settle();
  assert.equal(large.sent[0].error, 'LIMIT'); assert.equal(r.bodyUsed, false);
  const declared = observerFixture(); declared.control();
  const r2 = response('{}'); r2.headers.set('content-length', '9999999'); declared.setResult(Promise.resolve(r2));
  await declared.window.fetch('input'); await settle(); assert.equal(declared.sent[0].error, 'LIMIT'); assert.equal(r2.bodyUsed, false);
  const concurrent = observerFixture(); concurrent.control();
  const pending = [];
  for (let i = 0; i < 3; i++) {
    let controller;
    const stream = new ReadableStream({start(c) {controller = c;}});
    const item = response(stream); pending.push(controller); concurrent.setResult(Promise.resolve(item));
    await concurrent.window.fetch('input');
  }
  await settle(); assert.equal(concurrent.sent.filter(x => x.error === 'LIMIT').length, 1);
  concurrent.control(false); for (const c of pending) c.close();
  await settle(); assert.equal(concurrent.sent.some(x => x.rows), false);
});

test('memory bounds, bad roles and stale controls do not create matches or unbounded reports', () => {
  const m = new Model(); m.observe(chat, [id], now);
  assert.equal(m.ingest({chat, rows: [{...row(), role: 'assistant'}]}), false);
  assert.equal(m.ingest({chat, rows: Array(2001).fill(row())}), false);
  m.observe(chat, Array.from({length: 2001}, (_, n) => `synthetic-id-${n}`), now);
  assert.equal(m.summary(now).truncated, true); assert.equal(m.summary(now).canonical, 2000);
  const d = new ResponseDiagnostics();
  const sender = {tab: {id: 1}, documentId: 'old-doc'};
  const request = {session: 'old-session', summary: m.summary(now)};
  d.poll(request, sender, true, 0); d.view(true, true, 1);
  assert.equal(d.poll({...request, session: 'new-session'}, {...sender, documentId: 'new-doc'}, true, 2).arm, false);
  assert.equal(d.poll(request, sender, false, 3).arm, false);
});

test('rejection stages distinguish transport, clone, JSON and schema without admitting unknown formats', async () => {
  const snapshot = value => ({conversation_id: chat, mapping: {one: {message: value}}});
  const scenarios = [
    {name: 'RSC send', path: '/backend-api/f/conversation', type: 'text/x-component', body: 'SYNTHETIC_PAGE_TEXT', reason: 'CONTENT_TYPE_NOT_ALLOWED', stage: 'content_type', json: false, cloned: false},
    {name: 'bad JSON load', body: '{', reason: 'JSON_PARSE_FAILED', stage: 'json', json: false, cloned: true},
    {name: 'root array', body: '[]', reason: 'ROOT_NOT_OBJECT', stage: 'root_schema', json: true, cloned: true},
    {name: 'unknown nested structure', body: JSON.stringify({data: snapshot(envelope().message)}), reason: 'ROOT_SCHEMA_UNKNOWN', stage: 'root_schema', json: true, cloned: true},
    {name: 'identity absent', body: JSON.stringify({mapping: {one: {message: envelope().message}}}), reason: 'CONVERSATION_ID_MISSING', stage: 'conversation_identity', json: true, cloned: true, users: 1},
    {name: 'identity different', body: JSON.stringify({...snapshot(envelope().message), conversation_id: 'another-chat-001'}), reason: 'CONVERSATION_ID_MISMATCH', stage: 'conversation_identity', json: true, cloned: true},
    {name: 'mapping absent', body: JSON.stringify({conversation_id: chat}), reason: 'ROOT_SCHEMA_UNKNOWN', stage: 'root_schema', json: true, cloned: true},
    {name: 'ID malformed', body: JSON.stringify(snapshot(envelope('user', 'short').message)), reason: 'USER_MESSAGE_ID_INVALID', stage: 'user_id', json: true, cloned: true, users: 1},
    {name: 'time string', body: JSON.stringify(snapshot(envelope('user', id, 'SYNTHETIC_NOT_TIME').message)), reason: 'CREATE_TIME_TYPE_INVALID', stage: 'create_time', json: true, cloned: true, users: 1}
  ];
  for (const scenario of scenarios) {
    const f = observerFixture(); f.control();
    const r = response(scenario.body, scenario.path || `/backend-api/conversation/${chat}`, scenario.type || 'application/json');
    f.setResult(Promise.resolve(r)); assert.equal(await f.window.fetch('input'), r); await settle();
    assert.equal(f.sent.length, 1, scenario.name);
    const {trace} = f.sent[0];
    assert.equal(trace.reason, scenario.reason, scenario.name); assert.equal(trace.stage, scenario.stage);
    assert.equal(trace.jsonParseSucceeded, scenario.json); assert.equal(trace.cloneSucceeded, scenario.cloned);
    if (scenario.users) assert.equal(trace.userRoleEntryCount, scenario.users);
    assert.equal(f.sent[0].rows, undefined, 'diagnostic probe cannot admit a rejected response');
    assert.equal(f.observations.filter(v => v.observedFetchResponse).length, 1);
    const safe = globalThis.ResponseTimeProtocol.sanitizeTrace(trace); assert.ok(safe);
    for (const forbidden of [chat, id, 'SYNTHETIC', String(stamp), 'https://']) assert.equal(JSON.stringify(safe).includes(forbidden), false);
    assert.equal(await r.text(), scenario.body);
  }
});

test('clone/HTTP/endpoint diagnostics only report fixed classifications and preserve early rejection', async () => {
  for (const mode of ['used', 'http', 'origin', 'endpoint']) {
    const f = observerFixture(); f.control();
    const r = response('{}', mode === 'endpoint' ? '/backend-api/models' : `/backend-api/conversation/${chat}`);
    if (mode === 'used') await r.text();
    if (mode === 'http') Object.defineProperty(r, 'ok', {value: false});
    if (mode === 'origin') {
      const foreign = new Response('{}'); Object.defineProperty(foreign, 'url', {value: 'https://example.invalid/backend-api/conversation/synthetic-chat-001'}); f.setResult(Promise.resolve(foreign));
    } else f.setResult(Promise.resolve(r));
    await f.window.fetch('input'); await settle();
    const trace = f.sent[0].trace;
    assert.equal(trace.reason, {used: 'CLONE_FAILED', http: 'HTTP_STATUS_NOT_ALLOWED', origin: 'ORIGIN_NOT_ALLOWED', endpoint: 'ENDPOINT_NOT_ALLOWED'}[mode]);
    assert.equal(trace.cloneAttempted, mode === 'used'); assert.equal(trace.cloneSucceeded, false);
    assert.equal(trace.jsonParseAttempted, false);
  }
});

test('diagnostic probing inspects only bounded known metadata paths, never assistant content or unknown subtrees', () => {
  const {diagnose} = globalThis.ChatGPTResponseParser;
  const message = envelope('assistant').message;
  Object.defineProperty(message, 'content', {get() {throw Error('body accessed');}});
  Object.defineProperty(message, 'id', {get() {throw Error('assistant identity accessed');}});
  const value = {conversation_id: chat, mapping: {one: {message}, two: {message: envelope().message}}};
  Object.defineProperty(value, 'unknown', {get() {throw Error('unknown subtree accessed');}});
  const d = diagnose(value, 'snapshot', chat, now);
  assert.equal(d.messageEntryCount, 2); assert.equal(d.userRoleEntryCount, 1);
  assert.equal(d.userWithMessageIDCount, 1); assert.equal(d.userWithCreateTimeCount, 1); assert.equal(d.createTimeParseableCount, 1);
  const entries = Object.fromEntries(Array.from({length: 2001}, (_, n) => [n, {message: envelope().message}]));
  const limited = diagnose({conversation_id: chat, mapping: entries}, 'snapshot', chat, now);
  assert.equal(limited.mappingEntryCount, 2001); assert.equal(limited.inspectedEntryCount, 2000); assert.equal(limited.entriesTruncated, true);
  assert.throws(() => parse({conversation_id: chat, mapping: entries}, 'snapshot', chat));
});

test('separate scenario summaries survive subsequent send failures and sanitize arbitrary fields at all projections', async () => {
  const {formatRejections} = await import('../ui/response-time.js');
  const m = new Model(); m.observe(chat, [id], now);
  for (const sending of [false, true]) {
    const f = observerFixture(); f.control();
    f.setResult(Promise.resolve(response(sending ? 'SYNTHETIC_RSC' : JSON.stringify({conversation_id: chat, mapping: {one: {message: envelope().message}}}), sending ? '/backend-api/conversation' : `/backend-api/conversation/${chat}`, sending ? 'text/x-component' : 'application/json')));
    await f.window.fetch('input'); await settle();
    m.recordObservation(); m.recordTrace({...f.sent[0].trace, unsafe: envelope()});
  }
  const summary = m.summary(now);
  assert.equal(summary.rejectionDiagnostics.observedFetchResponseCount, 2);
  assert.equal(summary.rejectionDiagnostics.byEndpoint.conversation_load_candidate.last.reason, 'ACCEPTED');
  assert.equal(summary.rejectionDiagnostics.byEndpoint.message_send_or_stream_candidate.last.reason, 'CONTENT_TYPE_NOT_ALLOWED');
  const safeText = formatRejections(summary);
  assert.ok(safeText.includes('CONTENT_TYPE_NOT_ALLOWED')); assert.ok(safeText.includes('B. 打开已有旧聊天'));
  for (const secret of [id, chat, 'SYNTHETIC_RSC', String(stamp), 'https://']) assert.equal(safeText.includes(secret), false);
  const poisoned = structuredClone(summary); poisoned.rejectionDiagnostics.byEndpoint.other.last = {...summary.rejectionDiagnostics.byEndpoint.conversation_load_candidate.last, reason: 'SECRET'};
  assert.equal(sanitize(poisoned), null);
  const relay = new ResponseDiagnostics(); relay.poll({session: 'safe', summary}, {tab: {id: 1}, documentId: 'doc'}, true, now);
  assert.deepEqual(relay.view(true, false, now).summary.rejectionDiagnostics, summary.rejectionDiagnostics);
  m.reset(); assert.equal(m.summary(now).rejectionDiagnostics.observedFetchResponseCount, 0);
});
