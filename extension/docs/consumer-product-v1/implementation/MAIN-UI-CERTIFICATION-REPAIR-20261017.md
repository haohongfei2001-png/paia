# PR292 native execution correction — 2026-10-17

Status: local implementation and independent review complete; changed-head native/full certification remains required. Every production runtime, manifest, version and workflow byte remains unchanged. The original repair receipt below is historical; its dynamic-import observation route was not native compatible and is replaced here.

## Actual candidate failure

Candidate `c91694ec964450e8932e7dfb26c82d3f64c745bb`, tested PR merge `c4a03f1289157f97e4be86e4a4311a413157c7e7`, failed [Full39059013883](https://github.com/haohongfei2001-png/paia/actions/runs/39059013883). [Browser6 job117472963226](https://github.com/haohongfei2001-png/paia/actions/runs/39059013883/job/117472963226) rejected Source and release at the fresh coarse media assertion, then UIR03 failed immediately because `import()` is prohibited in ServiceWorkerGlobalScope. The new observer caused this second failure; it was not a recurrence of the earlier lexical timeout. Node-only tests and the preceding review did not establish MV3 compatibility.

[Browser6 artifact12111420560](https://github.com/haohongfei2001-png/paia/actions/runs/39059013883/artifacts/12111420560) SHA256 `13991711944f17dfeefa13bfe813c3075098e9716361684b3b462fe82b2cac3b`. Both IAH samples are coarse:false, fine:true, maxTouchPoints:1: Playwright forwarded touch capability, but this headless extension mode does not retain primary coarse media. The same artifact's Settings Source/release receipts on Chrome155.0.8059.39 pass six headed coarse groups and seven native activations per variant, including actual coarse media/trusted touch after navigation/reload. This matches the existing finite headless/headed investigation in settings/SET2-01.md. No unique Chrome internal reset command is inferred.

## Bounded corrections

IAH retains its exact fine-pointer baseline and90-second test limits. Only the coarse context uses the already-qualified headed1440×900 mode; a forced PAIA_HEADLESS=1 is rejected before launch. Actual coarse/fine/touch state is asserted before synthetic seeding, after it and at every existing action/target checkpoint. An actual fine-media/maxTouchPoints1 sample still fails even with a44px control. No media mock, isMobile emulation, CDP repair, extra sleep, target relaxation or skipped action is introduced.

UIR03 uses an owned temporary copy of the selected Source or standard built release. The original background worker bytes are retained in order, followed only by static imports of existing helpers and references to its original Store and LibraryRunner. The manifest is byte-identical. Observation wraps those same instances without new construction, public handlers, explicit maintenance driving, retries or failure-latch clearing. The three worker seed callbacks use those static references; page-only imports remain page-only. Original selected worker bytes and standard release output are untouched and copies are cleaned. Native evidence logs the selected worker/bridge digests and exact Store identity.

A deterministic test imports the actual copied service worker with synthetic Chrome/storage, verifies its real Store/runner identity and ordinary guarded maintenance completion, unchanged public CAPTURE refusal and zero network. The exact injected observer is additionally executed with every dynamic import rejected. This directly tests the prior prohibited execution form, but remains Node evidence rather than a native Chrome pass. Existing competing-Store failure and all five bounded-diagnostic negatives remain.

## Measured Browser3 capacity

[Browser3 job117472963281](https://github.com/haohongfei2001-png/paia/actions/runs/39059013883/job/117472963281) started18:39:01.466; its browser step started18:39:37.632. All53 cases (51 browser and two imported lifecycle controls) finished by18:57:02.563 with zero failures/skips. Package and development privacy audits passed by18:57:05.272; cancellation followed30ms later. Whole job1086.462seconds, browser step1047.678seconds. No tail test or hung file was found; fail-fast:false remained. Artifact12111615046 SHA256 `84c32b7638c501f3da9c326880b10f95569ac89e3a7e65d73a72f688d3f3c9a6` was uploaded. This cancelled job is not relabeled PASS.

Across Full39033996438 /39036406089 /39059013883, Browser3 whole-job durations were866.948/1002.057/1086.462seconds. Complete-file wall envelopes were: AI cost foundation135.161/225.079/261.433; Working Revision186.265/191.357/194.929; historical comparison252.418/262.320/273.154; IAH result159.741/178.412/202.005. Other six files total67–114seconds. These measurements establish insufficient reserve under observed execution variation, not a unique CPU/storage cause.

Only the complete eight-case Working Revision file moves current-ten3→10. Shard10's measured whole jobs742.331/623.739/720.606 imply combined planning envelopes928.596/815.096/915.535seconds; shard3 becomes680.683/810.700/891.533. These are estimates, not PASS evidence. The old saved-AI5→4 relocation remains, and every other frozen route stays exact:574 unchanged entries and two named current-ten exceptions, all1728 path-form checks. All100 files execute once, ten jobs are nonempty, historical4/5/6/7/9 widths and frozen JSON fixtures are unchanged. Context retains its dedicated artifact; both files create independent disposable browser profiles and release directories and run with original concurrency1. No workflow,18-minute deadline, per-test timeout, assertion or complete-file coverage changes.

## Required qualification

Final complete default-four unit run passes7408/7408, zero failures/skips. Targeted19/19 and independent19/19 pass; separate routing review6/6 passes. Source package16457 guardrails/490resources, standard0.52.0 release16393/486resources and510-file checks, privacy/network audit, syntax and diff checks pass. Independent final review is CLEAN, including byte comparison of all3087 selected Source files and510 built release files: only the disposable copies receive the exact static bridge. These local results do not certify native Chrome; changed-head Full/D7 and later exact-main Full remain required. Changed-head Source/release native Full, safe merge and exact-main Full remain mandatory. Saved Now97a and its separate integration are preserved; visual/device/live-provider/installation/whole-programme acceptance remain open. Preserve input-only privacy, human membership/order and paused Sync.

## Preserved original repair receipt

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
