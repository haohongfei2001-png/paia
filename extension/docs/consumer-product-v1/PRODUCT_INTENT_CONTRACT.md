# Product Intent Contract — PAIA Consumer Product v1

This file is a public executable derivation of the product owner's design intent. The private Google Drive source PAIA设计想法.docx controls where not superseded by a later explicit owner decision. Current scoped authority: [Personal Topic Architecture](TOPIC_ARCHITECTURE.md) and [AI Context Cards v2](AI_CONTEXT_CARDS_V2_PLAN.md), under [AUTHORITY.md](AUTHORITY.md).

Later explicit owner decisions supersede original design where they conflict. The [current consumer scope](../../PRODUCT.md#current-consumer-scope) cancels dedicated Profile management, Thought response relations, Material Tray, Candidate approval management, activity-retention settings, Product Signals collection/dashboard, ordinary diagnostic/maintenance pages, user-provided API configuration/direct transport and all export/backup-generation/dedicated-sharing products. Preserve necessary legacy data, saved AI-presentation candidates and version protection, existing-file restore, privacy and deletion safeguards. Hidden Topic formation candidates are defined separately by PT-08 and never become an approval product. Fault recovery remains available only for actual data/index failures; internal audit collection/retention must not expand.

## 1. Product definition

PAIA is a personal system for expressions, thoughts and related information created in the AI era. It lets the user keep them as user-owned material that can be found, read, edited, organized and reused with AI over time.

The product is not merely a prompt archive. It is not a general note suite, chat client, social network or autonomous agent.

Core loop:

`Capture -> Revisit -> Understand -> Reuse`

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

Project is source organization. Personal Topic is thought organization. They are not interchangeable. There is one Thought Library, not separate human/AI organization products.

## 3. Capture and Source

Confirmed intent:

- Save eligible sent user-authored inputs, not drafts/keystrokes by default.
- Temporary Chat is not automatically captured; explicit one-off saving may be added later.
- Preserve the best available real send time; do not replace unknown historical time with capture time.
- Opening old conversations may supplement observable history, but this is not the same as complete account history.
- Provide an official-export history import path with dedupe, time preservation and recoverable errors.
- Import, device Sync and AI Update/Refresh are distinct operations.
- Support long-term, multi-year/decade scale; hidden tiny total-size ceilings cannot define the product.
- Distinguish author roles. Text sent by a user can still be quotation/third-party material; user-sent does not automatically mean user-believed.
- Source facts are not ordinary editable content.

Future/extension intent:

- additional AI providers and first-party creation sources;
- mutable sources such as notes need explicit revision/time semantics;
- a one-authorization bring-my-whole-history-in path may be explored where a legitimate platform interface exists.

## 4. Input Archive

Input Archive is the base working layer.

Required behavior:

- source/Project/Conversation structure remains recognizable;
- Projects are collapsible; unassigned conversations remain first-class;
- opening a Conversation retains global navigation -> Project/Conversation navigator -> Reader;
- Project membership/name changes may update source organization without creating a duplicate Conversation or rewriting Source identity;
- upstream platform deletion does not automatically delete PAIA content;
- source-deleted/unknown/unassigned are distinct;
- collections load continuously to their real end without next-part dead ends;
- date and concrete time are visible but visually quiet;
- one simple ascending/descending order control;
- long inputs may collapse visually without affecting search or editing;
- source/provider metadata stays available but does not dominate normal reading;
- history import and version history belong in contextual menus, not permanent toolbars; export is removed and existing-file restore remains in Settings;
- the default Archive is not a persistent material-selection mode.

The Reader is a continuous editable document, not a pile of database cards. Safe capture/save is independent of Topic admission or Organizer availability.

## 5. Editing and version truth

Confirmed:

- Working Input is directly editable with document-tool-like behavior.
- User edits, additions, exclusions and deletions outrank automatic filtering/organization.
- Ordinary edits do not rewrite original Source facts.
- Changes to Working Input safely invalidate/update dependent Thought/AI/Context views as appropriate.
- Undo and version history remain available even when visually de-emphasized.
- Thought-to-Archive reverse editing is advanced and OFF by default.
- Independent new Thought material has its real current creation time.
- Delete/removal/Source purge are different semantics.

Owner gate B-01: final semantics for direct editing of existing/old Thought versus appending a correction/new Thought.

Owner gate B-02: permanent Source deletion treatment for user-rewritten derivative material.

PT-1.0 changes organization semantics, not these unresolved editing/purge decisions. AI has no authority to rewrite human bodies or human organization facts.

## 6. Smart Filter

Smart Filter is a core reading aid, default light.

It changes default visibility, not Source existence; favors hiding high-confidence low-value control utterances; must not silently suppress facts, opinions, corrections or user-protected material; is reversible; cannot override explicit restore/edit/keep; and is separate from Thought membership and AI authorization.

Transient action words in an Input do not justify discarding its substantive decisions or inventing a Topic/Section.

## 7. Thought Library — Personal Topic Architecture

The sole detailed contract is [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md), PT-1.0. This replaces the former long-term-only/optional-deeper-hierarchy wording.

A Personal Topic is a group of content the user can independently recognize and has reason to return to for reading, thinking, decisions or reuse, organized around a stable object or sustained subject. A bounded short-term project can qualify. The root directly contains Personal Topics in the user's language, not fixed category parents or 144 System Topics.

The only normal structure is `Personal Topic -> Section -> Entry`. Sections do not nest. The default Section can remain indefinitely. One Entry body can appear through Placements in multiple Topics, with at most one active placement per Entry per Topic. Whole Inputs/selections can be added; independent user-authored Thought creation, body editing and history remain. An Input can yield zero, one or multiple Entries; there is no forced one-Input/one-Topic rule.

There is one Thought Library. Internal user/AI authorship and projection distinctions do not create separate human/AI libraries, directories or duplicate Topic IDs. User takeover/rename preserves the AI-created identity. Default reading preserves original/user expression; Topic-local derivative AI reading is not a second organization authority.

AI Topic formation is approved direction, within authorized processing: identify object/subject first, retrieve existing active/dormant/renamed/merged identities and removed fences, then test same identity before reuse. Only then select existing/new/default Section or apply new-Topic admission. New objects with sufficient substantive evidence can qualify immediately; emergent subjects require repeated independent explainable evidence. Numeric thresholds are mutable versioned strategy, not frozen product constants.

New Topic candidates are completely hidden. They accumulate evidence, consolidate, expire or activate internally; no approval inbox/count/management workflow. Unassigned is a state, not an automatic catch-all Topic. Section formation also requires a stable useful internal aspect, not an update/action label. Promotion to a Topic is identity-based, proposed by AI and confirmed by the user, without copying bodies or damaging manual structure.

User explicit intent is the highest organization authority: create, rename, keep-separate, move, exclude, Section edit/order, pin/keep/restore and never-reassign survive reruns/rebuilds. Preserve field/edge-specific protection and negative membership. Topic lifecycle is candidate/active/dormant/merged/removed under PT-08; dormancy retains identity and merged retains permanent redirects. related_to/part_of are deferred, not MVP dependencies or an invisible tree.

Retain the adopted compact Topic list, no root Recent Reading section and no root-wide AI approval control. Multi-source views share the same Topic identities. Longitudinal views may show early/turning/recent evidence without inventing growth. Dedicated Thought response creation, related-Thought viewing and relation management remain removed; legacy records retain necessary compatibility.

## 8. AI Topic Organizer and AI Organize are distinct responsibilities

**Topic Organizer** identifies/forms Personal Topics and maintains lawful automatic organization under PT-03 through PT-08. **AI Organize** provides Topic-local derivative re-expression over traceable evidence. The latter is not the sole means of Topic formation and cannot rewrite human organization. Both refer to the one Library and same stable identities.

Current availability remains honest: live AI generation requires the real service in section 15 and is not activated by documentation. Existing saved AI results remain readable/editable; existing saved AI-presentation candidates remain lawful saved content, without approval management or automatic human overwrite. Those are not the hidden Topic formation candidates.

The 2026-10-02 ownership rule remains controlling: Input Archive and human Thought content/organization facts are not AI-editable. AI may read only authorized material and maintain its own derivative output and scoped unprotected organization projection. Human confirmation does not authorize write-back to Source, Working Input or other human facts. B-01 remains unresolved. The 2026-10-07 clarification allows automatic Personal identity formation inside one Library, not a second AI library or general write permission.

AI Organize may restructure its own derivative reading output, group/head it within the fixed organization-depth contract, process relevant changes incrementally, preserve evidence and allow human editing/protection. Generated prose headings do not establish new Topic/Section identities or recursive directory levels. Identity changes, human placement and promotion follow PT authority rules, not model text.

It may not silently alter the user's position, certainty, causality or emotional intensity; convert inference into stated belief; overwrite human edits/organization; become the only surviving thought body; automatically merge established identities; or silently retry paid calls. Schema validity, evidence-link validity and semantic fidelity are distinct acceptance levels.

## 9. Search, longitudinal retrieval and Revisit

Confirmed:

- one content search per current surface; Settings has no content search;
- search supports text plus useful time/source/Personal Topic constraints;
- results return to real original/working context;
- lexical search remains useful after semantic retrieval exists;
- semantic/natural-language retrieval is a future capability, not a new truth model;
- longitudinal retrieval shows attributable expressions over time, not inferred belief change;
- Revisit is part of the core loop, not an engagement feed, unread debt or notification-growth machinery.

Organization, retrieval and Context reuse must work without fixed 18/144 taxonomy. System labels can only become optional measured soft signals under PT-12, never the identity universe, hard recall filter or authorization gate. Preserve dormant/alias/redirect identity discovery, shared Entry dedupe and coverage honesty; incomplete retrieval is not proof of a new identity or no relevant content.

## 10. AI Context and Passport

[AI_CONTEXT_CARDS_V2_PLAN.md](AI_CONTEXT_CARDS_V2_PLAN.md) replaces the old compiler-only/material/package workflow. Its four Cards remain My Information / My Rules / My Now / My Inputs. Info/Rules/Now own independent editable Items. My Inputs stores access to the same stable Personal Topics, not copied Topic bodies or System Catalog labels.

Current old execution remains disabled pending the verified replacement. Dedicated Profile management, Material Tray, Context copy/export and sharing remain cancelled. Existing restrictive legacy authorization and deletion fences remain.

External reads require the current global/category/connection/Topic/content gates. New Topic identities, including promoted identities, begin closed. Internal Topic formation permission, external read permission and content-writing permission are distinct. Organization/rename/dormancy/merge/redirect/additional membership never itself grants access, unions permissions or bypasses explicit source/content denials.

External retrieval ends at authorized Context and authorized eligible Thought Topic contents. No Archive fallback, Conversation/Project permission or arbitrary Archive Input lookup. Whole requested eligible Topic contents must reach the real end through bounded continuation, or disclose incompleteness; snippets do not count as complete. Dedupe shared Entries and recheck revisions, source eligibility and exclusions before release. Do not call an excerpt-only implementation complete or retrieve its hidden tail from Archive.

Direct Context edits do not modify archive/Thought organization. Ordinary Topic on/off does not silently toggle independent Context Items; stronger denials retain their own semantics. Passport preserves controlled external use and revocation. Restore never reactivates grants; delivered external copies cannot be recalled. Future external organization proposals require separate write authorization and trusted validation. A read-only client cannot invoke internal formation as a write bypass.

## 11. Prompt reuse

The owner-approved product contract is [PROMPT_REUSE_SURFACE.md](PROMPT_REUSE_SURFACE.md). Prompt reuse is a stable cross-AI PAIA surface, not a fourth primary space or prompt marketplace.

Stages remain:

1. **Frequent reuse** — derive useful personal Prompt Families from eligible user-authored Inputs, remove cautious near-duplicates, expose a stable frequent/fixed list. Manual pin/order/edit/hide outranks automatic ranking; prompt-template editing never rewrites historical Input Archive.
2. **AI-page insertion** — supported AI pages expose the same prompt surface. One click fills the chosen prompt into the current composer and returns focus, never auto-sends. Preserve existing drafts by default; destructive replacement is not implicit.
3. **Reply-aware next prompt** — Stage 3A is owner-approved on 2026-10-05, default-off, local/ephemeral analysis of only the newly completed latest assistant reply in the current supported conversation. Recommend only on strong explicit literal reply/choice/conservative material-request/relevant existing-family evidence; DEFER is normal. No durable reply retention or external-model processing. Stage 3B model-generated new prompts is future and requires separate provider/context/retention/cost/quality authorization. Suggestions remain transient and separate from stable families; click fills, user sends.

Stage 1/2 remain reply-blind and require no Provider. [PROMPT_REUSE_STAGE_3A.md](PROMPT_REUSE_STAGE_3A.md) remains the detailed contract. B-04-3A is resolved only for its local scope; B-04-3B stays open.

## 12. Mobile, MyWrite, voice and multiple sources

Confirmed direction:

- Extension: capture and fast reuse.
- Desktop/Web: full reading, organization and Context work.
- Mobile: quick look, quick write and voice.
- MyWrite is a first-party active-expression source integrated into the same Source/Thought system.
- Mobile makes writing/speaking possible without first sending text to an AI.
- Voice is explicit record -> transcribe -> review -> save, not background listening.
- More AI and personal-expression sources remain part of the roadmap.
- All-source versus single-source Thought views remain supported.

B-03 controls long-term local/cloud default and production Sync/cloud architecture. Topic adoption does not activate these extensions.

## 13. Data ownership, deletion and exit

Confirmed:

- Source facts and editable working content are separate.
- Smart Filter, Topic removal, Archive removal, permanent Source deletion and never-give-to-AI are distinct.
- Permanent deletion prevents resurrection through recapture/import/index rebuild.
- Platform-side deletion does not equal PAIA deletion.
- Content/statistics/Context exports, backup creation and dedicated sharing are cancelled; existing files/data are not automatically cleared.
- Existing-file restore, migrations, integrity, dedupe, deletion fences and internal index recovery remain foundational.
- Historical text is data, not current authorization/instruction.

Preserve human identity/organization intent across Topic migration and projection rebuild; candidate expiration does not erase content, and a removed Topic cannot be automatically recreated under a synonym.

## 14. Consumer experience

PAIA should be quiet, coherent, reading-first, fast, dense enough for serious use, visually restrained, strong in typography/hierarchy, intuitive without database concepts, 120 Hz-friendly on supported hardware, and low-friction for selection/editing/copying/returning.

Avoid generic SaaS dashboards, decorative cards, unnecessary borders/labels and gratuitous AI purple/glow/gradient/glass. Restrained glass is allowed when it serves a real interaction need such as approved cross-site Prompt Reuse legibility. AI identity comes from useful structure transformation and coherent behavior, not decoration alone. This Topic contract provides no new visual design and no graph/candidate-management surface.

## 15. Commercial/product policy

Basic early functionality should remain low-barrier/free. Manage AI cost through scope, incremental work and reuse rather than exposing token mechanics. Future monetization maps to durable value, not per-sync anxiety. B-05 controls actual regions, quotas, commitments and prices.

AI is unlocked through a real service. Payment, server-side entitlement and unified AI backend are not implemented; never simulate membership or purchase success. User keys, model/address/request-count/batch configuration and retired direct calls stay removed without reading or clearing stored credentials. Current ordinary AI entry points remain Topic AI Organize and Settings Membership / AI service. Approved internal automatic Topic formation does not restore a launcher, candidate approval workflow, hidden paid schedule or external write permission. Actual processing consent/service/budget must be implemented and verified before activation; no silent paid retry.

Pricing, payment channel and service costs require owner decisions; see [the unimplemented service task](MASTER_PLAN.md#paid-ai-service--not-implemented).

## 16. Explicitly superseded directions

Do not revive without a new owner decision:

- defining PAIA primarily as an AI-display brand concept;
- assuming one model subscription automatically funds all apps;
- an internal social-feed/showcase product;
- charging by small sync-count/recharge tiers;
- a third-party paid skin marketplace;
- fixed-taxonomy user directories, recursive Topic/Section hierarchies, candidate approval inboxes or separate human/AI Thought Libraries.

Connector and appearance-customization directions remain within their existing approvals; this does not reopen exports or disabled execution. See [Topic adoption](TOPIC_ARCHITECTURE_ADOPTION.md) for exact scoped supersession and preserved historical evidence.
