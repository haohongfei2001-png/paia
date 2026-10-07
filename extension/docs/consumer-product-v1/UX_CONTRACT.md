# Consumer UX Contract — PAIA Consumer Product v1

This is an implementation contract derived from PRODUCT_INTENT_CONTRACT.md. It may evolve with real usability evidence, but it must not delete higher product intent.

There is no mandatory standalone prototype phase. The production implementation is iterated until it satisfies this contract.

Thought identity/formation follows [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md). The subsequently adopted [THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md), TL-PT1-UI-1.0, supplies the sole current Thought presentation contract; section 5 below routes to it. Implementation and acceptance are TOPIC-05.1 through 05.8 in [the Topic plan](TOPIC_ARCHITECTURE_PLAN.md), not another UI design queue. Common save/IME/accessibility and unrelated spaces retain their own contracts.

The [current consumer scope](../../PRODUCT.md#current-consumer-scope) supersedes retired surfaces in older designs. Cancelled execution must refuse old commands as well as remove its entries; hidden internal safety/maintenance capabilities remain where specified. Neither change authorizes clearing old data or credentials.

## 1. Global product shell

Desktop primary navigation is fixed:

- Input Archive
- Thought Library
- AI Context

Settings is low-frequency. Capture health is system status, not a dashboard destination. Revisit is retrieval/re-entry, not a new truth space.

Wide desktop uses a stable primary rail; Archive/Thought may add a contextual navigator; the Reader/workspace owns the remaining area. Compact desktop may compress navigation but must preserve object identity and back behavior. Tablet uses a sheet/panel navigator. Phone uses stacked navigation instead of squeezing desktop columns. The adopted Thought reader does not add a permanent Topic/Section tree; its Section links are in-page anchors.

Archive opens directly into primary navigation, a narrow project/conversation navigator and a blank Reader. No conversation is selected by default; title, time, ordering and body stay empty. Returning to its root clears the Reader and preserves navigator state. Explicit reading-route refreshes, unsaved edits and reading anchors must not be cleared accidentally. Other root pages do not reserve unnecessary empty navigator columns. AI Context remains a product direction with execution disabled.

## 2. Visual language

- system-font stack with reliable Chinese fallback;
- long-form body optimized for serious reading;
- restrained surfaces and borders;
- metadata subordinate but legible;
- one restrained accent family;
- destructive color only for destructive actions;
- no gratuitous decorative gradient/glow/glass or generic AI styling; restrained glass is allowed when it has a functional surface/adaptation role, including the approved Prompt Reuse overlay;
- no dashboard statistics unless a real user task requires them;
- no per-message card chrome when whitespace can provide structure.

Use one shared component language: AppShell, PrimaryNav, SourceScope, ProjectTree, ConversationRow, TopicTile, ReaderHeader, ProseBlock, TimeStamp, ScopeSearch, SelectionToolbar, OverflowMenu, InspectorPanel, InlineStatus, ProgressRow, ReviewDiff, PermissionSummary, RecoverySheet.

Do not create page-specific variants of the same search/menu/toast/dialog without a product reason. Shared component names do not restore superseded Thought list/Years/candidate layouts. The approved Root's rectangular grid is allowed; its content is Topic name plus real Section overview, not metadata cards.

## 3. Global state behavior

### Loading
Keep already usable content visible. Delay skeleton/spinner until latency is perceptible. Later-page loading is local to the end of the list.

### Save
Durable acknowledgement precedes "saved". Avoid per-keystroke success noise. If saving is slow, show a quiet local state.

### Save failure
Preserve current text. Provide retry and a safe copy/recovery path. Never overwrite unsaved text by re-reading the persisted version.

### Partial/degraded
Limit failure to the affected provider/feature. Existing local content remains readable/editable where safe. Give a user action, not epoch/hash/adapter jargon.

### External changes
Do not rebuild active editor DOM or break IME/selection. Preserve dirty state and offer compare/reconcile when needed.

### Confirmation
Use only for true destructive, restore or external-authorization risks. Normal reading, local copy, autosave and reversible removal remain low friction.

## 4. Input Archive surfaces

### A1 — Archive root

Purpose: find prior expression using familiar source organization.

Default visible content in the narrow Navigator:
- current source scope;
- one scope search;
- collapsed Project groups;
- unassigned conversations;
- Conversation title;
- short content cue;
- latest reliable expression time.

Unknown Project membership is distinct from confirmed unassigned.

Do not add a permanent side dashboard, permanent material tray or duplicate explanatory headings.

The same narrow Navigator is present immediately at the root; there is no full-page directory step. Its Reader starts blank. Opening a Conversation fills the Reader, and returning clears it while preserving Navigator expansion/scroll.

Low-frequency history import and data actions live in overflow. Export and backup-generation actions are removed.

### A2 — Project/Conversation Navigator

Desktop Reader keeps this navigator available.

Requirements:
- clear selected row;
- stable Project collapse state;
- stable Conversation identity through Project moves;
- rename/membership updates affect only the relevant tree projection;
- temporary evidence loss preserves last known state rather than inventing unassigned;
- source-deleted state does not erase PAIA content.

No second content search lives in the Navigator.

Sorting may offer local deterministic order. "Source order" appears only when backed by reliable provider evidence.

### A3 — Conversation Reader

Purpose: view, think, directly edit and reuse one Conversation's user expression.

Reader header:
- current Conversation title;
- current-scope search;
- one ascending/descending order control;
- overflow.

The body is a continuous editable document. Date groups and concrete times remain visible but quiet. Source/provider is not repeated beside every paragraph.

Do not keep permanent per-entry rows of copy/source/context buttons. Use native text selection plus a contextual toolbar for Copy / Add to Thought / Use with AI / More.

Delete remains available using standard destructive semantics, not an X icon.

Search:
- one search for this Conversation;
- result count plus previous/next;
- match lands at the real body offset;
- searching must include content not currently mounted in DOM;
- closing search restores the reading anchor.

New capture while reading must not yank scroll. Show a small "new expressions" affordance.

### A4 — Direct editing

Editing is direct, not a separate mode.

State model:
clean → editing/composing → saving → saved
with retryable/conflict/storage failure branches.

IME composition must never persist broken intermediate text. Navigation flushes safely or holds a recoverable draft. Failure blocks destructive navigation only when real work would be lost.

Concurrent change:
- preserve local text;
- show compare;
- allow keep local as new version / adopt persisted / manually reconcile;
- never silent last-write-wins over protected user work.

### A5 — Source / Time / Version Inspector

A low-frequency side panel/sheet exposes:
- source/provider;
- source title/link when reliable;
- send-time evidence;
- capture/import/edit times;
- source original versus working version;
- version comparison/restore;
- Thought/Topic relationships.

Unknown time is explicit. Full internal IDs/ISO timestamps remain behind details/copy.

Restoring a version creates a new current version; it does not erase later history.

### A6 — Archive search and filters

One current-container search.

Results show:
- title/location;
- matching original/working text excerpt;
- time;
- necessary source/Project path.

Useful filters may include time/source/Project. Search results return to the real Reader location.

"Include filtered content" is separate from removed/deleted content.

Index-building/partial coverage must not be presented as "no results".

### A7 — Smart Filter

Settings controls light/medium/strong where supported; default light.

Reader only shows an unobtrusive scope indicator when content is filtered and can temporarily show all. User restore/edit/keep creates protected intent that automatic re-filtering cannot override.

Filtering is not deletion or AI exclusion.

### A8 — History import

Flow:
1. select provider/file;
2. preflight;
3. import;
4. result/review.

Preflight explains:
- provider;
- time range;
- estimated Conversations/Inputs;
- existing/new;
- unresolved branches;
- missing time;
- excluded author roles.

Interrupted import is resumable/idempotent. Re-import does not duplicate or overwrite protected edits.

Do not require understanding ZIP/JSON internals.

## 5. Thought Library surfaces — TL-PT1-UI-1.0

The complete current contract is [THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md). The former compact-list/recency cue, Content/Years and candidate-oriented interpretations are superseded for Thought only; their data, provenance, version and recovery guarantees are retained. Approval adopts direction, not runtime/production completion.

### T1 — Stable Personal Topic Root

Purpose: identify a Personal Topic and its existing internal aspects, then return to its content.

Use stable independent rectangular Topic blocks in the shared PAIA shell. Normal block content is Topic name plus bounded real named Section overview in durable order. No named Section is a normal title-only state, not incomplete organization; never fill it with a generated summary or Default/Uncategorized label. No default expression preview, recency/count/footer, images, shared table rules, Recent area, taxonomy bar or root-wide AI control.

Plain Section anchors open the parent Topic at the Section, never a separate folder route. Keep native link/focus behavior and text selection without accidental block navigation. Ordinary content/name/Section/search updates do not globally repack Root. New Topics use a suitable hole or append; a removed slot has no border or placeholder. Responsive columns follow usable width, not Topic count. 30/50/100/144 are real scale scenarios, not a catalogue or cap.

One Root search covers eligible Topic/Section names and Entry bodies beyond the current DOM. In-place matching can temporarily expose a matching Section or exact Entry excerpt; it does not create a second result directory. Explicit result stepping opens real text/Section offsets. Clear/close and Back/Forward restore prior overview, identity-relative viewport position and focus. Coverage failures are not no-results. See V2/V3 and TOPIC-05.2/05.3.

### T2 — Continuous Topic reader

Header: return, Topic title, one Topic search, compact Add Thought, Topic-local AI Organize and necessary overflow. Preserve current shared controls and reading preferences; no Content/Years tabs, timeline, permanent tree, statistics or default AI summary sidebar.

The body is one continuous reading surface over durable Sections and actual Entries. Untitled default Section content has no invented heading. Named Sections are natural unboxed headings; preserve manual empty Sections and order. Entry paragraphs have normal reading rhythm, quiet attributable time and source/version on demand, not bubbles, cards or metadata rows. Unknown time is not replaced with capture time. Bounded loading reaches the real end, without next-part dead ends or unmounting active editing/IME/selection. New content does not yank scroll. Search reaches unmounted content and restores the reader anchor.

### T3 — Section actions and Add Thought

A user may write directly into an explicitly active Section; without reliable Section context, use the stable default Section. Root-level writing can save before classification and remain lawfully unassigned. Use real current creation time/first-party identity, no chat send behavior or database form. Failed saves preserve text; durable acknowledgement precedes saved state.

Section inline rename/create/reorder and Entry moves are contextual, not a permanent manager. Preserve stable IDs, protected name/order and membership edges, with non-drag keyboard/touch alternatives and safe undo. A span selection cannot silently become a whole-Entry move. Default destination can be described in an action without gaining a durable name. Promotion uses PT-06 and the ordinary explicit confirmation language, preserving actual moved scope, body/provenance and old anchor mapping; new Topic access remains closed.

Dedicated response/relation creation and related-Thought viewing remain removed. Existing relation data remains compatible; lawful body editing and history remain available. No historical data migration or Source overwrite is implied by these UI actions.

### T4 — AI reading over the same durable Sections

Existing valid saved output switches locally. Durable Sections exist with AI Organize OFF and remain the same identities with it ON. Organize may alter derivative reading order, reversibly fold exact repeats and add small ephemeral headings, but cannot turn those headings into Section entities/Root overview or rewrite protected human structure. Durable formation belongs to the separate PT Organizer. Entry edits target their canonical body owner; heading edits target their own derivative field.

New generation/update is unavailable until real payment, server membership validation, authorized processing scope and unified AI backend exist. Keep an honest not-launched state and no silent paid retry. Existing saved AI work and legacy candidates remain readable/version-protected; candidate approval and Adopt/Keep management do not return. Hidden Topic-formation candidates remain entirely invisible.

Revalidate source, scope, content/Section revisions and human protection before activating output. Stale/partial/failed results preserve local text, show precise local state and do not invent completion. New/unprocessed material stays visible. Do not reflow composing/selected/dirty text. Transition explains structure with stable header/reading anchor and reduced motion, not decorative blur. Turning OFF returns around the same Entry. V6 and TOPIC-05.7 own detail; live semantic quality is separate from mechanical tests.

### T5 — Historical expression, not a separate timeline surface

Reliable time remains part of each expression and explicit scoped retrieval. Early/later/recent can describe retrieved evidence, never psychological conclusions. Unknown-time entries remain reachable with an honest time label, not an invented chronological placement or mandatory extra named Section. Preserve source text and distinguish original expression date from current edit date. This capability does not restore Content/Years, a default timeline, or another Thought reading destination.

### T6 — Ownership, removal and propagation

Use normal reader/editing language. Binding/Placement/Entry internals are not default UI. Each Entry has one canonical body owner; Section membership is metadata and cannot duplicate the body to make a new view. Moving/reordering protects human organization intent and does not authorize Source edits or external access.

Removing from a Topic changes a relationship, deleting shared visible content affects its actual other placements, and permanent Source purge is a separate high-risk operation. Show the relevant scope with existing confirmation/version/recovery controls. Existing body-binding safeguards remain: reverse edit is advanced and OFF by default; B-01 determines final old-Thought edit semantics and B-02 governs mixed-human-derivative purge. The visual adoption does not resolve those gates or introduce a new reverse-edit switch/second body store.

## 6. AI Context surfaces

Current authority is [AI_CONTEXT_CARDS_V2_PLAN.md](AI_CONTEXT_CARDS_V2_PLAN.md) and its approved references, as already specified by AUTHORITY.md. The retained C1-C9 descriptions below are historical/future compatibility constraints where consistent, not a competing Builder/material workflow or implementation queue. This Thought adoption does not redesign Context or enable its runtime.

Execution is disabled. C1–C6 retain future content/privacy constraints only, not current implementation tasks. Do not revive the old Context runtime. Dedicated Profile management, Material Tray and C7 output paths are cancelled; normal temporary selection and reference validation remain where existing reading/editing needs them.

### C1 — AI Context workspace

Purpose: answer "what of my material should this AI task receive?"

Start with:
- task/purpose;
- currently selected material;
- Prepare Context;
- Select material;
- Connections & permissions.

A future one-off task must not require a dedicated Profile product.

Entering from Archive/Thought preselects the user's chosen material but does not auto-build or send.

### C2 — Material selection

Support explicit:
- span;
- whole Input;
- Conversation;
- whole Topic;
- multiple Topics.

Selection mode is temporary and only appears when invoked.

A whole Topic selection records the whole intended set/version. Algorithmic retrieval cannot silently replace explicit material.

Upstream changes mark a material as updated/stale and require review where relevant.

### C3 — Task retrieval / semantic future

Task retrieval searches only authorized scope.

Lexical remains available. Semantic becomes another capability of the same retrieval experience once real quality is proven.

Every result exposes real text/time/source. Low confidence is not a user-truth score.

### C4 — Profile management — cancelled

Remove dedicated Profile listing, creation and editing. Preserve only necessary legacy scope/exclusion compatibility; do not delete historical data or broaden access.

### C5 — Context build and budget

Explicitly selected material is fixed.

If total material exceeds one output budget, show:
- what is included;
- what is not;
- split into multiple packages;
- reduce optional retrieval;
- use a retrieval/connector mode where supported.

Never silently truncate a whole-Topic selection and call it complete.

### C6 — Review/edit

Any separately approved future connection must show exactly what it will access in readable form. This does not restore copy/export or sharing.

The user may edit/redact the current output without rewriting Source/Thought. Any edit invalidates previous release binding and creates a new reviewable version.

Do not display raw Markdown markers/internal IDs/ISO noise by default.

### C7 — Dedicated release — cancelled

Remove Context copy/export, backup generation and dedicated sharing implementations and entries. Old requests refuse without side effects. Normal copying while reading is unaffected. Future connector work requires separate implementation and current authorization; no existing release path is reactivated by this contract.

### C8 — Passport

Manage controlled external access by:
- consumer;
- purpose;
- scope;
- operation;
- once/limited/longer duration;
- last controlled use;
- revoke.

Read and write permissions are distinct. Backup restore does not silently reactivate grants. Revocation affects future controlled access; it cannot recall copied/exported text.

### C9 — External AI connector

A real connector must:
- list/query authorized Topics/material;
- retrieve by stable references;
- enforce authorization before content release;
- log minimal metadata without private body leakage;
- support revocation;
- treat retrieved historical prompts as data, not tool instructions.

Write/organize capability, if later added, is a separate permission and uses reviewable changesets rather than direct database writes.

## 7. Search / Revisit

### R1 — Revisit

A light, user-invoked re-entry surface:
- continue a known reading position;
- show recent meaningful additions;
- optionally show a small explainable older set.

No infinite feed, unread debt or push loop. Every item explains why it is present and can be excluded.

### R2 — Longitudinal retrieval

Answer "what did I say about X over time?" with real expression and time evidence. Comparison may show difference, but never assert belief change without evidence.

### R3 — Semantic retrieval

Once implemented, allow differently worded recollection to find relevant historical expression. Show index coverage/degraded lexical mode honestly. Delete/exclusion/revision invalidates semantic projections.

## 8. System surfaces

### S1 — Capture status

A small popup/surface shows:
- enabled/paused;
- current source applicability;
- recent successful capture;
- Temporary Chat not captured;
- current-page refresh/reconnect needed when applicable;
- storage/source failure with one safe action.

"Capture healthy" does not mean "full history imported".

Keep capture state, counts and the main open action compact. Update and pause are secondary controls with usable targets and accessible labels. Repeated local-only explanations are removed; secondary help expands on demand. Use the adopted app typography, spacing, colors and components.

### S2 — Existing-file restore

Backup generation and exports are cancelled. Show file selection, format/privacy information and a restore preview; retain existing backup-file compatibility.

Restore:
select → validate → preview impact/conflicts → confirm → stage → validate → atomically activate.

Failure preserves current usable library. A checksum is integrity, not encryption.

### S3 — Update

Consumer UI never requires GitHub Desktop, branch SHA or chrome://extensions as the normal update flow.

Update path:
validated release → compatibility check → protect unsaved work → update → reconnect pages as required → health check → success or safe rollback.

Developer script may remain as maintenance fallback, not consumer distribution.

### S4 — Recovery

After abnormal exit, show recovery only when actual unfinished work exists.

Allow continue/copy/save as new version/discard. Index corruption rebuilds index rather than recommending data deletion. Provider/AI failures do not block local archive access.

### S5 — Settings

Groups:
- Content & capture
- Reading & appearance
- Membership / AI service
- Privacy & external use
- Data & recovery
- About

No content search. Settings that can apply immediately do so, or visibly roll back on failure.

Remove API/model/address/request-count/batch controls, Product Signals, retention configuration and permanent diagnostic/trace/usage-audit/integrity/rebuild entries. Actual data/index faults may reveal the relevant recovery action; a messaging timeout alone is not evidence of corruption. Successful recovery clears obsolete recovery state. Retain necessary permission, privacy, delete/overwrite-risk and real-error messages; remove repeated status and engineering terminology. Keep typography and components consistent with the adopted main design.

### S6 — Privacy / authorization / deletion

Clearly distinguish:
- local retention/capture;
- AI processing;
- device Sync;
- external AI access.

Delete flows distinguish:
- remove from Topic;
- remove from ordinary Archive;
- permanent Source purge.

Permanent deletion previews actual affected material and obeys B-02.

## 9. Mobile and prompt surfaces

### M1 — MyWrite

Mobile cold start prioritizes fast write. Archive, Thought and AI Context remain reachable.

MyWrite can be unsorted initially or target a Topic. Save locally first where architecture permits; Sync status is separate.

### M2 — Voice

Explicit record → transcribe → review → save.

No background listening. Cloud transcription, if used, is separately disclosed. Text can always be corrected before final save.

### M3 — Multi-source / Sync

All-source versus source-specific browsing does not duplicate the data model. Disconnection stops new intake but does not erase historical local content.

### P1/P2 — Prompt reuse

The detailed owner-approved contract is
[PROMPT_REUSE_SURFACE.md](PROMPT_REUSE_SURFACE.md).

PAIA shows the user's own useful Prompt Families, not a prompt marketplace.
Automatic ranking is stable while the surface is open. User pin/order/edit/hide
outranks automatic ranking; edited reusable text is independent from historical
Input and never writes back to Input Archive.

On a supported AI page the normal state is a very small floating PAIA entry.
Opening it reveals a persistent compact card whose normal presentation is
essentially just the user's prompt rows. Row controls appear only on hover,
keyboard focus or explicit management interaction. The approved visual direction
is a restrained frosted-glass orb that expands into an anchored rectangular card;
the material is functional adaptation to third-party page backgrounds, not a
generic AI-decoration rule.

One ordinary prompt click fills the exact reusable text into the current AI
composer and returns focus there. It never sends. The default click preserves all
existing draft text and inserts at the current/last reliable caret; an active
selection is not destructively replaced by default. Explicit replace remains a
secondary action. If exact insertion cannot be verified, PAIA leaves the draft
unchanged, reports failure/uncertainty and may offer an explicit clipboard
fallback. It must not retry automatically in a way that can duplicate text.

The floating entry/card may remember a user-chosen position per supported site.
Open/closed preference may persist; transient edit/drag state does not. SPA
navigation must not create duplicate surfaces. Compact widths reflow the same
surface rather than introducing a second prompt product.

### P3 — Reply-aware prompt suggestions

Stage 3A follows the owner-approved
[PROMPT_REUSE_STAGE_3A.md](PROMPT_REUSE_STAGE_3A.md) contract.

It is OFF by default and has an explicit enable/pause control independent from
ordinary capture pause. After the newly completed latest assistant reply is
verified, PAIA may show one transient capsule/strip attached to the existing
Prompt Reuse surface. It never becomes a normal prompt row and never reshuffles
the stable prompt card.

Stage 3A presentation rules:
- the orb remains the stable entry and keeps its saved position;
- the suggestion capsule is a separate nearby target with at least a 44 px
  effective interaction height;
- normal suggestion width is bounded by the existing Prompt Reuse surface;
- conditions such as "登录后" / "when ready" are visible and are not hidden in
  tooltip-only copy;
- explicit choices are peers; PAIA does not preselect the affirmative option;
- a request for user material may show what is needed without pretending the
  material has been supplied;
- direct-reply, personal-Family and material-needed origins are distinguishable
  through restrained secondary affordance/accessible naming, not a permanent
  "AI recommendation" badge or confidence score;
- automatic display initially targets about 12 seconds, pauses while hover/focus
  is inside the suggestion, and explicit dismiss suppresses that reply's
  automatic suggestion;
- while the same reply remains current, a low-frequency "本轮建议" action keeps
  the suggestion accessible after automatic retraction;
- active typing/IME, Prompt edit, surface drag or in-flight Prompt actions prevent
  the suggestion from stealing focus or appearing under the active pointer;
- if safe placement cannot be found promptly, skip automatic display rather than
  move the user's orb or cover host composer controls.

Clicking an insertable suggestion revalidates authorization and current-reply
identity, then uses the existing verified composer insertion contract. It
preserves the draft/selection/IME behavior, fills only and never sends.

Stage 3B model-generated new prompts remain not authorized.

## 10. Motion, accessibility and performance

Motion should be short and state-expressive:
- menu/floating controls roughly 100–140 ms;
- Project expand/collapse roughly 140–180 ms;
- Reader navigation roughly 160–200 ms;
- Original ↔ AI Organize roughly 180–240 ms;
- reduced-motion removes nonessential translation/blur.

These are implementation targets, not product identity.

Accessibility target: WCAG 2.2 AA where applicable, including keyboard-complete flows, focus restoration, 200% text scaling, 320 CSS px reflow and reduced motion.

Performance targets and evidence are governed by VERIFICATION.md. Production UI must be tested with realistic long Chinese/English text, code, revisions, deletions, long titles and dense libraries—not sparse showcase fixtures.
