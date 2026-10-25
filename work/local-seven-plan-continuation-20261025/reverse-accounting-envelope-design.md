# Reverse accounting envelope: source-derived engineering contract

Scope: read-only analysis of `warm-reverse-durable/f19171d3c3f612c298fa3dd84e9d1a1f79934601`, its retained failure evidence, and `reviews/reverse-continuation-next-scope.md`. The clone remains clean at that SHA. No runtime changes, test execution, replay, SDK/native/browser/network or budget change occurred. This report supersedes the earlier report only where its more detailed accounting identifies the duplicate protection charge and corrects exact page-reference arithmetic.

## Decision

Keep the reverse archive **HELD / NOT INTEGRATABLE**. A complete, computable **stable-data reference/byte cost** can be expressed from the original retained cuts and deterministic phase records; the six-write protocol is finite. That is not yet a sufficient unconditional completion guarantee: subsequent actual rows, registry/SDK results and physical settlement time are not bounded by the retained cut. There is no durable original accounting/deadline continuity. Current successful reverse and completed-receipt cold-open remain unproven.

The useful next implementation is a private exact cost interpreter/admission contract, plus narrowly proven metering corrections, under the unchanged 4096 references / 2,097,152 bytes / 30-second ticket. It must fail before SDK if it cannot prove the entire remaining accounted envelope. It must not label an insufficient lower bound a reservation, remove full CAS, or convert old UNKNOWN into success. A separate product/resource decision is required if the intended feature must finish an expired or oversized original operation after a cold restart.

The measured failure (1574 refs / 2,104,221 bytes) occurred in B terminal after SDK, before A terminal. 7069 bytes is an observed overshoot at that point, not the full shortage. No numbers below reconstruct missing per-stage observations.

## 1. Units and primitive costs

Use vectors `(request references, charged bytes)` with component-wise addition. Let `M(v)` be the exact original `measureSourceWorkingPhysicalTree(v).B` (`source-working-physical.js:29–49`), including own undefined (32), signed zero (32), UTF-8/escaped text and array/object punctuation. This is the owner's finite operand/result accounting, **not heap allocation, network bytes, disk bytes or elapsed time**.

| Primitive in frozen code | Same original recovery ticket cost |
| --- | --- |
| `V(v)` explicit `returnCharge(v)` | `(0, M(v))` |
| `G(k,v)` original `tx.get(k)` returning v | `(1, M(k)+M(v))` |
| `W(v)` original `tx.put(v)` | `(1, M(v))`; result key is not charged |
| `D(k)` original `tx.delete(k)` | `(1, M(k))` |
| `K(keys)` original bounded `tx.keys` | `(1+keys.length, sum M(key))` |
| `N(n)` terminal native count | `(1, M(n))`; range operand not separately charged |
| `L(row)` `returnLocal` original SDK get | `(1, M(STORAGE_KEY)+M(row))` |
| `E(v)` expected full comparison operand | `V(v)`; actual reads were charged separately |
| `Hc(v)` `returnDigest` | `(0, M(v)+UTF8(controlPublicationEncoding(v)))` |
| `Ht(table)` `returnHashes` per table | `(0, M(table)+UTF8(private tagged structural encoding(table)))` |

Implementations: `idb-repository.js:150–177, 437–439, 473–511`; selection `:399–410, 425–429`. Root ticket and transaction `workLimit` both accumulate the same operations; the transaction tally is not another debit of the root ticket. Re-registering a limit only tightens it and does not refund/reset consumption.

There are additional **independent restriction meters**:

* `groupTransactionPageBudget` is one per full-read transaction, shared across its tables. `groupTablePages` adds one local reference and M(row) per row and a separate requests count per page. This repeats physical measurement, but does not debit the root ticket a second time. Its own 4096/2MiB/30s limits must also pass.
* Every active B preparation creates its original group-page budget and charges three returned composite values (first root, selected gate/protection/qualification, last root), using its strict encoding. The nested IDB point reads already debit the root ticket. These local restrictions cannot be deleted because the aggregate formula fits.
* Structural and control encoders have their own schema/depth/node/string constraints. A mathematical byte total is insufficient if any constituent value is invalid or exceeds its individual meter limit.

