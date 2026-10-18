# Historical candidates: original worker-to-service development path

2026-10-18. Source implementation and focused synthetic integration evidence. Not installed, deployed, operationally qualified or whole-programme completion.

## Exact scope and dependencies

The independent branch starts at reviewed client `21d172fa41fa1ac5588c7bb60a031a3e37f03197`. Ordinary dependency merges retain the original result service `2bdaed82c0cb1ba24e1e2fc5124265583ff8e6f0` and operation-status successor `2f6be74c93232461d44a620f04d738849a8e0d0d` unchanged. The latter supersedes its original `0c31cec6ba1f0453d5fd13173102bf458402bc72` clock boundary. Independent integration review remains a separate gate.

Only the original historical-candidate session is connected. Foundation, Qwen owner, the other three sessions, service runtime, permissions, workflows, versions and global planning documents are not changed by this slice. Service-side additions are two owning test files, not another server implementation.

The original worker now calls `createConfiguredHistoricalCandidateSession(store)`. Its packaged source configuration is deliberately null. Without actual identity/proof, processing-permission, profile and tokenizer modules, the existing Prompt Reuse action reports `available:false`, sends nothing and retains local search/manual prompts. This is a reachable source composition, not a claim that missing operational modules are implemented. No browser login, local Pro value, legacy key or storage-provider credential establishes AI-service authority. No account, subscription, provider, spending, host permission or deployment is activated.

## One original vertical path

The original “为当前任务选择历史候选” refresh/adopt owner reaches HistoricalCandidateSession. After its existing evidence/permission/Source/currentness checks and original Foundation plan, a configured client:

1. Measures the exact bounded Qwen wire through the configured tokenizer. The original Qwen owner independently reconstructs and verifies that digest, count, profile and content authorization.
2. Publishes its original content declaration using request-bound signed principal/entitlement proofs, then reserves through the original same-origin fixed `/api/reservations` transport.
3. Queries fixed `/api/operation-status` for the original ledger's complete RESERVED projection. A thin reserve ACK, missing row, existing event, cloned observation or caller callback cannot substitute for that row. `observedAt` is a locked point-in-time read, not a lease; the server's final claim still verifies current signed authority and the original financial state.
4. Gives the original privately branded Qwen provider to Foundation.reserveServer/dispatch. No wrapping callback fabricates a financial receipt. The existing physical deadline, persisted dispatch marker and unknown-outcome rules remain.
5. Validates returned IDs/DEFER with the original historical validator, then commits only through original commitHistoricalCandidates and its transaction/currentness checks. The operation receipt is the original observed financial receipt. Schema-valid invented IDs cannot commit.
6. Reports only after a genuine original historical domain commit, using original reportResult and `/api/results`. DEFER reports FAILED/zero effective results. A lost result ACK keeps the original metadata event; an explicit subsequent refresh may replay that identical metadata, including after restart, without a body or another provider call.

Known spend survives revoked permission, closed source, domain-validation failure and local CAS rollback. Private candidates are never exposed on those failed paths. A retained valid response may retry its rolled-back local CAS; it does not re-enter the service/provider.

## Preflight anti-replay and limits

The original `aiu:dispatched` marker is created only inside dispatch. Writing it before declaration/reservation would make reserveServer reject the first legitimate attempt, and original PLANNED flight cancellation does not prove whether a remote reserve ACK was lost.

A single body-free original-meta preflight row therefore stores only version, jobId, childId, evaluationKey and origin before the first declaration send. It contains no prompt, token, price, usage, new operation or financial assertion. It is not cleared by a timeout, local cancel, permission loss, query change, close or restart. The same operation cannot repeat declaration/reservation from a fresh worker. A different evaluation can replace the row only when the original job has a real terminal domain event and original server-backed settled evidence or financialCancellation. Successful execution retains the original job/dispatch anti-replay guards.

