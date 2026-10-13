# Consumer UX Contract — approved existing-design white refinement

**PAIA-WHITE-UI-1.0 / OWNER_APPROVED / 2026-10-13.** Current presentation targets: **TL-PT1-UI-1.3 / CTX4-UI-1.3 / IAH-1.4 / SET2-UI-1.3**. The owner approved `PAIA_既有设计精修_交互原型.html` and requested in-place GitHub plan integration. [Exact references](WHITE_REFINEMENT_REFERENCES_2026-10-13.md) bind the unified prototype, three refined single-page HTMLs and 22 packaged screenshots. Screenshot 12 is the old-blue comparison only, not a second production target.

The complete preceding shared UX is preserved byte-for-byte in [PRE_WHITE](UX_CONTRACT_PRE_WHITE_2026-10-13.md), blob `f56738330e8f80d573b23a7f75ad3763e136b080`. **All its nonconflicting sections 1–8 and every incorporated prior product, behavior, privacy, editing, source, recovery and verification requirement remain normative.** This is not a new product or execution plan. Current STATUS, existing task identifiers and shared-file owners remain controlling.

## 0. White-led visual baseline and unchanged product vision

PAIA remains the personal context system built from attributable user expression: find, read, correct, organize, continue and reuse what the user said; reuse prompts; maintain independent Context information; and provide qualified context to AI under explicit control. It is not reduced to a static reader, a generic notes suite, a chat client, a dashboard or an autonomous agent. Source evidence, Working Input text, Thought bodies/placements, independent Context Items and authorized Topic references retain their distinct owners. Prompt reuse, incremental AI organization and human protection, all three AI reading styles, complete authorized external reads/revocation, cross-source continuity, Sync and automatic new-device recovery keep their full existing goals and actual service gates. A smaller interface is not a smaller product contract.

**Use the refined existing four prototypes, not the generated six-panel concept collage.** No assistant responses or send composer in Archive; no single-column fixed-taxonomy replacement for Thought cards; no replacement of the four Context objects by education/hobbies cards; no My Space/account/region/timezone/backup-generation additions. Preserve the separately authoritative logo, three primary spaces and secondary Settings. The sample wordmark is not a new logo decision. Website, browser floating-board/NIB geometry and other independent design owners are not redesigned by this application-surface approval.

### 0.1 Color roles, not all-over tint

White or near-white content surfaces, darker near-neutral text and restrained blue emphasis are now the final light-mode target. Keep existing type roles, rounded boundaries, card proportions, directory composition and light depth; do not revert to the old empty rectangles, introduce a gray dashboard canvas or flatten every surface into an undifferentiated page. Remove the full-screen blue wash and continuous blue-tinted prose, rather than merely changing one background token.

| Role | Refined HTML starting value |
|---|---|
| Main canvas / content and card surface | `#ffffff` |
| Primary rail / Archive navigator | `#fcfdff`, subtle `#e5eaf0` boundary |
| Main ink / prose | `#222832` / `#343b45` |
| Main title / content heading | `#242d3b` / `#2b3543` |
| Directory text / secondary information | `#525e6d` / `#687381` |
| Primary accent / text action | `#3769c9` / `#3566b6` |
| Selected fill / selected text | `#edf3ff` / `#305eac` |
| Divider / subtle divider | `#e1e6ec` / `#edf0f3` |
| Focus | `#5a85ca`, visible shape as well as color |
| Quiet card depth | reference `0 5px 13px -10px #192f572c`; stronger only on an actual temporary layer |
| Ordinary 17px prose | approximately 28px leading (`1.65` reference), respecting saved size/width |
| Dark canvas / surface / prose | `#1a2028` / `#202731` / `#d7dde5`; corresponding legible dark roles |

These values come from the later `paia-refinement-palette` and `paia-refinement-structure` blocks, **not the older blue declarations at the beginning of the HTML**. Use their final computed result as the reference. Map into current semantic tokens/scoped components; do not port the broad demo selectors, repeated override sheets, inline scripts or weakened CSP. No font binaries. Keep accessible text, control, focus, error and permission-state distinctions even where an incidental sample pixel needs adjustment. Do not claim accessibility or comfort certification from palette values alone.

Blue identifies selection, links, focus, important actions and permission controls, with only small icon/edge accents. It does not color all ordinary text. Error/destructive semantics remain distinct; white refinement is not permission to make every state blue. Keep the same hierarchy in dark mode, system appearance and saved user settings; white does not mean forcing light mode.

The viewer's **白色主导 / 原蓝白对照** switch is review-only. Production keeps its existing system/light/dark preference, not another palette preference or a second theme product. The old-blue comparison preserves the refined structure for a fair comparison; it does not restore earlier rejected content or compete with the approved white target.

## 1. Thought Library — preserve content cards and one meaningful activity order

Keep the desktop three-column starting composition, responsive two/one columns, content-sized Topic cards, actual chapter direct links, eligible exact short expression preview, contextual actions and the current-Topic directory with continuous Reader. Do not replace this by the concept collage's fixed category list or seed its taxonomy. Sparse and empty Topics remain compact and truthful.

