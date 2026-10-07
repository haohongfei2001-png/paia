# Browser-Native Sync — dependency-ordered implementation plan

2026-10-07 · CPV1-SYNC · BNS-1.0. Product/security direction is fixed by [ADOPTION](BROWSER_NATIVE_SYNC_ADOPTION.md); behavior is [CONTRACT](BROWSER_NATIVE_SYNC_CONTRACT.md), interaction [UX](BROWSER_NATIVE_SYNC_UX.md), evidence [REFERENCES](BROWSER_NATIVE_SYNC_REFERENCES.md). STATUS alone selects an actual execution batch. All six Sync slices are **PLANNED / NOT_STARTED_BY_THIS_TASK**.

This is a delivery plan, not permission to implement in this design task. Do not create OAuth clients, change permissions, call paid services, upload a real archive or perform migration until a later authorized implementation/qualification task establishes the necessary scope. Independent local work must not wait for an unavailable unrelated model service.

## 1. Observed baseline and exact gaps

Remote main `948ea06a57cd932c187407faf7140d9fb6714eff`, tree `78dbc060a3406ce301d1ca9b5f2d183d801ac619`, includes local CTX4-01 and 0.14.0 package metadata. It does not provide cloud Sync. Earlier canonical status prose must not override actual merged code or be retrospectively marked fully certified by this documentation task.

| Existing owner / asset | Reuse | Required change or proof |
|---|---|---|
| `core/sync-contract.js` and historical `SYNC_CONTRACT.md` | Source arbitration, collision/revision/conflict/tombstone principles | Extend logical families and full ancestry; replace maximum-sequence replay handling with contiguous frontier + gaps + digest receipts. Pure existing helper PASS is not unordered-cloud correctness. |
| `core/idb-repository.js` and trusted store/domain writers | Strict durable transactions, CAS, recovery/staging and existing domain boundaries | Atomic portable outbox alongside each canonical write; safe remote-apply receipt/frontier; bounded journal and crash proof. UI/provider cannot become writers. |
| Source/Working/Thought and current Library identity/intent stores | Stable IDs, immutable Source, shared-body binding, Topic/Section/Placement, negative intent and tombstones | Exact portable codec inventory; preserve independently owned human bodies; do not bypass B-01/B-02. Every current write/remove/restore path must participate or explicitly gate cloud activation. |
| `core/context-cards.js`, `meta/context-cards:v1` | Independent manual Info Items, revision/removed/protected state | Serialize logical Items/access preferences, not the whole meta row and not `context:` receipts. Rules/Now/Inputs remain future capabilities. Restore must not import current device acknowledgements or pretend Sync consent is capture/AI consent. |
| `core/prompt-reuse-preferences.js`, `core/prompt-reuse-service.js`, `core/prompt-family.js` | Pins/order, overrides, hide/split and eligible-source reuse | Stable manual-template/override identity mapping across derived family rebuild; manual work survives an absent derived family and an upgraded normalizer. No Source rewrite or automatic send. |
| `core/backup-format.js` and recovery/staging assets | Strict bounded decoding, hashes, graph/tombstone validation, safe activation | Current Backup allowlist does not equal full BNS scope. Do not reuse it unchanged and omit Context, or include all local receipts/secrets. Maintain existing-file compatibility separately. |
| `ui/settings-preferences.js`, `ui/r6-settings.js`, archive Settings shell and shared styles | Existing route/preference/recovery owners and approved Settings CV2 layout | One Sync row in Data & recovery; Sync-owned detail/state API; no second Settings/Context permission store or revived account console. |
| Old account/device/encrypted object/native persistence modules | Threat analysis, parsing/integrity/secret separation, historical tests | Do not wire the old pairing/key root/backend into the normal v1 journey. Old encrypted data is not silently converted. |
| Current extension manifest / CSP | Existing local-first trust boundary | Production authentication/network permissions and platform registrations are absent. Later minimal additions need explicit qualification, not broad drive scopes or a secret embedded in the extension. No change here. |

