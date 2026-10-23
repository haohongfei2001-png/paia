# Original Organizer generation owner — 2026-10-24

## Problem and narrow fix

The worker uses the real OrganizerStore, extending the original LibraryDocumentsStore. requireOriginalLibraryDocumentsGenerationMethods previously demanded an exact Docs instance prototype, so the legitimate worker owner failed GENERATION_REPOSITORY_WRITE_DENIED before checkpoint publication.

LibraryDocuments owner now accepts the extra Organizer layer only after its declaration module's private checker accepts it. Organizer captures the complete own-property descriptors (including constructor) and exact parent at original class definition, and checks the private constructor brand and exact instance prototype. It rejects added methods, descriptor mutation, replaced methods, parent-chain insertion, instance overrides and arbitrary subclasses. It never samples caller methods on first check. The original Docs/base descriptor chain and instance-shadow checks still execute afterward.

The checker export is deny-only and mints no write, restore, checkpoint or repository capability. No Organizer business methods, worker, group compiler, provider, Prompt, limits or authorization changed. Existing Docs handling of run/finishFoundation remains unchanged; this package does not redefine their separate original serialization/owner checks.

The new static import cycle accesses only exported function declarations. Organizer's private checker is assigned only after its class definition inside the existing lazy original constructor factory; no class value is read while that class is incomplete. Both imported public owner entrypoints initialized in the actual Node suite.

## Evidence

Node 22.23.3, fake IndexedDB, synthetic data and original Google adapter with simulated HTTP only.

- Before fix: exact genuine Organizer identity positive 0/1, original GENERATION_REPOSITORY_WRITE_DENIED retained in before.log.
- One owning batch: library-documents-generation-owner.test.mjs + canonical-generation-protected-group.test.mjs + canonical-generation-repository-gate.test.mjs = 66/67. Original protected generation suites passed; final new consumer test failed BNS_SOURCE_APPEND_ANCHOR because shared setup() captured before the test installed SourceBootstrapJournal. first-owning-test.mjs preserves this fixture. This is not reported as runtime failure or green batch.
- Corrected only that fixture to create a genuinely fresh original Organizer, bind the original Source journal, then capture. New full owning file targeted result 14/14, no fail/cancel/skip/todo. It proves original Docs and Organizer admission, two arbitrary subclasses, unconstructed prototype fake, four instance method substitutions, four prototype/descriptor/parent mutations, and real producer prepare (no POST) then publish confirmed through original adapter.
- No unchanged protected suites repeated after the test-only correction. Runtime was unchanged between the 66/67 batch and 14/14 result.

No browser/build, large seed, 65/129 recovery, cloud CI, actual account, network or deployment ran. This fixes one original identity gap, not complete Sync acceptance, negative checkpoint recovery, or performance capacity. Parent will integrate and perform coherent native verification.
