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

To preserve the existing unpacked extension identity and its Chrome-managed IndexedDB, keep Chrome pointed at the same runtime path.

### 1. Synchronize in GitHub Desktop

Before deploying, use GitHub Desktop to **Fetch origin** and, if offered, **Pull origin**. Continue only when the repository is on `main`, shows no pending Pull/Push, and has no local tracked changes.

The updater intentionally does not contact GitHub itself. GitHub Desktop and macOS command-line Git may use different network/proxy paths, so the updater instead verifies that local `HEAD` exactly matches the locally known `origin/main`. If they differ, it stops and asks for GitHub Desktop synchronization rather than deploying an uncertain revision.

### 2. Run the updater

On macOS, double-click:

`development/Update PAIA.command`

It will:

1. refuse uncommitted tracked source changes or a non-`main` branch;
2. verify the local clone matches `origin/main` as synchronized by GitHub Desktop;
3. first try to identify the existing Chrome-loaded PAIA unpacked directory from Chrome profile extension metadata; it reads only extension configuration needed to recover the local path, not browsing history, cookies, PAIA archive contents, or extension storage;
4. if Chrome exposes exactly one valid PAIA runtime, use it automatically and remember the verified path locally; only fall back to a manual folder chooser when detection is unavailable or ambiguous;
5. build and statically validate a current release in a temporary directory;
6. back up the current runtime code;
7. `rsync --delete` the validated release into the same runtime path;
8. verify the deployed files and restore the backup automatically if verification fails;
9. open `chrome://extensions` so the existing PAIA extension can be reloaded.

The runtime-path preference and backups live under `~/Library/Application Support/PAIA Development/` and are not part of Git. The updater copies program files only; it does not read or move PAIA's Chrome-managed private archive database.
