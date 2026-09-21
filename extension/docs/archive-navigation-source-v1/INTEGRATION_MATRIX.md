# ANS-09 integration coverage

Execution `ANS09-20260921-aem01`, start main `d0f767fb64deb3c951bbd916d232114de9a8dbfb`,
claim `cbf78739f0d7bc0c7f42828d3fdd80045c319936`. This is a verification map, not
completion. STATUS remains IN_PROGRESS until exact-main Certification and the final
receipt are published. All named files below are under `extension/tests/`.
Existing tests run again in current certification; old receipts explain their scope
and are not substituted for the new run.

| Requirement | Current executable evidence |
|---|---|
| V01 | ans-04-navigation-query.test (1000/10000 Windows); ans-05-navigator-workspace-chrome-e2e (non-first-page Window) |
| V02 | ans-05-navigator-workspace-chrome-e2e A→B→Back |
| V03 | ans-01-reader-surfaces-chrome-e2e toggle/persistence/rollback; ans-06-source-order-settings-chrome-e2e independent preference |
| V04 | ans-01-reader-surfaces-chrome-e2e visible time/light/dark/mobile |
| V05 | ans-01-reader-surfaces-chrome-e2e removed automatic reuse decorator |
| V06 | ans-01-reader-surfaces-chrome-e2e Topic menu/whole selection; ux-r4-search-reuse-chrome-e2e local tray/preview/output |
| V07 | ans-02-source-structure.test; ans-03-source-observation-chrome-e2e |
| V08 | ans-05-navigator-workspace-chrome-e2e; ans-09-integration-chrome-e2e metadata move during failed save on another tab |
| V09 | ans-02-source-structure.test same text/different IDs; ans-09-migration.test actual old duplicate expressions |
| V10 | ans-02-source-structure.test external vs parent deletion; ans-04-navigation-migration.test exclusive paths |
| V11 | ans-03-source-contract.test lifecycle-neutral presence; ans-09-integration-chrome-e2e retained archive/history |
| V12 | ans-03-source-contract/privacy.test invalid observation; ans-06-source-ordering.test stale/clock/namespace fallback |
| V13 | ans-05-navigator-workspace-chrome-e2e collapsed Project/deep link/mobile/Back |
| V14 | ans-07-library-root-chrome-e2e 245 Topics; ans-08-topic-projection.test 520 entries/120 sections; ans-08-topic-continuous-chrome-e2e forward/back/retry/terminal |
| V15 | ans-06-source-order-settings-chrome-e2e admitted synthetic provider→store→real Navigator→Settings |
| V16 | ans-03-source-privacy.test and ans-06-source-ordering.test partial/duplicate/stale/unavailable |
| V17 | ans-06-source-ordering.test generic registry; ans-06-source-order-settings-chrome-e2e non-ChatGPT synthetic provider |
| V18 | ans-04-navigation-query/migration.test comparator/provider/namespace; ans-06-source-order-settings-chrome-e2e restart |
| V19 | ans-06-source-ordering.test current PAIA tail; ans-06-source-order-settings-chrome-e2e mode change/reorder preserves selected ID |
| V20 | ans-02-source-structure.test; ans-09-migration.test canonical deep equality after source facts and index rebuild |
| V21 | ans-09-migration.test actual 38804b9 database/Backup; ans-02-source-backup.test legal ChatGPT+Claude import; ans-09-integration-chrome-e2e actual IDB/service-worker restore |
| V22 | ans-08-topic-projection.test late time enrichment; ans-09-migration.test exact known/unknown source time and capturedAt preservation |
| V23 | ans-05/08 browser dirty/IME/selection/version/failed-save gates; ux-r3-thought and ux-r4-search-reuse; ans-09 source/release multi-tab failure/restart/purge |
| M01 | ans-09-migration.test actual pinned old DB/Backup, all canonical fields and portable items compared |
| M02 | ans-04-navigation-migration.test prepared/batch interruption; ans-07-library-continuous.test checkpoint; ans-09-migration.test reopen/rebuild |
| M03 | ans-04-navigation-migration/concurrency.test atomic generations, import/capture/edit race |
| M04 | ans-02-source-backup.test mixed-provider history; ans-09-migration.test restored original observedAt and channel |
| M05 | ans-09-migration.test exact INTEGRITY_FAILED/VERSION_UNSUPPORTED/TOO_LARGE/INCOMPLETE/TARGET_NOT_EMPTY; ans-02-source-backup.test invalid references/atomic storage failure; backup-v081.test worker loss/settings recovery |
| M06 | ans-04-navigation-migration.test hot index purge; ans-09 migration/browser final-source purge, export no leaked Project/source, independent new body retained |
| M07 | ans-02-source-backup.test actual existing import coordinator ChatGPT+Claude with equal Project names; realExportVerified remains false |
| M08 | ans-04-navigation-migration.test clear/fallback/rebuild; ans-06-source-ordering.test order preference default; ans-09-migration.test exact old body/history preservation |
| C01 | ans-03-source-contract.test canonical route and source identity |
| C02 | ans-03-source-privacy.test content-bearing/forged Project evidence rejected |
| C03 | background-security.test, ans-03-source-observation-chrome-e2e consent/epoch/pause/exclusion; ans-09 browser UI observation forbidden |
| C04 | ans-03-source-contract/privacy.test complete scopes and gaps; ans-06-source-ordering.test incomplete cache generation |
| C05 | ans-03-source-contract.test presence cannot resurrect deletion; ans-02-source-structure.test explicit lifecycle only |
| C06 | ans-02-source-structure.test; ans-03-source-privacy.test namespaces; ans-02-source-backup.test two providers |
| C07 | ans-03-source-privacy.test exact DTO allowlists/limits; ans-09-migration.test strict Backup size/version/hash |
| C08 | All current ANS browser tests enforce zero active source/AI/external requests; SOURCE_CAPABILITIES retains unavailable live boundaries |
| P01 | ans-04-navigation-query-chrome-e2e cold≤1500ms; ans-04-navigation-query.test ≤100 build /≤40 rows /body reads0 |
| P02 | ans-06-source-order-settings-chrome-e2e now commits30 warm page and mode samples, each p95≤500ms, plus old strict ordered-title assertions |
| P03 | ans-04-navigation-concurrency.test actual queued writer/capture/edit timings and generation repair |
| P04 | ans-04-navigation-query.test 10000 metadata Windows, warm paging/no body materialization; existing full F-LARGE fixture |
| P05 | ans-07/08 real browser30-sample chunk latency≤750ms; ans-08 projection payload/large-entry cases |
| P06 | ans-08-topic-continuous/edit-preservation-chrome-e2e clean120 plus pins, bidirectional440 reachability, tracked/save batches and undo exact bytes |
| RSP01 | ans-05-navigator-workspace-chrome-e2e all6 sizes light/dark; ans-09 source/release all6 sizes overflow regression |
| RSP02 | ans-01/05 browser200%zoom, contrast/reduced-motion/touch targets |
| RSP03 | ans-01/05 browser keyboard/menu/toggle/selection; ux-r4-search-reuse tray focus |
| RSP04 | ans-05 browser mobile inert/focus-trap/Esc/failed-flush |
| RSP05 | ans-05 browser resize/native selection/window anchors; ans-08 continuous reader stable anchors |
| RSP06 | ans-07/08 browser polite passive sentinel/end/error/no focus stealing/dirty pins |

