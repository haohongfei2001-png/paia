# PAIA current engineering instructions

## Production Readiness v1 — active execution routing

`PAIA-PRODUCTION-READINESS-v1` is the active new product/engineering package for
closing the gap between strong automated engineering evidence and a PAIA daily
installation that can be relied on without silent data loss or recurring
operator repair.

Before continuing PAIA production-readiness work, read
`docs/production-readiness-v1/README.md`, `AUDIT.md`,
`DEVELOPMENT_PLAN.md`, `VERIFICATION.md`, `EXECUTION_PROTOCOL.md` and
`STATUS.md` after PRODUCT/ARCHITECTURE/ROADMAP. `STATUS.md` is the only PRD
queue. Execute only one READY round per owner continuation instruction and stop
after its receipt/status closure.

This package does not authorize ANS-10, semantic/vector integration, new live
providers, cloud sync, broader collection, hidden paid AI or a new durable
content layer. Real-site/daily-profile evidence must keep private content local;
only sanitized counts/hashes/states may enter Git.


## Planned interlock — ChatGPT Project Recognition v1

`PAIA-CHATGPT-PROJECT-RECOGNITION-v1` is the mandatory next package after
PRD-02 and before PRD-03. Its canonical docs are under
`docs/chatgpt-project-recognition-v1/`.

While PRD-02 is not COMPLETE, this package remains `BLOCKED_BY_PRD02` and no
CPR implementation round may start.

After PRD-02 closes, read that package's README, STATUS, DEVELOPMENT_PLAN,
VERIFICATION and EXECUTION_PROTOCOL. Its completion standard is stricter than
the historical ANS fallback contract: current ChatGPT `projectIdentity`,
`projectName` and Conversation→Project `membership` must all be genuinely
verified from privacy-safe live evidence. Unknown/unavailable fallback is not a
package-complete outcome.

PRD-03 must not start until the Project Recognition package is COMPLETE.

## Archive Navigation & Source Structure v1 execution routing

