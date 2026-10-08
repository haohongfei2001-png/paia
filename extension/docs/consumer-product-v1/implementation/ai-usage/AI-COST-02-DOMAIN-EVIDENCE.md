# AI-COST-02 — local domain commit evidence bridge

Base: `13e01afe6c67fb70f845631adf6ee0d1b020ed1c`; isolated branch
`codex/ai-cost-domain-evidence-20261008`. This slice does not alter PR194,
existing foundation/atomic reservation/settlement, worker, Settings, Sync,
financial ledger, schema, CI, or provider dispatch.

## Contract and actual gap

AI_USAGE_ARCHITECTURE §§2, 3, 9 and 15.3–15.4 separate effective domain
results from financial authority. Current OrganizerStore creates AIUsageFoundation
without a production authority resolver. BudgetLedger remains bytes/session/day
accounting with `monetary:null`. FixtureAtomicReservation models a trusted service
contract; it is not a deployed service. Signed entitlement, trusted pricing,
account-wide reservations and billing reconciliation remain production gates.

`readDomainCommitEvidence(foundation, jobId)` uses one existing foundation read
transaction after `foundation.read` completes its existing `finishFoundation`
initialization/maintenance. The adapter itself performs no writes inside that
read transaction; this does not assert zero maintenance writes on every cold
foundation call. It reuses `current(t, job)` for current authorization, consent,
gate/restore/human epochs, evidence revision and source presence, then validates
all planned children and exact committed coverage against existing organizerJobs,
organizerUsage and organizerWorkItems. No extra job truth or durable receipt is
created. Existing opaque operation/parent/receipt identities must match; missing
fields are never supplied by a fixture-shaped fallback.

The adapter emits only a candidate: `CANDIDATE_ONLY`, `dispatchAllowed:false`,
`financialAuthority:false`, `executionKind:fixture`, body-free identity/epoch
metadata, a coverage fingerprint and exact child receipt bindings. It does not
sign a financial receipt, feed settlement automatically, grant entitlement, prove
model fidelity or count an effective financial result. No production caller is
connected. The consumer must independently bind any future trusted-service
proof; reading this DTO is not permission to send it anywhere.

Incomplete jobs/coverage/receipts return INCOMPLETE; unsupported/unknown execution
or mixed local/NO_CHANGE scopes return UNSUPPORTED. Entire local or NO_CHANGE
results return NO_EFFECTIVE_RESULT without a candidate. Missing production
authority, stale state and storage errors propagate fail-closed. Hashing occurs
after the read transaction, with no additional reads or body in output. This
fingerprint describes that transaction snapshot, not continuing authorization;
any future consumer must revalidate current state before financial admission or
protected use.

## Verification

Command from repository root:

```sh
node --test extension/tests/ai-cost-02-*.test.mjs extension/tests/cpv1-ai-cost-01-foundation.test.mjs
```

105/105 PASS, zero failed/skipped/cancelled, 1276.2245 ms, including 12 new whole
adapter tests. These use the actual OrganizerStore/AIUsageFoundation paths with
explicit synthetic authority and domain committer fixtures. The memory repository
is not native IndexedDB/service-worker termination or multi-device certification.

Covered: full child/coverage proof and restart reconstruction; partial and unknown;
local/NO_CHANGE; missing production resolver; edits/consent/human fence; source,
gate and restore epochs; absent/cross-job/cross-child/sequence receipts;
missing/rebound acknowledgement scope/signature; unsupported execution/missing
receipt; mismatched parent and reused receipt; one read transaction/no writes;
read failure; mixed NO_CHANGE conservatism. Output privacy and no mutation are
asserted. No model, paid request, account, key, network adapter or browser ran.

Preserved local logs (not committed): `work-domain-evidence-first.log` records
9 initial fixture failures because the new fixture assumed child order rather
than the existing canonical sorted child coverage. Correcting the fixture's
order yielded 9/9 in `work-domain-evidence-fixed.log`; added boundary cases and
all AI/foundation files yielded 105/105 in `work-domain-evidence-all.log`.
`work-domain-evidence-package.log` records the unchanged package guard result.
Independent review passed, including an independent execution of all 12 adapter
tests (12/12 PASS). Integration/current-main and future trusted service binding
remain pending. AI-COST-02 as a whole is not complete.
