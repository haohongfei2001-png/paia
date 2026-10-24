# Context interrupted-delete composition preservation

## Exact scope and source

- Base: `98761c8c627ee66445c20dee452959d644fcd634`, tree `b3b243627bf9ff117565d27d646f126a63e6c55b`.
- Source/test commit: `dc140d5d37dedc874ecb3b00e753fc71214bcf31`, tree `d67e950c4f966ede06341350d9501c92a28d188b`.
- Branch: `fix/context-interrupted-delete-ime-20261024`.
- Only runtime change: `extension/ui/context-cards.js`, original `ContextCardsPage.remove` owner. No service, schema, transport, navigation owner, package/version, CI, provider or permission changes.
- Canonical contract: `extension/docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_PLAN.md` (CTX4-UI-1.7), sections 3–5, and retained `AI_CONTEXT_CARDS_V2_PLAN_PRE_UI_2026-10-13.md` CTX4-02. Direct editing, IME, failed drafts, selection, durable ACK/CAS, delete/undo and leave protections remain.

## Reproduced failure

The original Delete menu callback enters the actual page controller. An actual second-editor or target-editor save is held at the synthetic worker transport, while the target's real `PlainTextSurface` composition listeners receive new text. During composition the visible field can differ while `local` still equals the saved body and `dirty()` is false. The old controller resumed after its one initial composition check and sent a durable delete, disposing the composing target.

The first complete owning invocation, before any runtime edit, is preserved as `red-owning.log` and `red-owning.exit`: **87 total, 81 PASS, 6 FAIL**, zero cancelled/skipped/todo. All six added cases fail at the explicit zero-delete assertion, actual 1 versus expected 0: Info/Rules/Now × held other/target save. This failure is not replaced by later green evidence.

## Bounded repair

The original remove operation captures the existing open generation, card and editor identity. It revalidates those facts plus current composition/busy state after other-editor flushes, after an already-pending target save, and immediately before deletion. A fresh editor also revalidates after its awaited recovery-draft clear. A stale or interrupted preflight returns without dispatching a delete, disposing the editor or changing selection. Composition completion does not replay the cancelled delete.

No new navigation lock, pending-action owner, body cache or storage protocol is introduced. Existing failed/conflicted saves still refuse; a deliberate blank saved editor remains deletable; ordinary nonblank editing still saves before deletion; explicit retry and original undo remain functional. Already-dispatched delete acknowledgement, recovery-clear and post-commit navigation races are outside this pre-admission repair and are not claimed solved.

## Added owning coverage

Twelve new cases in `context-cards-local-ui.test.mjs` exercise the actual controller, original listeners, commit/recovery owners and synthetic IndexedDB service:

1. All three editable cards retain active IME after held other-editor saves.
2. All three editable cards retain active IME after held target-editor saves.
3. Fresh editor retains composition or committed dirty text arriving during recovery clear.
4. Old delete preparation cancels after close, same-card reopen, or editor replacement.
5. Failed draft remains protected; blank saved deletion/undo and blank fresh removal still work.

The interrupted-composition cases assert exact node/editor identity, text, focus and synthetic selection preservation, no target delete, no premature target-draft clear in the other-save case, no auto-replay after composition end, durable subsequent editing, and a new explicit delete/undo. They do not claim physical IME or native layout verification.

The existing small prototype fixture in `context-edit-lifecycle.test.mjs` now supplies its real-owner preconditions (`active`, `card`, `openGeneration`). Its original empty-delete assertions are unchanged. The first 11-file run exposed that missing fixture state: `first-related-complete.log` remains **254 total, 253 PASS, 1 FAIL**. No production guard was weakened to satisfy it.

## Validation

Environment: Node `v24.19.0`. No dependencies installed.

- Initial repaired owning run: `green-owning-initial.log`, **87/87 PASS**.
- Expanded owning run: `green-owning-expanded.log`, **93/93 PASS**.
- Corrected complete related run: `green-related-complete.log`, **254/254 PASS**.
- Exact committed-source rerun: `green-exact-source.log`, **254/254 PASS**, zero failures/cancelled/skipped/todo.
- `node --check` on the runtime and both changed tests: PASS.
- `git diff --check` for source/tests and this report: PASS. The raw Node failure logs intentionally retain their original whitespace; including those logs in a whitespace check reports Node's space-only failure-display lines, not a source defect. The failed evidence was not normalized.
- Independent reviewer: exact source commit reviewed, **13/13** synthetic adversarial controls and **134/134** across five complete owning files, zero skips. These overlap the author evidence and are not added to a combined total. No blocking finding in this bounded preflight change.

Exact 11-file command, run from repository root:

```sh
node --test extension/tests/context-cards-local-ui.test.mjs extension/tests/context-edit-lifecycle.test.mjs extension/tests/context-draft-discard.test.mjs extension/tests/context-navigation-lifecycle.test.mjs extension/tests/context-navigation-history-owner.test.mjs extension/tests/context-cards-local.test.mjs extension/tests/context-cards.test.mjs extension/tests/context-cards-compatibility.test.mjs extension/tests/context-item-receive-revision.test.mjs extension/tests/context-mutation-journal.test.mjs extension/tests/cpv1-01-recovery-draft.test.mjs
```

No browser/native, Full, 129-group, 100k, original-C, old-cloud, real-account/provider/network/paid, installation, deployment, remote or local-Codex execution was performed. These Node results are bounded synthetic owner evidence, not full CTX4, whole-programme, exact-main or native acceptance. Any coherent product-version decision belongs to the separate integration boundary.

## SHA-256 bindings

| File | SHA-256 |
| --- | --- |
| `extension/ui/context-cards.js` | `5563eab2ccc20ab329525cb45a2703ec302d851cf5c7e651e51f5c2942309a2b` |
| `extension/tests/context-cards-local-ui.test.mjs` | `44cce336b268db1f7fdd0b20d53e44cbc4d5f362362d3cb430a3d069e838a9ce` |
| `extension/tests/context-edit-lifecycle.test.mjs` | `668a1d04601716757f8857d92ce1063622dfea7b9e6cf0b8762e7660fae95e1f` |
| `red-owning.log` | `f290b5e07aca9bebc22e6349b143e281aca231797d69a5f224f02df538cb2c31` |
| `first-related-complete.log` | `807c48c782e29afc8ca9dd9f301cdc6c1eb7a240317a063a547c2ab35d17ff07` |
| `green-exact-source.log` | `b6b750fb55fb360d34d2790fb3ec6f0fecd1d86bd545868d03c6fc2885103dc4` |

All invocation logs and exit codes are retained beside this report.