When source closure wins before physical dispatch and the original cancellation handle remains available, original cancelServer obtains the server's exact cancellation ACK and records financialCancellation before a new query is admitted. Local-only cancellation cannot erase an unknown remote hold. Missing/expired authority or a lost reserve/provider ACK stays conservatively blocked; this slice does not invent a release or replay permission. Its operation-status integration consumes the RESERVED view for initial binding, not a new recovery writer for a cold client's later UNKNOWN financial row. That later recovery/cancellation must preserve the original operation and requires an independently qualified original-owner integration. No derivative body is persisted for restart recovery.

## Focused evidence

Initial RED: the original-worker configuration test failed with ERR_MODULE_NOT_FOUND before the source composition existed. No production guards, bounds or timeout were changed to pass tests.

Node v24.19.0 local development run:

```
node --test \
  services/ai-gateway/tests/historical-client-path.test.mjs \
  extension/tests/client-operation-status-transport.test.mjs \
  extension/tests/historical-service-configuration.test.mjs \
  extension/tests/historical-service-write-fence.test.mjs \
  extension/tests/nib-v4-historical-candidates-owner.test.mjs \
  extension/tests/qwen-foundation-service-result.test.mjs
```

Initial candidate `97b7362ec1bbb7af6468871009c110eeb6a01a66` passed 68/68, but its independent review then found the two blocking cases below. The first repair `91179ae6593fc8e2006e0fd18e4950e16acfc41c` passed the then-five-file pack 74/74, but remained blocked by the subsequent local mutation race below. The current six-file pack passes 85/85: 19 real-path cases, five fixed-status transport cases, one default-source/worker test, eight original-repository refusal-fence cases and 52 existing historical/Qwen cases. Node syntax checks for the six changed/new runtime modules and `git diff --check` pass.

The new end-to-end tests use the original HTTP handlers, genuine ephemeral RS256 principal/Pro entitlement signatures, original declaration publisher, provider runner, financial ledger/usage settlement, result service and domain/CAS owners. Only external HTTPS completion and SQL protocol storage are synthetic. Two existing SQL protocol simulators mirror the actual signed publisher's committed rows; this is not real PostgreSQL role/lock/clock evidence. No financial receipt is fabricated in the client fixture. Ordinary extension tests do not import pg or require a new extension dependency; the real-path fixture belongs to the gateway test suite.

Coverage includes exact candidate adoption with protected manual content; domain DEFER/zero results; post-settlement permission/source loss; reserve ACK loss and cold restart; local-only cancellation refusal; provider ACK loss and original UNKNOWN; exact metadata-only result replay; genuine CAS rollback; unknown IDs; missing modules/forged proof strings; proven pre-dispatch cancellation and a new admitted query; pending-physical permission withdrawal and ignored late private output.

NOT_RUN here: broad Full/Unit campaign, local Chrome, native browser/release visuals, real PostgreSQL for this new client composition, cloud Node22 run, live tokenizer/profile/identity/provider qualification, remote CI writes, build installation and deployment. Existing server-only PostgreSQL evidence belongs to its exact separate service commits and is not relabeled as client-path acceptance.

## Independent-review repair

The original independent negative file first reproduced both failures against `97b7362e`: a closed Source after the real DISPATCHED write still reached the provider, and a malformed RESERVED financial projection received the private observation brand. That candidate was blocked despite its original 68 passing tests.

The repair keeps the original Qwen provider and transport brands. The configured provider fetch capability now re-enters the original historical session qualification after the DISPATCHED transaction, then calls the original Source assertion after all domain reads. After that final asynchronous assertion, the original synchronous Qwen current binding checks profile, tokenizer, session permission/invalidation and retirement; no await separates that fence from configured fetch. A refused send retains the original OUTCOME_UNKNOWN reservation fence, including across restart, rather than asserting a free cancellation. The existing proven earlier cancellation path remains covered.

Owning negative tests hold the last domain read while the Source closes and hold the last Source assertion while the original permission notification invalidates the session. Both, plus the original after-DISPATCHED boundary, prove zero provider transport calls, zero physical calls, no result report, retained remote RESERVED, retained local UNKNOWN and no cold replay. This uses the existing asynchronous Source assertion API; it does not invent a synchronous Chrome Source lease or claim to implement a missing cross-process notification owner.

