/* Scheduling and messages only: all page interpretation belongs to ChatGPTAdapter. */
(() => {
  'use strict';

  const lifecycle = globalThis.PAIACaptureLifecycle;
  if (lifecycle && !lifecycle.active) return;
  globalThis.PAIACaptureController?.dispose();
  const adapter = new globalThis.ChatGPTAdapter();
  const POLL_MS = 2000;
  const BATCH_SIZE = 200;
  const BATCH_BYTES = 2097152-16384;
  const REQUEST_TIMEOUT_MS = 35000;
  const STATUS_TIMEOUT_MS = 5000;
  const RECOVERY_NOTICE_MS = 15000;
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
  let connectionTimer = null;
  let lastStatusAt = 0;
  let lastDiagnostic = '';
  let lastDiagnosticAt = 0;
  let generation = 0;
  const pendingReplies = new Set();

  let noticeTimer = null;
  let retireNotice = null;
  let noticeObserver = null;
  function showRefreshAction() {
    if (noticeTimer !== null || !globalThis.document?.documentElement) return;
    // Give the worker's replacement time to arrive. This is a quiet fallback
    // only for a document that still has no working capture runtime.
    retireNotice = () => {
      clearTimeout(noticeTimer); noticeTimer = null;
      clearRefreshAction();
      document.removeEventListener?.('paia-capture-retire-v1', retireNotice);
    };
    document.addEventListener?.('paia-capture-retire-v1', retireNotice, {once: true});
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      if (document.getElementById('paia-reconnect-notice')) return;
      const banner = document.createElement('div');
      banner.id = 'paia-reconnect-notice';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;z-index:2147483647;right:12px;bottom:12px;max-width:240px;padding:6px 10px;border-radius:6px;background:#f4f3ee;color:#484840;border:1px solid #d6d4cc;font:12px/1.4 system-ui,sans-serif';
      const text = document.createElement('span');
      text.textContent = 'PAIA 此页归档连接已断开';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '保存输入后刷新';
      button.style.cssText = 'margin-left:8px;border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit';
      button.addEventListener('click', () => globalThis.location.reload());
      banner.append(text, button);
      document.documentElement.append(banner);
    }, RECOVERY_NOTICE_MS);
  }

  function clearRefreshAction() {
    globalThis.document?.getElementById('paia-reconnect-notice')?.remove();
  }

  function stopNoticeWatching() { noticeObserver?.disconnect(); noticeObserver = null; }
  function watchObsoleteNotice() {
    if (noticeObserver || !globalThis.MutationObserver || !document.documentElement) return;
    const observer = new MutationObserver(() => {
      if (noticeObserver !== observer || stopped || suspended || globalThis.PAIACaptureController !== controller ||
          lifecycle && (!lifecycle.active || !lifecycle.ready || globalThis.PAIACaptureLifecycle !== lifecycle)) return;
      // The pre-recovery capture script may report its dead context after this
      // replacement has verified a live one. Retire only that obsolete notice.
      clearRefreshAction();
    });
    noticeObserver = observer;
    observer.observe(document.documentElement, {childList: true});
  }

  function stop() {
    stopped = true; generation++;
    stopNoticeWatching();
    for (const cancel of pendingReplies) cancel();
    pendingReplies.clear();
    clearTimeout(noticeTimer); noticeTimer = null;
    document.removeEventListener?.('paia-capture-retire-v1', retireNotice);
    clearTimeout(timer);
    clearInterval(connectionTimer); connectionTimer = null;
    adapter.stopWatching();
    globalThis.removeEventListener?.('pagehide', onPageHide);
    globalThis.removeEventListener?.('pageshow', onPageShow);
  }

  function disconnected() {
    stop();
    lifecycle?.dispose();
    showRefreshAction();
  }

  const controller = {dispose: stop};
  globalThis.PAIACaptureController = controller;
  lifecycle?.add(stop);

  // A pending transport reply must not prevent the old document from
  // discovering extension invalidation. This checks connection identity only:
  // no status request, source scan, capture or restart is issued here.
  function watchConnection() {
    if (stopped || suspended || connectionTimer !== null) return;
    const check = () => {
      if (stopped || suspended) return;
      if (!globalThis.chrome?.runtime?.id) { disconnected(); }
    };
    check();
    if (!stopped) connectionTimer = setInterval(check, POLL_MS);
  }

  async function send(message) {
    if (stopped || suspended) return null;
    let deadline, cancel;
    const sendGeneration = generation;
    try {
      if (!globalThis.chrome?.runtime?.id) { disconnected(); return null; }
      return await Promise.race([chrome.runtime.sendMessage(message),new Promise(resolve=>{cancel=()=>resolve(null);pendingReplies.add(cancel);}),new Promise(resolve=>{
        deadline=setTimeout(()=>resolve({ok:false,error:'MESSAGE_RESPONSE_TIMEOUT'}),message.type === 'GET_STATUS' ? STATUS_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
      })]);
    } catch {
      if (stopped || suspended || generation !== sendGeneration) return null;
      // Never expose raw error strings, message bodies, URLs, or titles.
      if (!globalThis.chrome?.runtime?.id) { disconnected(); }
      return null;
    } finally { clearTimeout(deadline); pendingReplies.delete(cancel); }
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
    const failureGeneration = generation;
    const code = typeof response?.error === 'string' && KNOWN_FAILURES.has(response.error)
      ? response.error : 'CAPTURE_FAILED';
    if (code === 'PAUSED' || code === 'CONSENT_REQUIRED') adapter.stopWatching();
    if (code === 'STALE_CAPTURE') adapter.invalidate();
    await diagnostic(code, scanned);
    if (stopped || suspended || generation !== failureGeneration) return;
    if (code === 'CONTEXT_INVALIDATED') disconnected();
  }

  function schedule() {
    if (stopped || suspended || inFlight || timer !== null) return;
    const delay = Math.max(250, POLL_MS - (Date.now() - lastStatusAt));
    timer = setTimeout(() => { timer = null; void cycle(); }, delay);
  }

  async function cycle() {
    if (stopped || suspended || inFlight) return;
    inFlight = true;
    const cycleGeneration = generation;
    try {
      lastStatusAt = Date.now();
      const response = await send({type: 'GET_STATUS', contentVersion});
      if (stopped || suspended || generation !== cycleGeneration) return;
      const status = response?.ok === true ? response.data : null;
      if (!status) {
        if (lifecycle) lifecycle.ready = false;
        stopNoticeWatching();
        adapter.stopWatching();
        // Worker suspension and a lost reply are recoverable transport states.
        // Do not mislabel them as a dead document or block the next status probe
        // behind a second transport request. No source scan happens here.
        adapter.invalidate();
        return;
      }
      if (!contentVersion || status.runtimeVersion && status.runtimeVersion !== contentVersion) {
        disconnected();
        return;
      }
      clearRefreshAction();
      if (lifecycle) lifecycle.ready = true;
      watchObsoleteNotice();
      if (status.consented !== true || status.enabled !== true) {
        adapter.stopWatching();
        await diagnostic(status.consented === true ? 'PAUSED' : 'CONSENT_REQUIRED');
        return;
      }
      if (status.adapterVersion !== adapter.version) {
        if (lifecycle) lifecycle.ready = false;
        stopNoticeWatching();
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
      if (stopped || suspended || generation !== cycleGeneration) return;
      if (!snapshot.messages?.length) {
        return;
      }
      for (const messages of captureBatches(snapshot.messages,sourceTimes)) {
        if (stopped || suspended || generation !== cycleGeneration || !adapter.isSameChat(snapshot.chat.id)) {
          adapter.invalidate();
          await diagnostic('UNSTABLE_PAGE', snapshot.scanned);
          return;
        }
        const result = await send({
          type: 'CAPTURE', epoch: status.epoch, adapterVersion: adapter.version, contentVersion,
          chat: snapshot.chat, messages
        });
        if (stopped || suspended || generation !== cycleGeneration) return;
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
      if (stopped || suspended || generation !== cycleGeneration) return;
      adapter.invalidate();
      await diagnostic('CAPTURE_FAILED');
    } finally {
      inFlight = false;
      schedule();
    }
  }

  function onPageHide() {
    suspended=true; generation++; stopNoticeWatching(); clearTimeout(timer); timer=null;
    clearInterval(connectionTimer); connectionTimer=null; adapter.stopWatching();
  }
  function onPageShow() {
    if(!suspended||stopped)return;
    suspended=false; lastStatusAt=0; lastDiagnostic=''; watchConnection(); void cycle();
  }
  globalThis.addEventListener?.('pagehide', onPageHide);
  globalThis.addEventListener?.('pageshow', onPageShow);
  watchConnection(); void cycle();
})();
