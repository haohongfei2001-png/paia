import '../core/json-fingerprint.js';
import '../core/source-time.js';
import '../core/response-time.js';
const {sanitize} = globalThis.ResponseTimeProtocol;
// Safe summaries and routing tokens only; never IDs, response times or storage.
export class ResponseDiagnostics {
  constructor() { this.pages = new Map(); this.ordinaryDocuments = new Map(); this.generation = 0; }
  changed() { this.generation = (this.generation + 1) % 1000000; }
  prune(now) { for (const [key, entry] of this.pages) if (now - entry.at > 3000) { this.pages.delete(key); this.changed(); } }
  poll(request, sender, enabled, now = Date.now()) {
    this.prune(now);
    const key = sender.tab.id;
    const summary = sanitize(request.summary);
    if (!enabled || !summary || !summary.active || typeof request.session !== 'string' || request.session.length > 80 || typeof sender.documentId !== 'string') {
      if (this.pages.has(key)) this.changed();
      if (this.ordinaryDocuments.get(key) === sender.documentId) this.ordinaryDocuments.delete(key);
      this.pages.delete(key); return {arm: false};
    }
    this.ordinaryDocuments.set(key, sender.documentId);
    const prior = this.pages.get(key);
    const same = prior?.session === request.session && prior?.document === sender.documentId;
    if (!same) this.changed();
    this.pages.set(key, {session: request.session, document: sender.documentId, summary, at: now, arm: false});
    return {arm: same && prior.arm === true, fingerprintAllowed: this.pages.size === 1 && this.ordinaryDocuments.size === 1};
  }
  removeTab(id) { if (this.pages.has(id) || this.ordinaryDocuments.has(id)) this.changed(); this.pages.delete(id); this.ordinaryDocuments.delete(id); }
  view(enabled, start = false, now = Date.now()) {
    this.prune(now);
    if (!enabled) { if (this.pages.size) this.changed(); this.pages.clear(); this.ordinaryDocuments.clear(); }
    const entries = [...this.pages.values()];
    if (entries.length !== 1 || this.ordinaryDocuments.size !== 1) return {pages: entries.length ? Math.max(entries.length, this.ordinaryDocuments.size) : 0, summary: null, generation: this.generation};
    if (start && entries[0].summary.canonical > 0) entries[0].arm = true;
    return {pages: 1, summary: sanitize(entries[0].summary), generation: this.generation};
  }
}
