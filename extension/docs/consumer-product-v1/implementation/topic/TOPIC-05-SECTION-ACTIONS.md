# TOPIC-05.5 — contextual Section actions, local checkpoint

Base: `292cf4642435b281335ae6df45d086054ac434a7`, the Settings/Section
combination candidate. This is a bounded local UI batch, not whole TOPIC-05.5
completion, full certification, integration, an installed release or deployment.

Named and empty named Sections now expose a nearby native keyboard-accessible
menu for rename, move up and move down. The renderer retains heading/menu nodes
and updates the current Section identity. Actions retain composing/unsaved
edit protection, reject changed route intent and revalidate qualified Section
revision/layout before existing trusted rename/layout commands. The untitled
default Section acquires no invented heading. Existing structure-dialog and
domain owners remain; promotion, writing, AI, schema, worker, CI and version
changes are outside this batch.

## Bounded evidence

Tests ran against the base plus these uncommitted source/test bytes, committed
unchanged with this receipt. Seven complete owner/domain files passed196/196:
`cpv1-topic-05-5-section-actions`, `cpv1-topic-05-4-section-reader`,
`topic-workspace-presentation`, `cpv1-topic-03-organization`,
`cpv1-topic-01-identity`, `cpv1-topic-01-restore`, and `ux-r3-topic-actions`.
The complete new `cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs` passed
source/release2/2 in headless isolated Chrome with synthetic data. Native checks
cover keyboard menus, empty-Section rename/order, exact heading focus return,
concurrent rename refusal, IME node/draft retention, reload and unchanged Entry
body. Both runs report zero failures, skips and cancellations. Package guards
passed11,400 checks across339 runtime resources; `git diff --check` passed.

Runtime SHA-256:

- `ui/topic-section-prose.js`: `de7e72757c49025242299ca62a2490690238c95aabb98badd81bd95c2b4a58d9`
- `ui/topic-workspace.js`: `ebcdd01bbbe148ce548df67df737997f70bc7d76a1b491952515649e92c26c4c`

Native test SHA-256:
`a548f631376008255125b6efeb1467c46021883d52ed80eda66d580849ade10c`.
Local logs remain under `extension/work/section-actions-evidence/`; synthetic
screenshots under `extension/work/qa-topic05-section-actions/{source,release}/`.
These ignored work artifacts are not included in this commit.

## Preserved failures and review

The first unit run exposed the older Section-reader fake DOM's missing
`createElementNS` used by existing menu icons. The fixture now implements that
interface; all original assertions remain. The first native run failed both
variants because the fixture started another menu action after the storage
commit but before rendering/focus completion. The second reached the IME body
assertion while prior conflict recovery was still completing. The third
attempted to locate a hidden button by visible role inside closed `details`.
The final fixture awaits actual heading focus and enabled controls and uses an
exact DOM button locator for that hidden-state readiness check. No production
editor fix, removed assertion or timeout increase was used. Earlier failed
logs are retained and do not count as passes.

The coordinator independently reviewed the production diff, existing exception
handling, qualified projection and revision/CAS command connections and found
no blocking issue. The coordinator also inspected the release screenshot at
1280×900: no overlapping named/empty Section menu layout was observed. This is
a local screenshot inspection, not private-design comparison or whole-stage
visual acceptance.

Whole05.5 acceptance, hosted CI, combined/full certification and integration
remained pending at that checkpoint. At that time the native file was not yet
admitted; the later admission checkpoint below supersedes that routing status. Remaining
05.5 operations and promotion readiness are not implied by this checkpoint.

## Section candidate integration and bounded presentation follow-up

The original `65e3a53` batch is preserved. Exact Section candidate
`b2fe6cb169fb3005ff6ce788aaf7eeb296db88f9` was merged without conflicts as
`c6e30bf1f9bc58d5804f345c01e53a7d579c6975`. The evidence below covers that
merge plus the unchanged runtime/test bytes committed with this receipt;
it does not describe the pristine merge commit as already containing the fixes.

