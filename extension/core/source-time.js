/* Memory-only semantics for exact-matched historical candidates. No DOM/storage. */
(() => {
  'use strict';
  const LIMIT = 2000;
  const AGES = ['today', 'days_ago', 'weeks_ago', 'older', 'unknown'];
  const COUNTS = ['revision', 'canonical', 'matched', 'withCreate', 'parseable', 'missingCreate', 'invalidCreate', 'conflicts', 'orderPairs', 'orderInversions', 'captureComparable', 'beforeCapture', 'updateMissing', 'updatePresent', 'updateInvalid', 'updateBeforeCreate', 'updateFuture', 'observations'];
  const validID = v => typeof v === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(v);
  const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000;
  function time(value, now) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 946684800 && value * 1000 <= now + 300000 ? value : null;
  }
  function age(value, now) {
    if (time(value, now) === null || value * 1000 > now) return 'unknown';
    const days = (now - value * 1000) / 86400000;
    return days < 1 ? 'today' : days < 7 ? 'days_ago' : days < 28 ? 'weeks_ago' : 'older';
  }
  function scalar(v) {
    if (!v || !['missing', 'invalid', 'value'].includes(v.state)) return null;
    if (v.state === 'value' ? typeof v.value !== 'number' || !Number.isFinite(v.value) : v.value !== null) return null;
    return {state: v.state, value: v.value};
  }
  function sanitize(value) {
    if (!value || value.version !== 1 || typeof value.allowed !== 'boolean' || typeof value.truncated !== 'boolean') return null;
    const s = {version: 1, allowed: value.allowed, truncated: value.truncated};
    for (const key of COUNTS) { if (!count(value[key])) return null; s[key] = value[key]; }
    s.ages = {};
    for (const key of AGES) { if (!count(value.ages?.[key])) return null; s.ages[key] = value.ages[key]; }
    if (s.canonical > LIMIT || s.matched > s.canonical || s.withCreate > s.matched || s.parseable > s.withCreate ||
        s.beforeCapture > s.captureComparable || s.captureComparable > s.parseable || s.orderInversions > s.orderPairs ||
        s.orderPairs > Math.max(0, s.canonical - 1) || Object.values(s.ages).reduce((a, b) => a + b, 0) !== s.matched ||
        ['missingCreate', 'invalidCreate', 'conflicts', 'updateMissing', 'updatePresent', 'updateInvalid', 'updateBeforeCreate', 'updateFuture'].some(k => s[k] > s.matched) ||
        s.updateMissing + s.updatePresent !== s.matched) return null;
    return s;
  }
  function evaluate(value, period = 'unknown') {
    const s = sanitize(value);
    const names = ['exactMatch', 'createTime', 'order', 'beforeCapture', 'updateRelation', 'noConflict', 'coverage', 'ageBucket'];
    const checks = Object.fromEntries(names.map(k => [k, 'unknown']));
    if (!s || !s.allowed || !s.canonical) return {checks, timeSourceCandidate: 'unknown', timeConfidenceCandidate: 'unknown'};
    checks.exactMatch = s.matched === s.canonical ? 'pass' : 'fail';
    checks.coverage = s.truncated ? 'fail' : 'pass';
    if (s.matched) {
      checks.createTime = s.withCreate === s.matched && s.parseable === s.matched && !s.missingCreate && !s.invalidCreate ? 'pass' : 'fail';
      checks.noConflict = s.conflicts ? 'fail' : 'pass';
      checks.order = s.orderInversions ? 'fail' : s.orderPairs === s.canonical - 1 && s.orderPairs > 0 ? 'pass' : 'unknown';
      checks.beforeCapture = s.captureComparable < s.matched ? 'unknown' : s.beforeCapture === s.matched ? 'pass' : 'fail';
      checks.updateRelation = s.updateInvalid || s.updateBeforeCreate || s.updateFuture ? 'fail' : checks.createTime === 'pass' ? 'pass' : 'unknown';
      if (AGES.includes(period) && period !== 'unknown') checks.ageBucket = s.ages[period] === s.matched ? 'pass' : 'fail';
    }
    const high = Object.values(checks).every(v => v === 'pass');
    return {checks, timeSourceCandidate: high ? 'chatgpt_response_create_time' : 'unknown', timeConfidenceCandidate: high ? 'high' : 'unknown'};
  }
  class Model {
    constructor() { this.clear(); }
    clear() { this.chat = ''; this.rows = new Map(); this.canonical = []; this.first = new Map(); this.truncated = false; this.revision = 0; this.observations = 0; }
    observe(chat, ids, now = Date.now()) {
      if (this.chat !== chat) { this.clear(); this.chat = chat; }
      if (!validID(chat) || !Array.isArray(ids) || ids.some(id => !validID(id)) || new Set(ids).size !== ids.length) { this.canonical = []; this.truncated = true; return; }
      const next = ids.slice(0, LIMIT);
      if (next.length !== this.canonical.length || next.some((id, i) => id !== this.canonical[i])) this.revision = Math.min(1000000, this.revision + 1);
      this.canonical = next;
      if (ids.length > LIMIT) this.truncated = true;
      for (const id of next) if (!this.first.has(id)) {
        if (this.first.size < LIMIT) this.first.set(id, now); else this.truncated = true;
      }
    }
    ingest(value, chat, now = Date.now()) {
      if (!validID(chat) || value?.detail?.candidate !== true || value.shape?.truncated !== false || !Array.isArray(value.matches) || value.matches.length > 200) return false;
      if (this.chat !== chat) { this.clear(); this.chat = chat; }
      const rows = [];
      for (const m of value.matches) {
        const create = scalar(m?.create), update = scalar(m?.update);
        if (!validID(m?.chat) || !validID(m.id) || !create || !update) return false;
        if (m.chat === chat) rows.push({id: m.id, create, update});
      }
      for (const m of rows) {
        let row = this.rows.get(m.id);
        if (!row) {
          if (this.rows.size >= LIMIT) { this.truncated = true; continue; }
          row = {value: null, missing: false, invalid: false, conflict: false, updatePresent: false, updateInvalid: false, updateBefore: false, updateFuture: false};
          this.rows.set(m.id, row);
        }
        row.missing ||= m.create.state === 'missing';
        row.invalid ||= m.create.state === 'invalid' || m.create.state === 'value' && time(m.create.value, now) === null;
        if (m.create.state === 'value') {
          if (row.value !== null && row.value !== m.create.value) row.conflict = true;
          if (row.value === null) row.value = m.create.value;
        }
        row.updatePresent ||= m.update.state !== 'missing';
        row.updateInvalid ||= m.update.state === 'invalid' || m.update.state === 'value' && time(m.update.value, now) === null;
        if (m.update.state === 'value') {
          row.updateBefore ||= m.create.state === 'value' && m.update.value < m.create.value;
          row.updateFuture ||= m.update.value * 1000 > now;
        }
      }
      this.observations = Math.min(1000000, this.observations + 1);
      return true;
    }
    summary(allowed, now = Date.now()) {
      const s = {version: 1, allowed, truncated: this.truncated, ...Object.fromEntries(COUNTS.map(k => [k, 0])), ages: Object.fromEntries(AGES.map(k => [k, 0]))};
      s.revision = this.revision; s.canonical = this.canonical.length; s.observations = this.observations;
      let previous = null;
      for (const id of this.canonical) {
        const row = this.rows.get(id);
        if (!row) { previous = null; continue; }
        s.matched++; s.missingCreate += Number(row.missing); s.invalidCreate += Number(row.invalid); s.conflicts += Number(row.conflict);
        s.updatePresent += Number(row.updatePresent); s.updateMissing += Number(!row.updatePresent);
        s.updateInvalid += Number(row.updateInvalid); s.updateBeforeCreate += Number(row.updateBefore); s.updateFuture += Number(row.updateFuture);
        if (row.value !== null) s.withCreate++;
        const t = time(row.value, now);
        const usable = t !== null && !row.conflict && !row.missing && !row.invalid;
        s.ages[usable ? age(t, now) : 'unknown']++;
        if (!usable) { previous = null; continue; }
        s.parseable++;
        const boundary = this.first.get(id);
        if (Number.isFinite(boundary)) { s.captureComparable++; if (t * 1000 < boundary) s.beforeCapture++; }
        if (previous !== null) { s.orderPairs++; if (t < previous) s.orderInversions++; }
        previous = t;
      }
      return sanitize(s);
    }
  }
  globalThis.SourceTimeProtocol = Object.freeze({LIMIT, AGES, time, age, sanitize, evaluate, Model});
})();
