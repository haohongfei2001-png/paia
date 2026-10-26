# PAIA Sync → Codex: frozen-source handoff

Version **20261026T0541Z-4ca6121a-v2**. This is an isolated code/evidence handoff, **not a release, merge, activation or passing-test claim**. It replaces the stale `a8d122c` knowledge baseline for this Sync review only. Do not repeat already recorded work just because it was absent from that old handoff.

## Read first

1. `SOURCE-IDENTITY.json`: exact frozen source, separate current-main identity and execution state.
2. `KEY-SOURCE-DELTA-from-a8d122c.patch`: plain readable changes to the four requested entry files; full originals are under `development-source/`.
3. `SELECTION.json`: entrypoints, transitive runtime/test/harness/vendor closure, owning test inventory, and historical evidence groups.
4. `IDB-INTERFACE-REFERENCE-main05514-to-dev.patch`: interface review only. **Do not apply it or overwrite current-main `idb-repository.js`.** The current-main file is separately under `reference-only/main-0.55.14/`.
5. `FILE-MANIFEST.json` and `SHA256SUMS`: original git-blob provenance, file sizes and SHA-256 integrity.

## Exact source is not current main

- Frozen development source: `4ca6121aba860856d749f2dc788a77e9c3eb8947`, tree `8ae26e2ba3100e3335559ac4a7146b819e63270a`, package `0.55.9`.
- Published main: `5dcabcab23545583da0afe22e965ecf47f1e6c0f`; locally available tree-equivalent commit `f906c92ec863be8a55d3c5f04f4361f244f6a943`, tree `e42b02a025e51e26dedaa66e396b07e930039fd5`, package `0.55.14`.
- Old Codex handoff: `a8d122c025cba42ad0cbbff4b20546a886d5353e`.
- Main's separate current CI has **four signed-consumer failures reported by the parent task**; it is not fully green. The frozen development snapshot is not an approved replacement for main and carries its own unresolved/HELD work.
- Frozen checkout was clean with no untracked files or stash entries at packaging inspection; exact observations are in `SOURCE-IDENTITY.json`.

## Four entry-file changes, in plain language

- `application-generation-selection.js`: adds original-lifecycle held-review/action ownership, one original deadline, repository/local/registry checks, accounted action work, native dispatch/transaction settlement boundaries and cold readback/receipt handling. It does not turn a held review into readiness or blanket activation authority.
- `canonical-generation-publication.js`: active-library preparation can participate in the same selection action, account comparisons and expose its original registry dependency to the owner.
- `group-checkpoint.js`: retains original inheritance provenance/currentness and restricted same-action tail renewal; source-union publication reads use the original scope's row/point owner rather than a disconnected replacement.
- `local-control-publication.js`: stable keys are split into their own dependency; reservation/owner comparison operands debit the same selection scope.

These four files are **not** a sufficient copy set by themselves. Their closure includes the current development `idb-repository.js`, lifecycle/native ownership, indexed-store observations, source-union row support, and the owning tests/harness/vendor dependencies selected in the manifest. Same-as-main dependencies are still shipped so the old `a8d122c` checkout is not silently treated as current.

## Main/shared IDB versus development/native

`development-source/extension/core/idb-repository.js` is the frozen development implementation, including selection/native interfaces. `reference-only/main-0.55.14/extension/core/idb-repository.js` is the separate main baseline. Reconcile only required interfaces against current main while retaining unrelated current-main behavior; do not replace all of main, cherry-pick private intermediate history, or use this handoff as a full-branch transplant. No Git bundle or branch history is included.

## Evidence and adoption boundary

The package contains 2222 original tracked source/evidence blobs plus generated packaging metadata. Evidence remains in its original bytes and original path beneath the evidence category; names and recorded failures are not rewritten to success. `evidence/HELD-not-adopted/` is explicitly separate from historical evidence. **Reverse, mixed, native and fusion material stays HELD/not adopted wherever identified by `SELECTION.json`; inclusion is not acceptance.** Earlier pass records apply only to their original source/run scope. A pass in an old log is not a pass for this frozen SHA or current main. Missing final/native/combined acceptance remains missing.

