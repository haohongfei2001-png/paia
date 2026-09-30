/* MAIN world: passive side branch only. All page-origin data remains untrusted. */
(() => {
  'use strict';
  if (globalThis.location?.origin !== 'https://chatgpt.com') return;
  const previous = globalThis.PAIAResponseObserver;
  previous?.dispose();
  // Pre-recovery bridges can finish a pending poll after their extension was
  // invalidated. Deny late v1 activation before its legacy bubble listener;
  // inactive controls still pass through and shut that old observer down.
  const blockLegacyControl = previous?.blockLegacyControl || (event => {
    if (event.source === window && event.origin === 'https://chatgpt.com' &&
        event.data?.channel === 'archive-response-control-v1' && event.data.active === true) event.stopImmediatePropagation();
  });
  if (!previous?.blockLegacyControl) window.addEventListener('message', blockLegacyControl, true);
  // Close the injection gap too: a legacy gate may already have been active
  // before this blocker was installed. Only send a revoke on its old channel.
  window.postMessage({channel: 'archive-response-control-v1', active: false}, 'https://chatgpt.com');
  // Reuse a single passthrough even if page code has since wrapped it. Replacing
  // just its observer callback avoids an ever-growing fetch-wrapper chain.
  const dispatcher = previous?.dispatcher || {original: window.fetch, begin: null};
  if (!dispatcher.wrapper) dispatcher.wrapper = function (...args) {
    let complete;
    try { complete = dispatcher.begin?.(); } catch {}
    const result = Reflect.apply(dispatcher.original, this, args);
    try { complete?.(result); } catch {}
    return result;
  };
  const protocol = globalThis.ChatGPTResponseParser;
  let disposed = false;
  let generation = 0;
  const clone = Response.prototype.clone;
  let gate = null;
  let armed = 0;
  let jobs = 0;
  let fingerprintJobs = 0;
  let everActive = false;
  let revoked = 0;
  const readers = new Set();
  const diagnosticReaders = new Set();
  const readerTimers = new Map();
  function cancelReader(reader) {
    clearTimeout(readerTimers.get(reader)); readerTimers.delete(reader);
    void reader.cancel().catch(() => {});
  }
  function readDeadline(reader, delay, expire) {
    const timer = setTimeout(() => { expire(); cancelReader(reader); }, delay);
    readerTimers.set(reader, timer);
    return timer;
  }
  const stopDiagnostics = () => { for (const reader of diagnosticReaders) cancelReader(reader); };
  const stop = () => { for (const reader of readers) cancelReader(reader); readers.clear(); };
  function onControl(event) {
    if (disposed) return;
    if (event.source !== window || event.origin !== 'https://chatgpt.com') return;
    const data = event.data;
    if (data?.channel !== 'archive-response-control-v2') return;
    if (data.active === true && protocol.ID.test(data.chat || '') && Number.isSafeInteger(data.epoch) && typeof data.session === 'string' && data.session.length <= 80) {
      const historySession = typeof data.historySession === 'string' && data.historySession.length <= 80 ? data.historySession : data.session;
      if (gate?.historySession !== historySession || gate?.chat !== data.chat || gate?.epoch !== data.epoch) { generation++; stop(); armed = 0; }
      else if (gate?.session !== data.session) { stopDiagnostics(); armed = 0; }
      gate = {generation, chat: data.chat, epoch: data.epoch, session: data.session, historySession, fingerprint: data.fingerprint === true, history: data.history === true};
      everActive = true;
      armed = Number.isSafeInteger(data.arm) ? data.arm : 0;
    } else { revoke(); }
  }
  window.addEventListener('message', onControl);
  function current(g) {
    const route = location.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([A-Za-z0-9_-]{8,128})\/?$/);
    return !disposed && gate && generation === g.generation && route?.[1] === g.chat && gate.session === g.session && gate.chat === g.chat && gate.epoch === g.epoch;
  }
  function emit(g, fields) {
    if (current(g)) window.postMessage({channel: 'archive-response-metadata-v2', chat: g.chat, epoch: g.epoch, session: g.session, ...fields}, 'https://chatgpt.com');
  }
  function currentHistory(g) {
    return g.history && gate?.history && gate.historySession === g.historySession &&
      current({...g, session: gate.session});
  }
  function emitHistory(g, history) {
    if (currentHistory(g)) window.postMessage({channel:'archive-response-metadata-v2',chat:g.chat,epoch:g.epoch,historySession:g.historySession,history}, 'https://chatgpt.com');
  }
  function emitHistoryState(g,state,acceptedRows=0,rejectedFrames=0) {
    if(currentHistory(g))window.postMessage({channel:'archive-response-metadata-v2',chat:g.chat,epoch:g.epoch,historySession:g.historySession,historyState:{state,acceptedRows,rejectedFrames}},'https://chatgpt.com');
  }
  let liveJobs=0;
  // Formal sent-message evidence has its own bounded reader, independent of a
  // diagnostic lease. Only explicit user metadata is projected; no body leaves it.
  async function liveMetadata(response,g,type) {
    let reader,timer,accepted=0,rejected=0,expired=false,events=0;
    if(!currentHistory(g))return;
    const report=state=>emitHistoryState(g,state,accepted,rejected);
    try {
      if(liveJobs>=1||Number(response.headers.get('content-length'))>2097152){report('LIMIT');return;}
      const copy=Reflect.apply(clone,response,[]);
      if(!copy.body){report('READ_FAILED');return;}
      reader=copy.body.getReader();liveJobs++;readers.add(reader);report('READING');
      timer=readDeadline(reader,15000,()=>{expired=true;});
      let bytes=0,buffer='',data=[];
      const decoder=new TextDecoder('utf-8',{fatal:true});
      const project=text=>{
        if(!text||text==='[DONE]')return;
        if(++events>2000)throw new RangeError();
        let value;try{value=JSON.parse(text);}catch{rejected++;return;}
        const history=globalThis.ChatGPTHistoryContract?.parseEvent(value,g.chat);
        if(history&&currentHistory(g)){accepted+=history.rows.length;emitHistory(g,history);report('ACCEPTED');}
        else rejected++;
      };
      const lines=final=>{
        while(true){
          const index=buffer.search(/[\r\n]/);if(index<0)return;
          if(!final&&buffer[index]==='\r'&&index===buffer.length-1)return;
          const line=buffer.slice(0,index),length=buffer[index]==='\r'&&buffer[index+1]==='\n'?2:1;
          buffer=buffer.slice(index+length);
          if(line===''){project(data.join('\n'));data=[];}
          else if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
        }
      };
      while(true){
        if(!currentHistory(g))return;
        const chunk=await reader.read();
        if(!currentHistory(g))return;
        if(expired){report('LIMIT');return;}
        if(chunk.done)break;
        bytes+=chunk.value.byteLength;if(bytes>2097152){report('LIMIT');return;}
        buffer+=decoder.decode(chunk.value,{stream:true});
        if(type==='text/event-stream')lines(false);
      }
      buffer+=decoder.decode();
      if(type==='text/event-stream')lines(true);else project(buffer);
      report(accepted?'ACCEPTED':'NO_ACCEPTED_METADATA');
    }catch(error){report(error instanceof RangeError?'LIMIT':'READ_FAILED');}
    finally{clearTimeout(timer);if(reader){readers.delete(reader);liveJobs--;cancelReader(reader);}}
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
    const failed = (state='READ_FAILED') => { if (allowed()) { emit(g, {fingerprintFailure: true}); emitHistoryState(g,state); } };
    if (!allowed()) return;
    try {
      if (fingerprintJobs >= 1 || Number(response.headers.get('content-length')) > byteLimit) { failed('LIMIT'); return; }
      const copy = Reflect.apply(clone, response, []);
      if (!copy.body) { failed(); return; }
      reader = copy.body.getReader(); fingerprintJobs++; readers.add(reader); emitHistoryState(g,'READING');
      let expired = false;
      timer = readDeadline(reader, 5000, () => { expired = true; });
      let text = ''; let bytes = 0; const decoder = new TextDecoder();
      while (true) {
        if (!allowed()) return;
        const chunk = await reader.read();
        if (!allowed()) return;
        if (expired) { failed('LIMIT'); return; }
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > byteLimit) { failed('LIMIT'); return; }
        text += decoder.decode(chunk.value, {stream: true});
      }
      text += decoder.decode();
      const value = JSON.parse(text);
      if(currentHistory(g)) {
        const contract=globalThis.ChatGPTHistoryContract;
        const history=contract?.parse(value)||contract?.parseStructural(value,g.chat);
        if(history){emitHistory(g,history);emitHistoryState(g,'ACCEPTED',history.rows.length);}
        else emitHistoryState(g,'NO_ACCEPTED_METADATA',0,1);
      }
      if(g.fingerprint && gate?.fingerprint && allowed()) {
        const result = globalThis.ChatGPTJSONFingerprint.inspect(value);
        emit(g, {fingerprint: result});
      }
    } catch { failed(); }
    finally { clearTimeout(timer); if (reader) { readers.delete(reader); fingerprintJobs--; cancelReader(reader); } }
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
    if (!current(g) && !currentHistory(g)) return;
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
      if(sending&&g.history)void liveMetadata(response,g,type);
      if (jobs >= 2) { finish('limit', 'CONCURRENCY_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
      const declared = Number(response.headers.get('content-length'));
      if (declared > 2097152) { finish('limit', 'DECLARED_SIZE_LIMIT', 'rejected', {error: 'LIMIT'}); return; }
      trace.stage = 'clone'; trace.cloneAttempted = true;
      const copy = Reflect.apply(clone, response, []); trace.cloneSucceeded = true;
      if (!copy.body) { finish('clone', 'BODY_UNAVAILABLE', 'rejected', {error: 'SCHEMA'}); return; }
      reader = copy.body.getReader(); readers.add(reader); diagnosticReaders.add(reader); jobs++;
      trace.stage = 'read';
      let expired = false;
      timer = readDeadline(reader, 15000, () => { expired = true; });
      const decoder = new TextDecoder(); let text = ''; let bytes = 0;
      while (true) {
        if (!current(g)) return;
        const chunk = await reader.read();
        if (!current(g)) return;
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
      if (reader) { readers.delete(reader); diagnosticReaders.delete(reader); jobs--; cancelReader(reader); }
    }
  }
  dispatcher.begin = () => {
    const g = gate && {...gate}; const a = armed;
    const bootstrap = !everActive, issuedRevocation = revoked;
    return result => {
      // Return the page's exact Promise; observe only its response side branch.
      try { void result.then(response => {
        // No response is retained before consent. Initial startup requests can
        // finish after first authorization, but never across a later revocation.
        if (disposed || revoked !== issuedRevocation) return;
        const eligible = g || (bootstrap && gate ? {...gate} : null);
        if (eligible && (current(eligible) || currentHistory(eligible))) void inspect(response, eligible, g ? a : 0);
      }, () => {}).catch(() => {}); } catch {}
    };
  };
  function revoke() {
    if (everActive) revoked++;
    generation++; gate = null; armed = 0; stop();
  }
  function retire() { revoked++; revoke(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    retire();
    dispatcher.begin = null;
    window.removeEventListener?.('message', onControl);
    window.removeEventListener?.('pagehide', retire);
    globalThis.document?.removeEventListener('paia-capture-retire-v1', retire);
    // Never overwrite a fetch function installed later by the page.
    if (window.fetch === dispatcher.wrapper) window.fetch = dispatcher.original;
  }
  globalThis.PAIAResponseObserver = Object.freeze({dispose, dispatcher, blockLegacyControl});
  if (window.fetch === dispatcher.original) window.fetch = dispatcher.wrapper;
  window.addEventListener('pagehide', retire);
  // This cross-world signal has no authority: it only revokes pending readers.
  globalThis.document?.addEventListener('paia-capture-retire-v1', retire);
})();
