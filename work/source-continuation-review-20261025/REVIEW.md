# Source union continuation independent local review — 2026-10-25

Status: original failed candidate restored in isolation; not accepted or integrated.

Base: b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac. The existing three runtime blobs exactly match the patch preimages: checkpoint-publication 68eb2be081bd7da253871aa31b53f8d7c545011c; group-checkpoint 0cc2ef95f0a3942c85d97fba6cd0358a6c536fe3; recovery-session 84f5cde92e2fd90c79cf8bdbbf993075a4ef3789. Only the four runtime files and the original owning test were restored from 7ceb-full.patch. The old candidate commit is not assumed available.

Original final 51-case evidence remains 50 pass / 1 fail; the earlier 322-case combination predates the no-cleanup positive. The unchanged no-cleanup positive was run once using the existing official Node 22.23.3 darwin-arm64 runtime: 0/1, BNS_CHECKPOINT_PUBLICATION_LIMIT, TAP 1125.647542 ms. See original-failure.log. No browser, native, build, cloud, provider, 129-group or 100k run.

Read-only findings: the forced dispatch/terminal cut includes the exact whole physical database and pays both current and retained operands. The disposable stage is still present in the normal restored path, so these repeated comparisons charge stage rows as well. The original cleanup owner deletes only a validated stage namespace and retains its restore record; active namespace deletion is forbidden. Silently dropping stage rows, omitting operand charges, increasing budgets, or moving cleanup into the test would not fix the production path safely.

Pending design choice: make original-owner disposable-stage completion an explicit part of publication prepare (same existing recovery/producer work and deadline, exact restore binding, complete proof before mutation and complete revalidation afterward), or preserve the existing failure until a separately reviewed immutable-stage proof exists. Discovery without the private publication work token must remain read-only. No such mutation has been implemented in this initial review.
