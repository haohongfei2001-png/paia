# SYNC-01 — partial manual journal coexists with local Context operations

Base `aa1fdf24`. Optional injected owner only. No worker, ContextDesired, access architecture, codec, schema, Core/checkpoint, CI or version change. This does not enable sync or grant processing/connection authority.

## Actual defect and fix

Injecting the new manual journal into the existing ContextCardsService previously caused all normal access toggles and human edits to existing automatic Items to fail scope/codec validation. Eight genuine pre-fix cases fail in `/tmp/sync-coexist-before.log` (five access keys and three automatic cards). Automatic Items are created through the actual ContextMaintenanceService using the established explicitly synthetic verifier fixture, not by changing an Item's origin to bypass validation.

ContextManualSyncJournal now returns explicit `null` only for access changes or changes whose before and after Item both remain automatic. This means local-only, not synchronized permission or automatic lineage. ContextCardsService retains the same canonical apply algorithm, captured whole-row fence, fixed timestamp and transactional local receipt. Only that explicit null skips journal commit. Undefined or an exception does not silently downgrade a manual write.

Manual Info/Rules/Now writes continue through real prepare/commit and canonical/outbox/receipt rollback. Existing Info-only journal exports still reject access and unsupported cards. Automatic Item origin, maintenance lineage and existing human protection behavior remain intact. No new processing authority is created. Readiness remains false, including after local-only writes.

The previous manual-journal test's access-refusal expectation is intentionally replaced with actual local success and exact protocol-state equality; original Info-only scope-refusal tests are unchanged. Purge and cross-card identity refusal remain unchanged.

## Verification

- Six complete related unit files: **198 PASS**, zero skip/cancel, `/tmp/sync-coexist-related.log` (22.98s). Covers original Context/maintenance, Info and three-card sync owners and the new coexistence cases.
- New complete owning file: **13 PASS**, `/tmp/sync-coexist-owning-final.log`. Includes all five local access controls and idempotent receipts, all three automatic-card human edit/remove/restore paths with exact lineage/protocol equality, manual after-outbox failure rollback, local-only receipt-failure rollback, whole-row concurrent-edit rejection and undefined-preparation rejection.
- Package guard: **11949 PASS / 358 runtime resources**, `/tmp/sync-coexist-package.log`.
- Independent review by `settings_finish`: no blocking finding; independent owning file **13/13 PASS**, `/tmp/sync-context-coexist-independent.log`. Complete source/release native: **2/2 PASS**, zero skip/cancel, 12.84 seconds total, `/tmp/sync-coexist-native.log`. Native retains the original 27 owner scenarios, adds all 13 coexistence cases and keeps the existing three-card real-worker-restart proof, 120-second variant budgets, isolated release and denied-network fixture.

## Production-injection blockers remain

The production worker still constructs unjournaled services. Its unique service constructors cannot simply receive a hardcoded Core. Stable dataset/installation binding, explicit existing-item bootstrap and interruption handling, unsupported/untracked domains, mixed-owner dispatch, reset/restore namespace lifetime, version-body cleanup on local clear/purge and the 128-owner staged-activation limit versus 512 allowed Context Items remain separate work. Local fixtures are not a production activation entry point, full recoverability proof or authorization for a provider/account/cloud.

## Exact native bytes

Before/after SHA-256 lists matched exactly (`/tmp/sync-coexist-before.sha`, `/tmp/sync-coexist-after.sha`). Native receipts in `extension/work/qa-bns-context-info/{source,release}.json` each record 40 passed scenarios, actual worker replacement, package hashes and denied-network evidence.

- `extension/core/context-cards.js`: `2c17252903be33fd997af8297fe06d93ce5eec8ee02c655468733cedbe0e0e0f`
- `extension/core/browser-native-sync/context-journal.js`: `84d2f2c0124ecf2c0650118edb30feb9108b418966f104b8786577e92eb9e6e1`
- `extension/tests/native-sync/context-info-worker-fixture.mjs`: `ef43e2bf897bf55f4009c4a57967d65667d5f0966cc81330a19d1da98abf86ee`
- `extension/tests/native-sync/context-info-chrome.test.mjs`: `fe347084ed2205b59b338a12a2f5ea203daea69d9923bad22290a05f001bfe26`
