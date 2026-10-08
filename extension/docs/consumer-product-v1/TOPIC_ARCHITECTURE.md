# Personal Topic Architecture — canonical product contract

Decision: OWNER_APPROVED, 2026-10-07. Contract: PT-1.0. This is the settled Topic direction inside PAIA Consumer Product v1, not an invitation to compare alternative taxonomies or redesign the UI. Adoption and exact supersession: [TOPIC_ARCHITECTURE_ADOPTION.md](TOPIC_ARCHITECTURE_ADOPTION.md). Development specification: [TOPIC_ARCHITECTURE_PLAN.md](TOPIC_ARCHITECTURE_PLAN.md). Execution state and the only next-task pointer: [STATUS.md](STATUS.md).

Approval establishes product semantics, not shipped capability, a running Organizer, paid processing, migration execution or production certification.

Subsequent final presentation adoption, 2026-10-07: [THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md), TL-PT1-UI-1.0, and [its reference manifest](THOUGHT_LIBRARY_PT1_VISUAL_REFERENCES.md) govern the reviewed Thought UI. Root consumes Personal Topic names and real named Section overview; the continuous reader consumes the same default/named Sections and Entries. AI reading headings are derivative presentation, not new durable Sections. This reference does not change PT-1.0 semantics, body ownership or unresolved gates. Implementation is integrated into the existing Topic plan, especially TOPIC-05.1 through 05.8, not a new design workstream.

## PT-01 — One Thought Library; personal objects and recurring subjects first

A Personal Topic / Library Topic is:

> 用户能够独立识别，并有理由再次回到其中继续阅读、思考、决策或复用的一组内容；它围绕一个稳定对象，或一个持续议题形成。

Stable does not mean many years. A bounded short-term project with continuing work can qualify. A name mentioned once, an incidental entity or a conversation action does not establish a Topic.

The Thought Library root contains Personal Topics, expressed in the user's language. A project such as PAIA or HCL and an independently sustained subject such as learning methods can be peers. Fixed categories such as Product, Learning, Health, AI or Work are neither required root containers nor mandatory parents. No empty taxonomy is prepopulated. A user may intentionally create a broadly named Personal Topic; that does not create a mandatory category for other Topics.

Topic identity is independent of its name, source Conversation/Project, current activity, creation actor, semantic label and permission. Source Project and Library Topic remain different concepts. Manual takeover of an AI-created Topic retains the same stable Topic ID; there is no user-copy identity.

PAIA has exactly one Thought Library. User-authored facts, AI organization projections, membership authorship and protected fields are internal authority distinctions, not separate human/AI libraries or competing Original/AI organization directories. A Topic-local AI reading presentation may remain a derivative over the same identities and evidence, never a second organization authority.

## PT-02 — Fixed structural depth and content ownership

The only normal structure is `Personal Topic -> Section -> Entry`. There is no recursive Topic/Subtopic tree and no nested Section. Topic describes an independent object or sustained subject; Section is a reading/organization partition within one Topic; Entry is actual Thought content.

An Entry has one canonical body owner under the existing Source/Working Input/Thought binding rules. Placement contains membership, Section and ordering metadata, not another body. Within an active Topic layout, one Entry has at most one Placement; across Topics it may have several. Neither formation nor migration duplicates a body per Topic.

Each Topic has a stable default Section that may be untitled and may remain indefinitely. Lack of a named Section is not incomplete organization. Preserve empty user-created Sections and human ordering. An Input may yield zero, one or multiple Entries; capture and safe save do not wait for classification. Independent user-created Entries remain supported. Organization alone does not paraphrase content, infer beliefs, delete an Input or resolve the existing B-01/B-02 editing/purge gates.

Default granularity examples are structural examples, not imported user archive records: PAIA is a Topic; its design ideas normally form a Section. An explicitly separate user-created design-ideas Topic must remain separate. Product Design becomes a Personal Topic only when it is an independently returnable, sustained cross-project subject. Product is neither required nor a fixed parent.

## PT-03 — Identity before reuse: the sole Organizer decision order

