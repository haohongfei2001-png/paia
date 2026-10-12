# AI Context Cards v2 — CTX4-UI-1.1 reference manifest

**Current final UI: OWNER_APPROVED, 2026-10-13.** [ADOPTION](AI_CONTEXT_CARDS_V2_ADOPTION.md) records scope; [PLAN](AI_CONTEXT_CARDS_V2_PLAN.md) is the existing implementation plan. This file identifies evidence, not another design or execution queue.

## 1. What was approved

The approved source is this conversation's `PAIA_AI上下文_交互原型.html` plus four final screenshots: Home, direct editing, Topic permissions, allowed-scope preview. The HTML was read through its complete source and the four screenshots were visually inspected in this documentation task. The source represents fictional local demonstration data, not the owner's connected archive or real AI service.

The intent is the website AI Context's restrained blue-white material and four-object clarity, adapted to an actual application, with the shared visual language of the newly approved Thought Library. The **final HTML and four screenshots** control the new composition. Neither the website's marketing layout, the original October-7 Context geometry, nor the earlier rejected/generated Thought dashboards is the new final target.

## 2. Exact original artifact identity

Byte counts and SHA-256 were computed from the actual mounted attachments in this task; PNG dimensions are original pixels. No substitute or transcoded image is hashed here.

| Artifact | Bytes | Dimensions | SHA-256 |
|---|---:|---|---|
| `PAIA_AI上下文_交互原型.html` | 83491 | HTML | `410f6ac04f34c04146c966abcca76f7daae5ed9547ce487054d156dae9d754b7` |
| `PAIA_AI上下文_首页.png` | 547303 | 1560×960 | `1ce64a175781d289d656e4068673b4462ff294d285bd43ea997303d4c05087dc` |
| `PAIA_AI上下文_直接编辑.png` | 289707 | 1560×960 | `d4039b56498677811d3a3a505d3e67ff3f2926580237e9630705a916aaaeddcb` |
| `PAIA_AI上下文_输入权限.png` | 662787 | 1560×993 | `62dc7e3d83d9dc70a70c2ded3f35526141f0285745869c744516bf7069829039` |
| `PAIA_AI上下文_访问预览.png` | 307916 | 1560×960 | `27ca09aa5ecd55c282e538d46e21236240ec7f6e22cf0d006ce5d07b3a28e286` |

Private conversation attachment identifiers: HTML `file_0000000077a881f6a9dfa175947ffe59`; Home `file_00000000e95c8230aea795a484fb9cb5`; editing `file_00000000935481f58ff3c54f952ef2d5`; inputs `file_00000000697c82308da8f81c0a0d2ecd`; preview `file_0000000057d081f583e1177026fe60f1`. These are provenance identifiers, not public URLs or proof that another agent can retrieve the bytes.

The original five files remain in this owner-controlled conversation and are **not uploaded by this plan adoption**. Obtain the exact originals through an authorized attachment/Library handoff and verify hashes for exact visual comparison. A prior-session sandbox URL is not a repository resource. The plan provides concrete public layout/behavior derivations so independent domain work is not blocked, but text and hashes alone do not certify screenshot fidelity. Missing access blocks the affected exact-reference claim, not every engineering task; never substitute a new design or the old card layout.

## 3. Executable design anchors, not a second implementation

Relevant source selectors: `.card-grid`, `.context-card`, `.card-open`, `.card-foot`, `.access-bar`, `.master-gate`, `.content-group`, `.item-body`, `.topic-list`, `.topic-row`, `.topic-open`, `.topic-permission`, `.drawer` and `.drawer-content`.

The final CSS override matters: at ordinary desktop widths `.app` top inset is 43px and `.card-open` starts at 211px; earlier declarations are not the effective geometry. Main sidebar 184px, workspace maximum 1120px, horizontal inset 62px, two-column gap 23px, radius 19px and drawer 530px are starting measures. Larger/narrower overrides are in the actual HTML; PLAN §2 records the shared role mapping and safe adaptation. The desktop images must be compared at a matched viewport/zoom/font, not scaled until they look similar.

