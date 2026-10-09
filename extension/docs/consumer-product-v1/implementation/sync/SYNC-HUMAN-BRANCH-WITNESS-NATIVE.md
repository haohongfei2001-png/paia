# Private Human semantic witness — native test preparation

Status: **TEST CODE PREPARED; NATIVE SOURCE/RELEASE NOT RUN**. The coordinator must independently review this exact test code before any browser run. This document adds no production registration, runtime change, retention/ACK capability, account, provider or full-recovery claim.

## Exact branch and scope

Base `92fac1ffae424c5f8e9ed84384b2470c758df086`; isolated branch `codex/human-witness-native-041-20261009`; initial five-file code commit `8bc2c82330d3bc80f2ab49cb6627aa32f5e8be3e`, tree `5e4fbfba66968c9eb4cf33c10e112b54be39a111`. The separate coordinator retains all runtime/data, CI, version and integration ownership. Only five new native fixture/test/receipt/contract files plus this new document are added. All existing files remain byte-identical to the base.

The compiler retains the complete original 14-case source block from `human-branch-semantic-witness.test.mjs` byte for byte. It adapts only Node imports/assertions/runner and the physical constructor. The real `LibraryDocumentsStore` receives browser `indexedDB`, a unique `bns-human-witness-N` database and isolated Chrome storage prefix; real Core and the existing journal construct the two branches. No fake IndexedDB, DTO branch reducer, alternate writer or production worker is substituted. The separate temporary fixture is added only to the isolated test extension through the existing instrumented-extension harness; the real production worker remains present.

Source and release each run all 14 original cases plus two explicit native cases under the existing 180000 ms per-variant bound:

- A closed database is explicitly reopened outside the witness call under the same name and identical stored data. The old witness must reject the different actual database object. A fresh witness also rejects another actual Core object and replaced journal identity.
- All six readiness flags plus foundation failure and volatile error are changed after a successful capture. Revalidation must refuse, permanently discard that handle, avoid new opening/initialization/write, and leave the original stored data unchanged.

The original 14 cases retain actual semantic/current-history/parent-receipt tampering, reached digest/control races, zero-side-effect snapshots, global ancestry and raw bounds, input mutation, private-brand refusal, busy rejection and handle eviction. They are not replaced with the pre-existing Human native test: the new fixture actually calls both witness functions.

## Measurement and isolation

Test-only synchronous forwarding observers record each invocation without delaying its entry behind a snapshot await. They call the original native operations, recording actual `IDBDatabase.transaction`, `IDBTransaction` identity/mode/database, object-store add/put/delete/clear, cursor update/delete and actual factory opening. The real per-store initialization methods and storage adapter writes are counted separately. Successful calls must return the original opaque frozen witness or `undefined`, respectively; every call must show zero non-native/foreign/readwrite transactions, zero data writes, zero actual factory openings, zero initialization calls and zero control-storage writes. Original complete repository snapshots and the added native identity/readiness snapshots remain independent state oracles. Setup/injected mutations happen outside these measured calls; no initialization or independent mutation is relabeled as witness work.

Native databases share one actual global factory, unlike Node's independent fake factories. Self review therefore added restoration of the factory's own `open` descriptor after each case, so original test-local opening observers do not accumulate across cases. Original case bodies remain untouched. All created database connections close at case completion; test databases are not deleted. The source/release workspaces and storage prefixes are isolated, and no existing user profile is opened.

The new receipt separately binds exact tested HEAD/tree/variant, browser version, all 16 ordered case names, bounded body-free invocation measurements, 96 current runtime files in the complete static/literal module closure, and ten original/fixture/harness proof files (the initial seven-file list was corrected after independent review, below). Current source/release hashes are compared with fresh checkout hashes. Unknown fields, bodies, stale hashes, widened scope, missing/reordered cases, skipped/failed status and any write/open/init/foreign transaction fail validation. The existing network ledger must contain only opening/final observations and no network attempt or restart; no crash/restart durability is claimed. Receipt-validator synthetic fixtures are explicitly not browser evidence.

The network, source/release, actual IDB operation counts and 180-second runtime budgets are still **unverified until the coordinator's real native run**. Receipt fields such as zero ACK/counter changes derive from actual zero-write observations and complete state comparisons, not a production activation flag. The test does not directly measure JS heap size or reconstruct historical permission. No current witness is executable authority.

## Completed limited checks

Initial prepared code passed both whole new fixture/receipt contract files: **8/8 PASS**, zero failed/skipped/cancelled, 84.257875 ms. This includes syntax checking the generated native module, original 14-case byte preservation, fake-runtime rejection, exact 96-file module-closure inventory and adversarial strict receipt validation. All five new modules separately passed Node syntax checking. Static package audit: **13941 guardrails / 416 runtime resources PASS**. No full unit suite, build, existing browser case, hosted CI, paid model or native witness browser execution was run by this author.