The existing Section menu and rename form use the existing thought-copy owner.
The scoped menu root participates in live language changes without translating
user headings or prose. Narrow/coarse-pointer menu targets have a 44px minimum,
and menu button text retains full opacity and theme text color. No Entry move,
promotion, storage, worker, CI, timeout or version changes were added. Existing
rename/reorder, conflict, IME/draft, reload, focus and unchanged-Entry assertions
remain. The native release variant uses the supported builder with an isolated
temporary output directory and retains its guards.

Final local evidence (headless, synthetic data; no external account):

- The same seven complete owning/domain files listed above: 196/196 passed,
  zero fail/skip/cancel, 2634.384917ms.
- Complete `cpv1-topic-05-4-section-chrome-e2e.test.mjs` and
  `cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs`, serial file execution:
  source/release 6/6 passed, zero fail/skip/cancel, 39393.320458ms.
- Native presentation checks exercise actual CDP touch events at 320x900,
  dark theme, English and Chinese, and synthetic 200% menu text scaling.
  They verify retained menu identity during language change, exact localized
  labels, in-viewport/hittable 44px targets, no horizontal overflow, full button
  opacity and Escape focus return. This is text scaling, not browser zoom.
- Package static audit: 11,416 guardrails across 339 runtime resources passed.

Final SHA-256:

- `ui/topic-workspace.js`: `a116b1423063d9d6d30f17d4749a7d0cd02853654c24a98749965a615615e278`
- `ui/thought-copy.js`: `9c69fdde08dd0ed93523947a0a3455bf086554114a15e7c3529e51d6abe80f69`
- `ui/topic-workspace-presentation.css`: `bc11ace23456b3d9e64f875c683aab4fbe74db1e3e29942242587f1c5c0ab69f`
- `tests/cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs`: `0c795f77122b8549b89cdeb36c5686a8e4bde5d14aa3ca9f40f2a3dc95fa8550`

Coordinator-workspace logs are `work/section-actions-final-owning.log` and
`work/section-actions-final-native.log`; `work/section-actions-final-bytes.json`
records all tracked non-doc-directory extension bytes before testing. A post-run
comparison found no changed bytes. These local artifacts are not tracked.
Screenshots remain under this worktree's
`extension/work/qa-topic05-section-actions/{source,release}/`.
The final release English and source Chinese
`section-actions-{en,zh-CN}-320-dark-text200-touch.png` were actually inspected:
menu text is legible and targets remain within the viewport. No private design
reference was available. Unrelated English-page Chinese labels are outside this
menu batch; neither whole-page localization nor design-reference acceptance is
claimed.

Preserved earlier diagnostics include `section-actions-presentation-before.log`
(missing test writeFile import), `section-actions-presentation-layout-before.log`
(real stale locale and shared generated-output read timeout),
`section-actions-layout-before.log` (tap fixture lacked hasTouch), and
`section-actions-touch-before.log` (actual 34px target below 44px).
The intermediate combined native 6/6 result predates the opacity correction and
is not the final-byte evidence. No failure was counted as passing; no assertion
or timeout was relaxed. Final full-file runs above supersede only their local
verification scope. Independent review and routing admission were still pending
at this historical checkpoint; the follow-up below records their completion.
Hosted certification, integration and whole TOPIC-05.5 acceptance remain pending.

## Current Section/Settings reconciliation and complete-file admission

Merge `b482cac587baf5edb13f870073116bfcfc365e20` reconciles actions44f67232 with
Section/Settings `ff730401`, preserving the latest explicit-arrival guard, live
continuation anchors, compact-title visibility, Context locale and Settings
repairs. The sole conflict was the Section-reader test DOM: retain both
createElementNS for action icons and requestAnimationFrame for restoration.
No assertion was removed. Seven complete owning/related unit files passed139/139,
zero skipped/cancelled (`work/topic-actions-merged-owning-unit.log`). Independent
review found no blocker in stable identities, revision/layout-generation/title
revalidation, adjacency/organization CAS, route/view fences, duplicate activation,
IME/draft protection, default-Section suppression or localized44px controls.
Scope remains contextual rename/up/down; no Entry movement, creation or AI work.

