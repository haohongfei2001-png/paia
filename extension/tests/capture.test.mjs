import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {emptyStructure, emptyRow} from '../core/diagnostics.js';

const captureSource = await readFile(new URL('../content/capture.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../core/diagnostics-schema.js', import.meta.url), 'utf8');

async function schedulerFixture(status, options = {}) {
  const sent = [], mutationObservers = [];
  const state = {reads: 0, watching: 0, stops: 0, captures: 0, invalidations: 0, diagnostics: 0};
  const timers = [],intervals=new Map(),deadlines=new Map(),notices=new Map();let serial=0;const handlers=new Map();
  const elements = new Map(),documentHandlers=new Map();
  const document = {
    addEventListener(name,fn) {documentHandlers.set(name,fn);},
    removeEventListener(name,fn) {if(documentHandlers.get(name)===fn)documentHandlers.delete(name);},
    documentElement: {append(element) {elements.set(element.id, element);}},
    getElementById(id) {return elements.get(id) || null;},
    createElement(tag) {return {tag, style: {}, children: [], setAttribute(name, value) {this[name] = value;}, addEventListener(name, listener) {this[name] = listener;}, append(...children) {this.children.push(...children);}, remove() {elements.delete(this.id);}};}
  };
  class FakeAdapter {
    version = '0.3.0';
    watch() { state.watching += 1; }
    stopWatching() { state.stops += 1; }
    invalidate() { state.invalidations += 1; }
    isSameChat() { return !(options.navigateAfterFirst && state.captures > 0); }
    collect() {
      state.reads += 1;
      if (options.adapterThrows) throw new Error('synthetic adapter failure');
      return {code: options.code || 'CAPTURING', structure: options.structures?.[Math.min(state.reads - 1, options.structures.length - 1)], scanned: options.count || 1, chat: {id: 'chat-fixture-001', url: 'https://chatgpt.com/c/chat-fixture-001', title: '虚构'}, messages: options.noMessages ? [] : Array.from({length: options.count || 1}, (_, index) => ({sourceMessageId: `message-fixture-${index}`, pageOrder: index + 1, originalText: options.text||'虚构'}))};
    }
  }
  const context = vm.createContext({
    MutationObserver: class {constructor(callback){this.callback=callback;mutationObservers.push(this);} observe(target,options){this.target=target;this.options=options;} disconnect(){this.disconnected=true;}},
    ChatGPTAdapter: FakeAdapter, TextEncoder, document, location: {reload() {state.reloads = (state.reloads || 0) + 1;}},
    addEventListener:(key,fn)=>handlers.set(key,fn),
    ArchiveResponseTime: options.responseDiagnosticThrows ? {observe() {throw new Error('synthetic optional diagnostic failure');}} : undefined,
    chrome: {runtime: {id: options.invalidated ? undefined : 'synthetic-extension', getManifest: () => ({version: '0.8.1'}), async sendMessage(message) {
      sent.push(message);
      if(options.hangFirstStatus&&message.type==='GET_STATUS'&&!state.resolveStatus)return new Promise(resolve=>{state.resolveStatus=resolve;});
      if (options.fail) throw new Error('synthetic error that must not be logged');
      if (message.type === 'CAPTURE') {
        state.captures += 1;
        if(options.hangFirstCapture&&state.captures===1)return new Promise(()=>{});
        if (options.failedCaptureAt === state.captures) return {ok: false, error: options.error || 'PAUSED'};
      }
      if (message.type === 'DIAGNOSTIC') {
        state.diagnostics += 1;
        if(options.hangDiagnostic)return new Promise(()=>{});
        if (options.failedDiagnosticAt === state.diagnostics) return {ok: false, error: 'STORAGE_FAILED'};
      }
      return message.type === 'GET_STATUS' ? {ok: true, data: status} : {ok: true, data: {added: 1}};
    }}},
    setTimeout(callback, delay) { const id=++serial;if(delay===35000||delay===5000)deadlines.set(id,callback);else if(delay===15000)notices.set(id,callback);else timers.push({callback,delay});return id; },
    clearTimeout(id) {deadlines.delete(id);notices.delete(id);},
    setInterval(callback, delay) {const id=++serial;intervals.set(id,{callback,delay});return id;},
    clearInterval(id) {intervals.delete(id);}, Date
  });
  vm.runInContext(schemaSource, context);
  vm.runInContext(captureSource, context);
  await new Promise((resolve) => setImmediate(resolve));
  return {sent, state, timers,intervals,deadlines,notices,handlers,documentHandlers,elements,context,mutationObservers,runtime:context.chrome.runtime};
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
  assert.equal(result.sent.find((message) => message.type === 'CAPTURE').contentVersion, '0.8.1');
  assert.equal(result.timers.length, 1);
  assert.ok(result.timers[0].delay >= 1900 && result.timers[0].delay <= 2000);
});

