# AI-COST-06 private live-slot retirement — final correction

Final runtime/test commit `8fb6585155ad465577aec455842eb225652ab2ef`, tree `d52e88c67300039033e79d0865c5c0530c6f7b62`. This supersedes the runtime/test hash manifest and final test totals in [the initial private-session implementation record](AI-COST-06-PRIVATE-SESSION-LOCAL.md); that frozen historical record remains unchanged. The initial runtime `0b28116d` / receipt `98ae8a8a` and all retained failures stay valid evidence for their respective historical versions. This correction changes only `local-assist-session.js` and its owning tests. No production activation or overall AI-COST-06/Stage3A delivery is claimed.

## Actual defect and final behavior

Independent actual owner probes found that after eight COMMITTED reply cycles, a ninth genuine current reply failed RESOURCE_LIMIT: old leases were superseded but their invalid settled states still occupied the private table. A second independent probe reproduced the same limit after eight actual revisions to the selected manual Context item under one reply/lease. Both logs remain failed: `/tmp/ai-assist-independent-reply-capacity-before.log` (independent owning probe path as supplied by reviewer) and `/tmp/ai-assist-independent-context-capacity-before.log`; no capacity assertion was relaxed.

The author reproduction `/tmp/ai-assist-slot-retirement-before.log` had 27 PASS / 2 FAIL: sequential reply reproduced the defect; the first pending fixture was correctly stopped by existing same-scope REQUEST_ALREADY_IN_FLIGHT and was a setup mistake. The corrected pending fixture selects eight different real manual Context ranges, retaining the original Foundation admission behavior. With the added actual Context revision reproduction, `/tmp/ai-assist-context-slot-before.log` had **28 PASS / 2 FAIL**: both sequential reply and relevant Context revision exhausted the eighth old private slot; the eight held-provider case passed.

The private session now performs a bounded canonical qualification of at most eight **idle** states before initial and final capacity admission. It retires only states whose lease/time no longer qualifies, whose actual job is missing, or whose original Foundation.current canonical qualifications report STALE_BASE/UNAVAILABLE/CANCELLED. Unexpected storage/decoder failures propagate instead of granting capacity. Planning and running slots are excluded both before awaited qualification and immediately before deletion. Actual preparation has an explicit planning flag through plan publication/finally, preventing cleanup of a pending plan.

Retirement deletes the private map/handle binding and clears snapshot, payload, validated output, published output and captured Context bytes. It never deletes or rewrites durable jobs, receipts, attempts, dispatch fences or semantic evaluation identity. Old settled/unknown evaluations retain no-redispatch authority even when their private output is gone. A genuinely new observed reply or selected Context revision can create a different explicit evaluation; TTL/eviction/new lease cannot invent one. Valid live DEFER outputs are not evicted, and pending work cannot be dropped to bypass the eight-slot bound.

## Final exact-code verification

- Owning full private-session file: **31/31 PASS**, 0 fail/skip/cancel, 651.632375ms; `/tmp/ai-assist-slot-retirement-after.log`.
- Nine complete unit/audit files: **251/251 PASS**, 0 fail/skip/cancel, 2,766.723584ms; `/tmp/ai-assist-final-retirement-units.log`. Includes original concurrency8/refuse9, retained output-loss/unknown single-attempt proofs, and frozen actual old-reader audit.
- New actual owner cases: 12 successive fresh reply cycles and 12 selected Context revisions complete; each durable job keeps exactly one COMMITTED attempt and old handles stay unusable. Eight provider-await operations on separate real ranges stay allocated even after their leases are superseded; the ninth refuses RESOURCE_LIMIT before a ninth job. Eight still-qualified DEFER results remain readable and refuse a ninth selection without a ninth call/job. No public fake rows, lowered limits or mocked private state are used.
- Original complete AI native source/release file: **2/2 PASS**, 0 fail/skip/cancel, 32,567.028583ms; `/tmp/ai-assist-native-retirement-final.log`. Retains all prior legacy/Organize/V2/V3 and actual private adapter→Chrome tabs.get→native IndexedDB→original composer scenarios, including zero Context, one attempt, body-free durable metadata, selection/condition/IME/draft/uncertain replay/mutation/pagehide/consent and send0.
- Package **13,521 guardrails / 405 runtime resources PASS**, `/tmp/ai-assist-final-retirement-package.log`; development privacy/permission/network PASS, `/tmp/ai-assist-final-retirement-development.log`; release **425 files**, `/tmp/ai-assist-final-retirement-release.log`, output `/tmp/paia-ai-assist-private-retirement-final`.

The author-owned temporary dependency symlink was removed only after all test sessions completed. Runtime version remains author baseline0.34.0; Root owns coherent integration versioning. No additional Prompt browser rerun was made: the initial receipt's unchanged local Mac headless OOPIF failure remains FAIL, and exact coherent-head official cloud xvfb Prompt verification is still required. Initial `/c`-only, manual Context-only, independent consent, byte limits, no paid route/worker/Settings/WAR/permission/CI changes, and asynchronous Chrome/non-atomic cross-process limitations remain exactly applicable.

## Final changed-code manifest

All twelve initial runtime/test files are hashed below at the final correction commit; only the session and owning test hashes differ from the prior frozen manifest. This is the current manifest for independent review/integration, not a rewrite of old receipts.

| File | SHA256 |
|---|---|
| `extension/background/assist-reply-lease.js` | `4c4e8a08ed9d0a9ecbf83be60b24eed7dfd523ebd3b18178f24f0be918ad885b` |
| `extension/content/assist-result.js` | `712e100a338dc228a08ba27038eb5e2d806519acdb053755cf43719aebdf7187` |
| `extension/core/ai-usage/assist-intent-binding.js` | `70b9164c5e012fc27daeace4e692c55af7e607f60b1818d7c5d59540c1153a19` |
| `extension/core/ai-usage/assist-response.js` | `1e23bba4eb814faefc398e94fe0e642b18105b645db936b99e41996505d4f3b6` |
| `extension/core/ai-usage/contracts.js` | `7eaaa9a48e7e868cdfe15d8d740b168d3dd241723cf8993b6301d06ac1919edf` |
| `extension/core/ai-usage/foundation.js` | `62b5d166913eb2239cefe41a143966091640f7b0715419a9d1080bf24cb0117e` |
| `extension/core/ai-usage/local-assist-session.js` | `4148d0df1316e6dce209dea126cd64d5c0a15ed0fa746c4f5fdf25e202380ae4` |
| `extension/core/ai-usage/semantic-invalidation.js` | `f81080328bfbef7d93dd6b72e90addd87df802ffca75843eb29bbede220b7f61` |
| `extension/tests/ai-assist-private-session.test.mjs` | `5a49ac72784e9707f54f343e5bfaf7e1b0d604bf74d92df1a0eb581e9488921f` |
| `extension/tests/ai-cost-semantic-invalidation.test.mjs` | `e492989b2d7c174c9fe7e1984f81c720f11e141520e51d083dac889e01c8c756` |
| `extension/tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` | `d93bfb314a86bce78846127b8bc86ca8477064bb9150bba895ac475a9f5f5408` |
| `extension/tests/harness/ai-assist-native.mjs` | `bf50500066a28775ce8a75cf9843024d4ffcb2b3c0f1e5e64cd85fa7a0845551` |
