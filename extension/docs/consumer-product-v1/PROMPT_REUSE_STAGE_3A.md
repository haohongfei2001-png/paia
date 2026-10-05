# PAIA Prompt Reuse Stage 3A — Reply-aware Next Prompt

Status: **OWNER_APPROVED / READY_FOR_IMPLEMENTATION**

Owner decision date: **2026-10-05**

This document is the canonical product, privacy, interaction and evaluation
contract for the first reply-aware Prompt Reuse stage.

It does not reopen Prompt Reuse Stage 1/2. Stage 1/2 remains
`FINAL_CLOSED / MAINTENANCE_ONLY` and keeps its existing Prompt Family,
manual ordering, editing, floating orb/card and verified click-to-insert behavior.

Stage 3A adds one bounded capability:

> After the current AI has completed its latest reply, PAIA may locally identify
> an explicit next action and show a transient suggestion beside the existing
> Prompt Reuse surface. Clicking the suggestion fills the current AI composer.
> It never sends.

Stage 3A is **not** a general next-message predictor and does not call an external
model. Low confidence is a valid `DEFER` result.

Stage 3B — remote/model-generated new prompts — is a separate future capability
and is **NOT_AUTHORIZED** by this contract.

---

## 1. Product model

Stage 3A is a local **Reply → Next Action Detector**.

Its candidate-source order is:

1. explicit reply text supplied by the AI;
2. explicit choices supplied by the AI;
3. explicit request for user-provided material;
4. a clearly relevant existing personal Prompt Family;
5. `DEFER`.

This order does not override safety or prerequisites. For example, if the AI says
"first provide the error log, then reply 'continue'", PAIA must not recommend
"continue" while the required material is still the active request.

### 1.1 Core output types

The detector produces one of:

- `DIRECT_REPLY`
- `CHOICE`
- `PROMPT_FAMILY_MATCH`
- `REQUEST_USER_MATERIAL`
- `DEFER`

A visible recommendation requires `HIGH` internal confidence. `MEDIUM` and
`LOW` become `DEFER`.

Confidence is about whether PAIA correctly identified the reply request. It is
never a claim that the user's underlying condition is true.

Example:

AI reply:

> 登录完成后告诉我“已登录”，我就继续。

Allowed recommendation presentation:

> 登录后：已登录

Click inserts only:

> 已登录

PAIA has identified the requested conditional reply. It has **not** verified that
the user is logged in.

---

## 2. B-04-3A owner decision

The owner approves the following narrow reply-access boundary for Stage 3A.

### 2.1 Default and enablement

- Stage 3A is **OFF by default**, including upgrades and restore.
- The user explicitly enables **Current reply suggestions** in PAIA.
- Stage 3A authorization is independent from ordinary capture enable/pause.
- Pausing capture does not silently enable or disable Stage 3A.
- Disabling Stage 3A never disables Stage 1/2 local Prompt Reuse.

### 2.2 Allowed reply scope

When enabled, PAIA may read only:

- the current supported AI page;
- the current active conversation;
- the **newly completed latest assistant reply** produced after Stage 3A became
  eligible for that page/generation;
- only the final reply content needed for local detection.

Stage 3A does not automatically analyze old replies when opening or restoring an
existing conversation and does not read the whole conversation as context.

### 2.3 Local-only processing

Stage 3A:

- processes reply text locally in the extension;
- makes **zero Provider/model requests**;
- adds no paid request;
- uploads no reply text for recommendation;
- uses no remote embedding/vector service.

### 2.4 Retention

Assistant reply text used for Stage 3A:

- is ephemeral;
- is not added to Input Archive;
- is not added to Thought Library;
- is not added to AI Context;
- is not added to Source;
- is not written to website localStorage/sessionStorage;
- is not written to PAIA durable body storage;
- is not included in Backup;
- is not retained in ordinary logs or diagnostics.

After analysis, the full reply snapshot is released. Only the bounded current
candidate/evidence needed to keep the transient suggestion valid may remain in
memory for that current reply.

If the user later sends suggestion text, the existing sent-user-input capture path
may admit that **user-authored sent message** under its normal rules. That is not
assistant-reply retention.

