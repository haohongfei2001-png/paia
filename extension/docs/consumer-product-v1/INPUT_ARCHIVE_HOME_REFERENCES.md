# Input Archive Home — references and evidence boundaries

**IAH-1.0 / 2026-10-08.** Normative decisions: [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) and [CONTRACT](INPUT_ARCHIVE_INTERACTION_CONTRACT.md). This is a source/reference manifest, not implementation or a second product authority.

## R1. Remote source identity

Fresh GitHub main resolved for this adoption: `1b3c3f91ea4e248fb048214fd1efceccc0b2f344`.
Root tree: `497095d5a09f12cd93707b6afd423911b3dde27e`.
The preceding review used the same main identity; it was independently checked again. The commit is the Context reviewed-access test integration, not an Archive Home implementation. Manifest at this source is 0.18.0 / Section Promotion Mechanics. This is repository metadata, not proof of the user's installed extension.

All source paths below are relative to the repository. Git blob identities bind the reviewed content, including when only the task-relevant ranges were reread. No real archive database, login session or provider account was accessed.

| Source | Git blob SHA | Relevance |
|---|---|---|
| extension/ui/archive.js | 414b344f979f5473b4eb90b8aa06f5cca67e71a1 | Navigation/leave, root-query restoration, Reader paging, result handoff and filter visibility |
| extension/ui/app-shell.js | 084bfdfdaaf5ad2d7c1dac1b2d81e6de8d8eca2f | Existing composition moves both search hosts; intentional blank root |
| extension/ui/app-shell.css | ea8d67cf04c80e0b1e15b29832d8df6c1de88c2d | Later Archive overrides, column geometry and narrow root/Reader behavior |
| extension/ui/reader-navigation.js | b630347526d3c30d33ce32ab32daa6373fe6bdbb | One same-URL history/restore coordinator |
| extension/ui/route-history.js | 66493691cfcf17ce7b6156d2a891240aa4f4bf9b | Safe history projection; query/extent currently in memory sessions |
| extension/ui/archive-navigator.js | c2c29f178cffad861c89f81ca9276c7b70a43e90 | Current Project disclosure and explicit Conversation selection |
| extension/ui/smart-filter.js | 27b78fc5e0de8dfedf2691cb4d808a33dea63aeb | Title-first result rendering, separate durable Keep/protect paths |
| extension/ui/original-surface.js | ebe10b1de03c61dc55b167352153664215cfe10c | Current original-reading surface, not a generic external Back |
| extension/core/archive-navigation-query.js | cc6ce74599573e574bcb4fe35508bcf6310978ad | ArchiveNavigationQuery; bounded provider/group/window scopes and coverage |
| extension/core/archive-query.js | 47d95b09f346a1cf5e7eae9a8e91591ededd96c2 | Existing working/source page query; recent field is not a default-selection instruction |
| extension/core/source-structure-model.js | b8caaae9a09075f137b154e51b9a81d5a09034d6 | Qualified identity, unknown/unassigned, last-known relationship and source lifecycle |
| extension/background/service-worker.js | fb583f4743b1ecefec286776d1c1ff2cc86bafe9 | SEARCH_INPUTS -> store.searchInputs, navigation/original query owners, exact-entry sender validation, trusted session storage |
| extension/core/organizer/store.js | 417243ed47a11cd122b86123f443185143e03d08 | Current store owner/inheritance; reuse rather than add a UI-owned corpus |
| extension/manifest.json | 156cdf9fa8aa42f480ff1a1c4c0779bdf90b4648 | Existing entry paths and manifest/version/permission boundary; unchanged |

Also inspected: archive.html's root/Reader/search structure and current canonical Product Intent, UX, Technical Plan, Master, Status, Authority and extension/AGENTS; Settings Consumer v2; Browser-Native Sync's transient-state exclusion; AIU no-model search rule; Personal Topic/Thought presentation and retained Archive/Consumer Cleanup scope. Prior same-SHA review supplies the detailed Reader/search helper inspection; current relevant files and route/query owners were reread for this freeze. A code-search response with incomplete_results was not used as proof that no additional historical cleanup file exists.

## R2. Exact preserved canonical baseline

The following PRE_ARCHIVE_HOME files retain their predecessor's exact Git blob, not a reconstructed summary. Current entry points explicitly incorporate every nonconflicting requirement and point to the new scoped Archive authority. The snapshots are not independent current queues. Existing deeper snapshots remain unchanged.

