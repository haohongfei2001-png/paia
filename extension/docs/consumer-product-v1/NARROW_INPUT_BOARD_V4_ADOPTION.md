# Narrow Input Board v4 — Adoption and Scoped Supersession

Decision: **NIB-V4-1.0 / OWNER_APPROVED_DESIGN_SCOPE**. Date: 2026-10-09.
Programme: existing **PAIA-CONSUMER-PRODUCT-v1**, Prompt lane with Archive/AI-COST dependencies.

The owner approved the v4 direction and explicitly requested a **documentation-only Draft PR**, not runtime implementation, merge, release or installation. The ten fixed requirements are adopted in [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md). [PLAN](NARROW_INPUT_BOARD_V4_PLAN.md) is the future implementation breakdown; STATUS remains the only execution selection authority. A Draft PR does not itself update main or start an executor.

## 1. Selected scope

| Requirement | Decision |
|---|---|
| Ordinary width / narrow rule | KEEP original `min(width<=400?322:336,width-32)`; no wider search/check state |
| Font / glass / shape | KEEP original frequency-board 13.3px/1.55 role, 20px outer radius, blue-white soft glass; share theme/language/accessibility owners |
| Candidate/result row | ADOPT one expression on one line, default 44px row; actual clipping requires checking before disclosure |
| Height | ADOPT content-sized upward extension inside the top-controls-to-composer safe band, 12px gaps; internal overflow scroll |
| User control | ADOPT deliberate expand/collapse/mode transitions; geometry/blur/idle/scroll cannot change mode/order |
| Free | KEEP real Prompt Family/frequency/manual work; carry all legitimate edit/order/hide/split/retention semantics |
| Pro | ADOPT AI-selected existing-input candidates through the same UI, subject to real entitlement/service/processing/budget gates |
| Search | ADOPT one ordinary Archive historical-user-input query; no Input/Thought/Context classification tabs |
| Use | KEEP exact fill/copy and draft/IME/target/unknown-result protections; same-width short full-text check and precise selection |
| Carrier | SELECT narrow floating board A; no native Side Panel or dual-carrier migration in this scope |

This is approval of the design baseline and required behavior. Final production material fidelity, native browser interaction, model usefulness and installed compatibility remain separate acceptance. Fixed synthetic Pro samples and the existing 193 prototype assertions do not close those gates.

## 2. Supersession ledger

| Prior source/direction | Superseded part | Preserved part |
|---|---|---|
| Earlier standalone Popup proposals | Popup as the primary long-term browser workflow; count/status/maintenance-heavy default layouts; duplicate PAIA entrances | Actual Popup runtime and its onboarding, Next, pause, update and recovery capabilities until S4 replacement acceptance |
| Browser Architecture Research / Browser Final Design v2 and `NATIVE_SIDE_PANEL_ACCEPTANCE.md` private attachments | Toolbar-to-native-Side-Panel as final baseline; multi-type side-panel search; native-panel S0 as first new architecture milestone; independently open large browsing and prompt carriers | Target/range/draft protection, source revalidation, truthful evidence, original control replacement obligations and full PAIA editing boundary |
| Adaptive v3 / `INTERACTION_AND_INCREMENT_SPEC.md` private attachment | 376px candidates, roughly 613/620px search/check windows, long-form floating reader, native C handoff and dual-carrier session requirements | User-controlled mode, search/geometry separation, bounded truthful original text, one Archive search owner and privacy |
| `PROMPT_REUSE_SURFACE.md` earlier presentation | Multi-line display where it conflicts with single-line v4; old fixed maximum height and below/side placement where it conflicts with the new safe band; automatic expanded-view restoration after a true document replacement | Prompt Families, stable identity, human edits/order/hide/split, verified fill-only insertion, user-close/IME safeguards, provenance and actual previous evidence |
| Earlier Stage1/2 FINAL_CLOSED / MAINTENANCE_ONLY wording | Reopened only for explicitly adopted v4 surface, narrow Archive delegation and associated regressions | No broad reimplementation of accepted Family/data/composer semantics; unchanged prior tests/evidence remain applicable |
| `PROMPT_REUSE_STAGE_3A.md` | Only any UI-entry/layout wording that requires old Popup placement and is replaced after S4 | Independent default-OFF browser-session local new-reply permission, conditions, ephemeral retention, revoke/late-result fences; remote Stage3B stays unauthorized |
| AI_USAGE_ARCHITECTURE | v4 Pro historical-ID selection is a new scoped candidate facet requiring explicit mapping in the existing AI admission system, not an implied extension of reply-oriented Assist scope | Sole numerical quota/job/budget authority, unrelated Free Assist/Organize allowances, service/financial/processing gates and zero-model ordinary search |
| Archive IAH-1.1 | Adds only the explicitly requested board-to-Archive same-query/current-Input handoff, after existing guards | Neutral generic Archive entry, full main layout, local search semantics, precise result arrival, origin Back, source/working distinction and no external Archive fallback |

