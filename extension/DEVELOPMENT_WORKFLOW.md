# Development workflow

GitHub `haohongfei2001-png/paia` `main` is the authoritative PAIA development source. The Chrome-loaded unpacked directory is a runtime copy only.

## Fresh development clone

From `extension/`:

```bash
npm install
npx playwright install chromium
npm test
npm run check
```

Browser tests use the repository's `playwright` development dependency by default. `PLAYWRIGHT_MODULE` remains available only as an explicit environment override for managed agent runtimes; no developer-specific absolute Playwright path is required.

## Current release build

```bash
npm run build:release
```

This builds `work/current-release/` from the current GitHub source and runs the package and release-product guardrails. Historical version-specific acceptance packagers may require generated `work/` receipts from their original release sessions; they are release-history tooling, not the current source-of-truth build entry point.

## Existing daily Chrome installation

To preserve the existing unpacked extension identity and its Chrome-managed IndexedDB, keep Chrome pointed at the same runtime path. On macOS, double-click:

`development/Update PAIA.command`

It will:

1. refuse uncommitted tracked source changes;
2. fetch and fast-forward the local clone to GitHub `main`;
3. locate the existing Chrome-loaded PAIA runtime by asking once on the first run and remembering that path locally;
4. build and statically validate a current release in a temporary directory;
5. back up the current runtime code;
6. `rsync --delete` the validated release into the same runtime path;
7. verify the deployed files and restore the backup automatically if verification fails;
8. open `chrome://extensions` so the existing PAIA extension can be reloaded.

The runtime-path preference and backups live under `~/Library/Application Support/PAIA Development/` and are not part of Git. The updater copies program files only; it does not read or move PAIA's Chrome-managed private archive database.
