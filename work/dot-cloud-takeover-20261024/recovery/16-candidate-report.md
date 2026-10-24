# Recovery causal-tail candidate, cloud Node 24

Base: 26e6b241342990dfd5d64b599e44e727fd692892
Branch: codex/dot-cloud-recovery-20261024
Commit: e92901c561d831f54f3612d7ba0f6d5344d26240 (clean worktree, no push)
Patch: 17-recovery-causal-tail.patch, SHA-256 dfc9dbd126ea9023ec1497fb44c7e816b8a33f6132c86cef30d30ef3e74398ad
Runtime: Node v24.19.0, bounded synthetic Node tests with vendored fake-indexeddb. This is not Node 22, macOS or native browser qualification.
Freeze: 14-freeze.sha256; aggregate SHA-256 fb8cc768f711ca82099b268b205220fd9441ee2c3dc1b1c88f00efce0259fbbf.

## Scope
- Changes only recovery-session.js, group-checkpoint.js, group-checkpoint-plan.js, idb-repository.js, canonical-generation-publication.js and the new owning recovery-causal-tail test.
- Actual stage/recover and discover-then-recover consume a durable validated ordinary cut and authenticate a complete causal path to the one head. Existing reconcileTail remains the sole staged-delta writer; final activation stays with the original owner.
- New tail admission is version-1 Source bootstrap/append, Working and admitted filterIntent only. Foreign/canonical-generation stage shapes, negative transitions, unsupported families, gaps, revision loss and incomparable heads remain refused. This does not implement general conflict merging.
- Same selected non-Source head, including historical listings, retains original recovery behavior. No Context owner or worker changes.

## Ordinary work protection
- One invocation's discovery, authenticated reads, decoded inputs, compiler input operations, old-stage reads, every tail edge and final activation share an opaque repository-bound restriction ticket.
- 4096 references, 2 MiB, maximum 30 seconds remain unchanged. A shorter read phase tightens the same private deadline; it never restarts the clock.
- Original native workCharge meters actual request references and physical operands/results before original control reads, through callbacks, terminal fences and finalizers. Failure consumes/burns the ticket, not just successful receipt accounting. No estimated read prepayment or qualified-budget borrowing.
- One repository window and one native scope at a time. Started/opening scopes retain the ticket until real settlement; no Promise.race removes the window early. Active generation binding is refused before prepare reads; shadow/selection authorities are not admitted by this ordinary window.
- Limits describe the original page/compiler-input and physical native work model, not exact JS heap allocation. Already confirmed native activation remains restored when pause/close arrives after commit. Lost acknowledgements remain unknown and use original durable recovery.
- Bound is per explicit ordinary invocation, not a newly invented persistent global allowance. There is no automated budget-failure retry; an independently invoked cold continuation preserves original behavior and the old failure is not relabeled PASS. The separately exhausted 129-group allowance was not used.

## Final validation
All six frozen files: node --check PASS; git diff --check PASS; sha256sum -c 14-freeze.sha256 PASS.

15-frozen-small-full-files.tap: 102/102 PASS, 7408.610607 ms. Complete files:
- browser-native-sync-recovery-causal-tail.test.mjs: 36 tests.
- browser-native-sync-local-recovery.test.mjs: 26 tests, unchanged source.
- repository-committed-work.test.mjs and canonical-generation-publication.test.mjs: 40 combined tests, unchanged source.

11-original-plan-selected.tap: 5/5 selected tests, NOT the full file. Exact name pattern:
^(native compilation|actual Source append|missing member|operation budget|actual canonical inventory)

12-original-restore-selected.tap: 3/3 selected tests, NOT the full file. Exact name pattern:
^(grouped checkpoint restores|successor full-scope|unknown activation acknowledgement)

Key new evidence: actual cold store/repository reopen; direct and two-edge path; one activation; exact revision and receipt persistence/no outbox echo; native rollback and lost ACK; local-edit/epoch CAS; pause/close and held read deadline; cumulative refs and one Source 64 KiB bytes; final activation actual native get overflow/rollback; ticket forgery/cross-repository/close/burn; pre-callback control reads; repeated native payload reads; reentry/double-ticket; opening late scope; foreign stage fields; unchanged non-Source same-head with/without history; unsupported new head; narrowed native deadline.

## Preserved earlier evidence
01 original recovery: 26/26 PASS.
02 initial candidate: 16/18 PASS, 2 test injection failures (wrong guessed physical restore key).
03 corrected physical-key injection: 18/18 PASS.
04 earlier transport-only work: 21/22 PASS, bounded byte test did not reject. This unsafe transport-only candidate is superseded, not approved.
05 first native work wiring: 0/22 PASS, compiler recoveryWork variable scope error.
06 subsequent work wiring: 3/22 PASS, profile admission compared physical owner families instead of operation coverage.
07 corrected profile: 20/22 PASS, actual stricter refusal codes differed from old assertions. Assertions were tightened to the exact observed DISCOVERY_LIMIT and GROUP_RESOURCE_LIMIT, not a broad error set.
08: 56/56 PASS (then additional native/family cases added).
09: 58/58 PASS.
10: original repository/publication complete files, 40/40 PASS.
13: recovery files, 62/62 PASS.

No Full, cloud diagnosis, large native job, seed/100k, 129-group/128-operation scale fixture, install, real account, credential, deployment, push, PR or release run. Independent read-only review: no blocking, bound to the six-file freeze. Candidate remains pending root combined validation/integration decision.
