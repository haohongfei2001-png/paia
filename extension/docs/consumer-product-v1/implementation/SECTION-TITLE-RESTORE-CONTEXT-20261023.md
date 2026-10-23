# Section title restoration: current human interpretation in Context

2026-10-23. Successor to baseline `273b0d6dffff258d07c3efcd77ba4083ec241be0`.

## Result and precise semantics

A real original-owner Section title restoration can now participate in the
existing bounded Context maintenance route. It is the **current independently
human-confirmed title**, not a request to replay or certify a historical restore
target. This corrects the over-broad historical-target prerequisite proposed in
`STRUCTURAL-RESTORE-BASELINE-20261023.md`; the baseline's observed unsupported
behavior and tests remain accurate for that commit.

The mapper validates the exact latest user title journal, before/after revision,
original `planHumanSectionEdit` transition, current authorship/protection and
original operation receipt. Restoration adds strict receipt identity/schema,
sequence/time/digest-shape and exact result checks. All existing complete bounded
Input-mirror membership, current Topic/Section, source, exclusion, field,
processing, byte/read and original Context publication/ACK fences remain.
It reads no historical restore target and adds no body acquisition, persistent
field, canonical schema, Sync format, original writer or security setting.
The original receipt is trusted local owner state, not a new cryptographic
signature over arbitrary storage: its digest is not reinterpreted as independent
permission or recomputed against a guessed historical request.

Only actual validated rename mappings receive an ephemeral positive Topic
reconciliation brand. Restored-title mappings and copies do not. The session
requires that brand both at admission and at its final Topic mapping check, in
addition to the existing service capability. Thus setting
`reconcileHumanSections=true` cannot make a restoration emit Topic output or
ACK. Context retains its exact independent grant and original owner.

This finite implementation does not cover other structural operations, authored
Entry Topic, Placement Topic, Topic-name restoration or cross-source retrieval.
Same-Topic Section moves continue through the already implemented Placement
Context route; no duplicate structural route was added.

## Validation and retained failures

New actual-owner positive coverage: restore a prior rename's before-title,
original journal/receipt evidence, current complete selected material, one
Context fixture call, exact Context ACK, separate Topic DEFER, and unchanged
human-owned tables. Negative controls cover title/before/after/revision/actor/
mask/operation, receipt namespace/schema/owner/result/digest-shape/time/sequence,
protection, source removal, denied/wrong-field/expired grants, revocation and
new title after dispatch, plus ACK abort rollback and replay without a second
provider call. Copies cannot obtain the Topic brand.

The first focused run passed24/25: the expired-grant test changed the resolver
after session construction, so the session correctly retained its originally
captured resolver and committed. Recreating that fixture session reached the
original expiry guard, but the initial assertion expected a returned state
instead of its actual `prepare` rejection (`UNAVAILABLE`), yielding0/1. The
correct original API assertion then passed1/1. No runtime permission or expiry
behavior was changed to accommodate these fixture corrections.

Final single four-file owning batch: **350/350**, exit0, no fail/cancel/skip/todo,
TAP41475.589875ms. Files: structural-context, section-topic-reconciliation,
structural-topic-reconciliation and topic-context. Original rename and Topic
reconciliation checks remain included. Saved log:
`work/section-title-restore-20261023/owning.log`, SHA256
`f1c717063c019217aad1b09ba28e94956df787b36f9f1efac56621fd6932e1c2`.
`git diff --check` also passed. Node22.23.3 uses
existing local fake IndexedDB. No native browser, large seed, installation,
external service, real data, model, cloud CI or deployment was executed. Native
Source/release validation of this new runtime remains a separate integration
milestone; local passes are not that evidence.