| Canonical file | PRE_ARCHIVE_HOME snapshot | Original Git blob |
|---|---|---|
| AUTHORITY.md | AUTHORITY_PRE_ARCHIVE_HOME_2026-10-08.md | b9c0745a65267173834634dbf2943a4626dc120f |
| PRODUCT_INTENT_CONTRACT.md | PRODUCT_INTENT_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md | 8cb731e6cab003f55471e54e5e47d9599191cf4d |
| UX_CONTRACT.md | UX_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md | cdfc21ef5e507c40cbb38012d82f3ed5f0437aa8 |
| TECHNICAL_PLAN.md | TECHNICAL_PLAN_PRE_ARCHIVE_HOME_2026-10-08.md | b1df62582dea0ea4ea2cf32bb9033d83c823b2fc |
| MASTER_PLAN.md | MASTER_PLAN_PRE_ARCHIVE_HOME_2026-10-08.md | 5c5b5acd5646bd01019bdf91de9dd0c59cf01570 |
| STATUS.md | STATUS_PRE_ARCHIVE_HOME_2026-10-08.md | a8fcb26d5e5cbf2e5683c413ac535819aa0b176c |
| ../../AGENTS.md | ../../AGENTS_PRE_ARCHIVE_HOME_2026-10-08.md | cce0678a06bfdf3e703bd02325eafb0225782eb8 |

Scoped overrides of older extension/PRODUCT.md Archive navigation, UX A1/A2/A3/A6/A7 and historical ANS/Consumer Cleanup/D6/D7 material are enumerated in ADOPTION section 3. Source/time/body/identity/editing/recovery/privacy and all unrelated product outcomes remain. Historical PASS/FAIL and implementation receipts are not rewritten.

## R3. Private supplied materials and byte hashes

The originals stay in the owner's conversation/private working materials. Do not publish their bytes, full instructions, private example bodies, screenshots or identifying fixtures in this public repository. Hashes identify the exact supplied artifacts; they do not prove usability, implementation or authorship of sample content.

| Private reference | Bytes | SHA-256 | Evidence role |
|---|---:|---|---|
| Final freeze/adoption instruction, supplied Markdown | 19211 | 946a36a10707f6348bea57d98d7bfcd74005598232649d6a38791b02ff9218ef | Latest explicit owner direction; implemented here as a public contract derivation |
| Previous interaction-review instruction, supplied text | 17397 | 991607d143485a2a9b936ea24d68b005268c2a0af3d8f27b2740f6d016a477bb | Earlier scope and tasks; conflicting optional behaviors are superseded |
| Current Archive root screenshot, 2048x1152 | 119953 | 8db559816a013715a0bf75a0de280461f84053049114302eb1c27f998fd2bf16 | Observed empty-root presentation, not proof of every route behavior |
| Current Reader screenshot, 2048x1152 | 234575 | 6c9b1a16e419aa72218df180f5d0e634e2baf78165d8e9bcf02fee8fc595932f | Observed Reader/search/navigation presentation |
| desktop-home.png, 1440x960 | 70265 | de71e55902a337a7838849f11e8dee82a676eead09ad142c67c221e6981165b7 | Previous mock composition only where consistent with the final written contract |
| desktop-search.png, 1440x960 | 97179 | 8b7bf8b1d89f43e3811b381d27476954300a242f7de094bcc929cc07e35eb49f | Input-first result reference; fixture labels/counts are not real data |
| desktop-deep-link.png, 1440x960 | 130439 | 2892741efc29789a2bd5e5b1d115673349f17882b084b6f44073ec075de713f6 | Reader origin/source action and temporary-location reference |
| narrow-home.png, 390x844 | 32115 | 7edd85712886c24373cef541b7fe556beb1c83fe59d7fb99c2faf3238868d4b9 | Single-pane Home composition reference |
| logo-reference.png, 55x58 | 3824 | 9e43963575601b9bb4500a3a99fa44889ed1060896e68b56d3f3a236d682858b | Existing brand reference, not a new logo decision |
| Prior generated interaction poster, 1672x941 | 1844516 | 59a37276b808cfdf60acffa1bdb84e236b0e0c312848b6cb161d2e0b7525653d | Explanatory diagram, not pixel/interaction authority over this final freeze |

The private mock images were inspected in this adoption. Their top scenario/prototype toolbar and synthetic example text must not enter production. The poster's same-session resume and suggested quick entries are specifically not adopted. The source screenshots cannot establish an auto-open bug; code review shows an intentional no-selection root and Project disclosure behavior.

No new high-fidelity rendering or mock implementation is requested or produced in this freeze. Main/Source/Search/Reader behavior is frozen by text; shared current visual roles and compatible private reference composition apply. Missing exact production comparison remains a final visual-evidence gap, not permission to invent a competing UI.

## R4. Evidence classification

Performed: fresh remote identity resolution, task-relevant source and canonical review, explicit final interaction decisions, three task design traces, local SHA-256 checks of supplied files, dependency/gap plan and documentation integration/readback.

NOT_RUN by this task: production runtime tests, real browser/task execution, installed-profile verification, current logged-in contextual action, accessibility/performance measurement, source/release screenshot comparison, model/paid calls, schema/data migration, extension build/install/publish. No prior CI/prototype/diagram result is promoted to an IAH production PASS.

Final publication identity is the Git commit containing this contract set, verified against its parent through a docs-only comparison and remote main readback. Do not insert a guessed self-referential final SHA inside its own contents. Current STATUS retains the existing global next-task pointer, independently of this lane's planned first task.