test('stale content version stops capture with a delayed quiet fallback if recovery never arrives', async () => {
  const result = await schedulerFixture({enabled: true, consented: true, epoch: 42, adapterVersion: '0.3.0', runtimeVersion: '0.9.0'});
  assert.equal(result.state.captures, 0);
  assert.equal(result.timers.length, 0);
  assert.equal(result.elements.size,0,'normal recovery has time to replace the runtime');
  [...result.notices.values()][0]();
  const banner = result.elements.get('paia-reconnect-notice');
  assert.equal(banner.role, 'status');
  assert.match(banner.children[0].textContent, /归档连接已断开/);
  assert.equal(banner.children[1].textContent, '保存输入后刷新');
  banner.children[1].click();
  assert.equal(result.state.reloads, 1);
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


test('foundation scheduler: stalled transport releases the cycle and safely retries',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'},{hangFirstCapture:true});
 assert.equal(f.state.captures,1);assert.equal(f.deadlines.size,1);
 [...f.deadlines.values()][0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.sent.at(-1).code,'MESSAGE_RESPONSE_TIMEOUT');assert.equal(f.deadlines.size,0);
 f.timers.at(-1).callback();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.state.captures,2);assert.equal(f.deadlines.size,0);
});
test('foundation scheduler: batches are bounded by serialized UTF-8 bytes as well as count',async()=>{
 const text='中文\n🙂'.repeat(30000);
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'},{count:12,text});
 const batches=f.sent.filter(m=>m.type==='CAPTURE');assert.ok(batches.length>1);
 assert.equal(batches.flatMap(m=>m.messages).length,12);
 for(const batch of batches){assert.ok(new TextEncoder().encode(JSON.stringify(batch)).byteLength<=2097152);assert.ok(batch.messages.every(m=>m.originalText===text));}
});


test('capture reconnect: pending status cannot hide invalidation or accept a late reply',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'},{hangFirstStatus:true});
 assert.equal(f.state.reads,0);assert.equal(f.state.captures,0);
 assert.equal(f.deadlines.size,1);assert.equal(f.intervals.size,1);
 const watcher=[...f.intervals.values()][0];assert.equal(watcher.delay,2000);
 f.runtime.id=undefined;watcher.callback();
 assert.equal(f.elements.size,0);[...f.notices.values()][0]();
 const banner=f.elements.get('paia-reconnect-notice');
 assert.ok(banner);assert.equal(banner.role,'status');
 assert.match(banner.children[0].textContent,/归档连接已断开/);
 assert.equal(banner.children[1].textContent,'保存输入后刷新');
 assert.equal(f.intervals.size,0);
 f.state.resolveStatus({ok:true,data:{enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.reads,0,'late status cannot scan source after stop');
 assert.equal(f.state.captures,0);assert.equal(f.state.watching,0);
 assert.equal(f.deadlines.size,0);assert.equal(f.timers.length,0);
 assert.deepEqual(f.sent.map(message=>message.type),['GET_STATUS']);
 watcher.callback();assert.equal(f.elements.size,1,'one refresh action only');
});

test('capture reconnect: pending capture detects invalidation before its reply deadline',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'},{hangFirstCapture:true});
 assert.equal(f.state.captures,1);assert.equal(f.deadlines.size,1);
 const watcher=[...f.intervals.values()][0];f.runtime.id=undefined;watcher.callback();
 [...f.notices.values()][0]();assert.ok(f.elements.has('paia-reconnect-notice'));
 assert.equal(f.intervals.size,0);assert.equal(f.state.captures,1);
 // Teardown releases the local wait; the already-sent write can still have
 // committed, so it must not cause another capture from this retired instance.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.captures,1);assert.equal(f.deadlines.size,0);
 assert.equal(f.timers.length,0);assert.equal(f.intervals.size,0);
 assert.equal(f.elements.size,1);
});

