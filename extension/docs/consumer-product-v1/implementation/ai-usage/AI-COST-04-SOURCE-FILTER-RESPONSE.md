# AI-COST-04 source-owned Filter response mapping

Date: 2026-10-18. Initial base: `f004afa3b714be678c511e095b417117a9a181f0`. Filter implementation: `8192b54c`. Final tested composition: `57c91769d7f6fa5987da5aa9f1a2df99e28995b5`, incorporating original Context final-settlement successor `29cf75b9f393b0ffa8311bc88cd19f66f353a66f` by ordinary merge.

Status: finite local implementation, independent review pending. The initial base's late Context-settlement review failure remains historical failure; this receipt does not accept it. No remote write, activation, live provider call, PostgreSQL qualification, installation, release or whole-product completion is claimed.

## Original plan and exact owner boundary

This closes the original AI_USAGE_ARCHITECTURE section 6 / AI_USAGE_PLAN sections 5–6 structured-source Filter gap. The configured service previously required an injected `responseAdapter.filter`, even though its original Filter snapshot, authority, signed Pro reservation and final transaction were implemented. The configured client can now omit the entire response adapter and use the source-owned Filter interpretation on the same paid child as ordinary Topic and Context ADD.

The original ordinary source response schema and instruction export remain unchanged. A separate, closed Filter-enabled schema adds only a bounded `filter` array of `{inputId, decision}` records, where decision is FILTER, KEEP or INSUFFICIENT. The original qualified request/profile digest and actual service response validator enforce that schema; no JSON-in-string interpreter, alternate financial owner or new request family is introduced. The separate instruction export limits decisions to selected candidates and authorized user-text neighbors, preserves substantive literal content and makes uncertainty KEEP/INSUFFICIENT.

The only additional LocalMaintenanceSession seams are:
- After successful original `prepareAIMaintenanceFilter`, append body-free candidate/neighbor IDs to `material.filter`. These IDs must already belong to that child's granted material; no neighboring body is fetched or appended. The private original handle retains its same selection on retry, without rerunning qualification. Both original `maxContentBytes` and `maxRequestBytes` ceilings are reapplied before assigning the descriptor and before declaration/tokenization. If the optional descriptor cannot fit, the handle is released, Filter remains pending and the originally bounded Topic/Context packet may continue.
- Pass the already-captured original Filter snapshot in the local Filter decode metadata. This snapshot never enters the provider packet. Source binding uses the original bounded Store snapshot read and rejects any mismatch against the original session snapshot, input identity, child coverage and response/receipt identity.

The source owner permits the closed Filter profile's ordinary Input Topic+Context coverage plus only the exact subset of original Input Filter units. Original Topic assessment and Context ADD lineage guards are unchanged. Response digests bind all decoded facets to the same child response and original receipt. The adapter does not allocate a Filter operation, grant opt-in, mint Pro entitlement, change the decision policy, write visibility or ACK coverage.

Original positive Filter authority, candidate/neighbor proof, human keep/edit/restore, presence, reading snapshot, Source/removal/currentness and final transaction remain authoritative. The signed reservation still refuses any Filter dispatch under Free, even if local fixture booleans say Pro. Filter-only missing work creates no new opportunity or separate call. Empty/missing/foreign/duplicate Filter output does not fabricate completion. The original two-child cycle and 2,000-token output cap remain unchanged.

## Owning RED → GREEN

The first runnable configured source-profile test, with no supplied response adapter, returned UNAVAILABLE instead of COMMITTED and no domain facets. The initial dependency-directory absence was resolved using the existing local service dependencies; that import error is not the behavioral RED.

After the source schema/adapter was added but before the approved scope descriptor seam, the same test reached Topic and Context commits but Filter remained STALE_BASE. It was not counted as success. With the original selected scope and snapshot bound, the exact test commits Topic, Context and positive Filter with one synthetic HTTPS completion and five exact acknowledged units.

The new owning suite contains 39 checks:
- Same-child configured source positive path without fixture adapter, KEEP and INSUFFICIENT.
- Signed Free refusal, missing original authority, missing/outside/candidate-as-neighbor scope, opt-out, processing denial and local downgrade.
- Closed-schema extras/unknown decisions/missing Filter field, substituted child/job, missing/duplicate/foreign coverage and exact original-snapshot mismatch.
- Late keep, edit, restore, neighbor edit, off/on, entitlement and processing revocation after Context commit.
- Original Filter metadata/ACK/usage/job transaction rollback with same-response retry; revocation after staged exact ACK.
- Current Input/Source byte preservation, active reading snapshot preservation, filtered-search discovery, body-free result reporting, no-delta and filter-only zero new dispatch, downgrade/off/opt-out visibility withdrawal.
- Both unchanged payload byte ceilings after selected-scope metadata is appended.

## Final focused verification

On Node 24.19.0, tested composition `57c91769d7f6fa5987da5aa9f1a2df99e28995b5`:

`node --test services/ai-gateway/tests/maintenance-source-filter-response.test.mjs services/ai-gateway/tests/maintenance-source-response.test.mjs services/ai-gateway/tests/maintenance-source-negative-intent.test.mjs services/ai-gateway/tests/maintenance-source-settlement-fence.test.mjs extension/tests/ai-filter-maintenance-session.test.mjs extension/tests/ai-filter-positive-owner.test.mjs extension/tests/smart-filter.test.mjs services/ai-gateway/tests/maintenance-client-path.test.mjs`

Result: **246/246 PASS**, zero failures, skips or cancellations, 18,300.247623 ms. These include the 39 new source checks, unchanged ordinary source profile, original negative-intent and final-settlement regressions, original positive Filter/session and deterministic Smart Filter preservation controls, and signed service path. Three changed runtime syntax checks and `git diff --check` pass.

All HTTPS/identity/tokenizer/entitlement data and SQL transactions are synthetic. Tests use the actual source Store, session, domain, declaration, reservation, provider-response and result owners; this is not constructor injection described as live activation. The baseline default-null configured reader remains unavailable.

## Remaining scope

The original Context final-settlement successor and this Filter composition require their independent reviews. Existing-Item Context UPDATE/REMOVE_CANDIDATE/NO_CHANGE/Now and unsupported human/structural wire mappings remain separate source functionality gaps, with existing owners preserved. This work does not touch the parallel existing-Context witness helper, ContextMaintenanceService, negative policy, shared financial owners, workflows, budgets, version files or global plans.

Real service/profile/tokenizer/identity resources, paid activation, semantic false-positive qualification and population-level quality evidence remain unavailable or not run. Full/native/old PostgreSQL suites, source/release visual acceptance, exact-main qualification and installation are deferred under the present scoped instruction. New Sync feature work remains paused. The parent owns coherent version/integration identity and any later authorized publication.

## Independent-review repair: original Filter authority before spending/sending

Independent review of `e500ea76146212cde5d3a1c95a999717f693ff11` was **BLOCKED**. Four adversarial cases proved that a once-qualified `material.filter` descriptor could still be transmitted after the original Filter opt-in, Pro entitlement or independent Filter-processing authority was revoked. Generic Maintenance processing stayed current, one synthetic physical call was charged, and only final Filter commit refused. The 246 passing scoped tests above did not cover or certify that boundary.

The repair exposes a synchronous read-only `assertCurrent(handle)` from the existing private AIMaintenanceFilterOwner through its existing Store. It uses the original private `#live` checks for grant, active lifetime and expiry, retiring stale handles exactly as the original owner does. It never calls the authority resolver, reads material, refreshes permission, selects scope, replaces a grant or rebinds the saved proof. Session checks use it before installing/reusing the selected descriptor and in the existing bounded local/service currentness callbacks, including the original final-send callback after awaited checks. Once the original handle was successfully minted, a failed authority check escapes the session; it cannot be swallowed into an ordinary packet and sent anyway. The previously tested optional metadata byte-limit refusal remains a separate unchanged-budget case.

The supplied independent RED file is retained unchanged outside the candidate, SHA256 `2604d29303af924687a2fa477096854114869ec5c8fb6bf2bebbe37e6d905d80`. Its 12 tests are incorporated at the start of `maintenance-source-filter-authority.test.mjs`. All original assertions remain. One diagnostic expression changes from `f.server.saved().rows` to `(f.server.saved()?.rows??[])`: the repaired early refusal creates no ledger account, so the original logging expression otherwise throws before its assertions. The three early controls additionally assert zero tokenization, zero HTTP/declaration/reservation and an absent ledger. This is a diagnostic correction plus stronger assertions, not a weakened RED.

The same file adds nine controls: revocation after tokenizer/proof/declaration/status awaits; no swallowed send on revocation immediately after preparation; synchronous zero-resolver/zero-material-read checks rejecting foreign and retired handles; and three final-provider-boundary revocations after original dispatch preparation, with zero provider HTTP and no repeated reservation. All 21 authority checks pass, including the original four REDs and eight prior passing negatives.

Final bounded verification adds that single authority file to the eight-file focused command above: **267/267 PASS**, zero failures/skips/cancellations, 19,095.260526 ms on Node 24.19.0. The original 39 source Filter, 26 ordinary source and negative/final-settlement/domain/service controls remain passing. Runtime syntax checks and diff check pass. No additional Full/native/PG suite is implied or required by this local repair. Independent re-review of the repaired candidate remains pending; the blocked candidate retains its failure identity.

Repair-only runtime scope: original Filter owner, its Store forwarding method, and LocalMaintenanceSession preparation/currentness seams. The source response schema/adapter and Context final transaction are unchanged. Original cancellation/unknown-attempt accounting remains authoritative; no new paid attempt, refreshed packet, deployment or external action was introduced.