Old explicit shared-reading clarification remains: use production reading-preference owner and saved user settings, with the standard role 17px/680px. The new prototype's default 16px and its outer `.content-page` width do not reset this choice or define the editable prose measure. Reconcile typography by role without screenshot-only runtime CSS, clipped targets, hidden errors or altered content.

The original HTML demonstrates local Item edit/add/copy/undo/order/move/delete, Topic filtering/search/read-only inspection, master/card/topic selections and a local allowed-scope drawer. It does **not** establish production data transactions, reliable crash recovery, permissions, real connectors, maintenance fidelity or large-scale performance. Its `effectiveGroups()` omits real connection/caller enforcement because it is only a fictional local preview; never port it as the authoritative external permission resolver.

## 4. Approved masters and new behavior evidence

| Approved master / behavior | Existing implementation owner | Later production evidence |
|---|---|---|
| Four-card Home with actual short prose, input Topic peeks, independent bottom access controls | CTX4-01/02 | Actual read model; normal/empty/off/no-connection Home; opening never grants |
| Normal direct-edit detail with lightweight groups | CTX4-01/02 | Durable autosave, actual saved reading preferences, draft/IME/conflict/retry, evidence/undo/actions |
| Topic rows with real Section cues and All/Selected/local search | CTX4-03 | Full relevant corpus, stable order/focus, 20/50/144 scale, closed Topic local read vs denied external read |
| On-demand configured-scope preview and clipboard copy | CTX4-02/03/04 | Shared authorization owner, real coverage, current revision/generation, revoke/purge/move invalidation, no external send |
| Explicit cross-card Item move | CTX4-02 | Stable identity and protection; target-permission confirmation/CAS; no hidden scope expansion |
| Real automatic maintenance / connection states | CTX4-05/06 | Separately authorized actual processing/client evidence, not a demo dialog or status badge |
| Responsive/dark/accessibility and overall closure | CTX4-07 | Original 22 state classes plus new interactions in real source/release UI |

The six sample Topics do not certify 20/50/144 scenarios. Four PNGs are four reviewed views, not the full state matrix, live-service evidence or accessibility measurements. There is no new approved dark master, so apply current light/dark semantic roles to this composition and retain existing coverage. Exact prior screenshots remain historical, not new-image acceptance passes.

## 5. All original 22 state classes retained

The original source-state labels below remain traceable. Their **conflicting old geometry is superseded**, but their real behavior, cardinality, accessibility and safety obligations are not. Verify these states in the new UI using representative real runtime fixtures; do not run a second old-UI build merely to match historical pixels.

| Original state | Required CTX4-UI-1.1 equivalent |
|---|---|
| 01 Home | New four-card Home, actual previews, bottom independent access, correct connection status |
| 02 Cards-Off | All cards off; local prose remains readable/editable; no scope included |
| 03 Global-Off | Master paused; subordinate selections retained; scope-preview body empty |
| 04 Info | New information detail, actual independent Items and reading preference |
| 05 Inline-Editing | Actual editor, autosave/ACK, focus/caret/selection and IME protection |
| 06 Rules | Same new detail composition with Rules semantics and trusted-authority separation |
| 07 Now | Current-context detail, no task-management UI or fabricated currentness |
| 08 Inputs-20 | New Topic-row list with all 20 real synthetic fixture identities reachable |
| 09 Inputs-50 | Same model, 50 reachable, search/filter/order/return correct |
| 10 Inputs-144 | All 144 reachable; bounded performance and honest full coverage |
| 11 Connections | Actual connection collection/status, pause/revoke/reconnect, no fake clients |
| 12 Compact | New compact four-card-to-one-column geometry and reachable controls |
| 13 Dark | New Home in current dark semantic roles, legible focus and controls |
| 14 Inputs-Paused | Inputs card off; Topic choices preserved; no external deep read or scope body |
| 15 Empty | Four truthful empty cards; all defaults off; manual first Item works; no seeded taxonomy |
| 16 Save-Failed | Draft retained, exact error/retry/copy and leave protection; no false saved badge |
| 17 New-Topic | New identity closed even if master/Inputs are on; no inherited union |
| 18 Dark-Inputs | New Topic list/search/selection in dark, with full operation/focus |
| 19 Compact-Info | Readable narrow direct editing, group labels above, no three-column squeeze |
| 20 Connect | Actual first connection permission, identity/scope and cancellation; never implicit master-on |
| 21 Tablet | Shared rail/responsive composition, long labels and accessible targets |
| 22 No-AI | Populated local content and configurable choices with accurate not-connected status |

