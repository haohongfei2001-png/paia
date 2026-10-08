# SET2-02 removed Topic pagination

Base `133e9e989899e92c43afd508d8ada49a72b0bef2`. Local candidate; no push/integration claim. This closes the previously explicit unpaged Topic list boundary, not complete Input recovery or all SET2 acceptance.

## Existing owners extended

`topic-governance.removedTopics` now reads one bounded `topics.byIndex` inactive-prefix page (default 40, maximum 100). There is no whole-Topic scan or new index/schema. The five-part key is strictly validated, together with version, backup data generation and recovery restore epoch; both snapshot fields are read in the same read-only transaction as the indexed page and Source-safe organization projection. Restoring/removing changes generation; recovery epoch also invalidates old continuation independently. Merged/redirected rows are filtered, retaining the next cursor even for an empty intermediate page. The result does not claim global complete materialization.

Store and worker changes only forward the existing request options. Settings now admits Topic continuation, preserves existing rows on stale cursor, and offers explicit reload. Empty pages with a cursor are not called an empty list. Reload is qualified to the exact view generation and kind, including queued click races. Original typed restore revision/operation identity, unknown acknowledgement retry, Source protection and late-read controls remain.

Two new product labels use the existing in-place locale owner. Topic names and user body content are not translated.

## Evidence

- Initial actual negative after repairing the handed-over `deleteTopic` fixture name: 43 rows returned instead of requested 20; `/tmp/settings-removed-topic-pagination-before.log`. That log's second failure was a separate fixture API typo (`restoreTopic`), corrected to the existing `restoreTopicContainer`; it is not presented as a product defect.
- Root review identified stale queued reload. Actual TopicController negative emitted a third Topic read after switching to Entries (`3 !== 2`), retained `/tmp/settings-removed-topic-reload-before.log`. Current-generation qualification closes it without cancelling durable operations.
- Six complete unit files: 77/77 PASS, 1.361145667 s; `/tmp/settings-removed-topic-related-final.log`. Includes malformed tuple/options, real restore, epoch-only invalidation, filtered intermediate page, one bounded index page/no full scan, cursor forwarding, stale reload, existing locale and Topic access/atomic/lineage regressions.
- Original complete UIR04 Data file: 1/1 PASS, 36.902841125 s; `/tmp/settings-removed-topic-native-final.log`. This one test runs source, empty restore and fresh isolated current-release journeys. Original assertions/budget remain. Each source/release journey includes 41 actual removed Topics, held real worker continuation with disabled/deduplicated control, terminal cursor removal, real restore invalidating the old cursor, preserved rows until explicit reload, and active restored Topic. Existing Entry/backup/import/consent/Source/late-ACK/network oracles remain.
- Earlier full Data pass before final reload guard is retained at `/tmp/settings-removed-topic-native.log` (36.354814083 s), not reused as the final runtime result.
- Package 12643 guardrails / 381 runtime resources PASS; `/tmp/settings-removed-topic-package-final.log`.

Root final independent review APPROVED: independently executed the complete pagination and removed-list files, 18/18 PASS, 317.239 ms; checked the real stale-reload negative, same-transaction generation/epoch/index boundary, options-only forwarding and retained typed restore/native oracles. Diff check PASS. No schema, permissions, CI, version, cloud, account or provider changes.

## Runtime and test SHA-256

```text
b6fc690ae7388b54a35011d14da9f7d890806efdc79ad36146264a6499d46369  core/topic-governance.js
41502439ef303cf5bf368b9b19602bb06a42381f426a6d9a7b742d9bfc0e3646  core/organizer/store.js
c97f2de99f7c5a93c433c3dc36a4ff621a73004b097089f6a3606aae628b987c  background/service-worker.js
e200ce71fb22a97914b1ce78b3cad2e6d864ba81b29ee30be453dda76b6df086  ui/settings-removed-list.js
0e0e4878c79a155277b4b0a880b77bb1fb1edda8fd76b048fde930f305092bd6  ui/settings-removed-copy.js
e1234153c305b22ccc9811b359f3aea700ec5534dfa2f6a89bd68c0682065c41  tests/settings-removed-topic-pagination.test.mjs
0b6ba71aefc365ed7169002f68adec6432e5837d0c9a200a5708e677e5cf2f72  tests/settings-removed-list.test.mjs
59c4b51a13f92dadc3ed34d92b87c976942536adf0075ebe033d3e21f1458baa  tests/uir-04-data-chrome-e2e.test.mjs
```
