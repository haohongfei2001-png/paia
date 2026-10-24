# Prompt insertion local checkpoint compatibility — 2026-10-24

## Scope and invariant

Base: `af560f6de7a478e3c45937d628581bb87def8c0a`. This is a narrow compatibility companion to the prospective local Prompt insertion receipt owner, not a new Sync feature or production insertion activation.

The shared `core/prompt-insertion-runtime-format.js` contains only the strict body-free v1 format, canonical encoding and deny-only validators. It imports no background owner and supplies no IO, receipt provenance, insertion capability, native source proof, active external grant or portable entity. The runtime owner retains all cryptographic/original-owner authority. Dense data-only bounded arrays additionally reject accessor, sparse, symbol and extra-key forms before iteration.

Only the exact `prompt-insertion-runtime:v1` key is validated in the original Human current snapshot, Source/Working default metadata and Mixed metadata inventory gates. The row's databaseId must equal the actual original Store databaseId. Its historical restoreEpoch/domain origin and mixed-domain claim history remain unchanged; shape validation does not transform history into current authority. Consumers remove the key only from temporary validation maps, never from raw rows or retained source cuts. No prefix exemption, wire family, canonical projector, backup allow-list, publication grant or native-brand relaxation is introduced.

Ordinary `requireGroupScope` previously ignored this nonportable local key. It now strictly validates the exact key and database binding, without changing its other unknown-key behavior. Strict native-current inventories were the rejecting paths; this distinction is retained rather than mislabeling an ordinary grouped checkpoint as native qualification.

## Executed bounded evidence

Node `v24.19.0`; vendored fake IndexedDB only. Final six-file command in [dependency manifest](evidence/prompt-insertion-local-checkpoint-20261024.json) passed **37/37**, zero fail/cancel/skip/todo, in **3043.271143 ms**. [Exact output](evidence/prompt-insertion-local-checkpoint-20261024.log). No dependencies were installed. The manifest hashes all **368** recursively resolved literal relative import/from dependencies, including literal dynamic imports; computed imports are not inferred. There are zero unresolved literal paths.

The new 13-test slice proves:

- Original `buildCheckpoint` → `GroupedCheckpointRestore` A → initialized B → fresh C executes on synthetic data. A's local row remains unchanged; B's own historical row survives byte-for-byte; C receives no runtime row. Original Source/Working data and permissions retain their existing owners.
- Content-addressed checkpoint reference and immutable object count are identical before and after adding the local runtime row. Wire objects contain neither its reserved key, origin digest nor claim operation identities. Backup admission rejects that local row.
- The original direct initial and cleaned-restored Source/Working metadata consumers accept a valid bounded row, including mixed historical domains. Future version, foreign database, body/extra fields, missing required fields, false legacy-coverage claim, corrupt epoch/range, invalid claim state and malformed receiver are rejected with zero publication and unchanged local stores. Strict inventory rejects sibling/future keys; it never exempts a prefix.
- Original `OriginalApplicationGenerationSelection.prepare()` retains its full source cut. A subsequent physical receipt-only change leaves every other source row, protocol graph, Store tail and backup generation unchanged; original `activate()` rejects it with `GENERATION_SELECTION_CHANGED`, writes no source marker and preserves both source and target. The all-row comparison implementation was not modified.
- Pure format checks reject getters without executing them, sparse/extra-key arrays and body-bearing envelopes.

Adjacent unchanged bounded suites cover default memory, Source/Working metadata, restored successors, current-selection forged-capability refusal and device-local preference protection. Initial test-authoring runs were 11/13 then 12/13 because of fixture mistakes: assuming grouped restore creates recovery-restore-epoch, cloning a branded plan and omitting the restored consumer's frozen-tree precondition. Those fixture errors were corrected; no production guard was weakened. Their results are not final passes.

## Exact boundaries and open qualification

Shared format SHA256: `9a4e8c42da895c8a1a78c2b8081ad9c3a5f70f14e1a8611318413b853fa01a0e`.

Dependency manifest SHA256: `2d7993233577b73f89ee68eef47256b098b033ec09c5215b7c942f328560e7b0`. Test log SHA256: `54fa105bc9750e92bcc91b925af51e21282ea0f1ad800bd2b24cc85b93cc82d8`.

Unmodified whole-cut/projection and Backup boundaries:

- `human-library-plan.js`: `77e13a35d0524cd45a400fc8078b2ba8f4983920308b7b45889ff6cb8b9d6ec5`.
- `application-generation-selection.js`: `e1e39503159c92655902955765fc34961981c03d1bfa696c91f2dd1370c5f71b`.
- `backup-format.js`: `b486351901ddfdf6afd24609025fcbe9ab0713106182651c7769073e774cf90f`.

Independent read-only review found no blocker in the exact compatibility diff and tests. Actual native-current Human/SourceWorking/Mixed projection execution remains **not run**: fake IndexedDB is not allowed to acquire the original native brand. This receipt establishes ordinary original producer/restore behavior, direct metadata-consumer behavior and original synthetic all-row selection fencing, not native/browser/performance or full acceptance. No native/browser/Full/C/129/100k run, paid/model/account action, external write, permission expansion, install or deploy occurred. The seven plans, paused Sync feature scope and earlier evidence remain unchanged. Root owns coherent integration/versioning and any separately authorized publication.
