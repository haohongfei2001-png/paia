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
Final hosted source/release browser, complete unit, adapter/privacy, package and
visual checks PASS as recorded below. Browser additions cover ordinary
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

[Second Foundation 37240899956](https://github.com/haohongfei2001-png/paia/actions/runs/37240899956)
on `bb721e91dd0b4d8b7fe4ba49c5ee04e65c16fa56` passed compatibility 14/14,
insertion 40/40 and every new toggle/guard/drag/lifecycle case in source/release.
Surface remained FAIL (28/36 PASS): the pre-existing compact/coarse journey had
the same explicit orb-click followed immediately by pointer-fallback `open()`.
Its redundant click detached the just-created frame and cascaded into two later
cases per variant. That explicit gesture now waits for its frame before readiness,
retaining every compact/200%/coarse assertion. No further runtime change is needed.

## Final integration — ENGINEERING_COMPLETE

[PR #159](https://github.com/haohongfei2001-png/paia/pull/159) merged as
`fe1ab72fee35965548f7980a6b3e0b638cb4c332` after a fresh main read of
`e53943eda5adc5ed26bc6489ea1757615eb93c0d`, exact-head passing gates and
independent source/final-test review with no remaining findings. The branch was
opened as a Draft, marked ready after verification, and merged only after the
non-draft integration gate passed. No protection was bypassed.

Tested head: `85135a19ef6b68e6405ca0a8701322fd1c3d7ac6`.
Head and remote merge trees both equal
`82bcc6bb07da4007f0c9b9120109baa7af32031d`.
Remote main and merged PR were separately read back. A subsequent documentation
closure changes only this receipt and the Prompt Reuse STATUS entry; it does not
relabel a documentation SHA as the tested runtime.

### Exact candidate evidence

- [Foundation 37241180030](https://github.com/haohongfei2001-png/paia/actions/runs/37241180030):
  PASS, Surface 36/36, compatibility 14/14 and insertion 40/40 source/release
  browser registrations; complete unit 1,814/1,814, adapter 102/102,
  privacy/security 59/59; zero failures or skips in those suites.
- [Candidate aggregate 37241183019](https://github.com/haohongfei2001-png/paia/actions/runs/37241183019),
  [all-eight visual evidence 37241183021](https://github.com/haohongfei2001-png/paia/actions/runs/37241183021),
  and [ready-state integration 37241574867](https://github.com/haohongfei2001-png/paia/actions/runs/37241574867): PASS.
- Candidate Surface artifact `11317538176`, ZIP SHA-256
  `7c171b11011e1a69fa76371e4feae4aa1175da45ddd05de217d75d15c9d239bb`.

### Exact merged-main evidence

- [Foundation 37241922675](https://github.com/haohongfei2001-png/paia/actions/runs/37241922675):
  PASS on the exact remote merge SHA. Surface 36/36, compatibility 14/14,
  insertion 40/40, unit 1,814/1,814, adapter 102/102 and privacy/security 59/59.
- [Integration 37241922694](https://github.com/haohongfei2001-png/paia/actions/runs/37241922694): PASS.
- Source package 11,445 guardrails / 292 resources; release 11,010 / 285
  resources; `RELEASE_PRODUCT_GUARD_PASS 309 files`. The three affected runtime
  files are source/release byte-identical.
- Main Surface artifact `11317038587`, ZIP SHA-256
  `1464abb4633a746e7235a120fc8e048e7eb5740712bba5a2e2ab0c450505dc69`.

Actual production source/release journeys prove idle click, native Enter/Space,
sub-threshold pointer movement, unsaved editor retention and save/cancel guidance,
IME refusal, busy query/close races, both Escape owners, separate-tab isolation,
real drag staying open, subsequent ordinary click collapse, saved-anchor round
trip, reload, SPA, worker restart, compact/200%/coarse/light/dark behavior and
unchanged exact insertion/draft/no-send/one-shot/privacy contracts.

Earlier local and hosted failures remain FAIL history with their causes recorded;
the final hosted complete benchmark passes without modifying its 120-second gate.
Unrelated full current/historical browser and macOS/platform certification jobs
were not selected, and are not claimed as rerun. This bounded engineering repair
does not certify authenticated current ChatGPT, a public release or another site.
No new real-use risk was observed in the tested scope; current live-provider
compatibility remains the explicit deferred evidence limit.

`VISUAL_ACCEPTED / OWNER_VISUAL_ACCEPTANCE = PASS` remains unchanged.
`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE` remains unchanged.
