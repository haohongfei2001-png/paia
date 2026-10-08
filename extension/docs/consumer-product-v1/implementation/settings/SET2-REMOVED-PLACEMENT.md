# SET2-02 removed Placement recovery — local candidate

Base `f1db321e`. A missing Settings discovery/typed relationship recovery slice; not complete recovery for every domain, full SET2 acceptance, Sync or installed delivery.

## Scope

Settings Data / Removed content now lists recoverable explicitly removed Topic relationships separately from Topic containers and Entries. A qualified bounded existing title/original excerpt identifies the Entry beside its actual Topic/Section, including two different Entries removed from the same Section. No durable body copy is created. New reads use existing placements primary-key pages (max100 scanned rows), preserving empty partial continuation and backup-generation/restore-epoch invalidation. No schema/index addition.

The dedicated write adapter uses the existing `store.operation` receipt and `placeEntryInTransaction` owner in the same transaction. It requires the exact current removed placement, latest actual user-remove history with prior active edge, live current-generation Topic/Section and eligible Entry/Source, exact history identity, restore epoch and Entry/Topic/Placement revisions. Missing original Section never falls back to default. Container removals are not offered as independent edges. The existing memory organization guard and human membership intent apply; this does not grant ordinary reads authority to reverse removal.

Only the explicit Settings action requests recovery. Shared worker extension-page and consent guards remain; the new read is excluded from mutation notifications. Unknown ACK retries preserve the exact operation ID and arguments. Existing Input recovery remains unchanged. No changes to SYNC-owned indexed-store/ia-store/smart-filter/codecs, provider, CI or version.

## Evidence

- Four complete related unit files: 33/33 PASS587.153ms, `/tmp/removed-placement-whole.log`.
- New complete native file source/release: 2/2 PASS8.786478916s, `/tmp/removed-placement-native-final.log`. Actual worker commit followed by synthetic response loss, same-operation retry, only one revision increase; another Topic placement, body, nonempty captured immutable Source and Context permission snapshot remain unchanged. Two distinct Entry rows, real nested Settings disclosures, compact320 and English empty state exercised.
- Unit safety covers long legal composite keys over200 characters, complete bounded continuation, storage error propagation, exact epoch change with unchanged revisions, wrong/cross-Topic history, deleted Entry, missing original Section, changed layout and transactional receipt failure rollback.
- Package:12703 checks /383 resources PASS, `/tmp/removed-placement-package.log`.
- No skipped/cancelled results treated as passes; headless isolated release output only.

## Preserved failures and boundary

`/tmp/removed-placement-safety.log` retains initial test-only use of nonexistent removeTopicContainer; actual existing removeTopic is used now. Initial native `/tmp/removed-placement-native-first.log` failed both variants because the test had not opened the outer Removed content disclosure before its nested summary. The real two-disclosure journey corrected the fixture, no timeout or production assertion was weakened. A later shell cwd/path edit failed and its run was stopped; it is not acceptance evidence. Intermediate `/tmp/removed-placement-native-third.log` and `-labeled.log` passes lacked the final nonempty Source/permission snapshot, so only final is the batch native evidence.

New browser-file CI admission belongs to the coordinator and remains pending. This branch does not change workflows. Physical devices, provider/cloud, all recovery types and whole release certification remain unverified. Independent review by root_finish approved the typed owner, epoch/CAS, pagination, UI and trusted sender boundaries; actual two complete owning files 23/23 PASS288ms at `/tmp/placement-independent.log`. Existing full Topic restore plus new owner regressions also passed23/23 at `/tmp/removed-placement-restore-regression.log` (1.383706s).

## Frozen file hashes

```text
e06a116f4907e2e232254a6a4fa7219c863d1103b41c0667ff8ffcec0ff1034d  background/service-worker.js
88977fc0b099253ca61ca8550a2820b841fb594a008efe081efe854d52db478a  core/library-documents-store.js
691a24463e2d9e0f6f52377aeafebeb37431be01bf088d3ecdefc2d67c2401ce  core/removed-placements.js
6ea75cc7f213e45b73b8a0dd45bb0af0ab10c18b0b0ef2e2360f36650970aaa0  ui/archive.html
5b3c3098aecd86b12ad30869ca55e6f61510d38a307dabd248ecaf48cf1a86c0  ui/settings-removed-copy.js
8098a9622d1e5be894c5962a47434eca8c4a525957c58cbdb30347cf0728c15f  ui/settings-removed-list.js
c033f83628d76d6ea79f9dc4e732a40dc13c4c1eb3271975fdb1c0a86636defa  ui/topic-workspace.js
4b423d02c7ce5a7e61f6f9795e974e4907fa686838bdca1617981bb9a5f4a850  tests/settings-removed-list.test.mjs
411335c2cc0ec2ef183ad425bd5342cd228ffae8ae56b685bd6a1aa3760d2f56  tests/settings-removed-placement.test.mjs
f8639d8d53cf28444bd2c8b9bc45685d9d1b858ae540a4c02f1a9a95e2488df7  tests/settings-removed-placement-chrome-e2e.test.mjs
```
