import {ArchiveError} from './constants.js';

export function validateOperationQuery(query) {
  const keys = ['version', 'namespace', 'ownerRef', 'operationId', 'requestDigest', 'epoch'];
  if (!query || Object.keys(query).some(key => !keys.includes(key)) ||
      query.version !== 1 || query.namespace !== 'working-input' ||
      typeof query.ownerRef !== 'string' || !query.ownerRef.length || query.ownerRef.length > 512 ||
      typeof query.operationId !== 'string' || query.operationId.length < 8 || query.operationId.length > 128 ||
      typeof query.requestDigest !== 'string' || !/^[a-f0-9]{64}$/.test(query.requestDigest) ||
      typeof query.epoch !== 'string' || !query.epoch.length || query.epoch.length > 200) {
    throw new ArchiveError('INVALID_REQUEST');
  }
  return query;
}

// Bounded, body-free knowledge of completed attempts in this worker lifetime.
// Eviction/restart loses negative knowledge and therefore returns unknown.
// Durable success always comes from IndexedDB, never this ledger.
export class OperationAttemptLedger {
  constructor(limit = 128) { this.limit = limit; this.attempts = new Map(); }
  key(query) { return JSON.stringify([query.ownerRef, query.operationId, query.requestDigest]); }
  begin(query) {
    const key = this.key(query), attempt = {epoch: null, state: 'pending'};
    this.attempts.delete(key);
    this.attempts.set(key, attempt);
    while (this.attempts.size > this.limit) this.attempts.delete(this.attempts.keys().next().value);
    return attempt;
  }
  settle(query, attempt, committed) {
    if (this.attempts.get(this.key(query)) !== attempt) return;
    if (committed) this.attempts.delete(this.key(query));
    else attempt.state = 'not_committed';
  }
  read(query) {
    const attempt = this.attempts.get(this.key(query));
    return attempt?.epoch === query.epoch && attempt.state === 'not_committed' ? 'not_committed' : 'unknown';
  }
}
