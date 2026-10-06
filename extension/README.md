# PAIA — Personal AI Input Archive

**Current source version: v0.12.1 — Consumer Cleanup**

PAIA is a local-first Chrome extension for preserving, rereading and reusing what you say to AI.

## Current authority and development entrypoints

Read [Consumer Product STATUS](docs/consumer-product-v1/STATUS.md) and [AUTHORITY](docs/consumer-product-v1/AUTHORITY.md) first. They select current approved scoped contracts and the single next development task; PRODUCT/ARCHITECTURE/ROADMAP are lower-order references where nonconflicting.

The owner-approved [Personal Topic Architecture](docs/consumer-product-v1/TOPIC_ARCHITECTURE.md) is canonical: one Thought Library; Personal Topic -> Section -> Entry; identity before reuse; explicit human intent above AI organization; hidden Topic candidates; no recursive taxonomy directory. AI may discover Personal Topics only through evidence-based, authorized formation. [Adoption and supersession](docs/consumer-product-v1/TOPIC_ARCHITECTURE_ADOPTION.md) and [gap/development plan](docs/consumer-product-v1/TOPIC_ARCHITECTURE_PLAN.md) distinguish approved direction from current source gaps. PAIA production does not depend on Semantic Lab's 18 Domains/144 System Topics.

[AI Context Cards v2](docs/consumer-product-v1/AI_CONTEXT_CARDS_V2_PLAN.md) remains approved: independent Info/Rules/Now Items and My Inputs access to the same Personal Topic IDs. These planning approvals are not runtime implementation or real-service availability. No Topic, Context, migration, provider, installation or release is activated by the documentation task. STATUS is the only current next-task pointer.

## Current implemented release boundary

The current app supports capture, reading, editing, local search, Thought history, history import, and recovery from existing backup files. Archive opens directly into a narrow conversation directory with no conversation selected.

The product direction remains **Input Archive -> Thought Library -> AI Context**. AI Context execution stays disabled. Existing Passport grants can be reviewed and revoked in Settings.

New AI generation is unavailable until a real paid service is implemented. The ordinary AI entries are Topic **AI Organize** and Settings **Membership / AI service**; existing AI results remain readable and editable. No purchase, membership or paid backend is simulated. Approved automatic Personal Topic formation is future scoped behavior, not authority to restore retired direct calls.

Multi-Profile management, explicit Thought responses, Candidate approval UI, Material Tray, Product Signals and standalone diagnostic pages are retired. User API configuration, provider transport, content/statistics/Context export, backup generation and dedicated sharing are removed. Old commands refuse safely; old records and credentials are not automatically cleared. Recovery and version protection remain. Hidden Topic candidates are not a user approval workflow and are distinct from existing saved AI-presentation candidates.

Supporting references, subject to the current scoped authority above:

- [PRODUCT.md](PRODUCT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)

The extension captures only eligible user-authored text after explicit consent. Source snapshots remain immutable; editable working content, organized Thoughts and AI-derived presentation retain separate write authorities within one product. AI cannot overwrite human body/organization facts. Stable Topic/Entry IDs and single body ownership survive human takeover and multiple Placements.

## Historical v0.12.0 baseline

The following describes the earlier release. Retired Context, export and provider execution are not current capabilities; current Consumer Product authority and v0.12.1 scope take precedence. Historical Original/AI language concerns derivative reading, not permission to create separate organization directories.

- **Thought evolution reading.** AI-organized Topics prioritize a concise current understanding plus a continuous, evidence-grounded evolution of the user's own expressions. Complete cited Thought bodies remain inline; PAIA does not invent a growth narrative when evidence does not support one.
- **Ordered memory recomposition.** Switching cached reading modes uses a short frosted recomposition transition. It is interruptible, respects reduced-motion preferences and never represents fake model progress.
- **Shared working content.** The historical release shared an unambiguous exact-original Thought/Input body. Current editing/binding follows ARCHITECTURE and later scoped contracts; excerpts, synthesized prose and independent human edits are not silently reverse-linked.
- **Direct Input Context.** The historical release could optionally retrieve unorganized Inputs. Current Cards v2 external retrieval instead ends at authorized Context and Thought Topics, with no Archive fallback.
- **Stale-preview safety.** The historical preview stayed readable while copy/export was disabled until refreshed. Those output paths are now retired, not reactivated by this summary.
- **Quieter reading surfaces.** Primary reading is neutral and content-first. Provenance remains on demand; retired diagnostic pages are not restored.

Detailed historical notes: [Round 7](ROUND7_EVOLUTION_RECOMPOSITION.md), [Round 8](ROUND8_SHARED_WORKING_CONTEXT.md), and [v0.12.0 release](V0120_RELEASE.md).

## Development stance

Reuse existing durable owners and correct Topic/Section/Placement/provenance/revision foundations. The approved Personal Topic plan supplies bounded product justification for identity, lifecycle and human-intent work, not deeper ontology, graph expansion or a second library. The current schema remains frozen by default; any necessary change must satisfy the documented migration/authorization checks.

Reader/retrieval quality and real usability remain important. Do not restore Product Signals collection to validate them. General cloud sync, additional sources and mobile implementation remain governed by their existing decisions and gates. Follow current STATUS rather than old roadmap next-round text.

## Privacy and data boundaries

- Archive content remains in extension Chrome storage/IndexedDB. Export and direct provider execution are unavailable in this release.
- Source Record text is not rewritten by ordinary editing.
- Smart Filter does not delete Source and cannot silently undo explicit keep/restore.
- Reading saved AI results/cached views causes no provider call. Old Context execution remains disabled.
- A future paid service needs real entitlement and bounded authorized processing. Automatic Topic direction grants no data egress, hidden billing or retry.
- Organization, multi-placement, aliasing, merge and promotion do not grant external reading access.

See [PRIVACY.md](PRIVACY.md), [BACKUP.md](BACKUP.md) and [AI_CONTEXT.md](AI_CONTEXT.md), subject to current authority and retained compatibility boundaries.

## Updating the daily unpacked extension

Repository source and Chrome's loaded runtime are separate. To preserve extension identity and IndexedDB:

1. Sync main in GitHub Desktop.
2. Run `extension/development/Update PAIA.command`.
3. Click Reload on the existing PAIA entry in `chrome://extensions`.

Do not uninstall or load PAIA from another folder merely to update it. This documentation task performs none of these runtime operations.

## Development

From extension/:

```bash
npm test
npm run check
npm run build:release
```

Recheck current package scripts when implementation begins. Browser integration tests use an isolated synthetic Chrome profile and provider fixtures. Development-only helpers under extension/development/ are excluded from the formal release. No runtime test or real-service success is claimed by the documentation adoption.

## Documentation history

PRODUCT_SPEC, DECISIONS, README_HISTORY, version acceptance and historical round/foundation files remain compatibility/history evidence. Their conflicting clauses are explicitly superseded through [AUTHORITY](docs/consumer-product-v1/AUTHORITY.md) and the [Topic adoption map](docs/consumer-product-v1/TOPIC_ARCHITECTURE_ADOPTION.md), not silently rewritten. Previous STATUS/MASTER snapshots remain byte-identical evidence and are not independent queues.
