# AI-COST-03 — Pro Filter source authority and existing details consent

Date: 2026-10-18. Local implementation candidate; final combined verification and assembly are recorded below. This does not qualify a model, activate a service, or establish native/visual or whole-programme acceptance.

## Authority and scope

This implements the independently approved AI_USAGE_ARCHITECTURE §6 / AI_USAGE_PLAN Filter facet through the original Maintenance, Smart Filter, processing and financial owners. The original 8-candidate / 2-neighbor limits, protected-input rules, whole-child coverage and one existing physical request remain. There is no fourth model pipeline, extra status query, permission inferred from local tier, assistant-history access, deletion or new Sync scope.

The four frozen P1 response-mapping paths are untouched by this lane. `maintenance-service-client.js` and the exact original status protocol were separately reopened for this source binding. Shared Foundation, session, original Filter owner and Repository changes are owned by the collaborating original-owner lane, not duplicated here.

## Independent consent and existing UI

- `background/ai-filter-consent.js` owns two separate default-off choices: Filter opt-in and remote processing. Session-only storage uses an exact versioned record and independent generation. Private receipts revoke before asynchronous writes, compare the stored prior/readback, and fail closed on external changes, main consent loss, races and failed writes. An old failed-disable record cannot silently revive authority.
- `background/ai-filter-commands.js` accepts only the existing trusted Archive details sender and exact commands. There is no caller-supplied tier, identity or qualification. Runtime phases distinguish off, waiting for remote permission, waiting for verified qualification, and currently available.
- `ui/smart-filter.js` adds the two controls inside the existing recent-filter details dialog, with explicit remote disclosure/confirmation and reconciliation after failed saves. The original light/off control is unchanged. English/Chinese text explicitly limits these choices to the current browser session. No new Settings row or page is introduced.
- The local DOM/command tests are behavior evidence, not screenshot or native visual acceptance. Actual Chrome access remains subject to the existing environment permission blocker; no alternate browser route was used to bypass it.

## Bounded selection and field authority

`ai-filter-scope.js` reads metadata only, directly through the original readonly Repository scope; cold selection does not initialize the Store or acquire bodies. It requires the exact complete child Filter candidate set, at most 8, and chooses at most 2 already-granted child neighbors with original same-document/position/presence protections. More than 8 candidates is unavailable rather than truncating coverage. No ambient Input is discovered or newly granted.

After the original authenticated reservation and metadata-only selection, the session obtains a second original processing receipt before Filter text reads:

```
{
  purpose: 'ai-maintenance-filter-qualification',
  logicalJobId, childOperationId, principalId, libraryId, consentEpoch,
  candidateIds, neighborIds,
  inputs: [{inputId, selectedFields: ['body', 'note']}],
  facets: ['filter'], coverage: exactChildFilterUnits
}
```

Only the selected candidate/neighbor union is included, sorted and bounded. The original owner needs `note` to preserve human-authored content; this does not add note to the model payload. The existing body-only remote DTO and base processing receipt are unchanged. Both receipts' scope, epoch/currentness, expiry and revocation remain necessary for write authority and retained visibility. Denied/body-only/extra-Input/wrong-child qualification yields explicit Filter DEFER with no Filter owner preparation or ACK.

## Real source identity chain

`operation-status-service.mjs` optionally adds `authenticatedIdentity` only from the original signature verifier's current identity, inside the same original locked RESERVED/no-provider-event observation, with enabled/unexpired service control. It binds principal, library, operation, job type, tier, principal/entitlement/service generations, observed time, bounded verified-until and exact original request hash. The financial flags and original hold/release rules do not change. Disabled/expired historical queries remain financial observations with no Filter identity. Legacy responses without the new identity remain valid financial observations but cannot authorize Filter.

`client-operation-status-transport.js` validates that exact shape and reservation window and retains identity only in its original fixed-HTTPS transport's private observation map. DTO copies, another transport or a different request cannot mint authority. The existing qualified request owner still makes its original two status checks; Filter adds zero queries.

`maintenance-identity-currentness.js` is a source-owned neutral currentness owner, default disconnected. It needs an explicitly configured trusted connection and original private transport observation. Every query starts with an unforgeable connection-epoch ticket, bound inside the actual transport observation. A held or never-observed old response cannot cross disconnect/reconnect or borrow a fresh ticket. Tickets are one-use and released on failure/unknown/malformed/no-identity results. Expiry, clock rollback, disconnection, account/generation change and delivered revocation retire prior identities; no reconnect renews old capabilities. Pending observations, operation leases and revocation tombstones are bounded.

The browser does not import the Node signing verifier. A local `tier`, a generic callback DTO, copied identity or opt-in cannot replace the original authenticated reservation. The capability is minted only after the original local server-backed receipt exists and is bound to the exact child, request, original Pro reservation, profile/policy receipt, both processing scopes and independent consent generation.

## Original mutation, exact ACK and visibility

`ai-filter-authority.js` supplies only the original Filter constructor interface. It checks the private source capability, original server-backed ledger receipt, exact scope and a policy qualification reference present in the original qualified request profile. A label alone is insufficient. Original prepare/commit enforce all candidate, neighbor, attachment/reference, edit/keep/restore and final-facts protections.

A committed owner token alone is insufficient for source visibility. The source client requires the separate original Foundation settlement capability, privately minted only after the same transaction has completed its owner final fence and exact Filter ACK. It binds the exact Foundation/Repository transaction, job, child, units, outcome and owner token; the original Repository must have succeeded and unwound. The client then independently rereads original current authority, exact committed coverage, actual child financial receipt and matching ACK rows, and the exact current Filter operation/decision. Capability currentness is checked again after awaits. An older genuine ACK cannot authorize a new independent original-owner token.

