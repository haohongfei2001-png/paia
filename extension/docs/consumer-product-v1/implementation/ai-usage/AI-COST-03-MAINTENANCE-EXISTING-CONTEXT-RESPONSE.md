# Maintenance source response for qualified existing Context Items — 2026-10-18

## Scope and authority

This P1 successor extends the frozen P0 source response boundary at local source baseline `8275d54b1061922aacf827ea3900fddaacf4a64e`. The original P0 receipt and its 137-test evidence remain historical, unchanged evidence for their exact source. This receipt covers bounded, independently granted existing automatic Context Items under AI_USAGE_PLAN §5. It is not a new provider, Context writer, permission, profile catalog, complete-profile regeneration or Sync scope.

The configured source decoder can now map UPDATE, NO_CHANGE and REMOVE_CANDIDATE only when the exact existing Item semantic DTO was sent in that physical child's `material.existingContextItems`. ADD and the separate original selected human-correction `contextItems` route remain intact. Unsupported or omitted response mappings produce exact DEFER coverage and never trigger paid replay. Later authority failures remain explicit failed/partial outcomes with no unsupported ACK. Packaged real-service configuration remains unavailable. No service activation, credentials, paid request, external repository write, deployment or installation was performed.

## Exact boundary

- The closed source wire schema is unchanged. Existing `itemId` is the stable wire target reference; `itemRef` is a bounded display label. The adapter compares the complete sent semantic DTO with the same child's private original snapshot, including that label, Item ID, revision, card, lifecycle, protection flags, body, section and any temporal projection. A repeated `c0` label across children cannot borrow another child's target.
- The provider receives only the independently selected bounded semantic Item DTO and a truthful selected-scope summary. Original epoch, association IDs, provenance, Source families and current original-owner evidence remain local. Neither a model ID nor a name authorizes an ambient Item lookup.
- UPDATE preserves exact original associations and expected revision. Current selected evidence comes from the captured original owner; existing human Topic/Section interpretation cannot disappear from the operation or borrow an omitted structural coverage unit. Invalidated revival requires the complete retained closure and a genuinely different evidence identity.
- REMOVE_CANDIDATE requires an active automatic, unprotected, unedited Item, exact revision and original associations, and complete original plus applicable invalidation lineage. It reaches the original automatic invalidation operation; it never becomes a human deletion or fabricated tombstone.
- NO_CHANGE checks only a real selected subset of the Item's registered prior provenance. Every checked Input/Entry/Placement/structure must have its own evidence. Unrelated coverage, a partial REMOVE request or a missing granted baseline stays deferred. The original no-change operation does not alter Item text, provenance or revision.
- An UPDATE with absent explicit temporal evidence contains no temporal field. The original owner therefore clears an old deadline for the new proposal. Sent temporal status remains exact through read and commit; crossing a Now deadline invalidates the prior interpretation.
- When an existing baseline is captured, the helper freezes all already independently granted selected Input/Source state needed by a subsequent exact original Topic publication. It does not add an Input to the grant or to the Item's prior/current evidence. A newly published whole-Input mirror therefore cannot conceal drift of that selected Input after Context mutation, receipt, ACK or counter writes.
- Original Context request byte bounds are preserved. A mapped existing command that exceeds the original request budget becomes DEFER; no schema depth, generic manifest byte ceiling, permission, token or financial allowance was increased.
- Validated mapping is not a successful mutation. The original Context owner, its final CAS/lineage fence and the exact joined ACK determine the actual outcome. Human/manual/protected/removed targets cannot become writable. The selected human-correction protected NO_CHANGE exception remains its separate original path.

## Lifetime and retry

The P0 per-child source-adapter Map cleanup is retained unchanged: successful final-facet decode, final-facet DEFER, invalid response, abort, lost currentness, explicit release and disposal erase the private registration. New helper snapshots and completed prepared/material state are managed by the original session, including per-child reclamation. A genuine storage rollback may retain only the validated local operation and necessary original private handles for the same CAS retry. It does not invoke the provider again.

## Verification

The final integrated original-owner publication-token/settlement tree passed **187/187**, with zero failures, cancellations or skips, under **Node v24.19.0** in **38.161 seconds**:

```sh
node --test extension/tests/maintenance-service-response-adapter.test.mjs \
  services/ai-gateway/tests/maintenance-client-path.test.mjs \
  services/ai-gateway/tests/maintenance-client-recovery.test.mjs \
  services/ai-gateway/tests/maintenance-source-response-path.test.mjs
```

The suites comprise 54 source-adapter, 35 client-path, 43 client-recovery and 55 source-path tests. The frozen P0 137 cases remain; 50 P1 regressions are added without removing or relaxing the existing source schema/profile, financial, protection or coverage negatives. Final log: `/tmp/paia-p1-source-final-187.tap`. A 372-file SHA-256 inventory (332 core JavaScript files, 36 gateway runtime files and the four focused tests) was identical before and after the run: `/tmp/paia-p1-source-final-before.sha256`, digest `29037acd51f6f7882b3dd3defb533368895ac830f60a16df6364bdf0d3d8b10c`; every check passed in `/tmp/paia-p1-source-final-stability.log`. `node --check` also passed for the changed runtime and both changed tests.

Tests are local synthetic execution of the actual source client, signed identity/declaration/ledger/provider parser, original Topic/Context/Filter owners and exact ACK/recovery. SQL and HTTPS provider transport remain simulated. No provider call left the local fixture.

