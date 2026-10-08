# Coherent 0.27 local recovery candidate

This is an unpushed local integration checkpoint, not a released or installed version. The preceding0.26 PR210 failed full certification at a5034759 (Browser7 metadata-read race; cancelled jobs remain unproven). Current main is90b2a9e7 (website update over runtime0.24).

## Included reviewed boundaries

- SET2: removed Input restore acknowledgements cannot steal later navigation; pending Input assignment dialogs isolate late page reads, handlers and confirmation acknowledgements. Existing canonical restore/import commands, revisions and Source bodies remain unchanged. Standalone/Ignore and removed restore now also qualify the existing read-only Archive route intent, including A → B → A and last-row success (3d2faf53); coordinator independent review, 56 related tests and complete Data native pass are recorded in SET2-02-PENDING-ACTIONS-ACK. Owning commitsaa92ad45/bfad7917 have complete original Data source/release evidence and independent reviews.
- SET2/TOPIC accessibility: existing Next dialog keyboard/320/actual2x text evidence b0729e62 and saved-AI summary coarse/trusted touch/actual2x text evidence d7ca6c19. The latter changes only tests and receipt; it is not a claim to complete all05.8.
- AI-COST05: optional style-qualified job identity, execution revision/epoch fencing and distinct coverage be1f806f. Missing production authority remains unavailable; no paid model or worker activation. Current evidence preserves the single serialized control-owner limitation.
- AI-COST06: dormant trusted Assist intent binding dd965085 qualifies exact reply/session/permission/evidence identity and coverage per job; 14 owner tests, 166 related tests and actual source/release native assertions reviewed independently. No production resolver, reply-only result owner, worker activation or model call is claimed.
- SYNC: optional four-card desired journals ea71c38d never import global grants; existing-Source-only Keep journal528157a7 binds actual canonical changes/outbox atomically. Bound unsupported editing/deletion paths are explicitly refused pending further owner coverage. No Source creation, full restore, provider connection or activation readiness is claimed.
- Version0.27 preserves all prior backup producer minors7–26, admits27 and rejects future28/major1/unknown schema. Root9 related checks and independent4 version checks pass.

## Current combined evidence

At exact local checkpoint6ecf902f861d901918d01938fe7a60c3178c6153, all four complete native Sync files passed38/38 in70.966716208 seconds, zero skipped/cancelled (`/tmp/local027-sync-combined-final.log`). Context source/release each require94 cases,12 runtime hashes and three real restarts. Storage each retain15 original cases and12 Prompt conflicts plus23 Keep cases and a seventh real restart. Actual production hashes are generated from source/release instrumented copies; the receipt validator rejects the old six-restart receipt when requiredFilterIntent is true.

The actual full CI verifier, extracted unchanged and executed as module stdin in the extension directory, reports BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS6ecf902f861d901918d01938fe7a60c3178c6153. Both workflows require exact scope/head/tree, current desired proof, current Keep fields and source/release case/hash equality. Root and independent reviewer each passed all11 CI/harness cases. No timeout, network, permission or original lifecycle assertion was relaxed. These are checkpoint proofs, not future-head CI or user installation.

Owning receipts preserve all actual prior failures, including unsupported writer inheritance, prepared Source/provenance changes, duplicate canonical writes, initial missing seventh lifecycle declaration, and UI fixture errors. Subsequent tests do not relabel those failures. Further runtime integration requires qualified affected and combined verification before final certification.


## Stable batch verification at e05290ab42d8830e9296e8ab0ce93019aef0ba18

After Assist and final pending-action integration, seven complete native files passed 49/49 in 197.313153417 seconds with zero skipped/cancelled (`/tmp/local027-coherent-final.log`): the four native-sync files (storage, publication, retirement, context-info), cpv1-01-ai-cost-foundation, uir-04-data, and uir-03-ai-presentation. This includes the 38 Sync cases, two AI foundation variants, eight AI presentation cases and one complete Data source/recovery/release journey. Runtime stayed frozen for this run.

The actual extracted CI receipt verifier passed `BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS e05290ab42d8830e9296e8ab0ce93019aef0ba18`. Package validation passed 12514 guardrails across 378 runtime resources; diff check passed. These exact local proofs replace the older 6ec combined proof for this batch; neither proves future-head hosted CI, whole-product completion or installation.

New InputWorking publication work remains isolated in work/sync-input-working and is excluded. The 0.26 metadata qualification race repair is also not yet incorporated; its independent review and hosted evidence remain pending after the agent account quota failure. Ordinary development continues where possible, without changing plans or paid quotas.


## Metadata and Data merge verification at 045c7455 (2026-10-09)

This later local checkpoint incorporates the reviewed metadata qualification repair `05f9cdef`, current main integration and Data cancellation completion repair `5ceca673`; the preceding statement that the metadata repair was not incorporated is historical. Tested HEAD was `045c7455a415fb741a565a042dd98ef138200e9a`, tree `ca17e0e0b655a8e5561a3263ebb8ce7df997adc1`, clean before and after execution.

Independent merge review confirmed that relative to first parent `326355d3`, the Data change consists only of the already reviewed real cancellation ACK hold/completion assertions. Both source and release retain `removedInputSafety(h)` and `pendingInputDialogSafety(h)`, including actual last-row success feedback. The backup runtime and complete UX-R3 file are byte-identical to `5ceca673`. Cancellation executes the real worker request before holding its reply; the preview remains visible and the chooser locked until release, after which the existing bounded completion wait observes both hidden preview and unlocked chooser before retaining the original exact false assertion. No runtime, timeout or assertion was changed during this verification.

Two complete files ran serially in synthetic headless Chrome: `uir-04-data-chrome-e2e.test.mjs` and `ux-r3-thought-chrome-e2e.test.mjs`. Result: **27/27 PASS**, zero failed/skipped/cancelled, 342.139938208 seconds, log `/tmp/coherent027-data-topic-native.log`. Data is one whole case containing source, recovery and release journeys (34.667689792 seconds); UX-R3 contributes all 26 cases, including F-LARGE 100k Inputs / 1000 documents / 300 Topics / 5000 Thoughts (160.370128458 seconds). These are actual local combined proofs, not hosted final-head certification or installation. Prior hosted failures and intermediate failed/cancelled evidence remain retained; no prior failure is relabelled as passing.

Before/after SHA-256 values were identical:

| File (under extension) | SHA-256 |
| --- | --- |
| ui/topic-workspace.js | b29fd996f058503a754efccef8f2339bff2ae4d5ecefd8efa97c894ea882655a |
| ui/review.js | c28e3adc6dc189740cd93f95a1c983551a334d1bebbd126e416a559ee6d866d6 |
| ui/archive.js | bf8217f64eb90b0a6b3435b19dcb0476db53321cf0fc2ffee42477d474462155 |
| ui/backup.js | 614253d71de27ef06a873e1b07a624f37fdd97b4dfb2d2aa62ab8fee64a59c5e |
| tests/uir-04-data-chrome-e2e.test.mjs | 9613bc381a4f236effefcca3f04457f5c69e65dea3caa07d2fe533642b5f78d2 |
| tests/ux-r3-thought-chrome-e2e.test.mjs | 3d9ce564d877fd577e3ba505d9c53dae6f35fc2310bc5daa780480a2b9fa6860 |

The earlier 49-case combined checkpoint remains evidence for its recorded exact bytes. Unchanged Sync/AI storage files were deliberately not rerun here; this 27-case run does not turn those older receipts into new-head hosted receipts. Only this receipt was edited after the run; integration/commit remains with the coordinator.
