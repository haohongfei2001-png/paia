# IAH-1.1 origin restoration: retained nodes and Search history

This local combination starts from IAH `dc022ee37e06058b2918dcfef8f628f191237600`, with Topic/AI `91169a7a` merged by the coordinator. Tests below ran on that pending merge plus the exact runtime bytes recorded separately; they are not evidence for either unchanged parent or a future main commit.

## Confirmed failures and corrections

The initial combined native run (`work/iah-search-identity/work-iah-topic-ai-native.log`) passed 11 cases and failed UIR02 source at its original directory-node identity assertion: Reader Back removed/reinserted two provider nodes. Actual `restoreArchiveOrigin` forcibly cleared `lastPaintSignature` before Navigator restoration, bypassing the existing stable-tree fast path. The owner regression reproduced this forced invalidation. A second owner regression demonstrated that the fast path did not restore the requested scroll offset (19 instead of 237). These two failures remain in coordinator `work/iah-origin-nodes-before.log` (25 PASS / two FAIL).

The correction retains the render signature for both origin restoration and fresh Archive selection reset. The signature still includes Source scope, expansion, generations, coverage, loading and actual tree item identities; a genuinely different tree still paints. Selection changes use existing `syncSelection`. `restoreNavigation` explicitly restores host scroll whether painting rebuilds nodes or reuses them. Tests assert every node by identity, changed expansion repaint and original expansion/scroll restoration.

The first corrected native run passed both full IAH presentation variants and advanced through the previously failing UIR02 node assertion, then failed at the existing global Search return assertion. This is retained in coordinator `work/iah-origin-nodes-final-native.log` (two PASS / one FAIL); it is not full UIR02 success.

A single synthetic native history trace (`work/iah-universal-back-history-trace.log`) established the exact second cause: Universal Search pushes its existing `paiaSearch:true` marker; Archive navigation's departure-origin checkpoint replaces that same entry and drops the marker; Reader then pushes an unmarked entry; Back pops the already unmarked Search origin. The trace injection was removed after diagnosis; the original UIR02 file and all assertions remain unchanged.

`reader-navigation` now preserves strictly `paiaSearch === true` only on an explicit replacement whose old route decodes successfully and whose view/document/Topic/Context/source/Project owner matches. Origin checkpoint metadata may change without losing its Search owner. New Reader pushes, different owners and absent/malformed markers do not inherit it. No marker contains search text. Actual coordinator-method tests reproduce the lost-marker failure before repair and cover same-entry replacement, new Reader push, Back/Forward, malformed marker and cross-owner negatives. No universal-search runtime change was needed.

## Evidence and limits

Six complete owner/regression files passed **45/45**, zero failed/skipped/cancelled (`work/iah-origin-history-final-unit.log`, 86.253167 ms). Independent reviewer confirmed both Archive signature sites, scroll correction and changed-tree boundary. Final native and final marker-review evidence will be appended below; no earlier successful parent run is reused for changed navigation runtime.

Only origin/selection/history presentation was corrected. No data owner, permissions, scope eligibility, query matching, timeout, assertion, CI or product version was changed by this repair. Historical failures remain retained. This is a local combination repair, not full IAH acceptance or main availability.


Final independent review accepted the same-owner marker boundary and both Archive signature sites. Two additional negative tests were added at the reviewer's suggestion: malformed prior route despite a true marker, and Source/Project/Context identity replacement. Six complete unit files then passed **47/47**, zero failed/skipped/cancelled, 92.6685 ms (`work/iah-origin-history-final-unit-expanded.log`).

Final complete native verification: **3/3 PASS**, zero failed/skipped/cancelled, 120551.224791 ms (`work/iah-origin-history-final-native.log`). This consists of the entire IAH result presentation source/release pair and the entire UIR02 source-plus-release journey. Both original UIR02 failure assertions now pass without changing the test or harness. Native tests ran serially with original budgets and isolated release builds; no visible browser was used. The unchanged five-file SHA-256 manifest `work/iah-origin-history-runtime.sha256` passed after completion. The final added unit negatives did not alter native/runtime bytes.

Runtime and native test SHA-256 follow. No current-main or full-CI claim follows from this bounded local success.

```text
786f1fa55af538218d2bf36546b5df9a9e0c546967c56e79035a0d2d038224dc  ui/archive.js
018de6334c217b93f382096b31bab51bedd30f466b9624e3112ea07fc889ea30  ui/archive-navigator.js
052b5a590a0a809de85d7ddb2eff1d5a5cf60e21b54ba8354243e41d0ee20ddc  ui/reader-navigation.js
a5ddac893f016c0f56490386f77b5dfe40eb80fc8165c68bb753b64dae91c676  tests/uir-02-archive-search-reader-chrome-e2e.test.mjs
456e37c5f84f68be68a39014aceea867dad18096f86506e5707e67043f107b50  tests/iah11-result-presentation-chrome-e2e.test.mjs
```


### Final coherent Archive delivery candidate

The coordinator merges stable Section creation/whole-Entry movement4ff675d6 (including main15091f1a) without runtime conflicts. IAH navigation runtime remains byte-identical to the repaired91b163e1; Topic runtime remains byte-identical to4ff675d6. Final combined selected baseline/source/release and Entry movement native files pass5/5 in29.52s, zero skipped/cancelled (work-iah-final-selected-entry.log). This supplements, rather than replaces, the complete UIR02/IAH presentation3/3 proof above.

Independent actual-router comparison preserves all320 placements from91b163e1 and316 from4ff675d6. Union81 complete browser files is covered once, all five admitted additions fixed4, historical76/304 unchanged. Seventeen complete routing-owner tests and coverage checker pass. No workflow or timeout changes.

For the distinct Archive UI integration after Section Actions0.22, manifest/package/version_name now identify0.23.0 Archive Navigation under DEVELOPMENT_WORKFLOW. Strict backup admission adds only minor23, rejects future24 and malformed23, retains schema5 and retired production export. Four complete version/restore tests and11816 package guards/376 release-product files pass; independent review inspected the actual0.23 generated manifest. Earlier browser results identify their exact0.22 packaging and unchanged runtime; the final0.23 candidate still requires its own hosted certification/build before delivery. No installed build, real-device or complete seven-lane acceptance is claimed.
