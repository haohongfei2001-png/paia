# Warm reverse durable: cost and continuation blocker

Status: **NOT_INTEGRATABLE / success path not delivered**. Original 4,096 references / 2 MiB / 30 seconds remain unchanged. No positive retry is authorized for this frozen WIP.

## Evidence boundary

`accounting-positive.log` is the sole captured cumulative counter for the failed reverse: refs **1,574**, bytes **2,104,221**, failed=true. The 2 MiB limit is **2,097,152** bytes (7,069-byte overshoot detected by the existing charge and aborted transaction). The stack is the B terminal write in `settleReturn`, after the single awaited SDK set/readback. This is not a successful return. Per-phase actual counters, transaction write receipt, and A/B failure snapshots were not captured in that run. Do not reconstruct them as observations. `accounting-idb.txt` retains the temporary counter instrumentation; `pre-accounting-idb.txt` retains its preceding IDB bytes. The instrumentation was removed after the run.

The later `pre-dispatch-failure-safety.log` is a **different negative** after the mandatory minimum-cost check was added: no reverse SDK call, exact local row unchanged, all non-meta content unchanged, actual A/B intent markers plus A reservation retained, cold inspection/cancel zero mutation and zero SDK. It is not a rerun of the positive rewritten to pass.

`forward-cut-size.json` is one separately allowed fresh synthetic **forward-selected only** calibration (no reverse call). It observes 37 tables per repository, A 210 rows / 98,153 bytes and B 187 rows / 97,560 bytes. A forward marker is 2,807 bytes. B has no forward marker (the script's 32-byte value is the meter's undefined value, not a stored marker). B canonical metadata has 560 / 554 / 562 / 270 bytes for retirement / gate / qualified graph / protection. Calibration is not the failed reverse's per-phase byte record and is not a performance or native result.

## Exact source-path counts, with unobserved costs marked UNKNOWN

The final WIP successful path would execute the following in one original ticket. Original repository page request/result/continuation probes and finalizer work remain charged; comparisons charge the complete expected values. No actual counter has been collected for individual rows below.

| Stage | Complete raw scans | Explicit mutation in original transaction | Additional evidence and cost |
| --- | ---: | --- | --- |
| Reconstruct original private forward-selected expected A/B | 0 | none | Copy and charge both full retained cuts; hash every table and charge physical operand plus tagged UTF-8 encoding. Original before/reservation/fences/after/digest work also applies. Actual cost UNKNOWN. |
| Read registry, local and source control | 0 | none | Exact original registry/control/SDK operands; fixed source ticket. Actual cost UNKNOWN. |
| A prepared | 1 A full CAS | put exact v2 source marker | All actual rows and complete expected table operands; marker guard and final reads. |
| B prepared | 1 B full CAS | put exact v2 target marker; original gate finalizer | Three fixed active-preparation reads: registry two keys, B three keys, registry two keys. Child reads use same ticket/deadline. Original active finalizer remains. |
| A intent | 1 A full CAS | original control reservation/revision, full reservation and intent | Original reserve control reads and value comparisons; no restored old consent. |
| B intent | 1 B full CAS | put exact target intent; original gate finalizer | Same actual active-preparation/finalizer work as B prepared. |
| Before SDK | 1 A + 1 B full read | none | Exact registry, complete raw A/B comparisons and local before; mandatory lower-bound remaining-capacity check; final synchronous private identity check. |
| SDK and readback | 0 | one original SDK set | Original get/set identity, original actual promise, exact current control retained. No retry. |
| B returned | 1 B full CAS | put exact returned marker; original gate finalizer | Same fixed active preparation. Captured failed run reached this transaction and failed its budget. |
| A terminal receipt | 1 A full CAS | put protected receipt, delete exact reservation and marker | Original reservation owner/fences plus final native reads. Captured failed run did not reach this transaction. |

Total planned successful path: **6 full CAS transactions plus 2 full read transactions**, i.e. 4 complete scans of each repository. Every full scan reads all 37 tables, even empty ones. A single table is paged using the unchanged original reader; the known necessary reference lower bound is row count + 1 + 2*floor(row count/64), excluding additional marker/control/finalizer calls. One full scan+comparison costs both returned physical rows and its complete expected operand; these are distinct work and cannot be silently discounted as cache hits.

Using the calibration only as scale, four scans and corresponding comparisons on both A/B are approximately 1.56 MB before marker growth, page keys, active preparation, finalizers and hashes. Another retained-copy charge and hash-operand charge add roughly 0.39 MB. Tagged hash encodings and control work add further cost. This explains the architectural pressure; it is **not an exact failed-run phase accounting**, a proven complete lower bound, or permission to increase limits. There was no per-phase measurement.

## SDK-before-finish budget rule

The final WIP now checks that the same remaining ticket can at least cover the two mandatory terminal full reads and complete expected comparisons (plus necessary row/page/probe reference lower bound) before SDK dispatch. It does not charge a second reserve, refund earlier work, create a new ticket, or claim that this lower bound guarantees enough work for finalizers. The negative demonstrates refusal before SDK for this original fixture. The complete worst-case terminal cost has **not** been proven. A real reservation design must include all native requests/results, active repository preparation, marker/control comparisons, original finalizers and exact expected bounds; it cannot suppress those operations or reset a clock.

The protocol presently repeats a whole-cut comparison at each separately durable phase. These reads are actual CAS checks, not redundant mocked reads. Reducing them safely requires a proven original protection scope or a different reviewed durable protocol; no such substitution is implemented. Ordinary caller identity and process-local observations do not cover other database connections or global owners.

## Cold operation accounting

V2 markers have no durable cumulative accounting fields. Therefore a cold caller cannot infer remaining bytes/references or the original monotonic deadline. A fresh ticket must not finish/cancel the old write operation. Final WIP cold `continueReturn` is strictly readonly and says `completionRequired: original-live-work`; `cancelReturn` always refuses. A new independent readonly inspection may read control/registry under its own ordinary read budget, but obtains no write authority. No quota fields, migration, new budget, continuation issuer or refunded allowance have been added.

Warm original actual operation stays busy until its real SDK/native promise settles; timeout only rejects the observer. Failed/unknown intent is retained. Terminal-receipt cold-opening code is unfinished and unproven because no successful reverse has been produced. A complete safe recovery path needs a separately reviewed persistent continuation-accounting protocol or an authorized resource model; neither is silently assumed.
