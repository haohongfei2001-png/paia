# Product Intent Contract — PAIA Consumer Product v1

This file is a public executable derivation of the product owner's design intent. It is lower authority than the private Google Drive source `PAIA设计想法.docx`.

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
- long inputs may collapse visually without affecting search, edit, export or Context;
- source/provider metadata stays available but does not dominate normal reading;
- import/export/version history belong in contextual menus, not permanent toolbars;
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
- Root presentation is compact topic-oriented scanning, not a chat list.
- No root Recent Reading section.
- AI Organize is not a root-wide constant control; it operates inside a concrete Topic.
- Default view preserves original/user expression.
- Long-term views may surface early, turning-point and recent evidence without fabricating a growth story.
- Multi-source future views may show all sources or one source within the same Topic system.
- Avoid unbounded automatic creation of tiny Topics; deeper hierarchy is optional only where it improves real use.

## 8. AI Organize

AI Organize is a second presentation over traceable Topic evidence.

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

AI Context remains a primary product space.

It supports:

- explicit Inputs, selections, Conversations, whole Topics or multiple Topics;
- task-oriented retrieval within authorized material;
- preserving explicit selections when relevance ranking disagrees;
- generating reviewable/editable Context;
- making incomplete/over-budget coverage visible;
- copy/export or, when a real connection exists, provide Context to an AI.

A whole Topic selection must not be silently reduced to a few snippets and called complete.

Context is a compiler/projection, not a fourth canonical body store.

Passport controls external access by consumer/purpose/scope/operation/duration and revocation. Manual copy/export cannot be retroactively recalled.

Confirmed future direction:

- a real GPT/AI connector that can query/read authorized PAIA material;
- external AI may later propose PAIA organization changes under separate write permission;
- read permission never implies write permission.

## 11. Prompt reuse

Stages remain part of product intent:

1. PAIA shows useful frequent/fixed prompts for easy reuse.
2. Supported AI pages can show/insert those prompts; insertion never auto-sends.
3. With separately approved access to current AI replies, PAIA may recommend existing/new next prompts; user still sends manually.

B-04 controls reply reading/retention/external processing for stage 3.

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
- Open export lets users leave with understandable Source/Archive/Thought data and necessary metadata.
- Backup, restore, migrations, dedupe, deletion fences and index rebuild are foundational.
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

Avoid generic SaaS dashboards, decorative cards, unnecessary borders/labels, AI-purple/glow, decorative glass and developer-facing state leakage.

AI visual identity comes from real structure transformation, not decoration.

## 15. Commercial/product policy

Confirmed:

- basic early functionality should remain low-barrier/free;
- AI cost should be managed by scope, incremental work and reuse rather than exposing token mechanics;
- future monetization maps to durable value, not per-sync anxiety.

B-05 controls actual regions, quotas, service commitments and prices.

## 16. Explicitly superseded directions

Do not revive without a new owner decision:

- defining PAIA primarily as an "AI display" brand concept;
- assuming one model subscription can automatically fund all apps;
- an internal social-feed/showcase product;
- charging by small sync-count/recharge tiers;
- a third-party paid skin marketplace.

These supersessions do not remove still-confirmed connector, export or appearance-customization capabilities.