An earlier eight-case contract run also passed before the added native-factory identity/transaction counters, nested receipt-shape checks and factory-isolation refinement; it remains separately identifiable and is not evidence for final bytes.

| Evidence | SHA-256 |
| --- | --- |
| `extension/tests/native-sync/human-branch-witness-chrome.test.mjs` | `2773b23454cc1975eb7bfac91438a2d33d084fad79f6c10414245127d84402c1` |
| `extension/tests/native-sync/human-branch-witness-fixture.mjs` | `ec921843b5d3156da222a302dec55b631b70ec3f631e6fe65ec28ca4656ac0b1` |
| `extension/tests/native-sync/human-branch-witness-fixture.test.mjs` | `01cc12197efa05c78b0ae3736527ee221ca572a4b5018cf9884255c73ae8351f` |
| `extension/tests/native-sync/human-branch-witness-receipt.mjs` | `97c6b6fe8d9caa12275b75d234dda714ca0465615bcc4c50468f239493ba5948` |
| `extension/tests/native-sync/human-branch-witness-receipt.test.mjs` | `814edadb0542d0a706be6f7fd7d9af61ac088fdc8be4823e9b2d8475238dcf64` |
| `/tmp/human-witness-native-contract-first.log` | `040e8ca849cb5da2914cc7ed55c54d98d073db16b3b18a2eca4642693dea6afd` |
| `/tmp/human-witness-native-contract-second.log` | `f032e073ca9e571e9825d4e564bf1dcc4c4a1b9d14cf881c306c4cb63e8d3874` |
| `/tmp/human-witness-native-package.log` | `ef98e9421971a9489a429e936553c226a965b0f4912f1f79a9ae0ddda3df16ec` |


## Coordinator integration requirements

After independent review, run this entire new native file once at the stable combined 0.41 head. Preserve any failure, cancellation or timeout and repair its actual cause without weakening assertions or extending budgets. Current source/release receipts remain absent; no claim can be borrowed from old Human24 or unrelated native passes.

CI has not been changed. The coordinator may append the whole new file, owning Node/contract preflight, exact-head/tree/current-hash validation and a distinct `work/qa-bns-human-branch-witness/` artifact directory to the two existing jobs. Existing ten native families and all existing strict receipts/12-minute bounds must remain. Any later need to split work must retain whole files and complete coverage, not omit cases. Parent reconciliation, hosted candidate/main certification, build/ZIP, supported devices and all wider product gates remain open.

## Final pre-review receipt and cleanup refinement

The author found a receipt-only gap before requesting review: names, zero side effects and minimum successes did not by themselves require every negative observation. Commit `12614486c545df609c37587291dfac07a86fd955` therefore adds the exact **121-call ordered signature inventory** across all16 cases, derived from the untouched original14 bodies and the two explicit native cases. Missing, reordered or relabeled negative observations are rejected. A new adversarial contract turns all observations into successes and must refuse that fake receipt; no browser evidence was fabricated. This strengthens the output gate without changing runtime or any original assertion.

The final fixture also tracks every actual native database that participates in a transaction during a case. Cleanup closes those connections even when an identity-negative test replaces a repository's current database pointer; previously such a pointer swap could leave the original connection open. Closing these isolated test connections does not delete data and does not run before the case assertions.

Final two whole contract files: **9/9 PASS**, zero failed/skipped/cancelled,80.92625ms. The generated module syntax check is part of that completed run. The package audit is unchanged13941/416, because these refinements change only the five new test/proof files. Native execution remains **NOT RUN**, independent review remains required, and the earlier8-case logs retain their exact earlier-code meaning.

| Final proof file / log | SHA-256 |
| --- | --- |
| `extension/tests/native-sync/human-branch-witness-fixture.mjs` | `4cc53ee3330bd74ee30f8cc1db7838bf161e316c2f276a68f84466efe1cf8ef8` |
| `extension/tests/native-sync/human-branch-witness-receipt.mjs` | `cb10d39af16f4d3f9da3bf9bc6c13c8811941e2c7091fbe0b3c51340fcfef603` |
| `extension/tests/native-sync/human-branch-witness-receipt.test.mjs` | `d618b8c0c18d3d0ee2218046bae2755f4e75d2e5fed9daffa461c9cceec3abe5` |
| `/tmp/human-witness-native-contract-signature-first.log` | `c3e5425e61827c238d1a240a1ad2b80427adbff2ea8887cdd645e3a042d8a1b7` |
| `/tmp/human-witness-native-contract-final.log` | `56a6afd11c97cae635799b895c0ab60c3eb12c50e905681419993e1418f683e9` |

## Independent P2 proof-dependency correction