### 2.5 Disable/revoke

Disable/revoke must immediately:

- stop new reply reads;
- cancel in-flight analysis where possible;
- invalidate current candidate tokens;
- clear visible reply-aware suggestions;
- prevent a late result from reviving a suggestion.

No Stage 3A state restored from Backup may reactivate reply access.

### 2.6 B-04 boundary after this decision

`B-04-3A` is **RESOLVED / OWNER_APPROVED** for the exact local ephemeral scope
above.

The following remain outside this approval and require a later owner decision:

- sending assistant reply text to an external model;
- retaining assistant reply bodies durably;
- making reply text durable Context evidence;
- reading broader conversation history for recommendation;
- model-generated new next prompts;
- using reply access for unrelated PAIA capabilities.

These future questions are collectively `B-04-3B` and remain
`NOT_AUTHORIZED / OWNER_DECISION_DEFERRED`.

---

## 3. Input lifecycle

### 3.1 Current-reply identity

A recommendation must be bound to:

- current tab/document;
- current supported provider;
- current Conversation identity where available;
- one observed generation/reply cycle;
- current final reply identity/revision;
- current Stage 3A authorization generation.

A candidate is invalid if any of these change.

### 3.2 Completion

Do not interpret a short pause in streaming as completion.

Automatic analysis requires:

- a newly observed generation/reply cycle;
- one unambiguous latest assistant reply;
- supported evidence that generation has completed;
- no continuing generation/error state that makes the final body uncertain;
- a short render-stability window after completion.

Implementation may use a bounded render-stability delay, initially around
600 ms, but that delay is not itself proof of completion.

If completion cannot be verified, return:

`DEFER / COMPLETION_UNVERIFIED`.

### 3.3 Regenerate / continue / edit / branch changes

- regenerate invalidates the previous candidate;
- continue-generation invalidates the previous candidate until the extended final
  reply completes;
- user edit that changes the branch invalidates the previous candidate;
- switching reply branches invalidates the previous candidate;
- sending a new user message invalidates the previous candidate;
- leaving the current page/conversation invalidates the previous candidate.

Opening an old conversation, reloading a page or enabling Stage 3A must not create
a backlog of suggestions for historical replies.

---

## 4. Detector contract

The detector returns a structured result, not only a string.

Minimum internal fields:

- detector/version;
- output type;
- candidate ID;
- confidence level;
- source type: `REPLY_SPAN`, `PROMPT_FAMILY`, or
  `LOCAL_FIXED_TEMPLATE`;
- proposed text when insertion is supported;
- explicit choices when applicable;
- evidence span in the original reply snapshot;
- prerequisite/condition text where applicable;
- current-reply identity/revision;
- authorization generation;
- Prompt Family ID/text generation where applicable;
- DEFER reason where applicable.

Evidence offsets must map to original unmodified text. Normalized text offsets
must never be used directly to slice the original Unicode text.

### 4.1 DEFER is a first-class outcome

Required DEFER categories include:

- no explicit next action;
- completion unverified;
- quoted/example-only text;
- negated candidate;
- conflicting next actions;
- prerequisite unclear;
- ambiguous reference;
- unsafe/sensitive authorization;
- candidate too long;
- unsupported structure;
- Prompt Family relevance insufficient;
- candidate became stale;
- permission revoked.

Normal UI does not expose internal detector jargon.

---

## 5. DIRECT_REPLY

### 5.1 Supported intent

The AI explicitly asks the user to reply with a bounded literal phrase.

Examples of supported forms include:

- 回复“X”
- 告诉我“X”
- 只要你说“X”
- 输入“X”
- 完成后回复“X”
- Reply with "X"
- Say "X"
- Tell me "X" when ...
- Type "X" to continue

The implementation uses finite versioned rules. It is not open-world language
understanding.

### 5.2 Context validation

A matching phrase is not enough. The rule must verify that it is a current request
to the user, not:

- quoted third-party text;
- an example;
- documentation;
- a code block;
- a request to type text in another tool/terminal;
- a negated instruction;
- a hypothetical statement.

