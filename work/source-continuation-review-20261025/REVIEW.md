# Source union continuation independent local review — 2026-10-25

Status: original failed candidate restored in isolation; not accepted or integrated.

Base: b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac. The existing three runtime blobs exactly match the patch preimages: checkpoint-publication 68eb2be081bd7da253871aa31b53f8d7c545011c; group-checkpoint 0cc2ef95f0a3942c85d97fba6cd0358a6c536fe3; recovery-session 84f5cde92e2fd90c79cf8bdbbf993075a4ef3789. Only the four runtime files and the original owning test were restored from 7ceb-full.patch. The old candidate commit is not assumed available.

Original final 51-case evidence remains 50 pass / 1 fail; the earlier 322-case combination predates the no-cleanup positive. The unchanged no-cleanup positive was run once using the existing official Node 22.23.3 darwin-arm64 runtime: 0/1, BNS_CHECKPOINT_PUBLICATION_LIMIT, TAP 1125.647542 ms. See original-failure.log. No browser, native, build, cloud, provider, 129-group or 100k run.

Read-only findings: the forced dispatch/terminal cut includes the exact whole physical database and pays both current and retained operands. The disposable stage is still present in the normal restored path, so these repeated comparisons charge stage rows as well. The original cleanup owner deletes only a validated stage namespace and retains its restore record; active namespace deletion is forbidden. Silently dropping stage rows, omitting operand charges, increasing budgets, or moving cleanup into the test would not fix the production path safely.

Pending design choice: make original-owner disposable-stage completion an explicit part of publication prepare (same existing recovery/producer work and deadline, exact restore binding, complete proof before mutation and complete revalidation afterward), or preserve the existing failure until a separately reviewed immutable-stage proof exists. Discovery without the private publication work token must remain read-only. No such mutation has been implemented in this initial review.

## Completed local successor (supersedes the pending implementation above)

The parent coordinator accepted explicit original-owner cleanup as part of the already-authorized local publication-prepare repair. The private producer invocation identifies prepare only; publish, status and discovery without the private token do not acquire cleanup authority. The original previous-incomplete-publication early return remains unchanged.

After complete activation/provenance/graph/scope/protocol/physical proof, a private WeakMap capability binds the original restore instance, exact restore state, exact active pointer, original authenticated inventory and the same producer work. Original cleanup rechecks that binding and inventory inside its own transaction, retains every original ordinary-source guard, deletes only the original disposable stage namespace in original bounded pages, and retains the restore row including receipt and sourceCut. Current action checks surround the writes. Each page remains on the same cumulative recovery ticket and original producer deadline; no enlarged or replacement budget.

After successful cleanup, the already-compiled immutable original proof and plan undergo complete current validation again: ordinary guards, original proof, remaining inventory, exact restore/active identities, authority, full protocol, group scope and original physical operands. Only then is a fresh complete retained cut captured. Full forced dispatch/terminal comparisons and both-operand accounting remain unchanged. No stage exception or subset exemption exists.

The first successor recursively recompiled the entire proof and failed BNS_GROUP_RESOURCE_LIMIT (cleanup-first.log, 0/1); that failure is retained. That intermediate source was not separately committed or hash-frozen, so it is not an independently reproducible source qualification. Reusing the compiled immutable proof while retaining complete actual current revalidation removed that redundant compile: unchanged original no-cleanup positive 1/1 (cleanup-second.log). Targeted cleanup controls 9/9 (cleanup-controls-first.log).

Final original ten-file combination: 333/333, zero fail/cancel/skip/todo, exit 0, TAP 51648.262875 ms. It includes the complete owning file: the original 51 cases (including the formerly failing positive) plus ten new cases, not a name-filtered substitute. New cases cover whole physical preservation outside the exact disposable stage; read-only discovery; forged cleanup token; changed active pointer, receipt and staged item; pause before mutation; actual partial original cleanup then failure and explicit safe reentry; exhaustion of the same cumulative recovery ticket; and publish never acquiring prepare cleanup authority. All preexisting assertion cases remain. Five syntax checks passed and diff whitespace passed.

Runtime: existing official Node 22.23.3, macOS arm64, fake-indexeddb and synthetic HTTP owner only. No real browser/native acceptance, provider traffic, build, cloud CI, 129 groups, 100k seed, credentials, installation or deployment. No budget, timeout, router, workflow, version, durable sourceCut, remote format or canonical-body owner change.

## Exact scope and outstanding work

This successor supports only newly captured complete local-device Source bootstrap groups following the original restored sibling union or its authenticated common descendant. Existing Source edits, Source append, Working, Human and Context mixed continuation remain explicitly unsupported and are not declared complete. Independent final review and integration belong to the parent coordinator; nothing was pushed or merged into main. Native browser and broader product qualifications remain outstanding.

Commit layering: 36b5546 preserves the exact original failed candidate and its new original-failure reproduction. The subsequent fix must be reviewed with that base, not cherry-picked alone onto the integration base. The archived historical evidence remains in the received failed-source handoff; it has not been rewritten or relabeled.