Use these paths as located responsibilities, not an instruction to split files or invent API symbols blindly. At implementation start, reread exact main, locate current command writers and rebuild the owner map if other authorized work has changed it.

## 2. The single dependency chain

| Slice | User/engineering outcome | Predecessor | Status |
|---|---|---|---|
| CPV1-SYNC-01 | Two local virtual devices converge through canonical segments/checkpoints with no network | Fresh main, existing ownership/receipt rules | FIRST SYNC TASK; PLANNED |
| CPV1-SYNC-02 | Chrome A -> Google Drive -> fresh Chrome B, with A unavailable | 01; real minimal-scope app registration/authorization | PLANNED |
| CPV1-SYNC-03 | Chrome production hardening and actual uninstall/reinstall proof | 02 | PLANNED |
| CPV1-SYNC-04 | Edge/OneDrive uses the same Core and canonical corpus | 01/03; qualified Edge PKCE/AppFolder/token lifecycle | PLANNED |
| CPV1-SYNC-05 | Safari/native CloudKit transport uses the same Core contract | 01/03; native entitlements/container/signing/identity qualification | PLANNED |
| CPV1-SYNC-06 | Three-provider acceptance, migration/security/UX convergence | Applicable 02-05 evidence | PLANNED |

These are outcomes, not mandatory one-PR-per-number bureaucracy. Cloud setup research may be prepared without waiting for unrelated UI/AI work, but no adapter bypasses the Core proof. Use one active writer on shared persistence/manifest/UI files. Keep the repository's already-selected closure work intact; STATUS queues the first new Sync implementation rather than launching another concurrent workstream automatically.

## 3. CPV1-SYNC-01 — exact next Sync implementation

**Goal:** two independent virtual installations over an in-memory/file-backed fake cloud transport preserve the exact canonical user state through reordered, duplicated, missing, interrupted and conflicting operation delivery. No account, network, cloud SDK, real user data or production synchronization activation.

Deliver in one coherent authorized batch:

1. Enumerate actual canonical owners and writes; define typed codec/coverage contracts for Source, Working/Thought, revisions/intent, Topic/Section/Placement, existing Context Items, Prompt manual preferences and portable settings. Record planned-but-unimplemented Context families explicitly. Preserve existing schema and authorship ambiguities rather than guessing migrations.
2. Implement logical operation identity, full parent ancestry and entity-specific merge; exact ID/digest receipts; contiguous frontiers/gaps. Demonstrate that delivering 12 then 11 applies both exactly once. Preserve immutable Source failures and concurrent human sibling revisions.
3. Add the minimum durable transaction/outbox integration for currently supported entities, or first prove it with the production repository in synthetic test databases. Every selected canonical writer must commit content and outbox together. A read-only prototype mirror does not satisfy this step.
4. Implement bounded codec/segment/chunk/descriptor handling; stable retry identity; incomplete-object isolation; hash/length/count/expansion limits. No arbitrary full IndexedDB export shortcut.
5. Implement complete sharded checkpoint construction, restore staging/atomic activation, causal tail reconciliation, safe compaction floor and body-free tombstone preservation. Test returning stale device and older-reader refusal.
6. Run the parameter experiment below and freeze a documented initial protocol profile with measured memory/time/request-amplification evidence. Store conformance fixtures and negative outcomes, not only a green aggregate count.

**Exit:** production Core/domain functions pass exact-state assertions; interrupted local transactions never create saved-but-unsyncable writes; shuffled/double delivery converges; conflicts retain human alternatives; tombstones prevent resurrection after compaction/import; a fresh virtual device with only cloud protocol objects restores everything in the declared populated codec scope. Existing targeted regressions remain intact. A fake adapter PASS does not close real provider, installed extension, privacy, semantic-quality or native UX evidence.

**Blockers local to 01:** incomplete owner mapping, an unrepresentable existing human field, unsupported old body binding, inability to atomically journal writes, unknown ancestry dropped by compaction. Resolve or gate the affected migration path; do not start OAuth as a substitute.

### 3.1 Parameter-selection experiment, not guessed constants