Independent review of the prepared code requested changes: the initial seven proof hashes omitted three actual executed dependencies. The final inventory has **10 proof files**, adding `tests/native-sync/immutable-objects.mjs` (copied into the temporary worker as `bns-native-immutable-objects.mjs`), `tests/harness/fake-chatgpt.mjs` (the storage harness dynamically imports it), and `tests/harness/synthetic-device-options.mjs` (the fake-ChatGPT harness imports it). No claim that the seven-file inventory was complete is retained as the final state.

The added contract traverses actual static and awaited-literal dynamic proof imports, accounts for the original Node case source loaded as an input asset and the actual copied worker/immutable-object paths, and requires exact equality with all10 inventory paths. Core runtime dependencies resolve from the worker's actual `background/` location and remain the separately checked96 runtime paths. Strings describing Node imports removed by the compiler are not executed dependencies. The three new hashes are computed from real files in each run, alongside fresh current runtime hashes; source/release must match. This change touches only the new receipt inventory, new fixture contract and this document. The native fixture, original14 case block,16-case/121-call inventory, native IDB observers, cleanup, runtime, CI and version are unchanged.

Final whole contracts: **10/10 PASS**, zero failed/skipped/cancelled,87.10075ms. Three intermediate attempts of the new import-inventory contract were9PASS/1FAIL: the first two resolved copied/generated worker Core imports relative to their source file instead of the worker location; the third mistook a compiler string describing a removed Node import for an actual dependency. Those parser/path failures remain preserved below and are not native failures or passing evidence. The final traversal distinguishes actual statements and explicit asset mappings while retaining strict full inventory equality.

All prior9-test passes remain earlier prepared-code evidence. No native source/release case has been run; review approval is still required before execution.

| Final correction evidence | SHA-256 |
| --- | --- |
| `extension/tests/native-sync/human-branch-witness-receipt.mjs` | `673a856c0cefdaad7d9f12deef2793d7eb76e7558e83cef0661a084031cb23e7` |
| `extension/tests/native-sync/human-branch-witness-fixture.test.mjs` | `9ad8d07ad348fd683d249b959cf32986f465493531e52953579c9a0e39652073` |
| `extension/tests/native-sync/immutable-objects.mjs` | `03aa2539d246b579b8a9010597263144efa076078ca6673d502af04ef645d971` |
| `extension/tests/harness/fake-chatgpt.mjs` | `76321278b7e6f0719ac4ffa8ada9febce3b120a19832888c558278bce3b0958a` |
| `extension/tests/harness/synthetic-device-options.mjs` | `d10740cd6ee5289e60701c24049ad9d1d7a2521f8f28b3188e475d0449e7d76c` |
| `/tmp/human-witness-native-proof-closure-first.log` | `92c0c9fad8650d8a63a19cac8c011e5cebad748376087a3ca318bbf06aedd965` |
| `/tmp/human-witness-native-proof-closure-final.log` | `b00dd17ab50ecc3e2003c0c7d10842421eb5f038d4568f4851964536057a75bb` |
| `/tmp/human-witness-native-proof-closure-corrected.log` | `26dc631bd6c896c89816d5a7e79014b3efcccb420361fd7c8a3773a571414b09` |
| `/tmp/human-witness-native-proof-closure-complete.log` | `25809185ff34a4a60f33150298ca86666fd1c4ffb46b2d8f8919b6232eb0b9dc` |

## First actual whole native run: failed, diagnostic-only follow-up

Root's stable integrated `9993c8d` executed the entire native source/release file and obtained **0/2 PASS, 2 FAIL**, zero skipped/cancelled,39896.19ms. Source17575.230417ms and release17300.276709ms each completed the first eight cases, then failed in the original index8 causal-union case while expecting BNS_HUMAN_GRAPH_LIMIT for extraEdits30. The original assertion bridge reduced the observed exception to `Wrong native rejection: undefined`; the unique cause is still unknown. These failed runs are not replaced by prior contract passes. Raw log `/tmp/041-witness-native-final.log` SHA256 `2e2cd85c96077aaf8a98284fa22e37f1b37ab0e8d6c3e80b7fb9fcf8861c06bf` remains preserved by Root.

This follow-up changes only the new test fixture's failure reporting and its owning contract: keep the exact rejection assertion, attach bounded error name/code/message, preserve reached native invocation counters in the failure, and expose that bounded failure through a test-only command. It never serializes request/row/DB objects; known synthetic body markers are redacted. Original14 case bodies,16-case/121-call expectations, runtime, transaction wrappers and180-second budgets remain unchanged. No whole native rerun was performed. One source/index8 diagnostic may follow independent review; even if successful it cannot certify the complete source/release file.

The two entire contract files pass **11/11**, zero skipped/cancelled,78.941583ms, including actual pure failure-payload verification and generated module syntax. Actual native failure diagnosis and any runtime/test repair remain pending.

