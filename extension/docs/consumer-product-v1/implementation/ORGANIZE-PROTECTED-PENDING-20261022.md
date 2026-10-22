# Protected pending Organize state — 2026-10-22

Responds to dot [6341123658](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6341123658), within the approved completion/UI scope. Base `13f75eba8085b3ef422ecb8cb9f51b0e4bbb781b`; implementation `37dbd6b65d20c56c139f4e5d2f761e2c07f74dd5`; independent `codex/organize-protected-pending-state-20261022`. Remote base, main4349189451821db1e408a669cee5b64b140844f6 and PR313head7afb39930d53d3478062a3202b369f99f2aaa0ca verified unchanged. No version, acceptance branch, workflow, Full or merge action.

## Behavior and scope

When new material exists but every output field is protected, the original planner correctly selects no inputs but previously lost the reason. That unprivileged no-job result became completed/noDelta and the screen incorrectly said there was nothing to update.

The existing V3 protected planner now carries `blockedReason: PROTECTED_FIELDS` through its V2 helper opt-in and no-job session result. Explicit style refresh with no writable fields reports the same reason. No affected material still yields the original genuine no-delta state. The configured runner returns `completed:false`, `noDelta:false`, `requestCount:0` and the protection reason. The original screen says “整理字段均受人工保护，本次未更新；待处理内容和已有整理均保留。”

The low-level compatibility state remains NO_DELTA with an explicit blockedReason; it never authorizes run or grants cache authority. No new body read, model call, coverage ACK, revision, journal, charge or user workflow is introduced. Existing final Source/revision/revocation protection and 4096/2MiB/30-second bounds remain. No unprotect/adopt action or old-candidate promotion.

Changed runtime files: ai-incremental-v2/v3, local-organize-session, configured-organize-runner, ui/common and ui/topic-workspace. Changed tests: organize-fresh-current, topic-organize-service-action, signed service fixture (optional bounded all-fields response), and original fresh-current native file. [Exact ten-file vector and logs](evidence/organize-protected-pending-state-20261022/manifest.json).

## Verification

Versions: Node v22.23.4, Python 3.12.14, Playwright 1.63.0, Chrome 155.0.8059.85.

- Initial paired tests **1/4**: two fixture failures attempted to add list items using the field editor, which preserves list cardinality; original log retained. The synthetic signed response now creates those eight fields through the real generation contract before real field edits.
- Corrected fixture on original runtime **2/4**: genuine no-delta passed; owner pending/completed assertion and UI protection-message assertion failed. This is the direct original failure, preserved separately.
- Three owning Node files **35/35** after repair. Actual action source, runner and signed service fixture prove exact equality of meta, revisions, jobs, usage, receipts and work items across both outcomes; no new physical provider call. Existing transaction rollback/human/authority safety assertions remain.
- Affected V2/V3/lifecycle regression **63/63**. This is scoped planner coverage, not a rerun of the earlier54-file aggregate or Full.
- Actual headless native Chrome **Source/Release 2/2**, each pairing genuine no-delta with protected-pending on the existing UI. Native IndexedDB content/jobs/work/usage/revisions/receipts unchanged; physical synthetic provider count stays1 from setup, zero new calls in both clicks. Original UI human text remains and no candidate-decision control appears. All external/extension network requests zero; synthetic HTTP protocol bridge remains the original harness.
- Native log binds all six changed runtime files before/after. Five staged modules match source bytes; configured runner has the existing harness action/error observation insertions, separately hashed unchanged before/after. This is scoped six-file binding, not a whole-runtime certification claim.
- Package **21218/607** and final diff whitespace check passed. Runtime did not change after native evidence.

## Handoff

All logs, including both original failures, are compressed with raw/gzip SHA256. Native test uses fresh temporary profiles and existing headless harness, synthetic data and no real paid model. Dot owns independent review, exact integration and frozen candidate hosted/native/Full qualification. No full green aggregate is claimed for the preceding Current successor (715/721, then34/35, then1/1 remain separate). Actual production identity/quotas/PostgreSQL/model behavior and font hosted qualification remain unverified; historical STALE_BASE/MEMORY_STALE remain UNKNOWN. No additional product decision is required for this truthful-state fix.
