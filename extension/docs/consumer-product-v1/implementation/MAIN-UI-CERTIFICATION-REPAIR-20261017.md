# Merged-main Browser6 fixture ownership repair — 2026-10-17

Status: implementation and local verification; current candidate native/full CI and exact merged-main qualification remain required. This is a test-only repair, retaining version0.52.0 and every delivered runtime/workflow byte.

## Original evidence

PR291 was normally merged as `f4ad4bb513cb265ac61270834a8b7a730c09dee7`. The state-only successor `2cc827e8e4bed9d7d7a2a57fce1d6a8f5724c3a8` actually selected Full certification. [Run39036406089](https://github.com/haohongfei2001-png/paia/actions/runs/39036406089) failed [Browser6 job117407071383](https://github.com/haohongfei2001-png/paia/actions/runs/39036406089/job/117407071383): 80/82 passed, two failed, none skipped. The other nine Browser shards, all four Unit shards, both macOS gates, Sync native and build/privacy passed. Full Suite Certification and Integration correctly failed.

[Original artifact12102349079](https://github.com/haohongfei2001-png/paia/actions/runs/39036406089/artifacts/12102349079) SHA256: `8e351b173d8851a01881fbd10e155abba5a9577818ae97d06589fdfa04e0c093`.

1. IAH selected Source failed at the Reader coarse-media assertion, not its44px target assertion. The failing mode was narrow dark200% text. Its result page reported coarse; Reader reported fine before and after the attempted independent CDP reset. Source's preceding two Back targets measured124×44 and44×44. Release's three modes also lost coarse before the reset, but passed after it. The evidence demonstrates mixed device lifecycle ownership; it does not establish a unique Chrome internal reset command.
2. UIR03 Source failed waiting for `scopedSearch.complete===true&&!scopedSearch.cursorInvalid`. Its original artifact lacks LibraryRunner/rebuild/pending metadata. Earlier Section lexical success uses another original index and cannot certify this index. The precise historical interleaving remains unproved.

## Bounded changes

### IAH device lifetime

Fine-pointer baseline/geometry and the original first deep-match keyboard journey run in a fresh `hasTouch:false` context. Each current Source/release coarse matrix gets its own fresh `hasTouch:true` context and seeds the same synthetic Input through the original capture route. Only Playwright's context owner controls touch for the lifetime; this fixture no longer creates a second page CDP owner or repairs touch state after failures.

All three top-level tests,90-second per-test budget, original baseline comparisons, three modes, matching visibility, keyboard arrival/Back/focus/query retention, reflow, reduced motion,200% text and44×44 minimums remain. Actual media/touch and target geometry are sampled together. Device state is checked around viewport changes, result screenshots, Enter, Reader screenshots and Back. Both fresh fixtures require zero external/extension/provider requests and page errors. Body-free device evidence is saved with the original receipt.

### UIR03 original worker seed owner

The synthetic fixture previously instantiated three additional page-local Stores, including a capture publisher independent of the worker's serialized control owner. Production instantiates one worker OrganizerStore. A deterministic real-Store/real-LibraryRunner regression proves that an independent capture publication crossing the worker's original before/local/after control reads raises `CONTROL_PUBLICATION_CHANGED` before callback entry; the original runner then correctly remains failed and the real scoped lexical index stays incomplete under ordinary wakes. The same capture queued through the existing worker Store cannot cross that active serialized boundary and the real scoped lexical index completes.

The native fixture now observes the existing LibraryRunner through an ordinary GET_STATUS wake, forwards the original wake unchanged, restores that prototype hook, and seeds legacy dates, provenance and official import through that owner's exact Store. It never replaces or closes the worker Store, retries failed work, clears a failure latch, drives maintenance directly or expands public CAPTURE admission. All original Source/release assertions and300-second budget remain. The hypothetical failure mechanism is demonstrated independently; it is not relabeled as proven original-run causality.

Failure-only bounded metadata records scoped page counts/completion/indexing/cursor flags, original maintenance error codes/callback entry, runner flags, rebuild phase and pending counts. It excludes bodies, queries, source text, credentials and provider data. No production diagnostics or new persistence is introduced.

## Verification boundary

Targeted deterministic tests pass11/11, including five diagnostic-failure controls. Evidence collection alone is bounded to1000ms; read/write/report failure or late completion cannot replace the original lexical error or extend its assertion budget. The original competing-owner negative still demonstrates failed/incomplete behavior; its replacement passes the real index. Source package audit passes16457 guardrails over490 runtime resources; standard0.52.0 release passes16393 guardrails over486 resources and510-file product checks. Local complete unit results and independent final review are recorded in the PR when settled. Native Chrome was not executed in this cloud environment; official changed-head Source/release/full CI remains mandatory, followed by exact-main Full after guarded merge. Prior candidate passes do not replace those gates.

Saved Now `97a2e802f4def595b2a6eb30d373bd33f6fa9385` remains intact and unmerged. Its reviewed local combined candidate is preserved separately and will be advanced to qualified main before its own integration PR. Human full-window visual acceptance,120Hz/NIB50ms/live-provider qualification, installation and whole-programme completion remain open. Preserve input-only privacy, human membership/order and paused Sync feature work.
