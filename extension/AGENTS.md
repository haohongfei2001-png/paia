# PAIA current engineering instructions

## Authoritative source

- `haohongfei2001-png/paia` on GitHub is the authoritative development repository for PAIA.
- The active Chrome Extension source lives under `extension/`; the public product website lives at the repository root.
- From the 2026-09-11 migration onward, `main` is the source of truth. Local clones, unpacked Chrome folders, temporary worktrees, packaged builds, and old project directories are runtime or working copies only.
- When the user explicitly asks to implement, fix, refactor, document, or otherwise change PAIA, changes may be made directly in this GitHub repository and committed to `main` unless the user asks for a branch or pull request.
- Historical imported documents may contain task-specific instructions such as “do not push”, “local checkpoint only”, fixed timeboxes, frozen worktrees, or old deployment paths. Those were constraints for earlier development sessions and do **not** override the current GitHub-source-of-truth workflow.

## Current documentation order

Before proposing or changing product behavior, read in this order:

1. `PRODUCT.md` — current product definition, priorities, capability model and deliberate freezes.
2. `ARCHITECTURE.md` — current ownership rules, trust boundaries, schema-freeze rule and architecture direction.
3. `ROADMAP.md` — approved development sequence and decision gates.
4. Relevant current feature contract only when the change touches that feature, for example `PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md`, `SMART_FILTER.md` or a current release record.
5. Historical specifications/acceptance documents only when needed for compatibility, migration evidence or an exact legacy behavior.

`PRODUCT_SPEC.md`, `DECISIONS.md`, `README_HISTORY.md`, version-specific `V*.md`, `ROUND*.md`, M1/M2 foundation documents and old outputs are historical evidence. They do **not** override `PRODUCT.md`, `ARCHITECTURE.md` or `ROADMAP.md` for new direction.

If a historical contract and current product direction conflict, preserve already-shipped safety/data behavior until an explicit migration is approved, but do not continue the historical product plan merely because it is documented in detail.

## Before changing behavior

- Identify which current roadmap round the change belongs to.
- Preserve compatibility with the current data model, source identity, user edits, tombstones, provenance and explicit authorization semantics unless the user explicitly approves a migration.
- The post-v0.12 durable schema is frozen by default. Before adding a store, canonical body copy, new durable entity family or destructive migration, satisfy the schema-change questions in `ARCHITECTURE.md` and obtain explicit product justification.
- Prefer a read model, derived projection, lightweight preference or reusable service boundary over a new canonical data layer.
- Reader is a presentation capability, not an additional body-text database.
- Passport is a governance/authorization direction, not a body-text database.

## Product and privacy boundaries

- PAIA is currently a desktop Google Chrome Manifest V3 extension centered on ChatGPT Web.
- Source records must remain distinct from user-edited working text and AI-derived organization. AI must never silently overwrite the user's original expression or protected user work.
- Capture and import behavior must remain constrained by explicit product contracts. Do not broaden collection to drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies, credentials, or other local/private data without explicit product authorization.
- Never commit real user archive contents, browser profiles, session state, cookies, API credentials, private exports, or personally identifying test fixtures to Git.
- Tests and public acceptance evidence should use synthetic or sanitized data. Be precise about the difference between automated/headless validation and real-user Chrome smoke testing.
- Existing external-AI/provider behavior must follow the current product contracts and manifest permissions. Do not add new providers, broader permissions, hidden background requests, automatic paid calls, or automatic retries without explicit user approval.
- User-controlled authorization, exclusion, revocation and local-first behavior take precedence over convenience automation.

## Engineering and delivery

- Keep adapters, capture/import logic, storage/model logic, UI, search/context logic and provider-facing logic separated according to `ARCHITECTURE.md`.
- `background/service-worker.js` should trend toward trusted validation/dispatch rather than absorbing more domain behavior. Refactor incrementally when doing real product work; avoid large cosmetic moves with no behavioral benefit.
- Add or update targeted tests for behavioral changes and run the relevant regression checks when feasible.
- On a fresh clone, use `npm install` and `npx playwright install chromium` under `extension/` before the complete browser regression suite. `npm test` is the current full-suite entry point; `npm run check` is the static package audit.
- `npm run build:release` is the current source-of-truth release build. It builds from the GitHub working tree and validates the emitted release without requiring historical local `work/` receipts. Version-specific historical acceptance packagers remain for release history and may depend on generated evidence from their original sessions.
- For the user's existing unpacked Chrome installation, preserve the same loaded runtime path to preserve extension identity and Chrome-managed IndexedDB. `development/Update PAIA.command` is the supported local sync/deploy helper; see `DEVELOPMENT_WORKFLOW.md`.
- Keep documentation aligned with actual behavior; do not claim unsupported compatibility, live-provider success, real-user validation, semantic understanding or sync capability.
- The user has limited programming experience. Agents should perform code and file changes themselves when tools allow it and give only concise manual smoke-test steps when direct browser interaction is genuinely required.
- Do not ask the user to maintain a second authoritative local copy. If a local clone diverges, reconcile it with GitHub `main`; do not treat the local directory as newer merely because it exists.

## Product validation discipline

PAIA currently has stronger engineering validation than product validation. Do not treat additional test count or ontology depth as product progress by itself.

When a roadmap round includes product validation:

- prefer local-only metrics that do not transmit private archive text;
- distinguish observed repeat use from one-time feature completion;
- use real retrieval/reread/reuse failures to justify later architecture work such as semantic retrieval, Passport or sync;
- do not expand a feature whose value has not been demonstrated simply because the implementation path is available.

## Migration note

The initial GitHub source import came from local commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tag `checkpoint-v0.11.1-thought-library-reading-closure`. See `SOURCE_SNAPSHOT.md` for the migration record. Earlier authorization history remains in Git history and the imported version/acceptance documents, but it is not the current execution policy.