The objective is useful, stable organization, not minimizing Topic count. Semantic similarity does not establish object identity: two AI-product projects remain distinct even when their vocabulary overlaps.

```text
Input / eligible content
  -> validate processing scope, source eligibility and human constraints
  -> is there substantive material worth entering Thought Library?
  -> identify the object / sustained subject
  -> retrieve existing identities: active, dormant, renamed aliases,
     merged redirects; check removed identities as suppression fences
  -> is this the same Topic identity?
       YES -> reuse Topic
              -> existing Section / justified new Section / default Section
       NO  -> evaluate new-Topic admission
              -> clearly qualifies: create an automatically managed Topic
              -> insufficient evidence: hidden candidate
              -> cannot determine: remain unassigned
```

Unassigned is an organization state, not a formal catch-all Topic. It does not make content disappear from its lawful archive/unplaced reading or local retrieval paths. There is no obligation to invent a Topic or Section to finish a batch.

Identity retrieval considers permitted names/aliases, scope, relevant historical evidence and explicit exclusions. A recently visible shortlist is not the entire identity universe. Before creation, recheck the current identity/constraint version to prevent concurrent batches or imports from creating duplicate identities. Missing retrieval coverage must not be treated as proof that no existing Topic exists.

Conversation titles and bounded recent context are evidence aids only, not identities, automatic membership or authorization. Historical text is data, not a live instruction to mutate the library.

## PT-04 — Two formation paths and six admission requirements

AI creation of Personal Topics is approved product direction within authorized internal processing. It is not permission for an external read-only AI to write or for a disabled legacy provider to run.

**Explicit-object path:** a clearly identified object plus substantive evidence of the user's continuing work can establish a Topic on first sufficient evidence. Do not mechanically require repeated appearances. Merely mentioning or asking for an introduction to an entity is insufficient.

**Emergent-subject path:** a recurring subject must have repeated, independent, explainable source evidence. Count independent source contributions, not the number of generated Entries. Multiple excerpts, revisions, reimports, duplicates and AI summaries of the same contribution do not manufacture independent recurrence. A tunable initial policy may use three substantive Inputs across two Conversations or dates; neither number is an immutable product constant. Thresholds are versioned strategy parameters validated against downstream behavior.

Before automatic creation, all six requirements must hold:

1. A clear independent object or sustained-subject boundary.
2. A reason the user would return directly for reading, thinking, decisions or reuse.
3. It is not an existing alias, former name, dormant identity or merged redirect.
4. It is not merely an ordinary internal aspect of an existing Topic.
5. Real, eligible Input/Entry provenance supports the boundary and the applicable formation path.
6. No conflict with explicit keep-separate, rename, move, include/exclude, remove, keep or other human organization intent.

The decision must be able to explain internally what the Topic is, its evidence and why an existing Topic/Section does not suffice. A model's self-reported confidence, a blacklist pass or a new noun is not admission evidence. When identity is ambiguous, defer rather than force a merge or a new identity.

Explicit user creation is not subject to automatic recurrence thresholds or automated name-quality rejection. Human names remain authoritative even when broad, unusual or identical to another name; name collisions are not automatic merges.

## PT-05 — Section formation and anti-explosion

A named Section is justified only by a stable, recurring internal aspect that improves reading within the same Topic, or explicit user organization. First incidental material can stay in the default Section. Repeated pricing/package/payment-boundary discussion may justify a pricing Section; a single pricing thought need not.

Do not automatically create Topics or mechanically equivalent Sections for transient action labels such as next step, current progress, new changes, several questions, this update, some ideas or follow-up plans. Name heuristics are guardrails, not semantic identity policy. Do not rename an invalid proposal into another vague heading to bypass admission.

Do not discard substantive decisions merely because their Input contains these words. Preserve the meaningful content under its actual object/subject. Section count and lifecycle must not become a new explosion mechanism. No fixed Topics-times-Sections quota or forced taxonomy completeness is a product target.

## PT-06 — Structural change and multi-Topic placement

