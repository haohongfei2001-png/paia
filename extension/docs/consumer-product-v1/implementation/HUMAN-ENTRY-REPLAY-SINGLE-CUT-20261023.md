# Source-free Human replay: one original preparation cut

Status: implemented finite preparation optimization, parent `3be01cd3`. This does not solve the corrected 65/129 publication limit and does not change final proof semantics.

The original `HumanLibrarySyncJournal.prepareReceive` called `humanPlanEntry` to read the current allocation/control base, then `prepareEntryPlan` opened another readonly transaction to read that same base plus the domain operation receipt. A real original-owner probe records two reads each of `thought-suppression-key`, `revision-sequence` and `thought-sequence`; the preserved baseline is 0/1 against the desired single-read contract.

The finite source-free `entry` branch now calls `prepareHumanEntryReplayPlan`. It detaches and validates the original descriptor, restores the original request, completes original readiness, and captures base plus domain receipt in one original readonly transaction. The original replay allocation is bound to that cut and the existing private entry planner consumes it directly. No caller-provided expected row or writer token is accepted. No cross-transaction cache is introduced. Source-backed entries and all other operation kinds retain their prior paths.

The original private planner, request digest, keyed body identity, allocation events, output, protocol matching and mapping checks are unchanged. The actual commit still calls `requireHumanEntryPlan`, which rereads control/base, operation receipt, Entry and history collision checks. The complete phased publication raw point/count closure is untouched. The savings are one redundant preparation transaction/base read per source-free received creation, not removal of a commit check or a claim of Linux/browser performance.

## Verification

- Original probe: 0/1, actual 2 reads of each of the three original allocation keys versus expected 1.
- First corrected three-file batch: 19/20. The new consent test incorrectly called the accept-only `consent(false)` API; it failed before attempting the tested commit. This was a fixture error, preserved separately.
- Corrected three complete owning files: **20/20**, no failures/cancellations/skips/todos, **3117.8435 ms**. Covers original allocation view, actual owner result, later thought/revision counter changes, domain receipt collision, original `setEnabled(false)` pause and an intervening real original owner, all with physical rollback comparison. The original journal file includes receive/duplicate/roundtrip/protocol rollback and malformed-group cases.
- Existing actual raw late semantic controls: **4/4**, **964.75275 ms**. Sequence, known, dirty and extra metadata mutations still reject and roll back through the unchanged final native fence.

Node 22.23.3 with synthetic fake IndexedDB. No 65/129, browser, build, cloud, Full, account or paid-service execution. The test totals are separate runs, not one merged pass count.

Files: `human-library-plan.js`, `human-library-journal.js`, new `human-entry-replay-single-cut.test.mjs`. Evidence and source hashes: `work/human-entry-replay-single-cut-20261023/`.
