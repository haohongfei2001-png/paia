# Product Intent Contract — PAIA Consumer Product v1

This file is a public executable derivation of the product owner's design intent. It is lower authority than the private Google Drive source `PAIA设计想法.docx`.

Later explicit owner decisions supersede the original design where they conflict. The [current consumer scope](../../PRODUCT.md#current-consumer-scope) cancels dedicated Profile management, Thought response relations, Material Tray, Candidate approval management, activity-retention settings, Product Signals collection/dashboard, ordinary diagnostic/maintenance pages, user-provided API configuration/direct transport and all export/backup-generation/dedicated-sharing products. Preserve necessary legacy data, candidates and version protection, existing-file restore, privacy and deletion safeguards. Fault recovery remains available only for actual data/index failures; internal audit collection/retention must not expand.

## 1. Product definition

PAIA is a personal system for expressions, thoughts and related information created in the AI era. It lets the user keep them as user-owned material that can be found, read, edited, organized and reused with AI over time.

The product is not merely a prompt archive. It is not a general note suite, chat client, social network or autonomous agent.

Core loop:

`Capture → Revisit → Understand → Reuse`

Revisit/read serves finding, thinking, editing and reuse. Re-reading for its own sake is not the end goal.

## 2. Primary product spaces

The primary desktop product spaces are fixed:

1. Input Archive
2. Thought Library
3. AI Context

These are product spaces, not mandates for separate databases.

Supporting responsibilities:

- Source — immutable/attributable facts about what came from where and when.
- Passport — authorization for controlled external use.
- MyWrite — a first-party active-expression source, especially important on mobile.

Project is source organization. Topic is thought organization. They are not interchangeable.

## 3. Capture and Source

Confirmed intent:

- Save eligible sent user-authored inputs, not drafts/keystrokes by default.
- Temporary Chat is not automatically captured; explicit one-off saving may be added later.
- Preserve the best available real send time; do not replace unknown historical time with capture time.
- Opening old conversations may supplement observable history, but this is not the same as complete account history.
- Provide an official-export history import path with dedupe, time preservation and recoverable errors.
- Import, device Sync and AI Update/Refresh are distinct operations.
- Support long-term, multi-year/decade scale; hidden tiny total-size ceilings cannot define the product.
- Distinguish author roles. Text sent by a user can still be quotation/third-party material; "user sent it" does not automatically mean "user believes it."
- Source facts are not ordinary editable content.

Future/extension intent:

- additional AI providers and first-party creation sources;
- mutable sources such as notes need explicit revision/time semantics;
- a one-authorization "bring my whole history in" path may be explored where a legitimate platform interface exists.

## 4. Input Archive

Input Archive is the base working layer.

Required behavior:

- source/Project/Conversation structure remains recognizable;
- Projects are collapsible; unassigned conversations remain first-class;
- opening a Conversation retains global navigation → Project/Conversation navigator → Reader;
- Project membership/name changes may update source organization without creating a duplicate Conversation or rewriting Source identity;
- upstream platform deletion does not automatically delete PAIA content;
- source-deleted/unknown/unassigned are distinct;
- collections load continuously to their real end without "next part" dead ends;
- date and concrete time are visible but visually quiet;
- one simple ascending/descending order control;
- long inputs may collapse visually without affecting search or editing;
- source/provider metadata stays available but does not dominate normal reading;
- history import and version history belong in contextual menus, not permanent toolbars; export is removed and existing-file restore remains in Settings;
- the default Archive is not a persistent material-selection mode.

The Reader is a continuous editable document, not a pile of database cards.

## 5. Editing and version truth

Confirmed:

- Working Input is directly editable with document-tool-like behavior.
- User edits, additions, exclusions and deletions outrank automatic filtering/organization.
- Ordinary edits do not rewrite original Source facts.
- Changes to Working Input safely invalidate/update dependent Thought/AI/Context views as appropriate.
- Undo and version history remain available even when visually de-emphasized.
- Thought→Archive reverse editing is advanced and OFF by default.
- Independent new Thought material has its real current creation time.
- Delete/removal/Source purge are different semantics.

Owner gate B-01:
- final semantics for direct editing of existing/old Thought versus appending a correction/new Thought.

Owner gate B-02:
- permanent Source deletion treatment for user-rewritten derivative material.

## 6. Smart Filter

Smart Filter is a core reading aid, default light.

It:

- changes default visibility, not Source existence;
- favors hiding high-confidence low-value control utterances;
- must not silently suppress facts, opinions, corrections or user-protected material;
- is reversible;
- cannot override explicit restore/edit/keep;
- is separate from Thought membership and AI authorization.

## 7. Thought Library

Thought Library represents long-term topics across conversations.

Required intent:

- Topic is the main user concept.
- It is not a reclassification of chat windows.
- Whole Inputs or selections can be added to a Topic.
- Users can create independent new Thought material.
- Root presentation uses the adopted compact Topic list.
- No root Recent Reading section.
- AI Organize is not a root-wide constant control; it operates inside a concrete Topic.
- Default view preserves original/user expression.
- Long-term views may surface early, turning-point and recent evidence without fabricating a growth story.
- Multi-source future views may show all sources or one source within the same Topic system.
- Avoid unbounded automatic creation of tiny Topics; deeper hierarchy is optional only where it improves real use.

Independent Thought creation, body editing and history remain. Dedicated response creation, related-Thought viewing and relation management are removed; old relation records retain necessary compatibility.

## 8. AI Organize

AI Organize is a second presentation over traceable Topic evidence.

Current availability: the Topic reader's AI Organize entry and Settings Membership / AI service show that the service is not launched. Saved AI results remain readable/editable and saved candidates remain readable. Approval management is hidden; candidates must not automatically replace human edits, and version checks remain. The dated clarification below retains its data-ownership rule; its Adopt/Keep interaction is superseded by this current boundary. Further generation requires the real paid service described in section 15.

Owner clarification (2026-10-02): Input Archive and human Thought Library
content are not AI-editable. AI may read explicitly authorized material; its
organization, generation and updates belong to a separate derivative layer.
Adopt/Keep chooses the saved AI derivative only. Adoption never authorizes a
write-back to Source, Working Input or human Thought bodies or organization.
Existing direct human editing remains governed by its own product rules and
B-01; this clarification neither removes that editing nor resolves B-01.


It may:

- change structure, ordering, grouping, headings and hierarchy;
- incrementally process new/changed material and affected old relations;
- generate a candidate view;
- be edited by the user;
- support a distinctive but restrained structure-change transition.

It may not:

- silently alter the user's position, certainty, causality or emotional intensity;
- convert AI inference into the user's stated belief;
- overwrite protected human edits;
- become the only surviving body of the user's thought;
- silently retry paid AI calls.

Generated validity has separate levels: structural validity, evidence-link validity and semantic fidelity.

## 9. Search, longitudinal retrieval and Revisit

Confirmed:

- one content search per current surface;
- Settings has no content search;
- search supports text plus useful time/source/topic constraints;
- results return to real original/working context;
- lexical search remains useful after semantic retrieval exists;
- semantic/natural-language retrieval is a committed future capability, not a new truth model;
- longitudinal retrieval shows attributable expressions over time and does not automatically claim belief change;
- Revisit is part of the core loop but must not become engagement feed, unread debt or notification-growth machinery.

## 10. AI Context and Passport

AI Context remains a primary product direction, but its old execution path stays disabled. This section is a future constraint, not authorization to restore its old controls or commands. Dedicated Profile management, Material Tray, Context copy/export and sharing are cancelled.

Any separately approved future connection must preserve:

- explicit Inputs, selections, Conversations, whole Topics or multiple Topics;
- task-oriented retrieval within authorized material;
- preserving explicit selections when relevance ranking disagrees;
- reviewable/editable derived Context;
- making incomplete/over-budget coverage visible;
- access only through a real connection with current explicit authorization.

A whole Topic selection must not be silently reduced to a few snippets and called complete.

Context is a compiler/projection, not a fourth canonical body store.

Passport preserves external-use restrictions and revocation. Restoring legacy data never reactivates grants. Historical text already copied outside PAIA cannot be retroactively recalled.

Confirmed future direction:

- a real GPT/AI connector that can query/read authorized PAIA material;
- external AI may later propose PAIA organization changes under separate write permission;
- read permission never implies write permission.

## 11. Prompt reuse

The owner-approved product contract for this capability is
[PROMPT_REUSE_SURFACE.md](PROMPT_REUSE_SURFACE.md). Prompt reuse is a stable
cross-AI PAIA surface, not a fourth primary product space and not a prompt
marketplace.

Stages remain part of product intent:

1. **Frequent reuse** — PAIA derives useful personal Prompt Families from eligible
   user-authored Inputs, removes cautious near-duplicates, and exposes a stable
   frequent/fixed list. Manual pin/order/edit/hide always outranks automatic
   ranking. Editing the reusable prompt never rewrites historical Input Archive.
2. **AI-page insertion** — supported AI pages expose the same personal prompt
   surface. One ordinary click fills the selected prompt into the current AI
   composer and returns focus there. It never auto-sends. Existing draft text is
   preserved by default; destructive replacement is never the implicit click
   behavior.
3. **Reply-aware next prompt** — Stage 3 is split by authorization:
   - **Stage 3A — local reply-to-next-action assistance:** owner-approved on
     2026-10-05. It is default-off and explicitly enabled. PAIA may read only the
     newly completed latest assistant reply in the current supported conversation,
     process it locally and ephemerally, and recommend only when there is strong
     evidence: an explicit literal reply, explicit choice, conservative request
     for user material, or a clearly relevant existing Prompt Family. `DEFER`
     is a normal result. Assistant reply text is not persisted or sent to a
     Provider/model.
   - **Stage 3B — model-generated new next prompts:** future and not authorized.
     It requires a separate owner decision for Provider/context scope, retention,
     cost and quality.
   - Stage 3 suggestions remain a transient surface separate from the stable
     frequent/fixed list. Clicking fills only; the user sends.

Stage 1/2 remain reply-blind and require no Provider call. The detailed Stage 3A
contract is [PROMPT_REUSE_STAGE_3A.md](PROMPT_REUSE_STAGE_3A.md). B-04-3A is
resolved only for that exact local ephemeral scope; B-04-3B remains open.

## 12. Mobile, MyWrite, voice and multiple sources

Confirmed direction:

- Extension: capture and fast reuse.
- Desktop/Web: full reading, organization and Context work.
- Mobile: quick look, quick write and voice.
- MyWrite is a first-party active-expression source integrated into the same Source/Thought system.
- Mobile makes writing/speaking possible without first sending text to an AI.
- Voice is explicit record → transcribe → review → save, not background listening.
- More AI and personal-expression sources remain part of the roadmap.
- All-source versus single-source Thought views remain supported.

B-03 controls long-term local/cloud default and therefore production Sync/cloud architecture.

## 13. Data ownership, deletion and exit

Confirmed:

- Source facts and editable working content are separate.
- Smart Filter, Topic removal, Archive removal, permanent Source deletion and "never give to AI" are distinct.
- Permanent deletion prevents resurrection through re-capture/import/index rebuild.
- Platform-side deletion does not equal PAIA deletion.
- Content/statistics/Context exports, backup creation and dedicated sharing are cancelled. Existing user files and data are not automatically cleared.
- Existing-file restore, migrations, integrity, dedupe, deletion fences and internal index recovery remain foundational.
- Historical text is data, not current authorization/instruction.

## 14. Consumer experience

PAIA should be:

- quiet;
- coherent;
- reading-first;
- fast;
- dense enough for serious use;
- visually restrained;
- strong in typography and hierarchy;
- intuitive without exposing database concepts;
- 120 Hz-friendly on supported hardware;
- low friction for selection, editing, copying and returning.

Avoid generic SaaS dashboards, decorative cards, unnecessary borders/labels,
gratuitous AI-purple/glow/gradient/glass and developer-facing state leakage.
This is not a ban on glass as a material: restrained glass is allowed when it
serves a real interaction need such as keeping the approved cross-site Prompt
Reuse overlay legible across heterogeneous host-page backgrounds.

AI visual identity comes from real structure transformation and coherent product
behavior, not decoration alone.

## 15. Commercial/product policy

Confirmed:

- basic early functionality should remain low-barrier/free;
- AI cost should be managed by scope, incremental work and reuse rather than exposing token mechanics;
- future monetization maps to durable value, not per-sync anxiety.

B-05 controls actual regions, quotas, service commitments and prices.

AI will be unlocked by purchasing a real service. Payment, server-side entitlement validation and a unified AI backend are not implemented; do not simulate membership or purchase success. User-provided keys, model/address/request-count/batch configuration and old direct calls are removed without reading or clearing stored credentials. Only Topic AI Organize and Settings Membership / AI service are ordinary AI entry points. Pricing, payment channel and service costs require owner decisions; see the [unimplemented service task](MASTER_PLAN.md#paid-ai-service--not-implemented).

## 16. Explicitly superseded directions

Do not revive without a new owner decision:

- defining PAIA primarily as an "AI display" brand concept;
- assuming one model subscription can automatically fund all apps;
- an internal social-feed/showcase product;
- charging by small sync-count/recharge tiers;
- a third-party paid skin marketplace.

Connector and appearance-customization directions remain; this does not reopen cancelled exports or disabled Context execution.
