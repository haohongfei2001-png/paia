# BNS partial-Core native storage proof

Candidate implementation base: `e4166f461b877dc44e67fafe65186641c7981e53`, tree `f08ac0e5de75906e78ad96771a97da8eb9608936`.

## Evidence boundary

This suite is **implemented, native execution NOT_RUN** until exact-head hosted Chrome receipts are reviewed. Local Chromium socket launch is denied in the authoring environment; this task does not retry or escalate it. A passing Node preflight uses fake IndexedDB and is never native evidence.

The suite invokes the actual `OrganizerStore`, `ArchiveRepository`, `PromptReuseService`, `PromptSyncJournal`, Core, segment decoder, and staged-restore owner. It adds instrumentation only to temporary copies of source and the audited release. The original production worker still runs. The fixture has no production command or activation path.

Each variant creates two empty, distinct Chrome profiles. Each synthetic owner gets both a distinct native database name (`bns-native-test-*`) and a separate `chrome.storage.local` key prefix. Source device A creates its history through the actual Prompt service, publishes only immutable in-memory protocol objects, and closes before B restores. Only protocol bytes/references enter B; oracle state remains in Node. No user profile, credentials, live provider, paid call, actual cloud upload, or user installation is involved. HTTP is blocked, worker fetch/socket APIs fail closed, and attempted requests fail the receipt.

Fifteen complete cases per source/release variant cover:

- Actual canonical Prompt owner and outbox success, injected transaction abort, and injected `QuotaExceededError` after journal writes. Quota injection exercises rollback/error classification; it does **not** prove physical disk-quota exhaustion.
- A completed save survives actual `ServiceWorker.stopWorker` and restart.
- Real worker termination at a synchronous debugger pause before and after journaling. The paused phase includes a native `IDBTransaction` and the exact newly prepared operation; a stopped event and fresh worker lifetime are required. Each phase uses distinct text. Post-restart state must equal the complete before snapshot, or the exact expected canonical revision, device sequence, Core generation, appended operation, parent ancestry and replacement head together. Same-text or canonical-revision-only changes cannot pass.
- Reordered/duplicated immutable segment replay and exact checkpoint restore into the sole admitted Prompt owner.
- Activation transaction abort, real stop after a committed staged item, and real stop after the owner/active-pointer writes inside activation. Owner, active namespace, and Core state must agree after restart; interrupted staging resumes.
- Live pending work present before/after staging, pending-only staged generation changes, and preparation from an obsolete active namespace.
- A local verified-use counter committed during pre-transaction remote digest validation survives remote materialization.

The debugger hook contains no timer or external asynchronous wait. CDP waits execute in the Node driver while the worker's synchronous stack is paused. Every stop, including committed-save/recovery restarts, captures that paused heap's denied-network ledger synchronously. The Node driver retains append-only observations across all lifetimes; a clean restarted heap cannot erase a denied attempt. Complete receipts require all six destination lifecycle transitions and their paused observations, plus the source and final destination observations. If the hosted Chrome/CDP version cannot pause and stop that worker, the suite fails and emits no PASS. A thrown exception is never substituted for real termination evidence. CDP uses [Target sessions](https://chromedevtools.github.io/devtools-protocol/tot/Target/) and [ServiceWorker lifecycle commands](https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/).

This is synthetic native IndexedDB **partial Core** proof only. It does not qualify production activation, production UI, a live provider/account, an installed user build, physical disk loss/quota, full canonical coverage, or a real user migration. Synchronous test-phase instrumentation and dependency injection are explicitly part of the fixture.

## Commands

From `extension/`, without launching Chrome:

```sh
node --test tests/native-sync/harness-contract.test.mjs
node --test tests/browser-native-sync-*.test.mjs tests/cpv1-09-prompt-service.test.mjs tests/cpv1-09-prompt-family.test.mjs tests/cpv1-09-prompt-security.test.mjs tests/native-sync/harness-contract.test.mjs
npm run check
node scripts/check_development.mjs
npm run build:release
```

Hosted Chrome only, after the owner publishes the reviewed candidate:

```sh
CI=1 PLAYWRIGHT_MODULE=playwright PAIA_TESTED_HEAD="$(git rev-parse HEAD)" \
  xvfb-run -a node --test --test-concurrency=1 tests/native-sync/storage-chrome.test.mjs
```

The runner creates `work/qa-bns-native-storage/source.json` and `release.json`. Each receipt identifies the tested commit/tree, browser version, six actual production module hashes, two separate profile hashes, the exact 15-case inventory, injected-quota limit, complete Prompt before/after/prepared-operation oracles, every worker lifetime's network evidence, native lifecycle/phase records, source-device closure, and explicit non-claims. Failures are retained as FAIL, not partial PASS. `receipt.mjs` rechecks mutation and network oracles and rejects incomplete inventories, model IndexedDB, missing stops/restarts, wrong heads, unexpected traffic and widened claims. The Node preflight includes adversarial same-text/revision-only/partial-commit and erased-prior-network-evidence regressions.

## Exact candidate CI proposal, awaiting root review

`candidate-job.proposal.yml` is an inert proposal, not a workflow. Copy its one job into the existing `.github/workflows/paia-candidate.yml` only after review. Select it only with draft-PR body marker `PAIA_BNS_NATIVE_STORAGE`. It uses the exact PR head, hosted full Chrome, a separate 12-minute job, and a 7-day synthetic artifact. No existing job, timeout, file selection, test inventory, shard placement, or full-certification requirement changes.

The existing `candidate` aggregate must receive **only** these additive edits at the same time:

1. Append `sync_native_storage` to its existing `needs` list.
2. Add environment variables:

```yaml
SYNC_NATIVE_STORAGE: ${{ needs.sync_native_storage.result }}
SYNC_NATIVE_STORAGE_SELECTED: ${{ contains(github.event.pull_request.body, 'PAIA_BNS_NATIVE_STORAGE') }}
```

3. Append this requirement to its existing shell checks:

```sh
if [ "$SYNC_NATIVE_STORAGE_SELECTED" = true ]; then test "$SYNC_NATIVE_STORAGE" = success; elif [ "$SYNC_NATIVE_STORAGE" != skipped ]; then test "$SYNC_NATIVE_STORAGE" = success; fi
```

The nested test directory deliberately remains outside `scripts/test.mjs`'s top-level discovery. This prevents a new native case from silently shifting the existing certification shards or exhausting an unrelated job. The dedicated selected job owns all 30 native cases and must be green; it does not replace ordinary candidate/full gates. Broader mandatory routing requires a later explicit integration decision backed by measured hosted duration.

No remote publication, workflow mutation, GitHub dispatch, installation, release or native PASS is performed by preparing this proposal.
