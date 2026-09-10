/* Scheduling and messages only: all page interpretation belongs to ChatGPTAdapter. */
(() => {
  'use strict';

  const adapter = new globalThis.ChatGPTAdapter();
  const POLL_MS = 2000;
  const BATCH_SIZE = 200;
  const KNOWN_FAILURES = new Set([
    'STORAGE_FULL', 'STORAGE_FAILED', 'MESSAGE_TOO_LARGE', 'ADAPTER_MISMATCH', 'ADAPTER_VERSION_MISMATCH',
    'CONTEXT_INVALIDATED', 'PAUSED', 'CONSENT_REQUIRED', 'STALE_CAPTURE'
  ]);
  let stopped = false;
  let inFlight = false;
  let timer = null;
  let lastStatusAt = 0;
  let lastDiagnostic = '';
  let lastDiagnosticAt = 0;

  function stop() {
    stopped = true;
    clearTimeout(timer);
    adapter.stopWatching();
  }

  async function send(message) {
    try {
      if (!globalThis.chrome?.runtime?.id) { stop(); return null; }
      return await chrome.runtime.sendMessage(message);
    } catch {
      // Never expose raw error strings, message bodies, URLs, or titles.
      if (!globalThis.chrome?.runtime?.id) stop();
      return null;
    }
  }

  async function diagnostic(code, scanned = 0, value = null) {
    const structure = globalThis.ArchiveDiagnostics.sanitizeStructure(value);
    const key = JSON.stringify([code, scanned, structure]);
    if (key === lastDiagnostic && Date.now() - lastDiagnosticAt < 30000) return;
    lastDiagnostic = key;
    lastDiagnosticAt = Date.now();
    const result = await send({type: 'DIAGNOSTIC', code, scanned, structure, adapterVersion: adapter.version});
    if (!result?.ok) lastDiagnostic = '';
  }

  async function reportFailure(response, scanned = 0) {
    const code = typeof response?.error === 'string' && KNOWN_FAILURES.has(response.error)
      ? response.error : 'CAPTURE_FAILED';
    if (code === 'PAUSED' || code === 'CONSENT_REQUIRED') adapter.stopWatching();
    if (code === 'STALE_CAPTURE') adapter.invalidate();
    await diagnostic(code, scanned);
    if (code === 'CONTEXT_INVALIDATED') stop();
  }

  function schedule() {
    if (stopped || inFlight || timer !== null) return;
    const delay = Math.max(250, POLL_MS - (Date.now() - lastStatusAt));
    timer = setTimeout(() => { timer = null; void cycle(); }, delay);
  }

  async function cycle() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      lastStatusAt = Date.now();
      const response = await send({type: 'GET_STATUS'});
      const status = response?.ok === true ? response.data : null;
      if (!status) {
        adapter.stopWatching();
        await reportFailure(response);
        return;
      }
      if (status.consented !== true || status.enabled !== true) {
        adapter.stopWatching();
        await diagnostic(status.consented === true ? 'PAUSED' : 'CONSENT_REQUIRED');
        return;
      }
      if (status.adapterVersion !== adapter.version) {
        adapter.stopWatching();
        await diagnostic('ADAPTER_VERSION_MISMATCH');
        return;
      }
      adapter.watch(schedule);
      const snapshot = adapter.collect();
      // Optional diagnostic side channel must never affect canonical capture.
      try { globalThis.ArchiveResponseTime?.observe(snapshot, status); } catch {}
      let sourceTimes = new Map();
      try { sourceTimes = globalThis.ArchiveResponseTime?.evidence(snapshot,status) || sourceTimes; } catch {}
      await diagnostic(snapshot.code, snapshot.scanned, snapshot.structure);
      if (!snapshot.messages?.length) {
        return;
      }
      for (let start = 0; start < snapshot.messages.length; start += BATCH_SIZE) {
        if (stopped || !adapter.isSameChat(snapshot.chat.id)) {
          adapter.invalidate();
          await diagnostic('UNSTABLE_PAGE', snapshot.scanned);
          return;
        }
        const result = await send({
          type: 'CAPTURE', epoch: status.epoch, adapterVersion: adapter.version,
          chat: snapshot.chat, messages: snapshot.messages.slice(start, start + BATCH_SIZE).map(message => {
            const sourceTime=sourceTimes.get(message.sourceMessageId);
            return sourceTime ? {...message,sourceTime} : message;
          })
        });
        if (!result?.ok) {
          await reportFailure(result, snapshot.scanned);
          return;
        }
      }
      if (snapshot.code === 'MESSAGE_TOO_LARGE') {
        // CAPTURE sets the backend status to CAPTURING. Restore the skipped-message
        // warning even when this same scan already sent it before saving.
        lastDiagnostic = '';
        await diagnostic(snapshot.code, snapshot.scanned, snapshot.structure);
      }
    } catch {
      adapter.invalidate();
      await diagnostic('CAPTURE_FAILED');
    } finally {
      inFlight = false;
      schedule();
    }
  }

  void cycle();
})();
