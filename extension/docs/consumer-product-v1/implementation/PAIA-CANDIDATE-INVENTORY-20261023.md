# PAIA candidate and preserved-work inventory — 2026-10-23

This is the takeover inventory, not a declaration that every candidate is qualified or every product plan is complete. The owner has assigned all current PAIA development and integration to this original local task; old dot/Pro scheduling ownership is superseded. Existing paid-resource, account-data, deployment and exhausted-run limits remain. Nothing was merged remotely, closed, deleted, reset, cleaned, stashed or tested by this inventory.

## Verified baseline and exact integration set

Fetched `origin/main` is `73fa457a1c9b5b060ff362e15777354aa37d49cc`, whose parent is `ebb25414d18f3b27270d67326bfcbd9cc46431e6`. Main's two commits after `1f3c826c` are website successors and must remain. PR313 head is `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1`; its merge base with main is `1f3c826c0c49f9d8fd60156182883866971bb8c3`. PR312 head is `7cd62ab4faf2940db7d3b57822e72c6e249a24e5`; its common base with both lines is `4349189451821db1e408a669cee5b64b140844f6`.

PR312 and PR313 are independent product branches. PR313 does **not** contain PR312's Settings restore-intent, Topic keyboard-intent or prompt-mount repairs. Their changed-path intersection contains exactly six paths: manifest/package, the two routing/checker scripts and two routing tests. The two version files are byte-identical at both heads. PR312's last routing commit is superseded by PR313's complete 101-root routing and Reconnect relocation.

The root integration owner selected the following exact sequence on a fresh main branch, retaining original histories and evidence:

1. Normally merge PR313 `02144bcc` into the fresh-main integration branch.
2. `712a5d1a503d260f4318d755518927acd04d8066`: four existing tests only (Sync/D5 contracts, Entry consent/diagnostics, initial B3 diagnostic).
3. The B3 owning-test path from `1a16d25e313457e5c1f86189b3b493f7efde3753`. Its other path is the independent evidence script `fresh-action-abort-chain.mjs`; it is preserved on the original evidence branch and is not a new default browser dependency.
4. `f745013c121391488002116e28b061dd796c94ef`: semantic metadata read pair and its owning receipt test. The 48 local correctness results are separate from unproven native performance benefit.
5. PR312's first six commits in order: `459d6c194a0656bf79b7baf6e0d043f2ba211f89`, `8b781ef7e9368e3a48ca651aa872aaf66bf279a9`, `3141a83020dda64d495d870a0d99bbf7d302375b`, `d5874a4478e78ba43b900d646d0e638aa1621554`, `86fbeed40d64a0fc4f84a869db1195bae6960b28`, `aae4407daec0bdf97ff3598787b66dd332896a31`.

Do not reapply PR312 `7cd62ab4` over the newer routing. Do not merge the entire `b0a10565` evidence lineage: it includes one-shot diagnostic workflow `3a5e5363`, report-only commits, expired diagnostic execution assumptions and local timing evidence. The source integrations above are distinct from their preserved historical test identities. Root reported successful local composition through `0897127e`; subsequent root work may advance that branch.

## Open PR census

The official repository API returned 20 open PRs. Open is a GitHub workflow state, not evidence that their old implementation is absent from main.