Section-to-Topic promotion is supported when the Section gains independent identity: direct naming, direct new Inputs, its own goal/boundary/work, or separate reading/reuse needs. Volume alone is insufficient. AI proposes; the user confirms the structural change. Create a new Topic identity, move the necessary Placements, preserve Entry bodies and provenance, and retain old location/history mapping. Do not silently damage manual placement/order. Do not automatically duplicate every promoted Entry into both locations.

Merging established Topics and destructive identity consolidation likewise require explicit user action. Preserve survivor identity, permanent redirects, protections and history; prevent redirect cycles. A keep-separate pair cannot be collapsed indirectly through a third identity. Consolidating hidden candidates is not authority to merge established Topics.

AI normally chooses the single most useful membership. Each additional Placement needs independent reading, decision or reuse value, not mere lexical or category relevance. A single idea genuinely applying to two objects can be one Entry with two Placements. Two different ideas inside one Input should instead be distinct Entries with common Input provenance. User-directed multi-membership remains possible and protected. Retrieval deduplicates shared Entry IDs without dropping provenance or relevant locations.

## PT-07 — Human authority and durable constraints

Organization precedence is `User explicit intent > AI organization`. Source deletion, processing authorization and external-use restrictions remain non-overridable gates, not lower-ranked organization suggestions.

Preserve explicit create, rename, keep-separate, move, membership removal, Section create/edit, order, pin, keep, restore and never-reassign intentions. An AI rerun, model change, inactivity, import, rebuild, rename or merge may not undo them.

Protection is field- and membership-edge-specific. Renaming a Topic protects its name; it does not prohibit otherwise lawful new automatic placements. Moving an Entry from A to B records both include B and exclude A. A removed Placement is not enough if deleting it would lose the negative intent. An explicitly fixed membership set also protects the set. Keep-separate is an identity constraint throughout resolution, alias normalization, candidate reuse and merge, not just a hidden merge-suggestion preference.

Human edits to existing values and human-created organization are not writable by AI. AI may maintain only its own unprotected projection fields/edges within scope and may add eligible new automatic membership without moving human anchors. Human confirmation/takeover protects the affected facts on the same identity. Undo/restore writes protected history, not implicit AI unlock. Uncertain legacy authorship is preserved conservatively, not relabeled as AI-owned.

Explicit later human changes can revise earlier human organization intent through the ordinary trusted user operation. A general preference does not silently remove a more specific exclusion. Constraints carry identity, actor, scope, revision and source where applicable; reload, rollback and migration preserve them. AI text, Source text and current relevance cannot grant themselves authority.

## PT-08 — Internal lifecycle, no candidate inbox

| State | Meaning and allowed transition |
|---|---|
| candidate | Hidden formation evidence only; accumulate, consolidate, expire or discard internally. No ordinary user list, badge, approval workflow, external directory or Context authorization target. On admission it becomes an active identity without routine user approval. |
| active | Established Personal Topic. Human and AI-created identities use the same model. |
| dormant | Established but inactive identity. Preserve name, history and constraints; include in future identity retrieval. Relevant reuse can reactivate it without cloning. Inactivity is not completion, deletion or revocation. |
| merged | Established identity explicitly merged into a survivor; permanent redirect and history remain; never recreate the obsolete identity automatically. |
| removed | User-removed Topic; retain necessary anti-recreation/negative intent. Only explicit lawful user restoration changes that intent. |

Candidate lifetime, activity thresholds and evidence windows are versioned implementation parameters, not user administrative obligations. Auto-dormancy must respect explicit keep/pin intent. Candidate expiration never deletes Source/Input or independent authored content. Removal is not Source purge. Preserve necessary body-free fences while applying actual deletion/purge rules to names, evidence and caches. Do not retain private copied evidence indefinitely merely to keep a candidate alive.

Existing saved AI-presentation candidates are legacy content, not new Topic candidates. Preserve their lawful readability and version protection without reopening approval management. New Topic candidates stay completely hidden.

## PT-09 — Relations are not an MVP dependency

Keep-separate is required human identity protection. `related_to` and `part_of` are deferred possibilities only; no relation graph, relation-management product, Topic graph UI or graph database is required. They cannot move, inherit, replicate, merge or authorize content. Do not implement an invisible recursive directory through relation traversal. Topic identity and formation must work without these relations.