The explicitly authorized ANS package takes precedence over the completed UIS
queue for its R1–R9 scope. Read `PRODUCT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, the
Design Core, then `docs/archive-navigation-source-v1/README.md`, `STATUS.md`,
`ARCHITECTURE.md`, `SOURCE_CAPABILITIES.md`, `DEVELOPMENT_PLAN.md`,
`VERIFICATION.md`, `EXECUTION_PROTOCOL.md` and the previous receipts.
`STATUS.md` is the only ANS queue. An IN_PROGRESS round must finish its actual
runtime/main certification and receipt before completion. If all ANS rounds are
COMPLETE and current_round is NONE, the package is closed: do not invent ANS-10,
resume UIS/UIR/UX, or treat roadmap product-validation ideas as execution grants.
A new explicitly authorized scope still follows its own authority and writer lease.

## Completed overlay — UI Simplification v1

The UI Simplification v1 execution contract is on GitHub `main`; its canonical status file determines whether a round is active or the package is complete. Once UIS-01 through UIS-04 are all COMPLETE, no current round remains. Do not invent UIS-05 or resume historical UIR/UX work.

Before executing any request equivalent to **“继续开发”** in the PAIA context, read in this exact order:

1. `docs/ui-simplification/README.md` — fixed decisions, scope, resume protocol and engineering guardrails.
2. `docs/ui-simplification/UI_SIMPLIFICATION_STATUS.md` — the **only canonical current-round execution state** for this package.
3. `PRODUCT.md` — current product definition and shipped capability facts.
4. `ARCHITECTURE.md` — data ownership, trust and schema boundaries.
5. Relevant current source/tests for the one round marked `READY`.

Execution semantics:

- One product-owner message **“继续开发”** authorizes exactly **one** current UI Simplification round.
- Resolve the live remote `main` HEAD before work. GitHub `main` is the authoritative source; do not resume from an old branch, chat SHA, frozen worktree or unpacked Chrome folder.
- Implement only the round marked `READY` / `CURRENT` in `UI_SIMPLIFICATION_STATUS.md`.
- After implementation, run that round's required tests, commit to `main` unless the user explicitly asks for a branch/PR, update `UI_SIMPLIFICATION_STATUS.md`, and stop.
- Do **not** automatically begin the next round. The next round requires another product-owner **“继续开发”** message.
- Do not ask the product owner to restate decisions already fixed in the UI Simplification package. Ask only if a genuine destructive-data, ownership, privacy, authorization, or architecture conflict cannot be resolved safely from repository contracts.
- The active overlay may change current visible UI/search/action-placement behavior only within its documented scope. It does not override Source/Input/Thought ownership, privacy, authorization, deletion, migration, Backup, or capture contracts.

## Completed UI execution packages — historical evidence, not active work

### Chrome UI Refresh v1

Chrome UI Refresh UIR-01 through UIR-04 is complete and was merged to `main` on 2026-09-17 via PR #31. `chrome-ui-refresh-v1` is **not** the active development branch. `docs/ui-refresh/` remains certification/design history and should not be used to resume a new UIR round.

Do not:

- resume UIR-01 through UIR-04;
- recreate PR #31's old branch-state workflow;
- treat stale pre-merge wording in historical reports as current branch instructions;
- create UIR-05 merely because UIR-04 was completed.

The shipped UI Refresh implementation is the baseline from which UI Simplification v1 now proceeds.

### UX-R1 through UX-R6 redesign

The earlier UX-R1 → UX-R6 package is also shipped historical implementation evidence. Its Design Core and trust/product principles remain useful constraints, but its old round-status machinery is not the current execution queue.

When a UI Simplification decision intentionally supersedes an earlier visible presentation decision, follow the active UI Simplification package while preserving the underlying domain/security contracts.

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
- The post-v0.12 durable content schema is frozen by default. Before adding an object store, canonical body copy, durable entity family or destructive migration, answer the schema-change questions in `ARCHITECTURE.md` and obtain explicit product justification.
- Prefer a read model, derived projection, lightweight preference or reusable service boundary over a new canonical data layer.
- Reader is a presentation capability, not a body-text database.
- Search/Revisit are projections/coordinators, not parallel truth stores.
- AI Context is a compiler over authorized material, not a fourth canonical body store.
- Passport is authorization/audit metadata, not content ownership.

## Product and privacy boundaries

- PAIA is currently a desktop Google Chrome Manifest V3 extension centered on ChatGPT Web.
- Source records remain distinct from user-edited Working Input and AI-derived organization.
- AI must never silently overwrite original Source evidence or protected user work.
- Do not broaden collection to drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies, credentials, clipboard or other private local data without explicit product authorization.
- Never commit real user archive contents, browser profiles, session state, cookies, API credentials, private exports or identifying fixtures to Git.
- Tests and public evidence must use synthetic or sanitized data.
- Existing provider behavior must follow current manifest permissions and explicit user authorization. Do not add providers, broader permissions, hidden background requests, automatic paid calls or automatic retries without explicit approval.
- User-controlled authorization, exclusion, revocation, provenance and local-first behavior take precedence over convenience automation.
- Permanent deletion/tombstones outrank re-import, caches and derived projections.
- Smart Filter must not silently delete Source data.
- Product Signals are observers only and cannot grant permissions or change trusted output.

## UI and interaction engineering

- Reuse existing domain services/state owners. UI code must not become an alternate persistence or authorization implementation.
- Do not create duplicate Source/Input/Thought/AI/Context body truth merely to simplify a screen.
- Keep page navigation/search/menu state local and bounded where possible.
- Preserve autosave, conflict, revision and leave-guard behavior when moving controls.
- Maintain keyboard accessibility and focus return for menus/dialogs/search.
- Removing a visible UI projection does not authorize deleting underlying metadata/services if they support other trusted behavior.
- When current approved UI behavior invalidates an old screenshot/UI assertion, update that assertion to the new behavior while preserving security/data invariants. Do not disable tests merely to get a green build.

## Engineering and delivery

- Keep adapters, capture/import logic, storage/model logic, UI, search/context logic and provider-facing logic separated according to `ARCHITECTURE.md`.
- `background/service-worker.js` should remain primarily trusted validation/dispatch; do not absorb unrelated UI/domain behavior into it.
- Add/update targeted tests for behavioral changes and run the relevant regression gates.
- Fresh clone setup under `extension/`:

```bash
npm install
npx playwright install chromium
```

- Current test/package commands:

```bash
npm test
npm run check
npm run test:ui-refresh
npm run build:release
```

- Do not weaken test assertions, privacy checks, release guards, certification jobs or timeouts to make a change pass.
- `npm run build:release` is the current source-of-truth release build.
- Preserve the existing unpacked Chrome runtime path/extension identity when deploying to the user's daily profile. Use `development/Update PAIA.command` after GitHub Desktop has synchronized `main`; see `DEVELOPMENT_WORKFLOW.md`.
- Do not ask the user to maintain a second authoritative local copy. Reconcile local work with GitHub `main`.
- Keep documentation aligned with actual behavior. Do not claim unsupported live-provider success, real-user validation, sync, semantic understanding or security properties.
- The user should not be required to perform manual coding. Agents should make repository changes themselves when tools permit and request only genuinely necessary real-browser smoke steps.

## Product validation discipline

PAIA still has stronger engineering validation than product validation.

- Prefer privacy-preserving local metrics.
- Distinguish observed repeat use from one-time implementation completion.
- Use real retrieval/reread/reuse failures to justify later semantic retrieval, Passport or sync expansion.
- Do not expand a feature merely because the implementation path exists.

## Migration note

The initial GitHub source import came from local commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tag `checkpoint-v0.11.1-thought-library-reading-closure`. See `SOURCE_SNAPSHOT.md` for migration history. Earlier authorization history remains in Git history and imported acceptance documents, but it is not the current execution policy.
