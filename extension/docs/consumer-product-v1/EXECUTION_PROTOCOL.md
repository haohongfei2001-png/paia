# Execution Protocol — PAIA Consumer Product v1

## 1. Manager model

This package is designed for a high-reasoning ChatGPT manager operating against GitHub remote main.

The manager is responsible for product/technical integration. Codex or another coding agent may implement bounded tasks, but the manager owns:

- current-state reconstruction;
- task decomposition;
- review;
- integration;
- CI interpretation;
- real-browser evidence;
- UX convergence;
- status/receipt closure.

The product owner is not the manual project manager.

## 2. Authorization modes

Default after package activation:

- "继续 PAIA" when no slice is active authorizes the one slice marked READY as WHOLE_SLICE_PREAUTHORIZED.
- The manager may execute all ordinary rounds in that slice without asking the owner after each round.
- "继续" during an active slice resumes that same slice.
- A new slice is not automatically started after the current slice closes unless the owner has explicitly granted whole-package continuous authorization.

The owner can explicitly grant WHOLE_PACKAGE_PREAUTHORIZED later. Even then, owner gates below still stop execution.

## 3. True owner gates

The following are true owner gates for the **affected action or product meaning**, not automatic package-level stop conditions:

- a Product Intent conflict listed in AUTHORITY.md;
- a new privacy/data-collection permission;
- a new external account permission with meaningful user-data access;
- a paid plan, billing account, purchase or new recurring cost commitment;
- an irreversible/destructive migration not already covered by an approved migration contract;
- a legal/public-release commitment;
- a genuinely personal semantic judgment that independent evaluation cannot establish.

When one is reached:

1. do not guess, cross, or weaken the gate;
2. record the exact dependency in `DEFERRED_FINAL_GATES.md`;
3. leave the dependent feature/action disabled, unshipped, synthetic-only, or explicitly uncertified as appropriate;
4. continue every later canonical task that is independent of that unresolved decision;
5. ask the owner immediately only when the answer is required to keep any useful engineering path moving; otherwise batch the decision for final convergence.

The whole package stops for an owner gate only after all dependency-safe automatable work has been exhausted.

Do not ask the owner to choose:

- component libraries;
- CSS values;
- ordinary data structures;
- refactor boundaries;
- test repairs;
- accessibility fixes;
- performance tuning;
- ordinary dependencies;
- code organization;
- retry/backoff mechanics within an approved privacy/cost envelope.

## 4. Start-of-batch and subround protocol

For unfinished Consumer Product v1 work, the default execution unit is a **coherent integration batch**, not one PR per numbered subround.

At the start of a batch:

1. Resolve current remote main HEAD.
2. Read STATUS.md, AUTHORITY.md, the slice contract, and every numbered subround included in the batch.
3. Read only relevant current PRODUCT/ARCHITECTURE/history needed for compatibility.
4. Inspect current code and recent commits; do not assume the planning baseline is current.
5. Confirm there is no other writer touching the same runtime/data boundary.
6. Reuse correct work already on main or an active PR; do not redo it.
7. Record the exact batch start SHA in the PR/body or batch checkpoint.

Inside the same batch, advancing from one numbered subround to the next does **not** require a new branch, PR, formal receipt, STATUS rewrite, merge, exact-main certification, or full context reconstruction. Keep the same sole writer and record only a compact checkpoint in the active PR when useful.

Re-read remote main before integrating the batch, and immediately if evidence shows another writer changed the same dependency boundary.

## 5. Implementation rules

- Product behavior is fixed by higher intent; implementation may change.
- Prefer deleting obsolete UI coordination after the replacement path is certified; do not leave permanent dual behavior.
- Never weaken an old safety test merely to make a new design pass.
- Do not convert a failed normal capability into a PASS by demonstrating a fallback.
- No real private archive text enters Git, CI logs or public screenshots.
- No hidden paid AI retry, remote upload or new provider permission.
- Current Source, human edits, revisions, deletion fences and authorization must survive migrations.

## 6. UI implementation-first convergence

There is no mandatory standalone prototype phase.

For a UI round:

1. implement the real production path behind an isolated route/feature gate where needed;
2. exercise it with realistic synthetic long-form data and all relevant states;
3. capture representative desktop/narrow screenshots or browser recordings;
4. audit against UX_CONTRACT.md for hierarchy, density, actions, focus, errors and long-content behavior;
5. fix deviations in the same round;
6. only then close the round.

"Looks cleaner" is not an acceptance criterion.

## 7. Verification progression

Verification is progressive. Do the cheapest truthful evidence first and reserve expensive environment-level certification for the boundary that actually owns it.

### 7.1 Inner-loop / candidate

During implementation:

- run targeted tests and affected regressions;
- use bounded browser smoke or lifecycle checks for the behavior being changed;
- batch related fixes before starting another full candidate;
- do not deploy every candidate or repeat unchanged production evidence;
- do not widen the acceptance surface merely because more cases could be tested.

A candidate is not a release and does not require publication unless the current round explicitly owns a release/distribution outcome.

### 7.2 Round closure

For unfinished rounds after this cadence amendment, a normal round progresses:

DESIGN/RECONSTRUCT → IMPLEMENT → TARGETED TEST → AFFECTED REGRESSIONS → LIGHT INTEGRATION GATE → MERGE → MAIN READBACK → RECEIPT/STATUS.

Ordinary round closure does **not** require reacquiring the complete historical browser suite, macOS certification, performance matrix, accessibility matrix, CURRENT_LIVE evidence, or unrelated reliability scenarios. Those belong to the owning slice/certification boundary unless the round itself changes that risk boundary.

The light integration gate keeps unit, adapter/privacy contracts and release/package build guards. The executor must still run the directly affected browser journey locally or in a bounded CI job before merge when UI/browser behavior changed.

Escalate an ordinary round to full certification immediately when it changes schema/storage identity, deletion/anti-resurrection, capture admission, privacy/authorization, migration/rollback, release identity, or another invariant where delayed discovery would make later work unsafe.

Only evidence directly required by the round contract or needed to protect an affected invariant is a round-closing gate. Evidence already valid for unchanged runtime paths should be referenced rather than mechanically repeated.

For provider-facing behavior, synthetic/headless evidence may close the engineering behavior of an ordinary round when the round contract does not itself require CURRENT_LIVE proof. Current provider compatibility is then certified at the owning slice/certification boundary. Evidence labels must remain truthful.

### 7.3 Slice / certification boundary

The full evidence classes in VERIFICATION.md are slice-level acceptance. At the slice's explicit certification round or final closure, collect the applicable:

- current real-browser/device journeys;
- complete reliability/degraded matrix;
- user-level acceptance;
- performance evidence;
- migration/release-path evidence;
- final exact-main receipt.

No slice may be marked COMPLETE while an applicable final evidence class is missing.

### 7.4 Deferred external gates and continuous engineering

A release host, provider site, CI capacity limit, deployment quota, distribution identity, signing credential, or similar external dependency must never be converted into a PASS.

PAIA tracks two independent frontiers:

- **engineering frontier** — the furthest canonical round/slice whose automatable implementation and non-external engineering evidence have been completed;
- **certification frontier** — the furthest round/slice whose required external/current-live/distribution evidence has also passed.

When an unavailable external dependency is the only missing evidence, record the exact obligation in `DEFERRED_FINAL_GATES.md` and mark the owning round `ENGINEERING_COMPLETE / EXTERNAL_CERT_PENDING`. It remains not COMPLETE.

Under `WHOLE_PACKAGE_PREAUTHORIZED`, an external-only pending gate does **not** impose an arbitrary one-round or one-slice lead limit. The manager continues through later rounds/slices already present in the canonical plan whenever dependency analysis shows that the next engineering work:

- does not require the missing external result to be true;
- does not weaken or bypass the pending gate;
- does not cross a true owner gate from section 3;
- does not create conflicting writers on the same runtime/data boundary.

If only part of a later round depends on pending external evidence, defer that dependent evidence/action and continue the independent engineering portion or the next independent canonical work. Do not keep an execution alive merely to poll an external service.

A later engineering round/slice may be integrated while earlier certification remains pending, but its receipt/status must name the unresolved predecessor and may not claim end-to-end production certification. Slice/package COMPLETE remains impossible until every applicable deferred final gate is actually satisfied or the product contract is explicitly changed by the owner.

If delayed external evidence reveals an implementation/product defect, reopen and repair the earliest affected behavior, identify downstream evidence invalidated by that defect, and revalidate it. Unrelated independent engineering need not be discarded or globally stopped.

Publication remains separate unless explicitly authorized. Security, privacy, data-integrity, deletion, identity, irreversible migration, and permission gates are never deferred merely for throughput.

### 7.5 GitHub CI scheduling

For unfinished work after this amendment:

- draft runtime pushes use the lightweight `PAIA Candidate Gate`: unit suite, adapter/privacy contracts and release/package build guard. Full historical browser coverage is intentionally absent;
- the executor runs targeted browser tests for the behavior actually changed before each meaningful checkpoint; do not use a green lightweight gate as proof of untouched browser behavior;
- when an ordinary round is ready to integrate, mark the PR ready. `PAIA Certification` runs the light round-integration gate by default;
- add the exact marker `PAIA_FULL_CERTIFICATION` to the PR body when the current round is a slice certification boundary or the manager classifies it as high-risk under section 7.2. Full Current Browser, Full Suite and macOS certification then run on that exact head;
- when merging a full-certification boundary, include `PAIA_FULL_CERTIFICATION` in the merge commit message so the exact-main run also uses full depth;
- ordinary round merges receive the light exact-main integration gate; they do not mechanically rerun all browser history;
- workflow_dispatch remains an explicit way to run full certification when needed;
- documentation-only changes under `extension/docs/**` do not trigger runtime certification.