### 5.3 Conditions

Conditions such as:

- 完成后
- 如果已经
- 先……再……
- unless / only if / after / when

must remain attached to the candidate.

If the condition represents a fact PAIA cannot verify, the condition must be
visible in the suggestion. The inserted text remains only the literal reply.

### 5.4 Exactness

Direct reply text:

- preserves original wording;
- preserves negation, numbers and case;
- is not silently paraphrased;
- is bounded to 120 Unicode characters for Stage 3A v1.

If the correct meaning requires a longer or hidden tail, DEFER instead of showing
a short misleading label that inserts a different long instruction.

---

## 6. CHOICE

`CHOICE` is used when the AI explicitly requests the user to select among
bounded alternatives.

Examples:

- A / B / C;
- yes / no;
- continue / stop.

Rules:

- show alternatives as peers;
- do not choose the affirmative or first option automatically;
- preserve exact option meaning;
- at most three visible choices in the initial implementation;
- conflicting or structurally unclear choices DEFER;
- destructive, permission-expanding or sensitive confirmations do not get an
  automatic affirmative recommendation merely because the wording is explicit.

A yes/no question may expose both choices when the question is low-risk and
unambiguous. It must not infer what the user wants.

---

## 7. REQUEST_USER_MATERIAL

Use this type when the AI asks the user to provide material PAIA does not possess
as an authorized exact value.

Examples:

- error log;
- file;
- link;
- path;
- screenshot.

Stage 3A v1 is conservative.

### 7.1 Text material

It may show a lightweight action such as:

> 需要：报错日志

A later bounded enhancement may insert a non-factual prefix such as
`报错日志：\n`, but the first implementation does not need to do so.

### 7.2 File/image/audio

Show a notice only. Do not claim a file has been attached and do not attempt to
automate the host attachment control.

### 7.3 Sensitive material

Password, cookie, session token, API key, authentication secret or similarly
sensitive requests DEFER. Stage 3A does not encourage one-click disclosure of
credentials.

### 7.4 No fabrication

Never produce:

> 我已经把日志/文件/链接发给你了。

unless the user actually authored such text independently. Stage 3A has no basis
to assert the material was supplied.

---

## 8. PROMPT_FAMILY_MATCH

This is Stage 3A-2 and does not block the first direct-reply/choice implementation.

Use it only when:

- the AI states a clear next-step intent;
- no more authoritative direct reply/choice already resolves the request;
- a current eligible personal Prompt Family expresses that same action strongly
  enough to be useful.

### 8.1 Candidate source

Reuse the existing Prompt Reuse service and its current eligibility, deletion,
hide, edit, split and manual-retention semantics.

Do not build another durable prompt library.

### 8.2 Finite intent vocabulary

Initial supported intents may include:

- explain;
- simplify;
- summarize;
- compare;
- check logic;
- check edge cases;
- list actionable steps.

The implementation may maintain a finite bilingual synonym table. Unsupported
intents DEFER rather than mapping to an approximate unrelated family.

### 8.3 Hard compatibility before ranking

A family must first pass:

- action compatibility;
- object/topic lexical compatibility;
- no conflict in explicit negation;
- no conflict in requested language/quantity/constraint;
- no added destructive/external action;
- no unresolved private/deictic reference such as "that account" or "the second
  file" unless it is unambiguous in the candidate itself.

Frequency is **not** a relevance substitute.

Only after relevance admission may existing manual preference/reuse/frequency
signals break ties between semantically compatible candidates.

If multiple candidates remain meaningfully different and equally plausible,
DEFER instead of choosing the most frequent one.

### 8.4 Bounded local retrieval

The matcher may reuse local lexical primitives and a disposable in-memory view
over current Prompt Families.

It must not:

- rebuild the entire archive on every streaming token;
- call an external semantic model;
- add a vector database;
- persist reply text or a reply-derived body index.

Cold or unavailable Family projection skips the Family path; it must not block
DIRECT_REPLY/CHOICE.

---

## 9. Transient suggestion capsule

Stage 3A reuses the accepted Prompt Reuse surface without changing the stable
Prompt list.

