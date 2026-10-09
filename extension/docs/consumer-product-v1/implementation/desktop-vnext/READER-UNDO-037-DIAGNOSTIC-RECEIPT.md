# Reader undo navigation — limited failure diagnostic

## Scope and identity

Base: `2cec9fea102e46a37222e470907e1ac92ebd0e36` (PR #225 original 0.37 candidate). Diagnostic code: `62dee520c5d08dafebcf924ada0579fde6e16375`.

Only `tests/cpv1-02-4-reader-chrome-e2e.test.mjs` changes, SHA-256 `88212e8761865a40c592024d6e002c0c3854e3922f95a331558afd245966d9b5`. Production runtime, shared storage, CI, versions, constructors and frozen AI experimental owners are unchanged. This is **test diagnostics, not a demonstrated product fix**. Root and an independent second reviewer must review this frozen limited difference before any integration.

## Original failure retained

PR #225 head `2cec9fea`, Full run `37878399910`, Current Browser 1/9 failed at the case `VS-04 undo survives navigation back to the same Reader only while revisions match`. The job log reports `Error [ERR_TEST_FAILURE]: synthetic expected state`, without a useful stack or failure-stage observation. Raw log `/tmp/037-browser-1-failure.log` SHA-256 `8c79bc3b856a60564c00acc54d0c9cea46d3c4ded36029f9c876d471e36b3296`; failure appears at line 672.

Artifact `11593601662` was downloaded to `/tmp/reader-undo-037-browser-artifact.zip`, SHA-256 `d46c2beb46394672ed1e36e18f5e279707dea1f50da92f53b53ab1cd83c961eb`. Names and selected JSON were read directly with Python ZipFile, without extracting any paths. `test-summary.json` confirms **89 cases / 88 pass / 1 fail**, including this Reader file **7 pass / 1 fail**. No Reader-undo failure-state file or stage trace exists in that artifact. Its packaged `ui/library.js` and `ui/archive.js` exactly match the base Git bytes:

- `library.js` SHA-256 `dcb4d7f7a91bdbda4c29ebfbbe072d30e8790799f63047fca671a154d09f23ee`.
- `archive.js` SHA-256 `ca7bbd0d27e8a3c704525d2a432085049fd824ff871b5c461c366410c09ac0e4`.

The base test has six unlabeled `eventually` calls that can produce the reported generic message: capture state, initial group, initial prose, group after Back, returned window and returned prose. The actual edit-save and undo-save waits already use distinct labels. This narrows the observed failure to an unlabeled navigation/state wait; it **does not identify which wait or prove any underlying cause**. No late-source-membership, group-focus, revision, undo-journal or UI-runtime defect is inferred as confirmed.

## Added failure detail

The original case keeps every native action, selector, condition and assertion. Existing wait budget **14000 ms** and case timeout **75000 ms** are unchanged. Only static stage markers and a failure catch are added; no new waits, retries, delays, locale qualification, synthetic navigation, shortened journey, relaxed oracle or altered runtime.

On failure, the catch captures bounded body-free DOM state: language, document focus, active element tag, navigator presence, counts, at most eight groups' visibility/expanded status and known unassigned/unknown label booleans, selected-Input presence and menu-open status. It contains no raw body, source text, HTML, Input/document IDs, group title, keys, network/account data or real-user material. The synthetic Input ID is used internally for a presence comparison and never emitted. The snapshot is written to the owning ignored `extension/work/reader-undo-037/failure-state.json` when possible.

The same finite metadata is appended to both original error `message` and `stack`, and the original error object is rethrown. Original assertion code, actual and expected fields remain intact. No `console` output is relied upon.

## Actual local evidence

All browser runs use actual Chrome in an isolated temporary profile with `PAIA_HEADLESS=1`; no visible window or user profile. No provider, paid model, deployment or CI rerun was initiated by this child batch.

1. Initial sandbox attempt could not start a ready CDP port: targeted case **0 pass / 1 fail**, 20578.921208 ms, `/tmp/reader-undo-037-owning-before.log` (SHA-256 `56c693ef57d1e509364b22e3190ab4d6ac7d2fc8525958c35300ebc4f1e52cf2`). This is a local browser-launch boundary, not the original cloud assertion. Escalated isolated headless execution was then used.
2. Original exact base file SHA-256 `c525771ad573f5f6c0e506d041438532017d283113d9ced4392ba80dafd4f91e`: targeted original case **1/1 PASS**, 7389.26275 ms (run 12501.071334 ms), `/tmp/reader-undo-037-owning-isolated-before.log` (SHA-256 `e576461a3e52c2b63d4a04d3f5b75d8f7011e92c6d652e4e6970c78a451cd41e`). This is one-case evidence, not whole-file acceptance.
3. First diagnostic whole file (test SHA-256 `2cc68e1ed4cac80519276651872fa9027040b66d83a5f45a23a4725aea3ae1af`) **8/8 PASS**, 61626.347875 ms; log `/tmp/reader-undo-037-full-diagnostic.log` SHA-256 `f8db3d0bb8dc8847d6e44916cc898a779946f93604b3fe4ee6d5d4eb96fb49f7`. This version appended only `stack`; it is not relabeled as the final message-plus-stack test bytes.
4. Actual original custom reporter proof initially produced its intentionally failing assertion but **dropped** stack-only appended metadata. `/tmp/reader-undo-diagnostic-reporter-proof.log`, SHA-256 `1869d6ec42ad58cac4e003eeb35d9cc67bc463057c8a7f34a6f3b6f27e2c0fc9`. The Node `ERR_TEST_FAILURE` wrapper exposes the assertion message, so this supplied an actual failure-path gap.
5. After also appending the message, the same actual custom reporter emitted the original `synthetic original assertion retained`, `false !== true`, and `Reader undo failure state: {"stage":"returned-prose","proseCount":0}`. `/tmp/reader-undo-diagnostic-reporter-proof-fixed.log`, SHA-256 `03348ebfea411ef1078ba8e61cb543f77459216517beb2c2bcc49f5acb0dabd6`. This is an **expected FAIL**, exit 1, proving diagnostic delivery; it is not a passing native journey or a product repair.
6. Final exact code/test bytes at `62dee520` completed the **entire original eight-case file: 8/8 PASS, 0 fail/skipped/cancelled**, 62267.597166 ms; target case 6252.51175 ms. Log `/tmp/reader-undo-037-full-final.log`, SHA-256 `c8d861611a98122898cb83a3fe951b5112a74314100aa34e67366160db0dc5f1`. That single final run had already started before Root advised that the catch-only difference could use the earlier native run plus reporter proof; it completed normally and will not be repeated without a new concern.

`git diff --check` passed. No local run reproduced the original cloud failure. **Its unique cause remains UNKNOWN**, and the original failed CI is not erased by these local passes. The original success/Source immutability/undo-save assertions all remain present. No additional negative revision test or overall Reader certification is claimed by this diagnostic-only change.

## Integration boundary

Root controls one stable corrected-head Full observation after independent review. Local 8/8 does not turn the prior failed head into a pass or authorize main integration before its required gates. If cloud navigation fails again, the new named stage and finite attached state provide actionable evidence for a separately justified minimal runtime or fixture correction. This receipt grants no broader Reader rewrite, storage change, CI relaxation or repeated same-head run.