| PR | Head | Classification and treatment |
| --- | --- | --- |
| 313 | `02144bcc` | Active unmerged Organize/Maintenance and bounded CI source; integrate exact reviewed source and later fixes above. Original Full failure remains. |
| 312 | `7cd62ab4` | Active independent Settings/Topic/prompt repairs; six-commit integration above, superseded routing excluded. |
| 310 | `360c15b7` | Old website design candidate. Current main already contains later owner-selected website implementation and two subsequent refinements. Preserve old review branch; do not restore its 91-path snapshot. |
| 298 | `9a770b22` | Isolated R2 prompt geometry design, 24 new design/evidence files; superseded by main R3 adoption `fd6d83d9` and implementation. |
| 297 | `7e5322d2` | Isolated R1 design, 22 new files; R2 then R3 succeeded it. Not current production work. |
| 296 | `a19a9c6c` | Authored restore continuity absorbed and extended by main `fd6abee3` / `98100fab`. Current `authoredFieldAuthority` preserves the full remove/restore chain and supports selected body/note/title; old body-only snapshot would regress it. Original new tests remain with later adaptations. |
| 287 | `a7c36354` | Historical website open-canvas prototype; preserve, do not reintroduce over current website. |
| 267 | `d2f74539` | Historical website art-direction candidate; later main website authority supersedes it. |
| 264 | `6ed7bf75` | **Still-independent CI efficiency candidate**, 23 paths. Its single editable browser manifest/corpus would need explicit reconciliation with current 101 roots, routing history, font setup and all gates. Do not blindly merge the old workflow/STATUS/MASTER snapshots. See pending engineering below. |
| 240 | `21c76b9d` | Historical website layout; PR267 explicitly records owner rejection. Preserve, no resurrection. |
| 231 | `c6e7df0d` | Preserved failed concurrent-Human retention branch. Main STATUS records its data-method suppression counterexample, then accepted PR234 and later native safety successors. Current Core/human-library-plan/Repository have stronger owners and guards; do not restore this unqualified old writer. New Sync features remain paused. |
| 188 | `8e500508` | Head is already an ancestor of main. No missing commit merely because PR remains open. |
| 187 | `9be25f04` | Head is already an ancestor of main. |
| 182 | `f85f40be` | Old two-file read-model checkpoint. Main contains the facade plus current placement/body qualification, preview and cursor successors. Do not overwrite the newer owner. |
| 179 | `9d1380d3` | Head is already an ancestor of main. |
| 178 | `8c9ba021` | Head is already an ancestor of main. |
| 140 | `645c2410` | Old D5 visual branch. Main subsequently implemented bounded D5 appearance (`80528d88`), writing integration and approved Section/annual UI. Preserve old branch. |
| 132 | `497847ea` | Preserved failed Q6b compatibility migration, not a patch to apply now. Main has original draft/operation repair `f11675ce`, D5 `80528d88`, guarded continuous writing `8f67f56c`, and later Section/annual UI `a59005bb` / `9ecf75e6`. Old route/workspace snapshot would replace current navigation and guards. Remaining modern acceptance is not supplied by that old run. |
| 99 | `991f78f4` | AGENTS explicitly retains this historical proposal branch unchanged and unmerged. Broad takeover does not select its retired consumer entry points. |
| 91 | `ea035da1` | Historical website v6 design-only proposal, superseded by later website direction. |

The complete PR313 issue-comment page is still 70 entries, ending at `6354368462`; no newer comment or edited post after that handoff was returned. PR312/132/231/296 have no issue comments or inline comments. PR264 has three issue comments, last updated 2026-10-12, and one old inline P1 concerning accidentally doubled Source/release timeout. Its current head already has one shared deadline with only the remaining budget given to release; the old review is not an unresolved proof of a present timeout defect. It does not prove the rest of that old candidate fits today's source.

## Registered worktrees and uncommitted work

All 27 **registered PAIA worktree paths** were individually checked. No broader filesystem/project search was used. Full body-free Git path/ref/status inventory is saved at `work/paia-takeover-20261023/inventory.json`; ignored files are outside this census. The root integration worktree was clean at initial takeover. It is now intentionally owned by the root writer and the three explicitly assigned documentation writers.

Primary main checkout has 33 untracked filenames with a ` 2` suffix. Twenty-seven are byte-identical to their canonical main files; six differ: the Section checkpoint report, raw-source-navigation harness, NIB approved native test, reporter-failure test, Topic AI editor-retention test, and Topic Section AI module. They are **preserved unknown local copies**, not automatically adopted or deleted. The other checkout is used for integration so these files cannot contaminate its test census.

Four historical worktrees have tracked changes, all preserved:

| Worktree suffix (under the registered 2026-10-08 PAIA work directory) | Tracked modifications | Additional untracked source |
| --- | --- | --- |
| `assist-lifecycle-20261013` | `local-assist-session.js`, `ai-assist-private-session.test.mjs`, `ai-assist-native.mjs` | none |
| `maintenance-session-20261013` | `context-maintenance.js`, `topic-formation.js`, original Maintenance browser test | `local-maintenance-session.js`, `ai-cost-03-maintenance-session.test.mjs` |
| `organize-lifecycle-20261013` | original AI Foundation browser test | `ai-organize-lifecycle-native.mjs` (byte-identical to main) |
| `qwen-json-next-20261013` | SSE decoder and usage parser | JSON decoder, request profile, wire primitives and their two tests |

The two tracked Qwen files and four of its five untracked source/test files are already byte-identical to main; only its old request-profile file differs and main/PR313 have later qualified-request evolution. The other preserved dirty files also have current tracked successors; no missing implementation is inferred from their dirty status. Most older worktrees additionally retain untracked logs, releases, symlinked dependencies, fixtures or design assets. Preserve them all.

The sole stash is `9854d87f31d065c5fd29d5c1fb2d26305321190a`, label `On codex/approved-ui-convergence-20261016: !!GitHub_Desktop<codex/approved-ui-convergence-20261016>`, original parent `4e1a103c2e8097d7ba2ce925eaa531017278bfe8`. It contains 43-path Section/Archive/Context UI work and is not popped or dropped. Its report has 912 later lines on main; its runtime paths have newer main successors. Whole-stash replay is unsafe.

## Other preserved branch reconciliation

