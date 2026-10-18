import { Pool } from 'pg';
import { types } from 'node:util';

// Storage for AtomicReservationLedger's ONE original snapshot. This is not a
// second accounting owner, an entitlement proof, or permission to dispatch.
export const LEDGER_KEY = 'aiu:budget-reservations:v1';
export const SCHEMA_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
const TABLE = 'paia_ai_private.budget_snapshot';
const MAX_ROWS = 10000;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const metadata = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.isWellFormed() && !/[\u0000-\u001f\u007f]/u.test(value);
const nullableMetadata = value => value === null || metadata(value);
const amount = value => integer(value);
const nullableAmount = value => value === null || amount(value);
const oneOf = values => value => values.includes(value);
const timestamp = integer;
const boolean = value => typeof value === 'boolean';
const routeFields = ['provider', 'model', 'resolutionVersion', 'region', 'deployment', 'market', 'api', 'profile', 'tier', 'currency', 'tokenizer', 'pricingVersion'];
const requestShape = {
  operationId: metadata, jobId: metadata, principalId: metadata, libraryId: metadata,
  scopeFingerprint: metadata, contractVersion: metadata, routeVersion: metadata,
  consentEpoch: metadata, jobType: oneOf(['AI_MAINTENANCE', 'AI_ORGANIZE', 'AI_ASSIST']),
  childIndex: integer, childCount: integer, inputTokens: integer, outputCap: integer,
  maxCompletionTokens: integer,
};
const routeShape = Object.fromEntries(routeFields.map(key => [key, metadata]));
const quoteShape = { nativeCurrency: oneOf(['USD', 'CNY']), nativeMicros: amount,
  usdReservationMicros: amount, pricingVersion: metadata, fxVersion: nullableMetadata };
const usageShape = Object.fromEntries(['inputTokens', 'completionTokens', 'totalTokens', 'reasoningTokens', 'cachedReadTokens', 'cacheCreateTokens'].map(key => [key, integer]));
const windowShape = { version: value => value === 1, timeZone: metadata, dayId: metadata,
  windowId: metadata, endsAt: timestamp, nextEligibilityAt: timestamp };

export class PostgresLedgerError extends Error {
  constructor(code) { super(code); this.name = 'PostgresLedgerError'; this.code = code; }
}
const fail = code => { throw new PostgresLedgerError(code); };
function object(value, shape, optional = {}) {
  if (!value || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).some(key => typeof key !== 'string' || !(Object.hasOwn(shape, key) || Object.hasOwn(optional, key))) ||
      Object.keys(shape).some(key => !Object.hasOwn(value, key))) fail('BUDGET_SNAPSHOT_INVALID');
  for (const [key, check] of Object.entries({ ...shape, ...optional })) {
    if (Object.hasOwn(value, key)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || !check(descriptor.value)) fail('BUDGET_SNAPSHOT_INVALID');
    }
  }
  return true;
}
const shaped = shape => value => object(value, shape);
function list(value, limit, check) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > limit || Reflect.ownKeys(value).length !== length + 1) return false;
  for (let index = 0; index < length; index++) {
    const item = Object.getOwnPropertyDescriptor(value, index);
    if (!item || !item.enumerable || !Object.hasOwn(item, 'value') || !check(item.value)) return false;
  }
  return true;
}
// Serialize validated data descriptors directly. JSON.stringify on a DTO would
// look up inherited toJSON hooks, even after its own fields were validated.
function encodeData(value, spaced = false) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    const parts = [];
    for (let index = 0; index < descriptors.length.value; index++) parts.push(encodeData(descriptors[index].value, spaced));
    return '[' + parts.join(spaced ? ', ' : ',') + ']';
  }
  return '{' + Object.keys(descriptors).filter(key => descriptors[key].value !== undefined)
    .map(key => JSON.stringify(key) + (spaced ? ': ' : ':') + encodeData(descriptors[key].value, spaced)).join(spaced ? ', ' : ',') + '}';
}
const pricing = value => object(value, {
  book: book => object(book, {
    route: shaped(routeShape),
    rates: shaped(Object.fromEntries(['standardInput', 'cachedReadInput', 'cacheCreateInput', 'completion'].map(key => [key, amount]))),
    effectiveAt: timestamp, verifiedAt: timestamp, expiresAt: timestamp,
    source: value => typeof value === 'string' && value.length > 0 && value.length <= 2048 && value.isWellFormed() && !/[\u0000-\u001f\u007f]/u.test(value),
    verified: value => value === true,
    inputBand: shaped({ minInclusive: integer, maxInclusive: integer }),
  }),
  route: shaped(routeShape), now: timestamp,
}, {
  fx: fx => fx === undefined || fx === null || object(fx, { version: metadata, verified: value => value === true,
    observedAt: timestamp, expiresAt: timestamp,
    source: value => typeof value === 'string' && value.length > 0 && value.length <= 2048 && value.isWellFormed() && !/[\u0000-\u001f\u007f]/u.test(value),
    cnyMicrosPerUsd: amount, reservationCnyMicrosPerUsd: amount }),
});
const settlement = value => object(value, {
  receiptId: metadata, operationId: metadata, outcome: oneOf(['UNKNOWN', 'FAILED', 'VALIDATED', 'COMMITTED']),
  usage: value => value === null || object(value, usageShape),
  pricingVersion: metadata, fxVersion: nullableMetadata, nativeCurrency: oneOf(['USD', 'CNY']),
  nativeMicros: nullableAmount, usdMicros: nullableAmount,
  committedChildren: value => list(value, 4, shaped({ operationId: metadata, receiptId: metadata })),
});
const row = value => object(value, {
  request: shaped(requestShape), state: oneOf(['RESERVED', 'DISPATCHED', 'OUTCOME_UNKNOWN', 'SETTLED', 'CANCELLED_BEFORE_DISPATCH']),
  reservedAt: timestamp, reservationMicros: amount, quote: shaped(quoteShape), pricing,
}, {
  window: shaped(windowShape), settlement, unknownReceipt: settlement, resultCommitted: boolean,
  resultCommittedAt: timestamp, resultDayId: metadata, resultTimeZone: metadata,
  dispatchedAt: timestamp, dispatchedDayId: metadata, dispatchedTimeZone: metadata, settledAt: timestamp,
});

