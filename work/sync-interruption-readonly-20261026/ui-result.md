# Read-only Sync Settings result — local uncommitted candidate

Base/worktree: `397d9797ddb28d0a3f54857d4df4d835c7819c2d`, `/tmp/paia-sync-interruption-20261026T1824Z`, branch `codex/sync-interruption-inspection-20261026`.

Owned paths:
- `extension/ui/settings-sync-recovery.js`: new state presenter and observation-only controller.
- `extension/ui/settings-details.js`: exact original HEAD materialized (original blob `c47e3b4dd3f7b4aaec34ae0f2559bfe1db78bed1`), with tiny import/mount/sync registration only.
- `extension/tests/settings-sync-interruption-readonly.test.mjs`: newly authored finite presenter/synthetic-DOM controls.

Behavior: Sync is the first ordinary Data & recovery destination. Existing Settings detail owns modal/focus/dismissal. No request at mount; explicit opening/Refresh sends only `{type:'PAIA_GENERATION_STATUS'}` and consumes `{ok:true,data:{version:1,state}}`. All seven original states have English/Chinese copy. No raw operation/body/error fields are displayed. Unavailable remains honest without inferring a specific missing prerequisite. Prepared is incomplete, not assumed interrupted; prepared/UNKNOWN/finishing disclose unavailable original accounting/deadline and no continuation/retry/cancel. Selected concerns the existing local selection and cleanup only; original startup opener remains unchanged, and no whole-archive/cloud success is asserted. Unknown remains explicitly last-observed after an unavailable/failed read. No polling, command writes, activation, reload, storage, grant, schema or budget changes.

Responses are invalidated by a later read, Close/native cancel, panel/group/dialog hide, document visibility loss, and hide/show before mutation delivery. Pending mutations are drained before response consumption; reopening can issue a fresh read. Language updates make no requests or focus changes.

Executed evidence, not full acceptance:
- Attempt 1: 19/19 new-file checks, zero fail/cancel/skip, 119.951591 ms; prior runtime SHA256 `97fd5ebdd8dc6f2ba70a24d7aac2e538eb4f59126cd3cae2af895efedd89ac87`.
- Attempt 2: 20/20 new-file checks after unavailable/provenance correction, zero fail/cancel/skip, 130.192794 ms; exact identities retained in `ui-attempt-2-identities.sha256`. This completed before parent's subsequent instruction to avoid repeating already-passing new controls; no pre-existing suite was run.
- Final attempt 3: only newly authored `prepared receipt copy does not infer interruption or successful recovery`, selected with exact `--test-name-pattern`; 1/1, zero fail/cancel/skip, 116.147924 ms. No final full-file replay. Final identities in `ui-final-identities.sha256` and `ui-final-git-blobs.txt`.
- Final tiny tracked Settings diff whitespace check passed; no output in `ui-final-diff-check.log`.

All original logs, test plan and inspection missing-path/no-match observations are retained. No tests failed. Core/status implementation and its checks belong to the parent, not this receipt. DOM owner is synthetic in these tests: real browser modal/focus/visual/accessibility, Source/release, whole-suite, installation and provider qualification are NOT_RUN. No commit, push, publication, browser, network/provider or private user data access was performed.

## Authorized same-entry singleflight closure — supersedes preceding freeze

Parent/root reopened this same new read-only entry after candidate `01370f67` (not sent for review) to close overlapping physical status reads. Only the existing new UI module and its new test file changed. `settings-details.js` is unchanged from the preceding freeze.

One pending flag is acquired before the actual `PAIA_GENERATION_STATUS` dispatch and remains held until that request's own settlement `finally`. Close/hide still invalidates presentation but never frees the physical request. Repeated clicks/direct refresh calls and Close/reopen create no second request. Refresh is disabled and labeled in English/Chinese while pending; reopened views explain that the original read is still running. A stale settlement only clears pending UI; it does not paint the old result or issue a replacement request. A later explicit refresh is allowed after settlement. No protocol, timer, deadline, automatic retry or polling was added.

Exact prior source and test bytes are archived as `ui-before-singleflight-source.js.txt` and `ui-before-singleflight-test.mjs.txt`, with `ui-before-singleflight-identities.sha256`; earlier test evidence and all previous logs remain unchanged. Two prior overlap-expecting cases were replaced with stronger singleflight controls, and three hide/reopen/rejection controls were added. Only `--test-name-pattern='^singleflight '` executed: 5/5 PASS, zero fail/cancel/skip, 96.083768 ms, in `ui-focused-attempt-4-singleflight.tap` with exit 0. No whole-file replay or previously completed unchanged checks ran. The five cases are synthetic DOM/controller evidence, not real browser/focus/visual or worker/provider acceptance.

Final singleflight identities: `ui-singleflight-final-identities.sha256` and `ui-singleflight-final-git-blobs.txt`. Changed-file diff whitespace check passed (`ui-singleflight-diff-check.log`). Source review confirms the pending flag is not reset by any invalidation and is cleared only by actual request settlement. Frozen for parent commit; no further edits/tests and no commit performed by this UI owner.
