# AI-COST-03 source-owned ordinary Maintenance response

Date: 2026-10-18. Base: `cfa375a53db7381e1f576f55c097ceaa3b8d808f`.
Status: finite local implementation candidate, independent review pending. No remote write, activation, installation, merge, paid call or whole-Maintenance completion is claimed.

## Original-plan boundary

This implements the first complete structured service response mapping required by AI_USAGE_PLAN §5 and AI_USAGE_ARCHITECTURE §15.3. The configured session previously required a supplied `service.responseAdapter`; the service fixture alone decoded a JSON string and constructed domain commands. An otherwise configured client can now omit that adapter and use source-owned closed response interpretation. An explicitly supplied adapter retains its existing route semantics. The shipped configuration reader remains `null` and unavailable.

The source response schema is the exact schema required by the configured client's manifest, hashed by the original qualified-request owner and validated by the real provider-response service. No JSON-in-string body interpreter is used by this route. A bounded source instruction template accompanies the schema. Synthetic signed identity, tokenizer and HTTPS fixtures exercise the original declaration/reservation/provider/result paths; they are not actual provider or PostgreSQL qualification.

Implemented scope:
- Ordinary, current Input-backed Topic assessment through unchanged TopicFormationService, with body-only UTF-16 citations, default Section, and no extra placements.
- Explicit Context ADD to Info/Rules through the original ContextMaintenanceService (with the narrowly scoped negative policy below). Only the actual sent Inputs may be covered, exactly once. Empty Context output is abstention and leaves Context work pending.
- Local original Entry/dependency/Placement/Topic membership resolves the evidence destination; it must be unique. Model-generated Topic, Item, association or receipt IDs cannot create evidence. Whole current Input mirrors, current Source closure, removal sequence and sent text digests remain required.
- Original final domain CAS, transaction-local ACK, result accounting and financial settlement remain the only writers. Operation/Item/association IDs are minted once per saved same-child interpretation and retained for local retry; committed prefixes and lost local ACK do not replay the provider or remint an Item.

The existing 20-Input child, two-child cycle, 2,000-token Maintenance output and 1,990 max-completion test-profile bounds are unchanged. The source schema fits the existing closed-schema and metadata-depth restrictions; no shared compiler/parser budget was raised. Response state is bounded to the original two children, released on original result completion/disposal, and discarded on preparation failure. It is ephemeral, not another content store.

## Narrow verification

First RED: the new ordinary configured-service test, with no supplied adapter and the actual source schema, returned UNAVAILABLE instead of COMMITTED. It reached neither fake provider nor ACK. This establishes the missing configured path, rather than only importing a proposed constructor.

An intermediate implementation also refused declaration under the original metadata-depth bound. The wire citation contract now fixes the field to body and locally maps it into the original citation DTO, reducing schema depth without changing a shared limit. That intermediate refusal is not a pass.

Final scoped command on Node 24.19.0:

`node --test services/ai-gateway/tests/maintenance-source-response.test.mjs services/ai-gateway/tests/maintenance-client-path.test.mjs`

Result: 61/61 PASS, zero failures/skips/cancellations. This includes 26 new owning checks and 35 existing service-path controls. `git diff --check` and both new source module syntax checks pass. The first expanded test execution was deliberately interrupted after a test hook deadlocked by recursively entering the serialized store owner; the test now awaits the original Topic commit before applying its real owner mutation. That interrupted execution is not passing evidence.

New checks cover the actual source Topic→Context ADD→result chain; closed/malformed/extra output, NO_CHANGE and unknown operation rejection; cross-child/job binding; missing/duplicate/foreign Context coverage without invented ACK; foreign Topic citations; mismatched profile schema before declaration; post-Topic Input edit, exclusion, exclusion/restoration, Source purge, ambiguous Topic membership and excluded Placement; late final Context CAS refusal; atomic rollback, lost ACK, partial Context group continuation; two physical children/42 exact coverage units; source Input/privacy preservation and body-free reporting; accessor refusal and unchanged default-null availability. These use simulated SQL transactions and synthetic Qwen HTTPS, with the real original production local/domain/service owners.