Compare packing targets 64, 256 and 1024 KiB at synthetic corpus sizes 1k, 50k and 500k committed Inputs plus realistic separate revision/intent counts. Include long mixed-script bodies, one body larger than the normal segment, highly compressible data and decompression-abuse cases. Corpus and bytes are explicit fixtures, not a claim about actual user distribution.

Start from the contract's conservative candidate cap of 1 MiB encoded / 4 MiB decoded / 512 operations / two decoded segments; reduce if actual resource measurements require it. Measure peak resident/heap allocations including parse amplification, worker restart cost, operations and cloud objects per committed revision, restore time, long-body chunk count, checkpoint size and asymptotic scan behavior. Separate warm/cold and source/release environments. Select caps based on a declared memory budget and responsiveness target at the lowest supported host, then freeze decoder support/version behavior. No peak-memory optimum or fixed completion-time promise is asserted before this experiment.

Use bounded indexed causal/reference queries; no all-history traversal per incoming operation. Stress sparse sequence holes and large unresolved conflicts. Compaction cannot solve a performance problem by deleting protected versions or tombstones.

## 4. CPV1-SYNC-02 — Chrome recovery MVP

First authorize and qualify the real minimal provider surface using synthetic data in an approved test account, not the owner's archive. Verify stable release extension/OAuth identity, required scopes, verified subject, appDataFolder containment, token lifecycle, paginated listing, immutable retry completion and actual cloud retention. No client secret, general Drive access, PAIA proxy or hidden paid service.

Implement the Google adapter and minimal real UI vertical slice: Settings Sync row -> enable -> actual provider confirmation -> current local canonical bootstrap -> automatic upload -> fresh independent profile/installation -> automatic restore with original device inaccessible. Use a complete representative populated canonical corpus, including current Context and manual Prompt work. No source-device secret, pairing receipt, cache or backup file may be supplied to B.

**Acceptance:** exact per-entity body/revision/identity/intent digest and reference closure; Topic/default/named Sections/order/membership preserved; Context Items/desired scope restored while effective external permissions remain off; manual templates/pins/order/hide/splits preserved; tombstones remain effective. Derivative indexes rebuild from the one body owner. Source facts and unknown times are unchanged. Verify a real remote listing shows only PAIA app data and the scope cannot read an unrelated ordinary Drive file. Core fake tests plus OAuth login alone are insufficient.

Prototype visuals are adapted through current real AppShell/Settings owners, not embedded as an iframe product. If the new Settings shell is not yet implemented, use a bounded truthful integration without building a second full Settings page; final CV2 visual closure remains required.

## 5. CPV1-SYNC-03 — Chrome hardening

Exercise actual extension uninstall/reinstall, browser restart/MV3 termination, revoked authorization, canceled consent, account A -> B while a request is in flight, local and cloud full quota, 403/429/outage, lost completion acknowledgement, corrupt/truncated object, stale checkpoint, change cursor expiry, remote manual deletion, incompatible reader, wrong local clock, and extension update during restore/edit/IME. Verify no old-account queue reaches B and no paused/deleted dataset is silently rebuilt.

Run two-device offline human conflicts, delete versus stale edit, structural move/order conflicts, protected prompt override with missing derived family, Context removal/access restriction, saved legacy human artifact and old-client return after compaction. Keep prior data usable on restore failure. Validate local-only clearing never emits global deletion. Validate cloud-content retirement/deletion covers segments, checkpoints and orphaned in-flight objects, remains truthful on partial failure, and never claims remote physical erasure.

Use the scale fixtures selected in 01 and a declared supported corpus envelope, measuring fresh restore, repeated rescan, steady-state API units/bytes, foreground latency and idle consumption. Real private-data testing requires separate explicit permission; synthetic tests do not prove every historical user's migration. Before broad release, supported 0.x migration fixtures and at least one authorized representative real migration must supply the appropriate private evidence.

**Exit:** a release candidate's source/release installation, full declared canonical coverage, account/data isolation, real lost-device recovery and failure matrix pass. Production/default activation remains off until the actual release gate is met; no manual developer scripts as ordinary consumer workflow.

