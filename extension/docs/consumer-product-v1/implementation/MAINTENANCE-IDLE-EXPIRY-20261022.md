# Maintenance idle processing expiry — 2026-10-22

Continuation of PR313 from `39a090f20c833f86be53c75ad94bd69a2dddd346` in the existing isolated branch. This implements the idle-expiry reclamation gap explicitly retained in STATUS and the 2026-10-18 existing-Context checkpoint. It does not select a new lifecycle policy or activate a service.

The original session retained validated response/material after a local storage rollback and released it only on another access, explicit revocation or disposal. An original processing receipt now arms an idle deadline with its existing absolute expiry and a monotonic ceiling. Expiry follows the original denial/cleanup path, releasing Filter/Context/Topic material and qualifications. Completed/disposed work cancels its timer. Host listener-cleanup errors cannot escape through an abort event, and explicit disposal preserves its existing synchronous cleanup-error contract.

The expired session keeps its body-free job/attempt identity. It cannot create another physical request, change successful Topic ACKs, erase financial settlement, overwrite human material or turn failed Context into ACK. Original 4096/2MiB/30s Organize and 35s HTTP bounds are unchanged. The native test's three-second synthetic processing receipt is a fixture permission lifetime, not a changed production timeout.

Changed implementation/test paths:
- `extension/core/ai-usage/local-maintenance-session.js`
- `extension/tests/ai-maintenance-session-expiry-lifecycle.test.mjs`
- `extension/tests/cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs`

[Validation identity and raw digests](evidence/organize-20261022/expiry-validation.json), [actual native TAP](evidence/organize-20261022/expiry-native.tap), [full unit summary](evidence/organize-20261022/expiry-full-unit-summary.json) and [unresolved full-run failure](evidence/organize-20261022/expiry-full-unit-failure.txt) are retained.

Original strengthened expiry reproduction: 1/4 pass, 3 failures. Final changed lifecycle file: 5/5, including before-expiry retry, exact expiry, wall-clock rollback, revoke/dispose and completed-work preservation. The second related 305-case run passed 304 and failed only the newly added clock mock; the corrected lifecycle file passed 5/5. Those results are overlapping, not a relabeled 305/305 run.

Actual headless Chrome Source/release complete Maintenance file: 172/172, zero failures/skips. Both new cases use real IndexedDB, a genuine Context rollback, real elapsed receipt expiry and original listener-removal observation before another session call. Every durable table remains exact, Topic ACK remains one, Context ACK remains zero and physical attempts remain one. External and extension network requests are zero; synthetic local providers are not paid/model qualification.

The changed complete local Unit is **FAILED: 11669/11670**, zero skips. One original detached Section promotion stage-rollback/retry case raised `STALE_BASE` in its final fence. The unmodified file subsequently passed 89/89. Root cause is not established; the targeted pass does not erase the full failure. No threshold, assertion or production guard was weakened, and no unchanged full rerun is being used to seek green. Further targeted diagnosis and changed-head CI remain required.

Independent review is separately blocked by the GitHub Codex review quota. Its actual [quota response](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6333477394) is not a code-review approval or a concrete finding. No repeated review request, paid-plan change or approval bypass was attempted.

## Remaining executable scope audit

Current original Topic candidate accumulation, Section promotion bridge, Context status and non-ADD Context mappings already exist. They are not new work. Unsupported authored/Placement/manual/structural semantic facets retain explicit bounded DEFER through `unsupportedMaintenanceCoverage` and the original Foundation, not false ACK.

Cross-source existing-Item retrieval remains unimplemented: `selectMaintenanceExistingContext` requires full old evidence inside the selected processing scope. The plan states a bounded relevance/independent-old-evidence goal, but this branch has no adopted rule selecting unrelated source Items. Existing tests explicitly refuse partial old lineage and unselected siblings. The pending owner question asks for that boundary; no extra body read or whole-profile fallback has been introduced.

The partial-excerpt case still preserves its explicit original contract: an ungranted new Entry rolls back the joined Topic transaction and all current-child ACKs. The older plan also lists separate facet progress as an open goal. The pending owner question asks whether independent Topic commit with Context refusal is the intended successor contract; current refusal assertions remain intact.

The three previously identified decisions remain: candidate-to-current-reading entry/replacement semantics; automatic Topic lifecycle trigger/policy/issuer; real service identity, qualified route and quota resources. Do not activate models, credentials or production while resolving these. Full certification/exact-main, 2MiB native end-to-end stress, human visual/device acceptance and real provider/SQL qualification remain unclaimed. Dot owns PR312, version/release and merging.

## Original Organize native read-bound successor

Maintenance runtime checkpoint is `aee34ec213c8b06baea3f3adeff48beb21d8e5e7`. The following separate test-only checkpoint adds `services/ai-gateway/tests/organize-source-native-budget.test.mjs` and an opt-in static observation import in the existing native fixture. Production resources are unchanged.

[Final actual native TAP](evidence/organize-20261022/native-budget-final.tap): Source/release 2/2. Each variant consumes a selection bound to the genuine Chrome sender, performs 4096 real metadata IndexedDB requests through the original action/scope owners, refuses the next request with BUDGET_EXCEEDED, and proves sticky action invalidation, zero jobs/candidate/ACK and zero provider/network requests. This is a direct original-owner budget check, not another full UI generation journey. The preceding 22-case native UI/worker evidence remains separate.

The exploratory 20-Entry probe also reached the read bound before the byte bound. It is not evidence of a 2MiB extreme test. Initial probe setup attempts had a relative import error and a Chrome-disallowed dynamic worker import; the checked-in fixture uses static observation imports only. No production import mechanism, safety parameter or limit was changed.

## Later owner resolution

The owner directed cross-source Context to retain its existing scope pending dot's rules, and explicitly authorized independent Topic progress under the existing AI Usage contract. [The implemented successor](MAINTENANCE-PARTIAL-TOPIC-20261022.md) preserves the joint safety checks, proves Context refusal without new field reads/ACK, and records184/184 native and11670/11670 complete Unit results. It also supplies separate native2MiB evidence. The preceding questions, failures and unverified states remain historical records, not current contradictory instructions.