## Independent-review repair: unresolved existing Item lineage

The initial frozen candidate `6aea51de3602b876856f4b675e4798d6c41ccc89` was **BLOCKED** in independent review. Its fresh random Item/association IDs bypassed the original association fence when a human had already removed or corrected an automatic Item and later edited its Input. Both exact reviewer probes reproduced RED locally (2/2 failures, `maintenance-source-negative-intent-red.tap`). The four original reviewer probes remain byte-for-byte at the start of `maintenance-source-negative-intent.test.mjs`; no failing assertion was weakened.

The successor is composed with reviewed Section candidate `5fd9f02dc7e230bdc7323e67d18b16a22140c055`. A negative-only, private route policy is bound to the source adapter's actual Context function, surviving adapter copies. The session's sole new wiring is an import plus a constructor option to the original Context owner. A JSON field or configuration boolean cannot disable/forge this policy. Existing original callers keep the default-null policy and original operation contract; in-flight operation identity also binds its policy.

Before allocating new identities, this ADD-only source profile checks the original validated Context row for automatic provenance/invalidation intersecting the actual selected Input identity (`contextEvidenceKey`). The original Context transaction repeats that check for a fresh unassociated Item, then repeats it after its original Item and receipt writes, excluding only the Item it just created. Existing matching association, human restore/protection, revision CAS and historical receipt semantics remain in their original owners. Refusal leaves already-committed Topic coverage intact, without a Context receipt/ACK/effective result or another provider call.

This is **unresolved interpretation**, not a claim that Input overlap proves equal meaning, and not a persistent Input blacklist. The current source packet lacks qualified existing Item/claim witnesses. It therefore leaves same-Input proposed new claims pending when any automatic Item lineage already intersects, including active Items (which could otherwise duplicate instead of UPDATE/NO_CHANGE), invalidated Items and human-protected/removed Items. Truly different Inputs remain executable. The existing explicit original qualified caller and human restore/association paths still work; a source wire for those paths remains a code-functionality successor, not an external activation gate or permanent product restriction.

The check performs one bounded original `readContextCards` read before mapping, reuses the original transaction's validated row, and performs one additional same-transaction row read after staging. The row retains its existing 512-Item/1 MiB bounds and each provenance retains its original evidence bounds. No Item body is sent to the provider or retained in response state; no corpus scan, new store/index/schema, permission or budget increase is introduced.

Scoped successor verification on Node 24.19.0:
- `node --test services/ai-gateway/tests/maintenance-source-negative-intent.test.mjs extension/tests/cpv1-ctx4-05-maintenance.test.mjs`: **122/122 PASS**, zero failures/skips/cancellations, 31,529.885373 ms. This is 22 narrow new controls plus 100 original Context-owner cases, including original create/update/association/protection/restore/outcome behavior.
- `node --test services/ai-gateway/tests/maintenance-source-response.test.mjs services/ai-gateway/tests/maintenance-client-path.test.mjs extension/tests/ai-cost-03-section-topic-reconciliation.test.mjs`: **120/120 PASS**, zero failures/skips/cancellations, 12,892.798288 ms. These are 26 existing source-route controls, 35 service-path controls and 59 composed Section-owner controls. The three changed runtime syntax checks and `git diff --check` pass.
- New controls include both preexisting human intents after later Input edits; active/same-claim and separately proposed same-Input claim pending; active/removed/protected Item creation after adapter mapping; all three states injected after staged Item and receipt writes with rollback; no extra provider/receipt/ACK; different-Input positive; original explicit fresh-claim contract; exact human restore/qualified association/replay; private policy copying/forgery rejection.
- The first expanded test experiment incorrectly expected a rolled-back synthetic intent to persist through a subsequent legitimate retry; its assertion was corrected to check atomic rollback first, then the permitted same-child retry. A different-Input positive initially selected an unsupported mixed human-Context-edit packet and remained CANCELLED; the final positive isolates the supported ordinary Input packet beside an actual removed original Item. Those exploratory failures are not passing evidence and do not expand supported source scope.