### Exact full-table read

For sorted rows `r1…rn`, page size 64:

```
p(n) = max(1, ceil(n / 64))
h(n) = floor(n / 64)
P(table) = (n + p(n) + h(n),
            sum_i M(ri) + sum_{j=1..h(n)} M(nextKey_j))
```

Every full page performs a key-only probe. `nextKey_j` is the next row's primary key when present and `undefined` after an exactly full final page. A short final page has no probe. Empty tables still incur one request. `primaryRangePage` does not charge a whole returned page array; `readGroupRows` likewise does not charge the assembled whole table on the root ticket until comparison/hash code explicitly does so. See IDB `:496–506`, group reader `:21–34`.

For raw cut X, let `P(X)=sum_tables P(X[table])`:

* `C(X)=P(X)+sum_tables E(X[table])` is a full CAS callback's read+comparison cost.
* `Q(X)=P(X)+E(X)` is a whole raw read followed by `returnEqual(actual,X)` outside its transaction.

The existing minimum helper uses `n+1+2*floor(n/64)`: correct for nonmultiples/empty tables but one reference higher than the exact formula for every positive multiple of 64. Its byte component still omits probes and all wrappers/finalizers. Thus the entire helper is not formally an exact necessary lower bound in both dimensions; it remains an insufficient completion test. This correction does **not** authorize weakening checks or a positive rerun.

## 2. IDB wrapper and active preparation are part of every phase

Notation: `m` selection marker key, `c` protected return receipt key, `p` canonical protection key, `g` canonical gate key, `q` qualified graph key. Use actual row values before/after each transaction, including undefined; do not substitute string lengths or raw DB size.

### Common selection wrapper, all six writes

`beginSelectionWrite`, `finishSelectionWrite`, and its terminal read plan (`idb-repository.js:190–201`) cost:

```
S(m0,c0,m1,c1) = G(m,m0)+G(c,c0)
                  +2*G(m,m1)+2*G(c,c1)
```

That is six actual gets: two before callback, two after callback, two in the terminal generator. A terminal receipt must be included at its full size in the A terminal post-callback and terminal reads, not merely its initial put. No repeated read can be replaced by an earlier observation across these boundaries.

### Ordinary original A shadow wrapper

For this selected-forward profile A has no canonical protection/binding. `beginShadowWrite`, `finishShadowWrite`, terminal plan give:

```
SA = 3*G(p,undefined)
WA(callback) = S + SA + callback
```

An A that is actually protected/bound does not qualify for this formula; use its actual original authority path or refuse. The private identity check alone does not establish the absence of that protection.

### B active preparation, before EACH of its three native writes

`canonical-generation-publication.js:235–246` and `rootRead:62` do **seven** same-ticket point reads in three readonly transactions:

1. Registry root AND that root's active receipt.
2. B gate, B protection, B qualification.
3. Registry root AND the active receipt again.

For current registry root R/receipt J and current B rows:

```
PB = 2*(G(registryKey,R)+G(J.id,J)) + G(g,g0)+G(p,p0)+G(q,q0)
```

These children are allowed only during the exact parent token's preparation. The parent `pending` remains owned until all children/outer work settle (`idb-repository.js:562–600`). No parallel child or cold ticket is implied. This preparation precedes the native full CAS, so it must be in the completion envelope even when the final full CAS rejects.

### B shadow wrapper and finalizers

Let Z be the complete `canonical-generation:` key/row collection in the same native transaction; Z' is the collection with only g.writeRevision incremented once. Let z=Z.length. The frozen cost is:

```
SB = 2*G(p,p0) + G(g,g0) + G(q,q0) + K(keys(Z)) + sum_Z G(key,row)
     + G(p,p0) + G(g,g0) + W(g1)
     + N(z) + sum_Z' G(key,row)
     + G(q,q0) + G(p,p0) + G(g,g1)
WB(callback) = PB + S + SB + callback
```

`SB` has `12+3*z` root references before the callback. The common selection wrapper adds six, preparation adds seven. This count includes actual key-cursor results, one terminal count, qualified graph recheck, protection/gate terminal reads, and original gate write. Source: IDB `:202–228, 280–311`.

