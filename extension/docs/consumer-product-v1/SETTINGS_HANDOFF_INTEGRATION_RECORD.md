# Settings combined recovery checkpoint — 2026-10-08

Status: recovered local integration candidate, not main integration or delivery.
Base: `b9645b4468e50c621126cb68aa4630d28ec246e3` (PR #190).

This checkpoint combines the existing Settings composition with the acknowledged
AI organize-style preference, read-only storage/supported-site detail dialogs,
and the secondary Prompt position-reset action. It preserves the existing
worker/storage owners and the concurrent Prompt editor. No provider, paid call,
cloud account, deployment or IAH implementation is included.

The position reset reconciles generation changes without remounting the private
Prompt frame, losing a draft/IME selection, or changing Prompt families. The
layout repair keeps a default open card visible in a lateral safe band when a
tall composer leaves no vertical band. Actual Settings clicks cover refused
writes and lost acknowledgements as well as success.

## Local evidence and remaining gates

- 64 owning tests pass, zero failed/cancelled/skipped, after the scoped dialog
  keyboard repair. They include style ownership/recovery/content preservation,
  details, storage estimates, Prompt reset/state/presentation and Reader return.
- Complete UIR-01 source/release and all three UX-R1 cases passed before the
  subsequent dialog keyboard repair. This is bounded earlier evidence, not
  exact-final certification.
- Complete Data initially failed because Tab left a one-control native modal.
  The repair cycles only modal-local Tab/Shift+Tab stops, respects the selected
  radio in a group, and retains browser-owned Escape/close/return-focus.
  Its next attempt reached release construction but failed the keyboard-listener
  package guard. A separately reviewed exact-handler exception now permits only
  this Tab loop; additional listeners remain prohibited. The complete Data
  source/release file subsequently passed (1 top-level test, no skip/cancel),
  including recovery, details, actual keyboard focus and read-error states.
  Package guardrails passed 10852 checks across 323 JavaScript files.
- The complete Prompt source/release suite remains FAIL. New Settings reset,
  draft/IME and lateral-layout cases passed within those failed runs, which does
  not make the whole file pass. Native free-motion setup fails before its exact
  delta assertions; one earlier second-tab insertion also failed. No assertion
  or timeout was relaxed and all failure logs remain in coordinator work files.
- Drag diagnostics observed trusted pointerdown on the actual closed-shadow
  button with pointer capture set, but subsequent move/up did not reach the
  host. Coordinates and button box matched; a 1px pre-move and direct root CDP
  dispatch did not resolve it. These temporary diagnostic changes are excluded
  from this checkpoint. This observation does not prove a product-only or
  environment-only root cause.
- The headed-only Settings visual file remains an external gate; no visible
  local Chrome window was launched. Final composite/full acceptance, version
  reconciliation and exact-main evidence remain pending.