## Final-settlement successor

Independent review of `f004afa3b714be678c511e095b417117a9a181f0` found that the original Context callback finished before Foundation staged the Context ACK, usage and completed job. Three additional probes injected a valid removed same-Input Item into that same transaction after each of those writes. All three reproduced RED locally (`maintenance-source-settlement-red.tap`): the source route committed both Items and reported an effective result. This is synthetic same-transaction staged-drift evidence, not evidence that separate native IndexedDB write transactions interleave.

The original Context owner now privately associates the exact fresh result object with a transaction-local closure using a WeakMap. The session requires that closure for a source-policy `created` outcome and runs it through Foundation's existing `fenceAfterSettlement`. No Foundation, response/schema, Filter or witness-helper code changes were needed. The closure remains alive because the original Context owner's `writeTransaction` promise does not resolve until Foundation finishes settlement; only then does the original owner release captured lineage. No function is added to a model result, domain DTO or stored receipt.

At the existing final seam, original current grant/Input checks precede the Context closure. The closure requires the same transaction/database, rechecks original caller authority and captured lineage, and reads the bounded Context row once. Its own-Item exclusion requires the actual new ID, revision, association, body/section, card, lifecycle/protection and captured provenance, not merely a copied ID. Any other intersecting automatic lineage refuses. Original synchronous authority checks finish the callback; Foundation performs its existing synchronous owner check with no new asynchronous or mutating phase afterward.

Final scoped command:

`node --test services/ai-gateway/tests/maintenance-source-settlement-fence.test.mjs services/ai-gateway/tests/maintenance-source-negative-intent.test.mjs services/ai-gateway/tests/maintenance-source-response.test.mjs extension/tests/ai-cost-03-section-topic-reconciliation.test.mjs`

Result: **125/125 PASS**, zero failures/skips/cancellations, 12,260.793338 ms on Node 24.19.0. The new file retains the three independent probes byte-for-byte and adds 15 controls across ACK/usage/job staging: active conflicting lineage, own association/body substitution, changed Input revision and revoked processing grant. Every refusal retains committed Topic coverage and rolls back Context Item/receipt/ACK/effective result. Non-revoked rolled-back cases retry the exact original change and child with one physical provider call. Earlier 122/120 test receipts retain their earlier identities; the old 100-case Context and 35-case service suites were not rerun for this finite successor. Both changed runtime syntax checks and whitespace checks pass.

## Explicit successors and deferred gates

This route does not yet map existing-Item UPDATE, REMOVE_CANDIDATE or NO_CHANGE. Those require the actual selected existing Item state and a narrowly independently authorized request snapshot, not a synthetic response that magically knows an Item absent from the packet. Now requires its original temporal contract. Human Entry/Placement/Section/Topic/context-edit mappings, named Sections/additional placements, and Pro Filter need their own structured wire mappings before this source route can execute those scopes. Their existing owner implementations and tests are preserved.

In particular, the current Pro positive Filter service fixture still supplies `responseAdapter.filter` in `services/ai-gateway/tests/maintenance-filter-fixture.mjs`. A successor should move that bounded decision DTO and exact original filter-snapshot/coverage binding into the same source response owner, retaining the signed Pro reservation and original positive Filter transaction. No independent pipeline, budget, scheduler or financial writer is needed.

Source/release native execution, Node22 service evidence, build/privacy qualification, live profile/tokenizer/identity/resource activation, semantic quality and broad acceptance are NOT_RUN for this candidate. Those gates are deferred or externally unavailable, not passed. The finite candidate makes no package/version or global documentation change; the parent owns coherent integration identity and versioning. New Sync feature work stays paused.