The earlier Popup/Side-Panel/adaptive v3 deliverables were inspected as conversation design attachments. At the inspected main there is still `action.default_popup`, no adopted Side Panel runtime, and no discovered NIB document set. Do not describe this PR as deleting a deployed Side Panel or canceling an active Side Panel branch. If a later integration introduces an overlapping plan, Root reconciles this exact ledger before selecting new work; do not modify that branch unilaterally.

## 3. Explicit non-supersession

Keep all existing TOPIC, CTX4, SET2, SYNC, AI-COST, IAH task assignments, current failures, incomplete evidence and independent local work. v4 is not permission to interrupt Human sibling/Repository work, restart old product rounds, recover missing unrelated visual references by substitution, or merge preserved PR #99/#132.

Do not delete historical documents or receipts. New STATUS references the byte-identical predecessor where needed; that predecessor is incorporated evidence/instructions for unchanged work, not a second scheduler. AUTHOR/MASTER links make the new bounded browser contract discoverable without copying its stages into multiple competing queues.

Source deletion/non-reentry, retained underlying data, tombstones, official-import eligibility, canonical body/revision ownership, capture behavior, manual recovery and accepted privacy rules remain unchanged. A UI visibility change cannot grant a read, a reuse edit cannot rewrite sent history, and an AI result cannot create a fictitious historical input.

## 4. Readiness versus execution

| Dimension | This delivery |
|---|---|
| Narrow-board product scope | Owner approved |
| Canonical integration | Proposed through this Draft PR; not merged |
| S0–S4 runtime | NOT_STARTED_BY_THIS_TASK; no current-turn authorization |
| Public/installed visual acceptance | NOT_RUN |
| Real Pro membership/model/service | NOT_QUALIFIED by this task; dependency-gated |
| Popup removal | NOT_AUTHORIZED until complete future replacement acceptance and entry decision |
| Side Panel implementation | Not selected for v4 |

After a later explicit runtime instruction, Root selects the first dependency-safe batch from PLAN within the existing queue. S0 is the first NIB outcome, not a command to abandon in-flight work. S2's manual compatibility constraints already apply in S0/S1. S4-local need not wait for live S3; S3 remains honestly uncompleted.

## 5. Remaining bounded decisions

The proposed final toolbar action is **open/focus PAIA, reusing a suitable existing current-window tab without reload**, while the orb owns in-page quick reuse. Specific board searches/input checking carry explicit Archive arrival intent. This is the recommended S4 entry behavior; obtain the owner's final confirmation before cutover. Do not repeatedly ask about the approved 336px/44px/no-Side-Panel design or ordinary engineering details.

S3 live activation still needs actual provider/region/retention/fees, trusted entitlement and scoped processing authorization under existing AI_USAGE gates. This is not a request for new broad chat-reading permission. Local search/frequency implementation does not depend on those gates. Background AI refresh on captured input is not included in the initial explicit-intent live slice; expanding cadence needs its own bounded admission decision.