Coordinator CI checkpoint `de9c0c7fcc55e464f81901239457306ce96ab103` admits only the
complete05.5 native file, at shard4 for widths4/5/6/7. Independent review executed
the actual router from git `ff730401` against that commit's actual76-file corpus:
all304 prior routes and the frozen router blob match exactly. The current77-file
corpus has unique complete coverage; historical assertions exclude only the new
file to retain their original corpus. Seven jobs and18-minute budgets, whole-file
execution and all existing assertions remain. The coordinator's13 CI tests and
coverage script passed; the independent admission guard also passed1/1. No
workflow, timeout, skipped test or historical audit was rewritten into success.

Final local combined native run: complete05.4 Section reader and05.5 contextual
Section actions source/release files passed6/6 in34.28s, zero failed/skipped/
cancelled. Preserve `work/topic-actions-combined-native.log` and
`work/topic-actions-combined-native-bytes.json`. The manifest binds the starting
b482 candidate's runtime, reader, presentation, copy, CSS and both native owners;
`endBytesUnchanged:true` confirms their exact bytes throughout the run. The CI
commit during that run changed only admission files, not tested runtime. Prior
failed fixtures and visual/control defects remain documented above. This is
local combined evidence plus routing admission, not hosted certification,
merged user availability, private-design acceptance or whole05.5 completion.

## Independent delivery identity

Official main03a57b5357d71cca3cfdfbdfce915d5ced5a5e77 was merged as
6e4af671a1233d9e0092112114d4da2577884828. Its tree is identical to
d9a1dbf; no unchanged native suite was repeated for this merge alone.
The compatible new contextual actions use0.22.0 Section Actions. Manifest/package
agree; strict existing-file admission adds only current minor22 and still
rejects future23 and malformed versions. Schema and retired export are unchanged.
Two complete version/restore files passed4/4; package guards passed11416 across339
resources. Independent review passed. An isolated release build passed11352
packaging checks across335 release runtime resources and RELEASE_PRODUCT_GUARD
359 files, reporting0.22.0 and reused:false. Version-boundary file hashes stayed
unchanged during that build. Hosted current-head and exact-main gates remain
pending; earlier native evidence is scoped to unchanged UI behavior, not a new
claim that the0.22 package itself was previously browser-certified.

## Current-corpus Root guard correction

Full37714325949 at06df6a4c failed Unit2/4: the older Root-routing test
asserted76 current files after actions added the77th. The actual new-file routing
and304-parent-placement tests passed. The Root test now retains its exact74-file
historical oracle, checks all77 current files exactly once, and explicitly checks
the actions whole file on4 at widths4/5/6; its separate7-way guard is unchanged.
Three complete routing test files passed15/15. Independent review found no removed
assertion or changed timeout. Production runtime, dependencies and browser cases
are unchanged. The failed06df run is retained, not certification success.


## PR203 hosted focus completion failure and bounded fixture repair

Full37715972815 at exact5a82ec7cf5b0dff77773693ec1c00ebd9a0bc9b9 failed
Current Browser4/7 job113112408722:92 passed,2 failed,0 skipped. Both failures
were this whole native file's source/release first rename assertion, “focus
returns to exact Section heading”. Other browser shards succeeded. Preserve
`ROOT/work/topic203-full-shard4-failed.log`; this run is not certification PASS.

The test waited only for updated heading text, then synchronously asserted
focus. Actual sectionContextAction awaits mutate/refresh before focusSection;
text publication can occur before that continuation completes. The existing
wait now requires both exact title and exact activeElement within its original
budget; the subsequent exact focus assertion remains. No runtime, assertion,
case timeout, geometry or CI routing change is included. A deterministic actual
controller deferred-refresh test proves focus is restored only after refresh.

Owning complete unit file18/18 PASS (91.164875ms),
`ROOT/work/topic203-focus-unit.log`. Complete headless source/release native
file2/2 PASS (12141.809833ms), zero fail/skip/cancel,
`ROOT/work/topic203-focus-native.log`. These are local5a82 plus this test delta,
not evidence that the failed hosted run passed. Hosted certification remains
pending on the resulting integrated candidate.
