# Saved typed successor: local edit, atomic outbox, cold recovery

This package completes the finite retained-saved-work continuation previously missing from C: a protected AI-origin saved Entry restored on B can be edited through the original owner with one atomic canonical/domain-receipt/Core/outbox commit. The resulting fake object transport checkpoint restores cold C, which can make another typed edit and restore cold D. The original AI generator, Source provenance, human protection, exact text and complete retained history remain intact.

This is local synthetic correctness, not a live provider/account/native-browser or full Sync release certification. Explicitly installing `SavedWorkSyncJournal` opts in; no runtime default, account, token, network, UI authorization or OAuth is enabled here.

## Exact integration

Base is `86333634`. This tree separately consumed only the three original writer-budget changes from reviewed `1dc04adf727ff1a905be4a0237f6b6ae5328c607` in dependency commit `1801f109`. Root already owns that dependency: **do not cherry-pick it again**.

The original coordinator remains uncommitted here. `work/sync-local-completion/saved-successor-coordinator.patch` is an incremental one-line patch against root's already integrated saved group consumer: dispatch `savedWorkSuccessor` through the same original saved application as `savedWorkBootstrap`. The older saved-group patch remains separate. The source vector records the exact temporary coordinator bytes actually tested.

New runtime modules are `saved-work-journal.js` and `saved-work-successor-codec.js`. Changes to existing Sync files are Core/codec registration and private owner admission, the original human named edit planner's independent saved-AI profile, saved owner preparation/final seals, and grouped graph/scope admission. No non-Sync owner changes are part of this implementation commit; those three budget files are the exact reviewed dependency above.

## Behavior and proof

- `SavedWorkSyncJournal` delegates ordinary human routes to the original Human journal. Only AI-origin `entry-edit` uses the new profile. The existing user-created Source profile still requires user origin and null generator; the Human wire codec is unchanged.
- The actual edit uses the original named planner/allocation, `editEntryInTransaction`, journal/history rule, library hooks and operation receipt. The new type is `savedWorkSuccessor`, actor `user`, with explicit immutable saved bootstrap anchor and at most one same-entity successor parent. Data alone cannot call Core: the same-transaction private saved owner binding is mandatory.
- Before/after complete portable payloads are qualified through the saved validator. The successor validator additionally replays the original field planner, history/coalescing rule and retention policy with the exact five domain allocation events, request and physical counters. Canonical transport key ordering cannot alter domain retry identity because requests are constructed in a fixed order before hashing.
- Original Foundation writer budget admission uses `foundationWrite(fn,{})`: private 4096 references, 2 MiB charged physical operands/results and 30 seconds from before the first transaction query. There is no late counter reset, relaxed limit or reliance on public metrics. Complete bounded history/placement reads use pages of at most 64 plus exact count comparison; duplicate index keys at a page boundary cannot silently hide rows. Existing total limit 128 remains.
- The final raw read fence seals exact Source protocol rows and Source evidence/control facts, current publication/migration/library roots, Entry/history/provenance/dependency, domain receipt and counters, expected backup generation, retry marker and original full protocol write intents. A tail mutation or failure aborts canonical changes, receipts and outbox together.
- A repeated request after response loss verifies the original typed operation, domain receipt and exact Core receipt and returns its committed result. It does not repeat the edit or create another outbox item. A stale revision/field CAS returns conflict without writes. Conflicting remote branches are rejected without silently choosing one.
- The grouped compiler requires Source → original saved bootstrap → a single continuous successor ancestry. Every predecessor semantic payload must match exactly (only local physical history sequence/list keys are normalized). The canonical cold owner imports the fully validated final retained history once; it does **not** pretend to execute historical AI calls. Original Core still stores every original bootstrap/successor operation, receipt, frontier and final head, with no remote echo outbox. Full terminal stage/replay seals and the private transaction budget remain active.
- Bootstrap receipt identity remains anchored to the original bootstrap, so a later duplicate bootstrap cannot overwrite subsequent saved edits. Final checkpoint scope is the latest qualified payload, not an earlier saved snapshot.

## Verification, including failures

Node is the existing official isolated 22.23.3 on macOS arm64. The command supplied the existing absolute Python 3.12 path; these are Node/fake-indexeddb tests, not browser/platform performance tests. No installation, browser, build, cloud or real provider action ran.

1. First local successor case: **0/1**, `BNS_GROUP_RESOURCE_LIMIT`. An existing human planner requested `rangePage(...,129)` under the private budget. Original 128-row total protection was retained; reads were changed to bounded pages. The original failure is `saved-successor-first.log`.
2. Local edit/retry after that fix: **1/1**. Actual A→B→C→D continuation first run: **1/1**. Initial new owning cases: **14/14**.
3. Expanded first owning run: **17/18**. The new test incorrectly expected the callback itself never to enter with a one-reference budget; the original admission check legitimately consumed that first reference. The corrected test proves its first additional read refuses before the original edit owner is called. No production change was made to accommodate the incorrect assertion; `saved-successor-owning-budget-assert.log` preserves it.
4. First eight-file combination: **154/154**. Subsequent read review added exact page counts and a duplicate-index-boundary negative case.
5. Final eight-file combination: **155/155**, exit 0, no fail/cancel/skip/todo, TAP **6332.307583 ms**. Files: new saved successor, existing saved group, saved owner bootstrap, Core, grouped plan, grouped restore, Human journal and Human group.
6. Root requested an additional explicit cold final successor-receipt drift case. It passed **1/1**, exit 0, TAP **535.889167 ms**, separately after the combination. It does not turn the previous invocation into a claimed 156-test run. The final owning file has 20 cases; its final extra case has this separate result.

New cases cover actual A→B original edit/outbox→fake checkpoint C→C original edit→D; no echo; stale revision and field conflicts; lost response retry/collision; original user-only guard; Source revocation; tail Source/control/frontier/receipt/history changes; whole-table rollback; 4097 reads despite public metrics resets; branches; no-capability Core application; unrepresented/coalesced history refusal; forged request/allocation/origin/generator/anchor; cold group/activation/receipt failures; first-query budget; and duplicate index-key boundary refusal.

All commands, original failed logs, successful logs, temporary coordinator patch and SHA-256 source/evidence vector are under `work/sync-local-completion/saved-successor-*`. Existing logs and tests were not erased or weakened.

## Exact remaining envelope

This is one unplaced protected AI saved Entry, one primary Source and a complete continuous **uncoalesced** human edit history, within the original 128-history/4096-reference/2-MiB/30-second envelope. An edit must produce a qualified new retained history row. Coalesced/retired/gapped history, adopted AI/multiple saved entities, multiple Sources, placement/lifecycle/purge and incremental receive into a separately modified populated destination remain subsequent work. The supported remote consumer here is the actual original grouped checkpoint cold consumer, not a newly enabled provider polling path. A standalone operation still cannot bypass that consumer via `Core.receive`.

The package does not assert that storing full before/after payloads permits arbitrary history length within the aggregate budget: repeated full retained payloads are charged and may safely refuse before the 128-history shape limit. It does not replace the native browser or final integration milestone. All previously known broader Sync C gaps remain in the project queue.