The added cases cover all four ordinary operations, strict ID/revision/card/semantic matching, sibling children reusing the same display reference, full old-lineage REMOVE, proper-subset NO_CHANGE, Source-family substitution, manual/protected/edited/removed denial, human takeover after response, human Topic/Section interpretation, missing independent Item grant, revocation, Now temporal clearing and expiry, invalidated identity revival, final mutation races, validated storage retry and zero redispatch. Source payloads are checked to exclude local associations, epoch, Source identity and provenance.

Native browser/release parity, Node22, real PostgreSQL for these client fixtures, live-provider/tokenizer/semantic quality, installation and broad acceptance are NOT_RUN for this slice. Passing a schema or these synthetic tests is not live semantic or whole-programme acceptance.

### Tested source fingerprints

SHA-256 at the completed coherent 187-test run:

| File | SHA-256 |
| --- | --- |
| `extension/core/ai-usage/maintenance-service-response.js` | `80a8548d3efedb04c875e81379ccc81a0a92ddb699e40f64a51aeddb9b989887` |
| `extension/core/ai-usage/maintenance-service-client.js` (unchanged P0) | `f981925ed8505c3a8569e971776ea26677165c03a1154fcefc5d095392fe1eb1` |
| `extension/tests/maintenance-service-response-adapter.test.mjs` | `1236bdd251b89b741f55342b8938e7827018cc77bb7a98639c3104f388e11876` |
| `services/ai-gateway/tests/maintenance-source-response-fixture.mjs` (unchanged P0) | `c11e06b5525b5aef6f5e1d15b6421c50e07782ef5b0b02936caab94fa604663b` |
| `services/ai-gateway/tests/maintenance-source-response-path.test.mjs` | `36308d492c4c2d473ff62820e257d3c3d8f8938794de882d1c7ca5fa9bd596be` |

The dependent shared owner runtime at this test boundary was:

| File | SHA-256 |
| --- | --- |
| `extension/core/ai-usage/local-maintenance-session.js` | `8a41302c62208699d6658370725974a5f5648f3cf055dd39b5e9b530562944b1` |
| `extension/core/ai-usage/maintenance-payload.js` | `e4bea8e3e7ebf6c477ec4c2c01cb00f6551229e274c29b090a633c6e7e90f4fa` |
| `extension/core/ai-usage/maintenance-existing-context.js` | `54c081ea786af3252bd1869e7adc6b1303547e61f5421f526bfca9531ae38b92` |
| `extension/core/context-maintenance.js` | `5b41179f885cd17b1420711e99369981bdeb10250ab9e4e10093f2da4bfa4232` |
| `extension/core/context-item-lineage.js` | `b36a0210e6e785aaabb357588699de36f40ea4f9871c12cd075b77f834ff29e4` |
| `extension/core/topic-formation.js` | `c01abfa776f9aba4b08feaf8dfb7b31f53b261fe5326a6ebcd4b1b116781d629` |
| `extension/core/idb-repository.js` | `f646f63dd0db3fcd9bdac863466c364343f6f4088ff2b8b2c90bbd3be9f4acbd` |

## Development findings retained

- Early new test oracles counted all historical/blocked work as the current source result. The original result truthfully reported aggregate PARTIAL with `processedState: COMMITTED`, and exact facet DEFER counts distinct from old blocked units. Tests now identify the actual current job and exact coverage; production outcomes and assertions about no extra provider calls were not weakened.
- A new multi-child probe exposed an empty first-child existing snapshot still being checked against pre-Topic admission authority during later-child preparation. The helper/session owners own the exact repair; selected semantic snapshots are not refreshed or weakened to admit sibling writes.
- A same-Input extra-membership injection after real Topic completion is retained as a negative source control. Its refusal alone is not claimed as reproduction or closure of the independent reviewer's more precise settlement-closure finding.

- A separately generated partial-Input excerpt Entry is not a whole-Input mirror and has no independent pre-send Entry-field grant. Its two source regressions explicitly prove the existing joined Topic fence refuses and rolls back that transaction with zero current-job ACKs; they do not claim Topic completion or a committed DEFER. This remains a bounded-composition limitation for a subsequent semantic matrix, not permission to read new Entry prose. In contrast, two real whole-Input positive cases use only independently selected Inputs and prove the original Topic creates exact Entry/Placement/dependency/provenance rows before old-Item UPDATE or NO_CHANGE, with the unrelated new Input Context unit explicitly deferred.
- The new selected-Input graph tests exposed a genuine final-fence gap: a newly added, already granted Input was outside the old Item's prior evidence and initial helper snapshot. Six source transaction probes (Working/Source drift at original Context receipt, ACK and NO_CHANGE counter) recorded an erroneous Context ACK. The RED process started at 19:27:03 UTC and finished its 4.062-second run before the helper capture change at 19:27:09; its log is `/tmp/paia-p1-source-new-input-drift-red.tap`. The later-read helper hash is not attributed to that old loaded module. The bounded helper fix freezes the whole already-granted selected Input set without changing Item evidence or any limits. The same six tests then passed, retaining the two prior Topic ACKs while rolling back the Context mutation/receipt/ACK and injected bytes. The final 187-test run includes all six and both genuine whole-Input positive controls.
