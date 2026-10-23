# Context correction: original scope metadata terminal closure

Base: `4e1fde70` (after authored correction `17eaa591`). This successor is required with those commits. It does not introduce another permission grant, modify persistent Context/Sync schemas, or enable bound/mixed/structural correction variants.

## Confirmed defect and repair

The existing asynchronous lineage check preceded the repository's backup/semantic tail. Five controlled mutations after the backup-generation write changed Context access, the target Topic name registry, binding completeness, library verification, or the thought sequence. All five could previously receive ACK; the preserved baseline is 0/5.

`captureContextTopicMetadataTerminal` now runs the original `admission` and `scopeMetadata` in the material transaction and records the actual metadata read closure. It has fixed table projections, not caller-supplied permission predicates. Topic/Section labels and unselected Entry text are not retained. The original scope validators continue to validate canonical shape. Restriction rows retain their original owner policy fields; unrelated legacy profile/activity body fields are omitted.

Every scanned query retains its original count and each actual primary key with its projected value. The terminal phase compares all counts and all original keys; a same-count replacement therefore fails. This covers the target current-layout Sections/Placements, every selected Entry's complete placements/dependencies/provenance, shared memberships' other Topics and Sections, identity-name registries, organization operation receipts and legacy ancestry. Member projections reuse the original Topic terminal owner's closed schema. Context access, gate/consent owner settings, library readiness, binding and filter facts are also sealed. The selected original human receipt/item and original authored history fences remain intact.

Canonical root counters are read during original final-fence registration after the permitted owner writes. Only `backup-data-generation` may advance by exactly one when the original transaction's `backupChanged` flag is true. No entire metadata row or generation family is exempted. Session registration now awaits this finite original-transaction read before returning.

The scope observer confers no material access. The existing independent qualification/lineage owners remain authoritative: Topic Entry/dependency Input IDs must belong to the closed selected Input set; author fields/history have separate exact grants; original Input/Source terminal facts remain enforced. There is no new Source read policy, metadata-to-body promotion, fake Input, external/paid model call or plaintext durable evidence. Retained facts/query metadata and final reads consume the original bounded ledger.

## Validation, kept as separate runs

Environment: existing official Node 22.23.3, macOS arm64, existing vendored fake IndexedDB; no native browser, install, build, cloud or Full run.

- Pre-fix native-tail fault-injection tests: **0/5**, preserved in `work/context-scope-terminal-baseline.log`. These are Node tests of the real Repository path with fake IndexedDB, not a native-browser certificate.
- Corrected same five tests: **5/5**, 1574.742584 ms.
- Related correction cases: **128/128**, 18470.071875 ms.
- First shared-membership fixture call: **0/7** because the fixture passed `createTopic`'s receipt projection instead of reading the original Topic organization revision. This fixture failure is retained; only the test setup was corrected.
- Actual original `placeEntry` shared-membership setup: **7/7**, 2187.573083 ms. Includes unchanged positive control; related Topic/Section/registry/organization receipt drift; dependency and provenance replacement at unchanged count. Rejection preserves the human Context row and rolls back its ACK.
- Ten complete owning files, without name filter: **713/713**, zero failure/cancel/skip/todo, 53579.980416 ms. The set is the nine authored/Context/qualification/service/payload owning files used in the preceding authored correction package plus `context-topic-scope.test.mjs`.
- Last member-projection refinement reuses the existing closed Topic terminal projection, including provenance span/versions and placement owner metadata. Its affected positive/shared/fault controls passed **13/13**, 3989.413333 ms. This is separate from the preceding full owning run, not a fabricated aggregate.

All commands' TAP logs and current source hashes are listed in `work/context-scope-terminal-SHA256SUMS`. The earlier Section/journal 0/2 and plain Input Section 0/1 failures remain in their preceding commits.

## Remaining scope

The previously open metadata terminal read-set audit is closed for the currently supported plain Input and single source-free authored correction routes by this successor. Native Source/Release acceptance is still pending the root integrator's frozen combined candidate. Bound Entry, mixed/multiple authored, structural provenance and invalidated-lineage Context corrections remain separate finite implementation work; this package does not claim all CTX4 or PAIA acceptance complete.
