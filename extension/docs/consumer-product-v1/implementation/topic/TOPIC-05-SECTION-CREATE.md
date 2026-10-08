# TOPIC-05.5 — named Section creation local checkpoint

Base `06df6a4c1f58734501c9c00209790281fb5ecad4` (PR203 Section Actions
0.22 candidate), branch `codex/topic-section-create-20261008`.
This is an independently reviewed local UI slice, not whole05.5 acceptance,
hosted certification, main integration or an installed/user-available version.
No schema, worker, shared data, CI, version, promotion, writing or AI work is
included. Existing trusted CREATE_LIBRARY_SECTION and its transactional CAS/
operation receipt remain the data owner.

## Behavior and boundaries

The Topic menu exposes named Section creation through a native keyboard action.
Creation captures Topic ID, open intent and presentation intent before any
await; flush, form, qualified Topic lookup and dispatch retain that ownership.
IME/unsaved refusal, double-activation exclusion, redirected identity refusal,
current organizationRevision CAS and qualified new-heading focus are preserved.
The management dialog also refuses stale flush/read completion and stale actions.
Its description now reflects actual Section/manual-order continuous reading.

A page-local Map holds at most8 Topic-specific creation drafts, with titles
bounded to300 characters. Interrupted/unknown acknowledgement retains the exact
request and operation ID; retry reconciles that request without substituting a
new title. Another Topic may create independently. Full capacity refuses new
Topics without evicting unknown operations; existing Topics may still reconcile.
Success removes only its Topic draft. A known-unsaved draft can be explicitly
cancelled in its form. No cross-reload draft recovery is implemented or claimed.

Only the new creation control is added to the existing live copy watcher.
The creation form explicitly supplies localized submit/close labels; the shared
form retains its old defaults for other callers and restores the original close
label on closure. Native English creation checks title, label, Create Section,
Close, side-effect-free cancellation and verbatim mixed-Chinese user titles.
This is not a claim that all pre-existing dialogs are localized.

## Preserved negative evidence

- `ROOT/work/topic-create-before.log`: two actual TopicController deferred tests
  failed before the repair: a submitted old form created in the newly selected
  Topic, and an old Topic read could dispatch after navigation intent changed.
- `ROOT/work/topic-create-map-before.log`: after the initial single-draft repair,
  the new A-unknown/B-create regression failed (`writes1 !=2`). The bounded
  per-Topic Map fixes this independently identified cross-Topic obstruction.
- `ROOT/work/topic-create-locale-native.log`: source/release0/2 failed an existing
  exact-menu-node retention assertion. The newly added English structural
  creation had been inserted inside a previously locale-only test interval.
  Creation was moved before the unchanged locale-only baseline; no node,
  geometry, timeout or original interaction assertion was removed or relaxed.

Earlier142/145/148 intermediate unit results and earlier2/2 native results are
historical candidates; they are not substituted for final evidence below.
No cancelled/skipped result is counted as passed.

## Final local evidence

Four complete unit files: `topic-section-create.test.mjs`,
`cpv1-topic-05-5-section-actions.test.mjs`,
`cpv1-topic-05-4-section-reader.test.mjs`,
`cpv1-topic-05-2-root-section-anchor.test.mjs`.
Final148/148 PASS, zero fail/skip/cancel,264.665666ms;
`ROOT/work/topic-create-locale-owning.log`.

Complete existing `cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs`, source
and audited isolated release:2/2 PASS, zero fail/skip/cancel,9105.053416ms;
`ROOT/work/topic-create-locale-native-final.log`.
The unchanged120-second case budget includes the original rename/reorder,
concurrent rename, IME/body protection, stable default semantics and live
zh/en320px dark/touch/text200% assertions, plus actual keyboard create/cancel,
empty named Section, durable reload identity and exact heading focus.
Headless synthetic profiles only; no visible browser or external provider.

The runtime stayed frozen during this final native run. The unit candidate's
runtime bytes remained unchanged; the final native file additionally separates
English structural creation from the original pure-locale interval. These are
local dirty-candidate bytes recorded before checkpoint commit, not a claim that
the browser ran at the later commit SHA. Source/test SHA256:

| File relative to extension | SHA256 |
| --- | --- |
| `ui/topic-workspace.js` | `6b97e22eddca08dfb5f19008dea5190f8d5a1db6c518477feaf0278644d61175` |
| `ui/thought-copy.js` | `8d1a50122c1fa5108db466b0299a0a45b14fb5d202c063ec818c591c8461fc3a` |
| `tests/topic-section-create.test.mjs` | `2a75ccb90ef0ff3d20250428d01da69edae30d6e5b7ca89fc3d1e32f5d776c6e` |
| `tests/cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs` | `712b517394625f4c7115ecc786ea7093c8621cd6f6a48bc28f8430fb555e398e` |

Independent coordination review cleared captured identity/intent, CAS and
unknown-request recovery. A separate reviewer checked asynchronous ownership
and the bounded per-Topic recovery; review identified and closed the single-draft
cross-Topic blocker and the English dialog control gap. The coordinator reviewed
the final scoped form options. Browser evidence proves synthetic local behavior,
not real-user migration, full product accessibility, private-reference visual
acceptance, formal hosted certification or the remaining05.5/05.6–05.8 outcomes.