The suggestion is a **separate transient capsule/strip** attached to the same
surface.

### 9.1 Stable list isolation

The capsule:

- is never inserted as a normal Prompt row;
- never reorders pinned/frequent prompts;
- never changes the stable list while open;
- never becomes a durable Prompt Family merely because it appeared.

### 9.2 Shape and placement

- collapsed orb remains the primary stable entry;
- suggestion capsule appears adjacent to the orb/card;
- approximately 44 px minimum effective height;
- ordinary width is bounded by the existing ~336 px surface;
- it avoids the host composer/send/attachment/voice/model controls;
- it does not move the user's saved orb position merely to display a suggestion;
- compact/narrow layouts use the same product, not a second mobile design.

Existing Prompt Reuse material, typography, light/dark and accessibility language
remain authoritative.

### 9.3 When it appears

After a final reply is verified, wait for a short user-idle window before showing.

Do not interrupt:

- active composer typing or IME composition;
- Prompt editing;
- surface drag;
- an in-flight insertion/management action.

If a safe display opportunity does not appear promptly, skip automatic display
rather than queueing stale suggestions.

### 9.4 Retraction

Initial target:

- automatically retract after about 12 seconds;
- pause the timer while pointer hover or keyboard focus is inside it;
- explicit dismiss suppresses the suggestion for that reply.

The same still-current suggestion must remain available through a low-frequency
"本轮建议" action on the Prompt Reuse surface, so time-limited display is not the
only way to access it.

### 9.5 Source distinction

Do not add a permanent "AI recommendation" badge or confidence score.

Use restrained source semantics accessible by icon/tooltip/accessible name:

- from this reply;
- from your frequent prompt;
- material needed.

Prerequisites/conditions are substantive and must be visible text, not color-only
or tooltip-only information.

### 9.6 Click behavior

Clicking an insertable suggestion:

- revalidates authorization and current-reply identity;
- revalidates the candidate;
- uses the existing provider-specific composer insertion behavior;
- preserves existing draft text, selection, IME and caret rules;
- fills only;
- never auto-sends;
- never automatically retries an uncertain insertion.

Success keeps the existing short
`已插入，未发送。`
feedback. Copy fallback appears only for applicable failed/uncertain recovery.

A direct-extracted candidate uses a separate ephemeral trusted candidate path. It
must not be silently fabricated as a persistent Prompt Family merely to pass the
existing Family resolver.

---

## 10. Security and lifecycle invariants

Stage 3A must fail closed when current identity or authorization is uncertain.

Required adversarial cases include:

- reply text tries to instruct PAIA to change permissions;
- reply text says PAIA should auto-send;
- reply text asks for the whole archive;
- quoted prompt injection;
- stale candidate after regenerate;
- revoke during analysis;
- revoke during insertion;
- worker restart;
- SPA route change;
- tab/page reload;
- multiple ChatGPT tabs;
- late result after authorization generation changed.

Assistant text is untrusted data. It cannot grant a permission, create a Provider
request, bypass Prompt Family eligibility or invoke host Send.

Current Stage 1/2 functionality remains available when Stage 3A fails or is
disabled.

---

## 11. Resource bounds

Initial engineering bounds:

- one current reply snapshot at a time per eligible document;
- maximum 32,768 Unicode characters;
- maximum 128 KiB encoded body;
- maximum 256 structural blocks;
- one current suggestion group;
- maximum three visible CHOICE options.

Exceeding a bound returns DEFER.

A service-worker restart may lose the transient candidate. That is acceptable.
Do not persist assistant reply text merely to restore a disposable suggestion.

A user may request the current suggestion again only if PAIA can re-establish the
same current final reply and authorization.

---

## 12. Deterministic evaluation

Stage 3A is evaluated for **precision and safe DEFER**, not recommendation rate.

Initial fixed text corpus target: 360 cases, plus separate lifecycle sequences.

Suggested coverage:

- 72 explicit literal replies/conditional replies;
- 48 yes/no and A/B/C choices;
- 40 user-material requests;
- 80 Prompt Family match/adversarial-candidate cases;
- 60 quote/example/code false-positive cases;
- 60 negation/conflict/risk/no-next-action cases.

