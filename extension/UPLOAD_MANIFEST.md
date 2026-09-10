# Public upload manifest

## Included for connected-GPT development

- Current v0.11.1 runtime/source code: `adapter/`, `background/`, `content/`, `core/`, `ui/`, `icons/`, `manifest.json`
- Full tracked automated test suite and fixtures: `tests/`
- Build, verification and development scripts: `scripts/`, `development/`
- Current design, architecture, privacy, roadmap, decision and acceptance documents
- Tracked experiments and spikes that explain implementation choices
- Compact text/JSON acceptance evidence from `outputs/` that is referenced by project documents

## Intentionally excluded

- Nested `.git/` database and object packs
- `tests/qa-browser-profile/` browser profile/session/cache data
- `tests/qa-local/` local QA state that was intentionally gitignored in the source project
- `work/` scratch worktrees, local logs and local-only test output
- Generated release/internal ZIP files and repeated packaged source trees
- Large historical screenshot/build-output directories under `outputs/`
- macOS metadata such as `.DS_Store` and `__MACOSX/`

These exclusions do not remove source code required to understand, edit, test, build, or reason about the current v0.11.1 product. The one thing not reproduced here is the original extension repository's commit-by-commit Git history; the imported snapshot records its source commit and tag in `SOURCE_SNAPSHOT.md`.