No internal memory, private notes, user instructions/prompts, screenshots, credentials, full worktree or private commit history is intentionally included. Original source may contain synthetic fixture strings; these are code, not real-user input data. Scope-selection evidence is recorded in `SELECTION.json` rather than assumed from filenames.

## Explicit limits

External fusion/Port files listed under `SELECTION.json.externalHeld` are **NOT_INCLUDED** in this ZIP; that list is provenance/held-state metadata only. Existing frozen-source HELD reverse/mixed reports remain included. Do not reopen blocked Port research, run old commands, or adopt unintegrated fusion/native work. The frozen runtime closure has no unresolved relative import according to the static selector; the 151 unresolved literal references are test-generated/copied-graph strings, not proven missing runtime imports. This is static coverage, not a successful run. External Node packages are declared by included package metadata/lockfile, not installed or vendored here.

## Recover safely

1. Verify the external ZIP hash in `ARTIFACT-SHA256SUMS` or `ARTIFACT-MANIFEST.json` before extracting.
2. Extract into a **new empty directory**, not over a working checkout. The ZIP has one versioned root directory and no symlink entries.
3. From that extracted root, verify `SHA256SUMS` using a trusted SHA-256 verifier. `FILE-MANIFEST.json` maps each original file to its source commit/git blob. All selected dependencies are actual bytes, not unresolved references to an old checkout.
4. Inspect the four source deltas and the test inventory; retain original evidence and existing current-main changes. Any later integration should be narrowly reviewed in a separate branch.
5. Do not run commands copied from historical receipts. The current task authorizes packaging only; any later execution must use a freshly reviewed current workflow and its own authorization and exact-source receipts.

## Verification state

**Tests/build/browser/native/provider/network/user-data actions: NOT_RUN.** Only read-only Git metadata/blob extraction and archive/hash integrity checks were performed. Archive integrity is not runtime validation. No local main mutation, push, publication, CI trigger, runtime execution, paid/provider action or live-data access was performed by this packaging task. Only the parent task may publish the separately authorized artifact-only branch, with no active `.github/workflows` at that branch root.

The selected test and harness files are supplied as a continuation inventory, not as a claim they have been executed here. Preserve all existing failed/unknown results until an authorized exact-source run establishes new evidence; do not relabel them or infer a release readiness decision from this package.

## Transport note: Git branch contains ordered binary parts

The published artifact-only branch carries **36 ordered parts**, not the standalone ZIP. Concatenate them byte-for-byte in numeric order; do not decode or decompress individual parts. These are slices of the original ZIP, not a repack. The internal ZIP README is unchanged. From this artifact directory:

```sh
cat parts/PAIA-Sync-Codex-Handoff-20261026T0541Z-4ca6121a-v2.zip.part* > PAIA-Sync-Codex-Handoff-20261026T0541Z-4ca6121a-v2.zip
printf '%s  %s\n' 'be1fb2882a114d702c021ffd965f7b67b2103f9bd1cf70d4c8a3a2ff98a0d1d9' 'PAIA-Sync-Codex-Handoff-20261026T0541Z-4ca6121a-v2.zip' | sha256sum -c -
unzip PAIA-Sync-Codex-Handoff-20261026T0541Z-4ca6121a-v2.zip
```

Expected reconstructed ZIP: **18,737,881 bytes**, SHA-256 **`be1fb2882a114d702c021ffd965f7b67b2103f9bd1cf70d4c8a3a2ff98a0d1d9`**. `ARTIFACT-MANIFEST.json` includes every part's bytes/hash; `ARTIFACT-SHA256SUMS` covers those parts and the other payload files. Run that checksum list after reconstruction because it also includes the full ZIP. These commands only recover/verify the archive; they do not run product code or tests.
