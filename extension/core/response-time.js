/* Fixed protocol and memory-only response-time matching; no storage or DOM access. */
(() => {
  'use strict';
  const ID = /^[A-Za-z0-9_-]{8,128}$/;
  const LIMIT = 2000;
  const validID = value => typeof value === 'string' && ID.test(value);
  const COUNT_KEYS = ['canonical', 'metadata', 'matched', 'withTime', 'parseable', 'conflicts', 'seconds', 'milliseconds', 'orderPairs', 'orderInversions', 'acceptedResponses', 'rejectedResponses', 'limitedResponses'];
  const AGE = ['unknown', 'today', 'days_ago', 'weeks_ago', 'older'];
  const ENDPOINTS = ['conversation_load_candidate', 'message_send_or_stream_candidate', 'other'];
  const TYPES = ['json', 'event_stream', 'text', 'other'];
  const STAGES = ['observed', 'origin', 'endpoint', 'http_status', 'content_type', 'clone', 'read', 'json', 'root_schema', 'conversation_identity', 'collection', 'message', 'user_id', 'create_time', 'limit', 'accepted'];
  const REASONS = ['UNEXPECTED_FAILURE', 'ORIGIN_NOT_ALLOWED', 'URL_SHAPE_NOT_ALLOWED', 'HTTP_STATUS_NOT_ALLOWED', 'REDIRECT_NOT_ALLOWED', 'ENDPOINT_NOT_ALLOWED', 'ENDPOINT_CHAT_MISMATCH', 'CONTENT_TYPE_NOT_ALLOWED', 'CONCURRENCY_LIMIT', 'DECLARED_SIZE_LIMIT', 'BODY_UNAVAILABLE', 'READ_TIMEOUT', 'BODY_SIZE_LIMIT', 'SSE_EVENT_LIMIT', 'USER_METADATA_LIMIT', 'CLONE_FAILED', 'BODY_READ_FAILED', 'JSON_PARSE_FAILED', 'SCHEMA_REJECTED', 'ROOT_NOT_OBJECT', 'ROOT_SCHEMA_UNKNOWN', 'CONVERSATION_ID_MISSING', 'CONVERSATION_ID_MISMATCH', 'COLLECTION_LIMIT', 'MESSAGE_ENTRY_INVALID', 'USER_MESSAGE_ID_INVALID', 'CREATE_TIME_TYPE_INVALID', 'ACCEPTED'];
  const TRACE_BOOLEANS = ['originChecked', 'originAllowed', 'endpointChecked', 'urlShapeAllowed', 'redirectAllowed', 'httpStatusChecked', 'httpStatusAllowed', 'contentTypeChecked', 'cloneAttempted', 'cloneSucceeded', 'jsonParseAttempted', 'jsonParseSucceeded', 'rootSchemaChecked', 'rootSchemaRecognized', 'conversationIdentityChecked', 'conversationIdentityFound', 'conversationIdentityMatches', 'messageCollectionChecked', 'messageCollectionFound', 'entriesTruncated'];
  const TRACE_COUNTS = ['jsonValueCount', 'mappingEntryCount', 'messageEntryCount', 'inspectedEntryCount', 'userRoleEntryCount', 'userWithMessageIDCount', 'userWithValidMessageIDCount', 'userWithCreateTimeCount', 'createTimeParseableCount'];
  const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
  function sanitizeTrace(value) {
    if (!value || !ENDPOINTS.includes(value.endpointClass) || !TYPES.includes(value.contentTypeClass) || !STAGES.includes(value.stage) || !REASONS.includes(value.reason) || !['accepted', 'rejected', 'skipped'].includes(value.outcome)) return null;
    const result = {};
    for (const key of ['endpointClass', 'contentTypeClass', 'stage', 'reason', 'outcome']) result[key] = value[key];
    for (const key of TRACE_BOOLEANS) { if (typeof value[key] !== 'boolean') return null; result[key] = value[key]; }
    for (const key of TRACE_COUNTS) { if (!count(value[key])) return null; result[key] = value[key]; }
    return result;
  }
  function emptyRejections() {
    return {observedFetchResponseCount: 0, byEndpoint: Object.fromEntries(ENDPOINTS.map(key => [key, {count: 0, accepted: 0, rejected: 0, skipped: 0, last: null}]))};
  }
  function sanitizeRejections(value) {
    if (!value || !count(value.observedFetchResponseCount) || !value.byEndpoint) return null;
    const result = emptyRejections(); result.observedFetchResponseCount = value.observedFetchResponseCount;
    for (const key of ENDPOINTS) {
      const entry = value.byEndpoint[key]; if (!entry) return null;
      for (const field of ['count', 'accepted', 'rejected', 'skipped']) {
        if (!count(entry[field])) return null; result.byEndpoint[key][field] = entry[field];
      }
      if (entry.last !== null) {
        const trace = sanitizeTrace(entry.last);
        if (!trace || trace.endpointClass !== key) return null;
        result.byEndpoint[key].last = trace;
      }
    }
    return result;
  }
  function time(value, now = Date.now()) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 946684800 && value * 1000 <= now + 300000 ? value : null;
  }
  function sanitize(value) {
    if (!value || value.version !== 1) return null;
    const result = {version: 1};
    for (const key of COUNT_KEYS) {
      if (!Number.isSafeInteger(value[key]) || value[key] < 0 || value[key] > 1000000) return null;
      result[key] = value[key];
    }
    for (const key of ['active', 'armed', 'truncated']) {
      if (typeof value[key] !== 'boolean') return null;
      result[key] = value[key];
    }
    for (const key of ['earliestAge', 'latestAge']) {
      if (!AGE.includes(value[key])) return null;
      result[key] = value[key];
    }
    if (!Array.isArray(value.deltas) || value.deltas.length > 20 || value.deltas.some(x => !Number.isInteger(x) || Math.abs(x) > 86400)) return null;
    result.deltas = [...value.deltas];
    if (value.semantics !== undefined) {
      const semantic = globalThis.SourceTimeProtocol?.sanitize(value.semantics);
      if (!semantic) return null;
      result.semantics = semantic;
    }
    if (value.fingerprints !== undefined) {
      const f = globalThis.JSONFingerprintProtocol?.sanitize(value.fingerprints);
      if (!f) return null;
      result.fingerprints = f;
    }
    result.rejectionDiagnostics = value.rejectionDiagnostics === undefined ? emptyRejections() : sanitizeRejections(value.rejectionDiagnostics);
    if (!result.rejectionDiagnostics) return null;
    return result;
  }
  function age(seconds, now) {
    const days = (now - seconds * 1000) / 86400000;
    return days < 0 ? 'unknown' : days < 1 ? 'today' : days < 7 ? 'days_ago' : days < 28 ? 'weeks_ago' : 'older';
  }
  class Model {
    constructor() { this.reset(); }
    reset(chat = '') {
      this.chat = chat; this.rows = new Map(); this.canonical = []; this.seen = new Set(); this.first = new Map();
      this.armed = false; this.baseline = new Set(); this.truncated = false;
      this.rejectionDiagnostics = emptyRejections();
      this.acceptedResponses = 0; this.rejectedResponses = 0; this.limitedResponses = 0;
    }
    recordObservation() { this.rejectionDiagnostics.observedFetchResponseCount = Math.min(1000000, this.rejectionDiagnostics.observedFetchResponseCount + 1); }
    recordTrace(value) {
      const trace = sanitizeTrace(value); if (!trace) return;
      const entry = this.rejectionDiagnostics.byEndpoint[trace.endpointClass];
      entry.count = Math.min(1000000, entry.count + 1);
      entry[trace.outcome] = Math.min(1000000, entry[trace.outcome] + 1);
      entry.last = trace;
    }
    observe(chat, ids, now = Date.now()) {
      if (chat !== this.chat) this.reset(chat);
      this.canonical = ids.slice(0, LIMIT);
      if (ids.length > LIMIT) this.truncated = true;
      for (const id of this.canonical) {
        if (!validID(id)) continue;
        if (!this.seen.has(id) && this.seen.size < LIMIT) { this.seen.add(id); this.first.set(id, now); }
        else if (!this.seen.has(id)) this.truncated = true;
      }
    }
    arm() { this.baseline = new Set(this.seen); this.armed = true; }
    ingest(batch) {
      if (batch.chat !== this.chat || !Array.isArray(batch.rows) || batch.rows.length > LIMIT) return false;
      const projected = [];
      for (const row of batch.rows) {
        if (!row || row.role !== 'user' || !validID(row.id) || (row.time !== null && (typeof row.time !== 'number' || !Number.isFinite(row.time)))) return false;
        projected.push({id: row.id, role: 'user', time: row.time, controlled: batch.controlled === true});
      }
      for (const row of projected) {
        const prior = this.rows.get(row.id);
        if (prior) {
          if (prior.time !== row.time && prior.time !== null && row.time !== null) prior.conflict = true;
          if (prior.time === null) prior.time = row.time;
          prior.controlled ||= row.controlled;
        } else if (this.rows.size < LIMIT) this.rows.set(row.id, {...row, conflict: false});
        else this.truncated = true;
      }
      this.acceptedResponses = Math.min(1000000, this.acceptedResponses + 1);
      return true;
    }
    summary(now = Date.now()) {
      const s = {version: 1, ...Object.fromEntries(COUNT_KEYS.map(k => [k, 0])), active: Boolean(this.chat), armed: this.armed, truncated: this.truncated, earliestAge: 'unknown', latestAge: 'unknown', deltas: []};
      s.canonical = this.canonical.length; s.metadata = this.rows.size;
      s.conflicts = [...this.rows.values()].filter(row => row.conflict).length;
      s.acceptedResponses = this.acceptedResponses; s.rejectedResponses = this.rejectedResponses; s.limitedResponses = this.limitedResponses;
      const times = []; let previous = null;
      for (const id of this.canonical) {
        const row = this.rows.get(id);
        if (!row) { previous = null; continue; }
        s.matched++;
        if (row.time !== null) s.withTime++;
        if (row.conflict) { previous = null; continue; }
        const t = time(row.time, now);
        if (t === null) { previous = null; continue; }
        s.parseable++; times.push(t);
        if (Number.isInteger(t)) s.seconds++; else s.milliseconds++;
        if (previous !== null) { s.orderPairs++; if (t < previous) s.orderInversions++; }
        previous = t;
        if (this.armed && !this.baseline.has(id) && row.controlled && this.first.has(id)) {
          const delta = Math.round((this.first.get(id) - t * 1000) / 1000);
          if (Math.abs(delta) <= 86400 && s.deltas.length < 20) s.deltas.push(delta);
        }
      }
      if (times.length) { s.earliestAge = age(Math.min(...times), now); s.latestAge = age(Math.max(...times), now); }
      s.rejectionDiagnostics = this.rejectionDiagnostics;
      return sanitize(s);
    }
  }
  globalThis.ResponseTimeProtocol = Object.freeze({ID, LIMIT, time, sanitize, sanitizeTrace, sanitizeRejections, emptyRejections, Model});
})();
