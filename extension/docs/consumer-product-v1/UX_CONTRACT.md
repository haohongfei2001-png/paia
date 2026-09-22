# Consumer UX Contract — PAIA Consumer Product v1

This is an implementation contract derived from PRODUCT_INTENT_CONTRACT.md. It may evolve with real usability evidence, but it must not delete higher product intent.

There is no mandatory standalone prototype phase. The production implementation is iterated until it satisfies this contract.

## 1. Global product shell

Desktop primary navigation is fixed:

- Input Archive
- Thought Library
- AI Context

Settings is low-frequency. Capture health is system status, not a dashboard destination. Revisit is retrieval/re-entry, not a new truth space.

Wide desktop uses a stable primary rail; Archive/Thought may add a contextual navigator; the Reader/workspace owns the remaining area. Compact desktop may compress navigation but must preserve object identity and back behavior. Tablet uses a sheet/panel navigator. Phone uses stacked navigation instead of squeezing desktop columns.

Root pages must not keep empty navigator columns.

## 2. Visual language

- system-font stack with reliable Chinese fallback;
- long-form body optimized for serious reading;
- restrained surfaces and borders;
- metadata subordinate but legible;
- one restrained accent family;
- destructive color only for destructive actions;
- no decorative gradient/glow/glass or generic AI styling;
- no dashboard statistics unless a real user task requires them;
- no per-message card chrome when whitespace can provide structure.

Use one shared component language: AppShell, PrimaryNav, SourceScope, ProjectTree, ConversationRow, TopicTile, ReaderHeader, ProseBlock, TimeStamp, ScopeSearch, SelectionToolbar, OverflowMenu, InspectorPanel, InlineStatus, ProgressRow, ReviewDiff, PermissionSummary, RecoverySheet.

Do not create page-specific variants of the same search/menu/toast/dialog without a product reason.

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

Default visible content:
- current source scope;
- one scope search;
- collapsed Project groups;
- unassigned conversations;
- Conversation title;
- short content cue;
- latest reliable expression time.

Unknown Project membership is distinct from confirmed unassigned.

Do not add a permanent side dashboard, permanent material tray or duplicate explanatory headings.

Opening a Conversation turns the same tree into the Navigator. Returning restores expansion/scroll.

Low-frequency import/export/data actions live in overflow.

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

## 5. Thought Library surfaces

### T1 — Thought root

Purpose: rapidly scan long-term topics.

Use compact topic blocks/list with real information density, not large decorative cards. No Recent Reading section and no root-wide AI Organize control.

Each Topic can show title, a short real-content cue and quiet recency. Source scope may become All / one source without duplicating the Topic system.

### T2 — Topic original view

Header:
- back;
- Topic name;
- source scope if relevant;
- Original / AI Organize switch;
- one Topic search;
- overflow;
- one compact Add Thought action.

The body uses the same reading system as Archive. Original/user expression is default. Evidence/source detail is available on demand, not permanently attached to every paragraph.

### T3 — Add Thought

A user may write a new Thought directly:
- body;
- optional Topic;
- optional relation to prior expression;
- real current creation time.

Failure preserves text. Background classification must not block safe save.

### T4 — AI Organize

Existing valid output switches instantly. Generating/updating has a distinct flow:
not generated → scope review → running → candidate → applied.

Running never locks the original text. The user may leave.

A returned result is a candidate when source or protected human output has changed. Show compare with Adopt update / Keep current. Invalid output leaves the previous valid result intact.

AI output is editable and protected after human editing.

Transition may express structure change, but never obscure long text for decoration.

### T5 — Longitudinal/evolution view

Navigate real historical expression by reliable time. "Early / later / recent" are navigation labels, not psychological conclusions.

Unknown-time material remains visible in an explicit unknown section.

Comparisons preserve source text and distinguish original expression date from current edit date.

### T6 — Relationships and propagation

Expose user concepts:
- follows this Input;
- independently edited;
- used in these Topics;
- allowed/not allowed for AI.

Do not expose Binding/Placement/Entry internals as default UI.

Removing from Topic changes a relationship, not Source existence. Reverse edit is advanced and OFF by default.

B-01 determines final old-Thought edit semantics. B-02 determines high-risk purge of mixed human derivative material.

## 6. AI Context surfaces

### C1 — AI Context workspace

Purpose: answer "what of my material should this AI task receive?"

Start with:
- task/purpose;
- currently selected material;
- Prepare Context;
- Select material;
- Connections & permissions.

A user may do a one-off task without first creating a persistent Profile.

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

### C4 — Profile / reusable scope

Profile is a convenience for reusable eligibility and preference, not a permanent identity/personality model.

Allow sources/Topics, explicit exclusions and never-use rules. Deleting a Profile deletes configuration, not content.

Changing Profile does not itself send data.

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

The review surface shows exactly what will be copied/exported/sent in readable form.

The user may edit/redact the current output without rewriting Source/Thought. Any edit invalidates previous release binding and creates a new reviewable version.

Do not display raw Markdown markers/internal IDs/ISO noise by default.

### C7 — Release

Distinct outputs:
- Copy
- Export file
- Send/provide to a connected AI

Success wording must match the real action.

Sending requires a real connection and current authorization. If acknowledgement is uncertain, report uncertain status and avoid blind duplicate send.

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

### S2 — Backup / Restore

Backup UI distinguishes backup from open export.

Show:
- last successfully validated recoverable backup;
- scope/format/privacy;
- create backup;
- restore preview.

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
- AI processing
- Privacy & external use
- Data & recovery
- About / advanced

No content search. Settings that can apply immediately do so, or visibly roll back on failure.

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

PAIA prompt panel shows useful user prompts/templates, not a prompt marketplace.

On supported AI pages, selection inserts or copies; it never sends. Existing draft is preserved and the user chooses append/replace where needed.

### P3 — Reply-aware prompt suggestions

Only after B-04. Explicit enable/pause. Suggestions distinguish reused historical prompt from generated suggestion. Clicking fills input; user sends.

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
