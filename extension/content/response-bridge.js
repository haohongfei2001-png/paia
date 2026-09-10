/* ISOLATED: raw response metadata stays in this document's bounded memory. */
(() => {
  'use strict';
  const protocol = globalThis.ResponseTimeProtocol;
  const model = new protocol.Model();
  const fingerprints = new globalThis.JSONFingerprintProtocol.Model();
  const semantics = new globalThis.SourceTimeProtocol.Model();
  const history = new globalThis.HistoryTime.Model();
  let fingerprintAllowed = false;
  const adapter = new globalThis.ChatGPTAdapter();
  let session = crypto.randomUUID();
  let historySession = crypto.randomUUID();
  const proofs = new Map();
  const acknowledged = new Map();
  let flushing = false;
  let flushAgain = false;
  let proofGroup = 0;
  let proofChat = null;
  let epoch = -1;
  let active = false;
  let arm = 0;
  let stopped = false;
  let canonicalAt = 0;
  function control() {
    window.postMessage({channel: 'archive-response-control-v1', active, chat: model.chat, epoch, session, historySession, arm, fingerprint: fingerprintAllowed, history: active}, 'https://chatgpt.com');
  }
  function clear() {
    fingerprints.clear(); semantics.clear(); fingerprintAllowed = false;
    model.reset(); active = false; arm = 0; canonicalAt = 0; session = crypto.randomUUID(); control();
    history.reset(); proofs.clear(); acknowledged.clear(); proofChat = null; historySession = crypto.randomUUID();
  }
  function eligible() { return active && adapter.route().id === model.chat && adapter.route().code === 'READY'; }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== 'https://chatgpt.com' || !eligible()) return;
    const data = event.data;
    if (data?.channel !== 'archive-response-metadata-v1' || data.epoch !== epoch || data.chat !== model.chat) return;
    if (data.history) {
      if (data.historySession === historySession && history.ingest(data.history)) void flush();
      return;
    }
    if (data.session !== session) return;
    if (data.fingerprint || data.fingerprintFailure === true) {
      if (fingerprintAllowed) {
        if (data.fingerprint) {
          if (fingerprints.ingest(data.fingerprint)) semantics.ingest(data.fingerprint, model.chat);
        }
        else fingerprints.failures = Math.min(1000000, fingerprints.failures + 1);
      }
      return;
    }
    if (data.observedFetchResponse === true) { model.recordObservation(); return; }
    model.recordTrace(data.trace);
    if (data.trace?.outcome === 'skipped') return;
    if (data.error === 'LIMIT') model.limitedResponses = Math.min(1000000, model.limitedResponses + 1);
    else if (data.error === 'SCHEMA') model.rejectedResponses = Math.min(1000000, model.rejectedResponses + 1);
    else if (!model.ingest(data)) model.rejectedResponses = Math.min(1000000, model.rejectedResponses + 1);
  });
  async function flush() {
    if (flushing) { flushAgain = true; return; }
    if (!eligible() || !proofChat || !proofs.size) return;
    flushing = true;
    const generation = historySession, batchEpoch = epoch, chat = {...proofChat};
    try {
      const groups = new Map();
      for (const [id,proof] of proofs) {
        if (!groups.has(proof.group)) groups.set(proof.group,[]);
        groups.get(proof.group).push({id,...proof});
      }
      // Only compare messages confirmed together; cache insertion order is not
      // conversation order, and separately loaded fragments have no global rank.
      for (const group of groups.values()) {
        group.sort((a,b)=>a.pageOrder-b.pageOrder);
        const evidence = history.match(group.map(proof=>proof.id));
        const pending = group.map(proof => ({sourceMessageId:proof.id,pageOrder:proof.pageOrder,sourceTime:evidence.get(proof.id) || null,...(proof.domTime?{domTime:proof.domTime}:{})}))
          .filter(message => acknowledged.get(message.sourceMessageId) !== JSON.stringify(message));
        for (let start = 0; start < pending.length; start += 200) {
          if (!eligible() || historySession !== generation || epoch !== batchEpoch) return;
          const messages = pending.slice(start, start + 200);
          const reply = await chrome.runtime.sendMessage({type:'ENRICH_SOURCE_METADATA',epoch:batchEpoch,adapterVersion:globalThis.ChatGPTAdapter.version,chat,messages});
          if (!reply?.ok || historySession !== generation) return; // Keep evidence for the next authorized poll.
          for (const message of messages) acknowledged.set(message.sourceMessageId,JSON.stringify(message));
        }
      }
    } catch {} finally {
      flushing = false;
      if (flushAgain) { flushAgain = false; void flush(); }
    }
  }
  globalThis.ArchiveResponseTime = Object.freeze({
    evidence(snapshot,status) {
      if(!active||status.epoch!==epoch||!eligible()||snapshot.chat?.id!==model.chat)return new Map();
      return history.match(snapshot.messages.map(m=>m.sourceMessageId));
    },
    observe(snapshot, status) {
      if (!active || status.epoch !== epoch || !eligible()) return;
      if (snapshot.chat?.id === model.chat && Array.isArray(snapshot.messages)) {
        const ids = snapshot.messages.map(message => message.sourceMessageId);
        if (snapshot.chat.url && ids.length <= 2000) {
          proofChat = {id:snapshot.chat.id,url:snapshot.chat.url};
          proofGroup++;
          for (const message of snapshot.messages) {
            if (/^[A-Za-z0-9_-]{8,128}$/.test(message.sourceMessageId) && Number.isSafeInteger(message.pageOrder) && message.pageOrder > 0 && message.pageOrder <= 1000000 &&
                (proofs.has(message.sourceMessageId) || proofs.size < 2000)) proofs.set(message.sourceMessageId,{pageOrder:message.pageOrder,group:proofGroup,...(message.domTime?{domTime:message.domTime}:{})});
            else if (proofs.size >= 2000) history.limited = true;
          }
          void flush();
        } else if (ids.length > 2000) history.limited = true;
        model.observe(model.chat, ids); canonicalAt = Date.now();
        if (fingerprintAllowed) semantics.observe(model.chat, ids, canonicalAt);
      } else { model.canonical = []; semantics.observe(model.chat, []); canonicalAt = 0; }
    }
  });
  async function poll() {
    if (stopped) return;
    try {
      const response = await chrome.runtime.sendMessage({type: 'GET_STATUS'});
      if (stopped) return;
      const status = response?.ok ? response.data : null;
      const route = adapter.route();
      const allowed = status?.enabled === true && status.consented === true && status.adapterVersion === '0.3.0' && route.code === 'READY';
      if (!allowed) { if (active) clear(); }
      else {
        if (!active || epoch !== status.epoch || model.chat !== route.id) {
          clear(); epoch = status.epoch; model.reset(route.id); history.reset(route.id); active = true;
        }
        control();
      }
      await flush();
      let reply;
      // Diagnostic transport/lease failure must not clear authorized formal evidence.
      try { reply = await chrome.runtime.sendMessage({type: 'RESPONSE_POLL', session, epoch, summary: {...model.summary(), fingerprints: fingerprints.summary(model.chat, model.canonical, fingerprintAllowed), semantics: semantics.summary(fingerprintAllowed)}}); } catch {}
      const allowFingerprint = reply?.ok === true && reply.data?.fingerprintAllowed === true && eligible();
      if (!allowFingerprint) {
        fingerprints.clear(); semantics.clear();
        // A revoked lease cannot revive an in-flight copy after eligibility returns.
        if (fingerprintAllowed) session = crypto.randomUUID();
      }
      fingerprintAllowed = allowFingerprint; control();
      if (reply?.ok && reply.data?.arm === true && eligible() && canonicalAt && Date.now() - canonicalAt < 5000 && model.canonical.length) {
        model.arm(); arm++; control();
      }
    } catch { clear(); }
    if (!stopped) setTimeout(() => void poll(), 500);
  }
  window.addEventListener('pagehide', () => {
    stopped = true; clear();
    try { void chrome.runtime.sendMessage({type: 'RESPONSE_POLL', session, epoch, summary: model.summary()}).catch(() => {}); } catch {}
  });
  void poll();
})();
