# Settings Sync availability native receipt — 2026-10-23

At integrated HEAD `68bff5cd8e9d2ec02c2ed20c5e6b2026b940b750`, one targeted
Source/release invocation passed **2/2**, exit 0, no fail/cancel/skip/todo.
Source 2035.333583 ms; release 3256.453042 ms; TAP 5445.801084 ms;
wall 5.501248458996997 s. HEAD and all seven recorded source hashes remained
identical. Node 22.23.3, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47,
macOS arm64; original offline headless harness and temporary release builder.
Exact command, environment, source hashes and result are in `execution.json`.

The two appended cases in the existing `settings-next-chrome-e2e.test.mjs`
open the real Settings Data destination after the original consent ACK. In both
Chinese and English at 320 px they assert the exact six-destination order
(Sync, history, storage, backup, removed content, original source records),
unique Sync entry, actual modal semantics, native Space/Tab/Escape and click
close/focus restoration, and unclipped geometry. The dialog truthfully reports
unavailable, has only Close, exposes no enable/login/recovery controls, and
preserves the complete Chrome local storage snapshot. Original network guards
report no external/extension/provider request; harness errors remain empty.
The two JSON receipts contain only body-free status and geometry.

This qualifies the read-only destination, not production Sync, remote recovery,
provider authentication or native coordinator restoration. The original owning
file was not rerun and prior cases were retained. No real account, paid service,
cloud run, deployment or external message was used.

Independent static review of exact Sync package `d2b26b3891985f8c392ccdf64d8364bca6a30104`
found the two raised safety risks resolved: discovery validates every cut using
the original grouped-checkpoint compiler, then requires exact historical
revision-item containment before accepting the unique DAG end; discovery's
bounded public wait fences late listing/get results after timeout/pause/close.
Parent pointers alone are not accepted as causal coverage. Compacted/missing
history remains fail-closed. The original activation owner is awaited, and an
unknown commit remains unknown. Discovery cancellation does not cancel the
injected transport's underlying IO; stage/get and activate are not covered by
that discovery deadline. The package's separate owning Node batch was read as
94/94, not rerun for this receipt.
