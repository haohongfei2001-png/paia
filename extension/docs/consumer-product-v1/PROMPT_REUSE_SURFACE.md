# PAIA Personal Prompt Reuse Surface v1

Status: **OWNER_APPROVED / PRODUCT_AND_INTERACTION_FROZEN**

Owner approval date: **2026-10-04**

This file is the canonical feature contract for PAIA's personal high-frequency
prompt reuse surface. It derives from the private product-intent source and the
explicit later owner approval. It does not copy private examples or screenshots
into the public repository.

It governs **Stage 1 frequent reuse** and **Stage 2 AI-page insertion**. Stage 3
reply-aware suggestions reuse this surface but remain separately gated by B-04.

This feature contract does not redesign Input Archive, Thought Library, AI
Context or the D6.2 Desktop vNext visual masters.

---

## 1. Product model

PAIA Prompt Reuse is a personal language layer between the user and supported AI
products.

Its job is simple:

> Surface the ways this person repeatedly asks AI for help, keep them stable and
> editable, and let one click place the chosen text into the current AI composer.

It is not:

- another AI chat product;
- a prompt marketplace or public template library;
- a fourth PAIA primary navigation space;
- an autonomous agent;
- an auto-send or workflow automation surface;
- a new copy of Input Archive;
- a reason to read AI replies during Stage 1/2.

The primary value is **reuse of the user's own language**. PAIA should prefer a
recognizable user expression over an AI-rewritten "better prompt" in Stage 1/2.

The surface must remain stable even when the main PAIA desktop UI evolves. The
host integration may change by provider, but the product interaction contract
below does not drift with unrelated Archive/Thought/Context redesigns.

---

## 2. Surface information architecture

There are only four normal user-visible states.

### 2.1 Collapsed entry

A very small floating PAIA entry sits near the active AI composer without covering
the host product's send, attachment, voice or model controls.

Reference geometry:

- visible orb: approximately **40 px**;
- effective pointer/touch target: at least **44 px**;
- user may drag it to a safe nearby edge/position;
- a safe position may be remembered per supported site.

The collapsed entry is quiet. It does not pulse continuously, show counts, or
advertise recommendation activity.

### 2.2 Expanded prompt card

Activating the entry expands it into an anchored compact rectangular card.

Reference geometry on ordinary desktop:

- width: approximately **336 px**;
- maximum height: approximately **400 px**;
- overflow: internal scrolling;
- no permanent title bar, statistics header, source labels or ranking controls.

In normal use the card is essentially only the user's prompt rows.

The card may remain open until the user closes it. The open/closed preference may
persist per site; transient edit/drag state never does.

### 2.3 Prompt management interaction

Management exists without becoming permanent chrome.

On hover, keyboard focus or explicit row interaction, a row may expose:

- drag/move affordance;
- edit;
- unpin;
- hide;
- family correction ("do not merge" / split where supported).

On touch/coarse input, the same actions are available through an explicit
contextual action, not hover dependence.

Normal display returns to prompt-only rows after the action.

### 2.4 Reply-aware next-prompt suggestion

Stage 3 adds a **separate transient capsule/strip** attached to the same surface.

It is not a row that jumps to the top of the stable card. It does not reorder the
frequent/fixed list.

A suggestion may represent:

- a reusable historical Prompt Family; or
- a newly generated next prompt.

Those two origins must be distinguishable.

After a short idle period the suggestion may retract back to the collapsed entry
without changing the stable list.

Stage 3 is unavailable until B-04 is resolved and implemented.

---

## 3. Approved visual direction

Three form directions were evaluated:

### Direction A — Frosted orb → anchored glass card — **APPROVED**

A small frosted PAIA orb expands into a compact rectangular card. The orb provides
a recognizable stable entry while the card provides enough area for real personal
prompt text.

Why it is selected:

- lowest visual weight while collapsed;
- adapts well to white, dark and changing third-party AI surfaces;
- has a stable cross-provider identity without imitating any host product;
- supports a persistent card without becoming a sidebar;
- makes the transition from "available" to "usable" understandable with little
  explanation.

### Direction B — Thin capsule

A small capsule labeled PAIA/prompt.

Rejected as primary direction because it consumes more horizontal space while
collapsed and reads more like a command button than a persistent personal layer.
It may remain a future onboarding treatment.

### Direction C — Edge rail/tab

A narrow vertical edge tab.

Rejected as primary direction because it is visually persistent even when not
needed, competes with browser/host side rails and is less natural near the active
composer.

### Visual material rule

The selected surface **may use restrained, high-quality frosted glass**.

The product rule is not "never use glass". The rule is "do not add decorative
glass merely to look like an AI product." Here glass has a concrete function:
legibility and identity over heterogeneous third-party page backgrounds.