Retain the complete previous §1: no UI-added Topic totals, Section counts, chapter/item totals, Today/update/date badges or activity scores in overview/directory. Human-written numbers and scientific/technical Topics are not removed; genuine Source/Input timestamps and necessary coverage/error/continuation information remain. Do not move decorative counts into an overflow menu.

Exactly one natural automatic meaningful-user-activity root order remains. Qualified original expression time and substantive acknowledged human writing/continuation/edits drive the existing bounded projection, not storage updatedAt, views, rename, moving a reference, AI, indexing, sync or ingestion. Old imported content retains original activity; unknown times do not become today. No analytics collector, root manual sort/pin mode or new score control. Preserve legacy root-order data non-destructively and human Section/Entry order/negative intent. Order the complete eligible set, use deterministic ties and stable visible snapshots, and restore actual Back/query/card anchors before safe reconciliation. A clicked card must not jump away.

All prior create/rename/promotion, editing, Section-aware writing, move/removal/undo, multi-placement and original/source/AI style behavior remains. The mock's fixed activity seed, synthetic corpus and simplified mutation handling are not production algorithms.

## 2. AI Context — four objects, private-directory first surface

Keep **我的信息 / 我的规则 / 我的现在 / 我的输入**, 2×2 on wide screens and one column when narrow. The first three show suitable real category-level directory labels only, never specific personal facts, Item text, summary or first-N-character excerpts. Do not synthesize fact-bearing headings or mount private text in hidden DOM, title, tooltip, accessible names or hover. A generic real card entry is sufficient without safe subdirectories; no artificial categories or classification prerequisite. The fourth card may show actual Topic titles/directory cues, not their body text. Preserve current masking and eligibility.

Directory links must resolve to actual groups/content. Opening a card, directory or explicit local search reveals the intended detail without granting access. Ordinary Home must not reopen prior private content/search by default. Existing deliberate Back/history restoration stays guarded. Compact card heights follow remaining directory content, not old body-preview minimum heights. Content navigation and independent bottom access controls remain separate; opening a card marked private is not an external grant.

Retain the entire preceding §2 and CTX4 contract: independent Items versus Topic references, direct edit/autosave/durable ACK, groups, add/copy/evidence/order/move confirmation/removal/undo, local search, My Inputs All/Selected and local read-only inspection, controlled readable-scope preview, actual connection management, current revision/generation/eligibility and stronger deny/purge fences. New users remain global/card/new-Topic off and unconnected; fixture preselection is not a default. One shared PAIA scope, no per-client matrix or Archive fallback. Full maintenance fidelity and a real client read/revoke journey remain required; a pretty Home does not complete them.

## 3. Reading — retain exact text, correct visual rhythm

Across Archive/Thought/Context and substantive auxiliary prose: close wrapped lines, modest same-Input paragraph separation and clearer separation between independent Inputs. The refined 1.65 leading at 17px realizes the prior 27–29px tuning direction; scale to actual saved preferences. Fix duplicated margins, empty-block rendering and newline styling, not the stored text. Preserve intentional blank lines, poems, lists, code indentation, Unicode and exact copy/serialization. Never rewrite source, body hashes or revisions merely to make a screenshot tighter.

Retain continuous unboxed reading, proper time precision/provenance, long-content windowing to the real eligible end, contextual edit/source/history actions and the existing editor. Source/current evidence remains distinct. Search offsets/highlights, Input/revision/text anchors, caret/selection/IME, dirty work, durable saves/conflict/retry and safe return must survive reflow, source switching, new captures and appearance changes. Do not add a line-spacing control or reset the existing font/width choices to the mock's constants.

## 4. Archive — one source selector, not a new chat interface

Keep the three roles: primary navigation, Source/Project/Conversation navigator and continuous Working Input Reader or flat Input-first results. Ordinary entry leaves Main unselected and blank; no latest/first/host auto-open, welcome, feed, assistant output, avatars, reconstructed exchange or send box.

The current source name itself opens actual available source choices and deliberate 全部来源 search. Ordinary browsing shows one source tree, not simultaneously expanded ChatGPT/Claude sections or a permanent tab strip. Locally readable imported-source data does not prove live capture support. No fixture provider, credential probing or favorite-source store.

Source choice preserves query, clears incompatible Project/content/reveal, coordinates navigator and enforced Archive query scope after existing edit/IME guards and rejects stale requests. A nonempty query displays that scope's results; empty query leaves Main blank. Preserve validated view-source lifetime. Primary Archive clears query/Project/Reader, may retain the current Source and never resumes a Reader. Clear Project returns to its Source; broader All is explicit. Project name/arrow only disclose. Reader Find remains independently Conversation-local. Exact Input activation, Unicode-safe current text, temporary eligible filter reveal (not Keep), full coverage and actual Back/Forward/NIB/Topic handoffs retain the complete preceding §4 and interaction matrices.

## 5. Settings and auxiliary pages — compact controls, full capabilities

