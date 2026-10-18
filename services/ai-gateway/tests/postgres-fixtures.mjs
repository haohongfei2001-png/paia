import { BudgetWindowReservation } from '../../../extension/core/ai-usage/budget-window-reservation.js';
import { ROUTE_FIELDS } from '../../../extension/core/ai-usage/ratebook.js';

// Synthetic authority is confined to test helpers. Real database tests prove
// storage/locking, not service identity, entitlement, dispatch, or live billing.
export const NOW = Date.UTC(2026, 0, 1);
export const request = (id, patch = {}) => ({ operationId: id, jobId: `job-${id}`,
  principalId: 'SYNTHETIC-principal', libraryId: 'SYNTHETIC-library', scopeFingerprint: 'SYNTHETIC-scope',
  contractVersion: 'SYNTHETIC-contract', routeVersion: 'SYNTHETIC-route', consentEpoch: 'SYNTHETIC-consent',
  jobType: 'AI_ORGANIZE', childIndex: 0, childCount: 1, inputTokens: 1000,
  outputCap: 6000, maxCompletionTokens: 5990, ...patch });
export function ledger(storage, controls = {}) {
  const route = Object.fromEntries(ROUTE_FIELDS.map(key => [key, `SYNTHETIC_${key}`])); route.currency = 'USD';
  return new BudgetWindowReservation({ service: {
    transact: storage.transact.bind(storage), clock: () => controls.now ?? NOW,
    verifyRequest: async (request, now) => ({ authorized: true, verifiedServiceFacts: true,
      request, tier: 'free', timeZone: 'UTC', routeQualified: true, thinkingBoundQualified: true,
      inputBoundQualified: true, global: { dayLimitMicros: 15000, monthLimitMicros: 15000 }, ...controls,
      route, book: { route, rates: { standardInput: 1000000, cachedReadInput: 1000000,
        cacheCreateInput: 1000000, completion: 1000000 }, effectiveAt: 0, verifiedAt: now,
        expiresAt: now + 1000, source: 'SYNTHETIC tariff', verified: true,
        inputBand: { minInclusive: 0, maxInclusive: 16000 } } }),
    verifySettlement: async (request, evidence) => ({ verifiedSettlementFacts: true, request, evidence }),
  } });
}
export const evidence = (r, outcome = 'FAILED') => ({ receiptId: `receipt-${r.operationId}`,
  operationId: r.operationId, outcome,
  usage: outcome === 'UNKNOWN' ? null : { inputTokens: 1000, completionTokens: 1000,
    totalTokens: 2000, reasoningTokens: 0, cachedReadTokens: 0, cacheCreateTokens: 0 },
  pricingVersion: 'SYNTHETIC_pricingVersion', fxVersion: null, nativeCurrency: 'USD',
  nativeMicros: outcome === 'UNKNOWN' ? null : 2000, usdMicros: outcome === 'UNKNOWN' ? null : 2000,
  committedChildren: outcome === 'COMMITTED' ? [{ operationId: r.operationId, receiptId: `receipt-${r.operationId}` }] : [],
});