// Exact metadata allowlists: never persist request/response bodies, arbitrary
// error strings or credentials. Size/row limits stop admission; no pruning or
// expiry of operation tombstones, dispatched attempts, or unknown holds occurs.
export function encodeSnapshot(value) {
  object(value, { version: value => value === 1, lastNow: timestamp,
    rows: rows => list(rows, MAX_ROWS, row),
  }, { windowPolicyVersion: value => value === 1 });
  // The original owner may retain an undefined optional fx for USD. JSON omits
  // that property; no financial information or known currency is discarded.
  const json = encodeData(value);
  // jsonb::text includes separator spaces; enforce the SAME 16 MiB SQL cap.
  if (Buffer.byteLength(encodeData(value, true), 'utf8') > MAX_SNAPSHOT_BYTES) fail('BUDGET_SNAPSHOT_CAPACITY');
  return json;
}

// Reserve future lifecycle capacity before admitting a NEW operation. A lone
// surrogate costs six JSON bytes per UTF-16 unit, a deliberately pessimistic
// upper bound even though actual metadata must be well-formed Unicode. Include UNKNOWN and final receipts simultaneously, all four
// committed child bindings, and the largest timing/result fields. No future
// fields are persisted here; this is only a conservative byte upper bound.
const MAX_NUMBER = Number.MAX_SAFE_INTEGER;
const MAX_METADATA = '\ud800'.repeat(200);
function futureRowBytes(value) {
  const unknown = { receiptId: MAX_METADATA, operationId: value.request.operationId,
    outcome: 'UNKNOWN', usage: null, pricingVersion: value.quote.pricingVersion,
    fxVersion: value.quote.fxVersion, nativeCurrency: value.quote.nativeCurrency,
    nativeMicros: null, usdMicros: null, committedChildren: [] };
  const final = { ...unknown, outcome: 'COMMITTED',
    usage: Object.fromEntries(Object.keys(usageShape).map(key => [key, MAX_NUMBER])),
    nativeMicros: MAX_NUMBER, usdMicros: MAX_NUMBER,
    committedChildren: Array.from({ length: 4 }, () => ({ operationId: MAX_METADATA, receiptId: MAX_METADATA })) };
  const larger = (prior, bound) => prior !== undefined && Buffer.byteLength(encodeData(prior, true), 'utf8') > Buffer.byteLength(encodeData(bound, true), 'utf8') ? prior : bound;
  const future = { ...value, state: 'CANCELLED_BEFORE_DISPATCH',
    dispatchedAt: MAX_NUMBER, dispatchedDayId: MAX_METADATA, dispatchedTimeZone: MAX_METADATA,
    settledAt: MAX_NUMBER, resultCommitted: false, resultCommittedAt: MAX_NUMBER,
    resultDayId: MAX_METADATA, resultTimeZone: MAX_METADATA,
    unknownReceipt: larger(value.unknownReceipt, unknown), settlement: larger(value.settlement, final) };
  return Buffer.byteLength(encodeData(future, true), 'utf8');
}
function recoveryFootprint(value, bytes) {
  let reserved = bytes + String(MAX_NUMBER).length - String(value.lastNow).length;
  for (const entry of value.rows) {
    if (!['SETTLED', 'CANCELLED_BEFORE_DISPATCH'].includes(entry.state)) {
      reserved += Math.max(0, futureRowBytes(entry) - Buffer.byteLength(encodeData(entry, true), 'utf8'));
    }
  }
  return reserved;
}
// Pure size qualification helper. Does not create a reservation or authority.
export function recoveryCapacityBytes(value) {
  const encoded = encodeSnapshot(value);
  return recoveryFootprint(JSON.parse(encoded), Buffer.byteLength(encodeData(value, true), 'utf8'));
}

