# Default-off independent Topic identity qualification

Base: `a744705eb5f6216ca447a56d88905c370c64c573`. This is a bounded local synthetic implementation of the [identity issuer contract](TOPIC-IDENTITY-SOURCE-ISSUER-PROPOSAL-20261023.md) and [candidate lifecycle policy](TOPIC-LIFECYCLE-EXECUTION-POLICY-20261023.md), not real consent or production activation. The existing evaluator, original lifecycle writer, durable receipt owner and consumer remain the implementation owners.

## Consumed path and independent grants

`createTopicIdentityLifecycleDispatch` requires an actual original `LocalMaintenanceSession` prepared handle and an explicitly injected original `createTopicIdentitySourceProcessing` issuer. No default issuer is supplied. Its candidate policy is exactly `personal-topic-activity-v1`, 90 complete UTC days, at most 16 selected Topics. The existing generic dispatcher keeps its old explicit policy behavior.

The original handle selects only its already prepared structural, placement or bound mappings. The new path reuses the original maintenance field qualification owner and its original selected metadata request, then retains that genuine token for the entire lifecycle action. Selected Input bodies still pass through that independent field gate and are read and hashed by the original Topic processing guard. Identity authority cannot substitute body, structural, placement or bound field permission. Missing either grant refuses; plain Input-only handles cannot select a Topic.

The independent synthetic grant owner issues opaque tokens backed by its own private grant records and genuine deny-only cells. It is injected, never synthesized from maintenance consent or a public permission DTO. The exact frozen issuer, caller, store/database, private selection, original transaction, expected revision, stable action ID, restore epoch, shared budget, immutable grant generation, fixed expiry and synchronous retirement bind every source receipt. The original handle captures its exact restore epoch before preparation and retains the original planned authority. Admission compares that original authority, job items/coverage and cancellation epoch without refreshing the baseline; field and identity scopes must still match the original epoch before any identity grant acquisition. The empty request permit is minted only by the original session's admitted action. It cannot be copied or constructed from public selections.

This issuer reads a fixed metadata projection: selected Input revisions/removal/filter/Source pointers, Source index identities and tombstones, physical Source existence counts, restore/config facts and selected Topic identity/revision/lifecycle/locks. Physical IndexedDB row retrieval can contain other fields, which this issuer does not copy, hash or use. This is not a claim that the complete lifecycle chain has metadata-only physical I/O: the independent field path reads/hashes selected bodies, and the original activity/writer owners retain their documented physical row accounting.

The new adapter explicitly refuses a remote installation. The real `maintenance-source-processing.js` remains byte-identical, Input-only, selector-permit-bound and purpose-bound; it cannot issue identity authority or admit structural/placement/bound field preparation. The complete genuine production prepared-handle journey therefore remains unavailable. Synthetic prepared structural handles and independent synthetic field grants do not certify that production journey. `readMaintenanceServiceConfiguration()` remains `null`.

## Final facts and serial ownership

The same original `TopicProcessingAuthority` issues capabilities. Its only additional hook reads already-bound private deny-only facts after its existing dynamic clock and receipt checks. The denial leaf can inherit a bounded original parent receipt's already-private cells into a new immutable association. It grants no permission, invokes no callback, exports no cell records and permits no refresh. Copies, foreign stores/databases, retired parents, getters, duplicate parents and more than eight unique cells refuse. Existing three-argument binding is unchanged.

Each identity receipt inherits both its independent identity grant's deny cell and the exact original field receipt's deny cells. The original final facts sweep therefore sees replacement or retirement by a later field callback, identity callback or dynamic clock callback, even when no AbortSignal was fired. The association is never replaced with a new post-callback baseline.

Dispatch acquires its original serial lock synchronously, before awaiting action hashing or field qualification. A rejected second dispatcher cannot release the first dispatch's lock, and immediate maintenance execution cannot overtake it. Each action's operation ID is verified against the same original job, selection revision and complete candidate policy. Closing or disposing does not fabricate rollback. An already committed action with lost return replays its exact original receipt without reacquiring either grant or writing again. Earlier settled items remain settled if a later selected item fails.

## Bounds and remaining limits

The shared preparation ledger is the original Context qualification budget, not a new ledger per callback, Topic or retry. Its existing reference/hash/read limits remain unchanged. The new selection has a fixed deadline measured from original handle preparation, never more than 30 seconds; the identity grant can only shorten it. Grant acquisition is interrupted on source disposal/deadline and a late returned grant is released.

The actual lifecycle execution transaction still installs the original 4096-reference / 2 MiB / 30-second envelope before its first publication-prelude/receipt read. Identity final reads participate in that original physical accounting and also charge the shared qualification ledger. Foundation initialization, request hashing and separate preparation transactions are outside that execution envelope; this patch does not relabel the entire preparation chain as a 2 MiB transaction. The original selected activity projection must already be complete. No corpus enumeration, new activity scan, index rebuild or automatic follow-up request is added.

