# IAH-1.1 same-tab origin return — local candidate

Scope: IAH-03/04 interaction semantics within the selected existing-UI plan. Base `8eeadfea`, reconciled with main `17cdd336` in `b581e005`. This receipt is a local code/test checkpoint, not merged delivery, installed release, all IAH results, or exact reload restoration.

## Behavior and ownership

The existing Archive navigation owner captures copied, shape/length/ref-validated metadata into the existing bounded `ViewSessions` implementation (32 origins). History carries only an opaque key; no query/body/snippet snapshot is added to persistent history, URLs, Sync or backup. Accepted leave/save/IME and latest-intent checks precede origin capture/restoration. Existing RouteHistory, Topic slots and Settings return projection remain the navigation owners.

Archive result return re-reads current results with the original explicit query/project/source/date/filter/cursor/page state, then restores the exact result identity, relative viewport position and focus when still available. Explicit Back replaces history instead of adding a Reader/results cycle. Reader Find remains in its separate owner. Settings Reader return forwards the validated key. Cross-space thoughts/memory/revisit returns retain their prior behavior.

Tree activation from a real Archive Search page preserves that page's actual search state; tree sibling activation from inside Reader creates a neutral tree source rather than inheriting a previous search hit. Missing/evicted same-tab origins return neutral with a local explanation, never fabricated precise restoration. The current result data is re-read, not cached body truth.

## Verification and retained failures

- Six complete unit files: 39 PASS, zero fail/skip/cancel, `/tmp/iah-origin-review-unit.log`: fresh-entry, origin-metadata, dvn-view-session, settings-return-boundaries, settings-reader-return, app-shell-state.
- Initial real navigation-owner negative: old route slot returned another query instead of its own origin (`/tmp/iah-origin-owner-before.log`). Superseded leave callback mutation was separately reproduced and fixed (`/tmp/iah-origin-stale-capture-before.log`).
- Independent review found cross-space Back interception, root-Search tree state loss, and missing-origin explanation. The final actual-owner tests against an isolated copy with those three old behaviors restored fail 3/3 (`/tmp/iah-origin-review-before.log`); fixed production passes all 39. This is a controlled negative copy, not a claim that an old committed version contained this unfinished batch.
- Earlier native failures are retained: incorrect Settings footer locator (`/tmp/iah-origin-expanded-native.log`), then whole-history IME comparison (`/tmp/iah-origin-reviewed-native.log`). The latter changed only anchor.offset 1 to 0 with identical route/session/origin identity. A read-only history-write trace source run passed with no write observed (`/tmp/iah-origin-ime-diagnostic.log`); the actual writer was not captured. No timer cause is claimed. Independently reviewed oracle now deeply compares all other route fields plus history length, exact editor node/body, query and tree, while separately validating dynamic offset. No production fix, timeout extension or weakened navigation refusal was made for this test issue.
- Final complete native file: **2/2 PASS**, zero skip/cancel/fail, 47.97 seconds (source 23.34s, release 23.64s), `/tmp/iah-origin-final-reviewed-native.log`. All five production files and native-file SHA-256 values below were unchanged before/after that run. Original presentation, native selection, Unicode exact arrival, filtered-neighbor isolation, changed-match explanation and privacy assertions remain; added IME refusal, Settings/ReaderFind, browser Back/Forward, explicit no-loop return, both tree origins, second 50-result page identity/position/focus, and cold-origin fallback. Local synthetic data only; release uses an exclusive temporary build directory.

## Evidence limits

This batch does not add a reload checkpoint, durable private query state, public fragment routing, provider connection or permanent scope controls. It does not certify all IAH stages. Result-window revision/generation behavior under concurrent data changes and the remaining plan results require their owning batches; successful unchanged synthetic page restoration is not proof of stale-data exact replay. Scope/date restoration and save refusal are owning-unit evidence; native coverage is precisely the journeys above.

## Tested file hashes

4a2edd25c06fda8a03058c10f9ce381d88227126ab95e9308f4f9765d1f5cc43  ui/archive.js
46453efe91489048efe043ac227b66899bf2b150d7584d7a1e831c7d51785074  ui/app-shell-state.js
a49ac409b40ebca8544b7e5f5eddbc2db0927b2b87421d3ce99bf36b27783958  ui/app-shell.js
dc5cfaa3d9950e924215b46ef2fe874f9e6c5497870cff1cbcfd6b0bb2615315  ui/reader-navigation.js
ea4a87d32a814df38f1b06fdf1a9cc5f184e9bc9fc1dbfaf8e10dec48ad0e57d  ui/route-history.js
f6ff5e1201e47e66d1d30fc4a3eed4a7b8f6edd07620301d49ad8727e7bc6a60  tests/iah11-result-presentation-chrome-e2e.test.mjs

