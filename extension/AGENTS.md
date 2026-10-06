# PAIA current engineering instructions

## AI Context Cards v2 — current scoped planning amendment, 2026-10-07

The product owner approved the four-card design and requested a development plan in GitHub. Read `docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_PLAN.md`, its adoption record and visual-reference manifest after STATUS and AUTHORITY for AI Context work. This documentation task does not start runtime implementation, a new writer, paid processing, an actual external connection, deployment or release.

Current AI Context direction is My Information / My Rules / My Now / My Inputs. Info/Rules/Now own independent editable Context Items; Inputs stores Topic access state without copied Topic bodies. Human work remains protected. External retrieval stops at allowed Context and allowed Thought Topics, never Archive fallback. Use the approved current PAIA shell, direct editing and capsule controls; do not resume Builder/material/review/package/Passport-console UI or redesign Thought Library.

The next AI Context implementation task is CPV1-CTX4-01 when implementation is explicitly requested. STATUS.md remains the only execution queue; the plan is a scoped detailed contract inside Consumer Product v1. AUTHORITY.md names the precise superseded lower-order clauses and D6/D7 Context mappings. Unrelated queues and 0.12.1 cancellations are unchanged. The retained pre-CTX4 STATUS/MASTER snapshots are evidence and unchanged non-Context details, not permission to restart old Context work.

## Consumer Product v1 — active execution routing

`PAIA-CONSUMER-PRODUCT-v1` is the sole active PAIA product/engineering queue.
Its canonical docs live under `docs/consumer-product-v1/`.

Before continuing PAIA development, read in this order:

1. `docs/consumer-product-v1/STATUS.md`
2. `AUTHORITY.md`
3. the currently adopted scoped contract, including `AI_CONTEXT_CARDS_V2_PLAN.md` and `AI_CONTEXT_CARDS_V2_REFERENCES.md` for Context
4. `PRODUCT_INTENT_CONTRACT.md`
5. `UX_CONTRACT.md`
6. `TECHNICAL_PLAN.md`
7. `MASTER_PLAN.md`
8. `VERIFICATION.md`
9. `EXECUTION_PROTOCOL.md`
10. the current round's relevant code/history only.

Google Drive `PAIA设计想法.docx` remains the primary design-intent source where a newer explicit product-owner decision has not superseded it. The latest approved AI Context scope above controls its conflicts.
Do not copy the private source, private archive material or private screenshots into this public repository.

`STATUS.md` is the only active execution queue. Remote `main` is the engineering fact source. Preserve correct historical implementation and evidence, but do not resume old queues merely because their own historical STATUS still names a next round.

The prior owner authorization includes two independent bounded product lines; their recorded scope and later current-status corrections remain unchanged:

1. `DesktopVNextOwnerApprovedRestart`: the owner approved frozen DVN-1.0 and foundation PR #107, then explicitly released the review pause for D1 Archive → D2 Thought Library → D3 AI Organize → D4 AI Context on 2026-09-30. The old Context design is now superseded; this historical authorization is not a reason to reactivate its cancelled UI or broaden the current documentation task.
2. `PromptReuseStage3AOwnerApproved`: on 2026-10-05 the owner approved `docs/consumer-product-v1/PROMPT_REUSE_STAGE_3A.md`. B-04-3A is resolved only for default-off, local, ephemeral analysis of the newly completed latest assistant reply in the current supported conversation, with zero Provider request and no durable assistant-reply body. B-04-3B broader/model reply processing remains not authorized. Consult the retained STATUS and actual later owner decisions for execution state; CTX4 neither restarts nor closes this independent line.

Use fresh remote main for every coherent batch and avoid overlapping writers on the same runtime/data boundary. A Prompt Reuse Stage 3A writer may proceed in parallel with desktop work only while it remains isolated from page roots and shared runtime ownership. Preserve #99 unchanged and unmerged. B-01, B-02, B-03, B-04-3B, B-05 and deferred live/device/legal gates remain unresolved on their affected paths; dependent behavior fails closed while independent authorized engineering continues.
The earlier `TEMPORARY_NIGHT_WHOLE_EXECUTION / MAX_9_ROUNDS` authorization is historical and does not cap the separately approved Desktop vNext restart.

### Historical execution packages

`PAIA-PRODUCTION-READINESS-v1`, `PAIA-CHATGPT-PROJECT-RECOGNITION-v1`, ANS, UIS, UIR and UX-R are historical evidence after Consumer Product v1 activation. Their useful unresolved requirements are absorbed by the Consumer Product MASTER_PLAN.

Do not start CPR-03, PRD-03, a new ANS round, or another legacy UI/UX round unless the active Consumer Product round explicitly cites a bounded historical artifact as evidence. Legacy receipts and failures remain truthful history and must not be rewritten as if they were Consumer Product acceptance.

## Authoritative source

- Repository: `haohongfei2001-png/paia`.
- Active Chrome Extension source: `extension/`.
- Public product website: repository root.
- `main` is the source of truth. Local clones, unpacked Chrome folders, generated releases, temporary worktrees and old project directories are runtime/working copies only.
- When the user explicitly asks to implement, fix, refactor, document or otherwise change PAIA, changes may be committed directly to `main` unless the user asks for a branch or pull request.
- Historical documents may contain task-specific old constraints such as “do not push”, fixed timeboxes, frozen worktrees or old deployment paths. Those do not override current `main`-based instructions.

## Current documentation order outside the active overlay

For general new product/engineering work not governed by a more specific active execution package, read:

1. `PRODUCT.md`
2. `ARCHITECTURE.md`
3. `ROADMAP.md`
4. Relevant current feature contracts such as `PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md`, `SMART_FILTER.md`, sync/security protocol files, or a current release record
5. Historical specifications only for compatibility, migration evidence, or exact legacy behavior

