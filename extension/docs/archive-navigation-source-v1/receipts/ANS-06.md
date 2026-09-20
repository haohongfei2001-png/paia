# ANS-06 Completion Receipt — Source ordering providers, Settings and fallback

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-06`
- Execution: `ANS06-20260920-exec01`
- Canonical execution start: `c8e3e9f05415667a3fd26428caf167c556be7380`
- Claim/status commit: `ae319c2b9886ce7636a014d6d2bcc649678a04ff`
- Candidate branch: `ans/v1/ANS-06-20260920-exec01`
- Remote feature publication commit: `682b2920c0695c98000ff3da8548469aff8ed98e`
- Remote release-build gate fix commit: `7e6382d4168cfef83c978513a82b96e2e79c0f6c`
- Certified runtime/test closure head on `main`: `8c133a398fd025feef8d3142d46a6fff52e45ca2`
- Certified runtime tree: `8c3d40a367f4788bd22b7e121b2fb52951862680`
- Main certification: PAIA Certification #389 / run `35491563370` / attempt 1 / **success**
- Certification completed: 2026-09-20T05:50:13Z
- Product-owner blocker: **NONE**

The final remote runtime tree is byte-for-byte identical to the locally validated runtime tree from local validation commit `88fd34f1cc6cc9a6343cb4213e9e1f4101125157`. Local HTTPS Git credentials were unavailable, so publication used the authorized GitHub Git-data API. A final non-force correction commit was accepted only after the remote tree SHA exactly matched the locally tested tree SHA; no force-push was used.

This receipt closes only ANS-06. It marks ANS-07 READY but does not authorize or implement ANS-07.

## Delivered behavior

ANS-06 delivers the package-defined R8 source-ordering module and production consumer while preserving honest fallback:

1. Added provider-aware source-order contracts and registry with explicit `available` / `unavailable` results for Project and Window scopes independently.
2. Added strict source-order admission: provider/namespace/scope identity, duplicate rejection, bounded refs, completeness contract, evidence metadata, generation, freshness, future-time and clock-rollback validation.
3. Added rebuildable `ans:order:v1:` source-order snapshots with at most 100 refs per stored batch and a 10,000-ref scope ceiling. A replacement generation is not made active until all batches are present and validated.
4. Added source-order projection over the existing ANS-04 bounded Navigator index rather than creating a second archive truth store. Ranked members follow verified source order; archive members without a proven rank remain in stable PAIA order at the scope tail.
5. Preserved fixed provider/group/deleted semantics. Source rank cannot move a Window across provider/Project scope or convert unknown/unassigned/deleted lifecycle facts.
6. Added device-local `ans:ui:v1` Archive ordering preference, default `paia`, independent from Input `inputReadingSort`. Preference write failure restores the prior value.
7. Added Settings → Reading & appearance → Archive window order with `PAIA order` / `Source order` plus actual availability/fallback status.
8. Wired the production Navigator to the selected mode. Unavailable, stale, partial-generation or namespace-conflict scopes remain readable through PAIA ordering with an explicit low-noise fallback state and no automatic provider/network lookup.
9. Added interaction-safe atomic application: while Navigator focus/pointer/menu interaction is active, external ordering changes are staged instead of moving the row under the user; the user can apply explicitly or allow application after interaction ends.
10. Kept ChatGPT Project/window ordering honestly unavailable because ANS-03 did not certify a complete-scope or proven-rank live contract. The reliable synthetic provider exists only at the test injection boundary and is not a new production capture provider.
11. Fixed a pre-existing concurrent current-release build race exposed by the current browser gate. `build_current_release.py` now serializes the shared release output and reuses it only when a source fingerprint matches and package/release audits pass.

## Actual runtime / test files

Net runtime/test delta from the ANS-06 claim head:

- `extension/background/service-worker.js`
- `extension/core/archive-navigation-query.js`
- `extension/core/source-ordering.js` (new)
- `extension/scripts/build_current_release.py`
- `extension/ui/archive-navigator.css`
- `extension/ui/archive-navigator.js`
- `extension/ui/archive-order-settings.js` (new)
- `extension/ui/core-loop.js`
- `extension/tests/ans-06-source-ordering.test.mjs` (new)
- `extension/tests/ans-06-source-order-settings-chrome-e2e.test.mjs` (new)

No manifest, host permission, capture permission, Source/Input/Thought owner, canonical body schema, object store or DB-version file changed.

## Focused local evidence

Executed on the byte-identical local runtime tree:

- ANS-06 source-order unit/negative/fault tests: **6 / 6 PASS**.
- ANS-06 real Chrome E2E: **1 / 1 PASS**.
  - ChatGPT fallback: `SOURCE_ORDER_UNAVAILABLE`.
  - reliable synthetic provider order: `ANS06 S2 → ANS06 S1 → ANS06 S3`, with the unranked archive Window trailing in PAIA order.
  - source preference survived worker restart.
  - synthetic preference-write failure restored the prior `source` selection.
  - external/provider/DeepSeek request counts remained zero.
- `npm run check`: **8979 package guardrails across 213 runtime resources**.
- privacy/security group: **54 / 54 PASS** plus `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`.
- `npm run test:ui-refresh`: **10 / 10 PASS** across source and built-release Chrome paths.
- Concurrent release-build reproduction after the fix: two simultaneous builders both exited 0; the first performed a full audited build and the second reused only the matching audited artifact. Release audit reported **8544 package guardrails across 206 runtime resources** and **230 files**.
- The UIR-03 built-release AI-presentation test that originally exposed the shared-output race was rerun independently and passed **1 / 1**.
- Built release contains `core/source-ordering.js`, `ui/archive-order-settings.js`, the worker preference endpoint and the production UI import path.

## Certification evidence

PAIA Certification #389 / run `35491563370` / attempt 1 completed **success** on exact head `8c133a398fd025feef8d3142d46a6fff52e45ca2`.

Required evidence:

- Current Browser Certification: **58 / 58 PASS**.
- Current browser coverage contract: `core=11 uir=10 ans=7`.
- Explicit UI Refresh closure gate: **10 / 10 PASS**.
- Full Suite Certification: **1184 / 1184 PASS**.
- Full-suite unit group: **970 PASS / 0 fail**.
- Full-suite receipt: `fullSuite=true auditPassed=true historicalBrowserFiles=76`.
- Full-suite input digest: `69df1224581b42fe22b4b29b5a7cfa24a4b43cb93f6c7d6061c78b3511e69d43`.
- package guardrails: **8979 across 213 runtime resources**.
- `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`.
- Unit 1/4 through Unit 4/4: success.
- Adapter and privacy contracts: success.
- macOS Secure Store Certification: success.
- Current release build and guards: success.
- final Certification gate: success.

The push-triggered Historical Browser Audit matrix is intentionally skipped by workflow policy and is not a required current-release gate.

## Ownership, provider capability, migration and rollback

- Durable Source/Input/Thought ownership: unchanged.
- Source/message/document identity: unchanged.
- Original Input capture semantics: unchanged.
- No new object store, DB version or durable body schema migration.
- Provider/capture permissions and host permissions: unchanged.
- No new active provider/API request.
- No new AI authorization or automatic model work.
- `ans:order:v1:` order data and `ans:ui:v1` preference are rebuildable/device-local ephemeral state and are excluded from Backup. Existing ephemeral reset removes them and returns ordering to the default `paia` mode without deleting archive or durable source facts.
- ChatGPT Project identity/name, Project membership, Project/window order, rename/move and conversation/project deletion remain unverified/unavailable where ANS-03 did not certify them. In particular, ANS-06 does **not** claim live ChatGPT source-order support.
- The synthetic provider proves generic admission/store/query/Navigator/Settings behavior only; it is not live ChatGPT certification.
- `SOURCE_CAPABILITIES.md` therefore requires no new verified-provider claim in this round.
- Invalid/stale/partial/conflicting order state fails back to the existing PAIA comparator; no archive body or last-known source metadata is cleared and no network recovery is started.

## P02 performance evidence

After exact-head certification, the same certified runtime tree `8c3d40a367f4788bd22b7e121b2fb52951862680` was exercised in isolated headless Chrome with a temporary, non-committed probe:

- synthetic source scope: **240 refs**
- warmed source-order Navigator page samples: **30**
- warmed source-order Navigator page p95: **55.03 ms** (required ≤500 ms)
- local Archive-order preference switch samples: **30**
- preference-switch p95: **25.99 ms** (required ≤500 ms)
- external requests: **0**
- extension active provider/source requests: **0**
- DeepSeek requests: **0**

The probe did not modify runtime source or the certified Git tree. Hard resource boundaries are separately enforced by the committed ANS-06 tests and implementation: ≤100 refs per source-order batch, ≤10,000 refs per scope, and incomplete generations never become active.

## Handoff

ANS-06 is complete at certified runtime/test closure head `8c133a398fd025feef8d3142d46a6fff52e45ca2`, published on `main` and certified by PAIA Certification #389 attempt 1.

Canonical STATUS may now mark ANS-06 COMPLETE and ANS-07 READY. This execution stops after publishing and remotely reading back the completion documents; it does not implement ANS-07.
