# SYNC-01 optional four-card desired-access owner

Base: `b425105d954178f6db036c7e02abc430ce71f214`; isolated branch `codex/sync-context-desired-20261008`. Only local optional injection; no production worker, provider, account, permission, schema, CI or version change. Full canonical restore/readiness is not claimed.

## Real owner boundary

The existing admitted `contextDesired` v1 codec contains exactly four stable keys (`info`, `rules`, `now`, `inputs`) and `{id, enabled, revision}`. `global`, device acknowledgement, consent, Topic binding/choices and connection credentials are not portable. `ContextCardsService` already has the necessary transactional optional journal injection and is unchanged. Default nonjournal behavior is unchanged and does not acquire sync protection or activation readiness.

`ContextDesiredSyncJournal` extends the existing manual Items journal only for four access commands; exact command operation IDs, receipts, restore fence and same-transaction outbox are reused. Existing choices can be explicitly bootstrapped without changing their local canonical value or receipts. No second desired-state store or schema migration is added; namespace protocol proofs are metadata, and `context-cards:v1` remains the only canonical owner.

A qualified incoming enable cannot expand effective access when local global access is already on and that card is off: the complete receive transaction refuses with `BNS_CONTEXT_ACCESS_CONFIRMATION_REQUIRED`, leaving all receipts, heads and local values unchanged. The same operation may be retried after an explicit local pause. Imported state never changes global access. Unregistered local choices/denials, changed owner revisions, epoch mismatch, invalid proof, purge, and unproven stage ancestry remain refused.

Core gains only a default-null, explicitly registered `contextDesired` conflict callback in the existing apply transaction. Generic merge behavior and all unregistered types are unchanged. A verified permission conflict retains every head and writes only a restrictive false projection for that card; all other cards, global access and Items remain untouched. The projection is bound to exact heads/namespace/epoch. Its revision is the maximum real head revision, not an invented next portable revision; an ordinary valid explicit resolution remains possible. Normal bound writes remain blocked by unresolved heads. An enable prepared before a same-value/same-revision restrictive projection still fails Core's generation fence; a changed canonical row also fails the existing owner CAS. No UI resolver or automatic conflict resolution was added.

Staged restore revalidates complete bounded ancestry in its own namespace, never borrowing the live shortcut proof. An initial four-card restore keeps global off; same-device restrictions remain protected. The current 128-node full validation bound can still block a long stage despite successful incremental per-step reception. That limitation and unresolved conflicts are not full-restore acceptance.

## Negative evidence and verification

- `/tmp/context-desired-before.log`: two genuine failures before implementation — actual access command succeeds without desired head/outbox; actual concurrent off produces a Core conflict without invoking the registered owner.
- `/tmp/context-desired-resolution-before.log`: explicit lawful resolution initially failed because the first projection consumed its next revision. Preserved; corrected projection passes the original resolution.
- `/tmp/context-desired-owner-first.log`: early test helper selected arbitrary last outbox UUID and returned the wrong operation. Corrected to exact command operation ID; no production boundary relaxed.
- The same-value held-prepare Core error is correctly wrapped as `STORAGE_FAILED` by the existing store; its actual `BNS_PREPARATION_STALE` is recorded inside the real journal commit and asserted separately, with full transaction rollback. No generic rejection replaces this oracle.
- Complete new owner file: **26/26 PASS**, `/tmp/context-desired-owner-final.log`.
- Ten complete existing Core/Prompt/Context/checkpoint/restore/readiness owner files: **161/161 PASS**, `/tmp/context-desired-regression.log`.
- Existing full Context native source/release file: **2/2 PASS**, 26.614265709 seconds, `/tmp/context-desired-native-first.log`. **94 cases per variant = original 68 + 26 desired cases**; original three real worker restarts and continuation 129-to-130 assertions remain. The first restart additionally proves exact desired state/head/proof/receipt durability, with global access off. Each variant has 12 production hashes and verified zero-network/native-IDB evidence in `work/qa-bns-context-info/{source,release}.json`. Synthetic consent and transport only; no real provider.
- **12427 package guardrails / 375 runtime resources PASS**, `/tmp/context-desired-package.log`; syntax and diff checks pass.
- Independent `root_finish` reviewed the two runtime files and actual complete owner file, independently **26/26 PASS**, `/tmp/sync-context-desired-independent.log`. Final native/receipt review also passed: reviewer read both PASS receipts, verified all 12 runtime hashes against current files, and confirmed original 68 cases, three restarts and continuation checks remain. CI admission for the new 94-case/12-hash evidence remains the coordinator's separate work.

## Exact code/test bytes

- `core/browser-native-sync/core.js`: `f05774ee6fc09919e439ec066d460c6405a06340072553331f1fe11b8e90d4fe`
- `core/browser-native-sync/context-desired-journal.js`: `e878f05fb6076076c9a31c2b0a4ebb5964822450f2f8d7b5df0816bbe2f283a3`
- `tests/browser-native-sync-context-desired.test.mjs`: `bc958a9a21b7870e26058c5349e0f933699d0cbe5a5596de3e951d2db0f5ba9c`
- `tests/native-sync/context-info-chrome.test.mjs`: `e555deed40be0eb95ebbc7f6f5feed080dd397013cead01e095c575ce38452f1`
- `tests/native-sync/context-info-worker-fixture.mjs`: `6568d1b61c0f96891b2827183c122f88036ddbbbb0eb5751ed735a4a7b4ef85c`

## Coordinator combined validation

At combined local checkpoint `df92fea5fedeff866ab3bd839322e016e60ed4b5`, all four complete native Sync files passed **38/38**, zero skipped/cancelled, 68.260 seconds (`/tmp/local-foundations-sync-combined.log`). Both Context variants retain 94 cases, 12 hashes and three real restarts. The actual updated CI receipt verifier ran via module stdin in the extension working directory and reported `BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS df92fea5fedeff866ab3bd839322e016e60ed4b5`. This is local checkpoint evidence, not a future head or cloud pass.

Both candidate and full workflows now require the exact four-card desired scope, 94 cases, desiredRestartProof and the twelfth production hash. Independent settings_finish review caught the first draft's stale scope before integration; it was corrected with a guard. Five complete CI contract tests and YAML validation passed independently. Original 12-minute budget, all three lifecycle proofs, 129-to-130 continuation, network ledger and exact head/tree checks remain.
