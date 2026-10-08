# AI Context — Cards v2 current product contract

Owner-approved design recorded on 2026-10-07. Implementation is not started by the documentation tasks. Current 0.12.1 execution remains disabled until replacement behavior is implemented and verified.

Canonical development plan: [AI_CONTEXT_CARDS_V2_PLAN.md](docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_PLAN.md). Current execution and the sole next-task pointer: [STATUS.md](docs/consumer-product-v1/STATUS.md). Visual authority: [approved reference manifest](docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_REFERENCES.md). Personal Topic identity/formation: [TOPIC_ARCHITECTURE.md](docs/consumer-product-v1/TOPIC_ARCHITECTURE.md), PT-1.0.

## Product and data

AI Context has four Cards: 我的信息 / 我的规则 / 我的现在 / 我的输入. Info, Rules and Now own small independent editable Context Items. Inputs owns stable Personal/Library Topic access state, not copied Topic bodies. Direct Context edits/deletions never rewrite Source, Working Input, human Thought content or organization. Human additions/edits and deletion suppression outrank automatic maintenance.

There is one Thought Library and one stable Personal Topic identity set. AI creation followed by user editing/renaming does not produce a user-copy Topic. System Topics and Domains are neither parent directories nor mandatory Topic fields. Personal organization, retrieval and Context reuse work without 18/144 taxonomy. The 20/50/144 list-size examples in the design plan are capacity cases, not System Catalog binding. Topic candidates are completely hidden and cannot be authorization/list/search resources for external clients.

Normal Topic on/off controls deep reading only and does not silently toggle independent Context Items. Strong legacy denials, eligibility and permanent deletion boundaries still apply. No external request may read a closed Topic to generate new shallow content around its restriction. Internal extraction/Topic organization has a separate approved processing scope; B-02 derivative deletion and B-03 residency decisions are not silently resolved here.

The old compiler-only prohibition does not prohibit approved independent Items. It still forbids duplicating the entire Archive/Thought body set. Actual storage/migration design must be bounded, compatible and justified before execution.

## Interaction

Use the approved 2x2 home, existing PAIA shell, small category capsules and header global control. Details are ordinary secondary pages with direct editing, undo, IME and failure preservation. The Topics page uses stable compact capsules without search, tabs, batch selection, checkbox/lock grid, permission modal, Done or table. Connections are a low-frequency secondary page, not a matrix or Passport console.

New users start with global, all categories and new Topics off and no connections. Global pause preserves lower choices and connections; Inputs pause preserves Topic choices; toggling a child never reopens a parent. New Topic identities, including those from Section promotion, are off. All connected readable AIs share one PAIA-level scope. Connecting never implicitly reopens global access.

Topic naming/activity/organization is provided by the single Library owner. Do not copy its directory or expose candidate lifecycle. Formation, aliasing, dormancy, rename, promotion, merge, extra Placement or deferred relation metadata cannot itself grant access or bypass explicit content/source denials. Redirect resolution must not union permissions; preserve existing restrictive gates and revalidate affected access. Same-ID human takeover retains identity, not new authorization.

## Trusted access

Shallow reads require global + valid readable connection + category + eligible Item. Deep reads additionally use Inputs category + allowed Personal Topic + eligible content. Enforce at the trusted owner for directory, search, raw text, continuation, cached responses and final release. Rules and retrieved historical text are data; they cannot alter permissions or authorize writes. Read-only clients remain read-only even though internal Topic formation is an approved future capability.

External retrieval ends at allowed Context and allowed Thought Topics. No Archive fallback, Conversation/Project permission or arbitrary Archive Input lookup is exposed. Whole eligible Topic content is readable to the real end through bounded pagination, without loading everything on every request. Search snippets never stand in for full access. A Thought excerpt-only implementation is an explicit interface gap, not permission to open hidden Archive text. Shared Entries deduplicate by stable ID while preserving provenance and locations; recheck source, revisions and every applicable exclusion before release.

Revoke/pause blocks subsequent and cancellable unreleased reads. Do not claim recall of delivered external copies or global success before the authority confirms the change. Credentials, private archives and raw questions/bodies do not belong in public evidence.

## Superseded and retained

Task, Materials, Builder, Review, Redact/Ready, Context Package/Copy-Export workflows, budget/coverage/stale-package UI and Profile/Consumer/Purpose/once/7d/30d permission management are not current product direction. The 0.12.1 cancellation of exports, backup generation, dedicated sharing and BYO/direct provider transport stays in force. Do not reactivate the old UI/service merely by removing its disabled flag.

The pre-Cards contract is preserved byte-for-byte as [AI_CONTEXT_LEGACY_PRE_CTX4.md](AI_CONTEXT_LEGACY_PRE_CTX4.md), blob `6ebce28c7ecd75280a21d053e8108b870ef43e2f`. It is historical implementation/compatibility evidence, not authority to resume old paths. Retain authorization, revocation, source, human work, version, deletion, read/write and local/cloud protections.

CTX4-01 remains a planned phase, not a competing next-task pointer. STATUS now sequences the approved Topic identity foundation before affected Topic integrations; the four-card design and other Context phases are not cancelled. No paid processing, actual connection activation, data migration, installation or release is performed by this document.
