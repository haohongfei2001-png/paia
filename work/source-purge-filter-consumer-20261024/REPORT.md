# Original Source purge with the original Filter journal installed

Base: `1d23560e169b9369935528cd7e4b742746cc9fe9`. The fixed local Sync lifecycle installs both original Filter and SourcePurge journals. Previously SmartFilter's unconditional guard rejected even a newly captured, unedited Source before the original purge owner could qualify it.

The exception now admits only an authentic SourcePurgeJournal and authentic FilterIntentSyncJournal bound to the same Core/repository. This initial check grants no deletion capability. The original Source purge still prepares its complete causal baseline, invokes original admission, and owns the same transaction, work budget, terminal checks and final read fence. At actual transaction entry it additionally requires an exact original initial Filter row, zero Input content revision, no human body/note/edit timestamp, and absence of both current and legacy Keep intents. It snapshots the Filter journal identity and rechecks it throughout the original final owner. Final readback verifies the deleted Input's Filter row and both Keep keys remain absent.

The LibraryDocumentsStore consumer inherits the Thought layer's beforeSourcePurge override. Therefore the required baseline qualification is placed in original beginOriginalSourcePurge, before that maintenance callback, rather than assuming the SmartFilter hook always runs. The SmartFilter hook, when reached, can only use the already registered private purge transaction. No caller-created boolean, DTO, replacement Filter journal or generic write can grant this exception.

The original guard remains for missing/fake/wrong-Core/rebound owners. Genuine Keep, human Working edits, noninitial/evaluated or unknown Filter rows, incomplete owner state and existing unresolved publication evidence remain refusals. No Filter state is cleared to manufacture eligibility. Existing permanent-delete semantics, 4096 references / 2 MiB / 30 seconds and all original failure mappings remain.

## Evidence

- Negative control on unchanged runtime: the new single actual capture→purge case failed **0/1**, `BNS_FILTER_WRITER_UNSUPPORTED`; `before.log` retained.
- One final owning batch on isolated **Node22.23.3**, macOS arm64: **138/138**, exit 0, zero failures/cancellations/skips/todo, **10427.636542 ms**. `owning.log` retained.
- The six files were the new `browser-native-sync-source-purge-filter.test.mjs` plus existing Source purge, multi, closure, clock and Filter intent owning files.
- Fifteen new cases cover the original LibraryDocumentsStore capture→purge→cleanup→immutable publication path; all eight published operations are seven original purge operations and one body-free intent, with no old Source body. Other cases cover five unqualified owner shapes; real Keep and Working edit; missing/unknown/evaluated Filter; late Filter/intent resurrection and journal substitution with exact table rollback; and committed-upload/unknown-ACK publication retaining its evidence, refusing purge and issuing no additional upload.

The unknown-publication case intentionally preserves the original refusal. It neither claims remote erasure nor retransmits an old object. This package does not implement cleanup of cloud payloads, widen the original finite Source baseline, or qualify arbitrary edited/mixed/pending generations.

No browser, build, 65/129-group execution, large seed, cloud CI, account, credentials, model, deployment or install ran. The checkpoint publisher's separate race review remains a separate work stream; none of its files are modified here.