Keep six groups and the established **22 primary operations**, plus secondary position-only reset. No reading sample/effect preview, hidden replacement preview, sample time, repeated slogans or explanation under every obvious row. Remove corresponding unused layout/DOM/glue in production, not merely CSS-hide it. User chooses named values, receives truthful save feedback and sees the effect in actual readers. Preserve supported enums, actual shared preference owner, saved sizes/widths, system language/theme, preview mask and safe retries. No region/timezone/account/API-key/export/backup-generation or duplicate permission console.

Keep short action-local information for consent, capture/filter distinctions, actual failures/unknowns, irreversible scope, account transfer, restore and conflict consequences. Meaningful file preflight and human-conflict comparisons are not typography demonstrations and must remain. Use ordinary pages for substantive workflows/long documents, temporary drawers for Source inspection and short dialogs for actual decisions. Never omit risk text to imitate a sparse reference.

Sync/restore/import/Source/typed recovery/Help/feedback and connection goals stay with their existing owners. Preserve all BNS adapters/state/publication/retirement/account/conflict/automatic-new-device-recovery requirements, including states unpictured here. Actual AI connections remain in 用于 AI under CTX4-06/07; Settings has one route/status entry. No Settings-owned permission/cloud engine. Preserve verified legal/content/contact/update channels and existing failed-draft/explicit-send semantics; no fictitious effective terms, latest-version claims, automatic logs or private-content upload.

## 6. First use — one minimal permission, no tour

Enter the actual application; do not rebuild an introduction/welcome/example page or mandatory intro → consent → import sequence. Only genuinely undecided capture consent gets one compact surface: explicit heading, brief accurate scope, 开始保存 / 暂不开始 and optional complete boundaries. The reference starts around 430px, bounded by viewport and enlarged text. No sample corpus or second teaching/confirmation stage.

Retain the preceding §6 in full: actual eligible sent/displayed user-text scope and exclusions, Temporary Chat policy, reliable time and pause/resume disclosure; required platform consent is not bypassed. Decline/dismiss remains off, allows continued app use and respects existing decision lifetime; later Settings enable remains reachable. Report enabled only after the original acknowledged consent/enable operation. Failed persistence stays off with retry. Capture does not enable suggestions, Sync, external AI or billing. Existing users are not re-onboarded because the palette changed.

## 7. Precedence, history and exact references

Order: current explicit product/behavior/permission constraints and this white refinement → identified refined HTML's final rendering and applicable screenshots → prior approved unaffected design details. The original six simplifications remain mandatory. The generated six-panel concept collage is **rejected reference material**, not an alternate authority. Earlier dashboards, empty equal-height cards, personal Home snippets, counts/manual root sorting, inflated leading, dual default source trees, reading samples and welcome tours cannot return under pixel matching.

[PRE_WHITE](UX_CONTRACT_PRE_WHITE_2026-10-13.md) and the per-domain PRE_WHITE snapshots preserve exact preceding Git blobs and their full incorporated contracts. Earlier source dates, NOT_STARTED, artifact statuses and PASS/FAIL describe their own tasks; they neither restart completed work nor certify this new UI. The refined package's DESIGN_CANDIDATE wording is superseded by this owner approval without rewriting original bytes. No new production tests or accessibility/real-service/installed-result claims follow.

Only scoped color/depth/reference changes override old full-blue/light-tint clauses, including older auxiliary BNS/Context transcriptions. No data model, semantic ownership, capture/permission/retention, paid-service policy, website requirement or other unrelated feature is changed. The same planned capabilities must remain discoverable and usable through the actual application, not merely preserved in a document while removed from runtime.

## 8. Existing execution and required evidence

Keep TOPIC-01–06 (especially 05.1–05.8), CTX4-01–07, ARCHIVE-HOME-01–06 and SET2-01–05. Their current plan paths remain the sole work plans; the shared reference manifest is not another queue. Reuse current completed foundations. Map palette/type/spacing into existing shared roles once, coordinate one writer for shared AppShell/editor/preferences/query/worker boundaries, and integrate domain presenters without disrupting active work. Current STATUS and all seven Canonical goals remain; no model/account/Sync prerequisite blocks ordinary independent local UI.

Actual convergence compares native source/release with the new applicable white/dark references and all retained states. Preserve full coverage, truthful defaults and source times, activity negatives, first-surface privacy including DOM/attributes, real directory targeting, permission/navigation separation, source/scope/Back behavior, edit/IME/conflict/undo, exact multiline copy and long-reader bounds. Verify shared preferences across real pages, no preview/tour, 320px reflow, 200% text, keyboard/focus/target/contrast and reduced motion. The package's 79 reported prototype checks and eight text-scale checks remain only synthetic evidence, not a replacement for production or live provider/client acceptance.

Do not ship the review palette toggle, scene menus, inspector hooks, synthetic values, sample grants, iframe/base64 navigation, message bridge, demo stores or broad CSS overrides. Strip them rather than letting a passing mock masquerade as implementation. Apply existing focused/affected and risk-escalated gates; do not weaken tests, inflate timeouts or relabel prior failures. Documentation baseline: main `8021be46e51d23812aa4d0b725e601afdf335df2`, tree `95c08234186c80a9feee59ee6bf3b7db5fd9090f`. This task edits plans/references only, not production, versions, CI, website, personal data, Mac, services, accounts, spending, installation or deployment.
