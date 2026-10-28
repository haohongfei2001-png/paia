# Maintenance status: bounded document revalidation

## Original evidence and scope

Main `d69c829ecf2937a04cc1d7e982f367b24e52b591` (0.55.29), Maintenance run `40722115965`, attempt 1, retained seven passing native scenarios and one failure: release `trusted-confirmation-and-peers` could not load the purpose status after reload. The source counterpart passed. Artifact `12830378731` has SHA256 `d6e6ae9454b9c43cb29ad38f7bc61f5d8e19e297d318164cec8b3c83b02c9cf6`.

The original worker trace records one successful post-reload status, then two `FORBIDDEN` reads. Each failed read encountered a native `loading` / `complete` pulse while its initial document check was awaiting. The current tab and context still matched the new sender's document identity, but the command's loading listener had irrevocably cancelled the request. The original screenshot shows an unavailable permission check and the existing manual check-again action, not a granted preference.

The observer did not synthesize tab events or replace native results. The trace does not identify the exact initiator of each loading event. Same-URL History calls exist in the ordinary UI, but they were not observed directly. Relevant authentication, UI and fixture source is unchanged from 0.55.28; this is not evidence that the four 0.55.29 local-protection runtime changes introduced the failure.

## Narrow correction

- Only a STATUS read's **initial** document check may be invalidated provisionally by a status-only loading event. Its initial authentication is not used as current authority.
- Once that first check completes, the provisional window closes. The already-budgeted second full document check runs before reading permission and must prove the exact sender/document/frame/tab/window/URL/non-incognito facts and an actual `complete` tab with no pending navigation.
- Original permission and purpose-state reads follow. The third full document check still occurs before returning the result and must again prove complete status. Original current-request and purpose-result facts remain mandatory.
- Any subsequent loading event, any URL event, removal, mismatching/new document or old-document replay remains denied. Every WRITE and early OFF revocation retains its original hard cancellation and persisted/unconfirmed semantics.
- No loop, additional native read, new RPC, timeout change, authentication cache, provider activation or permission was introduced. The maximum remains three `tabs.get` and three `getContexts` calls per status request. Ordinary reads retain their original order. A late loading pulse still fails closed; no universal reload-success claim is made.

## Focused evidence and limits

The new dedicated 20-case file uses the real command, consent owner and store with isolated fake IndexedDB/native metadata boundaries. Against original code it recorded 12 passes and eight failures, including both initial-tab and initial-context loading success controls. With the correction, 19 passed and one fixture failed because it incorrectly called the intentionally unsupported `consent(false)` API. That failure is retained. Only that fixture was corrected to revoke the real synthetic control row through its original store transaction; its one-case rerun passed. No production change accompanied the fixture correction and no other cases were replayed.

Controls retain exact identity, pending-navigation rejection, subsequent-loading cancellation, real permission revocation, final-document replacement, original native-error identity, no added reads, no consent creation, ON-write rejection and immediate/sticky OFF denial. Syntax and diff checks passed. No old test suite, browser or cloud job was rerun. Native source/release success for this changed source, integration versioning and publication remain separate; the original seven-pass/one-failure run is not relabelled.
