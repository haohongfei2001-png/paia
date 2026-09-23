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

Stop and ask the owner only for:

- a Product Intent conflict listed in AUTHORITY.md;
- a new privacy/data-collection permission;
- a new external account permission with meaningful user-data access;
- a paid plan, billing account, purchase or new recurring cost commitment;
- an irreversible/destructive migration not already covered by an approved migration contract;
- a legal/public-release commitment;
- a genuinely personal semantic judgment that independent evaluation cannot establish.

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

## 4. Start-of-round protocol

For every round:

1. Resolve current remote main HEAD.
2. Read STATUS.md, AUTHORITY.md and the current slice/round contract.
3. Read only relevant current PRODUCT/ARCHITECTURE/history needed for compatibility.
4. Inspect current code and recent commits; do not assume the planning baseline is current.
5. Confirm there is no other writer touching the same runtime/data boundary.
6. Reuse correct work already on main or an active PR; do not redo it.
7. Record the exact start SHA in the round receipt/status.

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

A normal round progresses:

DESIGN/RECONSTRUCT → IMPLEMENT → TARGETED TEST → FULL REQUIRED CI → DIRECTLY APPLICABLE BROWSER/RELIABILITY EVIDENCE → MERGE → EXACT-MAIN CHECK → RECEIPT → STATUS UPDATE.

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

### 7.4 External-capacity deferral

A release host, provider site, CI capacity limit, deployment quota, or similar external dependency must not be converted into a PASS.

When all engineering work for an ordinary round is green and the only missing evidence belongs to a later slice-level certification boundary, record that evidence as deferred and continue the already-authorized slice. Do not keep a Work execution alive merely to poll an external service.

If the current round explicitly owns the unavailable evidence, record `ENGINEERING_COMPLETE / EXTERNAL_CERT_PENDING`; the round remains not COMPLETE. The manager may prepare or implement the next already-authorized round only when doing so does not depend on the uncertified behavior or create overlapping writer risk. At most one PAIA round may be ahead of such a pending round.

Publication remains separate unless the current round explicitly owns consumer distribution/release behavior.

If any required engineering stage fails, fix within the round or close BLOCKED/FAIL with the evidence preserved. Security, privacy, data-integrity, deletion, identity and migration-safety gates are never deferred merely for throughput.

### 7.5 GitHub CI scheduling

The GitHub workflows implement the progression above:

- while a normal implementation PR is **draft**, every runtime push uses `PAIA Candidate Gate`: unit shards, contract/privacy checks, sharded current-browser coverage and release/package guards. This is engineering feedback, not round certification;
- when the manager judges the candidate stable, mark the PR **ready for review**. `PAIA Certification` then runs the complete current required categories once on that exact head;
- subsequent fixes on a ready PR rerun full certification, so keep the PR draft during ordinary inner-loop iteration and batch related fixes before promotion;
- current browser coverage is sharded for wall-clock speed but every current browser test remains required for full certification;
- the `Full Suite Certification` job is an aggregate exact-SHA receipt over the already executed unit/browser/contract categories; it must not rerun the same tests serially;
- documentation-only changes under `extension/docs/**` do not trigger runtime certification. Documentation closure must cite the already certified runtime SHA truthfully;
- merge still requires the round's applicable full candidate evidence, and exact-main verification remains required after runtime integration. CI scheduling may reduce duplicate work, not evidence standards.

If a PR is intentionally non-draft from creation, full certification applies immediately.

## 8. Branch and merge discipline

- One integration writer per data/schema/runtime boundary.
- Small PRs are encouraged, but product acceptance remains the round/slice contract.
- Candidate CI is not exact-main CI.
- After merge, perform the round's exact-main checks before marking COMPLETE.
- Documentation-only status commits must describe the runtime SHA they certify and must not imply the docs SHA itself is the runtime.

## 9. Slice boundary

When a slice completes:

- update STATUS.md;
- publish a compact receipt containing exact SHAs and evidence;
- state remaining known limitations honestly;
- release writer ownership;
- stop unless authorization covers the next slice.

The owner should see a user-visible capability summary, not raw engineering logs.
