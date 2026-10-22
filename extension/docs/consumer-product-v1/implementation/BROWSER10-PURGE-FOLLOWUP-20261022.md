# Browser10 historical purge: capture/maintenance ordering follow-up

## Scope and exact identities

This follows [dot's PR313 handoff](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6334907329). It fixes a demonstrated fixture ordering defect; it does **not** claim the original cloud occurrence is conclusively attributed or that Full now passes.

- Successor branch: `codex/browser10-purge-followup-20261022`.
- Base: `d3aa9805c4adcfd9d252f4dd2305d1f24b3ffb5f`, tree `67d308f4bf565a6a1f94ededc08a3335fe1e3964`.
- Independently cherry-pickable fix: **`a59b2ec17a491779600e1223cc46cca52429be31`**, tree `dbfda808d33682258c89c3e1e2ef0649128df9d6`.
- PR313 acceptance branch remains `22bd30f19b3d5ecb8074b334d7e3ae019f6bbb7e`. This work does not move it, change draft status, request automatic review, or rerun Full.
- Existing Sync fixes `9c7175b5732b58ca630024d0e3ca09a0a71c17bb` and evidence `d3aa9805c4adcfd9d252f4dd2305d1f24b3ffb5f` remain unchanged. At item completion, [dot's latest independent review](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6334965186) accepts that three-file repair as an integration candidate with no blocking finding, while preserving Full/native uncertainty. No runtime, version, workflow, PR312, main or product-rule change.

## Original failure retained

[Full39735101169 / Browser10 job119679193359](https://github.com/haohongfei2001-png/paia/actions/runs/39735101169/job/119679193359) tested merge **`c80110db807248ff997aecc5094234c92439fc20`**, tree `5a32d74a5480fa052481d8887975284debe6f9f0`. The shard ended **25/26**, with release case `Now current B-02 refusal and historical Source purge retire the timer and reject an older actual snapshot` failing at `HISTORICAL_FIXTURE_MAINTENANCE_NOT_SETTLED`. The failure is before current B-02 preflight, refusal digest comparison and historical state formation; it is not evidence that purge admitted an unsafe deletion.

Original artifact12407229275 (`current-browser-evidence-c80110db807248ff997aecc5094234c92439fc20-10`) was downloaded once and verified SHA256 **`275d0b808acef216e32bf202d77e2c978f2ef6e99c092800c66bd0015ae6c01b`**. The exact decoded original job log,93515bytes, is retained as gzip: uncompressed SHA256 **`3580096114441b9c645825ad41156d3f71250e0832e35fe07d627c225de8cd63`**. Its original `acquisition-1792652366272.json` is also committed unchanged. No original red result is relabelled or overwritten by later green evidence.

The100 retained filter acquisitions all entered their callbacks successfully. Thus this occurrence is not the already-handled pair of unentered `CONTROL_PUBLICATION_CHANGED` acquisitions. Unfortunately the original trace did not record pending filter counts, navigation completion or metadata churn; it cannot distinguish those remaining causes retrospectively.

Five relevant files (Now harness, historical admission helper, existing capture-completion helper, original filter owner and runner) were read from the exact failed merge via GitHub and their Git blob hashes compared with the successor base. All five are identical; [verified identities](evidence/browser10-purge-20261022/verified-baseline-files.json) records them.

## Demonstrated defect and minimum repair

The Now fixture waits for two saved Sources, closes their synthetic host, and immediately calls `setFilterMode('off')`. Saving a Source does not imply completion of the original handler's later optional queue work or the background filter batch. The original `FilterRunner` and `evaluateFilters` correctly refuse to process when mode is off, including a batch that was prepared before the mode changed. Pending rows remain durable. The later historical fixture still strictly requires `pending===0` and `taskState==='idle'`.

Two controlled checks demonstrate the defect:

1. Actual offline Chrome Source/release with filtering disabled before synthetic capture both fail with the same original maintenance-settlement error. Across100 samples, pending remains2. At the end navigation has no unfinished scope or dirty/GC marker, metadata stops changing, and the gate still refuses. This deliberately forces the ordering condition; it is not a claim that the exact cloud interleaving was observed.
2. A new Node regression holds the **original** filter owner's `filter-evaluated` checkpoint. Turning mode off before releasing it leaves2 pending rows and the unchanged gate rejects after100 samples. Waiting for the original runner to finish first, then turning it off, leaves0 pending and the gate admits only after8 consecutive stable comparisons. Source rows remain exact; there are no provider calls.

The fix enables the existing `startNavigatorSourceFixture` / `awaitNavigatorSourceCompletion` only for this historical Now purge case. It closes the synthetic capture host as before, then awaits completion of the original worker's captured requests and safety/library/filter owners. It additionally requires light mode,0 pending and idle state before the existing switch to off. The same strict historical gate runs afterward. No polling timeout, expected state, queue row, failure flag or product behavior is loosened or rewritten to force success.

The reused helper loads a private copy with its existing completion observer as the **sole worker difference**, checks the copied file set and source/release bytes, preserves the original handler promises and maintenance implementations, and records hashes. These are native IndexedDB/WebCrypto, real extension-message and UI results in fresh headless profiles, with explicitly disclosed fixture observation; they are not a claim of an uninstrumented installed profile. The helper and its launch/security options are unchanged.

The admission helper now adds bounded counts/state labels to each existing filter trace event: filter mode/pending/task state, catalog status, unfinished navigation scopes/dirty/GC counts and metadata-change counts. No row IDs, scope values or bodies are copied into the new observation. It does not control the admission decision. This supplies the missing facts if another cloud failure occurs.

Changed code files:

- `tests/harness/context-now-currentness-native.mjs`: reuse the original completion barrier only for the purge case; require the completed filter state before freezing mode; include completion/hash evidence.
- `tests/harness/pre-gate-purge-browser-fixture.mjs`: add count-only maintenance observations, preserving all original refusal/admission checks.
- `tests/pre-gate-purge-acquisition.test.mjs`: two actual-owner ordering regressions and observation privacy/count checks; retain every original regression.

All original Now test bodies/assertions compare byte-for-byte after removing the one explicit setup-option change. All historical-helper bytes from `const preview` through B-02 refusal, whole-database/local-storage digest equality, pinned historical body and cleanup remain exact. The100 samples,25ms cadence,8 consecutive comparisons,60s case timeout and real8s synthetic Now deadline remain unchanged. Original4096-read,2MiB,30s,authorization,financial,transaction and35sHTTP rules are untouched.

## Actual verification, including intermediate failure

| Evidence | Result | Meaning |
| --- | --- | --- |
| Original cloud Browser10 |25/26,FAILED| Original failure retained; no rerun. |
| Local original ordering + diagnostic-only observation |2/2,PASS| One Source/release observation; cannot disprove the cloud race. |
| Deliberate off-before-capture control |0/2,both original settlement failures| Proven disabled-pending-queue mechanism. |
| First completion-helper integration |0/2,onboarding selector timeout| This patch initially assumed mandatory `onboarding-start`; corrected to the same optional-start handshake as the original harness. Its failed log is retained separately. |
| New acquisition tests |14/14,PASS| Includes held original filter batch and count-only observation regression. |
| Acquisition + existing pre-dispatch tests |24/24,PASS| Complete two-file owning checks; overlaps the14-case run. |
| Final actual headless Source/release purge cases |2/2,PASS| Each original worker completes8/8 observed requests,0 pending; each strict gate finishes in10 samples; original zero-effects, retirement/late-reply, unrelated Source/Input/human Thought, permission and offline assertions all pass. |
| Static package check |21218 guardrails /607 runtime resources,PASS| Static only. Final native release case builds through the original release builder. |

Local environment: **Node22.23.4,Python3.12.14,Chrome155.0.8059.85,Playwright1.63.0**, macOS. Other exact package pins are ProseMirror model1.25.12,state1.4.4,view1.42.6; installed versions match `extension/package.json`. There is no tracked package lock. Original cloud was Ubuntu24.04,Node22.23.3,Python3.12.15,Chrome155.0.8059.84. These environments are recorded distinctly, not claimed identical.

Commands run from `extension/`, with the existing Node22/Python3.12 runtime paths and the existing headless offline Chrome harness:

```sh
node --test tests/pre-gate-purge-acquisition.test.mjs
node --test tests/pre-gate-purge-acquisition.test.mjs tests/pre-dispatch-read-retry.test.mjs
node --test --test-name-pattern='Now current B-02 refusal' tests/harness/context-now-currentness-native.mjs
python3 scripts/check_package.py
```

The separate controlled-ordering probe uses the same native test and helper with [this one-line setup patch](evidence/browser10-purge-20261022/controlled-ordering.patch) against the stated base. Its temporary relocated module used equivalent absolute imports and `PAIA_EXTENSION_ROOT`; no runtime, timeout or safety flag change. The first observation used diagnostic-only trace additions; the final run uses the committed fix. Logs/receipts explicitly distinguish all three.

[Machine receipt](evidence/browser10-purge-20261022/receipt.json) lists file hashes, exact tested code hashes, raw/public evidence hashes and sanitization. The original cloud log and acquisition bytes are exact. Local logs replace only local checkout/temp paths; synthetic controlled-failure state is published as counts with hashes of locally retained raw traces. Source/release completion receipts include the private mirror's complete file/hash binding. No screenshots, real archives, credentials, user browser state or production service data are uploaded.

## Remaining work and handoff

Dot owns independent review and selection of the next acceptance candidate. Cherry-pick `a59b2ec1` separately from the existing Sync fix; do not merge the whole successor branch and import its earlier diagnostic/product-note ancestry. The following evidence commit contains this report and logs only. Latest PR comments were read at both item start and completion; the acceptance head was read back unchanged. No additional runtime repair is justified by current evidence.

The exact original cloud cause remains **not conclusively attributed**: the demonstrated ordering defect matches its failure location, but the original trace omitted the decisive queue/navigation state. The new observation is intended to prevent that gap. An updated-candidate Browser10/Full qualification, all other unchanged Now cases, the entire Browser10 shard and installed/live-service behavior have **not** been rerun here. Do not mark the old Full as passed or infer complete certification from the two native cases.

No new product decision, broader read permission, paid call, identity/credential configuration or service activation is needed for this fixture-only correction. Existing cross-source association/authorization, candidate-adoption semantics, automatic Topic lifecycle and real-service prerequisites remain with their existing owners. Further changes require new evidence or an explicit handoff; no speculative work is added to keep the branch active.
