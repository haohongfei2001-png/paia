# Bounded Reader return repair

Base: `e53943eda5adc5ed26bc6489ea1757615eb93c0d` (main after PR158).
Status: INTEGRATED_HEAD_HOSTED_PASS / FINAL_MAIN_PENDING.

## Reproduced defect and boundary

The Archive/Reader [original D7 receipt](D7-ARCHIVE-READER.md#final-verification-boundary--2026-10-04)
retains the PR143-era failure: Reader → Settings → Settings Back → Reader reload
→ Reader Back reached Settings. That was truthfully excluded from the visual
batch; this separate consumer-reading repair addresses it.

`AppShellController.present` already captures the Reader's complete route when
Settings opens. Its existing Back listener forwarded topic, query and anchor,
but omitted `returnTo`. The existing `navigate` then used the current Settings
view as the new Reader parent, and `RouteHistory` correctly persisted that wrong
value. The production fix forwards the captured `returnTo` through that same
listener and navigation owner. There is no new route, state store or history
rewrite, and no editor, focus, control, appearance, Source, schema or external
provider change. Reloading within Settings itself and historical entries that
already contain the wrong parent are outside this bounded repair. Revisit's
existing visit-window lifecycle remains unchanged; only its destination is
preserved, with no claim of keeping a closed candidate window alive.

## Evidence

- CODE / UNIT negative: the new test mounts the real AppShell, installs the real
  Settings Back listener and fails on unchanged main because `returnTo` is
  undefined instead of `library`.
- CODE / UNIT repaired: verify repeated captured returns for Archive, Source
  Records and Revisit parents; retain topic/query/anchor, real Back node identity,
  and the navigation callback's false refusal. The actual navigate/leave owner
  is stubbed in this unit test; this is not browser or autosave proof. The
  existing RouteHistory encoder/decoder retains each original parent after
  loss of tab-local sessions.
- SYNTHETIC_BROWSER pending: update the existing complete D7 source/release
  journey to require the original Reader identity and parent after two keyboard
  Settings returns and two reloads, then browser Back/Forward and real Reader
  Back to Archive. All existing visual rows, durable literal edit/readback,
  immutable Source, history comparison/Cancel, native focus/resize, preference,
  no-network and compatibility checks remain selected. The old failure receipt
  remains historical evidence; the current test no longer requires that defect.
- Reuse `PAIA_D7_ARCHIVE_READER` and its existing complete appearance and
  compatibility jobs. No test filtering, timeout, workflow or assertion weakening.
- Native Chrome's socket permission failure was already established. Unit/package
  checks are not represented as native browser PASS. A local adapter-contract
  attempt also fails at its shared browser launch hook (27 cases) because its
  configured Playwright Chromium executable is absent; its other 21 cases pass. This failed local launch is retained, not retried or relabeled.

Local focused tests: 26/26 PASS. Privacy/security: 59/59 PASS. Package and release
guards PASS. The full unit run records 1,810 PASS and one unchanged 10k historical
import benchmark failure: 151,734.75 ms exceeds the existing non-CI controlled
120-second commit target. Its batch bounds, reading/search and idempotence passed.
A single unchanged, serial rerun also fails that same target at 147,942.67 ms;
all pre-threshold data assertions pass. Both negative measurements are retained;
there is no further local timing retry, and the threshold/fixture are unchanged.

No broader D7 completion, live-site certification, consumer distribution or
functional expansion is claimed. Exact-head hosted evidence and independent
review are required before adoption.

## Exact-head hosted verification and main reconciliation

Head `0d2957dd15e7377938da70bf9aede26615a41ee6`, tree
`069e7538290f58166466bacc21fce4ea81382dea`: candidate
[37241338155](https://github.com/haohongfei2001-png/paia/actions/runs/37241338155)
and complete D7
[37241338178](https://github.com/haohongfei2001-png/paia/actions/runs/37241338178)
PASS. Actual hosted results: unit 1,811; adapter 102; privacy 59; release/package
checks; two full source/release and three complete compatibility registrations.
Both downloaded full reports retain all 23 rows and record the original Archive
destination after two Settings round trips, two reloads and browser Back/Forward.
The four compatibility reports retain 40 rows. Network/page errors remain zero;
all 54 paired retained source/release PNG files are byte-identical. Independent
code review found no blocking issue; no new visual design is introduced.

Appearance artifact `11316888295`, ZIP SHA256
`a22b4f30c88a2cd63eb4848cc7b693fd14d87c00ad2e1ce10dbc416b06de24a7`.
Compatibility artifact `11317950219`, ZIP SHA256
`ebe535ef68257dfc21de4ab5da2e3f1d00cdbc415825b70ddfa522dbb9127d34`.
Local failures above remain truthful; hosted CI is separate evidence and does
not erase the controlled-machine 120-second benchmark result.

Before integration, main advanced to `fe1ab72fee35965548f7980a6b3e0b638cb4c332`
(PR159). All six external code/test/receipt files are adopted byte-for-byte; the
shared STATUS conflict is resolved by retaining both complete entries. Reader
runtime and its regression tests are unchanged. Fresh combined-head D7 and
round-integration gates are required; the earlier head is not relabeled as
combined-head verification.

## Combined runtime verified; later documentation-only main preserved

Combined head `266b0ab90217d8c32c545c2f8abc689c220fd77c`, tree
`b9952cfe9bda53a027f4d9b47cb8cbefef9f67eb`: candidate `37242275267`,
complete D7 `37242275247` and round-integration `37242292277` all PASS.
The tested merge `c18b48a344842e2398e0d45745252b6fda64fd0f` has that same tree.
Both new full reports again retain 23 PASS rows and the complete two-return,
two-reload, browser-history and final Archive destination observation; the four
compatibility reports retain all 40 PASS rows with zero network/page errors.
Appearance artifact `11317976611`, ZIP SHA256
`451041e711546a3cf812e2cfda2d4b902a49b0818c53a745ac4b7598b28d6f22`;
compatibility `11318050820`, ZIP SHA256
`6669a862267de9625ef6a24a2a29af3b3afb68b4fc3e5446402f63538e42580c`.

Immediately before merge, main advanced only in the Prompt Reuse receipt and
shared STATUS to `0febaac616ca5a1c5307fb3428650ee1285fa08b`. Preserve both complete
updated documents. This reconciliation changes documentation only relative to
the verified combined head; no runtime/test/workflow byte changes. The prior
negative local evidence and both successful hosted runtime receipts stay intact.
