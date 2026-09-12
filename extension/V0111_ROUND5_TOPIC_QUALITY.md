# v0.11.1 Round 5 — Topic Quality & Organization Stability

Status: **development-closed on its review branch; stacked on the Round 2–4 P0 branch; not merged to `main` and not deployed to the daily Chrome profile**.

Base: `p0/thought-library-cold-reload-round2` at `7a253c4e4dd56dba7a88beb2c788ff63506e8b7c`.
Branch: `round5/topic-quality-stability`.
Draft PR: #4.

## Problem

The original Organizer could create durable Topics from labels that describe only one operation, release, progress note or next action. That produces one-entry Topics such as `软件版本发布` or `想法与后续计划`, even when the Input belongs to an established durable subject such as `PAIA 产品设计`.

Round 5 changes **future formation**, not existing user organization. It does not automatically merge, delete, rename or rewrite existing Topics.

## Production contract finding

The live background service uses `SimpleOriginalOrganizerRunner`. Its production materializer already consumes the validated DeepSeek DTO `{items, invalidItems}`. The older `OriginalOrganizerRunner` path still has legacy-looking materialization assumptions, but it is not the production runner instantiated by the service worker. Round 5 therefore adds a production Simple-runner contract regression instead of broadening scope into an unproven legacy-runner rewrite.

## Formation policy

Round 5 keeps the model responsible for semantic classification, but applies a deterministic local stability policy after provider schema/reference validation and before materialization.

1. A valid model-selected existing Topic remains authoritative.
2. A proposed name that is a sufficiently close duplicate of a retrieved Topic resolves to that request-local existing Topic ID.
3. A low-durability proposal (release/update/progress/next-action style labels) may reuse an existing durable Topic only when the Input has a strong local match to that candidate.
4. A release/update fragment that is folded into a durable Topic can become a Section, or reuse a near-duplicate existing Section.
5. A low-durability proposal with no credible existing Topic does **not** create another fragment Topic; it falls back to unassigned organization while preserving the validated original Entry.
6. If more than one durable Topic is strongly supported, candidate array order is never used as a tie-break. The result stays unassigned unless an explicit validated `relatedGroupingCandidate` disambiguates among those strong candidates.
7. A genuinely distinct durable subject remains eligible to create a new Topic.
8. Existing human Topic identity and organization are never automatically renamed, merged or deleted by this policy.

Candidate retrieval remains local and bounded. Entry excerpts and ranking scores stay local; the provider receives at most the existing bounded Topic/Section metadata candidates. Round 5 does not add another provider request.

## Precision guards added during verification

The verification corpus exposed several false-fold risks that are now fail-closed:

- A generic Section label such as `版本发布` is not sufficient evidence that its parent Topic is relevant. Parent reuse needs Topic-name or other durable semantic evidence.
- If one Input strongly mentions multiple existing durable Topics, a low-durability proposal such as `版本发布` does not silently choose the first candidate.
- Topic identity matching is stricter than Section-name matching. Generic Chinese tails such as `产品设计` cannot collapse a distinct durable Topic into `PAIA 产品设计`.
- If either Topic name contains ASCII/alphanumeric entity anchors (for example `PAIA` or `AI`), a near-duplicate match requires at least one shared ASCII anchor. A purely Chinese overlapping suffix cannot substitute for the named entity.
- Substantially different Topic-name lengths are not treated as near duplicates.

These checks deliberately prefer an unassigned Entry over a confident-looking wrong Topic placement.

## Conservative scope

The low-durability taxonomy is intentionally narrow and deterministic. It targets known classes such as release/update/progress/generic-follow-up labels rather than attempting open-ended semantic merging. This is a precision-first guard against Topic fragmentation, not a knowledge-graph or embedding project.

Existing fragment Topics are not destructively repaired. Existing merge tooling remains suggestion-only, and `KEEP_LIBRARY_TOPICS_SEPARATE` continues to preserve explicit user decisions.

## Final verification evidence

