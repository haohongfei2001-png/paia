# Prompt companion manual resolution Core seam — 2026-10-24

Base `7228f20812a2ba38747e51e33b10af6bb57a1f8c`; branch `codex/prompt-companion-resolution-20261024`.

The previous Core rejected all multihead promptBinding companions even after the original service explicitly resolved every Prompt parent. This patch adds one private-authority path for the original manual Prompt resolver. The original journal issues an opaque token from its module-private WeakMap only after the real manual resolver qualifies the exact two Prompt versions and two bound companion versions. Public booleans, objects, cloned tokens and arbitrary envelopes do not mint authority.

The Core option is `promptBindingResolution`, passed alongside the existing exact `promptBinding`. Core calls `requireOriginalPromptBindingResolution(core,t,token,changes,promptBinding)` from the original journal inside the same initial readonly snapshot. It receives exact companion parents and snapshots all old companion and Prompt revisions. Core independently requires one user put Prompt operation, explicit resolve=true with complete parents and expectedParents, exact two current heads of both types, unredacted valid original operations, one-to-one companion-to-Prompt linkage, and old/new Prompt envelopes. Digest/envelope checks happen outside the IDB transaction. Companion output is sealed into the same prepared batch as the Prompt, using complete original companion parents. Original namespace/generation/sequence stale checks and private prepared object membership govern the final transaction unchanged.

Portable operations have no resolve boolean or capability marker. Only original deep-frozen `core.prepare` results belong to the private preparation set; a cloned prepared envelope cannot commit. Ordinary conflicts still reject without explicit authority. No change to other entity types, budgets, remote protocol, generic multihead behavior or implicit migration.

## Dependency and integration

This commit changes only `core.js` and one new owning test, plus evidence. It DEPENDS on remaining_local_scope's original Prompt journal export and actual service manual-conflict consumer implementation. Their source was borrowed temporarily into this isolated tree for the test run and restored byte-exactly afterwards; it is not committed into their original source paths here. The two `.dependency` evidence snapshots and source-vector.json bind the exact tested dependency bytes. Root must integrate both owners together, not run this Core import alone against the old journal without the export. Other author retains sole ownership of journal/service/worker/Settings; no edits were made in their worktree.

`requireOriginalPromptBindingResolution` is not a generic registration/mint API: its lookup cannot be populated outside the original journal's private issuer, and the journal verifies the actual service/journal/core and full live conflict snapshot before returning parents. The original service separately validates user choice, control state, and commits canonical preference/companion rows, proof and outbox atomically with final read fences. This Core seam does not replace those requirements.

## Validation and failure preservation

- `before.log`: original Core + new exact journal/service dependencies; 7/12. All four valid choices failed at the original companion conflict guard. The generation-change test also failed its own post-prepare expectation because the old guard prevented reaching the injected change. Seven refusal/rollback checks passed; these are not a complete successful run.
- `after.log`: first corrected Core, same 12 cases, 12/12 (427.085125 ms).
- `final-owning.log`: final 19 new owning cases plus the four existing Core/Prompt correction/Prompt conflict files in one invocation; 91/91, exit 0, no fail/cancel/skip/todo, 1973.706708 ms.

Final command:

```text
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test extension/tests/prompt-companion-resolution-core.test.mjs extension/tests/browser-native-sync-core.test.mjs extension/tests/prompt-correction-sync-owner.test.mjs extension/tests/browser-native-sync-prompt-conflict-owner.test.mjs extension/tests/prompt-correction-binding.test.mjs
```

Each new fixture uses one small synthetic Source and two Prompt branches with exact immutable companion pairs. The positive path invokes original PromptReuseService/manualConflict/resolveManualConflict for local/other/manual/both; asserts complete parents, full canonical content, independent companion linkage, both proof/outbox rows, and all four original history operations retained. Failure and late owner write compare all original object-store tables. Added negative cases reject null/bool/object/string/clone tokens, partial parents, changed binding, actor, kind, extra changes, and cloned prepared output. Later real generation change still invalidates the pair. Existing tests preserve original Prompt correction codec, journal, projection and conflict-owner behavior.

No browser/native, build, cloud, real account, large seed, 65/129 group recovery, model, credential or deployment activity occurred. This is a narrow Core preparation change, not whole-product completion or a new portability claim. Use the exact logs/dependency vector; root integrates the current consumer owner and independently reviews the combined sources.