const SETTINGS_SQL = `SELECT set_config('search_path', 'pg_catalog', true),
  set_config('lock_timeout', $1, true), set_config('statement_timeout', $2, true),
  set_config('idle_in_transaction_session_timeout', $2, true),
  set_config('synchronous_commit', 'on', true)`;
const ACCESS_SQL = `SELECT c.relrowsecurity, c.relforcerowsecurity,
  r.rolsuper, r.rolbypassrls, c.relowner = r.oid AS is_owner
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_roles r ON r.rolname = current_user
  WHERE n.nspname = 'paia_ai_private' AND c.relname = 'budget_snapshot' AND c.relkind = 'r'`;
const LOCK_SQL = `SELECT schema_version, snapshot FROM ${TABLE} WHERE ledger_key = $1 FOR UPDATE`;
// The guarded path records database publication time in the same atomic UPDATE.
// The authority rows stay locked through COMMIT; the returned receipt still
// cannot authorize dispatch if COMMIT acknowledgement arrives after expiry.
const GUARDED_WRITE_SQL = `WITH publication AS MATERIALIZED (
  SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS millis
) UPDATE ${TABLE} SET snapshot = jsonb_set($1::jsonb, '{lastNow}', to_jsonb(publication.millis)),
  updated_at = clock_timestamp() FROM publication
  WHERE ledger_key = $2 AND schema_version = $3
  AND publication.millis >= $4::bigint AND publication.millis < $5::bigint`;
const WRITE_SQL = `UPDATE ${TABLE} SET snapshot = $1::jsonb, updated_at = clock_timestamp()
  WHERE ledger_key = $2 AND schema_version = $3`;

