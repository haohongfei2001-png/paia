# PAIA Overnight Development — Start Here

Campaign: `paia-overnight-20260914-v1`.

## Two branches, two different responsibilities

- **Product source and all product changes:** `haohongfei2001-png/paia` → `ux-r2`.
- **This plan, execution state, and run reports:** `overnight/control-20260914` → `overnight/`.
- **Frozen CI-only base:** `overnight/ci-base-20260914` at `ad386c07cff59b9b3472a5aa03626fe89514f8d1`.
- **CI carrier:** Draft PR #28, `ux-r2` → frozen CI base. NEVER merge or retarget it. Never change `main`.

IMPORTANT: the control branch was created from a product snapshot. Its `extension/` and `native-hosts/` copies will become stale. NEVER use those copies as the active product source. Fetch product files from the pinned current `ux-r2` commit specified by the verified state. Do not merge the control branch into the product branch.

Keeping state off the product branch prevents lease/report updates from repeatedly triggering or cancelling the product PR's certification. A control-state commit is not a product checkpoint or product certification.

## Bootstrap read set for every independent execution

1. Resolve the control branch HEAD and read, at that exact ref, `OVERNIGHT_DEVELOPMENT_STATE.json`, this README, `OVERNIGHT_DEVELOPMENT_PLAN.md`, and the run report pointed to by `last_run_report`.
2. Resolve `ux-r2` HEAD and the frozen CI base. Verify them against the state BEFORE claiming work or writing product files.
3. From the verified product HEAD read `extension/AGENTS.md`, then follow its authority order. Always read current `extension/docs/ux/UX_IMPLEMENTATION_STATUS.md`; fetch the complete governing Spec and relevant feature contracts/source/test files, not just this plan's summaries.
4. Inspect the previous product diff, actual CI jobs/logs/receipts/artifacts and acceptance gaps. Only then select the first eligible incomplete functional slice.

The small bootstrap set locates all necessary context; it does not excuse reading the governing documents or actual implementation. State/report assertions are navigation and evidence references, not substitutes for code, tests or CI.

## Scheduling

Use ONE hourly task with at most EIGHT scheduled deliveries, all with the same prompt in `TASK_PROMPT.md`. Do not create eight prompts that force ON-01 through ON-08 by wall-clock position. A delivery may repair, verify, wait for CI, or safely stop instead of finishing a new slice.

The scheduled trigger limit and the state's admitted-execution limit are distinct. A skipped overlapping delivery still consumes the scheduler's eight-delivery allowance. Never add catch-up deliveries automatically. This bootstrap is execution 000 and does not consume an opportunity.

No task is created by these files. GitHub access, write approval, runnable validation and model availability must be established in the actual scheduled environment. Do not assume Codex, an always-on Mac, Xcode, physical hardware, signing identities, production accounts or secrets exist.

## Deliverables

- `OVERNIGHT_DEVELOPMENT_PLAN.md`: scope, eight slices, gates, concurrency, publication and recovery protocol.
- `OVERNIGHT_DEVELOPMENT_STATE.json`: single machine-readable campaign state; product HEAD is an actual SHA, not a self-referential placeholder.
- `BASELINE_AUDIT.md`: pinned repository findings and evidence limitations.
- `TASK_PROMPT.md`: identical instructions for each hourly delivery.
- `runs/000-bootstrap.md`: planning-only handoff; later runs use monotonically numbered reports.
