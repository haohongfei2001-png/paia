/* MAIN world: passive side branch only. All page-origin data remains untrusted. */
(() => {
  'use strict';
  const protocol = globalThis.ChatGPTResponseParser;
  const original = window.fetch;
  const clone = Response.prototype.clone;
  let gate = null;
  let armed = 0;
  let jobs = 0;
  let fingerprintJobs = 0;
  let everActive = false;
  let revoked = 0;
  const readers = new Set();
  const diagnosticReaders = new Set();
  const stopDiagnostics = () => { for (const reader of diagnosticReaders) void reader.cancel().catch(() => {}); };
  const stop = () => { for (const reader of readers) void reader.cancel().catch(() => {}); readers.clear(); };
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== 'https://chatgpt.com') return;
    const data = event.data;
    if (data?.channel !== 'archive-response-control-v1') return;
    if (data.active === true && protocol.ID.test(data.chat || '') && Number.isSafeInteger(data.epoch) && typeof data.session === 'string' && data.session.length <= 80) {
      const historySession = typeof data.historySession === 'string' && data.historySession.length <= 80 ? data.historySession : data.session;
      if (gate?.historySession !== historySession || gate?.chat !== data.chat || gate?.epoch !== data.epoch) { stop(); armed = 0; }
      else if (gate?.session !== data.session) { stopDiagnostics(); armed = 0; }
      gate = {chat: data.chat, epoch: data.epoch, session: data.session, historySession, fingerprint: data.fingerprint === true, history: data.history === true};
      everActive = true;
      armed = Number.isSafeInteger(data.arm) ? data.arm : 0;
    } else { if (everActive) revoked++; gate = null; armed = 0; stop(); }
  });
  function current(g) {
    const route = location.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([A-Za-z0-9_-]{8,128})\/?$/);
    return gate && route?.[1] === g.chat && gate.session === g.session && gate.chat === g.chat && gate.epoch === g.epoch;
  }
  function emit(g, fields) {
    if (current(g)) window.postMessage({channel: 'archive-response-metadata-v1', chat: g.chat, epoch: g.epoch, session: g.session, ...fields}, 'https://chatgpt.com');
  }
  function currentHistory(g) {
    return g.history && gate?.history && gate.historySession === g.historySession &&
      current({...g, session: gate.session});
  }
  function emitHistory(g, history) {
    if (currentHistory(g)) window.postMessage({channel:'archive-response-metadata-v1',chat:g.chat,epoch:g.epoch,historySession:g.historySession,history}, 'https://chatgpt.com');
  }
  async function fingerprint(response, g) {
    let reader; let timer;
    // Real historical detail loads can contain large assistant turns even when
    // only a few user messages are visible. Keep the generic probe budget small;
    // the larger budget requires this exact current-conversation endpoint.
    const responseURL = new URL(response.url);
    const exactHistory = responseURL.origin === 'https://chatgpt.com' &&
      ['/backend-api/conversation/', '/backend-api/conversations/'].some(prefix => responseURL.pathname === prefix + g.chat);
    const byteLimit = exactHistory ? 2097152 : 524288;
    const allowed = () => currentHistory(g) || current(g) && g.fingerprint && gate.fingerprint;
    const failed = () => { if (allowed()) emit(g, {fingerprintFailure: true}); };
    if (!allowed()) return;
    try {
      if (fingerprintJobs >= 1 || Number(response.headers.get('content-length')) > byteLimit) { failed(); return; }
      const copy = Reflect.apply(clone, response, []);
      if (!copy.body) { failed(); return; }
      reader = copy.body.getReader(); fingerprintJobs++; readers.add(reader);
      let expired = false;
      timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 5000);
      let text = ''; let bytes = 0; const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (!allowed()) return;
        if (expired) { failed(); return; }
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > byteLimit) { failed(); return; }
        text += decoder.decode(chunk.value, {stream: true});
      }
      text += decoder.decode();
      const value = JSON.parse(text);
      if(currentHistory(g)) {
        const contract=globalThis.ChatGPTHistoryContract;
        const history=contract?.parse(value)||contract?.parseStructural(value,g.chat);
        if(history)emitHistory(g,history);
      }
      if(g.fingerprint && gate?.fingerprint && allowed()) {
        const result = globalThis.ChatGPTJSONFingerprint.inspect(value);
        emit(g, {fingerprint: result});
      }
    } catch { failed(); }
    finally { clearTimeout(timer); if (reader) { readers.delete(reader); fingerprintJobs--; void reader.cancel().catch(() => {}); } }
  }
  function blankTrace() {
    return {endpointClass: 'other', contentTypeClass: 'other', stage: 'observed', reason: 'UNEXPECTED_FAILURE', outcome: 'rejected',
      originChecked: false, originAllowed: false, endpointChecked: false, urlShapeAllowed: false, redirectAllowed: false,
      httpStatusChecked: false, httpStatusAllowed: false, contentTypeChecked: false,
      cloneAttempted: false, cloneSucceeded: false, jsonParseAttempted: false, jsonParseSucceeded: false,
      jsonValueCount: 0, rootSchemaChecked: false, rootSchemaRecognized: false,
      conversationIdentityChecked: false, conversationIdentityFound: false, conversationIdentityMatches: false,
      messageCollectionChecked: false, messageCollectionFound: false, mappingEntryCount: 0, messageEntryCount: 0,
      inspectedEntryCount: 0, userRoleEntryCount: 0, userWithMessageIDCount: 0, userWithValidMessageIDCount: 0,
      userWithCreateTimeCount: 0, createTimeParseableCount: 0, entriesTruncated: false};
  }
  async function inspect(response, g, armAtStart) {
    let reader; let timer;
    const trace = blankTrace();
    const finish = (stage, reason, outcome = 'rejected', fields = {}) => {
      trace.stage = stage; trace.reason = reason; trace.outcome = outcome;
      emit(g, {...fields, trace});
    };
    emit(g, {observedFetchResponse: true});
    try {
      const url = new URL(response.url);
      trace.originChecked = true; trace.originAllowed = url.origin === 'https://chatgpt.com';
      trace.endpointChecked = true;
      const snapshot = url.pathname.match(/^\/backend-api\/conversation\/([A-Za-z0-9_-]{8,128})$/);
      const sending = ['/backend-api/conversation', '/backend-api/f/conversation'].includes(url.pathname);
      trace.endpointClass = snapshot ? 'conversation_load_candidate' : sending ? 'message_send_or_stream_candidate' : 'other';
      trace.urlShapeAllowed = !url.search && !url.hash; trace.redirectAllowed = !response.redirected;
      trace.httpStatusChecked = true; trace.httpStatusAllowed = response.ok;
      // Only classify this response header, never retain its raw value or read request headers.
      const type = response.headers.get('content-type')?.split(';')[0].trim();
      trace.contentTypeChecked = true;
      trace.contentTypeClass = type === 'application/json' ? 'json' : type === 'text/event-stream' ? 'event_stream' : type?.startsWith('text/') ? 'text' : 'other';
      // Start both clones synchronously, before the page can consume its original.
      // The two bounded readers settle independently; neither delays the original fetch.
      const jsonType = type?.toLowerCase() === 'application/json' || /^application\/[a-z0-9!#$&^_.+-]+\+json$/i.test(type || '');
      const sensitivePath = /(?:^|\/)(?:auth|oauth|oauth2|token|tokens|session|sessions|credentials|login|logout)(?:\/|$)/i.test(url.pathname);
      if (!sensitivePath && (trace.endpointClass === 'other' || g.history && snapshot?.[1] === g.chat) && trace.originAllowed && trace.httpStatusAllowed && trace.redirectAllowed && jsonType) void fingerprint(response, g);
      if (!current(g)) return;
      if (!trace.originAllowed) { finish('origin', 'ORIGIN_NOT_ALLOWED', 'skipped'); return; }
      if (!trace.urlShapeAllowed) { finish('endpoint', 'URL_SHAPE_NOT_ALLOWED', 'skipped'); return; }
      if (!trace.httpStatusAllowed) { finish('http_status', 'HTTP_STATUS_NOT_ALLOWED', 'skipped'); return; }
      if (!trace.redirectAllowed) { finish('endpoint', 'REDIRECT_NOT_ALLOWED', 'skipped'); return; }
      if (!snapshot && !sending) { finish('endpoint', 'ENDPOINT_NOT_ALLOWED', 'skipped'); return; }
      if (snapshot && snapshot[1] !== g.chat) { finish('endpoint', 'ENDPOINT_CHAT_MISMATCH', 'skipped'); return; }
      if (!['application/json', 'text/event-stream'].includes(type) || (snapshot && type !== 'application/json')) { finish('content_type', 'CONTENT_TYPE_NOT_ALLOWED', 'rejected', {error: 'SCHEMA'}); return; }
      if (jobs >= 2) { finish('limit', 'CONCURRENCY_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
      const declared = Number(response.headers.get('content-length'));
      if (declared > 2097152) { finish('limit', 'DECLARED_SIZE_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
      trace.stage = 'clone'; trace.cloneAttempted = true;
      const copy = Reflect.apply(clone, response, []); trace.cloneSucceeded = true;
      if (!copy.body) { finish('clone', 'BODY_UNAVAILABLE', 'rejected', {error: 'SCHEMA'}); return; }
      reader = copy.body.getReader(); readers.add(reader); diagnosticReaders.add(reader); jobs++;
      trace.stage = 'read';
      let expired = false;
      timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 15000);
      const decoder = new TextDecoder(); let text = ''; let bytes = 0;
      while (true) {
        if (!current(g)) return;
        const chunk = await reader.read();
        if (expired) { finish('limit', 'READ_TIMEOUT', 'rejected', {error: 'LIMIT'}); return; }
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2097152) { finish('limit', 'BODY_SIZE_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
        text += decoder.decode(chunk.value, {stream: true});
      }
      text += decoder.decode();
      if (!current(g)) return;
      const batches = [];
      function parseValue(textValue, kind) {
        trace.stage = 'json'; trace.jsonParseAttempted = true; trace.jsonParseSucceeded = false;
        const value = JSON.parse(textValue);
        trace.jsonParseSucceeded = true; trace.jsonValueCount++;
        // Probe only existing field paths. Its output cannot admit any response.
        const detail = protocol.diagnose(value, kind, g.chat);
        for (const key of ['mappingEntryCount', 'messageEntryCount', 'inspectedEntryCount', 'userRoleEntryCount', 'userWithMessageIDCount', 'userWithValidMessageIDCount', 'userWithCreateTimeCount', 'createTimeParseableCount']) trace[key] = Math.min(1000000, trace[key] + detail[key]);
        for (const key of ['rootSchemaChecked', 'rootSchemaRecognized', 'conversationIdentityChecked', 'conversationIdentityFound', 'conversationIdentityMatches', 'messageCollectionChecked', 'messageCollectionFound']) trace[key] = detail[key];
        trace.entriesTruncated ||= detail.entriesTruncated;
        trace.stage = detail.stage; trace.reason = detail.reason;
        // Original v0.1.3 parser is the sole acceptance decision.
        return protocol.parse(value, kind, g.chat);
      }
      if (type === 'application/json') batches.push(parseValue(text, snapshot ? 'snapshot' : 'event'));
      else {
        const events = text.replace(/\r\n/g, '\n').split('\n\n');
        if (events.length > 2000) { finish('collection', 'SSE_EVENT_LIMIT', 'rejected', {error: 'SCHEMA'}); return; }
        for (const event of events) {
          const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data || data === '[DONE]') continue;
          batches.push(parseValue(data, 'event'));
        }
      }
      const rows = batches.flatMap(batch => batch.rows);
      if (rows.length > protocol.LIMIT) { finish('limit', 'USER_METADATA_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
      finish('accepted', 'ACCEPTED', 'accepted', {rows, controlled: sending && armAtStart > 0 && armed === armAtStart});
    } catch {
      const reason = trace.stage === 'clone' ? 'CLONE_FAILED' : trace.stage === 'read' ? 'BODY_READ_FAILED' : trace.stage === 'json' ? 'JSON_PARSE_FAILED' : trace.reason === 'ACCEPTED' ? 'SCHEMA_REJECTED' : trace.reason;
      finish(trace.stage, reason, 'rejected', {error: 'SCHEMA'});
    } finally {
      clearTimeout(timer);
      if (reader) { readers.delete(reader); diagnosticReaders.delete(reader); jobs--; void reader.cancel().catch(() => {}); }
    }
  }
  window.fetch = function (...args) {
    const g = gate && {...gate}; const a = armed;
    const bootstrap = !everActive, issuedRevocation = revoked;
    const result = Reflect.apply(original, this, args);
    // Returning this exact Promise preserves the page's fulfillment/rejection.
    try { void result.then(response => {
      // No response is retained before consent. A startup request may finish only
      // after the first status reply; validate authorization at response arrival.
      const eligible = g || (bootstrap && revoked === issuedRevocation && gate ? {...gate} : null);
      if (eligible && (current(eligible) || currentHistory(eligible))) void inspect(response, eligible, g ? a : 0);
    }, () => {}).catch(() => {}); } catch {}
    return result;
  };
  window.addEventListener('pagehide', () => { gate = null; armed = 0; stop(); });
})();