test('capture reconnect: pagehide suspends identity checks and pageshow rechecks before capture',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'});
 assert.equal(f.intervals.size,1);f.handlers.get('pagehide')();assert.equal(f.intervals.size,0);
 f.runtime.id=undefined;f.handlers.get('pageshow')();
 await new Promise(resolve=>setImmediate(resolve));
 [...f.notices.values()][0]();assert.ok(f.elements.has('paia-reconnect-notice'));
 assert.equal(f.state.captures,1);assert.equal(f.intervals.size,0);
});


test('transient status timeout retries a fresh status without a refresh notice or content scan',async()=>{
 const status={enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'};
 const f=await schedulerFixture(status,{hangFirstStatus:true});
 assert.equal(f.state.reads,0);
 [...f.deadlines.values()][0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.reads,0);assert.equal(f.notices.size,0);assert.equal(f.elements.size,0);
 assert.deepEqual(f.sent.map(x=>x.type),['GET_STATUS'],'a status failure does not queue a second blocking diagnostic');
 f.timers.at(-1).callback();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.captures,1);assert.equal(f.elements.size,0);
 f.state.resolveStatus({ok:true,data:{...status,epoch:0}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.captures,1,'late old status cannot start a second capture');
 assert.equal(f.sent.find(x=>x.type==='CAPTURE').epoch,1);
});

test('retiring an invalidated instance cancels its delayed notice',async()=>{
 const f=await schedulerFixture({}, {invalidated:true});
 assert.equal(f.notices.size,1);assert.equal(f.state.reads,0);
 f.documentHandlers.get('paia-capture-retire-v1')();
 assert.equal(f.notices.size,0);assert.equal(f.elements.size,0);
});

test('repeated capture injection retires the previous scheduler and late response',async()=>{
 const status={enabled:true,consented:true,epoch:7,adapterVersion:'0.3.0'};
 const f=await schedulerFixture(status,{hangFirstStatus:true});
 vm.runInContext(captureSource,f.context);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.captures,1);assert.equal(f.intervals.size,1);
 f.state.resolveStatus({ok:true,data:status});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.captures,1);assert.equal(f.intervals.size,1);
});


test('verified current connection removes only an obsolete legacy notice through a child-list-only watcher',async()=>{
 const f=await schedulerFixture({enabled:false,consented:true,epoch:1,adapterVersion:'0.3.0'});
 const observer=f.mutationObservers[0];assert.ok(observer);assert.deepEqual(JSON.parse(JSON.stringify(observer.options)),{childList:true});
 const legacy=f.context.document.createElement('div');legacy.id='paia-reconnect-notice';f.context.document.documentElement.append(legacy);
 observer.callback();assert.equal(f.elements.size,0);assert.equal(f.state.reads,0,'paused capture stays paused');
});
test('transport failure disconnects obsolete-notice watcher and cannot remove a genuine later notice',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'});
 const observer=f.mutationObservers[0];f.runtime.sendMessage=async()=>{throw Error('synthetic lost connection');};
 f.timers.at(-1).callback();await new Promise(resolve=>setImmediate(resolve));assert.equal(observer.disconnected,true);
 const fallback=f.context.document.createElement('div');fallback.id='paia-reconnect-notice';f.context.document.documentElement.append(fallback);
 observer.callback();assert.equal(f.elements.size,1);
});
test('a queued legacy-notice callback cannot remove anything after its capture instance is retired',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'});
 const observer=f.mutationObservers[0];f.context.PAIACaptureController.dispose();
 const next=f.context.document.createElement('div');next.id='paia-reconnect-notice';f.context.document.documentElement.append(next);
 observer.callback();assert.equal(f.elements.size,1);assert.equal(observer.disconnected,true);
});


test('audit: indefinitely pending diagnostics cannot delay capture, batching, or later status and remain single-flight',async()=>{
 const f=await schedulerFixture({enabled:true,consented:true,epoch:42,adapterVersion:'0.3.0'},{hangDiagnostic:true,count:450});
 assert.equal(f.state.captures,3);assert.equal(f.state.diagnostics,1);assert.equal(f.timers.length,1);
 for(let n=0;n<3;n++){await f.timers.shift().callback();await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(f.state.captures,12);assert.equal(f.state.diagnostics,1);assert.ok(f.sent.filter(m=>m.type==='CAPTURE').every(m=>m.epoch===42));
 f.runtime.id=undefined;[...f.intervals.values()][0].callback();const before=f.state.captures;
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.state.captures,before);assert.equal(f.state.diagnostics,1);
});
