# Prompt Reuse — open Surface drag defect

Owner-authorized bounded defect repair, 2026-10-05.
Base: remote main `12b53d2c59a36c30d7516b922789a508060a466a`.

The visible open orb was anchored to the card corner while pointer/keyboard
movement used the invisible collapsed orb. Recomputing layout from that second
position could jump or pull the visible handle back toward its old card anchor.

The geometry owner now returns the actual visible orb for the requested open
state. A saved normalized position represents that one handle. The card is derived
from it with the existing corner relationship, and the complete attached Surface
is projected into viewport/composer-safe bands. Pointer origin comes from the
actual host bounding rect. Pointer release and Alt+Arrow persist the resolved
visible anchor, including clamp. No independent card position or schema is added.
Default unsaved placement and Visual Master materials remain unchanged.

Production source/release regression retains closed drag + reload and adds open
pointerdown/first movement/no jump, continuous orb/card movement, same open frame,
relative geometry, persisted mouseup, close/reopen, reload, SPA, worker restart,
keyboard traversal + Alt+Arrow, viewport clamp/320px and composer exclusion.
Draft, send and Provider assertions remain strict. Geometry units add shared
anchor and round-trip safety coverage; they do not replace browser verification.

Final verified results are recorded below. Existing owner
visual acceptance is retained. Real ChatGPT certification stays
`DEFERRED_EXTERNAL_EVIDENCE`; no real authenticated drag claim is made by synthetic
browser tests. No Family, ranking, management, insertion semantics, schema,
Backup, permissions, Stage 3, second provider, B-04 or D7 change.

## First execution and bounded follow-up

[Initial Foundation run](https://github.com/haohongfei2001-png/paia/actions/runs/37235480978)
passed pointer motion/no jump, attachment, close/reopen, reload and SPA/worker
geometry restoration, then exposed failure to persist a keyboard move after SPA.
Chrome's sender URL can remain the initial document URL. HOST geometry requests
now handle this mismatch only with a probe to the exact sender `documentId`, an
active top-frame sender, matching current live/tab URLs and rechecked consent.
Stale documents, navigation races and wrong origins fail closed. Insertion RPC
authorization is untouched. Unit coverage verifies this metadata-only boundary.
The later closed-reload failure in that run followed the unfinished fixture SPA
route; the exact fixture route is restored after SPA verification.

Geometry review also preserves default card height independently of pointer
position, avoiding a resize on first movement in short viewports. Full geometry
round trips are now asserted, not only orb coordinates.

Safe placement also admits lateral space beside a narrow composer and intersects
all candidate regions with the viewport, including when scrolling moves the
composer off screen. Production lateral/edge/compact cases and offscreen units
cover those bounds.

[Run 37236682519](https://github.com/haohongfei2001-png/paia/actions/runs/37236682519)
passed the complete release open/closed lifecycle. Its source run caught a test
readiness error: the first storage sample still held the valid pre-drag `null`
position while asynchronous persistence was pending. The existing bounded wait
now checks that position exists before comparing the same exact coordinates;
no timeout, numeric assertion or runtime behavior was weakened.

## Final integration — ENGINEERING_COMPLETE

[PR #157](https://github.com/haohongfei2001-png/paia/pull/157) merged as
`b959a69d66f5b780778f8e431c2e0c38656720b7` after reconciliation with main
`4bff3d0b8fa48981aea2ee4e9fae1f2b2ac1c28c` (PR #156 retained unchanged).
Tested head: `9262f8aced75053bca1aa6cae9aa198c81299784`.
Head and merge trees both equal `09c316faf05df4f5504eb9357a98022d1b8d9de8`.

- [Foundation](https://github.com/haohongfei2001-png/paia/actions/runs/37237072095)
  PASS: Surface 32/32, compatibility 14/14, insertion 40/40 source/release browser
  registrations; 1,807 full unit, 102 adapter and 59 privacy/security tests.
- Open and closed production drag both PASS for source/release. Open coverage
  confirms pointerdown and first movement without jump, exact continuous deltas,
  unchanged frame/attachment/height, mouseup persistence, close/reopen, reload,
  SPA, worker restart, keyboard Alt+Arrow, safe viewport edges, lateral space,
  compact layout, whole-composer exclusion, unchanged draft and zero send/Provider.
- [All-eight visual evidence](https://github.com/haohongfei2001-png/paia/actions/runs/37237071896)
  and [integration/certification](https://github.com/haohongfei2001-png/paia/actions/runs/37237072166)
  PASS. No functional or default visual regression observed in the tested scope.
- Source package 11,445 guardrails / 292 runtime resources; release 11,010 /
  285 runtime resources and 309-file product guard PASS. Optional unrelated full
  browser/platform gates were not selected; no claim that those were rerun.

`VISUAL_ACCEPTED / OWNER_VISUAL_ACCEPTANCE = PASS` remains unchanged.
`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE` remains unchanged.
No Stage 3, second provider, schema, Backup, permission or D7 change.
