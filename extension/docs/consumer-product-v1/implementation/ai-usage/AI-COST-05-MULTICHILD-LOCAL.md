# AI-COST-05 local multi-child atomic closure

Author implementation checkpoint; independent final review APPROVED; original native source/release both passed on runtime commit dd92c140. Base 97c87938; design checkpoint 57ce0e8a. No worker/provider/financial/Source/Sync/UI/CI/version activation.

## Actual behavior and boundaries

Explicit V2 local sessions can partition selected evidence into two through four physical children. The existing 20 physical inputs, request/content/output byte limits and 100 whole-job evidence/coverage limits remain. Shared dependency components stay together and oversized components refuse. Every payload including Foundation metadata is preflighted before dispatch and requalified before execution. The existing v1 unsupported-multi DEFER and single-child identities remain unchanged.

New atomic jobs use `ai_organize_atomic_v1`; frozen old generic job/commitFacet/resolveLocal readers reject it without writes. Receipts and ACKs retain their prior shape. Legacy DEFER, financial domain-evidence and multi-child cache-exact consumers are not silently widened. New jobs return UNSUPPORTED from the current financial evidence bridge; no financial settlement or production Qwen result is claimed.

All privately validated child outputs bind one store/session/job/exact child coverage. One transaction invokes the candidate owner once and writes all coverage ACKs and child/job completion. Checks before and after settlement prevent disposal during final authority or held ACK writes from committing. Unknown outcomes retain original identities with no reissue. Loss of uncommitted private outputs does not manufacture a reusable durable response. Prior partial ACK scope conservatively refuses.

The new discriminator is included in bounded semantic invalidation with legacy jobs under one combined 100-job budget. Overflow changes no job or receipt. Existing backup replacement clears transient jobs, and Source purge uses existing source references; neither owner or schema changed. Multichild candidate/adoption/history is real local behavior, but exact-cache stamping is deliberately not granted in this slice.

## Evidence

- Actual owner cases cover 60/three and 80/four children, single candidate/adoption and identity replay; candidate/middle ACK/final ACK/final receipt abort rollback; style change, unknown/dispose, mixed-kind 100/101 bound, backup replacement and real Source purge, missing/foreign response, prior legacy ACK refusal and full payload preflight.
- Independent early review identified final-authority disposal and concurrent ninth handle publication. Actual negative evidence is retained in `/tmp/ai-multichild-private-fences-before.log`; corrected cases require full rollback and exactly eight handles. Later ACK-await disposal negative is `/tmp/ai-multichild-final-put-before.log`; final test uses a held real ACK put with IDB keepalive, external dispose and release.
- Earlier implementation errors (overbroad dispatch guard, missing extracted settlement local variable) remain recorded in initial Foundation logs. A backup fixture initially used the empty-target mode on a populated target; it now uses actual explicit replace preview, target generation and confirmation. No restore constraint was relaxed.
- Original v1 LocalSession DEFER regression was caught by its unchanged whole suite and repaired, not deleted. The older V2 unsupported-multi assertion now checks explicit multi-plan support while preserving single-child over-limit refusal. Semantic test records two exact kind-prefix scans; unrelated mutation still requires zero scans.
- Earlier eight-file result was 177/177 before the additive financial bridge rejection test; it is retained in `/tmp/ai-multichild-eight-related-final.log` and is not the final count.
- Final eight whole owning files: `/tmp/ai-multichild-final-units.log` 178/178 PASS, 6353.510416 ms. Package guard: 13370 checks / 400 runtime resources, `/tmp/ai-multichild-package.log`.
- Original native file retains two cases, 120-second budgets, all earlier scenarios and zero-network assertions. Additive 60/80 scenarios use actual Chrome IndexedDB middle-ACK abort, unchanged canonical tables, same-operation adoption and one attempt per child. Both variants passed on dd92c140: 2/2, zero failed/skipped/cancelled, 27808.650417 ms; `/tmp/ai-multichild-native-final.log`. Each reports payload sizes [20,20,20] and [20,20,20,20], unique refs 60/80, real middle-ACK STORAGE_FAILED with complete rollback, one attempt per child, exact retry/adoption, all canonical tables unchanged and cacheExact false. All nine runtime/test SHA256 values below were checked again after the run and are unchanged. Independent temporary release/profile outputs were used; the temporary dependency symlink was unlinked without removing its target. No paid/provider network was activated.

Independent final review: root_finish ran the complete new owner file, 21/21 PASS, 5138.770 ms, `/tmp/ai-multichild-independent-final.log`, no skip/cancellation. Runtime, native additions and fail-closed boundaries approved. The following owner-file change after review only corrects its stale introductory comment.

## Frozen scoped bytes

- `core/ai-usage/foundation.js`: `446f68d189009921ef9cffc5136a57767d79f50217e1cb774752c142dad2a031`
- `core/ai-usage/semantic-invalidation.js`: `afdec16704d838b99d1af7f238d24f6b9295acb791fb089a7bef938032c730e8`
- `core/organizer/local-organize-session.js`: `f4e12069a997fa7d4e22d58ff9dc10c433e6093011b0baa6f25715907223c2f5`
- `core/organizer/ai-incremental-v2.js`: `ed5f0dbc5fbd4a9cdc14ccae312d18dcafd7c9a2eab5e35b2fd2e805d1398efc`
- `core/organizer/ai-presentation.js`: `8cd616fd71ba4ec6879fe932ba816d797c8cb416a860499922a41c8662db1cc7`
- `tests/ai-organize-multichild.test.mjs`: `945713384be22c4a0f1e93f3f3ac894fa9ace225c006cb0d3b181b3b4c8ab58d`
- `tests/ai-cost-semantic-invalidation.test.mjs`: `4e950a7efa49ae1bd1c0aa2f378c32c46c32ea0479185f5156516ba176171b64`
- `tests/ai-organize-incremental-v2.test.mjs`: `906f0ec4e91d78a84cbf53fe0ad9bba394177f353922655844bd71fe857eb56c`
- `tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs`: `04639f9c724da2acb278569c03098b86f1cd82ebdc3878a0ed6d770ef4cfcf83`
