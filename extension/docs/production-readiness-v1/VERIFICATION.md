# PAIA Production Readiness v1 — Verification

Passing tests is necessary but not sufficient. This matrix separates synthetic
engineering evidence, live-provider evidence, daily-profile durability and
product-use evidence.

## Mandatory gates

| ID | Gate | Evidence required |
|---|---|---|
| V01 | Exact source | remote `main` SHA and tree recorded for every certification |
| V02 | Required CI | current PAIA Certification required jobs pass on exact candidate/main |
| V03 | Capture regressions | current Capture Foundation targeted regressions pass with zero unexplained failures |
| V04 | Privacy/security | adapter/privacy/security and release guards pass; no new permission/provider surface |
| V05 | Current live ChatGPT | sanctioned real-site canary proves current ordinary user-message contract |
| V06 | Bounded capture reconciliation | every eligible message in declared live canary is durable or has explicit failure; no account-wide completeness claim |
| V07 | Forbidden-content exclusion | no assistant body, drafts, editor/keystroke, cookie, credential or unrelated-page content enters archive/evidence |
| V08 | Source identity / duplicate safety | reload/remount/navigation/restart does not create duplicate logical Source; same text with distinct source IDs remains distinct |
| V09 | Timestamp honesty | reliable live source time is preserved when evidenced; otherwise remains unknown; capturedAt is never substituted |
| V10 | Daily update/restart durability | existing daily extension identity/data survives updater, reload and Chrome restart |
| V11 | Recovery/rollback | failed/aborted update or capture state has a safe bounded recovery path without destructive guessing |
| V12 | Backup integrity | current Backup validates, restore into empty isolated profile round-trips supported durable domain state |
| V13 | Tombstone/authorization safety | restore/update cannot resurrect permanent deletion, credentials, old Grants or transient authorization |
| V14 | Scale | declared supported large-library capture/read/search/Backup-relevant SLOs pass without weakening a failed threshold merely for green |
| V15 | Failure visibility | adapter/storage/limit/failure states are distinguishable from success and expose no private body |
| V16 | Release parity | emitted release matches audited source behavior and release-product guards |
| V17 | Core-loop canary | real ordinary use includes capture then later retrieval/reread, with no recurring engineer repair |
| V18 | Retrieval value | at least one real recurring task is easier through PAIA than manual ChatGPT-history return, or package records a product FAIL instead of inventing success |
| V19 | Documentation truth | PRODUCT/ROADMAP/PRIVACY/BACKUP/development docs match certified behavior and explicit limitations |
| V20 | No scope expansion | no Semantic Engine/provider/sync/new truth-store/hidden-AI work entered through production-readiness scope |

## Certification states

### Engineering baseline PASS

Requires V01-V04 plus the round-specific automated gates.

This is not release-candidate or production certification.

### Release-candidate PASS

Requires V01-V16 and all earlier PRD rounds complete.

### Production certified PASS

Requires **V01-V20** and PRD-06 closure.

If V17 or V18 fails, the software may still be technically robust, but
`productionCertified` for the stated daily-use promise remains false.

## Live canary reconciliation boundary

A live canary must define before observation:

- exact conversation/scope type;
- start boundary;
- end boundary;
- what counts as eligible user text;
- what Source/snapshot states are expected;
- what privacy-safe evidence may leave the local machine.

The canary does not authorize retrospective account crawling.

A PASS means complete reconciliation **inside that declared window**, not "PAIA
captured every message the account has ever contained".

## Private evidence rule

Real archive/message bodies, titles, source IDs, URLs, cookies, credentials,
profile paths and Backup files must never be committed.

Permitted durable evidence includes:

- counts;
- fixed enum states;
- salted/non-reversible run-local digests where needed;
- pass/fail assertions;
- version/SHA;
- synthetic fixture identifiers;
- timing aggregates that do not identify private records.

If a useful proof would require exposing private content, keep the proof local and
commit only a sanitized receipt of the asserted invariant.

## Scale discipline

Historical failures are evidence. A later package may demonstrate that newer
architecture closes them, or may formally replace an obsolete benchmark with a
better production SLO. It may not erase the failed run or simply increase a
timeout until it passes.

Scale certification must state:

- fixture size;
- machine/runtime context;
- measured time/resource result;
- pass threshold;
- why that threshold represents a supported production boundary.

## Product-use discipline

PRD-05 is not a request to optimize engagement. A low return/reuse result is a
valid product finding.

Do not add notification, semantic ranking, automatic organization or more UI
solely to make the metric look better. Diagnose the actual friction first.
