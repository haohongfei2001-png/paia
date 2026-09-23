/* Scheduling and messages only: all page interpretation belongs to ChatGPTAdapter. */
(() => {
  'use strict';

  const adapter = new globalThis.ChatGPTAdapter();
  const POLL_MS = 2000;
  const BATCH_SIZE = 200;
  const BATCH_BYTES = 2097152-16384;
  const REQUEST_TIMEOUT_MS = 35000;
  // Keep the version observed when this document first loaded. A later extension
  // update must never silently turn an old page into an apparently healthy one.
  const contentVersion = (() => { try { return chrome.runtime.getManifest().version; } catch { return null; } })();
  const KNOWN_FAILURES = new Set([
    'STORAGE_FULL', 'STORAGE_FAILED', 'ADAPTER_LIMIT', 'MESSAGE_TOO_LARGE', 'ADAPTER_MISMATCH', 'ADAPTER_VERSION_MISMATCH',
    'MESSAGE_RESPONSE_TIMEOUT', 'CONTEXT_INVALIDATED', 'PAUSED', 'CONSENT_REQUIRED', 'STALE_CAPTURE'
  ]);
  let stopped = false;
  let suspended = false;
  let inFlight = false;
  let timer = null;
  let lastStatusAt = 0;
  let lastDiagnostic = '';
  let lastDiagnosticAt = 0;
  let transportFailures = 0;

  function showRefreshAction(reason = 'disconnected') {
    if (!globalThis.document?.documentElement) return;
    let banner = document.getElementById('paia-reconnect-notice');
    if (banner) {
      const copy = banner.querySelector?.('span') || banner.children?.[0];
      if (reason === 'updated' && copy) copy.textContent = 'PAIA 已更新，此页仍是旧连接，当前页面不会继续归档。先保存正在输入的文字，再刷新此页。';
      return;
    }
    banner = document.createElement('div');
    banner.id = 'paia-reconnect-notice';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:320px;padding:14px 16px;border-radius:12px;background:#17202b;color:white;box-shadow:0 4px 20px #0005;font:14px/1.5 system-ui,sans-serif';
    const text = document.createElement('span');
    text.textContent = reason === 'updated'
      ? 'PAIA 已更新，此页仍是旧连接，当前页面不会继续归档。先保存正在输入的文字，再刷新此页。'
      : 'PAIA 与此页面的连接已中断，当前页面不会继续归档。先保存正在输入的文字，再刷新此页。';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '刷新此 ChatGPT 页面';
    button.style.cssText = 'display:block;margin-top:10px;padding:7px 10px;border:0;border-radius:6px;background:#fff;color:#17202b;cursor:pointer';
    button.addEventListener('click', () => globalThis.location.reload());
    banner.append(text, button);
    document.documentElement.append(banner);
  }

  function clearRefreshAction() {
    globalThis.document?.getElementById('paia-reconnect-notice')?.remove();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    adapter.stopWatching();
  }

  async function send(message) {
    let deadline;
    try {
      if (!globalThis.chrome?.runtime?.id) { stop(); showRefreshAction(); return null; }
      return await Promise.race([chrome.runtime.sendMessage(message),new Promise(resolve=>{
        deadline=setTimeout(()=>resolve({ok:false,error:'MESSAGE_RESPONSE_TIMEOUT'}),REQUEST_TIMEOUT_MS);
      })]);
    } catch {
      // Never expose raw error strings, message bodies, URLs, or titles.
      if (!globalThis.chrome?.runtime?.id) { stop(); showRefreshAction(); }
      return null;
    } finally { clearTimeout(deadline); }
  }

  function* captureBatches(messages,sourceTimes) {
    let batch=[],bytes=0;
    const encoder=new TextEncoder();
    for(const original of messages){
      const sourceTime=sourceTimes.get(original.sourceMessageId);
      const message=sourceTime?{...original,sourceTime}:original;
      const size=encoder.encode(JSON.stringify(message)).byteLength+1;
      if(batch.length&&(batch.length>=BATCH_SIZE||bytes+size>BATCH_BYTES)){yield batch;batch=[];bytes=0;}
      batch.push(message);bytes+=size;
    }
    if(batch.length)yield batch;
  }

  async function diagnostic(code, scanned = 0, value = null, health = null) {
    const structure = globalThis.ArchiveDiagnostics.sanitizeStructure(value);
    const captureHealth=globalThis.ArchiveDiagnostics.sanitizeCaptureHealth(health);
    const key = JSON.stringify([code, scanned, structure, captureHealth]);
    if (key === lastDiagnostic && Date.now() - lastDiagnosticAt < 30000) return;
    lastDiagnostic = key;
    lastDiagnosticAt = Date.now();
    const result = await send({type: 'DIAGNOSTIC', code, scanned, structure, ...(captureHealth?{captureHealth}:{}), adapterVersion: adapter.version});
    if (!result?.ok) lastDiagnostic = '';
  }

  async function reportFailure(response, scanned = 0) {
    const code = typeof response?.error === 'string' && KNOWN_FAILURES.has(response.error)
      ? response.error : 'CAPTURE_FAILED';
    if (code === 'PAUSED' || code === 'CONSENT_REQUIRED') adapter.stopWatching();
    if (code === 'STALE_CAPTURE') adapter.invalidate();
    await diagnostic(code, scanned);
    if (code === 'CONTEXT_INVALIDATED') { stop(); showRefreshAction('updated'); }
  }

  function schedule() {
    if (stopped || suspended || inFlight || timer !== null) return;
    const delay = Math.max(250, POLL_MS - (Date.now() - lastStatusAt));
    timer = setTimeout(() => { timer = null; void cycle(); }, delay);
  }

  async function cycle() {
    if (stopped || suspended || inFlight) return;
    inFlight = true;
    try {
      lastStatusAt = Date.now();
      const response = await send({type: 'GET_STATUS', contentVersion});
      const status = response?.ok === true ? response.data : null;
      if (!status) {
        adapter.stopWatching();
        transportFailures += 1;
        if (response?.error === 'MESSAGE_RESPONSE_TIMEOUT' || transportFailures >= 2) showRefreshAction();
        await reportFailure(response);
        return;
      }
      transportFailures = 0;
      if (!contentVersion || status.runtimeVersion && status.runtimeVersion !== contentVersion) {
        adapter.stopWatching(); stop(); showRefreshAction('updated');
        return;
      }
      clearRefreshAction();
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
      let health=null;
      try { health=globalThis.ArchiveResponseTime?.health?.(snapshot,status)||null; } catch {}
      await diagnostic(snapshot.code, snapshot.scanned, snapshot.structure,health);
      if (!snapshot.messages?.length) {
        return;
      }
      for (const messages of captureBatches(snapshot.messages,sourceTimes)) {
        if (stopped || suspended || !adapter.isSameChat(snapshot.chat.id)) {
          adapter.invalidate();
          await diagnostic('UNSTABLE_PAGE', snapshot.scanned);
          return;
        }
        const result = await send({
          type: 'CAPTURE', epoch: status.epoch, adapterVersion: adapter.version, contentVersion,
          chat: snapshot.chat, messages
        });
        if (!result?.ok) {
          await reportFailure(result, snapshot.scanned);
          return;
        }
        // A completed capture wakes metadata reconciliation that previously found no record.
        try { globalThis.ArchiveResponseTime?.persisted?.(); } catch {}
      }
      if (['MESSAGE_TOO_LARGE','ADAPTER_MISMATCH','ADAPTER_LIMIT'].includes(snapshot.code)) {
        // CAPTURE sets the backend status to CAPTURING. Restore the skipped-message
        // warning even when this same scan already sent it before saving.
        lastDiagnostic = '';
        await diagnostic(snapshot.code, snapshot.scanned, snapshot.structure,health);
      }
    } catch {
      adapter.invalidate();
      await diagnostic('CAPTURE_FAILED');
    } finally {
      inFlight = false;
      schedule();
    }
  }

  globalThis.addEventListener?.('pagehide', () => {
    suspended=true; clearTimeout(timer); timer=null; adapter.stopWatching();
  });
  globalThis.addEventListener?.('pageshow', () => {
    if(!suspended||stopped)return;
    suspended=false; lastStatusAt=0; lastDiagnostic=''; void cycle();
  });
  void cycle();
})();
