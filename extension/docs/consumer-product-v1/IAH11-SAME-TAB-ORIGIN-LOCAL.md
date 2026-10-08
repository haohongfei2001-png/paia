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