Only after successful publication is a bounded body-free read-visibility lease retained. It cannot resolve write authority or prepare another operation. The original hidden/read path still checks the full original proof and protection guards. Completed Filter write capabilities are released immediately even when another facet remains pending; body-bearing preparation closures and private maps are cleared. Storage failure before joined ACK retains the same validated response and original write handle for a local retry, without a new provider call. Lost local returns after genuine ACK use the original pending token and settlement evidence, not an after-write scope refresh.

Visibility is deliberately bounded by the original identity/profile/measurement and both processing receipts. Unknown/expired/revoked consent or identity reveals the Input, and no automatic renewal or network request occurs. This safety behavior is not a claim of persistent production Pro filtering.

## Important remaining combination boundary

If Context storage fails but Filter subsequently commits FILTER for an Input needed by that Context group, the original Context owner now correctly finds its evidence ineligible. Retrying does not refresh the sent scope or bypass the newly filtered state: zero Context ACK and one paid call remain. This is a pending composition limitation for the later semantic matrix, not a repaired success path. The paired KEEP case proves genuine validated-response Context storage retry can still complete locally with the original exact ACK and no second paid call. Both tests preserve Source and human Input state.

## Verification and preserved failures

All evidence here uses local Node 24, synthetic signed fixtures, simulated SQL/HTTPS and fake IndexedDB. No live provider, PostgreSQL deployment, bill, credential, install or paid execution was used.

Preserved genuine RED logs:
- `/tmp/paia-filter-reconnect-red.tap`: held and never-observed status response crossed reconnect.
- `/tmp/paia-filter-noack-red.tap`: a completed original owner token with a live cap but zero Foundation ACK incorrectly published visibility.
- `/tmp/paia-filter-oldack-newtoken-red.tap`: a different later original-owner operation borrowed an older real ACK.
- `/tmp/paia-filter-partial-retry.tap`: the earlier Context retry-success oracle failed after FILTER. The restriction is retained explicitly above, with a separate KEEP success case.

Focused successor evidence:
- Original status service/entry: 33 tests.
- New consent/selector: 17; command/details UI: 9; signed identity/currentness: 20; source authority/qualification: 38.
- `/tmp/paia-filter-attestation-focused.tap`: 8 exact source combinations passed, including both ACK-boundary negatives, actual lost-return ACK, paired Context outcomes, Source budget and publication-time revoke.
- `/tmp/paia-filter-field-source.tap`: 7 qualification and old-ACK/foreign-token cases passed. The foreign-token test supplies the genuine earlier Foundation attestation, not merely a missing token.
- `/tmp/paia-pro-filter-owner-source-final.tap`: 84 tests passed before the final private-capability reclamation refinement; that refinement is included in the final coherent run below.

Final coherent result: **304/304 PASS**, zero failures, skips or cancellations, in 39,437.569769 ms. Log: `/tmp/paia-pro-filter-final304.tap`. The 20-file before/after SHA256 manifests are identical (`/tmp/paia-pro-filter-final-before.sha256`, `/tmp/paia-pro-filter-final-after.sha256`). This run includes the original P1 187 unchanged tests, original status service/entry 33, and this lane's 84. It loads the final original-owner Source projection and same-transaction Foundation settlement capability. The earlier 304 run remains a separate intermediate identity.

```
node --test \
  extension/tests/maintenance-service-response-adapter.test.mjs \
  services/ai-gateway/tests/maintenance-client-path.test.mjs \
  services/ai-gateway/tests/maintenance-client-recovery.test.mjs \
  services/ai-gateway/tests/maintenance-source-response-path.test.mjs \
  extension/tests/ai-filter-consent-scope.test.mjs \
  extension/tests/ai-filter-command-ui.test.mjs \
  services/ai-gateway/tests/maintenance-filter-identity.test.mjs \
  services/ai-gateway/tests/maintenance-filter-authority-path.test.mjs \
  services/ai-gateway/tests/operation-status.test.mjs \
  services/ai-gateway/tests/operation-status-entry.test.mjs
```

The independent frozen snapshot contains all 16 owned code/test/fixture paths and this receipt, exact final shared runtime dependency bytes/hashes (whole Foundation, session, original Filter owner and Repository), and the preserved RED/final PASS logs. This is a recoverable local handoff, not a remote commit or native acceptance.

## Assembly contract and honest deployment gaps

The worker's single-writer assembly uses `createAIFilterRuntime(api,{getStore,policy})`, passes its `authority` to the original Store constructor, routes only the exact existing-details commands, and supplies `serviceFilter` to an actually configured Maintenance service. `policy` remains null until real policy qualification exists. No default remote service is created.

A configured service can use the branded `createMaintenanceIdentityCurrentness` owner and the actual original status/reservation chain. The neutral connection and generation owner are implemented, but no production identity/purchase provider, trusted notification/connection instance, issuer configuration or current account integration is selected or active. The current configuration remains default-null. Synthetic fixtures with a live callback and `SYNTHETIC_NOT_PRODUCTION_QUALIFICATION` are protocol tests only, not that missing production channel or real model false-positive acceptance. Persistent identity renewal and service/model/financial acceptance remain separate gates. Parent-owned worker assembly, current native/visual CI and exact integrated acceptance must be recorded separately.
