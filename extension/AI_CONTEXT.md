# AI Context — Cards v2 current product contract

Owner-approved design recorded on 2026-10-07. Implementation is not started by this documentation task. Current 0.12.1 execution remains disabled until the replacement is implemented and verified.

Canonical development plan: [AI_CONTEXT_CARDS_V2_PLAN.md](docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_PLAN.md). Current execution state: [STATUS.md](docs/consumer-product-v1/STATUS.md). Visual authority: [approved reference manifest](docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_REFERENCES.md).

## Product and data

AI Context has four Cards: 我的信息 / 我的规则 / 我的现在 / 我的输入. Info, Rules and Now own small independent editable Context Items. Inputs owns stable Thought Topic access state, not copied Topic bodies. Direct Context edits/deletions never rewrite Source, Working Input, human Thought content or organization. Human additions/edits and deletion suppression outrank automatic maintenance.

Normal Topic on/off controls deep reading only and does not silently toggle independent Context Items. Strong legacy denials, eligibility and permanent deletion boundaries still apply. No external request may read a closed Topic to generate new shallow content around its restriction. Internal extraction has a separate approved processing scope; B-02 derivative deletion and B-03 residency decisions are not silently resolved here.

The old compiler-only prohibition does not prohibit the independent Items explicitly approved by this design. It still forbids duplicating the entire Archive/Thought body set to implement a screen. The actual storage/migration design must be bounded, compatible and justified before execution.

## Interaction

Use the approved 2x2 home, existing PAIA shell, small category capsules and a header global control. Details are ordinary secondary pages with direct editing, undo, IME and failure preservation. The Topics page uses stable compact capsules without search, tabs, batch selection, checkbox/lock grid, permission modal, Done or table. Connections are a low-frequency secondary page, not a matrix or Passport console.

New users start with global, all categories and new Topics off and no connections. Global pause preserves all lower choices and connections; Inputs pause preserves Topic choices; toggling a child never reopens a parent. New Topic identities are off. All connected readable AIs share one PAIA-level scope. Connecting never implicitly reopens global access.

## Trusted access

Shallow reads require global + valid readable connection + category + eligible Item. Deep reads additionally use Inputs category + allowed Topic + eligible content. Enforce at the trusted owner for directory, search, raw text, continuation, cached responses and final release. Rules and retrieved source text cannot change permissions or authorize writes.

External retrieval ends at allowed Context and allowed Thought Topics. No Archive fallback, Conversation/Project permission, or arbitrary Archive Input lookup is exposed. Whole eligible Topic contents can be read to the real end through bounded pagination, without forcing every request to load everything. Search snippets never stand in for full Input access. A Thought excerpt-only implementation is an explicit interface gap, not permission to open hidden Archive text.

Revoke/pause blocks subsequent and cancellable unreleased reads. Do not claim recall of delivered external copies or global success before the authority confirms the change. Credentials, private archives and raw questions/bodies do not belong in public evidence.

## Superseded and retained

Task, Materials, Builder, Review, Redact/Ready, Context Package/Copy-Export workflows, budget/coverage/stale-package UI and Profile/Consumer/Purpose/once/7d/30d permission management are not current product direction. The 0.12.1 cancellation of exports, backup generation, dedicated sharing and BYO/direct provider transport stays in force. Do not reactivate the old UI or service merely by removing its disabled flag.

The entire preceding AI_CONTEXT.md is preserved byte-for-byte as [AI_CONTEXT_LEGACY_PRE_CTX4.md](AI_CONTEXT_LEGACY_PRE_CTX4.md), blob `6ebce28c7ecd75280a21d053e8108b870ef43e2f`. It is historical implementation/compatibility evidence, not authority to resume old output paths. Retain useful authorization, revocation, source, human-work, version, deletion, read/write and local/cloud protections. Normal internal mechanisms need not be exposed as user work.

Next implementation task is CPV1-CTX4-01 under the canonical plan, only when implementation is requested. No paid processing, actual connection activation, data migration, installation or release is performed by this document.