## PT-10 — System Topic and Personal Topic are independent

System Topic answers: what general semantic category does this material have? It is a cross-user, versioned catalog concept maintained by PAIA/Semantic Lab.

Personal Topic answers: where would this user return to read, think, decide or reuse this material? It is based on this user's objects, subjects and organization intent.

No one-to-one mapping, mandatory `systemTopicId`, mandatory `domainId`, system parent, or system-label creation veto exists. Catalog lifecycle and user activity are not interchangeable. System catalog changes never change Personal Topic IDs, names, membership, lifecycle, permission or the user's root directory.

PAIA production architecture does not depend on the 18 Domains or 144 System Topics. Personal organization, Thought Library, retrieval and Context reuse must operate and develop with no taxonomy module, assets or service. Optional is not mandatory-but-hidden. Semantic signals, if ever admitted, are replaceable soft aids, never a hard identity universe or permission gate.

## PT-11 — Retrieval and Context boundaries

Reuse existing lexical retrieval and eligible historical evidence; choose additional retrieval/model technology by demonstrated downstream need. Taxonomy-free does not mean that an LLM or embedding is automatically authorized or required. The production capability baseline is eligible content + existing Personal Topics + related permitted history + a replaceable decision mechanism + human constraints and trusted commit validation.

For Context, My Inputs refers to stable Personal Topic IDs from the one Thought Library, not System Topics or a cloned directory. Preserve approved Cards v2 independent Items, global/category/connection controls and new-Topic-default-off behavior. Ordinary Topic on/off and stronger legacy/content/source denials retain their distinct semantics.

Organization, rename, promotion, merge, dormancy, added Placement and relation metadata do not themselves grant external access or bypass an exclusion. New identities, including promoted Topics, begin closed. Redirect resolution must not union permissions; retain restrictive existing gates and revalidate affected scope before release. Do not solve this by introducing a second identity or a per-candidate approval inbox.

External reads stay within authorized Context and authorized eligible Thought Topic content, with bounded continuation to the real end when whole content is requested. No Archive fallback, arbitrary Source/Input lookup, inaccessible-tail reconstruction or taxonomy-driven expansion. Snippets do not prove complete retrieval. Shared Entry dedupe and source eligibility are rechecked before release. Topic grouping is not proof of endorsement, current truth or logical supersession; preserve chronology, attribution and uncertainty.

Internal processing permission is separate from external reading permission. A Context-only client remains read-only. This contract grants no data egress, paid-service activation, background billing or automatic paid retry.

## PT-12 — Semantic Lab admission, not an integration promise

Semantic Lab remains independent R&D. Its full-144 classification program, zero-model constraints, evidence boundaries and historical failures are not rewritten by this product decision. Its classifications cannot create or govern Library identities.

Future proposed production integration must identify one actual downstream purpose: Personal Topic organization, retrieval, candidate generation or Context reuse. Compare at least (A) no fixed taxonomy, (B) 18-Domain signals and (C) 144-System-Topic signals with comparable content/history access, model, evaluation split and budgets. State any unavoidable differences instead of attributing them to taxonomy.

Evaluate human corrections, duplicate Topics, wrong merges, identity errors, retrieval misses/noise, Context relevance, latency, cost and permission/human-intent violations. Predeclare material improvement and regression tolerances; independently evaluate held-out chronological tasks and critical slices. Synthetic contract tests do not replace real downstream evidence. Privacy and human-intent violations block admission regardless of average improvement. No actual private-data evaluation or paid call is authorized here.

> 通过“144 标签分类测试”，不等于通过“个人思想库组织测试”。

An optional module can enter only after useful downstream gain, acceptable tradeoffs, safe fallback and explicit integration authorization. A no-taxonomy production path remains mandatory even after an optional signal is admitted.

## Final canonical principle

> PAIA 的 Topic 是用户会再次回到的对象或持续议题；AI 可以发现和整理它们，但固定 taxonomy 不决定用户目录，AI 也不能覆盖用户已经表达的组织意图。
