# SYNC-01 prerequisite: original Topic projection metadata interfaces

Local prerequisite only. Base is coordinator's **local, unaccepted integration candidate** `b2535312f945a0b5db171a150625667022ba780a`, tree `42acddee62fe3d0278163d16ba1191781aac63e5`; it is not accepted remote main. This branch is deliberately excluded from the 0.43.1 batch. Reconcile these isolated differences against its eventual accepted main; do not integrate the whole old candidate tree or overwrite later UI repairs.

Root separately authorized the combined `PROJECTION_ORIGINAL_METADATA_INTERFACE_CHECKPOINT_20261009.md` + `PROJECTION_ORIGINAL_METADATA_INTERFACE_REV1_20261009.md` design. REV1 requires the accumulator signature `(meta,descriptor)` and original per-use generation observations. This change supplies no projection/current-generation certification, recovery/restore scope, native transaction/effect authority or model/account permission.

## Source and bounded changes

Original source oracle was frozen **before** extraction at `7e3f77b4740899f328edad142cff18a0f4c5c9ed`, tree `ec98340ac4314ee1b1b93a056ee32a1eec1e704f`. The new owning test embeds the full original `thought-read-index.js` with SHA256 `578d205636bc0e04663f3348ae07c5ce7d22c6419c6e2d0877e2c0675a24f114`, requiring no Git history in CI.

Code `1d7dd97ebca47db315831b6d769e6c25c0d950c0`, tree `284754efa005a42336270f12fd4fedbd910acd2c`, changes only `core/thought-read-index.js` and its new owning file after that oracle commit:

- Export the original `liveTopicKey` expression unchanged, preserving default/falsy conversion, JSON ordering and property observation order.
- Lift the original counts/providers/earliest/latest/unknown block verbatim into the IO-free, in-place `accumulateThoughtTopicDescriptor(meta,descriptor)`. The existing writer still scans, awaits all four descriptor rows, updates indexed/added, then invokes it at the same point. Every original `meta.buildingGeneration` getter remains at its original unknown-comparison position, never pre-read or cached. Descriptor and count aliases remain original.
- Lift original completion assignments into `completeThoughtTopicProjection(meta)`, a fixed two-step generator. The first next performs the original prefix and suspends at `meta.completedAt=yield`; the original writer then evaluates `store.clock()` and passes that result to the second next, which performs assignment and the original remainder. Clock/getter/setter failure retains identical partial state and skips the final metadata put. No new clock/UUID/callback I/O is introduced.

The helpers are computations, not admission. Any future qualifier must construct and charge its own expected mutable metadata and independently qualify the exact original source/generation cut. This implementation adds no qualifier, new reducer, schema/store, body copy, read/commit scope, UI, CI or version change. The inherited 0.43.1 build label is base identity, not approval to deliver this future batch under that version.

## Exact local evidence

Node22.23.3, no browser or model runs:

| Evidence | Result | External log SHA256 |
|---|---|---|
| Original source oracle before extraction | 13/13 PASS, 82.92ms; zero skipped/cancelled | `f9ddcaad66f9215f08fc0dd498af75a0977e1ac9d44025cd3f888dc24e50605a` |
| Four complete targeted files after extraction | 134/134 PASS, 5973.97ms; zero skipped/cancelled | `dda1bf2a8fee1ceee726b23e3e722f576a2d5d38d726054a850a4ea8def560d6` |
| Final complete new owning file, after adding explicit export assertions | 15/15 PASS; zero skipped/cancelled | `39fedbe5a2c316c62b4a7830dd59b20d824cf254ada4af58e949c2a929107cac` |
| Compatible release build | 439 files PASS; no release browser/installed claim | `0b320457fe97d11ae8be5ec593a9881690d429583d7a69f7dc644b4cf1d1c4df` |

Logs are respectively `work/projection-metadata-original-oracle-first-20261009.log`, `projection-metadata-targeted-first-20261009.log`, `projection-metadata-owning-final-20261009.log`, and `projection-metadata-build-first-20261009.log` in the coordinator's external work directory. The four complete files are `thought-projection-metadata.test.mjs`, `thought-projection-constructors.test.mjs`, `ans-08-topic-projection.test.mjs`, and `cpv1-topic-05-4-section-reader.test.mjs`. Only explicit new-export assertions were added after the134-case run; final owning15 verifies them without changing runtime or other dependencies.

The actual original writer comparison covers success/pending pages, descriptor changes during put awaits, successive generation getters, count/provider/time getters that change generation, count/provider/unknown getter failures, completedAt setter failure, Error/null clock failure, exact prefix observed by clock, partial state/no final put, alias retention, counters, row order and no UUID. Direct helper tests verify in-place counts/descriptor references and both completion steps without I/O/time allocation.

Runtime SHA256 `3e9227082d8ad8ca133b66113ebddda0e495b251608aa2d680e50e825d89bc15`; owning-test SHA256 `10e174adbb48ef9f7d35ff73eb7208a4932443b1875bc01ec3582973644350b8`. Independent review, accepted-main reconciliation, appropriate next-batch version/gates and eventual delivery remain pending. No native validation or full SYNC/current-generation closure is inferred from these pure-interface results.
