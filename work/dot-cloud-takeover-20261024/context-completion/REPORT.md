# Scoped Context mutation completion integration

## Result and exact source

- Published base: `548983c0323c173575c9a817c02c34121136768a`, tree `c8fdb771adf0385e445e0102f3b690eb53d9dafd`.
- New tested source: `08d06a3c3a143bb8db42dfb3ff4f152a05b9722b`, tree `6978fc14379cd9d03df5be65f7ca09310dd54cfd`.
- Author source: `7b0585f7b626979e16089465c33c2f2f7273d27f`; final evidence successor `548381a7b79a0368ef57933d626c96824b969c80`.
- Exactly four imported paths: original context-cards.js, its two existing owning tests, and final owning report. Runtime/tests match the independent freeze byte-for-byte.
- Focused composition: **16 complete files, 426/426 PASS**, zero failure, cancellation, skip or todo; **6484.386239 ms**.
- Raw log SHA256: `2792e6e0b5629041c59af016b2859c6beda77b9d84559948f7d1af71f099ac81`.
- Test-list SHA256: `1904e64c1a5333cbc5896b94935ca95105f454fbe199fcef063ed0081161333c`.

The command includes all13 author-selected complete owners, including both
original preflight files, plus the complete connection UI, policy and quiescence
files. No case filtering or skipped-case pass was used. Existing Node24.19.0
ran the suite in6.609 seconds wall time under the unchanged240-second outer
safety ceiling. No dependency setup, install or runtime budget change occurred.

Independent read-only integration review verified all4 source/report and16 test
hashes, exact permitted diff, unchanged core/background/services trees,426 log
and result, all8 prior published artifact blobs, and complete copied evidence.
It did not rerun tests. Root HEAD, full status and staged diff remain unchanged.

## Bounded behavior and recovery truth

The original UI owners preserve newer focus, typing, selection and composition
across successful delete/restore ACKs and awaited edit Undo. Exact page/editor,
open-generation, card, epoch and intent checks fence stale completion focus.
Delete cleanup uses only the non-null recovery token captured at dispatch,
not an unqualified current/null token. Newer target text/IME may remain in the
same conflicted editor; obsolete autosave is cancelled. Explicit Keep as new
creates a different Item while the original deletion stays committed. Existing
View saved/discard controls retain their original authority.

Edit Undo also compares the actual six-field Selection snapshot after its save
await. A changed same-field selection cancels that old Undo even without a
pointer/key event; an unchanged delayed selectionchange preserves normal Undo.
The earlier pre-delete composition repair remains intact. Ordinary successful
delete/restore and repeated committed Undo remain covered.

No backend, recovery admission, tombstone, schema, transport, permission or busy/
navigation policy changes were imported. Production recoverySources still
rejects removed Items. A newer pretransaction token must not be erased by old
cleanup, but that raw token is not post-tombstone recovery authority. Text/IME
begun after durable removal is live UI-only retention, not a new persistent or
cold-recovery guarantee. Closing/restarting gains no new recovery promise.
Forced close/reopen controls are lifecycle hardening, not a claim that ordinary
leave bypasses its busy/pending guard.

## Full current evidence, including first failures

The archive includes all35 committed author evidence files, the separately
verified final frozen333/333 log, all34 independent reviewer files, exact four
source/report snapshots, the complete426 log/command/result, source patch and
fixed manifests. Author333, reviewer32 controls and200 related cases overlap
this426 scope and must not be added into an aggregate.

Preserved author RED: focus3/25, target0/4, edit Undo0/6. Intermediate failures
include32/35 initial restore focus and141/143 skeletal-fixture mismatch. The
first candidate5044's331/331 and reviewer30/30 plus198/198 preceded a real late
selection-only counterexample: author1/2 and independent0/1 then1/2 remain
failed. The final7b0585 successor fixes that boundary and passes333,32 and200
in their distinct scopes. No earlier failed candidate is relabeled accepted.

Earlier receipt, Source union, Settings and151-milestone report/ZIP files are
preserved byte-for-byte in the repository. This new archive references their
published548 commit, blob IDs and SHA256s instead of embedding duplicate prior
ZIPs. This preserves accessible history without exponential nested bundles.
Raw local root-index snapshots are retained locally; their hashes and equality
are archived rather than re-embedding binary diffs containing old ZIP bytes.

## Historical qualification and explicit limits

The **151-file3234/3234** evidence belongs to testedf489/published548, not this
new08d source. The151 combination was not rerun here. This source has focused
**16-file426/426** evidence only; no new full-regression count is claimed.
Harness17 pure contracts and its accepted98761 source pins remain historical
preparation evidence, not rerun or native qualification here. Native remains
NOT_READY and all eight proposed product-native cases remain NOT_RUN.

Partial Source continuation7ceb remains FAIL/unqualified and excluded. General
merge completion, later Source additions/edits, selection hold/drain and other
remaining seven-plan/external gates are not completed by this UI slice.
Original C/129-group/100k/Full/cloud failures and consumed allowances remain.
No browser/native/physical IME/build/Full/C/129-group/100k/network/provider/
account/paid/install/deployment or remote operation was performed by this
integration. It is not whole-product, exact-main, installed or native acceptance.
Root owns any guarded development-branch publication and exact remote readback.