## 6. CPV1-SYNC-04 — Edge / OneDrive

Reuse the exact Core and conformance fixtures. Qualify personal Microsoft account delegated AppFolder access without scope escalation. Record the current delegated-preview status, tenant/account restrictions, exact extension redirect/CORS registration, PKCE validation and refresh/session behavior. Test actual new-session SSO/reauthorization UX rather than promising persistent silent auth with no secure persistent cache.

Use app-folder-contained paginated discovery and stable logical object ID/digest retries. Treat user/other-app edits/deletions as possible; no ordinary whole-drive listing/delta merely because it is convenient. Preserve foreign files that are not PAIA protocol objects. Demonstrate A -> OneDrive -> fresh B with old A unavailable; all canonical assertions from 02/03 apply unchanged. Account-switch, provider quota/429, partial upload, cloud clear and retirement must map to the same typed Core states.

**Blockers:** AppFolder scope not granted/supported in the target registration, prohibited redirect/CORS flow, unusable provider token lifecycle, unrelated-drive access required for a claimed operation. Keep Edge unavailable for the affected account type; do not substitute broad scopes, app-only credentials or PAIA Cloud. Work/school support is separately labeled and qualified.

## 7. CPV1-SYNC-05 — Safari / CloudKit

Build the minimum containing-app/app-extension/native CloudKit bridge with correct entitlements, App Group isolation and production container identity. This is not merely converting the existing JS extension ZIP. The current Safari web packager's existence does not prove it supplies the custom CloudKit bridge/entitlements required here.

Verify native iCloud account status and container-scoped identity, CK account-change invalidation, private custom zone, opaque CKAssets, completion/partial error handling, change-token reset/re-enumeration and strict bridge caller/binding validation. Validate actual current native record/asset/request limits; archived Web Services limits are a planning reference only. Maintain one Core and no automatic native business-record merger.

Test macOS Safari with two genuine independent installations/accounts as applicable, device loss/reinstall, iCloud unavailable/full, process suspension, app/extension version mismatch, native bridge interruption and stale response. Test the intended iOS/iPadOS profile/lifecycle separately before claiming mobile support; browser architecture compatibility alone is not an iPhone release. Sign/entitle/distribute through the selected allowed Apple route only in an authorized task. No purchase, paid enrollment or cloud creation here.

**Exit:** private-only containment and exact canonical restore on the qualified platform, same Core conformance, source/release bridge evidence, account isolation and honest unavailability. A CloudKit console record or simulator-only success cannot close native device/recovery gates.

## 8. CPV1-SYNC-06 — common convergence and release

One provider-parameterized conformance suite checks the same entity/revision/tombstone/conflict/checkpoint corpus on all three adapters. Test request reordering/dedup/partial errors, independent device identity after reinstall, migration from supported older versions, unknown codec refusal, protected human output, local/external permission separation, account swap, pause/disconnect/delete distinctions and resource limits.

Compare production UI at matching viewport/theme/text scale/fixture and saved preferences against the 34 exact target boards and unaffected Settings authority. Include keyboard, focus return, non-drag alternatives, 320px reflow, 200% text, reduced motion, physical IME and a real screen reader. The standalone 540/8 prototype evidence does not close these.

Record separately: deterministic contract tests; actual provider transport/least-privilege tests; exact restore/data comparison; native installation/bridge evidence; security/privacy review; migration evidence; performance/idle/API costs; production visual/accessibility checks. No aggregate badge substitutes for a failed category. The release must truthfully state which browser/account/platform/version combinations are supported. Cross-provider migration is not silently added to close a same-provider failure.

## 9. Supported 0.x migration contract

Migration is logical and additive first, with a safe existing-library fallback. Preflight current runtime/schema, bounded canonical inventory/counts/hashes, ambiguous authorship/body binding, desired access versus local acknowledgements and available staging space. Retain exact Source/Working/independent Thought content, IDs, times, revisions, Section/default identity, human edge/field intent, aliases/redirects, removal/deletion fences and Prompt overrides. No reclassification, normalized-body rewrite or invented version chronology.

