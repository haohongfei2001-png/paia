# Source migration baseline

This file records the initial migration of the PAIA Chrome Extension into the public GitHub repository. It is a migration record, not an indication that `extension/` is a frozen snapshot.

- Initial source commit: `063ddb5cfae3a8b1ec637c2604639cbde11529c7`
- Initial source tag: `checkpoint-v0.11.1-thought-library-reading-closure`
- Product version at migration: `0.11.1`
- Migrated: 2026-09-11

From this migration onward, `haohongfei2001-png/paia` `main` is the authoritative development source for PAIA. Local clones, unpacked Chrome folders, temporary worktrees, release packages, and other local copies are working or runtime copies only and must not become a competing source of truth.

The initial import included the current source code, tests, design/decision documents, build/check scripts, development utilities, experiments/spikes, and compact textual acceptance evidence needed to understand and modify the product.

Intentionally excluded from the public repository: the nested local `.git` object database, browser QA profiles/session data, local `work/` scratch state, generated ZIP/release copies, and large historical screenshot/build-output directories. These exclusions are not required to understand, modify, test, or continue the current source and avoid publishing local browser state or redundant generated artifacts.

The original local Git history was used to select the migration baseline, but that nested history is not embedded here. Historical implementation context remains available through the imported product, decision, test, acceptance, and gap-audit documents.