**New narrowly removable duplicate discovered by this audit:** the initial `2*G(p,p0)` is one actual get followed by an explicit bootstrap debit (`:207`) for the same key/result. That second debit is needed for historical paths where the protection get happened before a work limit existed; here the same-ticket limit is already installed at `:600` before `beginShadowWrite`. A proven conditional “initial protection read was already metered by this exact scope” branch could remove exactly one `(1,M(p)+M(p0))` per B write, without removing any request, comparison or guard. Three B writes save at most their three such debits. This is a candidate correction, **not implemented/tested** and not proof of fit. It refines the previous report's statement that no metered duplication had been identified. Generic suppression whenever a caller says “metered” is unacceptable.

### Finalizers that are zero only for these exact keys

Reverse puts/deletes only selection marker, return receipt, local-control revision/reservation; B additionally writes canonical gate. They do not enter semantic delta (only generic `gate`/restore epoch, Context/constraint/Input/revision keys), navigation (document/ANS keys), or backup meta allowlist. Thus `flushNavigationWrites`, `flushSemanticWrites`, and backup-generation update issue zero additional requests for these six callbacks. This was checked against actual classifiers, not inferred from “metadata”. A new accounting key/schema or any broadened mutation must be classified again. A new `gate` write, for example, would invalidate the zero assumption.

Native completion, abort listener cleanup, authority sampling and busy/pending release add time but no current operand/ref debit. Every registered terminal generator runs once in sequence through the original methods; it is not an extra full-table scan.

## 3. Six exact durable stages and one SDK boundary

Let A0/B0 be reconstructed original forward-selected expected cuts. Transform expected metadata only after each real successful write; retain all other rows/order. Let A1 be A0 with source prepared marker, B1 B0 with target prepared marker/gate+1; A2 adds source intent/full reservation/new revision, B2 adds target intent/gate+2; B3 adds returned target marker/gate+3; A3 removes source marker/reservation and adds protected return receipt while retaining current revision. All markers embed the full forward record and per-table hashes; account for that growth.

| Stage | Full current comparison | Callback cost beyond `C(X)` | Wrapper |
| --- | --- | --- | --- |
| 1 A prepared | C(A0) | W(source prepared marker) | WA with actual pre/post marker/receipt |
| 2 B prepared | C(B0) | W(target prepared marker) | WB, g0→g1 |
| 3 A intent | C(A1) | K(empty consumer pending keyset) + F(A1) + W(new revision) + W(initial reservation with null hashes) + E(initial reservation) + W(full reservation) + W(source intent) | WA |
| 4 B intent | C(B1) | W(target intent) | WB, g1→g2 |
| 5 B returned | C(B2) | W(target returned marker) | WB, g2→g3 |
| 6 A terminal | C(A2) | F(A2) + W(return receipt) + D(reservation key) + D(marker key) | WA; post/terminal receipt gets use full new receipt |

`F(X)` is exactly five gets: local-control revision, reservation, migration, generic gate, recovery-restore epoch (`local-control-publication.js:32–52`). Stage3's consumer pending lookup uses an exact-key key cursor (empty costs one ref/zero bytes); an existing key causes refusal. Stage3 really puts the reservation twice (initial null-digest version, then complete version); those are two original calls, not a duplicate to erase. `controlPublicationEqual` encodes its operands for equality but currently does not explicitly debit those encoded strings; see the accounting-model gap below.

Outside these six callbacks, account for these exact operations in source order:

1. `originalReverseExpected:287–297`: V([old control, original forward reservation, forward fences, expected forward after]) and V([A0,B0]). Two forward digest encodings/hashes are performed, but no separate encoded-byte debit is made here. No IDB scans in this reconstruction.
2. Registry point read + E(expected registry root); L(current SDK row) + E(expected forward after); F(A0).
3. Hc(current before), Hc(new after), Hc(fences); sum Ht(A0 tables) + sum Ht(B0 tables). No fixed guess for record size: construct the exact finite phase records and size them, or a proven max-length representative with fixed digest/UUID lengths and maximum valid numeric width.
4. After stage4, registry point read + E(root); Q(A2)+Q(B2); L(before) + E(before).
5. One original SDK set of `{[STORAGE_KEY]:after}`; await actual promise; L(after readback). SDK rejection is caught but never retried. That set currently has no separately applied same-ticket request/operand debit. A successful compare at this point uses `equal` directly, not `returnEqual`; its expected operand is not newly debited.
6. `settleReturn:453–468` before stage5: registry point read + E(root); L(after) + Hc(after); one B marker point read. The usual intent comparison uses direct `equal` (no explicit E charge). The already-returned-marker alternate branch adds E(terminal marker), skips stage5 and its wrapper, and still must verify A. For a conservative fixed branch envelope take component-wise max of both branch expressions rather than treating the alternate as a successful retry authorization.
7. After stage5: L(after) + Hc(after); V(new return receipt); stage6.

Therefore a computable stable-data cost is:

```
C_stable = C_preparation_operands_and_hashes
           + sum_{i=1..6} (W_A_or_B_i + C(cut_i) + callback_i)
           + C_preSDK_full_reads_and_points
           + C_SDK_boundary_as_currently_metered
           + C_settle_points_digests_receipt
```

Here `W_A_or_B` means the wrapper-only expressions above, not the put primitive W. Each term has been enumerated; an interpreter must use the actual exact key sets and sorted row primary keys, not 37 times an average table. There are six full CAS scans and two pre-SDK raw scans, four scans of each library. Successful path has three explicit registry point reads, five `returnLocal` SDK gets, three control-fence blocks (15 gets), and the B target-marker point read, in addition to all wrappers and B preparation.

The **remaining** pre-SDK formula must start at step5, include both stage5/6 wrappers, their two full cuts, B preparation, all subsequent readbacks/digests/receipt and the original set's chosen accounting rule. The current minimum helper includes only part of the two full-cut terms. Full receipt fields grow the A terminal wrapper and retained B rows; never count only the put value.

## 4. What this formula proves, and what it cannot

### Fixed, source-computable quantities

With exact retained A/B cuts, original registry/receipt rows, current control/fences, fixed stage transforms and all method identities held, the reference/byte expression is finite. Phase UUID/digest sizes are fixed; safe integer widths can be bounded conservatively before generation. Current protection collection, schema stores, table row counts/keys, receipt nesting and undefined results are computable. Cost of an unchanged successful path and any early **prefix** refusal on that same unchanged data can be bounded by the full path. Failed transactions do not refund request/result/operand work. A failure after SDK retains whatever original markers/reservation committed previously; keeping already-written rows costs no new write, but their repeated later reads are already in the formula.

### Actual changed values invalidate the stable-data bound

A/B full CAS does not lock the other DB or registry. Another original connection can enlarge a row or change a canonical key collection between phases; the code can read/meter that different value before failing equality. SDK readback can also return a differently sized row. Thus `C_stable` is not an upper bound for all failing paths. The ticket remains a refusal meter, but that is not proof that terminal completion budget is reserved.

The broad schema/meter maximum (up to a per-value 2MiB physical tree, 4096 permitted collection entries, many repeated operations) gives a finite but unusably large worst-case structural bound, not a sub-2MiB sufficient envelope. Do not substitute the last observed row's size for the future actual value. A bounded completion profile needs either actual original protection of all relevant mutable state or operation-specific pre-admission limits that reject growth while preserving each full comparison. Those are implementation proofs still absent; no generic callback/“ready” token can create them.

Counter exhaustion itself is post-increment. `chargeOriginalRecoveryWork` retains the offending debit before rejecting. A physical meter may reject a value during measurement before a byte total is returned; CPU traversal and already materialized native clone are not thereby free or undone. The 2MiB meter is not an absolute peak-memory allocation ceiling. A new prepaid envelope must make its claim precise and retain exhaustion/abort outcomes, not infer success from the counter stopping.

### Time and crash remain independent

No source bound guarantees SDK or IDB completion within the remaining 30 seconds. The timer rejects the observer; `runReturn` keeps real pending work/busy until the actual promise settles. An SDK promise may never settle. Native abort/completion dispatch and browser scheduling have no proven finite upper bound here. Even a fully sufficient byte/ref estimate cannot promise successful finish; an actual storage failure must remain UNKNOWN with durable restrictions.