| Diagnostic evidence | SHA-256 |
| --- | --- |
| `extension/tests/native-sync/human-branch-witness-fixture.mjs` | `2228c52f3349dc405b23bf8954f45169fea5b7c8959fb9673f7f96be132fbd37` |
| `extension/tests/native-sync/human-branch-witness-fixture.test.mjs` | `330255f313272de0f053f5565c90e530284193f07351f0dd85ce58392fff73dd` |
| `/tmp/041-witness-native-diagnostic-contract.log` | `93c9f32b15f571be8d72f9dbb36ba5fda8534617b99b1dfd8e4128bd57ed00a7` |


## Bounded diagnostics and Archive-page isolation correction

Two explicitly approved source-only diagnostic runs against Root `9993c8d56a2dd5e2ed08195ea31af941db422d84` with all96 runtime hashes freshly matched did not reproduce the first whole failure. The isolated original index8 returned its expected GRAPH_LIMIT rejection; its JSON SHA256 is `e209d930a5496b345ce24e28c28496af17c373d255a84aae265a62c77c620bf5`. A single worker lifetime executing only original cases0–8 also returned all9 cases, with no counter filtering. Its JSON SHA256 is `a0ad362bd757492f4d839a981740687e024e253a9235431fba92775706b4579f`. These bounded diagnostics are not a whole source/release PASS and do not replace the original0/2FAIL.

The second diagnostic observed12 actual `paia-archive` transactions during case8 (7readonly,5readwrite), all outside the measured witness invocation intervals. Source inspection identifies a concrete independent transaction source: the shared native launcher keeps the real Archive page open; that page refreshes every15seconds, sends GET_PAGE, and the production worker schedules maintenance after that request. This supplies a plausible timing explanation, not proof of the exception cause in the original logs. No production timer, maintenance logic, counter, error assertion or timeout is changed.

The shared test-only `startNative` now accepts an optional strict boolean `closeArchivePage`, defaultfalse. Only this new witness family passes true. The launcher preserves normal real-page startup and awaits `h.state()`, then closes the actual Archive page, verifies `page.isClosed()`, and obtains the existing real worker identity before recording the opened network observation. Other ten native families keep their existing call sites and default behavior. The original production worker and any already queued startup/maintenance work remain active and subject to all existing counters. This mode prevents future page refreshes; it does not claim all queued work has settled, nor page-dependent restart support.

Three additive Node-only contracts execute the actual launcher function body with only the browser dynamic import substituted, proving default/false/undefined behavior, awaited state→page-close→isClosed→worker-identity ordering, strict option rejection, and failure propagation at state,close andisClosed boundaries. These test doubles establish launcher control flow only; the real page closure and live worker identity will be asserted by the next independently approved native run. First attempt18PASS/3FAIL was a test-only VM substitution temporal-dead-zone error, corrected by binding a separate browserFixture object. The failure log is preserved. Final three whole contract files: **21/21PASS**, no fail/skipped/cancelled,447.473958ms. The complete10-file proof inventory already contains the shared storage harness and recomputes its fresh hash in each native run. No native browser was run for this correction; source/release whole qualification, exact combined-head integration and all wider gates remain open.

| Isolation correction evidence | SHA-256 |
| --- | --- |
| `tests/native-sync/storage-harness.mjs` | `64e8b63ab7f982d12533042b5365ee307e97e7f2f20372cada9de1eda564fb0f` |
| `tests/native-sync/harness-contract.test.mjs` | `32b3754fd0cc9d5fb7db30e5dd48960ed2e3718de4b75414ba58d2c35a5fa874` |
| `tests/native-sync/human-branch-witness-chrome.test.mjs` | `c53d773190300f7c1c746f569d61d7911d6666391eaf430b1b559874d2f496c1` |
| `/tmp/041-witness-page-isolation-contract.log` | `9a6395ac7ec9723ad756f6f1648bbb9ddd44be29cc59def85e96c9f1fb2fc181` |
| `/tmp/041-witness-page-isolation-contract-final.log` | `1c890c2c124f75daf3a1626e7936482f4ce08eed99ee7a0d951d84140ae77a3d` |


## Current42 implementation-presence profile

Historical41 witness receipts correctly report retentionImplemented:false at their exact original code. The next42 candidate adds a separate private first-sibling writer. The witness fixture now measures that method's actual prototype descriptor through a body-free test-only profile command and requires retentionImplemented:true without invoking it. The witness's own capture/revalidation still has no write capability; productionActivation, writeCapability, fullRecovery and providerActivation remainfalse and all16/121/zero-side-effect assertions remain. Separate retention28-case native evidence qualifies the new writer, not this profile field. Current42 hosted/native integration remains a new gate; historical receipts are not rewritten.
