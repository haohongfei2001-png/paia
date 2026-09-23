# PAIA current engineering instructions

## Consumer Product v1 — active execution routing

`PAIA-CONSUMER-PRODUCT-v1` is the sole active PAIA product/engineering queue.
Its canonical docs live under `docs/consumer-product-v1/`.

Before continuing PAIA development, read in this order:

1. `docs/consumer-product-v1/STATUS.md`
2. `AUTHORITY.md`
3. `PRODUCT_INTENT_CONTRACT.md`
4. `UX_CONTRACT.md`
5. `TECHNICAL_PLAN.md`
6. `MASTER_PLAN.md`
7. `VERIFICATION.md`
8. `EXECUTION_PROTOCOL.md`
9. the current round's relevant code/history only.

Google Drive `PAIA设计想法.docx` remains the highest product-intent authority.
Do not copy the private source, private archive material or private screenshots
into this public repository.

`STATUS.md` is the only active execution queue. Remote `main` is the engineering
fact source. Preserve correct historical implementation and evidence, but do not
resume old queues merely because their own historical STATUS still names a next
round.

Current owner authorization is
`TEMPORARY_NIGHT_WHOLE_EXECUTION / MAX_9_ROUNDS`. Continue consecutive rounds
within that cap without stopping for ordinary engineering decisions. Stop only
at the owner gates defined in `AUTHORITY.md` / `EXECUTION_PROTOCOL.md`, a
truthful BLOCKED/FAIL, or the authorization cap.

### Historical execution packages

`PAIA-PRODUCTION-READINESS-v1`,
`PAIA-CHATGPT-PROJECT-RECOGNITION-v1`, ANS, UIS, UIR and UX-R are historical
evidence after Consumer Product v1 activation. Their useful unresolved
requirements are absorbed by the Consumer Product MASTER_PLAN.

Do not start CPR-03, PRD-03, a new ANS round, or another legacy UI/UX round
unless the active Consumer Product round explicitly cites a bounded historical
artifact as evidence. Legacy receipts and failures remain truthful history and
must not be rewritten as if they were Consumer Product acceptance.

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
