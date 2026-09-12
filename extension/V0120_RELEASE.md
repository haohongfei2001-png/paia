# PAIA v0.12.0 — Thought Evolution & Shared Context

Release status: **daily-use release prepared from the verified and real-profile-validated Round 2–8 stack**.

Version:

- Manifest: `0.12.0`
- Version name: `v0.12.0 Thought Evolution & Shared Context`
- Physical IndexedDB schema: unchanged by the v0.12.0 release bump
- New network permissions: none

## Product scope

v0.12.0 consolidates the work completed across the compatibility, reading, Topic-quality, core-experience, evolution and shared-context rounds.

### Reading and Thought Library

- Core Thought Library reading is isolated from optional AI/Organizer status failures.
- Topic formation uses stricter precision-first stability rules to reduce low-durability fragment Topics without automatically rewriting existing user organization.
- The main AI-organized reading surface is `current understanding + thought evolution`, with complete user-expression evidence inline.
- Evolution framing preserves uncertainty, conditions, parallel views and contradictions instead of fabricating a linear growth story.
- The reading surface is solid, quiet and content-first; ordinary provenance affordances are demoted to low-frequency data controls.
- Cached view changes use the bounded, interruptible Memory Recomposition transition with reduced-motion fallback.

### Shared working content

`blocks.libraryText` remains the canonical editable Input working body. A Thought can share that body only when the relationship is exact and unambiguous: one non-context Input, full-body provenance and no prior independent human divergence.

For such linked content, editing Input or Thought updates the same canonical working body. The immutable Source snapshot is not changed.

The following are deliberately **not** reverse-linked: partial excerpts, multi-Input/coalesced Thoughts, synthesized AI prose, context-only evidence, user-created entries and previously independent human-edited Thoughts. Ambiguity removes the shared link rather than choosing a source arbitrarily.

### AI Context

The optional `includeUnorganizedInputs` setting allows current valid unorganized Inputs to participate in local Context retrieval. It defaults to off and does not bypass existing authorization. Inputs already represented by Thoughts remain governed by Topic/Profile allow/deny/never and Entry/Section exclusions.

A stale Context preview remains visible for review, but copy/export is disabled until the preview is regenerated. Context preparation itself remains local and zero-provider.

## Verification

The product runtime in this release is the Round 8 runtime previously verified in GitHub Actions run `34662095494`:

- 879 / 879 portable unit, adapter-contract and privacy/security tests passed;
- 16 / 16 selected unpacked-extension browser journeys passed;
- source package guardrails passed;
- emitted release package guardrails passed;
- the Round 7 evolution UI, shared working body, direct Input Context, authorization bypass prevention, backup/restore and worker interruption paths were exercised with synthetic data.

The real daily database structural gate was then executed before and after deployment. The post-update read-only diagnostic completed with no index gap, no invalid compound-index metadata, no invalid/missing active layout generation and no unresolved layout candidate. The compatibility pass completed successfully without requiring a schema bump, uninstall, alternate extension path or database rebuild.

### v0.12.0 release-closure gate

Because the v0.12.0 branch is a version/documentation closure rather than another product-runtime change, the formal release gate proves identity with the already validated Round 8 runtime instead of making hosted-runner timing determine the release.

GitHub Actions run `34666128898` completed successfully and verified that:

- `adapter/`, `content/`, `background/`, `core/`, `ui/` and `icons/` are byte-identical to verified `main` commit `5e8d743c16211506498f64bce5050383470e86ce`;
- `manifest.json` differs from that verified runtime only in `version` and `version_name`;
- `package.json` differs only in `version`;
- source package and development-boundary audits pass;
- the emitted release is exactly `0.12.0 / v0.12.0 Thought Evolution & Shared Context`;
- `V0120_RELEASE.md` is included in the formal package while development helpers and `README_HISTORY.md` are excluded.

Earlier attempts to rerun the complete historical browser suite on this metadata-only branch exposed hosted-runner timing flakes in old backup tests and one 30 ms mock-provider timeout. Those runs were not waived as successful evidence; the final release gate instead uses exact runtime identity to the already green Round 8 build plus the completed real-profile structural gate.

No private body text, Topic names, credentials, URLs or raw database rows are part of the repository evidence.

## Release boundaries

This release does **not** claim completion of PAIA's long-term roadmap. It does not add cloud sync, multi-device conflict resolution, a Web App, native mobile apps or a stronger multi-level AI rewrite control. Those are separate future product and architecture stages.

The release also does not change the provider authorization model into automatic background AI. Existing explicit-request, budget and no-automatic-retry boundaries remain in force.

## Daily deployment

Deploy only into the same unpacked runtime path Chrome already uses:

1. create/download a PAIA backup;
2. sync GitHub `main`;
3. run `extension/development/Update PAIA.command`;
4. Reload the existing PAIA extension in Chrome;
5. never uninstall/reinstall merely to update.

Development-only inspection and preview helpers are not part of the formal release package.
