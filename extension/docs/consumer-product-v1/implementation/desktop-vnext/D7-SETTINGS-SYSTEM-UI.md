# D7 — Settings and system presentation

Status: FROZEN_CANDIDATE / native verification and independent pixels pending.
Base: `d76ff0147fcb668c3380f5769de11b5c44b9520f` (Context PR153).

This last bounded existing-UI batch follows the inspected D6.2 S01–S05 masters.
S01 dark is an explicit palette derivative; compact follows the approved shared
shell rules, not a newly invented Settings artboard. No product redesign, old
Context functionality, public release or install-package delivery is included.

## Implemented presentation and truthful limits

- S01: ordinary Settings adopts the D6 shared shell, left 44px axis, 880px layout,
  serif title, row hierarchy and real appearance/size/width/language controls.
  Saved 17px/680px and all legal 640/680/720px widths remain unchanged. Reduced
  motion is a read-only statement of the existing system policy, not a new saved
  preference. Existing six groups, Back, rollback, language choice and auxiliary
  reading controls remain working.
- S02: only the existing Reader conflict comparison dialog receives the warning,
  heading and draft-text presentation. Its original recovery, compare, copy,
  retry, discard-confirmation, revision and focus owners are unchanged. The
  standalone full-window Settings recovery page in S02 DOES NOT EXIST and is
  explicitly a remaining UI gap. This batch does not claim to complete it.
- S03: the existing Content group presents capture enablement, a real successful
  scan timestamp and current diagnostics. A successful scan can contain only
  duplicates; it is not a claim of newly saved content or complete history.
  Paused, unknown-time and stale observations remain truthful. Pause/resume
  remains the same existing control and command.
- S04: the Data group adds a visual history-import entry that invokes the single
  existing history owner. The original Content entry, file-read consent, trusted
  chooser, preview and explicit commit are preserved. Backup, segmented backup,
  full exports, restore modes and confirmations stay functional and distinct.
- S05: the existing Backup panel shows a validation-failure heading only when
  file inspection rejects. Cancel or a new operation clears this marker. Storage/transport/session errors
  do not label the file invalid. Generic export or restore
  failures never become an invalid-file claim. Integrity, target-generation,
  merge, replace, tombstone and Source boundaries are untouched.

S03–S05 use the standalone drawings' hierarchy inside existing Settings groups;
working six-group navigation and extra safe controls remain visible, unlike the
sparser drawings. This is declared ordinary-route presentation convergence,
not exact content/state equivalence or new standalone routes. No real controls
were disabled to make screenshots simpler. No Source, Thought, provider,
permission, credential, security, schema, cost or destructive-policy change.

## Evidence

Local focused 31 tests and existing 59 privacy/security cases PASS. Source and
release package guards PASS. A local test-DOM writable-property mistake and
static import-scanner collisions in new UI copy/IDs were corrected; neither was
a production service failure. Native local Chrome remains unavailable under the
existing socket restriction; no retry or access workaround was attempted.

The existing whole-page source/release run retains all 55 prior rows and adds
12 ordinary Settings captures (S01/S03/S04/S05, wide light/dark and 320px dark).
The last 55-row run took 121s source + 117s release, leaving bounded room without
changing the 300-second per-variant or 12-minute workflow limits. The original
Settings four complete owner files / nine browser registrations stay selected;
only superseded D5 geometry comparisons now reference actual D6 SVG pixels.
Historical baseline assertions remain unchanged. Keyboard, focus, 200% text,
coarse labels, rollback, real backup round-trip and no-network checks remain.
Hosted exact-head gates, source/release pixels and independent review are still
required before integration. No native PASS is claimed by this frozen receipt.

## Whole-D7 remaining boundaries

The prior Archive, Thought, Organize and display-only Context batches are adopted.
This candidate is not whole-product completion. Remaining known UI boundaries
include the standalone S02 recovery page, T03 folding state, T05 saved/return
composition, final all-family visual acceptance and any unequal-state reference
limits in their receipts. Thought/writing/export functional redesign is deferred;
Organize future preview states remain held; old AI Context functionality remains
void pending redesign. Current-live/physical device/IME and public distribution
remain separate gates. Existing real Settings/import/backup functionality is
preserved rather than relabeled as preview-only.
