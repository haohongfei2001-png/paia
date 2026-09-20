# ANS-07 Completion Receipt — Thought Library root continuous collection

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-07`
- Execution: `ANS07-20260920-exec01`
- Canonical execution start: `833ad67a64002ac1ce80ba6584b3a6ef7cdfccf2`
- Claim/status commit: `b09048336bcd3f64814f55cb434e9e30d2e0c1e9`
- Candidate branch: `ans/v1/ANS-07-20260920-exec01`
- Locally validated closure head: `339d44768012af5c491821c3d2dc1f6934978e53`
- Certified runtime/test closure head on `main`: `14885f75c6b2fb34036e5c6ca63bb920724268cc`
- Certified runtime tree: `0d353afec7934dba5ccb769cd49eb82d7d0a521d`
- Main certification: PAIA Certification #404 / run `35507783077` / attempt 2 / **success**
- Certification completed: 2026-09-20T12:30:38Z
- Product-owner blocker: **NONE**

The final remote runtime tree is byte-for-byte identical to the locally validated runtime tree. The local Git commit SHA differs because publication used the authorized GitHub path and accumulated the round's remote commit lineage, but the Git tree SHA is exactly the same: `0d353afec7934dba5ccb769cd49eb82d7d0a521d`.

An intermediate diagnostic change to `tests/ux-r5-ai-organize-chrome-e2e.test.mjs` was explicitly restored before certification. The certified diff from the ANS-07 claim head contains only the ten ANS-07 runtime/test files listed below. No force-push was used.

This receipt closes only ANS-07. It marks ANS-08 READY but does not authorize or implement ANS-08.

## Delivered behavior

ANS-07 delivers the Thought Library root continuous collection contract while leaving Topic Reader windowing/edit preservation to ANS-08:

1. Added a body-free Thought-root projection with stable created-at/id ordering and complete-generation publication. A rebuilding generation never replaces the last complete generation until the replacement is complete.
2. Root projection construction is bounded: one build batch is at most 100 Topics; a cold root read advances at most four such batches with checkpoints. The steady-state root page reads at most the requested 40 projection rows and corresponding canonical Topic metadata rather than re-running `all(topics)` on every page.
3. Added generation-bound root cursors. A cursor from an obsolete generation is rejected/restarted rather than silently mixing generations or skipping rows.
4. Topic rename/edit reads canonical Topic metadata, while lifecycle removal and redirect/merge remove the Topic from the visible root without changing the stable identities of surviving Topics.
5. Added a generic `ContinuousCollection` UI controller with deduplication, stale-response fencing, cursor-invalid recovery, empty-middle-page traversal, failure retention, explicit terminal state, snapshot/restore and bounded load-until behavior.
6. Replaced the Thought root's ordinary “下一部分” pagination control with continuous loading. The passive sentinel uses polite status text and supports keyboard Enter/Space; retry is exposed only after a read failure.
7. Thought root continuous behavior is installed lazily only when the Thought root is actually visible. Opening unrelated Archive/Input Reader surfaces does not activate Thought-root indexing or its observer.
8. Opening a Topic from the root stores the root collection snapshot and scroll position. Returning restores the same loaded collection and position rather than resetting to the first page.
9. Grid/list layout changes preserve the visible Topic anchor instead of forcing a jump to the top.
10. Root search now uses the same continuous accumulation model over the existing bounded local search service, including deep-result reachability and stale-query response rejection.
11. “单独写下的想法” / unplaced entries now use the same continuous semantics rather than an explicit “继续查找” pager, with honest empty/terminal/error states.
12. Continuous scrolling, root/search order and return-position restoration do not call DeepSeek, do not authorize AI work and do not make active source/provider requests.
13. The root-index build was deliberately kept out of the global library-maintenance runner after a focused regression showed that global activation could perturb unrelated Input Reader transaction timing. Root construction is page-scoped; ordinary Input editing does not start Thought-root work.
14. No Topic Reader body windowing, section adjacency rewrite, edit pin registry or ANS-08 behavior was implemented in this round.

## Actual runtime / test files

Net diff from the ANS-07 claim head `b09048336bcd3f64814f55cb434e9e30d2e0c1e9` to certified runtime head `14885f75c6b2fb34036e5c6ca63bb920724268cc`:

- `extension/core/library-documents-store.js`
- `extension/core/thought-read-index.js` (new)
- `extension/tests/ans-07-library-continuous.test.mjs` (new)
- `extension/tests/ans-07-library-root-chrome-e2e.test.mjs` (new)
- `extension/tests/core-experience-round6.test.mjs`
- `extension/ui/archive.html`
- `extension/ui/continuous-collection.js` (new)
- `extension/ui/search-experience.js`
- `extension/ui/thought-reader.css`
- `extension/ui/thoughts-base.js`

No manifest, host permission, capture permission, provider registry, Source/Input/Thought owner, canonical body schema, object store or DB-version file changed.

## Focused evidence

Executed on the final locally validated tree `0d353afec7934dba5ccb769cd49eb82d7d0a521d`:

- ANS-07 root/index/continuous unit suite: **6 / 6 PASS**.
  - boundaries: 0 / 1 / 40 / 41 / 400 Topics
  - restartable bounded build
  - no warm per-page `all(topics)` scan
  - rename/lifecycle/redirect behavior
  - atomic generation replacement
  - empty-middle-page traversal, deduplication, stale-query fencing and read-failure retention
- ANS-07 real Chrome E2E: **1 / 1 PASS**.
  - synthetic root fixture: **245 Topics**
  - continuous root reached at least **240 Topics**
  - unplaced collection: **85 / 85 reachable**
  - empty intermediate page recovery: PASS
  - keyboard-triggered continuation: PASS
  - root → Topic → Back scroll restoration: PASS
  - deep search reachability: PASS
  - warmed next-chunk samples: **30**
  - warmed next-chunk p95: **116.8 ms** (P05 target ≤750 ms)
  - warm page operation sample: **40 index rows + 40 canonical Topic rows**
  - external requests: **0**
  - active extension provider/source requests: **0**
  - DeepSeek requests: **0**
- `npm run test:ui-refresh`: **10 / 10 PASS** after removing only untracked duplicate files from `extension/work/`; source Git state remained clean.
- `npm run check`: **9081 package guardrails across 215 runtime resources**.
- release build: **8646 package guardrails across 208 runtime resources**, `RELEASE_PRODUCT_GUARD_PASS`, 232 files.
- Real extension screenshots from the ANS-07 E2E were opened for visual inspection, including `work/ans-07/root-six-batches.png` and `work/ans-07/root-return-restored.png`.

A local Node 26 run exposed two environment/test-runner issues and neither was hidden by changing assertions or timeouts:
- the pre-existing 10,000-history performance test hit its 180s timeout on both the ANS-07 candidate and exact ANS-07 baseline `b090483…`;
- `test:browser` under four-way local Chrome concurrency intermittently failed the existing UX-R2 IME conflict scenario although the same candidate scenario passed when run alone and the baseline also passed alone.

The authoritative clean CI environment therefore remained the required closure decision. Exact-head PAIA Certification #404 attempt 2 passed all required jobs without weakening tests or timeouts.

## Certification evidence

PAIA Certification #404 / run `35507783077` / attempt 2 completed **success** on exact head `14885f75c6b2fb34036e5c6ca63bb920724268cc`, whose `head_commit.tree_id` is exactly `0d353afec7934dba5ccb769cd49eb82d7d0a521d`.

Required evidence:

- Current Browser Certification: **59 / 59 PASS**.
- Current browser coverage contract: `core=11 uir=10 ans=8`.
- Explicit UI Refresh closure gate: **10 / 10 PASS**.
- Full Suite Certification: **1191 / 1191 PASS**.
- Full-suite receipt: `fullSuite=true auditPassed=true historicalBrowserFiles=76`.
- Full-suite input digest: `e1be8b581ac424ca50397510cff3dcfe8e967c8995e3f4c5ce1cf903b2aa8226`.
- Adapter contract: **102 / 102 PASS**.
- Privacy/security: **54 / 54 PASS**.
- package guardrails: **9081 across 215 runtime resources**.
- current release build guardrails: **8646 across 208 runtime resources**.
- `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`.
- Unit 1/4 through Unit 4/4: success.
- Adapter and privacy contracts job: success.
- macOS Secure Store Certification: success.
- Current release build and guards: success.
- final Certification gate: success.

Attempt 1 of #404 was cancelled after the existing ANS-05 Navigator browser test hit its 300s timeout and left the browser runner alive. Attempt 2 reran the same required Current Browser job without source, assertion or timeout changes and completed successfully. The push-triggered Historical Browser Audit remains skipped by workflow policy and is not a required current-release gate.

## Ownership, migration, privacy and rollback

- Durable Source/Input/Thought ownership: unchanged.
- Source/message/document identity: unchanged.
- Original Input capture semantics: unchanged.
- No new object store, DB version or durable body schema migration.
- No new provider/capture/host permission.
- No new source API/network path and no new AI authorization.
- Thought-root projection is rebuildable, metadata-only read acceleration; canonical Topic metadata/body remains owned by the existing Topic/Entry stores.
- Projection construction/rebuild cannot overwrite human Topic fields or Input/Thought bodies.
- Clearing/rebuilding the projection returns to a cold bounded build; it does not delete canonical Thought/Topic data.
- Search and unplaced continuous state is session/UI state and does not alter Backup truth.
- The round introduces no new verified source-provider capability and makes no new ChatGPT Project/order claim.
- Error/partial/index-building UI does not claim completeness until the terminal/complete condition is real.
- Failure retains already rendered rows; late/stale query responses cannot publish into a newer query generation.

## Requirement / acceptance coverage

- R5 root portion: continuous Thought Library overview/search/unplaced collection delivered.
- V14 root portion: ≥240 Topics, no ordinary “下一部分” dead end, all tested chunks reachable without duplicate rows, terminal state explicit, Back restores root position.
- V23 affected root navigation: late/stale root/search result cannot replace newer state; unrelated Input Reader edit timing regression was detected and removed before certification.
- C08: root/order/scroll behavior remains local; no provider/API/AI request.
- RSP06 root portion: polite continuous status, keyboard-accessible continuation, no focus stealing, error/terminal states are explicit.
- P05 root portion: page result ≤40, build batch ≤100, complete-generation projection, no warm full-Topic scan, 30-sample warmed next-chunk p95 **116.8 ms ≤750 ms**.
- P06 is intentionally not claimed here; Topic DOM windowing/pins are ANS-08 scope.

## Handoff

ANS-07 is complete at certified runtime/test closure head `14885f75c6b2fb34036e5c6ca63bb920724268cc` with certified tree `0d353afec7934dba5ccb769cd49eb82d7d0a521d`.

Canonical STATUS may now mark ANS-07 COMPLETE and ANS-08 READY. This execution stops after publishing and remotely reading back the completion documents; it does not implement ANS-08.
