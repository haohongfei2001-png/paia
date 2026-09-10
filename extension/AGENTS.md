# PAIA current engineering instructions

## Authoritative source

- `haohongfei2001-png/paia` on GitHub is the authoritative development repository for PAIA.
- The active Chrome Extension source lives under `extension/`; the public product website lives at the repository root.
- From the 2026-09-11 migration onward, `main` is the source of truth. Local clones, unpacked Chrome folders, temporary worktrees, packaged builds, and old project directories are runtime or working copies only.
- When the user explicitly asks to implement, fix, refactor, document, or otherwise change PAIA, changes may be made directly in this GitHub repository and committed to `main` unless the user asks for a branch or pull request.
- Historical imported documents may contain task-specific instructions such as “do not push”, “local checkpoint only”, fixed timeboxes, frozen worktrees, or old deployment paths. Those were constraints for earlier development sessions and do **not** override the current GitHub-source-of-truth workflow.

## Before changing behavior

- Read the relevant current sections of `PRODUCT_SPEC.md`, `DECISIONS.md`, `PRIVACY.md`, and any feature-specific contract or acceptance document.
- Treat older version sections as historical context when a newer contract supersedes them.
- Preserve compatibility with the current data model, source identity, user edits, tombstones, provenance, and explicit authorization semantics unless the user explicitly approves a migration.

## Product and privacy boundaries

- PAIA is a desktop Google Chrome Manifest V3 extension centered on ChatGPT Web.
- Source records must remain distinct from user-edited working text and AI-derived organization. AI must never silently overwrite the user's original expression or protected user work.
- Capture and import behavior must remain constrained by explicit product contracts. Do not broaden collection to drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies, credentials, or other local/private data without explicit product authorization.
- Never commit real user archive contents, browser profiles, session state, cookies, API credentials, private exports, or personally identifying test fixtures to Git.
- Tests and public acceptance evidence should use synthetic or sanitized data. Be precise about the difference between automated/headless validation and real-user Chrome smoke testing.
- Existing external-AI/provider behavior must follow the current product contracts and manifest permissions. Do not add new providers, broader permissions, hidden background requests, automatic paid calls, or automatic retries without explicit user approval.
- User-controlled authorization, exclusion, revocation, and local-first behavior take precedence over convenience automation.

## Engineering and delivery

- Keep adapters, capture/import logic, storage/model logic, UI, and provider-facing logic separated according to the current architecture.
- Add or update targeted tests for behavioral changes and run the relevant regression checks when feasible.
- Keep documentation aligned with actual behavior; do not claim unsupported compatibility, live-provider success, or real-user validation.
- The user has limited programming experience. Agents should perform code and file changes themselves when tools allow it and give only concise manual smoke-test steps when direct browser interaction is genuinely required.
- Do not ask the user to maintain a second authoritative local copy. If a local clone diverges, reconcile it with GitHub `main`; do not treat the local directory as newer merely because it exists.

## Migration note

The initial GitHub source import came from local commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tag `checkpoint-v0.11.1-thought-library-reading-closure`. See `SOURCE_SNAPSHOT.md` for the migration record. Earlier authorization history remains in Git history and the imported version/acceptance documents, but it is not the current execution policy.
