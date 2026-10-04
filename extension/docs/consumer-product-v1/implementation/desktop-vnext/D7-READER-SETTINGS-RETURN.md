# Bounded Reader return repair

Base: `e53943eda5adc5ed26bc6489ea1757615eb93c0d` (main after PR158).
Status: LOCAL_VERIFICATION / HOSTED_BROWSER_PENDING.

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
