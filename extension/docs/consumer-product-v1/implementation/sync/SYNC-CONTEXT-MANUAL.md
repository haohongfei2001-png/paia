# SYNC-01 — optional manual Rules/Now owners

Base `7a8dad3d`, independent branch `codex/sync-context-manual-20261008`. This local candidate extends actual manual Context write/receive/staged-restore owners. It does not bind a production worker, enable cloud transfer, change ContextDesired/global/access, admit automatic Items, implement permanent purge, or certify full canonical recovery.

## Compatibility and transaction boundary

`contextItem` v1 retains its exact Info-only codec. New `contextRulesItem` and `contextNowItem` v1 carry only their matching manual/protected/user-edited Items. A reader supporting only the previous four types refuses nonempty new-type checkpoint coverage. Old Info journal/materializer exports still refuse Rules/Now.

The new explicit `ContextManualSyncJournal` and `contextManualMaterializer(core)` reuse the original prepare/commit and causal algorithms. ContextCardsService's single change algorithm and write transaction commit the canonical aggregate, outbox/revision and local operation receipt together. Expected-parent, whole-row and namespace fences remain. The restore materializer is bound to the actual staging Core. Same-ID different-card remote materialization cannot overwrite an existing canonical Item. Manual card text cannot change access or act as instructions.

Readiness counts the two new card domains but remains conservative: the pre-existing aggregate Context blocker includes unrepresented automatic/unknown Items; no caller registry, per-item coverage proof or production binding is invented. `fullCanonicalReady` and production activation remain false. The inherited unresolved-domain inventory stays intact.

## Evidence

- Before production changes, two actual ContextCardsService Rules/Now writes through the Info journal failed `BNS_CODEC_UNSUPPORTED`: `/tmp/sync-manual-before.log`.
- Five complete unit files: **98 PASS**, zero skip/cancel, `/tmp/sync-manual-unit-final.log`; 34 are new Rules/Now cases. Tests exercise real canonical changes and IDB transactions, not a replacement domain implementation.
- Cases include create/idempotency, edit/remove/restore and stale delivery, incorrect deletedBy, explicit bootstrap, unmanaged/untracked local edits, canonical/outbox/receipt rollback, fresh staged restore and activation rollback, expected-parent races, exact 128-revision acceptance/129 refusal, wrong card/automatic rejection, old-reader coverage refusal, same-ID cross-card refusal, access preservation and mixed Info/Rules/Now checkpoint restore.
- Original Info, Core, checkpoint and readiness files retain their tests. Fixture errors are preserved: `/tmp/sync-manual-fixture-syntax-fail.log`, `/tmp/sync-manual-fixture-collision-fail.log`. The collision fixture now uses a distinct operation ID so it reaches the intended canonical owner rejection.
- Mixed-type restore initially compared incidental storage array order, `/tmp/sync-manual-mixed-storage-order-fail.log`. Checkpoints iterate protocol types; the existing UI mounts Items by their `order` field (`ui/context-cards.js`). Final comparison sorts by that existing order then compares every complete Item and exact card order; no field or item is dropped.
- Package: **11949 checks / 358 runtime resources PASS**, `/tmp/sync-manual-package.log`.
- Independent review by `settings_review`: no blocking finding; independently ran the new complete owner file, **34/34 PASS**, `/tmp/sync-manual-independent-review.log`. Complete source/release native: **2/2 PASS**, zero skip/cancel, 12.06s total, `/tmp/sync-manual-native.log`. The native fixture retains all original 13 Info scenarios, adds seven real-owner scenarios per new card, and restarts the actual worker with all three removed canonical Items plus protocol/receipt metadata. The unchanged budget is 120 seconds per variant, isolated release output, zero external network.

This is optional owner capability evidence, not a shipped settings switch, live provider qualification, complete Source/Topic/Prompt/Context recovery or user-visible Sync readiness.

## Exact native candidate bytes

Before/after hashes matched exactly; source/release evidence also records the injected package production hashes, actual worker lifetime replacement and zero-network evidence in `extension/work/qa-bns-context-info/{source,release}.json`.

- `extension/core/browser-native-sync/codecs.js`: `2ea6665dfc9b02724cb62e5a7a7504be80a8b90c8a2ae049742ab3f7c8d96270`
- `extension/core/browser-native-sync/context-journal.js`: `60eb6febcf48c0eb356221ba0d23db367135a688400d6ba5c68e027a88f38386`
- `extension/core/browser-native-sync/canonical-readiness.js`: `ca51456eb9a4f866fef8af33b04dd8570c3af882050461b7f413554600746f0b`
- `extension/tests/native-sync/context-info-worker-fixture.mjs`: `7aa047949ce445822ec1df55eef272fc5ac9f47488407b2a3b4eff6f6375b477`
- `extension/tests/native-sync/context-info-chrome.test.mjs`: `09351a07fc00a2a8655910e737a2ba0d879f05dcda05a5602a5742e095205a2c`