## Integration with Section main 03a57b53

Merged main `03a57b5357d71cca3cfdfbdfce915d5ced5a5e77` (tree `e558bcfb367d67cc73dbde299d191e2128e52e9e`). The existing source/release evidence above remains evidence for its original bytes. Section 0.21 worker/read model/reader/presentation and backup-minor changes are inherited from main; this origin batch does not broaden or reimplement them.

The automatic Archive merge adds only main's three-line explanation of existing `home:false`. Origin/fresh-entry/revealOnClick:false remain intact. AppShell/route-history/reader-navigation, smart-filter/exact Unicode arrival, and the release builder have no competing main edits. Main's inherited release version is 0.21; this batch does not independently change version or schema.

The coordinator alone resolved four CI routing conflicts and updated the admission oracle. It preserves all 304 exact current-main routes (76 main files across 4/5/6/7 widths) plus the one complete IAH file on shard 4, total 77 files. The coordinator ran 15 complete CI tests plus the guard, and a separate reviewer verified the main mapping; unchanged seven jobs and 18-minute budget. No runtime writer altered CI during the origin implementation.

Nine complete non-CI owner unit files pass **56/56**, `/tmp/iah-origin-main-combined-unit.log` (the original six plus result presentation, filter reveal and scope-search editor boundary).

The first combined native run failed both cases at the added IME tree snapshot assertion: before tree `[]`, after only the exact current Conversation marked `aria-current=page`; route/session/origin/history/body/query were unchanged and the history-write trace was empty. Failure retained at `/tmp/iah-origin-main-combined-native.log`. `render()` deliberately starts `archiveNavigator.sync()` without awaiting; that owner awaits `refreshSelection` then paints/refetches. The native fixture now waits for the actual current Reader document's selected tree row before starting composition. At that step, all tree, editor, route and refusal assertions and original timeouts remained. This was readiness setup, not a product change or a passing label on the failure.

A second run with current-document readiness passed release but failed source when the tree legitimately changed in the opposite direction (selected row to empty): `/tmp/iah-origin-main-final-native.log`. No additional navigation occurred. Read-only owner inspection found `FakeChatGPT.open()` waits for page navigation, not completion of all source observation, while `ArchiveNavigator.invalidate()` resets scopes on `SOURCE_STRUCTURE_CHANGED` and caused `ARCHIVE_CHANGED`; `readScope()` clears rows while building. A momentary selected row is not a promise of immutable background indexing.

Following independent review, the final IME oracle records tree before/after diagnostically and directly traces the existing `ArchiveNavigator.prototype.restoreNavigation` method with a wrapper that forwards every original call unchanged. Refused composition must invoke it zero times. Exact route identity, history length, same editor node/body, Archive query and source/date/filter scope are still equal; source notifications and background indexing are neither blocked nor mocked. Existing production-owner unit tests additionally prove refused leave applies neither restore nor navigator scope. No product code or timeout changed in this refinement.

Final combined native result: **source 1/1 PASS (23.66s), release 1/1 PASS (23.72s)**, each complete variant run exactly once after the final oracle refinement; zero fail/skip/cancel. Logs `/tmp/iah-origin-main-qualified-source.log` and `/tmp/iah-origin-main-qualified-release.log`. Together these execute the entire two-case file; no source case was repeated to produce the release evidence. All eight runtime hashes and the test hash were identical before source and after release. Frozen hashes follow.

9654d79a0102ef1de14cb9ac7dbdc9f501da585244b9d5444036abedb03c5ba3  ui/archive.js
46453efe91489048efe043ac227b66899bf2b150d7584d7a1e831c7d51785074  ui/app-shell-state.js
a49ac409b40ebca8544b7e5f5eddbc2db0927b2b87421d3ce99bf36b27783958  ui/app-shell.js
dc5cfaa3d9950e924215b46ef2fe874f9e6c5497870cff1cbcfd6b0bb2615315  ui/reader-navigation.js
ea4a87d32a814df38f1b06fdf1a9cc5f184e9bc9fc1dbfaf8e10dec48ad0e57d  ui/route-history.js
f632236583bfda3d6a3879399c762b367c38448f2aa3ec682573bad4fe333604  ui/topic-workspace.js
a38e262171b85abc3ca7190b712fd467a6be38d33f3f82f2544e8814fa236074  ui/continuous-topic-reader.js
1e67075c4e7853c10cf0819cb078daf5a7abaef9aada8a6b4a753e76d6614def  background/service-worker.js
bdb0f69983161291b51cbcca65f6f18a33dd85eb5d64df2bc0c16ec801c508c7  tests/iah11-result-presentation-chrome-e2e.test.mjs
