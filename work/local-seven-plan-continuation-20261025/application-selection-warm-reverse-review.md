# Independent review in progress: warm reverse observations

Read-only design and initial implementation review against `warm-reverse-review`, base `5f0bab08e8812252c5abf0b49d3a7023d6ae0bf5`. No tests executed by this reviewer. Final frozen source/evidence review is pending.

The approved useful slice is the same original forward owner's read-only full-cut observation. The expected selected marker is derived from the original private prepared record and control fences; source raw rows gain only that exact selected marker, target raw rows gain only the original control revision and exact canonical gate writeRevision +3. All other original source/target rows and exact registry root/local control must remain unchanged. Original scope/graph qualification remains provenance, not a current global proof. Actual rollback remains refused.

## Required correction identified before final verification

The first implementation awaited original rows/local.get directly and only checked its work ticket afterward. An indefinitely pending final SDK read could therefore hang past the 30-second deadline. Root requires the same original ticket's remaining-deadline race, while preserving the underlying task's actual pending state. Timeout may reject the caller but must not clear busy, finish the original window, or permit a fresh ticket before that task settles. No token may issue on timeout.

## Explicitly accepted limitation

Original repository write observations are tied to a repository instance, not every connection to the same database. The forward owner's prepared target uses a distinct original opened repository instance. Another genuine store connection can therefore write during the final SDK await without changing that captured instance's write observation. The synchronous predicate must not be described as whole-database currency or reverse readiness.

Root explicitly accepts this bounded **captured-owner read-only observation** layer, provided the opaque token is never consumed as a rollback/hold/dispatch authority; an eventual consumer must perform the original owner's complete raw-cut/control requalification plus genuine global holds. The implementation must retain a real second-connection counterexample: the first run may return its old observation token after that late write, but the next complete raw requalification must refuse. No shared repository API expansion, implicit write transaction or invented cross-connection fence is permitted in this slice.

Final review must verify no existing authority map or dispatch/rollback path consumes the new token and must record the exact source/test/commit and actual separate test results.

## Frozen-source review completed

Reviewed runtime SHA256 `6cf4c571e5a9da59a2c044eaf322f8e0255448144fdbf9f2a93a964620b173e0` and new test SHA256 `525ae7d79799174f57409335e0f7c468d295100052b186b5807b6dbb0d27626a`. Frozen commit `90545bffbda366ca2b49ba64d00958ee8bda7251`, parent `5f0bab08e8812252c5abf0b49d3a7023d6ae0bf5`; working tree clean. All 10 manifest entries verified from their evidence directory. The exact command and exit code are recorded in `result.json`. No additional runtime blocker was found within the expressly accepted captured-owner read-only scope.

The deadline correction now races the same original ticket's remaining time. Timeout invalidates the review and rejects its caller, while `r.running`, owner busy and the original `withOriginalRecoveryWork` window remain until the actual operation settles. Late completion cannot issue a token or make the invalid observation current. A close during that final pending read likewise invalidates the owner but does not admit a replacement operation early.

The full physical comparisons preserve unknown rows and fields. The target transition is limited to the precise original selected control revision and canonical gate increment; the original source marker is derived from the original private prepared operation, exact after-control and original fence digests. Registry root and local control are compared in full. Expected operands, returned target rows, target page requests/probes, registry/key and local/key results are cumulatively charged to one original 4096-reference / 2 MiB / 30-second ticket. Target page request/probe counts use a conservative upper bound; these are resource charges, not measured native costs. Requalification retains this exact ticket, including its deadline and earlier charges.

The new private `reverseReviews` map is separate from selection mutation authorities, prepared cuts and restriction tokens. Search found no runtime consumer outside this owner, and no existing path uses a reverse observation token to acquire a hold, write a marker, dispatch SDK selection or authorize rollback. `rollback()` still unconditionally refuses. New/cold owners lack the original private prepared record. Unknown forward outcomes, source/target/raw/control/registry drift, altered SDK identity and copied/foreign tokens refuse. Observed identity loss is sticky for that token.

The concrete second-connection limitation is deliberately retained in the owning test: an actual other original target store writes a Working edit during the final local-control await; the captured-owner observation token can still return and its synchronous predicate can be true. The next full raw requalification rejects, retains the edited target and still refuses rollback. This is evidence against a global-current interpretation, not a removed negative or an accepted mutation authority.

Read the final owning log: five complete files, **63/63**, exit 0 reported by the implementation agent, TAP 17939.559084 ms, zero fail/cancel/skip/todo. The reviewer checked the 63-case log summary and final source hashes and did not rerun any test. Earlier baseline 0/1, first positive 1/1, initial controls 17/18 and corrected single control 1/1 remain separate evidence. The one initial controls failure expected the wrong error (`GENERATION_SELECTION_PENDING` rather than the actual original `STALE_BASE`); it is retained with its original test bytes. These are local synthetic Node checks, not native browser or reverse-product acceptance.

Final disposition: suitable for local integration as the bounded read-only observation layer above. Actual reverse execution, global writer closure and native acceptance remain unfinished; this review grants none of those claims.
