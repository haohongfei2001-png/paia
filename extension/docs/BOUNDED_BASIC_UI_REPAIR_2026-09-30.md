# Bounded basic UI repair — 2026-09-30

Baseline: `c1217dbac2008d8b1a4c95dfb490965fc3e3a82c` (remote main).
This is a separately authorized repair branch. Consumer Product v1 remains
`PAUSED_FOR_PRODUCT_FOUNDATION_REVIEW`; Draft #99 remains inactive and unmerged.
This work does not restart that program or change storage, capture, permissions,
Source identity, user-edited bodies, deletion fences, or deployment.

## Repair contract

- The Chrome action popup declares a 350px intrinsic root/body width, independent
  of its initial viewport. Count text wraps as a group, preserving a readable
  label width instead of a vertical column of CJK characters. The CSS interaction
  is a source-level diagnosis; the original native-window failure has not been
  independently reproduced in this executor.
- Archive shows its single source-scoped search toolbar before the project tree.
  Search refinements appear during a query. Recent/continue/Revisit shortcuts,
  per-project search/details buttons, and per-window preview/date/details chrome
  are removed from the ordinary root/navigator presentation.
- Projects remain initially collapsed. Duplicate titles within the same group
  receive restrained numbered labels. These labels are session-only, remain
  attached to the same window through reordering and added pages, and never
  rename or alter the underlying records. Source/project organization and the
  selected window remain intact.
- Reader has one conversation-scoped search and its existing time-order control.
  Smart Filter/show-all/recovery controls are removed from Reader. Filtering and
  reversible recovery stay available through Settings and Archive search.
  Reader date/time metadata remains always visible and subordinate to prose.
- Light canvas/sidebar surfaces are white with neutral hover/selection surfaces.
  Explicit dark-theme preferences remain supported.

## Verification boundary

Focused unit/source checks cover nested-toolbar placement, Reader-return placement,
repeat placement without DOM churn, duplicate-title labels and normalization,
initial collapse state, intrinsic-width declarations, white tokens and removal of
Reader-specific filter controls while Settings recovery remains.

Browser regressions are updated for the new presentation while preserving
underlying navigation, source/data safety, filtering and recovery checks. The
native action-popup test opens Chrome's actual action view without imposing a
normal-tab viewport. Normal-tab popup rendering is only a stylesheet/logic check.

The local executor cannot launch Chromium because of an existing socket-permission
restriction. Its cloud browser also prohibits extension URLs. These restrictions
were respected; browser E2E, UI Refresh, and native-popup geometry are **NOT RUN**
on this branch locally. A passing unit suite or release build is not browser or
user acceptance. A supported Chrome executor/hosted browser gate must execute
these tests before any native-popup acceptance claim.

Local default unit run: **1196/1197 passed**, with the existing 10,000-input
fake-IndexedDB import benchmark over its unchanged controlled-machine limit:
151.86s commit versus 120s. The isolated retry also failed at
143.88s. The baseline checkout's retained observation was 146.99s.
No import/storage/performance code or threshold is changed by this repair.
The repository's existing CI mode treats this timing target separately from
bounded batch, idempotence, search/read and data-integrity correctness; its
functional unit result must be reported separately, never as a 120s performance pass.

Privacy/security: **57/57 passed**. Adapter contract: **21 pure contract cases
passed; 27 DOM cases failed in browser setup before assertions**. No browser
workaround or repeated launch escalation was attempted. Source package guardrails
and the 250-file release build pass. Final CI-mode unit result and commit are
recorded in the repair PR.
No merge, deployment, live-provider acceptance, or user-data modification is part
of this repair.