export class PostgresLedgerStorage {
  #pool;
  #lockTimeoutMs;
  #statementTimeoutMs;
  constructor({ pool, lockTimeoutMs = 5000, statementTimeoutMs = 15000 } = {}) {
    if (!(pool instanceof Pool)) fail('POSTGRES_POOL_REQUIRED');
    if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 1 || lockTimeoutMs > 30000 ||
        !Number.isSafeInteger(statementTimeoutMs) || statementTimeoutMs <= lockTimeoutMs || statementTimeoutMs > 60000) fail('POSTGRES_CONFIG_INVALID');
    this.#pool = pool;
    this.#lockTimeoutMs = lockTimeoutMs;
    this.#statementTimeoutMs = statementTimeoutMs;
  }
  // Invoke before serving traffic. Each transaction repeats the guard so a
  // warm process cannot continue after an incompatible schema/role change.
  async checkReady() { await this.transact(async () => undefined); }
  async transact(callback, publicationGuard = null) {
    if (typeof callback !== 'function') fail('POSTGRES_CALLBACK_REQUIRED');
    if (publicationGuard !== null && (!publicationGuard || typeof publicationGuard.lock !== 'function' ||
        typeof publicationGuard.beforePublish !== 'function')) fail('POSTGRES_AUTHORITY_REQUIRED');
    let client, began = false, commitStarted = false, discard = false;
    try { client = await this.#pool.connect(); } catch { fail('POSTGRES_UNAVAILABLE'); }
    // Handle checked-out socket errors without leaking raw DB/connection data.
    // A connection failure is never a reason to replay the callback.
    const onError = () => { discard = true; };
    client.on('error', onError);
    let open = false;
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      began = true;
      await client.query(SETTINGS_SQL, [`${this.#lockTimeoutMs}ms`, `${this.#statementTimeoutMs}ms`]);
      // Always the SAME key for ALL service instances/principals. The migration
      // creates it exactly once. Missing data is never silently initialized.
      const locked = await client.query(LOCK_SQL, [LEDGER_KEY]);
      // The row-lock statement also pins the relation against conflicting DDL.
      // Inspect RLS/ownership only while that relation lock is held.
      const access = await client.query(ACCESS_SQL);
      const role = access.rows[0];
      if (access.rows.length !== 1 || role.relrowsecurity !== true || role.relforcerowsecurity !== true ||
          role.rolsuper !== false || role.rolbypassrls !== false || role.is_owner !== false) fail('POSTGRES_UNSAFE_ROLE_OR_SCHEMA');
      if (locked.rows.length !== 1) fail('POSTGRES_LEDGER_MISSING');
      if (locked.rows[0].schema_version !== SCHEMA_VERSION) fail('POSTGRES_SCHEMA_VERSION');
      let pending = locked.rows[0].snapshot;
      if (pending !== null) pending = JSON.parse(encodeSnapshot(pending));
      const originalIds = new Set((pending?.rows ?? []).map(entry => entry.request.operationId));
      let changed = false, pendingJson, poisoned = false, poisonError;
      open = true;
      const assertOpen = key => {
        if (!open) fail('POSTGRES_TRANSACTION_CLOSED');
        if (key !== LEDGER_KEY) fail('POSTGRES_LEDGER_KEY');
      };
      const operation = (key, action) => {
        if (!open) fail('POSTGRES_TRANSACTION_CLOSED');
        try { assertOpen(key); return action(); } catch (error) {
          // Poison synchronously, even if the caller ignores the rejected
          // Promise returned by get/put. No earlier valid put may commit.
          poisoned = true; poisonError = error; open = false; throw error;
        }
      };
      const transaction = Object.freeze({
        get: async key => operation(key, () => pending === null ? undefined : structuredClone(pending)),
        put: async (key, value) => operation(key, () => {
          const encoded = encodeSnapshot(value), next = JSON.parse(encoded);
          if (next.rows.some(entry => !originalIds.has(entry.request.operationId)) &&
              recoveryFootprint(next, Buffer.byteLength(encodeData(next, true), 'utf8')) > MAX_SNAPSHOT_BYTES) fail('BUDGET_SNAPSHOT_CAPACITY');
          // Existing-row lifecycle updates consume the already reserved space;
          // they are never asked to reserve that future capacity a second time.
          pendingJson = encoded; pending = next; changed = true;
        }),
      });
      let answer;
      try {
        // Guard comes only from the fixed service composition, not request data.
        const authority = publicationGuard ? await publicationGuard.lock(client) : undefined;
        answer = await callback(transaction, authority);
      } catch (error) {
        // Preserve the original owner's budget/identity/rebound error, without
        // trying the callback a second time.
        throw { callbackError: error };
      } finally { open = false; }
      if (poisoned) throw poisonError;
      if (changed) {
        let written;
        if (publicationGuard) {
          let bound;
          try { bound = await publicationGuard.beforePublish(client); } catch (error) { throw { callbackError: error }; }
          if (!bound || !integer(bound.notBefore) || !integer(bound.expiresAt) ||
              bound.notBefore < pending.lastNow || bound.expiresAt <= bound.notBefore) fail('POSTGRES_AUTHORITY_EXPIRED');
          written = await client.query(GUARDED_WRITE_SQL, [pendingJson, LEDGER_KEY, SCHEMA_VERSION, bound.notBefore, bound.expiresAt]);
          if (written.rowCount !== 1) fail('POSTGRES_AUTHORITY_EXPIRED');
        } else {
          written = await client.query(WRITE_SQL, [pendingJson, LEDGER_KEY, SCHEMA_VERSION]);
          if (written.rowCount !== 1) fail('POSTGRES_WRITE_FAILED');
        }
      }
      commitStarted = true;
      await client.query('COMMIT');
      began = false;
      return answer;
    } catch (error) {
      open = false;
      if (commitStarted) {
        // COMMIT may have succeeded even when its acknowledgement was lost.
        // Destroy the connection; never rerun callback, refund, or dispatch.
        discard = true;
        fail('POSTGRES_COMMIT_OUTCOME_UNKNOWN');
      }
      if (began) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
      } else { discard = true; }
      if (error && Object.hasOwn(error, 'callbackError')) throw error.callbackError;
      if (error instanceof PostgresLedgerError) throw error;
      fail('POSTGRES_TRANSACTION_FAILED');
    } finally {
      client.removeListener('error', onError);
      client.release(discard);
    }
  }
}