No worker, timer-driven dispatcher, provider, production policy, consent switch, real grant, account, schema, installation, deployment or GitHub workflow was enabled. The lease timeout only retires an existing synthetic use; it never schedules work. Version integration belongs to the coherent root integration, not a separate slice bump.

## Exact author evidence

Node `v24.19.0`, Linux cloud executor, synthetic fake IndexedDB only. Final runtime/test hashes are recorded in `scoped-files.sha256` in the author evidence bundle `topic-identity-evidence`. These are not native browser, platform-matrix, Full, real-provider or installed-product acceptance.

The complete final command, run from the repository root, was:

```sh
node --test --test-reporter=tap \
  extension/tests/topic-identity-source-processing.test.mjs \
  extension/tests/topic-processing-authority.test.mjs \
  extension/tests/topic-processing-guard-authority.test.mjs \
  extension/tests/topic-lifecycle-local-consumer.test.mjs \
  extension/tests/topic-lifecycle-dispatch.test.mjs \
  extension/tests/topic-lifecycle-source-processing-boundary.test.mjs \
  extension/tests/maintenance-processing-denial.test.mjs \
  extension/tests/ai-maintenance-processing-receipt.test.mjs \
  extension/tests/ai-maintenance-qualification-session.test.mjs \
  extension/tests/ai-cost-03-maintenance-session.test.mjs
```

Result: **435/435**, zero failures/cancelled/skipped/todo, exit 0, `75440.853442 ms`. The new identity file contributes 38 cases. `owning-final.tap` SHA256: `227f73c86e7362eadbe30273137e7cdbc3f41f687f0be7c5c895594dcc1baab4`.

`python3 scripts/check_package.py`, run from `extension/`, passed **24436 package guardrails across 679 runtime resources**. Static only. `package-check.txt` SHA256: `bf9097c6384b2b4656eadcae26379e4e4aaa1f0c3b8d6f9b1011e06f4d535773`. `git diff --check` passed.

Three genuine regression controls are retained separately; each deliberately removes only the stated correction, fails 0/1, and is restored before the final combined run:

- `identity-cross-original-fail.tap`: omit the identity raw deny hook. The last field callback retires identity generation without abort and the original transaction incorrectly commits. SHA256 `7c97e7360b0b5e0a85cfd165a8c541d7a3ef0c008691fd3928bb8a8e332e4b39`.
- `identity-clock-original-fail.tap`: omit inheritance of the exact field receipt's deny cells. The last identity clock callback retires field permission after its prior sample and incorrectly commits. SHA256 `5f07cf73386e4362e83106def415d37941de5071c732c211d16ee06d22d3f832`.
- `identity-serial-original-fail.tap`: move serial reservation after hash await. Immediate `session.run` enters instead of returning `REQUEST_ALREADY_IN_FLIGHT`; it returns `STORAGE_FAILED`. SHA256 `a9f64d9d29774b239bf0cbf10308fa2a60d7caa145387ef578dad4849df159fe`.

A fourth review-discovered boundary is retained as `restore-original-fail.tap`, 0/2, SHA256 `3172cb3dbf745a7a6daf4b59be14749560c2708070a18a4ea36dcffc346f074d`. A restore after handle preparation or between field qualification and first identity acquisition previously acquired a fresh identity grant and reached activity deferral instead of refusing the stale handle. It did not establish a lifecycle commit. The corrected cases refuse before identity acquisition; the separate focused positive/ACK/partial/restore result is 5/5. Earlier 433/433 evidence predates this repair and is retained as `owning-before-restore.tap`, not final evidence.

Earlier author failures are also retained, not called passes: `identity-first.tap` 9/11 exposed an incorrect public-job authority lookup; `identity-second.tap` 10/11 exposed a synthetic generation-change fixture capturing its generation too late; `identity-fourth.tap` 29/30 exposed a test constructing a second dispatcher during a correctly locked capture instead of before it. Corrected intermediate batches are separate from final 435/435 evidence.

Source issuer SHA256 remains `0ff0cd2c9f0f628a64455d5c6d3e13ecf662f5f85ed00b5edea6996e82c3ae54`; null configuration SHA256 remains `d94bc0c0e8ab1393a011822c4114176efcf724c8020459f1f70fac8fdd4e17a5`, both equal to the stated base. No browser run, release build, Full/Actions, 129-group/100k workload, real data, paid work or external publication was performed for this slice. Integrated native Source/Release verification and any eventual production grant/field owner installation remain separate gates.
