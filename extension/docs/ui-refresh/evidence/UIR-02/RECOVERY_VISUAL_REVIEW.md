# UIR-02 Recovery Visual Review — IN_PROGRESS

This is a recovery checkpoint, not the final UIR-02 completion review.

- Runtime evidence SHA: `563de7c60c29a18a0ffa5bd65e8d2cb3710fa3da`
- PAIA Certification: `#305` / run `34970250345` — **SUCCESS**
- Source artifact: `ux-r2-evidence-d490cb09cadef593588e837c8e6c1514013413c6`
- Artifact id: `10398561867`
- Artifact was produced by the same runtime SHA above from isolated Linux/Xvfb + real Google Chrome and synthetic PAIA content.
- The current recovery commits after that SHA change documentation only; no runtime UI code is being relabeled as newly tested.

## UIR-02 screenshots inspected in this recovery

| Original PNG in Actions artifact | SHA-256 | Review |
|---|---|---|
| `uir-02-archive-1440x900-light.png` | `6cef1e20551cd5d8d583fb89e5e73e2ff60245f68bcb19487817b5ea7450426d` | Archive uses one page heading, one wide local search, an explicitly scoped visible-count line and a thin metadata document row. The real document reaches the first viewport; no generic body snippet or thick card was introduced. Auxiliary content remains subordinate. |
| `uir-02-reader-1440x900-light.png` | `c87aac49d9c85782c8437454d1e4ebba7e9033246a04dc39bbcbe76a58523578` | Reader workspace is wider than the saved prose column while the text itself remains centered and narrow. Inputs read as continuous text instead of repeated cards; title, time order and row actions do not crowd the body. |
| `uir-02-reader-1440x900-dark.png` | `da64e62eb97fe70de8d30dda65f73e284ebbfe3e4c47bd020c5151d956b62e78` | Dark Reader consumes the shared dark surfaces consistently. No forced white document page or obvious light leak is visible; prose and row actions remain legible. |
| `uir-02-search-1440x900-light.png` | `26ee625abfe11d7fbbc93696637a9f122eebe48e2466fc7a5d26e06b365536e4` | Search is a main-workspace task rather than a modal. The single query is dominant, result modes precede optional scope/filter details, selection controls are explicit and rows remain scan-friendly. Source time is human-formatted rather than raw ISO. |
| `uir-02-revisit-1440x900-light.png` | `3d01e4dba8becc3fd3568959098b5b6d58081806250a30704184e972e5ee1fc2` | Revisit is a light reading task with separated Continue / new material / Topic material sections. Older material remains opt-in rather than appearing as a debt queue. |
| `uir-02-reader-390x844-save-failure.png` | `4b8cf4ccf2c97087f16d358b629c7843ed8e26bb195b9d3408bf811385fd823a` | At 390×844 the unsaved state is explicit and remains in the viewport; the edited buffer is visible, Retry and copy-current-text are available, mobile Edit/Done and overflow actions remain reachable, and no root horizontal overflow is apparent. |
| `uir-02-current-release-archive-1440x900-light.png` | `54119bf560095b161ecc938cff763ef74856de96f9b3a621d49abb77bad457aa` | The built `work/current-release` Archive matches the source presentation: same thin document list, scoped count, search hierarchy and auxiliary Revisit area. No internal diagnostic surface leaked into the release view. |

## What the same browser journey already proves

`tests/uir-02-archive-search-reader-chrome-e2e.test.mjs` runs both source and built-release paths. It checks the Archive heading and scoped count, Reader saved-width semantics, light/dark presentation, Search → Reader → Back query restoration, local Search close, Revisit entry from Archive home, 390px save-failure buffer retention, root-overflow limits and zero Provider / extension-external / unexpected network requests. The test is registered in the current browser group.

The corresponding PAIA Certification run also completed Current Browser, the complete current browser suite, Full Suite, current-release build/guards, four unit shards, adapter/privacy contracts, macOS secure-store CI checks and the final Certification gate successfully. That is historical evidence for runtime SHA `563de7c…`; this recovery checkpoint does **not** claim those commands were rerun after documentation-only commits.

## Findings from the recovery audit

No defect in the already-implemented Archive / Reader / Search / Revisit presentation was found that justified reverting or redoing the seven existing UIR-02 commits. In particular, the Search history/back fixes, mode/filter hierarchy, human source-time label, internal Search close behavior, stale-scope copy and Archive-home Revisit journey all correspond to real gaps fixed after the initial UIR-02 feature commit.

This is still insufficient for UIR-02 COMPLETE. The round task explicitly includes Source / revision / review presentation and preview masking, and those have not received an equivalent UIR-02-specific focused acceptance pass in the recovered work.

## Remaining visual / acceptance coverage

1. Audit Source / revision / review modes as three distinct presentations: original record, current working text/version recovery, and removed/permanent-delete state. Verify title/button hierarchy, destructive confirmation copy, focus return and mobile overflow actions without changing the underlying source/history model.
2. Prove `r6.css` preview masking still covers every UIR-02 moved/new preview class, while normal Reader full text is not accidentally masked. Add a small regression rather than widening data projection.
3. Run the relevant focused tests and only the necessary Chrome smoke for that subset. Do not use Full Suite as the default execution test.
4. After all UIR-02 code is stable, run the round's final focused/guards/release validation, refresh any affected screenshots, persist the final accepted key PNG evidence plus `VISUAL_REVIEW.md`, write `UIR_02_REPORT.md`, and only then consider STATUS `COMPLETE`.

## Recovery limitation

The execution environment used for this recovery had no connected Remote Desktop device, so no new local browser command was fabricated. The seven original PNGs were downloaded from the successful Actions run and opened for visual inspection. This ledger records their exact names and SHA-256 values; it intentionally does not substitute recompressed copies for the final required repository PNG evidence.
