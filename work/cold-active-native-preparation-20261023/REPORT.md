# Cold active-library native preparation — not executed

Implementation parent: `e596e04ccb4884244aa76ef814daace19d9c5117`. This follow-up adds new files only. The shared phased-human fixture and all runtime files remain unchanged.

## New milestone runner

`extension/tests/native-sync/cold-active-library-native.test.mjs` prepares the entire new 22-case owning file for Source and Release through the existing native storage harness. It samples the owning SHA and 34 runtime-file hashes, requires identical Source/Release vectors, and rechecks each staged runtime vector after execution. Existing isolation checks require real native factory identity and zero external requests. Release can consume `PAIA_NATIVE_RELEASE_PATH`; no build or browser was run in this preparation.

`extension/tests/native-sync/cold-active-library-fixture.mjs` provides a fixed command only: `cold-active-library-matrix`. Each synthetic factory owns a name map, and native `open`, `deleteDatabase` and `databases()` are forwarded with scoped physical names. The original repository keeps the same per-fixture factory object, including the deliberate unavailable-inventory negative control. Selector-created original stores receive that same actual adapter and stored physical name; no synthetic database contents or request/transaction objects are supplied. Inventory responses come from the actual browser and are filtered to names owned by the individual synthetic factory. All native transactions remain real. Cleanup uses only explicitly owned synthetic names.

## Exact adaptation whitelist

1. Remove the original Node test/assert imports, fake-IDB import, global fake KeyRange assignment, and exact thought-m1 helper import (one occurrence each).
2. Replace four original store constructors, five original repository constructors, and four fake factory constructors with the fixed native adapters. All constructor options remain intact.
3. Adapt one exact database-name assertion from its logical synthetic name to the corresponding mapped physical name. The equality assertion is preserved.
4. Remove the three exact fake/setup import lines and unused `setup` function from the original helper module. Original `local`, `capture`, `inputEdit` and other retained helper functions are unchanged.
5. Replace Node case registration/after hooks with the existing explicit native matrix boundary and scoped cleanup. No original case, assertion, catch, timeout or data input is omitted or weakened.

Static verification compares all 22 registered function bodies byte-for-byte after precisely items 2–3. It checks stable cold names, distinct factory names, actual request forwarding, scoped native inventory, physical-name pass-through, unavailable-inventory retention, forbidden outside names and three malformed-boundary refusals. This only validates adapter construction; it is not a browser result.

`static.log` / `static.exit`: pass, exit 0; `static-controls.json` explicitly reports `nativeCasesExecuted: 0`. Syntax-only checks passed for the new runner and generated fixture. No existing owning or related tests were repeated. No browser/build/cloud/Full/download was executed.

## Root milestone

After exact integration and normal release preparation, invoke this owning native runner once with the existing approved headless harness/environment. Keep the whole 22-case Source/Release result and both vectors. The empty inventory and old-schema checks must be real native observations, not inferred from fake IndexedDB. This does not qualify full replacement, complete negative inheritance, all-family exports, cross-database global atomicity, real profiles or cloud capacity.