New supplemental states, inside the same existing verification system: local space/card/Topic queries including closed-for-AI but locally eligible content; clear and Back restoration; Selected-filter removal focus; real Topic/evidence drawers; current-scope preview with master/card off, empty/incomplete data and no connection; clipboard failure, bounded complete traversal and mid-preview revocation/revision/purge; private-to-open card move with explicit confirmation and stale target rejection; restored reading settings and 200%/320px/reduced-motion behavior.

## 6. Historical public assets remain available

The owner explicitly authorized publication of the original synthetic October-7 Context package on October 11. That fact is retained; there is no renewed requirement to obtain that old package from another ChatGPT account or a Mac. Existing paths stay unchanged:

- [Original Context design ZIP](design/approved-visuals-2026-10-07/PAIA-AI-Context-Cards-v2.zip), SHA-256 `a1657d1b4bc36326d4cf8260d4e858f565f707a9e71dd959cd64adc8d6240b2c`.
- [Original 22 state screenshots](design/approved-visuals-2026-10-07/PAIA-AI-Context-Cards-v2/screens/), [Review.html](design/approved-visuals-2026-10-07/PAIA-AI-Context-Cards-v2/Review.html) and [AI-Context-Design.md](design/approved-visuals-2026-10-07/PAIA-AI-Context-Cards-v2/AI-Context-Design.md).
- [Original package index](design/approved-visuals-2026-10-07/README.md).

These artifacts now retain history, nonconflicting state semantics and prior evidence, **not the new final composition**. The old specification's review-pending wording, source baseline and reported 78/78 checks retain their original scope. This task did not rerun those checks or infer new production acceptance.

## 7. Exact preceding documents and scope

Fresh repository read baseline: `d6e6dfe73ffd78913a674ed299628b7c903581ce`, tree `d66d3e77da335d69a5188bd940bd795704fce5aa`. Current scheduling and shared-domain boundaries were read to preserve them; this is not a new full repository audit.

| Preserved prior file | Exact Git blob |
|---|---|
| [AI_CONTEXT_CARDS_V2_PLAN_PRE_UI_2026-10-13.md](AI_CONTEXT_CARDS_V2_PLAN_PRE_UI_2026-10-13.md) | `3785d40b15d609050dd226fe9627f13521082183` |
| [AI_CONTEXT_CARDS_V2_ADOPTION_PRE_UI_2026-10-13.md](AI_CONTEXT_CARDS_V2_ADOPTION_PRE_UI_2026-10-13.md) | `031b053bb9326d61be74b8ec43bc7f4e18186c84` |
| [AI_CONTEXT_CARDS_V2_REFERENCES_PRE_UI_2026-10-13.md](AI_CONTEXT_CARDS_V2_REFERENCES_PRE_UI_2026-10-13.md) | `b1b491baeb9822936339bef8a63093ed7161ba7e` |

Archive copies reuse those Git objects directly, preserving exact bytes including historical hashes and asset-publication records. PLAN §6 replaces conflicting presentation only and expressly incorporates the full nonconflicting predecessor requirements. Same-name active files remain the authority-map targets; archives are not a parallel plan or scheduler.

No current archive prose, user browser screenshot, credential, font binary, source sample export or identifying fixture is added to the public repository. The new source artifacts remain private; only necessary design derivations, identities and hashes are committed. No runtime/test/CI/version/website/configuration/installation/paid-service change is claimed by this documentation adoption.
