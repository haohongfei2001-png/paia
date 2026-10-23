# Explicit local active-library consumer

Base: `70ba7df95b154f46fd3951f4d5091ee29859805a`. Isolated branch: `codex/paia-active-local-consumer-20261023`.

## Delivered behavior

`CanonicalGenerationPublication.openOriginalActiveStore(local)` reads the original durable registry, receipt, and all three catalog identities. It constructs and binds the original `LibraryDocumentsStore` using the registry's actual database name and factory. Callers supply neither a target database nor a handle. The method refuses missing/mismatched catalog, receipt, graph qualification, pending publication, duplicate implicit attachment, or changed final registry cut. Newly opened target connections close on failure; catalog rows are never repaired.

The original repository's opt-in existing-only opener first requires the factory's database inventory and the exact current schema version, and also aborts any upgrade request. Ordinary open behavior is unchanged. Missing databases are not probed by creation; unavailable inventory and old schemas fail closed. A closed selected repository retains existing-only behavior. This does not promise an atomic inventory/open operation across concurrent external database deletion; the upgrade-abort guard remains in place and native verification is pending.

The real local chain is: original Source + Working A -> original protected grouped publication of B -> original checkpoint-copy retirement and grouped cleanup -> fresh manager discovers B from durable registry -> original B Working edit -> original nonempty restore of A's independent successor -> original B outbox retained -> fresh manager discovers B -> original edit -> retained readable content. No global worker/default database switch, replacement database, copied content truth, caller-supplied database choice, production profile, or external account was introduced.

## Local control qualification

The Source/Working merge classifies only an originally bound active `original-group` generation. It calls the original copy-retirement validator, requires actual completed cleanup, and compares the exact gate, permanent marker, graph qualification and retirement receipt. It removes those four local controls and the one verified completed restore's exact `canonicalGeneration` field only from an in-memory qualification projection. Old completed-restore assertions remain byte-for-byte unchanged. Unknown generation controls and unbound repositories receive no such allowance.

Complete original native snapshots remain in the existing raw snapshot map. Pre-merge comparison and final raw fences keep all original rows and stage records. Final fences predict the original active owner’s exact `writeRevision + 1` transition rather than omit the gate. No new writer token is exposed. The original 4096 / 2 MiB / 30-second limits and full rollback remain.

## Verification and retained failures

Runtime: existing official isolated Node 22.23.3, macOS arm64; fake IndexedDB, synthetic local storage. No installs, browser, build, cloud, Full, real account/data, deployment, or network calls.

- `first.log`: module initialization failure (0/1), caused by eagerly capturing the repository class across an existing circular import. Fixed by keeping the captured original opener within its defining module. `first-publication.js` retained.
- `second.log`: 1/2. Cold selection/edit/reopen passed; original nonempty merge refused the newly qualified restore control under the old exact schema. `second-test.mjs` retained. No checker was weakened.
- `third.log`: incomplete run, 12 individual case results (9 pass / 3 fail), no aggregate conclusion. Failures were the unpredicted original gate advance and fake IndexedDB's version-zero shells after missing-open abort. Owned Node processes were stopped after results; no general process cleanup. `third-publication.js`, `third-merge.js`, `third-test.mjs` retained.
- `debug.log`: targeted original merge failure remained; temporary body-free exception stack showed `BNS_RESTORE_LOCAL_CHANGED` at the original terminal fence. Temporary instrumentation was removed; `pre-debug-idb.js` is the saved production file used to restore it, not a claimed source vector for the prior third run.
- `fourth.log`: 12/12 after exact gate transition and inventory precheck.
- `owning-related.log`: 69/70, 38,056.601 ms. All 50 unchanged related cases passed (protected grouped publication and original Source/Working incremental tests). The new exclusion test was wrong: the original Working journal refuses that exclusion at entry with `BNS_WORKING_SCOPE_UNAVAILABLE`, before any recovery. Its source is retained in `owning-related-test.mjs`.
- `final-owning.log` and `.exit`: final entire owning file, 22/22, exit 0, 10,806.752875 ms; zero failure/cancellation/skip/todo. The corrected exclusion check proves unchanged storage on original refusal. A separate resident synthetic purge-deny check proves incoming recovery refusal and byte-for-byte retention. These are not evidence of complete negative-intent inheritance.

The 22 final owning cases and 50 prior unchanged related cases are separate results, not a synthetic single 72/72 invocation. No old 21-case active-library suite was repeated.

## Limits and next integration milestone

No full active-generation replacement or arbitrary family migration is implemented. `GENERATION_EXISTING_SOURCE_OWNER_REQUIRED` is unchanged. Full negative-intent inheritance is not claimed: unsupported negative-state profiles refuse instead of discarding state. Phased/Human generations can still be opened through the original active-store binding, but this new nonempty Source/Working classifier does not grant their incremental merge profile. Export/re-export of an active Source generation through every other consumer is not qualified here.

Two-database registry/target selection is not a globally atomic switch. Existing pending/source-gate/write-revision coordination stays authoritative; concurrent raw native database tampering is not a security boundary. The native Source/Release milestone must exercise inventory, existing-only open, cold selection, original merge and rollback against actual IndexedDB. The test uses only original assert/test, fake-IDB imports and the original thought-m1 helpers; no fs/process dependencies. The native factory bridge must support its own inventory/name mapping and synthetic database isolation.

## Use

Create an original registry repository with the explicitly configured local registry name/factory, then a new `CanonicalGenerationPublication(registry)`, and call `openOriginalActiveStore(localStorageAdapter)`. It returns the actual original store. Connect the existing Core/journals using the already established dataset/device identity; no new identity is inferred or created by this selector. Complete original initial grouped cleanup and copy retirement before Source/Working nonempty merge. Reuse the original `StagedSyncRestore` against the returned store and Core. Use a new publication instance for a new cold selection. The application’s default repository remains unchanged.