## New migration fixture and actual bug repair

The checked-in synthetic fixture was produced by the unmodified pre-package
`38804b99153074f54148f875e2e09c76568bc1cd` code and validated by its own Backup
service. Its raw37-store snapshot exercises actual upgrade, not a current fixture
renamed “legacy”. SHA256: `2f71bd6db4ba96b12f37faa01566b9b5595175b32dea2925637edd707df0d7c0`.
All canonical rows are deeply compared before/after index construction and restart;
portable content items are deeply compared before/after restore, including original
bytes/hash/time, working bodies, all revisions/provenance and source fences.

ANS09 exposed a real export graph defect: excluding legacy Inputs can make derived
entries ineligible, but their placement/evidence rows were still exported. Strict
restore correctly returned BACKUP_INVALID. Export now reuses the same entry gate
for these dependent rows. The new orphan-placement test was RED before the six-line
fix and GREEN afterward. No invalid-reference restore exception was added.

The integrated source/release journey uses the same legacy Backup, real extension
RPCs/IndexedDB and a real service-worker stop/restart. It checks two-tab unsaved
editing through source move/delete, explicit retry, original digest preservation,
Topic reading and permanent purge while retaining wholly independent new writing.
Snapshot export waits for actual durable generation stability after local
maintenance; it never retries failed exports or accepts a partial hash chain.

## Provider and publication boundaries

ChatGPT current conversation identity/presence uses its existing verified contract.
Project identity/name/membership/order/rename/move/deletion remain unverified and
unavailable without live proof. Source order uses PAIA fallback. Generic synthetic
provider successes are integration evidence only. Claude import/Backup uses the
existing legal contract; Claude real-export verification remains false.

Manifest permissions/host scope, source IDs, DB version, canonical body stores,
Source/Working Input/Thought ownership and provider authorization are unchanged.
Final run IDs, exact runtime/test SHA, source/build fingerprints and results belong
in the final ANS-09 receipt after checks finish. This file must not be read as PASS
for a run still queued/running or a candidate not yet published on main.