The private deadline is `performance.now()` based and lives only in a WeakMap. A cold process cannot reconstruct it, distinguish wall-clock rollback, or infer how much unobserved work consumed a failed lease. Current cold continuation only reads; a new read ticket is not continuation quota. Passing 2MiB after restart does not make an expired 30-second original task live again.

## 5. Accounting itself: required closed cost contract

Current source has no durable spent/reserved/lease fields (`reverseKeys:365–371`, `returnWork:380–398`). `requireOriginalRecoveryWorkCapacity` only checks remaining capacity; it neither reserves it nor persists it. `committedWork` is emitted only after successful native completion and cannot account for aborted/crashed work. Therefore there is currently **no numeric durable accounting self-cost to add**; presenting one would invent a protocol.

A future same-task ledger design needs a bounded, original-owner-protected record with exact operation/A/B/registry/control binding, protocol version, fixed phase enum, monotonic accounting revision, consumed-or-reserved refs/bytes, one unresolved lease and clock qualification. A fixed-size record can include the size of its own numeric fields: use worst valid widths for counters/revisions/IDs and solve inequalities below, not recursively create a new “accounting of accounting” record.

For a selected design with protected account record a and exact phase ledger operations, let `J_i(a)` be all **additional** get/put/comparison, selection/shadow/finalizer, page-row/keys/hash costs caused by reserving/retaining/closing that account. This is not just M(a): if a is part of each full cut, it is read and compared at every later phase; a dedicated transaction also gets the full original wrapper. If co-written in an existing phase, count the changed snapshot/hash and put, but do not duplicate the entire wrapper. Classifiers must be rechecked. The initial durable reservation must conservatively include work already needed to establish it, since a crash before its ACK cannot refund that work.

A correct envelope has to satisfy, for every stage and allowed failure branch:

```
remaining_original >= reserved_stage + reserved_remaining_terminal
reserved_stage >= max(actual_stage_prefix + J_stage + bounded_failure_record_cost)
C_whole = C_original_path + sum J_i + all added measurement/encoding costs
C_whole.refs <= 4096; C_whole.bytes <= 2097152
```

The maximum must use field maxima and exact native operation lists. A lost reservation ACK spends/holds the full claimed envelope; no retry, reclaim, mirror-counter majority or partial native receipt refunds it. One exact account home is necessary: independent A/B counters are not atomic. Original marker/lease revision links must identify every partial pair. Failure bookkeeping has to be prepaid within the same account; when no failure-write allowance remains, retain the last durable restriction and report UNKNOWN, not try one unmetered cleanup write.

Important gaps for the estimator/implementation to resolve explicitly:

* Selection `originalReverseExpected` performs two encoded digests without separate encoded-byte debit, unlike `returnDigest`.
* Raw SDK set has no local operation debit; direct `equal` calls and control-owner encoding comparisons use a different debit convention from `returnEqual`/`returnDigest`.
* `returnDigest` encodes once for charge and again inside digest; the second encoding is real CPU work, but currently only one encoded-byte debit. Reusing the identical already-validated encoding could save CPU, not recorded bytes.
* Group-page and active-preparation independent meters repeat measurement/encoding but are not aggregate root debits. Specify whether the resource contract intentionally counts operands/results only or all traversals; do not silently declare the existing counters a complete heap/CPU theorem.
* Added exact-envelope evaluation itself traverses values/constructs bounds. Under this task it has not run. Future private implementation must either piggyback on already-required measurements without replacing verification, or charge its actual bounded operands/encoded representations. A preparatory pass outside the ticket followed by a fresh ticket would hide work.

These are a finite engineering accounting closure task; none is permission to discount actual safety reads. A complete source calculation may prove a given small cut cannot fit before any SDK or six-phase writes. That useful negative does not require rerunning the old positive.

## 6. Unchanged-budget subrange and single decision package