Reference appearance:

- soft translucent light/dark surface;
- restrained background blur/saturation;
- 1 px low-contrast edge;
- quiet shadow for separation;
- PAIA accent may appear subtly in the orb;
- no constant neon glow, animated gradient or decorative shimmer;
- no meaning encoded by color alone.

The card inherits PAIA's typography, focus visibility and restraint, but its
geometry is independent from the Desktop vNext D6.2 artboards because it is a
cross-site overlay rather than a PAIA desktop page.

Suggested motion:

- orb → card: roughly 140–180 ms;
- suggestion capsule: roughly 100–140 ms;
- reduced-motion removes nonessential translation/blur animation while preserving
  immediate state change.

---

## 4. Prompt row behavior

A row displays the reusable prompt text and normally nothing else.

Rules:

- no visible use count;
- no visible similarity score;
- no Source/provider label;
- no "AI optimized" badge in Stage 1/2;
- no card-per-prompt treatment;
- long text may be line-clamped for scanning, but insertion uses the full exact
  reusable text;
- editing reveals the full reusable text.

Clicking a normal row is an insertion action, not selection for a second step.

The card stays open after insertion by default so the user can reuse another
prompt or continue managing the list.

---

## 5. Prompt Family model

A **Prompt Family** groups repeated Inputs that express the same reusable
instruction strongly enough that presenting each historical wording separately
would be noise.

This is a product/read model. The implementation must not turn it into another
archive body truth.

### 5.1 Eligible material

Automatic candidates come from eligible user-authored Working Inputs that remain
available under current deletion/exclusion rules.

Do not treat the following as automatic evidence of a useful family:

- assistant text;
- permanently purged material;
- non-user/quoted material when role evidence says it is not the user's
  instruction;
- one-off high-entropy pasted payloads whose reusable instruction cannot be
  separated confidently;
- repeated transient controls produced by one conversation burst.

A user may always create/retain a reusable template manually even when it would
not qualify automatically.

### 5.2 Grouping principle

False merge is worse than a harmless duplicate.

The v1 path therefore proceeds conservatively:

1. normalized exact/near-exact forms;
2. lexical/structural similarity with bounded rules;
3. stable instruction-fragment similarity where a variable payload can be
   separated confidently.

No external Provider, embedding index or model is required for v1 Prompt Family
grouping.

If similarity is uncertain, keep two families.

A low-frequency family-correction action allows the user to split an incorrect
merge and prevent immediate re-merging.

### 5.3 Stable instruction versus variable payload

Example pattern:

- stable instruction: "summarize the following article";
- variable payload: a different article body each time.

When PAIA can identify a stable instruction fragment with high confidence, the
reusable family may use that instruction rather than retaining the whole pasted
payload.

If confidence is weak, retain the full historical wording instead of inventing a
template.

Generic placeholder syntax is not required for v1.

### 5.4 Representative text

Display-text authority:

1. explicit user-edited reusable text;
2. explicit user-chosen representative;
3. stable high-use original wording;
4. recent stable original wording as a tie-breaker.

Stage 1/2 never silently paraphrases a family into wording the user has not used.

### 5.5 Frequency and automatic rank

Automatic rank is not raw lifetime occurrence count.

Ranking signals:

- **primary**: frequency across distinct conversations/contexts;
- bounded contribution from repeated occurrences inside one conversation;
- light recency decay so obsolete historical habits do not dominate forever;
- explicit successful reuse as a supporting signal;
- hidden/excluded state as an absolute presentation rule.

Exact weights are an evaluation/implementation decision, not product identity,
and must be frozen against deterministic fixtures before release.

### 5.6 Manual order

There are not two competing visible "modes".

The one list follows:

> manual pinned order → automatic ranked order

Rules:

- pinned prompts always appear before automatic prompts;
- pinned prompts follow the user's exact manual order;
- dragging an automatic prompt into manual order pins it;
- dragging pinned prompts changes only manual order;
- unpinning returns a prompt to its current automatic position;
- automatic rank never reorders pinned prompts;
- while a card is open, background usage changes do not move rows under the
  user's pointer/focus; automatic reorder is applied on the next open or explicit
  refresh.

No "Pinned" and "Frequent" section labels are required in normal presentation.
A temporary drop cue may reveal the manual region during drag.

### 5.7 Edit and hide semantics

Editing reusable prompt text:

- changes the reusable template only;
- never modifies Source or historical Working Input;
- never silently changes Thought or AI Context;
- persists as user-owned reuse work.

If a user has explicitly edited the reusable text, that template can remain as
independent reuse material even if its original family loses historical support.
This prompt-specific decision does not resolve B-01/B-02 for Thought or other
derivative material.