Assign a new local installation identity as needed and bootstrap a dataset only after subject/namespace preflight. Map actual historical stable IDs; identical content is not sufficient to merge distinct manual objects. Represent incomplete old ancestry honestly. A local unsigned baseline becomes explicit bootstrap history, not a claim that all historic per-device revisions are known.

Create a consistent canonical cut with subsequent writes in the outbox. Keep the prior local generation and an internal recovery checkpoint until validated atomic activation. This internal mechanism does not revive user backup generation/export. Compare all required families before acknowledging migration/restore. A crash resumes or leaves the old generation active; retries do not duplicate data.

The existing encrypted/account-device simulations do not prove a deployed encrypted cloud dataset exists. If one is actually encountered, stop and identify its decoder/key/provenance requirements. No automatic plaintext conversion, secret deletion or promise of recovering encrypted data without its real key. A separate authorized compatibility path is required.

Migration receipt: exact from/to versions; source commit; supported corpus/family inventory; safe hashes/counts; identity/alias mappings; unresolved cases; authorization delta; deletion/history effects; all interruption points tested; atomic activation/rollback behavior; evidence limits. Private bodies and identifying details stay out of public CI/docs. Rollback never erases later human work or relaxes permanent deletion.

## 10. Cost and complexity model

No PAIA content backend avoids operating user-account/password/SMS databases, central archive storage, central content egress, per-user key-recovery services and three backend sync engines. It does not remove OAuth/app registration, API quota monitoring, provider policy/release maintenance, storage integrity, local token security, native packaging or support for cloud account failures.

Current official cost distinctions are in REFERENCES: Google standard use has no added API charge but published 2026 quota/billing changes mean unlimited-free assumptions are invalid; Edge extension registration has no fee and ordinary AppFolder CRUD is not the metered operation listed in Graph's metered catalog; Apple Developer Program lists USD 99/year or local currency. User cloud space is charged against their provider plan. Exact PAIA project quotas, user subscription prices, future overage rates, signing/verification overhead and labor estimates are not known from these sources.

Engineering effort is dominated by complete portable scope and transactional coverage, causal/compaction/deletion recovery, credential/account isolation and Safari native lifecycle—not by drawing a login form. Edge's AppFolder/redirect/token qualification is a meaningful separate risk. Three adapters must not triple semantic business logic.

Use a transparent operation model: remote segment count is approximately `encoded committed canonical bytes / achieved packed bytes per segment`, plus descriptors/checkpoint shards/chunks and retained versions. At an illustrative achieved 1 MiB segment size, 10 GiB is about 10,240 segments before metadata/redundancy; this is arithmetic, not measured compression, a scale promise or a storage quote. Sparse flushes and long-body chunks increase the count. Provider request cost is uploads + verification reads + descriptor writes + paginated discovery + retries, not just content bytes. Repeated full listing can dominate idle quota; use bounded partitioned discovery/cursors where qualified and measure fallback costs. No cloud file per Input, unbounded heartbeat, hidden AI call or fabricated fixed monthly bill.

Before each live-provider qualification, specify test account/data scope, project quota/billing state, explicit call/byte ceiling and stop behavior. This task authorizes zero paid calls and no private data transfer. Do not infer a spending allowance from the fact that an API often has a free standard tier.

## 11. Required closure evidence

The central acceptance sentence is:

> With the old device wholly unavailable, a genuinely fresh device authorizing only the same cloud account and stable app identity restores every populated supported canonical user-state family exactly, without an old key, backup, local cache or device approval.

Supporting assertions must include exact bodies and versions; personal Topic/default/named Section order and memberships; Context Items and protected/removed intent; Prompt manual work; explicit portable preferences; body-free tombstones; no resurrection after stale replay/compaction; no silent human overwrite; no duplicate authoritative body; no effective external grant restoration; no broad cloud permission; no false completeness on partial data; no private corpus/tokens in logs.

**Only next Sync development task: CPV1-SYNC-01.** Start with the local Core/transaction/restore proof, not three OAuth integrations. Existing repository closure debt remains visible under STATUS; no production development is started by this documentation integration.
