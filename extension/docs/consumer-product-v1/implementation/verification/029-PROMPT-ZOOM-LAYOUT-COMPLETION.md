# 0.29 Prompt native zoom layout completion

Base: `96fb278a`. Test-only correction; no production, CI, version, permission or provider change.

Full run `37839224739`, Browser 6 job `113524074073`, failed the release native 200% zoom viewport rectangle assertion. Original log: `work/029-browser6-failure.log`; exact artifact `11577089416` was inspected. It contains no failing geometry snapshot, so the exact cloud scheduling sequence is not claimed proven.

The previous fixture waited for DPR and viewport width, although `content/prompt-surface.js` schedules its real layout through requestAnimationFrame. Natural local reproduction passed all 40 tests (`/tmp/prompt-zoom-geometry.log`, 73.833 s); this did not close the cloud failure. A controlled diagnostic held only the real scheduled layout callback after zoom: DPR=2 and viewport=640×450 while the orb remained at x=1208 and card at x=912. The original strict rectangle assertion failed (`/tmp/prompt-zoom-held-before.log`). The hold was released in finally; it is not present in the final test. An earlier missing-ProseMirror setup failure is retained in `/tmp/prompt-zoom-diagnostic.log`.

The final fixture transparently observes completion of the actual isolated-world RAF layout callback. It schedules each callback exactly once, calls it once, and records completion only after it returns; exceptions propagate. The existing eventual wait now requires DPR plus this owner's completed viewport. The current content scripts have only one `requestAnimationFrame(layout)` call, in Prompt Surface; Next's same-named function is called synchronously/directly by events and does not enter this observer. The original RAF function is restored and the diagnostic CDP session detached in finally. No production layout invocation, forced movement, sleep, longer timeout, skipped case, or relaxed rectangle is introduced.

All original viewport boundaries, composer non-overlap, no-overflow, edit/cancel and both complete journeys remain. Geometry diagnostics contain only synthetic fixture geometry. Final source/release whole file: **40/40 PASS**, 0 skipped/cancelled, 59.876199125 s (`/tmp/prompt-zoom-final.log`). This is local headless evidence, not a new cloud or complete 0.29 delivery gate.

Final test SHA-256: `f8c3f10c954779d4619044e0a9b6e80f305d52941e33e00284cc083010627ec8`.

Independent review: `root_finish` APPROVED the actual scheduler/observer ownership, unchanged strict assertions and complete 40/40 log. No repeat browser run was needed for review. Cloud failure attribution remains limited as stated above.
