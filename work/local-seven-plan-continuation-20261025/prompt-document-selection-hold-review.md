# Prompt document selection hold — independent frozen review

Reviewed 2026-10-25, read-only; no test, browser, network, CI, or runtime mutation performed by reviewer.

## Candidate and conclusion

Frozen candidate `f329bd3ab94a4532948dbb3fdea9c556503151c7`, base `239041b`, in `prompt-document-selection-hold`; HEAD confirmed and working tree clean. Reviewed complete adapter delta, new VM controls, original insertion/receipt/registration paths, report, source vector, and final log. No blocking defect found within the prospective, already-registered original document scope.

This is a physical document admission/drain/fence capability only. It does not establish durable worker ACK, complete host inventory, historical legacy/UNKNOWN settlement, financial settlement, or permission to activate global selection. No receiver driver or production activation gate is supplied by this candidate.

## Safety checks

- `chatgpt-composer.js:13-45`: exact receiver/owner/domain/challenge binding, original document/location/runtime identity, original monotonic 30-second deadline, sticky observed invalidation, bounded no-reuse challenge history. One holder only; duplicate/foreign holders cannot refresh or release it. Original failed or expired holder can explicitly release using its exact binding; release supplies no quiet proof.
- `:293-296`: accepted insertion is registered synchronously in the original private pending set before its async body. Held admission is rejected. Only actual settlement deletes its own token; no timeout map clearing or Chrome-side cancellation claim.
- `:327-349`: pre-native digest and qualification gaps recheck admission serial/hold; already-issued native insertion retains its original verification, listener cleanup, and ACK path. The hold waits for actual insertion and ACK-publication promises. Native UNKNOWN and legacy attempts do not become positive quiet evidence.
- `:20-21, :155-180`: original registration and receipt publication remain part of drain; a held document cannot start receiver re-registration through PROBE. Receipt retirement/reconciliation can finish, but identity and serial are rechecked before ready/fence.
- `:197`: pagehide permanently retires this document's qualification. Restoring an observed changed URL/runtime does not restore a sticky-invalid holder. Lane disposal alone is not misrepresented as document closure.
- Pending release followed by a new hold preserves actual pending tasks. Old completion cannot clear a new holder or revive the old admission serial. Failed acquisition remains closed until exact release.
- Promise/then/Reflect.apply/clock/timer primitives are captured at birth for this protocol. Existing shared adapter constructor is reused rather than replacing or upgrading an already-loaded old document into a new qualification.

A physically terminal result whose ACK publication promise has returned a negative response may qualify physical quiet. This is intentionally narrower than durable ACK success; the independent worker receipt owner must still reject unresolved durable state. The new control explicitly exercises this distinction. A future driver must reject expired/zero remaining time and independently bind its complete inventory, original worker owner, and common deadline; it cannot treat this reply as a global capability by itself.

## Evidence accounting

- Baseline new positive control: `0/1`, exit 1, 207.663042 ms, retained.
- First implementation owning combination: `92/92`, exit 0, 1537.750333 ms, retained separately.
- Frozen final owning combination: `95/95`, exit 0, 1618.175791 ms, no failure/cancel/skip/todo; final log tail independently inspected. These are local synthetic VM/Node controls, not native browser acceptance.
- Final adapter SHA-256: `962891579c916995ecabef557604dfd59b9f96c55f578373ee9358f4bb711c4b`.
- Final new test SHA-256: `4d6e61a3a84628c79b412f0920bb7fb676162a12319ccb9faf840c15a577144e`.
- Original owning test remains `66a3fc3a648d892a4a8acf1c4277e953bcac3780a9be3b15ffe1789050b7c056`.

No historical execution allowance is renewed by this review. Existing budgets, UNKNOWN barriers, and closed global activation gate remain required.
