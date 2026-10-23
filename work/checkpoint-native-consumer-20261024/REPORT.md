# Checkpoint publication native consumer preparation — 2026-10-24

This package changes only the author's two existing native test files. No runtime, provider, shared harness, worker, route, timeout, or budget changes. Local dependency 78417460 is a cherry-pick of author 7228f208 and must not be integrated again; the parent integrator already owns the original producer package. This package also needs the original Filter / SourcePurge compatibility fix 337ac1c1.

## Independent final review

Reviewed frozen 7228f208 (parent 8f1fc0f6) producer, original grouped compiler dispatch capability, and both original provider seams. The final source vector matched the reviewed runtime; author evidence is five-file 157/157, not an execution performed by this reviewer. No new concrete blocker found in its bounded producer scope.

The three prior races are closed by: (1) actual queued invocation rechecks action identity; (2) unsettled original local journal writes quarantine the original local owner lock until settlement; (3) each action's original provider captures its fixed work identity, and actual mutating request dispatch requires the original compiler cut proof plus synchronous final control/store/serial checks after all asynchronous qualification. Already dispatched remote writes remain ambiguous until exact GET readback; this does not claim remote cancellation. No real account/token host qualification or complete Sync acceptance is implied.

## Prepared native cases

Google AppData and OneDrive AppFolder each run three small cases through the original real adapter/request interface and existing synthetic HTTP backend:

1. Original Source capture and Working edit, original Topic/Entry/Placement and Prompt service/journal creation → original publisher confirmed → close A with repository.close() → independent B storage and database, discover only from simulated cloud objects → exact Source, Working, Human, Placement and Prompt rows. Topic proof uses B's own original suppression secret, never A's local secret. Original grouped stage cleanup → original B close and cold reopen → original Working and Human writers → confirmed causal successor → close B → independent C restores exact Source, successor Working/Human, Placement and Prompt.
2. Hold the last actual provider digest lookup before first body dispatch, pause original publisher, then release. First action refuses with zero POST/PUT; resumed action remains blocked on the unknown attempted object and cannot authorize the old action.
3. Hold the same pre-dispatch lookup, call original Source purge and cleanup with the original Filter/Working/Human/SourcePurge journals still installed, then release. Original purge completes; old publication refuses and sends zero POST/PUT. No journal clearing or guard bypass.

All owner connections close through repository.close(), not only native db.close(). Receipts contain case names, booleans and counts, not synthetic bodies. The fixture runs one original Source per case, no 65/129 groups or large seed.

## Entry and preparation evidence

- Native entry requires absolute PAIA_NATIVE_RELEASE_PATH for the already built Release. No implicit build or work/current-release fallback.
- Tracked files must be clean and match HEAD before execution; the exact core/background/proof hashes are checked again afterward. Untracked root build output does not block the test, and is neither removed nor certified.
- Both generated static fixture/helper imports are resolved and hashed before browser launch. Source/Release compare runtime vectors, generated vectors, and stable cases.
- Original three Release UI omissions and exact FILTER_DIAGNOSTICS worker line removal are checked explicitly; every core/background runtime file remains byte-equal.
- Node 22.23.3 preparation only. First synthetic execution failed at exact Prompt equality because JSON property insertion order differed; first-fixture.mjs and synthetic-first.log preserve it. Correction recursively sorts object keys while preserving exact keys, scalar values and array ordering. No data field is omitted. Then six cases / 64 assertions passed (synthetic-64.log). Additional exact Source and successor Placement checks produced final six cases / 70 assertions, exit 0 (synthetic-final.log).
- static.log proves both file syntaxes, 17 resolved generated imports, explicit Release contract and unchanged original journal ownership. After adding generatedImports to the paired receipt comparison, native entry syntax was checked once more; fixture and its 70 assertions were unchanged.

The preparation wrapper explicitly uses fake IndexedDB and labels its result NODE_FAKE_IDB_ONLY_NOT_NATIVE. Its fixture flags describe the exercised logical lifecycle; only the separate original MV3 entry's nativeFactory proof can certify native IDB. Browser Source/Release, build, cloud CI, accounts, real HTTP, deployment and performance measurement were NOT RUN here. Root will integrate this package and run the coherent native batch once using its prebuilt Release.

## Newly coordinated dependency

Parent reports the separate remaining consumer found that a genuine purge cut is not yet restorable through the newer checkpoint path. This package proves refusal of an old prepared publication after purge; it does not prove publication/restoration of the new negative-only or surviving-Working-plus-negative checkpoint. Author working_negative owns that successor. Root should batch native execution with that dependency rather than treat these six cases as complete negative recovery.
