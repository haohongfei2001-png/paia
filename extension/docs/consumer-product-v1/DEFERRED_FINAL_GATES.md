# Deferred Final Gates — PAIA Consumer Product v1

This ledger records evidence or owner/external actions that remain mandatory for final certification but must not stall independent authorized engineering.

A ledger entry is never PASS. It may be removed only after the required evidence is completed or the product contract is explicitly changed by the owner.

## Open gates

### DFG-CPV1-001 — Same-ID signed consumer update certification

- **Owner round:** CPV1-01.3 — Consumer update flow
- **State:** EXTERNAL_CERT_PENDING
- **Reason:** no registered Chrome Web Store publisher identity / existing extension ID is currently available for a real same-ID signed distribution/update proof.
- **Still required:** real signed same-ID update preserving extension identity and local archive, post-update health, and rollback/update recovery evidence for the supported path.
- **Forbidden substitutions:** unsigned local install, a new unrelated extension identity, simulated store evidence, or a documentation-only claim.
- **Owner boundary:** do not create/purchase/register a distribution account, publish, or make a legal/public-release commitment without explicit owner authorization.
- **Non-blocked engineering:** CPV1-01.5 and all later canonical work whose implementation does not logically require this external result. CPV1-01.6 may finish all independent engineering/current-browser evidence while the same-ID distribution journey remains pending.
- **Final effect:** VS-01 and any package/release claim requiring consumer update certification cannot become COMPLETE/PASS until this gate closes.

## Continuous-execution rule

While any gate above is open, the manager must continue the engineering frontier through dependency-safe canonical work under `WHOLE_PACKAGE_PREAUTHORIZED`. Stop only after automatable engineering is exhausted or a true owner/safety/dependency gate makes further work impossible.

If later evidence falsifies an assumption made by downstream engineering, repair the earliest affected behavior and revalidate the downstream evidence that depended on it.