`codex/context-now-currentness-20261017` (`97a2e802`) and `codex/context-current-bound-input-20261016` (`8442f68f`) are already ancestors of current main. Their old AGENTS pending-integration statements are historical.

For the 2026-10-13 saved branches, `git cherry origin/main <branch>` finds zero unique patch IDs for AI history/lifecycle integration, Assist insert-authority, canonical-next, Context home metadata/native handshake, IAH source scope, maintenance-complete/integration, minimal capture consent, Organize provider lifecycle, Qwen request controls, reading rhythm, Settings/source-history rhythm, Topic activity and Topic root refinement. No additional merge is needed for those frozen commits. Dirty local changes remain separate and preserved.

Context no-change / Maintenance payload branches have older non-identical patch IDs; main has their reviewed integration successors `924f1ca9` and `e4992a03`. Organize lifecycle's original tests are already byte-identical to main; runtime has later lifecycle and qualified-source work. The old local-presentation branch has 27 nonidentical patch IDs, many later reimplemented or jointly integrated. Most isolated safety/fixture paths already match main; remaining shared UI files reflect later approved UI. Patch-ID inequality alone is **not** a missing-feature conclusion. Modern queue owners must check any specifically demonstrated gap against current plan/code, rather than replaying this broad old branch.

## Remaining candidate work, rather than repeated diagnostics

- Root now owns the combined PR312/PR313/post-fix milestone and its required verification. Previous isolated results remain accurately scoped; cloud Full permissions are not reset by the new branch.
- PR264's central browser-corpus approach can inform a future CI maintenance change, but it is an independent design/implementation choice. Reconciliation must preserve the complete current test set, historical routing oracles, Source/release budgets, final audits and required gates. It is not itself proof of Browser2 capacity improvement.
- The six differing main ` 2` copies and older dirty worktrees remain preserved. Adopt only a demonstrated current-plan behavior absent from the integrated source; no present absence has been established by this inventory.
- Whole-product completion, live identity/service/model qualification, physical/visual acceptance and any remaining plan implementation are determined by the separate authoritative-plan audit. A stale open PR, old failed receipt or old branch name does not create a new implementation task by itself.

## Selected PR264 idea: coverage admission before expensive scheduling

The takeover selected only PR264's early coverage-admission idea, adapted to the existing current workflow. This is an implementation on the integration branch, not a merge of PR264. Its old central corpus/manifest refactor, browser budget wrapper, workflow snapshots and status documents are excluded. Current `build_current_release.py` already has source/output fingerprints, a per-output lock, staging and audits on reuse; no duplicate release cache or relaxed audit was added.

The implementation changes exactly three existing code/test paths: `.github/workflows/paia-certification.yml`, `extension/tests/sync-node-preflight-ci.test.mjs`, and `extension/tests/d5-full-browser-partition.test.mjs`. The `mode` job now checks out without persisted credentials, selects Node22, and runs the existing dependency-free `node scripts/check-ui-refresh-ci.mjs` in `extension` before selecting depth. All existing expensive jobs already depended on `mode` except the manually dispatched historical audit; that job now also has `needs: mode`, retaining its existing event condition and reporting policy. Browser1 still executes its original coverage check. No test case, data size, shard, runner, font helper, timeout, final audit, required aggregate or concurrency setting was removed or changed. The `mode` job retains its original timeout configuration.

Sync restores only the unique exact added mode-step block and the exact historical dependency line before the existing normalization. It keeps the original `166fcd607396799510cc3ac947ab06d23496090d5a04939716d2302b0e982a78` workflow baseline and both original command hashes. Negative controls reject missing, duplicated, moved or modified preflight, credentials persistence, Node-version drift, ignored checker failure and loss of the historical dependency. The D5 contract checks the actual expensive-job dependencies, original Browser1 check, and executes the actual aggregate shell with skipped prerequisites to prove admission failure cannot produce success.

Validation was local on Node22.23.3 and Python3.12.14, using absolute executables. The new D5 contract against the unchanged workflow failed as expected (`0/1`, exit1). After implementation, one combined run of the complete Sync, D5 and hosted-browser-setup test files passed `146/146`, exit0, with no fail/cancel/skip/todo; TAP duration was `5032.454042ms`. This includes executing the existing 101-root coverage checker. Original negative output and final output are retained at `work/paia-takeover-20261023/coverage-preflight/before.log` and `after.log`, with command/exit/source hashes in `execution.json`.

The benefit is avoiding installation and scheduling of downstream suites when static coverage admission is already invalid. A valid candidate still runs all original work, and pays the small additional checkout/Node/checker preflight. No cloud or native timing benefit was measured; this does not resolve Browser2's successful-work duration or prove Linux capacity. No APT, browser, build, CI, cloud or paid execution was started by this change.
