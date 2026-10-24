# Context mutation completion and interrupted edit undo

## Frozen identity and scope

- Base: `e2a2198e50d303974a1e53b1f550d9be1ca82df7` (reviewed pre-delete IME source `dc140d5d37dedc874ecb3b00e753fc71214bcf31`).
- Final source/test commit: `7b0585f7b626979e16089465c33c2f2f7273d27f`.
- Initial candidate: `5044c301fecace7121908eb3f3ca9986fa6b2a30`, retained as the parent; its later selection-only review failure is not relabeled as a pass.
- Final source/test tree: `32f584beab51ec1a6444bb2e036af1c246bec727`.
- Isolated branch: `dot/context-mutation-focus-20261024`.
- Runtime: only `extension/ui/context-cards.js`. Tests: the existing `context-cards-local-ui.test.mjs` and `context-edit-lifecycle.test.mjs` owners.
- Canonical contract: `AI_CONTEXT_CARDS_V2_PLAN.md` CTX4-UI-1.7 sections 3–5, preserving direct editing, durable ACK/CAS, human delete intent, IME, selection, recovery/conflict and navigation guards.

The previous pre-delete composition fix remains unchanged. No backend, recovery admission, transport, schema, permission, busy/navigation policy, package/version, provider or CI changes. This is a separately reviewed cloud-filesystem candidate, not a new cloud-service execution or deployment.

## Original-controller RED

The tests use actual `ContextCardsPage`, `ContextItemEditor`, `PlainTextSurface`, Context commit/recovery owners and the synthetic IndexedDB `ContextCardsService`. Genuine service mutations or real snapshot/cleanup responses are held at their original transport boundary. No manufactured successful mutation ACK substitutes for the service.

Before any runtime edit:

- `RED-focus.log`: 25 tests, 3 PASS / 22 FAIL. All three normal delete/restore controls pass. The 22 races fail because a genuine delete/restore ACK or forced refresh moves focus from a newer sibling focus/draft/IME or from body after newer intent back to Add/the restored editor.
- `RED-target.log`: 4 tests, 0 PASS / 4 FAIL. A real deletion ACK disposes newer original-target text/IME, whether begun before durable commit or afterward. The first failure is the retained original-editor assertion: actual `undefined` instead of the still-current editor.
- `RED-edit-undo.log`: 6 tests, 0 PASS / 6 FAIL. A held existing save lets a later composition start (or start/end) occur; the old Undo resumes and overwrites the newer visible body with the historical body.

All have zero cancelled/skipped/todo. `RED-test-additions.patch`, `RED-commands.txt` and `RED-sha256.txt` preserve the exact test/source bindings and commands. The raw RED edit-undo label “selection” originally described completed composition; the final test corrects that label and separately adds actual keyboard-selection coverage. No old failure log was rewritten or relabeled as a pass.

## Bounded repair

1. A temporary completion-focus lease captures the original page, open generation, card, snapshot epoch and initiating owner. Later pointer/key/input/composition intent or focus outside that owner invalidates focus restoration, even if focus subsequently returns to body. Every outcome releases its listeners. The lease does not cancel or roll back a committed mutation.
2. Delete completion rechecks exact editor/page ownership after ACK and token cleanup. It only discards the non-null recovery token captured at dispatch, never an unqualified current/null token. If later text, composition, edit intent or pending/conflicted work exists, the original editor remains mounted as a conflict and obsolete autosave is cancelled. Original explicit Keep as new / View saved controls decide its fate; no automatic restoration or replacement save occurs. Refresh no longer drops a retained clean-but-conflicted editor.
3. Restore completes its original durable operation/journal update, but does not focus a newer sibling, dirty/composing replacement or stale page. Normal unchanged restoration still focuses the restored editor.
4. Edit Undo revalidates original editor identity, page generation, epoch, current focus intent, composition, dirty/conflict state and captured body/edit epoch and exact six-field selection state after its awaited flush. Selection-only commands need not dispatch pointer/key events; an unchanged delayed selectionchange does not cancel ordinary Undo. New intent cancels that old Undo before historical text is applied. Its eventual focus is fenced too. Ordinary repeated committed Undo remains functional.

## Important recovery qualification

The production worker validates Context recovery through `ContextCardsService.recoverySources`, which rejects removed Items. Target-retention tests call this actual admission before protection:

- Newer B protected before the deletion transaction can have a real stored token. Completion must not clear B using A/null authority.
- Text/IME begun after durable deletion remains live in the existing editor, but cannot obtain removed-Item recovery authority.
- A preserved raw pretransaction token is explicitly tested to fail post-tombstone `recoverySources(..., {stored:true})` admission. It is not a cold-recovery guarantee.

No removed-Item recovery rule is relaxed. Closing/restarting the application does not gain a new promise to recover such text. Existing explicit Keep as new can persist one independent Item while the original tombstone remains intact.

## Coverage and intermediate failures

Fifty-one added owning cases cover all three editable cards, delete/restore, sibling focus/draft/IME and backward selection, later focus-return to body, forced refresh, exact token-clear awaits, target before/after-commit typing/IME, null/non-null dispatch tokens, explicit Keep as new/discard, clean conflict retention, interrupted Undo, actual newer typing and keyboard selection, stale close/reopen/epoch boundaries and event-listener cleanup. These are synthetic DOM/IME events, not native browser or physical IME evidence.

Preserved intermediate runs:

- `green-initial.log`: 35 tests, 32 PASS / 3 FAIL. Normal restore focus was checked after replacing its triggering notice, so its initiating node was detached. The focus decision is now taken immediately before that synchronous notice replacement.
- `owning-initial.log`: 143 tests, 141 PASS / 2 FAIL. Existing skeletal lifecycle fixtures lacked the now-used original page/editor fields. The fixtures now provide active owner identity, a field and document listener operation; no assertion was weakened and no runtime guard was relaxed.
- `owning-fixture-corrected.log`: 143/143 PASS.
- `owning-expanded.log`: 156/156 PASS, before the listener-cleanup case.
- `RED-selection-only.log`: 2 tests, 1 PASS / 1 FAIL against frozen initial candidate `5044c301`. Independent review found a same-owner changed selection with no key/pointer event could still be overwritten by old Undo. The changed-selection assertion failed; the unchanged-selectionchange control passed. The final successor captures and compares actual selection state after flush, without changing delete/restore behavior.
- `selection-successor-complete.log`: 333/333 PASS after the selection fix, before its explanatory comment was added and final source freeze.

## Final validation

Node `v24.19.0`; no installation or dependency change.

- `related-complete.log`: 331/331 PASS across 13 complete owning Node files.
- `exact-source-complete.log`: 331/331 PASS on initial source/test commit `5044c301fecace7121908eb3f3ca9986fa6b2a30`; this run did not yet include the later selection-only regression.
- `exact-successor-complete.log`: 333/333 PASS on final source/test commit `7b0585f7b626979e16089465c33c2f2f7273d27f`.
- All successful complete runs have zero failed/cancelled/skipped/todo.
- Runtime and both changed test files pass `node --check`; source/test `git diff --check` passes.
- Independent read-only reviewer initially passed 30/30 adversarial controls and 198/198 across six complete owning files on `5044c301`, then found the separately preserved selection-only failure. Final successor `7b0585f7` is independently accepted: 32/32 adversarial controls and 200/200 across six complete owning files pass, with zero failures/skips and no remaining blocking finding; exact runtime/test SHA-256 values match this report. Independent and author checks overlap and are never summed into a larger total.

The exact 13-file command is preserved in `related-command.sh`. Raw Node failure logs retain Node's space-only diff display lines; whitespace checking those evidence logs is not a source check and they are intentionally not normalized.

No browser/native, Full, original-C, 129-group, 100k, old-cloud, real-account/provider/network/paid, installation, deployment, remote or local-Codex run occurred. This evidence does not establish full CTX4, native/installed, exact-main or whole-programme acceptance. Product-version reconciliation belongs to the separate integration boundary.

## Source SHA-256

- `extension/ui/context-cards.js`: `fd24a15eb5703c65fba0d07d5f5a3b0bee85c0f1f91e702e6bd17acfcbdf2d3e`
- `extension/tests/context-cards-local-ui.test.mjs`: `3956cd8c6928f43db9e92a211b0cc9e820134f3e6dfcdfd4b428325b3842eb0c`
- `extension/tests/context-edit-lifecycle.test.mjs`: `ba0c394be49dba7ed4151e98e47b257b16d43b4301b714f925500553924b76a6`

Additional evidence hashes are recorded in `evidence-sha256.txt`; original RED bindings remain separate in `RED-sha256.txt`.
