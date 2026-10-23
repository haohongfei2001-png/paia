# Human Topic restore and later activity: original-owner qualification

2026-10-23. Baseline `eb4dee3e8622498fc374982d432c30b24607289e`.

## Result and semantics

This is a test/evidence successor, with **no runtime, codec, permission, scheduler or default-policy change**. The requested human reactivation path is already the original `HumanLibrarySyncJournal` `topic-lifecycle` remove/restore family. Its exact supported profile is a user-created, source-free Topic and user-created members. It is not the automatic active/dormant activity type and is not a new Topic bootstrap.

The original `changeTopicContainerInTransaction` restores **removed → active**, calls `setTopicLifecycle(actor:'user')`, and persists a lifecycle protection with reason `restore`. This protection is retained in the real Human causal group. A later inactivity attempt must refuse; clearing the lock to manufacture a second activity event would violate the original owner. The old zero-parent `topicActivity` admission therefore remains unchanged.

The new owning file uses actual original Source capture/SourceBootstrapJournal, Human create/Entry/place/remove/restore, immutable in-memory transport, grouped checkpoint compilation/staging/activation/cleanup, and original Human receive. A removed graph is restored into fresh B, A performs the explicit human restoration, B consumes its real causal group without echo, B exports its restored graph and fresh C activates it. The original body, note, placement authorship, history identity and lifecycle protection remain. Duplicate replay is zero-write.

A distinct genuine `TopicProcessingAuthority` with a synthetic local issuer, immutable lease, revocation signal and original shared work budget is created for the subsequent activity attempts. The issuer is exercised for the exact Topic. There are two intentionally separate outcomes:

- With both optional journals explicitly installed, the original general Thought operation gate refuses `BNS_HUMAN_UNSUPPORTED_MUTATION` before reaching the lifecycle mutation. This old guard is preserved; it is not relabeled as a lifecycle-lock rejection.
- After a real repository close and fresh default store construction, no Human journal is implicitly installed. Only the explicit activity journal is installed for this rejection test. The original lifecycle owner reads the persisted human restore lock and refuses `INVALID_REQUEST`, with every store unchanged. No installed writer is detached, no lock is removed, and no mutation is made successful through this route.

## Verification

Node 22.23.3, local macOS arm64, fake-indexeddb. No browser/native IndexedDB, build, cloud, model, real account or provider execution.

- `first.tap`: **0/8**, all new fixture errors from using nonexistent `removeTopicContainer`; corrected to the real `removeTopic` method. No production finding.
- `owner-method-fixed.tap`: **7/8**. The only failure expected `INVALID_REQUEST` while both journals were installed; actual original refusal was `BNS_HUMAN_UNSUPPORTED_MUTATION`. The assertion now names the true gate; a separate cold-default-store test reaches the actual lifecycle-lock owner. No runtime changed.
- `qualified-final.tap`: new complete file **9/9**, TAP 3693.357958 ms.
- `combined-final.tap`: three complete owning files **45/45**, TAP 4122.471041 ms, exit 0; no fail/cancel/skip/todo. Files: new human-restore integration (9), prior first-activity Sync (34), original Human lifecycle-plan (2). This establishes first-event compatibility on this baseline, not a full product pass.

New cases cover cold B/C, exact duplicate and lost-return replay, actual competing restores from one removed causal base, original prepared-owner staleness after a real human restoration, source-side and receiver-side ACK failures after original protocol commit with all-store rollback, independent revoked issuer, dual-journal rejection, and persisted lifecycle-lock rejection after cold reopen. Every injected ACK case asserts that injection ran.

`SOURCE-SHA256.json` binds the new test and relevant unchanged original runtime. The original runtime files still equal their baseline Git blobs after execution. The old tests and runtime were not edited.

## Formation reuse is a different remaining causal bridge

`TopicFormationService` is the existing legitimate dormant → active same-identity owner. It uses actor `ai`, preserves current human lifecycle protection, runs independent Topic authority, validates original Inputs and Sources, and emits the original formation receipt. It can also create or reuse Entry bindings/provenance, assign memberships, create a Section, consume candidate state and finalize semantic/search metadata in the **same transaction**. It is not the human remove/restore writer.

There is no typed Formation Sync family in the current grouped compiler (`sourceBootstrapCommit`, `sourceAppendCommit`, `inputWorkingCommit`, `humanLibraryCommit` plus the existing single families). Exporting only its `setTopicLifecycle` row as a reactivation event would omit causal writes and fabricate a complete recovery story. The first activity wire's parent prohibition must not be removed to accept an unrepresented formation transition.

A next implementation must consume a real original formation publication capability (`readTopicFormationPublication`, same transaction, actual original `writes` and members), bind the prior activity head and the complete formation request/receipt, and represent every actual canonical/protocol mutation that its selected finite profile permits. A receiver needs its own genuine processing/material qualification, not an imported sender grant or an arbitrary `to:active` command. The original formation capability is local and not itself a wire or graph proof. A first finite profile could require an already supported exact Topic/Entry/membership graph and original reuse-only result, rejecting any new Source/Entry/Section/candidate/membership mutation until those original owners have typed support. Even that profile must capture the actual important lifecycle history, allocation/search/receipt changes and current authority fences, and prove A inactivity → original formation reuse → later inactivity → cold B/C with conflict and rollback. No such bridge is claimed by this package.

AI-created/source-bearing Topic human restore is also outside the existing Human journal profile. This package does not broaden it, erase protected intent, or claim arbitrary Topic graph recovery. Automatic lifecycle scheduling and source-owned personal-topic-identity issuer authorization remain separate boundaries.
