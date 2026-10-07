# Product Intent Contract — PAIA Consumer Product v1

Current scoped amendment: **IAH-1.0, 2026-10-08**. Full authority order: [AUTHORITY.md](AUTHORITY.md).

## Complete retained product contract

The entire preceding Product Intent Contract is retained byte-for-byte in [PRODUCT_INTENT_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md](PRODUCT_INTENT_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md), Git blob `8cb731e6cab003f55471e54e5e47d9599191cf4d`. **All its nonconflicting sections and detailed requirements are incorporated in full**, not replaced by the summary below. Read that baseline together with this scoped amendment. Its Source, editing, filtering, Topic, Context, Prompt, mobile, future/service and unresolved-gate obligations remain; only the Archive decisions listed in [the adoption ledger](INPUT_ARCHIVE_HOME_ADOPTION.md#3-scoped-supersession-ledger) supersede earlier wording.

PAIA remains a personal system for attributable, user-owned expression that can be found, read, edited, organized and reused. It is not a generic note suite, chat client, social network, dashboard or autonomous agent. Input Archive, Thought Library and AI Context remain the three primary product spaces. Source Project and Personal Topic are different concepts, with no body copy or permission granted by navigation.

## 4. Input Archive — IAH-1.0

The sole detailed interaction contract is [INPUT_ARCHIVE_INTERACTION_CONTRACT.md](INPUT_ARCHIVE_INTERACTION_CONTRACT.md); final presentation is [INPUT_ARCHIVE_HOME_UX.md](INPUT_ARCHIVE_HOME_UX.md). [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) fixes scope and [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) fixes implementation dependencies without starting runtime work.

Input Archive helps the user find what they previously said, where and when. Find searches actual Inputs; Browse narrows familiar Source/Project/Conversation organization; Reader appears only after explicit content selection.

**Fresh Archive Entry ≠ Resume Previous Reader. Back restores context; primary navigation opens Home.** Ordinary opening and every primary-nav Archive click target ARCHIVE_HOME: all-archive scope, empty query and no selected Source, Project, Conversation or Input. No arbitrary recent/first/current-host Conversation is opened. Existing unsaved text must pass the leave/save/IME guard before navigation can commit.

The four states are ARCHIVE_HOME, SEARCH_RESULTS, BROWSE_SCOPE and CONVERSATION_READER. Home contains minimal Find copy and one primary search, not an empty Reader waiting to be filled. V1 has no Recently viewed or common-search suggestions. It has no default Input stream, recommendations, statistics, dashboard or Revisit feed. Large intentional blank space is valid.

Project labels select scope without selecting content; disclosure only controls expansion. Conversation, exact Input result, valid content link or deliberate contextual action selects Reader. Explicit Back/Forward restores recorded query, scope, result/list position, focus and Reader anchor after current data revalidation. Explicit Reader reload restores that route; primary Archive does not resume it.

One active content-search field lives in Main: Home, compact scope/results header or Conversation Reader as appropriate. Results foreground exact current Working Input excerpts with subordinate real time/source/path. Activation reaches the actual Input/occurrence in its genuine local context, not merely the Conversation top. Main Back uses its recorded PAIA origin; `在 ChatGPT 中打开` is a separate verified external action.

Preserve all existing Source/Project/Conversation identity, human editing, revisions/undo, real-versus-unknown time, source attribution, original/working distinction, explicit removal/purge boundaries, continuous reading, long-content search and contextual import/history/recovery. The Reader remains one continuous editable document, not per-message cards. Safe capture/save does not wait for Topic admission, AI or a valid search index.

## 6. Smart Filter — scoped Find clarification

The prior Smart Filter contract remains fully incorporated: light by default, reversible reading visibility, no Source deletion, conservative content retention and explicit human Keep/edit/restore priority.

Ordinary full-text Find includes otherwise eligible smart-filtered Inputs without requiring a separate include-filtered opt-in. Search entry may temporarily show the matched Input and bounded eligible surrounding context. **Search view exception is not user Keep intent.** Focus, highlight and navigation do not write Keep/protection, restore removed content or alter filter mode. Deliberate edits retain their existing separate human-intent semantics. Explicit Archive removal and permanent purge remain stronger and cannot be bypassed by search or old result caches.

## 9. Search, longitudinal retrieval and Revisit — scoped Archive clarification

The complete predecessor section remains, with IAH's explicit Archive state/scope/return rules. V1 Archive Find is local lexical/full-text first, with no model query rewrite, generated answer/summary, paid rerank or semantic dependency. All/Source/Project/Conversation scopes are explicit and use current trusted query owners, not a filter over mounted DOM. Incomplete coverage is not no-result. Search never changes Source/Topic identity, body ownership, AI consent or external permissions.

Revisit retains its separately approved scope, but does not populate fresh Archive Home. Existing reading anchors may remain stored; they cannot select content for fresh entry. No new activity/history recommendation collection is justified.

## Unchanged cross-product meaning and execution

Personal Topic/PT-1.0, final Thought presentation, Context Cards v2, Prompt Reuse/Stage 3A, Settings Consumer v2, BNS and AIU/AIOS/Qwen remain as specified by their current authorities and the full baseline. No old cancelled Profile, Material Tray, candidate approval, export/backup-generation, sharing, diagnostic or BYO-provider surface returns. Archive Home neither expands Context access into Archive nor changes the 22-row Settings target.

Saved reading preferences, human body/organization intent, revisions, exclusions/tombstones, privacy, strict restore and B-01/B-02 are unchanged. This is a design adoption only, not shipped UI or runtime activation. STATUS retains its existing global next task; Archive implementation remains planned.
