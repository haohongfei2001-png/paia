# Deferred Final Gates — PAIA Consumer Product v1

This ledger records evidence or owner/external actions that remain mandatory for final certification but must not stall independent authorized engineering.

A ledger entry is never PASS. It may be removed only after the required evidence is completed or the product contract is explicitly changed by the owner.

## Open gates

### DFG-CPV1-001 — Same-ID signed consumer update certification

- **Owner round:** CPV1-01.3 — Consumer update flow
- **State:** EXTERNAL_CERT_PENDING
- **Reason:** no registered Chrome Web Store publisher identity / existing extension ID is currently available for a real same-ID signed distribution/update proof.
- **Still required:** real signed same-ID update preserving extension identity and local archive, post-update health, and rollback/update recovery evidence for the supported path.
- **Forbidden substitutions:** unsigned local install, a new unrelated extension identity, simulated store evidence, or a documentation-only claim.
- **Owner boundary:** do not create/purchase/register a distribution account, publish, or make a legal/public-release commitment without explicit owner authorization.
- **Non-blocked engineering:** CPV1-01.5 and all later canonical work whose implementation does not logically require this external result. CPV1-01.6 may finish all independent engineering/current-browser evidence while the same-ID distribution journey remains pending.
- **Final effect:** VS-01 and any package/release claim requiring consumer update certification cannot become COMPLETE/PASS until this gate closes.

## Deferred owner/private/device gates

### DFG-CPV1-002 — B-01 existing Thought edit semantics

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** behavior that must decide whether an existing/old Thought is directly mutable versus represented by appended correction/new Thought material; dependent write semantics in VS-05/VS-12.
- **Non-blocked work:** Thought root/Reader, independent new Thought creation, source/evidence relations that do not assume old-Thought mutation, AI Organize candidate/protection, Context, retrieval, prompt reuse, mobile/MyWrite, and all other independent engineering.
- **Safe interim:** do not add a new direct-old-Thought mutation path whose semantics would prejudge B-01.

### DFG-CPV1-003 — B-02 permanent Source deletion with human derivatives

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** permanent purge semantics when user-rewritten derivative material would be affected, plus AI write/delete behavior that depends on that meaning.
- **Non-blocked work:** reversible Topic/Archive removal, AI exclusion, unambiguous Source purge, tombstone/anti-resurrection engineering, and unrelated slices.
- **Safe interim:** fail closed for the ambiguous mixed-derivative permanent purge.

### DFG-CPV1-004 — Current-live ChatGPT/browser lifecycle evidence

- **State:** CURRENT_LIVE_DEFERRED_WHEN_ENVIRONMENT_UNAVAILABLE.
- **Owns:** CPV1-01.6, CPV1-02.7, CPV1-09.3 and any other provider-DOM acceptance that explicitly requires an authenticated current real site with the PAIA extension.
- **Non-blocked work:** all synthetic/headless engineering, lifecycle state machines, browser fixtures, UI, reliability and later independent slices.
- **Final effect:** affected slice certification remains pending until real current-live evidence is obtained.

### DFG-CPV1-005 — Real official private history export

- **State:** PRIVATE_EVIDENCE_DEFERRED_WHEN_ARTIFACT_UNAVAILABLE.
- **Owns:** the CURRENT_PRIVATE_EXPORT evidence in CPV1-03.1/03.6.
- **Non-blocked work:** importer contract, strict parser/admission, dedupe, resumability, streaming export, staged restore, failure injection and scale engineering using synthetic/redacted/publicly documented structures.
- **Safe interim:** do not claim official-export support until a current real private export passes.

### DFG-CPV1-006 — B-03/B-05 production connector and sync deployment policy

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** committing to production cloud residency/sync, regions/service burden/commercial commitments, and real connector/sync deployment choices that require those decisions.
- **Non-blocked work:** read-only connector contracts, trusted-boundary implementation behind local/synthetic harnesses, Passport enforcement, adversarial tests, transport-agnostic sync/merge logic, device trust/key interfaces, and other independent engineering.
- **Safe interim:** no new cloud authority, paid service, commercial commitment, or plaintext remote content policy is inferred.

### DFG-CPV1-007 — Mobile real-device and voice processor evidence

- **State:** DEVICE_OR_PROCESSOR_DEFERRED_WHEN_UNAVAILABLE.
- **Blocks only:** DEVICE certification and any third-party transcription choice that introduces new privacy/cost/processor commitments.
- **Non-blocked work:** mobile client architecture, MyWrite local-first path, mobile layouts, interruption state machine, explicit record/review/save flow, transcription interface and local/synthetic adapters.
- **Safe interim:** no background listening and no new remote transcription processor without owner approval.

### DFG-CPV1-008 — B-04 AI reply access/retention semantics

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** VS-12 reply-aware prompt assistant behavior that reads/retains/processes AI replies and the corresponding real acceptance.
- **Non-blocked work:** typed AI write proposals, review/commit path, permission enforcement, adversarial tests unrelated to reply retention, and all earlier product work.
- **Safe interim:** reply-aware reading remains disabled; prompt reuse phases 1–2 remain independent.

## Continuous-execution rule

While any gate above is open, the manager must continue the engineering frontier through dependency-safe canonical work under `WHOLE_PACKAGE_PREAUTHORIZED`. Stop only after automatable engineering is exhausted or a true owner/safety/dependency gate makes further work impossible.

If later evidence falsifies an assumption made by downstream engineering, repair the earliest affected behavior and revalidate the downstream evidence that depended on it.
