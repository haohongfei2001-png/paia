# Consumer UX Contract — content-first refinement

**PAIA-CONTENT-FIRST-1.0 / OWNER_DIRECTED / PLAN_UPDATED / 2026-10-16.** Current scoped targets: **TL-PT1-UI-1.4 / CTX4-UI-1.4 / IAH-1.5 / SET2-UI-1.4**. The owner requested removal of redundant titles/explanation, manual New Topic, Topic-card quotations and all reader search, with deliberate recomposition rather than empty holes. Apply these changes to the existing white-refined design, not a new concept. [Reference manifest](CONTENT_FIRST_REFERENCES_2026-10-16.md) identifies the resulting prototype and 15 rendered states. Layout measurements are implementation references; they are not production acceptance or a separate post-delivery pixel review.

The complete preceding UX is preserved byte-for-byte in [PRE_CONTENT_FIRST](UX_CONTRACT_PRE_CONTENT_FIRST_2026-10-16.md), blob `eccbe8f821398675ccf96fc4cf5ab48b64560171`. All its nonconflicting §§0–8 and incorporated older product, data, source, editing, permission, recovery, accessibility and verification obligations remain normative. The finite replacements below prevail over conflicting old prose, images and tests. Current STATUS and existing domain plans remain the execution system.

## 0. Product and visual family retained

PAIA is a personal context system built from attributable user expression: capture, find, read, correct, organize, continue and reuse; reusable Prompt Families/manual expressions; independent Context; and controlled qualified AI use. It is neither a chat client, a static reader, a dashboard nor an autonomous agent. Source evidence, Working Input, Thought canonical bodies/placements and independent Context Items remain distinct. All non-retired capabilities retain real discoverable routes and original owners, not merely a promise in documentation.

Retain three primary spaces 档案 / 思想库 / 用于 AI and secondary Settings, separately authoritative brand, white/near-white surfaces, darker near-neutral text, fine boundaries and restrained blue action/selection/focus. Existing dark/system appearance and saved reading preferences remain. White refinement's palette roles continue: main `#ffffff`, rail `#fcfdff`, ink/prose `#222832`/`#343b45`, secondary `#687381`, action `#3769c9`, selected `#edf3ff`, fine divider `#e1e6ec`; accessible adaptations use existing semantic roles. No new theme setting, gray dashboard, oversized glass surface or generated collage.

The input floating-board candidate is not automatically adopted by this request. Existing NIB/Prompt geometry, exact-text checking, free Archive search, manual/frequency continuity, AI admission and Stage3A consent remain independently owned. This change neither removes its search nor turns it into a reading interface. Website copy/layout, accounts, runtime deployment and service activation are outside this task.

## 1. Remove redundant chrome, not meaning or evidence

Where navigation already identifies the space, remove the repeated visible large page title, English eyebrow, slogan, introductory paragraph and redundant headings such as 我的主题. Do not replace them with a smaller duplicate, a tooltip tour or a blank reserved header. Retain a nonvisual semantic page heading/landmark and accessible control labels. Page identity must not disappear for assistive technology.

Actual content identity remains: Topic name, Section heading, Conversation title, current Context object or substantive detail title. Show the necessary identity once rather than in a breadcrumb, eyebrow and large title simultaneously. Do not rename user text to obtain a cleaner composition. In wide Settings, the selected category in the adjacent directory is sufficient; avoid repeating it over the same rows. In narrow sequential Settings where that directory is absent, one compact current-category heading plus Back remains necessary.

Ordinary copy that explains an already clear control or advertises the product is removed across Home, Reader, Settings and auxiliary resting states. Context-card category descriptions and footer reassurance/explanation are not required. Keep actual state and action-local information needed to make a decision: connection versus permission, save failure, incomplete coverage, invalid target, capture scope, account change, restore impact and destructive consequences. Do not indiscriminately hide all paragraphs or all status nodes.

This removal of explanatory language is **not deletion of Source/evidence/history or its inspection action**. Real provenance, exact original/current distinction, manual-source truth and current denial/deletion fences remain. Legal/help content remains complete at its deliberate destination. Minimal explicit consent retains its accurate short scope; no welcome, sample document or repeated tutorial returns.

## 2. Thought Home is Topic + Section only

Keep three columns on a normal wide workspace, two/one responsively, deterministic ordered stacking and content-sized independent cards. Each card contains its authentic Topic title and actual named Section links, with a quiet contextual overflow for legitimate existing-topic actions. Remove the original-expression quotation/snippet, generated summary, description, quote separator and separate 打开主题 footer. The Topic title opens the Topic; a Section opens that same Topic at its real Section. The card is not a giant competing click target around its buttons.

