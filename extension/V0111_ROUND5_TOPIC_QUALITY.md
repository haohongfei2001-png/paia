# v0.11.1 Round 5 — Topic Quality & Organization Stability

Status: **draft, stacked on the Round 2–4 P0 branch; not merged to `main` and not deployed to the daily Chrome profile**.

Base: `p0/thought-library-cold-reload-round2` at `7a253c4e4dd56dba7a88beb2c788ff63506e8b7c`.
Branch: `round5/topic-quality-stability`.

## Problem

The original Organizer could create durable Topics from labels that describe only one operation, release, progress note or next action. That produces one-entry Topics such as `软件版本发布` or `想法与后续计划`, even when the Input belongs to an established durable subject such as `PAIA 产品设计`.

Round 5 changes **future formation**, not existing user organization. It does not automatically merge, delete, rename or rewrite existing Topics.

## Production contract finding

The live background service uses `SimpleOriginalOrganizerRunner`. Its production materializer already consumes the validated DeepSeek DTO `{items, invalidItems}`. The older `OriginalOrganizerRunner` path still has legacy-looking materialization assumptions, but it is not the production runner instantiated by the service worker. Round 5 therefore adds a production Simple-runner contract regression instead of broadening scope into an unproven legacy-runner rewrite.

## Formation policy

Round 5 keeps the model responsible for semantic classification, but applies a deterministic local stability policy after provider schema/reference validation and before materialization.

1. A valid model-selected existing Topic remains authoritative.
2. A proposed name that is a near duplicate of a retrieved Topic resolves to that request-local existing Topic ID.
3. A low-durability proposal (release/update/progress/next-action style labels) may reuse an existing durable Topic only when the Input has a strong local match to that candidate.
4. A release/update fragment that is folded into a durable Topic can become a Section, or reuse a near-duplicate existing Section.
5. A low-durability proposal with no credible existing Topic does **not** create another fragment Topic; it falls back to unassigned organization while preserving the validated original Entry.
6. A genuinely distinct durable subject remains eligible to create a new Topic.
7. Existing human Topic identity and organization are never automatically renamed, merged or deleted by this policy.

Candidate retrieval remains local and bounded. Entry excerpts and ranking scores stay local; the provider receives at most the existing bounded Topic/Section metadata candidates. Round 5 does not add another provider request.

## Conservative scope

The low-durability taxonomy is intentionally narrow and deterministic. It targets known classes such as release/update/progress/generic-follow-up labels rather than attempting open-ended semantic merging. This is a precision-first guard against Topic fragmentation, not a knowledge-graph or embedding project.

Existing fragment Topics are not destructively repaired. Existing merge tooling remains suggestion-only, and `KEEP_LIBRARY_TOPICS_SEPARATE` continues to preserve explicit user decisions.

## Verification evidence

### Focused integration

GitHub-hosted tests verify:

- validated DeepSeek classification DTO -> production `SimpleOriginalOrganizerRunner` compatibility;
- strong durable Topic reuse for a low-durability proposal;
- unassigned fallback when no credible Topic exists;
- genuinely new durable Topic creation;
- near-duplicate Topic and Section resolution;
- full production-flow example where `软件版本发布` becomes a Section under existing `PAIA 产品设计` rather than a one-entry Topic;
- existing Topic-quality regressions and DeepSeek provider/privacy contract.

The first focused CI run (`34616437640`) passed **23/23** tests and the package audit passed **6,490 guardrails across 139 runtime resources**.

### Deterministic benchmark

`extension/scripts/topic-quality-round5-benchmark.mjs` freezes a small synthetic policy corpus. At the current branch state it reports:

- 18 cases;
- 18 correct;
- 0 durable-subject false folds;
- 11/11 labeled fragment cases handled.

This is a deterministic regression corpus, **not** evidence of 100% real-world semantic accuracy.

### Broad unit evidence

The first broad run (`34616574568`) reported **715/718 passed**. The three failures were outside the Round 5 changed path:

- `history-performance-v090.test.mjs`: the 10,000-input synthetic history case exceeded the hosted-runner 180 s timeout;
- `light-coverage.test.mjs`: imported Git history does not contain historical short SHA `1e00c23` required by the frozen comparison;
- `smart-filter-diagnostics.test.mjs`: imported Git history does not contain historical short SHA `f3fa0e7` required by the frozen comparison.

All Topic Quality, Original Organizer, DeepSeek, Thought M1/M2, cold-reload and Round 4 migration unit tests in that run passed. The Round 5 workflow is being tightened so only this known failure set can be tolerated; any additional unit failure must fail the Round 5 gate. Package audit and release build are also required independently of those imported-history limitations.

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

The Round 2–4 real-data structural gate remains a prerequisite before the stacked P0 repair and Round 5 candidate are allowed to reach the daily Chrome profile. Synthetic tests cannot satisfy that gate.