Include Chinese, English and mixed-language cases.

Split by rule/semantic family, not random near-duplicate sentences, so held-out
cases test generalization.

### 12.1 Initial acceptance targets

- displayed-suggestion precision: >= 98% on the fixed evaluation, with denominator
  reported;
- direct extraction: exact candidate, negation and visible prerequisite all
  correct in every accepted fixture;
- Prompt Family match relevance: >= 95% on independently labelled Family-match
  fixtures;
- critical destructive/credential/permission false positives: zero on the fixed
  adversarial set;
- coverage of explicitly supported direct-reply forms: >= 80%, preventing
  all-DEFER from passing;
- lifecycle/authorization stale-result cases: all pass.

These targets are evaluation gates, not claims about real-world population
accuracy.

### 12.2 Production-path verification

Use the real detector and real source/release extension paths.

Verify:

- OFF means no reply-aware reading;
- enable applies only prospectively;
- current latest final reply only;
- no assistant body persistence;
- zero Stage 3A external request;
- revoke cancels/invalidates;
- stale candidate cannot insert;
- suggestion never auto-sends;
- existing draft/caret/selection/IME guarantees remain;
- stable Prompt list does not reorder because a suggestion appears;
- source/release behavior matches;
- real current ChatGPT reply-completion and insertion evidence is collected at
  the Stage 3A certification boundary.

Synthetic browser evidence never substitutes for current-live provider evidence.

---

## 13. Development plan

Stage 3A remains under CPV1-12.3 but is implemented in three coherent batches.

### CPV1-12.3A-1 — Authorization + current reply + direct loop

Implement:

- B-04-3A enable/pause/revoke;
- current-reply identity and final-completion lifecycle;
- `DIRECT_REPLY`;
- `CHOICE`;
- `DEFER`;
- transient capsule;
- ephemeral candidate revalidation;
- verified fill-only insertion.

Exit:

- the direct example class works end-to-end in production source/release;
- no reply read occurs when disabled;
- no reply body persists;
- no Provider/network request is caused by Stage 3A;
- all Stage 1/2 regressions remain green.

This is the **unique next Prompt Reuse development task**.

### CPV1-12.3A-2 — Personal Family match

Add:

- finite action/object extraction;
- bounded Prompt Family candidate view;
- hard relevance/constraint admission;
- lexical/synonym scoring;
- `PROMPT_FAMILY_MATCH`;
- low-confidence DEFER.

Do not start this batch by weakening 12.3A-1 precision.

### CPV1-12.3A-3 — Reliability, visual and real-site closure

Complete:

- requested-material notice;
- regenerate/continue/edit/branch lifecycle;
- SPA/reload/worker/multi-tab;
- dark/compact/200%/keyboard/coarse pointer;
- Stage 3A visual states;
- current real ChatGPT reply-completion journey;
- owner acceptance.

Do not start Stage 3B from this closure.

---

## 14. Stage 3B future boundary

Stage 3B would allow a model to generate a new next prompt when Stage 3A cannot
extract or confidently reuse an existing personal prompt.

It is **not authorized**.

A future Stage 3B decision must separately define:

- Provider/model;
- exact reply/context sent;
- whether personal history participates;
- local versus remote processing;
- retention;
- cost/budget;
- credentials;
- retry policy;
- generated-prompt quality evaluation;
- user-visible distinction from direct/history suggestions;
- disable/revoke behavior.

A Stage 3A DEFER must never automatically cause a paid/remote Stage 3B call.

---

## 15. Relationship to existing Prompt Reuse authority

This document owns Stage 3A semantics.

Existing authority remains:

- `PROMPT_REUSE_SURFACE.md` — Stage 1/2 plus shared surface/insertion invariants;
- `prompt-reuse-visual-v1/` — accepted Stage 1/2 pure visual authority;
- this document — reply-access boundary, detector semantics, transient capsule and
  Stage 3A evaluation/development contract.

Stage 3A may add literal visual masters for the new capsule states during
CPV1-12.3A-3. It does not reopen or redesign accepted V01–V08.
