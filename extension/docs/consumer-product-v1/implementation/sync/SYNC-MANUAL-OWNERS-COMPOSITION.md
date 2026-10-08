# SYNC local manual owner composition

Base `41257740a66846dd3a2cc31efb5983cc2cbcfcfb`. This is explicit local dependency
injection, not worker activation, complete canonical restore, a provider test,
or user-available cloud sync.

`manualSyncOwners(core)` fixes the admitted set to promptPreferences,
contextItem (Info), contextRulesItem and contextNowItem. It delegates without
changing their existing validation, ownership, privacy or causal rules. One Core
owns the dataset/device sequence and transaction. Receive binds its live Core;
StagedSyncRestore's explicit owners bind **restore.stage**, so ancestry is read
from the staged namespace. There is no generic plugin registry or new schema.

Actual PromptReuseService and ContextCardsService use their existing journals
against the same Core. Tests prove sequence1–4 across four domains, mixed receive,
staged activation rollback of all meta rows, rejection of unmanaged Prompt and
Context, stale cross-domain prepared work, whole mixed receive rollback after
Prompt has materialized, and strict rejection of non-admitted/prototype names.
The existing browser fixture retains all40 prior scenarios and adds these7.
Its durable path now creates a real Prompt and three removed manual cards, then
compares canonical data, all meta/protocol records and operation receipts after
actual worker replacement.

## Evidence and preserved failures

- Initial new fixture used an invalid empty Context section;5 failures are
  retained in `/tmp/sync-mixed-before.log`. Corrected only fixture input.
- Actual previous single-Prompt binding then produced4 failures and1 pass,
  `/tmp/sync-mixed-owner-before.log`: mixed Context receive/restore unavailable.
- Final five complete owner files95/95PASS,2462.14ms,
  `/tmp/sync-mixed-related.log` (new7, Core, checkpoints, manual Context and
  local Context coexistence). Independent reviewer ran new7/7PASS,
  `/tmp/sync-manual-owners-independent.log`, and inspected the fixed dispatch,
  namespace binding and original native assertion retention.
- First full native source/release2FAIL because the copied fixture omitted its
  projectEntity import: `/tmp/sync-mixed-native.log`. Only the missing import was
  added; no production change, assertion deletion or timeout increase.
- Final entire native source/release2/2PASS,47 scenarios per variant plus real
  restart,13116.10ms, `/tmp/sync-mixed-native-final.log`. Source4218.71ms,
  release3891.28ms;0 skipped/cancelled. Original120000ms budget remains.
  Headless Chrome with Playwright1.63.0, generated isolated guarded release,
  synthetic local data and zero-network isolation. Evidence JSON remains in
  `extension/work/qa-bns-context-info/{source,release}.json` outside Git.
- Package guard11976 checks /359 runtime resources PASS,
  `/tmp/sync-mixed-package.log`. Five runtime/fixture digests unchanged before
  and after final native, `/tmp/sync-mixed-final-{before,after}.sha`.

## Remaining activation boundaries

This helper does not create dataset/device identities, automatically bootstrap
existing local rows, wire the production service worker, or reset/purge namespace
history. Existing explicit bootstrap and restore CAS remain unchanged. The
128 total activation-owner bound,128 Context causal bound and512 local Context
item capacity are distinct unchanged limits. Data beyond admitted bounds is not
claimed restorable; readiness remains false. Automatic Context, access/desired
permissions, source tree/body and remaining domains are not added to this map.
No cloud account, provider transport, permission expansion or paid model is used.
Full integration/CI/main and installed-user verification remain pending.

Final exact candidate bytes:

```
74b3fb7e48ce45fb335aefe78118cd354aea0eaec8bfbfb72c11f9ba94ca1541  core/browser-native-sync/manual-owners.js
2c17252903be33fd997af8297fe06d93ce5eec8ee02c655468733cedbe0e0e0f  core/context-cards.js
84d2f2c0124ecf2c0650118edb30feb9108b418966f104b8786577e92eb9e6e1  core/browser-native-sync/context-journal.js
c95c4ab16e3dcc66e378ad544ee93570cdc7b380aae2fce5b8d8e0d1c6c8a1aa  tests/native-sync/context-info-worker-fixture.mjs
19bed3acbd8fe420d40c5cf05afdc3cb59eeb200308ba209f0770147fd0b24b1  tests/native-sync/context-info-chrome.test.mjs
```
