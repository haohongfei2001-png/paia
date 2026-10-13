# AI-COST-05 bounded Organize provider lifecycle

This continues the existing Organize local-session owner. It is an engineering correction, not model/service activation, new product scope or a new user installation. The preceding lifecycle batch PR278 is separate and must safely integrate first.

## Actual change

The single-child and multi-child session directly awaited provider.execute, so an uncooperative provider never settled even after the existing timeout or session disposal. The preserved baseline reproduction is twelve failures across V1/V2/V3, timeout/disposal and late fulfillment/rejection.

Both original physical call sites now use one private bounded await with the unchanged organizerBudget timeout. A private per-job AbortController is aborted by dispose; an optional provider execution argument carries the private signal and deadline. Promise.race observes both branches, cleans the timer/listener and prevents a late response from reaching validation. A post-await registry check refuses disposed state. Foundation remains the sole durable attempt/UNKNOWN/reservation/anti-replay owner. Unknown results retain the one dispatched attempt and its reservation; no refund, ACK, automatic retry or partial candidate is invented. No schema, source capture, permission, backup, worker, financial, CI or shared writer changes.

The bound covers the physical provider wait only. It does not promise to bound an uncooperative authority reader, browser storage implementation or every downstream validation await. Original provenance, registry and current-authority fences still protect final commits. Real service remains unavailable without its original qualifications.

## Evidence

- Original actual-module twelve hung cases FAIL, retained in work-organize-provider-before.log. The identical initial matrix passed after correction.
- Final owning matrix: 28 PASS, zero failure/skip/cancellation, 10434.834333ms. Covers V1/V2/V3, multi-child first-call stop and first-success/second-call stop, timeout/disposal, late resolve/reject, late accessor zero reads, complete store equality, zero extra writes, UNKNOWN single attempt/reservation retained, zero ACK and no redispatch.
- Seven complete related files:136 PASS, zero failure/skip/cancellation,37180.015959ms. This includes the earlier20-case owning version; only the unchanged six related-file evidence is reused for final28. The expanded owning file was then run separately as above, not silently counted as the old version.
- Independent reviewer inspected the exact production and owning diff and executed two fresh-session late-result probes plus a copied exact final28-case block. All passed; that is explicitly copied-case execution, not an invented original-file command. Review and bindings are in work/reviews/ORGANIZE-LIFECYCLE-INDEPENDENT-20261013/REVIEW.md in the isolated worktree.
- Complete actual Source/release Chrome native journey:2 parent tests PASS, zero failures/skips/cancellations,77039.834208ms. All original cases plus40 new native scenarios passed, including a successful first physical child then stopped second child. Package16099 guards/471 runtime resources PASS. Native helper and wiring received separate read-only independent code approval with exact hash binding. No old acceptance/timeout is removed or enlarged.

Production SHA256:6cb65339bdecdfc84553a5915dd8c855a4fe7870d6ca3d4004da279aa1b33674. Owning test SHA256:3eb80a1a597362f45a71178b2389186ce40867483fcb89e6e3e841a8c88bf70d.

Under the existing ordinary-round protocol, affected native evidence, unit/regression tests, independent review and light integration precede merge. This is private waiting/lifecycle behavior, not a new durable transaction boundary. No complete AI-COST-05, real model quality, installed-user upgrade or entire PAIA completion is claimed. Sync new features remain paused, Pro264 owns its CI infrastructure, all Canonical final gates remain.

This is a follow-on ordinary engineering correction with the existing0.46.1 candidate identity, not a new release/distribution event. Original whole native run built and exercised its exact release bytes. Cloud integration and merge remain pending.
