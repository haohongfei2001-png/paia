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

CI results will be recorded after execution; pending is not PASS. Existing owner
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
