# D5 engineering checkpoint — 2026-10-04

**D5 remains OPEN.** The adopted cuts below are useful production UI improvements with bounded evidence. They do not establish whole-screen equivalence, whole-product completion, final owner acceptance or permission for consumer release. This document consolidates engineering facts; it does not amend the frozen design or add product scope.

## Current runtime and latest proof

Latest integrated runtime: [PR138](https://github.com/haohongfei2001-png/paia/pull/138), main `b81ebfee6683d2eabc17d8ae50c34a717ac52cc3`, tree `6904c471db7e1b3a0a161f104a55dfe3ad2c62ba`. Reviewed head `ef1b6be1678c658106d920c02463cca1f9483f0d` and tested merge `0d1717846fc7c060cfb539bd00066398f804a324` have that exact tree.

- [Candidate37180622516](https://github.com/haohongfei2001-png/paia/actions/runs/37180622516): 1,644 unit cases, all 13 selected browser registrations, 102 adapter and 58 privacy cases, source/release guards and aggregate PASS.
- [Light37181370604](https://github.com/haohongfei2001-png/paia/actions/runs/37181370604): PASS on the tested merge.
- [Exact-main37181668898](https://github.com/haohongfei2001-png/paia/actions/runs/37181668898) and [Pages37181668571](https://github.com/haohongfei2001-png/paia/actions/runs/37181668571): PASS on the exact integrated main.
- The 13 browser cases are the complete three affected owner files, partitioned 8+5. They are not the complete historical browser suite. Full browser/Mac stages were intentionally skipped under the existing ordinary-round §7.2 route.

A later documentation-only checkpoint commit has a different Git SHA. It must be described as documentation of this tested runtime, not as a new runtime certification or a new extension release.

## Adopted bounded outcomes

| Cut | User-visible result | Adopted main and evidence |
| --- | --- | --- |
| Q7 / O04–O05 | Readable current/candidate comparison, explicit field choices and reachable Save | `e7e7ea97` / [PR133](https://github.com/haohongfei2001-png/paia/pull/133), [Q7](D5-Q7.md) |
| Q8 / C04,C06,C08 | Existing Context review/ready/stale output uses the approved reading presentation, saved preferences and reachable release controls | `96832cd7` / [PR134](https://github.com/haohongfei2001-png/paia/pull/134), [Q8](D5-Q8.md) |
| Q9 / S01 | Existing Settings groups fit a single reading column and responsive control row; native glyphs stay inside usable targets | `56413162` / [PR135](https://github.com/haohongfei2001-png/paia/pull/135), [Q9](D5-Q9.md) |
| Q10 / Topic header | Back, current-Topic search, History and status stay readable across normal/narrow/enlarged states | `e021cbdd` / [PR136](https://github.com/haohongfei2001-png/paia/pull/136), [Q10](D5-Q10.md) |
| Q11 / existing scope dialog | Provider/material/exclusion/budget facts precede approval; narrow/coarse controls meet 44px | `8c73fc83` / [PR137](https://github.com/haohongfei2001-png/paia/pull/137), [Q11](D5-Q11.md) |
| Q12 / existing O02,O06 notices | Actual running/stale text follows the frozen notice style; the existing Stop action has a distinct reachable row | `b81ebfee` / [PR138](https://github.com/haohongfei2001-png/paia/pull/138), [Q12](D5-Q12.md) |

Earlier shell, Archive/Reader/Original/History, Thought root, Content/Years and compose-operation safety work remains in the Q1–Q6 records. Their adoption does not erase retained differences or convert unexecuted evidence classes into PASS. Q6a's command/draft safety repair is adopted; Q6b's broader T05 routing work is not.

## Latest artifacts and limits

Q12's [notice artifact11294244674](https://github.com/haohongfei2001-png/paia/actions/runs/37180622516/artifacts/11294244674), SHA256 `8ca9ca108f1d737f5ad25e9afc323e6ca964730026a62bce2fc9dafd049da843`, binds 98 files. Independent review verified 40 paired rows, six enlarged/coarse targets, exact Topic Stop dispatch, CANCELLED acknowledgements, no retry and retained stale choices. Source/release measurements match; six differing PNG pairs contain original-entry timestamps outside the notice. Normal, narrow, dark and enlarged notice text and controls are readable.

The [comparison artifact11295084186](https://github.com/haohongfei2001-png/paia/actions/runs/37180622516/artifacts/11295084186), SHA256 `cdffc4276faae7a3a9cf6d74740c6bc3db78ea4b7c9e65de297130ae073724b4`, binds 116 files and the complete five-case owner. It retains 48 paired rows, 22 preference observations and four targets, with protected human Current separate from candidates and stale choices disabled. Both artifacts bind the reviewed head exactly.

Measured job log spans are 189.334 seconds and 662.738 seconds, inside unchanged 12-minute limits. All 13 cases remain required; no file, case, original assertion or full-suite placement was removed. The split avoids combining the previously measured 677.097 seconds of old cases plus setup and new work into one impossible budget.

Explicit limits remain: running notices use their existing 880px Topic parent although the declared Organize cap is 960px; the renderer retains its existing text hierarchy and one-second Stop refresh behavior. Dark/coarse notice frames alone do not prove Original prose visibility; the complete old interaction journeys own that evidence. Saved reading preferences, truthful coverage/provenance, real controls absent from static specimens and synthetic fixture text are not erased to obtain pixel identity.

## Unclosed D5 conformance work

These are the known unclosed boundaries from the canonical plan and adopted receipts. They are not new feature requests or claims that all underlying behavior is missing.

| Boundary | What remains unclosed | Required disposition |
| --- | --- | --- |
| T05 Add Thought | Main-workspace composition and safe return to the exact origin | Preserve unmerged [PR132](https://github.com/haohongfei2001-png/paia/pull/132) and its failures. Reconstruct a bounded plan from current main before resuming; do not import the paused routing/cache/paging chain as an accepted base. Owner-sensitive implementation requires complete native/full evidence. |
| Thought composition | Title-row actions, saved-AI switch, action/tab spacing and canonical Content year navigation | Q5/Q10 accepted reading/header roles only. Preserve current chronological, search, editor and relation meanings; do not invent time spans or move ownership to hide visual differences. |
| O01 and broader Organize | Scope is still a modal; full workspace/header hierarchy and unaccepted status/first-generation/overview/timeline composition | Q7/Q11/Q12 are bounded presentation cuts. First-generation lacks a matching frozen visual specimen; establish its design mapping before restyling it. Do not infer a new approval or AI workflow. |
| Full Context composition | The complete C01–C10 task/material/retrieval/edit/budget/ready/copied/denied presentation | Q8 validates existing C04/C06/C08 preview styling and owner behavior, not a complete five-step visual composition. Preserve D4 review/release/privacy owners. |
| Remaining family/state proof | Source Changes, remove/purge-blocked and nested recovery/capture/import/backup conformance, plus the remaining normal/error/partial/long-text combinations | Use the frozen [surface inventory](../../desktop-vnext/SURFACES.md) and [state matrix](../../desktop-vnext/STATE_MATRIX.md) for a finite final coverage check. Lack of a consolidated D5 acceptance receipt is not evidence that an existing feature is absent. |
| Final convergence | Complete legacy-style retirement ledger, applicable full certification and one exact-head owner review set | Keep each round's retired-selector evidence and retained exceptions. Review Archive Reader, Thought root+dense Topic, Organize Compare, Context Review+Ready, one modal, dark and narrow frames from the final candidate; record explicit owner visual acceptance. |

The [D5 plan](../../design/foundation/desktop-vnext/D5_VISUAL_CONVERGENCE.md) still controls completion. Every active family must meet its applicable behavior and visual gates. Material divergence fails D5 even if tests are green. Without the final owner acceptance record, D5 and Desktop vNext whole-product remain incomplete.

Physical IME, screen-reader, live-provider, real-device/120Hz, performance and actual-model-fidelity evidence retain their separate classes. Synthetic browser screenshots do not substitute for them. Existing B-01–B-05 decisions and other deferred product gates keep their own dependencies.

## Distribution state

Public consumer release, store submission and install-package delivery remain held. Automatic Pages verification does not update the extension installed on the owner's computer and is not a store/distribution certification. No new service, provider, permission, schema or hosting resource is introduced by this checkpoint.