Remove decorative totals, Section trailing counts, dates/update labels, activity scores and root sort choices as already decided. Nothing is moved into a normal count menu. No fixed taxonomy, fake chapters, stock quotation or filler is created. A Topic with only an untitled default Section remains a valid compact title-only card; explicit empty named Sections remain reachable and writable. Existing bodies/descriptions are not deleted simply because Home no longer displays them. Explicit overview search may still show an exact, eligible matching excerpt; that is a search result, not a Home-card preview.

Retain one complete-set meaningful-human-activity order: reliable original expression time or acknowledged substantive writing/continuation/edit, never view/hover/count, raw updatedAt, rename, AI, index, sync or ingestion time. Historical imports do not become today. Unknowns and ties retain deterministic fallback, stable page snapshots and bounded continuation. New order applies at safe boundaries, not under an active target or editor. Back restores the actual previous snapshot/anchor before reconciliation.

### 2.1 Manual New Topic is retired

Remove the standalone user New Topic workflow from header, empty state, overflow, contextual shortcuts and keyboard dispatch; remove obsolete handlers/listeners and its redundant dialog. Do not hide only the primary button while leaving the same create flow elsewhere, and do not replace it with a plus card, command palette or mandatory manual setup.

This is retirement of the generic user-facing creation workflow, **not deletion of existing Topics, Sections, Entries, placements or domain creation primitives**. Keep lawful automated Topic formation, strict restore of existing identities, existing-topic rename/remove/undo, human Section creation/order and Entry writing/moves. Previously separately authorized and confirmed Section promotion retains its original entity-specific contract; it is not a substitute generic New Topic route and gains no broader activation permission here. No unsolicited bulk regrouping, data migration or creation during render. Empty-state reading/manual reuse stays useful without a live model; report true formation availability without reviving New Topic.

## 3. Reader search is removed; discovery remains outside reading

| Surface | Search behavior |
|---|---|
| Thought Home / explicit overview results | Retain one scoped library search, full eligible corpus and exact result targets. |
| Thought Topic/Section Reader | No app-owned search input, icon, shortcut launcher, find bar or match-navigation control. |
| Context Home / My Inputs authorization directory | Retain existing scoped discovery and All/Selected list behavior; no new search type. |
| Context Information/Rules/Now reading/editing; read-only Topic/source/scope inspection | No reader search. Suspend the background search while a modal reading layer is active. |
| Archive browse / explicit search results | Retain one source-aware Archive search in the navigator. |
| Archive Conversation Reader, including its middle navigator | Remove both current-Conversation Find and visible/clickable global Archive search for the whole reading state. Return to browse/results restores the discovery control. |
| NIB narrow input board | Its existing free historical-Input search and bounded exact-text check remain; it is not retired reader search. |

Do not hide search visually but keep focusable inputs, invisible filtering, shortcut handlers or background queries active. Do not add a magnifier, floating replacement, slash command or menu route to reopen search inside Reader. Release reader-specific subscriptions and accessible ownership safely through existing controllers. Ctrl/Cmd+F remains browser-owned; do not intercept it. It is not represented as complete search of unmounted virtualized content. Existing explicit overview-search shortcuts can operate only in their appropriate discovery state.

**Opening a search result still lands precisely on its real Input/Entry/Section occurrence.** Preserve current revision/eligibility checks, Unicode-safe offsets, temporary non-editing highlight and eligible filtered-target reveal without Keep. Reader displays complete eligible content rather than a formerly saved local-find filter. An arrival marker is not a new interactive Reader search mode.

Preserve discovery query, source/project scope, ordered result snapshot, continuation, tree expansion, result-relative scroll/focus and Reader origin in the existing bounded view/session owner. On explicit Back/Forward or returning to discovery, restore that actual state before resuming any necessary query; never replay cached private body as truth. Retire stale local-Find presentation state compatibly without deleting shared search services, indexes, NIB handoffs, Context external retrieval or other consumers. A former reader-Find saved field must not silently filter text or auto-open a removed bar on refresh.

## 4. Recompose the space after removal

Do not keep previous large header/footer/min-height spacers. Use the actual remaining content to set intrinsic height. A compact top tool line contains the retained overview search and real actions only; there is no fake title to balance it. Align cards and content to stable axes and preserve adequate outer breathing room rather than stretching six short cards to fill the viewport.

