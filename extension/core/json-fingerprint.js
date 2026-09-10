/* ISOLATED/background/UI whitelist; fingerprints contain structure only. */
(() => {
  'use strict';
  const FIELDS = ['message', 'messages', 'mapping', 'author', 'role', 'create_time', 'update_time', 'id', 'conversation_id', 'parent', 'children'];
  const number = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000;
  const validID = n => typeof n === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(n);
  function project(value, bools, nums) {
    if (!value || typeof value !== 'object') return null;
    const out = {};
    for (const k of bools) { if (typeof value[k] !== 'boolean') return null; out[k] = value[k]; }
    for (const k of nums) { if (!number(value[k])) return null; out[k] = value[k]; }
    return out;
  }
  function shape(value) {
    if (!value || !['object', 'array', 'primitive'].includes(value.rootType)) return null;
    const out = project(value, ['mappingLike', 'messagesLike', 'conversationIdentityField', 'depthLimited', 'truncated'], ['topLevelKeyCount', 'minCollectionSize', 'maxCollectionSize', 'maxDepth']);
    const fields = project(value.fields, [], FIELDS);
    if (!out || !fields || out.maxDepth > 4) return null;
    return {rootType: value.rootType, ...out, fields};
  }
  function detail(value) { return project(value, ['candidate', 'identityPresent'], ['messageCount', 'userRoleCount', 'userWithIDCount', 'userWithCreateTimeCount', 'parseableCount']); }
  function sanitize(value) {
    if (!value || typeof value.allowed !== 'boolean' || !number(value.failures) || !number(value.dropped) || !Array.isArray(value.groups) || value.groups.length > 12) return null;
    const groups = [];
    for (const entry of value.groups) {
      const s = shape(entry.shape); const d = detail(entry.detail);
      if (!s || !d || !number(entry.occurrence) || !number(entry.matched) || !number(entry.canonical)) return null;
      groups.push({shape: s, detail: d, occurrence: entry.occurrence, matched: entry.matched, canonical: entry.canonical});
    }
    return {allowed: value.allowed, failures: value.failures, dropped: value.dropped, groups};
  }
  class Model {
    constructor() { this.clear(); }
    clear() { this.groups = new Map(); this.failures = 0; this.dropped = 0; }
    ingest(value) {
      const s = shape(value?.shape); const d = detail(value?.detail);
      if (!s || !d || !Array.isArray(value.matches) || value.matches.length > 200) return;
      const matches = [];
      for (const m of value.matches) { if (!validID(m?.chat) || !validID(m.id)) return; matches.push({chat: m.chat, id: m.id}); }
      const key = JSON.stringify(s); const prior = this.groups.get(key);
      if (!prior && this.groups.size >= 12) {
        const ordinary = [...this.groups].find(([, group]) => !group.detail.candidate);
        this.dropped = Math.min(1000000, this.dropped + 1);
        if (d.candidate && ordinary) this.groups.delete(ordinary[0]); else return true;
      }
      this.groups.set(key, {shape: s, detail: d, matches: d.candidate && !s.truncated ? matches : [], occurrence: Math.min(1000000, (prior?.occurrence || 0) + 1)});
      return true;
    }
    summary(chat, ids, allowed) {
      const canonical = new Set(ids);
      return sanitize({allowed, failures: this.failures, dropped: this.dropped, groups: [...this.groups.values()].map(g => ({...g, canonical: canonical.size,
        matched: new Set(g.matches.filter(m => m.chat === chat && canonical.has(m.id)).map(m => m.id)).size}))});
    }
  }
  globalThis.JSONFingerprintProtocol = Object.freeze({sanitize, Model});
})();