A **conditional local subset** can be defined without weaker validation: only original selected-forward owners whose exact complete cuts, all wrapper metadata, and a fully closed cost formula fit the unchanged ticket, with all remaining operation-specific bounds proved. It must retain all tables/rows/guards and same 30-second lifetime, use no extra reads outside its accounting, and refuse before SDK if data/identity changes or bounds cannot be established. This is not a “smaller dataset test passed” permission to advertise every archive.

No nonempty successful reverse subset is presently proved by retained evidence. The calibration contains sizes, not full phase snapshots and accounting rules sufficient to close the formula. The 7069 overshoot and the roughly 0.39MB retained-copy/hash estimate do not establish either that a small valid library fits or that no possible valid library fits. A pure estimator can determine byte/ref eligibility for actual exact records; successful execution, native semantics and elapsed-time qualification remain separate later work.

### Can proceed as ordinary local engineering, without changing authorization

1. Implement/review a pure private cost interpreter for the enumerated same-ticket operations, with explicit per-stage vectors, exact key probes, marker/receipt growth, active prepare and terminal fences; no DB/SDK execution by this estimator. Finite synthetic accounting/equivalence controls may be proposed, but none were run here.
2. Prove the conditional protection-get accounting correction against the original unmetered-bootstrap and already-metered paths. Keep the actual get and all fences. Preserve both old behavior profiles in controls.
3. Close the SDK/digest/comparison accounting convention in the same original owner, conservatively adding missing charges where required; no allowance increase or removal of full CAS. Compute/account for the estimator's own work.
4. Replace the insufficient pre-SDK minimum test only after a sufficient allowed-input/remaining-path bound is proved. Until then no executable completed reverse claim. Cold pending remains read-only; ordinary production RPC/global gate stays denied.
5. Design a versioned durable ledger under the same limits with no legacy upgrade/top-up. It is implementable locally as a restrictive protocol, but cannot by itself authorize expired cold write completion or make an oversized path fit.

### Requires one explicit user decision if demanded by the product goal

* Any increased reference/byte/time allowance, additional retry/settlement budget, conversion of 30 seconds to active time, or cold operation that writes after the original deadline cannot be inferred from local development permission. Present a concrete closed stage/accounting envelope and failure stop rules first; do not ask for arbitrary 8MiB/120s or an observed overshoot plus margin.
* If the product accepts “unsupported exact budget profile / unresolved old return requires separate recovery”, no resource expansion is required; that is an honest functionality limitation, not completion of reverse.
* Existing old v1/v2 unresolved rows lack original durable accounting and deadline evidence. They must not be migrated, granted remaining quota, automatically cancelled or replayed. Any separate recovery contract must preserve original UNKNOWN until independent durable proof.
* Native/browser/cloud acceptance limits remain separate. This read-only contract supplies no new execution allowance.

### Stop conditions

Stop before SDK and retain/report the exact state if any expected row/key collection/schema cannot be bounded, account reservation is ambiguous, shared ticket is exhausted/failed, original identity/phase changes, or remaining elapsed deadline is unqualified. Stop design-to-execution promotion if the closed total plus its accounting costs does not fit, or an allowed late mutation invalidates the assumed bound. After an actual SDK dispatch, keep UNKNOWN/reservation on incomplete terminal proof; never make a new ticket/retry/old-control rollback to finish. No further positive run is justified merely by locating the small duplicate debit.

## Review status

This is an engineering design and source audit, not a test result, integration approval or successful reverse proof. The exact original failure archive and original positive are unchanged. The next meaningful milestone is review of a complete **conditional** accounting model and its explicit admissible-input/failure contract; absent a proof for those conditions, retain HELD and continue other independent seven-plan work.

## Dot handoff priority (latest user direction)

The user now prioritizes finishing Codex's current local work and handing remaining development to dot. This report completes the assigned read-only package. No implementation, new execution package, additional fixture or new positive is started. Dot should preserve f19171d3 as held evidence, consume the formulas and source pointers above, and decide whether a closed unchanged-budget accounting profile is technically achievable before proposing any runtime continuation. Only if the product requires an otherwise unavailable cold/expanded-resource contract should dot prepare one concrete user decision with exact limits, accounting costs and stop conditions. The original archived failure is not authorization to rerun it.
