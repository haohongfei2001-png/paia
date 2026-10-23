# Fixed original application startup store selection — 2026-10-23

Implementation: `94fd0fd26783c1a095a1c4fbd0edd0fc5bbee94d`; parent `e7967bf5` carries the already independently reviewed qualified recovery budget change (`6cd36385`). Integrate only the new startup commit over the root's corresponding budget baseline. This package does not reimplement or rerun the budget work.

## Implemented finite consumer

Production source configuration remains `null` (off). The ordinary branch constructs the original OrganizerStore on the original default archive after storage isolation. The optional source-owned `first-published-generation` branch opens only the fixed registry `paia-canonical-generation-registry-v1` and uses the original published-active registry/catalog/receipt/gate checks. Its new opener chooses the fixed original Organizer subclass and retains the exact AI filter authority. No caller supplies a database, constructor, factory or repository. Original LibraryDocuments opener and private binding semantics remain.

Enabled selection requires the default `paia-archive` database to be completely absent. Even an empty existing default database refuses with `GENERATION_EXISTING_SOURCE_OWNER_REQUIRED`. Missing/corrupt registry, target or receipt fails without creating a fallback/default database. Enumeration occurs before selection and after original existing-only opening, catching default creation before the final check. This is a cross-database race check, not global atomicity. It does not implement migration or replacement of an existing default installation, and does not enable Sync or activate the configuration.

The actual worker now constructs its original service graph asynchronously after isolation and selection, using one store for every service. Chrome listeners remain registered synchronously; no top-level await. Fixed relays retain storage/permission/tab invalidation surfaces. Relays do not queue or replay early payloads: no owner lease exists before initialization and later owners start from current state. Early suspension has an explicit uninitialized no-op, rather than claiming deferred checkpoint work will survive worker termination. Once initialized the original lifecycle owner performs its original checkpoint immediately.

No recovery copy retirement, cleanup, new publication, automatic installation migration or large startup write is inserted. Protected generation ordinary-write budgets and original all-table closure remain unchanged. Startup for a large unretired generation is not claimed qualified by these small cases.

## Validation, separate invocations

All tests used the existing isolated official Node 22.23.3 Darwin arm64 binary at `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`, synthetic fake IndexedDB and actual Node-loaded worker modules. No browser, build, large graph, CI, cloud, account or provider execution occurred.

| Log | Scope | Result | TAP duration ms |
| --- | --- | --- | --- |
| owning-first.tap | Four owning files: startup events, selection, background security, original canonical-generation-local-library | 69/71, 2 failed | 15362.898917 |
| owning-second.tap | Same four files, corrected fixture assumptions plus exact filter authority case | 72/72 | 22432.456125 |
| worker-consumers.tap | Twenty related actual/static worker consumer files; exact argv and exit in worker-invocation.json | 91/93, 2 failed | 13153.097792 |
| worker-contract-followup.tap | Only affected Organize configuration and UIR03 worker-copy owning files after adapters | 4/4 | 3377.778875 |
| selector-configured-worker.tap | Full selector file including added real configured worker load | 13/13 | 6115.362292 |

All passing invocations have zero fail/cancel/skip/todo; no combined all-green aggregate is claimed. The first 72/72 includes 60 top-level cases and 12 nested background-security cases. The final selector count is 13, superseding the earlier 12-case file only after the additional actual-worker case was added.

The first failures were test assumptions: existing-only original opening enumerates twice internally (four total, not two), and the startup event fixture was added before the original toolbar fixture required an initially absent tab listener. Only fixtures changed to correct these assumptions. The related worker pass found two genuine dependent adapters: an old static `const`/raw Chrome construction pattern and a test bridge capturing store values synchronously before async initialization. The original production behavior assertions remain; the bridge now exposes getters and the actual readiness promise, with exact four-case follow-up.

The configured-worker case modifies only a disposable copy's source configuration, imports the actual worker, confirms original Organizer selection and LibraryRunner store identity, runs actual GET_STATUS, observes preserved input content, and verifies no default database was created. It asserts production configuration bytes remain unchanged. The default actual-worker case delays isolation, verifies synchronous listener registration and early invalidation/suspend events produce no storage or database I/O, then uses actual status/consent RPCs with exactly one default archive.

The final source vector is captured after validation, not a claim that intermediate failure logs ran the final later test text. Runtime source was unchanged by the test-fixture/adaptor corrections. Native Source/Release worker validation and combined qualification are assigned to root's next integration milestone. Existing active/default migration, actual user configuration, real-account Sync and installation remain outside this finite consumer.
