# PAIA — Personal AI Input Archive

**Current source version: v0.12.1 — Consumer Cleanup**

PAIA is a local-first Chrome extension for preserving, rereading and reusing what you say to AI.

The current app supports capture, reading, editing, local search, Thought history, history import, and recovery from existing backup files. Archive opens directly into a narrow conversation directory with no conversation selected.

The product direction remains **Input Archive → Thought Library → AI Context**. AI Context execution stays disabled. Existing Passport grants can be reviewed and revoked in Settings.

New AI generation is unavailable until a real paid service is implemented. The ordinary AI entries are Topic **AI Organize** and Settings **Membership / AI service**; existing AI results remain readable and editable. No purchase, membership or paid backend is simulated.

Multi-Profile management, explicit Thought responses, Candidate approval UI, Material Tray, Product Signals and standalone diagnostic pages are retired. User API configuration, provider transport, content/statistics/Context export, backup generation and dedicated sharing are removed. Old commands refuse safely; old records and credentials are not automatically cleared. Recovery and version protection remain.

For current product definition, architecture boundaries and next development rounds, read:

- [PRODUCT.md](PRODUCT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)

These three documents are the current source of truth for new product work. Older version specifications and acceptance records remain compatibility/history evidence.

The extension captures only eligible user-authored text after explicit consent. Source snapshots remain immutable; editable working content, organized Thoughts and AI-derived presentation are kept behind separate trust boundaries.

## Historical v0.12.0 baseline

The following describes the earlier release. Retired Context, export and provider execution are not current capabilities; the v0.12.1 scope above takes precedence.

- **Thought evolution reading.** AI-organized Topics prioritize a concise current understanding plus a continuous, evidence-grounded evolution of the user's own expressions. Complete cited Thought bodies remain inline; PAIA does not invent a growth narrative when the evidence does not support one.
- **Ordered memory recomposition.** Switching cached reading modes uses a short frosted recomposition transition. It is interruptible, respects reduced-motion preferences and never represents fake model progress.
- **Shared working content.** A safely linked exact-original Thought and its Input share one canonical editable working body. Editing either side updates the same content while Source remains immutable. Partial excerpts, synthesized prose, multi-Input Thoughts and previously independent human edits never get silently reverse-linked.
- **Direct Input Context.** AI Context can optionally retrieve valid unorganized Inputs locally, without requiring them to enter Thought Library first. Topic/Profile authorization, Smart Filter, removal state and explicit exclusions remain enforced.
- **Stale-preview safety.** When Context becomes stale, the old preview remains readable for comparison, but copy/export stays disabled until a fresh preview is generated.
- **Quieter reading surfaces.** Primary reading is solid, neutral and content-first. Low-frequency provenance and raw-data controls remain available under Settings/Data rather than occupying ordinary reading.

Detailed implementation notes: [Round 7](ROUND7_EVOLUTION_RECOMPOSITION.md), [Round 8](ROUND8_SHARED_WORKING_CONTEXT.md), and the [v0.12.0 release record](V0120_RELEASE.md).

## Post-v0.12 development stance

The current durable schema is frozen by default while product value is validated. The next priority is not deeper Thought ontology. It is:

1. strengthen Reader and retrieval quality;
2. unify Search behind one reusable service boundary;
3. validate usability through explicit review without Product Signals collection;
4. only then expand Context/Passport if repeated use justifies it;
5. postpone general cloud sync and multi-platform duplication until ownership/conflict semantics and product value are proven.

See [ROADMAP.md](ROADMAP.md) for the development gates.

## Privacy and data boundaries

- Archive content remains in the extension's Chrome storage/IndexedDB. Export and provider execution are unavailable in this release.
- Source Record text is not rewritten by ordinary editing.
- Smart Filter does not delete Source data and restored/user-protected content is not silently filtered again.
- Reading existing AI results and switching cached views do not call a provider. Context preparation remains disabled.
- The old direct provider transport is removed. A future paid service needs real server-side membership validation and a bounded AI gateway before activation.

See [PRIVACY.md](PRIVACY.md), [BACKUP.md](BACKUP.md) and [AI_CONTEXT.md](AI_CONTEXT.md) for detailed implemented contracts.

## Updating the daily unpacked extension

The GitHub repository and Chrome's loaded runtime are intentionally separate. To preserve the existing extension identity and IndexedDB:

1. Sync `main` in GitHub Desktop.
2. Run `extension/development/Update PAIA.command`.
3. Click **Reload** on the existing PAIA entry in `chrome://extensions`.

Do **not** uninstall PAIA or load it again from a different folder merely to update it.

## Development

From `extension/`:

```bash
npm test
npm run check
npm run build:release
```

Browser integration tests use an isolated synthetic Chrome profile and synthetic provider fixtures. Development-only helpers under `extension/development/` are excluded from the formal release package.

## Documentation history

`PRODUCT_SPEC.md`, `DECISIONS.md`, `README_HISTORY.md`, version-specific acceptance documents and historical round/foundation records are retained for implementation history, compatibility and evidence. They do not override `PRODUCT.md`, `ARCHITECTURE.md` or `ROADMAP.md` for new product direction.