Already completed rounds keep their historical evidence unchanged. Do not reopen or recertify them merely because this cadence changed.

## 8. Branch, batch and merge discipline

- One integration writer per data/schema/runtime boundary.
- For unfinished slices, prefer one long-lived **slice-batch PR** covering 2–4 strongly related numbered subrounds instead of a PR per subround.
- Numbered subrounds remain scope/checklist boundaries; they are not mandatory Git integration boundaries.
- Within a batch, commit freely and run targeted checks without marking each subround COMPLETE on main.
- Produce one formal batch receipt and one STATUS/main integration update at the batch boundary. The receipt must state which numbered subround outcomes are satisfied and which remain.
- Merge early only when a high-risk boundary requires independent integration evidence, when the next work genuinely depends on main integration, or when the batch has grown too broad to review safely.
- Do not keep a batch open merely to absorb unrelated future slices.
- Candidate CI is not exact-main CI.
- After a batch merge, perform the selected exact-main integration gate once; do not repeat it for every numbered subround already covered by the same batch.
- Documentation-only status commits must describe the runtime SHA they certify and must not imply the docs SHA itself is the runtime.

## 8.1 Default batch map for the current desktop build

Unless a newly discovered dependency makes a boundary unsafe, use the following integration batches:

- **VS-02**
  - Batch A: CPV1-02.1 + 02.2 + 02.3 — AppShell, Archive root, Project/Conversation Navigator.
  - Batch B: CPV1-02.4 + 02.5 — Conversation Reader plus retirement of migrated legacy UI ownership.
  - Closure: CPV1-02.6 + automatable CPV1-02.7 — performance/accessibility and certification; CURRENT_LIVE may remain deferred.
- **VS-03**
  - Batch A: CPV1-03.0 + 03.1 + 03.2 — support scale, import contract, resumability/preflight.
  - Batch B: CPV1-03.3 + 03.4 + 03.5 — streaming Backup, staged restore, failure injection.
  - Closure: CPV1-03.6.
- **VS-04**
  - Batch A: CPV1-04.0 + 04.1 + 04.2 + 04.3 — editor/query foundation, direct editing, inspector, lexical search.
  - Batch B: CPV1-04.4 + 04.5 + 04.6 — Smart Filter, removal semantics, reliability matrix.
  - Closure: CPV1-04.7.
- **VS-05**
  - Batch A: CPV1-05.0 + 05.1 + 05.2 + 05.3 + 05.4, with unresolved B-01-dependent behavior fail-closed/deferred.
  - Batch B: CPV1-05.5 + 05.6.
  - Closure: CPV1-05.7.
- **VS-06**
  - Batch A: CPV1-06.0 + 06.1 + 06.2 + 06.3 + 06.4.
  - Batch B: CPV1-06.5 + 06.6.
  - Closure: CPV1-06.7.

Later VS-07..VS-12 may use the same 2–4-outcome batching rule after their dependency boundary is re-read; do not invent a giant cross-slice PR in advance.

## 9. Slice boundary and unattended continuation

When a slice reaches full COMPLETE:

- update STATUS.md;
- publish a compact receipt containing exact SHAs and evidence;
- state remaining known limitations honestly;
- release writer ownership.

When a slice is engineering-complete but remains open only on deferred external certification, record that split state and release the completed engineering writer. Under `WHOLE_PACKAGE_PREAUTHORIZED`, immediately advance the engineering frontier to the next dependency-safe canonical work rather than waiting for the external gate.

The package-level unattended execution stops only when:

1. all currently automatable engineering in the authorized canonical plan is exhausted; and
2. every remaining unresolved item is a true owner gate, external/private/device-only evidence gate, or safety/integrity dependency that makes further work genuinely unsafe or logically dependent.

When a current round contains both blocked and independent work, close the independent engineering as `ENGINEERING_PARTIAL / DEFERRED_GATE_PENDING` or the most precise equivalent, release that writer when safe, and route to the next dependency-safe canonical work. A blocked final evidence class must not monopolize the engineering frontier.

Do not stop merely because a round/slice is awaiting a provider, store, deployment quota, live account, private export, real device, signing identity, product-owner decision, or publication decision when independent engineering remains.

The owner should see a user-visible capability summary plus a concise deferred-gate ledger, not raw engineering logs.