Measured candidate anchors: overview tool line 44px minimum, search about 280×40px, 24px following gap; Thought workspace about 1120px maximum, grid gap20px, card padding20px 22px 19px, radius17px, title18px, 16px separation before chapter links, default chapter row38px growing to at least44px coarse/narrow. These are reference values, not fixed-height clipping rules. At ordinary sparse density two-/three-Section cards become shorter, not narrower or more decorative. Long labels, 0/1/many Sections and more Topics must still reflow.

Reader keeps a compact contextual Back/actions line, a single content title and real chapter directory; remove empty search wrappers and rebalance heading-to-text spacing. Archive source controls align at the top of the navigator when reader search is absent; discovery search reappears naturally on return without jumping to another document. Settings directory and first option align after the duplicate page/category heading is removed; a wrapped label can grow without overlap. Context retains its four object titles, genuine directory links and separate bottom permission controls; the minimal search/connection/global controls share the remaining top row and stack normally when narrow.

Preserve approximately1.65 leading at saved17px ordinary prose, modest same-Input paragraph separation and clearer between-Input spacing. Never strip original newlines/blank lines, lists, poems, code, Unicode or source time. No body-hash/revision/copy change follows from reflow. Keep existing editor, caret/selection/IME/draft/conflict/save/undo and identity-relative reading anchors. No new line-spacing preference or palette selector.

## 5. Full product obligations and explicit exceptions

The predecessor's full Context ownership/default-off/Global-Card-Topic-connection/current-caller/deny/purge/revision/in-flight/cache/cursor requirements remain. Home stays metadata-only, never private fact text in hidden DOM, aria or hover. Removing reader search does not reduce actual authorized AI query/full-read/revoke goals or incremental maintenance fidelity. Three AI reading styles and human protection remain. Context detail editing, add/rename/move with permission-impact confirmation, evidence, removal/undo and controlled scope preview remain through existing owners.

Settings retains six groups and22 primary operations plus secondary position reset; original enums/shared preferences, unknown/failure/retry, fail-closed masks and independent capture/filter/local suggestions/cloud/AI permissions remain. No typography example, welcome tour, API key, account/region console, export/backup generation or generic purge. Complete BNS adapters, publication/account/retirement/partial-deletion/conflict and automatic-new-device-recovery obligations remain, along with typed Input/Topic/Entry/Placement recovery, real file preflight, accurate Source and verified help/legal/feedback routes.

No website redesign, new Prompt permission, schema migration, provider/paid request, actual account, capture activation, user upload, release or install follows from this design request. Missing external services block dependent live claims only. Removing redundant headings or search chrome is not permission to weaken privacy, error disclosure or source integrity.

## 6. Supersession, execution and evidence

The current written decision and owning functional contracts prevail over the resulting reference pixels. The new prototype supplies layout evidence, not authority to port its store/router, iframe bridge, broad late CSS overrides or synthetic grants. Earlier white/blue originals and their tests remain exact historical artifacts; they are no longer final pixel targets for duplicated titles, Home excerpts, New Topic or Reader search. No new screenshot approval is asserted beyond the owner's requested design direction.

| Existing task | Current delta |
|---|---|
| TOPIC-05.1/02/03/04/05/08 | Metadata-only Home cards, generic creation retirement, overview-only search, exact arrival/return, recomposed cards/Reader. |
| CTX4-01/02/03/07 | Remove duplicated chrome; keep four private directories and list discovery; reading/detail layers have no app search. |
| ARCHIVE-HOME-01–06 | Discovery-versus-reading search visibility/lifecycle, remove local-Find UI, retain source/query/arrival/Back/editor semantics, recompose. |
| SET2-01/04/05 | Navigation supplies title, compact rows/details, necessary mobile identity and state, no explanatory duplication. |

Reuse existing qualified code and preserve current seven-plan scheduling/shared writers. Remove only retired UI-specific tests; replace them with no-search/no-create/no-excerpt assertions, unchanged corpus/identity/permission/body checks and real search→exact Reader→Back restoration. Do not delete shared query/index/NIB/Context tests to make retired UI pass. Preserve complete prior safety, long-read/full-corpus, restore/IME/error, dark/narrow/320px/200% text, keyboard/target/focus/reduced-motion obligations; test actual source/release under existing risk policy, not one certification per label.

Baseline main `ff669b33b3fdb8ef54b0763f95e022209d85c8b3`, tree `5a5e3c997ca32fe563b4b7a145fdcd32c92e1b18`. This task changes design artifacts and documentation, not production files or installed behavior. The current prototype has44 limited synthetic checks and15 screenshots, not production/accessibility/service certification. References records exact files and limitations. No current STATUS, CI, version, website, user data, permission, service or installation change is claimed.