`PRODUCT_SPEC.md`, `DECISIONS.md`, `README_HISTORY.md`, version-specific `V*.md`, old `ROUND*.md`, M1/M2 foundation documents and completed UX/UI reports are historical evidence. They do not override current product/architecture sources or an active user-authorized execution overlay.

If historical behavior conflicts with current direction, preserve already-shipped safety/data guarantees until an explicit migration is approved, but do not continue an obsolete product plan simply because it is documented.

## Before changing behavior

- Identify the current active package/round or roadmap decision that authorizes the change.
- Preserve compatibility with current source identity, Working Input edits, Thought work, tombstones, provenance, revisions and explicit authorization semantics unless the product owner explicitly approves a migration.
- The post-v0.12 durable content schema is frozen by default. Before adding an object store, canonical body copy, durable entity family or destructive migration, answer the schema-change questions in `ARCHITECTURE.md` and obtain explicit product justification. The approved small independent Context Items provide a product justification, not blanket approval of a particular destructive migration or full archive copy.
- Prefer a read model, derived projection, lightweight preference or reusable service boundary over an unnecessary canonical data layer.
- Reader is a presentation capability, not a body-text database.
- Search/Revisit are projections/coordinators, not parallel truth stores.
- AI Context Info/Rules/Now own independent editable Items under the approved plan; Inputs owns only Topic access. Neither becomes a duplicate full Source/Input/Thought store.
- Passport is authorization/audit metadata, not content ownership or a current consumer workflow.

## Product and privacy boundaries

- PAIA is currently a desktop Google Chrome Manifest V3 extension centered on ChatGPT Web.
- Source records remain distinct from user-edited Working Input and AI-derived organization.
- AI must never silently overwrite original Source evidence or protected user work.
- Do not broaden collection to drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies, credentials, clipboard or other private local data without explicit product authorization.
- Never commit real user archive contents, browser profiles, session state, cookies, API credentials, private exports or identifying fixtures to Git.
- Tests and public evidence must use synthetic or sanitized data.
- Existing provider behavior must follow current manifest permissions and explicit user authorization. Do not add providers, broader permissions, hidden background requests, automatic paid calls or automatic retries without explicit approval. Do not restore retired BYO configuration/direct transport for CTX4 extraction.
- User-controlled authorization, exclusion, revocation, provenance and local-first behavior take precedence over convenience automation.
- Permanent deletion/tombstones outrank re-import, caches and derived projections.
- Smart Filter must not silently delete Source data.
- Product Signals are observers only and cannot grant permissions or change trusted output; current consumer cleanup retired their ordinary collection/dashboard.

## UI and interaction engineering

- Reuse existing domain services/state owners. UI code must not become an alternate persistence or authorization implementation.
- Do not create duplicate Source/Input/Thought/AI body truth merely to simplify a screen. Approved Context Items are their own small editable objects, not a copied corpus.
- Keep page navigation/search/menu state local and bounded where possible.
- Preserve autosave, conflict, revision and leave-guard behavior when moving controls.
- Maintain keyboard accessibility and focus return for menus/dialogs/search.
- Removing a visible UI projection does not authorize deleting underlying metadata/services if they support other trusted behavior.
- When current approved UI behavior invalidates an old screenshot/UI assertion, update that assertion to the new behavior while preserving security/data invariants. Do not disable tests merely to get a green build.
- Open the exact approved visual artifacts; do not implement an iframe/gallery/mock as the production feature. The CTX4 manifest names the original package and states; a missing image is not permission to invent a third design.

## Engineering and delivery

- Keep adapters, capture/import logic, storage/model logic, UI, search/context logic and provider-facing logic separated according to `ARCHITECTURE.md` and the current scoped contract.
- `background/service-worker.js` should remain primarily trusted validation/dispatch; do not absorb unrelated UI/domain behavior into it.
- Add/update targeted tests for behavioral changes and run the relevant regression gates.
- Fresh clone setup under `extension/`:

```bash
npm install
npx playwright install chromium
```

- Current test/package commands must be checked against the actual package scripts at implementation start; the established commands include:

```bash
npm test
npm run check
npm run test:ui-refresh
npm run build:release
```

- Do not weaken test assertions, privacy checks, release guards, certification jobs or timeouts to make a change pass.
- `npm run build:release` is the current source-of-truth release build, not publication authority.
- Preserve the existing unpacked Chrome runtime path/extension identity when deploying to the user's daily profile. Use `development/Update PAIA.command` after GitHub Desktop has synchronized `main`; see `DEVELOPMENT_WORKFLOW.md`. This docs-only task does not deploy.
- Do not ask the user to maintain a second authoritative local copy. Reconcile local work with GitHub `main`.
- Keep documentation aligned with actual behavior. Do not claim unsupported live-provider success, real-user validation, sync, semantic understanding or security properties.
- The user should not be required to perform manual coding. Agents should make repository changes themselves when tools permit and request only genuinely necessary real-browser smoke steps.

## Product validation discipline

PAIA still has stronger engineering validation than product validation.

- Prefer privacy-preserving local metrics where currently authorized.
- Distinguish observed repeat use from one-time implementation completion.
- Use real retrieval/reread/reuse failures to justify later semantic retrieval, Passport or sync expansion.
- Do not expand a feature merely because the implementation path exists.
- For CTX4, record separate local-function, security/migration, model-fidelity, real-client and production-visual evidence. The original prototype report is not a production PASS.

## Migration note

The initial GitHub source import came from local commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tag `checkpoint-v0.11.1-thought-library-reading-closure`. See `SOURCE_SNAPSHOT.md` for migration history. Earlier authorization history remains in Git history and imported acceptance documents, but it is not the current execution policy.