Hide:

- removes the family/template from ordinary reuse surfaces;
- is reversible;
- does not delete historical Input.

---

## 6. Exact click-to-insert contract

The ordinary row click has one outcome:

> Put this exact reusable prompt into the current supported AI composer, then
> return focus to that composer.

It never auto-sends.

### 6.1 Empty composer

- insert the full exact reusable text;
- preserve line breaks/Unicode;
- place caret at the end;
- focus composer.

### 6.2 Existing draft

Normal click is non-destructive:

- preserve every existing draft character;
- insert at the current reliable caret;
- if clicking the PAIA card causes composer blur, use the last valid composer
  caret/selection snapshot owned by the provider adapter;
- if no reliable caret exists, append at the end using a non-destructive,
  provider-appropriate separation.

Do not open an append/replace confirmation for ordinary use.

### 6.3 Active selection

An existing selected range in the composer is **not destructively replaced by
default**. Insert at the selection end/current insertion point while preserving
the selected draft text.

"Replace draft" may exist as an explicit secondary action. It is never the
ordinary prompt click.

### 6.4 Framework/editor integrity

Insertion must use provider-specific composer semantics so the host application
recognizes the new value.

Do not rely on blindly setting innerHTML, mutating arbitrary page nodes, or
synthetically triggering the host send action.

### 6.5 Success acknowledgement

"Inserted" is true only after PAIA can read back/verify that the intended text is
present in the current composer in the expected position.

If acknowledgement is uncertain:

- do not claim success;
- do not auto-retry and risk duplicate text;
- preserve current draft;
- show a quiet retry/copy recovery.

### 6.6 Failure fallback

If the provider composer cannot be safely edited:

- leave the draft untouched;
- keep the PAIA card usable;
- report a concise failure;
- offer explicit copy-to-clipboard fallback;
- report clipboard success only after the browser acknowledges it.

No failure path sends content.

---

## 7. Cross-site, responsive and theme behavior

### 7.1 Provider support

Each supported AI product owns a provider-specific composer adapter.

Current extension permissions make ChatGPT the first real implementation target.

Adding Claude, Gemini or another site requires:

- explicit minimum host permission;
- provider adapter;
- real-page insertion verification;
- the same privacy/draft/no-send acceptance matrix.

Do not ship a generic "find any contenteditable and inject" implementation.

### 7.2 Page layout

The orb seeks a safe relationship to the active composer but does not need to sit
inside the host input field.

It must avoid native send/voice/attachment/model controls.

If the user drags it, preserve a bounded per-site offset/edge preference while
recomputing safely when the host layout changes.

SPA route changes must reuse one surface instance rather than duplicating it.

### 7.3 Compact browser widths

Ordinary desktop target: ~336 px card.

At narrower browser widths the same card reflows to fit within safe viewport
gutters. It may attach above the composer or to a nearby edge. It does not become
a separate mobile product or squeeze underneath host controls.

At 320 CSS px / 200% text scaling, every action remains reachable without
horizontal page scrolling caused by PAIA.

### 7.4 Light/dark

The surface follows host/system appearance sufficiently to remain legible, while
retaining PAIA identity.

Frosted material changes luminance/edge/shadow tokens between light and dark.
Prompt text contrast and focus state must meet the same accessibility target as
the rest of the product.

---

## 8. Privacy and authorization

### Stage 1/2

Stage 1/2:

- do not read assistant replies;
- do not capture AI response text for recommendation;
- do not call an external model/Provider;
- do not auto-send;
- do not store the user's draft in website storage;
- do not make draft text archive content before the existing sent-message capture
  path admits it.

Prompt ranking/grouping remains local-first.

The host AI page must not receive the whole personal prompt library merely because
the surface is visible. The implementation should keep the list in an
extension-controlled rendering/data boundary and send only the user-selected
prompt string to the host composer.

Visual encapsulation is not automatically a security boundary. If an
implementation uses Shadow DOM, it must still pass an explicit host-script
exposure review.

### Stage 3

Stage 3 requires B-04.

B-04 must define current-reply scope, local/remote processing, retention,
revocation and whether any reply text becomes durable evidence.

Disabling/revoking Stage 3 does not disable local Stage 1/2 prompt reuse.

---

## 9. State matrix

Required states include:

- collapsed;
- hover/focus;
- expanded;
- long/scrolling list;
- empty/no useful candidates;
- edit;
- drag/reorder;
- pinned;
- hidden/recovery management;
- insert pending;
- inserted/verified;
- insert uncertain;
- insert failed + copy fallback;
- provider unsupported/composer unavailable;
- host light;
- host dark;
- narrow/200%;
- reduced motion;
- Stage 3 suggestion available;
- Stage 3 suggestion retracted;
- Stage 3 disabled/revoked.