The status decoder now validates exact nested window, reservation, quote/pricing/FX, full ledger financial evidence, unknown evidence and domain result structures, plus state/money/effective-result/request relationships, before assigning the observation brand. It reuses the original pure window, pricing, usage and result validators. Historical prices are checked at original reservedAt, not represented as current authorization. Single-field mutation negatives cover the independent malformed fields and nested extras, invalid usage, result receipt mismatches and impossible state combinations. An additional test consumes real signed original status HTTP handler results for NOT_FOUND, RESERVED, CANCELLED_BEFORE_DISPATCH and SETTLED with a separate committed domain result.

First-repair development evidence at `91179ae6`: the five-file owning pack was 74/74; adding the unchanged independent `/tmp/paia-historical-independent-negatives.test.mjs` gave 76/76, zero failures/skips. That did not cover the later committed Input-mutation failure and did not qualify that candidate. The independent test file is reviewer evidence, not a repository dependency or a changed test. These remain Node24 synthetic/protocol tests, not real PostgreSQL client-composition, Chrome, Full, installation or operational qualification. Default packaged configuration remains null and required product modules remain unimplemented/uninstalled.

## Local mutation linearization repair

The second independent negative, `/tmp/paia-historical-r2-working-fence.test.mjs`, stayed unchanged and reproduced a further P1 against `91179ae6`. While the last Source assertion waited, original inputEdit(excluded:true) committed a real semantic invalidation with cancelEpoch=1/OUTCOME_UNKNOWN. The old synchronous session-only predicate still allowed a provider send. This was a local committed-human-edit failure, not a cross-Chrome timing requirement.

The necessary narrow original-owner extension is in `idb-repository.js`. A private object-identity generation changes synchronously at entry to every original write transaction, before open or any await; a private active count remains nonzero until an outer finally covering open, native transaction creation, callback/finalizers, native completion and abort has unwound. Close also invalidates the generation. Observations are opaque, repository/database/factory/name-bound and refused during any active writer. A failed or rolled-back writer never revives old observations, while a fresh observation after all writers drain remains possible. No persistent schema, semantic row cache, receipt, quota, privilege or native-commit proof is added.

HistoricalCandidateSession captures this refusal token before its final local qualification reads. It never rearms it after those reads or the final Source await. At the physical-send boundary the existing synchronous Qwen binding is checked, followed by this same original repository token, then configured fetch with no intervening await. A completed or admitted local writer therefore wins against stale body egress. The current implementation routes all core readwrite transactions through that repository entry, including the original semantic finalizer and same-repository Sync coordinator; the token does not claim to observe writes through a different repository instance, worker or process. It is only an additional stale-observation refusal fence; original content and financial owners remain mandatory.

The existing control-publication token was not reused: it invalidates on every store.run, including the real Source's own readonly consent/status probe. The new write-only fence preserves that positive path. A test now invokes original PromptSurface RPC refresh/adopt and its real currentSelectionTarget/consent checks through the configured historical chain. Separate held-Source tests commit original Input exclusion and text edits and prove zero provider sends, zero physical calls, no result report and retained UNKNOWN/remote hold. No refusal automatically clears the existing financial fence or triggers another paid attempt. An unrelated/aborted write does not poison the repository owner forever, though an already-DISPATCHED attempt still retains its original conservative UNKNOWN until qualified recovery.

Current Node24 targeted evidence is 100/100, zero failures/skips: owning six-file pack 85, original named/same-transaction regression files 12, and the three unchanged independent negatives. The new lifecycle suite is `extension/tests/historical-service-write-fence.test.mjs`; it covers readonly compatibility, cloned/rebound observations, before-open admission, concurrent and nested writers, rollback, open/native-creation/callback/finalizer failure, close/reopen and fresh observations after drainage. This adds no cross-instance, native browser, Full or live-provider acceptance claim. Production configuration and the missing product modules remain unavailable as recorded above.
