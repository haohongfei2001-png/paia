# v0.11.1 Round 3 — independent reading and pre-repair diagnostics

Status: **draft repair candidate, not merged to main or deployed to the daily Chrome profile**.
Base: Round 2 commit `3ea54ba31247c1c67181cdc939604ccb3fdfa815`.
Branch: `p0/thought-library-ui-readonly-round3`.
Draft PR: #2, stacked on the Round 2 branch / PR #1, not on main.

## Reading boundary

Home lists and original Topic documents are core reads. AI Presentation status,
Original Organizer status, controls/preferences, bounded-workflow status,
credentials status and the unplaced-content badge must not be prerequisites for
those reads. Home renders first, then starts bounded optional reads. Each optional
RPC has its own 1,500 ms deadline; one rejection cannot discard successful sibling
results. A hung RPC stops blocking the UI wait after the deadline, without reissuing
the request. This is a UI deadline, not cancellation of dispatched worker work.

Optional completion may update controls and reconcile an already fetched Home page;
it does not refetch core content merely to refresh a badge. A route/attempt fence
prevents stale completion from publishing into another route. Initial persisted
reading preferences may trigger one corrective refresh, but never override a chosen
view/sort, composition or a dirty editor. Unplaced-content lookup is separate,
bounded and fenced. An unavailable status is not a zero-pending success and paid
controls remain disabled when the status preflight is incomplete.

AI content itself remains necessary when the user explicitly opens the AI view:
a failed AI read is not rendered as a successfully empty AI presentation. This
round does not loosen provider authorization, ledger or transaction checks.
Original-action preflight failure and a genuine no-delta result both restore the
reading editor without submitting an Organizer update request.

## Failure meaning

A cold failure says that this page has not obtained its data and that this does not
prove deletion. A retained failure can refer to a prior snapshot only for the same
Topic/view/sort/cursor/query. A visible retry button reissues the current core read.
Only a successful current core read clears that failure; optional status success
cannot bless a failed core refresh. Existing DOM/editor content is not cleared as
a response to an optional failure. Approximate legacy counts are visibly labelled.

## Genuinely read-only pre-repair diagnostic

`development/inspect-library-readonly.js` is an explicit Console snippet for the
**existing PAIA extension page**, not a deployable extension replacement. It does
not import or initialize any Store/ArchiveRepository and sends no runtime messages.
In particular, Round 2 `libraryCompatibilityStatus()` is **not** this diagnostic:
that method calls `finishFoundation()` and can write compatibility metadata.

The snippet enumerates the existing `paia-archive` database, opens the exact observed
version, aborts every upgrade (including a create-after-enumeration race), and uses
one native **readonly** transaction. It reads only Topic/Section structural fields,
placement counts, two migration-marker states and actual Topic index keys. It does
not read Source/Input/Entry body stores or unrelated metadata. Native Topic/Section
cursors materialize their rows internally, but the diagnostic does not inspect or
retain name/title/summary/body fields. Transient IDs used for intersections never
appear in the result. It emits a single aggregate JSON report, does not copy,
upload, repair, rebuild, invoke AI or create migration markers, and closes its DB
connection. It has explicit row/time ceilings and reports incomplete inspection.

A Section in one generation is structural evidence, **not** proof that this is the
user's current intended layout. Diagnostic candidate counts must not be treated as
an authorization to repair. Migration-marker counters are historical snapshots,
not current integrity measurements. Actual index gap is reported separately.

The development directory is excluded from release assets. The snippet itself is
read-only; an already running extension can still perform its independently
scheduled work. Its report describes the structure observed by its readonly
transaction, not a globally frozen application or full content-integrity audit.
No real user database has been inspected by this round's automated tests.

Diagnostic SHA-256:
`6777b40e3f6e99e8950dad4ce82fc2b3b5db83c323edc559eb23dc5f2e635588`.

## Final verification

Authoritative final GitHub Actions run: **34605423714**.
Both jobs checked out the exact tested commit
`59c46a8bc3b2226f7a6d2364b96e49ff056eb080`.
Subsequent changes to this report and removal of temporary CI are non-runtime changes.

- Targeted Node regressions: **133/133 passed, 0 failed, 0 skipped**.
  This includes 12 new status/diagnostic tests and 121 related existing tests
  covering cold reload, AI presentation/productization, Thought M1/M2, backup and
  Memory safety.
- Browser regressions: **18/18 passed, 0 failed, 0 skipped**.
  13 use the production UI with native DOM and a synthetic local RPC boundary;
  2 use native IndexedDB diagnostic fixtures; 2 use an installed extension with
  its real service worker/IndexedDB and failing or hanging optional RPCs; 1 is the
  existing installed-extension 60-second Home/Topic stability and live-update test.
- `npm run check`: passed, 6,457 package guardrails across 138 runtime resources.
- `npm run build:release`: passed, including emitted-package audit and
  `RELEASE_PRODUCT_GUARD_PASS` for 146 emitted files. This is build verification,
  not permission to deploy or a claim of real-user acceptance.

The final `stability.json` records:

| Scenario | Observation interval | Content-node mutations | Loading transitions | Core read RPCs |
| --- | ---: | ---: | ---: | ---: |
| Home idle with status-only changes | 60,133 ms | 0 | 0 | 0 |
| Topic idle with status-only changes | 60,114 ms | 0 | 0 | 0 |

The live insertion retained the original node, focus, selection and scroll, with
1 expected content mutation, 0 loading transitions and 1 core read. The test
recorded 0 provider requests and no page errors. These counters are specific to
the observed synthetic scenarios, not a guarantee for every dataset or operation.

Final Actions artifacts: `round3-node-evidence` (ID 10266370229) and
`round3-browser-evidence` (ID 10266421038). They contain tested-SHA records,
TAP logs, package/build logs, synthetic screenshots and stability counters.

### Failed attempts are not hidden

The first browser attempt passed 11/16: the installed-extension harness launched
headless shell without `Extensions.loadUnpacked`, and two native-IDB tests returned
before evaluating their diagnostic because of a JavaScript return/comment wrapper.
The next attempt passed 17/18: the new no-delta test had not excluded the synthetic
Input inserted by shared setup. The fixture was corrected to establish and assert
`pendingInput === 0`; the no-request assertion was retained. Full Chromium and the
corrected diagnostic invocation were then verified in the final 18/18 run.

Local Node tests also passed. The managed browser in the chat runtime denied
localhost/unpacked-extension access; those local attempts are **not** browser
passes. Final browser evidence comes from the isolated GitHub-hosted runner.
All fixtures are synthetic. None is real-user acceptance.

Earlier broad-unit failures must not be explained away: two fixtures require
historical SHAs unavailable in the imported remote; the 10,000-input timeout needs
a controlled baseline/head comparison before attributing or excluding regression.
This round does not claim a clean full-repository suite result.

## CI and review hygiene

Temporary transport files, application helpers and the branch-only verification
workflow were removed after evidence capture. The final stacked repair contains no
workflow that can mutate repository state and no temporary payload transport. It
neither deploys nor invokes paid providers.

## Still gated

No merge to main or daily deployment merely from synthetic passes. Real pre-repair
structural measurements are still missing. Ambiguous layouts remain intentionally
unresolved. Round 2 AI-productization migration bookkeeping for skipped unresolved
Topics is a separate storage follow-up, not silently changed in this UI/diagnostic
patch.

The next evidence needed is one explicit execution of the read-only snippet in
the existing daily extension context, returning only its aggregate report. Do not
uninstall, clear, rebuild, run Organizer, or deploy the repair just to obtain it.
