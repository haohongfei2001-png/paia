# Prompt Reuse — guarded orb/card toggle repair

Owner-authorized bounded defect repair. Base: remote main
`e53943eda5adc5ed26bc6489ea1757615eb93c0d`.

## Root cause and retained initial evidence

The expanded orb click executed `if(frame)frame.focus();else expand();`.
It could open the card but could never request collapse. The new production-host
VM regression initially failed on the unchanged runtime: 10 existing cases passed,
1 new case failed with `open orb must request the guarded close policy`.
This is CODE regression evidence, not live-provider certification.
Local native Chrome could not start: the execution environment prohibits its Unix
socket (`socket() failed: Operation not permitted`), including the approved test
launch. Neither the first nor the second source/release browser attempt reached
its tests; they are NOT_RUN, never a product failure or PASS.

## Bounded repair

- Pointer click and native Enter/Space toggle the existing states. Host Escape
  requests the same close path.
- The host sends nonce-only intent through the worker, bound to the exact active
  top document, current URL, live card and current consent. It never removes an
  iframe in response to its own click or receives the personal library.
- The private card owns one close policy for orb requests, Close and Escape.
  Editing retains the complete draft and existing save/cancel guidance; busy,
  refresh, row-drag and composition states refuse forced closure. A permitted
  close freezes controls until the existing authenticated close RPC completes.
- A real orb drag keeps the card open. Its trailing pointer click is consumed,
  while the next ordinary click, keyboard click and cancelled-drag recovery are
  not accidentally suppressed. Existing 5px movement threshold is unchanged.
- Saved visible anchor, default placement, visual CSS, insertion, Family/ranking,
  durable schema and permissions remain unchanged.

## Verification

Targeted production source/worker tests: 14 PASS locally, including initial
reproduction, drag/cancel/keyboard gating, exact document/nonce validation,
negative callers, navigation/revoke races and SPA document handling.
Hosted source/release browser, complete unit, adapter/privacy, package and visual
checks are pending on the published candidate. Browser additions cover ordinary
and sub-threshold click, Enter/Space, both Escape owners, unsaved/IME preservation,
pending-query and close races, two-tab isolation, drag-then-click, saved position,
reload, SPA and worker restart. Existing insertion and lifecycle cases remain.

`VISUAL_ACCEPTED / OWNER_VISUAL_ACCEPTANCE = PASS` is preserved.
`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE` is preserved.
No D7, Stage 3/capsule, reply reading, second provider, B-01–B-05, paid service or
public distribution change is included.

## First hosted execution and review follow-up

[Foundation 37240671803](https://github.com/haohongfei2001-png/paia/actions/runs/37240671803)
on `1b8e07dccd188449fefafa6ec3b900efc93e84d6` passed all 14 compatibility
and 40 insertion registrations, then failed Surface (4/36 PASS, 32 FAIL including
parent registrations). The first new keyboard test called the pointer-fallback
`open()` helper before the key-created iframe had its navigated URL; the extra
click now correctly toggled that frame closed, causing later shared-state
failures. The correction explicitly waits for key-only frame creation before
calling the readiness helper, so a missing keyboard-open cannot be masked.
The drag follow-on also sampled the new frame's entry animation (0.32px offset).
The readiness helper now awaits existing animation completion before preserving
the same exact geometry assertions. No timeout, fixture or assertion is weakened.
Independent review cleared the runtime; its additional safe-feedback correction
handles ordinary worker `{ok:false}` responses as well as transport failures.

Local full unit: 1,813 PASS / 1 FAIL / 0 SKIP. The unchanged 10,000-Input fake-IDB
benchmark exceeded its existing 120-second gate on this execution machine. Its
threshold and fixture remain untouched; hosted full-unit proof is still required.
Local source package 11,445 checks / 292 resources and generated release 309-file
product guard pass. Three changed runtime files match source/release bytes.
[Initial visual evidence](https://github.com/haohongfei2001-png/paia/actions/runs/37240678117)
passed; this does not certify the corrected head or current real ChatGPT.