Authoritative final GitHub-hosted verification run: **34623109441**.
Tested branch SHA: **`7aa252a6b94b65de436c1cb89df7f64780596958`**.
The runtime precision change immediately preceding the final CI-only workflow adjustment was `c4c4f03e5f539e7156d052eaf9b86bfda4d04594`.

### Focused integration

The final focused suite passed **26/26**, with 0 failed and 0 skipped. It covers:

- validated DeepSeek classification DTO -> production `SimpleOriginalOrganizerRunner` compatibility;
- strong durable Topic reuse for a low-durability proposal;
- unassigned fallback when no credible Topic exists;
- ambiguous multi-Topic Inputs failing closed instead of choosing array order;
- explicit `relatedGroupingCandidate` resolving only an otherwise strong ambiguous match;
- overlapping generic words not collapsing a distinct durable product Topic;
- genuinely new durable Topic creation;
- near-duplicate Topic and Section resolution;
- a full production-flow example where `软件版本发布` becomes a Section under existing `PAIA 产品设计` rather than a one-entry Topic;
- the earlier Topic-quality regressions and DeepSeek provider/privacy contract.

### Deterministic Topic-stability benchmark

`extension/scripts/topic-quality-round5-benchmark.mjs` freezes a synthetic precision-first policy corpus. The final run reports:

- **21 cases**;
- **21 correct**;
- **0 durable-subject false folds**;
- **14/14 labeled fragment cases handled**.

This is a deterministic regression corpus, **not** evidence of 100% real-world semantic accuracy.

Two failed intermediate benchmark runs were useful safety findings rather than hidden noise. One exposed that a generic `版本发布` Section could falsely prove Topic relevance; another exposed that `职业匹配产品设计` could be folded into `PAIA 产品设计` through a generic Chinese suffix. The final policy includes explicit guards for both cases.

### Broad portable unit suite

The final branch gate ran **717/717 portable unit tests**, with 0 failed and 0 skipped.

Exactly three pre-existing non-portable fixtures are excluded from this hosted-runner gate and are named explicitly in the workflow:

- `history-performance-v090.test.mjs` — the 10,000-input synthetic History case exceeds the GitHub-hosted runner's 180-second test timeout;
- `light-coverage.test.mjs` — the migrated Git repository does not contain historical short SHA `1e00c23` required by its frozen comparison;
- `smart-filter-diagnostics.test.mjs` — the migrated Git repository does not contain historical short SHA `f3fa0e7` required by its frozen comparison.

The preceding broad run had **717/720 passed**, and its only three failures were exactly those files. They are therefore documented infrastructure/history limitations, not silently ignored new regressions. Any other portable unit failure remains fatal to the Round 5 gate.

### Package and release verification

The final run also passed:

- package audit: **6,490 guardrails across 139 runtime resources**;
- release-build package audit: **6,078 guardrails across 132 runtime resources**;
- emitted-product guard: **`RELEASE_PRODUCT_GUARD_PASS` for 147 files**;
- release build for extension version `0.11.1`.

A successful release build is build evidence only. It is not deployment authorization and does not establish real-user database safety.

## Non-goals / safety boundaries

Round 5 does not:

- auto-merge existing Topics;
- auto-delete or auto-rename existing Topics;
- override user-created/human-protected Topic organization;
- change physical IndexedDB schema;
- change Source Record or Input Archive semantics;
- change Thought body text;
- add embeddings or a local model;
- add automatic provider dispatch/retry;
- increase per-action provider request count;
- deploy to the user's daily unpacked extension.

## Remaining deployment gate

Round 5 is closed at the **development / synthetic verification** level only.

The Round 2–4 real-data structural gate remains a prerequisite before the stacked P0 repair and Round 5 candidate are allowed to reach the user's daily Chrome profile. No automated GitHub test can inspect or substitute for the existing long-lived local IndexedDB. The user does not need to run that diagnostic during continued development; it is deferred until an actual merge/deployment decision.
