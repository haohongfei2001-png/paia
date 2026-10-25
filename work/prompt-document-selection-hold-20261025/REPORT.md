# Prospective original composer document hold

Base: 239041b (root integration includes independently reviewed Organize factory followup). Scope: one existing original adapter, one new VM test file, this evidence directory. No worker receiver driver, transport consumer, Context/native host, shared harness, core durable format, manifest permission, global selection gate or public producer action is changed. No push/install/network/provider/native-browser/cloud/large-scale validation.

## Behavior

The original isolated-world shared composer inventory now owns a prospective document hold. Existing Manual/Assist/Next lane constructors share that same state across re-evaluation. All accepted insert calls register a private token synchronously before the original first await. A holder advances the original admission serial and closes new insert/probe admission; original native entry has a final private guard with no following await. Already entered native work finishes the same original trusted-input/caret/draft verification and listener cleanup. No cancellation or synthetic not-inserted result is used to settle it.

The original receiver listener accepts three exact worker-origin messages:

```
{type: 'PAIA_PROMPT_INSERTION_DOCUMENT_HOLD' | 'PAIA_PROMPT_INSERTION_DOCUMENT_FENCE' | 'PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE',
 version: 1, receiver: {tabId, windowId, documentId, nonce}, ownerToken, domainDigest, challenge}
```

The receiver must already be registered with that exact original owner/domain/receiver; HOLD does not register or recover. challenge is a UUID, privately bound to one holder and retained in a bounded 128-entry rejection set with no eviction. The 30-second deadline is assigned locally, not supplied by the caller. Captured original Promise/then/Reflect.apply/timer/monotonic clock implement the new tracking protocol. Runtime sender id is captured at listener birth. Identity checks bind the original global document/location and exact URL plus original runtime object/id/sendMessage/onMessage/addListener. pagehide permanently retires this document's selection qualification. An individually disposed lane is not treated as physical document closure; shared pending work still governs.

Successful HOLD/FENCE returns only version, held, challenge, exact receiver, ownerToken, domainDigest and remainingMs. Failed acquisition/fence returns held:false. Exact release returns released:true once; foreign challenge cannot release another hold. Second acquisition refuses. Timeout, navigation, identity loss, pagehide or incomplete physical evidence invalidates the proof; admission stays closed until exact release. Release never replays work. The old shared constructor is never replaced on reinjection and cannot acquire a capability it did not implement.

HOLD waits original accepted calls, original registration/reconciliation and ACK publication. It rejects all retained legacy attempts (even locally successful ones) and any retained receipt without an exact private native terminal proof. Promise resolution alone, busy=false, empty worker maps, a new registration or a timeout never proves UNKNOWN settled.

## Critical scope distinction

Positive evidence covers only this known warm original document's tracked physical work since this adapter birth. No current production consumer sends these messages yet. It does not prove all documents or cold/legacy absence and does not change legacyCoverageUnknown. Original receipt ACK publication completion is distinct from durable ACK success: a verified native insertion whose ACK response is false may still be physically quiet locally; the worker's durable pending ledger remains independently blocking. A call interrupted during digest before a receipt record exists can be proven locally to have no later native entry, but no durable pending receipt is silently cleared. Future root composition must retain both checks and the all-document coverage barrier.

No draft, inserted body, URL, credential or account identity is returned in the new proof. Private URL binding is used only for in-process qualification.

## Verification and retained failures

Existing Node 22.23.3 binary, no download or install. The new test uses a private VM fixture copied from the original owning receipt test; shared harness unchanged. Runtime IndexedDB/browser/profile/provider not invoked.

1. Exact baseline adapter from git parent + first new positive hold control: **0/1**, exit1, 207.663042ms. baseline.log and baseline-adapter.js preserve actual old implementation failure.
2. First candidate, new 15 controls plus existing owning 77: **92/92**, exit0, 1537.750333ms. owning-first.log plus first-adapter.js.txt / first-test.mjs.txt preserve this source state. (Snapshots reconstructed by exact removal of final runtime-id binding and final three test blocks; no rerun.)
3. Runtime-id identity tightening and three added controls (ACK publication, second holder/malformed/identity, captured primitives): final complete new 18 + original 77 = **95/95**, exit0, 1618.175791ms, no fail/cancel/skip/todo. owning-final.log. Final git diff whitespace check passed.

Exact commands from the worktree:

```
PAIA_DOCUMENT_HOLD_SOURCE=work/prompt-document-selection-hold-20261025/baseline-adapter.js /Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test --test-name-pattern='prospective registered original document' extension/tests/prompt-composer-selection-hold.test.mjs
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test extension/tests/prompt-composer-selection-hold.test.mjs extension/tests/prompt-original-composer-receipts.test.mjs
```

The second command was run once on each stated source state. No full browser/CI/whole-product acceptance is claimed. Original native-entry and receipt owner tests remain unchanged. source-vector.json binds both changed files and the unchanged owning test; SHA256SUMS binds the evidence including all actual failures.