No state should expose internal IDs, similarity scores, storage terms, adapter
names or ranking coefficients to ordinary users.

---

## 10. Development sequence

The shortest dependency-ordered implementation path is:

1. **CPV1-09.0 — Prompt Family contract/evaluation fixture**
   - prove grouping/usefulness rules before UI.
2. **CPV1-09.1 — local family projection + user overrides**
   - ranking, pin/manual order, edit/hide/split state.
3. **CPV1-09.2 — ChatGPT exact insertion gate**
   - prove draft-safe one-click fill before visual polish.
4. **CPV1-09.3 — orb + persistent card**
   - implement the approved cross-site surface.
5. **CPV1-09.4 — management interactions**
   - edit, drag/order, unpin, hide, split with keyboard equivalents.
6. **CPV1-09.5 — lifecycle/privacy/real-page reliability**
   - SPA, tabs, IME, reload, DOM drift, compact/dark/accessibility.
7. **CPV1-09.6 — one second provider**
   - only after explicit permission and real-page verification.
8. **CPV1-09.7 — phase 1/2 closure**
   - exact-main evidence and visual acceptance.
9. **CPV1-12.3 — reply-aware next prompt**
   - later, only after B-04.

The insertion gate precedes final visual polish because a beautiful overlay that
cannot reliably fill the real composer is not a completed consumer feature.

---

## 11. Acceptance criteria

### Product

- useful repeated personal inputs become a compact stable list;
- obvious near-duplicates do not flood the list;
- cautious grouping avoids destructive semantic over-merge;
- user manual order is deterministic and never displaced by automatic ranking;
- user edit/hide/split actions persist and never rewrite history;
- normal card presentation remains prompt-first with almost no chrome.

### Insertion

- exact text inserted on current real supported page;
- empty and non-empty draft both pass;
- current/last reliable caret behavior passes;
- active selection is not destroyed by default;
- multiline Chinese/English/code whitespace passes;
- IME/composition remains usable;
- no automatic send event;
- no duplicate insertion on uncertain acknowledgement;
- failed insertion does not mutate draft;
- clipboard fallback is explicit and truthful.

### Lifecycle

- one surface per tab/page;
- SPA navigation does not duplicate it;
- worker restart/tab discard/reload recover safely;
- position stays on-screen after layout changes;
- multiple tabs do not share active composer/caret state.

### Visual/accessibility

- approved frosted orb/card direction;
- light and dark;
- compact/320 CSS px;
- 200% text scaling;
- visible keyboard focus;
- keyboard-complete management;
- coarse-pointer target at least 44 px;
- reduced motion;
- no overlap with critical host controls.

### Privacy/security

- Stage 1/2 reads no assistant reply;
- Stage 1/2 causes no model/Provider request;
- no website storage of personal prompt list/draft;
- host page receives only the explicitly inserted prompt text, not a convenient
  full-library payload;
- no new broad host permission is claimed as "cross-AI support";
- synthetic browser PASS is not called real-provider compatibility.

### Evidence

Completion requires target/domain tests, relevant privacy/security tests, source
and release browser journeys, current real-page insertion evidence, exact merged
main evidence and human visual review of the actual production overlay.

---

### Engineering/final-certification separation — owner amendment 2026-10-04

The owner authorizes engineering integration and CPV1-09.3–09.5 continuation
when all applicable code, safety, synthetic source/release and package gates pass.
If an authenticated current ChatGPT environment is unavailable, retain
`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE`; it does not
block engineering integration, but remains required for a real compatibility
certification claim. Do not ask the owner to run developer operations. CPV1-09.6
is optional/deferred unless minimally permissioned real composer verification is
available without account intervention. Stage 3 remains excluded.

## 12. Frozen decisions and remaining gates

Frozen by owner approval:

- one stable cross-AI prompt reuse surface;
- frosted orb → anchored compact card is the primary form;
- normal card is prompt-first with minimal chrome;
- Prompt Family similarity deduplication;
- manual pin/order/edit/hide outranks automatic rank;
- ordinary row click immediately fills the current AI composer;
- ordinary click never auto-sends;
- ordinary click preserves existing draft text by default;
- prompt edits never rewrite Input Archive;
- Stage 3 recommendation remains separate from the stable list.

Not resolved by this approval:

- B-04 reply-reading/retention/external-processing policy;
- production support for providers beyond those separately permissioned and
  verified;
- exact ranking coefficients/thresholds before CPV1-09.0 evaluation;
- unrelated B-01/B-02/B-03/B-05 decisions.

The feature may be implemented without reopening the frozen decisions above.
