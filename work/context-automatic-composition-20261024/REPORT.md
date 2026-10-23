# Automatic Context composition — WIP handoff, not acceptance

Frozen at the user's instruction to stop development and hand off. No further test, build, native browser or cloud run was started for this handoff. The current seven-file implementation is incomplete and must not be integrated as qualified code.

## Base and ownership

Worktree: `/Users/hhf/.codex/worktrees/paia-saved-resident-jobs/paia`.
Branch: `codex/context-current-lineage-20261024`.
Pre-WIP parent: `12509bc2` (full identity in source-vector.json).
This branch already contains reviewed Context candidate `f16769308d1fb0743afe4ef2d3551c40e96ced5c` (root reports its integrated equivalent `5237b9d2`), precise Human `3ab92f5f` cherry-pick `7c3a8e4b`, and Human paging follow-up `d4df405e` cherry-pick `12509bc2`. Only the final WIP commit is this unfinished package. Do not blindly merge the evidence branch or reapply the Human candidates.

## Actual unfinished code

- `group-checkpoint-plan.js`: adds limited Source/Working/linked Human/Context group causality. Linked evidence must identify the original Source and exact maximum Working content revision; the real Working producer becomes a dependency. No budget or group limit changes.
- `input-working-commit.js`: private original Working application projects its validated Input state to the Human future view, plus exact store/core-bound disposal.
- `human-library-plan.js`: advances that Source future view and the original Working invalidation epoch, then uses original evidence construction. Existing Context capture/metering and Human paging changes remain.
- `human-library-group.js`: dispatches real Source and Working producers explicitly instead of treating every non-Human group as Source.
- `group-checkpoint.js`: prepares original Working capabilities before Human preparation and releases them in `finally`, retaining the compiled graph's real write order and existing work ticket. The requested negative control proving disposal when Human preparation rejects has NOT been implemented/run.
- `group-checkpoint-scope.js` and `human-library-scope.js`: experimental exact-plan-derived linked epoch rather than sampling a destination's pre-replay epoch. This is not independently reviewed or fully regression-tested; generic and restored paths still need negative controls.

## Executed evidence, all failures preserved

Only the existing small Node fake-IDB / synthetic-HTTP automatic round-trip was run. Exact command is in PLAN.md. Runtime was the existing absolute Node 22.23.3 binary, macOS arm64. No native/browser/build/large seed/129-group/cloud run.

1. `automatic-baseline.log`: frozen Context+Human base, 0/1, exit 1; `BNS_HUMAN_UNSUPPORTED` in original linked graph guard. TAP 352.850167 ms.
2. `automatic-first.log`: after finite graph/private Working implementation, 0/1, exit 1; `INVALID_REQUEST` at the real evidence epoch check inside Human restoration. TAP 1185.573166 ms.
3. `automatic-second.log`: after future Working epoch and compiled linked epoch changes, 0/1, exit 1; `BNS_GROUP_RESOURCE_LIMIT` during protected shadow B activation. TAP 1368.402875 ms.
4. `automatic-budget-trace.log`: one body-free diagnostic of the same failing small case. The actual common transaction ticket reached refs 3454 / 4096, bytes 2099146 / 2097152, active time about 237 ms; refusal occurred in `runFinalReadFences` reading a final fence. This is a real byte-budget limit, not the Human paging bug and not a timeout. Original 2 MiB/4096/30s limits remain unchanged. Temporary instrumentation in `idb-repository.js` was restored byte-for-byte; it has no tracked diff.

No passing automatic full round-trip exists for this WIP. Failure occurred before a completed B activation, so cold B adoption/edit and C restore are not qualified. The original full case was not reduced. No additional rerun was performed after the precise Human paging follow-up was incorporated.

`before-human-page-followup.patch` preserves the exact WIP before that follow-up; it is evidence, not an installation instruction. PLAN.md was prepared before these runs and its original waiting wording is historical; this report supersedes it.

## Remaining work / explicit blockers

- Review and prove graph causality, linked epoch derivation, private Source/Working projection and rollback for the combined profile.
- Implement/run requested exact Working capability release-on-Human-rejection negative control and relevant owning regressions. Existing f167's 821/821 is prior-candidate evidence, NOT this WIP's qualification.
- Preserve the observed 2 MiB final-fence failure. Investigate duplicate work only if evidence establishes a safe exact optimization; do not increase limits, skip fences or shrink the original case to claim success.
- Native currentMixed Source-linked qualification is NOT implemented: native linked-scope gate, provenance/dependency raw capture and metering, real source evidence/epoch binding, source-linked query/search semantic projection and complete table comparison remain required. Simply adding allowed kinds or removing the native links guard is insufficient. The seven-file WIP does not remove those native guards.
- No new native validation authority, cloud allowance, paid call, credential, real account, deployment or destructive operation is implied. Root/dot must explicitly qualify any final native run under the current user's limits.

## Handoff status

Independent WIP only; root must keep it outside the accepted integration branch. No push, main change or PR mutation was performed by this agent. No owned tool process remains running. All implementation and observed failures are retained for review.
