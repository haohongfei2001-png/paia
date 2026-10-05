# D7 — Existing Input recovery conflict presentation

Status: LOCAL_CANDIDATE / hosted native source-release verification pending.
Base: `c6d6581c2c8e345ae1a04f1a429536bf42f5bb38` (Reader Settings-return PR160).

## Bounded scope

This slice applies the approved D6.2 S02 main composition to a real stale Input
recovery draft. It adds no Settings route, recovery manager, persistence command
or second editor. Archive remains the actual route and highlighted navigation.
Thought recovery and a standalone Settings recovery page are outside this slice.
This is not whole S02, D7, functional redesign or consumer-release completion.

`DocumentEditor.restoreRecovery` remains the owner. Only after its original
attempt returns conflict does it attach display metadata: document identity,
affected Input IDs and whether the edit contained a title. This metadata retains
no body, revision base or operation. Successful automatic replay, uncertain
outcomes, ordinary editing conflicts and scoped removal retain their behavior.

The surface reads the current local values of restored fields, including multiple
and unmounted Inputs, titles and notes. Copy draft copies that visible projection
with field labels, without truncation, through the existing clipboard helper.
Empty fields copy their actual empty value rather than their display placeholder.
Ordinary Reader copying is unchanged. A clipboard denial leaves selectable text
in this view; a late failure cannot open a stale fallback after invalidation.

The original Compare node and listener are temporarily reparented. They open the
same comparison owner. Recovered notes and visibility differences are included in
the review. Cancel and Escape retain S02 and target the exact original button for
focus return. Accepting comparison retains the original rebase-then-retry path;
it does not silently commit. Existing retry, CAS, autosave, recovery tokens,
leave guards and page-lifetime behavior are unchanged.

The initial stale `EDIT_DOCUMENT` attempt still precedes S02. The invariant is no
unconfirmed canonical overwrite after conflict, not zero prior save requests.
A presentation-only busy guard prevents overlapping recovery comparisons. It is
applied only when S02 is mounted: stale revision with identical fields keeps the
original comparison entry. Current and returned page metadata fence owner,
epoch, purge floor and source invalidation; an already-open recovery comparison
is cleared and closed when invalidated. Existing B-02 policy and the original
editor's human-draft handling are unchanged.

## Evidence and limits

- The actual approved `S02-1440-light` whole-window image was inspected before
  implementation. Archive highlighting intentionally differs from its Settings
  highlight, preserving real route ownership rather than inventing a route.
- Independent local review found and then closed two issues: the zero-field
  comparison lock and the original Compare focus return. The reviewer reran all
  14 owning unit cases on the rebuilt source: 14 pass, zero failures/skips.
- Full local unit run: 1,828/1,829 pass. The unchanged controlled 10,000-Input
  fake-IDB benchmark committed in 142.018 seconds, above its 120-second target.
  This failed run is retained, not relabeled. An additional serial repeat was
  canceled without a complete result; no replacement PASS is claimed.
- Complete recovery/ownership regression selection: 58/58 pass, zero failures
  or skips, including the 14 new cases.
- Privacy/security: 59/59 pass. Source package: 11,484 checks / 294 resources.
  Release package: 11,049 checks / 287 resources; release-product guard: 311 files.
- Adapter attempt: 21 non-browser passes and 27 before-hook failures. The rebuilt
  workspace lacks the expected Playwright browser executable. This is not an
  adapter correctness or native verification pass.
- Earlier native recovery attempts never reached the app: first a missing
  Playwright executable, then system Chromium `socket() failed: Operation not
  permitted`. A subsequent workspace replacement removed that earlier worktree
  and its logs. Source was reconstructed from the same verified main; earlier
  in-progress tests are not counted as rebuilt-candidate evidence. No launch
  workaround or native visual PASS is claimed.
- A source-only WIP backup exists on `wip/input-recovery-presentation-20261004` at
  `4df7f998791b6e8529e8173e3e226f31c95f5101`, with tree
  `f0f797919364656e096c16abb9ba3f6b6d28c855`, equal to the locally checked five-file
  runtime tree. It is not a PR, release or completed delivery.

The existing `cpv1-01-save-recovery-chrome-e2e` suite retains its original
assertions and adds real durable-draft reopening, current-field copy, comparison
cancel/Escape, original-node focus, leave/Back/Forward, explicit retry, later
ordinary conflicts, multiple fields and current B-02 refusal plus historical
purge compatibility. It accepts `PAIA_RECOVERY_EXTENSION_PATH` for the release
and `PAIA_RECOVERY_EVIDENCE_DIR` for native 1440 light/dark and 320 dark captures.
The existing `audit_boundaries` job now keeps its complete five source files
(23 cases) and builds `npm run build:release` at the same checked-out head before
rerunning automatic Input replay, stale recovery and the two S02 cases against
`work/current-release`. Source/release receipts and five PNG captures live under their own
`work/audit-boundaries/{variant}/recovery` artifact paths; TAP logs are retained
at `work/audit-boundaries/{variant}/test.log`.
The original three audit JSON/PNG checks remain. The final gate requires each
variant/head, all four behavior receipts, named passing cases, PNG signatures,
dimensions and hashes. Only the unrelated original failed-removal case may be
unselected in the bounded release replay; it remains in complete source coverage.

The S02 stale case now checks 320px 200% text for proportional line height, full
glyphs, section separation and focusable/uncovered actions; it also uses a real
coarse-pointer touch to open the original comparison and checks 44px targets.
All new fixed-pixel leading is converted to its equivalent unitless ratio.
Local focused/CI wiring checks and package builds pass; these native assertions
and screenshots remain unrun locally because of the recorded launch restriction.
Both source and release must run on the final frozen candidate before acceptance.
Local DOM tests and source/release file parity cannot substitute for native pixels.

The job keeps its existing 12-minute budget. A historical five-file audit job
[109930936751](https://github.com/haohongfei2001-png/paia/actions/runs/36728184514/job/109930936751)
passed its then-20 cases in 205.483 seconds (job about 252.974 seconds). Its overall
run was canceled, so only that job is timing evidence. Current 23 source plus
four release cases, new stress captures and release build still need actual
hosted timing; the estimate is not a runtime guarantee or current PASS.

No backend/schema, provider, permission, old AI Context, ordinary Thought, paid
service, public deployment or install-delivery change is included.
